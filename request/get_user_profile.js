import JSONbig from 'json-bigint';
export const getUserProfile = async (userId,needFollowInfo,needFriendInfo) => {
	const token = getApp().globalData.token;
	const data = {
		user_id: userId,
		need_follow_info: needFollowInfo,
		need_friend_info: needFriendInfo
	};
	const dataJson = JSONbig.stringify(data);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/user/get_user_profile',
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
			console.log(res.data);
			return res.data;
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
	return undefined;
}