<template>
	<view class="user-profile-container">
		<view class="avatar">
			<image :src="userInfo.avatar"></image>
		</view>
		<view class="name">{{ userInfo.username }}</view>
		<view class="stats">
			<view @click="goToFriendList">互关数: {{ userInfo.friend }}</view>
			<view @click="goToFollowingList">关注数: {{ userInfo.following }}</view>
			<view @click="goToFollowerList">粉丝数: {{ userInfo.follower }}</view>
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
			this.userInfo.friend = 0;
			this.userInfo.following = 0;
			this.userInfo.follower = 0;
		},
		methods: {
			goToFriendList() {
				uni.navigateTo({
					url: `/pages/user/friend_list?userId=${this.userInfo.userId}&username=${this.userInfo.username}`
				});
			},
			goToFollowingList() {
				uni.navigateTo({
					url: `/pages/user/following_list?userId=${this.userInfo.userId}&username=${this.userInfo.username}`
				});
			},
			goToFollowerList() {
				uni.navigateTo({
					url: `/pages/user/follower_list?userId=${this.userInfo.userId}&username=${this.userInfo.username}`
				});
			},
			logout() {
				getApp().globalData.socketTask.close({
					code: 1000,
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
					url: '/pages/user/login'
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
		font-size: 12px; 
		margin-top: 250px;
		background-color: #0084ff;
		color: white;
		border: none;
		border-radius: 5px;
	}
</style>