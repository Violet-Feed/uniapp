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
          :key="String(n.notice_id || idx)"
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
              <!-- 可聚合：等N人（可点击进入聚合页） -->
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

          <!-- 右侧引用封面 -->
          <view class="ref-cover" v-if="n.ref_id && n.ref_cover_url">
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
      // enum NoticeGroup: 1 System, 2 Follow, 3 Action
      group: 2,

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
      if (Number(this.group) === 2) return '关注通知'
      if (Number(this.group) === 3) return '互动通知'
      if (Number(this.group) === 1) return '系统通知'
      return '通知'
    }
  },
  async onLoad(options) {
    const g = Number(options.group)
    this.group = g || 2
	await markNoticeRead({ group: Number(this.group) })
    this.loadNotices(true)
  },
  methods: {
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

    // ========= 数据加载 =========
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

    // ========= 展示与解析 =========
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
      // NoticeType:
      // 1 System, 2 Follow, 3 Digg, 4 DiggComment, 5 CreateComment, 6 CreateReply
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

    // ========= 点击行为 =========
    goToUser(userId) {
      const uid = encodeURIComponent(String(userId || ''))
      if (!uid) return
      uni.navigateTo({
        url: `/pages/user/user_profile?userId=${uid}`
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

      // 约定：ref_type=2 -> 视频；否则图片（如与你后端枚举不同，改这里即可）
      const isVideo = Number(n.ref_type) === 2
      const basePath = isVideo
        ? '/pages/creation/creation_video'
        : '/pages/creation/creation_image'

      uni.navigateTo({
        url: `${basePath}?creationId=${creationId}&userId=${userId}`
      })
    },

    // ========= 工具函数 =========
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

.agg-prefix {
  font-size: 14px;
  color: #5b7dff;
  flex-shrink: 0;
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
