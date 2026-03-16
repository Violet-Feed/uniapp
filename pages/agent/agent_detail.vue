<template>
	<view class="detail-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="nav-action">返回</text>
			</view>
			<view class="nav-title">智能体详情</view>
			<view class="nav-right" @click="editDetail">
				<text class="nav-action nav-action-primary">编辑</text>
			</view>
		</view>

		<view class="page-body">
			<view class="state-box" v-if="loading">
				<text class="state-text">加载中...</text>
			</view>

			<view class="state-box" v-else-if="!agent">
				<text class="state-text">未找到该智能体</text>
			</view>

			<view v-else>
				<view class="profile-card">
					<image
						class="avatar"
						:src="agent.avatar_uri || defaultAgentAvatar"
						mode="aspectFill"
					/>
					<view class="profile-main">
						<text class="agent-name">{{ agent.agent_name || '未命名智能体' }}</text>
						<text class="agent-time">创建时间：{{ formatTime(agent.create_time) }}</text>
					</view>
				</view>

				<view class="section-card">
					<text class="section-title">简介</text>
					<text class="section-content" v-if="agent.description">
						{{ agent.description }}
					</text>
					<text class="section-content section-content-empty" v-else>
						暂无描述
					</text>
				</view>

				<view class="section-card">
					<text class="section-title">人格设定</text>
					<text class="section-content" v-if="agent.personality">
						{{ agent.personality }}
					</text>
					<text class="section-content section-content-empty" v-else>
						暂无人格设定
					</text>
				</view>

				<view class="section-card">
					<text class="section-title">创建人</text>
					<view class="owner-row" @click="goOwnerProfile">
						<image
							class="owner-avatar"
							:src="agent.owner_avatar || defaultUserAvatar"
							mode="aspectFill"
						/>
						<view class="owner-main">
							<text class="owner-name">{{ agent.owner_username || '未知用户' }}</text>
						</view>
						<text class="owner-arrow">></text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getAgentsByIds } from '@/request/agent.js';

export default {
	data() {
		return {
			agentId: '',
			agent: null,
			loading: false,
			defaultAgentAvatar: '/static/ai.png',
			defaultUserAvatar: '/static/user_avatar.png'
		};
	},
	onLoad(option) {
		this.agentId = option?.agentId ? decodeURIComponent(option.agentId) : '';
		if (!this.agentId) {
			uni.navigateBack();
			return;
		}
		this.loadDetail();
	},
	onPullDownRefresh() {
		this.loadDetail();
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},

		async loadDetail() {
			if (!this.agentId || this.loading) {
				uni.stopPullDownRefresh();
				return;
			}

			this.loading = true;

			const res = await getAgentsByIds({
				agentIds: [this.agentId]
			});

			if (res === undefined) {
				this.loading = false;
				uni.stopPullDownRefresh();
				return;
			}

			const list = Array.isArray(res?.agents) ? res.agents : [];
			if (list.length === 0) {
				this.agent = null;
				this.loading = false;
				uni.stopPullDownRefresh();
				return;
			}

			const item = list[0];
			this.agent = {
				agent_id: item?.agent_id ? String(item.agent_id) : '',
				agent_name: item?.agent_name || '',
				avatar_uri: item?.avatar_uri || '',
				description: item?.description || '',
				personality: item?.personality || '',
				owner_id: item?.owner_id ? String(item.owner_id) : '',
				owner_avatar: item?.owner_avatar || '',
				owner_username: item?.owner_username || '',
				create_time: item?.create_time || 0
			};

			this.loading = false;
			uni.stopPullDownRefresh();
		},
		
		async editDetail() {
			
		},

		getCurrentUserId() {
			const globalData = getApp().globalData || {};
			return String(
				globalData.userId ||
				''
			);
		},

		goOwnerProfile() {
			const ownerId = this.agent?.owner_id ? String(this.agent.owner_id) : '';
			if (!ownerId) return;

			const currentUserId = this.getCurrentUserId();

			if (currentUserId && currentUserId === ownerId) {
				uni.navigateTo({
					url: '/pages/user/my_profile_copy'
				});
				return;
			}

			uni.navigateTo({
				url: `/pages/user/user_profile?userId=${encodeURIComponent(ownerId)}`
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
.detail-page {
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

.profile-card,
.section-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 24rpx;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	margin-bottom: 20rpx;
}

.profile-card {
	display: flex;
	align-items: center;
}

.avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 28rpx;
	background: #eef1f6;
	flex-shrink: 0;
}

.profile-main {
	flex: 1;
	min-width: 0;
	margin-left: 20rpx;
	display: flex;
	flex-direction: column;
}

.agent-name {
	font-size: 36rpx;
	font-weight: 700;
	color: #1f2329;
	line-height: 1.4;
	margin-bottom: 10rpx;
}

.agent-time {
	font-size: 24rpx;
	line-height: 1.6;
	color: #7a8599;
}

.section-title {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #1f2329;
	margin-bottom: 16rpx;
}

.section-content {
	display: block;
	font-size: 27rpx;
	line-height: 1.8;
	color: #4e5969;
	white-space: pre-wrap;
	word-break: break-word;
}

.section-content-empty {
	color: #a0a7b4;
}

.owner-row {
	display: flex;
	align-items: center;
}

.owner-avatar {
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	background: #eef1f6;
	flex-shrink: 0;
}

.owner-main {
	flex: 1;
	min-width: 0;
	margin-left: 20rpx;
}

.owner-name {
	font-size: 28rpx;
	font-weight: 500;
	color: #1f2329;
}

.owner-arrow {
	font-size: 28rpx;
	color: #a0a7b4;
	margin-left: 12rpx;
}

.state-box {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 48rpx 0;
}

.state-text {
	font-size: 26rpx;
	color: #98a2b3;
}
</style>