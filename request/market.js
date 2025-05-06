import JSONbig from 'json-bigint';
export const getItemsByUser = async() => {
	const {
		token
	} = getApp().globalData;
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/market/get_items_by_user',
		method: 'POST',
		header: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data:"{}",
		dataType: 'string',
	});
	if (res.statusCode === 200) {
		res = JSONbig.parse(res.data);
		console.log(res);
		if (res.code === 1000) {
			return res.data.items;
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

export const getItemsBySearch = async(keyword,page) => {
	const {
		token
	} = getApp().globalData;
	const data = {
		keyword: keyword,
		page: page,
	};
	const dataJson = JSONbig.stringify(data);
	let res = await uni.request({
		url: 'http://127.0.0.1:3000/api/market/get_items_by_search',
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
			return res.data.items;
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