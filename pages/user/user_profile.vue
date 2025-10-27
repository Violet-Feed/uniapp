<template>
	<view class="user-profile-container">
		<!-- 顶部区域 - 渐变背景 -->
		<view class="profile-header">
			<!-- 返回按钮 -->
			<view class="back-btn" @click="goBack">
				<text class="back-icon">←</text>
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
			
			<!-- 操作按钮 -->
			<view class="action-buttons">
				<view 
					class="follow-btn" 
					:class="{ 'following': isFollowing }"
					@click="toggleFollow"
				>
					<text class="btn-icon">{{ isFollowing ? '✓' : '+' }}</text>
					<text class="btn-text">{{ isFollowing ? '已关注' : '关注' }}</text>
				</view>
				<view class="message-btn" @click="goToChat">
					<text class="btn-icon">💬</text>
					<text class="btn-text">私信</text>
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
					<text class="empty-icon">📦</text>
					<text class="empty-text">还没有发布作品</text>
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
				</view>
			</view>
			
			<!-- 加载更多 -->
			<view v-if="loading" class="loading-more">
				<view class="loading-spinner"></view>
				<text class="loading-text">加载中...</text>
			</view>
		</view>
	</view>
</template>

<script>
import JSONbig from 'json-bigint';
import { getUserProfile } from '@/request/user';

export default {
	data() {
		return {
			userId: null,
			username: '',
			avatar: '',
			followerCount: 0,
			followingCount: 0,
			totalLikes: 0,
			isFollowing: false,
			activeTab: 'works',
			worksList: [],
			likesList: [],
			loading: false
		};
	},
	onLoad(options) {
		this.userId = BigInt(options.userId);
		this.loadUserProfile();
		this.loadUserWorks();
	},
	methods: {
		async loadUserProfile() {
			try {
				const res = await getUserProfile(this.userId, true, false);
				this.username = res.user_info.username;
				this.avatar = res.user_info.avatar || '/static/user_avatar.png';
				this.followingCount = res.following_count;
				this.followerCount = res.follower_count;
				this.isFollowing = res.is_following;
				this.totalLikes = res.total_likes || 0;
			} catch (err) {
				console.error('加载用户信息失败:', err);
			}
		},
		
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
					}
				];
				
				this.likesList = [
					{
						id: 4,
						cover: 'https://picsum.photos/id/240/400/600',
						likes: 678,
						type: 'image'
					},
					{
						id: 5,
						cover: 'https://picsum.photos/id/241/400/600',
						likes: 1987,
						type: 'video'
					}
				];
				
				this.loading = false;
			}, 500);
		},
		
		switchTab(tab) {
			this.activeTab = tab;
		},
		
		goBack() {
			uni.navigateBack();
		},
		
		goToChat() {
			const userId = getApp().globalData.userId;
			let conId;
			if (userId < this.userId) {
				conId = `${userId}:${this.userId}`;
			} else {
				conId = `${this.userId}:${userId}`;
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
		
		goToWorkDetail(work) {
			uni.navigateTo({
				url: `/pages/creation/creation?id=${work.id}`
			});
		},
		
		async toggleFollow() {
			const token = getApp().globalData.token;
			const data = {
				from_user_id: getApp().globalData.userId,
				to_user_id: this.userId
			};
			const dataJson = JSONbig.stringify(data);
			
			try {
				if (this.isFollowing) {
					let res = await uni.request({
						url: 'http://127.0.0.1:3000/api/relation/unfollow',
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
							this.isFollowing = false;
							this.followerCount--;
							getApp().globalData.followingCount--;
							uni.showToast({ title: '已取消关注', icon: 'success' });
						}
					}
				} else {
					let res = await uni.request({
						url: 'http://127.0.0.1:3000/api/relation/follow',
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
							this.isFollowing = true;
							this.followerCount++;
							getApp().globalData.followingCount++;
							uni.showToast({ title: '关注成功', icon: 'success' });
						}
					}
				}
			} catch (err) {
				console.error('操作失败:', err);
				uni.showToast({ title: '操作失败', icon: 'none' });
			}
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

.back-btn {
	position: absolute;
	top: 12px;
	left: 16px;
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

.back-icon {
	font-size: 24px;
	color: #fff;
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
	padding: 0 40px;
	margin-bottom: 24px;
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

/* 操作按钮 */
.action-buttons {
	display: flex;
	gap: 12px;
	padding: 0 20px;
}

.follow-btn,
.message-btn {
	flex: 1;
	height: 44px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	border-radius: 22px;
	font-size: 15px;
	font-weight: 500;
	transition: all 0.3s;
}

.follow-btn {
	background: #fff;
	color: #667eea;
	box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
}

.follow-btn.following {
	background: rgba(255, 255, 255, 0.3);
	color: #fff;
	box-shadow: none;
}

.message-btn {
	background: rgba(255, 255, 255, 0.3);
	color: #fff;
	border: 1px solid rgba(255, 255, 255, 0.5);
}

.btn-icon {
	font-size: 16px;
}

.btn-text {
	font-size: 15px;
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
</style>