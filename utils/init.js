import JSONbig from 'json-bigint';
import Socket from '@/utils/socket.js';
import {
	getCommandByUser
} from '@/request/get_command_by_user.js';
import {
	getMessageByUser
} from '@/request/get_message_by_user.js';
import {
	getUserProfile
} from '@/request/get_user_profile.js';
import file from '@/utils/file.js';
export const init = async () => {
	const app = getApp();
	let token = uni.getStorageSync('token');
	let userId = uni.getStorageSync('user_id');
	if (token && userId) {
		userId=BigInt(JSONbig.parse(userId).data);
		app.globalData.token = token;
		app.globalData.userId = userId;
		const res = await getUserProfile(userId,true,true);
		if(res!=undefined){
			uni.setStorageSync("username_"+userId, res.user_info.username);
			uni.setStorageSync("user_avatar_"+userId, res.user_info.avatar);
			app.globalData.username = res.user_info.username;
			app.globalData.avatar = res.user_info.avatar;
			app.globalData.followingCount = res.following_count;
			app.globalData.followerCount = res.follower_count;
			app.globalData.friendCount = res.friend_count;
			//app.globalData.userConIndex=uni.setStorageSync('user_con_index_'+userId,0);
			app.globalData.userConIndex=uni.getStorageSync('user_con_index_'+userId);
			app.globalData.userCmdIndex=uni.getStorageSync('user_cmd_index_'+userId);
			//download(avatar,userId);
			const socket=new Socket();
			app.globalData.socket=socket;
			socket.start();
			getCommandByUser();
			getMessageByUser();
		}
	} else {
		uni.reLaunch({
			url: '/pages/user/login'
		});
	}
};