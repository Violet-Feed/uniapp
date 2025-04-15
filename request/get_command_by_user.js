import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js';
import file from '@/utils/file';
import {
	getUserProfile
} from '@/request/get_user_profile.js';
export const getCommandByUser = async() => {
	const {
		token,
		userId
	} = getApp().globalData;
	let hasMore=true;
	while(hasMore==true){
		hasMore=false;
		const userCmdIndex=getApp().globalData.userCmdIndex;
		const data = {
			user_cmd_index: userCmdIndex+1,
			limit: Number.MAX_SAFE_INTEGER,
		};
		const dataJson = JSONbig.stringify(data);
		let res = await uni.request({
			url: 'http://127.0.0.1:3000/api/im/get_command_by_user',
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
				if (res.data.msg_bodies.length!=0) {
					for(const msg of res.data.msg_bodies){
						const cmdMessage=JSONbig.parse(msg.msg_content);
						if(msg.msg_type==101){
							const map=new Map();
							map.set("read_index_end",cmdMessage.read_index_end)
							map.set("read_badge_count",cmdMessage.read_badge_count)
							DB.updateConversation(msg.con_short_id,map).catch((err) => {
								console.log('updateConversation err', err);
							});
						}else if(msg.msg_type==102){
							
						}
					}
					uni.setStorageSync('user_cmd_index_'+userId, res.data.user_cmd_index);
					getApp().globalData.userCmdIndex = res.data.user_cmd_index;
				}
				hasMore=res.data.has_more;
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
	}
};

