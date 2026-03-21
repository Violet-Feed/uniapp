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

						<view class="agent-bottom">
							<text class="meta-text">{{ formatTime(item.create_time) }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import DB from '@/utils/sqlite.js';

export default {
	data() {
		return {
			conId: '',
			agents: [],
			loading: false,
			firstShowDone: false,
			defaultAvatar: '/static/ai.png'
		};
	},
	onLoad(option) {
		this.conId = option?.conId ? option.conId : '';
		if (!this.conId) {
			uni.navigateBack();
			return;
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
				description: item?.description || '',
				create_time: item?.create_time || 0
			}));
		},

		goBack() {
			uni.navigateBack();
		},

		goAddAgentMember() {
			uni.navigateTo({
				url: `/pages/agent/add_agent_member?conId=${this.conId}`
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