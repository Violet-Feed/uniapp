import { httpRequestBackData, httpRequestBackBool } from '@/request/common.js';
import JSONbig from 'json-bigint';
export const follow = async (fromUserId,toUserId) => {
	const token = getApp().globalData.token;
	const data = {
		from_user_id: fromUserId,
		to_user_id: toUserId
	};
	const dataJson = JSONbig.stringify(data);
	console.log(dataJson);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/relation/follow',
		method: 'POST',
		header: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: dataJson,
		dataType: 'string',
	});
	if (res.statusCode === 200) {
		res = JSONbig.parse(res.data);
		console.log(res);
		if (res.code === 1000) {
			return true;
		}else {
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			});
		}
	} else if (res.statusCode === 403) {
		uni.showToast({
			title: '登录过期',
			icon: 'none'
		});
		uni.reLaunch({
			url: '/pages/user/login'
		});
	} else {
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
	}
	return false;
}

export const unfollow = async (fromUserId,toUserId) => {
	const token = getApp().globalData.token;
	const data = {
		from_user_id: fromUserId,
		to_user_id: toUserId
	};
	const dataJson = JSONbig.stringify(data);
	console.log(dataJson);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/relation/unfollow',
		method: 'POST',
		header: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: dataJson,
		dataType: 'string',
	});
	if (res.statusCode === 200) {
		res = JSONbig.parse(res.data);
		console.log(res);
		if (res.code === 1000) {
			return true;
		}else {
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			});
		}
	} else if (res.statusCode === 403) {
		uni.showToast({
			title: '登录过期',
			icon: 'none'
		});
		uni.reLaunch({
			url: '/pages/user/login'
		});
	} else {
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
	}
	return false;
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
	const token = getApp().globalData.token;
	const data = {
		entity_type: entityType,
		entity_id: entityId
	};
	const dataJson = JSONbig.stringify(data);
	console.log(dataJson);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/action/digg',
		method: 'POST',
		header: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: dataJson,
		dataType: 'string',
	});
	if (res.statusCode === 200) {
		res = JSONbig.parse(res.data);
		console.log(res);
		if (res.code === 1000) {
			return true;
		}else {
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			});
		}
	} else if (res.statusCode === 403) {
		uni.showToast({
			title: '登录过期',
			icon: 'none'
		});
		uni.reLaunch({
			url: '/pages/user/login'
		});
	} else {
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
	}
	return false;
}

export const cancelDigg = async (entityType,entityId) => {
	const token = getApp().globalData.token;
	const data = {
		entity_type: entityType,
		entity_id: entityId
	};
	const dataJson = JSONbig.stringify(data);
	console.log(dataJson);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/action/cancel_digg',
		method: 'POST',
		header: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: dataJson,
		dataType: 'string',
	});
	if (res.statusCode === 200) {
		res = JSONbig.parse(res.data);
		console.log(res);
		if (res.code === 1000) {
			return true;
		}else {
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			});
		}
	} else if (res.statusCode === 403) {
		uni.showToast({
			title: '登录过期',
			icon: 'none'
		});
		uni.reLaunch({
			url: '/pages/user/login'
		});
	} else {
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
	}
	return false;
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

export const getCommentCount = async (payload) => {
	const data = {
		entity_type: payload.entityType,
		entity_id: payload.entityId
	};
	return httpRequestBackData("/action/get_comment_count",data);
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