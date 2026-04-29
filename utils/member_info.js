import DB from '@/utils/sqlite.js';
import {
	getConversationMembersByIds,
	getConversationAgentsByIds
} from '@/request/im.js';

const USER_DEFAULT_AVATAR = '/static/user_avatar.png';
const AI_DEFAULT_AVATAR = '/static/ai.png';

function buildSenderKey(senderType, senderId) {
	return `${Number(senderType)}:${String(senderId)}`;
}

function buildInfoMap(infos) {
	const map = new Map();

	for (const info of infos || []) {
		if (!info) continue;
		if (!info.con_id) continue;

		map.set(
			buildSenderKey(info.sender_type, info.sender_id),
			info
		);
	}

	return map;
}

function valuesFromMapObject(data) {
	if (!data) return [];
	if (Array.isArray(data)) return data;
	return Object.values(data);
}

async function syncMissingUsers(conId, conShortId, userIds) {
	if (!Array.isArray(userIds) || userIds.length === 0) return;

	const memberResp = await getConversationMembersByIds({
		conShortId,
		memberIds: userIds
	});

	const members = valuesFromMapObject(memberResp?.members);
	if (members.length === 0) return;

	const targetUserIds = members
		.map(m => m?.user_id)
		.filter(id => id !== null && id !== undefined && String(id) !== '');

	if (targetUserIds.length === 0) return;

	const oldUsers = await DB.getUsersByIds(targetUserIds);
	const oldUserSet = new Set(
		(oldUsers || []).map(u => u.user_id.toString())
	);

	const memberRows = [];
	const userRows = [];
	const now = Date.now();

	for (const m of members) {
		const uid = m?.user_id;
		if (uid === null || uid === undefined || String(uid) === '') continue;

		memberRows.push({
			con_short_id: conShortId,
			con_id: conId,
			member_id: uid,
			member_type: 1,
			nick_name: m.nick_name || '',
			privilege: m.privilege ?? 0,
			create_time: m.create_time ?? 0,
			status: m.status ?? 0,
			extra: m.extra || ''
		});

		if (!oldUserSet.has(uid.toString())) {
			userRows.push({
				user_id: uid,
				username: m.username || '用户',
				avatar_uri: m.avatar || USER_DEFAULT_AVATAR,
				local_avatar_uri: '',
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

async function syncMissingAgents(conId, conShortId, agentIds) {
	if (!Array.isArray(agentIds) || agentIds.length === 0) return;

	const agentResp = await getConversationAgentsByIds({
		conShortId,
		agentIds
	});

	const agents = valuesFromMapObject(agentResp?.agents);
	if (agents.length === 0) return;

	const targetAgentIds = agents
		.map(a => a?.agent_id)
		.filter(id => id !== null && id !== undefined && String(id) !== '');

	if (targetAgentIds.length === 0) return;

	const oldAgents = await DB.getAgentsByIds(targetAgentIds);
	const oldAgentSet = new Set(
		(oldAgents || []).map(a => a.agent_id.toString())
	);

	const memberRows = [];
	const agentRows = [];
	const now = Date.now();

	for (const a of agents) {
		const aid = a?.agent_id;
		if (aid === null || aid === undefined || String(aid) === '') continue;

		memberRows.push({
			con_short_id: conShortId,
			con_id: conId,
			member_id: aid,
			member_type: 2,
			nick_name: a.agent_name || 'AI',
			privilege: 0,
			create_time: a.create_time ?? 0,
			status: a.status ?? 0,
			extra: a.extra || ''
		});

		if (!oldAgentSet.has(aid.toString())) {
			agentRows.push({
				agent_id: aid,
				agent_name: a.agent_name || 'AI',
				avatar_uri: a.avatar_uri || AI_DEFAULT_AVATAR,
				local_avatar_uri: '',
				description: a.description || '',
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

function buildResult(conId, senders, infos) {
	const finalMap = buildInfoMap(infos);

	return senders.map(sender => {
		const key = buildSenderKey(sender.sender_type, sender.sender_id);
		const info = finalMap.get(key);

		if (info) return info;

		return {
			con_id: conId,
			sender_type: sender.sender_type,
			sender_id: sender.sender_id,
			nick_name: Number(sender.sender_type) === 1 ? '用户' : 'AI',
			avatar_uri: Number(sender.sender_type) === 1 ? USER_DEFAULT_AVATAR : AI_DEFAULT_AVATAR
		};
	});
}

export async function getMemberInfosBySendersEnsure(conId, conShortId, senders) {
	if (!Array.isArray(senders) || senders.length === 0) return [];

	const localInfos = await DB.getMemberInfosBySenders(conId, senders);

	if (
		conShortId === null ||
		conShortId === undefined ||
		String(conShortId) === '' ||
		String(conShortId) === '0'
	) {
		return buildResult(conId, senders, localInfos);
	}

	const localMap = buildInfoMap(localInfos);
	const missingUserIds = [];
	const missingAgentIds = [];

	for (const sender of senders) {
		const key = buildSenderKey(sender.sender_type, sender.sender_id);
		if (localMap.has(key)) continue;

		if (Number(sender.sender_type) === 1) {
			missingUserIds.push(sender.sender_id);
		} else if (Number(sender.sender_type) === 2) {
			missingAgentIds.push(sender.sender_id);
		}
	}

	if (missingUserIds.length > 0) {
		await syncMissingUsers(conId, conShortId, missingUserIds);
	}

	if (missingAgentIds.length > 0) {
		await syncMissingAgents(conId, conShortId, missingAgentIds);
	}

	const finalInfos = await DB.getMemberInfosBySenders(conId, senders);
	return buildResult(conId, senders, finalInfos);
}