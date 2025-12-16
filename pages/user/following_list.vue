<template>
  <view class="user-list-container">
    <!-- 头部 -->
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="header-title">关注</text>
      <view class="header-right"></view>
    </view>

    <!-- 用户列表 -->
    <scroll-view
      class="user-list-scroll"
      scroll-y
      :lower-threshold="120"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="user-list" v-if="userList.length > 0">
        <view class="user-item" v-for="(user, index) in userList" :key="String(user.user_id || index)">
          <view class="user-left" @click="goToUserPage(user)">
            <view class="avatar-wrapper">
              <image class="avatar" :src="user.avatar || '/static/user_avatar.png'" mode="aspectFill"></image>
            </view>
            <view class="user-info">
              <view class="user-name-row">
                <text class="user-name">{{ user.username }}</text>
              </view>
              <text class="user-bio placeholder">这个人很懒，什么都没写~</text>
            </view>
          </view>

          <view class="user-right">
            <view
              class="follow-btn"
              :class="{ inactive: isFollowingState(user) }"
              @click.stop="onFollowBtnClick(user)"
            >
              <text class="btn-text">{{ followBtnText(user) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && userList.length === 0" class="empty-state">
        <text class="empty-icon">⭐</text>
        <text class="empty-text">还没有关注任何人</text>
        <text class="empty-hint">去发现有趣的人吧！</text>
      </view>

      <!-- footer -->
      <view v-if="userList.length > 0" class="footer">
        <text v-if="loadingMore">加载中...</text>
        <text v-else-if="!hasMore">没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { follow, unfollow, getFollowingList } from '@/request/action.js'

export default {
  data() {
    return {
      userId: '',
      page: 1,
      hasMore: true,

      userList: [],
      loading: false,
      loadingMore: false,
      refreshing: false
    }
  },
  onLoad(options) {
    this.userId = String(options.userId || '')
    this.loadUserList(true)
  },
  methods: {
    // ========== 下拉分页 ==========
    async loadUserList(reset = false) {
      if (this.loading || this.loadingMore) return
      if (!reset && !this.hasMore) return

      if (reset) {
        this.page = 1
        this.hasMore = true
        this.loading = true
      } else {
        this.loadingMore = true
      }

      const payload = { userId: this.userId, page: this.page }
      const res = await getFollowingList(payload)

      // 失败返回 undefined：不清空已有列表，只结束 loading
      if (!res) {
        this.loading = false
        this.loadingMore = false
        this.refreshing = false
        return
      }

      const list = Array.isArray(res.user_infos) ? res.user_infos : []

      if (list.length === 0) {
        if (reset) this.userList = []
        this.hasMore = false
        this.loading = false
        this.loadingMore = false
        this.refreshing = false
        return
      }

      // ★关键：下划线字段映射，保证按钮逻辑正确
      const mapped = list.map((u) => ({
        user_id: String(u.user_id || ''),
        username: u.username || '未知用户',
        avatar: u.avatar || '/static/user_avatar.png',
        is_following: this.toBool(u.is_following),
        is_follower: this.toBool(u.is_follower)
      }))

      if (reset) this.userList = mapped
      else this.userList = this.userList.concat(mapped)

      this.page += 1

      this.loading = false
      this.loadingMore = false
      this.refreshing = false
    },

    loadMore() {
      this.loadUserList(false)
    },

    async onRefresh() {
      this.refreshing = true
      const p = this.loadUserList(true)
      Promise.resolve(p).finally(() => {
        this.refreshing = false
      })
    },

    // ========== 四态文字 ==========
    followBtnText(user) {
      const f = this.toBool(user.is_following)
      const r = this.toBool(user.is_follower)
      if (f && r) return '互相关注'
      if (f && !r) return '已关注'
      if (!f && r) return '+ 回关'
      return '+ 关注'
    },

    // “已关注/互关”置灰；“关注/回关”走主色渐变
    isFollowingState(user) {
      return this.toBool(user.is_following)
    },

    async onFollowBtnClick(user) {
      if (!user || !user.user_id) return

      const me = getApp().globalData.userId
      const other = user.user_id

      // 当前已关注/互关 -> 取消关注（不删除列表，只改按钮）
      if (this.toBool(user.is_following)) {
        uni.showModal({
          title: '提示',
          content: `确定取消关注 ${user.username} 吗？`,
          success: async (r) => {
            if (!r.confirm) return
            const res = await unfollow(me, other)
            if (res) {
              user.is_following = false
              uni.showToast({ title: '已取消关注', icon: 'success' })
            }
          }
        })
        return
      }

      // 关注/回关 -> 关注
      const res = await follow(me, other)
      if (res) {
        user.is_following = true
        uni.showToast({ title: '关注成功', icon: 'success' })
      }
    },

    goBack() {
      uni.navigateBack()
    },

    goToUserPage(user) {
      const uid = String(user.user_id || '')
      if (!uid) return

      // 若点击自己，跳转我的主页
      const me = String(getApp().globalData.userId || '')
      if (me && uid === me) {
        uni.navigateTo({ url: '/pages/user/my_profile' })
        return
      }

      uni.navigateTo({
        url: `/pages/user/user_profile?userId=${encodeURIComponent(uid)}`
      })
    },

    toBool(v) {
      if (v === true) return true
      if (v === false) return false
      if (v === 1 || v === '1') return true
      if (v === 0 || v === '0') return false
      if (typeof v === 'string') return v.toLowerCase() === 'true'
      return !!v
    }
  }
}
</script>

<style scoped>
.user-list-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

/* 头部 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 24px;
  color: #fff;
}

.header-title {
  font-size: 17px;
  font-weight: bold;
  color: #fff;
}

.header-right {
  width: 36px;
}

/* 列表容器 */
.user-list-scroll {
  flex: 1;
  overflow: hidden;
}

.user-list {
  padding: 8px 0;
}

/* 用户卡片 */
.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  margin-bottom: 1px;
}

.user-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 2px solid #f0f0f0;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.user-bio.placeholder {
  font-size: 13px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-right {
  flex-shrink: 0;
  margin-left: 8px;
}

/* 按钮：主色渐变（关注/回关），灰色（已关注/互关） */
.follow-btn {
  padding: 7px 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
  transition: all 0.2s;
}

.follow-btn.inactive {
  background: #f0f0f0;
  box-shadow: none;
}

.follow-btn:active {
  transform: scale(0.96);
}

.btn-text {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.follow-btn.inactive .btn-text {
  color: #666;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 15px;
  color: #666;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: #999;
}

/* footer */
.footer {
  text-align: center;
  padding: 16px 0 22px;
  font-size: 13px;
  color: #999;
}
</style>
