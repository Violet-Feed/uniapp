<template>
	<view class="follow-list-container">
		<view class="header" :style="headerStyle">
			<view class="header-content" :style="headerContentStyle">
				<view class="back-btn" @click="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="relation-tabs" :style="relationTabsStyle">
					<view
						v-for="item in visibleTabs"
						:key="item.key"
						class="relation-tab"
						:class="{ active: activeTab === item.key }"
						@click="changeTab(item.key)"
					>
						<text class="relation-tab-text" :style="tabTextStyle">{{ item.text }}</text>
						<view v-if="activeTab === item.key" class="relation-tab-indicator"></view>
					</view>
				</view>

				<view class="header-right"></view>
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
			class="user-list-scroll"
			:style="scrollStyle"
			scroll-y
			:lower-threshold="120"
			@scroll="onListScroll"
			@scrolltolower="loadMore"
			@touchstart="onScrollTouchStart"
			@touchmove="onScrollTouchMove"
			@touchend="onScrollTouchEnd"
			@touchcancel="onScrollTouchEnd"
		>
			<view class="scroll-content" :style="scrollContentStyle">
			<view class="user-list" v-if="userList.length > 0">
				<view
					class="user-item"
					:style="userItemStyle"
					v-for="(user, index) in userList"
					:key="String(user.user_id || index)"
				>
					<view class="user-left" @click="goToUserPage(user)">
						<image
							class="avatar"
							:style="avatarStyle"
							:src="user.avatar || defaultAvatar"
							mode="aspectFill"
						></image>

						<view class="user-info">
							<text class="user-name" :style="userNameStyle">{{ user.username }}</text>
						</view>
					</view>

					<view v-if="!isSelf(user)" class="user-right">
						<view
							:class="followBtnClass(user)"
							:style="followBtnStyle"
							@click.stop="onFollowBtnClick(user)"
						>
							<text class="btn-text" :style="btnTextStyle">{{ followBtnText(user) }}</text>
						</view>
					</view>
				</view>
			</view>

			<view v-if="!loading && userList.length === 0" class="empty-state">
				<text class="iconfont empty-icon" :class="emptyIconClass" :style="emptyIconStyle"></text>
				<text class="empty-text" :style="emptyTextStyle">{{ emptyText }}</text>
				<text class="empty-hint" :style="emptyHintStyle">{{ emptyHint }}</text>
			</view>

			<view v-if="userList.length > 0" class="footer" :style="footerStyle">
				<text v-if="loadingMore">加载中...</text>
				<text v-else-if="!hasMore">没有更多了</text>
			</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import {
	follow,
	unfollow,
	getFollowerList,
	getFollowingList,
	getFriendList
} from '@/request/action.js'

const PAGE_SIZE = 20

const PULL_TRIGGER_DISTANCE = 64
const PULL_MAX_DISTANCE = 92
const PULL_MOVE_RATIO = 0.62
const REFRESH_HOLD_OFFSET = 42

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value))
}

const TAB_LIST = [
	{
		key: 'friend',
		text: '互关',
		selfOnly: true
	},
	{
		key: 'following',
		text: '关注'
	},
	{
		key: 'follower',
		text: '粉丝'
	}
]

export default {
	data() {
		return {
			userId: '',
			activeTab: 'following',
			tabs: TAB_LIST,
			isSelfOwner: false,

			page: 1,
			hasMore: true,
			pageSize: PAGE_SIZE,

			userList: [],
			loading: false,
			loadingMore: false,
			isRefreshing: false,

			scrollTop: 0,
			pulling: false,
			pullStartY: 0,
			pullDistance: 0,

			windowHeight: 667,
			windowWidth: 375,
			statusBarHeight: 0,
			safeBottom: 0,

			headerContentHeight: 44,
			headerHeight: 44,

			userItemHeight: 70,
			avatarSize: 46,

			followBtnHeight: 32,
			followBtnMinWidth: 78,

			tabFontSize: 15,
			backIconFontSize: 19,
			userNameFontSize: 17,
			followBtnFontSize: 14,
			emptyIconFontSize: 58,
			emptyTextFontSize: 16,
			emptyHintFontSize: 14,
			footerFontSize: 13,

			defaultAvatar: '/static/user_avatar.png'
		}
	},

	computed: {
		headerStyle() {
			return 'height:' + this.headerHeight + 'px;'
		},

		headerContentStyle() {
			return (
				'height:' + this.headerContentHeight + 'px;' +
				'margin-top:' + this.statusBarHeight + 'px;'
			)
		},

		scrollStyle() {
			const height = Math.max(0, this.windowHeight - this.headerHeight)
			return 'top:' + this.headerHeight + 'px;height:' + height + 'px;'
		},

		userItemStyle() {
			return 'height:' + this.userItemHeight + 'px;'
		},

		avatarStyle() {
			const radius = Math.floor(this.avatarSize / 2)
			return (
				'width:' + this.avatarSize + 'px;' +
				'height:' + this.avatarSize + 'px;' +
				'border-radius:' + radius + 'px;'
			)
		},

		followBtnStyle() {
			return (
				'height:' + this.followBtnHeight + 'px;' +
				'min-width:' + this.followBtnMinWidth + 'px;' +
				'border-radius:' + Math.floor(this.followBtnHeight / 2) + 'px;'
			)
		},

		tabTextStyle() {
			return 'font-size:' + this.tabFontSize + 'px;'
		},

		backIconStyle() {
			return 'font-size:' + this.backIconFontSize + 'px;'
		},

		userNameStyle() {
			return 'font-size:' + this.userNameFontSize + 'px;'
		},

		btnTextStyle() {
			return 'font-size:' + this.followBtnFontSize + 'px;'
		},

		emptyIconStyle() {
			return 'font-size:' + this.emptyIconFontSize + 'px;'
		},

		emptyTextStyle() {
			return 'font-size:' + this.emptyTextFontSize + 'px;'
		},

		emptyHintStyle() {
			return 'font-size:' + this.emptyHintFontSize + 'px;'
		},

		footerStyle() {
			return 'font-size:' + this.footerFontSize + 'px;'
		},

		emptyIconClass() {
			if (this.activeTab === 'following') return 'icon-wode'
			if (this.activeTab === 'follower') return 'icon-wode'
			return 'icon-qunliaox'
		},

		emptyText() {
			if (this.activeTab === 'following') return '还没有关注任何人'
			if (this.activeTab === 'follower') return '还没有粉丝'
			return '还没有互关好友'
		},

		emptyHint() {
			if (this.activeTab === 'following') return '去发现有趣的人吧！'
			if (this.activeTab === 'follower') return '创作优质内容，吸引更多人关注吧！'
			return '快去关注你感兴趣的人吧！'
		},

		pullVisualOffset() {
			if (this.isRefreshing) return REFRESH_HOLD_OFFSET

			return Math.min(
				REFRESH_HOLD_OFFSET,
				Math.round(this.pullDistance * PULL_MOVE_RATIO)
			)
		},

		scrollContentStyle() {
			const transition = this.pulling ? 'none' : 'transform 0.16s ease'

			return [
				'transform: translateY(' + this.pullVisualOffset + 'px)',
				'transition:' + transition
			].join(';')
		},

		refreshOverlayStyle() {
			const top = this.headerHeight
			const active = this.isRefreshing

			const height = active
				? 34
				: Math.min(34, Math.max(0, Math.round(this.pullDistance * 0.48)))

			const opacity = active
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
		
		visibleTabs() {
			return this.tabs.filter(item => !item.selfOnly || this.isSelfOwner)
		},
		
		relationTabsStyle() {
			if (this.isSelfOwner) {
				return 'width:172px;gap:14px;'
			}
		
			return 'width:118px;gap:18px;'
		}
	},

	onLoad(options) {
		this.initResponsiveLayout()
	
		this.userId = String(options.userId || getApp().globalData.userId || '')
		this.isSelfOwner = String(this.userId) === String(getApp().globalData.userId || '')
	
		const defaultTab = this.isSelfOwner ? 'friend' : 'following'
		const tab = String(options.tab || options.type || defaultTab)
	
		if (this.isValidVisibleTab(tab)) {
			this.activeTab = tab
		} else {
			this.activeTab = defaultTab
		}
	
		this.loadUserList(true)
	},

	onShow() {
		this.initResponsiveLayout()
	},

	methods: {

		onListScroll(e) {
			this.scrollTop = Number(e?.detail?.scrollTop || 0)
		},

		getTouchY(e) {
			const touch = e?.touches?.[0] || e?.changedTouches?.[0] || {}
			return Number(touch.clientY ?? touch.pageY ?? 0)
		},

		onScrollTouchStart(e) {
			if (this.loading || this.loadingMore || this.isRefreshing) return

			this.pullStartY = this.getTouchY(e)
			this.pulling = this.scrollTop <= 2
			this.pullDistance = 0
		},

		onScrollTouchMove(e) {
			if (!this.pulling || this.loading || this.loadingMore || this.isRefreshing) return

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

			await this.onRefresh()
		},
		initResponsiveLayout() {
			try {
				const sys = uni.getSystemInfoSync()
				const windowHeight = Number(sys.windowHeight || 667)
				const windowWidth = Number(sys.windowWidth || 375)
				const statusBarHeight = Number(sys.statusBarHeight || 0)
				const safeAreaInsets = sys.safeAreaInsets || {}

				this.windowHeight = windowHeight
				this.windowWidth = windowWidth
				this.statusBarHeight = statusBarHeight
				this.safeBottom = Number(safeAreaInsets.bottom || 0)

				const smallScreenBoost = windowWidth <= 360 ? 1 : 0
				const tinyScreenBoost = windowWidth <= 330 ? 1 : 0

				this.headerContentHeight = clamp(
					Math.floor(windowWidth * 0.112),
					42,
					48
				)

				this.headerHeight = this.statusBarHeight + this.headerContentHeight

				this.userItemHeight = clamp(
					Math.floor(windowWidth * 0.188),
					68,
					80
				)

				this.avatarSize = clamp(
					Math.floor(this.userItemHeight * 0.68),
					44,
					54
				)

				this.followBtnHeight = clamp(
					Math.floor(this.userItemHeight * 0.46),
					30,
					35
				)

				this.followBtnMinWidth = clamp(
					Math.floor(windowWidth * 0.21),
					74,
					90
				)

				this.tabFontSize = clamp(
					Math.floor(this.headerContentHeight * 0.34) + smallScreenBoost,
					15,
					17
				)

				this.backIconFontSize = clamp(
					Math.floor(this.headerContentHeight * 0.45) + smallScreenBoost,
					18,
					21
				)

				this.userNameFontSize = clamp(
					Math.floor(this.userItemHeight * 0.235) + smallScreenBoost + tinyScreenBoost,
					16,
					18
				)

				this.followBtnFontSize = clamp(
					Math.floor(this.followBtnHeight * 0.42) + smallScreenBoost,
					13,
					15
				)

				this.emptyIconFontSize = clamp(
					Math.floor(windowWidth * 0.15),
					54,
					64
				)

				this.emptyTextFontSize = clamp(
					Math.floor(windowWidth * 0.04) + smallScreenBoost,
					15,
					17
				)

				this.emptyHintFontSize = clamp(
					Math.floor(windowWidth * 0.035) + smallScreenBoost,
					13,
					15
				)

				this.footerFontSize = clamp(
					Math.floor(windowWidth * 0.032) + smallScreenBoost,
					12,
					14
				)
			} catch (err) {
				this.windowHeight = 667
				this.windowWidth = 375
				this.statusBarHeight = 0
				this.safeBottom = 0

				this.headerContentHeight = 44
				this.headerHeight = 44

				this.userItemHeight = 70
				this.avatarSize = 46
				this.followBtnHeight = 32
				this.followBtnMinWidth = 78

				this.tabFontSize = 15
				this.backIconFontSize = 19
				this.userNameFontSize = 17
				this.followBtnFontSize = 14
				this.emptyIconFontSize = 58
				this.emptyTextFontSize = 16
				this.emptyHintFontSize = 14
				this.footerFontSize = 13
			}
		},

		isValidTab(tab) {
			return TAB_LIST.some(item => item.key === tab)
		},
		
		isValidVisibleTab(tab) {
			return this.visibleTabs.some(item => item.key === tab)
		},

		changeTab(tab) {
			if (!this.isValidVisibleTab(tab)) return
			if (this.activeTab === tab) return

			this.activeTab = tab
			this.loadUserList(true)
		},

		async loadUserList(reset = false) {
			if (this.loading || this.loadingMore) return
			if (!reset && !this.hasMore) return

			if (reset) {
				this.page = 1
				this.hasMore = true
				this.loading = true
				this.userList = []
			} else {
				this.loadingMore = true
			}

			const payload = {
				userId: this.userId,
				page: this.page
			}

			let res = null

			if (this.activeTab === 'following') {
				res = await getFollowingList(payload)
			} else if (this.activeTab === 'follower') {
				res = await getFollowerList(payload)
			} else {
				res = await getFriendList(payload)
			}

			const list = res && Array.isArray(res.user_infos) ? res.user_infos : []

			if (list.length === 0) {
				if (reset) {
					this.userList = []
					this.page = 1
				}

				this.hasMore = false
				this.loading = false
				this.loadingMore = false
				this.isRefreshing = false
				return
			}

			const mapped = list.map(user => this.normalizeUser(user))

			if (reset) {
				this.userList = mapped
			} else {
				this.userList = this.userList.concat(mapped)
			}

			this.hasMore = list.length >= this.pageSize
			this.page += 1

			this.loading = false
			this.loadingMore = false
			this.isRefreshing = false
		},

		loadMore() {
			this.loadUserList(false)
		},

		async onRefresh() {
			if (this.loading || this.loadingMore || this.isRefreshing) {
				this.pullDistance = 0
				return
			}

			this.isRefreshing = true
			this.pullDistance = PULL_TRIGGER_DISTANCE

			try {
				await this.loadUserList(true)
			} finally {
				this.isRefreshing = false
				this.pullDistance = 0
			}
		},

		normalizeUser(user) {
			const rawFollowing = user.is_following ?? user.isFollowing
			const rawFollower = user.is_follower ?? user.isFollower

			return {
				user_id: String(user.user_id || user.userId || ''),
				username: user.username || '未知用户',
				avatar: user.avatar && user.avatar !== '' ? user.avatar : this.defaultAvatar,

				is_following: this.hasBoolValue(rawFollowing)
					? this.toBool(rawFollowing)
					: (this.activeTab === 'following' || this.activeTab === 'friend'),

				is_follower: this.hasBoolValue(rawFollower)
					? this.toBool(rawFollower)
					: (this.activeTab === 'follower' || this.activeTab === 'friend')
			}
		},

		hasBoolValue(value) {
			return value !== null && value !== undefined && value !== ''
		},

		toBool(value) {
			if (value === true) return true
			if (value === false) return false
			if (value === 1 || value === '1') return true
			if (value === 0 || value === '0') return false
			if (typeof value === 'string') return value.toLowerCase() === 'true'
			return !!value
		},

		isSelf(user) {
			const me = String(getApp().globalData.userId || '')
			return String(user && user.user_id ? user.user_id : '') === me
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
			if (!user || !user.user_id) return

			if (this.toBool(user.is_following)) {
				this.confirmUnfollow(user)
				return
			}

			await this.followUser(user)
		},

		async followUser(user) {
			const me = getApp().globalData.userId
			const ok = await follow(me, user.user_id)

			if (ok) {
				user.is_following = true
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
			const me = getApp().globalData.userId
			const ok = await unfollow(me, user.user_id)

			if (ok) {
				user.is_following = false
			}
		},

		goToUserPage(user) {
			const uid = String(user && user.user_id ? user.user_id : '')
			if (!uid) return

			if (this.isSelf(user)) {
				uni.navigateTo({
					url: '/pages/user/my_profile_copy'
				})
				return
			}

			uni.navigateTo({
				url: '/pages/user/user_profile?userId=' + encodeURIComponent(uid)
			})
		},

		goBack() {
			uni.navigateBack()
		}
	}
}
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.follow-list-container {
	height: 100vh;
	background: #fdfdfd;
	position: relative;
	overflow: hidden;
	font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.header {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 20;
	background: transparent;
	box-sizing: border-box;
}

.header-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-left: 10px;
	padding-right: 10px;
	box-sizing: border-box;
}

.back-btn {
	width: 34px;
	height: 34px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.back-icon {
	line-height: 1;
	color: #222;
	font-weight: 400;
}

.header-right {
	width: 34px;
	height: 34px;
	flex-shrink: 0;
}


.refresh-overlay {
	position: fixed;
	left: 0;
	right: 0;
	z-index: 19;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	background: #fdfdfd;
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

.scroll-content {
	will-change: transform;
}

.loading-spinner {
	width: 20px;
	height: 20px;
	border: 2px solid rgba(216, 162, 93, 0.22);
	border-top-color: #d8a25d;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

.loading-spinner.tiny {
	width: 14px;
	height: 14px;
	border-width: 2px;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.relation-tabs {
	flex: 0 0 auto;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.relation-tab {
	flex: 0 0 auto;
	height: 100%;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 4px;
	box-sizing: border-box;
}

.relation-tab-text {
	font-weight: 400;
	color: #666;
	line-height: 1;
}

.relation-tab.active .relation-tab-text {
	color: #111;
}

.relation-tab-indicator {
	position: absolute;
	left: 50%;
	bottom: 2px;
	transform: translateX(-50%);
	width: 22px;
	height: 3px;
	border-radius: 3px;
	background: rgba(253, 231, 209, 1);
}

.user-list-scroll {
	position: fixed;
	left: 0;
	right: 0;
	overflow: hidden;
	background: #fdfdfd;
}

.user-list {
	padding: 0 10px;
	box-sizing: border-box;
}

.user-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 2px;
	background: #fdfdfd;
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
	height: 100%;
}

.avatar {
	border: none;
	box-sizing: border-box;
	flex-shrink: 0;
	background: #f3f3f3;
}

.user-info {
	flex: 1;
	min-width: 0;
	overflow: hidden;
}

.user-name {
	display: block;
	font-weight: 400;
	color: #222;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.user-right {
	flex-shrink: 0;
	margin-left: 8px;
}

.follow-btn,
.following-btn {
	padding: 0 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	transition: all 0.18s;
}

.follow-btn {
	background: #ff4d67;
	box-shadow: 0 2px 8px rgba(255, 77, 103, 0.24);
}

.following-btn {
	background: #f1f1f1;
	box-shadow: none;
}

.follow-btn:active,
.following-btn:active {
	transform: scale(0.96);
}

.follow-btn .btn-text {
	color: #ffffff;
}

.following-btn .btn-text {
	color: #666;
}

.btn-text {
	font-weight: 400;
	white-space: nowrap;
	line-height: 1;
}

.empty-state {
	height: 70vh;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 0 20px;
	box-sizing: border-box;
}

.empty-icon {
	margin-bottom: 14px;
	color: #d8a25d !important;
	line-height: 1;
}

.empty-text {
	font-weight: 400;
	color: #666;
	margin-bottom: 8px;
}

.empty-hint {
	font-weight: 400;
	color: #999;
	text-align: center;
}

.footer {
	height: 42px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #999;
}
</style>
