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
		<view class="button-group">
			<button :style="{ backgroundColor: isFollowed ? '#ccc' : '#0084ff', color: isFollowed ? '#333' : 'white' }"
				@click="toggleFollow">
				{{ isFollowed ? '已关注' : '关注' }}
			</button>
			<button style="background-color: #0084ff; color: white;" @click="goBackToChat">发消息</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				userInfo: {
					id: null,
					name: '',
					avatar: '',
					followers: 0,
					following: 0
				},
				isFollowed: false
			};
		},
		onLoad(options) {
			this.userInfo.userId = BigInt(options.userId);
			this.userInfo.username = uni.getStorageSync("username_"+options.userId);
			this.userInfo.avatar = uni.getStorageSync("user_avatar_"+options.userId);
		},
		methods: {
			goBackToChat() {
				const userId=getApp().globalData.userId;
				let conId;
				if(userId<this.userInfo.userId){
					conId=`${userId}:${this.userInfo.userId}`
				}else{
					conId=`${this.userInfo.userId}:${userId}`
				}
				uni.navigateTo({
					url: `/pages/im/conversation?conShortId=0&conId=${conId}&conType=1&name=${this.userInfo.username}`
				});
			},
			goToFansList() {
				uni.navigateTo({
					url: `/pages/user/followed_list?userId=${this.userInfo.userId}`
				});
			},
			goToFollowingList() {
				uni.navigateTo({
					url: `/pages/user/following_list?userId=${this.userInfo.userId}}`
				});
			},
			toggleFollow() {
				this.isFollowed = !this.isFollowed;
				// 这里可以添加实际的关注或取消关注的接口调用
				// 例如：
				// if (this.isFollowed) {
				//     // 调用关注接口
				// } else {
				//     // 调用取消关注接口
				// }
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

	.button-group {
		display: flex;
		gap: 10px;
		width: 100%;
		justify-content: center;
	}

	.button-group button {
		padding: 10px 20px;
		border: none;
		border-radius: 5px;
		flex: 1;
		/* 让按钮宽度相同 */
		max-width: 200px;
		/* 可根据需要调整最大宽度 */
	}
</style>