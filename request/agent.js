import { httpRequestBackData, httpRequestBackBool } from '@/request/common.js';
export const createAgent = async (payload) => {
	const data = {
		agent_name: payload.agentName,
		avatar_uri: payload.avatarUri,
		description: payload.description,
		personality: payload.personality
	};
	return httpRequestBackData("/aigc/create_agent",data);
};
export const getAgentsByIds = async (payload) => {
	const data = {
		agent_ids: payload.agentIds
	};
	return httpRequestBackData("/aigc/get_agents_by_ids",data);
};
export const getAgentsByUser = async (payload) => {
	const data = {
		page: payload.page
	};
	return httpRequestBackData("/aigc/get_agents_by_user",data);
};