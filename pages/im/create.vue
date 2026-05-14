<template>
	<view class="create-group-container">
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">创建群聊</text>
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

		<view class="member-filter-bar" :style="memberFilterBarStyle">
			<view
				class="filter-item"
				:class="{ active: activeMemberType === 'friend' }"
				@click="changeMemberType('friend')"
			>
				<text class="filter-text">朋友</text>
				<view v-if="activeMemberType === 'friend'" class="filter-indicator"></view>
			</view>

			<view
				class="filter-item"
				:class="{ active: activeMemberType === 'agent' }"
				@click="changeMemberType('agent')"
			>
				<text class="filter-text">智能体</text>
				<view v-if="activeMemberType === 'agent'" class="filter-indicator"></view>
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
			class="member-scroll"
			scroll-y
			:lower-threshold="120"
			@scroll="onListScroll"
			@scrolltolower="loadMoreCurrent"
			@touchstart="onScrollTouchStart"
			@touchmove="onScrollTouchMove"
			@touchend="onScrollTouchEnd"
			@touchcancel="onScrollTouchEnd"
		>
			<view class="scroll-content" :style="scrollContentStyle">
				<view class="member-list" :style="memberListStyle">
					<view v-if="currentInitialLoading" class="state-box">
						<view class="loading-spinner"></view>
						<text class="state-text" :style="stateTextStyle">加载中...</text>
					</view>

					<template v-else>
						<template v-if="activeMemberType === 'friend'">
							<view
								class="member-item"
								:style="memberItemStyle"
								v-for="(user, index) in userList"
								:key="'friend-' + String(user.user_id || index)"
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

								<view class="member-info" :style="memberInfoStyle">
									<text class="member-name" :style="memberNameStyle">{{ user.username }}</text>
									<text class="member-desc" :style="memberDescStyle" v-if="user.bio">{{ user.bio }}</text>
								</view>
							</view>
						</template>

						<template v-else>
							<view
								class="member-item"
								:style="memberItemStyle"
								v-for="(agent, index) in agentList"
								:key="'agent-' + String(agent.agent_id || index)"
								@click="toggleAgentSelection(index)"
							>
								<text
									class="iconfont select-icon"
									:class="agent.selected ? 'icon-gouxuan' : 'icon-gouxuan1'"
									:style="selectIconStyle(agent)"
								></text>

								<image
									class="avatar agent-avatar"
									:style="agentAvatarStyle"
									:src="agent.avatar_uri || defaultAgentAvatar"
									mode="aspectFill"
								></image>

								<view class="member-info" :style="memberInfoStyle">
									<text class="member-name" :style="memberNameStyle">
										{{ agent.agent_name || '未命名智能体' }}
									</text>
									<text class="member-desc" :style="memberDescStyle">
										{{ agent.description || '暂无描述' }}
									</text>
								</view>
							</view>
						</template>

						<view v-if="currentListLength === 0" class="empty-state">
							<text
								class="iconfont empty-icon"
								:class="activeMemberType === 'friend' ? 'icon-wode' : 'icon-zhinengti'"
								:style="emptyIconStyle"
							></text>
							<text class="empty-text" :style="emptyTextStyle">
								{{ activeMemberType === 'friend' ? '暂无好友' : '暂无智能体' }}
							</text>
							<text class="empty-hint" :style="emptyHintStyle">
								{{ activeMemberType === 'friend' ? '快去添加好友吧！' : '快去创建智能体吧！' }}
							</text>
						</view>

						<view v-if="currentListLength > 0" class="bottom-status">
							<text class="bottom-text" :style="bottomTextStyle" v-if="currentLoadingMore">
								正在加载更多...
							</text>
							<text class="bottom-text" :style="bottomTextStyle" v-else-if="currentHasMore">
								上拉加载更多
							</text>
							<text class="bottom-text" :style="bottomTextStyle" v-else>
								没有更多了
							</text>
						</view>
					</template>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { getFriendList } from '@/request/action.js';
import { createConversation } from '@/request/im';
import { getAgentsByUser } from '@/request/agent.js';

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value));
};

const PULL_TRIGGER_DISTANCE = 64;
const PULL_MAX_DISTANCE = 92;
const PULL_MOVE_RATIO = 0.62;
const REFRESH_HOLD_OFFSET = 42;

export default {
	data() {
		return {
			activeMemberType: 'friend',

			userList: [],
			agentList: [],

			friendPage: 1,
			agentPage: 1,

			friendHasMore: true,
			agentHasMore: true,

			friendPageSize: 20,
			agentPageSize: 20,

			friendLoading: false,
			agentLoading: false,

			friendLoadingMore: false,
			agentLoadingMore: false,

			isRefreshing: false,

			scrollTop: 0,
			pulling: false,
			pullStartY: 0,
			pullDistance: 0,
			creating: false,

			defaultUserAvatar: '/static/user_avatar.png',
			defaultAgentAvatar: '/static/ai_avatar.png',

			windowWidth: 375,
			statusBarHeight: 0,
			headerContentHeight: 38,
			headerHeight: 38,
			filterBarHeight: 38,

			pagePadding: 14,
			cardPaddingX: 14,
			cardPaddingY: 12,
			cardRadius: 14,
			cardGap: 10,

			avatarSize: 48,
			agentAvatarRadius: 12,
			selectIconSize: 22,
			backIconSize: 19,
			titleFontSize: 17,

			createBtnHeight: 30,
			createBtnMinWidth: 76,
			createBtnFontSize: 14,

			memberNameFontSize: 16,
			memberDescFontSize: 13,
			memberInfoMargin: 10,

			emptyIconFontSize: 56,
			emptyTextFontSize: 16,
			emptyHintFontSize: 14,
			bottomTextFontSize: 13
		};
	},

	computed: {
		selectedFriendCount() {
			return this.userList.filter(user => user.selected).length;
		},

		selectedAgentCount() {
			return this.agentList.filter(agent => agent.selected).length;
		},

		selectedCount() {
			return this.selectedFriendCount + this.selectedAgentCount;
		},

		currentInitialLoading() {
			if (this.activeMemberType === 'friend') {
				return this.friendLoading && this.userList.length === 0;
			}

			return this.agentLoading && this.agentList.length === 0;
		},

		currentLoadingMore() {
			return this.activeMemberType === 'friend'
				? this.friendLoadingMore
				: this.agentLoadingMore;
		},

		currentHasMore() {
			return this.activeMemberType === 'friend'
				? this.friendHasMore
				: this.agentHasMore;
		},

		currentListLength() {
			return this.activeMemberType === 'friend'
				? this.userList.length
				: this.agentList.length;
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

		memberFilterBarStyle() {
			return 'height:' + this.filterBarHeight + 'px;';
		},

		memberListStyle() {
			return 'padding:' + this.pagePadding + 'px;';
		},

		memberItemStyle() {
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

		agentAvatarStyle() {
			return (
				'width:' + this.avatarSize + 'px;' +
				'height:' + this.avatarSize + 'px;' +
				'border-radius:' + this.agentAvatarRadius + 'px;'
			);
		},

		memberInfoStyle() {
			return 'margin-left:' + this.memberInfoMargin + 'px;';
		},

		memberNameStyle() {
			return 'font-size:' + this.memberNameFontSize + 'px;';
		},

		memberDescStyle() {
			return 'font-size:' + this.memberDescFontSize + 'px;';
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
			if (this.isRefreshing) return REFRESH_HOLD_OFFSET;

			return Math.min(
				REFRESH_HOLD_OFFSET,
				Math.round(this.pullDistance * PULL_MOVE_RATIO)
			);
		},

		scrollContentStyle() {
			const transition = this.pulling ? 'none' : 'transform 0.16s ease';

			return [
				'transform: translateY(' + this.pullVisualOffset + 'px)',
				'transition:' + transition
			].join(';');
		},

		refreshOverlayStyle() {
			const top = this.headerHeight + this.filterBarHeight;
			const active = this.isRefreshing;

			const height = active
				? 34
				: Math.min(34, Math.max(0, Math.round(this.pullDistance * 0.48)));

			const opacity = active
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
		this.loadFriendList(true);
	},

	onShow() {
		this.initResponsiveLayout();
	},

	methods: {
		onListScroll(e) {
			this.scrollTop = Number(e?.detail?.scrollTop || 0);
		},

		getTouchY(e) {
			const touch = e?.touches?.[0] || e?.changedTouches?.[0] || {};
			return Number(touch.clientY ?? touch.pageY ?? 0);
		},

		onScrollTouchStart(e) {
			if (this.isCurrentBusy()) return;

			this.pullStartY = this.getTouchY(e);
			this.pulling = this.scrollTop <= 2;
			this.pullDistance = 0;
		},

		onScrollTouchMove(e) {
			if (!this.pulling || this.isCurrentBusy()) return;

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
				this.filterBarHeight = clamp(Math.floor(windowWidth * 0.1), 36, 42);

				this.pagePadding = clamp(Math.floor(windowWidth * 0.038), 12, 18);
				this.cardPaddingX = clamp(Math.floor(windowWidth * 0.038), 12, 18);
				this.cardPaddingY = clamp(Math.floor(windowWidth * 0.032), 10, 14);
				this.cardRadius = clamp(Math.floor(windowWidth * 0.038), 12, 18);
				this.cardGap = clamp(Math.floor(windowWidth * 0.028), 9, 14);

				this.avatarSize = clamp(Math.floor(windowWidth * 0.128), 44, 54);
				this.agentAvatarRadius = clamp(Math.floor(this.avatarSize * 0.24), 10, 14);
				this.selectIconSize = clamp(Math.floor(windowWidth * 0.058), 20, 24);
				this.backIconSize = clamp(Math.floor(this.headerContentHeight * 0.5), 18, 21);
				this.titleFontSize = clamp(Math.floor(this.headerContentHeight * 0.44) + smallScreenBoost, 16, 18);

				this.createBtnHeight = clamp(Math.floor(this.headerContentHeight * 0.74), 28, 32);
				this.createBtnMinWidth = clamp(Math.floor(windowWidth * 0.2), 76, 88);
				this.createBtnFontSize = clamp(Math.floor(windowWidth * 0.036) + smallScreenBoost, 13, 15);

				this.memberNameFontSize = clamp(
					Math.floor(windowWidth * 0.043) + smallScreenBoost + tinyScreenBoost,
					16,
					18
				);
				this.memberDescFontSize = clamp(Math.floor(windowWidth * 0.034) + smallScreenBoost, 12, 14);
				this.memberInfoMargin = clamp(Math.floor(windowWidth * 0.03), 10, 14);

				this.emptyIconFontSize = clamp(Math.floor(windowWidth * 0.15), 52, 64);
				this.emptyTextFontSize = clamp(Math.floor(windowWidth * 0.04) + smallScreenBoost, 15, 17);
				this.emptyHintFontSize = clamp(Math.floor(windowWidth * 0.035) + smallScreenBoost, 13, 15);
				this.bottomTextFontSize = clamp(Math.floor(windowWidth * 0.034) + smallScreenBoost, 12, 14);
			} catch (err) {
				this.windowWidth = 375;
				this.statusBarHeight = 0;
				this.headerContentHeight = 38;
				this.headerHeight = 38;
				this.filterBarHeight = 38;

				this.pagePadding = 14;
				this.cardPaddingX = 14;
				this.cardPaddingY = 12;
				this.cardRadius = 14;
				this.cardGap = 10;

				this.avatarSize = 48;
				this.agentAvatarRadius = 12;
				this.selectIconSize = 22;
				this.backIconSize = 19;
				this.titleFontSize = 17;

				this.createBtnHeight = 30;
				this.createBtnMinWidth = 76;
				this.createBtnFontSize = 14;

				this.memberNameFontSize = 16;
				this.memberDescFontSize = 13;
				this.memberInfoMargin = 10;

				this.emptyIconFontSize = 56;
				this.emptyTextFontSize = 16;
				this.emptyHintFontSize = 14;
				this.bottomTextFontSize = 13;
			}
		},

		goBack() {
			uni.navigateBack();
		},

		changeMemberType(type) {
			if (this.activeMemberType === type) return;

			this.activeMemberType = type;
			this.scrollTop = 0;
			this.pullDistance = 0;
			this.pulling = false;

			if (type === 'friend') {
				if (this.userList.length === 0 && !this.friendLoading) {
					this.loadFriendList(true);
				}
				return;
			}

			if (this.agentList.length === 0 && !this.agentLoading) {
				this.loadAgentList(true);
			}
		},

		selectIconStyle(item) {
			const color = item && item.selected ? '#22c55e' : '#c9ced6';

			return (
				'font-size:' + this.selectIconSize + 'px;' +
				'color:' + color + ';'
			);
		},

		toggleUserSelection(index) {
			const user = this.userList[index];
			if (!user) return;

			this.userList.splice(index, 1, {
				...user,
				selected: !user.selected
			});
		},

		toggleAgentSelection(index) {
			const agent = this.agentList[index];
			if (!agent) return;

			this.agentList.splice(index, 1, {
				...agent,
				selected: !agent.selected
			});
		},

		isCurrentBusy() {
			if (this.isRefreshing) return true;

			if (this.activeMemberType === 'friend') {
				return this.friendLoading || this.friendLoadingMore;
			}

			return this.agentLoading || this.agentLoadingMore;
		},

		async onRefresh() {
			if (this.isCurrentBusy()) {
				this.pullDistance = 0;
				return;
			}

			this.isRefreshing = true;
			this.pullDistance = PULL_TRIGGER_DISTANCE;

			try {
				if (this.activeMemberType === 'friend') {
					await this.loadFriendList(true);
				} else {
					await this.loadAgentList(true);
				}
			} finally {
				this.isRefreshing = false;
				this.pullDistance = 0;
			}
		},

		loadMoreCurrent() {
			if (this.activeMemberType === 'friend') {
				this.loadFriendList(false);
				return;
			}

			this.loadAgentList(false);
		},

		async loadFriendList(reset = false) {
			if (this.friendLoading || this.friendLoadingMore) return;
			if (!reset && !this.friendHasMore) return;

			if (reset) {
				this.friendPage = 1;
				this.friendHasMore = true;
				this.friendLoading = true;
			} else {
				this.friendLoadingMore = true;
			}

			const selectedMap = new Map(
				this.userList.map(user => [String(user.user_id || ''), !!user.selected])
			);

			const payload = {
				userId: String(getApp().globalData.userId || ''),
				page: this.friendPage
			};

			let res = await getFriendList(payload);

			const list = res && Array.isArray(res.user_infos) ? res.user_infos : [];

			if (reset) this.userList = [];

			if (list.length === 0) {
				this.friendHasMore = false;
				this.friendLoading = false;
				this.friendLoadingMore = false;
				this.isRefreshing = false;
				return;
			}

			const exist = new Set(this.userList.map(u => String(u.user_id || u.userId || '')));

			const mapped = list
				.map(u => {
					const userId = String(u.user_id || u.userId || '');

					return {
						user_id: userId,
						username: u.username || '未知用户',
						avatar: u.avatar && u.avatar !== '' ? u.avatar : this.defaultUserAvatar,
						bio: u.bio,
						selected: selectedMap.has(userId) ? selectedMap.get(userId) : false
					};
				})
				.filter(u => u.user_id && !exist.has(u.user_id));

			this.userList = this.userList.concat(mapped);

			this.friendHasMore = list.length >= this.friendPageSize;
			this.friendPage += 1;

			this.friendLoading = false;
			this.friendLoadingMore = false;
			this.isRefreshing = false;
		},

		async loadAgentList(reset = false) {
			if (this.agentLoading || this.agentLoadingMore) return;
			if (!reset && !this.agentHasMore) return;

			if (reset) {
				this.agentPage = 1;
				this.agentHasMore = true;
				this.agentLoading = true;
			} else {
				this.agentLoadingMore = true;
			}

			const selectedMap = new Map(
				this.agentList.map(agent => [String(agent.agent_id || ''), !!agent.selected])
			);

			let res = await getAgentsByUser({
					page: this.agentPage
				});

			const list = res && Array.isArray(res.agents) ? res.agents : [];

			if (reset) this.agentList = [];

			if (list.length === 0) {
				this.agentHasMore = false;
				this.agentLoading = false;
				this.agentLoadingMore = false;
				this.isRefreshing = false;
				return;
			}

			const exist = new Set(this.agentList.map(agent => String(agent.agent_id || '')));

			const mapped = list
				.map(item => {
					const agentId = item?.agent_id ? String(item.agent_id) : '';

					return {
						agent_id: agentId,
						agent_name: item?.agent_name || '',
						avatar_uri: item?.avatar_uri || '',
						description: item?.description || '',
						personality: item?.personality || '',
						selected: selectedMap.has(agentId) ? selectedMap.get(agentId) : false
					};
				})
				.filter(item => item.agent_id && !exist.has(item.agent_id));

			this.agentList = this.agentList.concat(mapped);

			this.agentHasMore = list.length >= this.agentPageSize;
			this.agentPage += 1;

			this.agentLoading = false;
			this.agentLoadingMore = false;
			this.isRefreshing = false;
		},

		async createConversation() {
			if (this.creating) return;

			const selectedUserIds = this.userList
				.filter(user => user.selected)
				.map(user => user.user_id);

			const selectedAgentIds = this.agentList
				.filter(agent => agent.selected)
				.map(agent => agent.agent_id);

			if (selectedUserIds.length === 0 && selectedAgentIds.length === 0) {
				uni.showToast({
					title: '请选择成员',
					icon: 'none'
				});
				return;
			}

			this.creating = true;

			try {
				const res = await createConversation({
					members: selectedUserIds,
					agentMembers: selectedAgentIds
				});

				if (!res) return;

				uni.showToast({
					title: '创建成功',
					icon: 'success'
				});

				setTimeout(() => {
					uni.redirectTo({
						url: `/pages/im/conversation?conId=${res.con_id}&name=群聊&conType=${res.con_type || 2}`
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
	white-space: nowrap;
	flex-shrink: 0;
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
	white-space: nowrap;
}

.member-filter-bar {
	width: 100%;
	display: flex;
	background: #ffffff;
	flex-shrink: 0;
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

.member-scroll {
	flex: 1;
	overflow: hidden;
	background: #f7f8fa;
}

.member-list {
	box-sizing: border-box;
}

.member-item {
	display: flex;
	align-items: center;
	background: #ffffff;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
}

.member-item:active {
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

.agent-avatar {
	border: 1px solid #eef1f6;
	box-sizing: border-box;
}

.member-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4px;
	overflow: hidden;
	min-width: 0;
}

.member-name {
	font-weight: 400;
	color: #1f2329;
	line-height: 1.4;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.member-desc {
	font-weight: 400;
	color: #999;
	line-height: 1.35;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.state-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 90px 20px;
	box-sizing: border-box;
	gap: 12px;
}

.state-text {
	color: #999999;
	font-weight: 400;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 90px 20px;
	box-sizing: border-box;
}

.iconfont.empty-icon {
	line-height: 1;
	margin-bottom: 14px;
	color: #d8a25d !important;
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