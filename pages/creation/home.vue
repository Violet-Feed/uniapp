<template>
	<view class="container">
		<page-meta page-style="overflow: hidden;" />

		<!-- 顶部固定安全栏：遮住状态栏 / 刘海区域 -->
		<view class="safe-status-bar" :style="safeStatusBarStyle"></view>

		<!-- 搜索区域：固定不动 -->
		<view class="search-wrapper" :style="searchWrapperStyle">
			<view class="fixed-search-bar" :style="fixedSearchBarStyle">
				<view class="search-input-container" :style="searchInputContainerStyle">
					<text class="iconfont icon-sousuo search-icon"></text>

					<input
						v-model="keyword"
						class="search-input"
						type="text"
						placeholder="搜索你感兴趣的创作..."
						confirm-type="search"
						:adjust-position="false"
						cursor-spacing="12"
						@focus="handleSearchFocus"
						@blur="handleSearchBlur"
						@confirm="goToSearchPage"
					/>

					<text v-if="keyword" class="clear-icon" @click.stop="clearKeyword">✕</text>
				</view>

				<view class="search-button" :style="searchButtonStyle" @click="goToSearchPage">
					<text class="search-button-text">搜索</text>
				</view>
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
			class="creation-scroll"
			scroll-y
			:lower-threshold="120"
			@scroll="onContentScroll"
			@touchstart="onScrollTouchStart"
			@touchmove="onScrollTouchMove"
			@touchend="onScrollTouchEnd"
			@touchcancel="onScrollTouchEnd"
			@scrolltolower="loadMore"
		>
			<!-- 下拉时移动的是这一层，因此创作列表会跟着往下动 -->
			<view class="scroll-content" :style="scrollContentStyle">
				<view class="creation-grid-container" :style="creationGridContainerStyle">
					<view v-if="loading && creations.length === 0" class="initial-loading">
						<view class="loading-spinner"></view>
						<text class="loading-text">精彩内容加载中...</text>
					</view>

					<view class="creation-grid" v-else-if="creations.length > 0">
						<view
							class="creation-card"
							:style="cardStyle"
							v-for="(creation, index) in creations"
							:key="'creation-' + creation.creation_id + '-' + index"
							@click="goToCreationDetail(creation)"
						>
							<view class="image-wrapper" :style="imageWrapperStyle">
								<image
									class="card-image"
									:src="creation.image || defaultImage"
									mode="aspectFill"
									@error="handleImageError(creation)"
									lazy-load
								></image>

								<view class="video-badge" v-if="creation.type === 'video'">
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
											:src="creation.author.avatar || defaultAvatar"
											mode="aspectFill"
											lazy-load
										></image>
										<text class="author-name">{{ creation.author.name || '未知作者' }}</text>
									</view>

									<view class="card-likes" @click.stop="toggleDigg(index)">
										<text
											class="iconfont like-icon"
											:class="creation.is_digg ? 'icon-xihuan liked' : 'icon-xihuan1'"
										></text>
										<text class="like-count">
											{{ formatNumber(creation.likes) }}
										</text>
									</view>
								</view>
							</view>
						</view>
					</view>

					<view v-else-if="!loading" class="empty-state">
						<text class="iconfont icon-neirongchuangzuo empty-icon"></text>
						<text class="empty-text">暂无创作内容</text>
						<text class="empty-hint">快去创作第一个作品吧！</text>
					</view>

					<view v-if="loading && creations.length > 0" class="load-more-state">加载中...</view>
					<view v-else-if="!hasMore && creations.length > 0" class="load-more-state">没有更多了</view>
				</view>

				<view v-if="creations.length > 0" class="bottom-spacer" :style="bottomSpacerStyle"></view>
			</view>
		</scroll-view>

		<custom-tabbar active-path="pages/creation/home" />
	</view>
</template>

<script>
import { getCreationsByRec } from '@/request/creation.js'
import { digg, cancelDigg } from '@/request/action.js'

const GRID_PADDING_X = 6
const GRID_GAP = 6
const GRID_BOTTOM_PADDING = 2

// 整体卡片高宽比：高:宽 = 7:5
const CARD_ASPECT_WIDTH = 5
const CARD_ASPECT_HEIGHT = 7

// 封面固定 1:1；信息栏高度 = 卡片高度 - 封面高度
const SEARCH_INPUT_HEIGHT_MIN = 36
const SEARCH_INPUT_HEIGHT_MAX = 40
const SEARCH_VERTICAL_PADDING_MIN = 6
const SEARCH_VERTICAL_PADDING_MAX = 8

const MIN_TABBAR_BASE_HEIGHT = 46
const MAX_TABBAR_BASE_HEIGHT = 52
const LOAD_MORE_BOTTOM_GAP = 14
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
			creations: [],
			loading: false,
			currentPage: 1,
			hasMore: true,

			searchFocused: false,
			isRefreshing: false,

			scrollTop: 0,
			pulling: false,
			pullStartY: 0,
			pullDistance: 0,

			statusBarHeight: 0,
			windowWidth: 375,
			safeBottom: 0,
			tabbarBaseHeight: 50,
			tabbarTotalHeight: 50,

			searchInputHeight: 38,
			searchVerticalPadding: 7,
			searchAreaHeight: 52,

			defaultImage: '/static/images/default.png',
			defaultAvatar: '/static/user_avatar.png',

			cardWidth: 176,
			cardHeight: 246,
			imageHeight: 176,
			cardContentHeight: 70
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

		creationGridContainerStyle() {
			return (
				'padding-top:' + (this.statusBarHeight + this.searchAreaHeight) + 'px;' +
				'padding-left:' + GRID_PADDING_X + 'px;' +
				'padding-right:' + GRID_PADDING_X + 'px;' +
				'padding-bottom:' + GRID_BOTTOM_PADDING + 'px;'
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
			const top = this.statusBarHeight + this.searchAreaHeight

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
			const height = this.tabbarTotalHeight + LOAD_MORE_BOTTOM_GAP
			return 'height:' + height + 'px;'
		}
	},

	onLoad() {
		this.initLayout()
		this.fetchCreations(1, false)
	},

	onShow() {
		this.initLayout()
	},

	methods: {
		initLayout() {
			try {
				const sys = uni.getSystemInfoSync()

				const windowWidth = Number(sys.windowWidth || 375)
				const statusBarHeight = Number(sys.statusBarHeight || 0)
				const safeAreaInsets = sys.safeAreaInsets || {}

				this.windowWidth = windowWidth
				this.statusBarHeight = statusBarHeight
				this.safeBottom = Number(safeAreaInsets.bottom || 0)
				this.tabbarBaseHeight = clamp(
					Math.floor(windowWidth * 0.132),
					MIN_TABBAR_BASE_HEIGHT,
					MAX_TABBAR_BASE_HEIGHT
				)
				this.tabbarTotalHeight = this.tabbarBaseHeight + this.safeBottom

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

				const totalPadding = GRID_PADDING_X * 2
				const availableWidth = windowWidth - totalPadding - GRID_GAP
				const cardWidth = Math.floor(availableWidth / 2)

				// 整卡高宽比 7:5
				const cardHeight = Math.floor(cardWidth * CARD_ASPECT_HEIGHT / CARD_ASPECT_WIDTH)

				// 封面 1:1
				const imageHeight = cardWidth

				// 信息栏占剩余高度
				const contentHeight = Math.max(0, cardHeight - imageHeight)

				this.cardWidth = cardWidth
				this.cardHeight = cardHeight
				this.imageHeight = imageHeight
				this.cardContentHeight = contentHeight
			} catch (err) {
				this.statusBarHeight = 0
				this.windowWidth = 375
				this.safeBottom = 0
				this.tabbarBaseHeight = 50
				this.tabbarTotalHeight = 50

				this.searchInputHeight = 38
				this.searchVerticalPadding = 7
				this.searchAreaHeight = 52

				this.cardWidth = 176
				this.cardHeight = 246
				this.imageHeight = 176
				this.cardContentHeight = 70
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

		onContentScroll(e) {
			this.scrollTop = Number(e?.detail?.scrollTop || 0)
		},

		getTouchY(e) {
			const touch = e?.touches?.[0] || e?.changedTouches?.[0] || {}
			return Number(touch.clientY ?? touch.pageY ?? 0)
		},

		onScrollTouchStart(e) {
			if (this.loading || this.isRefreshing) return

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
			if (!this.pulling || this.loading || this.isRefreshing) return

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

			await this.refreshList()
		},

		async fetchCreations(page = 1, append = false) {
			if (this.loading) return

			this.loading = true

			try {
				const res = await getCreationsByRec(getApp().globalData.userId)

				const list = Array.isArray(res)
					? res
					: (res && (res.creations || res.list))
						? (res.creations || res.list)
						: []

				const mapped = list.map(item => {
					const materialType = Number(item.material_type)
					const isVideo = materialType === 2

					return {
						creation_id: item.creation_id,
						user_id: item.user_id,
						image: item.cover_url || item.material_url || this.defaultImage,
						title: item.title || '未命名作品',
						author: {
							avatar: item.avatar || item.author_avatar || this.defaultAvatar,
							name: item.username || item.author_name || '未知作者',
							user_id: item.user_id
						},
						type: isVideo ? 'video' : 'image',
						material_type: materialType,
						likes: item.digg_count || item.like_count || 0,
						is_digg: !!item.is_digg
					}
				})

				if (append) {
					this.creations = this.creations.concat(mapped)
					this.currentPage = page
				} else {
					this.creations = mapped
					this.currentPage = page
				}

				const pageSize = 20
				this.hasMore = list.length >= pageSize && mapped.length > 0
			} catch (err) {
				console.error('加载创作列表失败：', err)

				if (append && this.currentPage > 1) {
					this.currentPage -= 1
				}

				uni.showToast({
					title: '加载失败，请重试',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},

		async refreshList() {
			if (this.loading || this.isRefreshing) {
				this.pullDistance = 0
				return
			}

			this.isRefreshing = true
			this.pullDistance = PULL_TRIGGER_DISTANCE
			this.hasMore = true

			await this.fetchCreations(1, false)

			this.isRefreshing = false
			this.pullDistance = 0
		},

		async loadMore() {
			if (this.loading || this.isRefreshing || !this.hasMore) return

			const nextPage = this.currentPage + 1
			await this.fetchCreations(nextPage, true)
		},

		handleImageError(creation) {
			if (creation) {
				creation.image = this.defaultImage
			}
		},

		goToSearchPage() {
			const kw = this.keyword.trim()

			if (kw) {
				uni.navigateTo({
					url: '/pages/creation/search?keyword=' + encodeURIComponent(kw)
				})
				return
			}

			uni.showToast({
				title: '请输入搜索词',
				icon: 'none'
			})
		},

		clearKeyword() {
			this.keyword = ''
		},

		async toggleDigg(index) {
			const item = this.creations[index]
			if (!item || item._digging) return

			item._digging = true

			try {
				if (item.is_digg) {
					await cancelDigg('creation', item.creation_id)
					item.is_digg = false
					if (item.likes > 0) item.likes -= 1
				} else {
					await digg('creation', item.creation_id)
					item.is_digg = true
					item.likes += 1
				}
			} catch (e) {
				console.error('点赞操作失败：', e)

				uni.showToast({
					title: '操作失败',
					icon: 'none'
				})
			} finally {
				item._digging = false
			}
		},

		goToCreationDetail(creation) {
			if (!creation || !creation.creation_id) return

			const creationId = encodeURIComponent(creation.creation_id)
			const userId = encodeURIComponent(
				creation.user_id || creation.author.user_id || ''
			)

			const isVideo = creation.type === 'video' || Number(creation.material_type) === 2
			const basePath = isVideo
				? '/pages/creation/creation_video'
				: '/pages/creation/creation_image'

			uni.navigateTo({
				url: basePath + '?creationId=' + creationId + '&userId=' + userId
			})
		},

		formatNumber(num) {
			const n = Number(num || 0)

			if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
			if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'

			return n.toString()
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

.refresh-overlay {
	position: fixed;
	left: 0;
	right: 0;
	z-index: 3000;
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

.creation-scroll {
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
	min-width: 58px;
	padding: 0 12px;
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

.creation-grid-container {
	padding: 0 6px 10px;
	box-sizing: border-box;
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

.initial-loading {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80px 0;
}

.loading-spinner {
	width: 40px;
	height: 40px;
	border: 3px solid #f3f3f3;
	border-top-color: #d8a25d;
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
	margin-top: 16px;
	font-size: 14px;
	font-weight: 400;
	color: #999999;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 100px 0;
}

.empty-icon {
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
	background: #fefefe;
}
</style>