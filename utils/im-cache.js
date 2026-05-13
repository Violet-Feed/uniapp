// im-cache.js
// 统一：
// 1) ensureUsersCached：只补缺失 user，并对缺失 user 触发头像处理
// 2) ensureAgentsCached：只补缺失 agent，并对缺失 agent 触发头像处理
// 3) enqueueProfileRefresh：用户 / AI TTL 异步刷新
// 4) enqueueGroupRosters：群普通成员 + 群 AI 成员 + 群头像 低优先级后台补齐
// 5) enqueueEntityAvatars：统一触发 user / agent / conv 头像处理
//
// 用户信息刷新策略
//
// 本地用户资料分为两类维护：
// 1. 缺失补齐：保证页面能显示。
// 2. TTL 刷新：保证已有资料不会长期陈旧。
//
// -----------------------------------------------------------------------------
// 1. 缺失补齐
// -----------------------------------------------------------------------------
// 缺失补齐只处理“本地 user 表不存在”的用户。
// 典型场景：私聊对端、消息发送者、页面展示时遇到的新用户。
//
// 使用方法：ensureUsersCached(userIds)
//
// 行为：
// - 先查询本地 user 表。
// - 只对本地不存在的 user_id 调用 getUserInfos。
// - 写入 user 表时：
//   - username 使用后端返回值，缺省为“用户”。
//   - avatar_uri 使用后端头像，缺省为 /static/user_avatar.png。
//   - modify_time 写当前时间。
//   - local_avatar_uri 初始化为空字符串。
// - 写入完成后，立即把这些新用户加入头像处理队列。
//
// 注意：ensureUsersCached 只负责“补缺失”，不负责刷新旧用户，也不判断 TTL。
// 目标是：“这个用户本地没有，就先补上，并让头像异步落到本地可展示路径。”
//
// -----------------------------------------------------------------------------
// 2. TTL 刷新
// -----------------------------------------------------------------------------
// TTL 刷新只处理“本地已经存在，但资料可能过期”的用户。
// 它不应该在消息同步、socket 收消息等高频链路中触发，避免请求放大。
//
// 使用方法：enqueueProfileRefresh("user", userIds, ttlMs)
//
// 行为：
// - 查询本地 user.modify_time。
// - 只有满足以下任一条件时才刷新：
//   - modify_time 为空。
//   - 当前时间距离 modify_time 已超过 ttlMs。
//   - local_avatar_uri 为空，说明头像尚未本地化完成。
// - 对需要刷新的用户批量调用 getUserInfos。
// - 更新 username、avatar_uri、modify_time。
// - 默认保留旧的 local_avatar_uri，避免无意义重下头像。
// - 只有头像地址变化，或者 local_avatar_uri 为空时，才重新进入头像队列。
//
// 注意：TTL 刷新的目标是“已有用户过期了才刷新；头像没变就复用本地头像。”
//
// -----------------------------------------------------------------------------
// 3. TTL 触发点
// -----------------------------------------------------------------------------
// 私聊：
// - 在首页会话列表触发。
// - 只刷新私聊对端用户。
// - TTL 为 1 天。
// 示例：enqueueProfileRefresh("user", privateUserIds, 24 * 60 * 60 * 1000)
//
// 群聊：
// - 在进入群聊页后触发。
// - 只刷新最近 20 条消息里出现过的发送者。
// - 不扫描全群成员。
// - TTL 为 7 天。
// 示例：enqueueProfileRefresh("user", senderIdsOfTop20, 7 * 24 * 60 * 60 * 1000)
//
// 其他场景：
// - 不主动做 TTL 刷新。
// - 比如内容流、偶遇用户、非核心展示用户，只在缺失时补齐。
//
// -----------------------------------------------------------------------------
// 4. 群成员策略
// -----------------------------------------------------------------------------
// 群成员数据分两层维护：
// - member 表：维护群内关系、群昵称、权限、成员身份等。
// - user / agent 表：维护用户或 AI 实体自身资料。
//
// 使用方法：enqueueGroupRosters(conIds)
//
// 行为：
// - 只有群 roster 缺失时才请求后端。
// - 异步拉取群普通成员和群 AI 成员。
// - 写入 member 表。
// - 对本地不存在的用户或 AI，顺便写入 user / agent 表。
// - 不主动下载全员头像。
//
// 注意：群成员策略是“关系先补齐，头像懒加载，不做全量头像下载。”
// 这样可以避免进入大群时一次性下载大量头像，影响性能和流量。
//
// -----------------------------------------------------------------------------
// 5. 头像处理策略
// -----------------------------------------------------------------------------
// 头像下载统一走 avatarQueue，永远异步执行。
// 头像处理不阻塞消息同步、会话列表渲染和页面进入。
//
// 新用户 / 新 AI：
// - 写入时 local_avatar_uri 初始化为空。
// - 写入后立即进入 avatarQueue。
// - 如果 avatar_uri 是 /static/...，直接把默认头像写入 local_avatar_uri。
// - 如果 avatar_uri 是远程 URL，下载到 _doc/avatar/ 后写回 local_avatar_uri。
//
// 已存在用户 / 已存在 AI：
// - TTL 刷新时默认保留旧的 local_avatar_uri。
// - 只有头像 URL 发生变化，才重新处理头像。
// - 如果 local_avatar_uri 为空，也会重新进入头像队列，作为自修复机制。
//
// 头像策略可以概括为：
// - 缺失实体：头像必处理。
// - 已有实体：头像地址变了才重下。
// - 本地头像为空：视为未完成状态，后续刷新会继续补齐。
// - 默认头像也是合法的 local_avatar_uri，不是失败状态。

import DB from "@/utils/sqlite.js";
import { getUserInfos } from "@/request/user";
import {
  getConversationMembers,
  getConversationAgents
} from "@/request/im.js";
import { getAgentsByIds } from "@/request/agent";

const AVATAR_DIR = "_doc/avatar/";

/* ------------------------------ 简单并发队列 ------------------------------ */

function createQueue({ concurrency = 4, worker }) {
  const q = [];
  let running = 0;

  async function pump() {
    while (running < concurrency && q.length > 0) {
      const task = q.shift();
      running++;
      Promise.resolve()
        .then(() => worker(task))
        .catch((err) => {
          console.error("avatar/cache queue task failed", err);
        })
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

/* ------------------------------ 返回结构归一化 ------------------------------ */

function normalizeAgentList(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  return resp.agents || resp.list || [];
}

function normalizeMembers(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  return resp.members || resp.list || [];
}

/* ------------------------------ 文件名安全处理 ------------------------------ */

function safeFileId(id) {
  return String(id).replace(/[^\w.-]/g, "_");
}

/* ------------------------------ PNG 下载与旧头像清理 ------------------------------ */

async function ensureAvatarDirOnce() {
  return new Promise((resolve) => {
    if (!(typeof plus !== "undefined" && plus.io)) return resolve();

    plus.io.resolveLocalFileSystemURL(
      "_doc/",
      (root) => root.getDirectory(
        "avatar",
        { create: true },
        () => resolve(),
        () => resolve()
      ),
      () => resolve()
    );
  });
}

function shouldRemoveOldLocalAvatar(path) {
  return !!path &&
    typeof path === "string" &&
    path.startsWith(AVATAR_DIR);
}

function removeLocalFileIfExists(path) {
  return new Promise((resolve) => {
    if (!shouldRemoveOldLocalAvatar(path)) return resolve();
    if (!(typeof plus !== "undefined" && plus.io)) return resolve();

    plus.io.resolveLocalFileSystemURL(
      path,
      (entry) => {
        entry.remove(
          () => {
            console.log("remove old avatar success", path);
            resolve();
          },
          (err) => {
            console.warn("remove old avatar failed", path, err);
            resolve();
          }
        );
      },
      () => resolve()
    );
  });
}

async function cleanupOldLocalAvatar(oldLocal, newLocal) {
  if (!oldLocal || !newLocal || oldLocal === newLocal) return;
  await removeLocalFileIfExists(oldLocal);
}

async function downloadPng(url, prefix = "") {
  await ensureAvatarDirOnce();

  const avatarFileId = getApp().globalData.randomIdGenerator.nextId();
  const target = `${AVATAR_DIR}${prefix}${safeFileId(avatarFileId)}.png`;

  return new Promise((resolve) => {
    const task = plus.downloader.createDownload(
      url,
      { filename: target },
      (d, status) => {
        if (status === 200) {
          console.log("download avatar success", d.filename);
          resolve(d.filename);
        } else {
          console.error("download avatar failed", {
            status,
            url,
            target
          });
          resolve("");
        }
      }
    );

    task.start();
  });
}

/* ------------------------------ avatarQueue：统一处理 user / agent / conv 头像 ------------------------------ */

const avatarQueue = createQueue({
  concurrency: 4,
  worker: async (task) => {
    // task:
    // - { type: "user", id: BigInt }
    // - { type: "agent", id: BigInt }
    // - { type: "conv", id: string(con_id) }
    if (!task || !task.type || task.id === null || task.id === undefined) return;

    if (task.type === "user") {
      const rows = await DB.getUsersByIds([task.id]);
      if (!rows || rows.length === 0) return;

      const row = rows[0];
      const avatarUri = row.avatar_uri || "/static/user_avatar.png";
      const oldLocal = row.local_avatar_uri || "";

      if (avatarUri.startsWith("/static/")) {
        if (oldLocal !== avatarUri) {
          await DB.updateUser(task.id, { local_avatar_uri: avatarUri });
        }
        return;
      }

      const localPath = await downloadPng(avatarUri, "user_");
      if (localPath) {
        await DB.updateUser(task.id, { local_avatar_uri: localPath });
        await cleanupOldLocalAvatar(oldLocal, localPath);
      }
      return;
    }

    if (task.type === "agent") {
      const rows = await DB.getAgentsByIds([task.id]);
      if (!rows || rows.length === 0) return;

      const row = rows[0];
      const avatarUri = row.avatar_uri || "/static/ai_avatar.png";
      const oldLocal = row.local_avatar_uri || "";

      if (avatarUri.startsWith("/static/")) {
        if (oldLocal !== avatarUri) {
          await DB.updateAgent(task.id, { local_avatar_uri: avatarUri });
        }
        return;
      }

      const localPath = await downloadPng(avatarUri, "agent_");
      if (localPath) {
        await DB.updateAgent(task.id, { local_avatar_uri: localPath });
        await cleanupOldLocalAvatar(oldLocal, localPath);
      }
      return;
    }

    if (task.type === "conv") {
      const row = await DB.getConversationById(task.id);
      if (!row) return;

      const avatarUri = row.avatar_uri || "/static/conv_avatar.png";
      const oldLocal = row.local_avatar_uri || "";

      if (avatarUri.startsWith("/static/")) {
        if (oldLocal !== avatarUri) {
          await DB.updateConversation(task.id, { local_avatar_uri: avatarUri });
        }
        return;
      }

      if (avatarUri === oldLocal) return;

      const localPath = await downloadPng(avatarUri, "conv_");
      if (localPath) {
        await DB.updateConversation(task.id, { local_avatar_uri: localPath });
        await cleanupOldLocalAvatar(oldLocal, localPath);
      }
    }
  }
});

export function enqueueEntityAvatars(type, ids) {
  const arr = Array.isArray(ids) ? ids : [ids];
  if (!type || !arr || arr.length === 0) return;
  avatarQueue.enqueueMany(arr.map(id => ({ type, id })));
}

/* ------------------------------ ensureUsersCached：只补缺失 user ------------------------------ */

export async function ensureUsersCached(userIds) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (!ids || ids.length === 0) return;

  const existing = await DB.getUsersByIds(ids);
  const existSet = new Set((existing || []).map(u => u.user_id));

  const missing = [];
  for (const id of ids) {
    if (!existSet.has(id)) missing.push(id);
  }

  if (missing.length === 0) return;
  const resp = await getUserInfos({ userIds: missing });
  if (!resp) return;

  const infos = resp.user_infos || [];
  if (!Array.isArray(infos) || infos.length === 0) return;

  const now = Date.now();
  const upserts = [];

  for (const u of infos) {
    if (!u || u.user_id === null || u.user_id === undefined) continue;

    upserts.push({
      user_id: u.user_id,
      username: u.username || "用户",
      avatar_uri: u.avatar || "/static/user_avatar.png",
      local_avatar_uri: "",
      modify_time: now
    });
  }

  if (upserts.length === 0) return;

  await DB.upsertUsers(upserts);
  enqueueEntityAvatars("user", upserts.map(x => x.user_id));
}

/* ------------------------------ ensureAgentsCached：只补缺失 agent ------------------------------ */

export async function ensureAgentsCached(agentIds) {
  const ids = Array.isArray(agentIds) ? agentIds : [agentIds];
  if (!ids || ids.length === 0) return;

  const existing = await DB.getAgentsByIds(ids);
  const existSet = new Set((existing || []).map(a => a.agent_id));

  const missing = [];
  for (const id of ids) {
    if (!existSet.has(id)) missing.push(id);
  }
  if (missing.length === 0) return;

  const resp = await getAgentsByIds({ agentIds: missing });
  if (!resp) return;

  const infos = normalizeAgentList(resp);
  if (!Array.isArray(infos) || infos.length === 0) return;

  const now = Date.now();
  const upserts = [];

  for (const a of infos) {
    if (!a || a.agent_id === null || a.agent_id === undefined) continue;

    upserts.push({
      agent_id: a.agent_id,
      agent_name: a.agent_name || "AI",
      avatar_uri: a.avatar_uri || "/static/ai_avatar.png",
      local_avatar_uri: "",
      description: a.description || "",
      owner_id: a.owner_id ?? 0n,
      modify_time: now
    });
  }

  if (upserts.length === 0) return;

  await DB.upsertAgents(upserts);
  enqueueEntityAvatars("agent", upserts.map(x => x.agent_id));
}

/* ------------------------------ profileRefreshQueue：用户 / AI TTL 刷新 ------------------------------ */

const profileRefreshQueue = createQueue({
  concurrency: 2,
  worker: async (task) => {
    const { type, ids, ttlMs } = task || {};
    if (!type || !ids || ids.length === 0) return;

    const ttl = Number(ttlMs || 0);
    if (ttl <= 0) return;

    const now = Date.now();

    if (type === "user") {
      const rows = await DB.getUsersByIds(ids);
      if (!rows || rows.length === 0) return;

      const refreshIds = [];
      const oldMap = new Map();

      for (const row of rows) {
        oldMap.set(String(row.user_id), row);
        const mt = Number(row.modify_time || 0);
        const localMissing = !row.local_avatar_uri;
        const needRefresh = !mt || (now - mt) >= ttl || localMissing;
        if (needRefresh) refreshIds.push(row.user_id);
      }

      if (refreshIds.length === 0) return;
	  console.log("profileRefreshQueue userId : ",refreshIds.toString())
      const resp = await getUserInfos({ userIds: refreshIds });
      if (!resp) return;
	  
      const infos = resp.user_infos || [];
      if (!Array.isArray(infos) || infos.length === 0) return;
	  
      const infoMap = new Map();
      for (const u of infos) {
        if (!u || u.user_id === null || u.user_id === undefined) continue;
        infoMap.set(String(u.user_id), u);
      }

      const upserts = [];
      const needAvatarIds = [];

      for (const uid of refreshIds) {
		const key = String(uid);
        const old = oldMap.get(key);
        const nu = infoMap.get(key);
        if (!old || !nu) continue;
	
        const newAvatar = nu.avatar || "/static/user_avatar.png";
        const oldAvatar = old.avatar_uri || "/static/user_avatar.png";
        const oldLocal = old.local_avatar_uri || "";
        const avatarChanged = newAvatar !== oldAvatar;
        const localMissing = !oldLocal;

        upserts.push({
          user_id: uid,
          username: nu.username || old.username || "用户",
          avatar_uri: newAvatar,
          local_avatar_uri: oldLocal,
          modify_time: now
        });

        if (avatarChanged || localMissing) {
          needAvatarIds.push(uid);
        }
      }

      if (upserts.length > 0) {
        await DB.upsertUsers(upserts);
      }
      if (needAvatarIds.length > 0) {
        enqueueEntityAvatars("user", needAvatarIds);
      }
      return;
    }

    if (type === "agent") {
      const rows = await DB.getAgentsByIds(ids);
      if (!rows || rows.length === 0) return;

      const refreshIds = [];
      const oldMap = new Map();

      for (const row of rows) {
        oldMap.set(String(row.agent_id), row);
        const mt = Number(row.modify_time || 0);
        const localMissing = !row.local_avatar_uri;
        const needRefresh = !mt || (now - mt) >= ttl || localMissing;
        if (needRefresh) refreshIds.push(row.agent_id);
      }

      if (refreshIds.length === 0) return;
	  console.log("profileRefreshQueue agentId : ",refreshIds.toString())
      const resp = await getAgentsByIds({ agentIds: refreshIds });
      if (!resp) return;

      const infos = normalizeAgentList(resp);
      if (!Array.isArray(infos) || infos.length === 0) return;

      const infoMap = new Map();
      for (const a of infos) {
        if (!a || a.agent_id === null || a.agent_id === undefined) continue;
        infoMap.set(String(a.agent_id), a);
      }

      const upserts = [];
      const needAvatarIds = [];

      for (const aid of refreshIds) {
		const key = String(aid);
        const old = oldMap.get(key);
        const na = infoMap.get(key);
        if (!old || !na) continue;

        const newAvatar = na.avatar_uri || "/static/ai_avatar.png";
        const oldAvatar = old.avatar_uri || "/static/ai_avatar.png";
        const oldLocal = old.local_avatar_uri || "";
        const avatarChanged = newAvatar !== oldAvatar;
        const localMissing = !oldLocal;

        upserts.push({
          agent_id: aid,
          agent_name: na.agent_name || old.agent_name || "AI",
          avatar_uri: newAvatar,
          local_avatar_uri: oldLocal,
          description: na.description || old.description || "",
          owner_id: na.owner_id ?? old.owner_id ?? 0n,
          modify_time: now
        });

        if (avatarChanged || localMissing) {
          needAvatarIds.push(aid);
        }
      }

      if (upserts.length > 0) {
        await DB.upsertAgents(upserts);
      }
      if (needAvatarIds.length > 0) {
        enqueueEntityAvatars("agent", needAvatarIds);
      }
    }
  }
});

export function enqueueProfileRefresh(type, ids, ttlMs) {
  const arr = Array.isArray(ids) ? ids : [ids];
  if (!type || !arr || arr.length === 0) return;
  profileRefreshQueue.enqueue({ type, ids: arr, ttlMs });
}

/* ------------------------------ rosterQueue：群普通成员 + 群 AI 成员 + 群头像 后台补齐 ------------------------------ */

const rosterQueue = createQueue({
  concurrency: 2,
  worker: async (conId) => {
    const userCnt = await DB.getMemberCount(conId);
    if (userCnt !== 0) return;

    const now = Date.now();
    const conv = await DB.getConversationById(conId);

    if (!conv) return;

    const conShortId = conv.con_short_id;

    const memberResp = await getConversationMembers({ conShortId: conShortId });
    if (memberResp) {
      const members = normalizeMembers(memberResp);
      if (Array.isArray(members) && members.length > 0) {
        const memberRows = [];
        const userRows = [];

        const memberUserIds = members
          .filter(m => m && m.user_id !== null && m.user_id !== undefined)
          .map(m => m.user_id);

        const oldUsers = await DB.getUsersByIds(memberUserIds);
        const oldUserSet = new Set((oldUsers || []).map(u => u.user_id));

        for (const m of members) {
          if (!m || m.user_id === null || m.user_id === undefined) continue;

          const uid = m.user_id;

          memberRows.push({
            con_short_id: conShortId,
            con_id: conId,
            member_id: uid,
            member_type: 1,
            nick_name: m.nick_name || "",
            privilege: m.privilege ?? 0,
            create_time: m.create_time ?? 0,
            status: m.status ?? 0,
            extra: m.extra || ""
          });

          if (!oldUserSet.has(uid)) {
            userRows.push({
              user_id: uid,
              username: m.username || "用户",
              avatar_uri: m.avatar || "/static/user_avatar.png",
              local_avatar_uri: "",
              modify_time: now
            });
          }
        }

        if (memberRows.length > 0) {
          await DB.upsertMembers(memberRows);
        }
        if (userRows.length > 0) {
          await DB.upsertUsers(userRows);
        }
      }
    }

    const agentResp = await getConversationAgents({ conShortId });
    if (agentResp) {
      const agents = normalizeAgentList(agentResp);
      if (Array.isArray(agents) && agents.length > 0) {
        const memberRows = [];
        const agentRows = [];

        const agentIds = agents
          .filter(a => a && a.agent_id !== null && a.agent_id !== undefined)
          .map(a => a.agent_id);

        const oldAgents = await DB.getAgentsByIds(agentIds);
        const oldAgentSet = new Set((oldAgents || []).map(a => a.agent_id));

        for (const a of agents) {
          if (!a || a.agent_id === null || a.agent_id === undefined) continue;

          const aid = a.agent_id;

          memberRows.push({
            con_short_id: conShortId,
            con_id: conId,
            member_id: aid,
            member_type: 2,
            nick_name: "",
            privilege: 0,
            create_time: a.create_time ?? 0,
            status: a.status ?? 0,
            extra: a.extra || ""
          });

          if (!oldAgentSet.has(aid)) {
            agentRows.push({
              agent_id: aid,
              agent_name: a.agent_name || "AI",
              avatar_uri: a.avatar_uri || "/static/ai_avatar.png",
              local_avatar_uri: "",
              description: a.description || "",
              owner_id: a.owner_id ?? 0n,
              modify_time: now
            });
          }
        }

        if (memberRows.length > 0) {
          await DB.upsertMembers(memberRows);
        }
        if (agentRows.length > 0) {
          await DB.upsertAgents(agentRows);
        }
      }
    }

    enqueueEntityAvatars("conv", [conId]);
  }
});

export function enqueueGroupRosters(conIds) {
  const ids = Array.isArray(conIds) ? conIds : [conIds];
  if (!ids || ids.length === 0) return;
  rosterQueue.enqueueMany(ids);
}