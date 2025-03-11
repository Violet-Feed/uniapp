import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js'
export const getByInit = () => {
	const {
		token
	} = getApp().globalData;
	if (!token) {
		return;
	}
	doGetByInit(token, 0);
};

async function doGetByInit(token, index) {
	var res = await uni.request({
			url: 'http://127.0.0.1:3001/api/im/message/get_by_init',
			method: 'POST',
			header: {
				'content-type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			data: {
				user_con_index:index
			},
			dataType:'string',
		});
	if (res.statusCode === 200) {
		res=JSONbig.parse(res.data);
		console.log(res);
		if (res.code === 1000) {
			const conInfos = res.data.cons.map(item => item.con_info);
			const msgBodies = res.data.cons.flatMap(item => item.msg_bodies);
			const conValues = conInfos.map((conInfo) => {
				const {
					con_short_id,
					con_id,
					con_type,
					user_con_index,
					badge_count
				} = conInfo;
				const {
					name,
					avatar_uri,
					description,
					notice,
					owner_id,
					create_time,
					status,
					extra: coreExtra,
					member_count
				} = conInfo.con_core_info;
				const {
					min_index,
					top_time_stamp,
					push_status,
					read_index_end,
					read_badge_count,
					extra: settingExtra
				} = conInfo.con_setting_info;
				const extra = `${coreExtra},${settingExtra}`;
				return `(null, ${con_short_id}, '${con_id}', ${con_type}, '${name}', '${avatar_uri}', '${description}', '${notice}', ${owner_id}, ${create_time}, ${status}, ${min_index}, ${top_time_stamp}, ${push_status}, '${extra}', ${member_count}, ${badge_count}, ${read_index_end}, ${read_badge_count}, ${user_con_index})`;
			}).join(',');
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
			DB.insertConversation(conValues).catch((err)=>{
				console.error("insertConversation err",err);
			})
			DB.insertMessage(msgValues).catch((err)=>{
				console.error("insertMessage err",err);
			})
			getApp().globalData.userConIndex = res.data.user_con_index;
			getApp().globalData.userCmdIndex = res.data.user_cmd_index;
			if (res.data.has_more===true){
				doGetByInit(token,res.data.next_user_con_index)
			}
		} else {
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			})
		}
	}
	else {
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
	}
}