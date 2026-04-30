<template>
  <view v-if="visible" class="forward-mask" @click="handleClose">
    <view class="forward-panel" @click.stop>
      <view class="forward-header">
        <text class="forward-title">{{ title }}</text>
        <text class="forward-close" @click="handleClose">×</text>
      </view>

      <scroll-view
        class="forward-scroll"
        scroll-y
        @scrolltolower="handleScrollToLower"
      >
        <view v-if="loading && list.length === 0" class="forward-empty">
          <text>加载中...</text>
        </view>

        <view v-else-if="list.length === 0" class="forward-empty">
          <text>{{ emptyText }}</text>
        </view>

        <view v-else class="forward-list">
          <view
            class="forward-item"
            v-for="item in list"
            :key="item.key"
            @click="handleSelect(item)"
          >
            <image class="forward-avatar" :src="item.avatar" mode="aspectFill"></image>
            <view class="forward-info">
              <text class="forward-name">{{ item.name }}</text>
            </view>
            <view class="forward-status">
              <view v-if="forwardingKey === item.key" class="forward-loading"></view>
              <text v-else class="forward-arrow">›</text>
            </view>
          </view>
        </view>

        <view v-if="mode === 'friend' && loading && list.length > 0" class="forward-footer">
          <text>加载中...</text>
        </view>

      </scroll-view>
    </view>
  </view>
</template>

<script>
import DB from '@/utils/sqlite.js'
import { getFriendList, forward } from '@/request/action.js'

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
      forwardingKey: ''
    }
  },

  computed: {
    title() {
      return this.mode === 'friend' ? '分享给朋友' : '分享到聊天'
    },

    emptyText() {
      return this.mode === 'friend' ? '暂无可分享的朋友' : '暂无可分享的聊天'
    }
  },

  watch: {
    visible(val) {
      if (val) {
        this.init()
      }
    },

    mode() {
      if (this.visible) {
        this.init()
      }
    }
  },

  methods: {
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

        const rawList = Array.isArray(res?.user_infos) ? res.user_infos : []
        const mapped = rawList.map(u => ({
          key: `friend_${String(u.user_id || '')}`,
          type: 'friend',
          userId: String(u.user_id || ''),
          name: u.username || '用户',
          avatar: u.avatar || '/static/user_avatar.png'
        })).filter(item => item.userId)

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
  height: 72vh;
  background: #fff;
  border-radius: 18px 18px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  overflow: hidden;
}

.forward-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-bottom: 1px solid #f2f2f2;
}

.forward-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.forward-close {
  position: absolute;
  right: 16px;
  top: 0;
  height: 52px;
  line-height: 52px;
  font-size: 26px;
  color: #999;
}

.forward-scroll {
  height: calc(72vh - 52px);
}

.forward-list {
  padding: 4px 0;
}

.forward-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #fff;
}

.forward-item::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 0;
  height: 1px;
  background: linear-gradient(to right, transparent 0%, rgba(225, 228, 232, 0.45) 18%, rgba(225, 228, 232, 0.45) 82%, transparent 100%);
  pointer-events: none;
}

.forward-item:active {
  background: #f7f7f7;
}

.forward-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f2f2f2;
  flex-shrink: 0;
}

.forward-info {
  flex: 1;
  min-width: 0;
  margin-left: 12px;
}

.forward-name {
  font-size: 15px;
  color: #333;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.forward-status {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.forward-arrow {
  font-size: 24px;
  color: #bbb;
}

.forward-loading {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(102, 126, 234, 0.25);
  border-top-color: #667eea;
  animation: spin 0.8s linear infinite;
}

.forward-empty {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.forward-footer {
  padding: 10px 0 14px;
  text-align: center;
  color: #999;
  font-size: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
