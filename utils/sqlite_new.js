// violet-sqlite.js (BigInt-safe, modify_time added)
// UniApp (App-Plus) + plus.sqlite

const dbName = 'violet';
const dbPath = '_doc/db/violet.db';

// int64 最大值（用于无穷大游标），避免 MAX_SAFE_INTEGER 误伤
const INT64_MAX_STR = '9223372036854775807';

/* ----------------------------- DB 基础能力 ----------------------------- */

function isOpen() {
  return plus.sqlite.isOpenDatabase({ name: dbName, path: dbPath });
}

function openSqlite() {
  return new Promise((resolve, reject) => {
    plus.sqlite.openDatabase({
      name: dbName,
      path: dbPath,
      success: resolve,
      fail: reject
    });
  });
}

function closeSqlite() {
  return new Promise((resolve, reject) => {
    plus.sqlite.closeDatabase({
      name: dbName,
      success: resolve,
      fail: reject
    });
  });
}

async function ensureOpen() {
  if (!isOpen()) await openSqlite();
}

/* ----------------------------- 表名工具 ----------------------------- */

function getTablesByUser(userId) {
  return {
    conTable: `conversation_${userId}`,
    msgTable: `message_${userId}`,
    userTable: `user_${userId}`,
    memberTable: `member_${userId}`
  };
}

function getLoginUserId() {
  const { userId } = getApp().globalData || {};
  if (userId === null || userId === undefined) throw new Error('userId is not set in globalData');
  return userId;
}

/* ----------------------------- SQL 执行 ----------------------------- */

function execSql(sql) {
  return new Promise((resolve, reject) => {
    plus.sqlite.executeSql({
      name: dbName,
      sql,
      success: resolve,
      fail: reject
    });
  });
}

function selectSql(sql) {
  return new Promise((resolve, reject) => {
    plus.sqlite.selectSql({
      name: dbName,
      sql,
      success: resolve,
      fail: reject
    });
  });
}

async function execSqls(sqls) {
  for (const s of sqls) await execSql(s);
}

async function withTransaction(fn) {
  await execSql('BEGIN TRANSACTION;');
  try {
    const ret = await fn();
    await execSql('COMMIT;');
    return ret;
  } catch (e) {
    try { await execSql('ROLLBACK;'); } catch (_) {}
    throw e;
  }
}

/* ----------------------------- 值拼接：BigInt-safe ----------------------------- */

// 关键：禁止把不安全的 number 写进 SQL（否则你本地就会写错/查错）
// 建议：所有 snowflake/id 一律用 string 或 BigInt 传入
function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';

  if (typeof v === 'bigint') return v.toString();

  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 'NULL';
    if (!Number.isSafeInteger(v)) {
      throw new Error(`Unsafe integer(number) used in SQL: ${v}. Use string/BigInt instead.`);
    }
    return String(v);
  }

  if (typeof v === 'boolean') return v ? '1' : '0';

  return `'${String(v).replace(/'/g, "''")}'`;
}

/* ----------------------------- BigInt 转换（统一入口） ----------------------------- */

function toBigIntStrict(v) {
  if (v === null || v === undefined) return null;

  if (typeof v === 'bigint') return v;

  if (typeof v === 'string') {
    if (!/^\d+$/.test(v)) throw new Error(`Cannot convert to BigInt from string: ${v}`);
    return BigInt(v);
  }

  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v)) {
      throw new Error(`Cannot safely convert number to BigInt: ${v}. Use CAST AS TEXT in SELECT.`);
    }
    return BigInt(v);
  }

  throw new Error(`Unsupported type for BigInt conversion: ${typeof v}`);
}

function mapRowsBigInt(rows, fields) {
  if (!Array.isArray(rows) || rows.length === 0) return rows || [];
  return rows.map(r => {
    const o = { ...r };
    for (const f of fields) {
      if (o[f] !== undefined) o[f] = toBigIntStrict(o[f]);
    }
    return o;
  });
}

/* ----------------------------- 建表（不兼容旧库，按新结构直接创建） ----------------------------- */

async function createTable(userId) {
  await ensureOpen();

  const { conTable, msgTable, userTable, memberTable } = getTablesByUser(userId);

  const sqls = [
    `CREATE TABLE IF NOT EXISTS ${conTable} (
      con_short_id INTEGER PRIMARY KEY,
      con_id TEXT,
      con_type INTEGER,
      name TEXT,
      avatar_uri TEXT,
      description TEXT,
      owner_id INTEGER,
      create_time INTEGER,
      status INTEGER,
      min_index INTEGER,
      top_timestamp INTEGER,
      push_status INTEGER,
      core_extra TEXT,
      setting_extra TEXT,
      member_count INTEGER,
      badge_count INTEGER,
      read_index_end INTEGER,
      read_badge_count INTEGER,
      user_con_index INTEGER,
      last_message TEXT,
      peer_user_id INTEGER
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_${conTable}_user_con_index ON ${conTable} (user_con_index);`,

    `CREATE TABLE IF NOT EXISTS ${msgTable} (
      user_id INTEGER,
      con_short_id INTEGER,
      con_id TEXT,
      con_type INTEGER,
      client_msg_id INTEGER,
      msg_id INTEGER PRIMARY KEY,
      msg_type INTEGER,
      msg_content TEXT,
      create_time INTEGER,
      extra TEXT,
      con_index INTEGER
    );`,
    `CREATE INDEX IF NOT EXISTS idx_${msgTable}_con_id_con_index ON ${msgTable} (con_id, con_index);`,

    `CREATE TABLE IF NOT EXISTS ${userTable} (
      user_id INTEGER PRIMARY KEY,
      username TEXT,
      avatar_uri TEXT,
      local_avatar_uri TEXT,
      modify_time INTEGER
    );`,
    `CREATE INDEX IF NOT EXISTS idx_${userTable}_modify_time ON ${userTable} (modify_time);`,

    `CREATE TABLE IF NOT EXISTS ${memberTable} (
      con_short_id INTEGER,
      user_id INTEGER,
      nick_name TEXT,
      privilege INTEGER,
      create_time INTEGER,
      status INTEGER,
      extra TEXT,
      PRIMARY KEY (con_short_id, user_id)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_${memberTable}_con_short_id ON ${memberTable} (con_short_id);`
  ];

  await execSqls(sqls);
}

/* ----------------------------- 写入：Conversation / Message ----------------------------- */

async function insertConversation(data) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { conTable } = getTablesByUser(userId);

  // 旧模式保留（不推荐）
  if (typeof data === 'string') {
    const sql = `INSERT OR REPLACE INTO ${conTable} VALUES ${data};`;
    return execSql(sql);
  }

  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return;

  const cols = [
    'con_short_id',
    'con_id',
    'con_type',
    'name',
    'avatar_uri',
    'description',
    'owner_id',
    'create_time',
    'status',
    'min_index',
    'top_timestamp',
    'push_status',
    'core_extra',
    'setting_extra',
    'member_count',
    'badge_count',
    'read_index_end',
    'read_badge_count',
    'user_con_index',
    'last_message',
    'peer_user_id'
  ];

  const values = rows.map(r => `(${cols.map(c => sqlValue(r[c])).join(',')})`).join(',');
  const sql = `INSERT OR REPLACE INTO ${conTable} (${cols.join(',')}) VALUES ${values};`;

  return withTransaction(() => execSql(sql));
}

async function insertMessage(data) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { msgTable } = getTablesByUser(userId);

  // 旧模式保留（不推荐）
  if (typeof data === 'string') {
    const sql = `INSERT OR IGNORE INTO ${msgTable} VALUES ${data};`;
    return execSql(sql);
  }

  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return;

  const cols = [
    'user_id','con_short_id','con_id','con_type','client_msg_id','msg_id','msg_type',
    'msg_content','create_time','extra','con_index'
  ];

  const values = rows.map(r => `(${cols.map(c => sqlValue(r[c])).join(',')})`).join(',');
  const sql = `INSERT OR IGNORE INTO ${msgTable} (${cols.join(',')}) VALUES ${values};`;

  return withTransaction(() => execSql(sql));
}

/* ----------------------------- 写入：User / Member ----------------------------- */

async function upsertUsers(users) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { userTable } = getTablesByUser(userId);

  const rows = Array.isArray(users) ? users : [users];
  if (!rows || rows.length === 0) return;

  const cols = ['user_id', 'username', 'avatar_uri', 'local_avatar_uri', 'modify_time'];

  const values = rows.map(u => {
    const mt = (u.modify_time === null || u.modify_time === undefined) ? Date.now() : u.modify_time;
    return `(${sqlValue(u.user_id)}, ${sqlValue(u.username)}, ${sqlValue(u.avatar_uri)}, ${sqlValue(u.local_avatar_uri)}, ${sqlValue(mt)})`;
  }).join(',');

  const sql = `INSERT OR REPLACE INTO ${userTable} (${cols.join(',')}) VALUES ${values};`;
  return withTransaction(() => execSql(sql));
}

async function upsertMembers(members) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { memberTable } = getTablesByUser(userId);

  const rows = Array.isArray(members) ? members : [members];
  if (!rows || rows.length === 0) return;

  const cols = ['con_short_id', 'user_id', 'nick_name', 'privilege', 'create_time', 'status', 'extra'];

  const values = rows.map(m =>
    `(${sqlValue(m.con_short_id)}, ${sqlValue(m.user_id)}, ${sqlValue(m.nick_name)}, ${sqlValue(m.privilege)}, ${sqlValue(m.create_time)}, ${sqlValue(m.status)}, ${sqlValue(m.extra)})`
  ).join(',');

  const sql = `INSERT OR REPLACE INTO ${memberTable} (${cols.join(',')}) VALUES ${values};`;
  return withTransaction(() => execSql(sql));
}

/* ----------------------------- 拉取：Conversation / Members / Message ----------------------------- */

// Conversation：私聊 name/avatar_uri 从 user 表取；返回 con_short_id/owner_id/peer_user_id 为 BigInt
async function pullConversation(beforeUserConIndex, limit = 50) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { conTable, userTable } = getTablesByUser(loginUserId);

  const before = (beforeUserConIndex === null || beforeUserConIndex === undefined)
    ? INT64_MAX_STR
    : beforeUserConIndex;

  const sql = `
    SELECT
      CAST(c.con_short_id AS TEXT) AS con_short_id,
      c.con_id,
      c.con_type,

      CASE WHEN c.con_type = 1
        THEN COALESCE(NULLIF(u.username, ''), c.name)
        ELSE c.name
      END AS name,

      CASE WHEN c.con_type = 1
        THEN COALESCE(NULLIF(u.local_avatar_uri, ''), NULLIF(u.avatar_uri, ''), c.avatar_uri)
        ELSE c.avatar_uri
      END AS avatar_uri,

      c.description,
      CAST(c.owner_id AS TEXT) AS owner_id,
      c.create_time,
      c.status,
      c.min_index,
      c.top_timestamp,
      c.push_status,
      c.core_extra,
      c.setting_extra,
      c.member_count,
      c.badge_count,
      c.read_index_end,
      c.read_badge_count,
      c.user_con_index,
      c.last_message,
      CAST(c.peer_user_id AS TEXT) AS peer_user_id
    FROM ${conTable} c
    LEFT JOIN ${userTable} u
      ON c.con_type = 1
     AND CAST(u.user_id AS TEXT) = CAST(c.peer_user_id AS TEXT)
    WHERE c.user_con_index <= ${sqlValue(before)}
    ORDER BY c.user_con_index DESC
    LIMIT ${Number(limit)};
  `;

  const rows = await selectSql(sql);
  return mapRowsBigInt(rows, ['con_short_id', 'owner_id', 'peer_user_id']);
}

// Members：返回 con_short_id/user_id 为 BigInt
async function pullMembers(conShortId) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { memberTable, userTable } = getTablesByUser(userId);

  const sql = `
    SELECT
      CAST(mem.con_short_id AS TEXT) AS con_short_id,
      CAST(mem.user_id AS TEXT)      AS user_id,
      mem.nick_name,
      mem.privilege,
      mem.create_time,
      mem.status,
      mem.extra,
      u.username AS user_name,
      u.avatar_uri,
      u.local_avatar_uri,
      u.modify_time
    FROM ${memberTable} mem
    LEFT JOIN ${userTable} u ON u.user_id = mem.user_id
    WHERE CAST(mem.con_short_id AS TEXT) = ${sqlValue(String(conShortId))}
    ORDER BY mem.create_time ASC;
  `;

  const rows = await selectSql(sql);
  return mapRowsBigInt(rows, ['con_short_id', 'user_id']);
}

// Message：返回 user_id / con_short_id / client_msg_id / msg_id 为 BigInt
async function pullMessage(conId, beforeConIndex, limit = 20) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { msgTable, memberTable, userTable } = getTablesByUser(userId);

  const before = (beforeConIndex === null || beforeConIndex === undefined)
    ? INT64_MAX_STR
    : beforeConIndex;

  const sql = `
    SELECT
      CAST(m.user_id AS TEXT)       AS user_id,
      CAST(m.con_short_id AS TEXT)  AS con_short_id,
      m.con_id,
      m.con_type,
      CAST(m.client_msg_id AS TEXT) AS client_msg_id,
      CAST(m.msg_id AS TEXT)        AS msg_id,
      m.msg_type,
      m.msg_content,
      m.create_time,
      m.extra,
      m.con_index,

      mem.nick_name AS member_nick_name,
      u.username AS user_name,
      u.avatar_uri,
      u.local_avatar_uri,
      u.modify_time
    FROM ${msgTable} m
    LEFT JOIN ${memberTable} mem
      ON mem.con_short_id = m.con_short_id
     AND mem.user_id = m.user_id
    LEFT JOIN ${userTable} u
      ON u.user_id = m.user_id
    WHERE m.con_id = ${sqlValue(conId)}
      AND m.con_index <= ${sqlValue(before)}
    ORDER BY m.con_index DESC
    LIMIT ${Number(limit)};
  `;

  const rows = await selectSql(sql);
  return mapRowsBigInt(rows, ['user_id', 'con_short_id', 'client_msg_id', 'msg_id']);
}

// getConversationById：同 pullConversation 行为（私聊从 user 表取）
async function getConversationById(conId) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { conTable, userTable } = getTablesByUser(loginUserId);

  const sql = `
    SELECT
      CAST(c.con_short_id AS TEXT) AS con_short_id,
      c.con_id,
      c.con_type,

      CASE WHEN c.con_type = 1
        THEN COALESCE(NULLIF(u.username, ''), c.name)
        ELSE c.name
      END AS name,

      CASE WHEN c.con_type = 1
        THEN COALESCE(NULLIF(u.local_avatar_uri, ''), NULLIF(u.avatar_uri, ''), c.avatar_uri)
        ELSE c.avatar_uri
      END AS avatar_uri,

      c.description,
      CAST(c.owner_id AS TEXT) AS owner_id,
      c.create_time,
      c.status,
      c.min_index,
      c.top_timestamp,
      c.push_status,
      c.core_extra,
      c.setting_extra,
      c.member_count,
      c.badge_count,
      c.read_index_end,
      c.read_badge_count,
      c.user_con_index,
      c.last_message,
      CAST(c.peer_user_id AS TEXT) AS peer_user_id
    FROM ${conTable} c
    LEFT JOIN ${userTable} u
      ON c.con_type = 1
     AND CAST(u.user_id AS TEXT) = CAST(c.peer_user_id AS TEXT)
    WHERE c.con_id = ${sqlValue(conId)}
    LIMIT 1;
  `;

  const rows = await selectSql(sql);
  return mapRowsBigInt(rows, ['con_short_id', 'owner_id', 'peer_user_id']);
}

// userIds: bigint[]；返回：user_id(BigInt) + modify_time(number)
async function getUsersByIds(userIds) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { userTable } = getTablesByUser(loginUserId);

  if (!Array.isArray(userIds) || userIds.length === 0) return [];

  const uniq = Array.from(new Set(userIds.map(v => String(v))));
  const inList = uniq.map(s => sqlValue(s)).join(',');

  const sql = `
    SELECT
      CAST(user_id AS TEXT) AS user_id,
      username,
      avatar_uri,
      local_avatar_uri,
      modify_time
    FROM ${userTable}
    WHERE CAST(user_id AS TEXT) IN (${inList});
  `;

  const rows = await selectSql(sql);
  return mapRowsBigInt(rows, ['user_id']);
}

// conShortId: bigint -> number
async function getMemberCount(conShortId) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { memberTable } = getTablesByUser(loginUserId);

  const sql = `
    SELECT COUNT(1) AS cnt
    FROM ${memberTable}
    WHERE CAST(con_short_id AS TEXT) = ${sqlValue(conShortId)};
  `;

  const rows = await selectSql(sql);
  return Number(rows?.[0]?.cnt || 0);
}

/* ----------------------------- 更新：Conversation / Message / User ----------------------------- */

function toEntries(data) {
  if (!data) return [];
  if (data instanceof Map) return Array.from(data.entries());
  return Object.entries(data);
}

async function updateConversation(conShortId, data) {
  await ensureOpen();
  const userId = getLoginUserId();
  const { conTable } = getTablesByUser(userId);

  const entries = toEntries(data);
  if (entries.length === 0) return;

  const setClause = entries.map(([k, v]) => `${k} = ${sqlValue(v)}`).join(', ');
  const sql = `UPDATE ${conTable} SET ${setClause} WHERE con_short_id = ${sqlValue(conShortId)};`;
  return execSql(sql);
}

async function updateMessage(msgId, data) {
  await ensureOpen();
  const userId = getLoginUserId();
  const { msgTable } = getTablesByUser(userId);

  const entries = toEntries(data);
  if (entries.length === 0) return;

  const setClause = entries.map(([k, v]) => `${k} = ${sqlValue(v)}`).join(', ');
  const sql = `UPDATE ${msgTable} SET ${setClause} WHERE msg_id = ${sqlValue(msgId)};`;
  return execSql(sql);
}

// 更新本地头像路径（头像下载完成后调用）
async function updateUserLocalAvatar(userIdValue, localPath) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { userTable } = getTablesByUser(loginUserId);

  const sql = `
    UPDATE ${userTable}
    SET local_avatar_uri = ${sqlValue(localPath)}
    WHERE CAST(user_id AS TEXT) = ${sqlValue(String(userIdValue))};
  `;
  return execSql(sql);
}

/* ----------------------------- 删除 ----------------------------- */

async function deleteConversation(conShortId) {
  await ensureOpen();
  const userId = getLoginUserId();
  const { conTable } = getTablesByUser(userId);

  const sql = `DELETE FROM ${conTable} WHERE con_short_id = ${sqlValue(conShortId)};`;
  return execSql(sql);
}

async function deleteMessage(msgId) {
  await ensureOpen();
  const userId = getLoginUserId();
  const { msgTable } = getTablesByUser(userId);

  const sql = `DELETE FROM ${msgTable} WHERE msg_id = ${sqlValue(msgId)};`;
  return execSql(sql);
}

/* ----------------------------- 导出 ----------------------------- */

export default {
  isOpen,
  openSqlite,
  closeSqlite,
  createTable,

  insertConversation,
  insertMessage,
  upsertUsers,
  upsertMembers,

  pullConversation,
  pullMembers,
  pullMessage,
  getConversationById,
  getUsersByIds,
  getMemberCount,

  updateConversation,
  updateMessage,
  updateUserLocalAvatar,

  deleteConversation,
  deleteMessage
};
