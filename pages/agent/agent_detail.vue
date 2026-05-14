<template>
	<view class="detail-page">
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">智能体详情</text>
				</view>

				<view class="nav-right"></view>
			</view>
		</view>

		<view class="page-body" :style="pageBodyStyle">
			<view class="state-box" v-if="loading">
				<text class="state-text" :style="stateTextStyle">加载中...</text>
			</view>

			<view class="state-box" v-else-if="!agent">
				<text class="state-text" :style="stateTextStyle">未找到该智能体</text>
			</view>

			<view v-else>
				<view class="profile-card" :style="cardStyle">
					<image
						class="avatar"
						:style="avatarStyle"
						:src="agent.local_avatar_uri || agent.avatar_uri || defaultAgentAvatar"
						mode="aspectFill"
					/>

					<view class="profile-main" :style="profileMainStyle">
						<text class="agent-name" :style="agentNameStyle">
							{{ agent.agent_name || '未命名智能体' }}
						</text>
						<text class="agent-time" :style="agentTimeStyle">
							创建时间：{{ formatTime(agent.create_time) }}
						</text>
					</view>
				</view>

				<view
					class="primary-btn"
					:style="primaryBtnStyle"
					@click="goPrivateChat"
				>
					<text class="iconfont icon-xiaoxi primary-btn-icon" :style="primaryBtnIconStyle"></text>
					<text class="primary-btn-text" :style="primaryBtnTextStyle">私聊</text>
				</view>

				<view class="section-card" :style="cardStyle">
					<text class="section-title" :style="sectionTitleStyle">简介</text>
					<text class="section-content" :style="sectionContentStyle" v-if="agent.description">
						{{ agent.description }}
					</text>
					<text class="section-content section-content-empty" :style="sectionContentStyle" v-else>
						暂无描述
					</text>
				</view>

				<view class="section-card" :style="cardStyle">
					<text class="section-title" :style="sectionTitleStyle">人格设定</text>
					<text class="section-content" :style="sectionContentStyle" v-if="agent.personality">
						{{ agent.personality }}
					</text>
					<text class="section-content section-content-empty" :style="sectionContentStyle" v-else>
						暂无人格设定
					</text>
				</view>

				<view class="section-card" :style="cardStyle">
					<text class="section-title" :style="sectionTitleStyle">创建人</text>
					<view class="owner-row" @click="goOwnerProfile">
						<image
							class="owner-avatar"
							:style="ownerAvatarStyle"
							:src="agent.owner_avatar || defaultUserAvatar"
							mode="aspectFill"
						/>

						<view class="owner-main" :style="ownerMainStyle">
							<text class="owner-name" :style="ownerNameStyle">
								{{ agent.owner_username || '用户' }}
							</text>
						</view>

						<text class="owner-arrow" :style="ownerArrowStyle">›</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getAgentsByIds } from '@/request/agent.js';
import DB from '@/utils/sqlite.js';
import { enqueueEntityAvatars } from '@/utils/im-cache.js';

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value));
};

export default {
	data() {
		return {
			agentId: '',
			agent: null,
			loading: false,
			defaultAgentAvatar: '/static/ai_avatar.png',
			defaultUserAvatar: '/static/user_avatar.png',

			windowWidth: 375,
			statusBarHeight: 0,
			headerContentHeight: 38,
			headerHeight: 38,

			pagePadding: 14,
			cardPadding: 14,
			cardRadius: 14,
			cardGap: 10,

			backIconSize: 19,
			navTitleFontSize: 17,

			avatarSize: 58,
			avatarRadius: 14,
			profileMainMargin: 12,

			agentNameFontSize: 17,
			agentTimeFontSize: 12,

			primaryBtnHeight: 36,
			primaryBtnFontSize: 14,
			primaryBtnIconSize: 15,

			sectionTitleFontSize: 15,
			sectionContentFontSize: 14,

			ownerAvatarSize: 24,
			ownerNameFontSize: 14,
			ownerArrowFontSize: 20,

			stateFontSize: 13
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
			return 'font-size:' + this.navTitleFontSize + 'px;';
		},

		pageBodyStyle() {
			return 'padding:' + this.pagePadding + 'px;';
		},

		cardStyle() {
			return (
				'padding:' + this.cardPadding + 'px;' +
				'border-radius:' + this.cardRadius + 'px;' +
				'margin-bottom:' + this.cardGap + 'px;'
			);
		},

		avatarStyle() {
			return (
				'width:' + this.avatarSize + 'px;' +
				'height:' + this.avatarSize + 'px;' +
				'border-radius:' + this.avatarRadius + 'px;'
			);
		},

		profileMainStyle() {
			return 'margin-left:' + this.profileMainMargin + 'px;';
		},

		agentNameStyle() {
			return 'font-size:' + this.agentNameFontSize + 'px;';
		},

		agentTimeStyle() {
			return 'font-size:' + this.agentTimeFontSize + 'px;';
		},

		primaryBtnStyle() {
			return (
				'height:' + this.primaryBtnHeight + 'px;' +
				'border-radius:' + Math.floor(this.primaryBtnHeight / 2) + 'px;' +
				'margin-bottom:' + this.cardGap + 'px;'
			);
		},

		primaryBtnIconStyle() {
			return 'font-size:' + this.primaryBtnIconSize + 'px;';
		},

		primaryBtnTextStyle() {
			return 'font-size:' + this.primaryBtnFontSize + 'px;';
		},

		sectionTitleStyle() {
			return 'font-size:' + this.sectionTitleFontSize + 'px;';
		},

		sectionContentStyle() {
			return 'font-size:' + this.sectionContentFontSize + 'px;';
		},

		ownerAvatarStyle() {
			const radius = Math.floor(this.ownerAvatarSize / 2);
			return (
				'width:' + this.ownerAvatarSize + 'px;' +
				'height:' + this.ownerAvatarSize + 'px;' +
				'border-radius:' + radius + 'px;'
			);
		},

		ownerMainStyle() {
			return 'margin-left:' + Math.max(8, Math.floor(this.windowWidth * 0.024)) + 'px;';
		},

		ownerNameStyle() {
			return 'font-size:' + this.ownerNameFontSize + 'px;';
		},

		ownerArrowStyle() {
			return 'font-size:' + this.ownerArrowFontSize + 'px;';
		},

		stateTextStyle() {
			return 'font-size:' + this.stateFontSize + 'px;';
		}
	},

	onLoad(option) {
		this.initResponsiveLayout();

		this.agentId = option?.agentId ? decodeURIComponent(option.agentId) : '';
		if (!this.agentId) {
			uni.navigateBack();
			return;
		}
		this.loadDetail();
	},

	onShow() {
		this.initResponsiveLayout();
	},


	methods: {
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

				this.pagePadding = clamp(Math.floor(windowWidth * 0.038), 12, 18);
				this.cardPadding = clamp(Math.floor(windowWidth * 0.038), 12, 18);
				this.cardRadius = clamp(Math.floor(windowWidth * 0.038), 12, 18);
				this.cardGap = clamp(Math.floor(windowWidth * 0.028), 9, 14);

				this.backIconSize = clamp(Math.floor(this.headerContentHeight * 0.5), 18, 21);
				this.navTitleFontSize = clamp(Math.floor(this.headerContentHeight * 0.44) + smallScreenBoost, 16, 18);

				this.avatarSize = clamp(Math.floor(windowWidth * 0.155), 54, 66);
				this.avatarRadius = clamp(Math.floor(this.avatarSize * 0.24), 12, 16);
				this.profileMainMargin = clamp(Math.floor(windowWidth * 0.032), 10, 14);

				this.agentNameFontSize = clamp(Math.floor(windowWidth * 0.046) + smallScreenBoost + tinyScreenBoost, 16, 18);
				this.agentTimeFontSize = clamp(Math.floor(windowWidth * 0.032) + smallScreenBoost, 12, 13);

				this.primaryBtnHeight = clamp(Math.floor(windowWidth * 0.092), 34, 38);
				this.primaryBtnFontSize = clamp(Math.floor(windowWidth * 0.038) + smallScreenBoost, 14, 15);
				this.primaryBtnIconSize = clamp(Math.floor(windowWidth * 0.04) + smallScreenBoost, 14, 16);

				this.sectionTitleFontSize = clamp(Math.floor(windowWidth * 0.04) + smallScreenBoost, 14, 16);
				this.sectionContentFontSize = clamp(Math.floor(windowWidth * 0.037) + smallScreenBoost, 13, 15);

				this.ownerAvatarSize = clamp(Math.floor(windowWidth * 0.064), 22, 26);
				this.ownerNameFontSize = clamp(Math.floor(windowWidth * 0.037) + smallScreenBoost, 13, 15);
				this.ownerArrowFontSize = clamp(Math.floor(windowWidth * 0.054), 18, 22);

				this.stateFontSize = clamp(Math.floor(windowWidth * 0.034) + smallScreenBoost, 12, 14);
			} catch (err) {
				this.windowWidth = 375;
				this.statusBarHeight = 0;
				this.headerContentHeight = 38;
				this.headerHeight = 38;

				this.pagePadding = 14;
				this.cardPadding = 14;
				this.cardRadius = 14;
				this.cardGap = 10;

				this.backIconSize = 19;
				this.navTitleFontSize = 17;

				this.avatarSize = 58;
				this.avatarRadius = 14;
				this.profileMainMargin = 12;

				this.agentNameFontSize = 17;
				this.agentTimeFontSize = 12;

				this.primaryBtnHeight = 36;
				this.primaryBtnFontSize = 14;
				this.primaryBtnIconSize = 15;

				this.sectionTitleFontSize = 15;
				this.sectionContentFontSize = 14;

				this.ownerAvatarSize = 24;
				this.ownerNameFontSize = 14;
				this.ownerArrowFontSize = 20;

				this.stateFontSize = 13;
			}
		},

		goBack() {
			uni.navigateBack();
		},

		async loadDetail() {
			if (!this.agentId || this.loading) {
				return;
			}

			this.loading = true;

			try {
				const res = await getAgentsByIds({
					agentIds: [this.agentId]
				});

				if (res === undefined) {
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					});
					await this.loadDetailFromDb();
					return;
				}

				const list = Array.isArray(res?.agents) ? res.agents : [];
				if (list.length === 0) {
					await this.loadDetailFromDb();
					return;
				}

				const item = list[0];
				const remoteAgent = this.normalizeRemoteAgent(item);

				this.agent = remoteAgent;

				const rows = await DB.getAgentsByIds([this.agentId]);
				const oldAgent = rows?.[0] || null;

				if (!oldAgent) return;

				const avatarUri = remoteAgent.avatar_uri || this.defaultAgentAvatar;
				const oldAvatarUri = oldAgent.avatar_uri || this.defaultAgentAvatar;
				const oldLocalAvatarUri = oldAgent.local_avatar_uri || '';
				const avatarChanged = avatarUri !== oldAvatarUri;

				const localAvatarUri = avatarUri.startsWith('/static/')
					? avatarUri
					: avatarChanged
						? ''
						: oldLocalAvatarUri;

				await DB.updateAgent(this.agentId, {
					agent_name: remoteAgent.agent_name || 'AI',
					avatar_uri: avatarUri,
					local_avatar_uri: localAvatarUri,
					description: remoteAgent.description || '',
					owner_id: remoteAgent.owner_id || 0n,
					modify_time: Date.now()
				});

				if (!avatarUri.startsWith('/static/') && (avatarChanged || !oldLocalAvatarUri)) {
					enqueueEntityAvatars('agent', [this.agentId]);
				}
			} catch (err) {
				console.error('加载智能体详情失败:', err);
				await this.loadDetailFromDb();
			} finally {
				this.loading = false;
			}
		},

		async loadDetailFromDb() {
			try {
				const rows = await DB.getAgentsByIds([this.agentId]);
				const agent = rows?.[0] || null;

				if (!agent) {
					this.agent = null;
					return;
				}

				this.agent = {
					agent_id: agent.agent_id ? String(agent.agent_id) : this.agentId,
					agent_name: agent.agent_name || '',
					avatar_uri: agent.avatar_uri || this.defaultAgentAvatar,
					local_avatar_uri: agent.local_avatar_uri || '',
					description: agent.description || '',
					personality: agent.personality || '加载中',
					owner_id: agent.owner_id ? String(agent.owner_id) : '',
					owner_avatar: agent.owner_avatar || '',
					owner_username: agent.owner_username || '',
					create_time: agent.create_time || 0
				};
			} catch (err) {
				console.error('读取本地智能体详情失败:', err);
				this.agent = null;
			}
		},

		normalizeRemoteAgent(item) {
			const avatarUri = item?.avatar_uri || this.defaultAgentAvatar;

			return {
				agent_id: item?.agent_id ? String(item.agent_id) : this.agentId,
				agent_name: item?.agent_name || '',
				avatar_uri: avatarUri,
				local_avatar_uri: '',
				description: item?.description || '',
				personality: item?.personality || '',
				owner_id: item?.owner_id ? String(item.owner_id) : '',
				owner_avatar: item?.owner_avatar || '',
				owner_username: item?.owner_username || '',
				create_time: item?.create_time || 0
			};
		},

		getCurrentUserId() {
			const globalData = getApp().globalData || {};
			return String(globalData.userId || '');
		},

		goPrivateChat() {
			const currentUserId = this.getCurrentUserId();
			const agentId = this.agent?.agent_id ? String(this.agent.agent_id) : '';
			const agentName = this.agent?.agent_name || '';

			if (!currentUserId || !agentId) return;

			const conId = `ai:${currentUserId}:${agentId}`;

			uni.navigateTo({
				url: `/pages/im/conversation?conShortId=0&conId=${conId}&conType=4&name=${agentName}`
			});
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

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.detail-page {
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

.page-body {
	box-sizing: border-box;
}

.profile-card,
.section-card {
	background: #ffffff;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
}

.profile-card {
	display: flex;
	align-items: center;
}

.avatar {
	background: #eef1f6;
	flex-shrink: 0;
}

.profile-main {
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
	margin-bottom: 5px;
}

.agent-time {
	font-weight: 400;
	line-height: 1.5;
	color: #7a8599;
}

.primary-btn {
	width: 100%;
	background: rgba(253, 231, 209, 1);
	color: #8a5a2b;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	box-sizing: border-box;
	box-shadow: none;
}

.primary-btn:active {
	opacity: 0.82;
}

.primary-btn-icon {
	color: #8a5a2b;
	line-height: 1;
	font-weight: 400;
}

.primary-btn-text {
	color: #8a5a2b;
	font-weight: 400;
	line-height: 1;
}

.section-title {
	display: block;
	font-weight: 400;
	color: #1f2329;
	line-height: 1.4;
	margin-bottom: 10px;
}

.section-content {
	display: block;
	font-weight: 400;
	line-height: 1.75;
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
	background: #eef1f6;
	flex-shrink: 0;
}

.owner-main {
	flex: 1;
	min-width: 0;
}

.owner-name {
	font-weight: 400;
	color: #1f2329;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.owner-arrow {
	color: #a0a7b4;
	margin-left: 12rpx;
	font-weight: 400;
	line-height: 1;
}

.state-box {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 48rpx 0;
}

.state-text {
	color: #98a2b3;
	font-weight: 400;
}
</style>