import DB from '@/utils/sqlite.js';
import {
	getConversationMembersByIds,
	getConversationAgentsByIds
} from '@/request/im.js';
import { getUserInfos } from '@/request/user.js';
import { getAgentsByIds } from '@/request/agent.js';

const USER_DEFAULT_AVATAR = '/static/user_avatar.png';
const AI_DEFAULT_AVATAR = '/static/ai_avatar.png';

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

function idKey(id) {
	if (id === null || id === undefined || String(id) === '') return '';
	return String(id);
}

function uniqueIds(ids) {
	const result = [];
	const seen = new Set();

	for (const id of ids || []) {
		const key = idKey(id);
		if (!key || seen.has(key)) continue;

		seen.add(key);
		result.push(id);
	}

	return result;
}

function missingIds(inputIds, foundIds) {
	const foundSet = new Set(
		(foundIds || [])
			.map(idKey)
			.filter(Boolean)
	);

	return (inputIds || []).filter(id => !foundSet.has(idKey(id)));
}

async function syncMissingUsers(conId, conShortId, userIds) {
	const ids = uniqueIds(userIds);
	if (ids.length === 0) return;

	const memberResp = await getConversationMembersByIds({
		conShortId,
		memberIds: ids
	});

	const members = valuesFromMapObject(memberResp?.members);

	const memberUserIds = members
		.map(m => m?.user_id)
		.filter(id => idKey(id));

	const fallbackUserIds = missingIds(ids, memberUserIds);

	let fallbackUsers = [];
	if (fallbackUserIds.length > 0) {
		const userResp = await getUserInfos({
			userIds: fallbackUserIds
		});

		fallbackUsers = Array.isArray(userResp?.user_infos)
			? userResp.user_infos
			: [];
	}

	const allUserIds = uniqueIds([
		...memberUserIds,
		...fallbackUsers
			.map(u => u?.user_id)
			.filter(id => idKey(id))
	]);

	const oldUsers = allUserIds.length > 0
		? await DB.getUsersByIds(allUserIds)
		: [];

	const oldUserSet = new Set(
		(oldUsers || []).map(u => idKey(u.user_id))
	);

	const memberRows = [];
	const userRows = [];
	const now = Date.now();

	for (const m of members) {
		const uid = m?.user_id;
		const uidKey = idKey(uid);
		if (!uidKey) continue;

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

		if (!oldUserSet.has(uidKey)) {
			userRows.push({
				user_id: uid,
				username: m.username || m.nick_name || '用户',
				avatar_uri: m.avatar || m.avatar_uri || USER_DEFAULT_AVATAR,
				local_avatar_uri: '',
				create_time: m.create_time ?? 0,
				modify_time: m.modify_time ?? now,
				status: 0,
				extra: ''
			});

			oldUserSet.add(uidKey);
		}
	}

	for (const u of fallbackUsers) {
		const uid = u?.user_id;
		const uidKey = idKey(uid);
		if (!uidKey) continue;

		memberRows.push({
			con_short_id: conShortId,
			con_id: conId,
			member_id: uid,
			member_type: 1,
			nick_name: '',
			privilege: 0,
			create_time: u.create_time ?? 0,
			status: 1,
			extra: u.extra || ''
		});

		if (!oldUserSet.has(uidKey)) {
			userRows.push({
				user_id: uid,
				username: u.username || '用户',
				avatar_uri: u.avatar || USER_DEFAULT_AVATAR,
				local_avatar_uri: '',
				create_time: u.create_time ?? 0,
				modify_time: u.modify_time ?? now,
				status: u.status ?? 0,
				extra: u.extra || ''
			});

			oldUserSet.add(uidKey);
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
	const ids = uniqueIds(agentIds);
	if (ids.length === 0) return;

	const agentResp = await getConversationAgentsByIds({
		conShortId,
		agentIds: ids
	});

	const agents = valuesFromMapObject(agentResp?.agents);

	const memberAgentIds = agents
		.map(a => a?.agent_id)
		.filter(id => idKey(id));

	const fallbackAgentIds = missingIds(ids, memberAgentIds);

	let fallbackAgents = [];
	if (fallbackAgentIds.length > 0) {
		const fallbackResp = await getAgentsByIds({
			agentIds: fallbackAgentIds
		});

		fallbackAgents = Array.isArray(fallbackResp?.agents)
			? fallbackResp.agents
			: [];
	}

	const allAgentIds = uniqueIds([
		...memberAgentIds,
		...fallbackAgents
			.map(a => a?.agent_id)
			.filter(id => idKey(id))
	]);

	const oldAgents = allAgentIds.length > 0
		? await DB.getAgentsByIds(allAgentIds)
		: [];

	const oldAgentSet = new Set(
		(oldAgents || []).map(a => idKey(a.agent_id))
	);

	const memberRows = [];
	const agentRows = [];
	const now = Date.now();

	for (const a of agents) {
		const aid = a?.agent_id;
		const aidKey = idKey(aid);
		if (!aidKey) continue;

		const agentName = a.agent_name || 'AI';

		memberRows.push({
			con_short_id: conShortId,
			con_id: conId,
			member_id: aid,
			member_type: 2,
			nick_name: agentName,
			privilege: 0,
			create_time: a.create_time ?? 0,
			status: a.status ?? 0,
			extra: a.extra || ''
		});

		if (!oldAgentSet.has(aidKey)) {
			agentRows.push({
				agent_id: aid,
				agent_name: agentName,
				avatar_uri: a.avatar_uri || AI_DEFAULT_AVATAR,
				local_avatar_uri: '',
				description: a.description || '',
				personality: a.personality || '',
				owner_id: a.owner_id ?? 0n,
				create_time: a.create_time ?? 0,
				modify_time: a.modify_time ?? now,
				status: a.status ?? 0,
				extra: a.extra || '',
				owner_username: a.owner_username || '',
				owner_avatar: a.owner_avatar || ''
			});

			oldAgentSet.add(aidKey);
		}
	}

	for (const a of fallbackAgents) {
		const aid = a?.agent_id;
		const aidKey = idKey(aid);
		if (!aidKey) continue;

		const agentName = a.agent_name || 'AI';

		memberRows.push({
			con_short_id: conShortId,
			con_id: conId,
			member_id: aid,
			member_type: 2,
			nick_name: '',
			privilege: 0,
			create_time: a.create_time ?? 0,
			status: 1,
			extra: a.extra || ''
		});

		if (!oldAgentSet.has(aidKey)) {
			agentRows.push({
				agent_id: aid,
				agent_name: agentName,
				avatar_uri: a.avatar_uri || AI_DEFAULT_AVATAR,
				local_avatar_uri: '',
				description: a.description || '',
				personality: a.personality || '',
				owner_id: a.owner_id ?? 0n,
				create_time: a.create_time ?? 0,
				modify_time: a.modify_time ?? now,
				status: a.status ?? 0,
				extra: a.extra || '',
				owner_username: a.owner_username || '',
				owner_avatar: a.owner_avatar || ''
			});

			oldAgentSet.add(aidKey);
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
			nick_name: '',
			global_name: Number(sender.sender_type) === 1 ? '用户' : 'AI',
			avatar_uri: '',
			local_avatar_uri: Number(sender.sender_type) === 1 ? USER_DEFAULT_AVATAR : AI_DEFAULT_AVATAR
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
	const missingUserSet = new Set();
	const missingAgentSet = new Set();

	for (const sender of senders) {
		if (!sender) continue;

		const key = buildSenderKey(sender.sender_type, sender.sender_id);
		if (localMap.has(key)) continue;

		const senderIdKey = idKey(sender.sender_id);
		if (!senderIdKey) continue;

		if (Number(sender.sender_type) === 1 && !missingUserSet.has(senderIdKey)) {
			missingUserSet.add(senderIdKey);
			missingUserIds.push(sender.sender_id);
		} else if (Number(sender.sender_type) === 2 && !missingAgentSet.has(senderIdKey)) {
			missingAgentSet.add(senderIdKey);
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