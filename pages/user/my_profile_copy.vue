<template>
	<view class="user-profile-container">
		<!-- 下滑后出现的用户信息栏：返回 + 头像 + 用户名；原始作品/点赞栏滚动到这里后与它合并 -->
		<view
			v-if="stickyHeaderVisible"
			class="compact-sticky-header"
			:style="compactStickyHeaderStyle"
		>
			<view class="compact-profile-row" :style="compactProfileRowStyle">
				<view class="compact-back-btn" @click="goBack">
					<text class="compact-back-icon">‹</text>
				</view>
				<image class="compact-avatar" :src="avatar || defaultAvatar" mode="aspectFill"></image>
				<text class="compact-username">{{ username || '我的' }}</text>
			</view>
		</view>

		<!-- 顶部区域：占屏幕五分之二，包含刘海 / 状态栏 -->
		<view class="profile-header" :style="profileHeaderStyle">
			<view class="back-btn" :style="topActionBtnStyle" @click="goBack">
				<text class="back-icon">‹</text>
			</view>

			<view class="profile-header-content" :style="profileHeaderContentStyle">
				<view class="avatar-section">
					<image class="avatar" :style="avatarStyle" :src="avatar || defaultAvatar" mode="aspectFill"></image>
				</view>

				<view class="user-info">
					<text class="username">{{ username }}</text>
				</view>

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
		</view>

		<!-- 原始 Tab：滚动到顶部时粘在用户信息栏下方，与信息栏合并成共同顶栏 -->
		<view class="tab-bar" :style="tabBarStyle">
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
				<text class="tab-icon">❤️</text>
				<text class="tab-text">点赞</text>
				<view class="tab-indicator" v-if="activeTab === 'likes'"></view>
			</view>
		</view>

		<view class="content-container" :style="contentContainerStyle">
			<view v-if="activeTab === 'works'">
				<view class="creation-grid">
					<view
						class="creation-card"
						:style="creationCardStyle"
						v-for="(work, index) in worksList"
						:key="work.creation_id || index"
						@click="goToWorkDetail(work)"
					>
						<view class="image-wrapper" :style="imageWrapperStyle">
							<image
								class="card-image"
								:style="cardImageStyle"
								:src="work.cover"
								mode="aspectFill"
								@error="onCoverError(work)"
							/>
							<view class="image-gradient"></view>
						</view>

						<view class="card-content" :style="cardContentStyle">
							<view class="card-title-container">
								<text class="card-title">{{ work.title }}</text>
							</view>
							<view class="card-footer">
								<view class="card-author">
									<image class="author-avatar" :src="work.avatar || defaultAvatar" mode="aspectFill" />
									<text class="author-name">{{ work.username }}</text>
								</view>
								<view class="card-likes" @click.stop="toggleDigg('works', index)">
									<text class="like-icon" :class="{ active: work.is_digg }">{{ work.is_digg ? '♥️' : '♡' }}</text>
									<text class="like-count">{{ formatNumber(work.digg_count) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<view v-if="worksList.length === 0 && !loading" class="empty-state">
					<text class="empty-icon">🎨</text>
					<text class="empty-text">还没有发布作品</text>
					<text class="empty-hint">快去创作第一个作品吧！</text>
				</view>
			</view>

			<view v-if="activeTab === 'likes'">
				<view class="creation-grid">
					<view
						class="creation-card"
						:style="creationCardStyle"
						v-for="(item, index) in likesList"
						:key="item.creation_id || index"
						@click="goToWorkDetail(item)"
					>
						<view class="image-wrapper" :style="imageWrapperStyle">
							<image
								class="card-image"
								:style="cardImageStyle"
								:src="item.cover"
								mode="aspectFill"
								@error="onCoverError(item)"
							/>
							<view class="image-gradient"></view>
						</view>

						<view class="card-content" :style="cardContentStyle">
							<view class="card-title-container">
								<text class="card-title">{{ item.title }}</text>
							</view>
							<view class="card-footer">
								<view class="card-author">
									<image class="author-avatar" :src="item.avatar || defaultAvatar" mode="aspectFill" />
									<text class="author-name">{{ item.username }}</text>
								</view>
								<view class="card-likes" @click.stop="toggleDigg('likes', index)">
									<text class="like-icon" :class="{ active: item.is_digg }">{{ item.is_digg ? '❤️' : '🤍' }}</text>
									<text class="like-count">{{ formatNumber(item.digg_count) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<view v-if="likesList.length === 0 && !loading" class="empty-state">
					<text class="empty-icon">💔</text>
					<text class="empty-text">还没有点赞内容</text>
					<text class="empty-hint">去发现更多精彩作品吧！</text>
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
import DB from '@/utils/sqlite.js'
import { getCreationsByUser, getCreationsByDigg } from '@/request/creation.js'
import { digg, cancelDigg } from '@/request/action.js'
import { getUserProfile } from '@/request/user.js'

const TAB_BAR_HEIGHT = 48
const COMPACT_PROFILE_HEIGHT = 40
const GRID_GAP = 6
const CONTENT_PADDING_TOP = 8
const CONTENT_PADDING_X = 8
const CONTENT_PADDING_BOTTOM = 10
const MIN_HEADER_HEIGHT = 240
const MIN_CARD_HEIGHT = 118
const MIN_CARD_CONTENT_HEIGHT = 36
const MAX_CARD_CONTENT_HEIGHT = 44
const MIN_IMAGE_HEIGHT = 76

export default {
	data() {
		return {
			userId: null,
			username: '',
			avatar: '',
			friendCount: 0,
			followingCount: 0,
			followerCount: 0,
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
			defaultAvatar: '/static/user_avatar.png',

			windowHeight: 667,
			statusBarHeight: 0,
			profileHeaderHeight: 267,
			profileHeaderContentHeight: 267,
			avatarSize: 86,
			creationCardHeight: 160,
			imageHeight: 118,
			cardContentHeight: 42,
			stickyHeaderVisible: false,
			stickyHeaderProgress: 0
		}
	},

	computed: {
		profileHeaderStyle() {
			return 'height:' + this.profileHeaderHeight + 'px;'
		},
		profileHeaderContentStyle() {
			return 'height:' + this.profileHeaderContentHeight + 'px;padding-top:' + this.statusBarHeight + 'px;'
		},
		topActionBtnStyle() {
			return 'top:' + (this.statusBarHeight + 10) + 'px;'
		},
		avatarStyle() {
			return 'width:' + this.avatarSize + 'px;height:' + this.avatarSize + 'px;border-radius:' + Math.floor(this.avatarSize / 2) + 'px;'
		},
		compactStickyHeaderStyle() {
			const totalHeight = this.statusBarHeight + COMPACT_PROFILE_HEIGHT
			const bgAlpha = Math.max(0, Math.min(0.96, this.stickyHeaderProgress * 0.96))
			const shadowAlpha = Math.max(0, Math.min(0.10, this.stickyHeaderProgress * 0.10))
			return (
				'height:' + totalHeight + 'px;' +
				'background:rgba(255,255,255,' + bgAlpha + ');' +
				'box-shadow:0 2px 12px rgba(0,0,0,' + shadowAlpha + ');'
			)
		},
		compactProfileRowStyle() {
			const totalHeight = this.statusBarHeight + COMPACT_PROFILE_HEIGHT
			return 'height:' + totalHeight + 'px;padding-top:' + this.statusBarHeight + 'px;'
		},
		tabBarStyle() {
			const stickyTop = this.statusBarHeight + COMPACT_PROFILE_HEIGHT
			const shadowAlpha = Math.max(0, Math.min(0.08, this.stickyHeaderProgress * 0.08))
			return (
				'height:' + TAB_BAR_HEIGHT + 'px;' +
				'top:' + stickyTop + 'px;' +
				'box-shadow:0 2px 10px rgba(0,0,0,' + shadowAlpha + ');'
			)
		},
		contentContainerStyle() {
			return 'padding:' + CONTENT_PADDING_TOP + 'px ' + CONTENT_PADDING_X + 'px ' + CONTENT_PADDING_BOTTOM + 'px;'
		},
		creationCardStyle() {
			return 'height:' + this.creationCardHeight + 'px;'
		},
		imageWrapperStyle() {
			return 'height:' + this.imageHeight + 'px;'
		},
		cardContentStyle() {
			return 'height:' + this.cardContentHeight + 'px;'
		},
		cardImageStyle() {
			return 'width:100%;height:' + this.imageHeight + 'px;'
		}
	},

	onLoad() {
		this.initResponsiveLayout()
		this.userId = getApp().globalData.userId
		this.loadUserProfile()
		this.loadUserWorks(true)
	},

	onShow() {
		this.initResponsiveLayout()
	},

	onPageScroll(e) {
		const scrollTop = Number(e && e.scrollTop ? e.scrollTop : 0)
		const infoBarHeight = this.statusBarHeight + COMPACT_PROFILE_HEIGHT
		const start = Math.max(0, this.profileHeaderHeight - infoBarHeight - 160)
		const end = Math.max(start + 1, this.profileHeaderHeight - infoBarHeight)
		const progress = Math.max(0, Math.min(1, (scrollTop - start) / (end - start)))
		this.stickyHeaderProgress = progress
		this.stickyHeaderVisible = progress > 0.01
	},

	onReachBottom() {
		if (this.activeTab === 'works') this.loadUserWorks(false)
		else if (this.activeTab === 'likes') this.loadUserLikes(false)
	},

	onPullDownRefresh() {
		const tasks = [this.loadUserProfile()]
		if (this.activeTab === 'works') tasks.push(this.loadUserWorks(true))
		else if (this.activeTab === 'likes') tasks.push(this.loadUserLikes(true))
		Promise.all(tasks).finally(() => uni.stopPullDownRefresh())
	},

	methods: {
		initResponsiveLayout() {
			try {
				const sys = uni.getSystemInfoSync()
				const windowHeight = Number(sys.windowHeight || 667)
				const statusBarHeight = Number(sys.statusBarHeight || 0)
				this.windowHeight = windowHeight
				this.statusBarHeight = statusBarHeight
				this.profileHeaderHeight = Math.max(MIN_HEADER_HEIGHT, Math.floor(windowHeight * 2 / 5))
				this.profileHeaderContentHeight = this.profileHeaderHeight
				const headerUsableHeight = Math.max(180, this.profileHeaderHeight - statusBarHeight)
				this.avatarSize = Math.max(68, Math.min(92, Math.floor(headerUsableHeight * 0.28)))
				const availableGridHeight = windowHeight - CONTENT_PADDING_TOP - CONTENT_PADDING_BOTTOM
				const nextCardHeight = Math.floor((availableGridHeight - GRID_GAP * 3) / 4)
				this.creationCardHeight = Math.max(MIN_CARD_HEIGHT, nextCardHeight)
				const nextContentHeight = Math.floor(this.creationCardHeight / 3.8)
				this.cardContentHeight = Math.max(MIN_CARD_CONTENT_HEIGHT, Math.min(MAX_CARD_CONTENT_HEIGHT, nextContentHeight))
				this.imageHeight = Math.max(MIN_IMAGE_HEIGHT, this.creationCardHeight - this.cardContentHeight)
			} catch (err) {
				this.windowHeight = 667
				this.statusBarHeight = 0
				this.profileHeaderHeight = 267
				this.profileHeaderContentHeight = 267
				this.avatarSize = 86
				this.creationCardHeight = 160
				this.cardContentHeight = 42
				this.imageHeight = 118
			}
		},
		goBack() {
			uni.navigateBack()
		},
		async loadUserProfile() {
			const uid = this.userId || getApp().globalData.userId
			try {
				const res = await getUserProfile(uid, true, true)
				if (res) {
					this.username = res.user_info && res.user_info.username ? res.user_info.username : ''
					this.avatar = res.user_info && res.user_info.avatar ? res.user_info.avatar : this.defaultAvatar
					this.followingCount = res.following_count || 0
					this.followerCount = res.follower_count || 0
					this.friendCount = res.friend_count || 0
					return
				}
			} catch (e) {
				console.error('加载用户资料失败：', e)
			}
			try {
				const rows = await DB.getUsersByIds([uid])
				const user = rows && rows.length ? rows[0] : null
				if (user) {
					this.username = user.username || getApp().globalData.username || ''
					this.avatar = user.local_avatar_uri || user.avatar_uri || this.defaultAvatar
					return
				}
			} catch (e) {
				console.error('读取本地用户资料失败：', e)
			}
			this.username = getApp().globalData.username || ''
			this.avatar = getApp().globalData.avatar || this.defaultAvatar
		},
		async loadUserWorks(reset = false) {
			if (this.loading) return
			if (!reset && !this.worksHasMore) return
			this.loading = true
			try {
				const pageToLoad = reset ? 1 : this.worksPage + 1
				const res = await getCreationsByUser(this.userId, pageToLoad)
				const list = Array.isArray(res) ? res : (res && Array.isArray(res.creations) ? res.creations : [])
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
					username: item.username || this.username || '未知作者',
					avatar: item.avatar || this.avatar || this.defaultAvatar,
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
				this.worksHasMore = list.length >= 20
			} catch (e) {
				console.error('加载作品列表失败：', e)
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
				const res = await getCreationsByDigg(this.userId, pageToLoad)
				const list = Array.isArray(res) ? res : (res && Array.isArray(res.creations) ? res.creations : [])
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
				this.likesHasMore = list.length >= 20
				this.likesLoaded = true
			} catch (e) {
				console.error('加载点赞列表失败：', e)
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
			} catch (e) {
				console.error('点赞操作失败：', e)
			} finally {
				item._digging = false
			}
		},
		goToFriendList() {
			uni.navigateTo({ url: `/pages/user/friend_list?userId=${this.userId}` })
		},
		goToFollowingList() {
			uni.navigateTo({ url: `/pages/user/following_list?userId=${this.userId}` })
		},
		goToFollowerList() {
			uni.navigateTo({ url: `/pages/user/follower_list?userId=${this.userId}` })
		},
		goToWorkDetail(work) {
			if (!work || !work.creation_id) return
			const creationId = encodeURIComponent(work.creation_id)
			const userId = encodeURIComponent(work.user_id || this.userId || '')
			const isVideo = Number(work.material_type) === 2
			const basePath = isVideo ? '/pages/creation/creation_video' : '/pages/creation/creation_image'
			uni.navigateTo({ url: `${basePath}?creationId=${creationId}&userId=${userId}` })
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
.user-profile-container {
	min-height: 100vh;
	background: #f8f9fa;
}

.compact-sticky-header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	box-sizing: border-box;
	pointer-events: auto;
	backdrop-filter: blur(12px);
}

.compact-profile-row {
	display: flex;
	align-items: center;
	padding-left: 10px;
	padding-right: 14px;
	box-sizing: border-box;
}

.compact-back-btn {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-right: 4px;
}

.compact-back-icon {
	font-size: 30px;
	line-height: 30px;
	color: #333;
	font-weight: 300;
}

.compact-avatar {
	width: 26px;
	height: 26px;
	border-radius: 13px;
	border: 1px solid rgba(0, 0, 0, 0.08);
	margin-right: 8px;
	background: rgba(0, 0, 0, 0.04);
	flex-shrink: 0;
}

.compact-username {
	font-size: 14px;
	font-weight: 600;
	color: #333;
	max-width: 220px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.profile-header {
	position: relative;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	overflow: hidden;
	box-sizing: border-box;
}

.profile-header-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	padding-left: 16px;
	padding-right: 16px;
}

.back-btn {
	position: absolute;
	left: 16px;
	width: 34px;
	height: 34px;
	background: rgba(255, 255, 255, 0.24);
	backdrop-filter: blur(10px);
	border-radius: 17px;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
}

.back-icon {
	font-size: 30px;
	line-height: 30px;
	color: #fff;
	font-weight: 300;
}

.avatar-section {
	display: flex;
	justify-content: center;
	margin-bottom: 12px;
}

.avatar {
	border: 4px solid rgba(255, 255, 255, 0.3);
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	box-sizing: border-box;
}

.user-info {
	text-align: center;
	margin-bottom: 16px;
}

.username {
	display: block;
	font-size: 21px;
	font-weight: bold;
	color: #fff;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stats-section {
	display: flex;
	align-items: center;
	justify-content: space-around;
	width: 100%;
	padding: 0 20px;
	box-sizing: border-box;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 1;
}

.stat-number {
	font-size: 19px;
	font-weight: bold;
	color: #fff;
	margin-bottom: 4px;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-label {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.85);
}

.tab-bar {
	display: flex;
	align-items: center;
	background: #fff;
	border-bottom: 1px solid #f0f0f0;
	position: sticky;
	top: 0;
	z-index: 90;
	box-sizing: border-box;
}

.tab-item {
	flex: 1;
	height: 48px;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	transition: all 0.3s;
}

.tab-item.active {
	color: #667eea;
}

.tab-icon {
	font-size: 17px;
}

.tab-text {
	font-size: 14px;
	font-weight: 500;
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
	from { width: 0; opacity: 0; }
	to { width: 32px; opacity: 1; }
}

.content-container {
	box-sizing: border-box;
}

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
	overflow: hidden;
	background: #f3f3f3;
}

.card-image {
	width: 100%;
	height: 100%;
	display: block;
	vertical-align: top;
	object-fit: cover;
	object-position: center center;
}

.image-gradient {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 26px;
	background: linear-gradient(to top, rgba(0, 0, 0, 0.18), transparent);
}

.card-content {
	padding: 4px 5px;
	box-sizing: border-box;
	overflow: hidden;
}

.card-title-container {
	height: 15px;
	margin-bottom: 2px;
}

.card-title {
	font-size: 10px;
	font-weight: 500;
	color: #333;
	line-height: 15px;
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 15px;
}

.card-author {
	display: flex;
	align-items: center;
	gap: 3px;
	flex: 1;
	min-width: 0;
}

.author-avatar {
	width: 14px;
	height: 14px;
	border-radius: 50%;
	border: 1px solid #f0f0f0;
	object-fit: cover;
	flex-shrink: 0;
}

.author-name {
	font-size: 9px;
	color: #555;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-likes {
	display: flex;
	align-items: center;
	gap: 2px;
	flex-shrink: 0;
	padding-left: 3px;
}

.like-icon {
	font-size: 10px;
	transition: transform 0.15s ease;
}

.like-icon.active {
	transform: scale(1.1);
}

.like-count {
	font-size: 9px;
	color: #999;
}

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
