<template>
	<view class="user-profile-container">
		<!-- 下滑后出现的用户信息栏：只包含返回 + 头像 + 用户名；原始作品/点赞栏滚动到这里后与它合并 -->
		<view
			v-if="stickyHeaderVisible"
			class="compact-sticky-header"
			:style="compactStickyHeaderStyle"
		>
			<view class="compact-profile-row" :style="compactProfileRowStyle">
				<view class="compact-back-btn" @click="goBack">
					<text class="compact-back-icon">‹</text>
				</view>
				<image class="compact-avatar" :src="avatar || defaultAvatar" mode="aspectFill"></image>
				<text class="compact-username">{{ username || '用户' }}</text>
			</view>
		</view>

		<!-- 顶部区域：占屏幕五分之二，包含刘海 / 状态栏 -->
		<view class="profile-header" :style="profileHeaderStyle">
			<!-- 返回按钮 -->
			<view class="back-btn" :style="backBtnStyle" @click="goBack">
				<text class="back-icon">‹</text>
			</view>

			<view class="profile-header-content" :style="profileHeaderContentStyle">
				<view class="avatar-section">
					<image class="avatar" :style="avatarStyle" :src="avatar || defaultAvatar" mode="aspectFill"></image>
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
						@click="toggleFollow"
					>
						<text class="btn-icon">{{ followBtnIcon }}</text>
						<text class="btn-text">{{ followBtnText }}</text>
					</view>
					<view class="message-btn" @click="goToChat">
						<text class="btn-icon">💬</text>
						<text class="btn-text">私信</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 原始 Tab：滚动到顶部时粘在用户信息栏下方，与信息栏合并成共同顶栏 -->
		<view class="tab-bar" :style="tabBarStyle">
			<view
				class="tab-item"
				:class="{ active: activeTab === 'works' }"
				@click="switchTab('works')"
			>
				<text class="tab-icon">🎬</text>
				<text class="tab-text">作品</text>
				<view class="tab-indicator" v-if="activeTab === 'works'"></view>
			</view>
			<view
				class="tab-item"
				:class="{ active: activeTab === 'likes' }"
				@click="switchTab('likes')"
			>
				<text class="tab-icon">♥️</text>
				<text class="tab-text">点赞</text>
				<view class="tab-indicator" v-if="activeTab === 'likes'"></view>
			</view>
		</view>

		<!-- 内容列表：卡片高度按整个屏幕计算，一屏约 4 行 -->
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
							<view class="image-gradient"></view>
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
									<text class="like-icon" :class="{ active: item.is_digg }">
										{{ item.is_digg ? '♥️' : '♡' }}
									</text>
									<text class="like-count">{{ formatNumber(item.digg_count) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<view v-if="worksList.length === 0 && !loading" class="empty-state">
					<text class="empty-icon">📦</text>
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
							<view class="image-gradient"></view>
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
									<text class="like-icon" :class="{ active: item.is_digg }">
										{{ item.is_digg ? '♥️' : '♡' }}
									</text>
									<text class="like-count">{{ formatNumber(item.digg_count) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<view v-if="likesList.length === 0 && !loading" class="empty-state">
					<text class="empty-icon">💔</text>
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

const TAB_BAR_HEIGHT = 48
const COMPACT_PROFILE_HEIGHT = 40
const GRID_GAP = 6
const CONTENT_PADDING_TOP = 8
const CONTENT_PADDING_X = 8
const CONTENT_PADDING_BOTTOM = 10
const MIN_HEADER_HEIGHT = 240
const MIN_CARD_HEIGHT = 118
const MIN_CARD_CONTENT_HEIGHT = 36
const MAX_CARD_CONTENT_HEIGHT = 44
const MIN_IMAGE_HEIGHT = 76

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

			windowHeight: 667,
			statusBarHeight: 0,
			profileHeaderHeight: 267,
			profileHeaderContentHeight: 267,
			avatarSize: 86,
			creationCardHeight: 160,
			imageHeight: 118,
			cardContentHeight: 42,
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

		followBtnIcon() {
			return this.isFollowing ? '✓' : '+'
		},

		profileHeaderStyle() {
			return 'height:' + this.profileHeaderHeight + 'px;'
		},

		profileHeaderContentStyle() {
			return 'height:' + this.profileHeaderContentHeight + 'px;padding-top:' + this.statusBarHeight + 'px;'
		},

		backBtnStyle() {
			return 'top:' + (this.statusBarHeight + 10) + 'px;'
		},

		avatarStyle() {
			return 'width:' + this.avatarSize + 'px;height:' + this.avatarSize + 'px;border-radius:' + Math.floor(this.avatarSize / 2) + 'px;'
		},

		compactStickyHeaderStyle() {
			const totalHeight = this.statusBarHeight + COMPACT_PROFILE_HEIGHT
			const bgAlpha = Math.max(0, Math.min(0.96, this.stickyHeaderProgress * 0.96))
			const shadowAlpha = Math.max(0, Math.min(0.10, this.stickyHeaderProgress * 0.10))
			return (
				'height:' + totalHeight + 'px;' +
				'background:rgba(255,255,255,' + bgAlpha + ');' +
				'box-shadow:0 2px 12px rgba(0,0,0,' + shadowAlpha + ');'
			)
		},

		compactProfileRowStyle() {
			const totalHeight = this.statusBarHeight + COMPACT_PROFILE_HEIGHT
			return 'height:' + totalHeight + 'px;padding-top:' + this.statusBarHeight + 'px;'
		},

		tabBarStyle() {
			const stickyTop = this.statusBarHeight + COMPACT_PROFILE_HEIGHT
			const shadowAlpha = Math.max(0, Math.min(0.08, this.stickyHeaderProgress * 0.08))
			return (
				'height:' + TAB_BAR_HEIGHT + 'px;' +
				'top:' + stickyTop + 'px;' +
				'box-shadow:0 2px 10px rgba(0,0,0,' + shadowAlpha + ');'
			)
		},

		contentContainerStyle() {
			return 'padding:' + CONTENT_PADDING_TOP + 'px ' + CONTENT_PADDING_X + 'px ' + CONTENT_PADDING_BOTTOM + 'px;'
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
		const infoBarHeight = this.statusBarHeight + COMPACT_PROFILE_HEIGHT
		// 原始作品/点赞栏的顶部到达 infoBarHeight 时会进入 sticky 状态。
		// 信息栏提前一点淡入，结束点正好对齐 tab 的 sticky 起点，避免突然跳动或错位。
		const start = Math.max(0, this.profileHeaderHeight - infoBarHeight - 160)
		const end = Math.max(start + 1, this.profileHeaderHeight - infoBarHeight)
		const rawProgress = (scrollTop - start) / (end - start)
		const progress = Math.max(0, Math.min(1, rawProgress))

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
				const windowHeight = Number(sys.windowHeight || 667)
				const statusBarHeight = Number(sys.statusBarHeight || 0)

				this.windowHeight = windowHeight
				this.statusBarHeight = statusBarHeight

				this.profileHeaderHeight = Math.max(MIN_HEADER_HEIGHT, Math.floor(windowHeight * 2 / 5))
				this.profileHeaderContentHeight = this.profileHeaderHeight

				const headerUsableHeight = Math.max(180, this.profileHeaderHeight - statusBarHeight)
				this.avatarSize = Math.max(68, Math.min(92, Math.floor(headerUsableHeight * 0.28)))

				const availableGridHeight = windowHeight - CONTENT_PADDING_TOP - CONTENT_PADDING_BOTTOM
				const nextCardHeight = Math.floor((availableGridHeight - GRID_GAP * 3) / 4)

				this.creationCardHeight = Math.max(MIN_CARD_HEIGHT, nextCardHeight)

				const nextContentHeight = Math.floor(this.creationCardHeight / 3.8)
				this.cardContentHeight = Math.max(
					MIN_CARD_CONTENT_HEIGHT,
					Math.min(MAX_CARD_CONTENT_HEIGHT, nextContentHeight)
				)
				this.imageHeight = Math.max(MIN_IMAGE_HEIGHT, this.creationCardHeight - this.cardContentHeight)
			} catch (err) {
				this.windowHeight = 667
				this.statusBarHeight = 0
				this.profileHeaderHeight = 267
				this.profileHeaderContentHeight = 267
				this.avatarSize = 86
				this.creationCardHeight = 160
				this.cardContentHeight = 42
				this.imageHeight = 118
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

				const pageSize = 20
				this.worksHasMore = list.length >= pageSize
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

				const pageSize = 20
				this.likesHasMore = list.length >= pageSize
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

		goToFollowerList() {
			uni.navigateTo({ url: `/pages/user/follower_list?userId=${this.userId}` })
		},

		goToFollowingList() {
			uni.navigateTo({ url: `/pages/user/following_list?userId=${this.userId}` })
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

<style scoped>
.user-profile-container {
	min-height: 100vh;
	background: #f8f9fa;
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
}

.compact-profile-row {
	display: flex;
	align-items: center;
	padding-left: 10px;
	padding-right: 14px;
	box-sizing: border-box;
}

.compact-back-btn {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-right: 4px;
}

.compact-back-icon {
	font-size: 30px;
	line-height: 30px;
	color: #333;
	font-weight: 300;
}

.compact-avatar {
	width: 26px;
	height: 26px;
	border-radius: 13px;
	border: 1px solid rgba(0, 0, 0, 0.08);
	margin-right: 8px;
	background: rgba(0, 0, 0, 0.04);
	flex-shrink: 0;
}

.compact-username {
	font-size: 14px;
	font-weight: 600;
	color: #333;
	max-width: 220px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.profile-header {
	position: relative;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	overflow: hidden;
	box-sizing: border-box;
}

.profile-header-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	padding-left: 16px;
	padding-right: 16px;
}

.back-btn {
	position: absolute;
	left: 16px;
	width: 34px;
	height: 34px;
	background: rgba(255, 255, 255, 0.24);
	backdrop-filter: blur(10px);
	border-radius: 17px;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
}

.back-icon {
	font-size: 30px;
	line-height: 30px;
	color: #fff;
	font-weight: 300;
}

.avatar-section {
	display: flex;
	justify-content: center;
	margin-bottom: 12px;
}

.avatar {
	border: 4px solid rgba(255, 255, 255, 0.3);
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	box-sizing: border-box;
}

.user-info {
	text-align: center;
	margin-bottom: 16px;
}

.username {
	display: block;
	font-size: 21px;
	font-weight: bold;
	color: #fff;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stats-section {
	display: flex;
	align-items: center;
	justify-content: space-around;
	width: 100%;
	padding: 0 46px;
	margin-bottom: 18px;
	box-sizing: border-box;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 1;
}

.stat-number {
	font-size: 19px;
	font-weight: bold;
	color: #fff;
	margin-bottom: 4px;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-label {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.85);
}

.action-buttons {
	display: flex;
	gap: 12px;
	width: 100%;
	padding: 0 20px;
	box-sizing: border-box;
}

.follow-btn,
.message-btn {
	flex: 1;
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	border-radius: 20px;
	font-size: 14px;
	font-weight: 500;
	transition: all 0.3s;
}

.follow-btn {
	background: #fff;
	color: #667eea;
	box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
}

.follow-btn.following {
	background: rgba(255, 255, 255, 0.3);
	color: #fff;
	box-shadow: none;
}

.message-btn {
	background: rgba(255, 255, 255, 0.3);
	color: #fff;
	border: 1px solid rgba(255, 255, 255, 0.5);
}

.btn-icon {
	font-size: 15px;
}

.btn-text {
	font-size: 14px;
}

.tab-bar {
	display: flex;
	align-items: center;
	background: #fff;
	border-bottom: 1px solid #f0f0f0;
	position: sticky;
	top: 0;
	z-index: 90;
	box-sizing: border-box;
}

.tab-item {
	flex: 1;
	height: 48px;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	transition: all 0.3s;
}

.tab-item.active {
	color: #667eea;
}

.tab-icon {
	font-size: 17px;
}

.tab-text {
	font-size: 14px;
	font-weight: 500;
}

.tab-indicator {
	position: absolute;
	bottom: 0;
	width: 32px;
	height: 3px;
	background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
	border-radius: 2px;
	animation: slideIn 0.3s ease;
}

@keyframes slideIn {
	from { width: 0; opacity: 0; }
	to { width: 32px; opacity: 1; }
}

.content-container {
	box-sizing: border-box;
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
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.creation-card:active {
	transform: translateY(-1px);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
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

.image-gradient {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 26px;
	background: linear-gradient(to top, rgba(0, 0, 0, 0.18), transparent);
}

.card-content {
	padding: 4px 5px;
	box-sizing: border-box;
	overflow: hidden;
}

.card-title-container {
	height: 15px;
	margin-bottom: 2px;
}

.card-title {
	font-size: 10px;
	font-weight: 500;
	color: #333;
	line-height: 15px;
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 15px;
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
	font-size: 10px;
	transition: transform 0.15s ease;
}

.like-icon.active {
	transform: scale(1.1);
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
	font-size: 60px;
	margin-bottom: 12px;
}

.empty-text {
	font-size: 14px;
	color: #999;
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
	border-top-color: #667eea;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

.loading-text {
	font-size: 13px;
	color: #999;
}
</style>
