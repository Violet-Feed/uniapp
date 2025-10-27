<template>
	<view class="user-list-container">
		<!-- 头部 -->
		<view class="header">
			<view class="back-btn" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<text class="header-title">互关好友</text>
			<view class="header-right"></view>
		</view>
		
		<!-- 用户列表 -->
		<scroll-view 
			class="user-list-scroll" 
			scroll-y 
			@scrolltolower="loadMore"
			refresher-enabled
			:refresher-triggered="refreshing"
			@refresherrefresh="onRefresh"
		>
			<view class="user-list" v-if="userList.length > 0">
				<view 
					class="user-item" 
					v-for="(user, index) in userList" 
					:key="index" 
					@click="goToUserPage(user)"
				>
					<view class="user-left">
						<view class="avatar-wrapper">
							<image class="avatar" :src="user.avatar" mode="aspectFill"></image>
						</view>
						<view class="user-info">
							<view class="user-name-row">
								<text class="user-name">{{ user.username }}</text>
								<view class="friend-badge">
									<text class="badge-icon">💜</text>
									<text class="badge-text">互关</text>
								</view>
							</view>
							<text class="user-bio" v-if="user.bio">{{ user.bio }}</text>
							<text class="user-bio placeholder" v-else>这个人很懒，什么都没写~</text>
						</view>
					</view>
					<view class="user-right">
						<text class="arrow-icon">›</text>
					</view>
				</view>
			</view>
			
			<!-- 空状态 -->
			<view v-if="!loading && userList.length === 0" class="empty-state">
				<text class="empty-icon">👥</text>
				<text class="empty-text">还没有互关好友</text>
				<text class="empty-hint">快去关注你感兴趣的人吧！</text>
			</view>
			
			<!-- 加载状态 -->
			<view v-if="loading" class="loading-state">
				<view class="loading-spinner"></view>
				<text class="loading-text">加载中...</text>
			</view>
			
			<!-- 没有更多 -->
			<view v-if="!loading && userList.length > 0 && noMore" class="no-more">
				<text class="no-more-text">没有更多了</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import JSONbig from 'json-bigint';

export default {
	data() {
		return {
			userId: null,
			userList: [],
			loading: true,
			refreshing: false,
			noMore: false
		};
	},
	async onLoad(options) {
		this.userId = options.userId;
		await this.loadUserList();
	},
	methods: {
		async loadUserList() {
			this.loading = true;
			const token = getApp().globalData.token;
			const data = {
				user_id: this.userId
			};
			const dataJson = JSONbig.stringify(data);
			
			try {
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
						this.userList = res.data.user_infos || [];
						for (const user of this.userList) {
							if (user.avatar == "") {
								user.avatar = "/static/user_avatar.png";
							}
						}
					}
				}
			} catch (err) {
				console.error('加载失败:', err);
				uni.showToast({ title: '加载失败', icon: 'none' });
			} finally {
				this.loading = false;
				this.refreshing = false;
			}
		},
		
		async onRefresh() {
			this.refreshing = true;
			await this.loadUserList();
		},
		
		loadMore() {
			// 加载更多逻辑
			if (!this.loading && !this.noMore) {
				// this.noMore = true; // 暂时设置为已加载完
			}
		},
		
		goBack() {
			uni.navigateBack();
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
.user-list-container {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background: #f8f9fa;
}

/* ==================== 头部 ==================== */
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	position: sticky;
	top: 0;
	z-index: 10;
}

.back-btn {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-icon {
	font-size: 24px;
	color: #fff;
}

.header-title {
	font-size: 17px;
	font-weight: bold;
	color: #fff;
}

.header-right {
	width: 36px;
}

/* ==================== 列表容器 ==================== */
.user-list-scroll {
	flex: 1;
	overflow: hidden;
}

.user-list {
	padding: 8px 0;
}

/* ==================== 用户卡片 ==================== */
.user-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: #fff;
	margin-bottom: 1px;
	transition: background 0.3s;
}

.user-item:active {
	background: #f5f5f5;
}

.user-left {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 12px;
	overflow: hidden;
}

.avatar-wrapper {
	flex-shrink: 0;
}

.avatar {
	width: 54px;
	height: 54px;
	border-radius: 50%;
	border: 2px solid #f0f0f0;
}

.user-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4px;
	overflow: hidden;
}

.user-name-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.user-name {
	font-size: 15px;
	font-weight: 600;
	color: #333;
}

.friend-badge {
	display: flex;
	align-items: center;
	gap: 2px;
	padding: 2px 8px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 10px;
}

.badge-icon {
	font-size: 10px;
}

.badge-text {
	font-size: 11px;
	color: #fff;
}

.user-bio {
	font-size: 13px;
	color: #666;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.user-bio.placeholder {
	color: #999;
}

.user-right {
	flex-shrink: 0;
	margin-left: 8px;
}

.arrow-icon {
	font-size: 24px;
	color: #ccc;
}

/* ==================== 空状态 ==================== */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100px 20px;
}

.empty-icon {
	font-size: 64px;
	margin-bottom: 16px;
}

.empty-text {
	font-size: 15px;
	color: #666;
	margin-bottom: 8px;
}

.empty-hint {
	font-size: 13px;
	color: #999;
}

/* ==================== 加载状态 ==================== */
.loading-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 40px 0;
}

.loading-spinner {
	width: 24px;
	height: 24px;
	border: 2px solid #f3f3f3;
	border-top-color: #667eea;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin-bottom: 8px;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

.loading-text {
	font-size: 13px;
	color: #999;
}

/* ==================== 没有更多 ==================== */
.no-more {
	padding: 20px 0;
	text-align: center;
}

.no-more-text {
	font-size: 13px;
	color: #999;
}
</style>