<template>
	<view class="user-profile-container">
		<view class="avatar">
			<image :src="userInfo.avatar"></image>
		</view>
		<view class="name">{{ userInfo.username }}</view>
		<view class="stats">
			<view @click="goToFansList">粉丝数: {{ userInfo.followers }}</view>
			<view @click="goToFollowingList">关注数: {{ userInfo.following }}</view>
		</view>
		<button style="background-color: #aa0000; color: white;" @click="logout">退出登录</button>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				userInfo: {
					userId: null,
					username: '',
					avatar: '',
					followers: 0,
					following: 0
				}
			};
		},
		onLoad(options) {
			this.userInfo.userId = getApp().globalData.userId;
			this.userInfo.username = getApp().globalData.username;
			this.userInfo.avatar = getApp().globalData.avatar;
			this.userInfo.followers = 0;
			this.userInfo.following = 0;
		},
		methods: {
			goToFansList() {
				uni.navigateTo({
					url: `/pages/user/followed_list?id=${this.userInfo.id}&name=${this.userInfo.name}`
				});
			},
			goToFollowingList() {
				uni.navigateTo({
					url: `/pages/user/following_list?id=${this.userInfo.id}&name=${this.userInfo.name}`
				});
			},
			logout() {
				getApp().globalData.socketTask.close({
					code: 1000, // 关闭原因代码，1000 表示正常关闭
					reason: 'logout',
					success() {
						console.log('WebSocket 连接关闭成功');
					},
					fail(err) {
						console.error('WebSocket 连接关闭失败:', err);
					}
				});
				delete getApp().globalData.token;
				uni.removeStorageSync('token');
				uni.removeStorageSync('user_id');
				uni.reLaunch({
					url: '/pages/user/login' // 替换为你的首页路径
				});
			}
		}
	};
</script>

<style scoped>
	.user-profile-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20px;
	}

	.avatar {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		overflow: hidden;
		margin-bottom: 10px;
	}

	.avatar image {
		width: 100%;
		height: 100%;
	}

	.name {
		font-weight: bold;
		font-size: 18px;
		margin-bottom: 10px;
	}

	.stats {
		display: flex;
		justify-content: space-around;
		width: 100%;
		margin-bottom: 20px;
	}

	.stats view {
		cursor: pointer;
	}

	button {
		padding: 10px 20px;
		background-color: #0084ff;
		color: white;
		border: none;
		border-radius: 5px;
	}
</style>