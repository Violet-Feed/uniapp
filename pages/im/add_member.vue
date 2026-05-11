<template>
	<view class="member-page">
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">邀请成员</text>
				</view>

				<view class="nav-right">
					<button
						class="confirm-btn"
						:class="{ 'confirm-btn-disabled': submitting }"
						:style="confirmBtnStyle"
						@click.stop="confirmAdd"
					>
						{{ submitting ? '邀请中' : '确定' }}
					</button>
				</view>
			</view>
		</view>

		<view class="page-body" :style="pageBodyStyle">
			<view class="state-box" v-if="loading && users.length === 0">
				<text class="state-text" :style="stateTextStyle">加载中...</text>
			</view>

			<view class="state-box" v-else-if="!loading && users.length === 0">
				<text class="state-text" :style="stateTextStyle">暂无可邀请好友</text>
			</view>

			<view v-else class="list-wrap">
				<view
					class="user-card"
					:style="userCardStyle"
					v-for="item in users"
					:key="item.user_id"
					:class="{ 'user-card-disabled': isExistingUser(item.user_id) }"
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
						:src="item.avatar || defaultAvatar"
						mode="aspectFill"
					/>

					<view class="user-main" :style="userMainStyle">
						<text class="user-name" :style="userNameStyle">{{ item.username || '未知用户' }}</text>
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
import { getFriendList } from '@/request/action.js';
import { addConversationMembers } from '@/request/im.js';

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value));
};

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
			defaultAvatar: '/static/user_avatar.png',

			windowWidth: 375,
			statusBarHeight: 0,
			headerContentHeight: 38,
			headerHeight: 38,

			pagePadding: 14,
			cardPaddingX: 14,
			cardPaddingY: 12,
			cardRadius: 14,
			cardGap: 10,

			avatarSize: 48,
			selectIconSize: 22,
			backIconSize: 19,
			titleFontSize: 17,
			confirmFontSize: 14,
			confirmHeight: 30,
			confirmMinWidth: 58,
			userNameFontSize: 16,
			stateFontSize: 13,
			userMainMargin: 10
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

		confirmBtnStyle() {
			return (
				'height:' + this.confirmHeight + 'px;' +
				'line-height:' + this.confirmHeight + 'px;' +
				'min-width:' + this.confirmMinWidth + 'px;' +
				'border-radius:' + Math.floor(this.confirmHeight / 2) + 'px;' +
				'font-size:' + this.confirmFontSize + 'px;'
			);
		},

		pageBodyStyle() {
			return 'padding:' + this.pagePadding + 'px;';
		},

		userCardStyle() {
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

		userMainStyle() {
			return 'margin-left:' + this.userMainMargin + 'px;';
		},

		userNameStyle() {
			return 'font-size:' + this.userNameFontSize + 'px;';
		},

		stateTextStyle() {
			return 'font-size:' + this.stateFontSize + 'px;';
		}
	},

	async onLoad(option) {
		this.initResponsiveLayout();

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

				this.avatarSize = clamp(Math.floor(windowWidth * 0.128), 44, 54);
				this.selectIconSize = clamp(Math.floor(windowWidth * 0.058), 20, 24);
				this.backIconSize = clamp(Math.floor(this.headerContentHeight * 0.5), 18, 21);

				this.titleFontSize = clamp(Math.floor(this.headerContentHeight * 0.44) + smallScreenBoost, 16, 18);
				this.confirmFontSize = clamp(Math.floor(windowWidth * 0.036) + smallScreenBoost, 13, 15);
				this.confirmHeight = clamp(Math.floor(this.headerContentHeight * 0.74), 28, 32);
				this.confirmMinWidth = clamp(Math.floor(windowWidth * 0.155), 56, 68);

				this.userNameFontSize = clamp(Math.floor(windowWidth * 0.043) + smallScreenBoost, 16, 18);
				this.stateFontSize = clamp(Math.floor(windowWidth * 0.034) + smallScreenBoost, 12, 14);
				this.userMainMargin = clamp(Math.floor(windowWidth * 0.03), 10, 14);
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

				this.avatarSize = 48;
				this.selectIconSize = 22;
				this.backIconSize = 19;
				this.titleFontSize = 17;
				this.confirmFontSize = 14;
				this.confirmHeight = 30;
				this.confirmMinWidth = 58;
				this.userNameFontSize = 16;
				this.stateFontSize = 13;
				this.userMainMargin = 10;
			}
		},

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

		selectIconClass(item) {
			const userId = item?.user_id ? String(item.user_id) : '';
			if (this.isSelectedUser(userId) || this.isExistingUser(userId)) {
				return 'icon-gouxuan';
			}
			return 'icon-gouxuan1';
		},

		selectIconStyle(item) {
			const userId = item?.user_id ? String(item.user_id) : '';
			const active = this.isSelectedUser(userId) || this.isExistingUser(userId);
			const color = active ? '#22c55e' : '#c9ced6';

			return (
				'font-size:' + this.selectIconSize + 'px;' +
				'color:' + color + ';'
			);
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

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.member-page {
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

.confirm-btn {
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

.confirm-btn::after {
	border: none;
}

.confirm-btn-disabled {
	opacity: 0.72;
}

.page-body {
	box-sizing: border-box;
}

.user-card {
	display: flex;
	align-items: center;
	background: #ffffff;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
}

.user-card-disabled {
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

.user-main {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
}

.user-name {
	font-weight: 400;
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
	color: #98a2b3;
	font-weight: 400;
}
</style>