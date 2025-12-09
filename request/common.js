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