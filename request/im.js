import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js';
import { httpRequestBackData, httpRequestBackBool } from '@/request/common.js';
import {
  ensureUsersCached,
  ensureAgentsCached,
  enqueueGroupRosters,
  enqueueEntityAvatars
} from "@/utils/im-cache.js";

export const getInitInfo = async () => {
	const { userId } = getApp().globalData;
	const res = await httpRequestBackData("/im/get_init_info", {});
	if (!res) return;
	uni.setStorageSync("user_cmd_index_" + userId, res.user_cmd_index);
	getApp().globalData.userCmdIndex = res.user_cmd_index;
};

export const sendMessage = async (payload) => {
	const data = {
		con_short_id: payload.conShortId,
		con_id: payload.conId,
		con_type: payload.conType,
		client_msg_id: payload.clientMsgId,
		msg_type: payload.msgType,
		msg_content: payload.msgContent
	};
	return httpRequestBackData("/im/send_message",data);
};

export const getMessageByUser = async () => {
  const { userId } = getApp().globalData;
  const PAGE_LIMIT = 50;

  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    const userConIndex = Number(getApp().globalData.userConIndex || 0);
    const req = {
      user_con_index: userConIndex + 1,
      limit: PAGE_LIMIT
    };
    const res = await httpRequestBackData("/im/get_message_by_user", req);
    if (!res) return;
    const cons = res.cons || [];
    hasMore = !!res.has_more;
    const newIdx = Number(res.user_con_index || userConIndex);
    getApp().globalData.userConIndex = newIdx;
    uni.setStorageSync("user_con_index_" + userId, newIdx);

    if (cons.length === 0) continue;
    const privateUserIds = [];
    const privateAgentIds = [];
    const groupConIds = [];
    const peerMap = new Map();
    for (const con of cons) {
      const conInfo = con.con_info;
      if (conInfo.con_type === 1) {
        const parts = String(conInfo.con_id).split(":");
        const peerId = (parts[0] === String(userId)) ? BigInt(parts[1]) : BigInt(parts[0]);
        privateUserIds.push(peerId);
        peerMap.set(conInfo.con_id, peerId);
      } else if (conInfo.con_type === 4) {
        const parts = String(conInfo.con_id).split(":");
        const peerId = BigInt(parts[2]);
        privateAgentIds.push(peerId);
        peerMap.set(conInfo.con_id, peerId);
      } else if (conInfo.con_type === 2) {
        groupConIds.push(conInfo.con_id);
      }
    }
    await ensureUsersCached(privateUserIds);
    await ensureAgentsCached(privateAgentIds);
	//todo:处理extra
    const msgRows = [];
    const conRows = [];
    for (const con of cons) {
      const conInfo = con.con_info;
      const msgBodies = con.msg_bodies || [];
      for (const msg of msgBodies) {
        msgRows.push({
          sender_id: msg.sender_id,
          sender_type: msg.sender_type,
          con_short_id: msg.con_short_id,
          con_id: msg.con_id,
          con_type: msg.con_type,
          client_msg_id: msg.client_msg_id,
          msg_id: msg.msg_id,
          msg_type: msg.msg_type,
          msg_content: (await transformContent(msg)) || "",
          create_time: msg.create_time,
          extra: msg.extra || "",
          con_index: msg.con_index
        });
      }

      const core = conInfo.con_core_info || {};
      const setting = conInfo.con_setting_info || {};
      const last_message_id = msgBodies[0]? msgBodies[0].msg_id : 0;
      const peer_id =
        (conInfo.con_type === 1 || conInfo.con_type === 4)
          ? (peerMap.get(conInfo.con_id) || null)
          : null;
      conRows.push({
        con_short_id: conInfo.con_short_id,
        con_id: conInfo.con_id,
        con_type: conInfo.con_type,
        name: core.name || "群聊",
        avatar_uri: core.avatar_uri || "/static/conv_avatar.png",
        local_avatar_uri: "",
        description: core.description || "",
        owner_id: core.owner_id ?? 0n,
        create_time: core.create_time ?? 0,
        status: core.status ?? 0,
        min_index: setting.min_index ?? 0,
        top_timestamp: setting.top_timestamp ?? 0,
        push_status: setting.push_status ?? 0,
        core_extra: core.extra || "",
        setting_extra: setting.extra || "",
        member_count: core.member_count ?? 0,
        badge_count: conInfo.badge_count ?? 0,
        read_index_end: setting.read_index_end ?? 0,
        read_badge_count: setting.read_badge_count ?? 0,
        user_con_index: Number(conInfo.user_con_index ?? 0),
		is_member: conInfo.is_member ?? 1,
        last_message_id,
        peer_id
      });
    }

    await DB.insertConversation(conRows);
    await DB.insertMessage(msgRows);
    enqueueGroupRosters(groupConIds);
  }
};

export const getCommandByUser = async () => {
  const { userId } = getApp().globalData;
  const PAGE_LIMIT = 200;
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    const userCmdIndex = getApp().globalData.userCmdIndex;
    const res = await httpRequestBackData("/im/get_command_by_user", {
      user_cmd_index: userCmdIndex + 1,
      limit: PAGE_LIMIT
    });
    if (!res) return undefined;
    const msgBodies = res.msg_bodies || [];
    if (msgBodies.length !== 0) {
      for (const msg of msgBodies) {
        await handleCommandMessage(msg);
      }
      uni.setStorageSync("user_cmd_index_" + userId, res.user_cmd_index);
      getApp().globalData.userCmdIndex = res.user_cmd_index;
    }
    hasMore = !!res.has_more;
  }
};

export const getMessageByConversation = async (conShortId, conIndex, limit) => {
  const res = await httpRequestBackData("/im/get_message_by_conversation", {
    con_short_id: BigInt(conShortId),
    con_index: conIndex,
    limit
  });
  if (!res) return undefined;

  const msgBodies = res.msg_bodies || [];
  if (msgBodies.length === 0) return msgBodies;
  const msgRows = [];
  for (let i = 0; i < msgBodies.length; i++) {
	//todo:处理extra
    const msg = msgBodies[i];
    msg.msg_content = await transformContent(msg);
    msgRows.push({
      sender_id: msg.sender_id,
      sender_type: msg.sender_type,
      con_short_id: msg.con_short_id,
      con_id: msg.con_id,
      con_type: msg.con_type,
      client_msg_id: msg.client_msg_id,
      msg_id: msg.msg_id,
      msg_type: msg.msg_type,
      msg_content: msg.msg_content || "",
      create_time: msg.create_time,
      extra: msg.extra || "",
      con_index: msg.con_index
    });
  }

  await DB.insertMessage(msgRows);
  return msgBodies;
};

export const markRead = async (conShortId, readIndex, readCount) => {
	const data={
		con_short_id: BigInt(conShortId),
		read_con_index: readIndex,
		read_badge_count: readCount,
	}
	return httpRequestBackBool("/im/mark_read",data);
};

export const recallMessage = async (payload) => {
	const data={
		con_short_id: payload.conShortId,
		msg_id: payload.msg_id
	}
	return httpRequestBackBool("/im/recall_message",data);
};

export const createConversation = async (payload) => {
  const { userId } = getApp().globalData;
  const members = [...payload.members, userId];
  const res = await httpRequestBackData("/im/create_conversation", {
    con_type: 2,
    members
  });
  if (!res) return undefined;
  const {
    con_short_id,
    con_id,
    con_type,
    owner_id,
    create_time,
    member_count
  } = res.con_core_info;
  const userConIndex = Number.MAX_SAFE_INTEGER;
  await DB.insertConversation([{
    con_short_id,
    con_id,
    con_type,
    name: "群聊",
    avatar_uri: "/static/conv_avatar.png",
    local_avatar_uri: "/static/conv_avatar.png",
    description: "",
    owner_id,
    create_time,
    status: 0,
    min_index: 0,
    top_timestamp: 0,
    push_status: 0,
    core_extra: "",
    setting_extra: "",
    member_count,
    badge_count: 0,
    read_index_end: 0,
    read_badge_count: 0,
    user_con_index: userConIndex,
	is_member: 1,
    last_message_id: 0,
    peer_id: 0
  }]);
  return {
    con_short_id,
    con_id,
    con_type
  };
};

export const getConversationInfo = async (conShortId) => {
	const data={
		con_short_id: BigInt(conShortId),
	}
	return httpRequestBackData("/im/get_conversation_info",data);
}

export const updateConversationCore = async (payload) => {
	const data={
		con_short_id: payload.conShortId,
		type: payload.type,
		value: payload.value
	}
	return httpRequestBackBool("/im/update_conversation_core",data);
}

export const updateConversationSetting = async (payload) => {
	const data={
		con_short_id: payload.conShortId,
		type: payload.type,
		value: payload.value
	}
	return httpRequestBackBool("/im/update_conversation_setting",data);
}

export const updateConversationMember = async (payload) => {
	const data={
		con_short_id: payload.conShortId,
		type: payload.type,
		value: payload.value
	}
	return httpRequestBackBool("/im/update_conversation_member",data);
}

export const deleteConversation = async (payload) => {
	const data={
		con_short_id: payload.conShortId
	}
	return httpRequestBackBool("/im/delete_conversation",data);
}

export const getConversationMembers = async (payload) => {
	const data = {
		con_short_id: payload.conShortId
	};
	return httpRequestBackData("/im/get_conversation_members",data);
};

export const addConversationMembers = async (payload) => {
	const data = {
		con_short_id: payload.conShortId,
		members: payload.members
	};
	return httpRequestBackBool("/im/add_conversation_members",data);
};

export const removeConversationMember = async (payload) => {
	const data = {
		con_short_id: payload.conShortId,
		member: payload.member
	};
	return httpRequestBackBool("/im/remove_conversation_member",data);
};

export const getConversationAgents = async (payload) => {
	const data = {
		con_short_id: payload.conShortId
	};
	return httpRequestBackData("/im/get_conversation_agents",data);
};

export const addConversationAgents = async (payload) => {
	const data = {
		con_short_id: payload.conShortId,
		agent_ids: payload.agentIds
	};
	return httpRequestBackBool("/im/add_conversation_agents",data);
};

export const removeConversationAgent = async (payload) => {
	const data = {
		con_short_id: payload.conShortId,
		agent_id: payload.agentId
	};
	return httpRequestBackBool("/im/remove_conversation_agent",data);
};

export const transformContent = async (message) => {
	if (message.msg_type != 100) return message.msg_content;
	try {
		const data = JSONbig.parse(message.msg_content);
		const senders = [];

		if (data.operator !== undefined && data.operator !== null && String(data.operator) !== '') {
			senders.push({
				sender_type: 1,
				sender_id: data.operator
			});
		}

		let contentIds = [];
		if (Array.isArray(data.content)) {
			contentIds = data.content;
		} else if ((data.type == 2 || data.type == 8) && data.content !== undefined && data.content !== null && String(data.content) !== '') {
			contentIds = [data.content];
		}

		if (contentIds.length > 0) {
			const contentSenderType = data.type == 7 || data.type == 8 ? 2 : 1;
			for (const senderId of contentIds) {
				if (senderId === undefined || senderId === null || String(senderId) === '') continue;
				senders.push({
					sender_type: contentSenderType,
					sender_id: senderId
				});
			}
		}

		const nameMap = new Map();
		if (senders.length > 0) {
			const infos = await DB.getMemberInfosBySenders(message.con_id, senders);
			if (Array.isArray(infos)) {
				for (const info of infos) {
					nameMap.set(`${info.sender_type}_${info.sender_id}`, info.nick_name || '');
				}
			}
		}

		const operator = nameMap.get(`1_${data.operator}`) || '用户';
		switch (data.type) {
			case 1:
				if (contentIds.length > 0) {
					const memberNames = contentIds.map(id => nameMap.get(`1_${id}`) || '用户');
					return `${operator} 邀请 ${memberNames.join('、')} 加入了群聊`;
				}
			case 2:
				if (contentIds.length > 0) {
					if (Number(data.operator) == Number(contentIds[0])) {
						return `${operator} 退出了群聊`;
					}
					const memberNames = contentIds.map(id => nameMap.get(`1_${id}`) || '用户');
					return `${operator} 将 ${memberNames.join('、')} 移出了群聊`;
				}
			case 3:
				return `${operator} 修改群名为 "${data.content}"`;
			case 4:
				return `${operator} 修改了群头像`;
			case 5:
				return `${operator} 修改了群资料`;
			case 6:
				return `${operator} 解散了群聊`;
			case 7: {
				const agentNames = contentIds.map(id => nameMap.get(`2_${id}`) || 'AI');
				return `${operator} 将智能体 ${agentNames.join('、')} 添加进群聊`;
			}
			case 8: {
				const agentNames = contentIds.map(id => nameMap.get(`2_${id}`) || 'AI');
				return `${operator} 将智能体 ${agentNames.join('、')} 移出了群聊`;
			}
			default:
				console.warn('未知的群聊消息类型:', data.type);
				return message.msg_content;
		}
	} catch (e) {
		console.error('解析群聊消息失败:', e, message.msg_content);
		return message.msg_content;
	}
};

export const handleCommandMessage = async (msg) => {
  const conId = msg.con_id;
  const conShortId = msg.con_short_id;
  if (msg.msg_type == 100) {
    const cmdMessage = JSONbig.parse(msg.msg_content);
    switch (cmdMessage.type) {
      case 1: {
        const addedIds = Array.isArray(cmdMessage.content) ? cmdMessage.content : [];
        if (addedIds.length === 0) break;
        const senderInputs = addedIds.map(id => ({
          sender_type: 1,
          sender_id: id
        }));
        const existedMembers = await DB.getMemberInfosBySenders(conId, senderInputs);
        const existedSet = new Set(
          (existedMembers || [])
            .filter(row => row.con_id)
            .map(row => row.sender_id.toString())
        );
        const memberResp = await getConversationMembers({ conShortId });
        if (memberResp) {
          const members = Array.isArray(memberResp) ? memberResp : (memberResp.members || memberResp.list || []);
          if (Array.isArray(members) && members.length > 0) {
            const addedSet = new Set(addedIds.map(id => id.toString()));
            const targetMembers = members.filter(m =>
              m &&
              m.user_id !== null &&
              m.user_id !== undefined &&
              addedSet.has(m.user_id.toString()) &&
              !existedSet.has(m.user_id.toString())
            );
            if (targetMembers.length > 0) {
              const targetUserIds = targetMembers.map(m => m.user_id);
              const oldUsers = await DB.getUsersByIds(targetUserIds);
              const oldUserSet = new Set((oldUsers || []).map(u => u.user_id.toString()));
              const memberRows = [];
              const userRows = [];
              const now = Date.now();
              for (const m of targetMembers) {
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
                if (!oldUserSet.has(uid.toString())) {
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
              if (userRows.length > 0) await DB.upsertUsers(userRows);
            }
          }
        }
        const memberCount = await DB.getMemberCount(conId);
        const map = new Map();
        map.set("member_count", memberCount);
		const selfUserId = getApp().globalData.userId;
		if (addedIds.some(id => String(id) === String(selfUserId))) {
		  map.set("is_member", 1);
		}
        await DB.updateConversation(conId, map);
        break;
      }
      case 2: {
        const removedId = cmdMessage.content;
        if (removedId === null || removedId === undefined || removedId === '') break;
        await DB.deleteMembersByIds(conId, 1, [removedId]);
        const memberCount = await DB.getMemberCount(conId);
        const map = new Map();
        map.set("member_count", memberCount);
		const selfUserId = getApp().globalData.userId;
		if (String(removedId) === String(selfUserId)) {
		  map.set("is_member", 0);
		}
        await DB.updateConversation(conId, map);
        break;
      }
      case 3: {
        const map = new Map();
        map.set("name", cmdMessage.content || "群聊");
        await DB.updateConversation(conId, map);
        break;
      }
      case 4: {
        const map = new Map();
        map.set("avatar_uri", cmdMessage.content || "");
        await DB.updateConversation(conId, map);
        await enqueueEntityAvatars("conv", [conId]);
        break;
      }
      case 5: {
        const map = new Map();
        map.set("description", cmdMessage.content || "");
        await DB.updateConversation(conId, map);
        break;
      }
      case 6: {
        break;
      }
      case 7: {
        const addedIds = Array.isArray(cmdMessage.content) ? cmdMessage.content : [];
        if (addedIds.length === 0) break;
        const senderInputs = addedIds.map(id => ({
          sender_type: 2,
          sender_id: id
        }));
        const existedMembers = await DB.getMemberInfosBySenders(conId, senderInputs);
        const existedSet = new Set(
          (existedMembers || [])
            .filter(row => row.con_id)
            .map(row => row.sender_id.toString())
        );
        const agentResp = await getConversationAgents({ conShortId });
        if (agentResp) {
          const agents = agentResp.agents || [];
          if (Array.isArray(agents) && agents.length > 0) {
            const addedSet = new Set(addedIds.map(id => id.toString()));
            const targetAgents = agents.filter(a =>
              a &&
              a.agent_id !== null &&
              a.agent_id !== undefined &&
              addedSet.has(a.agent_id.toString()) &&
              !existedSet.has(a.agent_id.toString())
            );
            if (targetAgents.length > 0) {
              const targetAgentIds = targetAgents.map(a => a.agent_id);
              const oldAgents = await DB.getAgentsByIds(targetAgentIds);
              const oldAgentSet = new Set((oldAgents || []).map(a => a.agent_id.toString()));
              const memberRows = [];
              const agentRows = [];
              const now = Date.now();
              for (const a of targetAgents) {
                const aid = a.agent_id;
                memberRows.push({
                  con_short_id: conShortId,
                  con_id: conId,
                  member_id: aid,
                  member_type: 2,
                  nick_name: a.agent_name || "AI",
                  privilege: 0,
                  create_time: a.create_time ?? 0,
                  status: a.status ?? 0,
                  extra: a.extra || ""
                });
                if (!oldAgentSet.has(aid.toString())) {
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
              if (agentRows.length > 0) await DB.upsertAgents(agentRows);
            }
          }
        }
        break;
      }
      case 8: {
        const removedId = cmdMessage.content;
        if (removedId === null || removedId === undefined || removedId === '') break;
        await DB.deleteMembersByIds(conId, 2, [removedId]);
        break;
      }
      default:
        console.warn("未知的群聊命令类型:", cmdMessage.type);
        break;
    }
  } else if (msg.msg_type == 101) {
    const cmdMessage = JSONbig.parse(msg.msg_content);
    const map = new Map();
    map.set("read_index_end", cmdMessage.read_index_end);
    map.set("read_badge_count", cmdMessage.read_badge_count);
    await DB.updateConversation(conId, map);
  } else if (msg.msg_type == 102) {
    const cmdMessage = JSONbig.parse(msg.msg_content);
    const msgId = cmdMessage.msg_id;
    if (msgId === null || msgId === undefined || msgId === '') return;
    const extraMap = JSONbig.parse(cmdMessage.extra || '{}');
	console.log(extraMap.is_recall)
	console.log(typeof extraMap.is_recall)
    const isRecall =
      extraMap.is_recall === true ||
      extraMap.is_recall === 'true' ||
      extraMap.is_recall === 1 ||
      extraMap.is_recall === '1';
    if (isRecall) {
      await DB.updateMessage(msgId, {
		sender_type: 3,
		//todo:查用户名
        msg_content: '撤回了一条消息',
        extra: cmdMessage.extra
      });
    }
  } else if (msg.msg_type == 103) {
  } else if (msg.msg_type == 104) {
    const cmdMessage = JSONbig.parse(msg.msg_content);
    switch (cmdMessage.type) {
      case 1: {
        const map = new Map();
        map.set("nick_name", cmdMessage.content || "");
        await DB.updateMember(conId, msg.sender_type, msg.sender_id, map);
        break;
      }
      default:
        console.warn("未知的成员命令类型:", cmdMessage.type);
        break;
    }
  }
};

export const getNoitceCount = async (payload) => {
	const data = {
		group: payload.group
	};
	return httpRequestBackData("/notice/get_notice_count",data);
};

export const getNoticeList = async (payload) => {
	const data = {
		group: payload.group,
		page: payload.page
	};
	return httpRequestBackData("/notice/get_notice_list",data);
};

export const getNoticeAggList = async (payload) => {
	const data = {
		notice_id: payload.noticeId,
		page: payload.page
	};
	return httpRequestBackData("/notice/get_notice_agg_list",data);
};

export const markNoticeRead = async (payload) => {
	const data = {
		group: payload.group
	};
	return httpRequestBackBool("/notice/mark_notice_read",data);
};