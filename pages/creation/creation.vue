<template>
	<view class="container" :class="{ 'video-mode': isVideoType }">
		<!-- 图片类型：小红书风格 -->
		<view v-if="!isVideoType" class="image-mode">
			<!-- 顶部作者信息 -->
			<view class="top-bar">
				<view class="back-btn" @click="goBack">
					<text class="back-icon">←</text>
				</view>
				<view class="author-info" @click="goToUserPage(creation.author)">
					<image class="author-avatar" :src="creation.author?.avatar" mode="aspectFill"></image>
					<view class="author-details">
						<text class="author-name">{{ creation.author?.name }}</text>
						<text class="author-desc">{{ creation.author?.followers || 0 }} 粉丝</text>
					</view>
				</view>
				<view class="follow-btn" :class="{ followed: isFollowed }" @click.stop="toggleFollow">
					<text>{{ isFollowed ? '已关注' : '+ 关注' }}</text>
				</view>
			</view>

			<!-- 图片展示区域 -->
			<swiper class="image-swiper" :indicator-dots="creation.images?.length > 1" indicator-color="rgba(255,255,255,0.5)" indicator-active-color="#fff">
				<swiper-item v-for="(image, index) in creation.images" :key="index">
					<image class="creation-image" :src="image" mode="aspectFill"></image>
				</swiper-item>
			</swiper>

			<!-- 内容区域 -->
			<view class="content-section">
				<view class="title-row">
					<text class="creation-title">{{ creation.title }}</text>
				</view>
				<view class="detail-text" :class="{ expanded: isDetailExpanded }">
					<text>{{ creation.detail }}</text>
				</view>
				<text v-if="creation.detail?.length > 100" class="expand-btn" @click="toggleDetail">
					{{ isDetailExpanded ? '收起' : '展开' }}
				</text>
				
				<view class="tags-row">
					<text class="tag-item" v-for="(tag, index) in creation.tags" :key="index"># {{ tag }}</text>
				</view>
				
				<view class="meta-info">
					<text class="meta-time">{{ creation.time }}</text>
					<text class="meta-location" v-if="creation.location">📍 {{ creation.location }}</text>
				</view>
			</view>

			<!-- 评论区域 -->
			<view class="comments-section" id="commentsSection">
				<view class="comments-header">
					<text class="comments-title">评论 {{ creation.comments }}</text>
				</view>

				<!-- 评论列表 -->
				<view class="comment-list">
					<view class="comment-item" v-for="comment in commentList" :key="comment.id">
						<image class="comment-avatar" :src="comment.user.avatar" mode="aspectFill" @click="goToUserPage(comment.user)"></image>
						<view class="comment-content-wrapper">
							<view class="comment-header-row">
								<text class="comment-username" @click="goToUserPage(comment.user)">{{ comment.user.name }}</text>
								<view class="comment-like-btn" :class="{ liked: comment.isLiked }" @click="toggleCommentLike(comment)">
									<text class="comment-like-icon">{{ comment.isLiked ? '♥' : '♡' }}</text>
									<text class="comment-like-count">{{ comment.likes }}</text>
								</view>
							</view>
							<text class="comment-text">{{ comment.text }}</text>
							<view class="comment-meta-row">
								<text class="comment-time">{{ comment.time }}</text>
								<text class="comment-reply-btn" @click="replyToComment(comment)">回复</text>
							</view>

							<!-- 二级评论 -->
							<view v-if="comment.replies?.length > 0" class="reply-list">
								<view class="reply-item" v-for="reply in comment.replies" :key="reply.id">
									<image class="reply-avatar" :src="reply.user.avatar" mode="aspectFill" @click="goToUserPage(reply.user)"></image>
									<view class="reply-content-wrapper">
										<view class="reply-header-row">
											<text class="reply-username" @click="goToUserPage(reply.user)">{{ reply.user.name }}</text>
											<text class="reply-to" v-if="reply.replyToUser">回复 @{{ reply.replyToUser }}</text>
											<view class="reply-like-btn" :class="{ liked: reply.isLiked }" @click="toggleReplyLike(reply)">
												<text class="reply-like-icon">{{ reply.isLiked ? '♥' : '♡' }}</text>
												<text class="reply-like-count">{{ reply.likes }}</text>
											</view>
										</view>
										<text class="reply-text">{{ reply.text }}</text>
										<view class="reply-meta-row">
											<text class="reply-time">{{ reply.time }}</text>
											<text class="reply-reply-btn" @click="replyToComment(comment, reply)">回复</text>
										</view>
									</view>
								</view>
								
								<text v-if="comment.totalReplies > comment.replies.length" class="view-more-replies" @click="loadMoreReplies(comment)">
									查看更多 {{ comment.totalReplies - comment.replies.length }} 条回复
								</text>
							</view>
						</view>
					</view>

					<view v-if="commentList.length === 0" class="empty-comments">
						<text>还没有评论，快来抢沙发吧~</text>
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
						<text class="action-icon" :class="{ liked: isLiked }">{{ isLiked ? '♥' : '♡' }}</text>
						<text class="action-count">{{ creation.likes }}</text>
					</view>
					<view class="action-item" @click="scrollToComments">
						<text class="action-icon">💬</text>
						<text class="action-count">{{ creation.comments }}</text>
					</view>
					<view class="action-item" @click="handleShare">
						<text class="action-icon">↗</text>
						<text class="action-count">{{ creation.shares }}</text>
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

		<!-- 视频类型：抖音风格 -->
		<view v-else class="video-mode-container">
			<!-- 视频播放器 -->
			<video 
				class="video-player" 
				:src="creation.videoUrl" 
				:poster="creation.coverImage"
				:controls="false"
				:show-center-play-btn="false"
				:enable-progress-gesture="false"
				:autoplay="true"
				:loop="true"
				objectFit="cover"
			></video>

			<!-- 右侧操作栏 -->
			<view class="video-right-actions">
				<view class="video-action-item" @click="goToUserPage(creation.author)">
					<image class="video-author-avatar" :src="creation.author?.avatar" mode="aspectFill"></image>
					<view v-if="!isFollowed" class="follow-icon">+</view>
				</view>
				
				<view class="video-action-item" @click="toggleLike">
					<text class="video-action-icon" :class="{ liked: isLiked }">{{ isLiked ? '♥' : '♡' }}</text>
					<text class="video-action-count">{{ creation.likes }}</text>
				</view>
				
				<view class="video-action-item" @click="scrollToComments">
					<text class="video-action-icon">💬</text>
					<text class="video-action-count">{{ creation.comments }}</text>
				</view>
				
				<view class="video-action-item" @click="handleShare">
					<text class="video-action-icon">↗</text>
					<text class="video-action-count">{{ creation.shares }}</text>
				</view>
			</view>

			<!-- 底部信息区域 -->
			<view class="video-bottom-info">
				<view class="video-author-row" @click="goToUserPage(creation.author)">
					<text class="video-author-name">@{{ creation.author?.name }}</text>
					<view class="video-follow-btn" :class="{ followed: isFollowed }" @click.stop="toggleFollow">
						<text>{{ isFollowed ? '已关注' : '关注' }}</text>
					</view>
				</view>
				
				<view class="video-title-row">
					<text class="video-title">{{ creation.title }}</text>
				</view>
				
				<view class="video-detail" :class="{ expanded: isDetailExpanded }">
					<text>{{ creation.detail }}</text>
				</view>
				<text v-if="creation.detail?.length > 50" class="video-expand-btn" @click="toggleDetail">
					{{ isDetailExpanded ? '收起' : '...展开' }}
				</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			creationId: null,
			creation: {
				type: 'image', // 'image' 或 'video'
				title: '',
				detail: '',
				images: [],
				videoUrl: '',
				coverImage: '',
				tags: [],
				time: '',
				location: '',
				author: {
					user_id: '',
					name: '',
					avatar: '',
					followers: 0
				},
				likes: 0,
				comments: 0,
				shares: 0
			},
			
			// 状态
			isLiked: false,
			isFollowed: false,
			isDetailExpanded: false,
			
			// 评论相关
			showCommentInput: false,
			commentText: '',
			commentPlaceholder: '说点什么...',
			commentInputFocus: false,
			commentList: [],
			replyingTo: null, // 当前回复的评论
		}
	},
	computed: {
		isVideoType() {
			return this.creation.type === 'video';
		}
	},
	onLoad(options) {
		this.creationId = options.id;
		this.loadCreationDetail();
	},
	methods: {
		// 返回上一页
		goBack() {
			uni.navigateBack();
		},

		// 跳转到用户个人页
		goToUserPage(user) {
			if (!user || !user.user_id) return;
			uni.navigateTo({
				url: `/pages/user/user_profile?userId=${user.user_id}`
			});
		},

		// 滚动到评论区
		scrollToComments() {
			uni.pageScrollTo({
				selector: '#commentsSection',
				duration: 300
			});
		},

		// 聚焦评论输入框
		focusCommentInput() {
			this.showCommentInput = true;
			this.commentInputFocus = true;
		},

		// 输入框失焦
		handleInputBlur() {
			setTimeout(() => {
				if (!this.commentText.trim()) {
					this.showCommentInput = false;
				}
				this.commentInputFocus = false;
			}, 200);
		},

		// 加载创作详情
		async loadCreationDetail() {
			uni.showLoading({ title: '加载中...' });
			try {
				// 模拟API请求
				await new Promise(resolve => setTimeout(resolve, 500));
				
				// 根据ID判断类型（这里简化处理，实际应该从后端获取）
				const isVideo = this.creationId.includes('video');
				
				this.creation = {
					type: isVideo ? 'video' : 'image',
					title: isVideo ? '今日份的日落超级美！' : '梦幻森林场景 AI生成作品分享',
					detail: isVideo 
						? '在海边拍到了超级美的日落，天空的颜色层次太丰富了，分享给大家！记得开声音听海浪的声音🌊 #日落#海边#治愈系' 
						: '使用AI生成的梦幻森林场景，花了好几个小时调参数才得到满意的效果。提示词：enchanted forest, magical atmosphere, soft lighting, fairy tale style, highly detailed, 8k resolution. 大家觉得怎么样？有什么建议可以评论区告诉我～',
					images: isVideo ? [] : [
						'https://picsum.photos/id/237/800/1200',
						'https://picsum.photos/id/238/800/1200',
					],
					videoUrl: isVideo ? 'https://www.w3schools.com/html/mov_bbb.mp4' : '',
					coverImage: isVideo ? 'https://picsum.photos/id/237/800/1200' : '',
					tags: isVideo ? ['日落', '海边', '治愈系'] : ['AI绘画', '森林', '奇幻', '教程'],
					time: '2小时前',
					location: isVideo ? '三亚' : '',
					author: {
						user_id: 'author-001',
						name: 'AI创作者小王',
						avatar: 'https://picsum.photos/id/64/200/200',
						followers: 12800
					},
					likes: 1234,
					comments: 89,
					shares: 56
				};
				
				// 加载评论
				this.loadComments();
			} catch (err) {
				uni.showToast({ title: '加载失败', icon: 'none' });
			} finally {
				uni.hideLoading();
			}
		},

		// 加载评论列表
		loadComments() {
			this.commentList = [
				{
					id: 'comment-1',
					user: {
						user_id: 'user-001',
						name: '小红',
						avatar: 'https://picsum.photos/id/91/200/200'
					},
					text: '哇，这个效果太棒了！能分享一下具体的参数吗？',
					time: '1小时前',
					likes: 23,
					isLiked: false,
					totalReplies: 2,
					replies: [
						{
							id: 'reply-1-1',
							user: {
								user_id: 'author-001',
								name: 'AI创作者小王',
								avatar: 'https://picsum.photos/id/64/200/200'
							},
							text: '谢谢支持！参数我放在详情里啦～',
							time: '50分钟前',
							likes: 5,
							isLiked: false,
							replyToUser: '小红'
						},
						{
							id: 'reply-1-2',
							user: {
								user_id: 'user-001',
								name: '小红',
								avatar: 'https://picsum.photos/id/91/200/200'
							},
							text: '好的谢谢！我试试看',
							time: '45分钟前',
							likes: 2,
							isLiked: false,
							replyToUser: 'AI创作者小王'
						}
					]
				},
				{
					id: 'comment-2',
					user: {
						user_id: 'user-002',
						name: '摄影爱好者',
						avatar: 'https://picsum.photos/id/92/200/200'
					},
					text: '画面质感真的很棒，色调也很舒服',
					time: '30分钟前',
					likes: 8,
					isLiked: false,
					totalReplies: 0,
					replies: []
				}
			];
		},

		// 切换点赞
		toggleLike() {
			this.isLiked = !this.isLiked;
			this.creation.likes += this.isLiked ? 1 : -1;
		},

		// 切换关注
		toggleFollow() {
			this.isFollowed = !this.isFollowed;
			uni.showToast({
				title: this.isFollowed ? '关注成功' : '取消关注',
				icon: 'none'
			});
		},

		// 展开/收起详情
		toggleDetail() {
			this.isDetailExpanded = !this.isDetailExpanded;
		},

		// 切换评论点赞
		toggleCommentLike(comment) {
			comment.isLiked = !comment.isLiked;
			comment.likes += comment.isLiked ? 1 : -1;
		},

		// 切换回复点赞
		toggleReplyLike(reply) {
			reply.isLiked = !reply.isLiked;
			reply.likes += reply.isLiked ? 1 : -1;
		},

		// 回复评论
		replyToComment(comment, reply) {
			this.replyingTo = reply || comment;
			this.commentPlaceholder = `回复 @${this.replyingTo.user.name}`;
			this.focusCommentInput();
		},

		// 加载更多回复
		loadMoreReplies(comment) {
			uni.showToast({ title: '加载更多回复', icon: 'none' });
		},

		// 发送评论
		sendComment() {
			if (!this.commentText.trim()) return;
			
			uni.showToast({ title: '发送成功', icon: 'success' });
			this.commentText = '';
			this.commentPlaceholder = '说点什么...';
			this.replyingTo = null;
			this.showCommentInput = false;
		},

		// 分享
		handleShare() {
			uni.showToast({ title: '分享功能开发中', icon: 'none' });
		}
	}
}
</script>

<style scoped>
/* ==================== 基础容器 ==================== */
.container {
	min-height: 100vh;
	background: #fff;
	padding-bottom: env(safe-area-inset-bottom);
}

/* ==================== 图片模式 ==================== */
.image-mode {
	display: flex;
	flex-direction: column;
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
	box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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

.comment-like-icon.liked {
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

.reply-like-icon.liked {
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

/* ==================== 视频模式 ==================== */
.video-mode-container {
	position: relative;
	width: 100%;
	height: 100vh;
	background: #000;
}

.video-player {
	width: 100%;
	height: 100%;
}

/* 右侧操作栏 */
.video-right-actions {
	position: absolute;
	right: 12px;
	bottom: 150px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 24px;
	z-index: 10;
}

.video-action-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	position: relative;
}

.video-author-avatar {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	border: 2px solid #fff;
}

.follow-icon {
	position: absolute;
	bottom: -6px;
	width: 20px;
	height: 20px;
	background: #ff4757;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-size: 16px;
	font-weight: 600;
}

.video-action-icon {
	font-size: 32px;
	color: #fff;
	text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.video-action-icon.liked {
	color: #ff4757;
}

.video-action-count {
	font-size: 12px;
	color: #fff;
	text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

/* 底部信息 */
.video-bottom-info {
	position: absolute;
	left: 0;
	right: 80px;
	bottom: 80px;
	padding: 0 16px;
	z-index: 10;
}

.video-author-row {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 12px;
}

.video-author-name {
	font-size: 15px;
	font-weight: 600;
	color: #fff;
	text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.video-follow-btn {
	padding: 4px 16px;
	background: rgba(255, 255, 255, 0.3);
	backdrop-filter: blur(10px);
	border: 1px solid rgba(255, 255, 255, 0.5);
	color: #fff;
	border-radius: 20px;
	font-size: 13px;
}

.video-follow-btn.followed {
	background: rgba(0, 0, 0, 0.3);
}

.video-title-row {
	margin-bottom: 8px;
}

.video-title {
	font-size: 15px;
	font-weight: 500;
	color: #fff;
	text-shadow: 0 1px 2px rgba(0,0,0,0.5);
	line-height: 1.4;
}

.video-detail {
	font-size: 14px;
	color: rgba(255, 255, 255, 0.9);
	text-shadow: 0 1px 2px rgba(0,0,0,0.5);
	line-height: 1.5;
	max-height: 42px;
	overflow: hidden;
}

.video-detail.expanded {
	max-height: none;
}

.video-expand-btn {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.8);
	margin-top: 4px;
}
</style>