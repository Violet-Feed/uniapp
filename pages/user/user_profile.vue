<template>
	<view class="user-profile-container">
		<view class="avatar">
			<image :src="avatar"></image>
		</view>
		<view class="name">{{ username }}</view>
		<view class="stats">
			<view @click="goToFollowingList">关注数: {{ followingCount }}</view>
			<view @click="goToFollowerList">粉丝数: {{ followerCount }}</view>
		</view>
		<view class="button-group">
			<button :style="{ backgroundColor: isFollowed ? '#ccc' : '#0084ff', color: isFollowed ? '#333' : 'white' }"
				@click="toggleFollow">
				{{ isFollowed ? '已关注' : '关注' }}
			</button>
			<button style="background-color: #0084ff; color: white;" @click="goToChat">发消息</button>
		</view>
	</view>
</template>

<script>
	import JSONbig from 'json-bigint';
	import {
		getUserInfos
	} from '@/request/get_user_infos';
	export default {
		data() {
			return {
				userId: null,
				username: '',
				avatar: '',
				followerCount: 0,
				followingCount: 0,
				isFollowed: false
			};
		},
		onLoad(options) {
			this.userId = BigInt(options.userId);
			this.username = uni.getStorageSync("username_" + options.userId);
			this.avatar = uni.getStorageSync("user_avatar_" + options.userId);
			if (!this.username || !this.avatar) {
				getUserInfos([this.userId]).then((res) => {
					this.username = res[0].username;
					this.avatar = res[0].avatar;
					if (this.avatar == "") {
						this.avatar = "/static/user_avatar.png";
					}
				});
			}
			//TODO:is+count
		},
		methods: {
			goToChat() {
				const userId = getApp().globalData.userId;
				let conId;
				if (userId < this.userId) {
					conId = `${userId}:${this.userId}`
				} else {
					conId = `${this.userId}:${userId}`
				}
				uni.navigateTo({
					url: `/pages/im/conversation?conShortId=0&conId=${conId}&conType=1&name=${this.username}`
				});
			},
			goToFollowerList() {
				uni.navigateTo({
					url: `/pages/user/follower_list?userId=${this.userId}`
				});
			},
			goToFollowingList() {
				uni.navigateTo({
					url: `/pages/user/following_list?userId=${this.userId}`
				});
			},
			async toggleFollow() {
				const token = getApp().globalData.token;
				const data = {
					from_user_id: getApp().globalData.userId,
					to_user_id: this.userId
				};
				const dataJson = JSONbig.stringify(data);
				if (this.isFollowed) {
					let res = await uni.request({
						url: 'http://127.0.0.1:3000/api/action/relation/unfollow',
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
						this.isFollowed = false;
						res = JSONbig.parse(res.data);
						if (res.code === 1000) {

						}
					}
				} else {
					let res = await uni.request({
						url: 'http://127.0.0.1:3000/api/action/relation/follow',
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
						this.isFollowed = true;
						res = JSONbig.parse(res.data);
						if (res.code === 1000) {

						}
					}
				}
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
		border: none;
		border-radius: 5px;
		flex: 1;
		max-width: 100px;
	}
</style>