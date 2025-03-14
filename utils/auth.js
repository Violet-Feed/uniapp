import JSONbig from 'json-bigint';
import {
	connectWebSocket
} from "@/utils/websocket.js";
import {
	getByInit
} from '@/request/get_by_init';
import file from '@/utils/file.js';
export const initAuth = async () => {
	const app = getApp();
	const {
		token,
		userId
	} = app.globalData;

	if (token && userId) {
		return;
	}

	const localToken = uni.getStorageSync('token');
	const localUserId = BigInt(JSONbig.parse(uni.getStorageSync('user_id')).data);
	if (localToken && localUserId) {
		app.globalData.token = localToken;
		app.globalData.userId = localUserId;
		const data = {
			user_ids: [app.globalData.userId],
		};
		const dataJson = JSONbig.stringify(data);
		const res = await uni.request({
			url: 'http://127.0.0.1:3000/api/action/user/get_infos',
			method: 'POST',
			header: {
				'content-type': 'application/json',
				'Authorization': `Bearer ${localToken}`
			},
			data: dataJson,
		});
		if (res.statusCode === 200) {
			if (res.data.code === 1000) {
				let {
					avatar,
					username
				} = res.data.data.user_infos[0];
				if(avatar==""){
					avatar="/static/user_avatar.png";
				}else{
					//file.download(avatar);
				}
				uni.setStorageSync("username_"+localUserId, username);
				uni.setStorageSync("user_avatar_"+localUserId, avatar);
				app.globalData.username = username;
				app.globalData.avatar = avatar;
				//download(avatar,localUserId);
				connectWebSocket();
				getByInit();
			} else {
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
	} else {
		uni.reLaunch({
			url: '/pages/user/login'
		});
	}
};