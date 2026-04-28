<template>
	<view class="member-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="nav-action">返回</text>
			</view>
			<view class="nav-title">移出成员</view>
			<view class="nav-right"></view>
		</view>

		<view class="page-body">
			<view class="state-box" v-if="loading && members.length === 0">
				<text class="state-text">加载中...</text>
			</view>

			<view class="state-box" v-else-if="!loading && members.length === 0">
				<text class="state-text">暂无可移出的成员</text>
			</view>

			<view v-else class="list-wrap">
				<view
					class="user-card"
					v-for="item in members"
					:key="item.user_id"
					@click="confirmRemove(item)"
				>
					<view class="remove-circle">
						<view class="remove-line"></view>
					</view>

					<image
						class="avatar"
						:src="item.avatar_uri || defaultAvatar"
						mode="aspectFill"
					/>

					<view class="user-main">
						<text class="user-name">{{ item.nick_name || '未命名' }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import DB from '@/utils/sqlite.js';
import { removeConversationMember } from '@/request/im.js';

export default {
	data() {
		return {
			conId: '',
			conShortId: '',
			members: [],
			loading: false,
			removingUserId: '',
			defaultAvatar: '/static/user_avatar.png'
		};
	},

	async onLoad(options) {
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

	onPullDownRefresh() {
		this.refreshList();
	},

	methods: {
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

				// 不展示自己，自己退出群聊走“退出群聊”逻辑
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

			const name = item?.nick_name || '该成员';

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

			try {
				const ok = await removeConversationMember({
					conShortId: this.conShortId,
					member: userId
				});

				if (!ok) return;

				this.members = this.members.filter(member => String(member.user_id) !== userId);

				uni.showToast({
					title: '移出成功',
					icon: 'success'
				});
			} catch (err) {
				console.error('removeMember failed:', err);
				uni.showToast({
					title: '移出失败',
					icon: 'none'
				});
			} finally {
				this.removingUserId = '';
			}
		},

		goBack() {
			uni.navigateBack();
		}
	}
};
</script>

<style scoped>
.member-page {
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

.page-body {
	padding: 24rpx;
}

.user-card {
	display: flex;
	align-items: center;
	padding: 24rpx;
	margin-bottom: 20rpx;
	background: #ffffff;
	border-radius: 20rpx;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
}

.remove-circle {
	width: 36rpx;
	height: 36rpx;
	border-radius: 50%;
	background: #ff4d4f;
	flex-shrink: 0;
	margin-right: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.remove-line {
	width: 18rpx;
	height: 4rpx;
	border-radius: 999rpx;
	background: #ffffff;
}

.avatar {
	width: 96rpx;
	height: 96rpx;
	border-radius: 50%;
	background: #eef1f6;
	flex-shrink: 0;
}

.user-main {
	flex: 1;
	min-width: 0;
	margin-left: 20rpx;
	display: flex;
	align-items: center;
}

.user-name {
	font-size: 32rpx;
	font-weight: 600;
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
	font-size: 26rpx;
	color: #98a2b3;
}
</style>