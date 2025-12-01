<template>
    <view class="conversation-container">
        <!-- 顶部标题栏 -->
        <view class="header-bar">
            <text class="header-title">消息</text>
            <view class="header-actions">
                <view class="action-btn" @click="showDropdown = !showDropdown">
                    <text class="action-icon">➕</text>
                </view>
            </view>
        </view>
        
        <!-- 下拉菜单 -->
        <view class="dropdown-overlay" v-if="showDropdown" @click="showDropdown = false">
            <view class="dropdown-menu" @click.stop>
                <view class="dropdown-item" @click="goToCreateConversationPage">
                    <text class="item-icon">👥</text>
                    <text class="item-text">创建群聊</text>
                </view>
                <view class="dropdown-item" @click="goToAIPage">
                    <text class="item-icon">🤖</text>
                    <text class="item-text">AI问答</text>
                </view>
            </view>
        </view>
        
        <!-- 会话列表 -->
        <scroll-view class="conversation-scroll" scroll-y>
            <view class="conversation-list">
                <view 
                    class="conversation-item" 
                    v-for="(conversation, index) in conversationList" 
                    :key="index"
                    @click="openChat(conversation)"
                >
                    <!-- 头像 -->
                    <view class="avatar-wrapper">
                        <image class="avatar" :src="conversation.avatar_uri" mode="aspectFill"></image>
                        <view 
                            class="unread-badge" 
                            v-if="conversation.badge_count - conversation.read_badge_count > 0"
                        >
                            {{ conversation.badge_count - conversation.read_badge_count > 99 ? '99+' : conversation.badge_count - conversation.read_badge_count }}
                        </view>
                    </view>
                    
                    <!-- 会话信息 -->
                    <view class="conversation-content">
                        <view class="conversation-header">
                            <text class="conversation-name">{{ conversation.name }}</text>
                            <text class="conversation-time">{{ formatTime(conversation.create_time) }}</text>
                        </view>
                        <view class="conversation-message">
                            <text class="last-message">{{ conversation.last_message || '暂无消息' }}</text>
                        </view>
                    </view>
                </view>
                
                <!-- 空状态 -->
                <view v-if="conversationList.length === 0" class="empty-state">
                    <text class="empty-icon">💬</text>
                    <text class="empty-text">暂无消息</text>
                    <text class="empty-hint">开始你的第一次对话吧！</text>
                </view>
            </view>
        </scroll-view>
    </view>
</template>

<script>
import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js';

export default {
    data() {
        return {
            userConIndex: getApp().globalData.userConIndex,
            conversationList: [],
            showDropdown: false,
            normalListener: null,
            commandListener: null,
        };
    },
    onLoad() {
        DB.pullConversation(this.userConIndex)
           .then((res) => {
                this.conversationList = res;
            })
           .catch((err) => {
                console.error('pullConversation err', err);
            })
        this.normalListener=uni.$on('normal', (data) => {
            this.userConIndex = data.user_con_index;
            let index = -1;
            for (let i = 0; i < this.conversationList.length; i++) {
                if (this.conversationList[i].con_id == data.msg_body.con_id) {
                    this.conversationList[i].badge_count = Number(data.badge_count);
                    this.conversationList[i].user_con_index = data.user_con_index;
                    this.conversationList[i].last_message = data.msg_body.msg_content;
                    index = i;
                    break;
                }
            }
            if (index !== -1) {
                const conversation = this.conversationList.splice(index, 1)[0];
                this.conversationList.unshift(conversation);
            }else{
                DB.selectConversation(data.msg_body.con_id)
                .then((res)=>{
					console.log(res);
                    this.conversationList=res.concat(this.conversationList);
                })
            }
        });
        this.commandListener=uni.$on('command', (data) => {
            for (let i = 0; i < this.conversationList.length; i++) {
                if (this.conversationList[i].con_id == data.msg_body.con_id) {
                    const cmdMessage = JSONbig.parse(data.msg_body.msg_content);
                    if (data.msg_body.msg_type == 101) {
                        this.conversationList[i].read_index_end = cmdMessage.read_index_end;
                        this.conversationList[i].read_badge_count = cmdMessage.read_badge_count;
                    } else if (data.msg_body.msg_type == 102) {

                    }
                    break;
                }
            }
        });
    },
    onUnload() {
        uni.$off('normal',this.normalListener);
        uni.$off('command',this.commandListener);
    },
    methods: {
        goToCreateConversationPage() {
            this.showDropdown = false;
            uni.navigateTo({
                url: '/pages/im/create'
            });
        },
        goToAIPage() {
            this.showDropdown = false;
            const userId = getApp().globalData.userId;
            const conId=`4:${userId}`
            uni.navigateTo({
                url: `/pages/im/conversation?conId=${conId}&name=AI&conType=4`
            });
        },
        openChat(conversation) {
            uni.navigateTo({
                url: `/pages/im/conversation?conId=${conversation.con_id}&name=${conversation.name}&conType=${conversation.con_type}`
            });
        },
        formatTime(timestamp) {
            const now = Date.now() / 1000;
            const diff = now - timestamp;
            
            if (diff < 60) return '刚刚';
            if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
            if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
            if (diff < 604800) return Math.floor(diff / 86400) + '天前';
            
            const date = new Date(timestamp * 1000);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        }
    }
};
</script>

<style scoped>
.conversation-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f8f9fa;
}

/* ==================== 头部栏 ==================== */
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

.header-title {
    font-size: 20px;
    font-weight: bold;
    color: #fff;
}

.header-actions {
    display: flex;
    gap: 12px;
}

.action-btn {
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
}

.action-btn:active {
    transform: scale(0.95);
    background: rgba(255, 255, 255, 0.3);
}

.action-icon {
    font-size: 18px;
    color: #fff;
}

/* ==================== 下拉菜单 ==================== */
.dropdown-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999;
    animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.dropdown-menu {
    position: absolute;
    top: 60px;
    right: 16px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    animation: slideDown 0.3s ease;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.dropdown-item {
    display: flex;
    align-items: center;
    padding: 14px 20px;
    gap: 12px;
    transition: background 0.2s;
    border-bottom: 1px solid #f0f0f0;
}

.dropdown-item:last-child {
    border-bottom: none;
}

.dropdown-item:active {
    background: #f5f5f5;
}

.item-icon {
    font-size: 20px;
}

.item-text {
    font-size: 15px;
    color: #333;
    white-space: nowrap;
}

/* ==================== 会话列表 ==================== */
.conversation-scroll {
    flex: 1;
    overflow: hidden;
}

.conversation-list {
    padding: 8px 0;
}

.conversation-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #fff;
    margin-bottom: 1px;
    transition: background 0.2s;
}

.conversation-item:active {
    background: #f5f5f5;
}

/* 头像 */
.avatar-wrapper {
    position: relative;
    flex-shrink: 0;
    margin-right: 12px;
}

.avatar {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    border: 2px solid #f0f0f0;
}

.unread-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
}

/* 会话内容 */
.conversation-content {
    flex: 1;
    overflow: hidden;
}

.conversation-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}

.conversation-name {
    font-size: 16px;
    font-weight: 600;
    color: #333;
}

.conversation-time {
    font-size: 12px;
    color: #999;
    margin-left: 8px;
}

.conversation-message {
    display: flex;
    align-items: center;
}

.last-message {
    font-size: 14px;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
