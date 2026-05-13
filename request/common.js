import JSONbig from 'json-bigint';

const BASE_URL = 'http://127.0.0.1:3000/api';

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
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			});
			return undefined;
		}

		if (res.statusCode === 403) {
			uni.showToast({
				title: '登录过期',
				icon: 'none'
			});
			uni.reLaunch({
				url: '/pages/user/login'
			});
			return undefined;
		}

		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
		return undefined;
	} catch (err) {
		console.error(url, 'request failed', err);
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
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
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			});
			return false;
		}

		if (res.statusCode === 403) {
			uni.showToast({
				title: '登录过期',
				icon: 'none'
			});
			uni.reLaunch({
				url: '/pages/user/login'
			});
			return false;
		}

		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
		return false;
	} catch (err) {
		console.error(url, 'request failed', err);
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
		return false;
	}
};

export const uploadImage = async (filePath, type) => {
	const token = getApp().globalData.token;
	console.log('upload',filePath, type);
	return new Promise((resolve) => {
		uni.uploadFile({
			url: BASE_URL + '/upload_image',
			filePath,
			name: 'image',
			header: {
				'Authorization': `Bearer ${token}`,
			},
			formData: {
				type: type
			},
			success: (res) => {
				if (res.statusCode === 200) {
					res = JSONbig.parse(res.data);
					console.log("upload",res);
					if (res.code === 1000) {
						resolve(res.data);
					} else {
						uni.showToast({
							title: '服务器错误',
							icon: 'none',
						});
						resolve(undefined);
					}
				} else if (res.statusCode === 403) {
					uni.showToast({
						title: '登录过期',
						icon: 'none',
					});
					uni.reLaunch({
						url: '/pages/user/login',
					});
					resolve(undefined);
				}else {
					uni.showToast({
						title: '网络错误',
						icon: 'none',
					});
					resolve(undefined);
				}
			},
			fail: (err) => {
				console.error('上传失败', err);
				uni.showToast({
					title: '网络错误',
					icon: 'none',
				});
				resolve(undefined);
			},
		});
	});
};
