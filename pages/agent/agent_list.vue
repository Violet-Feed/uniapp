<template>
	<view class="agent-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="nav-action">返回</text>
			</view>
			<view class="nav-title">我的智能体</view>
			<view class="nav-right" @click="goCreate">
				<text class="nav-action nav-action-primary">创建</text>
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
					@click="goDetail(item)"
					@longpress="showAgentOptions(item)"
				>
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

						<view class="agent-bottom">
							<text class="meta-text">{{ formatTime(item.create_time) }}</text>
						</view>
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
import { getAgentsByUser, deleteAgent } from '@/request/agent.js';

export default {
	data() {
		return {
			agents: [],
			page: 1,
			loading: false,
			loadingMore: false,
			finished: false,
			firstShowDone: false,
			defaultAvatar: '/static/ai.png'
		};
	},
	onLoad() {
		this.refreshList();
	},
	onShow() {
		if (this.firstShowDone) {
			this.refreshList();
			return;
		}
		this.firstShowDone = true;
	},
	onPullDownRefresh() {
		this.refreshList();
	},
	onReachBottom() {
		this.loadMore();
	},
	methods: {
		async refreshList() {
			if (this.loading) return;

			this.loading = true;
			this.page = 1;
			this.finished = false;

			try {
				const res = await getAgentsByUser({ page: 1 });
				if (res === undefined) return;

				const list = this.normalizeAgents(res?.agents);
				this.agents = list;
				this.finished = list.length === 0;
			} catch (e) {
				console.error('刷新智能体列表失败：', e);
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
			} finally {
				this.loading = false;
				uni.stopPullDownRefresh();
			}
		},

		async loadMore() {
			if (this.loading || this.loadingMore || this.finished) return;

			this.loadingMore = true;
			const nextPage = this.page + 1;

			try {
				const res = await getAgentsByUser({ page: nextPage });
				if (res === undefined) return;

				const list = this.normalizeAgents(res?.agents);

				if (list.length === 0) {
					this.finished = true;
					return;
				}

				this.agents = this.mergeAgents(this.agents, list);
				this.page = nextPage;
			} catch (e) {
				console.error('加载更多智能体失败：', e);
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
			} finally {
				this.loadingMore = false;
			}
		},

		normalizeAgents(list) {
			if (!Array.isArray(list)) return [];
			return list.map(item => ({
				agent_id: item?.agent_id ? String(item.agent_id) : '',
				agent_name: item?.agent_name || '',
				avatar_uri: item?.avatar_uri || '',
				description: item?.description || '',
				personality: item?.personality || '',
				create_time: item?.create_time || 0
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
			if (!item?.agent_id) return;

			uni.showActionSheet({
				itemList: ['编辑', '删除'],
				success: (res) => {
					if (res.tapIndex === 0) {
						this.goEdit(item);
					} else if (res.tapIndex === 1) {
						this.confirmDelete(item);
					}
				}
			});
		},

		goEdit(item) {
			uni.navigateTo({
				url: `/pages/agent/edit_agent?agentId=${encodeURIComponent(item.agent_id)}`
			});
		},

		confirmDelete(item) {
			uni.showModal({
				title: '提示',
				content: '确定要删除这个智能体吗？',
				success: async (res) => {
					if (!res.confirm) return;

					try {
						const ok = await deleteAgent({
							agentId: item.agent_id
						});

						if (!ok) {
							throw new Error('deleteAgent 返回失败');
						}

						this.agents = this.agents.filter(agent => agent.agent_id !== item.agent_id);

						uni.showToast({
							title: '删除成功',
							icon: 'success'
						});
					} catch (e) {
						console.error('删除智能体失败：', e);
						uni.showToast({
							title: '删除失败',
							icon: 'none'
						});
					}
				}
			});
		},

		formatTime(timestamp) {
			if (!timestamp) return '-';

			let value = Number(timestamp);
			if (!Number.isFinite(value)) return '-';
			if (value < 1e12) value *= 1000;

			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return '-';

			const y = date.getFullYear();
			const m = String(date.getMonth() + 1).padStart(2, '0');
			const d = String(date.getDate()).padStart(2, '0');
			const hh = String(date.getHours()).padStart(2, '0');
			const mm = String(date.getMinutes()).padStart(2, '0');

			return `${y}-${m}-${d} ${hh}:${mm}`;
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
	align-items: stretch;
	padding: 24rpx;
	margin-bottom: 20rpx;
	background: #ffffff;
	border-radius: 20rpx;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
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
	justify-content: space-between;
}

.agent-top,
.agent-bottom {
	display: flex;
	align-items: center;
}

.agent-name {
	font-size: 32rpx;
	font-weight: 600;
	color: #1f2329;
	line-height: 1.4;
}

.agent-desc {
	font-size: 26rpx;
	line-height: 1.5;
	color: #4e5969;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.meta-text {
	font-size: 22rpx;
	color: #a0a7b4;
	line-height: 1.4;
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