<template>
	<view class="container" v-if="isPageAlive">
		<page-meta page-style="overflow: hidden;" />

		<!-- 顶部固定安全栏：遮住状态栏 / 刘海区域 -->
		<view class="safe-status-bar" :style="safeStatusBarStyle"></view>

		<!-- 搜索栏：固定不动 -->
		<view class="search-wrapper" :style="searchWrapperStyle">
			<view class="fixed-search-bar" :style="fixedSearchBarStyle">
				<view class="back-button" :style="backButtonStyle" @click="goBack">
					<text class="iconfont icon-fanhui back-icon"></text>
				</view>

				<view class="search-input-container" :style="searchInputContainerStyle">
					<text class="iconfont icon-sousuo search-icon"></text>

					<input
						v-model="keyword"
						class="search-input"
						type="text"
						placeholder="搜索创作或用户"
						:focus="autoFocus"
						confirm-type="search"
						:adjust-position="false"
						cursor-spacing="12"
						@focus="handleSearchFocus"
						@blur="handleSearchBlur"
						@confirm="onSearchConfirm"
					/>

					<text v-if="keyword" class="clear-icon" @click.stop="clearKeyword">✕</text>
				</view>

				<view class="search-button" :style="searchButtonStyle" @click="onSearchConfirm">
					<text class="search-button-text">搜索</text>
				</view>
			</view>
		</view>

		<!-- 筛选栏：固定不动 -->
		<view class="filter-bar" :style="filterBarStyle">
			<view
				class="filter-item"
				:class="{ active: activeFilter === 'creation' }"
				@click="changeFilter('creation')"
			>
				<text class="filter-text">创作</text>
				<view v-if="activeFilter === 'creation'" class="filter-indicator"></view>
			</view>

			<view
				class="filter-item"
				:class="{ active: activeFilter === 'user' }"
				@click="changeFilter('user')"
			>
				<text class="filter-text">用户</text>
				<view v-if="activeFilter === 'user'" class="filter-indicator"></view>
			</view>
		</view>

		<!-- 自定义悬浮刷新提示，不占用列表空间 -->
		<view
			v-if="pullDistance > 0 || isRefreshing"
			class="refresh-overlay"
			:style="refreshOverlayStyle"
		>
			<view class="loading-spinner tiny" v-if="isRefreshing"></view>
			<text class="refresh-overlay-text">{{ refresherText }}</text>
		</view>

		<!-- 内容滚动区：只让 scroll-view 滚动，不让页面本身滚动 -->
		<scroll-view
			class="result-scroll"
			scroll-y
			:lower-threshold="120"
			@scroll="onResultScroll"
			@touchstart="onScrollTouchStart"
			@touchmove="onScrollTouchMove"
			@touchend="onScrollTouchEnd"
			@touchcancel="onScrollTouchEnd"
			@scrolltolower="loadMoreCurrent"
		>
			<view class="scroll-content" :style="scrollContentStyle">
				<view class="content-container" :style="contentContainerStyle">
					<!-- 创作搜索结果 -->
					<view v-if="activeFilter === 'creation'">
						<view v-if="creationLoading && creationList.length === 0" class="initial-loading">
							<view class="loading-spinner"></view>
							<text class="loading-text">搜索中...</text>
						</view>

						<view v-else-if="creationList.length > 0" class="creation-grid">
							<view
								v-for="(creation, index) in creationList"
								:key="'creation-' + creation.creation_id + '-' + index"
								class="creation-card"
								:style="cardStyle"
								@click="goToCreationDetail(creation)"
							>
								<view class="image-wrapper" :style="imageWrapperStyle">
									<image
										class="card-image"
										:src="creation.cover"
										mode="aspectFill"
										lazy-load
										@error="handleCreationImageError(creation)"
									></image>

									<view v-if="Number(creation.material_type) === 2" class="video-badge">
										<text class="video-badge-icon">▶</text>
									</view>
								</view>

								<view class="card-content" :style="cardContentStyle">
									<view class="card-title-container">
										<text class="card-title">{{ creation.title }}</text>
									</view>

									<view class="card-footer">
										<view class="card-author">
											<image
												class="author-avatar"
												:src="creation.avatar"
												mode="aspectFill"
												lazy-load
											></image>
											<text class="author-name">{{ creation.username }}</text>
										</view>

										<view class="card-likes" @click.stop="toggleDigg(creation, index)">
											<text
												class="iconfont like-icon"
												:class="creation.is_digg ? 'icon-xihuan liked' : 'icon-xihuan1'"
											></text>
											<text class="like-count">{{ formatNumber(creation.digg_count) }}</text>
										</view>
									</view>
								</view>
							</view>
						</view>

						<view v-else-if="!creationLoading" class="empty-state">
							<text class="iconfont icon-neirongchuangzuo empty-icon"></text>
							<text class="empty-text">没有找到相关创作</text>
							<text class="empty-hint">试试其他关键词吧</text>
						</view>

						<view v-if="creationLoadingMore && creationList.length > 0" class="load-more-state">加载中...</view>

						<view
							v-else-if="!creationHasMore && creationList.length > 0"
							class="load-more-state"
						>
							没有更多了
						</view>
					</view>

					<!-- 用户搜索结果 -->
					<view v-else>
						<view v-if="userLoading && userList.length === 0" class="initial-loading">
							<view class="loading-spinner"></view>
							<text class="loading-text">搜索中...</text>
						</view>

						<view v-else-if="userList.length > 0" class="user-list">
							<view
								v-for="(user, index) in userList"
								:key="'user-' + user.user_id + '-' + index"
								class="user-item"
								:style="userItemStyle"
							>
								<view class="user-left" @click="goToUserPage(user)">
									<image
										class="avatar"
										:style="userAvatarStyle"
										:src="user.avatar"
										mode="aspectFill"
									></image>

									<view class="user-info">
										<text class="user-name">{{ user.username }}</text>
										<text class="user-fans">粉丝：{{ formatFans(user.follower_count) }}</text>
									</view>
								</view>

								<view v-if="!isSelf(user)" class="user-right">
									<view :class="followBtnClass(user)" @click.stop="onFollowBtnClick(user)">
										<text class="btn-text">{{ followBtnText(user) }}</text>
									</view>
								</view>
							</view>
						</view>

						<view v-else-if="!userLoading" class="empty-state">
							<text class="iconfont icon-qunliaox empty-icon"></text>
							<text class="empty-text">没有找到相关用户</text>
							<text class="empty-hint">试试换个昵称或关键词</text>
						</view>

						<view v-if="userLoadingMore && userList.length > 0" class="load-more-state">加载中...</view>

						<view
							v-else-if="!userHasMore && userList.length > 0"
							class="load-more-state"
						>
							没有更多了
						</view>
					</view>
				</view>

				<view
					v-if="activeFilter === 'creation' ? creationList.length > 0 : userList.length > 0"
					class="bottom-spacer"
					:style="bottomSpacerStyle"
				></view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { getCreationsBySearch } from '@/request/creation.js'
import { searchUsers } from '@/request/user.js'
import { follow, unfollow, digg, cancelDigg } from '@/request/action.js'

const GRID_PADDING_X = 6
const GRID_GAP = 6
const CONTENT_BOTTOM_PADDING = 8

// 创作卡片样式同步首页：高:宽 = 7:5，封面 1:1
const CARD_ASPECT_WIDTH = 5
const CARD_ASPECT_HEIGHT = 7

const SEARCH_INPUT_HEIGHT_MIN = 36
const SEARCH_INPUT_HEIGHT_MAX = 40
const SEARCH_VERTICAL_PADDING_MIN = 6
const SEARCH_VERTICAL_PADDING_MAX = 8

const FILTER_BAR_HEIGHT_MIN = 36
const FILTER_BAR_HEIGHT_MAX = 42

const USER_ITEM_HEIGHT_MIN = 56
const USER_ITEM_HEIGHT_MAX = 66

const PULL_TRIGGER_DISTANCE = 64
const PULL_MAX_DISTANCE = 92
const PULL_MOVE_RATIO = 0.62
const REFRESH_HOLD_OFFSET = 42

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value))
}

export default {
	data() {
		return {
			keyword: '',
			autoFocus: false,
			activeFilter: 'creation',
			isPageAlive: true,

			searchFocused: false,
			isRefreshing: false,

			scrollTop: 0,
			pulling: false,
			pullStartY: 0,
			pullDistance: 0,

			statusBarHeight: 0,
			windowWidth: 375,
			windowHeight: 667,
			safeBottom: 0,

			searchInputHeight: 38,
			searchVerticalPadding: 7,
			searchAreaHeight: 52,
			filterBarHeight: 38,

			creationList: [],
			creationPage: 1,
			creationPageSize: 20,
			creationHasMore: true,
			creationLoading: false,
			creationLoadingMore: false,

			userList: [],
			userPage: 1,
			userPageSize: 20,
			userHasMore: true,
			userLoading: false,
			userLoadingMore: false,

			defaultImage: '/static/images/default.png',
			defaultAvatar: '/static/user_avatar.png',

			cardWidth: 176,
			cardHeight: 246,
			imageHeight: 176,
			cardContentHeight: 70,

			userItemHeight: 60,
			userAvatarSize: 42
		}
	},

	computed: {
		safeStatusBarStyle() {
			return 'height:' + this.statusBarHeight + 'px;'
		},

		searchWrapperStyle() {
			return 'top:' + this.statusBarHeight + 'px;'
		},

		fixedSearchBarStyle() {
			return (
				'height:' + this.searchAreaHeight + 'px;' +
				'padding-top:' + this.searchVerticalPadding + 'px;' +
				'padding-bottom:' + this.searchVerticalPadding + 'px;'
			)
		},

		backButtonStyle() {
			return 'height:' + this.searchInputHeight + 'px;'
		},

		searchInputContainerStyle() {
			const radius = Math.floor(this.searchInputHeight / 2)
			return (
				'height:' + this.searchInputHeight + 'px;' +
				'border-radius:' + radius + 'px;'
			)
		},

		searchButtonStyle() {
			const radius = Math.floor(this.searchInputHeight / 2)
			return (
				'height:' + this.searchInputHeight + 'px;' +
				'border-radius:' + radius + 'px;'
			)
		},

		filterBarStyle() {
			return (
				'top:' + (this.statusBarHeight + this.searchAreaHeight) + 'px;' +
				'height:' + this.filterBarHeight + 'px;'
			)
		},

		contentContainerStyle() {
			return (
				'padding-top:' + (this.statusBarHeight + this.searchAreaHeight + this.filterBarHeight + 6) + 'px;' +
				'padding-left:' + GRID_PADDING_X + 'px;' +
				'padding-right:' + GRID_PADDING_X + 'px;' +
				'padding-bottom:' + CONTENT_BOTTOM_PADDING + 'px;'
			)
		},

		cardStyle() {
			return 'height:' + this.cardHeight + 'px;'
		},

		imageWrapperStyle() {
			return 'height:' + this.imageHeight + 'px;'
		},

		cardContentStyle() {
			return 'height:' + this.cardContentHeight + 'px;'
		},

		userItemStyle() {
			return 'height:' + this.userItemHeight + 'px;'
		},

		userAvatarStyle() {
			const radius = Math.floor(this.userAvatarSize / 2)
			return (
				'width:' + this.userAvatarSize + 'px;' +
				'height:' + this.userAvatarSize + 'px;' +
				'border-radius:' + radius + 'px;'
			)
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

		refreshOverlayStyle() {
			const top = this.statusBarHeight + this.searchAreaHeight + this.filterBarHeight

			const height = this.isRefreshing
				? 34
				: Math.min(34, Math.max(0, Math.round(this.pullDistance * 0.48)))

			const opacity = this.isRefreshing
				? 1
				: Math.min(1, this.pullDistance / PULL_TRIGGER_DISTANCE)

			return [
				'top:' + top + 'px',
				'height:' + height + 'px',
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
			const height = this.safeBottom + 4
			return 'height:' + height + 'px;'
		}
	},

	async onLoad(options) {
		this.initResponsiveLayout()

		const rawKeyword = options && options.keyword ? options.keyword : ''
		this.keyword = decodeURIComponent(rawKeyword)
		this.autoFocus = !this.keyword

		if (this.keyword) {
			await this.searchCreations(true)
		}
	},

	onShow() {
		this.initResponsiveLayout()
	},

	onUnload() {
		this.isPageAlive = false
	},

	methods: {
		initResponsiveLayout() {
			try {
				const systemInfo = uni.getSystemInfoSync()
				const windowWidth = Number(systemInfo.windowWidth || 375)
				const windowHeight = Number(systemInfo.windowHeight || 667)
				const statusBarHeight = Number(systemInfo.statusBarHeight || 0)
				const safeAreaInsets = systemInfo.safeAreaInsets || {}

				this.windowWidth = windowWidth
				this.windowHeight = windowHeight
				this.statusBarHeight = statusBarHeight
				this.safeBottom = Number(safeAreaInsets.bottom || 0)

				this.searchInputHeight = clamp(
					Math.floor(windowWidth * 0.102),
					SEARCH_INPUT_HEIGHT_MIN,
					SEARCH_INPUT_HEIGHT_MAX
				)

				this.searchVerticalPadding = clamp(
					Math.floor(windowWidth * 0.018),
					SEARCH_VERTICAL_PADDING_MIN,
					SEARCH_VERTICAL_PADDING_MAX
				)

				this.searchAreaHeight = this.searchInputHeight + this.searchVerticalPadding * 2

				this.filterBarHeight = clamp(
					Math.floor(windowWidth * 0.1),
					FILTER_BAR_HEIGHT_MIN,
					FILTER_BAR_HEIGHT_MAX
				)

				const totalPadding = GRID_PADDING_X * 2
				const availableWidth = windowWidth - totalPadding - GRID_GAP
				const cardWidth = Math.floor(availableWidth / 2)

				const cardHeight = Math.floor(cardWidth * CARD_ASPECT_HEIGHT / CARD_ASPECT_WIDTH)
				const imageHeight = cardWidth
				const contentHeight = Math.max(0, cardHeight - imageHeight)

				this.cardWidth = cardWidth
				this.cardHeight = cardHeight
				this.imageHeight = imageHeight
				this.cardContentHeight = contentHeight

				this.userItemHeight = clamp(
					Math.floor(windowWidth * 0.16),
					USER_ITEM_HEIGHT_MIN,
					USER_ITEM_HEIGHT_MAX
				)

				this.userAvatarSize = clamp(
					Math.floor(this.userItemHeight * 0.68),
					38,
					46
				)
			} catch (err) {
				this.statusBarHeight = 0
				this.windowWidth = 375
				this.windowHeight = 667
				this.safeBottom = 0

				this.searchInputHeight = 38
				this.searchVerticalPadding = 7
				this.searchAreaHeight = 52
				this.filterBarHeight = 38

				this.cardWidth = 176
				this.cardHeight = 246
				this.imageHeight = 176
				this.cardContentHeight = 70

				this.userItemHeight = 60
				this.userAvatarSize = 42
			}
		},

		handleSearchFocus() {
			this.searchFocused = true
			this.pulling = false
			this.pullDistance = 0
		},

		handleSearchBlur() {
			this.searchFocused = false
		},

		onResultScroll(e) {
			this.scrollTop = Number(e?.detail?.scrollTop || 0)
		},

		getTouchY(e) {
			const touch = e?.touches?.[0] || e?.changedTouches?.[0] || {}
			return Number(touch.clientY ?? touch.pageY ?? 0)
		},

		onScrollTouchStart(e) {
			if (this.creationLoading || this.creationLoadingMore || this.userLoading || this.userLoadingMore || this.isRefreshing) {
				return
			}

			if (this.searchFocused) {
				this.searchFocused = false

				try {
					uni.hideKeyboard()
				} catch (err) {}
			}

			this.pullStartY = this.getTouchY(e)
			this.pulling = this.scrollTop <= 2
			this.pullDistance = 0
		},

		onScrollTouchMove(e) {
			if (!this.pulling || this.isRefreshing) return

			if (this.scrollTop > 2) {
				this.pulling = false
				this.pullDistance = 0
				return
			}

			const currentY = this.getTouchY(e)
			const deltaY = currentY - this.pullStartY

			if (deltaY <= 0) {
				this.pullDistance = 0
				return
			}

			this.pullDistance = Math.min(
				PULL_MAX_DISTANCE,
				Math.floor(deltaY * 0.38)
			)
		},

		async onScrollTouchEnd() {
			if (!this.pulling) return

			const shouldRefresh = this.pullDistance >= PULL_TRIGGER_DISTANCE

			this.pulling = false

			if (!shouldRefresh) {
				this.pullDistance = 0
				return
			}

			await this.refreshCurrent()
		},

		async refreshCurrent() {
			if (this.isRefreshing) {
				this.pullDistance = 0
				return
			}

			const kw = this.keyword.trim()
			if (!kw) {
				this.pullDistance = 0
				return
			}

			this.isRefreshing = true
			this.pullDistance = PULL_TRIGGER_DISTANCE

			if (this.activeFilter === 'creation') {
				await this.searchCreations(true)
			} else {
				await this.searchUsers(true)
			}

			this.isRefreshing = false
			this.pullDistance = 0
		},

		loadMoreCurrent() {
			if (this.activeFilter === 'creation') {
				this.loadMoreCreations()
				return
			}

			this.loadMoreUsers()
		},

		goBack() {
			uni.navigateBack()
		},

		clearKeyword() {
			this.keyword = ''
			this.creationList = []
			this.userList = []
			this.creationHasMore = false
			this.userHasMore = false
		},

		onSearchConfirm() {
			const kw = this.keyword.trim()
			if (!kw) {
				uni.showToast({ title: '请输入搜索词', icon: 'none' })
				return
			}

			if (this.activeFilter === 'creation') {
				this.searchCreations(true)
			} else {
				this.searchUsers(true)
			}
		},

		changeFilter(type) {
			if (this.activeFilter === type) return

			this.activeFilter = type
			this.scrollTop = 0
			this.pullDistance = 0
			this.pulling = false

			const kw = this.keyword.trim()
			if (!kw) return

			if (type === 'creation') {
				this.searchCreations(true)
			} else {
				this.searchUsers(true)
			}
		},

		async searchCreations(reset) {
			const kw = this.keyword.trim()
			if (!kw) {
				this.creationList = []
				this.creationHasMore = false
				return
			}

			if (this.creationLoading || this.creationLoadingMore) return

			if (reset) {
				this.creationPage = 1
				this.creationHasMore = true
				this.creationList = []
				this.creationLoading = true
			} else {
				this.creationLoadingMore = true
			}

			try {
				const res = await getCreationsBySearch(kw, this.creationPage)
				const list = res && res.creations ? res.creations : []
				const mapped = list.map(item => this.normalizeCreation(item))

				if (reset) {
					this.creationList = mapped
				} else {
					this.creationList = this.creationList.concat(mapped)
				}

				this.creationHasMore = list.length >= this.creationPageSize
			} catch (err) {
				console.error('搜索创作失败:', err)

				if (!reset && this.creationPage > 1) {
					this.creationPage -= 1
				}

				uni.showToast({ title: '搜索失败', icon: 'none' })
			} finally {
				this.creationLoading = false
				this.creationLoadingMore = false
			}
		},

		async loadMoreCreations() {
			if (!this.creationHasMore || this.creationLoading || this.creationLoadingMore) return

			this.creationPage += 1
			await this.searchCreations(false)
		},

		normalizeCreation(item) {
			const materialType = Number(item.material_type || item.materialType || 1)
			const cover = item.cover_url || item.material_url || this.defaultImage
			const avatar = item.avatar || item.author_avatar || this.defaultAvatar

			return {
				creation_id: item.creation_id,
				user_id: item.user_id || item.userId || '',
				material_type: materialType,
				cover: cover,
				title: item.title || '未命名创作',
				username: item.username || item.author_name || '未知作者',
				avatar: avatar,
				digg_count: item.digg_count || 0,
				is_digg: !!item.is_digg
			}
		},

		handleCreationImageError(creation) {
			if (creation) {
				creation.cover = this.defaultImage
			}
		},

		goToCreationDetail(creation) {
			if (!creation || !creation.creation_id) return

			const creationId = encodeURIComponent(creation.creation_id)
			const userId = encodeURIComponent(creation.user_id || '')
			const isVideo = Number(creation.material_type) === 2
			const basePath = isVideo
				? '/pages/creation/creation_video'
				: '/pages/creation/creation_image'

			uni.navigateTo({
				url: basePath + '?creationId=' + creationId + '&userId=' + userId
			})
		},

		async toggleDigg(creation, index) {
			if (!creation || creation._digging) return

			creation._digging = true

			try {
				if (creation.is_digg) {
					await cancelDigg('creation', creation.creation_id)
					this.creationList[index].is_digg = false

					if (this.creationList[index].digg_count > 0) {
						this.creationList[index].digg_count -= 1
					}
				} else {
					await digg('creation', creation.creation_id)
					this.creationList[index].is_digg = true
					this.creationList[index].digg_count += 1
				}
			} catch (err) {
				console.error('点赞操作失败:', err)
				uni.showToast({ title: '操作失败', icon: 'none' })
			} finally {
				creation._digging = false
			}
		},

		async searchUsers(reset) {
			const kw = this.keyword.trim()
			if (!kw) {
				this.userList = []
				this.userHasMore = false
				return
			}

			if (this.userLoading || this.userLoadingMore) return

			if (reset) {
				this.userPage = 1
				this.userHasMore = true
				this.userList = []
				this.userLoading = true
			} else {
				this.userLoadingMore = true
			}

			try {
				const data = await searchUsers(kw, this.userPage)
				const list = data && data.user_infos ? data.user_infos : []
				const mapped = list.map(user => this.normalizeUser(user))

				if (reset) {
					this.userList = mapped
				} else {
					this.userList = this.userList.concat(mapped)
				}

				this.userHasMore = list.length > 0
			} catch (err) {
				console.error('搜索用户失败:', err)

				if (!reset && this.userPage > 1) {
					this.userPage -= 1
				}

				uni.showToast({ title: '搜索失败', icon: 'none' })
			} finally {
				this.userLoading = false
				this.userLoadingMore = false
			}
		},

		normalizeUser(user) {
			return {
				user_id: String(user.user_id || user.userId || ''),
				username: user.username || '未知用户',
				avatar: user.avatar && user.avatar !== '' ? user.avatar : this.defaultAvatar,
				follower_count: Number(user.follower_count || user.followerCount || 0),
				is_following: this.toBool(user.is_following || user.isFollowing),
				is_follower: this.toBool(user.is_follower || user.isFollower)
			}
		},

		async loadMoreUsers() {
			if (!this.userHasMore || this.userLoading || this.userLoadingMore) return

			this.userPage += 1
			await this.searchUsers(false)
		},

		isSelf(user) {
			const app = getApp()
			const me = app && app.globalData ? String(app.globalData.userId || '') : ''
			return String(user && user.user_id ? user.user_id : '') === me
		},

		goToUserPage(user) {
			if (!user) return

			if (this.isSelf(user)) {
				uni.navigateTo({ url: '/pages/user/my_profile_copy' })
				return
			}

			uni.navigateTo({
				url: '/pages/user/user_profile?userId=' + encodeURIComponent(String(user.user_id || ''))
			})
		},

		toBool(value) {
			if (value === true) return true
			if (value === false) return false
			if (value === 1 || value === '1') return true
			if (value === 0 || value === '0') return false
			return !!value
		},

		followBtnText(user) {
			const following = this.toBool(user.is_following)
			const follower = this.toBool(user.is_follower)

			if (following && follower) return '互相关注'
			if (following && !follower) return '已关注'
			if (!following && follower) return '+ 回关'
			return '+ 关注'
		},

		followBtnClass(user) {
			return this.toBool(user.is_following) ? 'following-btn' : 'follow-btn'
		},

		async onFollowBtnClick(user) {
			if (!user) return

			if (this.toBool(user.is_following)) {
				this.confirmUnfollow(user)
				return
			}

			await this.followUser(user)
		},

		async followUser(user) {
			const app = getApp()
			const userId = app && app.globalData ? app.globalData.userId : ''
			const ok = await follow(userId, user.user_id)

			if (ok) {
				user.is_following = true
				uni.showToast({ title: '关注成功', icon: 'success' })
			}
		},

		confirmUnfollow(user) {
			uni.showModal({
				title: '提示',
				content: '确定取消关注 ' + user.username + ' 吗？',
				success: res => {
					if (res.confirm) {
						this.unfollowUser(user)
					}
				}
			})
		},

		async unfollowUser(user) {
			const app = getApp()
			const userId = app && app.globalData ? app.globalData.userId : ''
			const ok = await unfollow(userId, user.user_id)

			if (ok) {
				user.is_following = false
				uni.showToast({ title: '已取消关注', icon: 'success' })
			}
		},

		formatFans(value) {
			const num = Number(value || 0)
			if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, '') + '万'
			return String(num)
		},

		formatNumber(value) {
			const num = Number(value || 0)
			if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
			if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
			return String(num)
		}
	}
}
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.container {
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

.safe-status-bar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 3002;
	background: #fefefe;
	pointer-events: none;
}

.search-wrapper {
	position: fixed;
	left: 0;
	right: 0;
	z-index: 3001;
	background: #fefefe;
	box-shadow: none;
	transform: translateZ(0);
}

.fixed-search-bar {
	display: flex;
	align-items: center;
	gap: 7px;
	padding-left: 10px;
	padding-right: 10px;
	box-sizing: border-box;
}

.back-button {
	width: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.back-icon {
	font-size: 18px;
	color: #333333;
	line-height: 1;
}

.search-input-container {
	flex: 1;
	display: flex;
	align-items: center;
	background: #ffffff;
	padding: 0 13px;
	gap: 6px;
	box-sizing: border-box;
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.075);
}

.search-icon {
	font-size: 16px;
	color: #9a9a9a;
	line-height: 1;
	flex-shrink: 0;
}

.search-input {
	flex: 1;
	height: 100%;
	font-size: 14px;
	font-weight: 400;
	color: #333333;
}

.search-input-container input {
	flex: 1;
	height: 100%;
	border: none;
	background: transparent;
	font-size: 14px;
	font-weight: 400;
	outline: none;
}

.clear-icon {
	width: 17px;
	height: 17px;
	background: #d6d6d6;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 10px;
	color: #ffffff;
	flex-shrink: 0;
}

.search-button {
	min-width: 56px;
	padding: 0 11px;
	background: rgba(253, 231, 209, 1);
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	box-shadow: 0 4px 14px rgba(253, 231, 209, 0.78);
	flex-shrink: 0;
}

.search-button:active {
	transform: scale(0.96);
}

.search-button-text {
	font-size: 13px;
	font-weight: 500;
	color: #8a5a2b;
}

.filter-bar {
	position: fixed;
	left: 0;
	right: 0;
	display: flex;
	background: #fefefe;
	z-index: 3000;
	box-sizing: border-box;
}

.filter-item {
	flex: 1;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
}

.filter-text {
	font-size: 14px;
	color: #666666;
	font-weight: 400;
}

.filter-item.active .filter-text {
	color: #8a5a2b;
	font-weight: 500;
}

.filter-indicator {
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 24px;
	height: 3px;
	background: rgba(253, 231, 209, 1);
	border-radius: 2px 2px 0 0;
}

.refresh-overlay {
	position: fixed;
	left: 0;
	right: 0;
	z-index: 2999;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	background: #fefefe;
	overflow: hidden;
	box-sizing: border-box;
	pointer-events: none;
	transition: height 0.12s ease, opacity 0.12s ease;
}

.refresh-overlay-text {
	font-size: 12px;
	color: #999999;
	font-weight: 400;
	line-height: 1;
}

.result-scroll {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1;
	background: #fefefe;
	box-sizing: border-box;
	overflow: hidden;
	overscroll-behavior-y: contain;
}

.scroll-content {
	will-change: transform;
}

.content-container {
	padding: 0 6px 10px;
	box-sizing: border-box;
}

.initial-loading {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80px 0;
}

.loading-spinner {
	width: 38px;
	height: 38px;
	border: 3px solid #f3f3f3;
	border-top-color: #667eea;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

.loading-spinner.small {
	width: 18px;
	height: 18px;
	border-width: 2px;
}

.loading-spinner.tiny {
	width: 14px;
	height: 14px;
	border-width: 2px;
	border-color: #f3f3f3;
	border-top-color: #d8a25d;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.loading-text {
	margin-top: 14px;
	font-size: 13px;
	font-weight: 400;
	color: #999999;
}

.creation-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	column-gap: 6px;
	row-gap: 10px;
}

.creation-card {
	background: #ffffff;
	border-radius: 10px;
	overflow: hidden;
	box-shadow: 0 1px 7px rgba(0, 0, 0, 0.06);
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
	object-fit: cover;
	object-position: center center;
}

.video-badge {
	position: absolute;
	top: 7px;
	right: 7px;
	width: 24px;
	height: 24px;
	background: rgba(0, 0, 0, 0.42);
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.video-badge-icon {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.94);
	line-height: 1;
	margin-left: 1px;
}

.card-content {
	padding: 7px 8px 6px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.card-title-container {
	min-height: 22px;
}

.card-title {
	font-size: 15px;
	font-weight: 400;
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
}

.like-icon.liked {
	color: #ff4d67;
}

.like-count {
	font-size: 14px;
	font-weight: 400;
	color: #888888;
}

.user-list {
	padding: 4px 0;
	background: #fefefe;
}

.user-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 14px;
	background: #fefefe;
	border-bottom: none;
	box-sizing: border-box;
}

.user-left {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 10px;
	overflow: hidden;
	min-width: 0;
}

.avatar {
	border: 1px solid #f0f0f0;
	flex-shrink: 0;
	background: #f3f3f3;
	box-sizing: border-box;
}

.user-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 3px;
	overflow: hidden;
	min-width: 0;
}

.user-name {
	font-size: 14px;
	font-weight: 500;
	color: #333333;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.user-fans {
	font-size: 11px;
	font-weight: 400;
	color: #888888;
	line-height: 1.2;
}

.user-right {
	flex-shrink: 0;
	margin-left: 8px;
}

.follow-btn,
.following-btn {
	height: 28px;
	min-width: 66px;
	padding: 0 12px;
	border-radius: 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.follow-btn {
	background: #ff4d67;
	box-shadow: 0 2px 8px rgba(255, 77, 103, 0.28);
}

.following-btn {
	background: #f0f0f0;
	box-shadow: none;
}

.follow-btn .btn-text {
	color: #ffffff;
}

.following-btn .btn-text {
	color: #666666;
}

.btn-text {
	font-size: 12px;
	font-weight: 500;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 100px 0;
}

.iconfont.empty-icon {
	font-size: 58px;
	color: #d8a25d !important;
	line-height: 1;
	margin-bottom: 16px;
}

.empty-text {
	font-size: 16px;
	font-weight: 500;
	color: #666666;
	margin-bottom: 8px;
}

.empty-hint {
	font-size: 13px;
	font-weight: 400;
	color: #999999;
	text-align: center;
}

.load-more-state {
	padding: 4px 0 0;
	margin: 0;
	text-align: center;
	font-size: 11px;
	line-height: 14px;
	color: #999999;
	font-weight: 400;
}

.bottom-spacer {
	width: 100%;
	flex-shrink: 0;
}

.loading-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20px 0;
}
</style>