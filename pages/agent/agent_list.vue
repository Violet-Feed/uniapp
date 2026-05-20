<template>
	<view class="agent-page">
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">我的智能体</text>
				</view>

				<view class="nav-right">
					<button class="nav-pill-btn" :style="navBtnStyle" @click.stop="goCreate">
						创建
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
			<view class="state-box" v-if="loading && agents.length === 0">
				<text class="state-text" :style="stateTextStyle">加载中...</text>
			</view>

			<view class="state-box" v-else-if="!loading && agents.length === 0">
				<text class="state-text" :style="stateTextStyle">你还没有创建智能体</text>
			</view>

			<view v-else class="list-wrap">
				<view
					class="agent-card"
					:style="agentCardStyle"
					v-for="item in agents"
					:key="item.agent_id"
					@click="goDetail(item)"
					@longpress.stop="showAgentOptions(item)"
				>
					<image
						class="avatar"
						:style="avatarStyle"
						:src="item.avatar_uri || defaultAvatar"
						mode="aspectFill"
					/>

					<view class="agent-main" :style="agentMainStyle">
						<text class="agent-name" :style="agentNameStyle">
							{{ item.agent_name || '未知能体' }}
						</text>

						<text class="agent-desc" :style="agentDescStyle">
							{{ item.description || '暂无描述' }}
						</text>
					</view>
				</view>

			</view>
		</view>

			</view>
		</scroll-view>

		<view class="agent-action-overlay" v-if="showAgentAction" @click="hideAgentActionMenu">
			<view class="agent-action-menu" @click.stop>
				<view class="agent-action-item" @click="editSelectedAgent">
					<text class="agent-action-text">编辑</text>
				</view>

				<view class="agent-action-item" @click="deleteSelectedAgent">
					<text class="agent-action-text danger-action-text">删除</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getAgentsByUser, deleteAgent } from '@/request/agent.js';

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
			agents: [],
			page: 1,
			loading: false,
			isRefreshing: false,
			scrollTop: 0,
			pullCandidate: false,
			pulling: false,
			pullStartY: 0,
			pullDistance: 0,
			loadingMore: false,
			finished: false,
			firstShowDone: false,
			defaultAvatar: '/static/ai_avatar.png',

			showAgentAction: false,
			selectedAgent: null,

			windowWidth: 375,
			statusBarHeight: 0,
			headerContentHeight: 38,
			headerHeight: 38,

			pagePadding: 14,
			cardPaddingX: 14,
			cardPaddingY: 12,
			cardRadius: 14,
			cardGap: 10,

			avatarSize: 52,
			avatarRadius: 12,
			backIconSize: 19,
			titleFontSize: 17,
			btnHeight: 30,
			btnMinWidth: 58,
			btnFontSize: 14,
			agentNameFontSize: 16,
			agentDescFontSize: 13,
			stateFontSize: 13,
			agentMainMargin: 12
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

		navBtnStyle() {
			return (
				'height:' + this.btnHeight + 'px;' +
				'line-height:' + this.btnHeight + 'px;' +
				'min-width:' + this.btnMinWidth + 'px;' +
				'border-radius:' + Math.floor(this.btnHeight / 2) + 'px;' +
				'font-size:' + this.btnFontSize + 'px;'
			);
		},

		pageBodyStyle() {
			return 'padding:' + this.pagePadding + 'px;';
		},

		agentCardStyle() {
			return (
				'padding:' + this.cardPaddingY + 'px ' + this.cardPaddingX + 'px;' +
				'margin-bottom:' + this.cardGap + 'px;' +
				'border-radius:' + this.cardRadius + 'px;'
			);
		},

		avatarStyle() {
			return (
				'width:' + this.avatarSize + 'px;' +
				'height:' + this.avatarSize + 'px;' +
				'border-radius:' + this.avatarRadius + 'px;'
			);
		},

		agentMainStyle() {
			return (
				'min-height:' + this.avatarSize + 'px;' +
				'margin-left:' + this.agentMainMargin + 'px;'
			);
		},

		agentNameStyle() {
			return 'font-size:' + this.agentNameFontSize + 'px;';
		},

		agentDescStyle() {
			return 'font-size:' + this.agentDescFontSize + 'px;';
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

	onLoad() {
		this.initResponsiveLayout();
		this.refreshList();
	},

	onShow() {
		this.initResponsiveLayout();

		if (this.firstShowDone) {
			this.refreshList();
			return;
		}

		this.firstShowDone = true;
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
			this.pullCandidate = this.scrollTop <= 2;
			this.pulling = false;
			this.pullDistance = 0;
		},

		onScrollTouchMove(e) {
			if (!this.pullCandidate || this.loading || this.loadingMore || this.isRefreshing) return;

			if (this.scrollTop > 2) {
				this.pullCandidate = false;
				this.pulling = false;
				this.pullDistance = 0;
				return;
			}

			const currentY = this.getTouchY(e);
			const deltaY = currentY - this.pullStartY;

			if (deltaY <= 0) {
				this.pulling = false;
				this.pullDistance = 0;
				return;
			}

			if (deltaY < 8) {
				this.pulling = false;
				this.pullDistance = 0;
				return;
			}

			this.pulling = true;
			this.pullDistance = Math.min(
				PULL_MAX_DISTANCE,
				Math.floor((deltaY - 8) * 0.38)
			);
		},

		async onScrollTouchEnd() {
			if (!this.pullCandidate && !this.pulling) return;

			const shouldRefresh = this.pulling && this.pullDistance >= PULL_TRIGGER_DISTANCE;
			this.pullCandidate = false;
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

			await this.refreshList();
			this.isRefreshing = false;
			this.pullDistance = 0;
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

				this.avatarSize = clamp(Math.floor(windowWidth * 0.14), 48, 58);
				this.avatarRadius = clamp(Math.floor(this.avatarSize * 0.24), 10, 14);

				this.backIconSize = clamp(Math.floor(this.headerContentHeight * 0.5), 18, 21);
				this.titleFontSize = clamp(Math.floor(this.headerContentHeight * 0.44) + smallScreenBoost, 16, 18);

				this.btnHeight = clamp(Math.floor(this.headerContentHeight * 0.74), 28, 32);
				this.btnMinWidth = clamp(Math.floor(windowWidth * 0.155), 56, 70);
				this.btnFontSize = clamp(Math.floor(windowWidth * 0.036) + smallScreenBoost, 13, 15);

				this.agentNameFontSize = clamp(Math.floor(windowWidth * 0.043) + smallScreenBoost, 16, 18);
				this.agentDescFontSize = clamp(Math.floor(windowWidth * 0.034) + smallScreenBoost, 12, 14);
				this.stateFontSize = clamp(Math.floor(windowWidth * 0.034) + smallScreenBoost, 12, 14);
				this.agentMainMargin = clamp(Math.floor(windowWidth * 0.032), 10, 14);
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

				this.avatarSize = 52;
				this.avatarRadius = 12;
				this.backIconSize = 19;
				this.titleFontSize = 17;
				this.btnHeight = 30;
				this.btnMinWidth = 58;
				this.btnFontSize = 14;
				this.agentNameFontSize = 16;
				this.agentDescFontSize = 13;
				this.stateFontSize = 13;
				this.agentMainMargin = 12;
			}
		},

		async refreshList() {
			if (this.loading) return;

			this.loading = true;
			this.page = 1;
			this.finished = false;

			const res = await getAgentsByUser({ page: 1 });
			if (!res) {
				this.loading = false;
				return;
			}

			const list = this.normalizeAgents(res?.agents);
			this.agents = list;
			this.finished = list.length === 0;
			this.loading = false;
		},

		async loadMore() {
			if (this.loading || this.loadingMore || this.finished) return;

			this.loadingMore = true;
			const nextPage = this.page + 1;

			const res = await getAgentsByUser({ page: nextPage });
			if (!res) {
				this.loadingMore = false;
				return;
			}

			const list = this.normalizeAgents(res?.agents);

			if (list.length === 0) {
				this.finished = true;
				this.loadingMore = false;
				return;
			}

			this.agents = this.mergeAgents(this.agents, list);
			this.page = nextPage;
			this.loadingMore = false;
		},

		normalizeAgents(list) {
			if (!Array.isArray(list)) return [];

			return list.map(item => ({
				agent_id: item?.agent_id ? String(item.agent_id) : '',
				agent_name: item?.agent_name || '',
				avatar_uri: item?.avatar_uri || '',
				description: item?.description || '',
				personality: item?.personality || ''
			})).filter(item => !!item.agent_id);
		},

		mergeAgents(oldList, newList) {
			const map = new Map();

			oldList.forEach(item => {
				map.set(item.agent_id, item);
			});

			newList.forEach(item => {
				map.set(item.agent_id, item);
			});

			return Array.from(map.values());
		},

		goBack() {
			uni.navigateBack();
		},

		goCreate() {
			uni.navigateTo({
				url: '/pages/agent/agent_create'
			});
		},

		goDetail(item) {
			if (!item?.agent_id) return;
			uni.navigateTo({
				url: `/pages/agent/agent_detail?agentId=${encodeURIComponent(item.agent_id)}`
			});
		},

		showAgentOptions(item) {
			if (this.pullDistance > 4 || this.isRefreshing) return;
			if (!item?.agent_id) return;

			this.selectedAgent = item;
			this.showAgentAction = true;
		},

		hideAgentActionMenu() {
			this.showAgentAction = false;
			this.selectedAgent = null;
		},

		editSelectedAgent() {
			const item = this.selectedAgent;
			this.showAgentAction = false;
			this.selectedAgent = null;

			if (!item?.agent_id) return;

			uni.navigateTo({
				url: `/pages/agent/edit_agent?agentId=${encodeURIComponent(item.agent_id)}`
			});
		},

		deleteSelectedAgent() {
			const item = this.selectedAgent;
			this.showAgentAction = false;
			this.selectedAgent = null;

			if (item) {
				this.confirmDelete(item);
			}
		},

		confirmDelete(item) {
			uni.showModal({
				title: '提示',
				content: '确定要删除这个智能体吗？',
				confirmText: '删除',
				confirmColor: '#ff3b30',
				success: async (res) => {
					if (!res.confirm) return;

					const ok = await deleteAgent({
						agentId: item.agent_id
					});

					if (ok) {
						this.agents = this.agents.filter(agent => agent.agent_id !== item.agent_id);

						uni.showToast({
							title: '删除成功',
							icon: 'success'
						});
					}
				}
			});
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
.agent-page {
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

.nav-pill-btn {
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

.nav-pill-btn::after {
	border: none;
}

.page-body {
	box-sizing: border-box;
}

.agent-card {
	display: flex;
	align-items: center;
	background: #ffffff;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
}

.agent-card:active {
	background: #f8f8f8;
}

.avatar {
	background: #eef1f6;
	flex-shrink: 0;
}

.agent-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.agent-name {
	font-weight: 400;
	color: #1f2329;
	line-height: 1.4;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.agent-desc {
	margin-top: 5px;
	font-weight: 400;
	line-height: 1.5;
	color: #4e5969;
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

.agent-action-overlay {
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

.agent-action-menu {
	width: 100%;
	background: #ffffff;
	border-radius: 14px;
	overflow: hidden;
	box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16);
}

.agent-action-item {
	height: 46px;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	border-bottom: 1px solid #f4f4f4;
}

.agent-action-item:last-child {
	border-bottom: none;
}

.agent-action-item:active {
	background: #f8f8f8;
}

.agent-action-text {
	font-size: 15px;
	color: #333333;
	font-weight: 400;
}

.danger-action-text {
	color: #ff3b30;
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