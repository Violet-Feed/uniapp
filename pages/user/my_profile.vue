<template>
	<view class="user-profile-container">
		<view class="avatar">
			<image :src="avatar"></image>
		</view>
		<view class="name">{{ username }}</view>
		<view class="stats">
			<view @click="goToFriendList">互关数: {{ friendCount }}</view>
			<view @click="goToFollowingList">关注数: {{ followingCount }}</view>
			<view @click="goToFollowerList">粉丝数: {{ followerCount }}</view>
		</view>
		<button style="background-color: #aa0000; color: white;" @click="logout">退出登录</button>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				userId: null,
				username: '',
				avatar: '',
				friendCount:0,
				followingCount: 0,
				followerCount: 0,
			};
		},
		onLoad(options) {
			this.userId = getApp().globalData.userId;
			this.username = getApp().globalData.username;
			this.avatar = getApp().globalData.avatar;
		},
		onShow(){
			this.friendCount = getApp().globalData.friendCount;
			this.followingCount = getApp().globalData.followingCount;
			this.followerCount = getApp().globalData.followerCount;
		},
		methods: {
			goToFriendList() {
				uni.navigateTo({
					url: `/pages/user/friend_list?userId=${this.userId}`
				});
			},
			goToFollowingList() {
				uni.navigateTo({
					url: `/pages/user/following_list?userId=${this.userId}`
				});
			},
			goToFollowerList() {
				uni.navigateTo({
					url: `/pages/user/follower_list?userId=${this.userId}`
				});
			},
			logout() {
				getApp().globalData.socket.close();
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