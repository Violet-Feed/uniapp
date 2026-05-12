<template>
  <view v-if="visible" class="forward-mask" @click="handleClose">
    <view class="forward-panel" :style="panelStyle" @click.stop>
      <view class="forward-header" :style="headerStyle">
        <text class="forward-title" :style="titleStyle">{{ title }}</text>
        <text class="forward-close" :style="closeStyle" @click="handleClose">×</text>
      </view>

      <scroll-view
        class="forward-scroll"
        :style="scrollStyle"
        scroll-y
        @scrolltolower="handleScrollToLower"
      >
        <view v-if="loading && list.length === 0" class="forward-empty" :style="emptyStyle">
          <text class="forward-empty-text" :style="emptyTextStyle">加载中...</text>
        </view>

        <view v-else-if="list.length === 0" class="forward-empty" :style="emptyStyle">
          <text class="forward-empty-text" :style="emptyTextStyle">{{ emptyText }}</text>
        </view>

        <view v-else class="forward-list">
          <view
            class="forward-item"
            :style="itemStyle"
            v-for="item in list"
            :key="item.key"
            @click="handleSelect(item)"
          >
            <image
              class="forward-avatar"
              :style="avatarStyle"
              :src="item.avatar"
              mode="aspectFill"
            ></image>

            <view class="forward-info">
              <text class="forward-name" :style="nameStyle">{{ item.name }}</text>
            </view>

            <view class="forward-status" :style="statusStyle">
              <view v-if="forwardingKey === item.key" class="forward-loading"></view>
              <text v-else class="forward-arrow" :style="arrowStyle">›</text>
            </view>
          </view>
        </view>

        <view
          v-if="mode === 'friend' && loading && list.length > 0"
          class="forward-footer"
          :style="footerStyle"
        >
          <text class="forward-footer-text" :style="footerTextStyle">加载中...</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import DB from '@/utils/sqlite.js'
import { getFriendList, forward } from '@/request/action.js'

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value))
}

export default {
  name: 'ForwardPicker',

  props: {
    visible: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: 'conversation'
    },
    entityType: {
      type: String,
      default: 'creation'
    },
    entityId: {
      type: [String, Number],
      default: ''
    }
  },

  data() {
    return {
      list: [],
      loading: false,
      hasMore: true,
      page: 1,
      forwardingKey: '',

      windowWidth: 375,
      windowHeight: 667,
      safeBottom: 0,
      panelHeight: 480,
      headerHeight: 50,
      itemHeight: 62,
      avatarSize: 44,
      titleFontSize: 16,
      nameFontSize: 15,
      emptyFontSize: 14,
      footerFontSize: 12,
      closeFontSize: 25,
      arrowFontSize: 23
    }
  },

  computed: {
    title() {
      return this.mode === 'friend' ? '分享给朋友' : '分享到聊天'
    },

    emptyText() {
      return this.mode === 'friend' ? '暂无可分享的朋友' : '暂无可分享的聊天'
    },

    panelStyle() {
      return {
        height: `${this.panelHeight}px`,
        paddingBottom: `${this.safeBottom}px`
      }
    },

    headerStyle() {
      return {
        height: `${this.headerHeight}px`
      }
    },

    scrollStyle() {
      return {
        height: `${Math.max(220, this.panelHeight - this.headerHeight - this.safeBottom)}px`
      }
    },

    itemStyle() {
      return {
        height: `${this.itemHeight}px`
      }
    },

    avatarStyle() {
      return {
        width: `${this.avatarSize}px`,
        height: `${this.avatarSize}px`,
        borderRadius: `${Math.floor(this.avatarSize / 2)}px`
      }
    },

    titleStyle() {
      return {
        fontSize: `${this.titleFontSize}px`
      }
    },

    nameStyle() {
      return {
        fontSize: `${this.nameFontSize}px`
      }
    },

    closeStyle() {
      return {
        height: `${this.headerHeight}px`,
        lineHeight: `${this.headerHeight}px`,
        fontSize: `${this.closeFontSize}px`
      }
    },

    statusStyle() {
      return {
        width: `${clamp(Math.floor(this.windowWidth * 0.09), 30, 42)}px`,
        height: `${clamp(Math.floor(this.itemHeight * 0.46), 26, 32)}px`
      }
    },

    arrowStyle() {
      return {
        fontSize: `${this.arrowFontSize}px`
      }
    },

    emptyStyle() {
      return {
        minHeight: `${clamp(Math.floor(this.panelHeight * 0.34), 140, 220)}px`
      }
    },

    emptyTextStyle() {
      return {
        fontSize: `${this.emptyFontSize}px`
      }
    },

    footerStyle() {
      return {
        height: `${clamp(Math.floor(this.itemHeight * 0.58), 32, 40)}px`
      }
    },

    footerTextStyle() {
      return {
        fontSize: `${this.footerFontSize}px`
      }
    }
  },

  watch: {
    visible(val) {
      if (val) {
        this.initLayout()
        this.init()
      }
    },

    mode() {
      if (this.visible) {
        this.init()
      }
    }
  },

  mounted() {
    this.initLayout()
  },

  methods: {
    initLayout() {
      try {
        const sys = uni.getSystemInfoSync()
        const width = Number(sys.windowWidth || 375)
        const height = Number(sys.windowHeight || 667)
        const safeAreaInsets = sys.safeAreaInsets || {}
        const safeBottom = Number(safeAreaInsets.bottom || 0)

        this.windowWidth = width
        this.windowHeight = height
        this.safeBottom = safeBottom

        this.panelHeight = clamp(Math.floor(height * 0.68), 420, Math.floor(height * 0.78))
        this.headerHeight = clamp(Math.floor(width * 0.13), 46, 54)
        this.itemHeight = clamp(Math.floor(width * 0.165), 58, 68)
        this.avatarSize = clamp(Math.floor(this.itemHeight * 0.68), 40, 48)

        this.titleFontSize = clamp(Math.floor(width * 0.041), 15, 17)
        this.nameFontSize = clamp(Math.floor(width * 0.039), 14, 16)
        this.emptyFontSize = clamp(Math.floor(width * 0.036), 13, 15)
        this.footerFontSize = clamp(Math.floor(width * 0.032), 11, 13)
        this.closeFontSize = clamp(Math.floor(width * 0.068), 24, 28)
        this.arrowFontSize = clamp(Math.floor(width * 0.064), 22, 26)
      } catch (err) {
        this.windowWidth = 375
        this.windowHeight = 667
        this.safeBottom = 0
        this.panelHeight = 480
        this.headerHeight = 50
        this.itemHeight = 62
        this.avatarSize = 44
      }
    },

    async init() {
      this.list = []
      this.page = 1
      this.hasMore = true
      this.forwardingKey = ''

      if (this.mode === 'friend') {
        await this.loadFriends(true)
      } else {
        await this.loadConversations()
      }
    },

    async loadConversations() {
      if (this.loading) return
      this.loading = true

      try {
        const rows = await DB.pullAllConversation()
        const conversations = Array.isArray(rows) ? rows : []

        this.list = conversations
          .filter(item => item && Number(item.status || 0) === 0)
          .map(item => ({
            key: `conversation_${String(item.con_id)}`,
            type: 'conversation',
            conShortId: item.con_short_id || 0,
            conId: item.con_id || '',
            conType: item.con_type,
            name: item.name || '聊天',
            avatar: item.avatar_uri || '/static/conv_avatar.png'
          }))
          .filter(item => item.conId)

        this.hasMore = false
      } catch (err) {
        console.error('loadConversations failed', err)
        uni.showToast({ title: '聊天加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    async loadFriends(reset = false) {
      if (this.loading) return
      if (!reset && !this.hasMore) return

      const userId = getApp().globalData.userId
      if (!userId) return

      this.loading = true
      const pageToLoad = reset ? 1 : this.page + 1

      try {
        const res = await getFriendList({
          userId,
          page: pageToLoad
        })

        const rawList = Array.isArray(res && res.user_infos) ? res.user_infos : []
        const mapped = rawList
          .map(u => ({
            key: `friend_${String(u.user_id || '')}`,
            type: 'friend',
            userId: String(u.user_id || ''),
            name: u.username || '用户',
            avatar: u.avatar || '/static/user_avatar.png'
          }))
          .filter(item => item.userId)

        if (reset) {
          this.list = mapped
          this.page = 1
        } else {
          this.list = this.list.concat(mapped)
          this.page = pageToLoad
        }

        this.hasMore = rawList.length >= 10
      } catch (err) {
        console.error('loadFriends failed', err)
        uni.showToast({ title: '朋友加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    handleScrollToLower() {
      if (this.mode === 'friend') {
        this.loadFriends(false)
      }
    },

    async handleSelect(item) {
      if (!item || this.forwardingKey) return

      if (!this.entityId) {
        uni.showToast({ title: '分享内容不存在', icon: 'none' })
        return
      }

      this.forwardingKey = item.key

      try {
        const payload = this.buildForwardPayload(item)
        const ok = await forward(payload)

        if (!ok) {
          throw new Error('forward returned false')
        }

        uni.showToast({ title: '分享成功', icon: 'none' })
        this.$emit('success', {
          mode: this.mode,
          target: item,
          count: 1
        })
      } catch (err) {
        console.error('forward failed', err)
        uni.showToast({ title: '分享失败', icon: 'none' })
      } finally {
        this.forwardingKey = ''
      }
    },

    buildForwardPayload(item) {
      if (item.type === 'friend') {
        return {
          entityType: this.entityType,
          entityId: this.entityId,
          conShortId: 0,
          conId: this.buildFriendConId(item.userId),
          conType: 1
        }
      }

      return {
        entityType: this.entityType,
        entityId: this.entityId,
        conShortId: item.conShortId,
        conId: item.conId,
        conType: item.conType
      }
    },

    buildFriendConId(friendUserId) {
      const myId = String(getApp().globalData.userId || '')
      const otherId = String(friendUserId || '')
      if (!myId || !otherId) return ''

      try {
        const a = BigInt(myId)
        const b = BigInt(otherId)
        return a < b ? `${a}:${b}` : `${b}:${a}`
      } catch (e) {
        return `${myId}:${otherId}`
      }
    },

    handleClose() {
      if (this.forwardingKey) return
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.forward-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 400;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: flex-end;
}

.forward-panel {
  width: 100%;
  background: #fff;
  border-radius: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.forward-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-bottom: 1px solid #f2f2f2;
  box-sizing: border-box;
}

.forward-title {
  font-weight: 400;
  color: #333;
  line-height: 1;
}

.forward-close {
  position: absolute;
  right: 16px;
  top: 0;
  color: #999;
  font-weight: 400;
}

.forward-list {
  padding: 4px 0;
}

.forward-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #fff;
  box-sizing: border-box;
}

.forward-item::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 0;
  height: 1px;
  background: rgba(225, 228, 232, 0.65);
  transform: scaleY(0.5);
  transform-origin: center;
  pointer-events: none;
}

.forward-item:active {
  background: #f7f7f7;
}

.forward-avatar {
  background: #f2f2f2;
  flex-shrink: 0;
}

.forward-info {
  flex: 1;
  min-width: 0;
  margin-left: 12px;
}

.forward-name {
  display: block;
  color: #333;
  line-height: 1.4;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.forward-status {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.forward-arrow {
  color: #bbb;
  font-weight: 400;
  line-height: 1;
}

.forward-loading {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(253, 231, 209, 0.65);
  border-top-color: #8a5a2b;
  animation: spin 0.8s linear infinite;
  box-sizing: border-box;
}

.forward-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.forward-empty-text {
  color: #999;
  font-weight: 400;
  line-height: 1.4;
}

.forward-footer {
  display: flex;
  align-items: center;
  justify-content: center;
}

.forward-footer-text {
  color: #999;
  font-weight: 400;
  line-height: 1;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>