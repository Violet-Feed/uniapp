export const getByInit = () => {
	const app = getApp();
	const {
		token
	} = app.globalData;
	if (!token) {
		uni.reLaunch({
			url: '/pages/user/login'
		});
		return;
	}

	const res = await uni.request({
		url: 'http://127.0.0.1:3001/api/im/message/get_by_init/',
		method: 'POST',
		header: {
			Authorization: `Bearer ${token}`
		}
	});
	if (res.statusCode === 200) {
		if (res.data.message === "success") {

		} else {

		}
	} else {
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
	}
};