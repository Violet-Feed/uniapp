import JSONbig from 'json-bigint';
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