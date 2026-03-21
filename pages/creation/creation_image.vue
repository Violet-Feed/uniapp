<template>
  <view class="container image-mode">
    <!-- 顶部作者信息 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">←</text>
      </view>
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
      <!-- 自己的作品不显示关注按钮 -->
      <view
        class="follow-btn"
        v-if="!isSelfAuthor"
        :class="{ followed: isFollowed }"
        @click.stop="toggleFollow"
      >
        <text>{{ isFollowed ? '已关注' : '+ 关注' }}</text>
      </view>
    </view>

    <!-- 图片展示区域 -->
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

      <!-- category 灰色圆角矩形 -->
      <view class="category-row" v-if="categoryLabel">
        <text class="category-text"># {{ categoryLabel }}</text>
      </view>

      <view class="tags-row" v-if="creation.tags.length">
        <text class="tag-item" v-for="(tag, index) in creation.tags" :key="index">
          # {{ tag }}
        </text>
      </view>

      <view class="meta-info">
        <text class="meta-time">{{ formatRelativeTime(creation.time) }}</text>
        <text class="meta-location" v-if="creation.location">📍 {{ creation.location }}</text>
      </view>
    </view>

    <!-- 评论区域 -->
    <view class="comments-section" id="commentsSection">
      <view class="comments-header">
        <text class="comments-title">评论 {{ formatNumber(creation.comments) }}</text>
        <view class="comments-sort" @click="toggleCommentSort">
          <text class="sort-label">
            {{ commentSortType === 'time' ? '按时间' : '按热度' }}
          </text>
        </view>
      </view>

      <view class="comment-list">
        <!-- 一级评论 -->
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

            <view class="comment-main-text">
              <text class="comment-text">{{ comment.text }}</text>
            </view>

            <view class="comment-meta-row">
              <text class="comment-time">{{ formatRelativeTime(comment.time) }}</text>
              <text class="comment-reply-btn" @click="replyToComment(comment, comment)">回复</text>
            </view>

            <!-- 一级评论下方：展开 X 条回复 -->
            <view
              v-if="comment.replyCount && !comment.showReplies"
              class="comment-replies-toggle"
              @click="toggleReplies(comment)"
            >
              <text class="comment-replies-toggle-text">
                展开{{ comment.replyCount }}条回复
              </text>
            </view>

            <!-- 二级回复列表 -->
            <view v-if="comment.showReplies" class="reply-list">
              <view class="reply-item" v-for="reply in comment.replies" :key="reply.id">
                <image
                  class="reply-avatar"
                  :src="reply.user.avatar || '/static/user_avatar.png'"
                  mode="aspectFill"
                  @click="goToUserPage(reply.user.user_id)"
                ></image>

                <view class="reply-content-wrapper">
                  <view class="reply-header-row">
                    <view class="reply-name-line">
                      <text
                        class="reply-username"
                        @click="goToUserPage(reply.user.user_id)"
                      >
                        {{ reply.user.name }}
                      </text>

                      <!-- 仅二级回复展示 @sib_username，放在用户名右侧，可点击 -->
                      <text
                        v-if="reply.replyToUser && reply.replyToUserId"
                        class="reply-at"
                        @click.stop="goToUserPage(reply.replyToUserId)"
                      >
                        回复 @{{ reply.replyToUser }}
                      </text>
                    </view>

                    <view
                      class="comment-like-btn"
                      :class="{ liked: reply.isLiked }"
                      @click="toggleCommentLike(reply)"
                    >
                      <text class="comment-like-icon">{{ reply.isLiked ? '♥️' : '♡' }}</text>
                      <text class="comment-like-count">{{ formatNumber(reply.likes) }}</text>
                    </view>
                  </view>

                  <view class="comment-main-text">
                    <text class="comment-text">{{ reply.text }}</text>
                  </view>

                  <view class="comment-meta-row">
                    <text class="comment-time">{{ formatRelativeTime(reply.time) }}</text>
                    <text class="comment-reply-btn" @click="replyToComment(reply, comment)">
                      回复
                    </text>
                  </view>
                </view>
              </view>

              <!-- 展开更多 / 收起：与“展开 X 条回复”同一左边界，横向排布 -->
              <view class="reply-footer">
                <text
                  v-if="comment.replyHasMore && !comment.replyLoading"
                  @click="loadMoreReplies(comment)"
                >
                  展开更多回复
                </text>
                <text v-if="comment.replyLoading" class="reply-footer-loading">
                  回复加载中...
                </text>
                <text class="reply-footer-collapse" @click="toggleReplies(comment)">
                  收起
                </text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="!commentList.length && !commentLoading" class="empty-comments">
          <text>还没有评论，快来抢沙发吧~</text>
        </view>

        <view v-if="commentLoading && !commentList.length" class="empty-comments">
          <text>评论加载中...</text>
        </view>

        <view
          v-if="commentLoading && commentList.length"
          class="loading-comments"
        >
          <text>评论加载中...</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏：抽屉打开时隐藏 -->
    <view class="bottom-bar" v-if="!showCommentInput">
      <view class="comment-input-wrapper" @click="startNewComment">
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

    <!-- 评论输入框抽屉 -->
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
import {
  digg,
  cancelDigg,
  createComment,
  createReply,
  getCommentList,
  getCommentCount,
  diggComment,
  cancelDiggComment,
  getReplyList,
  follow,
  unfollow
} from '@/request/action.js'

export default {
  data() {
    return {
      creationId: '',
      authorId: '',
      currentUserId: null,

      creation: {
        creationId: '',
        userId: '',
        type: 'image',
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

      // 评论相关
      commentList: [],
      commentLoading: false,
      // 默认按热度排序
      commentSortType: 'digg',
      commentPage: 1,
      commentHasMore: true,

      showCommentInput: false,
      commentText: '',
      commentPlaceholder: '说点什么...',
      commentInputFocus: false,
      // replyingTo: { parentId, displayName, isReplyToReply, sibId, sibUserId }
      replyingTo: null,

      likeLoading: false
    }
  },

  computed: {
    // category -> 中文标签
    categoryLabel() {
      const map = {
        life: '生活',
        society: '社会',
        tech: '科技',
        entertainment: '娱乐'
      }
      return map[this.creation.category] || ''
    },
    // 是否作者本人
    isSelfAuthor() {
      if (!this.currentUserId || !this.creation.author.user_id) return false
      return String(this.currentUserId) === String(this.creation.author.user_id)
    }
  },

  onLoad(options) {
    this.creationId = options.creationId
    this.authorId = options.userId
    const app = getApp()
    this.currentUserId = app && app.globalData ? app.globalData.userId : null
    this.initPage()
  },

  onReachBottom() {
    this.fetchComments(false)
  },

  methods: {
    async initPage() {
      uni.showLoading({ title: '加载中...' })
      const ok1 = await this.fetchCreationDetail()
      const ok2 = await this.fetchAuthorInfo()
      const ok3 = await this.fetchCommentCount()
      const ok4 = await this.fetchComments(true)
      if (!ok1 || !ok3 || !ok4) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
      uni.hideLoading()
    },

    async fetchCreationDetail() {
      const res = await getCreationById(this.creationId)
      if (!res || !res.creation) return false

      const materialType = res.creation.material_type
      const isVideo = materialType === 2

      this.creation.creationId = res.creation.creation_id || this.creationId
      this.creation.userId = res.creation.user_id || this.authorId
      this.creation.type = isVideo ? 'video' : 'image'
      this.creation.title = res.creation.title || ''
      this.creation.detail = res.creation.content || ''
      this.creation.category = res.creation.category || ''
      this.creation.time = res.creation.create_time || ''

      const cover = res.creation.material_url || res.creation.cover_url || ''
      this.creation.coverImage = cover
      this.creation.images = cover ? [cover] : []

      this.creation.likes = res.creation.digg_count || 0
      this.creation.comments = res.creation.comment_count || 0
      this.creation.shares = res.creation.share_count || 0
      this.isLiked = !!res.creation.is_digg
      return true
    },

    async fetchAuthorInfo() {
      const targetUserId = this.authorId || this.creation.userId
      if (!targetUserId) return false

      const res = await getUserProfile(targetUserId, true, false)
      if (!res || !res.user_info) return false

      const info = res.user_info || {}
      this.creation.author = {
        user_id: info.user_id || targetUserId,
        username: info.username || info.nickname || '',
        avatar: info.avatar || '/static/user_avatar.png',
        followerCount: res.follower_count || 0
      }
      this.isFollowed = !!res.is_following
      return true
    },

    async fetchCommentCount() {
      if (!this.creationId) return false
      const payload = {
        entityType: 'creation',
        entityId: BigInt(this.creationId)
      }
      const res = await getCommentCount(payload)
      if (!res || typeof res.comment_count !== 'number') return false
      this.creation.comments = res.comment_count
      return true
    },

    async fetchComments(reset = false) {
      if (this.commentLoading) return false
      if (!reset && !this.commentHasMore) return false
      if (!this.creationId) return false

      this.commentLoading = true
      const pageToLoad = reset ? 1 : this.commentPage + 1

      const payload = {
        entityType: 'creation',
        entityId: BigInt(this.creationId),
        page: pageToLoad,
        sortType: this.commentSortType // 'time' | 'digg'
      }

      const res = await getCommentList(payload)
      if (!res) {
        uni.showToast({ title: '评论加载失败', icon: 'none' })
        this.commentLoading = false
        return false
      }

      const list = res.comments || []
      const mapped = list.map((c) => ({
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
        replyToUser: c.sib_username || '',
        replyToUserId: c.sib_user_id || null,
        replyCount: c.reply_count || 0,

        showReplies: false,
        replies: [],
        replyPage: 0,
        replyHasMore: (c.reply_count || 0) > 0,
        replyLoading: false,
        _loading: false
      }))

      if (reset) {
        this.commentList = mapped
        this.commentPage = 1
      } else {
        this.commentList = this.commentList.concat(mapped)
        this.commentPage = pageToLoad
      }

      const pageSize = 10
      this.commentHasMore = list.length >= pageSize
      this.commentLoading = false
      return true
    },

    toggleCommentSort() {
      this.commentSortType = this.commentSortType === 'time' ? 'digg' : 'time'
      this.commentPage = 1
      this.commentHasMore = true
      this.fetchComments(true)
    },

    async toggleReplies(comment) {
      if (!comment) return
      if (!comment.showReplies) {
        comment.showReplies = true
        if (!comment.replies.length && comment.replyCount) {
          await this.loadReplies(comment, true)
        }
      } else {
        comment.showReplies = false
      }
    },

    async loadReplies(comment, reset = false) {
      if (!comment) return
      if (comment.replyLoading) return
      if (!reset && !comment.replyHasMore) return
      if (!this.creationId) return

      comment.replyLoading = true
      const pageToLoad = reset ? 1 : (comment.replyPage || 0) + 1

      const payload = {
        entityType: 'creation',
        entityId: BigInt(this.creationId),
        commentId: BigInt(comment.id),
        page: pageToLoad
      }

      const res = await getReplyList(payload)
      if (!res) {
        uni.showToast({ title: '回复加载失败', icon: 'none' })
        comment.replyLoading = false
        return
      }

      const list = res.replies || res.comments || []
      const mapped = list.map((r) => ({
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
        replyToUser: r.sib_username || '',
        replyToUserId: r.sib_user_id || null,
        replyCount: 0,
        showReplies: false,
        replies: [],
        replyPage: 0,
        replyHasMore: false,
        replyLoading: false,
        _loading: false
      }))

      if (reset || !comment.replies.length) {
        comment.replies = mapped
        comment.replyPage = 1
      } else {
        comment.replies = comment.replies.concat(mapped)
        comment.replyPage = pageToLoad
      }

      const pageSize = 10
      comment.replyHasMore = list.length >= pageSize
      comment.replyLoading = false
    },

    loadMoreReplies(comment) {
      this.loadReplies(comment, false)
    },

    goBack() {
      uni.navigateBack()
    },

    goToUserPage(userId) {
      const targetId = userId || this.creation.author.user_id
      if (!targetId) return
	  const currentUserId = getApp().globalData.userId;
	  if (String(targetId) === String(currentUserId)) {
	  	uni.navigateTo({
	  		url: '/pages/user/my_profile_copy'
	  	});
	  	return;
	  }
      uni.navigateTo({
        url: `/pages/user/user_profile?userId=${targetId}`
      })
    },

    scrollToComments() {
      uni.pageScrollTo({
        selector: '#commentsSection',
        duration: 300
      })
    },

    async toggleLike() {
      if (this.likeLoading || !this.creation.creationId) return
      this.likeLoading = true

      let ok = false
      if (this.isLiked) {
        ok = await cancelDigg('creation', this.creation.creationId)
        if (ok) {
          this.isLiked = false
          this.creation.likes = Math.max(0, this.creation.likes - 1)
        }
      } else {
        ok = await digg('creation', this.creation.creationId)
        if (ok) {
          this.isLiked = true
          this.creation.likes += 1
        }
      }

      if (!ok) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
      this.likeLoading = false
    },

    async toggleFollow() {
      const currentUserId = this.currentUserId
      const targetUserId = this.creation.author.user_id
      if (!currentUserId || !targetUserId) return

      let ok = false
      if (this.isFollowed) {
        ok = await unfollow(currentUserId, targetUserId)
        if (ok) {
          this.isFollowed = false
          if (this.creation.author.followerCount > 0) {
            this.creation.author.followerCount -= 1
          }
        }
      } else {
        ok = await follow(currentUserId, targetUserId)
        if (ok) {
          this.isFollowed = true
          this.creation.author.followerCount += 1
        }
      }

      if (!ok) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      } else {
        uni.showToast({
          title: this.isFollowed ? '关注成功' : '取消关注',
          icon: 'none'
        })
      }
    },

    toggleDetail() {
      this.isDetailExpanded = !this.isDetailExpanded
    },

    async toggleCommentLike(comment) {
      if (!comment || comment._loading) return
      comment._loading = true

      const payload = {
        commentId: BigInt(comment.id)
      }

      let ok = false
      if (comment.isLiked) {
        ok = await cancelDiggComment(payload)
        if (ok) {
          comment.isLiked = false
          comment.likes = Math.max(0, comment.likes - 1)
        }
      } else {
        ok = await diggComment(payload)
        if (ok) {
          comment.isLiked = true
          comment.likes += 1
        }
      }

      if (!ok) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
      comment._loading = false
    },

    // parentComment 是一级评论，targetComment 可能是一级也可能是二级
    replyToComment(targetComment, parentComment) {
      if (!targetComment) return
      const parent = parentComment || targetComment

      const isReplyToReply = parent.id !== targetComment.id

      // 对一级评论的回复：sibId / sibUserId 设为 0
      this.replyingTo = {
        parentId: parent.id,
        displayName: targetComment.user.name || '',
        isReplyToReply,
        sibId: isReplyToReply ? targetComment.id : 0,
        sibUserId: isReplyToReply ? (targetComment.user.user_id || 0) : 0
      }

      this.commentPlaceholder = this.replyingTo.displayName
        ? `回复 @${this.replyingTo.displayName}`
        : '回复'
      this.focusCommentInput()
    },

    startNewComment() {
      this.replyingTo = null
      this.commentPlaceholder = '说点什么...'
      this.focusCommentInput()
    },

    focusCommentInput() {
      this.showCommentInput = true
      this.commentInputFocus = true
    },

    handleInputBlur() {
      setTimeout(() => {
        if (!this.commentText.trim()) {
          this.showCommentInput = false
        }
        this.commentInputFocus = false
      }, 200)
    },

    async sendComment() {
      const text = this.commentText.trim()
      if (!text) return

      const app = getApp()
      const currentUserId =
        this.currentUserId ||
        (app && app.globalData ? app.globalData.userId : null)
      const currentUserName =
        (app &&
          app.globalData &&
          (app.globalData.username || app.globalData.nickname)) ||
        ''
      const currentAvatar =
        (app && app.globalData && app.globalData.avatar) ||
        '/static/user_avatar.png'

      let res

      if (this.replyingTo) {
        // 回复
        const payload = {
          parentId: BigInt(this.replyingTo.parentId),
          entityType: 'creation',
          entityId: BigInt(this.creationId),
          contentType: 1,
          content: text,
          // 对一级评论的回复 sibId / sibUserId 为 0
          sibId: BigInt(this.replyingTo.sibId || 0),
          sibUserId: BigInt(this.replyingTo.sibUserId || 0)
        }
        res = await createReply(payload)
      } else {
        // 一级评论
        const payload = {
          entityType: 'creation',
          entityId: BigInt(this.creationId),
          contentType: 1,
          content: text
        }
        res = await createComment(payload)
      }

      if (!res || !res.comment_id) {
        uni.showToast({ title: '发送失败', icon: 'none' })
        return
      }

      const newId = res.comment_id

      if (this.replyingTo) {
        // 本地补一条二级回复
        const parentIndex = this.commentList.findIndex(
          (c) => String(c.id) === String(this.replyingTo.parentId)
        )
        if (parentIndex !== -1) {
          const parent = this.commentList[parentIndex]
          const isReplyToReply = !!this.replyingTo.isReplyToReply

          const replyComment = {
            id: newId,
            user: {
              user_id: currentUserId,
              name: currentUserName,
              avatar: currentAvatar
            },
            text,
            time: Date.now(),
            likes: 0,
            isLiked: false,
            // 仅二级回复展示 @sib_username
            replyToUser: isReplyToReply ? (this.replyingTo.displayName || '') : '',
            replyToUserId: isReplyToReply ? (this.replyingTo.sibUserId || null) : null,
            replyCount: 0,
            showReplies: false,
            replies: [],
            replyPage: 0,
            replyHasMore: false,
            replyLoading: false,
            _loading: false
          }

          if (!Array.isArray(parent.replies)) {
            parent.replies = []
          }
          parent.replies.push(replyComment)
          parent.replyCount += 1
          parent.showReplies = true
        }
      } else {
        // 本地补一条一级评论
        const newComment = {
          id: newId,
          user: {
            user_id: currentUserId,
            name: currentUserName,
            avatar: currentAvatar
          },
          text,
          time: Date.now(),
          likes: 0,
          isLiked: false,
          replyToUser: '',
          replyToUserId: null,
          replyCount: 0,
          showReplies: false,
          replies: [],
          replyPage: 0,
          replyHasMore: false,
          replyLoading: false,
          _loading: false
        }
        this.commentList.unshift(newComment)
      }

      this.creation.comments += 1

      uni.showToast({ title: '发送成功', icon: 'success' })
      this.commentText = ''
      this.commentPlaceholder = '说点什么...'
      this.replyingTo = null
      this.showCommentInput = false
      this.commentInputFocus = false
    },

    handleShare() {
      uni.showToast({ title: '分享功能开发中', icon: 'none' })
    },

    formatNumber(num) {
      if (!num) return 0
      if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
      return num
    },

    formatRelativeTime(msTimestamp) {
      if (!msTimestamp) return ''
      if (msTimestamp < 1e12) {
        msTimestamp = msTimestamp * 1000
      }

      const now = new Date()
      const target = new Date(msTimestamp)
      const nowMs = now.getTime()
      const diffMs = nowMs - msTimestamp
      const diffSec = Math.floor(diffMs / 1000)

      if (diffSec < 60) {
        return '刚刚'
      }
      if (diffSec < 3600) {
        const m = Math.floor(diffSec / 60)
        return `${m}分钟前`
      }

      const oneDayMs = 24 * 60 * 60 * 1000
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime()

      const pad2 = (n) => (n < 10 ? '0' + n : '' + n)
      const hhmm = `${pad2(target.getHours())}:${pad2(target.getMinutes())}`

      if (msTimestamp >= todayStart) {
        return `今天 ${hhmm}`
      }
      if (msTimestamp >= todayStart - oneDayMs) {
        return `昨天 ${hhmm}`
      }

      const diffDay = Math.floor(diffMs / oneDayMs)
      if (diffDay < 7) {
        return `${diffDay}天前`
      }

      const year = target.getFullYear()
      const month = target.getMonth() + 1
      const day = target.getDate()

      if (year !== now.getFullYear()) {
        return `${year}年${month}月${day}日`
      }
      return `${month}月${day}日`
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
  margin-bottom: 8px;
  display: inline-block;
}

/* category 灰色圆角矩形 */
.category-row {
  margin-bottom: 8px;
}

.category-text {
  display: inline-block;
  padding: 4px 10px;
  font-size: 13px;
  color: #666;
  background: #f5f5f5;
  border-radius: 999px;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0 16px;
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
  padding: 0 16px 64px;
  background: #fafafa;
}

.comments-header {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comments-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.comments-sort {
  padding: 4px 10px;
  border-radius: 12px;
  background: #f5f5f5;
}

.sort-label {
  font-size: 12px;
  color: #666;
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

.loading-comments {
  padding: 10px 0 14px;
  text-align: center;
  font-size: 13px;
  color: #999;
}

/* 一级评论 */
.comment-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
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

.comment-main-text {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-bottom: 4px;
}

.comment-text {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
}

.comment-meta-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 2px;
}

.comment-time {
  font-size: 12px;
  color: #999;
}

.comment-reply-btn {
  font-size: 13px;
  color: #666;
}

/* 展开 X 条回复 */
.comment-replies-toggle {
  margin-top: 4px;
}

.comment-replies-toggle-text {
  font-size: 12px;
  color: #666;
}

/* 二级回复列表 */
.reply-list {
  margin-top: 6px;
}

.reply-item {
  display: flex;
  gap: 8px;
  padding: 6px 0;
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
  justify-content: space-between;
  margin-bottom: 2px;
}

.reply-name-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.reply-username {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

/* @sib_username 样式 */
.reply-at {
  margin-left: 6px;
  font-size: 12px;
  color: #666;
}

/* 展开更多 / 收起 在同一行 */
.reply-footer {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #666;
  margin: 2px 0 4px;
}

.reply-footer-loading {
  margin-left: 8px;
  font-size: 12px;
  color: #999;
}

.reply-footer-collapse {
  margin-left: 12px;
  font-size: 12px;
  color: #666;
}

/* 底部操作栏 & 抽屉：统一高度 */
.bottom-bar,
.comment-input-bar {
  position: fixed;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  min-height: 52px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  z-index: 99;
}

/* 底部操作栏具体布局 */
.bottom-bar {
  bottom: 0;
  justify-content: space-between;
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

/* 评论输入框抽屉 */
.comment-input-bar {
  bottom: -100px;
  justify-content: flex-start;
  gap: 12px;
  transition: bottom 0.3s;
  z-index: 100;
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
  padding: 6px 16px;
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
