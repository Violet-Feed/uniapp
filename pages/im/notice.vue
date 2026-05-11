<template>
  <view class="notice-container">
    <!-- 顶部栏：状态栏 + 一个列表项高度 -->
    <view class="header-bar" :style="headerStyle">
      <view class="header-content" :style="headerContentStyle">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="header-title">{{ pageTitle }}</text>
        <view class="header-right"></view>
      </view>
    </view>

    <!-- 列表：一屏约 10 条 -->
    <scroll-view
      class="notice-scroll"
      :style="scrollStyle"
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
          :style="noticeItemStyle"
          v-for="(n, idx) in notices"
          :key="String(n.notice_id || idx)"
          @click="handleItemClick(n)"
        >
          <view class="avatar-wrapper">
            <image
              class="avatar"
              :style="avatarStyle"
              :src="n.sender_avatar || '/static/user_avatar.png'"
              mode="aspectFill"
              @click.stop="goToUser(n.sender_id)"
            />
          </view>

          <view class="notice-content">
            <view class="row-top">
              <text class="username" @click.stop="goToUser(n.sender_id)">
                {{ n.sender_username || '未知用户' }}
              </text>
            </view>

            <view class="row-mid">
              <text
                v-if="n._text_parts && n._text_parts.aggPrefix"
                class="agg-prefix"
                @click.stop="openAgg(n)"
              >
                {{ n._text_parts.aggPrefix }}
              </text>
              <text class="notice-text">
                {{ n._text_parts ? n._text_parts.rest : '' }}
              </text>
            </view>

            <view class="row-bottom">
              <text class="time">{{ n._display_time }}</text>
            </view>
          </view>

          <view class="ref-cover" :style="refCoverStyle" v-if="n.ref_id && n.ref_cover_url">
            <image class="ref-image" :src="n.ref_cover_url" mode="aspectFill" />
          </view>
        </view>

        <view v-if="!loading && notices.length === 0" class="empty">
          <text class="empty-icon">🔔</text>
          <text class="empty-text">暂无通知</text>
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
import { getNoticeList, markNoticeRead } from '@/request/im.js'
import JSONbig from 'json-bigint'

export default {
  data() {
    return {
      group: 2,

      notices: [],
      page: 1,
      hasMore: true,

      loading: false,
      loadingMore: false,

      refresherTriggered: false,

      windowHeight: 667,
      statusBarHeight: 0,
      rowHeight: 58,
      headerHeight: 58,
      avatarSize: 40,
      refCoverSize: 42
    }
  },

  computed: {
    pageTitle() {
      if (Number(this.group) === 2) return '关注通知'
      if (Number(this.group) === 3) return '互动通知'
      if (Number(this.group) === 1) return '系统通知'
      return '通知'
    },

    headerStyle() {
      return 'height:' + this.headerHeight + 'px;'
    },

    headerContentStyle() {
      return 'height:' + this.headerHeight + 'px;padding-top:' + this.statusBarHeight + 'px;'
    },

    scrollStyle() {
      const height = Math.max(0, this.windowHeight - this.headerHeight)
      return 'top:' + this.headerHeight + 'px;height:' + height + 'px;'
    },

    noticeItemStyle() {
      return 'height:' + this.rowHeight + 'px;'
    },

    avatarStyle() {
      const radius = Math.floor(this.avatarSize / 2)
      return 'width:' + this.avatarSize + 'px;height:' + this.avatarSize + 'px;border-radius:' + radius + 'px;'
    },

    refCoverStyle() {
      return 'width:' + this.refCoverSize + 'px;height:' + this.refCoverSize + 'px;'
    }
  },

  async onLoad(options) {
    this.initResponsiveLayout()

    const g = Number(options.group)
    this.group = g || 2

    await markNoticeRead({ group: Number(this.group) })
    this.loadNotices(true)
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

        // 状态栏之外：顶部内容 1 行 + 列表 10 行 = 11 行
        const availableHeight = Math.max(520, windowHeight - statusBarHeight)
        const rowHeight = Math.floor(availableHeight / 11)

        this.rowHeight = Math.max(52, Math.min(72, rowHeight))
        this.headerHeight = this.statusBarHeight + this.rowHeight
        this.avatarSize = Math.max(34, Math.min(46, Math.floor(this.rowHeight * 0.68)))
        this.refCoverSize = Math.max(36, Math.min(48, Math.floor(this.rowHeight * 0.72)))
      } catch (err) {
        this.windowHeight = 667
        this.statusBarHeight = 0
        this.rowHeight = 58
        this.headerHeight = 58
        this.avatarSize = 40
        this.refCoverSize = 42
      }
    },

    goBack() {
      uni.navigateBack()
    },

    async onRefresh() {
      this.refresherTriggered = true
      const p = this.loadNotices(true)
      Promise.resolve(p).finally(() => {
        this.refresherTriggered = false
      })
    },

    async loadNotices(reset = false) {
      if (this.loading || this.loadingMore) return
      if (!reset && !this.hasMore) return

      if (reset) {
        this.page = 1
        this.hasMore = true
        this.notices = []
        this.loading = true
      } else {
        this.loadingMore = true
      }

      const payload = {
        group: Number(this.group),
        page: this.page
      }

      const res = await getNoticeList(payload)
      const list = res && Array.isArray(res.notices) ? res.notices : []

      if (!list || list.length === 0) {
        this.hasMore = false
        this.loading = false
        this.loadingMore = false
        return
      }

      const mapped = list.map((n) => this.decorateNotice(n))

      if (reset) {
        this.notices = mapped
      } else {
        this.notices = this.notices.concat(mapped)
      }

      this.page += 1
      this.loading = false
      this.loadingMore = false
    },

    loadMore() {
      this.loadNotices(false)
    },

    decorateNotice(n) {
      const noticeType = this.toSafeNumber(n.notice_type)
      const aggCount = this.toSafeNumber(n.agg_count)
      const createTimeNum = this.toSafeNumber(n.create_time)

      const textParts = this.buildNoticeTextParts(
        noticeType,
        n.notice_content,
        aggCount
      )

      return {
        ...n,
        _notice_type_num: noticeType,
        _agg_count_num: aggCount,
        _create_time_num: createTimeNum,
        _display_time: this.formatRelativeTime(createTimeNum),
        _text_parts: textParts
      }
    },

    buildNoticeTextParts(noticeType, noticeContent, aggCountNum) {
      if (noticeType === 1) {
        const rest = (noticeContent || '').toString()
        return { aggPrefix: '', rest }
      }

      if (noticeType === 2) {
        return { aggPrefix: '', rest: '关注了你' }
      }

      if (noticeType === 3) {
        const rest = '赞了你的创作'
        if (aggCountNum > 0) return { aggPrefix: `等${aggCountNum + 1}人`, rest }
        return { aggPrefix: '', rest }
      }

      if (noticeType === 4) {
        const rest = '赞了你的评论'
        if (aggCountNum > 0) return { aggPrefix: `等${aggCountNum + 1}人`, rest }
        return { aggPrefix: '', rest }
      }

      if (noticeType === 5) {
        const payload = this.safeParseJson(noticeContent)
        const c = payload && payload.content ? payload.content : ''
        return { aggPrefix: '', rest: `评论了你：${c}` }
      }

      if (noticeType === 6) {
        const payload = this.safeParseJson(noticeContent)
        const c = payload && payload.content ? payload.content : ''
        return { aggPrefix: '', rest: `回复了你：${c}` }
      }

      return { aggPrefix: '', rest: '' }
    },

    safeParseJson(str) {
      if (!str) return null
      try {
        return JSONbig.parse(str)
      } catch (e) {
        return null
      }
    },

    goToUser(userId) {
      const rawUid = String(userId || '')
      if (!rawUid) return

      const currentUserId = String(getApp().globalData.userId || '')
      if (rawUid === currentUserId) {
        uni.navigateTo({
          url: '/pages/user/my_profile_copy'
        })
        return
      }

      uni.navigateTo({
        url: `/pages/user/user_profile?userId=${encodeURIComponent(rawUid)}`
      })
    },

    openAgg(n) {
      const noticeId = encodeURIComponent(String(n.notice_id || ''))
      if (!noticeId) return

      const noticeType = encodeURIComponent(String(n.notice_type || ''))
      const noticeContent = encodeURIComponent(String(n.notice_content || ''))

      const refId = encodeURIComponent(String(n.ref_id || ''))
      const refType = encodeURIComponent(String(n.ref_type || ''))
      const refCoverUrl = encodeURIComponent(String(n.ref_cover_url || ''))
      const refUserId = encodeURIComponent(String(n.ref_user_id || ''))

      uni.navigateTo({
        url:
          `/pages/im/notice_agg?noticeId=${noticeId}` +
          `&noticeType=${noticeType}` +
          `&noticeContent=${noticeContent}` +
          `&refId=${refId}` +
          `&refType=${refType}` +
          `&refCoverUrl=${refCoverUrl}` +
          `&refUserId=${refUserId}`
      })
    },

    handleItemClick(n) {
      if (!n) return
      if (!n.ref_id) return
      this.goToCreationByRef(n)
    },

    goToCreationByRef(n) {
      const creationId = encodeURIComponent(String(n.ref_id))
      const userId = encodeURIComponent(String(n.ref_user_id || ''))

      const isVideo = Number(n.ref_type) === 2
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
  background: #f8f9fa;
  position: relative;
  overflow: hidden;
}

.header-bar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 100;
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
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.header-right {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
}

.notice-scroll {
  position: fixed;
  left: 0;
  right: 0;
  overflow: hidden;
  background: #f8f9fa;
}

.notice-list {
  padding: 0;
}

.notice-item {
  display: flex;
  align-items: center;
  padding: 0 14px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  box-sizing: border-box;
}

.notice-item:active {
  background: #f5f5f5;
}

.avatar-wrapper {
  flex-shrink: 0;
  margin-right: 10px;
}

.avatar {
  border: 2px solid #f0f0f0;
  box-sizing: border-box;
  background: #f3f3f3;
}

.notice-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  overflow: hidden;
}

.row-top,
.row-mid,
.row-bottom {
  display: flex;
  align-items: center;
  min-width: 0;
}

.username {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agg-prefix {
  font-size: 12px;
  color: #5b7dff;
  flex-shrink: 0;
  margin-right: 3px;
}

.notice-text {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  font-size: 10px;
  color: #999;
}

.ref-cover {
  border-radius: 7px;
  overflow: hidden;
  margin-left: 10px;
  flex-shrink: 0;
  border: 1px solid #f0f0f0;
  box-sizing: border-box;
  background: #f3f3f3;
}

.ref-image {
  width: 100%;
  height: 100%;
  display: block;
}

.empty {
  height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #999;
}
</style>