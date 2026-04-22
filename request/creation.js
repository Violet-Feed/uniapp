import { httpRequestBackData, httpRequestBackBool } from '@/request/common.js';
export const createMaterial = async (payload) => {
	const data = {
		material_type: payload.materialType,
		prompt: payload.prompt,
		source_url: payload.sourceUrl
	};
	return httpRequestBackData("/aigc/create_material",data);
}

export const deleteMaterial = async (payload) => {
	const data = {
		material_id: payload.materialId
	};
	return httpRequestBackBool("/aigc/delete_material",data);
}

export const getMaterialByUser = async (page) => {
	const data = {
		page: page
	};
	return httpRequestBackData("/aigc/get_material_by_user",data);
}

export const createCreation = async (payload) => {
	const data = {
		material_id: payload.material_id,
		material_type: payload.material_type,
		material_url: payload.material_url,
		title: payload.title,
		content: payload.content,
		category: payload.category
	};
	return httpRequestBackBool("/aigc/create_creation",data);
}

export const deleteCreation = async (payload) => {
	const data = {
		creation_id: payload.creationId
	};
	return httpRequestBackBool("/aigc/delete_creation",data);
}

export const updateCreation = async (payload) => {
	const data = {
		creation_id: payload.creationId,
		title: payload.title,
		content: payload.content,
		category: payload.category
	};
	return httpRequestBackBool("/aigc/update_creation",data);
}

export const getCreationById = async (creationId) => {
	const data = {
		creation_id: creationId
	};
	return httpRequestBackData("/aigc/get_creation_by_id",data);
}

export const getCreationsByUser = async (userId,page) => {
	const data = {
		user_id: userId,
		page: page
	};
	return httpRequestBackData("/aigc/get_creations_by_user",data);
}

export const getCreationsByDigg = async (userId,page) => {
	const data = {
		user_id: userId,
		page: page
	};
	return httpRequestBackData("/aigc/get_creations_by_digg",data);
}

export const getCreationsByFriend = async (page) => {
	const data = {
		page: page
	};
	return httpRequestBackData("/aigc/get_creations_by_friend",data);
}

export const getCreationsByRec = async () => {
	const data = {
	};
	return httpRequestBackData("/aigc/get_creations_by_rec",data);
}

export const getCreationsBySearch = async (keyword,page) => {
	const data = {
		keyword: keyword,
		page: page
	};
	return httpRequestBackData("/aigc/get_creations_by_search",data);
}