<template>
  <view class="container image-mode">
    <!-- 顶部作者信息 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">
        <text class="iconfont icon-fanhui back-icon"></text>
      </view>

      <view class="author-info" @click="goToUserPage(creation.author.user_id)">
        <image
          class="author-avatar"
          :src="creation.author.avatar || '/static/user_avatar.png'"
          mode="aspectFill"
        ></image>
        <view class="author-details">
          <text class="author-name">{{ creation.author.username || '用户' }}</text>
          <text class="author-desc">{{ formatNumber(creation.author.followerCount) }} 粉丝</text>
        </view>
      </view>

      <view
        v-if="!isSelfAuthor"
        :class="isFollowed ? 'following-btn' : 'follow-btn'"
        @click.stop="toggleFollow"
      >
        <text class="btn-text">{{ isFollowed ? '已关注' : '+ 关注' }}</text>
      </view>
    </view>

    <!-- 页面内部滚动区域 -->
    <scroll-view
      class="page-scroll"
      scroll-y
      :scroll-top="contentScrollTop"
      :show-scrollbar="false"
      @scroll="onContentScroll"
      @scrolltolower="fetchComments(false)"
      @touchstart="onPageScrollTouchStart"
    >
      <!-- 创作展示区域 -->
      <view class="media-section">
        <video
          v-if="creation.type === 'video' && creation.coverImage"
          class="creation-video"
          :src="creation.coverImage"
          controls
          :show-center-play-btn="true"
          :enable-play-gesture="true"
          :show-fullscreen-btn="true"
          object-fit="contain"
        ></video>

        <swiper
          v-else-if="creation.images.length"
          class="image-swiper"
          :indicator-dots="creation.images.length > 1"
          indicator-color="rgba(0,0,0,0.18)"
          indicator-active-color="rgba(253,190,120,1)"
        >
          <swiper-item v-for="(image, index) in creation.images" :key="index">
            <image
              class="creation-image"
              :src="image"
              mode="aspectFit"
              @touchstart="onCreationImageTouchStart($event, index)"
              @touchmove="onCreationImageTouchMove"
              @touchend="onCreationImageTouchEnd"
              @touchcancel="onCreationImageTouchEnd"
              @click="openImagePreview(index)"
            ></image>
          </swiper-item>
        </swiper>

        <view v-else class="media-empty">
          <text class="iconfont icon-neirongchuangzuo media-empty-icon"></text>
          <text class="media-empty-text">素材不存在</text>
        </view>
      </view>

      <!-- 内容区域 -->
      <view class="content-section">
        <view class="title-row">
          <text class="creation-title">{{ creation.title || '无标题作品' }}</text>
        </view>

        <view class="detail-line" v-if="creation.detail || categoryLabel">
          <text class="detail-text" v-if="creation.detail">{{ creation.detail }}</text>
          <text class="category-text" v-if="categoryLabel"># {{ categoryLabel }}</text>
        </view>

        <view class="tags-row" v-if="creation.tags.length">
          <text class="tag-item" v-for="(tag, index) in creation.tags" :key="index">
            # {{ tag }}
          </text>
        </view>

        <view class="meta-info">
          <text class="meta-time">{{ formatRelativeTime(creation.time) }}</text>
          <text class="meta-location" v-if="creation.location">{{ creation.location }}</text>
        </view>
      </view>

      <view class="content-comment-divider"></view>

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
          <view
            class="comment-item"
            v-for="comment in commentList"
            :key="comment.id"
            @touchstart="onCommentTouchStart"
            @touchmove="onCommentTouchMove"
            @touchend="onCommentTouchEnd"
            @touchcancel="onCommentTouchEnd"
            @longpress.stop="showCommentAction(comment, null, 'comment')"
          >
            <image
              class="comment-avatar"
              :src="comment.user.avatar || '/static/user_avatar.png'"
              mode="aspectFill"
              @click="goToUserPage(comment.user.user_id)"
            ></image>

            <view class="comment-content-wrapper">
              <view class="comment-header-row">
                <view class="comment-name-line">
                  <text class="comment-username" @click="goToUserPage(comment.user.user_id)">
                    {{ comment.user.name }}
                  </text>
                  <text v-if="isAuthorComment(comment.user.user_id)" class="author-badge">
                    作者
                  </text>
                </view>

                <view
                  class="comment-like-btn"
                  :class="{ liked: comment.isLiked }"
                  @click="toggleCommentLike(comment)"
                >
                  <text
                    class="iconfont comment-like-icon"
                    :class="comment.isLiked ? 'icon-xihuan active' : 'icon-xihuan1'"
                  ></text>
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

              <view
                v-if="comment.replyCount && !comment.showReplies"
                class="comment-replies-toggle"
                @click="toggleReplies(comment)"
              >
                <text class="comment-replies-toggle-text">
                  展开{{ comment.replyCount }}条回复
                </text>
              </view>

              <view v-if="comment.showReplies" class="reply-list">
                <view
                  class="reply-item"
                  v-for="reply in comment.replies"
                  :key="reply.id"
                  @touchstart="onCommentTouchStart"
                  @touchmove="onCommentTouchMove"
                  @touchend="onCommentTouchEnd"
                  @touchcancel="onCommentTouchEnd"
                  @longpress.stop="showCommentAction(reply, comment, 'reply')"
                >
                  <image
                    class="reply-avatar"
                    :src="reply.user.avatar || '/static/user_avatar.png'"
                    mode="aspectFill"
                    @click="goToUserPage(reply.user.user_id)"
                  ></image>

                  <view class="reply-content-wrapper">
                    <view class="reply-header-row">
                      <view class="reply-name-line">
                        <text class="reply-username" @click="goToUserPage(reply.user.user_id)">
                          {{ reply.user.name }}
                        </text>

                        <text
                          v-if="isAuthorComment(reply.user.user_id)"
                          class="author-badge reply-author-badge"
                        >
                          作者
                        </text>

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
                        <text
                          class="iconfont comment-like-icon"
                          :class="reply.isLiked ? 'icon-xihuan active' : 'icon-xihuan1'"
                        ></text>
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

                <view class="reply-footer" v-if="comment.replies.length > 0">
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

          <view v-if="commentLoading && commentList.length" class="loading-comments">
            <text>评论加载中...</text>
          </view>

          <view
            v-if="!commentHasMore && commentList.length"
            class="loading-comments no-more-comments"
          >
            <text>没有更多评论了</text>
          </view>
        </view>
      </view>
    </scroll-view>


    <!-- 单一常驻底栏 -->
    <view class="bottom-bar">
      <view class="comment-input-wrapper" :style="commentInputWrapperStyle" @click.stop="startNewComment">
        <input
          class="bottom-comment-input"
          v-model="commentText"
          :placeholder="commentPlaceholder"
          :focus="commentInputFocus"
          :adjust-position="false"
          cursor-spacing="0"
          confirm-type="send"
          @focus="handleInputFocus"
          @blur="handleInputBlur"
          @keyboardheightchange="handleKeyboardHeightChange"
          @confirm="sendComment"
        />
      </view>

      <view class="bottom-right-slot" :style="bottomRightSlotStyle">
        <view
          class="send-btn"
          v-if="showCommentInput"
          :class="{ active: commentText.trim() }"
          @click="sendComment"
        >
          <text>发送</text>
        </view>

        <view class="action-group" v-else>
          <view class="action-item" @click="toggleLike">
            <text
              class="iconfont action-icon"
              :class="isLiked ? 'icon-xihuan active' : 'icon-xihuan1'"
            ></text>
            <text class="action-count">{{ formatNumber(creation.likes) }}</text>
          </view>

          <view class="action-item" @click="scrollToComments">
            <text class="iconfont icon-comment action-icon"></text>
            <text class="action-count">{{ formatNumber(creation.comments) }}</text>
          </view>

          <view class="action-item share-action" @click="openSharePanel">
            <text class="iconfont icon-fenxiang action-icon"></text>
            <text class="action-count">{{ formatNumber(creation.shares) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 长按图片保存菜单 -->
    <view
      class="image-save-mask"
      v-if="imageSaveAction.visible"
      @click="hideImageSaveAction"
    >
      <view class="image-save-sheet" @click.stop>
        <view
          class="image-save-item"
          :class="{ disabled: imageSaveAction.saving }"
          @click="saveSelectedImageToAlbum"
        >
          <text class="image-save-text">
            {{ imageSaveAction.saving ? '保存中...' : '保存到相册' }}
          </text>
        </view>
      </view>
    </view>

    <!-- 长按评论/回复删除菜单 -->
    <view class="comment-action-mask" v-if="commentAction.visible" @click="hideCommentAction">
      <view class="comment-action-sheet" @click.stop>
        <view class="comment-action-delete" @click="confirmDeleteSelectedComment">
          <text class="comment-action-delete-text">
            {{ commentAction.deleting ? '删除中...' : '删除' }}
          </text>
        </view>
      </view>
    </view>

    <!-- 转发面板 -->
    <view class="share-mask" v-if="showSharePanel" @click="closeSharePanel">
      <view class="share-panel" @click.stop>
        <view class="share-panel-title">分享至</view>

        <view class="share-options-row">
          <view class="share-option" @click="shareToChat">
            <text class="iconfont icon-xiaoxi share-option-icon"></text>
            <text class="share-option-text">聊天</text>
          </view>

          <view class="share-option" @click="shareToFriend">
            <text class="iconfont icon-qunliaox share-option-icon share-option-icon-small"></text>
            <text class="share-option-text">朋友</text>
          </view>

          <view class="share-option" @click="shareToWechat">
            <text class="iconfont icon-weixin share-option-icon"></text>
            <text class="share-option-text">微信</text>
          </view>

          <view class="share-option" @click="shareToTimeline">
            <text class="iconfont icon-pengyouquan share-option-icon share-option-icon-small"></text>
            <text class="share-option-text">朋友圈</text>
          </view>

          <view class="share-option" @click="shareToQQ">
            <text class="iconfont icon-QQ share-option-icon"></text>
            <text class="share-option-text">QQ</text>
          </view>
        </view>
      </view>
    </view>

    <forward-picker
      :visible="forwardPicker.visible"
      :mode="forwardPicker.mode"
      entity-type="creation"
      :entity-id="creationId"
      @close="closeForwardPicker"
      @success="handleForwardSuccess"
    />
  </view>
</template>

<script>
import { getCreationById } from '@/request/creation.js'
import { getUserProfile } from '@/request/user.js'
import ForwardPicker from '@/components/forward-picker.vue'
import { enqueueClickReport } from '@/utils/track.js'
import {
  digg,
  cancelDigg,
  createComment,
  createReply,
  getCommentList,
  getActionInfo,
  diggComment,
  cancelDiggComment,
  getReplyList,
  follow,
  unfollow,
  deleteComment,
  deleteReply
} from '@/request/action.js'

export default {
  components: {
    ForwardPicker
  },

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
        shares: 0,
        shareUrl: ''
      },

      isLiked: false,
      isFollowed: false,

      imageSaveAction: {
        visible: false,
        index: 0,
        url: '',
        saving: false
      },
      imageLongPressing: false,

      imageTouch: {
        startX: 0,
        startY: 0,
        moved: false,
        timer: null,
        index: 0
      },

      commentList: [],
      commentLoading: false,
      commentSortType: 'digg',
      commentPage: 1,
      commentHasMore: true,

      showCommentInput: false,
      commentText: '',
      commentPlaceholder: '说点什么...',
      commentInputFocus: false,
      keyboardVisible: false,
      keyboardHeight: 0,
      inputBlurTimer: null,
      replyingTo: null,

      contentScrollTop: 0,
      currentContentScrollTop: 0,

      commentAction: {
        visible: false,
        type: '',
        target: null,
        parent: null,
        deleting: false
      },

      commentTouch: {
        startX: 0,
        startY: 0,
        moved: false
      },

      showSharePanel: false,
      shareLoading: false,
      forwardPicker: {
        visible: false,
        mode: 'conversation'
      },
      likeLoading: false
    }
  },

  computed: {
    categoryLabel() {
      const map = {
        life: '生活',
        society: '社会',
        tech: '科技',
        entertainment: '娱乐'
      }
      return map[this.creation.category] || ''
    },

    isSelfAuthor() {
      if (!this.currentUserId || !this.creation.author.user_id) return false
      return String(this.currentUserId) === String(this.creation.author.user_id)
    },

    commentInputWrapperStyle() {
      if (this.showCommentInput) {
        return 'flex:1;'
      }
      return 'flex:0 1 56%;'
    },

    bottomRightSlotStyle() {
      if (this.showCommentInput) {
        return 'min-width:0;'
      }
      return ''
    },
  },

  onLoad(options) {
    this.creationId = options.creationId || options.creation_id || ''
    this.authorId = options.userId || options.user_id || ''

    const app = getApp()
    this.currentUserId = app && app.globalData ? app.globalData.userId : null

    enqueueClickReport(this.creationId)
    this.initPage()
  },

  onShow() {
    this.shareLoading = false
  },

  onUnload() {
    this.clearImageLongPressTimer()

    if (this.inputBlurTimer) {
      clearTimeout(this.inputBlurTimer)
      this.inputBlurTimer = null
    }
  },

  methods: {
    async initPage() {

      const ok1 = await this.fetchCreationDetail()
      const ok2 = await this.fetchAuthorInfo()
      const ok3 = await this.fetchActionInfo()
      const ok4 = await this.fetchComments(true)

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
      this.creation.shareUrl = res.creation.share_url || res.creation.shareUrl || ''

      const cover = res.creation.material_url || res.creation.cover_url || ''
      this.creation.coverImage = cover
      this.creation.images = cover ? [cover] : []

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

    async fetchActionInfo() {
      if (!this.creationId) return false

      const payload = {
        entityType: 'creation',
        entityId: BigInt(this.creationId)
      }

      const res = await getActionInfo(payload)
      if (!res) return false

      this.creation.likes = res.digg_count
      this.isLiked = res.is_digg
      this.creation.comments = res.comment_count
      this.creation.shares = res.forward_count

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
        sortType: this.commentSortType
      }

      const res = await getCommentList(payload)
      if (!res) {
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

    onContentScroll(e) {
      this.currentContentScrollTop = Number(e.detail.scrollTop || 0)
    },

    noop() {},

    hideKeyboardOnly() {
      try {
        uni.hideKeyboard()
      } catch (err) {}
    },

    onPageScrollTouchStart() {
      if (!this.commentInputFocus && !this.keyboardVisible) return

      this.hideKeyboardOnly()
    },

    scrollToComments() {
      const query = uni.createSelectorQuery().in(this)

      query.select('.page-scroll').boundingClientRect()
      query.select('#commentsSection').boundingClientRect()

      query.exec((res) => {
        const scrollRect = res && res[0]
        const commentsRect = res && res[1]

        if (!scrollRect || !commentsRect) return

        const targetTop = this.currentContentScrollTop + commentsRect.top - scrollRect.top

        this.contentScrollTop = targetTop

        this.$nextTick(() => {
          this.contentScrollTop = targetTop + 1
          this.$nextTick(() => {
            this.contentScrollTop = targetTop
          })
        })
      })
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
      if (!targetId) {
        uni.showToast({ title: '网络错误', icon: 'none' })
        return
      }

      const currentUserId = getApp().globalData.userId

      if (String(targetId) === String(currentUserId)) {
        uni.navigateTo({
          url: '/pages/user/my_profile_copy'
        })
        return
      }

      uni.navigateTo({
        url: `/pages/user/user_profile?userId=${targetId}`
      })
    },

    isAuthorComment(userId) {
      if (!userId || !this.creation.author.user_id) return false
      return String(userId) === String(this.creation.author.user_id)
    },

    clearImageLongPressTimer() {
      if (this.imageTouch && this.imageTouch.timer) {
        clearTimeout(this.imageTouch.timer)
        this.imageTouch.timer = null
      }
    },

    getTouchPoint(e) {
      const touch = e?.changedTouches?.[0] || e?.touches?.[0] || {}

      return {
        x: Number(touch.clientX ?? touch.pageX ?? 0),
        y: Number(touch.clientY ?? touch.pageY ?? 0)
      }
    },

    onCreationImageTouchStart(e, index) {
      this.clearImageLongPressTimer()

      const point = this.getTouchPoint(e)

      this.imageLongPressing = false

      this.imageTouch = {
        startX: point.x,
        startY: point.y,
        moved: false,
        timer: null,
        index
      }

      this.imageTouch.timer = setTimeout(() => {
        if (!this.imageTouch.moved && Number(this.imageTouch.index) === Number(index)) {
          this.showImageSaveAction(index)
        }
      }, 520)
    },

    onCreationImageTouchMove(e) {
      const point = this.getTouchPoint(e)

      const dx = Math.abs(point.x - this.imageTouch.startX)
      const dy = Math.abs(point.y - this.imageTouch.startY)

      if (dx > 8 || dy > 8) {
        this.imageTouch.moved = true
        this.clearImageLongPressTimer()
      }
    },

    onCreationImageTouchEnd() {
      this.clearImageLongPressTimer()

      setTimeout(() => {
        if (!this.imageSaveAction.visible) {
          this.imageTouch = {
            startX: 0,
            startY: 0,
            moved: false,
            timer: null,
            index: 0
          }
        }
      }, 80)
    },

    openImagePreview(index = 0) {
      if (this.imageLongPressing) {
        return
      }

      if (this.imageTouch && this.imageTouch.moved) {
        return
      }

      const images = this.creation.images || []
      if (!images.length) return

      this.showSharePanel = false
      this.forwardPicker.visible = false
      this.hideImageSaveAction()

      uni.previewImage({
        current: index,
        urls: images
      })
    },

    showImageSaveAction(index = 0) {
      if (this.imageTouch && this.imageTouch.moved) return

      const images = this.creation.images || []
      const url = images[index]
      if (!url) return

      this.imageLongPressing = true
      this.showSharePanel = false
      this.forwardPicker.visible = false
      this.clearInputFocus()

      this.imageSaveAction = {
        visible: true,
        index,
        url,
        saving: false
      }
    },

    hideImageSaveAction() {
      if (this.imageSaveAction.saving) return

      this.clearImageLongPressTimer()

      this.imageSaveAction = {
        visible: false,
        index: 0,
        url: '',
        saving: false
      }

      setTimeout(() => {
        this.imageLongPressing = false
        this.imageTouch = {
          startX: 0,
          startY: 0,
          moved: false,
          timer: null,
          index: 0
        }
      }, 80)
    },

    saveSelectedImageToAlbum() {
      if (this.imageSaveAction.saving) return

      const url = this.imageSaveAction.url
      if (!url) {
        uni.showToast({
          title: '暂无可保存图片',
          icon: 'none'
        })
        return
      }

      this.downloadImage(url)
    },

    downloadImage(url) {
      if (!url || this.imageSaveAction.saving) return

      this.imageSaveAction.saving = true

      const finish = () => {
        this.imageSaveAction.saving = false
        this.hideImageSaveAction()
      }

      // #ifdef H5
      try {
        const a = document.createElement('a')
        a.href = url
        a.download = `creation_${this.creationId || Date.now()}.jpg`
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        uni.showToast({
          title: '已开始下载',
          icon: 'none'
        })
      } catch (err) {
        console.error('download image on H5 failed', err)
        window.open(url, '_blank')
      } finally {
        finish()
      }
      return
      // #endif

      const saveToAlbum = (filePath) => {
        uni.saveImageToPhotosAlbum({
          filePath,
          success: () => {
            uni.showToast({
              title: '已保存到相册',
              icon: 'success'
            })
          },
          fail: (err) => {
            console.error('saveImageToPhotosAlbum failed', err)
            uni.showToast({
              title: '保存失败，请检查相册权限',
              icon: 'none'
            })
          },
          complete: finish
        })
      }

      if (/^https?:\/\//.test(url)) {
        uni.downloadFile({
          url,
          success: (res) => {
            if (res.statusCode === 200 && res.tempFilePath) {
              saveToAlbum(res.tempFilePath)
            } else {
              finish()
              uni.showToast({
                title: '下载失败',
                icon: 'none'
              })
            }
          },
          fail: (err) => {
            console.error('download image failed', err)
            finish()
            uni.showToast({
              title: '下载失败',
              icon: 'none'
            })
          }
        })
        return
      }

      saveToAlbum(url)
    },

    async toggleLike() {
      const entityId = this.creation.creationId || this.creationId
      if (this.likeLoading || !entityId) return

      this.likeLoading = true

      let ok = false

      if (this.isLiked) {
        ok = await cancelDigg('creation', entityId)
        if (ok) {
          this.isLiked = false
          this.creation.likes = Math.max(0, this.creation.likes - 1)
        }
      } else {
        ok = await digg('creation', entityId)
        if (ok) {
          this.isLiked = true
          this.creation.likes += 1
        }
      }

      this.likeLoading = false
    },

    async toggleFollow() {
      const currentUserId = this.currentUserId
      const targetUserId = this.creation.author.user_id

      if (!currentUserId || !targetUserId) {
        uni.showToast({ title: '网络错误', icon: 'none' })
        return
      }

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
      comment._loading = false
    },

    replyToComment(targetComment, parentComment) {
      if (!targetComment) return

      const parent = parentComment || targetComment
      const isReplyToReply = parent.id !== targetComment.id

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
      if (!this.showCommentInput && !this.commentText.trim()) {
        this.replyingTo = null
        this.commentPlaceholder = '说点什么...'
      }

      this.focusCommentInput()
    },

    focusCommentInput() {
      this.showSharePanel = false
      this.forwardPicker.visible = false
      this.hideImageSaveAction()

      this.showCommentInput = true

      this.$nextTick(() => {
        this.commentInputFocus = true
      })
    },

    clearInputFocus() {
      if (this.inputBlurTimer) {
        clearTimeout(this.inputBlurTimer)
        this.inputBlurTimer = null
      }

      try {
        uni.hideKeyboard()
      } catch (err) {}

      this.commentInputFocus = false

      if (!this.keyboardVisible && !this.commentText.trim()) {
        this.showCommentInput = false
        this.replyingTo = null
        this.commentPlaceholder = '说点什么...'
      }
    },

    handleInputFocus() {
      if (this.inputBlurTimer) {
        clearTimeout(this.inputBlurTimer)
        this.inputBlurTimer = null
      }

      this.showSharePanel = false
      this.forwardPicker.visible = false
      this.hideImageSaveAction()

      this.showCommentInput = true
      this.commentInputFocus = true
    },

    handleInputBlur() {
      if (this.inputBlurTimer) {
        clearTimeout(this.inputBlurTimer)
      }

      this.inputBlurTimer = setTimeout(() => {
        if (!this.keyboardVisible) {
          this.commentInputFocus = false

          if (!this.commentText.trim()) {
            this.showCommentInput = false
            this.replyingTo = null
            this.commentPlaceholder = '说点什么...'
          }
        }

        this.inputBlurTimer = null
      }, 180)
    },

    handleKeyboardHeightChange(e) {
      const height = Number(e?.detail?.height || 0)

      if (this.inputBlurTimer) {
        clearTimeout(this.inputBlurTimer)
        this.inputBlurTimer = null
      }

      this.keyboardHeight = height

      if (height > 0) {
        this.keyboardVisible = true
        this.commentInputFocus = true
        this.showCommentInput = true
        return
      }

      setTimeout(() => {
        this.keyboardVisible = false
        this.keyboardHeight = 0
        this.commentInputFocus = false

        if (!this.commentText.trim()) {
          this.showCommentInput = false
          this.replyingTo = null
          this.commentPlaceholder = '说点什么...'
        }
      }, 80)
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
        const payload = {
          parentId: BigInt(this.replyingTo.parentId),
          entityType: 'creation',
          entityId: BigInt(this.creationId),
          contentType: 1,
          content: text,
          sibId: BigInt(this.replyingTo.sibId || 0),
          sibUserId: BigInt(this.replyingTo.sibUserId || 0)
        }

        res = await createReply(payload)
      } else {
        const payload = {
          entityType: 'creation',
          entityId: BigInt(this.creationId),
          contentType: 1,
          content: text
        }

        res = await createComment(payload)
      }

      if (!res || !res.comment_id) {
        return
      }

      const newId = res.comment_id

      if (this.replyingTo) {
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

      this.commentText = ''
      this.commentPlaceholder = '说点什么...'
      this.replyingTo = null
      this.showCommentInput = false
      this.commentInputFocus = false
      this.keyboardVisible = false
      this.keyboardHeight = 0
    },

    isSelfUser(userId) {
      if (!this.currentUserId || !userId) return false
      return String(this.currentUserId) === String(userId)
    },

    onCommentTouchStart(e) {
      const touch = e?.changedTouches?.[0] || e?.touches?.[0] || {}

      this.commentTouch = {
        startX: touch.clientX ?? touch.pageX ?? 0,
        startY: touch.clientY ?? touch.pageY ?? 0,
        moved: false
      }
    },

    onCommentTouchMove(e) {
      const touch = e?.changedTouches?.[0] || e?.touches?.[0] || {}

      const x = touch.clientX ?? touch.pageX ?? 0
      const y = touch.clientY ?? touch.pageY ?? 0
      const dx = Math.abs(x - this.commentTouch.startX)
      const dy = Math.abs(y - this.commentTouch.startY)

      if (dx > 8 || dy > 8) {
        this.commentTouch.moved = true
      }
    },

    onCommentTouchEnd() {
      setTimeout(() => {
        this.commentTouch = {
          startX: 0,
          startY: 0,
          moved: false
        }
      }, 80)
    },

    showCommentAction(target, parent, type) {
      if (this.commentTouch.moved) return
      if (!target || !target.user || !this.isSelfUser(target.user.user_id)) return

      this.showSharePanel = false
      this.forwardPicker.visible = false
      this.hideImageSaveAction()
      this.clearInputFocus()

      this.commentAction = {
        visible: true,
        type,
        target,
        parent,
        deleting: false
      }
    },

    hideCommentAction() {
      if (this.commentAction.deleting) return
      this.resetCommentAction()
    },

    resetCommentAction() {
      this.commentAction = {
        visible: false,
        type: '',
        target: null,
        parent: null,
        deleting: false
      }
    },

    confirmDeleteSelectedComment() {
      const { type, target, parent } = this.commentAction
      if (!target || this.commentAction.deleting) return

      uni.showModal({
        title: type === 'reply' ? '删除回复' : '删除评论',
        content: type === 'reply' ? '确定删除这条回复吗？' : '确定删除这条评论及其全部回复吗？',
        confirmText: '删除',
        confirmColor: '#ff4d4f',
        success: async (res) => {
          if (!res.confirm) return
          await this.deleteSelectedComment(type, target, parent)
        }
      })
    },

    async deleteSelectedComment(type, target, parent) {
      if (!target || this.commentAction.deleting) return

      this.commentAction.deleting = true

      let ok = false

      if (type === 'reply') {
        ok = await deleteReply({
          replyId: target.id
        })
      } else {
        ok = await deleteComment({
          commentId: target.id
        })
      }

      if (!ok) {
        this.commentAction.deleting = false
        return
      }

      if (type === 'reply') {
        this.removeReplyFromList(parent, target)
      } else {
        this.removeCommentFromList(target)
      }

      this.resetCommentAction()
    },

    removeReplyFromList(parent, reply) {
      if (!parent || !Array.isArray(parent.replies)) return

      const oldLength = parent.replies.length
      parent.replies = parent.replies.filter(item => String(item.id) !== String(reply.id))

      if (parent.replies.length !== oldLength) {
        parent.replyCount = Math.max(0, Number(parent.replyCount || 0) - 1)
        this.creation.comments = Math.max(0, Number(this.creation.comments || 0) - 1)

        if (parent.replies.length === 0 && parent.replyCount === 0) {
          parent.showReplies = false
          parent.replyHasMore = false
          parent.replyPage = 0
        }
      }
    },

    removeCommentFromList(comment) {
      const oldLength = this.commentList.length
      const removedCount = 1 + Number(comment.replyCount || 0)

      this.commentList = this.commentList.filter(item => String(item.id) !== String(comment.id))

      if (this.commentList.length !== oldLength) {
        this.creation.comments = Math.max(0, Number(this.creation.comments || 0) - removedCount)
      }
    },

    openSharePanel() {
      this.shareLoading = false
      this.forwardPicker.visible = false
      this.hideImageSaveAction()
      this.clearInputFocus()
      this.showSharePanel = true
    },

    closeSharePanel() {
      this.showSharePanel = false
    },

    shareToChat() {
      this.closeSharePanel()
      this.forwardPicker = {
        visible: true,
        mode: 'conversation'
      }
    },

    shareToFriend() {
      this.closeSharePanel()
      this.forwardPicker = {
        visible: true,
        mode: 'friend'
      }
    },

    closeForwardPicker() {
      this.forwardPicker.visible = false
    },

    handleForwardSuccess(payload) {
      this.forwardPicker.visible = false
      this.creation.shares += payload?.count || 1
    },

    shareToWechat() {
      uni.showToast({
        title: '开发中',
        icon: 'none'
      })
      // this.shareByUni({
      //   provider: 'weixin',
      //   scene: 'WXSceneSession'
      // })
    },

    shareToTimeline() {
      uni.showToast({
        title: '开发中',
        icon: 'none'
      })
      // this.shareByUni({
      //   provider: 'weixin',
      //   scene: 'WXSceneTimeline'
      // })
    },

    shareToQQ() {
      this.shareByUni({
        provider: 'qq'
      })
    },

    getShareInfo() {
      const title = this.creation.title || '分享一个作品'
      const summary = this.creation.detail || '我发现了一个不错的作品，快来看看吧'
      const imageUrl = this.creation.coverImage || this.creation.images[0] || ''
      const href = this.creation.shareUrl || `http://8.130.134.60:3000/share.html?creationId=${this.creationId}`

      return {
        title,
        summary,
        imageUrl,
        href
      }
    },

    shareByUni({ provider, scene }) {
      const info = this.getShareInfo()

      let released = false
      let releaseTimer = null

      const releaseShareLock = () => {
        if (released) return

        released = true
        this.shareLoading = false

        if (releaseTimer) {
          clearTimeout(releaseTimer)
          releaseTimer = null
        }
      }

      const params = {
        provider,
        type: 1,
        title: info.title,
        summary: info.summary,
        success: () => {
          console.log('uni.share success: platform share panel opened')
        },
        fail: (err) => {
          console.error('uni.share failed', err)
          uni.showToast({ title: '分享失败', icon: 'none' })
        },
        complete: () => {
          releaseShareLock()
        }
      }

      if (provider === 'weixin') {
        params.scene = scene

        if (info.href && info.imageUrl) {
          params.type = 0
          params.href = info.href
          params.imageUrl = info.imageUrl
        }
      }

      if (provider === 'qq') {
        if (info.href && info.imageUrl) {
          params.type = 0
          params.href = info.href
          params.imageUrl = info.imageUrl
        }
      }

      this.shareLoading = true
      this.closeSharePanel()

      releaseTimer = setTimeout(() => {
        releaseShareLock()
      }, 1200)

      uni.share(params)
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
      const diffMs = now.getTime() - msTimestamp
      const diffSec = Math.floor(diffMs / 1000)

      if (diffSec < 60) return '刚刚'
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`

      const oneDayMs = 24 * 60 * 60 * 1000
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

      const pad2 = (n) => (n < 10 ? '0' + n : '' + n)
      const hhmm = `${pad2(target.getHours())}:${pad2(target.getMinutes())}`

      if (msTimestamp >= todayStart) return `今天 ${hhmm}`
      if (msTimestamp >= todayStart - oneDayMs) return `昨天 ${hhmm}`

      const diffDay = Math.floor(diffMs / oneDayMs)
      if (diffDay < 7) return `${diffDay}天前`

      const year = target.getFullYear()
      const month = target.getMonth() + 1
      const day = target.getDate()

      if (year !== now.getFullYear()) return `${year}年${month}月${day}日`
      return `${month}月${day}日`
    }
  }
}
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.container {
  height: 100vh;
  background: #fff;
  overflow: hidden;
  box-sizing: border-box;
  font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.top-bar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 100;
  background: #fff;
  padding-top: var(--status-bar-height);
  display: flex;
  align-items: center;
  height: calc(42px + var(--status-bar-height));
  padding-left: 12px;
  padding-right: 12px;
  box-sizing: border-box;
  gap: 8px;
}

.page-scroll {
  position: fixed;
  left: 0;
  right: 0;
  top: calc(42px + var(--status-bar-height));
  bottom: calc(54px + env(safe-area-inset-bottom));
  background: #fff;
  box-sizing: border-box;
}


.back-btn {
  width: 30px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-icon {
  font-size: 19px;
  color: #222;
  font-weight: 400;
  line-height: 1;
}

.author-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.author-avatar {
  width: 30px;
  height: 30px;
  border-radius: 15px;
  background: #eee;
  flex-shrink: 0;
}

.author-details {
  margin-left: 8px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.author-name {
  font-size: 13px;
  color: #1f2329;
  font-weight: 400;
  line-height: 1.25;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-desc {
  margin-top: 2px;
  font-size: 10px;
  color: #999;
  font-weight: 400;
  line-height: 1.2;
}

.follow-btn,
.following-btn {
  height: 28px;
  min-width: 66px;
  padding: 0 12px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex-shrink: 0;
}

.follow-btn {
  background: #ff4d67;
  box-shadow: 0 2px 8px rgba(255, 77, 103, 0.28);
}

.following-btn {
  background: #f0f0f0;
}

.follow-btn .btn-text,
.following-btn .btn-text {
  font-size: 12px;
  font-weight: 400;
  line-height: 1;
}

.follow-btn .btn-text {
  color: #ffffff;
}

.following-btn .btn-text {
  color: #666;
}

.media-section {
  width: 100%;
  height: 76vw;
  min-height: 286px;
  max-height: 430px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-swiper,
.creation-image,
.creation-video {
  width: 100%;
  height: 100%;
  background: #fff;
}

.creation-image,
.creation-video {
  display: block;
}

.media-empty {
  width: 100%;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.media-empty-icon {
  font-size: 44px;
  color: rgba(253, 190, 120, 1);
  font-weight: 400;
  line-height: 1;
}

.media-empty-text {
  margin-top: 10px;
  font-size: 13px;
  color: #999;
  font-weight: 400;
  line-height: 1;
}

.image-save-mask,
.comment-action-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 2600;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: flex-end;
  padding: 0 12px calc(18px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.image-save-sheet,
.comment-action-sheet {
  width: 100%;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-sizing: border-box;
}

.image-save-item,
.comment-action-delete {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-save-item:active,
.comment-action-delete:active {
  background: #f7f7f7;
}

.image-save-item.disabled {
  opacity: 0.58;
}

.image-save-text {
  font-size: 15px;
  color: #1f2329;
  font-weight: 400;
  line-height: 1;
}

.comment-action-delete-text {
  font-size: 15px;
  color: #ff4d4f;
  font-weight: 400;
  line-height: 1;
}

.content-section {
  padding: 14px 15px 10px;
  background: #fff;
  box-sizing: border-box;
}

.title-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.creation-title {
  font-size: 18px;
  color: #1f2329;
  font-weight: 400;
  line-height: 1.42;
  word-break: break-word;
}

.detail-line {
  margin-top: 7px;
  font-size: 14px;
  line-height: 1.65;
  color: #333;
  word-break: break-word;
  display: block;
  overflow: visible;
  white-space: normal;
}

.detail-text {
  display: inline;
  font-size: 14px;
  color: #333;
  font-weight: 400;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.category-text {
  margin-left: 6px;
  display: inline;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(253, 231, 209, 0.86);
  color: #8a5a2b;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  vertical-align: baseline;
}

.tags-row {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(253, 231, 209, 0.7);
  color: #8a5a2b;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.2;
}

.meta-info {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-time,
.meta-location {
  color: #999;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.3;
}

.content-comment-divider {
  height: 1px;
  margin: 0 15px;
  background: #f0f0f0;
  transform: scaleY(0.5);
  transform-origin: center;
}

.comments-section {
  padding: 0 15px 2px;
  background: #fff;
  box-sizing: border-box;
  min-height: 28vh;
}

.comments-header {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comments-title {
  font-size: 15px;
  color: #1f2329;
  font-weight: 400;
  line-height: 1;
}

.comments-sort {
  display: flex;
  align-items: center;
}

.sort-label {
  font-size: 13px;
  color: #606266;
  font-weight: 400;
  line-height: 1;
}

.comment-list {
  box-sizing: border-box;
}

.comment-item {
  display: flex;
  align-items: flex-start;
  padding: 11px 0;
  box-sizing: border-box;
}

.comment-avatar {
  width: 38px;
  height: 38px;
  border-radius: 19px;
  flex-shrink: 0;
  background: #eee;
}

.comment-content-wrapper {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
}

.comment-header-row,
.reply-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.comment-name-line,
.reply-name-line {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.comment-username,
.reply-username {
  font-size: 14px;
  color: #1f2329;
  font-weight: 400;
  line-height: 1.35;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-badge {
  margin-left: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(253, 231, 209, 0.86);
  color: #8a5a2b;
  font-size: 10px;
  font-weight: 400;
  line-height: 1.2;
  flex-shrink: 0;
}

.reply-author-badge {
  margin-left: 5px;
}

.comment-like-btn {
  min-width: 30px;
  margin-left: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.comment-like-icon {
  font-size: 18px;
  color: #666;
  font-weight: 400;
  line-height: 1;
}

.comment-like-icon.active {
  color: #ff4d67;
}

.comment-like-count {
  margin-top: 2px;
  font-size: 11px;
  color: #8f959e;
  font-weight: 400;
  line-height: 1;
}

.comment-main-text {
  margin-top: 4px;
}

.comment-text {
  font-size: 14px;
  color: #333;
  font-weight: 400;
  line-height: 1.55;
  word-break: break-word;
}

.comment-meta-row {
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.comment-time,
.comment-reply-btn {
  font-size: 12px;
  color: #999;
  font-weight: 400;
  line-height: 1;
}

.comment-replies-toggle {
  margin-top: 8px;
}

.comment-replies-toggle-text {
  font-size: 12px;
  color: #999;
  font-weight: 400;
  line-height: 1;
}

.reply-list {
  margin-top: 10px;
  padding: 10px;
  background: #f8f8f8;
  border-radius: 12px;
  box-sizing: border-box;
}

.reply-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
}

.reply-item:last-child {
  margin-bottom: 0;
}

.reply-avatar {
  width: 28px;
  height: 28px;
  border-radius: 14px;
  flex-shrink: 0;
  background: #eee;
}

.reply-content-wrapper {
  flex: 1;
  min-width: 0;
  margin-left: 8px;
}

.reply-at {
  margin-left: 6px;
  color: #8f959e;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.2;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reply-footer {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.reply-footer text,
.reply-footer-collapse,
.reply-footer-loading {
  font-size: 12px;
  color: #999;
  font-weight: 400;
  line-height: 1;
}

.empty-comments {
  padding: 22px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-comments {
  padding: 8px 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-more-comments {
  padding-bottom: 2px;
}

.empty-comments text,
.loading-comments text {
  font-size: 13px;
  color: #999;
  font-weight: 400;
  line-height: 1.4;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 120;
  min-height: 54px;
  padding: 7px 12px calc(7px + env(safe-area-inset-bottom));
  background: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  box-shadow: none;
  transition: none;
}

.comment-input-wrapper {
  flex: 1;
  min-width: 0;
  height: 36px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  box-sizing: border-box;
}

.bottom-comment-input {
  width: 100%;
  height: 36px;
  font-size: 14px;
  color: #333;
  font-weight: 400;
  line-height: 36px;
  box-sizing: border-box;
}

.bottom-right-slot {
  flex-shrink: 0;
  min-width: 132px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.action-group {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.action-item {
  min-width: 44px;
  height: 38px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.action-icon {
  font-size: 24px;
  color: #666;
  font-weight: 400;
  line-height: 1;
}

.action-icon.active {
  color: #ff4d67;
}

.action-count {
  margin-left: 3px;
  font-size: 11px;
  color: #999;
  font-weight: 400;
  line-height: 1;
}

.send-btn {
  width: 56px;
  height: 38px;
  border-radius: 19px;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.send-btn.active {
  background: rgba(253, 231, 209, 1);
}

.send-btn text {
  font-size: 14px;
  color: #999999;
  font-weight: 400;
  line-height: 1;
}

.send-btn.active text {
  color: #8a5a2b;
}

.share-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 2500;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: flex-end;
}

.share-panel {
  width: 100%;
  background: #fff;
  border-radius: 0;
  padding: 18px 8px calc(22px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.share-panel-title {
  display: block;
  text-align: center;
  font-size: 15px;
  color: #1f2329;
  font-weight: 400;
  line-height: 1;
}

.share-options-row {
  margin-top: 22px;
  display: flex;
  align-items: flex-start;
  justify-content: space-around;
}

.share-option {
  width: 20%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.share-option:active {
  opacity: 0.75;
}

.share-option-icon {
  width: 38px;
  height: 38px;
  font-size: 31px;
  color: #333;
  font-weight: 400;
  line-height: 38px;
  text-align: center;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  margin-bottom: 10px;
}

.share-option-icon-small {
  font-size: 28px;
  transform: scale(0.94);
  transform-origin: center;
}

.share-option-text {
  width: 100%;
  display: block;
  font-size: 14px;
  color: #4e5969;
  font-weight: 400;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
}
</style>