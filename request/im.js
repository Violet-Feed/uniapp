import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js';
import file from '@/utils/file';
import {
	getUserProfile
} from '@/request/user.js';
import { httpRequestBackData, httpRequestBackBool } from '@/request/common.js';
export const getMessageByUser = async() => {
	const {
		token,
		userId
	} = getApp().globalData;
	let hasMore=true;
	while(hasMore==true){
		hasMore=false;
		const userConIndex=getApp().globalData.userConIndex;
		const data = {
			user_con_index: userConIndex+1,
			limit: Number.MAX_SAFE_INTEGER,
		};
		const dataJson = JSONbig.stringify(data);
		let res = await uni.request({
			url: 'http://127.0.0.1:3000/api/im/get_message_by_user',
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
				if (res.data.cons.length!=0) {
					const msgValuesArray = [];
					const conValuesArray = [];
					for (const con of res.data.cons) {
						const conInfo = con.con_info;
						const msgBodies = con.msg_bodies;
						for (const msg of msgBodies) {
							const {
								user_id,
								con_short_id,
								con_id,
								con_type,
								client_msg_id,
								msg_id,
								msg_type,
								msg_content,
								create_time,
								extra,
								con_index
							} = msg;
							const msgValue =
								`( ${user_id}, ${con_short_id}, '${con_id}', ${con_type}, ${client_msg_id}, ${msg_id}, ${msg_type}, '${msg_content.replace(/'/g, "''")}', ${create_time}, '${extra.replace(/'/g, "''")}', ${con_index})`;
							msgValuesArray.push(msgValue);
						}
						const last_message=msgBodies[0].msg_content;
						if (conInfo.con_type === 1) {
							const parts = conInfo.con_id.split(':');
							let targetId;
							if (parts[0] == userId) {
								targetId = BigInt(parts[1]);
							} else {
								targetId = BigInt(parts[0]);
							}
							const userProfile = await getUserProfile(targetId,false,false);
							let targetUsername = userProfile.user_info.username;
							let targetAvatar = userProfile.user_info.avatar;
							if (targetAvatar === "") {
								targetAvatar = "/static/user_avatar.png";
							} else {
								// file.download(targetAvatar);
							}
							conInfo.con_core_info.name = targetUsername;
							conInfo.con_core_info.avatar_uri = targetAvatar;
						} else if(conInfo.con_type === 2){
							if (conInfo.con_core_info.name === "") {
								conInfo.con_core_info.name = "群聊";
							}
							if (conInfo.con_core_info.avatar_uri === "") {
								conInfo.con_core_info.avatar_uri = "/static/conv_avatar.png";
							} else {
								// file.download(conInfo.avatar_uri);
							}
						} else if(conInfo.con_type === 4){
							conInfo.con_core_info.name = "AI";
							conInfo.con_core_info.avatar_uri = "/static/ai.png";
						}
						const {
							con_short_id,
							con_id,
							con_type,
							user_con_index,
							badge_count
						} = conInfo;
						const {
							name,
							avatar_uri,
							description,
							notice,
							owner_id,
							create_time,
							status,
							extra: coreExtra,
							member_count
						} = conInfo.con_core_info;
						const {
							min_index,
							top_time_stamp,
							push_status,
							read_index_end,
							read_badge_count,
							extra: settingExtra
						} = conInfo.con_setting_info;
						const extra = `${coreExtra},${settingExtra}`;
						const conValue =
							`(${con_short_id}, '${con_id}', ${con_type}, '${name.replace(/'/g, "''")}', '${avatar_uri}', '${description.replace(/'/g, "''")}', '${notice.replace(/'/g, "''")}', ${owner_id}, ${create_time}, ${status}, ${min_index}, ${top_time_stamp}, ${push_status}, '${extra.replace(/'/g, "''")}', ${member_count}, ${badge_count}, ${read_index_end}, ${read_badge_count}, ${user_con_index}, '${last_message.replace(/'/g, "''")}')`;
						conValuesArray.push(conValue);
					}
					const conValues = conValuesArray.join(',');
					const msgValues = msgValuesArray.join(',');
					DB.insertConversation(conValues).catch((err) => {
						console.error("insertConversation err", err);
					})
					DB.insertMessage(msgValues).catch((err) => {
						console.error("insertMessage err", err);
					})
					uni.setStorageSync('user_con_index_'+userId, res.data.user_con_index);
					getApp().globalData.userConIndex = res.data.user_con_index;
				}
				hasMore=res.data.has_more;
			} else {
				uni.showToast({
					title: '服务器错误',
					icon: 'none'
				})
			}
		} else {
			uni.showToast({
				title: '网络错误',
				icon: 'none'
			});
		}
	}
};


export const getCommandByUser = async() => {
	const {
		token,
		userId
	} = getApp().globalData;
	let hasMore=true;
	while(hasMore==true){
		hasMore=false;
		const userCmdIndex=getApp().globalData.userCmdIndex;
		const data = {
			user_cmd_index: userCmdIndex+1,
			limit: Number.MAX_SAFE_INTEGER,
		};
		const dataJson = JSONbig.stringify(data);
		let res = await uni.request({
			url: 'http://127.0.0.1:3000/api/im/get_command_by_user',
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
				if (res.data.msg_bodies.length!=0) {
					for(const msg of res.data.msg_bodies){
						const cmdMessage=JSONbig.parse(msg.msg_content);
						if(msg.msg_type==101){
							const map=new Map();
							map.set("read_index_end",cmdMessage.read_index_end)
							map.set("read_badge_count",cmdMessage.read_badge_count)
							DB.updateConversation(msg.con_short_id,map).catch((err) => {
								console.log('updateConversation err', err);
							});
						}else if(msg.msg_type==102){
							
						}
					}
					uni.setStorageSync('user_cmd_index_'+userId, res.data.user_cmd_index);
					getApp().globalData.userCmdIndex = res.data.user_cmd_index;
				}
				hasMore=res.data.has_more;
			} else {
				uni.showToast({
					title: '服务器错误',
					icon: 'none'
				})
			}
		} else {
			uni.showToast({
				title: '网络错误',
				icon: 'none'
			});
		}
	}
};

export const getMessageByConversation = async (conShortId, conIndex, limit) => {
	const {
		token
	} = getApp().globalData;
	const data={
		con_short_id: BigInt(conShortId),
		con_index: conIndex,
		limit: limit,
	}
	const dataJson=JSONbig.stringify(data);
	console.log(dataJson);
	var res = await uni.request({
		url: 'http://127.0.0.1:3000/api/im/get_message_by_conversation',
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
			const msgBodies = res.data.msg_bodies;
			const msgValues = msgBodies.map((msg) => {
				const {
					user_id,
					con_short_id,
					con_id,
					con_type,
					client_msg_id,
					msg_id,
					msg_type,
					msg_content,
					create_time,
					extra,
					con_index
				} = msg;
				return `(${user_id}, ${con_short_id}, '${con_id}', ${con_type}, ${client_msg_id}, ${msg_id}, ${msg_type}, '${msg_content}', ${create_time}, '${extra}', ${con_index})`;
			}).join(',');
			DB.insertMessage(msgValues).catch((err) => {
				console.error("insertMessage err", err);
			});
			return msgBodies;
		} else {
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			})
		}
	} else {
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
	}
};

export const getConversationInfo = async (conShortId) => {
	const {
		token
	} = getApp().globalData;
	const data={
		con_short_id: BigInt(conShortId),
	}
	const dataJson=JSONbig.stringify(data);
	var res = await uni.request({
		url: 'http://127.0.0.1:3000/api/im/get_conversation_info',
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
		if (res.code === 1000) {
			return res.data.con_info;
		} else {
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			})
		}
	} else {
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
	}
}

export const markRead = async (conShortId, readIndex, readCount) => {
	const {
		token
	} = getApp().globalData;
	const data={
		con_short_id: BigInt(conShortId),
		read_con_index: readIndex,
		read_badge_count: readCount,
	}
	const dataJson=JSONbig.stringify(data);
	var res = await uni.request({
		url: 'http://127.0.0.1:3000/api/im/mark_read',
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
		if (res.code === 1000) {

		} else {
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			})
		}
	} else {
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
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