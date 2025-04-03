import JSONbig from 'json-bigint';
export const getUserProfile = async (userId,needFollowInfo) => {
	const token = getApp().globalData.token;
	const data = {
		user_id: userId,
		need_follow_info: needFollowInfo,
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
			return res.data;
		}
	}
}