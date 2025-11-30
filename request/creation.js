import JSONbig from 'json-bigint';
export const getMaterialByUser = async (page) => {
	const token = getApp().globalData.token;
	const data = {
		page: page
	};
	const dataJson = JSONbig.stringify(data);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/aigc/get_material_by_user',
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
		if (res.code === 1000) {
			console.log(res.data);
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

export const createCreation = async (payload) => {
	const token = getApp().globalData.token;
	const data = {
		material_id: payload.material_id,
		material_type: payload.material_type,
		material_url: payload.material_url,
		title: payload.title,
		content: payload.content,
		category: payload.category
	};
	const dataJson = JSONbig.stringify(data);
	console.log(dataJson);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/aigc/create_creation',
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

export const getCreationsByUser = async (userId,page) => {
	const token = getApp().globalData.token;
	const data = {
		user_id: userId,
		page: page
	};
	const dataJson = JSONbig.stringify(data);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/aigc/get_creations_by_user',
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
		if (res.code === 1000) {
			console.log(res.data);
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

export const getCreationsByFriend = async (page) => {
	const token = getApp().globalData.token;
	const data = {
		page: page
	};
	const dataJson = JSONbig.stringify(data);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/aigc/get_creations_by_friend',
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
		if (res.code === 1000) {
			console.log(res.data);
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