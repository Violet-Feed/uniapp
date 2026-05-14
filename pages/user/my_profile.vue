<template>
	<view class="user-profile-container">
		<page-meta page-style="overflow: hidden;" />

		<!-- 下拉时露出的顶部背景：沿用头部渐变，并延迟隐藏，避免回弹时闪白 -->
		<view
			v-if="refreshBackdropVisible"
			class="refresh-gradient-backdrop"
			:style="refreshGradientBackdropStyle"
		></view>

		<!-- 下滑后出现的用户信息栏：头像 + 用户名；原始作品/点赞栏滚动到这里后与它合并 -->
		<view
			v-if="stickyHeaderVisible"
			class="compact-sticky-header"
			:style="compactStickyHeaderStyle"
		>
			<view class="compact-profile-row" :style="compactProfileRowStyle">
				<image class="compact-avatar" :src="avatar || defaultAvatar" mode="aspectFill"></image>
				<text class="compact-username">{{ username || '我的' }}</text>
			</view>
		</view>

		<view
			v-if="pullDistance > 0 || isRefreshing"
			class="refresh-overlay"
			:style="refreshOverlayStyle"
		>
			<view class="loading-spinner tiny" v-if="isRefreshing"></view>
			<text class="refresh-overlay-text">{{ refresherText }}</text>
		</view>

		<scroll-view
			class="profile-scroll"
			scroll-y
			:show-scrollbar="false"
			:lower-threshold="120"
			@scroll="onProfileScroll"
			@scrolltolower="handleScrollToLower"
			@touchstart="onScrollTouchStart"
			@touchmove="onScrollTouchMove"
			@touchend="onScrollTouchEnd"
			@touchcancel="onScrollTouchEnd"
		>
			<view class="scroll-content" :style="scrollContentStyle">
				<!-- 顶部用户信息区域：高度按屏幕宽度决定，内部比例相对固定 -->
				<view class="profile-header" :style="profileHeaderStyle">
					<view class="setting-btn" :style="topActionBtnStyle" @click="showSettingMenu">
						<text class="iconfont icon-shezhi setting-icon"></text>
					</view>

					<view class="profile-header-content" :style="profileHeaderContentStyle">
						<view class="avatar-section">
							<image
								class="avatar"
								:style="avatarStyle"
								:src="avatar || defaultAvatar"
								mode="aspectFill"
							></image>
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

				<!-- 作品 / 点赞选项：滚动到顶部时与上方信息栏合并为共同顶栏 -->
				<view class="tab-bar" :style="tabBarStyle">
					<view
						class="tab-item works-tab"
						:class="{ active: activeTab === 'works' }"
						@click="switchTab('works')"
					>
						<text class="iconfont icon-neirongchuangzuo tab-icon"></text>
						<text class="tab-text">作品</text>
						<view class="tab-indicator" v-if="activeTab === 'works'"></view>
					</view>
					<view
						class="tab-item like-tab"
						:class="{ active: activeTab === 'likes' }"
						@click="switchTab('likes')"
					>
						<text class="iconfont icon-xihuan tab-icon"></text>
						<text class="tab-text">点赞</text>
						<view class="tab-indicator like-indicator" v-if="activeTab === 'likes'"></view>
					</view>
				</view>

				<view class="content-container" :style="contentContainerStyle">
					<view v-if="activeTab === 'works'">
						<view class="creation-grid" v-if="worksList.length > 0">
							<view
								class="creation-card"
								:style="creationCardStyle"
								v-for="(work, index) in worksList"
								:key="work.creation_id || index"
								@click="goToWorkDetail(work)"
								@touchstart="onWorkTouchStart"
								@touchmove="onWorkTouchMove"
								@touchend="onWorkTouchEnd"
								@touchcancel="onWorkTouchEnd"
								@longpress="showWorkOptions(work)"
							>
								<view class="image-wrapper" :style="imageWrapperStyle">
									<image
										class="card-image"
										:style="cardImageStyle"
										:src="work.cover"
										mode="aspectFill"
										@error="onCoverError(work)"
									/>
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
											<text
												class="iconfont like-icon"
												:class="work.is_digg ? 'icon-xihuan active' : 'icon-xihuan1'"
											></text>
											<text class="like-count">{{ formatNumber(work.digg_count) }}</text>
										</view>
									</view>
								</view>
							</view>
						</view>

						<view v-else-if="!loading" class="empty-state">
							<text class="iconfont icon-neirongchuangzuo empty-icon"></text>
							<text class="empty-text">还没有发布作品</text>
							<text class="empty-hint">快去创作第一个作品吧！</text>
						</view>

						<view v-if="loading && worksList.length > 0 && !isRefreshing" class="load-more-state loading-more-inline">
							<view class="loading-spinner small"></view>
							<text>加载中...</text>
						</view>
						<view v-else-if="!worksHasMore && worksList.length > 0" class="load-more-state">
							<text>没有更多了</text>
						</view>
					</view>

					<view v-if="activeTab === 'likes'">
						<view class="creation-grid" v-if="likesList.length > 0">
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
											<text
												class="iconfont like-icon"
												:class="item.is_digg ? 'icon-xihuan active' : 'icon-xihuan1'"
											></text>
											<text class="like-count">{{ formatNumber(item.digg_count) }}</text>
										</view>
									</view>
								</view>
							</view>
						</view>

						<view v-else-if="!loading" class="empty-state">
							<text class="iconfont icon-xihuan empty-icon like-empty-icon"></text>
							<text class="empty-text">还没有点赞内容</text>
							<text class="empty-hint">去发现更多精彩作品吧！</text>
						</view>

						<view v-if="loading && likesList.length > 0 && !isRefreshing" class="load-more-state loading-more-inline">
							<view class="loading-spinner small"></view>
							<text>加载中...</text>
						</view>
						<view v-else-if="!likesHasMore && likesList.length > 0" class="load-more-state">
							<text>没有更多了</text>
						</view>
					</view>

					<view v-if="loading && currentListLength === 0 && !isRefreshing" class="loading-more">
						<view class="loading-spinner"></view>
						<text class="loading-text">加载中...</text>
					</view>
				</view>

				<view v-if="currentListLength > 0" class="bottom-spacer" :style="bottomSpacerStyle"></view>
			</view>
		</scroll-view>

		<!-- 长按作品操作菜单：不显示取消 -->
		<view class="work-action-overlay" v-if="showWorkAction" @click="hideWorkActionMenu">
			<view class="work-action-menu" @click.stop>
				<view class="work-action-item" @click="editSelectedWork">
					<text class="work-action-text">编辑</text>
				</view>
				<view class="work-action-item danger-work-action" @click="deleteSelectedWork">
					<text class="work-action-text danger-work-text">删除</text>
				</view>
			</view>
		</view>

		<!-- 设置菜单弹窗 -->
		<view class="setting-overlay" v-if="showSetting" @click="showSetting = false">
			<view class="setting-menu" :style="settingMenuStyle" @click.stop>
				<view class="menu-header">
					<text class="menu-title">设置</text>
					<text class="menu-close" @click="showSetting = false">✕</text>
				</view>

				<view class="menu-list">
					<view class="menu-item" @click="goToEditProfile">
						<text class="iconfont icon-bianji menu-icon"></text>
						<text class="menu-text">编辑资料</text>
						<text class="menu-arrow">›</text>
					</view>
				</view>

				<view class="logout-btn" @click="logout">
					<text class="logout-text">退出登录</text>
				</view>
			</view>
		</view>

		<custom-tabbar active-path="pages/user/my_profile" />
	</view>
</template>

<script>
import DB from '@/utils/sqlite.js'
import {
	getCreationsByUser,
	getCreationsByDigg,
	deleteCreation
} from '@/request/creation.js'
import { digg, cancelDigg } from '@/request/action.js'
import { getUserProfile } from '@/request/user.js'

const GRID_GAP = 6
const CONTENT_PADDING_TOP = 6
const CONTENT_PADDING_X = 6
const CONTENT_PADDING_BOTTOM = 2

const MIN_TABBAR_BASE_HEIGHT = 46
const MAX_TABBAR_BASE_HEIGHT = 52
const LOAD_MORE_BOTTOM_GAP = 14

const PULL_TRIGGER_DISTANCE = 64
const PULL_MAX_DISTANCE = 96
const PULL_MOVE_RATIO = 0.62
const REFRESH_HOLD_OFFSET = 44

const MIN_PROFILE_BODY_HEIGHT = 220
const MAX_PROFILE_BODY_HEIGHT = 286

const MIN_TAB_BAR_HEIGHT = 38
const MAX_TAB_BAR_HEIGHT = 46

const MIN_COMPACT_HEIGHT = 40
const MAX_COMPACT_HEIGHT = 48

const CARD_ASPECT_WIDTH = 5
const CARD_ASPECT_HEIGHT = 7

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value))
}

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

			isRefreshing: false,
			scrollTop: 0,
			pullCandidate: false,
			pulling: false,
			pullStartY: 0,
			pullDistance: 0,
			refreshBackdropVisible: false,
			refreshBackdropHideTimer: null,

			defaultImage: '/static/images/default.png',
			defaultAvatar: '/static/user_avatar.png',
			showSetting: false,
			showWorkAction: false,
			selectedWork: null,
			pageReady: false,

			windowWidth: 375,
			windowHeight: 667,
			statusBarHeight: 0,
			safeBottom: 0,

			profileHeaderHeight: 270,
			profileBodyHeight: 246,
			compactProfileHeight: 44,
			tabBarHeight: 42,
			tabbarBaseHeight: 50,
			tabbarTotalHeight: 50,
			avatarSize: 92,

			creationCardHeight: 249,
			imageHeight: 178,
			cardContentHeight: 71,

			stickyHeaderVisible: false,
			stickyHeaderProgress: 0,

			workTouch: {
				startX: 0,
				startY: 0,
				moved: false
			}
		}
	},

	computed: {
		profileHeaderStyle() {
			return 'height:' + this.profileHeaderHeight + 'px;'
		},

		profileHeaderContentStyle() {
			return (
				'height:' + this.profileBodyHeight + 'px;' +
				'margin-top:' + this.statusBarHeight + 'px;'
			)
		},

		topActionBtnStyle() {
			return 'top:' + (this.statusBarHeight + 8) + 'px;'
		},

		avatarStyle() {
			return (
				'width:' + this.avatarSize + 'px;' +
				'height:' + this.avatarSize + 'px;' +
				'border-radius:' + Math.floor(this.avatarSize / 2) + 'px;'
			)
		},

		compactStickyHeaderStyle() {
			const totalHeight = this.statusBarHeight + this.compactProfileHeight
			const bgAlpha = clamp(this.stickyHeaderProgress * 0.98, 0, 0.98)

			return (
				'height:' + totalHeight + 'px;' +
				'background:rgba(253,231,209,' + bgAlpha + ');' +
				'box-shadow:none;'
			)
		},

		compactProfileRowStyle() {
			return (
				'height:' + this.compactProfileHeight + 'px;' +
				'margin-top:' + this.statusBarHeight + 'px;'
			)
		},

		tabBarStyle() {
			const stickyTop = this.statusBarHeight + this.compactProfileHeight

			return (
				'height:' + this.tabBarHeight + 'px;' +
				'top:' + stickyTop + 'px;' +
				'box-shadow:none;'
			)
		},

		contentContainerStyle() {
			return (
				'padding:' + CONTENT_PADDING_TOP + 'px ' +
				CONTENT_PADDING_X + 'px ' +
				CONTENT_PADDING_BOTTOM + 'px;'
			)
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
		},

		settingMenuStyle() {
			return 'padding-bottom:' + (20 + this.safeBottom + 16) + 'px;'
		},

		currentListLength() {
			return this.activeTab === 'works' ? this.worksList.length : this.likesList.length
		},

		pullVisualOffset() {
			if (this.isRefreshing) return REFRESH_HOLD_OFFSET

			return Math.min(
				REFRESH_HOLD_OFFSET,
				Math.round(this.pullDistance * PULL_MOVE_RATIO)
			)
		},

		scrollContentStyle() {
			const transition = this.pulling
				? 'none'
				: 'transform 0.16s ease'

			return [
				'transform: translateY(' + this.pullVisualOffset + 'px)',
				'transition:' + transition
			].join(';')
		},

		refreshGradientBackdropStyle() {
			const height = this.profileHeaderHeight + Math.max(64, this.pullVisualOffset + 42)

			return (
				'height:' + height + 'px;' +
				'opacity:1;'
			)
		},

		refreshOverlayStyle() {
			const top = this.statusBarHeight + Math.min(26, Math.max(10, Math.round(this.pullDistance * 0.24)))
			const opacity = this.isRefreshing
				? 1
				: Math.min(1, this.pullDistance / PULL_TRIGGER_DISTANCE)

			return [
				'top:' + top + 'px',
				'opacity:' + opacity
			].join(';')
		},

		refresherText() {
			if (this.isRefreshing) return '正在刷新...'
			if (this.pullDistance >= PULL_TRIGGER_DISTANCE) return '松开刷新'
			if (this.pullDistance > 0) return '下拉刷新'
			return ''
		},

		bottomSpacerStyle() {
			const height = this.tabbarTotalHeight + LOAD_MORE_BOTTOM_GAP
			return 'height:' + height + 'px;'
		}
	},

	async onLoad() {
		this.initResponsiveLayout()
		this.userId = getApp().globalData.userId
		await this.initPage()
	},

	onShow() {
		this.initResponsiveLayout()
	},

	onUnload() {
		if (this.refreshBackdropHideTimer) {
			clearTimeout(this.refreshBackdropHideTimer)
			this.refreshBackdropHideTimer = null
		}
	},

	methods: {

		hideRefreshBackdropLater() {
			if (this.refreshBackdropHideTimer) {
				clearTimeout(this.refreshBackdropHideTimer)
			}

			this.refreshBackdropHideTimer = setTimeout(() => {
				if (!this.isRefreshing && this.pullDistance <= 0) {
					this.refreshBackdropVisible = false
				}

				this.refreshBackdropHideTimer = null
			}, 220)
		},
		noop() {},

		onProfileScroll(e) {
			const scrollTop = Number(e?.detail?.scrollTop || 0)
			this.scrollTop = scrollTop
			this.updateStickyHeaderByScroll(scrollTop)
		},

		updateStickyHeaderByScroll(scrollTop) {
			const infoBarHeight = this.statusBarHeight + this.compactProfileHeight
			const start = Math.max(0, this.profileHeaderHeight - infoBarHeight - 150)
			const end = Math.max(start + 1, this.profileHeaderHeight - infoBarHeight)
			const progress = clamp((scrollTop - start) / (end - start), 0, 1)

			this.stickyHeaderProgress = progress
			this.stickyHeaderVisible = progress > 0.01
		},

		getTouchY(e) {
			const touch = e?.touches?.[0] || e?.changedTouches?.[0] || {}
			return Number(touch.clientY ?? touch.pageY ?? 0)
		},

		onScrollTouchStart(e) {
			if (this.loading || this.isRefreshing) return

			if (this.refreshBackdropHideTimer) {
				clearTimeout(this.refreshBackdropHideTimer)
				this.refreshBackdropHideTimer = null
			}

			this.pullStartY = this.getTouchY(e)
			this.pullCandidate = this.scrollTop <= 2
			this.pulling = false
			this.pullDistance = 0

			if (this.scrollTop <= 2) {
				this.refreshBackdropVisible = true
			}
		},

		onScrollTouchMove(e) {
			if (!this.pullCandidate || this.loading || this.isRefreshing) return

			if (this.scrollTop > 2) {
				this.pullCandidate = false
				this.pulling = false
				this.pullDistance = 0
				this.hideRefreshBackdropLater()
				return
			}

			const currentY = this.getTouchY(e)
			const deltaY = currentY - this.pullStartY

			if (deltaY <= 0) {
				this.pulling = false
				this.pullDistance = 0
				return
			}

			if (deltaY < 8) {
				this.pulling = false
				this.pullDistance = 0
				return
			}

			this.pulling = true
			this.pullDistance = Math.min(
				PULL_MAX_DISTANCE,
				Math.floor((deltaY - 8) * 0.38)
			)
		},

		async onScrollTouchEnd() {
			if (!this.pullCandidate && !this.pulling) return

			const shouldRefresh = this.pulling && this.pullDistance >= PULL_TRIGGER_DISTANCE

			this.pullCandidate = false
			this.pulling = false

			if (!shouldRefresh) {
				this.pullDistance = 0
				this.hideRefreshBackdropLater()
				return
			}

			await this.refreshList()
		},

		async refreshList() {
			if (this.loading || this.isRefreshing) {
				this.pullDistance = 0
				this.hideRefreshBackdropLater()
				return
			}

			this.refreshBackdropVisible = true
			this.isRefreshing = true
			this.pullDistance = PULL_TRIGGER_DISTANCE

			const tasks = [this.loadUserProfile()]
			if (this.activeTab === 'works') tasks.push(this.loadUserWorks(true))
			else if (this.activeTab === 'likes') tasks.push(this.loadUserLikes(true))

			try {
				await Promise.all(tasks)
			} finally {
				this.isRefreshing = false
				this.pullDistance = 0
				this.hideRefreshBackdropLater()
			}
		},

		handleScrollToLower() {
			if (this.activeTab === 'works') this.loadUserWorks(false)
			else if (this.activeTab === 'likes') this.loadUserLikes(false)
		},

		initResponsiveLayout() {
			try {
				const sys = uni.getSystemInfoSync()
				const windowWidth = Number(sys.windowWidth || 375)
				const windowHeight = Number(sys.windowHeight || 667)
				const statusBarHeight = Number(sys.statusBarHeight || 0)
				const safeAreaInsets = sys.safeAreaInsets || {}

				this.windowWidth = windowWidth
				this.windowHeight = windowHeight
				this.statusBarHeight = statusBarHeight
				this.safeBottom = Number(safeAreaInsets.bottom || 0)

				this.profileBodyHeight = clamp(
					Math.floor(windowWidth * 0.66),
					MIN_PROFILE_BODY_HEIGHT,
					MAX_PROFILE_BODY_HEIGHT
				)

				this.profileHeaderHeight = this.statusBarHeight + this.profileBodyHeight

				this.compactProfileHeight = clamp(
					Math.floor(windowWidth * 0.118),
					MIN_COMPACT_HEIGHT,
					MAX_COMPACT_HEIGHT
				)

				this.tabBarHeight = clamp(
					Math.floor(windowWidth * 0.112),
					MIN_TAB_BAR_HEIGHT,
					MAX_TAB_BAR_HEIGHT
				)

				this.tabbarBaseHeight = clamp(
					Math.floor(windowWidth * 0.132),
					MIN_TABBAR_BASE_HEIGHT,
					MAX_TABBAR_BASE_HEIGHT
				)
				this.tabbarTotalHeight = this.tabbarBaseHeight + this.safeBottom

				this.avatarSize = clamp(
					Math.floor(this.profileBodyHeight * 0.38),
					84,
					106
				)

				const gridWidth = windowWidth - CONTENT_PADDING_X * 2
				const cardWidth = Math.floor((gridWidth - GRID_GAP) / 2)

				this.creationCardHeight = Math.floor(cardWidth * CARD_ASPECT_HEIGHT / CARD_ASPECT_WIDTH)
				this.imageHeight = cardWidth
				this.cardContentHeight = Math.max(0, this.creationCardHeight - this.imageHeight)
			} catch (err) {
				this.windowWidth = 375
				this.windowHeight = 667
				this.statusBarHeight = 0
				this.safeBottom = 0

				this.profileBodyHeight = 246
				this.profileHeaderHeight = 246
				this.compactProfileHeight = 44
				this.tabBarHeight = 42
				this.tabbarBaseHeight = 50
				this.tabbarTotalHeight = 50
				this.avatarSize = 92

				this.creationCardHeight = 249
				this.imageHeight = 178
				this.cardContentHeight = 71
			}
		},

		async initPage() {
			await Promise.all([
				this.loadUserProfile(),
				this.loadUserWorks(true)
			])
			this.pageReady = true
		},

		refreshCurrentTab() {
			this.loadUserProfile()
			if (this.activeTab === 'works') this.loadUserWorks(true)
			else this.loadUserLikes(true)
		},

		async loadUserProfile() {
			const uid = this.userId || getApp().globalData.userId

			const res = await getUserProfile(uid, true, true)
			if (res) {
				this.username = res.user_info && res.user_info.username ? res.user_info.username : ''
				this.avatar = res.user_info && res.user_info.avatar ? res.user_info.avatar : this.defaultAvatar
				this.followingCount = res.following_count || 0
				this.followerCount = res.follower_count || 0
				this.friendCount = res.friend_count || 0
				return
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

			const pageToLoad = reset ? 1 : this.worksPage + 1
			const res = await getCreationsByUser(this.userId, pageToLoad)

			if (!res) {
				this.loading = false
				return
			}

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
				this.loading = false
				return
			}

			const mapped = list.map((item) => ({
				creation_id: item.creation_id,
				cover: item.cover_url || item.material_url || this.defaultImage,
				title: item.title || '未命名作品',
				content: item.content || '',
				category: item.category || '',
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
			this.loading = false
		},

		async loadUserLikes(reset = false) {
			if (this.loading) return
			if (!reset && !this.likesHasMore) return

			this.loading = true

			const pageToLoad = reset ? 1 : this.likesPage + 1
			const res = await getCreationsByDigg(this.userId, pageToLoad)

			if (!res) {
				this.loading = false
				return
			}

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
				this.loading = false
				return
			}

			const mapped = list.map((item) => ({
				creation_id: item.creation_id,
				cover: item.cover_url || item.material_url || this.defaultImage,
				title: item.title || '未命名作品',
				content: item.content || '',
				category: item.category || '',
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
			this.loading = false
		},

		switchTab(tab) {
			if (this.activeTab === tab) return

			this.activeTab = tab
			if (tab === 'likes' && !this.likesLoaded) {
				this.loadUserLikes(true)
			}
		},

		onCoverError(item) {
			if (item) item.cover = this.defaultImage
		},

		async toggleDigg(listType, index) {
			const list = listType === 'works' ? this.worksList : this.likesList
			const item = list[index]

			if (!item || item._digging) return

			item._digging = true

			if (item.is_digg) {
				const ok = await cancelDigg('creation', item.creation_id)
				if (ok) {
					item.is_digg = false
					if (item.digg_count > 0) item.digg_count -= 1
				}
			} else {
				const ok = await digg('creation', item.creation_id)
				if (ok) {
					item.is_digg = true
					item.digg_count += 1
				}
			}

			item._digging = false
		},

		showSettingMenu() {
			this.showSetting = true
		},

		onWorkTouchStart(e) {
			const touch = e?.changedTouches?.[0] || e?.touches?.[0] || {}

			this.workTouch = {
				startX: touch.clientX ?? touch.pageX ?? 0,
				startY: touch.clientY ?? touch.pageY ?? 0,
				moved: false
			}
		},

		onWorkTouchMove(e) {
			const touch = e?.changedTouches?.[0] || e?.touches?.[0] || {}
			const x = touch.clientX ?? touch.pageX ?? 0
			const y = touch.clientY ?? touch.pageY ?? 0
			const dx = Math.abs(x - this.workTouch.startX)
			const dy = Math.abs(y - this.workTouch.startY)

			if (dx > 8 || dy > 8) {
				this.workTouch.moved = true
			}
		},

		onWorkTouchEnd() {
			setTimeout(() => {
				this.workTouch = {
					startX: 0,
					startY: 0,
					moved: false
				}
			}, 80)
		},

		showWorkOptions(work) {
			if (!work || !work.creation_id) return
			if (this.workTouch.moved || this.pullDistance > 4 || this.isRefreshing) return
			this.selectedWork = work
			this.showWorkAction = true
		},

		hideWorkActionMenu() {
			this.showWorkAction = false
			this.selectedWork = null
		},

		editSelectedWork() {
			const work = this.selectedWork
			this.showWorkAction = false
			this.selectedWork = null

			if (work) {
				this.goToEditCreation(work)
			}
		},

		deleteSelectedWork() {
			const work = this.selectedWork
			this.showWorkAction = false
			this.selectedWork = null

			if (work) {
				this.confirmDeleteWork(work)
			}
		},

		goToFriendList() {
			uni.navigateTo({
				url: `/pages/user/follow_list?userId=${this.userId}&tab=friend`
			})
		},

		goToFollowingList() {
			uni.navigateTo({
				url: `/pages/user/follow_list?userId=${this.userId}&tab=following`
			})
		},

		goToFollowerList() {
			uni.navigateTo({
				url: `/pages/user/follow_list?userId=${this.userId}&tab=follower`
			})
		},

		goToWorkDetail(work) {
			if (!work || !work.creation_id) return

			const creationId = encodeURIComponent(work.creation_id)
			const userId = encodeURIComponent(work.user_id || this.userId || '')
			const isVideo = Number(work.material_type) === 2
			const basePath = isVideo ? '/pages/creation/creation_video' : '/pages/creation/creation_image'

			uni.navigateTo({
				url: `${basePath}?creationId=${creationId}&userId=${userId}`
			})
		},

		goToEditCreation(work) {
			uni.navigateTo({
				url: `/pages/workspace/edit_creation?creationId=${encodeURIComponent(work.creation_id)}`
			})
		},

		confirmDeleteWork(work) {
			uni.showModal({
				title: '提示',
				content: '确定要删除这个作品吗？',
				success: async (res) => {
					if (!res.confirm) return

					const ok = await deleteCreation({
						creationId: work.creation_id
					})

					if (ok) {
						this.worksList = this.worksList.filter(
							item => item.creation_id !== work.creation_id
						)

						uni.showToast({
							title: '删除成功',
							icon: 'success'
						})
					}
				}
			})
		},

		goToEditProfile() {
			this.showSetting = false
			uni.navigateTo({
				url: '/pages/user/edit_profile'
			})
		},

		logout() {
			uni.showModal({
				title: '提示',
				content: '确定要退出登录吗？',
				success: (res) => {
					if (res.confirm) {
						try {
							if (getApp().globalData.socket) {
								getApp().globalData.socket.close()
							}
						} catch (e) {
							console.error('退出登录错误:', e)
						}

						delete getApp().globalData.token
						uni.removeStorageSync('token')
						uni.removeStorageSync('user_id')
						uni.removeStorageSync('notify_permission_asked')
						uni.reLaunch({
							url: '/pages/user/login'
						})
					}
				}
			})
		},

		formatNumber(num) {
			if (!num && num !== 0) return '0'
			if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
			if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
			return num.toString()
		}
	}
}
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.user-profile-container {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	padding: 0;
	margin: 0;
	box-sizing: border-box;
	background: #fefefe;
	overflow: hidden;
	font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
	overscroll-behavior-y: none;
}


.refresh-gradient-backdrop {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 0;
	background:
		radial-gradient(circle at 0% 0%, rgba(248, 211, 174, 0.96) 0%, rgba(253, 231, 209, 0.86) 25%, rgba(255, 250, 244, 0.2) 52%, rgba(255, 250, 244, 0) 70%),
		linear-gradient(135deg, rgba(255, 246, 235, 1) 0%, rgba(253, 231, 209, 1) 62%, rgba(248, 211, 174, 1) 100%);
	pointer-events: none;
}

.refresh-overlay {
	position: fixed;
	left: 50%;
	z-index: 98;
	height: 30px;
	min-width: 92px;
	padding: 0 12px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.48);
	backdrop-filter: blur(12px);
	box-shadow: 0 6px 18px rgba(138, 90, 43, 0.12);
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	box-sizing: border-box;
	transform: translateX(-50%);
	pointer-events: none;
	transition: top 0.12s ease, opacity 0.12s ease;
}

.refresh-overlay-text {
	font-size: 12px;
	color: rgba(81, 55, 31, 0.72);
	font-weight: 400;
	line-height: 1;
}

.profile-scroll {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1;
	background: transparent;
	box-sizing: border-box;
	overflow: hidden;
	overscroll-behavior-y: contain;
}

.scroll-content {
	position: relative;
	z-index: 1;
	will-change: transform;
	background: transparent;
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
	border-bottom: none;
}

.compact-profile-row {
	display: flex;
	align-items: center;
	padding-left: 12px;
	padding-right: 12px;
	box-sizing: border-box;
}

.compact-avatar {
	width: 30px;
	height: 30px;
	border-radius: 15px;
	border: 1px solid rgba(138, 90, 43, 0.08);
	margin-right: 8px;
	background: rgba(0, 0, 0, 0.04);
	flex-shrink: 0;
}

.compact-username {
	font-size: 15px;
	font-weight: 400;
	color: #51371f;
	max-width: 240px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.profile-header {
	position: relative;
	background:
		radial-gradient(circle at 0% 0%, rgba(248, 211, 174, 0.96) 0%, rgba(253, 231, 209, 0.86) 25%, rgba(255, 250, 244, 0.2) 52%, rgba(255, 250, 244, 0) 70%),
		linear-gradient(135deg, rgba(255, 246, 235, 1) 0%, rgba(253, 231, 209, 1) 62%, rgba(248, 211, 174, 1) 100%);
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

.setting-btn {
	position: absolute;
	right: 14px;
	width: 34px;
	height: 34px;
	background: rgba(255, 255, 255, 0.68);
	backdrop-filter: blur(10px);
	border-radius: 17px;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
	box-shadow: 0 2px 8px rgba(138, 90, 43, 0.08);
}

.setting-icon {
	font-size: 18px;
	color: #8a5a2b;
	line-height: 1;
}

.avatar-section {
	display: flex;
	justify-content: center;
	margin-bottom: 12px;
}

.avatar {
	border: 3px solid rgba(255, 255, 255, 0.74);
	box-shadow: 0 4px 16px rgba(138, 90, 43, 0.14);
	box-sizing: border-box;
	background: #f3f3f3;
}

.user-info {
	text-align: center;
	margin-bottom: 15px;
}

.username {
	display: block;
	font-size: 24px;
	font-weight: 500;
	color: #51371f;
	text-shadow: none;
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
	font-weight: 500;
	color: #51371f;
	margin-bottom: 4px;
	text-shadow: none;
}

.stat-label {
	font-size: 12px;
	color: rgba(81, 55, 31, 0.68);
}

.tab-bar {
	display: flex;
	align-items: center;
	background: #f8f9fa;
	border-bottom: none;
	position: sticky;
	top: 0;
	z-index: 90;
	box-sizing: border-box;
}

.tab-item {
	flex: 1;
	height: 100%;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 5px;
	transition: all 0.24s;
	color: #666;
	box-sizing: border-box;
	background: #f8f9fa;
}

.tab-item.active {
	color: #8a5a2b;
}

.works-tab .tab-icon {
	color: #8a5a2b;
}

.like-tab .tab-icon {
	color: #ff4d67;
}

.tab-icon {
	font-size: 17px;
	line-height: 1;
}

.tab-text {
	font-size: 14px;
	font-weight: 400;
	line-height: 1;
}

.tab-indicator {
	position: absolute;
	bottom: 0;
	width: 24px;
	height: 2px;
	background: rgba(253, 231, 209, 1);
	border-radius: 2px;
	animation: slideIn 0.24s ease;
}

.like-indicator {
	background: rgba(255, 77, 103, 0.82);
}

@keyframes slideIn {
	from {
		width: 0;
		opacity: 0;
	}
	to {
		width: 24px;
		opacity: 1;
	}
}

.content-container {
	box-sizing: border-box;
	background: #fefefe;
}

.creation-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	column-gap: 6px;
	row-gap: 10px;
}

.creation-card {
	background: #ffffff;
	border-radius: 10px;
	overflow: hidden;
	box-shadow: 0 1px 7px rgba(0, 0, 0, 0.06);
	box-sizing: border-box;
	transition: all 0.24s;
}

.creation-card:active {
	transform: translateY(-1px);
	box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
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

.card-content {
	padding: 7px 8px 6px;
	box-sizing: border-box;
	overflow: hidden;
	background: #ffffff;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.card-title-container {
	min-height: 22px;
}

.card-title {
	font-size: 15px;
	font-weight: 500;
	color: #333333;
	line-height: 22px;
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 31px;
	margin-top: 5px;
}

.card-author {
	display: flex;
	align-items: center;
	gap: 6px;
	flex: 1;
	min-width: 0;
}

.author-avatar {
	width: 22px;
	height: 22px;
	border-radius: 50%;
	border: 1px solid #f0f0f0;
	object-fit: cover;
	flex-shrink: 0;
}

.author-name {
	font-size: 14px;
	font-weight: 400;
	color: #666666;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-likes {
	display: flex;
	align-items: center;
	gap: 4px;
	flex-shrink: 0;
	padding-left: 6px;
}

.like-icon {
	font-size: 18px;
	line-height: 1;
	color: #b8b8b8;
	transition: transform 0.15s ease;
}

.like-icon.active {
	transform: scale(1.08);
	color: #ff4d67;
}

.like-count {
	font-size: 14px;
	font-weight: 400;
	color: #888888;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 80px 0;
}

.empty-icon {
	font-size: 58px;
	margin-bottom: 12px;
	color: #d8a25d;
	line-height: 1;
}

.like-empty-icon {
	color: #ff4d67;
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
	border: 2px solid rgba(216, 162, 93, 0.22);
	border-top-color: #d8a25d;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

.loading-spinner.small {
	width: 14px;
	height: 14px;
	border-width: 2px;
}

.loading-spinner.tiny {
	width: 14px;
	height: 14px;
	border-width: 2px;
}

.loading-text {
	font-size: 13px;
	color: #999;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}


.load-more-state {
	padding: 4px 0 0;
	margin: 0;
	text-align: center;
	font-size: 11px;
	line-height: 14px;
	color: #999;
	font-weight: 400;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
}

.loading-more-inline {
	font-size: 12px;
}

.bottom-spacer {
	width: 100%;
	flex-shrink: 0;
	background: #fefefe;
}

.work-action-overlay {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 2600;
	background: rgba(0, 0, 0, 0.18);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	padding: 0 12px 18px;
	box-sizing: border-box;
}

.work-action-menu {
	width: 100%;
	background: #fff;
	border-radius: 14px;
	overflow: hidden;
	box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16);
}

.work-action-item {
	height: 46px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	box-sizing: border-box;
	border-bottom: 1px solid #f4f4f4;
}

.work-action-item:last-child {
	border-bottom: none;
}

.work-action-item:active {
	background: #f8f8f8;
}

.work-action-icon {
	font-size: 16px;
	color: #333;
	line-height: 1;
}

.work-action-text {
	font-size: 15px;
	color: #333;
	font-weight: 400;
}

.danger-work-text {
	color: #ff3b30;
}

.setting-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.45);
	z-index: 3000;
	display: flex;
	align-items: flex-end;
	animation: fadeIn 0.24s ease;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.setting-menu {
	width: 100%;
	background: #fff;
	border-radius: 16px 16px 0 0;
	padding: 18px;
	animation: slideUp 0.24s ease;
	box-sizing: border-box;
	max-height: 72vh;
	overflow-y: auto;
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
	margin-bottom: 16px;
}

.menu-title {
	font-size: 17px;
	font-weight: 500;
	color: #333;
}

.menu-close {
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22px;
	color: #999;
}

.menu-list {
	margin-bottom: 18px;
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 14px 0;
	border-bottom: 1px solid #f0f0f0;
}

.menu-icon {
	font-size: 18px;
	margin-right: 10px;
	color: #8a5a2b;
	line-height: 1;
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
	height: 46px;
	background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
	border-radius: 23px;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4px 12px rgba(255, 107, 107, 0.32);
}

.logout-text {
	font-size: 15px;
	font-weight: 500;
	color: #fff;
}
</style>