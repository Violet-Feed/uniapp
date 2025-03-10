import {
	connectWebSocket
} from "@/utils/websocket.js";
import {
	getByInit
} from '@/request/get_by_init';
export const checkAuth = async () => {
	const app = getApp();
	const {
		token
	} = app.globalData;

	if (token) {
		return true;
	}

	const localToken = uni.getStorageSync('token');
	if (localToken) {
		app.globalData.token = localToken;
		try {
			// 调用 getUserInfo 接口获取用户信息
			const res = await uni.request({
				url: 'http://127.0.0.1:3000/api/action/user/get_info/',
				method: 'GET',
				header: {
					'Authorization': `Bearer ${localToken}`
				}
			});
			if (res.statusCode === 200) {
				if (res.data.message === "success") {
					const {
						userId,
						avatar,
						username
					} = res.data;
					app.globalData.userId = userId;
					app.globalData.avatar = avatar;
					app.globalData.username = username;
					connectWebSocket();
					getByInit();
					return true; // 获取用户信息成功，权限验证通过
				} else {
					uni.showToast({
						title: '登录过期',
						icon: 'none'
					});
					throw new Error("invaild token")
				}
			} else {
				uni.showToast({
					title: '网络错误',
					icon: 'none'
				});
			}

		} catch (error) {

		}
	}

	// 无权限，跳转到登录页面
	uni.reLaunch({
		url: '/pages/user/login'
	});
	return false;
};