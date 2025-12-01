import JSONbig from 'json-bigint';
export const follow = async (fromUserId,toUserId) => {
	const token = getApp().globalData.token;
	const data = {
		from_user_id: fromUserId,
		to_user_id: toUserId
	};
	const dataJson = JSONbig.stringify(data);
	console.log(dataJson);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/relation/follow',
		method: 'POST',
		header: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: dataJson,
		dataType: 'string',
	});
	console.log(res);
	if (res.statusCode === 200) {
		res = JSONbig.parse(res.data);
		if (res.code === 1000) {
			console.log(res.data);
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
}

export const unfollow = async (fromUserId,toUserId) => {
	const token = getApp().globalData.token;
	const data = {
		from_user_id: fromUserId,
		to_user_id: toUserId
	};
	const dataJson = JSONbig.stringify(data);
	console.log(dataJson);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/relation/unfollow',
		method: 'POST',
		header: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: dataJson,
		dataType: 'string',
	});
	console.log(res);
	if (res.statusCode === 200) {
		res = JSONbig.parse(res.data);
		if (res.code === 1000) {
			console.log(res.data);
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
}

export const digg = async (entityType,entityId) => {
	const token = getApp().globalData.token;
	const data = {
		entity_type: entityType,
		entity_id: entityId
	};
	const dataJson = JSONbig.stringify(data);
	console.log(dataJson);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/action/digg',
		method: 'POST',
		header: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: dataJson,
		dataType: 'string',
	});
	console.log(res);
	if (res.statusCode === 200) {
		res = JSONbig.parse(res.data);
		if (res.code === 1000) {
			console.log(res.data);
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
}

export const cancelDigg = async (entityType,entityId) => {
	const token = getApp().globalData.token;
	const data = {
		entity_type: entityType,
		entity_id: entityId
	};
	const dataJson = JSONbig.stringify(data);
	console.log(dataJson);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/action/cancel_digg',
		method: 'POST',
		header: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: dataJson,
		dataType: 'string',
	});
	console.log(res);
	if (res.statusCode === 200) {
		res = JSONbig.parse(res.data);
		if (res.code === 1000) {
			console.log(res.data);
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
}