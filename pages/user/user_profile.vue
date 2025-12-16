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

			<!-- 用户名 -->
			<view class="user-info">
				<text class="username">{{ username }}</text>
			</view>

			<!-- 统计数据：关注 / 粉丝 -->
			<view class="stats-section">
				<view class="stat-item" @click="goToFollowingList">
					<text class="stat-number">{{ formatNumber(followingCount) }}</text>
					<text class="stat-label">关注</text>
				</view>
				<view class="stat-item" @click="goToFollowerList">
					<text class="stat-number">{{ formatNumber(followerCount) }}</text>
					<text class="stat-label">粉丝</text>
				</view>
			</view>

			<!-- 操作按钮：关注 / 私信 -->
			<view class="action-buttons">
				<view
				  class="follow-btn"
				  :class="{ following: isFollowing }"
				  @click="toggleFollow"
				>
				  <text class="btn-icon">{{ followBtnIcon }}</text>
				  <text class="btn-text">{{ followBtnText }}</text>
				</view>
				<view class="message-btn" @click="goToChat">
					<text class="btn-icon">💬</text>
					<text class="btn-text">私信</text>
				</view>
			</view>
		</view>

		<!-- Tab切换栏（移除数量展示） -->
		<view class="tab-bar">
			<view
				class="tab-item"
				:class="{ active: activeTab === 'works' }"
				@click="switchTab('works')"
			>
				<text class="tab-icon">🎬</text>
				<text class="tab-text">作品</text>
				<view class="tab-indicator" v-if="activeTab === 'works'"></view>
			</view>
			<view
				class="tab-item"
				:class="{ active: activeTab === 'likes' }"
				@click="switchTab('likes')"
			>
				<text class="tab-icon">♥️</text>
				<text class="tab-text">点赞</text>
				<view class="tab-indicator" v-if="activeTab === 'likes'"></view>
			</view>
		</view>

		<!-- 内容列表 -->
		<view class="content-container">
			<!-- 作品列表 -->
			<view v-if="activeTab === 'works'">
				<view class="creation-grid">
					<view
						class="creation-card"
						v-for="(item, index) in worksList"
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
								<view class="card-likes" @click.stop="toggleDigg('works', index)">
									<text class="like-icon" :class="{ active: item.is_digg }">
										{{ item.is_digg ? '♥️' : '♡' }}
									</text>
									<text class="like-count">{{ formatNumber(item.digg_count) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<view v-if="worksList.length === 0 && !loading" class="empty-state">
					<text class="empty-icon">📦</text>
					<text class="empty-text">还没有发布作品</text>
				</view>
			</view>

			<!-- 点赞列表 -->
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
								<view class="card-likes" @click.stop="toggleDigg('likes', index)">
									<text class="like-icon" :class="{ active: item.is_digg }">
										{{ item.is_digg ? '♥️' : '♡' }}
									</text>
									<text class="like-count">{{ formatNumber(item.digg_count) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<view v-if="likesList.length === 0 && !loading" class="empty-state">
					<text class="empty-icon">💔</text>
					<text class="empty-text">还没有点赞内容</text>
				</view>
			</view>

			<view v-if="loading" class="loading-more">
				<view class="loading-spinner"></view>
				<text class="loading-text">加载中...</text>
			</view>
		</view>
	</view>
</template>

<script>
import JSONbig from 'json-bigint'
import { getUserProfile } from '@/request/user'
import { getCreationsByUser, getCreationsByDigg } from '@/request/creation'
import { follow, unfollow, digg, cancelDigg } from '@/request/action'

export default {
	data() {
		return {
			userId: null,
			username: '',
			avatar: '',
			followerCount: 0,
			followingCount: 0,

			// 关系：我 -> TA / TA -> 我
			isFollowing: false,
			isFollower: false,

			activeTab: 'works',
			worksList: [],
			likesList: [],

			loading: false,

			worksPage: 1,
			worksHasMore: true,
			likesPage: 1,
			likesHasMore: true,
			likesLoaded: false,

			defaultImage: '/static/images/default.png',
			defaultAvatar: '/static/user_avatar.png'
		}
	},
	computed: {
	  followBtnText() {
	    if (this.isFollowing && this.isFollower) return '互相关注'
	    if (this.isFollowing && !this.isFollower) return '已关注'
	    if (!this.isFollowing && this.isFollower) return '回关'
	    return '关注'
	  },
	  followBtnIcon() {
	    // 互关/已关注用 ✓，关注/回关用 +
	    return this.isFollowing ? '✓' : '+'
	  }
	},
	onLoad(options) {
		// 兼容 int64：可能是 "123" 或 JSONbig 转出来的对象
		const uidStr = String(options.userId || '')
		if (!uidStr) return

		// 本人 -> 直接跳我的主页
		// const me = String(getApp().globalData.userId || '')
		// if (me && uidStr === me) {
		// 	uni.switchTab({ url: '/pages/user/my_profile' })
		// 	return
		// }

		this.userId = uidStr
		this.loadUserProfile()
		this.loadUserWorks(true)
	},
	onReachBottom() {
		if (this.activeTab === 'works') this.loadUserWorks(false)
		else if (this.activeTab === 'likes') this.loadUserLikes(false)
	},
	onPullDownRefresh() {
		const p1 = this.loadUserProfile()
		const p2 =
			this.activeTab === 'works' ? this.loadUserWorks(true) : this.loadUserLikes(true)

		Promise.all([p1, p2]).finally(() => {
			uni.stopPullDownRefresh()
		})
	},
	methods: {
		async loadUserProfile() {
			// 不要求 try/catch；失败会返回 undefined
			const res = await getUserProfile(this.userId, true, false)
			if (!res) return

			this.username = res.user_info?.username || ''
			this.avatar = res.user_info?.avatar || '/static/user_avatar.png'
			this.followingCount = res.following_count || 0
			this.followerCount = res.follower_count || 0

			// 以你最新返回为准
			this.isFollowing = !!res.is_following
			this.isFollower = !!res.is_follower
		},

		async loadUserWorks(reset = false) {
			if (this.loading) return
			if (!reset && !this.worksHasMore) return

			this.loading = true
			try {
				const pageToLoad = reset ? 1 : this.worksPage + 1
				const res = await getCreationsByUser(String(this.userId), pageToLoad)
				const list = Array.isArray(res)
					? res
					: res && Array.isArray(res.creations)
						? res.creations
						: []

				if (!list || list.length === 0) {
					if (reset) {
						this.worksList = []
						this.worksPage = 1
					}
					this.worksHasMore = false
					return
				}

				const mapped = list.map((item) => ({
					creation_id: item.creation_id,
					cover: item.cover_url || item.material_url || this.defaultImage,
					title: item.title || '未命名作品',
					user_id: item.user_id,
					username: this.username || item.username || '未知作者',
					avatar: this.avatar || item.avatar || this.defaultAvatar,
					digg_count: item.digg_count || 0,
					is_digg: !!item.is_digg,
					material_type: item.material_type,
					raw: item
				}))

				if (reset) {
					this.worksList = mapped
					this.worksPage = 1
				} else {
					this.worksList = this.worksList.concat(mapped)
					this.worksPage = pageToLoad
				}

				const pageSize = 20
				this.worksHasMore = list.length >= pageSize
			} catch (err) {
				console.error('加载用户作品失败:', err)
				uni.showToast({ title: '加载作品失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},

		async loadUserLikes(reset = false) {
			if (this.loading) return
			if (!reset && !this.likesHasMore) return

			this.loading = true
			try {
				const pageToLoad = reset ? 1 : this.likesPage + 1
				const res = await getCreationsByDigg(String(this.userId), pageToLoad)
				const list = Array.isArray(res)
					? res
					: res && Array.isArray(res.creations)
						? res.creations
						: []

				if (!list || list.length === 0) {
					if (reset) {
						this.likesList = []
						this.likesPage = 1
					}
					this.likesHasMore = false
					this.likesLoaded = true
					return
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
				}))

				if (reset) {
					this.likesList = mapped
					this.likesPage = 1
				} else {
					this.likesList = this.likesList.concat(mapped)
					this.likesPage = pageToLoad
				}

				const pageSize = 20
				this.likesHasMore = list.length >= pageSize
				this.likesLoaded = true
			} catch (err) {
				console.error('加载点赞作品失败:', err)
				uni.showToast({ title: '加载点赞失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},

		switchTab(tab) {
			if (this.activeTab === tab) return
			this.activeTab = tab
			if (tab === 'likes' && !this.likesLoaded) this.loadUserLikes(true)
		},

		goBack() {
			uni.navigateBack()
		},

		goToChat() {
			const myId = String(getApp().globalData.userId || '')
			const otherId = String(this.userId || '')
			if (!myId || !otherId) return

			// conId 规则沿用你原逻辑：较小:较大（注意：这里按字符串比较不安全，保持你原 BigInt 习惯）
			let conId
			try {
				const a = BigInt(myId)
				const b = BigInt(otherId)
				conId = a < b ? `${a}:${b}` : `${b}:${a}`
			} catch (e) {
				// 兜底：字符串
				conId = `${myId}:${otherId}`
			}

			uni.navigateTo({
				url: `/pages/im/conversation?conShortId=0&conId=${conId}&conType=1&name=${this.username}`
			})
		},

		goToFollowerList() {
			uni.navigateTo({ url: `/pages/user/follower_list?userId=${this.userId}` })
		},

		goToFollowingList() {
			uni.navigateTo({ url: `/pages/user/following_list?userId=${this.userId}` })
		},

		goToWorkDetail(work) {
			if (!work || !work.creation_id) return
			const creationId = encodeURIComponent(work.creation_id)
			const userId = encodeURIComponent(work.user_id || this.userId || '')
			const isVideo = Number(work.material_type) === 2
			const basePath = isVideo ? '/pages/creation/creation_video' : '/pages/creation/creation_image'
			uni.navigateTo({ url: `${basePath}?creationId=${creationId}&userId=${userId}` })
		},

		onCoverError(item) {
			if (item) item.cover = this.defaultImage
		},

		async toggleDigg(listType, index) {
			const list = listType === 'works' ? this.worksList : this.likesList
			const item = list[index]
			if (!item || item._digging) return

			item._digging = true
			try {
				if (item.is_digg) {
					await cancelDigg('creation', item.creation_id)
					item.is_digg = false
					if (item.digg_count > 0) item.digg_count -= 1
				} else {
					await digg('creation', item.creation_id)
					item.is_digg = true
					item.digg_count += 1
				}
			} catch (err) {
				console.error('点赞操作失败:', err)
			} finally {
				item._digging = false
			}
		},

		async toggleFollow() {
			const myId = getApp().globalData.userId
			if (!myId || !this.userId) return

			if (this.isFollowing) {
				const res = await unfollow(myId, this.userId)
				if (res) {
					this.isFollowing = false
					if (this.followerCount > 0) this.followerCount -= 1
					uni.showToast({ title: '已取消关注', icon: 'success' })
				}
				return
			}

			const res = await follow(myId, this.userId)
			if (res) {
				this.isFollowing = true
				this.followerCount += 1
				uni.showToast({ title: '关注成功', icon: 'success' })
			}
		},

		formatNumber(num) {
			if (!num && num !== 0) return '0'
			if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
			if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
			return num.toString()
		}
	}
}
</script>

<style scoped>
/* 仅两处需要改样式：tab-count 不再使用，可保留也可删除；其余保持不动 */
.user-profile-container { min-height: 100vh; background: #f8f9fa; }

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

.back-icon { font-size: 24px; color: #fff; }

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
.user-info { text-align: center; margin-bottom: 24px; }

.username {
	display: block;
	font-size: 22px;
	font-weight: bold;
	color: #fff;
	margin-bottom: 6px;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 统计数据（关注 / 粉丝） */
.stats-section {
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding: 0 40px;
	margin-bottom: 24px;
}

.stat-item { display: flex; flex-direction: column; align-items: center; flex: 1; }

.stat-number {
	font-size: 20px;
	font-weight: bold;
	color: #fff;
	margin-bottom: 4px;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-label { font-size: 12px; color: rgba(255, 255, 255, 0.85); }

/* 操作按钮 */
.action-buttons { display: flex; gap: 12px; padding: 0 20px; }

.follow-btn, .message-btn {
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

.btn-icon { font-size: 16px; }
.btn-text { font-size: 15px; }

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

.tab-item.active { color: #667eea; }
.tab-icon { font-size: 18px; }
.tab-text { font-size: 14px; font-weight: 500; }

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
	from { width: 0; opacity: 0; }
	to { width: 32px; opacity: 1; }
}

/* ==================== 内容列表 ==================== */
.content-container { padding: 12px 8px; }

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
	aspect-ratio: 3 / 4;
	overflow: hidden;
}

.card-image { width: 100%; height: 100%; object-fit: cover; }

.image-gradient {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 40px;
	background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
}

.card-content { padding: 6px; }
.card-title-container { margin-bottom: 4px; }

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

.card-footer { display: flex; align-items: center; justify-content: space-between; }

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

.card-likes { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.like-icon { font-size: 14px; transition: transform 0.15s ease; }
.like-icon.active { transform: scale(1.1); }
.like-count { font-size: 10px; color: #999; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 80px 0; }
.empty-icon { font-size: 60px; margin-bottom: 12px; }
.empty-text { font-size: 14px; color: #999; }

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

@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #999; }
</style>
