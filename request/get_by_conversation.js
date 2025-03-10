export const getByConversation = () => {
	const app = getApp();
	const {
		token
	} = app.globalData;

	const res = await uni.request({
		url: 'http://127.0.0.1:3001/api/im/message/get_by_conversation',
		method: 'POST',
		header: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		}
	});
	if (res.statusCode === 200) {
		if (res.data.code === 1000) {

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