// im-cache.js
// 统一：
// 1) ensureUsersCached：只补缺失 user，并对缺失 user 触发头像处理
// 2) ensureAgentsCached：只补缺失 agent，并对缺失 agent 触发头像处理
// 3) enqueueProfileRefresh：用户 / AI TTL 异步刷新
// 4) enqueueGroupRosters：群普通成员 + 群 AI 成员 + 群头像 低优先级后台补齐
// 5) enqueueEntityAvatars：统一触发 user / agent / conv 头像处理
//
// 约定：
// - user_id / agent_id / con_short_id 是 BigInt
// - con_id 是 string
// - 除必须调用后端 short_id 接口时，内部统一以 con_id 流通
// - 所有接口成功直接返回 data，失败返回 undefined

import DB from "@/utils/sqlite.js";
import { getUserInfos } from "@/request/user";
import {
  getConversationMembers,
  getAgentByIds,
  getConversationAgents
} from "@/request/im.js";

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

/* ------------------------------ PNG 下载 ------------------------------ */

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

async function downloadPng(id, url, prefix = "") {
  await ensureAvatarDirOnce();
  const filePath = `${AVATAR_DIR}${prefix}${safeFileId(id)}.png`;
  try {
    const dl = await uni.downloadFile({ url, filePath });
    if (dl.statusCode === 200) return filePath;
  } catch (_) {}
  return "";
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
          await DB.updateUserLocalAvatar(task.id, avatarUri);
        }
        return;
      }

      const localPath = await downloadPng(task.id, avatarUri, "user_");
      if (localPath) {
        await DB.updateUserLocalAvatar(task.id, localPath);
      }
      return;
    }

    if (task.type === "agent") {
      const rows = await DB.getAgentsByIds([task.id]);
      if (!rows || rows.length === 0) return;

      const row = rows[0];
      const avatarUri = row.avatar_uri || "/static/ai.png";
      const oldLocal = row.local_avatar_uri || "";

      if (avatarUri.startsWith("/static/")) {
        if (oldLocal !== avatarUri) {
          await DB.updateAgentLocalAvatar(task.id, avatarUri);
        }
        return;
      }

      const localPath = await downloadPng(task.id, avatarUri, "agent_");
      if (localPath) {
        await DB.updateAgentLocalAvatar(task.id, localPath);
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

      const localPath = await downloadPng(task.id, avatarUri, "conv_");
      if (localPath) {
        await DB.updateConversation(task.id, { local_avatar_uri: localPath });
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

  const resp = await getAgentByIds({ agentIds: missing });
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
      avatar_uri: a.avatar_uri || "/static/ai.png",
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
        oldMap.set(row.user_id, row);
        const mt = Number(row.modify_time || 0);
        const localMissing = !row.local_avatar_uri;
        const needRefresh = !mt || (now - mt) >= ttl || localMissing;
        if (needRefresh) refreshIds.push(row.user_id);
      }

      if (refreshIds.length === 0) return;

      const resp = await getUserInfos({ userIds: refreshIds });
      if (!resp) return;

      const infos = resp.user_infos || [];
      if (!Array.isArray(infos) || infos.length === 0) return;

      const infoMap = new Map();
      for (const u of infos) {
        if (!u || u.user_id === null || u.user_id === undefined) continue;
        infoMap.set(u.user_id, u);
      }

      const upserts = [];
      const needAvatarIds = [];

      for (const uid of refreshIds) {
        const old = oldMap.get(uid);
        const nu = infoMap.get(uid);
        if (!old || !nu) continue;

        const newAvatar = nu.avatar || "/static/user_avatar.png";
        const oldAvatar = old.avatar_uri || "/static/user_avatar.png";
        const oldLocal = old.local_avatar_uri || "";
        const avatarChanged = (newAvatar !== oldAvatar);
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
        oldMap.set(row.agent_id, row);
        const mt = Number(row.modify_time || 0);
        const localMissing = !row.local_avatar_uri;
        const needRefresh = !mt || (now - mt) >= ttl || localMissing;
        if (needRefresh) refreshIds.push(row.agent_id);
      }

      if (refreshIds.length === 0) return;

      const resp = await getAgentByIds({ agentIds: refreshIds });
      if (!resp) return;

      const infos = normalizeAgentList(resp);
      if (!Array.isArray(infos) || infos.length === 0) return;

      const infoMap = new Map();
      for (const a of infos) {
        if (!a || a.agent_id === null || a.agent_id === undefined) continue;
        infoMap.set(a.agent_id, a);
      }

      const upserts = [];
      const needAvatarIds = [];

      for (const aid of refreshIds) {
        const old = oldMap.get(aid);
        const na = infoMap.get(aid);
        if (!old || !na) continue;

        const newAvatar = na.avatar_uri || "/static/ai.png";
        const oldAvatar = old.avatar_uri || "/static/ai.png";
        const oldLocal = old.local_avatar_uri || "";
        const avatarChanged = (newAvatar !== oldAvatar);
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
            nick_name: m.nick_name || "用户",
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

        if (memberRows.length > 0) await DB.upsertMembers(memberRows);
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
            nick_name: a.agent_name || "AI",
            privilege: 0,
            create_time: 0,
            status: 0,
            extra: ""
          });

          if (!oldAgentSet.has(aid)) {
            agentRows.push({
              agent_id: aid,
              agent_name: a.agent_name || "AI",
              avatar_uri: a.avatar_uri || "/static/ai.png",
              local_avatar_uri: "",
              description: a.description || "",
              owner_id: a.owner_id ?? 0n,
              modify_time: now
            });
          }
        }

        if (memberRows.length > 0) await DB.upsertMembers(memberRows);
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