<template>
	<view class="user-profile-container">
		<!-- 顶部区域 - 渐变背景 -->
		<view class="profile-header">
			<!-- 设置按钮 -->
			<view class="setting-btn" @click="showSettingMenu">
				<text class="setting-icon">⚙️</text>
			</view>
			
			<!-- 用户头像 -->
			<view class="avatar-section">
				<image class="avatar" :src="avatar || '/static/user_avatar.png'" mode="aspectFill"></image>
			</view>
			
			<!-- 用户名和ID -->
			<view class="user-info">
				<text class="username">{{ username }}</text>
				<text class="user-id">抖音号：{{ userId }}</text>
			</view>
			
			<!-- 统计数据 -->
			<view class="stats-section">
				<view class="stat-item" @click="goToFriendList">
					<text class="stat-number">{{ formatNumber(friendCount) }}</text>
					<text class="stat-label">互关</text>
				</view>
				<view class="stat-item" @click="goToFollowingList">
					<text class="stat-number">{{ formatNumber(followingCount) }}</text>
					<text class="stat-label">关注</text>
				</view>
				<view class="stat-item" @click="goToFollowerList">
					<text class="stat-number">{{ formatNumber(followerCount) }}</text>
					<text class="stat-label">粉丝</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ formatNumber(totalLikes) }}</text>
					<text class="stat-label">获赞</text>
				</view>
			</view>
		</view>
		
		<!-- Tab切换栏 -->
		<view class="tab-bar">
			<view 
				class="tab-item" 
				:class="{ active: activeTab === 'works' }"
				@click="switchTab('works')"
			>
				<text class="tab-icon">🎬</text>
				<text class="tab-text">作品</text>
				<text class="tab-count">{{ worksList.length }}</text>
				<view class="tab-indicator" v-if="activeTab === 'works'"></view>
			</view>
			<view 
				class="tab-item" 
				:class="{ active: activeTab === 'likes' }"
				@click="switchTab('likes')"
			>
				<text class="tab-icon">❤️</text>
				<text class="tab-text">点赞</text>
				<text class="tab-count">{{ likesList.length }}</text>
				<view class="tab-indicator" v-if="activeTab === 'likes'"></view>
			</view>
		</view>
		
		<!-- 内容列表 -->
		<view class="content-container">
			<!-- 作品列表 -->
			<view v-if="activeTab === 'works'" class="works-grid">
				<view 
					class="work-item" 
					v-for="(work, index) in worksList" 
					:key="index"
					@click="goToWorkDetail(work)"
					@longpress="showWorkOptions(work)"
				>
					<image class="work-cover" :src="work.cover" mode="aspectFill"></image>
					<view class="work-overlay">
						<view class="work-stats">
							<text class="stat-icon">❤️</text>
							<text class="stat-value">{{ formatNumber(work.likes) }}</text>
						</view>
					</view>
					<view class="work-type-badge" v-if="work.type === 'video'">
						<text>📹</text>
					</view>
				</view>
				
				<!-- 空状态 -->
				<view v-if="worksList.length === 0" class="empty-state">
					<text class="empty-icon">🎨</text>
					<text class="empty-text">还没有发布作品</text>
					<text class="empty-hint">快去创作第一个作品吧！</text>
				</view>
			</view>
			
			<!-- 点赞列表 -->
			<view v-if="activeTab === 'likes'" class="works-grid">
				<view 
					class="work-item" 
					v-for="(work, index) in likesList" 
					:key="index"
					@click="goToWorkDetail(work)"
				>
					<image class="work-cover" :src="work.cover" mode="aspectFill"></image>
					<view class="work-overlay">
						<view class="work-stats">
							<text class="stat-icon">❤️</text>
							<text class="stat-value">{{ formatNumber(work.likes) }}</text>
						</view>
					</view>
					<view class="work-type-badge" v-if="work.type === 'video'">
						<text>📹</text>
					</view>
				</view>
				
				<!-- 空状态 -->
				<view v-if="likesList.length === 0" class="empty-state">
					<text class="empty-icon">💔</text>
					<text class="empty-text">还没有点赞内容</text>
					<text class="empty-hint">去发现更多精彩作品吧！</text>
				</view>
			</view>
			
			<!-- 加载更多 -->
			<view v-if="loading" class="loading-more">
				<view class="loading-spinner"></view>
				<text class="loading-text">加载中...</text>
			</view>
		</view>
		
		<!-- 设置菜单弹窗 -->
		<view class="setting-overlay" v-if="showSetting" @click="showSetting = false">
			<view class="setting-menu" @click.stop>
				<view class="menu-header">
					<text class="menu-title">设置</text>
					<text class="menu-close" @click="showSetting = false">✕</text>
				</view>
				<view class="menu-list">
					<view class="menu-item" @click="goToEditProfile">
						<text class="menu-icon">✏️</text>
						<text class="menu-text">编辑资料</text>
						<text class="menu-arrow">›</text>
					</view>
					<view class="menu-item" @click="goToAccountSetting">
						<text class="menu-icon">👤</text>
						<text class="menu-text">账号设置</text>
						<text class="menu-arrow">›</text>
					</view>
					<view class="menu-item" @click="goToPrivacySetting">
						<text class="menu-icon">🔒</text>
						<text class="menu-text">隐私设置</text>
						<text class="menu-arrow">›</text>
					</view>
				</view>
				<view class="logout-btn" @click="logout">
					<text class="logout-text">退出登录</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userId: null,
			username: '',
			avatar: '',
			friendCount: 0,
			followingCount: 0,
			followerCount: 0,
			totalLikes: 0,
			activeTab: 'works',
			worksList: [],
			likesList: [],
			loading: false,
			showSetting: false
		};
	},
	onLoad(options) {
		this.userId = getApp().globalData.userId;
		this.username = getApp().globalData.username;
		this.avatar = getApp().globalData.avatar;
		this.loadUserWorks();
	},
	onShow() {
		this.friendCount = getApp().globalData.friendCount || 0;
		this.followingCount = getApp().globalData.followingCount || 0;
		this.followerCount = getApp().globalData.followerCount || 0;
		this.totalLikes = getApp().globalData.totalLikes || 0;
	},
	methods: {
		async loadUserWorks() {
			this.loading = true;
			setTimeout(() => {
				this.worksList = [
					{
						id: 1,
						cover: 'https://picsum.photos/id/237/400/600',
						likes: 1234,
						type: 'image'
					},
					{
						id: 2,
						cover: 'https://picsum.photos/id/238/400/600',
						likes: 856,
						type: 'video'
					},
					{
						id: 3,
						cover: 'https://picsum.photos/id/239/400/600',
						likes: 2341,
						type: 'image'
					},
					{
						id: 4,
						cover: 'https://picsum.photos/id/240/400/600',
						likes: 678,
						type: 'video'
					}
				];
				
				this.likesList = [
					{
						id: 5,
						cover: 'https://picsum.photos/id/241/400/600',
						likes: 1987,
						type: 'image'
					},
					{
						id: 6,
						cover: 'https://picsum.photos/id/242/400/600',
						likes: 543,
						type: 'video'
					}
				];
				
				this.loading = false;
			}, 500);
		},
		
		switchTab(tab) {
			this.activeTab = tab;
		},
		
		showSettingMenu() {
			this.showSetting = true;
		},
		
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
		
		goToWorkDetail(work) {
			uni.navigateTo({
				url: `/pages/creation/creation?id=${work.id}`
			});
		},
		
		showWorkOptions(work) {
			uni.showActionSheet({
				itemList: ['编辑', '删除', '分享'],
				success: (res) => {
					if (res.tapIndex === 0) {
						console.log('编辑作品');
					} else if (res.tapIndex === 1) {
						uni.showModal({
							title: '提示',
							content: '确定要删除这个作品吗？',
							success: (res) => {
								if (res.confirm) {
									console.log('删除作品');
								}
							}
						});
					} else if (res.tapIndex === 2) {
						console.log('分享作品');
					}
				}
			});
		},
		
		goToEditProfile() {
			this.showSetting = false;
			uni.showToast({ title: '编辑资料功能开发中', icon: 'none' });
		},
		
		goToAccountSetting() {
			this.showSetting = false;
			uni.showToast({ title: '账号设置功能开发中', icon: 'none' });
		},
		
		goToPrivacySetting() {
			this.showSetting = false;
			uni.showToast({ title: '隐私设置功能开发中', icon: 'none' });
		},
		
		logout() {
			uni.showModal({
				title: '提示',
				content: '确定要退出登录吗？',
				success: (res) => {
					if (res.confirm) {
						try {
							getApp().globalData.socket?.close();
						} catch (e) {
							console.error('退出登录错误:', e);
						}
						delete getApp().globalData.token;
						uni.removeStorageSync('token');
						uni.removeStorageSync('user_id');
						uni.reLaunch({
							url: '/pages/user/login'
						});
					}
				}
			});
		},
		
		formatNumber(num) {
			if (num >= 10000) {
				return (num / 10000).toFixed(1) + 'w';
			}
			if (num >= 1000) {
				return (num / 1000).toFixed(1) + 'k';
			}
			return num.toString();
		}
	}
};
</script>

<style scoped>
.user-profile-container {
	min-height: 100vh;
	background: #f8f9fa;
}

/* ==================== 头部区域 ==================== */
.profile-header {
	position: relative;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 12px 16px 32px;
}

.setting-btn {
	position: absolute;
	top: 12px;
	right: 16px;
	width: 36px;
	height: 36px;
	background: rgba(255, 255, 255, 0.3);
	backdrop-filter: blur(10px);
	border-radius: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
}

.setting-icon {
	font-size: 20px;
}

/* 头像区域 */
.avatar-section {
	display: flex;
	justify-content: center;
	padding-top: 40px;
	margin-bottom: 16px;
}

.avatar {
	width: 90px;
	height: 90px;
	border-radius: 50%;
	border: 4px solid rgba(255, 255, 255, 0.3);
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

/* 用户信息 */
.user-info {
	text-align: center;
	margin-bottom: 24px;
}

.username {
	display: block;
	font-size: 22px;
	font-weight: bold;
	color: #fff;
	margin-bottom: 6px;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-id {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.8);
}

/* 统计数据 */
.stats-section {
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding: 0 20px;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 1;
}

.stat-number {
	font-size: 20px;
	font-weight: bold;
	color: #fff;
	margin-bottom: 4px;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-label {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.85);
}

/* ==================== Tab栏 ==================== */
.tab-bar {
	display: flex;
	background: #fff;
	border-bottom: 1px solid #f0f0f0;
	position: sticky;
	top: 0;
	z-index: 10;
}

.tab-item {
	flex: 1;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 14px 0;
	gap: 6px;
	transition: all 0.3s;
}

.tab-item.active {
	color: #667eea;
}

.tab-icon {
	font-size: 18px;
}

.tab-text {
	font-size: 14px;
	font-weight: 500;
}

.tab-count {
	font-size: 13px;
	color: #999;
}

.tab-item.active .tab-count {
	color: #667eea;
}

.tab-indicator {
	position: absolute;
	bottom: 0;
	width: 32px;
	height: 3px;
	background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
	border-radius: 2px;
	animation: slideIn 0.3s ease;
}

@keyframes slideIn {
	from {
		width: 0;
		opacity: 0;
	}
	to {
		width: 32px;
		opacity: 1;
	}
}

/* ==================== 内容列表 ==================== */
.content-container {
	padding: 12px 8px;
}

.works-grid {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 4px;
}

.work-item {
	position: relative;
	aspect-ratio: 3/4;
	background: #f0f0f0;
	border-radius: 4px;
	overflow: hidden;
}

.work-cover {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.work-overlay {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 8px;
	background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
}

.work-stats {
	display: flex;
	align-items: center;
	gap: 4px;
}

.stat-icon {
	font-size: 12px;
}

.stat-value {
	font-size: 11px;
	color: #fff;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.work-type-badge {
	position: absolute;
	top: 6px;
	right: 6px;
	width: 24px;
	height: 24px;
	background: rgba(0, 0, 0, 0.5);
	backdrop-filter: blur(10px);
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
}

/* 空状态 */
.empty-state {
	grid-column: 1 / -1;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 80px 0;
}

.empty-icon {
	font-size: 60px;
	margin-bottom: 12px;
}

.empty-text {
	font-size: 14px;
	color: #666;
	margin-bottom: 6px;
}

.empty-hint {
	font-size: 12px;
	color: #999;
}

/* 加载更多 */
.loading-more {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 20px 0;
}

.loading-spinner {
	width: 20px;
	height: 20px;
	border: 2px solid #f3f3f3;
	border-top-color: #667eea;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

.loading-text {
	font-size: 13px;
	color: #999;
}

/* ==================== 设置菜单 ==================== */
.setting-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 999;
	display: flex;
	align-items: flex-end;
	animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
	from { opacity: 0; }
	to { opacity: 1; }
}

.setting-menu {
	width: 100%;
	background: #fff;
	border-radius: 16px 16px 0 0;
	padding: 20px;
	animation: slideUp 0.3s ease;
}

@keyframes slideUp {
	from {
		transform: translateY(100%);
	}
	to {
		transform: translateY(0);
	}
}

.menu-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20px;
}

.menu-title {
	font-size: 18px;
	font-weight: bold;
	color: #333;
}

.menu-close {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24px;
	color: #999;
}

.menu-list {
	margin-bottom: 20px;
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 16px 0;
	border-bottom: 1px solid #f0f0f0;
}

.menu-icon {
	font-size: 20px;
	margin-right: 12px;
}

.menu-text {
	flex: 1;
	font-size: 15px;
	color: #333;
}

.menu-arrow {
	font-size: 20px;
	color: #ccc;
}

.logout-btn {
	width: 100%;
	height: 48px;
	background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
	border-radius: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
}

.logout-text {
	font-size: 16px;
	font-weight: 500;
	color: #fff;
}
</style>