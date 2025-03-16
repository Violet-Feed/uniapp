<template>
	<view class="follower-list-container">
		<view></view>
	</view>
</template>

<script>
	import JSONbig from 'json-bigint';
	export default {
		data() {
			return {
				userId: null,
				followerList:[]
			};
		},
		async onLoad(options) {
			this.userId = options.userId;
			const token = getApp().globalData.token;
			const data = {
				user_id: this.userId
			};
			const dataJson = JSONbig.stringify(data);
			let res = await uni.request({
				url: 'http://127.0.0.1:3000/api/action/relation/get_follower_list',
				method: 'POST',
				header: {
					'content-type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				data: dataJson,
				dataType: 'string',
			});
			if (res.statusCode === 200) {
				console.log(res);
				res = JSONbig.parse(res.data);
				if (res.code === 1000) {
					
				}
			}
		}
	};
</script>

<style scoped>
	.follower-list-container {
		padding: 20px;
	}
</style>