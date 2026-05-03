import JSONbig from 'json-bigint';
import DB from "@/utils/sqlite.js";
import Socket from '@/utils/socket.js';
import {
	getMessageByUser,
	getCommandByUser,
	getInitInfo
} from '@/request/im.js';
import {
	getUserProfile
} from '@/request/user.js';
import { enqueueEntityAvatars } from '@/utils/im-cache';
export const init = async () => {
	const app = getApp();
	let token = uni.getStorageSync('token');
	let userId = uni.getStorageSync('user_id');
	if (token && userId) {
		userId=BigInt(JSONbig.parse(userId).data);
		app.globalData.token = token;
		app.globalData.userId = userId;
		const res = await getUserProfile(userId,false,false);
		if(res!=undefined){
			const userInfo = res.user_info || {};
			const username = userInfo.username || "用户";
			const remoteAvatar = userInfo.avatar || "";
			const avatarUri = remoteAvatar || "/static/user_avatar.png";
		
			const oldRows = await DB.getUsersByIds([userId]);
			const oldUser = oldRows?.[0] || null;
			const oldAvatarUri = oldUser?.avatar_uri || "";
			const oldLocalAvatarUri = oldUser?.local_avatar_uri || "";

			let localAvatarUri = "";
			let needAvatar = false;
			if (!oldUser) {
				localAvatarUri = avatarUri.startsWith("/static/") ? avatarUri : "";
				needAvatar = !avatarUri.startsWith("/static/");
			} else {
				const avatarChanged = remoteAvatar !== "" && avatarUri !== oldAvatarUri;
				localAvatarUri = avatarUri.startsWith("/static/") ? avatarUri : avatarChanged? "" : oldLocalAvatarUri;
				needAvatar = !avatarUri.startsWith("/static/") && (avatarChanged || !oldLocalAvatarUri);
			}

			await DB.upsertUsers([{
				user_id: userId,
				username,
				avatar_uri: avatarUri,
				local_avatar_uri: localAvatarUri,
				modify_time: Date.now()
			}]);
			if (needAvatar) {
				enqueueEntityAvatars("user", [userId]);
			}
		
			app.globalData.username = username;
			app.globalData.avatar = avatarUri;
			app.globalData.userConIndex=uni.getStorageSync('user_con_index_'+userId);
			app.globalData.userCmdIndex=uni.getStorageSync('user_cmd_index_'+userId);
			const socket=new Socket();
			app.globalData.socket=socket;
			socket.start();
			if (app.globalData.userCmdIndex == "") {
				await getInitInfo();
			} else {
				await getCommandByUser();
			}
			await getMessageByUser();
		}
	} else {
		uni.reLaunch({
			url: '/pages/user/login'
		});
	}
};