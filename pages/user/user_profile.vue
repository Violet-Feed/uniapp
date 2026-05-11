<template>
	<view class="user-profile-container">
		<view
			v-if="stickyHeaderVisible"
			class="compact-sticky-header"
			:style="compactStickyHeaderStyle"
		>
			<view class="compact-profile-row" :style="compactProfileRowStyle">
				<view class="compact-back-btn" @click="goBack">
					<text class="iconfont icon-fanhui compact-back-icon"></text>
				</view>
				<image class="compact-avatar" :src="avatar || defaultAvatar" mode="aspectFill"></image>
				<text class="compact-username">{{ username || '用户' }}</text>
			</view>
		</view>

		<view class="profile-header" :style="profileHeaderStyle">
			<view class="back-btn" :style="backBtnStyle" @click="goBack">
				<text class="iconfont icon-fanhui back-icon"></text>
			</view>

			<view class="profile-header-content" :style="profileHeaderContentStyle">
				<view class="avatar-section">
					<image
						class="avatar"
						:style="avatarStyle"
						:src="avatar || defaultAvatar"
						mode="aspectFill"
					></image>
				</view>

				<view class="user-info">
					<text class="username">{{ username }}</text>
				</view>

				<view class="stats-section">
					<view class="stat-item" @click="goToFollowingList">
						<text class="stat-number">{{ formatNumber(followingCount) }}</text>
						<text class="stat-label">关注</text>
					</view>
					<view class="stat-item" @click="goToFollowerList">
						<text class="stat-number">{{ formatNumber(followerCount) }}</text>
						<text class="stat-label">粉丝</text>
					</view>
				</view>

				<view class="action-buttons">
					<view
						class="follow-btn"
						:class="{ following: isFollowing }"
						:style="actionButtonStyle"
						@click="toggleFollow"
					>
						<text v-if="followBtnPrefix" class="follow-prefix">{{ followBtnPrefix }}</text>
						<text class="btn-text">{{ followBtnText }}</text>
					</view>

					<view class="message-btn" :style="actionButtonStyle" @click="goToChat">
						<text class="iconfont icon-xiaoxi message-btn-icon"></text>
						<text class="btn-text">私信</text>
					</view>
				</view>
			</view>
		</view>

		<view class="tab-bar" :style="tabBarStyle">
			<view
				class="tab-item"
				:class="{ active: activeTab === 'works' }"
				@click="switchTab('works')"
			>
				<text class="iconfont icon-neirongchuangzuo tab-icon"></text>
				<text class="tab-text">作品</text>
				<view class="tab-indicator" v-if="activeTab === 'works'"></view>
			</view>
			<view
				class="tab-item like-tab"
				:class="{ active: activeTab === 'likes' }"
				@click="switchTab('likes')"
			>
				<text class="iconfont icon-xihuan tab-icon"></text>
				<text class="tab-text">点赞</text>
				<view class="tab-indicator like-indicator" v-if="activeTab === 'likes'"></view>
			</view>
		</view>

		<view class="content-container" :style="contentContainerStyle">
			<view v-if="activeTab === 'works'">
				<view class="creation-grid">
					<view
						class="creation-card"
						:style="creationCardStyle"
						v-for="(item, index) in worksList"
						:key="item.creation_id || index"
						@click="goToWorkDetail(item)"
					>
						<view class="image-wrapper" :style="imageWrapperStyle">
							<image
								class="card-image"
								:style="cardImageStyle"
								:src="item.cover"
								mode="aspectFill"
								@error="onCoverError(item)"
							/>
						</view>

						<view class="card-content" :style="cardContentStyle">
							<view class="card-title-container">
								<text class="card-title">{{ item.title }}</text>
							</view>
							<view class="card-footer">
								<view class="card-author">
									<image
										class="author-avatar"
										:src="item.avatar || defaultAvatar"
										mode="aspectFill"
									/>
									<text class="author-name">{{ item.username }}</text>
								</view>
								<view class="card-likes" @click.stop="toggleDigg('works', index)">
									<text
										class="iconfont like-icon"
										:class="item.is_digg ? 'icon-xihuan active' : 'icon-xihuan1'"
									></text>
									<text class="like-count">{{ formatNumber(item.digg_count) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<view v-if="worksList.length === 0 && !loading" class="empty-state">
					<text class="iconfont icon-neirongchuangzuo empty-icon"></text>
					<text class="empty-text">还没有发布作品</text>
				</view>
			</view>

			<view v-if="activeTab === 'likes'">
				<view class="creation-grid">
					<view
						class="creation-card"
						:style="creationCardStyle"
						v-for="(item, index) in likesList"
						:key="item.creation_id || index"
						@click="goToWorkDetail(item)"
					>
						<view class="image-wrapper" :style="imageWrapperStyle">
							<image
								class="card-image"
								:style="cardImageStyle"
								:src="item.cover"
								mode="aspectFill"
								@error="onCoverError(item)"
							/>
						</view>

						<view class="card-content" :style="cardContentStyle">
							<view class="card-title-container">
								<text class="card-title">{{ item.title }}</text>
							</view>
							<view class="card-footer">
								<view class="card-author">
									<image
										class="author-avatar"
										:src="item.avatar || defaultAvatar"
										mode="aspectFill"
									/>
									<text class="author-name">{{ item.username }}</text>
								</view>
								<view class="card-likes" @click.stop="toggleDigg('likes', index)">
									<text
										class="iconfont like-icon"
										:class="item.is_digg ? 'icon-xihuan active' : 'icon-xihuan1'"
									></text>
									<text class="like-count">{{ formatNumber(item.digg_count) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<view v-if="likesList.length === 0 && !loading" class="empty-state">
					<text class="iconfont icon-xihuan empty-icon like-empty-icon"></text>
					<text class="empty-text">还没有点赞内容</text>
				</view>
			</view>

			<view v-if="loading" class="loading-more">
				<view class="loading-spinner"></view>
				<text class="loading-text">加载中...</text>
			</view>
		</view>
	</view>
</template>

<script>
import DB from '@/utils/sqlite.js'
import { enqueueEntityAvatars } from '@/utils/im-cache.js'
import { getUserProfile } from '@/request/user'
import { getCreationsByUser, getCreationsByDigg } from '@/request/creation'
import { follow, unfollow, digg, cancelDigg } from '@/request/action'

const GRID_GAP = 6
const CONTENT_PADDING_TOP = 6
const CONTENT_PADDING_X = 8
const CONTENT_PADDING_BOTTOM = 10

const MIN_PROFILE_BODY_HEIGHT = 220
const MAX_PROFILE_BODY_HEIGHT = 268
const MIN_TAB_BAR_HEIGHT = 34
const MAX_TAB_BAR_HEIGHT = 40
const MIN_COMPACT_HEIGHT = 34
const MAX_COMPACT_HEIGHT = 40
const MIN_CARD_CONTENT_HEIGHT = 36
const MAX_CARD_CONTENT_HEIGHT = 44

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value))
}

export default {
	data() {
		return {
			userId: null,
			username: '',
			avatar: '',
			followerCount: 0,
			followingCount: 0,

			isFollowing: false,
			isFollower: false,

			activeTab: 'works',
			worksList: [],
			likesList: [],

			loading: false,
			worksPage: 1,
			worksHasMore: true,
			likesPage: 1,
			likesHasMore: true,
			likesLoaded: false,

			windowWidth: 375,
			windowHeight: 667,
			statusBarHeight: 0,
			safeBottom: 0,

			profileHeaderHeight: 260,
			profileBodyHeight: 236,
			compactProfileHeight: 36,
			tabBarHeight: 36,
			avatarSize: 68,
			headerTopGap: 40,
			actionButtonHeight: 34,

			creationCardHeight: 148,
			imageHeight: 110,
			cardContentHeight: 38,

			stickyHeaderVisible: false,
			stickyHeaderProgress: 0,

			defaultImage: '/static/images/default.png',
			defaultAvatar: '/static/user_avatar.png'
		}
	},

	computed: {
		followBtnText() {
			if (this.isFollowing && this.isFollower) return '互相关注'
			if (this.isFollowing && !this.isFollower) return '已关注'
			if (!this.isFollowing && this.isFollower) return '回关'
			return '关注'
		},

		followBtnPrefix() {
			if (this.isFollowing && this.isFollower) return ''
			if (this.isFollowing) return '✓'
			return '+'
		},

		profileHeaderStyle() {
			return 'height:' + this.profileHeaderHeight + 'px;'
		},

		profileHeaderContentStyle() {
			return (
				'height:' + this.profileBodyHeight + 'px;' +
				'margin-top:' + this.statusBarHeight + 'px;' +
				'padding-top:' + this.headerTopGap + 'px;'
			)
		},

		backBtnStyle() {
			return 'top:' + (this.statusBarHeight + 8) + 'px;'
		},

		avatarStyle() {
			return (
				'width:' + this.avatarSize + 'px;' +
				'height:' + this.avatarSize + 'px;' +
				'border-radius:' + Math.floor(this.avatarSize / 2) + 'px;'
			)
		},

		actionButtonStyle() {
			return (
				'height:' + this.actionButtonHeight + 'px;' +
				'border-radius:' + Math.floor(this.actionButtonHeight / 2) + 'px;'
			)
		},

		compactStickyHeaderStyle() {
			const totalHeight = this.statusBarHeight + this.compactProfileHeight
			const bgAlpha = clamp(this.stickyHeaderProgress * 0.98, 0, 0.98)

			return (
				'height:' + totalHeight + 'px;' +
				'background:rgba(253,231,209,' + bgAlpha + ');' +
				'box-shadow:none;'
			)
		},

		compactProfileRowStyle() {
			return (
				'height:' + this.compactProfileHeight + 'px;' +
				'margin-top:' + this.statusBarHeight + 'px;'
			)
		},

		tabBarStyle() {
			const stickyTop = this.statusBarHeight + this.compactProfileHeight

			return (
				'height:' + this.tabBarHeight + 'px;' +
				'top:' + stickyTop + 'px;' +
				'box-shadow:none;'
			)
		},

		contentContainerStyle() {
			return (
				'padding:' + CONTENT_PADDING_TOP + 'px ' +
				CONTENT_PADDING_X + 'px ' +
				(CONTENT_PADDING_BOTTOM + this.safeBottom) + 'px;'
			)
		},

		creationCardStyle() {
			return 'height:' + this.creationCardHeight + 'px;'
		},

		imageWrapperStyle() {
			return 'height:' + this.imageHeight + 'px;'
		},

		cardContentStyle() {
			return 'height:' + this.cardContentHeight + 'px;'
		},

		cardImageStyle() {
			return 'width:100%;height:' + this.imageHeight + 'px;'
		}
	},

	onLoad(options) {
		this.initResponsiveLayout()

		const uidStr = String(options.userId || '')
		if (!uidStr) return

		this.userId = uidStr
		this.loadUserProfile()
		this.loadUserWorks(true)
	},

	onShow() {
		this.initResponsiveLayout()
	},

	onPageScroll(e) {
		const scrollTop = Number(e && e.scrollTop ? e.scrollTop : 0)
		const infoBarHeight = this.statusBarHeight + this.compactProfileHeight
		const start = Math.max(0, this.profileHeaderHeight - infoBarHeight - 150)
		const end = Math.max(start + 1, this.profileHeaderHeight - infoBarHeight)
		const progress = clamp((scrollTop - start) / (end - start), 0, 1)

		this.stickyHeaderProgress = progress
		this.stickyHeaderVisible = progress > 0.01
	},

	onReachBottom() {
		if (this.activeTab === 'works') this.loadUserWorks(false)
		else if (this.activeTab === 'likes') this.loadUserLikes(false)
	},

	onPullDownRefresh() {
		const p1 = this.loadUserProfile()
		const p2 = this.activeTab === 'works' ? this.loadUserWorks(true) : this.loadUserLikes(true)

		Promise.all([p1, p2]).finally(() => {
			uni.stopPullDownRefresh()
		})
	},

	methods: {
		initResponsiveLayout() {
			try {
				const sys = uni.getSystemInfoSync()
				const windowWidth = Number(sys.windowWidth || 375)
				const windowHeight = Number(sys.windowHeight || 667)
				const statusBarHeight = Number(sys.statusBarHeight || 0)
				const safeAreaInsets = sys.safeAreaInsets || {}

				this.windowWidth = windowWidth
				this.windowHeight = windowHeight
				this.statusBarHeight = statusBarHeight
				this.safeBottom = Number(safeAreaInsets.bottom || 0)

				this.compactProfileHeight = clamp(
					Math.floor(windowWidth * 0.098),
					MIN_COMPACT_HEIGHT,
					MAX_COMPACT_HEIGHT
				)

				this.tabBarHeight = clamp(
					Math.floor(windowWidth * 0.096),
					MIN_TAB_BAR_HEIGHT,
					MAX_TAB_BAR_HEIGHT
				)

				this.avatarSize = clamp(
					Math.floor(windowWidth * 0.18),
					58,
					72
				)

				this.actionButtonHeight = clamp(
					Math.floor(windowWidth * 0.092),
					32,
					36
				)

				this.headerTopGap = clamp(
					Math.floor(windowWidth * 0.108),
					34,
					44
				)

				const usernameHeight = 24
				const statsHeight = 34
				const avatarBottomGap = 8
				const userBottomGap = 10
				const statsBottomGap = 10
				const bottomReserve = 14

				const contentNeedHeight =
					this.headerTopGap +
					this.avatarSize +
					avatarBottomGap +
					usernameHeight +
					userBottomGap +
					statsHeight +
					statsBottomGap +
					this.actionButtonHeight +
					bottomReserve

				const ratioBodyHeight = Math.floor(windowWidth * 0.62)

				this.profileBodyHeight = clamp(
					Math.max(ratioBodyHeight, contentNeedHeight),
					MIN_PROFILE_BODY_HEIGHT,
					MAX_PROFILE_BODY_HEIGHT
				)

				this.profileHeaderHeight = this.statusBarHeight + this.profileBodyHeight

				const gridWidth = windowWidth - CONTENT_PADDING_X * 2
				const cardWidth = Math.floor((gridWidth - GRID_GAP * 2) / 3)

				this.creationCardHeight = Math.floor(cardWidth * 4 / 3)

				this.cardContentHeight = clamp(
					Math.floor(cardWidth * 0.32),
					MIN_CARD_CONTENT_HEIGHT,
					MAX_CARD_CONTENT_HEIGHT
				)

				this.imageHeight = Math.max(0, this.creationCardHeight - this.cardContentHeight)
			} catch (err) {
				this.windowWidth = 375
				this.windowHeight = 667
				this.statusBarHeight = 0
				this.safeBottom = 0

				this.profileBodyHeight = 236
				this.profileHeaderHeight = 236
				this.compactProfileHeight = 36
				this.tabBarHeight = 36
				this.avatarSize = 68
				this.headerTopGap = 40
				this.actionButtonHeight = 34

				this.creationCardHeight = 148
				this.cardContentHeight = 38
				this.imageHeight = 110
			}
		},

		async loadUserProfile() {
			const uid = this.userId
			const res = await getUserProfile(uid, true, false)

			if (res) {
				const userInfo = res.user_info || {}
				const username = userInfo.username || ''
				const remoteAvatar = userInfo.avatar || ''
				const avatarUri = remoteAvatar || this.defaultAvatar

				this.username = username
				this.avatar = avatarUri
				this.followingCount = res.following_count || 0
				this.followerCount = res.follower_count || 0
				this.isFollowing = !!res.is_following
				this.isFollower = !!res.is_follower

				const rows = await DB.getUsersByIds([uid])
				const oldUser = rows && rows.length ? rows[0] : null
				if (!oldUser) return

				const oldAvatarUri = oldUser.avatar_uri || ''
				const oldLocalAvatarUri = oldUser.local_avatar_uri || ''
				const avatarChanged = remoteAvatar !== '' && avatarUri !== oldAvatarUri
				const localMissing = remoteAvatar !== '' && !oldLocalAvatarUri
				const localAvatarUri = avatarUri.startsWith('/static/')
					? avatarUri
					: avatarChanged
						? ''
						: oldLocalAvatarUri

				await DB.updateUser(uid, {
					username,
					avatar_uri: avatarUri,
					local_avatar_uri: localAvatarUri,
					modify_time: Date.now()
				})

				if (avatarChanged || localMissing) {
					enqueueEntityAvatars('user', [uid])
				}
				return
			}

			try {
				const rows = await DB.getUsersByIds([uid])
				const user = rows && rows.length ? rows[0] : null
				if (user) {
					this.username = user.username || ''
					this.avatar = user.local_avatar_uri || user.avatar_uri || this.defaultAvatar
					return
				}
			} catch (e) {
				console.error('读取本地用户资料失败:', e)
			}

			this.username = ''
			this.avatar = this.defaultAvatar
			this.followingCount = 0
			this.followerCount = 0
			this.isFollowing = false
			this.isFollower = false
		},

		async loadUserWorks(reset = false) {
			if (this.loading) return
			if (!reset && !this.worksHasMore) return

			this.loading = true
			try {
				const pageToLoad = reset ? 1 : this.worksPage + 1
				const res = await getCreationsByUser(String(this.userId), pageToLoad)
				const list = Array.isArray(res)
					? res
					: res && Array.isArray(res.creations)
						? res.creations
						: []

				if (!list || list.length === 0) {
					if (reset) {
						this.worksList = []
						this.worksPage = 1
					}
					this.worksHasMore = false
					return
				}

				const mapped = list.map((item) => ({
					creation_id: item.creation_id,
					cover: item.cover_url || item.material_url || this.defaultImage,
					title: item.title || '未命名作品',
					user_id: item.user_id,
					username: this.username || item.username || '未知作者',
					avatar: this.avatar || item.avatar || this.defaultAvatar,
					digg_count: item.digg_count || 0,
					is_digg: !!item.is_digg,
					material_type: item.material_type,
					raw: item
				}))

				if (reset) {
					this.worksList = mapped
					this.worksPage = 1
				} else {
					this.worksList = this.worksList.concat(mapped)
					this.worksPage = pageToLoad
				}

				this.worksHasMore = list.length >= 20
			} catch (err) {
				console.error('加载用户作品失败:', err)
				uni.showToast({ title: '加载作品失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},

		async loadUserLikes(reset = false) {
			if (this.loading) return
			if (!reset && !this.likesHasMore) return

			this.loading = true
			try {
				const pageToLoad = reset ? 1 : this.likesPage + 1
				const res = await getCreationsByDigg(String(this.userId), pageToLoad)
				const list = Array.isArray(res)
					? res
					: res && Array.isArray(res.creations)
						? res.creations
						: []

				if (!list || list.length === 0) {
					if (reset) {
						this.likesList = []
						this.likesPage = 1
					}
					this.likesHasMore = false
					this.likesLoaded = true
					return
				}

				const mapped = list.map((item) => ({
					creation_id: item.creation_id,
					cover: item.cover_url || item.material_url || this.defaultImage,
					title: item.title || '未命名作品',
					user_id: item.user_id,
					username: item.username || '未知作者',
					avatar: item.avatar || this.defaultAvatar,
					digg_count: item.digg_count || 0,
					is_digg: !!item.is_digg,
					material_type: item.material_type,
					raw: item
				}))

				if (reset) {
					this.likesList = mapped
					this.likesPage = 1
				} else {
					this.likesList = this.likesList.concat(mapped)
					this.likesPage = pageToLoad
				}

				this.likesHasMore = list.length >= 20
				this.likesLoaded = true
			} catch (err) {
				console.error('加载点赞作品失败:', err)
				uni.showToast({ title: '加载点赞失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},

		switchTab(tab) {
			if (this.activeTab === tab) return
			this.activeTab = tab
			if (tab === 'likes' && !this.likesLoaded) this.loadUserLikes(true)
		},

		goBack() {
			uni.navigateBack()
		},

		goToChat() {
			const myId = String(getApp().globalData.userId || '')
			const otherId = String(this.userId || '')
			if (!myId || !otherId) return

			let conId
			try {
				const a = BigInt(myId)
				const b = BigInt(otherId)
				conId = a < b ? `${a}:${b}` : `${b}:${a}`
			} catch (e) {
				conId = `${myId}:${otherId}`
			}

			uni.navigateTo({
				url: `/pages/im/conversation?conShortId=0&conId=${conId}&conType=1&name=${this.username}`
			})
		},

		goToFollowingList() {
			uni.navigateTo({
				url: `/pages/user/follow_list?userId=${this.userId}&tab=following`
			})
		},
		
		goToFollowerList() {
			uni.navigateTo({
				url: `/pages/user/follow_list?userId=${this.userId}&tab=follower`
			})
		},

		goToWorkDetail(work) {
			if (!work || !work.creation_id) return
			const creationId = encodeURIComponent(work.creation_id)
			const userId = encodeURIComponent(work.user_id || this.userId || '')
			const isVideo = Number(work.material_type) === 2
			const basePath = isVideo ? '/pages/creation/creation_video' : '/pages/creation/creation_image'
			uni.navigateTo({ url: `${basePath}?creationId=${creationId}&userId=${userId}` })
		},

		onCoverError(item) {
			if (item) item.cover = this.defaultImage
		},

		async toggleDigg(listType, index) {
			const list = listType === 'works' ? this.worksList : this.likesList
			const item = list[index]
			if (!item || item._digging) return

			item._digging = true
			try {
				if (item.is_digg) {
					await cancelDigg('creation', item.creation_id)
					item.is_digg = false
					if (item.digg_count > 0) item.digg_count -= 1
				} else {
					await digg('creation', item.creation_id)
					item.is_digg = true
					item.digg_count += 1
				}
			} catch (err) {
				console.error('点赞操作失败:', err)
			} finally {
				item._digging = false
			}
		},

		async toggleFollow() {
			const myId = getApp().globalData.userId
			if (!myId || !this.userId) return

			if (this.isFollowing) {
				const res = await unfollow(myId, this.userId)
				if (res) {
					this.isFollowing = false
					if (this.followerCount > 0) this.followerCount -= 1
					uni.showToast({ title: '已取消关注', icon: 'success' })
				}
				return
			}

			const res = await follow(myId, this.userId)
			if (res) {
				this.isFollowing = true
				this.followerCount += 1
				uni.showToast({ title: '关注成功', icon: 'success' })
			}
		},

		formatNumber(num) {
			if (!num && num !== 0) return '0'
			if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
			if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
			return num.toString()
		}
	}
}
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.user-profile-container {
	min-height: 100vh;
	background: #f8f9fa;
	font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.compact-sticky-header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	box-sizing: border-box;
	pointer-events: auto;
	backdrop-filter: blur(12px);
	border-bottom: none;
}

.compact-profile-row {
	display: flex;
	align-items: center;
	padding-left: 10px;
	padding-right: 14px;
	box-sizing: border-box;
}

.compact-back-btn {
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-right: 4px;
}

.compact-back-icon {
	font-size: 18px;
	line-height: 1;
	color: #51371f;
	font-weight: 400;
}

.compact-avatar {
	width: 24px;
	height: 24px;
	border-radius: 12px;
	border: 1px solid rgba(138, 90, 43, 0.08);
	margin-right: 7px;
	background: rgba(0, 0, 0, 0.04);
	flex-shrink: 0;
}

.compact-username {
	font-size: 13px;
	font-weight: 400;
	color: #51371f;
	max-width: 220px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.profile-header {
	position: relative;
	background:
		radial-gradient(circle at 0% 0%, rgba(248, 211, 174, 0.96) 0%, rgba(253, 231, 209, 0.86) 25%, rgba(255, 250, 244, 0.2) 52%, rgba(255, 250, 244, 0) 70%),
		linear-gradient(135deg, rgba(255, 246, 235, 1) 0%, rgba(253, 231, 209, 1) 62%, rgba(248, 211, 174, 1) 100%);
	overflow: hidden;
	box-sizing: border-box;
}

.profile-header-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	box-sizing: border-box;
	padding-left: 16px;
	padding-right: 16px;
}

.back-btn {
	position: absolute;
	left: 14px;
	width: 32px;
	height: 32px;
	background: rgba(255, 255, 255, 0.68);
	backdrop-filter: blur(10px);
	border-radius: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
	box-shadow: 0 2px 8px rgba(138, 90, 43, 0.08);
}

.back-icon {
	font-size: 18px;
	line-height: 1;
	color: #8a5a2b;
	font-weight: 400;
}

.avatar-section {
	display: flex;
	justify-content: center;
	margin-bottom: 8px;
	flex-shrink: 0;
}

.avatar {
	border: 3px solid rgba(255, 255, 255, 0.74);
	box-shadow: 0 4px 16px rgba(138, 90, 43, 0.14);
	box-sizing: border-box;
	background: #f3f3f3;
}

.user-info {
	text-align: center;
	margin-bottom: 10px;
	flex-shrink: 0;
}

.username {
	display: block;
	font-size: 20px;
	font-weight: 500;
	color: #51371f;
	line-height: 24px;
	text-shadow: none;
}

.stats-section {
	display: flex;
	align-items: center;
	justify-content: space-around;
	width: 100%;
	padding: 0 46px;
	margin-bottom: 10px;
	box-sizing: border-box;
	flex-shrink: 0;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 1;
}

.stat-number {
	font-size: 18px;
	font-weight: 500;
	color: #51371f;
	line-height: 21px;
	margin-bottom: 2px;
	text-shadow: none;
}

.stat-label {
	font-size: 11px;
	line-height: 13px;
	color: rgba(81, 55, 31, 0.68);
}

.action-buttons {
	display: flex;
	gap: 10px;
	width: 100%;
	padding: 0 20px;
	box-sizing: border-box;
	flex-shrink: 0;
}

.follow-btn,
.message-btn {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 5px;
	font-size: 14px;
	font-weight: 400;
	transition: all 0.24s;
	box-sizing: border-box;
}

.follow-btn {
	background: #fff;
	color: #8a5a2b;
	box-shadow: 0 3px 10px rgba(138, 90, 43, 0.08);
}

.follow-btn.following {
	background: rgba(255, 255, 255, 0.42);
	color: #8a5a2b;
	box-shadow: none;
}

.message-btn {
	background: rgba(255, 255, 255, 0.42);
	color: #8a5a2b;
	border: none;
	box-shadow: none;
}

.message-btn-icon {
	font-size: 15px;
	line-height: 1;
	color: #8a5a2b;
	border: none;
	background: transparent;
}

.follow-prefix {
	font-size: 14px;
	line-height: 1;
	color: inherit;
}

.btn-text {
	font-size: 14px;
	font-weight: 400;
	line-height: 1;
}

.tab-bar {
	display: flex;
	align-items: center;
	background: #f8f9fa;
	border-bottom: none;
	position: sticky;
	top: 0;
	z-index: 90;
	box-sizing: border-box;
}

.tab-item {
	flex: 1;
	height: 100%;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	transition: all 0.24s;
	color: #666;
	box-sizing: border-box;
	background: #f8f9fa;
}

.tab-item.active {
	color: #8a5a2b;
}

.like-tab .tab-icon {
	color: #ff4d67;
}

.tab-icon {
	font-size: 15px;
	line-height: 1;
}

.tab-text {
	font-size: 13px;
	font-weight: 400;
	line-height: 1;
}

.tab-indicator {
	position: absolute;
	bottom: 0;
	width: 24px;
	height: 2px;
	background: rgba(253, 231, 209, 1);
	border-radius: 2px;
	animation: slideIn 0.24s ease;
}

.like-indicator {
	background: rgba(255, 77, 103, 0.82);
}

@keyframes slideIn {
	from {
		width: 0;
		opacity: 0;
	}
	to {
		width: 24px;
		opacity: 1;
	}
}

.content-container {
	box-sizing: border-box;
	background: #f8f9fa;
}

.creation-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 6px;
}

.creation-card {
	background: #fff;
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 1px 5px rgba(0, 0, 0, 0.045);
	box-sizing: border-box;
}

.creation-card:active {
	transform: translateY(-1px);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.image-wrapper {
	position: relative;
	width: 100%;
	overflow: hidden;
	background: #f3f3f3;
}

.card-image {
	width: 100%;
	height: 100%;
	display: block;
	vertical-align: top;
	object-fit: cover;
	object-position: center center;
}

.card-content {
	padding: 4px 5px 4px;
	box-sizing: border-box;
	overflow: hidden;
	background: #fff;
}

.card-title-container {
	height: 16px;
	margin-bottom: 2px;
}

.card-title {
	font-size: 10px;
	font-weight: 500;
	color: #333;
	line-height: 16px;
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 16px;
}

.card-author {
	display: flex;
	align-items: center;
	gap: 3px;
	flex: 1;
	min-width: 0;
}

.author-avatar {
	width: 14px;
	height: 14px;
	border-radius: 50%;
	border: 1px solid #f0f0f0;
	object-fit: cover;
	flex-shrink: 0;
}

.author-name {
	font-size: 9px;
	color: #555;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-likes {
	display: flex;
	align-items: center;
	gap: 2px;
	flex-shrink: 0;
	padding-left: 3px;
}

.like-icon {
	font-size: 11px;
	line-height: 1;
	color: #ff4d67;
	transition: transform 0.15s ease;
}

.like-icon.active {
	transform: scale(1.1);
	color: #ff4d67;
}

.like-count {
	font-size: 9px;
	color: #999;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 80px 0;
}

.empty-icon {
	font-size: 58px;
	margin-bottom: 12px;
	color: #d8a25d;
	line-height: 1;
}

.like-empty-icon {
	color: #ff4d67;
}

.empty-text {
	font-size: 14px;
	color: #666;
}

.loading-more {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 20px 0;
}

.loading-spinner {
	width: 20px;
	height: 20px;
	border: 2px solid #f3f3f3;
	border-top-color: #d8a25d;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.loading-text {
	font-size: 13px;
	color: #999;
}
</style>