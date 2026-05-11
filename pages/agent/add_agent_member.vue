<template>
	<view class="agent-page">
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">添加智能体</text>
				</view>

				<view class="nav-right">
					<button
						class="nav-pill-btn"
						:class="{ 'nav-pill-btn-disabled': submitting }"
						:style="navBtnStyle"
						@click.stop="confirmAdd"
					>
						{{ submitting ? '确定中' : '确定' }}
					</button>
				</view>
			</view>
		</view>

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
					:class="{ 'agent-card-disabled': isExistingAgent(item.agent_id) }"
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
						:src="item.avatar_uri || defaultAvatar"
						mode="aspectFill"
					/>

					<view class="agent-main" :style="agentMainStyle">
						<text class="agent-name" :style="agentNameStyle">
							{{ item.agent_name || '未命名智能体' }}
						</text>

						<text class="agent-desc" :style="agentDescStyle">
							{{ item.description || '暂无描述' }}
						</text>
					</view>
				</view>

				<view class="bottom-status">
					<text class="bottom-text" :style="stateTextStyle" v-if="loadingMore">正在加载更多...</text>
					<text class="bottom-text" :style="stateTextStyle" v-else-if="finished">没有更多了</text>
					<text class="bottom-text" :style="stateTextStyle" v-else>上拉加载更多</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import DB from '@/utils/sqlite.js';
import { getAgentsByUser } from '@/request/agent.js';
import { addConversationAgents } from '@/request/im';

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value));
};

export default {
	data() {
		return {
			conId: '',
			conShortId: 0,
			agents: [],
			page: 1,
			loading: false,
			loadingMore: false,
			finished: false,
			submitting: false,
			existingAgentIdSet: {},
			selectedAgentIdSet: {},
			defaultAvatar: '/static/ai.png',

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
			selectIconSize: 22,
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
		}
	},

	async onLoad(option) {
		this.initResponsiveLayout();

		this.conId = option?.conId ? option.conId : '';
		if (!this.conId) {
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

	onPullDownRefresh() {
		this.refreshList();
	},

	onReachBottom() {
		this.loadMore();
	},

	methods: {
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
				this.selectIconSize = clamp(Math.floor(windowWidth * 0.058), 20, 24);

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
				this.selectIconSize = 22;
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

		async loadExistingMembers() {
			const rows = await DB.pullAgentMembers(this.conId);
			const list = Array.isArray(rows) ? rows : [];

			const existingMap = {};
			list.forEach(item => {
				const agentId = item?.agent_id ? String(item.agent_id) : '';
				if (agentId) {
					existingMap[agentId] = true;
				}
			});

			this.existingAgentIdSet = existingMap;
			this.selectedAgentIdSet = { ...existingMap };
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

			const res = await getAgentsByUser({ page: 1 });
			if (res === undefined) {
				this.loading = false;
				uni.stopPullDownRefresh();
				return;
			}

			const list = this.normalizeAgents(res?.agents);
			this.agents = list;
			this.finished = list.length === 0;

			this.loading = false;
			uni.stopPullDownRefresh();
		},

		async loadMore() {
			if (this.loading || this.loadingMore || this.finished) return;

			this.loadingMore = true;
			const nextPage = this.page + 1;

			const res = await getAgentsByUser({ page: nextPage });
			if (res === undefined) {
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
				description: item?.description || ''
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

		isExistingAgent(agentId) {
			return !!this.existingAgentIdSet[String(agentId)];
		},

		isSelectedAgent(agentId) {
			return !!this.selectedAgentIdSet[String(agentId)];
		},

		selectIconClass(item) {
			const agentId = item?.agent_id ? String(item.agent_id) : '';
			if (this.isSelectedAgent(agentId) || this.isExistingAgent(agentId)) {
				return 'icon-gouxuan';
			}
			return 'icon-gouxuan1';
		},

		selectIconStyle(item) {
			const agentId = item?.agent_id ? String(item.agent_id) : '';
			const active = this.isSelectedAgent(agentId) || this.isExistingAgent(agentId);
			const color = active ? '#22c55e' : '#c9ced6';

			return (
				'font-size:' + this.selectIconSize + 'px;' +
				'color:' + color + ';'
			);
		},

		toggleSelect(item) {
			const agentId = item?.agent_id ? String(item.agent_id) : '';
			if (!agentId) return;
			if (this.isExistingAgent(agentId)) return;

			const selectedMap = { ...this.selectedAgentIdSet };

			if (selectedMap[agentId]) {
				delete selectedMap[agentId];
			} else {
				selectedMap[agentId] = true;
			}

			this.selectedAgentIdSet = selectedMap;
		},

		async confirmAdd() {
			if (this.submitting) return;

			const selectedIds = Object.keys(this.selectedAgentIdSet);
			const existingIds = this.existingAgentIdSet;
			const newAgentIds = selectedIds.filter(id => !existingIds[id]);

			if (newAgentIds.length === 0) {
				uni.navigateBack();
				return;
			}

			this.submitting = true;

			try {
				const res = await addConversationAgents({
					conShortId: this.conShortId,
					agentIds: newAgentIds
				});

				if (!res) return;

				uni.navigateBack();
			} finally {
				this.submitting = false;
			}
		},

		goBack() {
			uni.navigateBack();
		}
	}
};
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.agent-page {
	min-height: 100vh;
	background: #f7f8fa;
	font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
	box-sizing: border-box;
}

.nav-bar {
	width: 100%;
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

.nav-pill-btn-disabled {
	opacity: 0.72;
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

.agent-card-disabled {
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

.state-box,
.bottom-status {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx 0;
}

.state-text,
.bottom-text {
	color: #98a2b3;
	font-weight: 400;
}
</style>