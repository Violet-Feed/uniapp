<template>
	<view class="video-page">
		<!-- 视频本体：只在未打开评论时渲染 -->
		<video
			v-if="!showCommentsPanel"
			id="creationVideo"
			class="video-player"
			:src="creation.videoUrl"
			:poster="creation.coverImage"
			:controls="false"
			:show-center-play-btn="false"
			:enable-progress-gesture="true"
			:autoplay="true"
			:loop="true"
			objectFit="contain"
		></video>

		<!-- 整屏点击蒙层（暂停/播放），一定要放在其它 cover-view 前面，保证在下面 -->
		<cover-view
			v-if="!showCommentsPanel"
			class="video-click-mask"
			@click="handleVideoTap"
		></cover-view>

		<!-- 顶部：只有返回 -->
		<cover-view v-if="!showCommentsPanel" class="video-top-bar">
			<cover-view class="video-back-btn" @click="goBack">
				<cover-view class="back-icon">←</cover-view>
			</cover-view>
		</cover-view>

		<!-- 右侧头像 + 点赞 / 评论 / 转发 -->
		<cover-view v-if="!showCommentsPanel" class="video-right-actions">
			<!-- 头像 + 关注＋：整块都是头像可点击区域 -->
			<cover-view class="video-action-item avatar-item" @click="goToUserPage()">
				<cover-view class="video-author-avatar">
					<cover-image
						class="video-author-avatar-img"
						:src="creation.author.avatar || '/static/user_avatar.png'"
						mode="aspectFill"
					/>
				</cover-view>
				<cover-view
					v-if="!isFollowed"
					class="follow-plus"
					@click="handleFollowClick"
				>
					<cover-view class="follow-plus-text">+</cover-view>
				</cover-view>
			</cover-view>

			<!-- 点赞 -->
			<cover-view class="video-action-item" @click="toggleLike">
				<cover-view class="video-action-icon" :class="{ liked: isLiked }">
					{{ isLiked ? '♥️' : '♡' }}
				</cover-view>
				<cover-view class="video-action-count">
					{{ formatNumber(creation.likes) }}
				</cover-view>
			</cover-view>

			<!-- 评论 -->
			<cover-view class="video-action-item" @click="openCommentsPanel">
				<cover-view class="video-action-icon">💬</cover-view>
				<cover-view class="video-action-count">
					{{ formatNumber(creation.comments) }}
				</cover-view>
			</cover-view>

			<!-- 转发 -->
			<cover-view class="video-action-item" @click="handleShare">
				<cover-view class="video-action-icon">↗</cover-view>
				<cover-view class="video-action-count">
					{{ formatNumber(creation.shares) }}
				</cover-view>
			</cover-view>
		</cover-view>

		<!-- 中间暂停 / 播放 图标 -->
		<cover-view
			v-if="showCenterIcon && !showCommentsPanel"
			class="video-center-icon"
		>
			<cover-view class="center-icon-text">
				{{ isPlaying ? '⏸' : '▶️' }}
			</cover-view>
		</cover-view>

		<!-- 底部信息 -->
		<cover-view v-if="!showCommentsPanel" class="video-bottom-info">
			<cover-view class="video-author-row" @click="goToUserPage">
				<cover-view class="video-author-name">
					@{{ creation.author.username || '匿名用户' }}
				</cover-view>
			</cover-view>

			<cover-view class="video-title-row">
				<cover-view class="video-title">
					{{ creation.title || '无标题作品' }}
				</cover-view>
			</cover-view>

			<cover-view class="video-detail" :class="{ expanded: isDetailExpanded }">
				{{ creation.detail }}
			</cover-view>
			<cover-view
				v-if="creation.detail && creation.detail.length > 50"
				class="video-expand-btn"
				@click="toggleDetail"
			>
				{{ isDetailExpanded ? '收起' : '...展开' }}
			</cover-view>

			<cover-view class="video-tags" v-if="creation.tags.length">
				<cover-view
					class="video-tag"
					v-for="(tag, index) in creation.tags"
					:key="index"
				>
					# {{ tag }}
				</cover-view>
			</cover-view>
		</cover-view>

		<!-- 评论抽屉：打开时不再渲染 video 和 cover-view，只用普通 view -->
		<view
			v-if="showCommentsPanel"
			class="video-comments-mask"
			@click="closeCommentsPanel"
		>
			<view class="video-comments-panel" @click.stop>
				<view class="video-comments-header">
					<text class="video-comments-title">
						评论 {{ formatNumber(creation.comments) }}
					</text>
					<text class="video-comments-close" @click="closeCommentsPanel">✕</text>
				</view>

				<scroll-view scroll-y class="video-comments-scroll">
					<view class="comment-item" v-for="comment in commentList" :key="comment.id">
						<image
							class="comment-avatar"
							:src="comment.user.avatar || '/static/user_avatar.png'"
							mode="aspectFill"
							@click="goToUserPage(comment.user.user_id)"
						/>

						<view class="comment-content-wrapper">
							<view class="comment-header-row">
								<text class="comment-username">{{ comment.user.name }}</text>
								<view
									class="comment-like-btn"
									:class="{ liked: comment.isLiked }"
									@click="toggleCommentLike(comment)"
								>
									<text class="comment-like-icon">
										{{ comment.isLiked ? '♥' : '♡' }}
									</text>
									<text class="comment-like-count" v-if="comment.likes > 0">
										{{ formatNumber(comment.likes) }}
									</text>
								</view>
							</view>

							<text class="comment-text">{{ comment.text }}</text>

							<view class="comment-meta-row">
								<text class="comment-time">{{ comment.time }}</text>
								<text class="comment-reply-btn" @click="replyToComment(comment)">
									回复
								</text>
							</view>

							<!-- 二级回复 -->
							<view class="reply-list" v-if="comment.replies && comment.replies.length">
								<view
									class="reply-item"
									v-for="reply in comment.replies.slice(0, 3)"
									:key="reply.id"
								>
									<image
										class="reply-avatar"
										:src="reply.user.avatar || '/static/user_avatar.png'"
										mode="aspectFill"
										@click="goToUserPage(reply.user.user_id)"
									/>
									<view class="reply-content-wrapper">
										<view class="reply-header-row">
											<text class="reply-username">{{ reply.user.name }}</text>
											<text class="reply-to" v-if="reply.replyToUser">
												回复 @{{ reply.replyToUser }}
											</text>
											<view
												class="reply-like-btn"
												:class="{ liked: reply.isLiked }"
												@click="toggleReplyLike(reply)"
											>
												<text class="reply-like-icon">
													{{ reply.isLiked ? '♥' : '♡' }}
												</text>
												<text class="reply-like-count" v-if="reply.likes > 0">
													{{ formatNumber(reply.likes) }}
												</text>
											</view>
										</view>

										<text class="reply-text">{{ reply.text }}</text>

										<view class="reply-meta-row">
											<text class="reply-time">{{ reply.time }}</text>
											<text
												class="reply-reply-btn"
												@click="replyToComment(comment, reply)"
											>
												回复
											</text>
										</view>
									</view>
								</view>

								<text
									class="view-more-replies"
									v-if="comment.totalReplies > 3"
									@click="loadMoreReplies(comment)"
								>
									查看全部 {{ comment.totalReplies }} 条回复 &gt;
								</text>
							</view>
						</view>
					</view>

					<view v-if="!commentList.length && !commentLoading" class="empty-comments">
						<text>还没有评论，快来抢沙发吧~</text>
					</view>

					<view v-if="commentLoading" class="empty-comments">
						<text>评论加载中...</text>
					</view>
				</scroll-view>

				<!-- 底部输入 -->
				<view class="video-comment-input-bar">
					<input
						class="comment-input"
						v-model="commentText"
						:placeholder="commentPlaceholder"
						:focus="commentInputFocus"
						@blur="handleInputBlurInPanel"
						@confirm="sendComment"
					/>
					<view
						class="send-btn"
						:class="{ active: commentText.trim() }"
						@click="sendComment"
					>
						<text>发送</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getCreationById } from '@/request/creation.js'
import { getUserProfile } from '@/request/user.js'
import { digg, cancelDigg } from '@/request/action.js'
// import { getCommentsByCreation } from '@/request/comment.js'
// import { follow, unfollow } from '@/request/follow.js'

export default {
	data() {
		return {
			creationId: '',
			authorId: '',
			videoContext: null,

			creation: {
				creationId: '',
				userId: '',
				type: 'video',
				title: '',
				detail: '',
				videoUrl: '',
				coverImage: '',
				tags: [],
				time: '',
				location: '',
				category: '',
				author: {
					user_id: '',
					username: '',
					avatar: '',
					followerCount: 0
				},
				likes: 0,
				comments: 0,
				shares: 0
			},

			isLiked: false,
			isFollowed: false,
			isDetailExpanded: false,

			isPlaying: true,
			showCenterIcon: false,
			centerIconTimer: null,

			showCommentsPanel: false,
			commentList: [],
			commentLoading: false,

			commentText: '',
			commentPlaceholder: '说点什么...',
			commentInputFocus: false,
			replyingTo: null,

			likeLoading: false
		}
	},
	onLoad(options) {
		this.creationId = options.creationId
		this.authorId = options.userId
		this.initPage()
	},
	onReady() {
		this.videoContext = uni.createVideoContext('creationVideo', this)
	},
	onUnload() {
		if (this.centerIconTimer) {
			clearTimeout(this.centerIconTimer)
			this.centerIconTimer = null
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},

		async initPage() {
			uni.showLoading({ title: '加载中...' })
			try {
				await Promise.all([
					this.fetchCreationDetail(),
					this.fetchAuthorInfo(),
					this.fetchCommentsAndStats()
				])
			} catch (e) {
				console.error(e)
				uni.showToast({ title: '加载失败', icon: 'none' })
			} finally {
				uni.hideLoading()
			}
		},

		async fetchCreationDetail() {
			const res = await getCreationById(this.creationId)
			const c = res.creation || res

			const materialType = c.material_type
			const isVideo = Number(materialType) === 2

			this.creation.creationId = c.creation_id || this.creationId
			this.creation.userId = c.user_id || this.authorId
			this.creation.type = isVideo ? 'video' : 'image'
			this.creation.title = c.title || ''
			this.creation.detail = c.content || ''
			this.creation.category = c.category || ''
			this.creation.time = c.create_time || ''

			const cover = c.cover_url || c.material_url || ''
			this.creation.coverImage = cover
			this.creation.videoUrl = isVideo ? (c.material_url || '') : ''
		},

		async fetchAuthorInfo() {
			if (!this.authorId) return
			const res = await getUserProfile(this.authorId, true, false)
			const info = res.user_info || {}

			this.creation.author = {
				user_id: info.user_id || this.authorId,
				username: info.username || info.nickname || '',
				avatar: info.avatar || '/static/user_avatar.png',
				followerCount: res.follower_count || 0
			}
			this.isFollowed = !!res.is_following
		},

		async fetchCommentsAndStats() {
			this.commentLoading = true
			try {
				// const res = await getCommentsByCreation(this.creationId)
				const res = { comments: [] }

				const list = res.comments || res.comment_list || []

				this.commentList = list.map((c) => {
					const replies = (c.replies || []).map((r) => ({
						id: r.comment_id,
						user: {
							user_id: r.user_id,
							name: r.username,
							avatar: r.avatar
						},
						text: r.content,
						time: r.create_time,
						likes: r.digg_count || 0,
						isLiked: !!r.is_digg,
						replyToUser: r.reply_to_username || ''
					}))

					return {
						id: c.comment_id,
						user: {
							user_id: c.user_id,
							name: c.username,
							avatar: c.avatar
						},
						text: c.content,
						time: c.create_time,
						likes: c.digg_count || 0,
						isLiked: !!c.is_digg,
						totalReplies: c.reply_count || replies.length,
						replies
					}
				})

				if (typeof res.comment_count === 'number') {
					this.creation.comments = res.comment_count
				} else {
					this.creation.comments = this.commentList.length
				}
				if (typeof res.digg_count === 'number') {
					this.creation.likes = res.digg_count
				}
				if (typeof res.share_count === 'number') {
					this.creation.shares = res.share_count
				}
				if (typeof res.is_digg === 'boolean') {
					this.isLiked = res.is_digg
				}
			} catch (e) {
				console.error('加载评论失败', e)
				uni.showToast({ title: '评论加载失败', icon: 'none' })
			} finally {
				this.commentLoading = false
			}
		},

		/* 播放 / 暂停：点击整屏 cover-view 蒙层 */
		handleVideoTap() {
			if (!this.videoContext) return

			if (this.isPlaying) {
				this.videoContext.pause()
				this.isPlaying = false
				// 暂停：图标常驻
				if (this.centerIconTimer) {
					clearTimeout(this.centerIconTimer)
					this.centerIconTimer = null
				}
				this.showCenterIcon = true
			} else {
				this.videoContext.play()
				this.isPlaying = true
				// 播放：图标闪一下
				this.showCenterIcon = true
				if (this.centerIconTimer) clearTimeout(this.centerIconTimer)
				this.centerIconTimer = setTimeout(() => {
					this.showCenterIcon = false
					this.centerIconTimer = null
				}, 600)
			}
		},

		/* 点赞作品 */
		async toggleLike() {
			if (this.likeLoading || !this.creation.creationId) return
			this.likeLoading = true
			try {
				if (this.isLiked) {
					await cancelDigg('creation', this.creation.creationId)
					this.isLiked = false
					this.creation.likes = Math.max(0, this.creation.likes - 1)
				} else {
					await digg('creation', this.creation.creationId)
					this.isLiked = true
					this.creation.likes += 1
				}
			} catch (e) {
				console.error('点赞失败', e)
				uni.showToast({ title: '操作失败', icon: 'none' })
			} finally {
				this.likeLoading = false
			}
		},

		/* 关注：右侧＋ */
		async handleFollowClick() {
			// 注意：这里不能用 .stop，所以点击 + 也会触发 goToUserPage
			// 你要是觉得这样还行，就保持这样；等以后用 nvue/原生组件再精修
			this.isFollowed = true
			uni.showToast({ title: '关注成功', icon: 'none' })
		},

		toggleDetail() {
			this.isDetailExpanded = !this.isDetailExpanded
		},

		openCommentsPanel() {
			this.showCommentsPanel = true
			this.commentInputFocus = false
		},
		closeCommentsPanel() {
			this.showCommentsPanel = false
			this.commentText = ''
			this.replyingTo = null
			this.commentPlaceholder = '说点什么...'
		},

		goToUserPage(userId) {
			const targetId = userId || this.creation.author.user_id
			if (!targetId) return
			uni.navigateTo({
				url: `/pages/user/user_profile?userId=${targetId}`
			})
		},

		toggleCommentLike(comment) {
			comment.isLiked = !comment.isLiked
			comment.likes = Math.max(0, comment.likes + (comment.isLiked ? 1 : -1))
		},
		toggleReplyLike(reply) {
			reply.isLiked = !reply.isLiked
			reply.likes = Math.max(0, reply.likes + (reply.isLiked ? 1 : -1))
		},
		replyToComment(comment, reply) {
			const target = reply || comment
			this.replyingTo = target
			this.commentPlaceholder = `回复 @${target.user.name}`
			this.commentInputFocus = true
		},
		loadMoreReplies(comment) {
			uni.showToast({ title: '加载更多回复开发中', icon: 'none' })
		},
		handleInputBlurInPanel() {
			setTimeout(() => {
				this.commentInputFocus = false
			}, 200)
		},
		async sendComment() {
			const text = this.commentText.trim()
			if (!text) return

			try {
				// TODO: 接评论接口
				uni.showToast({ title: '发送成功', icon: 'success' })
				this.commentText = ''
				this.commentPlaceholder = '说点什么...'
				this.replyingTo = null
				this.fetchCommentsAndStats()
			} catch (e) {
				console.error('发送评论失败', e)
				uni.showToast({ title: '发送失败', icon: 'none' })
			}
		},

		handleShare() {
			uni.showToast({ title: '分享功能开发中', icon: 'none' })
		},

		formatNumber(num) {
			if (!num) return 0
			if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
			if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
			return num
		}
	}
}
</script>

<style scoped>
.video-page {
	width: 100%;
	height: 100vh;
	background: #000;
	position: relative;
	overflow: hidden;
}

/* 视频：全屏铺底 */
.video-player {
	width: 100%;
	height: 100%;
}

/* 整屏点击蒙层：透明，铺满屏幕 */
.video-click-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 5;
}

/* 顶部：返回 */
.video-top-bar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: 56px;
	padding: 8px 12px;
	display: flex;
	align-items: center;
	z-index: 20;
}

.video-back-btn {
	width: 40px;
	height: 40px;
	border-radius: 20px;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-icon {
	color: #fff;
	font-size: 22px;
}

/* 右侧操作栏：整体再往下一点 */
.video-right-actions {
	position: fixed;
	right: 12px;
	top: 52%;
	transform: translateY(-20%);
	display: flex;
	flex-direction: column;
	align-items: center;
	z-index: 20;
}

/* 每个按钮点击区域 */
.video-action-item {
	position: relative;
	width: 80px;
	height: 80px;
	margin-bottom: 20px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

/* 头像 item 再高一点，点击更宽松 */
.avatar-item {
	height: 96px;
}

/* 头像 + 边框：圆形，大小一致 */
.video-author-avatar {
	width: 52px;
	height: 52px;
	border-radius: 26px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.video-author-avatar-img {
	width: 52px;
	height: 52px;
	border-radius: 26px;
	border: 1px solid #fff;
}

/* 右侧关注＋：叠在头像下方边缘 */
.follow-plus {
	position: absolute;
	bottom: 2px;
	right: 8px;
	width: 24px;
	height: 24px;
	border-radius: 12px;
	background: #ff4757;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px solid #fff;
}

.follow-plus-text {
	color: #fff;
	font-size: 16px;
	font-weight: 700;
}

/* 点赞 / 评论 / 转发图标 */
.video-action-icon {
	font-size: 30px;
	color: #fff;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.video-action-icon.liked {
	color: #ff4757;
}

.video-action-count {
	font-size: 12px;
	color: #fff;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	margin-top: 2px;
}

/* 中间暂停 / 播放图标 */
.video-center-icon {
	position: fixed;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: 80px;
	height: 80px;
	border-radius: 40px;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 25;
}

.center-icon-text {
	font-size: 44px;
	color: #fff;
}

/* 底部信息区域：整体更大一点 */
.video-bottom-info {
	position: fixed;
	left: 12px;
	right: 80px;
	bottom: 20px;
	z-index: 20;
}

/* 用户名和标题之间拉开距离 */
.video-author-row {
	margin-bottom: 12px;
}

/* 用户名：更大、更粗一点 */
.video-author-name {
	font-size: 19px;
	font-weight: 700;
	color: #fff;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

/* 标题和正文之间再拉开一点 */
.video-title-row {
	margin-bottom: 8px;
}

/* 标题更大 */
.video-title {
	font-size: 17px;
	color: #fff;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
	line-height: 1.6;
}

/* 正文内容更大，显示更多行 */
.video-detail {
	font-size: 16px;
	color: rgba(255, 255, 255, 0.9);
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
	line-height: 1.7;
	max-height: 72px;
	overflow: hidden;
}

.video-detail.expanded {
	max-height: none;
}

.video-expand-btn {
	font-size: 14px;
	color: rgba(255, 255, 255, 0.85);
	margin-top: 4px;
}

.video-tags {
	margin-top: 6px;
	display: flex;
	flex-wrap: wrap;
}

.video-tag {
	margin-right: 6px;
	font-size: 13px;
	color: rgba(255, 255, 255, 0.85);
}

/* 评论抽屉：至少占屏幕一半，这里给 60% 起步 */
.video-comments-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 40;
	display: flex;
	align-items: flex-end;
}

.video-comments-panel {
	width: 100%;
	max-height: 90%;
	min-height: 60%;
	background: #fff;
	border-radius: 16px 16px 0 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.video-comments-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid #f0f0f0;
}

.video-comments-title {
	font-size: 16px;
	font-weight: 600;
	color: #333;
}

.video-comments-close {
	font-size: 20px;
	color: #999;
}

.video-comments-scroll {
	flex: 1;
	padding: 0 16px;
}

/* 评论样式 */
.comment-item {
	display: flex;
	gap: 12px;
	padding: 12px 0;
	border-bottom: 1px solid #f5f5f5;
}

.comment-avatar {
	width: 32px;
	height: 32px;
	border-radius: 16px;
	flex-shrink: 0;
}

.comment-content-wrapper {
	flex: 1;
}

.comment-header-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 4px;
}

.comment-username {
	font-size: 14px;
	font-weight: 500;
	color: #333;
}

.comment-like-btn {
	display: flex;
	align-items: center;
	gap: 4px;
}

.comment-like-icon {
	font-size: 18px;
	color: #999;
}

.comment-like-btn.liked .comment-like-icon {
	color: #ff4757;
}

.comment-like-count {
	font-size: 12px;
	color: #999;
}

.comment-text {
	font-size: 14px;
	color: #333;
	line-height: 1.5;
	margin-bottom: 4px;
}

.comment-meta-row {
	display: flex;
	align-items: center;
	gap: 16px;
}

.comment-time {
	font-size: 12px;
	color: #999;
}

.comment-reply-btn {
	font-size: 13px;
	color: #666;
}

/* 二级回复 */
.reply-list {
	margin-top: 8px;
	padding-left: 12px;
	border-left: 2px solid #f0f0f0;
}

.reply-item {
	display: flex;
	gap: 10px;
	padding: 8px 0;
}

.reply-avatar {
	width: 26px;
	height: 26px;
	border-radius: 13px;
	flex-shrink: 0;
}

.reply-content-wrapper {
	flex: 1;
}

.reply-header-row {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 4px;
}

.reply-username {
	font-size: 13px;
	font-weight: 500;
	color: #333;
}

.reply-to {
	font-size: 13px;
	color: #999;
}

.reply-like-btn {
	display: flex;
	align-items: center;
	gap: 4px;
	margin-left: auto;
}

.reply-like-icon {
	font-size: 16px;
	color: #999;
}

.reply-like-btn.liked .reply-like-icon {
	color: #ff4757;
}

.reply-like-count {
	font-size: 11px;
	color: #999;
}

.reply-text {
	font-size: 13px;
	color: #333;
	line-height: 1.5;
	margin-bottom: 4px;
}

.reply-meta-row {
	display: flex;
	align-items: center;
	gap: 12px;
}

.reply-time {
	font-size: 11px;
	color: #999;
}

.reply-reply-btn {
	font-size: 12px;
	color: #666;
}

.view-more-replies {
	font-size: 13px;
	color: #5b7dff;
	padding: 6px 0;
	display: block;
}

.empty-comments {
	padding: 40px 0;
	text-align: center;
	color: #999;
	font-size: 14px;
}

/* 评论输入条 */
.video-comment-input-bar {
	padding: 8px 12px;
	padding-bottom: calc(8px + env(safe-area-inset-bottom));
	border-top: 1px solid #f0f0f0;
	background: #fff;
	display: flex;
	align-items: center;
	gap: 8px;
}

.comment-input {
	flex: 1;
	height: 36px;
	background: #f5f5f5;
	border-radius: 18px;
	padding: 0 14px;
	font-size: 14px;
}

.send-btn {
	padding: 8px 16px;
	background: #f0f0f0;
	color: #999;
	border-radius: 18px;
	font-size: 14px;
	font-weight: 500;
}

.send-btn.active {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
}
</style>
