import JSONbig from 'json-bigint';
export const httpRequestBackData = async (url, data) => {
	const token = getApp().globalData.token;
	const dataJson = JSONbig.stringify(data);
	console.log(url,dataJson);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api'+url,
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
		console.log(url,res);
		if (res.code === 1000) {
			return res.data;
		}else {
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			});
		}
	} else if (res.statusCode === 403) {
		uni.showToast({
			title: '登录过期',
			icon: 'none'
		});
		uni.reLaunch({
			url: '/pages/user/login'
		});
	} else {
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
	}
	return undefined;
}

export const httpRequestBackBool = async (url, data) => {
	const token = getApp().globalData.token;
	const dataJson = JSONbig.stringify(data);
	console.log(url,dataJson);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api'+url,
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
		console.log(url,res);
		if (res.code === 1000) {
			return true;
		}else {
			uni.showToast({
				title: '服务器错误',
				icon: 'none'
			});
		}
	} else if (res.statusCode === 403) {
		uni.showToast({
			title: '登录过期',
			icon: 'none'
		});
		uni.reLaunch({
			url: '/pages/user/login'
		});
	} else {
		uni.showToast({
			title: '网络错误',
			icon: 'none'
		});
	}
	return false;
}

export const uploadImage = async (filePath, type, name) => {
	const token = getApp().globalData.token;
	console.log('upload',filePath, type);
	return new Promise((resolve) => {
		uni.uploadFile({
			url: 'http://127.0.0.1:3000/api/upload_image',
			filePath,
			name: 'image',
			header: {
				'Authorization': `Bearer ${token}`,
			},
			formData: {
				type: type,
				name: name
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
