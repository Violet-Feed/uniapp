<template>
	<view class="user-list-container">
		<view class="user-list" v-if="userList.length > 0">
			<view class="user-item" v-for="(user, index) in userList" :key="index" @click="goToUserPage(user)">
				<view class="avatar">
					<image :src="user.avatar"></image>
				</view>
				<view class="user-name">{{ user.username }}</view>
			</view>
		</view>
	</view>
</template>

<script>
	import JSONbig from 'json-bigint';
	export default {
		data() {
			return {
				userId: null,
				userList: []
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
				url: 'http://127.0.0.1:3000/api/relation/get_friend_list',
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
					this.userList=res.data.user_infos;
					for (const user of this.userList) {
						if (user.avatar == "") {
							user.avatar = "/static/user_avatar.png";
						}
					}
				}
			}
		},
		methods: {
			goToUserPage(user) {
				uni.navigateTo({
					url: `/pages/user/user_profile?userId=${user.user_id}`
				});
			}
		}
	};
</script>

<style scoped>
	/* .user-list-container {
		padding: 20px;
	} */

	.user-list {
		display: flex;
		flex-direction: column;
	}

	.user-item {
		display: flex;
		align-items: center;
		padding: 10px;
		border-bottom: 1px solid #eee;
		cursor: pointer;
	}

	.avatar {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		overflow: hidden;
		margin-right: 10px;
	}

	.avatar image {
		width: 100%;
		height: 100%;
	}

	.user-name {
		font-weight: bold;
	}
</style>