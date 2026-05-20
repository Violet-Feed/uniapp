<template>
	<view class="member-page">
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">移出成员</text>
				</view>

				<view class="nav-right"></view>
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
			@touchstart="onScrollTouchStart"
			@touchmove="onScrollTouchMove"
			@touchend="onScrollTouchEnd"
			@touchcancel="onScrollTouchEnd"
		>
			<view class="scroll-content" :style="scrollContentStyle">
				<view class="page-body" :style="pageBodyStyle">
			<view class="state-box" v-if="loading && members.length === 0">
				<text class="state-text" :style="stateTextStyle">加载中...</text>
			</view>

			<view class="state-box" v-else-if="!loading && members.length === 0">
				<text class="state-text" :style="stateTextStyle">暂无可移出的成员</text>
			</view>

			<view v-else class="list-wrap">
				<view
					class="user-card"
					:style="userCardStyle"
					v-for="item in members"
					:key="item.user_id"
					@click="confirmRemove(item)"
				>
					<view class="remove-circle" :style="removeCircleStyle">
						<view class="remove-line" :style="removeLineStyle"></view>
					</view>

					<image
						class="avatar"
						:style="avatarStyle"
						:src="item.avatar_uri || item.local_avatar_uri || defaultAvatar"
						@error="onAvatarErr(item)"
						mode="aspectFill"
					/>

					<view class="user-main" :style="userMainStyle">
						<text class="user-name" :style="userNameStyle">{{ item.nick_name || item.global_name || '未知用户' }}</text>
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
import { removeConversationMember } from '@/request/im.js';

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
			conShortId: '',
			members: [],
			loading: false,
			isRefreshing: false,
			scrollTop: 0,
			pulling: false,
			pullStartY: 0,
			pullDistance: 0,
			removingUserId: '',
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
			removeIconSize: 20,
			removeLineWidth: 10,
			removeLineHeight: 3,
			backIconSize: 19,
			titleFontSize: 17,
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

		removeCircleStyle() {
			const radius = Math.floor(this.removeIconSize / 2);
			return (
				'width:' + this.removeIconSize + 'px;' +
				'height:' + this.removeIconSize + 'px;' +
				'border-radius:' + radius + 'px;'
			);
		},

		removeLineStyle() {
			return (
				'width:' + this.removeLineWidth + 'px;' +
				'height:' + this.removeLineHeight + 'px;'
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

	async onLoad(options) {
		this.initResponsiveLayout();

		this.conId = options?.conId || '';
		this.conShortId = options?.conShortId || '';

		if (!this.conId) {
			uni.navigateBack();
			return;
		}

		if (!this.conShortId) {
			const res = await DB.getConversationById(this.conId);
			const conversation = Array.isArray(res) ? res[0] : res;
			if (conversation?.con_short_id) {
				this.conShortId = String(conversation.con_short_id);
			}
		}

		await this.refreshList();
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
			if (this.loading || this.isRefreshing) return;

			this.pullStartY = this.getTouchY(e);
			this.pulling = this.scrollTop <= 2;
			this.pullDistance = 0;
		},

		onScrollTouchMove(e) {
			if (!this.pulling || this.loading || this.isRefreshing) return;

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
			if (this.loading || this.isRefreshing) {
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
				this.removeIconSize = clamp(Math.floor(windowWidth * 0.054), 18, 22);
				this.removeLineWidth = clamp(Math.floor(this.removeIconSize * 0.52), 9, 12);
				this.removeLineHeight = 3;

				this.backIconSize = clamp(Math.floor(this.headerContentHeight * 0.5), 18, 21);
				this.titleFontSize = clamp(Math.floor(this.headerContentHeight * 0.44) + smallScreenBoost, 16, 18);
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
				this.removeIconSize = 20;
				this.removeLineWidth = 10;
				this.removeLineHeight = 3;
				this.backIconSize = 19;
				this.titleFontSize = 17;
				this.userNameFontSize = 16;
				this.stateFontSize = 13;
				this.userMainMargin = 10;
			}
		},

		async refreshList() {
			if (this.loading) {
				uni.stopPullDownRefresh();
				return;
			}

			this.loading = true;

			try {
				const rows = await DB.pullUserMembers(this.conId);
				const list = Array.isArray(rows) ? rows : [];
				const selfUserId = String(getApp().globalData.userId || '');

				this.members = list.filter(item => String(item.user_id || '') !== selfUserId);
			} catch (err) {
				console.error('refreshList failed:', err);
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
			} finally {
				this.loading = false;
				uni.stopPullDownRefresh();
			}
		},

		confirmRemove(item) {
			const userId = item?.user_id ? String(item.user_id) : '';
			if (!userId || this.removingUserId) return;

			const name = item?.nick_name || item?.global_name || '该成员';

			uni.showModal({
				title: '移出成员',
				content: `确定将「${name}」移出群聊吗？`,
				confirmText: '移出',
				confirmColor: '#ff4d4f',
				success: res => {
					if (res.confirm) {
						this.removeMember(item);
					}
				}
			});
		},

		async removeMember(item) {
			const userId = item?.user_id ? String(item.user_id) : '';
			if (!userId || !this.conShortId || this.removingUserId) return;

			this.removingUserId = userId;

			const ok = await removeConversationMember({
				conShortId: this.conShortId,
				member: userId
			});

			if (!ok) {
				this.removingUserId = '';
				return;
			}

			this.members = this.members.filter(member => String(member.user_id) !== userId);

			uni.showToast({
				title: '移出成功',
				icon: 'success'
			});

			this.removingUserId = '';
		},

		goBack() {
			uni.navigateBack();
		},

		async onAvatarErr(item) {
			if (item.avatar_uri) {
				item.avatar_uri = ''
				return
			}
			if (item.local_avatar_uri) {
				item.local_avatar_uri = ''
				try {
					await DB.updateUser(item.user_id, { local_avatar_uri: '', modify_time: Date.now() })
				} catch (e) {
					console.error('清除本地头像失败：', e)
				}
			}
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

.remove-circle {
	background: #ff4d4f;
	flex-shrink: 0;
	margin-right: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.remove-line {
	border-radius: 999px;
	background: #ffffff;
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

.state-box {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx 0;
}

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