<template>
	<view class="container">
		<page-meta page-style="overflow: hidden;" />

		<!-- 顶部固定安全栏：遮住状态栏 / 刘海区域 -->
		<view class="safe-status-bar" :style="safeStatusBarStyle"></view>

		<!-- 自定义悬浮刷新提示，不占用列表空间 -->
		<view
			v-if="pullDistance > 0 || isRefreshing"
			class="refresh-overlay"
			:style="refreshOverlayStyle"
		>
			<view class="loading-spinner tiny" v-if="isRefreshing"></view>
			<text class="refresh-overlay-text">{{ refresherText }}</text>
		</view>

		<!-- 内容滚动区：统一使用 scroll-view 承载下拉刷新和触底加载 -->
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
			<view class="scroll-content" :style="scrollContentStyle">
				<!-- 双列创作列表 -->
				<view class="creation-grid-container" :style="creationGridContainerStyle">
					<view v-if="loading && creations.length === 0" class="initial-loading">
						<view class="loading-spinner"></view>
						<text class="loading-text">精彩内容加载中...</text>
					</view>

					<view class="creation-grid" v-else-if="creations.length > 0">
						<view
							class="creation-card"
							v-for="(creation, index) in creations"
							:key="'creation-' + creation.creation_id + '-' + index"
							:style="cardStyle"
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

								<view class="video-badge" v-if="isVideoCreation(creation)">
									<text class="video-badge-icon">▶</text>
								</view>
							</view>

							<view class="card-content" :style="cardContentStyle">
								<view class="card-title-container">
									<text class="card-title">{{ creation.title || '未命名作品' }}</text>
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

									<view class="card-likes" @click.stop="toggleDigg(creation, index)">
										<text
											class="iconfont like-icon"
											:class="creation.is_digg ? 'icon-xihuan liked' : 'icon-xihuan1'"
										></text>
										<text class="like-count">{{ formatNumber(creation.likes) }}</text>
									</view>
								</view>
							</view>
						</view>
					</view>

					<view v-else class="empty-state">
						<text class="iconfont icon-neirongchuangzuo empty-icon"></text>
						<text class="empty-text">暂无创作内容</text>
						<text class="empty-hint"></text>
					</view>

					<view v-if="loading && creations.length > 0" class="load-more-state">加载中...</view>
					<view v-else-if="!hasMore && creations.length > 0" class="load-more-state">没有更多了</view>
				</view>

				<view v-if="creations.length > 0" class="bottom-spacer" :style="bottomSpacerStyle"></view>
			</view>
		</scroll-view>

		<custom-tabbar active-path="pages/creation/friend" />
	</view>
</template>

<script>
import { getCreationsByFriend } from '@/request/creation.js'
import { digg, cancelDigg } from '@/request/action.js'

const GRID_PADDING_X = 6
const GRID_GAP = 6
const PAGE_TOP_PADDING = 10
const GRID_BOTTOM_PADDING = 2
const MIN_TABBAR_BASE_HEIGHT = 46
const MAX_TABBAR_BASE_HEIGHT = 52
const LOAD_MORE_BOTTOM_GAP = 14

// 创作卡片样式同步首页：高:宽 = 7:5，封面 1:1
const CARD_ASPECT_WIDTH = 5
const CARD_ASPECT_HEIGHT = 7

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
			creations: [],
			loading: false,
			currentPage: 1,
			hasMore: true,

			isRefreshing: false,
			scrollTop: 0,
			pulling: false,
			pullStartY: 0,
			pullDistance: 0,

			statusBarHeight: 0,
			windowWidth: 375,
			windowHeight: 667,
			safeBottom: 0,
			tabbarBaseHeight: 50,
			tabbarTotalHeight: 50,

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

		creationGridContainerStyle() {
			return (
				'padding-top:' + (this.statusBarHeight + PAGE_TOP_PADDING) + 'px;' +
				'padding-left:' + GRID_PADDING_X + 'px;' +
				'padding-right:' + GRID_PADDING_X + 'px;' +
				'padding-bottom:' + GRID_BOTTOM_PADDING + 'px;'
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
			const top = this.statusBarHeight

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
		},

		cardStyle() {
			return 'height:' + this.cardHeight + 'px;'
		},

		imageWrapperStyle() {
			return 'height:' + this.imageHeight + 'px;'
		},

		cardContentStyle() {
			return 'height:' + this.cardContentHeight + 'px;'
		}
	},

	onLoad() {
		this.initCardLayout()
		this.loadInitialData()
	},

	onShow() {
		this.initCardLayout()
	},


	methods: {
		onContentScroll(e) {
			this.scrollTop = Number(e?.detail?.scrollTop || 0)
		},

		getTouchY(e) {
			const touch = e?.touches?.[0] || e?.changedTouches?.[0] || {}
			return Number(touch.clientY ?? touch.pageY ?? 0)
		},

		onScrollTouchStart(e) {
			if (this.loading || this.isRefreshing) return

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

		async refreshList() {
			if (this.loading || this.isRefreshing) {
				this.pullDistance = 0
				return
			}

			this.isRefreshing = true
			this.pullDistance = PULL_TRIGGER_DISTANCE

			try {
				await this.loadInitialData()
			} finally {
				this.isRefreshing = false
				this.pullDistance = 0
			}
		},

		initCardLayout() {
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
				this.tabbarBaseHeight = clamp(
					Math.floor(windowWidth * 0.132),
					MIN_TABBAR_BASE_HEIGHT,
					MAX_TABBAR_BASE_HEIGHT
				)
				this.tabbarTotalHeight = this.tabbarBaseHeight + this.safeBottom

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
			} catch (err) {
				this.statusBarHeight = 0
				this.windowWidth = 375
				this.windowHeight = 667
				this.safeBottom = 0
				this.tabbarBaseHeight = 50
				this.tabbarTotalHeight = 50

				this.cardWidth = 176
				this.cardHeight = 246
				this.imageHeight = 176
				this.cardContentHeight = 70
			}
		},

		async loadInitialData() {
			this.loading = true
			this.currentPage = 1
			this.hasMore = true

			try {
				const list = await this.fetchPage(this.currentPage)
				this.creations = list
				this.hasMore = list.length > 0
			} catch (err) {
				console.error('初始数据加载失败：', err)
				uni.showToast({ title: '加载失败，请重试', icon: 'none' })
			} finally {
				this.loading = false
			}
		},

		async loadMore() {
			if (!this.hasMore) return

			this.loading = true
			const nextPage = this.currentPage + 1

			try {
				const list = await this.fetchPage(nextPage)

				if (!list.length) {
					this.hasMore = false
				} else {
					this.creations = this.creations.concat(list)
					this.currentPage = nextPage
				}
			} catch (err) {
				console.error('加载更多失败：', err)
				uni.showToast({ title: '加载更多失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},

		async fetchPage(page) {
			const res = await getCreationsByFriend(page)
			const rawList = res && Array.isArray(res.creations) ? res.creations : []
			if (!rawList.length) return []

			return rawList.map(item => {
				const materialType = Number(item.material_type || item.materialType || 1)

				return {
					creation_id: item.creation_id,
					user_id: item.user_id || item.userId || '',
					material_type: materialType,
					image: item.cover_url || item.material_url || this.defaultImage,
					title: item.title || '未命名作品',
					type: materialType === 2 ? 'video' : 'image',
					likes: item.digg_count || 0,
					is_digg: !!item.is_digg,
					author: {
						avatar: item.avatar || this.defaultAvatar,
						name: item.username || '未知作者'
					},
					raw: item
				}
			})
		},

		handleImageError(creation) {
			if (creation) {
				creation.image = this.defaultImage
			}
		},

		isVideoCreation(creation) {
			if (!creation) return false
			return creation.type === 'video' || Number(creation.material_type) === 2
		},

		goToCreationDetail(creation) {
			if (!creation || !creation.creation_id) return

			const creationId = encodeURIComponent(creation.creation_id)
			const userId = encodeURIComponent(creation.user_id || '')
			const basePath = this.isVideoCreation(creation)
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
					this.creations[index].is_digg = false

					if (this.creations[index].likes > 0) {
						this.creations[index].likes -= 1
					}
				} else {
					await digg('creation', creation.creation_id)
					this.creations[index].is_digg = true
					this.creations[index].likes += 1
				}
			} catch (err) {
				console.error('点赞操作失败:', err)
				uni.showToast({
					title: '操作失败，请稍后重试',
					icon: 'none'
				})
			} finally {
				creation._digging = false
			}
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
	z-index: 120;
	background: #fefefe;
	pointer-events: none;
}

.refresh-overlay {
	position: fixed;
	left: 0;
	right: 0;
	z-index: 110;
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

.creation-grid-container {
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
}

.like-icon.liked {
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
</style>