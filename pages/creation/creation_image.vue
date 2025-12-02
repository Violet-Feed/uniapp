<template>
	<view class="container image-mode">
		<!-- 顶部作者信息 -->
		<view class="top-bar">
			<view class="back-btn" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<!-- 显式传作者 user_id，避免 event 被当成 userId -->
			<view class="author-info" @click="goToUserPage(creation.author.user_id)">
				<image
					class="author-avatar"
					:src="creation.author.avatar || '/static/user_avatar.png'"
					mode="aspectFill"
				></image>
				<view class="author-details">
					<text class="author-name">{{ creation.author.username || '匿名用户' }}</text>
					<text class="author-desc">{{ formatNumber(creation.author.followerCount) }} 粉丝</text>
				</view>
			</view>
			<view class="follow-btn" :class="{ followed: isFollowed }" @click.stop="toggleFollow">
				<text>{{ isFollowed ? '已关注' : '+ 关注' }}</text>
			</view>
		</view>

		<!-- 图片展示区域：只用 material_url/cover_url 这一张 -->
		<swiper
			class="image-swiper"
			:indicator-dots="creation.images.length > 1"
			indicator-color="rgba(255,255,255,0.5)"
			indicator-active-color="#fff"
		>
			<swiper-item v-for="(image, index) in creation.images" :key="index">
				<image class="creation-image" :src="image" mode="aspectFill"></image>
			</swiper-item>
		</swiper>

		<!-- 内容区域 -->
		<view class="content-section">
			<view class="title-row">
				<text class="creation-title">{{ creation.title || '无标题作品' }}</text>
			</view>
			<view class="detail-text" :class="{ expanded: isDetailExpanded }">
				<text>{{ creation.detail }}</text>
			</view>
			<text
				v-if="creation.detail && creation.detail.length > 100"
				class="expand-btn"
				@click="toggleDetail"
			>
				{{ isDetailExpanded ? '收起' : '展开' }}
			</text>

			<view class="tags-row" v-if="creation.tags.length">
				<text class="tag-item" v-for="(tag, index) in creation.tags" :key="index">
					# {{ tag }}
				</text>
			</view>

			<view class="meta-info">
				<text class="meta-time">{{ creation.time }}</text>
				<text class="meta-location" v-if="creation.location">📍 {{ creation.location }}</text>
			</view>
		</view>

		<!-- 评论区域 -->
		<view class="comments-section" id="commentsSection">
			<view class="comments-header">
				<text class="comments-title">评论 {{ formatNumber(creation.comments) }}</text>
			</view>

			<view class="comment-list">
				<view class="comment-item" v-for="comment in commentList" :key="comment.id">
					<image
						class="comment-avatar"
						:src="comment.user.avatar || '/static/user_avatar.png'"
						mode="aspectFill"
						@click="goToUserPage(comment.user.user_id)"
					></image>

					<view class="comment-content-wrapper">
						<view class="comment-header-row">
							<text
								class="comment-username"
								@click="goToUserPage(comment.user.user_id)"
							>
								{{ comment.user.name }}
							</text>

							<view
								class="comment-like-btn"
								:class="{ liked: comment.isLiked }"
								@click="toggleCommentLike(comment)"
							>
								<text class="comment-like-icon">{{ comment.isLiked ? '♥️' : '♡' }}</text>
								<text class="comment-like-count">{{ formatNumber(comment.likes) }}</text>
							</view>
						</view>

						<text class="comment-text">{{ comment.text }}</text>

						<view class="comment-meta-row">
							<text class="comment-time">{{ comment.time }}</text>
							<text class="comment-reply-btn" @click="replyToComment(comment)">回复</text>
						</view>

						<!-- 二级评论 -->
						<view v-if="comment.replies && comment.replies.length" class="reply-list">
							<view class="reply-item" v-for="reply in comment.replies" :key="reply.id">
								<image
									class="reply-avatar"
									:src="reply.user.avatar || '/static/user_avatar.png'"
									mode="aspectFill"
									@click="goToUserPage(reply.user.user_id)"
								></image>

								<view class="reply-content-wrapper">
									<view class="reply-header-row">
										<text
											class="reply-username"
											@click="goToUserPage(reply.user.user_id)"
										>
											{{ reply.user.name }}
										</text>
										<text class="reply-to" v-if="reply.replyToUser">
											回复 @{{ reply.replyToUser }}
										</text>

										<view
											class="reply-like-btn"
											:class="{ liked: reply.isLiked }"
											@click="toggleReplyLike(reply)"
										>
											<text class="reply-like-icon">
												{{ reply.isLiked ? '♥️' : '♡' }}
											</text>
											<text class="reply-like-count">
												{{ formatNumber(reply.likes) }}
											</text>
										</view>
									</view>

									<text class="reply-text">{{ reply.text }}</text>

									<view class="reply-meta-row">
										<text class="reply-time">{{ reply.time }}</text>
										<text class="reply-reply-btn" @click="replyToComment(comment, reply)">
											回复
										</text>
									</view>
								</view>
							</view>

							<text
								v-if="comment.totalReplies > comment.replies.length"
								class="view-more-replies"
								@click="loadMoreReplies(comment)"
							>
								查看更多 {{ comment.totalReplies - comment.replies.length }} 条回复
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
			</view>
		</view>

		<!-- 底部操作栏 -->
		<view class="bottom-bar">
			<view class="comment-input-wrapper" @click="focusCommentInput">
				<text class="comment-placeholder">说点什么...</text>
			</view>

			<view class="action-group">
				<view class="action-item" @click="toggleLike">
					<text class="action-icon" :class="{ liked: isLiked }">
						{{ isLiked ? '♥️' : '♡' }}
					</text>
					<text class="action-count">{{ formatNumber(creation.likes) }}</text>
				</view>

				<view class="action-item" @click="scrollToComments">
					<text class="action-icon">💬</text>
					<text class="action-count">{{ formatNumber(creation.comments) }}</text>
				</view>

				<view class="action-item" @click="handleShare">
					<text class="action-icon">↗</text>
					<text class="action-count">{{ formatNumber(creation.shares) }}</text>
				</view>
			</view>
		</view>

		<!-- 评论输入框 -->
		<view class="comment-input-bar" :class="{ show: showCommentInput }">
			<input
				class="comment-input"
				v-model="commentText"
				:placeholder="commentPlaceholder"
				:focus="commentInputFocus"
				@blur="handleInputBlur"
				@confirm="sendComment"
			/>
			<view class="send-btn" :class="{ active: commentText.trim() }" @click="sendComment">
				<text>发送</text>
			</view>
		</view>
	</view>
</template>

<script>
import { getCreationById } from '@/request/creation.js'
import { getUserProfile } from '@/request/user.js'
//import { getCommentsByCreation } from '@/request/comment.js' // 根据你实际文件路径改
import { digg, cancelDigg } from '@/request/action.js'

export default {
	data() {
		return {
			creationId: '',
			authorId: '',

			creation: {
				creationId: '',
				userId: '',
				type: 'image', // material_type === 1
				title: '',
				detail: '',
				images: [],
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

			commentList: [],
			commentLoading: false,

			showCommentInput: false,
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
	methods: {
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

		// 获取创作详情（内容）
		async fetchCreationDetail() {
			const res = await getCreationById(this.creationId)

			const materialType = res.creation.material_type
			const isVideo = materialType === 2

			this.creation.creationId = res.creation.creation_id || this.creationId
			this.creation.userId = res.creation.user_id || this.authorId
			this.creation.type = isVideo ? 'video' : 'image'
			this.creation.title = res.creation.title || ''
			this.creation.detail = res.creation.content || ''
			this.creation.category = res.creation.category || ''
			// 这里可以按需格式化时间，现在先用原始字段
			this.creation.time = res.creation.create_time || ''

			// ✅ 图片只用 material_url 这一张，没有就退回 cover_url
			const cover = res.creation.material_url || res.creation.cover_url || ''
			this.creation.coverImage = cover
			this.creation.images = cover ? [cover] : []
		},

		// 获取作者信息 + 是否关注
		async fetchAuthorInfo() {
			const targetUserId = this.authorId || this.creation.userId
			if (!targetUserId) return

			const res = await getUserProfile(targetUserId, true, false)
			const info = res.user_info || {}

			this.creation.author = {
				user_id: info.user_id || targetUserId,
				username: info.username || info.nickname || '',
				avatar: info.avatar || '/static/user_avatar.png',
				followerCount: res.follower_count || 0
			}
			this.isFollowed = !!res.is_following
		},

		// 获取评论列表 + 点赞数 / 评论数 / 是否点赞
		async fetchCommentsAndStats() {
			this.commentLoading = true
			try {
				const res = await getCommentsByCreation(this.creationId)
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

		// 返回
		goBack() {
			uni.navigateBack()
		},

		// 去作者页 / 其他用户页
		goToUserPage(userId) {
			const targetId = userId || this.creation.author.user_id
			if (!targetId) return
			uni.navigateTo({
				url: `/pages/user/user_profile?userId=${targetId}`
			})
		},

		// 滚动到评论区域
		scrollToComments() {
			uni.pageScrollTo({
				selector: '#commentsSection',
				duration: 300
			})
		},

		// 点赞 / 取消点赞（创作）
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

		// 关注 / 取关（这里仅前端状态，按需接你自己的接口）
		toggleFollow() {
			this.isFollowed = !this.isFollowed
			uni.showToast({
				title: this.isFollowed ? '关注成功' : '取消关注',
				icon: 'none'
			})
		},

		// 展开 / 收起文案
		toggleDetail() {
			this.isDetailExpanded = !this.isDetailExpanded
		},

		// 点赞评论（这里只做前端计数）
		toggleCommentLike(comment) {
			comment.isLiked = !comment.isLiked
			comment.likes = Math.max(0, comment.likes + (comment.isLiked ? 1 : -1))
		},

		// 点赞二级回复
		toggleReplyLike(reply) {
			reply.isLiked = !reply.isLiked
			reply.likes = Math.max(0, reply.likes + (reply.isLiked ? 1 : -1))
		},

		// 回复某条评论
		replyToComment(comment, reply) {
			const target = reply || comment
			this.replyingTo = target
			this.commentPlaceholder = `回复 @${target.user.name}`
			this.focusCommentInput()
		},

		// 加载更多二级回复（按需接分页接口）
		loadMoreReplies(comment) {
			console.log('加载更多回复 commentId = ', comment.id)
			uni.showToast({ title: '加载更多回复开发中', icon: 'none' })
		},

		// 唤起输入框
		focusCommentInput() {
			this.showCommentInput = true
			this.commentInputFocus = true
		},

		// 输入框失焦
		handleInputBlur() {
			setTimeout(() => {
				if (!this.commentText.trim()) {
					this.showCommentInput = false
				}
				this.commentInputFocus = false
			}, 200)
		},

		// 发送评论（按需接后端创建评论接口）
		async sendComment() {
			const text = this.commentText.trim()
			if (!text) return

			try {
				// TODO: 调用自己的创建评论接口
				// await createComment({ creationId: this.creationId, content: text, ... })

				uni.showToast({ title: '发送成功', icon: 'success' })
				this.commentText = ''
				this.commentPlaceholder = '说点什么...'
				this.replyingTo = null
				this.showCommentInput = false

				// 重新加载评论，保持和后端一致
				this.fetchCommentsAndStats()
			} catch (e) {
				console.error('发送评论失败', e)
				uni.showToast({ title: '发送失败', icon: 'none' })
			}
		},

		// 分享
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
.container {
	min-height: 100vh;
	background: #fff;
	padding-bottom: env(safe-area-inset-bottom);
}

/* 顶部作者信息 */
.top-bar {
	position: sticky;
	top: 0;
	display: flex;
	align-items: center;
	padding: 12px 16px;
	background: #fff;
	border-bottom: 1px solid #f0f0f0;
	z-index: 100;
	gap: 12px;
}

.back-btn {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.back-icon {
	font-size: 24px;
	color: #333;
	font-weight: 500;
}

.author-info {
	display: flex;
	align-items: center;
	gap: 10px;
	flex: 1;
}

.author-avatar {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	border: 2px solid #fff;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.author-details {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.author-name {
	font-size: 15px;
	font-weight: 600;
	color: #333;
}

.author-desc {
	font-size: 12px;
	color: #999;
}

.follow-btn {
	padding: 6px 16px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border-radius: 20px;
	font-size: 13px;
	font-weight: 500;
	flex-shrink: 0;
}

.follow-btn.followed {
	background: #f0f0f0;
	color: #666;
}

/* 图片展示 */
.image-swiper {
	width: 100%;
	height: 500px;
	background: #000;
}

.creation-image {
	width: 100%;
	height: 100%;
}

/* 内容区域 */
.content-section {
	padding: 20px 16px;
}

.title-row {
	margin-bottom: 12px;
}

.creation-title {
	font-size: 18px;
	font-weight: 600;
	color: #333;
	line-height: 1.4;
}

.detail-text {
	font-size: 15px;
	color: #666;
	line-height: 1.6;
	max-height: 72px;
	overflow: hidden;
	margin-bottom: 8px;
}

.detail-text.expanded {
	max-height: none;
}

.expand-btn {
	font-size: 14px;
	color: #5b7dff;
	margin-bottom: 12px;
	display: inline-block;
}

.tags-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 16px 0;
}

.tag-item {
	font-size: 14px;
	color: #5b7dff;
}

.meta-info {
	display: flex;
	align-items: center;
	gap: 16px;
	padding-top: 12px;
	border-top: 1px solid #f0f0f0;
}

.meta-time {
	font-size: 13px;
	color: #999;
}

.meta-location {
	font-size: 13px;
	color: #999;
}

/* 评论区域 */
.comments-section {
	padding: 0 16px 100px;
	background: #fafafa;
}

.comments-header {
	padding: 16px 0;
	border-bottom: 1px solid #f0f0f0;
}

.comments-title {
	font-size: 16px;
	font-weight: 600;
	color: #333;
}

.comment-list {
	background: #fff;
}

.empty-comments {
	padding: 60px 0;
	text-align: center;
	color: #999;
	font-size: 14px;
}

/* 一级评论 */
.comment-item {
	display: flex;
	gap: 12px;
	padding: 16px 0;
	border-bottom: 1px solid #f5f5f5;
}

.comment-avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	flex-shrink: 0;
}

.comment-content-wrapper {
	flex: 1;
}

.comment-header-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 6px;
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
	margin-bottom: 6px;
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

/* 二级评论 */
.reply-list {
	margin-top: 12px;
	padding-left: 12px;
	border-left: 2px solid #f0f0f0;
}

.reply-item {
	display: flex;
	gap: 10px;
	padding: 12px 0;
}

.reply-avatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
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
	padding: 8px 0;
	display: block;
}

/* 底部操作栏 */
.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	display: flex;
	align-items: center;
	padding: 12px 16px;
	padding-bottom: calc(12px + env(safe-area-inset-bottom));
	background: #fff;
	border-top: 1px solid #f0f0f0;
	z-index: 99;
}

.comment-input-wrapper {
	flex: 1;
	height: 36px;
	background: #f5f5f5;
	border-radius: 18px;
	display: flex;
	align-items: center;
	padding: 0 16px;
	margin-right: 12px;
}

.comment-placeholder {
	font-size: 14px;
	color: #999;
}

.action-group {
	display: flex;
	align-items: center;
	gap: 20px;
}

.action-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
}

.action-icon {
	font-size: 22px;
	color: #666;
}

.action-icon.liked {
	color: #ff4757;
}

.action-count {
	font-size: 11px;
	color: #999;
}

/* 评论输入框 */
.comment-input-bar {
	position: fixed;
	bottom: -100px;
	left: 0;
	right: 0;
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	padding-bottom: calc(12px + env(safe-area-inset-bottom));
	border-top: 1px solid #f0f0f0;
	background: #fff;
	z-index: 100;
	transition: bottom 0.3s;
}

.comment-input-bar.show {
	bottom: 0;
}

.comment-input {
	flex: 1;
	height: 36px;
	background: #f5f5f5;
	border-radius: 18px;
	padding: 0 16px;
	font-size: 14px;
}

.send-btn {
	padding: 8px 20px;
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
