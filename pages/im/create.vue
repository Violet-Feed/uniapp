<template>
    <view class="create-group-container">
        <!-- 顶部栏 -->
        <view class="header-bar">
            <view class="back-btn" @click="goBack">
                <text class="back-icon">←</text>
            </view>
            <text class="header-title">选择联系人</text>
            <view 
                class="confirm-btn" 
                :class="{ 'confirm-btn-active': selectedCount > 0 }"
                @click="createConversation"
            >
                <text class="confirm-text">创建</text>
                <text class="confirm-count" v-if="selectedCount > 0">({{ selectedCount }})</text>
            </view>
        </view>
        
        <!-- 已选择成员预览 -->
        <view class="selected-preview" v-if="selectedCount > 0">
            <scroll-view class="selected-scroll" scroll-x>
                <view class="selected-list">
                    <view 
                        class="selected-item" 
                        v-for="(user, index) in userList.filter(u => u.selected)" 
                        :key="index"
                    >
                        <view class="selected-avatar-wrapper">
                            <image class="selected-avatar" :src="user.avatar" mode="aspectFill"></image>
                            <view class="remove-badge" @click.stop="toggleUserSelection(userList.indexOf(user))">
                                <text class="remove-icon">✕</text>
                            </view>
                        </view>
                        <text class="selected-name">{{ user.username }}</text>
                    </view>
                </view>
            </scroll-view>
        </view>
        
        <!-- 好友列表 -->
        <scroll-view
            class="friend-scroll"
            scroll-y
            :lower-threshold="120"
            @scrolltolower="loadMore"
            refresher-enabled
            :refresher-triggered="refreshing"
            @refresherrefresh="onRefresh"
        >
            <view class="friend-list">
                <view 
                    class="friend-item" 
                    v-for="(user, index) in userList" 
                    :key="index"
                    @click="toggleUserSelection(index)"
                >
                    <!-- 头像 -->
                    <view class="avatar-wrapper">
                        <image class="avatar" :src="user.avatar" mode="aspectFill"></image>
                    </view>
                    
                    <!-- 用户信息 -->
                    <view class="user-info">
                        <text class="user-name">{{ user.username }}</text>
                        <text class="user-bio" v-if="user.bio">{{ user.bio }}</text>
                    </view>
                    
                    <!-- 选择框 -->
                    <view class="checkbox-wrapper">
                        <view class="custom-checkbox" :class="{ 'checkbox-checked': user.selected }">
                            <text class="checkbox-icon" v-if="user.selected">✓</text>
                        </view>
                    </view>
                </view>
                
                <!-- 空状态 -->
                <view v-if="userList.length === 0" class="empty-state">
                    <text class="empty-icon">👥</text>
                    <text class="empty-text">暂无好友</text>
                    <text class="empty-hint">快去添加好友吧！</text>
                </view>
            </view>
        </scroll-view>
    </view>
</template>

<script>
import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js'
import { getFriendList } from '@/request/action.js';
import { createConversation } from '@/request/im';

export default {
    data() {
        return {
            userList: [],

            // 分页
            page: 1,
            hasMore: true,
            pageSize: 20,

            loading: false,
            loadingMore: false,
            refreshing: false
        };
    },
    computed: {
        selectedCount() {
            return this.userList.filter(user => user.selected).length;
        }
    },
    onLoad() {
        this.loadFriendList(true);
    },
    methods: {
        goBack() {
            uni.navigateBack();
        },

        toggleUserSelection(index) {
            this.userList[index].selected = !this.userList[index].selected;
        },

        async onRefresh() {
            this.refreshing = true;
            const p = this.loadFriendList(true);
            Promise.resolve(p).finally(() => {
                this.refreshing = false;
            });
        },

        loadMore() {
            this.loadFriendList(false);
        },

        async loadFriendList(reset = false) {
            if (this.loading || this.loadingMore) return;
            if (!reset && !this.hasMore) return;

            if (reset) {
                this.page = 1;
                this.hasMore = true;
                this.loading = true;
            } else {
                this.loadingMore = true;
            }

            const payload = {
                userId: String(getApp().globalData.userId || ''),
                page: this.page
            };

            let res;
            try {
                res = await getFriendList(payload);
            } catch (e) {
                res = undefined;
            }

            const list = res && Array.isArray(res.user_infos) ? res.user_infos : [];

            if (reset) this.userList = [];

            if (list.length === 0) {
                this.hasMore = false;
                this.loading = false;
                this.loadingMore = false;
                this.refreshing = false;
                return;
            }

            // 去重（防止分页重复）
            const exist = new Set(this.userList.map(u => String(u.user_id || u.userId || '')));
            const mapped = list
                .map((u) => ({
                    // 兼容下划线字段
                    user_id: String(u.user_id || u.userId || ''),
                    username: u.username || '未知用户',
                    avatar: u.avatar && u.avatar !== '' ? u.avatar : '/static/user_avatar.png',
                    bio: u.bio,
                    selected: false
                }))
                .filter(u => u.user_id && !exist.has(u.user_id));

            this.userList = this.userList.concat(mapped);

            this.hasMore = list.length >= this.pageSize;
            this.page += 1;

            this.loading = false;
            this.loadingMore = false;
            this.refreshing = false;
        },

        async createConversation() {
          const selectedUserIds = this.userList
            .filter(user => user.selected)
            .map(user => user.user_id);
          if (selectedUserIds.length === 0) {
            uni.showToast({
              title: "请至少选择一位好友",
              icon: "none"
            });
            return;
          }
        
          const res = await createConversation({
            members: selectedUserIds
          });
          if (!res) return;
        
          uni.showToast({
            title: "创建成功",
            icon: "success"
          });
          setTimeout(() => {
            uni.redirectTo({
              url: `/pages/im/conversation?conId=${res.con_id}&name=群聊&conType=${res.con_type}`
            });
          }, 200);
        }
    }
};
</script>

<style scoped>
.create-group-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f8f9fa;
}

/* ==================== 顶部栏 ==================== */
.header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: sticky;
    top: 0;
    z-index: 100;
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

.confirm-btn {
    padding: 6px 16px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.3s;
}

.confirm-btn-active {
    background: #fff;
}

.confirm-btn-active .confirm-text,
.confirm-btn-active .confirm-count {
    color: #667eea;
}

.confirm-text {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
}

.confirm-count {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
}

/* ==================== 已选择预览 ==================== */
.selected-preview {
    background: #fff;
    padding: 12px 0;
    border-bottom: 1px solid #e5e5e5;
}

.selected-scroll {
    white-space: nowrap;
}

.selected-list {
    display: inline-flex;
    padding: 0 16px;
    gap: 16px;
}

.selected-item {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}

.selected-avatar-wrapper {
    position: relative;
}

.selected-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid #667eea;
}

.remove-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
}

.remove-icon {
    font-size: 10px;
    color: #fff;
    font-weight: bold;
}

.selected-name {
    font-size: 12px;
    color: #666;
    max-width: 50px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ==================== 好友列表 ==================== */
.friend-scroll {
    flex: 1;
    overflow: hidden;
}

.friend-list {
    padding: 8px 0;
}

.friend-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #fff;
    margin-bottom: 1px;
    transition: background 0.2s;
}

.friend-item:active {
    background: #f5f5f5;
}

/* 头像 */
.avatar-wrapper {
    flex-shrink: 0;
    margin-right: 12px;
}

.avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid #f0f0f0;
}

/* 用户信息 */
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

.user-bio {
    font-size: 13px;
    color: #999;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 选择框 */
.checkbox-wrapper {
    flex-shrink: 0;
    margin-left: 12px;
}

.custom-checkbox {
    width: 22px;
    height: 22px;
    border: 2px solid #ddd;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
}

.checkbox-checked {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: #667eea;
}

.checkbox-icon {
    font-size: 14px;
    font-weight: bold;
    color: #fff;
}

/* ==================== 空状态 ==================== */
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
    font-size: 16px;
    color: #666;
    margin-bottom: 8px;
}

.empty-hint {
    font-size: 14px;
    color: #999;
}
</style>