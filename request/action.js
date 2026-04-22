import { httpRequestBackData, httpRequestBackBool } from '@/request/common.js';
export const follow = async (fromUserId,toUserId) => {
	const data = {
		from_user_id: fromUserId,
		to_user_id: toUserId
	};
	return httpRequestBackBool("/relation/follow",data);
}

export const unfollow = async (fromUserId,toUserId) => {
	const data = {
		from_user_id: fromUserId,
		to_user_id: toUserId
	};
	return httpRequestBackBool("/relation/unfollow",data);
}

export const getFriendList = async (payload) => {
	const data = {
		user_id: payload.userId,
		page: payload.page
	};
	return httpRequestBackData("/relation/get_friend_list",data)
}

export const getFollowingList = async (payload) => {
	const data = {
		user_id: payload.userId,
		page: payload.page
	};
	return httpRequestBackData("/relation/get_following_list",data)
}

export const getFollowerList = async (payload) => {
	const data = {
		user_id: payload.userId,
		page: payload.page
	};
	return httpRequestBackData("/relation/get_follower_list",data)
}

export const digg = async (entityType,entityId) => {
	const data = {
		entity_type: entityType,
		entity_id: entityId
	};
	return httpRequestBackBool("/action/digg",data);
}

export const cancelDigg = async (entityType,entityId) => {
	const data = {
		entity_type: entityType,
		entity_id: entityId
	};
	return httpRequestBackBool("/action/cancel_digg",data);
}

export const createComment = async (payload) => {
	const data = {
		entity_type: payload.entityType,
		entity_id: payload.entityId,
		content_type: payload.contentType,
		content: payload.content
	};
	return httpRequestBackData("/action/create_comment",data);
}

export const createReply = async (payload) => {
	const data = {
		entity_type: payload.entityType,
		entity_id: payload.entityId,
		parent_id: payload.parentId,
		sib_id: payload.sibId,
		sib_user_id: payload.sibUserId,
		content_type: payload.contentType,
		content: payload.content
	};
	return httpRequestBackData("/action/create_reply",data);
}

export const getCommentList = async (payload) => {
	const data = {
		entity_type: payload.entityType,
		entity_id: payload.entityId,
		page: payload.page,
		sort_type: payload.sortType
	};
	return httpRequestBackData("/action/get_comment_list",data);
}

export const getReplyList = async (payload) => {
	const data = {
		comment_id: payload.commentId,
		page: payload.page
	};
	return httpRequestBackData("/action/get_reply_list",data);
}

export const getActionInfo = async (payload) => {
	const data = {
		entity_type: payload.entityType,
		entity_id: payload.entityId
	};
	return httpRequestBackData("/action/get_action_info",data);
}

export const diggComment = async (payload) => {
	const data = {
		comment_id: payload.commentId
	};
	return httpRequestBackBool("/action/digg_comment",data);
}

export const cancelDiggComment = async (payload) => {
	const data = {
		comment_id: payload.commentId
	};
	return httpRequestBackBool("/action/cancel_digg_comment",data);
}

export const forward = async (payload) => {
	const data = {
		entity_type: payload.entityType,
		entity_id: payload.entityId,
		con_short_id: payload.conShortId
	};
	return httpRequestBackBool("/action/forward",data);
}
