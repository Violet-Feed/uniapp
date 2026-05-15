<template>
  <view class="notice-container">
    <!-- 顶部栏：参考关系列表，状态栏 + 自适应内容高度 -->
    <view class="header-bar" :style="headerStyle">
      <view class="header-content" :style="headerContentStyle">
        <view class="back-btn" @click="goBack">
          <text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
        </view>
        <text class="header-title" :style="titleStyle">{{ pageTitle }}</text>
        <view class="header-right"></view>
      </view>
    </view>

    <view
      v-if="pullDistance > 0 || isRefreshing"
      class="refresh-overlay"
      :style="refreshOverlayStyle"
    >
      <view class="loading-spinner tiny" v-if="isRefreshing"></view>
      <text class="refresh-overlay-text">{{ refresherText }}</text>
    </view>

    <!-- 列表：按设备宽度自适应，不固定一屏数量 -->
    <scroll-view
      class="notice-scroll"
      :style="scrollStyle"
      scroll-y
      :lower-threshold="120"
      @scroll="onListScroll"
      @scrolltolower="loadMore"
      @touchstart="onScrollTouchStart"
      @touchmove="onScrollTouchMove"
      @touchend="onScrollTouchEnd"
      @touchcancel="onScrollTouchEnd"
    >
      <view class="scroll-content" :style="scrollContentStyle">
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
              <text class="username" :style="usernameStyle" @click.stop="goToUser(n.sender_id)">
                {{ n.sender_username || '未知用户' }}
              </text>
            </view>

            <view class="row-mid">
              <text
                v-if="n._text_parts && n._text_parts.aggPrefix"
                class="agg-prefix"
                :style="noticeTextStyle"
                @click.stop="openAgg(n)"
              >
                {{ n._text_parts.aggPrefix }}
              </text>
              <text class="notice-text" :style="noticeTextStyle">
                {{ n._text_parts ? n._text_parts.rest : '' }}
              </text>
            </view>

            <view class="row-bottom">
              <text class="time" :style="timeStyle">{{ n._display_time }}</text>
            </view>
          </view>

          <view class="ref-cover" :style="refCoverStyle" v-if="n.ref_id && n.ref_cover_url">
            <image class="ref-image" :src="n.ref_cover_url" mode="aspectFill" />
          </view>
        </view>

		<view v-if="!loading && notices.length === 0" class="empty">
		  <text class="iconfont icon-tongzhi empty-icon" :style="emptyIconStyle"></text>
		  <text class="empty-text" :style="emptyTextStyle">暂无通知</text>
		</view>

        <view v-if="notices.length > 0" class="footer" :style="footerStyle">
          <text v-if="loadingMore">加载中...</text>
          <text v-else-if="!hasMore">没有更多了</text>
        </view>
      </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getNoticeList, markNoticeRead } from '@/request/im.js'
import JSONbig from 'json-bigint'

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value))
}


const PULL_TRIGGER_DISTANCE = 64
const PULL_MAX_DISTANCE = 92
const PULL_MOVE_RATIO = 0.62
const REFRESH_HOLD_OFFSET = 42

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

      isRefreshing: false,
      scrollTop: 0,
      pulling: false,
      pullStartY: 0,
      pullDistance: 0,

      windowHeight: 667,
      windowWidth: 375,
      statusBarHeight: 0,
      safeBottom: 0,
      rowHeight: 74,
      headerContentHeight: 44,
      headerHeight: 44,
      avatarSize: 48,
      refCoverSize: 50,
      backIconFontSize: 19,
      titleFontSize: 16,
      usernameFontSize: 16,
      noticeTextFontSize: 13,
      timeFontSize: 11,
      emptyIconFontSize: 56,
      emptyTextFontSize: 15,
      footerFontSize: 13
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
      return (
        'height:' + this.headerContentHeight + 'px;' +
        'margin-top:' + this.statusBarHeight + 'px;'
      )
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
    },

    backIconStyle() {
      return 'font-size:' + this.backIconFontSize + 'px;'
    },

    titleStyle() {
      return 'font-size:' + this.titleFontSize + 'px;'
    },

    usernameStyle() {
      return 'font-size:' + this.usernameFontSize + 'px;'
    },

    noticeTextStyle() {
      return 'font-size:' + this.noticeTextFontSize + 'px;'
    },

    timeStyle() {
      return 'font-size:' + this.timeFontSize + 'px;'
    },

    emptyIconStyle() {
      return 'font-size:' + this.emptyIconFontSize + 'px;'
    },

    emptyTextStyle() {
      return 'font-size:' + this.emptyTextFontSize + 'px;'
    },

    footerStyle() {
      return 'font-size:' + this.footerFontSize + 'px;'
    },

    pullVisualOffset() {
      if (this.isRefreshing) return REFRESH_HOLD_OFFSET

      return Math.min(
        REFRESH_HOLD_OFFSET,
        Math.round(this.pullDistance * PULL_MOVE_RATIO)
      )
    },

    scrollContentStyle() {
      const transition = this.pulling ? 'none' : 'transform 0.16s ease'

      return [
        'transform: translateY(' + this.pullVisualOffset + 'px)',
        'transition:' + transition
      ].join(';')
    },

    refreshOverlayStyle() {
      const top = this.headerHeight
      const active = this.isRefreshing

      const height = active
        ? 34
        : Math.min(34, Math.max(0, Math.round(this.pullDistance * 0.48)))

      const opacity = active
        ? 1
        : Math.min(1, this.pullDistance / PULL_TRIGGER_DISTANCE)

      return [
        'top:' + top + 'px',
        'height:' + height + 'px',
        'opacity:' + opacity
      ].join(';')
    },

    refresherText() {
      if (this.isRefreshing) return '正在刷新...'
      if (this.pullDistance >= PULL_TRIGGER_DISTANCE) return '松开刷新'
      if (this.pullDistance > 0) return '下拉刷新'
      return ''
    },
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

    onListScroll(e) {
      this.scrollTop = Number(e?.detail?.scrollTop || 0)
    },

    getTouchY(e) {
      const touch = e?.touches?.[0] || e?.changedTouches?.[0] || {}
      return Number(touch.clientY ?? touch.pageY ?? 0)
    },

    onScrollTouchStart(e) {
      if (this.loading || this.loadingMore || this.isRefreshing) return

      this.pullStartY = this.getTouchY(e)
      this.pulling = this.scrollTop <= 2
      this.pullDistance = 0
    },

    onScrollTouchMove(e) {
      if (!this.pulling || this.loading || this.loadingMore || this.isRefreshing) return

      if (this.scrollTop > 2) {
        this.pulling = false
        this.pullDistance = 0
        return
      }

      const currentY = this.getTouchY(e)
      const deltaY = currentY - this.pullStartY

      if (deltaY <= 0) {
        this.pullDistance = 0
        return
      }

      this.pullDistance = Math.min(
        PULL_MAX_DISTANCE,
        Math.floor(deltaY * 0.38)
      )
    },

    async onScrollTouchEnd() {
      if (!this.pulling) return

      const shouldRefresh = this.pullDistance >= PULL_TRIGGER_DISTANCE
      this.pulling = false

      if (!shouldRefresh) {
        this.pullDistance = 0
        return
      }

      await this.onRefresh()
    },
    initResponsiveLayout() {
      try {
        const sys = uni.getSystemInfoSync()
        const windowHeight = Number(sys.windowHeight || 667)
        const windowWidth = Number(sys.windowWidth || 375)
        const statusBarHeight = Number(sys.statusBarHeight || 0)
        const safeAreaInsets = sys.safeAreaInsets || {}

        this.windowHeight = windowHeight
        this.windowWidth = windowWidth
        this.statusBarHeight = statusBarHeight
        this.safeBottom = Number(safeAreaInsets.bottom || 0)

        const smallScreenBoost = windowWidth <= 360 ? 1 : 0
        const tinyScreenBoost = windowWidth <= 330 ? 1 : 0

        this.headerContentHeight = clamp(
          Math.floor(windowWidth * 0.112),
          42,
          48
        )

        this.headerHeight = this.statusBarHeight + this.headerContentHeight

        this.rowHeight = clamp(
          Math.floor(windowWidth * 0.198),
          72,
          84
        )

        this.avatarSize = clamp(
          Math.floor(this.rowHeight * 0.64),
          44,
          52
        )

        this.refCoverSize = clamp(
          Math.floor(this.rowHeight * 0.66),
          46,
          56
        )

        this.backIconFontSize = clamp(
          Math.floor(this.headerContentHeight * 0.45) + smallScreenBoost,
          18,
          21
        )

        this.titleFontSize = clamp(
          Math.floor(this.headerContentHeight * 0.36) + smallScreenBoost,
          15,
          17
        )

        this.usernameFontSize = clamp(
          Math.floor(this.rowHeight * 0.215) + smallScreenBoost + tinyScreenBoost,
          15,
          17
        )

        this.noticeTextFontSize = clamp(
          Math.floor(this.rowHeight * 0.18) + smallScreenBoost,
          13,
          15
        )

        this.timeFontSize = clamp(
          Math.floor(this.rowHeight * 0.15),
          11,
          12
        )

        this.emptyIconFontSize = clamp(
          Math.floor(windowWidth * 0.15),
          54,
          64
        )

        this.emptyTextFontSize = clamp(
          Math.floor(windowWidth * 0.04) + smallScreenBoost,
          15,
          17
        )

        this.footerFontSize = clamp(
          Math.floor(windowWidth * 0.032) + smallScreenBoost,
          12,
          14
        )
      } catch (err) {
        this.windowHeight = 667
        this.windowWidth = 375
        this.statusBarHeight = 0
        this.safeBottom = 0
        this.rowHeight = 74
        this.headerContentHeight = 44
        this.headerHeight = 44
        this.avatarSize = 48
        this.refCoverSize = 50
        this.backIconFontSize = 19
        this.titleFontSize = 16
        this.usernameFontSize = 16
        this.noticeTextFontSize = 13
        this.timeFontSize = 11
        this.emptyIconFontSize = 56
        this.emptyTextFontSize = 15
        this.footerFontSize = 13
      }
    },

    goBack() {
      uni.navigateBack()
    },

    async onRefresh() {
      if (this.loading || this.loadingMore || this.isRefreshing) {
        this.pullDistance = 0
        return
      }

      this.isRefreshing = true
      this.refresherTriggered = true
      this.pullDistance = PULL_TRIGGER_DISTANCE

      try {
        await this.loadNotices(true)
      } finally {
        this.isRefreshing = false
        this.refresherTriggered = false
        this.pullDistance = 0
      }
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

      if (this.toSafeNumber(n.notice_type) === 2) {
        this.goToUser(n.sender_id)
        return
      }

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

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.notice-container {
  height: 100vh;
  background: #fdfdfd;
  position: relative;
  overflow: hidden;
  font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.header-bar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 20;
  background: transparent;
  box-sizing: border-box;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 10px;
  padding-right: 10px;
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
  line-height: 1;
  color: #222;
  font-weight: 400;
}

.header-title {
  flex: 1;
  text-align: center;
  font-weight: 400;
  color: #222;
  line-height: 1;
}

.header-right {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
}


.refresh-overlay {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 19;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #fdfdfd;
  overflow: hidden;
  box-sizing: border-box;
  pointer-events: none;
  transition: height 0.12s ease, opacity 0.12s ease;
}

.refresh-overlay-text {
  font-size: 12px;
  color: #999999;
  font-weight: 400;
  line-height: 1;
}

.scroll-content {
  will-change: transform;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(216, 162, 93, 0.22);
  border-top-color: #d8a25d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner.tiny {
  width: 14px;
  height: 14px;
  border-width: 2px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.notice-scroll {
  position: fixed;
  left: 0;
  right: 0;
  overflow: hidden;
  background: #fdfdfd;
}

.notice-list {
  padding: 0 10px;
  box-sizing: border-box;
}

.notice-item {
  display: flex;
  align-items: center;
  padding: 0 2px;
  background: #fdfdfd;
  border-bottom: none;
  box-sizing: border-box;
}

.notice-item:active {
  background: #f8f8f8;
}

.avatar-wrapper {
  flex-shrink: 0;
  margin-right: 10px;
}

.avatar {
  border: none;
  box-sizing: border-box;
  background: #f3f3f3;
}

.notice-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
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
  display: block;
  font-weight: 400;
  color: #222;
  line-height: 1.15;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agg-prefix {
  color: #f5a623;
  font-weight: 400;
  line-height: 1.15;
  flex-shrink: 0;
  margin-right: 3px;
}

.notice-text {
  font-weight: 400;
  color: #666;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  font-weight: 400;
  color: #999;
  line-height: 1.15;
}

.ref-cover {
  border-radius: 8px;
  overflow: hidden;
  margin-left: 10px;
  flex-shrink: 0;
  border: none;
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
  margin-bottom: 10px;
  font-weight: 400;
  color: #d8a25d;
  line-height: 1;
}

.empty-text {
  font-weight: 400;
}

.footer {
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-weight: 400;
}
</style>