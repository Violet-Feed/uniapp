import DB from "@/utils/sqlite_new.js";
import { getUserInfos, getConversationMembers } from "@/request/im.js";

const AVATAR_DIR = "_doc/avatar/";

/* ------------------------------ 简单并发队列（统一风格） ------------------------------ */

function createQueue({ concurrency = 4, worker }) {
  const q = [];
  let running = 0;

  async function pump() {
    while (running < concurrency && q.length > 0) {
      const task = q.shift();
      running++;
      Promise.resolve()
        .then(() => worker(task))
        .catch(() => {})
        .finally(() => {
          running--;
          pump();
        });
    }
  }

  return {
    enqueue(task) {
      q.push(task);
      pump();
    },
    enqueueMany(tasks) {
      if (!Array.isArray(tasks) || tasks.length === 0) return;
      for (const t of tasks) q.push(t);
      pump();
    }
  };
}

/* ------------------------------ PNG 下载（默认实现） ------------------------------ */

async function ensureAvatarDirOnce() {
  return new Promise((resolve) => {
    if (!(typeof plus !== "undefined" && plus.io)) return resolve();
    plus.io.resolveLocalFileSystemURL(
      "_doc/",
      (root) => root.getDirectory("avatar", { create: true }, () => resolve(), () => resolve()),
      () => resolve()
    );
  });
}

async function downloadPng(userId, url) {
  await ensureAvatarDirOnce();
  const filePath = `${AVATAR_DIR}${userId.toString()}.png`; // 文件名必须 string
  try {
    const dl = await uni.downloadFile({ url, filePath });
    if (dl.statusCode === 200) return filePath;
  } catch (_) {}
  return "";
}

/* ------------------------------ avatarQueue：仅下载头像 ------------------------------ */

const avatarQueue = createQueue({
  concurrency: 4,
  worker: async (userId) => {
    // task: BigInt
    const rows = await DB.getUsersByIds([userId]);
    if (!rows || rows.length === 0) return;

    const u = rows[0];
    const avatarUri = u.avatar_uri || "";
    if (!avatarUri || avatarUri.startsWith("/static/")) return;

    // 有本地头像就不下；重下由刷新队列清空 local 控制
    if (u.local_avatar_uri) return;

    const localPath = await downloadPng(userId, avatarUri);
    if (localPath) {
      await DB.updateUserLocalAvatar(userId, localPath);
    }
  }
});

/* ------------------------------ profileRefreshQueue：入口传 userIds + ttl，在 worker 内判断 TTL ------------------------------ */
/**
 * enqueueProfileRefresh(userIds, ttlMs)
 * - 只处理“已存在 user”的 TTL 刷新（缺失不管；缺失由 ensureUsersCached 负责）
 * - worker 内：
 *   1) DB.getUsersByIds -> 过滤 stale
 *   2) getUserInfos(staleIds) 批量拉新
 *   3) 比较 avatar 是否变化：变化则清空 local + enqueue 头像下载
 *   4) upsertUsers 写回 modify_time
 */
const profileRefreshQueue = createQueue({
  concurrency: 2,
  worker: async (task) => {
    // task: { userIds: BigInt[], ttlMs: number }
    const { userIds, ttlMs } = task || {};
    if (!userIds || userIds.length === 0) return;

    const ttl = Number(ttlMs || 0);
    if (ttl <= 0) return;

    const now = Date.now();

    const rows = await DB.getUsersByIds(userIds);
    if (!rows || rows.length === 0) return;

    const staleIds = [];
    const oldMap = new Map(); // BigInt -> oldRow
    for (const r of rows) {
      oldMap.set(r.user_id, r);
      const mt = Number(r.modify_time || 0);
      if (!mt || (now - mt) >= ttl) staleIds.push(r.user_id);
    }

    if (staleIds.length === 0) return;

    const resp = await getUserInfos(staleIds);
    if (!resp) return;

    const infos = resp.user_infos || [];
    if (!Array.isArray(infos) || infos.length === 0) return;

    const infoMap = new Map(); // BigInt -> info
    for (const u of infos) {
      if (!u || u.user_id === null || u.user_id === undefined) continue;
      infoMap.set(u.user_id, u);
    }

    const upserts = [];
    for (const uid of staleIds) {
      const old = oldMap.get(uid);
      const nu = infoMap.get(uid);
      if (!old || !nu) continue;

      const newAvatar = nu.avatar || "/static/user_avatar.png";
      const oldAvatar = old.avatar_uri || "";
      const avatarChanged = (newAvatar !== oldAvatar);

      upserts.push({
        user_id: uid,
        username: nu.username || old.username || "",
        avatar_uri: newAvatar,
        local_avatar_uri: avatarChanged ? "" : (old.local_avatar_uri || ""),
        modify_time: now
      });

      // 私聊刷新：头像变了就重下
      if (avatarChanged && newAvatar && !newAvatar.startsWith("/static/")) {
        avatarQueue.enqueue(uid);
      }
    }

    if (upserts.length > 0) {
      await DB.upsertUsers(upserts);
    }
  }
});

/* ------------------------------ rosterQueue：群成员后台补齐（不主动下载全员头像） ------------------------------ */

const rosterQueue = createQueue({
  concurrency: 2,
  worker: async (conShortId) => {
    // task: BigInt
    const cnt = await DB.getMemberCount(conShortId);
    if (cnt > 0) return;

    const resp = await getConversationMembers(conShortId);
    if (!resp) return;

    const members = resp.members || [];
    if (!Array.isArray(members) || members.length === 0) return;

    const now = Date.now();

    // 读取旧 user：用于保留 local_avatar_uri；若 avatar 变化只清空 local（不下载）
    const memberUserIds = members.map(m => m.user_id);
    const oldUsers = await DB.getUsersByIds(memberUserIds);
    const oldMap = new Map((oldUsers || []).map(u => [u.user_id, u]));

    const memberRows = [];
    const userRows = [];

    for (const m of members) {
      if (!m || m.user_id === null || m.user_id === undefined) continue;

      const uid = m.user_id; // BigInt
      memberRows.push({
        con_short_id: conShortId,
        user_id: uid,
        nick_name: m.nick_name || "",
        privilege: m.privilege ?? 0,
        create_time: m.create_time ?? 0,
        status: m.status ?? 0,
        extra: m.extra || ""
      });

      const old = oldMap.get(uid);
      const oldAvatar = old?.avatar_uri || "";
      const oldLocal = old?.local_avatar_uri || "";

      const newAvatar = m.avatar || oldAvatar || "/static/user_avatar.png";
      const avatarChanged = (newAvatar !== oldAvatar);

      userRows.push({
        user_id: uid,
        username: m.username || old?.username || "",
        avatar_uri: newAvatar,
        local_avatar_uri: avatarChanged ? "" : oldLocal, // 群成员不下载：只清空 local 让 UI 回落远程
        modify_time: now
      });
    }

    if (memberRows.length > 0) await DB.upsertMembers(memberRows);
    if (userRows.length > 0) await DB.upsertUsers(userRows);
  }
});

/* ------------------------------ ensureUsersCached：只补缺失 + 缺失必下头像 ------------------------------ */

export async function ensureUsersCached(userIds) {
  // userIds: BigInt[] | BigInt
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (!ids || ids.length === 0) return;

  const existing = await DB.getUsersByIds(ids);
  const existSet = new Set((existing || []).map(u => u.user_id)); // BigInt Set（按值比较）

  const missing = [];
  for (const id of ids) {
    if (!existSet.has(id)) missing.push(id);
  }
  if (missing.length === 0) return;

  const resp = await getUserInfos(missing); // 成功直接返回 data
  if (!resp) return;

  const infos = resp.user_infos || [];
  if (!Array.isArray(infos) || infos.length === 0) return;

  const now = Date.now();
  const upserts = [];

  for (const u of infos) {
    if (!u || u.user_id === null || u.user_id === undefined) continue;

    const uid = u.user_id; // BigInt（你保证）
    const avatarUri = u.avatar || "/static/user_avatar.png";

    upserts.push({
      user_id: uid,
      username: u.username || "",
      avatar_uri: avatarUri,
      local_avatar_uri: "", // 缺失用户：必下头像
      modify_time: now
    });
  }

  if (upserts.length === 0) return;

  await DB.upsertUsers(upserts);

  // 缺失用户：必下头像（只要不是 static）
  for (const r of upserts) {
    if (r.avatar_uri && !r.avatar_uri.startsWith("/static/")) {
      avatarQueue.enqueue(r.user_id);
    }
  }
}

export function enqueueProfileRefresh(userIds, ttlMs) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (!ids || ids.length === 0) return;
  profileRefreshQueue.enqueue({ userIds: ids, ttlMs });
}

export function enqueueGroupRosters(conShortIds) {
  const ids = Array.isArray(conShortIds) ? conShortIds : [conShortIds];
  if (!ids || ids.length === 0) return;
  rosterQueue.enqueueMany(ids); // 每个 task 是 BigInt
}

export function enqueueAvatars(userIds) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (!ids || ids.length === 0) return;
  avatarQueue.enqueueMany(ids); // 每个 task 是 BigInt
}
