import JSONbig from 'json-bigint';
import {
	connectWebSocket
} from "@/utils/websocket.js";
import Socket from '@/utils/netty.js';
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
			user_id: app.globalData.userId,
			need_follow_info:true,
		};
		const dataJson = JSONbig.stringify(data);
		const res = await uni.request({
			url: 'http://127.0.0.1:3000/api/user/get_user_profile',
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
				} = res.data.data.user_info;
				if(avatar==""){
					avatar="/static/user_avatar.png";
				}else{
					//file.download(avatar);
				}
				uni.setStorageSync("username_"+localUserId, username);
				uni.setStorageSync("user_avatar_"+localUserId, avatar);
				app.globalData.username = username;
				app.globalData.avatar = avatar;
				app.globalData.followingCount = res.data.data.following_count;
				app.globalData.followerCount = res.data.data.follower_count;
				app.globalData.friendCount = res.data.data.friend_count;
				//download(avatar,localUserId);
				//connectWebSocket();
				const socket=new Socket();
				app.globalData.socket=socket;
				socket.start();
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