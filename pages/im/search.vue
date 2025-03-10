<template>
	<view class="search-page">
		<!-- 搜索栏 -->
		<view class="search-bar">
			<input v-model="searchKeyword" placeholder="请输入用户名" />
			<button @click="searchUsers">搜索</button>
		</view>
		<!-- 用户列表 -->
		<view class="user-list" v-if="userList.length > 0">
			<view class="user-item" v-for="(user, index) in userList" :key="index" @click="goToUserPage(user)">
				<view class="avatar">
					<image :src="user.avatar"></image>
				</view>
				<view class="user-name">{{ user.username }}</view>
			</view>
		</view>
		<view v-else class="no-result" v-if="hasSearched">暂无搜索结果</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				searchKeyword: '', // 搜索关键词
				userList: [], // 用户列表
				hasSearched: false // 是否已经进行过搜索
			};
		},
		methods: {
			// 搜索用户的方法
			searchUsers() {
				if (!this.searchKeyword) {
					uni.showToast({
						title: '请输入用户名',
						icon: 'none'
					});
					return;
				}
				this.hasSearched = true;
				const token = getApp().globalData.token;
				uni.request({
					url: 'http://127.0.0.1:3000/api/action/user/search/',
					method: 'GET',
					header: {
						Authorization: `Bearer ${token}`,
					},
					data: {
						term: this.searchKeyword
					},
					success: (res) => {
						if (res.statusCode === 200) {
							this.userList = res.data.userList;
							console.log(res)
						} else {
							uni.showToast({
								title: '搜索失败，请稍后重试',
								icon: 'none'
							});
						}
					},
					fail: (err) => {
						uni.showToast({
							title: '网络错误，请稍后重试',
							icon: 'none'
						});
					}
				});
			},
			// 跳转到用户个人页的方法
			goToUserPage(user) {
				uni.navigateTo({
					url: `/pages/user/user?id=${user.userId}&name=${user.username}&avatar=${user.avatar}`
				});
			}
		}
	};
</script>

<style scoped>
	.search-page {
		padding: 10px;
	}

	.search-bar {
		display: flex;
		align-items: center;
		margin-bottom: 10px;
	}

	.search-bar input {
		flex: 1;
		margin-right: 10px;
		padding: 5px;
		border: 1px solid #ccc;
		border-radius: 3px;
	}

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

	.no-result {
		color: #666;
		text-align: center;
		padding: 20px;
	}
</style>