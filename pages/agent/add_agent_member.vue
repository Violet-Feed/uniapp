<template>
	<view class="agent-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="nav-action">返回</text>
			</view>
			<view class="nav-title">添加智能体</view>
			<view class="nav-right" @click="confirmAdd">
				<text class="nav-action nav-action-primary">
					{{ submitting ? '确定中' : '确定' }}
				</text>
			</view>
		</view>

		<view class="page-body">
			<view class="state-box" v-if="loading && agents.length === 0">
				<text class="state-text">加载中...</text>
			</view>

			<view class="state-box" v-else-if="!loading && agents.length === 0">
				<text class="state-text">你还没有创建智能体</text>
			</view>

			<view v-else class="list-wrap">
				<view
					class="agent-card"
					v-for="item in agents"
					:key="item.agent_id"
					:class="{ 'agent-card-disabled': isExistingAgent(item.agent_id) }"
					@click="toggleSelect(item)"
				>
					<view
						class="select-circle"
						:class="{
							'select-circle-active': isSelectedAgent(item.agent_id),
							'select-circle-disabled': isExistingAgent(item.agent_id)
						}"
					>
						<text
							v-if="isSelectedAgent(item.agent_id) || isExistingAgent(item.agent_id)"
							class="select-check"
						>✓</text>
					</view>

					<image
						class="avatar"
						:src="item.avatar_uri || defaultAvatar"
						mode="aspectFill"
					/>

					<view class="agent-main">
						<view class="agent-top">
							<text class="agent-name">{{ item.agent_name || '未命名智能体' }}</text>
						</view>

						<text class="agent-desc">
							{{ item.description || '暂无描述' }}
						</text>
					</view>
				</view>

				<view class="bottom-status">
					<text class="bottom-text" v-if="loadingMore">正在加载更多...</text>
					<text class="bottom-text" v-else-if="finished">没有更多了</text>
					<text class="bottom-text" v-else>上拉加载更多</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import DB from '@/utils/sqlite.js';
import { getAgentsByUser } from '@/request/agent.js';
import { addConversationAgents } from '@/request/im';

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
			defaultAvatar: '/static/ai.png'
		};
	},
	async onLoad(option) {
		this.conId = option?.conId ? option.conId : '';
		if (!this.conId) {
			uni.navigateBack();
			return;
		}
		let res = await DB.getConversationById(this.conId);
		const conversation = Array.isArray(res) ? res[0] : res;
		if (conversation) {
			this.conShortId = conversation.con_short_id;
		} else {
			uni.navigateBack();
			return;
		}
		this.refreshList();
	},
	onPullDownRefresh() {
		this.refreshList();
	},
	onReachBottom() {
		this.loadMore();
	},
	methods: {
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
			}));
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
			const res = await addConversationAgents({
				conShortId: this.conShortId,
				agentIds: newAgentIds
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

<style scoped>
.agent-page {
	min-height: 100vh;
	background: #f7f8fa;
}

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 88rpx;
	padding: calc(var(--status-bar-height) + 12rpx) 24rpx 12rpx;
	background: #ffffff;
	border-bottom: 1rpx solid #eceef2;
	box-sizing: content-box;
}

.nav-left,
.nav-right {
	min-width: 100rpx;
	display: flex;
	align-items: center;
}

.nav-left {
	justify-content: flex-start;
}

.nav-right {
	justify-content: flex-end;
}

.nav-title {
	font-size: 34rpx;
	font-weight: 600;
	color: #1f2329;
}

.nav-action {
	font-size: 28rpx;
	color: #4e5969;
}

.nav-action-primary {
	color: #4f7cff;
	font-weight: 600;
}

.page-body {
	padding: 24rpx;
}

.agent-card {
	display: flex;
	align-items: center;
	padding: 24rpx;
	margin-bottom: 20rpx;
	background: #ffffff;
	border-radius: 20rpx;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
}

.agent-card-disabled {
	opacity: 0.86;
}

.select-circle {
	width: 36rpx;
	height: 36rpx;
	border-radius: 50%;
	border: 2rpx solid #c9ced6;
	background: #ffffff;
	flex-shrink: 0;
	margin-right: 20rpx;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
}

.select-circle-active {
	background: #4f7cff;
	border-color: #4f7cff;
}

.select-circle-disabled {
	background: #4f7cff;
	border-color: #4f7cff;
}

.select-check {
	font-size: 24rpx;
	font-weight: 700;
	color: #ffffff;
	line-height: 1;
}

.avatar {
	width: 104rpx;
	height: 104rpx;
	border-radius: 24rpx;
	background: #eef1f6;
	flex-shrink: 0;
}

.agent-main {
	flex: 1;
	min-width: 0;
	height: 104rpx;
	margin-left: 20rpx;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.agent-top {
	display: flex;
	align-items: center;
}

.agent-name {
	font-size: 32rpx;
	font-weight: 600;
	color: #1f2329;
	line-height: 1.4;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.agent-desc {
	margin-top: 8rpx;
	font-size: 26rpx;
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
	font-size: 26rpx;
	color: #98a2b3;
}
</style>