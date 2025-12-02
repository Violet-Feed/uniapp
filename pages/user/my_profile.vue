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
			
			<!-- 用户名 -->
			<view class="user-info">
				<text class="username">{{ username }}</text>
				<!-- 删除抖音号显示 -->
				<!-- <text class="user-id">抖音号：{{ userId }}</text> -->
			</view>
			
			<!-- 统计数据（去掉获赞） -->
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
			<!-- 作品列表：3列，和搜索页卡片布局类似 -->
			<view v-if="activeTab === 'works'">
				<view class="creation-grid">
					<view 
						class="creation-card" 
						v-for="(work, index) in worksList" 
						:key="work.creation_id || index"
						@click="goToWorkDetail(work)"
						@longpress="showWorkOptions(work)"
					>
						<view class="image-wrapper">
							<image 
								class="card-image" 
								:src="work.cover" 
								mode="aspectFill"
								@error="onCoverError(work)"
							/>
							<view class="image-gradient"></view>
						</view>

						<view class="card-content">
							<view class="card-title-container">
								<text class="card-title">{{ work.title }}</text>
							</view>
							<view class="card-footer">
								<view class="card-author">
									<image 
										class="author-avatar" 
										:src="work.avatar || defaultAvatar" 
										mode="aspectFill"
									/>
									<text class="author-name">{{ work.username }}</text>
								</view>
								<view 
									class="card-likes"
									@click.stop="toggleDigg('works', index)"
								>
									<text 
										class="like-icon"
										:class="{ active: work.is_digg }"
									>
										{{ work.is_digg ? '♥️' : '♡' }}
									</text>
									<text class="like-count">{{ formatNumber(work.digg_count) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<!-- 空状态 -->
				<view v-if="worksList.length === 0 && !loading" class="empty-state">
					<text class="empty-icon">🎨</text>
					<text class="empty-text">还没有发布作品</text>
					<text class="empty-hint">快去创作第一个作品吧！</text>
				</view>
			</view>
			
			<!-- 点赞列表：3列，同样布局，不展示时间 -->
			<view v-if="activeTab === 'likes'">
				<view class="creation-grid">
					<view 
						class="creation-card" 
						v-for="(item, index) in likesList" 
						:key="item.creation_id || index"
						@click="goToWorkDetail(item)"
					>
						<view class="image-wrapper">
							<image 
								class="card-image" 
								:src="item.cover" 
								mode="aspectFill"
								@error="onCoverError(item)"
							/>
							<view class="image-gradient"></view>
						</view>

						<view class="card-content">
							<view class="card-title-container">
								<text class="card-title">{{ item.title }}</text>
							</view>
							<view class="card-footer">
								<view class="card-author">
									<image 
										class="author-avatar" 
										:src="item.avatar || defaultAvatar" 
										mode="aspectFill"
									/>
									<text class="author-name">{{ item.username }}</text>
								</view>
								<view 
									class="card-likes"
									@click.stop="toggleDigg('likes', index)"
								>
									<text 
										class="like-icon"
										:class="{ active: item.is_digg }"
									>
										{{ item.is_digg ? '❤️' : '🤍' }}
									</text>
									<text class="like-count">{{ formatNumber(item.digg_count) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<!-- 空状态 -->
				<view v-if="likesList.length === 0 && !loading" class="empty-state">
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
import { getCreationsByUser, getCreationsByDigg } from '@/request/creation.js';
import { digg, cancelDigg } from '@/request/action.js';
import JSONbig from 'json-bigint';

export default {
	data() {
		return {
			userId: null,
			username: '',
			avatar: '',
			friendCount: 0,
			followingCount: 0,
			followerCount: 0,
			totalLikes: 0, // 现在不展示，但保留字段以防别处用
			activeTab: 'works',

			// 作品 & 点赞列表
			worksList: [],
			likesList: [],

			// 加载状态 & 分页
			loading: false,
			worksPage: 1,
			worksHasMore: true,
			likesPage: 1,
			likesHasMore: true,
			likesLoaded: false, // 是否已经加载过点赞列表

			defaultImage: '/static/images/default.png',
			defaultAvatar: '/static/user_avatar.png',

			showSetting: false
		};
	},
	onLoad() {
		this.userId = getApp().globalData.userId;
		this.username = getApp().globalData.username;
		this.avatar = getApp().globalData.avatar;
		// 初始化加载作品列表第一页
		this.loadUserWorks(true);
	},
	onShow() {
		this.friendCount = getApp().globalData.friendCount || 0;
		this.followingCount = getApp().globalData.followingCount || 0;
		this.followerCount = getApp().globalData.followerCount || 0;
		this.totalLikes = getApp().globalData.totalLikes || 0;
	},
	// 上拉到底部加载更多
	onReachBottom() {
		if (this.activeTab === 'works') {
			this.loadUserWorks(false);
		} else if (this.activeTab === 'likes') {
			this.loadUserLikes(false);
		}
	},
	// ✅ 下拉刷新
	onPullDownRefresh() {
		// 统一做一个“刷新当前页”的逻辑
		const tasks = [];

		// 作品列表一定刷新
		tasks.push(this.loadUserWorks(true));

		// 如果当前在点赞 tab，并且之前加载过，就一起刷新
		if (this.activeTab === 'likes' && this.likesLoaded) {
			tasks.push(this.loadUserLikes(true));
		}

		Promise.all(tasks)
			.catch(err => {
				console.error('下拉刷新失败：', err);
				uni.showToast({ title: '刷新失败', icon: 'none' });
			})
			.finally(() => {
				uni.stopPullDownRefresh();
			});
	},
	methods: {
		/* ====== 加载作品列表 ====== */
		async loadUserWorks(reset = false) {
			if (this.loading) return;
			if (!reset && !this.worksHasMore) return;

			this.loading = true;

			try {
				const pageToLoad = reset ? 1 : this.worksPage + 1;
				const res = await getCreationsByUser(this.userId, pageToLoad);

				// 支持 { creations: [...] } 或直接数组
				const list = Array.isArray(res)
					? res
					: (res && Array.isArray(res.creations) ? res.creations : []);

				if (!list || list.length === 0) {
					if (reset) {
						this.worksList = [];
						this.worksPage = 1;
					}
					this.worksHasMore = false;
					return;
				}

				const mapped = list.map((item) => ({
					creation_id: item.creation_id,
					cover: item.cover_url || item.material_url || this.defaultImage,
					title: item.title || '未命名作品',
					user_id: item.user_id,
					username: item.username || this.username || '未知作者',
					avatar: item.avatar || this.avatar || this.defaultAvatar,
					digg_count: item.digg_count || 0,
					is_digg: !!item.is_digg,
					material_type: item.material_type,
					raw: item
				}));

				if (reset) {
					this.worksList = mapped;
					this.worksPage = 1;
				} else {
					this.worksList = this.worksList.concat(mapped);
					this.worksPage = pageToLoad;
				}

				// 简单分页：这一页数量小于预期就认为没更多
				const pageSize = 20;
				this.worksHasMore = list.length >= pageSize;
			} catch (e) {
				console.error('加载作品列表失败：', e);
				uni.showToast({
					title: '加载作品失败',
					icon: 'none'
				});
			} finally {
				this.loading = false;
			}
		},

		/* ====== 加载点赞列表 ====== */
		async loadUserLikes(reset = false) {
			if (this.loading) return;
			if (!reset && !this.likesHasMore) return;

			this.loading = true;

			try {
				const pageToLoad = reset ? 1 : this.likesPage + 1;
				// 点赞列表接口：getCreationsByDigg(userId, page)
				const res = await getCreationsByDigg(this.userId, pageToLoad);

				const list = Array.isArray(res)
					? res
					: (res && Array.isArray(res.creations) ? res.creations : []);

				if (!list || list.length === 0) {
					if (reset) {
						this.likesList = [];
						this.likesPage = 1;
					}
					this.likesHasMore = false;
					this.likesLoaded = true;
					return;
				}

				const mapped = list.map((item) => ({
					creation_id: item.creation_id,
					cover: item.cover_url || item.material_url || this.defaultImage,
					title: item.title || '未命名作品',
					user_id: item.user_id,
					username: item.username || '未知作者',
					avatar: item.avatar || this.defaultAvatar,
					digg_count: item.digg_count || 0,
					is_digg: !!item.is_digg,
					material_type: item.material_type,
					raw: item
				}));

				if (reset) {
					this.likesList = mapped;
					this.likesPage = 1;
				} else {
					this.likesList = this.likesList.concat(mapped);
					this.likesPage = pageToLoad;
				}

				const pageSize = 20;
				this.likesHasMore = list.length >= pageSize;
				this.likesLoaded = true;
			} catch (e) {
				console.error('加载点赞列表失败：', e);
				uni.showToast({
					title: '加载点赞失败',
					icon: 'none'
				});
			} finally {
				this.loading = false;
			}
		},

		switchTab(tab) {
			if (this.activeTab === tab) return;
			this.activeTab = tab;

			// 点赞 tab 第一次点击时再请求
			if (tab === 'likes' && !this.likesLoaded) {
				this.loadUserLikes(true);
			}
		},

		onCoverError(item) {
			if (item) item.cover = this.defaultImage;
		},

		/* ====== 点赞 / 取消点赞 ====== */
		async toggleDigg(listType, index) {
			const list = listType === 'works' ? this.worksList : this.likesList;
			const item = list[index];
			if (!item || item._digging) return;

			item._digging = true;

			try {
				if (item.is_digg) {
					// 注意：这里你的 digg/cancelDigg 后端签名是啥？
					// 前面其他页面是 cancelDigg('creation', id)，如果这里也要统一，就改成那种
					await cancelDigg(item.creation_id);
					item.is_digg = false;
					if (item.digg_count > 0) item.digg_count -= 1;
				} else {
					await digg(item.creation_id);
					item.is_digg = true;
					item.digg_count += 1;
				}
			} catch (e) {
				console.error('点赞操作失败：', e);
			} finally {
				item._digging = false;
			}
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
			if (!work || !work.creation_id) return;

			// creationId / userId 都做一下 encode，保险一点
			const creationId = encodeURIComponent(work.creation_id);
			const userId = encodeURIComponent(work.user_id || this.userId || '');

			// material_type：1 = 图片，2 = 视频（和你后端 Creation 里保持一致）
			const isVideo = Number(work.material_type) === 2;

			const basePath = isVideo
				? '/pages/creation/creation_video_native'
				: '/pages/creation/creation_image';

			uni.navigateTo({
				url: `${basePath}?creationId=${creationId}&userId=${userId}`
			});
		},
		
		showWorkOptions(work) {
			uni.showActionSheet({
				itemList: ['编辑', '删除', '分享'],
				success: (res) => {
					if (res.tapIndex === 0) {
						console.log('编辑作品', work.creation_id);
					} else if (res.tapIndex === 1) {
						uni.showModal({
							title: '提示',
							content: '确定要删除这个作品吗？',
							success: (res2) => {
								if (res2.confirm) {
									console.log('删除作品', work.creation_id);
								}
							}
						});
					} else if (res.tapIndex === 2) {
						console.log('分享作品', work.creation_id);
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
			if (!num && num !== 0) return '0';
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

/* 统计数据（互关 / 关注 / 粉丝） */
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

/* 3列宫格，卡片布局参照搜索页 */
.creation-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 6px;
}

.creation-card {
	background: #fff;
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.creation-card:active {
	transform: translateY(-1px);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.image-wrapper {
	position: relative;
	width: 100%;
	/* 保证长宽比一致 */
	aspect-ratio: 3 / 4;
	overflow: hidden;
}

.card-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.image-gradient {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 40px;
	background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
}

.card-content {
	padding: 6px;
}

.card-title-container {
	margin-bottom: 4px;
}

.card-title {
	font-size: 12px;
	font-weight: 500;
	color: #333;
	line-height: 1.3;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

/* 作者信息 */
.card-author {
	display: flex;
	align-items: center;
	gap: 4px;
	flex: 1;
	min-width: 0;
}

.author-avatar {
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 1px solid #f0f0f0;
	object-fit: cover;
	flex-shrink: 0;
}

.author-name {
	font-size: 10px;
	color: #555;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* 点赞区域 */
.card-likes {
	display: flex;
	align-items: center;
	gap: 2px;
	flex-shrink: 0;
}

.like-icon {
	font-size: 14px;
	transition: transform 0.15s ease;
}

.like-icon.active {
	transform: scale(1.1);
}

.like-count {
	font-size: 10px;
	color: #999;
}

/* 空状态 */
.empty-state {
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
	text-align: center;
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
