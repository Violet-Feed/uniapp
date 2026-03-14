// sqlite_new.js
// BigInt-safe + sender_id/sender_type + agent table + member keeps both con_short_id and con_id

const dbName = 'violet';
const dbPath = '_doc/db/violet.db';
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
    agentTable: `agent_${userId}`,
    memberTable: `member_${userId}`
  };
}

function getLoginUserId() {
  const { userId } = getApp().globalData || {};
  if (userId === null || userId === undefined) {
    throw new Error('userId is not set in globalData');
  }
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

/* ----------------------------- BigInt 转换 ----------------------------- */

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
      if (o[f] !== undefined && o[f] !== null) o[f] = toBigIntStrict(o[f]);
    }
    return o;
  });
}

function firstRow(rows) {
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/* ----------------------------- 建表 ----------------------------- */

async function createTable(userId) {
  await ensureOpen();

  const { conTable, msgTable, userTable, agentTable, memberTable } = getTablesByUser(userId);

  const sqls = [
    // conversation
    `CREATE TABLE IF NOT EXISTS ${conTable} (
      con_short_id INTEGER PRIMARY KEY,
      con_id TEXT,
      con_type INTEGER,
      name TEXT,
      avatar_uri TEXT,
      local_avatar_uri TEXT,
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
      peer_id INTEGER
    );`,
    // con_short_id 已经是 INTEGER PRIMARY KEY，不需要额外索引
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_${conTable}_con_id ON ${conTable} (con_id);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_${conTable}_user_con_index ON ${conTable} (user_con_index);`,

    // message
    `CREATE TABLE IF NOT EXISTS ${msgTable} (
      sender_id INTEGER,
      sender_type INTEGER,
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
    `CREATE INDEX IF NOT EXISTS idx_${msgTable}_sender ON ${msgTable} (sender_type, sender_id);`,

    // user
    `CREATE TABLE IF NOT EXISTS ${userTable} (
      user_id INTEGER PRIMARY KEY,
      username TEXT,
      avatar_uri TEXT,
      local_avatar_uri TEXT,
      modify_time INTEGER
    );`,
    `CREATE INDEX IF NOT EXISTS idx_${userTable}_modify_time ON ${userTable} (modify_time);`,

    // agent
    `CREATE TABLE IF NOT EXISTS ${agentTable} (
      agent_id INTEGER PRIMARY KEY,
      agent_name TEXT,
      avatar_uri TEXT,
      local_avatar_uri TEXT,
      description TEXT,
      owner_id INTEGER,
      modify_time INTEGER
    );`,
    `CREATE INDEX IF NOT EXISTS idx_${agentTable}_modify_time ON ${agentTable} (modify_time);`,

    // member: 同时保留 con_short_id 和 con_id
    `CREATE TABLE IF NOT EXISTS ${memberTable} (
      con_short_id INTEGER,
      con_id TEXT,
      member_id INTEGER,
      member_type INTEGER,
      nick_name TEXT,
      privilege INTEGER,
      create_time INTEGER,
      status INTEGER,
      extra TEXT,
      PRIMARY KEY (con_id, member_type, member_id)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_${memberTable}_con_id ON ${memberTable} (con_id);`,
    `CREATE INDEX IF NOT EXISTS idx_${memberTable}_member ON ${memberTable} (member_type, member_id);`
  ];

  await execSqls(sqls);
}

/* ----------------------------- 写入：Conversation / Message ----------------------------- */

async function insertConversation(data) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { conTable } = getTablesByUser(userId);

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
    'local_avatar_uri',
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
    'peer_id'
  ];

  const values = rows.map(r => `(${cols.map(c => sqlValue(r[c])).join(',')})`).join(',');
  const sql = `INSERT OR REPLACE INTO ${conTable} (${cols.join(',')}) VALUES ${values};`;

  return withTransaction(() => execSql(sql));
}

async function insertMessage(data) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { msgTable } = getTablesByUser(userId);

  if (typeof data === 'string') {
    const sql = `INSERT OR IGNORE INTO ${msgTable} VALUES ${data};`;
    return execSql(sql);
  }

  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return;

  const cols = [
    'sender_id',
    'sender_type',
    'con_short_id',
    'con_id',
    'con_type',
    'client_msg_id',
    'msg_id',
    'msg_type',
    'msg_content',
    'create_time',
    'extra',
    'con_index'
  ];

  const values = rows.map(r => `(${cols.map(c => sqlValue(r[c])).join(',')})`).join(',');
  const sql = `INSERT OR IGNORE INTO ${msgTable} (${cols.join(',')}) VALUES ${values};`;

  return withTransaction(() => execSql(sql));
}

/* ----------------------------- 写入：User / Agent / Member ----------------------------- */

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

async function upsertAgents(agents) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { agentTable } = getTablesByUser(userId);

  const rows = Array.isArray(agents) ? agents : [agents];
  if (!rows || rows.length === 0) return;

  const cols = ['agent_id', 'agent_name', 'avatar_uri', 'local_avatar_uri', 'description', 'owner_id', 'modify_time'];

  const values = rows.map(a => {
    const mt = (a.modify_time === null || a.modify_time === undefined) ? Date.now() : a.modify_time;
    return `(${sqlValue(a.agent_id)}, ${sqlValue(a.agent_name)}, ${sqlValue(a.avatar_uri)}, ${sqlValue(a.local_avatar_uri)}, ${sqlValue(a.description)}, ${sqlValue(a.owner_id)}, ${sqlValue(mt)})`;
  }).join(',');

  const sql = `INSERT OR REPLACE INTO ${agentTable} (${cols.join(',')}) VALUES ${values};`;
  return withTransaction(() => execSql(sql));
}

async function upsertMembers(members) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { memberTable } = getTablesByUser(userId);

  const rows = Array.isArray(members) ? members : [members];
  if (!rows || rows.length === 0) return;

  const cols = [
    'con_short_id',
    'con_id',
    'member_id',
    'member_type',
    'nick_name',
    'privilege',
    'create_time',
    'status',
    'extra'
  ];

  const values = rows.map(m =>
    `(${sqlValue(m.con_short_id)}, ${sqlValue(m.con_id)}, ${sqlValue(m.member_id)}, ${sqlValue(m.member_type)}, ${sqlValue(m.nick_name)}, ${sqlValue(m.privilege)}, ${sqlValue(m.create_time)}, ${sqlValue(m.status)}, ${sqlValue(m.extra)})`
  ).join(',');

  const sql = `INSERT OR REPLACE INTO ${memberTable} (${cols.join(',')}) VALUES ${values};`;
  return withTransaction(() => execSql(sql));
}

/* ----------------------------- 拉取：Conversation ----------------------------- */

async function pullConversation(beforeUserConIndex, limit = 50) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { conTable, userTable, agentTable } = getTablesByUser(loginUserId);

  const before = (beforeUserConIndex === null || beforeUserConIndex === undefined)
    ? INT64_MAX_STR
    : beforeUserConIndex;

  const sql = `
    SELECT
      CAST(c.con_short_id AS TEXT) AS con_short_id,
      c.con_id,
      c.con_type,

      CASE
        WHEN c.con_type = 1 THEN COALESCE(NULLIF(u.username, ''), c.name)
        WHEN c.con_type = 4 THEN COALESCE(NULLIF(a.agent_name, ''), c.name)
        ELSE c.name
      END AS name,

      CASE
        WHEN c.con_type = 1 THEN COALESCE(NULLIF(u.local_avatar_uri, ''), NULLIF(u.avatar_uri, ''), c.avatar_uri)
        WHEN c.con_type = 4 THEN COALESCE(NULLIF(a.local_avatar_uri, ''), NULLIF(a.avatar_uri, ''), c.avatar_uri)
        ELSE COALESCE(NULLIF(c.local_avatar_uri, ''), c.avatar_uri)
      END AS avatar_uri,

      c.local_avatar_uri,
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
      CAST(c.peer_id AS TEXT) AS peer_id
    FROM ${conTable} c
    LEFT JOIN ${userTable} u
      ON c.con_type = 1
     AND u.user_id = c.peer_id
    LEFT JOIN ${agentTable} a
      ON c.con_type = 4
     AND a.agent_id = c.peer_id
    WHERE c.user_con_index <= ${sqlValue(before)}
    ORDER BY c.user_con_index DESC
    LIMIT ${Number(limit)};
  `;

  const rows = await selectSql(sql);
  return mapRowsBigInt(rows, ['con_short_id', 'owner_id', 'peer_id']);
}

async function getConversationById(conId) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { conTable, userTable, agentTable } = getTablesByUser(loginUserId);

  const sql = `
    SELECT
      CAST(c.con_short_id AS TEXT) AS con_short_id,
      c.con_id,
      c.con_type,

      CASE
        WHEN c.con_type = 1 THEN COALESCE(NULLIF(u.username, ''), c.name)
        WHEN c.con_type = 4 THEN COALESCE(NULLIF(a.agent_name, ''), c.name)
        ELSE c.name
      END AS name,

      CASE
        WHEN c.con_type = 1 THEN COALESCE(NULLIF(u.local_avatar_uri, ''), NULLIF(u.avatar_uri, ''), c.avatar_uri)
        WHEN c.con_type = 4 THEN COALESCE(NULLIF(a.local_avatar_uri, ''), NULLIF(a.avatar_uri, ''), c.avatar_uri)
        ELSE COALESCE(NULLIF(c.local_avatar_uri, ''), c.avatar_uri)
      END AS avatar_uri,

      c.local_avatar_uri,
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
      CAST(c.peer_id AS TEXT) AS peer_id
    FROM ${conTable} c
    LEFT JOIN ${userTable} u
      ON c.con_type = 1
     AND u.user_id = c.peer_id
    LEFT JOIN ${agentTable} a
      ON c.con_type = 4
     AND a.agent_id = c.peer_id
    WHERE c.con_id = ${sqlValue(conId)}
    LIMIT 1;
  `;

  const rows = await selectSql(sql);
  return firstRow(mapRowsBigInt(rows, ['con_short_id', 'owner_id', 'peer_id']));
}

async function getConversationByShortId(conShortId) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { conTable, userTable, agentTable } = getTablesByUser(loginUserId);

  const sql = `
    SELECT
      CAST(c.con_short_id AS TEXT) AS con_short_id,
      c.con_id,
      c.con_type,

      CASE
        WHEN c.con_type = 1 THEN COALESCE(NULLIF(u.username, ''), c.name)
        WHEN c.con_type = 4 THEN COALESCE(NULLIF(a.agent_name, ''), c.name)
        ELSE c.name
      END AS name,

      CASE
        WHEN c.con_type = 1 THEN COALESCE(NULLIF(u.local_avatar_uri, ''), NULLIF(u.avatar_uri, ''), c.avatar_uri)
        WHEN c.con_type = 4 THEN COALESCE(NULLIF(a.local_avatar_uri, ''), NULLIF(a.avatar_uri, ''), c.avatar_uri)
        ELSE COALESCE(NULLIF(c.local_avatar_uri, ''), c.avatar_uri)
      END AS avatar_uri,

      c.local_avatar_uri,
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
      CAST(c.peer_id AS TEXT) AS peer_id
    FROM ${conTable} c
    LEFT JOIN ${userTable} u
      ON c.con_type = 1
     AND u.user_id = c.peer_id
    LEFT JOIN ${agentTable} a
      ON c.con_type = 4
     AND a.agent_id = c.peer_id
    WHERE c.con_short_id = ${sqlValue(conShortId)}
    LIMIT 1;
  `;

  const rows = await selectSql(sql);
  return firstRow(mapRowsBigInt(rows, ['con_short_id', 'owner_id', 'peer_id']));
}

/* ----------------------------- 拉取：Message ----------------------------- */

async function pullMessage(conId, beforeConIndex, limit = 20) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { msgTable, memberTable, userTable, agentTable } = getTablesByUser(userId);

  const before = (beforeConIndex === null || beforeConIndex === undefined)
    ? INT64_MAX_STR
    : beforeConIndex;

  const sql = `
    WITH page AS (
      SELECT
        sender_id,
        sender_type,
        con_short_id,
        con_id,
        con_type,
        client_msg_id,
        msg_id,
        msg_type,
        msg_content,
        create_time,
        extra,
        con_index
      FROM ${msgTable}
      WHERE con_id = ${sqlValue(conId)}
        AND con_index <= ${sqlValue(before)}
      ORDER BY con_index DESC
      LIMIT ${Number(limit)}
    )
    SELECT
      CAST(p.sender_id AS TEXT)      AS sender_id,
      p.sender_type,
      CAST(p.con_short_id AS TEXT)   AS con_short_id,
      p.con_id,
      p.con_type,
      CAST(p.client_msg_id AS TEXT)  AS client_msg_id,
      CAST(p.msg_id AS TEXT)         AS msg_id,
      p.msg_type,
      p.msg_content,
      p.create_time,
      p.extra,
      p.con_index,

      CASE
        WHEN p.sender_type = 1 THEN COALESCE(NULLIF(mem.nick_name, ''), u.username, '')
        WHEN p.sender_type = 2 THEN COALESCE(NULLIF(mem.nick_name, ''), a.agent_name, '')
        ELSE ''
      END AS nick_name,

      CASE
        WHEN p.sender_type = 1 THEN COALESCE(NULLIF(u.local_avatar_uri, ''), u.avatar_uri)
        WHEN p.sender_type = 2 THEN COALESCE(NULLIF(a.local_avatar_uri, ''), a.avatar_uri)
        ELSE ''
      END AS avatar_uri

    FROM page p
    LEFT JOIN ${memberTable} mem
      ON mem.con_id = p.con_id
     AND mem.member_type = p.sender_type
     AND mem.member_id = p.sender_id
    LEFT JOIN ${userTable} u
      ON p.sender_type = 1
     AND u.user_id = p.sender_id
    LEFT JOIN ${agentTable} a
      ON p.sender_type = 2
     AND a.agent_id = p.sender_id
    ORDER BY p.con_index DESC;
  `;

  const rows = await selectSql(sql);
  return mapRowsBigInt(rows, ['sender_id', 'con_short_id', 'client_msg_id', 'msg_id']);
}

/* ----------------------------- 拉取：Members（按 con_id） ----------------------------- */

async function pullUserMembers(conId) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { memberTable, userTable } = getTablesByUser(loginUserId);

  const sql = `
    SELECT
      CAST(mem.con_short_id AS TEXT) AS con_short_id,
      mem.con_id,
      CAST(mem.member_id AS TEXT) AS user_id,
      mem.member_type,

      COALESCE(NULLIF(mem.nick_name, ''), u.username, '') AS nick_name,

      mem.privilege,
      mem.create_time,
      mem.status,
      mem.extra,
      COALESCE(NULLIF(u.local_avatar_uri, ''), u.avatar_uri) AS avatar_uri,
      u.modify_time
    FROM ${memberTable} mem
    LEFT JOIN ${userTable} u
      ON mem.member_type = 1
     AND u.user_id = mem.member_id
    WHERE mem.con_id = ${sqlValue(conId)}
      AND mem.member_type = 1
    ORDER BY mem.create_time ASC;
  `;

  const rows = await selectSql(sql);
  return mapRowsBigInt(rows, ['con_short_id', 'user_id']);
}

async function pullAgentMembers(conId) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { memberTable, agentTable } = getTablesByUser(loginUserId);

  const sql = `
    SELECT
      CAST(mem.con_short_id AS TEXT) AS con_short_id,
      mem.con_id,
      CAST(mem.member_id AS TEXT) AS agent_id,
      mem.member_type,

      COALESCE(NULLIF(mem.nick_name, ''), a.agent_name, '') AS nick_name,

      mem.privilege,
      mem.create_time,
      mem.status,
      mem.extra,
      COALESCE(NULLIF(a.local_avatar_uri, ''), a.avatar_uri) AS avatar_uri,
      a.description,
      CAST(a.owner_id AS TEXT) AS owner_id,
      a.modify_time
    FROM ${memberTable} mem
    LEFT JOIN ${agentTable} a
      ON mem.member_type = 2
     AND a.agent_id = mem.member_id
    WHERE mem.con_id = ${sqlValue(conId)}
      AND mem.member_type = 2
    ORDER BY mem.create_time ASC;
  `;

  const rows = await selectSql(sql);
  return mapRowsBigInt(rows, ['con_short_id', 'agent_id', 'owner_id']);
}

/* ----------------------------- 拉取：指定 sender 列表对应的群成员信息（按 con_id） ----------------------------- */

async function getMemberInfosBySenders(conId, senders) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { memberTable, userTable, agentTable } = getTablesByUser(loginUserId);

  if (!Array.isArray(senders) || senders.length === 0) return [];

  const filtered = senders.filter(s =>
    s &&
    (s.sender_type === 1 || s.sender_type === 2) &&
    s.sender_id !== null &&
    s.sender_id !== undefined
  );
  if (filtered.length === 0) return [];

  const valuesSql = filtered
    .map(s => `(${sqlValue(s.sender_type)}, ${sqlValue(s.sender_id)})`)
    .join(',');

  const sql = `
    WITH input(sender_type, sender_id) AS (
      VALUES ${valuesSql}
    )
    SELECT
      i.sender_type,
      CAST(i.sender_id AS TEXT) AS sender_id,
      CAST(mem.con_short_id AS TEXT) AS con_short_id,
      mem.con_id,

      CASE
        WHEN i.sender_type = 1 THEN COALESCE(NULLIF(mem.nick_name, ''), u.username, '')
        WHEN i.sender_type = 2 THEN COALESCE(NULLIF(mem.nick_name, ''), a.agent_name, '')
        ELSE ''
      END AS nick_name,

      mem.privilege,
      mem.create_time,
      mem.status,
      mem.extra,

      CASE
        WHEN i.sender_type = 1 THEN COALESCE(NULLIF(u.local_avatar_uri, ''), u.avatar_uri)
        WHEN i.sender_type = 2 THEN COALESCE(NULLIF(a.local_avatar_uri, ''), a.avatar_uri)
        ELSE ''
      END AS avatar_uri,

      CASE
        WHEN i.sender_type = 1 THEN u.local_avatar_uri
        WHEN i.sender_type = 2 THEN a.local_avatar_uri
        ELSE ''
      END AS local_avatar_uri,

      CASE
        WHEN i.sender_type = 1 THEN ''
        WHEN i.sender_type = 2 THEN a.description
        ELSE ''
      END AS description,

      CASE
        WHEN i.sender_type = 1 THEN NULL
        WHEN i.sender_type = 2 THEN CAST(a.owner_id AS TEXT)
        ELSE NULL
      END AS owner_id,

      CASE
        WHEN i.sender_type = 1 THEN u.modify_time
        WHEN i.sender_type = 2 THEN a.modify_time
        ELSE NULL
      END AS modify_time

    FROM input i
    LEFT JOIN ${memberTable} mem
      ON mem.con_id = ${sqlValue(conId)}
     AND mem.member_type = i.sender_type
     AND mem.member_id = i.sender_id
    LEFT JOIN ${userTable} u
      ON i.sender_type = 1
     AND u.user_id = i.sender_id
    LEFT JOIN ${agentTable} a
      ON i.sender_type = 2
     AND a.agent_id = i.sender_id;
  `;

  const rows = await selectSql(sql);
  return mapRowsBigInt(rows, ['sender_id', 'con_short_id', 'owner_id']);
}

/* ----------------------------- 拉取：Users / Agents / Count ----------------------------- */

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

async function getAgentsByIds(agentIds) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { agentTable } = getTablesByUser(loginUserId);

  if (!Array.isArray(agentIds) || agentIds.length === 0) return [];

  const uniq = Array.from(new Set(agentIds.map(v => String(v))));
  const inList = uniq.map(s => sqlValue(s)).join(',');

  const sql = `
    SELECT
      CAST(agent_id AS TEXT) AS agent_id,
      agent_name,
      avatar_uri,
      local_avatar_uri,
      description,
      CAST(owner_id AS TEXT) AS owner_id,
      modify_time
    FROM ${agentTable}
    WHERE CAST(agent_id AS TEXT) IN (${inList});
  `;

  const rows = await selectSql(sql);
  return mapRowsBigInt(rows, ['agent_id', 'owner_id']);
}

async function getMemberCount(conId) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { memberTable } = getTablesByUser(loginUserId);

  const sql = `
    SELECT COUNT(1) AS cnt
    FROM ${memberTable}
    WHERE con_id = ${sqlValue(conId)}
      AND member_type = 1;
  `;

  const rows = await selectSql(sql);
  return Number(rows?.[0]?.cnt || 0);
}

/* ----------------------------- 更新 ----------------------------- */

function toEntries(data) {
  if (!data) return [];
  if (data instanceof Map) return Array.from(data.entries());
  return Object.entries(data);
}

async function updateConversation(conId, data) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { conTable } = getTablesByUser(userId);

  const entries = toEntries(data);
  if (entries.length === 0) return;

  const setClause = entries.map(([k, v]) => `${k} = ${sqlValue(v)}`).join(', ');
  const sql = `UPDATE ${conTable} SET ${setClause} WHERE con_id = ${sqlValue(conId)};`;
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

async function updateAgentLocalAvatar(agentIdValue, localPath) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { agentTable } = getTablesByUser(loginUserId);

  const sql = `
    UPDATE ${agentTable}
    SET local_avatar_uri = ${sqlValue(localPath)}
    WHERE CAST(agent_id AS TEXT) = ${sqlValue(String(agentIdValue))};
  `;
  return execSql(sql);
}

/* ----------------------------- 删除 ----------------------------- */

async function deleteConversation(conId) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { conTable } = getTablesByUser(userId);

  const sql = `DELETE FROM ${conTable} WHERE con_id = ${sqlValue(conId)};`;
  return execSql(sql);
}

async function deleteMessage(msgId) {
  await ensureOpen();

  const userId = getLoginUserId();
  const { msgTable } = getTablesByUser(userId);

  const sql = `DELETE FROM ${msgTable} WHERE msg_id = ${sqlValue(msgId)};`;
  return execSql(sql);
}

async function deleteMembersByIds(conId, memberType, memberIds) {
  await ensureOpen();

  const loginUserId = getLoginUserId();
  const { memberTable } = getTablesByUser(loginUserId);

  if (!Array.isArray(memberIds) || memberIds.length === 0) return;

  const uniq = Array.from(new Set(memberIds.map(v => String(v))));
  const inList = uniq.map(v => sqlValue(v)).join(",");

  const sql = `
    DELETE FROM ${memberTable}
    WHERE con_id = ${sqlValue(conId)}
      AND member_type = ${sqlValue(memberType)}
      AND CAST(member_id AS TEXT) IN (${inList});
  `;
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
  upsertAgents,
  upsertMembers,

  pullConversation,
  pullMessage,
  pullUserMembers,
  pullAgentMembers,
  getConversationById,
  getConversationByShortId,
  getMemberInfosBySenders,

  getUsersByIds,
  getAgentsByIds,
  getMemberCount,

  updateConversation,
  updateMessage,
  updateUserLocalAvatar,
  updateAgentLocalAvatar,

  deleteConversation,
  deleteMessage,
  deleteMembersByIds
};