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
	const res = await uni.request({
			url: 'http://127.0.0.1:3001/api/im/message/get_by_init',
			method: 'POST',
			header: {
				'content-type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			data: {
				user_con_index:index
			},
		});
	if (res.statusCode === 200) {
		console.log(res);
		if (res.data.code === 1000) {
			const conInfos = res.data.data.cons.map(item => item.con_info);
			const values = conInfos.map((conInfo) => {
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
				return `(null, ${con_short_id}, '${con_id}', ${con_type}, '${name}', '${avatar_uri}', '${description}', '${notice}', ${owner_id}, ${create_time}, ${status}, ${min_index}, ${top_time_stamp}, ${push_status}, '${extra}', ${member_count}, ${badge_count}, ${read_badge_count}, ${read_index_end}, ${user_con_index})`;
			}).join(',');
			DB.insertConversation(values).catch((err)=>{
				console.error("insertConversation err. err = ",err);
			})
			getApp().globalData.userConIndex = res.data.data.user_con_index;
			getApp().globalData.userCmdIndex = res.data.data.user_cmd_index;
			if (res.data.data.has_more===true){
				doGetByInit(token,res.data.data.next_user_con_index)
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