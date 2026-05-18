import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js';
import Socket from '@/utils/socket.js';
import {
	getUserProfile
} from '@/request/user.js';
import { enqueueEntityAvatars } from '@/utils/im-cache';
import { installNotifyListener } from '@/utils/push.js'
import Snowflake from '@/utils/snowflake.js'

const parseStoredUserId = (rawUserId) => {
	if (!rawUserId) return null;

	try {
		const parsed = JSONbig.parse(rawUserId);

		if (parsed && parsed.data !== undefined && parsed.data !== null) {
			return BigInt(parsed.data);
		}

		return BigInt(parsed);
	} catch (err) {
		try {
			return BigInt(rawUserId);
		} catch (e) {
			console.error('解析 user_id 失败：', e);
			return null;
		}
	}
};

export const init = async () => {
	const app = getApp();
	const token = uni.getStorageSync('token');
	const rawUserId = uni.getStorageSync('user_id');

	if (!token || !rawUserId) {
		return false;
	}

	const userId = parseStoredUserId(rawUserId);

	if (!userId) {
		return false;
	}

	try {
		app.globalData.token = token;
		app.globalData.userId = userId;
		
		await Promise.resolve(DB.openSqlite())
		app.globalData.randomIdGenerator = new Snowflake()
		
		const res = await getUserProfile(userId, false, false);

		if (res && Object.keys(res).length === 0) {
			return false;
		}
		
		if (res) {
			const userInfo = res.user_info || {};
			const username = userInfo.username || '用户';
			const remoteAvatar = userInfo.avatar || '';
			const avatarUri = remoteAvatar || '/static/user_avatar.png';
			
			const oldRows = await DB.getUsersByIds([userId]);
			const oldUser = oldRows?.[0] || null;
			const oldAvatarUri = oldUser?.avatar_uri || '';
			const oldLocalAvatarUri = oldUser?.local_avatar_uri || '';
			
			let localAvatarUri = '';
			let needAvatar = false;
			
			if (!oldUser) {
				localAvatarUri = avatarUri.startsWith('/static/') ? avatarUri : '';
				needAvatar = !avatarUri.startsWith('/static/');
			 } else {
				const avatarChanged = remoteAvatar !== '' && avatarUri !== oldAvatarUri;
			
				localAvatarUri = avatarUri.startsWith('/static/')
					? avatarUri
					: avatarChanged
						? ''
						: oldLocalAvatarUri;
			
				needAvatar =
					!avatarUri.startsWith('/static/') &&
					(avatarChanged || !oldLocalAvatarUri);
			}
			
			await DB.upsertUsers([
				{
					user_id: userId,
					username,
					avatar_uri: avatarUri,
					local_avatar_uri: localAvatarUri,
					modify_time: Date.now()
				}
			]);
			
			if (needAvatar) {
				enqueueEntityAvatars('user', [userId]);
			}
			app.globalData.username = username;
			app.globalData.avatar = avatarUri;
		}
		
		installNotifyListener()
		app.globalData.userConIndex = uni.getStorageSync('user_con_index_' + userId);
		app.globalData.userCmdIndex = uni.getStorageSync('user_cmd_index_' + userId);

		const socket = new Socket();
		app.globalData.socket = socket;
		socket.start();

		return true;
	} catch (err) {
		console.error('init failed:', err);
		return true;
	}
};