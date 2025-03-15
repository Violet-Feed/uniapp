import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js'
export const getByConversation = async (conShortId, conIndex, limit) => {
	const {
		token
	} = getApp().globalData;
	const data={
		con_short_id: BigInt(conShortId),
		con_index: conIndex,
		limit: limit,
	}
	const dataJson=JSONbig.stringify(data);
	var res = await uni.request({
		url: 'http://127.0.0.1:3001/api/im/message/get_by_conversation',
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