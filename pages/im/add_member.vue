<template>
	<view class="member-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="nav-action">返回</text>
			</view>
			<view class="nav-title">邀请成员</view>
			<view class="nav-right" @click="confirmAdd">
				<text class="nav-action nav-action-primary">
					{{ submitting ? '邀请中' : '确定' }}
				</text>
			</view>
		</view>

		<view class="page-body">
			<view class="state-box" v-if="loading && users.length === 0">
				<text class="state-text">加载中...</text>
			</view>

			<view class="state-box" v-else-if="!loading && users.length === 0">
				<text class="state-text">暂无可邀请好友</text>
			</view>

			<view v-else class="list-wrap">
				<view
					class="user-card"
					v-for="item in users"
					:key="item.user_id"
					:class="{ 'user-card-disabled': isExistingUser(item.user_id) }"
					@click="toggleSelect(item)"
				>
					<view
						class="select-circle"
						:class="{
							'select-circle-active': isSelectedUser(item.user_id),
							'select-circle-disabled': isExistingUser(item.user_id)
						}"
					>
						<text
							v-if="isSelectedUser(item.user_id) || isExistingUser(item.user_id)"
							class="select-check"
						>✓</text>
					</view>

					<image
						class="avatar"
						:src="item.avatar || defaultAvatar"
						mode="aspectFill"
					/>

					<view class="user-main">
						<text class="user-name">{{ item.username || '未知用户' }}</text>
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
import { getFriendList } from '@/request/action.js';
import { addConversationMembers } from '@/request/im.js';

export default {
	data() {
		return {
			conId: '',
			conShortId: 0,
			loginUserId: 0,
			users: [],
			page: 1,
			loading: false,
			loadingMore: false,
			finished: false,
			submitting: false,
			existingUserIdSet: {},
			selectedUserIdSet: {},
			defaultAvatar: '/static/user_avatar.png'
		};
	},

	async onLoad(option) {
		this.conId = option?.conId ? option.conId : '';
		this.loginUserId = this.getLoginUserId();

		if (!this.conId || !this.loginUserId) {
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

	onPullDownRefresh() {
		this.refreshList();
	},

	onReachBottom() {
		this.loadMore();
	},

	methods: {
		getLoginUserId() {
			const { userId } = getApp().globalData || {};
			return userId || 0;
		},

		async loadExistingMembers() {
			const rows = await DB.pullUserMembers(this.conId);
			const list = Array.isArray(rows) ? rows : [];

			const existingMap = {};
			list.forEach(item => {
				const userId = item?.user_id ? String(item.user_id) : '';
				if (userId) {
					existingMap[userId] = true;
				}
			});

			this.existingUserIdSet = existingMap;
			this.selectedUserIdSet = { ...existingMap };
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

			const res = await getFriendList({
				userId: this.loginUserId,
				page: 1
			});

			if (res === undefined) {
				this.loading = false;
				uni.stopPullDownRefresh();
				return;
			}

			const list = this.normalizeUsers(res.user_infos);
			this.users = list;
			this.finished = list.length === 0;

			this.loading = false;
			uni.stopPullDownRefresh();
		},

		async loadMore() {
			if (this.loading || this.loadingMore || this.finished) return;

			this.loadingMore = true;
			const nextPage = this.page + 1;

			const res = await getFriendList({
				userId: this.loginUserId,
				page: nextPage
			});

			if (res === undefined) {
				this.loadingMore = false;
				return;
			}

			const list = this.normalizeUsers(res.user_infos);
			if (list.length === 0) {
				this.finished = true;
				this.loadingMore = false;
				return;
			}

			this.users = this.mergeUsers(this.users, list);
			this.page = nextPage;
			this.loadingMore = false;
		},

		normalizeUsers(list) {
			if (!Array.isArray(list)) return [];

			return list.map(item => {
				const u = item?.user || item;
				return {
					user_id: u?.user_id ? String(u.user_id) : '',
					username: u?.username || '未知用户',
					avatar: u?.avatar || u?.avatar_uri || '/static/user_avatar.png'
				};
			}).filter(item => !!item.user_id);
		},

		mergeUsers(oldList, newList) {
			const map = new Map();

			oldList.forEach(item => {
				map.set(item.user_id, item);
			});

			newList.forEach(item => {
				map.set(item.user_id, item);
			});

			return Array.from(map.values());
		},

		isExistingUser(userId) {
			return !!this.existingUserIdSet[String(userId)];
		},

		isSelectedUser(userId) {
			return !!this.selectedUserIdSet[String(userId)];
		},

		toggleSelect(item) {
			const userId = item?.user_id ? String(item.user_id) : '';
			if (!userId) return;
			if (this.isExistingUser(userId)) return;

			const selectedMap = { ...this.selectedUserIdSet };

			if (selectedMap[userId]) {
				delete selectedMap[userId];
			} else {
				selectedMap[userId] = true;
			}

			this.selectedUserIdSet = selectedMap;
		},

		async confirmAdd() {
			if (this.submitting) return;

			const selectedIds = Object.keys(this.selectedUserIdSet);
			const existingIds = this.existingUserIdSet;
			const newUserIds = selectedIds.filter(id => !existingIds[id]);

			if (newUserIds.length === 0) {
				uni.navigateBack();
				return;
			}

			this.submitting = true;

			const res = await addConversationMembers({
				conShortId: this.conShortId,
				members: newUserIds
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

.nav-action-primary {
	color: #4f7cff;
	font-weight: 600;
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

.user-card-disabled {
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