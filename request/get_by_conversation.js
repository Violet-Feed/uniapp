import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js'
export const getByConversation = (conShortId, conIndex, limit) => {
	const {
		token
	} = getApp().globalData;

	var res = await uni.request({
		url: 'http://127.0.0.1:3001/api/im/message/get_by_conversation',
		method: 'POST',
		header: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: {
			con_short_id: conShortId,
			con_index: conIndex,
			limit: limit,
		},
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
					msg_id,
					msg_type,
					msg_content,
					create_time,
					con_index
				} = msg;
				return `(null, ${user_id}, ${con_short_id}, '${con_id}', ${con_type}, ${msg_id}, ${msg_type}, '${msg_content}', ${create_time}, ${con_index})`;
			}).join(',');
			DB.insertMessage(msgValues).catch((err) => {
				console.error("insertMessage err", err);
			});
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