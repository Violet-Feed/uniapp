<template>
	<view class="create-group-container">
		<!-- 顶部栏 -->
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">选择好友</text>
				</view>

				<view class="nav-right">
					<button
						class="create-btn"
						:class="{ 'create-btn-disabled': selectedCount === 0 || creating }"
						:style="createBtnStyle"
						@click.stop="createConversation"
					>
						<text class="create-btn-text">
							{{ creating ? '创建中' : '创建' }}
						</text>
						<text class="create-btn-text" v-if="selectedCount > 0">
							({{ selectedCount }})
						</text>
					</button>
				</view>
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

		<!-- 好友列表 -->
		<scroll-view
			class="friend-scroll"
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
			<view class="friend-list" :style="friendListStyle">
				<view
					class="friend-item"
					:style="friendItemStyle"
					v-for="(user, index) in userList"
					:key="String(user.user_id || index)"
					@click="toggleUserSelection(index)"
				>
					<text
						class="iconfont select-icon"
						:class="user.selected ? 'icon-gouxuan' : 'icon-gouxuan1'"
						:style="selectIconStyle(user)"
					></text>

					<image
						class="avatar"
						:style="avatarStyle"
						:src="user.avatar"
						mode="aspectFill"
					></image>

					<view class="user-info" :style="userInfoStyle">
						<text class="user-name" :style="userNameStyle">{{ user.username }}</text>
						<text class="user-bio" :style="userBioStyle" v-if="user.bio">{{ user.bio }}</text>
					</view>
				</view>

				<view v-if="!loading && userList.length === 0" class="empty-state">
					<text class="empty-icon" :style="emptyIconStyle">👥</text>
					<text class="empty-text" :style="emptyTextStyle">暂无好友</text>
					<text class="empty-hint" :style="emptyHintStyle">快去添加好友吧！</text>
				</view>

				<view v-if="userList.length > 0" class="bottom-status">
					<text class="bottom-text" :style="bottomTextStyle" v-if="loadingMore">正在加载更多...</text>
					<text class="bottom-text" :style="bottomTextStyle" v-else-if="hasMore">上拉加载更多</text>
				</view>
			</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { getFriendList } from '@/request/action.js';
import { createConversation } from '@/request/im';

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value));
};


const PULL_TRIGGER_DISTANCE = 64
const PULL_MAX_DISTANCE = 92
const PULL_MOVE_RATIO = 0.62
const REFRESH_HOLD_OFFSET = 42

export default {
	data() {
		return {
			userList: [],

			page: 1,
			hasMore: true,
			pageSize: 20,

			loading: false,
			loadingMore: false,
			isRefreshing: false,

			scrollTop: 0,
			pulling: false,
			pullStartY: 0,
			pullDistance: 0,
			creating: false,

			windowWidth: 375,
			statusBarHeight: 0,
			headerContentHeight: 38,
			headerHeight: 38,

			pagePadding: 14,
			cardPaddingX: 14,
			cardPaddingY: 12,
			cardRadius: 14,
			cardGap: 10,

			avatarSize: 48,
			selectIconSize: 22,
			backIconSize: 19,
			titleFontSize: 17,

			createBtnHeight: 30,
			createBtnMinWidth: 62,
			createBtnFontSize: 14,

			userNameFontSize: 16,
			userBioFontSize: 13,
			userInfoMargin: 10,

			emptyIconFontSize: 56,
			emptyTextFontSize: 16,
			emptyHintFontSize: 14,
			bottomTextFontSize: 13
		};
	},

	computed: {
		selectedCount() {
			return this.userList.filter(user => user.selected).length;
		},

		navBarStyle() {
			return (
				'height:' + this.headerHeight + 'px;' +
				'padding-top:' + this.statusBarHeight + 'px;'
			);
		},

		navContentStyle() {
			return 'height:' + this.headerContentHeight + 'px;';
		},

		backIconStyle() {
			return 'font-size:' + this.backIconSize + 'px;';
		},

		navTitleStyle() {
			return 'font-size:' + this.titleFontSize + 'px;';
		},

		createBtnStyle() {
			return (
				'height:' + this.createBtnHeight + 'px;' +
				'line-height:' + this.createBtnHeight + 'px;' +
				'min-width:' + this.createBtnMinWidth + 'px;' +
				'border-radius:' + Math.floor(this.createBtnHeight / 2) + 'px;' +
				'font-size:' + this.createBtnFontSize + 'px;'
			);
		},

		friendListStyle() {
			return 'padding:' + this.pagePadding + 'px;';
		},

		friendItemStyle() {
			return (
				'padding:' + this.cardPaddingY + 'px ' + this.cardPaddingX + 'px;' +
				'margin-bottom:' + this.cardGap + 'px;' +
				'border-radius:' + this.cardRadius + 'px;'
			);
		},

		avatarStyle() {
			const radius = Math.floor(this.avatarSize / 2);
			return (
				'width:' + this.avatarSize + 'px;' +
				'height:' + this.avatarSize + 'px;' +
				'border-radius:' + radius + 'px;'
			);
		},

		userInfoStyle() {
			return 'margin-left:' + this.userInfoMargin + 'px;';
		},

		userNameStyle() {
			return 'font-size:' + this.userNameFontSize + 'px;';
		},

		userBioStyle() {
			return 'font-size:' + this.userBioFontSize + 'px;';
		},

		emptyIconStyle() {
			return 'font-size:' + this.emptyIconFontSize + 'px;';
		},

		emptyTextStyle() {
			return 'font-size:' + this.emptyTextFontSize + 'px;';
		},

		emptyHintStyle() {
			return 'font-size:' + this.emptyHintFontSize + 'px;';
		},

		bottomTextStyle() {
			return 'font-size:' + this.bottomTextFontSize + 'px;';
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
	},

	onLoad() {
		this.initResponsiveLayout();
		this.loadFriendList(true);
	},

	onShow() {
		this.initResponsiveLayout();
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
				const sys = uni.getSystemInfoSync();
				const windowWidth = Number(sys.windowWidth || 375);
				const statusBarHeight = Number(sys.statusBarHeight || 0);
				const smallScreenBoost = windowWidth <= 360 ? 1 : 0;
				const tinyScreenBoost = windowWidth <= 330 ? 1 : 0;

				this.windowWidth = windowWidth;
				this.statusBarHeight = statusBarHeight;

				this.headerContentHeight = 38;
				this.headerHeight = this.statusBarHeight + this.headerContentHeight;

				this.pagePadding = clamp(Math.floor(windowWidth * 0.038), 12, 18);
				this.cardPaddingX = clamp(Math.floor(windowWidth * 0.038), 12, 18);
				this.cardPaddingY = clamp(Math.floor(windowWidth * 0.032), 10, 14);
				this.cardRadius = clamp(Math.floor(windowWidth * 0.038), 12, 18);
				this.cardGap = clamp(Math.floor(windowWidth * 0.028), 9, 14);

				this.avatarSize = clamp(Math.floor(windowWidth * 0.128), 44, 54);
				this.selectIconSize = clamp(Math.floor(windowWidth * 0.058), 20, 24);
				this.backIconSize = clamp(Math.floor(this.headerContentHeight * 0.5), 18, 21);
				this.titleFontSize = clamp(Math.floor(this.headerContentHeight * 0.44) + smallScreenBoost, 16, 18);

				this.createBtnHeight = clamp(Math.floor(this.headerContentHeight * 0.74), 28, 32);
				this.createBtnMinWidth = clamp(Math.floor(windowWidth * 0.165), 60, 74);
				this.createBtnFontSize = clamp(Math.floor(windowWidth * 0.036) + smallScreenBoost, 13, 15);

				this.userNameFontSize = clamp(
					Math.floor(windowWidth * 0.043) + smallScreenBoost + tinyScreenBoost,
					16,
					18
				);
				this.userBioFontSize = clamp(Math.floor(windowWidth * 0.034) + smallScreenBoost, 12, 14);
				this.userInfoMargin = clamp(Math.floor(windowWidth * 0.03), 10, 14);

				this.emptyIconFontSize = clamp(Math.floor(windowWidth * 0.15), 52, 64);
				this.emptyTextFontSize = clamp(Math.floor(windowWidth * 0.04) + smallScreenBoost, 15, 17);
				this.emptyHintFontSize = clamp(Math.floor(windowWidth * 0.035) + smallScreenBoost, 13, 15);
				this.bottomTextFontSize = clamp(Math.floor(windowWidth * 0.034) + smallScreenBoost, 12, 14);
			} catch (err) {
				this.windowWidth = 375;
				this.statusBarHeight = 0;
				this.headerContentHeight = 38;
				this.headerHeight = 38;

				this.pagePadding = 14;
				this.cardPaddingX = 14;
				this.cardPaddingY = 12;
				this.cardRadius = 14;
				this.cardGap = 10;

				this.avatarSize = 48;
				this.selectIconSize = 22;
				this.backIconSize = 19;
				this.titleFontSize = 17;

				this.createBtnHeight = 30;
				this.createBtnMinWidth = 62;
				this.createBtnFontSize = 14;

				this.userNameFontSize = 16;
				this.userBioFontSize = 13;
				this.userInfoMargin = 10;

				this.emptyIconFontSize = 56;
				this.emptyTextFontSize = 16;
				this.emptyHintFontSize = 14;
				this.bottomTextFontSize = 13;
			}
		},

		goBack() {
			uni.navigateBack();
		},

		selectIconStyle(user) {
			const color = user && user.selected ? '#22c55e' : '#c9ced6';
			return (
				'font-size:' + this.selectIconSize + 'px;' +
				'color:' + color + ';'
			);
		},

		toggleUserSelection(index) {
			if (!this.userList[index]) return;
			this.userList[index].selected = !this.userList[index].selected;
		},

		async onRefresh() {
			if (this.loading || this.loadingMore || this.isRefreshing) {
				this.pullDistance = 0;
				return;
			}

			this.isRefreshing = true;
			this.pullDistance = PULL_TRIGGER_DISTANCE;

			try {
				await this.loadFriendList(true);
			} finally {
				this.isRefreshing = false;
				this.pullDistance = 0;
			}
		},

		loadMore() {
			this.loadFriendList(false);
		},

		async loadFriendList(reset = false) {
			if (this.loading || this.loadingMore) return;
			if (!reset && !this.hasMore) return;

			if (reset) {
				this.page = 1;
				this.hasMore = true;
				this.loading = true;
			} else {
				this.loadingMore = true;
			}

			const payload = {
				userId: String(getApp().globalData.userId || ''),
				page: this.page
			};

			let res;
			try {
				res = await getFriendList(payload);
			} catch (e) {
				res = undefined;
			}

			const list = res && Array.isArray(res.user_infos) ? res.user_infos : [];

			if (reset) this.userList = [];

			if (list.length === 0) {
				this.hasMore = false;
				this.loading = false;
				this.loadingMore = false;
				this.isRefreshing = false;
				return;
			}

			const exist = new Set(this.userList.map(u => String(u.user_id || u.userId || '')));

			const mapped = list
				.map(u => ({
					user_id: String(u.user_id || u.userId || ''),
					username: u.username || '未知用户',
					avatar: u.avatar && u.avatar !== '' ? u.avatar : '/static/user_avatar.png',
					bio: u.bio,
					selected: false
				}))
				.filter(u => u.user_id && !exist.has(u.user_id));

			this.userList = this.userList.concat(mapped);

			this.hasMore = list.length >= this.pageSize;
			this.page += 1;

			this.loading = false;
			this.loadingMore = false;
			this.isRefreshing = false;
		},

		async createConversation() {
			if (this.creating) return;

			const selectedUserIds = this.userList
				.filter(user => user.selected)
				.map(user => user.user_id);

			if (selectedUserIds.length === 0) {
				uni.showToast({
					title: '请至少选择一位好友',
					icon: 'none'
				});
				return;
			}

			this.creating = true;

			try {
				const res = await createConversation({
					members: selectedUserIds
				});

				if (!res) return;

				uni.showToast({
					title: '创建成功',
					icon: 'success'
				});

				setTimeout(() => {
					uni.redirectTo({
						url: `/pages/im/conversation?conId=${res.con_id}&name=群聊&conType=${res.con_type}`
					});
				}, 200);
			} finally {
				this.creating = false;
			}
		}
	}
};
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.create-group-container {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background: #f7f8fa;
	font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
	box-sizing: border-box;
}

.nav-bar {
	width: 100%;
	background: #ffffff;
	box-sizing: border-box;
	overflow: hidden;
	flex-shrink: 0;
}

.nav-content {
	width: 100%;
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	padding-left: 8px;
	padding-right: 8px;
	padding-bottom: 4px;
	box-sizing: border-box;
}

.nav-left,
.nav-right {
	width: 76px;
	height: 30px;
	display: flex;
	align-items: center;
	flex-shrink: 0;
	box-sizing: border-box;
}

.nav-left {
	justify-content: flex-start;
}

.nav-right {
	justify-content: flex-end;
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
	background: #f7f8fa;
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

.back-icon {
	line-height: 1;
	color: #222;
	font-weight: 400;
}

.nav-title-wrap {
	flex: 1;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 0;
	box-sizing: border-box;
}

.nav-title {
	color: #222;
	font-weight: 400;
	line-height: 1;
}

.create-btn {
	margin: 0;
	padding: 0 13px;
	color: #8a5a2b;
	background: rgba(253, 231, 209, 1);
	font-weight: 400;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	gap: 2px;
}

.create-btn::after {
	border: none;
}

.create-btn-disabled {
	opacity: 0.62;
}

.create-btn-text {
	color: #8a5a2b;
	font-weight: 400;
	line-height: 1;
}

.friend-scroll {
	flex: 1;
	overflow: hidden;
	background: #f7f8fa;
}

.friend-list {
	box-sizing: border-box;
}

.friend-item {
	display: flex;
	align-items: center;
	background: #ffffff;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
}

.friend-item:active {
	background: #f8f8f8;
}

.select-icon {
	flex-shrink: 0;
	width: 26px;
	height: 26px;
	line-height: 26px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 10px;
	font-weight: 400;
}

.avatar {
	background: #eef1f6;
	flex-shrink: 0;
}

.user-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4px;
	overflow: hidden;
	min-width: 0;
}

.user-name {
	font-weight: 400;
	color: #1f2329;
	line-height: 1.4;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.user-bio {
	font-weight: 400;
	color: #999;
	line-height: 1.35;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 90px 20px;
	box-sizing: border-box;
}

.empty-icon {
	line-height: 1;
	margin-bottom: 14px;
}

.empty-text {
	color: #666;
	font-weight: 400;
	margin-bottom: 8px;
}

.empty-hint {
	color: #999;
	font-weight: 400;
	text-align: center;
}

.bottom-status {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 28rpx 0;
}

.bottom-text {
	color: #98a2b3;
	font-weight: 400;
}
</style>
