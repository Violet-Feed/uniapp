<template>
  <view class="notice-container">
    <!-- 顶部栏 -->
    <view class="header-bar">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="header-title">{{ pageTitle }}</text>
      <view class="header-right"></view>
    </view>

    <!-- 列表 -->
    <scroll-view
      class="notice-scroll"
      scroll-y
      :lower-threshold="120"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refresherTriggered"
      @refresherrefresh="onRefresh"
    >
      <view class="notice-list">
        <view
          class="notice-item"
          v-for="(n, idx) in notices"
          :key="String(n.sender_id || '') + '-' + String(n.create_time || '') + '-' + idx"
          @click="handleItemClick(n)"
        >
          <!-- 左侧头像 -->
          <view class="avatar-wrapper">
            <image
              class="avatar"
              :src="n.sender_avatar || '/static/user_avatar.png'"
              mode="aspectFill"
              @click.stop="goToUser(n.sender_id)"
            />
          </view>

          <!-- 中间内容 -->
          <view class="notice-content">
            <view class="row-top">
              <text class="username" @click.stop="goToUser(n.sender_id)">
                {{ n.sender_username || '未知用户' }}
              </text>
            </view>

            <view class="row-mid">
              <text class="notice-text">
                {{ noticeText }}
              </text>
            </view>

            <view class="row-bottom">
              <text class="time">{{ n._display_time }}</text>
            </view>
          </view>

          <!-- 右侧引用封面（所有行一致，按进入页时传入或接口返回兜底） -->
          <view class="ref-cover" v-if="resolvedRefId && resolvedRefCoverUrl">
            <image class="ref-image" :src="resolvedRefCoverUrl" mode="aspectFill" />
          </view>
        </view>

        <view v-if="!loading && notices.length === 0" class="empty">
          <text class="empty-icon">🔔</text>
          <text class="empty-text">暂无记录</text>
        </view>

        <view v-if="notices.length > 0" class="footer">
          <text v-if="loadingMore">加载中...</text>
          <text v-else-if="!hasMore">没有更多了</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getNoticeAggList } from '@/request/im.js'

export default {
  data() {
    return {
      noticeId: '',

      // Digg=3 / DiggComment=4（从上页传入）
      noticeType: 3,
      noticeContent: '',

      // 这些与进入那条通知一致（从上页传入；接口若也回传，下面会兜底）
      refId: '',
      refType: 0,
      refCoverUrl: '',
      refUserId: '',

      notices: [],
      page: 1,
      hasMore: true,

      loading: false,
      loadingMore: false,
      refresherTriggered: false
    }
  },
  computed: {
    pageTitle() {
      return this.noticeType === 4 ? '赞评详情' : '点赞详情'
    },
    noticeText() {
      if (Number(this.noticeType) === 4) return '赞了你的评论'
      return '赞了你的创作'
    },
    resolvedRefId() {
      return this.refId
    },
    resolvedRefCoverUrl() {
      return this.refCoverUrl
    }
  },
  onLoad(options) {
    this.noticeId = options.noticeId ? String(options.noticeId) : ''

    this.noticeType = Number(options.noticeType) || 3
    this.noticeContent = options.noticeContent ? decodeURIComponent(String(options.noticeContent)) : ''

    this.refId = options.refId ? String(options.refId) : ''
    this.refType = Number(options.refType) || 0
    this.refCoverUrl = options.refCoverUrl ? decodeURIComponent(String(options.refCoverUrl)) : ''
    this.refUserId = options.refUserId ? String(options.refUserId) : ''

    this.loadAggNotices(true)
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },

    async onRefresh() {
      this.refresherTriggered = true
      const p = this.loadAggNotices(true)
      Promise.resolve(p).finally(() => {
        this.refresherTriggered = false
      })
    },

    async loadAggNotices(reset = false) {
      if (this.loading || this.loadingMore) return
      if (!reset && !this.hasMore) return
      if (!this.noticeId) {
        this.hasMore = false
        return
      }

      if (reset) {
        this.page = 1
        this.hasMore = true
        this.notices = []
        this.loading = true
      } else {
        this.loadingMore = true
      }

      const payload = {
        noticeId: this.noticeId,
        page: this.page
      }

      const res = await getNoticeAggList(payload)
      const list = res && Array.isArray(res.notices) ? res.notices : []

      // 若后端在聚合接口里顺便回传 ref 信息，这里也可兜底
      if (res) {
        if (!this.refId && res.ref_id) this.refId = String(res.ref_id)
        if (!this.refType && res.ref_type) this.refType = Number(res.ref_type) || 0
        if (!this.refCoverUrl && res.ref_cover_url) this.refCoverUrl = String(res.ref_cover_url)
        if (!this.refUserId && res.ref_user_id) this.refUserId = String(res.ref_user_id)
        if (!this.noticeType && res.notice_type) this.noticeType = Number(res.notice_type) || 3
      }

      if (!list || list.length === 0) {
        this.hasMore = false
        this.loading = false
        this.loadingMore = false
        return
      }

      const mapped = list.map((n) => this.decorateItem(n))

      if (reset) this.notices = mapped
      else this.notices = this.notices.concat(mapped)

      this.page += 1
      this.loading = false
      this.loadingMore = false
    },

    loadMore() {
      this.loadAggNotices(false)
    },

    decorateItem(n) {
      const createTimeNum = this.toSafeNumber(n.create_time)
      return {
        ...n,
        _create_time_num: createTimeNum,
        _display_time: this.formatRelativeTime(createTimeNum)
      }
    },

    goToUser(userId) {
      const uid = encodeURIComponent(String(userId || ''))
      if (!uid) return
      uni.navigateTo({
        url: `/pages/user/user_profile?userId=${uid}`
      })
    },

    handleItemClick() {
      // 点击除头像/用户名之外区域：进入对应创作详情
      if (!this.refId) return
      this.goToCreationByRef()
    },

    goToCreationByRef() {
      const creationId = encodeURIComponent(String(this.refId))
      const userId = encodeURIComponent(String(this.refUserId || ''))

      const isVideo = Number(this.refType) === 2
      const basePath = isVideo
        ? '/pages/creation/creation_video'
        : '/pages/creation/creation_image'

      uni.navigateTo({
        url: `${basePath}?creationId=${creationId}&userId=${userId}`
      })
    },

    toSafeNumber(v) {
      if (v === null || v === undefined) return 0
      if (typeof v === 'number') return v
      if (typeof v === 'bigint') return Number(v)
      if (typeof v === 'string') return Number(v)
      if (typeof v === 'object' && v.toString) return Number(v.toString())
      return 0
    },

    formatRelativeTime(msTimestamp) {
      if (!msTimestamp) return ''
      let ts = msTimestamp
      if (ts < 1e12) ts = ts * 1000

      const now = new Date()
      const nowMs = now.getTime()
      const diffMs = nowMs - ts
      const diffSec = Math.floor(diffMs / 1000)

      if (diffSec < 60) return '刚刚'
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`

      const oneDayMs = 24 * 60 * 60 * 1000
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

      const target = new Date(ts)
      const pad2 = (n) => (n < 10 ? '0' + n : '' + n)
      const hhmm = `${pad2(target.getHours())}:${pad2(target.getMinutes())}`

      if (ts >= todayStart) return `今天 ${hhmm}`
      if (ts >= todayStart - oneDayMs) return `昨天 ${hhmm}`

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

<style scoped>
.notice-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

/* 顶部栏 */
.header-bar {
  height: 52px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.back-icon {
  font-size: 22px;
  color: #333;
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.header-right {
  width: 44px;
  height: 44px;
}

/* 列表 */
.notice-scroll {
  flex: 1;
  overflow: hidden;
}

.notice-list {
  padding: 8px 0;
}

.notice-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  margin-bottom: 1px;
}

.notice-item:active {
  background: #f5f5f5;
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
  margin-right: 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #f0f0f0;
}

.notice-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row-top {
  display: flex;
  align-items: center;
}

.username {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-mid {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.notice-text {
  font-size: 14px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-bottom {
  display: flex;
  align-items: center;
}

.time {
  font-size: 12px;
  color: #999;
}

/* 右侧封面 */
.ref-cover {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  overflow: hidden;
  margin-left: 12px;
  flex-shrink: 0;
  border: 1px solid #f0f0f0;
}

.ref-image {
  width: 100%;
  height: 100%;
}

/* 空状态 & footer */
.empty {
  padding: 80px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #999;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 10px;
}

.empty-text {
  font-size: 14px;
}

.footer {
  text-align: center;
  padding: 14px 0 22px;
  font-size: 13px;
  color: #999;
}
</style>
