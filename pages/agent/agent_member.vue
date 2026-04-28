<template>
	<view class="agent-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="nav-action">返回</text>
			</view>
			<view class="nav-title">智能体成员</view>
			<view class="nav-right" @click="goAddAgentMember">
				<text class="nav-action nav-action-primary">添加</text>
			</view>
		</view>

		<view class="page-body">
			<view class="state-box" v-if="loading && agents.length === 0">
				<text class="state-text">加载中...</text>
			</view>

			<view class="state-box" v-else-if="!loading && agents.length === 0">
				<text class="state-text">暂无智能体成员</text>
			</view>

			<view v-else class="list-wrap">
				<view
					class="agent-card"
					v-for="item in agents"
					:key="item.agent_id"
					@click="goDetail(item)"
					@longpress.stop="showRemoveAction(item)"
				>
					<image
						class="avatar"
						:src="item.avatar_uri || defaultAvatar"
						mode="aspectFill"
					/>

					<view class="agent-main">
						<view class="agent-top">
							<text class="agent-name">{{ item.nick_name || '未命名智能体' }}</text>
						</view>

						<text class="agent-desc">
							{{ item.description || '暂无描述' }}
						</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import DB from '@/utils/sqlite.js';
import { removeConversationAgent } from '@/request/im.js';

export default {
	data() {
		return {
			conId: '',
			conShortId: 0,
			agents: [],
			loading: false,
			removingAgentId: '',
			firstShowDone: false,
			defaultAvatar: '/static/ai.png'
		};
	},

	async onLoad(option) {
		this.conId = option?.conId ? option.conId : '';
		if (!this.conId) {
			uni.navigateBack();
			return;
		}

		const res = await DB.getConversationById(this.conId);
		const conversation = Array.isArray(res) ? res[0] : res;
		if (conversation) {
			this.conShortId = conversation.con_short_id;
		}

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

	methods: {
		async refreshList() {
			if (this.loading || !this.conId) {
				uni.stopPullDownRefresh();
				return;
			}

			this.loading = true;

			const rows = await DB.pullAgentMembers(this.conId);
			this.agents = this.normalizeAgents(rows);

			this.loading = false;
			uni.stopPullDownRefresh();
		},

		normalizeAgents(list) {
			if (!Array.isArray(list)) return [];

			return list.map(item => ({
				con_short_id: item?.con_short_id ? String(item.con_short_id) : '',
				con_id: item?.con_id ? String(item.con_id) : '',
				agent_id: item?.agent_id ? String(item.agent_id) : '',
				nick_name: item?.nick_name || '',
				avatar_uri: item?.avatar_uri || '',
				description: item?.description || ''
			})).filter(item => !!item.agent_id);
		},

		showRemoveAction(item) {
			const agentId = item?.agent_id ? String(item.agent_id) : '';
			if (!agentId || this.removingAgentId) return;

			uni.showActionSheet({
				itemList: ['移出群聊'],
				success: res => {
					if (res.tapIndex === 0) {
						this.confirmRemoveAgent(item);
					}
				}
			});
		},

		confirmRemoveAgent(item) {
			const name = item?.nick_name || '该智能体';

			uni.showModal({
				title: '移出群聊',
				content: `确定将「${name}」移出群聊吗？`,
				confirmText: '移出',
				confirmColor: '#ff4d4f',
				success: res => {
					if (res.confirm) {
						this.removeAgent(item);
					}
				}
			});
		},

		async removeAgent(item) {
			const agentId = item?.agent_id ? String(item.agent_id) : '';
			const conShortId = this.conShortId || item?.con_short_id;

			if (!agentId || !conShortId || this.removingAgentId) return;

			this.removingAgentId = agentId;

			const res = await removeConversationAgent({
				conShortId,
				agentId
			});

			this.removingAgentId = '';

			if (!res) return;

			this.agents = this.agents.filter(agent => String(agent.agent_id) !== agentId);
		},

		goBack() {
			uni.navigateBack();
		},

		goAddAgentMember() {
			uni.navigateTo({
				url: `/pages/agent/add_agent_member?conId=${this.conId}`
			});
		},

		goDetail(item) {
			if (!item?.agent_id) return;
			uni.navigateTo({
				url: `/pages/agent/agent_detail?agentId=${encodeURIComponent(item.agent_id)}`
			});
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

.state-box {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx 0;
}

.state-text {
	font-size: 26rpx;
	color: #98a2b3;
}
</style>