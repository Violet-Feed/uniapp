import JSONbig from 'json-bigint';

const BASE_URL = 'http://127.0.0.1:3000/api';

const SHOW_ERROR_TOAST_URLS = [
	'/user/login',
	'/user/register',
	'/user/update_user_info',
	'/user/search_users',
	'/aigc/create_material',
	'/aigc/re_create_material',
	'/aigc/delete_material',
	'/aigc/get_material_by_user',
	'/aigc/create_creation',
	'/aigc/delete_creation',
	'/aigc/update_creation',
	'/aigc/get_creations_by_user',
	'/aigc/get_creations_by_digg',
	'/aigc/get_creations_by_friend',
	'/aigc/get_creations_by_rec',
	'/aigc/get_creations_by_search',
	'/relation/follow',
	'/relation/unfollow',
	'/relation/get_friend_list',
	'/relation/get_following_list',
	'/relation/get_follower_list',
	'/action/digg',
	'/action/cancel_digg',
	'/action/create_comment',
	'/action/create_reply',
	'/action/delete_comment',
	'/action/delete_reply',
	'/action/get_comment_list',
	'/action/get_reply_list',
	'/action/digg_comment',
	'/action/cancel_digg_comment',
	'/aigc/create_agent',
	'/aigc/delete_agent',
	'/aigc/update_agent',
	'/aigc/get_agents_by_user',
	'/im/send_message',
	'/im/recall_message',
	'/im/create_conversation',
	'/im/update_conversation_core',
	'/im/update_conversation_setting',
	'/im/update_conversation_member',
	'/im/add_conversation_members',
	'/im/remove_conversation_member',
	'/im/add_conversation_agents',
	'/im/remove_conversation_agent',
	'/notice/get_notice_list',
	'/notice/get_notice_agg_list'
];

const shouldShowErrorToast = (url) => {
	return SHOW_ERROR_TOAST_URLS.includes(url);
};

const showServerErrorToast = (url) => {
	if (!shouldShowErrorToast(url)) return;

	uni.showToast({
		title: '服务器错误',
		icon: 'none'
	});
};

const showNetworkErrorToast = (url) => {
	if (!shouldShowErrorToast(url)) return;

	uni.showToast({
		title: '网络错误',
		icon: 'none'
	});
};

const handleLoginExpired = () => {
	uni.showToast({
		title: '登录过期',
		icon: 'none'
	});

	uni.reLaunch({
		url: '/pages/user/login'
	});
};

export const httpRequestBackData = async (url, data) => {
	try {
		const token = getApp().globalData.token;
		const dataJson = JSONbig.stringify(data);

		console.log(url, 'request', data);

		let res = await uni.request({
			url: BASE_URL + url,
			method: 'POST',
			header: {
				'content-type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			data: dataJson,
			dataType: 'string'
		});

		if (res.statusCode === 200) {
			res = JSONbig.parse(res.data);
			console.log(url, 'response', res);

			if (res.code === 1000) {
				return res.data;
			}

			if (res.code === 1008) {
				return undefined;
			}

			showServerErrorToast(url);
			return undefined;
		}

		if (res.statusCode === 403) {
			handleLoginExpired();
			return {};
		}

		showNetworkErrorToast(url);
		return undefined;
	} catch (err) {
		console.error(url, 'request failed', err);
		showNetworkErrorToast(url);
		return undefined;
	}
};

export const httpRequestBackBool = async (url, data) => {
	try {
		const token = getApp().globalData.token;
		const dataJson = JSONbig.stringify(data);

		console.log(url, dataJson);

		let res = await uni.request({
			url: BASE_URL + url,
			method: 'POST',
			header: {
				'content-type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			data: dataJson,
			dataType: 'string'
		});

		if (res.statusCode === 200) {
			res = JSONbig.parse(res.data);
			console.log(url, res);

			if (res.code === 1000) {
				return true;
			}

			if (res.code === 1008) {
				return false;
			}

			showServerErrorToast(url);
			return false;
		}

		if (res.statusCode === 403) {
			handleLoginExpired();
			return false;
		}

		showNetworkErrorToast(url);
		return false;
	} catch (err) {
		console.error(url, 'request failed', err);
		showNetworkErrorToast(url);
		return false;
	}
};

export const uploadImage = async (filePath, type) => {
	const token = getApp().globalData.token;
	console.log('upload',filePath, type);
	try {
		uni.uploadFile({
			url: BASE_URL + '/upload_image',
			filePath,
			name: 'image',
			header: {
				Authorization: `Bearer ${token}`
			},
			formData: {
				type
			},
			success: (uploadRes) => {
				if (uploadRes.statusCode === 200) {
					let body = JSONbig.parse(uploadRes.data);
					console.log('upload', body);

					if (body.code === 1000) {
						resolve(body.data);
						return;
					}

					uni.showToast({
						title: '服务器错误',
						icon: 'none'
					});
					resolve(undefined);
					return;
				}

				if (uploadRes.statusCode === 403) {
					uni.showToast({
						title: '登录过期',
						icon: 'none'
					});

					uni.reLaunch({
						url: '/pages/user/login'
					});

					resolve(undefined);
					return;
				}

				uni.showToast({
					title: '网络错误',
					icon: 'none'
				});
				resolve(undefined);
			},
			fail: (err) => {
				console.error('上传失败', err);
				uni.showToast({
					title: '上传失败',
					icon: 'none'
				});
				resolve(undefined);
			}
		});
	} catch (err) {
		console.error('调用 uploadFile 失败', err);
		uni.showToast({
			title: '上传失败',
			icon: 'none'
		});
		resolve(undefined);
	}
};
