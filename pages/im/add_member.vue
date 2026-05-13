<template>
	<view class="member-page">
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">邀请成员</text>
				</view>

				<view class="nav-right">
					<button
						class="confirm-btn"
						:class="{ 'confirm-btn-disabled': submitting }"
						:style="confirmBtnStyle"
						@click.stop="confirmAdd"
					>
						{{ submitting ? '邀请中' : '确定' }}
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

		<scroll-view
			class="content-scroll"
			scroll-y
			:lower-threshold="120"
			@scroll="onContentScroll"
			@scrolltolower="loadMore"
			@touchstart="onScrollTouchStart"
			@touchmove="onScrollTouchMove"
			@touchend="onScrollTouchEnd"
			@touchcancel="onScrollTouchEnd"
		>
			<view class="scroll-content" :style="scrollContentStyle">
				<view class="page-body" :style="pageBodyStyle">
			<view class="state-box" v-if="loading && users.length === 0">
				<text class="state-text" :style="stateTextStyle">加载中...</text>
			</view>

			<view class="state-box" v-else-if="!loading && users.length === 0">
				<text class="state-text" :style="stateTextStyle">暂无可邀请好友</text>
			</view>

			<view v-else class="list-wrap">
				<view
					class="user-card"
					:style="userCardStyle"
					v-for="item in users"
					:key="item.user_id"
					:class="{ 'user-card-disabled': isExistingUser(item.user_id) }"
					@click="toggleSelect(item)"
				>
					<text
						class="iconfont select-icon"
						:class="selectIconClass(item)"
						:style="selectIconStyle(item)"
					></text>

					<image
						class="avatar"
						:style="avatarStyle"
						:src="item.avatar || defaultAvatar"
						mode="aspectFill"
					/>

					<view class="user-main" :style="userMainStyle">
						<text class="user-name" :style="userNameStyle">{{ item.username || '未知用户' }}</text>
					</view>
				</view>

			</view>
		</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import DB from '@/utils/sqlite.js';
import { getFriendList } from '@/request/action.js';
import { addConversationMembers } from '@/request/im.js';

const PULL_TRIGGER_DISTANCE = 64;
const PULL_MAX_DISTANCE = 92;
const PULL_MOVE_RATIO = 0.62;
const REFRESH_HOLD_OFFSET = 42;

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value));
};

export default {
	data() {
		return {
			conId: '',
			conShortId: 0,
			loginUserId: 0,
			users: [],
			page: 1,
			loading: false,
			isRefreshing: false,
			scrollTop: 0,
			pulling: false,
			pullStartY: 0,
			pullDistance: 0,
			loadingMore: false,
			finished: false,
			submitting: false,
			existingUserIdSet: {},
			selectedUserIdSet: {},
			defaultAvatar: '/static/user_avatar.png',

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
			confirmFontSize: 14,
			confirmHeight: 30,
			confirmMinWidth: 58,
			userNameFontSize: 16,
			stateFontSize: 13,
			userMainMargin: 10
		};
	},

	computed: {
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

		confirmBtnStyle() {
			return (
				'height:' + this.confirmHeight + 'px;' +
				'line-height:' + this.confirmHeight + 'px;' +
				'min-width:' + this.confirmMinWidth + 'px;' +
				'border-radius:' + Math.floor(this.confirmHeight / 2) + 'px;' +
				'font-size:' + this.confirmFontSize + 'px;'
			);
		},

		pageBodyStyle() {
			return 'padding:' + this.pagePadding + 'px;';
		},

		userCardStyle() {
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

		userMainStyle() {
			return 'margin-left:' + this.userMainMargin + 'px;';
		},

		userNameStyle() {
			return 'font-size:' + this.userNameFontSize + 'px;';
		},

		stateTextStyle() {
			return 'font-size:' + this.stateFontSize + 'px;';
		},

		pullVisualOffset() {
			if (this.isRefreshing) return REFRESH_HOLD_OFFSET;

			return Math.min(
				REFRESH_HOLD_OFFSET,
				Math.round(this.pullDistance * PULL_MOVE_RATIO)
			);
		},

		scrollContentStyle() {
			const transition = this.pulling
				? 'none'
				: 'transform 0.16s ease';

			return [
				'transform: translateY(' + this.pullVisualOffset + 'px)',
				'transition:' + transition
			].join(';');
		},

		refreshOverlayStyle() {
			const top = this.headerHeight;
			const height = this.isRefreshing
				? 34
				: Math.min(34, Math.max(0, Math.round(this.pullDistance * 0.48)));
			const opacity = this.isRefreshing
				? 1
				: Math.min(1, this.pullDistance / PULL_TRIGGER_DISTANCE);

			return [
				'top:' + top + 'px',
				'height:' + height + 'px',
				'opacity:' + opacity
			].join(';');
		},

		refresherText() {
			if (this.isRefreshing) return '正在刷新...';
			if (this.pullDistance >= PULL_TRIGGER_DISTANCE) return '松开刷新';
			if (this.pullDistance > 0) return '下拉刷新';
			return '';
		}

	},

	async onLoad(option) {
		this.initResponsiveLayout();

		this.conId = option?.conId ? option.conId : '';
		this.loginUserId = this.getLoginUserId();

		if (!this.conId || !this.loginUserId) {
			uni.navigateBack();
			return;
		}

		const res = await DB.getConversationById(this.conId);
		const conversation = Array.isArray(res) ? res[0] : res;

		if (conversation) {
			this.conShortId = conversation.con_short_id;
		} else {
			uni.navigateBack();
			return;
		}

		this.refreshList();
	},

	onShow() {
		this.initResponsiveLayout();
	},



	methods: {

		onContentScroll(e) {
			this.scrollTop = Number(e && e.detail ? e.detail.scrollTop || 0 : 0);
		},

		getTouchY(e) {
			const touch = (e && e.touches && e.touches[0]) || (e && e.changedTouches && e.changedTouches[0]) || {};
			return Number(touch.clientY !== undefined ? touch.clientY : (touch.pageY || 0));
		},

		onScrollTouchStart(e) {
			if (this.loading || this.loadingMore || this.isRefreshing) return;

			this.pullStartY = this.getTouchY(e);
			this.pulling = this.scrollTop <= 2;
			this.pullDistance = 0;
		},

		onScrollTouchMove(e) {
			if (!this.pulling || this.loading || this.loadingMore || this.isRefreshing) return;

			if (this.scrollTop > 2) {
				this.pulling = false;
				this.pullDistance = 0;
				return;
			}

			const currentY = this.getTouchY(e);
			const deltaY = currentY - this.pullStartY;

			if (deltaY <= 0) {
				this.pullDistance = 0;
				return;
			}

			this.pullDistance = Math.min(
				PULL_MAX_DISTANCE,
				Math.floor(deltaY * 0.38)
			);
		},

		async onScrollTouchEnd() {
			if (!this.pulling) return;

			const shouldRefresh = this.pullDistance >= PULL_TRIGGER_DISTANCE;
			this.pulling = false;

			if (!shouldRefresh) {
				this.pullDistance = 0;
				return;
			}

			await this.onRefresh();
		},

		async onRefresh() {
			if (this.loading || this.loadingMore || this.isRefreshing) {
				this.pullDistance = 0;
				return;
			}

			this.isRefreshing = true;
			this.pullDistance = PULL_TRIGGER_DISTANCE;

			try {
				await this.refreshList();
			} finally {
				this.isRefreshing = false;
				this.pullDistance = 0;
			}
		},

		initResponsiveLayout() {
			try {
				const sys = uni.getSystemInfoSync();
				const windowWidth = Number(sys.windowWidth || 375);
				const statusBarHeight = Number(sys.statusBarHeight || 0);
				const smallScreenBoost = windowWidth <= 360 ? 1 : 0;

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
				this.confirmFontSize = clamp(Math.floor(windowWidth * 0.036) + smallScreenBoost, 13, 15);
				this.confirmHeight = clamp(Math.floor(this.headerContentHeight * 0.74), 28, 32);
				this.confirmMinWidth = clamp(Math.floor(windowWidth * 0.155), 56, 68);

				this.userNameFontSize = clamp(Math.floor(windowWidth * 0.043) + smallScreenBoost, 16, 18);
				this.stateFontSize = clamp(Math.floor(windowWidth * 0.034) + smallScreenBoost, 12, 14);
				this.userMainMargin = clamp(Math.floor(windowWidth * 0.03), 10, 14);
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
				this.confirmFontSize = 14;
				this.confirmHeight = 30;
				this.confirmMinWidth = 58;
				this.userNameFontSize = 16;
				this.stateFontSize = 13;
				this.userMainMargin = 10;
			}
		},

		getLoginUserId() {
			const { userId } = getApp().globalData || {};
			return userId || 0;
		},

		async loadExistingMembers() {
			const rows = await DB.pullUserMembers(this.conId);
			const list = Array.isArray(rows) ? rows : [];

			const existingMap = {};
			list.forEach(item => {
				const userId = item?.user_id ? String(item.user_id) : '';
				if (userId) {
					existingMap[userId] = true;
				}
			});

			this.existingUserIdSet = existingMap;
			this.selectedUserIdSet = { ...existingMap };
		},

		async refreshList() {
			if (this.loading) {
				uni.stopPullDownRefresh();
				return;
			}

			this.loading = true;
			this.page = 1;
			this.finished = false;

			await this.loadExistingMembers();

			const res = await getFriendList({
				userId: this.loginUserId,
				page: 1
			});

			if (res === undefined) {
				this.loading = false;
				uni.stopPullDownRefresh();
				return;
			}

			const list = this.normalizeUsers(res.user_infos);
			this.users = list;
			this.finished = list.length === 0;

			this.loading = false;
			uni.stopPullDownRefresh();
		},

		async loadMore() {
			if (this.loading || this.loadingMore || this.finished) return;

			this.loadingMore = true;
			const nextPage = this.page + 1;

			const res = await getFriendList({
				userId: this.loginUserId,
				page: nextPage
			});

			if (res === undefined) {
				this.loadingMore = false;
				return;
			}

			const list = this.normalizeUsers(res.user_infos);
			if (list.length === 0) {
				this.finished = true;
				this.loadingMore = false;
				return;
			}

			this.users = this.mergeUsers(this.users, list);
			this.page = nextPage;
			this.loadingMore = false;
		},

		normalizeUsers(list) {
			if (!Array.isArray(list)) return [];

			return list.map(item => {
				const u = item?.user || item;
				return {
					user_id: u?.user_id ? String(u.user_id) : '',
					username: u?.username || '未知用户',
					avatar: u?.avatar || u?.avatar_uri || '/static/user_avatar.png'
				};
			}).filter(item => !!item.user_id);
		},

		mergeUsers(oldList, newList) {
			const map = new Map();

			oldList.forEach(item => {
				map.set(item.user_id, item);
			});

			newList.forEach(item => {
				map.set(item.user_id, item);
			});

			return Array.from(map.values());
		},

		isExistingUser(userId) {
			return !!this.existingUserIdSet[String(userId)];
		},

		isSelectedUser(userId) {
			return !!this.selectedUserIdSet[String(userId)];
		},

		selectIconClass(item) {
			const userId = item?.user_id ? String(item.user_id) : '';
			if (this.isSelectedUser(userId) || this.isExistingUser(userId)) {
				return 'icon-gouxuan';
			}
			return 'icon-gouxuan1';
		},

		selectIconStyle(item) {
			const userId = item?.user_id ? String(item.user_id) : '';
			const active = this.isSelectedUser(userId) || this.isExistingUser(userId);
			const color = active ? '#22c55e' : '#c9ced6';

			return (
				'font-size:' + this.selectIconSize + 'px;' +
				'color:' + color + ';'
			);
		},

		toggleSelect(item) {
			const userId = item?.user_id ? String(item.user_id) : '';
			if (!userId) return;
			if (this.isExistingUser(userId)) return;

			const selectedMap = { ...this.selectedUserIdSet };

			if (selectedMap[userId]) {
				delete selectedMap[userId];
			} else {
				selectedMap[userId] = true;
			}

			this.selectedUserIdSet = selectedMap;
		},

		async confirmAdd() {
			if (this.submitting) return;

			const selectedIds = Object.keys(this.selectedUserIdSet);
			const existingIds = this.existingUserIdSet;
			const newUserIds = selectedIds.filter(id => !existingIds[id]);

			if (newUserIds.length === 0) {
				uni.navigateBack();
				return;
			}

			this.submitting = true;

			const res = await addConversationMembers({
				conShortId: this.conShortId,
				members: newUserIds
			});

			this.submitting = false;

			if (!res) return;

			uni.navigateBack();
		},

		goBack() {
			uni.navigateBack();
		}
	}
};
</script>

<style>
@import "@/static/icon/iconfont.css";

.content-scroll {
	flex: 1;
	overflow: hidden;
	background: #f7f8fa;
	box-sizing: border-box;
}

.scroll-content {
	min-height: 100%;
	will-change: transform;
}

.refresh-overlay {
	position: fixed;
	left: 0;
	right: 0;
	z-index: 30;
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

.loading-spinner {
	width: 34px;
	height: 34px;
	border: 3px solid rgba(216, 162, 93, 0.22);
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

</style>

<style scoped>
.member-page {
	height: 100vh;
	background: #f7f8fa;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
	box-sizing: border-box;
}

.nav-bar {
	width: 100%;
	flex-shrink: 0;
	background: #ffffff;
	box-sizing: border-box;
	overflow: hidden;
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

.confirm-btn {
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
}

.confirm-btn::after {
	border: none;
}

.confirm-btn-disabled {
	opacity: 0.72;
}

.page-body {
	box-sizing: border-box;
}

.user-card {
	display: flex;
	align-items: center;
	background: #ffffff;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
}

.user-card-disabled {
	opacity: 0.72;
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

.user-main {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
}

.user-name {
	font-weight: 400;
	color: #1f2329;
	line-height: 1.4;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.state-box,

.state-text {
	color: #98a2b3;
	font-weight: 400;
}

.content-scroll {
	flex: 1;
	overflow: hidden;
	background: #f7f8fa;
	box-sizing: border-box;
}

.scroll-content {
	min-height: 100%;
	will-change: transform;
}

.refresh-overlay {
	position: fixed;
	left: 0;
	right: 0;
	z-index: 30;
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

.loading-spinner {
	width: 34px;
	height: 34px;
	border: 3px solid rgba(216, 162, 93, 0.22);
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

</style>