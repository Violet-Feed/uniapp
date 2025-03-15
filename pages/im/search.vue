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
	import JSONbig from 'json-bigint';
	export default {
		data() {
			return {
				searchKeyword: '',
				userList: [],
				hasSearched: false
			};
		},
		methods: {
			async searchUsers() {
				if (!this.searchKeyword) {
					uni.showToast({
						title: '请输入用户名',
						icon: 'none'
					});
					return;
				}
				const token = getApp().globalData.token;
				let res= await uni.request({
					url: 'http://127.0.0.1:3000/api/action/user/search',
					method: 'GET',
					header: {
						Authorization: `Bearer ${token}`,
					},
					data: {
						keyword: this.searchKeyword
					},
					dataType: 'string',
				});
				if(res.statusCode===200){
					res = JSONbig.parse(res.data);
					this.userList = res.userList;
					this.hasSearched = true;
					for(const user of this.userList){
						if(user.avatar==""){
							user.avatar="/static/user_avatar.png";
						}
					}
				}else{
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					});
				}
			},
			goToUserPage(user) {
				uni.navigateTo({
					url: `/pages/user/user_profile?userId=${user.user_id}`
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