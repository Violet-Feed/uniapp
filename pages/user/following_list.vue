<template>
	<view class="user-list-container">
		<view class="header" :style="headerStyle">
			<view class="header-content" :style="headerContentStyle">
				<view class="back-btn" @click="goBack">
					<text class="back-icon">‹</text>
				</view>
				<text class="header-title">关注</text>
				<view class="header-right"></view>
			</view>
		</view>

		<scroll-view
			class="user-list-scroll"
			:style="scrollStyle"
			scroll-y
			:lower-threshold="120"
			@scrolltolower="loadMore"
			refresher-enabled
			:refresher-triggered="refreshing"
			@refresherrefresh="onRefresh"
		>
			<view class="user-list" v-if="userList.length > 0">
				<view
					class="user-item"
					:style="userItemStyle"
					v-for="(user, index) in userList"
					:key="String(user.user_id || index)"
				>
					<view class="user-left" @click="goToUserPage(user)">
						<image
							class="avatar"
							:style="avatarStyle"
							:src="user.avatar || '/static/user_avatar.png'"
							mode="aspectFill"
						></image>

						<view class="user-info">
							<text class="user-name">{{ user.username }}</text>
						</view>
					</view>

					<view class="user-right">
						<view
							class="follow-state-btn"
							:class="{ inactive: isFollowingState(user) }"
							@click.stop="onFollowBtnClick(user)"
						>
							<text class="btn-text">{{ followBtnText(user) }}</text>
						</view>
					</view>
				</view>
			</view>

			<view v-if="!loading && userList.length === 0" class="empty-state">
				<text class="empty-icon">⭐</text>
				<text class="empty-text">还没有关注任何人</text>
				<text class="empty-hint">去发现有趣的人吧！</text>
			</view>

			<view v-if="userList.length > 0" class="footer">
				<text v-if="loadingMore">加载中...</text>
				<text v-else-if="!hasMore">没有更多了</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { follow, unfollow, getFollowingList } from '@/request/action.js'

const PAGE_SIZE = 20

export default {
	data() {
		return {
			userId: '',
			page: 1,
			hasMore: true,
			pageSize: PAGE_SIZE,

			userList: [],
			loading: false,
			loadingMore: false,
			refreshing: false,

			windowHeight: 667,
			statusBarHeight: 0,
			rowHeight: 60,
			headerHeight: 60,
			avatarSize: 42
		}
	},

	computed: {
		headerStyle() {
			return 'height:' + this.headerHeight + 'px;'
		},

		headerContentStyle() {
			return 'height:' + this.rowHeight + 'px;padding-top:' + this.statusBarHeight + 'px;'
		},

		scrollStyle() {
			const height = Math.max(0, this.windowHeight - this.headerHeight)
			return 'top:' + this.headerHeight + 'px;height:' + height + 'px;'
		},

		userItemStyle() {
			return 'height:' + this.rowHeight + 'px;'
		},

		avatarStyle() {
			const radius = Math.floor(this.avatarSize / 2)
			return 'width:' + this.avatarSize + 'px;height:' + this.avatarSize + 'px;border-radius:' + radius + 'px;'
		}
	},

	onLoad(options) {
		this.initResponsiveLayout()
		this.userId = String(options.userId || '')
		this.loadUserList(true)
	},

	onShow() {
		this.initResponsiveLayout()
	},

	methods: {
		initResponsiveLayout() {
			try {
				const sys = uni.getSystemInfoSync()
				const windowHeight = Number(sys.windowHeight || 667)
				const statusBarHeight = Number(sys.statusBarHeight || 0)

				this.windowHeight = windowHeight
				this.statusBarHeight = statusBarHeight

				const availableHeight = Math.max(520, windowHeight - statusBarHeight)
				const rowHeight = Math.floor(availableHeight / 11)

				this.rowHeight = Math.max(52, Math.min(78, rowHeight))
				this.headerHeight = this.statusBarHeight + this.rowHeight
				this.avatarSize = Math.max(34, Math.min(52, Math.floor(this.rowHeight * 0.68)))
			} catch (err) {
				this.windowHeight = 667
				this.statusBarHeight = 0
				this.rowHeight = 60
				this.headerHeight = 60
				this.avatarSize = 42
			}
		},

		async loadUserList(reset = false) {
			if (this.loading || this.loadingMore) return
			if (!reset && !this.hasMore) return

			if (reset) {
				this.page = 1
				this.hasMore = true
				this.loading = true
			} else {
				this.loadingMore = true
			}

			const payload = { userId: this.userId, page: this.page }
			const res = await getFollowingList(payload)

			if (!res) {
				this.loading = false
				this.loadingMore = false
				this.refreshing = false
				return
			}

			const list = Array.isArray(res.user_infos) ? res.user_infos : []

			if (list.length === 0) {
				if (reset) this.userList = []
				this.hasMore = false
				this.loading = false
				this.loadingMore = false
				this.refreshing = false
				return
			}

			const mapped = list.map((u) => ({
				user_id: String(u.user_id || ''),
				username: u.username || '未知用户',
				avatar: u.avatar || '/static/user_avatar.png',
				is_following: this.toBool(u.is_following),
				is_follower: this.toBool(u.is_follower)
			}))

			if (reset) this.userList = mapped
			else this.userList = this.userList.concat(mapped)

			this.hasMore = list.length >= this.pageSize
			this.page += 1

			this.loading = false
			this.loadingMore = false
			this.refreshing = false
		},

		loadMore() {
			this.loadUserList(false)
		},

		async onRefresh() {
			this.refreshing = true
			const p = this.loadUserList(true)
			Promise.resolve(p).finally(() => {
				this.refreshing = false
			})
		},

		followBtnText(user) {
			const f = this.toBool(user.is_following)
			const r = this.toBool(user.is_follower)
			if (f && r) return '互相关注'
			if (f && !r) return '已关注'
			if (!f && r) return '+ 回关'
			return '+ 关注'
		},

		isFollowingState(user) {
			return this.toBool(user.is_following)
		},

		async onFollowBtnClick(user) {
			if (!user || !user.user_id) return

			const me = getApp().globalData.userId
			const other = user.user_id

			if (this.toBool(user.is_following)) {
				uni.showModal({
					title: '提示',
					content: `确定取消关注 ${user.username} 吗？`,
					success: async (r) => {
						if (!r.confirm) return
						const res = await unfollow(me, other)
						if (res) {
							user.is_following = false
							uni.showToast({ title: '已取消关注', icon: 'success' })
						}
					}
				})
				return
			}

			const res = await follow(me, other)
			if (res) {
				user.is_following = true
				uni.showToast({ title: '关注成功', icon: 'success' })
			}
		},

		goBack() {
			uni.navigateBack()
		},

		goToUserPage(user) {
			const uid = String(user.user_id || '')
			if (!uid) return

			const me = String(getApp().globalData.userId || '')
			if (me && uid === me) {
				uni.navigateTo({ url: '/pages/user/my_profile_copy' })
				return
			}

			uni.navigateTo({
				url: `/pages/user/user_profile?userId=${encodeURIComponent(uid)}`
			})
		},

		toBool(v) {
			if (v === true) return true
			if (v === false) return false
			if (v === 1 || v === '1') return true
			if (v === 0 || v === '0') return false
			if (typeof v === 'string') return v.toLowerCase() === 'true'
			return !!v
		}
	}
}
</script>

<style scoped>
.user-list-container {
	height: 100vh;
	background: #f8f9fa;
	position: relative;
	overflow: hidden;
}

.header {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 20;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	box-sizing: border-box;
}

.header-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-left: 14px;
	padding-right: 14px;
	box-sizing: border-box;
}

.back-btn {
	width: 34px;
	height: 34px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.back-icon {
	font-size: 30px;
	line-height: 30px;
	color: #fff;
	font-weight: 300;
}

.header-title {
	font-size: 16px;
	font-weight: 700;
	color: #fff;
}

.header-right {
	width: 34px;
	height: 34px;
	flex-shrink: 0;
}

.user-list-scroll {
	position: fixed;
	left: 0;
	right: 0;
	overflow: hidden;
	background: #f8f9fa;
}

.user-list {
	padding: 0;
}

.user-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 14px;
	background: #fff;
	border-bottom: 1px solid #f0f0f0;
	box-sizing: border-box;
}

.user-left {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 10px;
	overflow: hidden;
	min-width: 0;
	height: 100%;
}

.avatar {
	border: 2px solid #f0f0f0;
	box-sizing: border-box;
	flex-shrink: 0;
	background: #f3f3f3;
}

.user-info {
	flex: 1;
	min-width: 0;
	overflow: hidden;
}

.user-name {
	display: block;
	font-size: 15px;
	font-weight: 600;
	color: #333;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.user-right {
	flex-shrink: 0;
	margin-left: 8px;
}

.follow-state-btn {
	min-width: 72px;
	height: 30px;
	padding: 0 12px;
	border-radius: 15px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	box-shadow: 0 2px 8px rgba(102, 126, 234, 0.26);
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	transition: all 0.2s;
}

.follow-state-btn.inactive {
	background: #f0f0f0;
	box-shadow: none;
}

.follow-state-btn:active {
	transform: scale(0.96);
}

.btn-text {
	font-size: 12px;
	font-weight: 600;
	color: #fff;
	white-space: nowrap;
}

.follow-state-btn.inactive .btn-text {
	color: #666;
}

.empty-state {
	height: 70vh;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 0 20px;
	box-sizing: border-box;
}

.empty-icon {
	font-size: 58px;
	margin-bottom: 14px;
}

.empty-text {
	font-size: 15px;
	color: #666;
	margin-bottom: 8px;
}

.empty-hint {
	font-size: 13px;
	color: #999;
	text-align: center;
}

.footer {
	height: 42px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
	color: #999;
}
</style>