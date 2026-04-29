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
                <view class="dropdown-item" @click="goToAgentPage">
                    <text class="item-icon">🤖</text>
                    <text class="item-text">管理智能体</text>
                </view>
            </view>
        </view>

        <!-- 会话列表 -->
        <scroll-view class="conversation-scroll" scroll-y>
            <view class="conversation-list">
                <!-- 固定通知入口 -->
                <view class="notice-row">
                    <view class="notice-card" @click="openNotice(NOTICE_GROUP.SYSTEM)">
                        <view class="notice-avatar-wrapper">
                            <image class="notice-avatar" src="/static/notice.png" mode="aspectFill"></image>
                            <view class="unread-badge" v-if="systemNoticeCount > 0">
                                {{ systemNoticeCount > 99 ? '99+' : systemNoticeCount }}
                            </view>
                        </view>
                        <text class="notice-name">系统通知</text>
                    </view>

                    <view class="notice-card" @click="openNotice(NOTICE_GROUP.FOLLOW)">
                        <view class="notice-avatar-wrapper">
                            <image class="notice-avatar" src="/static/notice.png" mode="aspectFill"></image>
                            <view class="unread-badge" v-if="followNoticeCount > 0">
                                {{ followNoticeCount > 99 ? '99+' : followNoticeCount }}
                            </view>
                        </view>
                        <text class="notice-name">关注通知</text>
                    </view>

                    <view class="notice-card" @click="openNotice(NOTICE_GROUP.ACTION)">
                        <view class="notice-avatar-wrapper">
                            <image class="notice-avatar" src="/static/notice.png" mode="aspectFill"></image>
                            <view class="unread-badge" v-if="actionNoticeCount > 0">
                                {{ actionNoticeCount > 99 ? '99+' : actionNoticeCount }}
                            </view>
                        </view>
                        <text class="notice-name">互动通知</text>
                    </view>
                </view>

                <!-- 普通会话列表 -->
                <view
                    class="conversation-item"
                    v-for="(conversation, index) in conversationList"
                    :key="conversation.con_id || index"
                    @click="openChat(conversation)"
                    @touchstart="onConversationTouchStart"
                    @touchmove="onConversationTouchMove"
                    @touchend="onConversationTouchEnd"
                    @touchcancel="onConversationTouchEnd"
                    @longpress.stop="showDeleteConversationAction($event, conversation)"
                >
                    <view class="avatar-wrapper">
                        <image class="avatar" :src="conversation.avatar_uri" mode="aspectFill"></image>
                        <view
                            class="unread-badge"
                            v-if="conversation.badge_count - conversation.read_badge_count > 0"
                        >
                            {{
                                conversation.badge_count - conversation.read_badge_count > 99
                                    ? '99+'
                                    : conversation.badge_count - conversation.read_badge_count
                            }}
                        </view>
                    </view>

                    <view class="conversation-content">
                        <view class="conversation-header">
                            <text class="conversation-name">{{ conversation.name }}</text>
                            <text class="conversation-time" v-if="conversation.last_message_time">
                                {{ formatTime(conversation.last_message_time) }}
                            </text>
                        </view>
                        <view class="conversation-message">
                            <text class="last-message">{{ conversation.last_message || '' }}</text>
                        </view>
                    </view>
                </view>

                <view v-if="conversationList.length === 0" class="empty-state">
                    <text class="empty-icon">💬</text>
                    <text class="empty-hint">开始你的第一次对话吧！</text>
                </view>
            </view>
        </scroll-view>

        <!-- 长按会话操作菜单 -->
        <view class="conversation-action-mask" v-if="conversationAction.visible" @click="hideConversationAction">
            <view
                class="conversation-action-menu"
                :style="{ left: conversationAction.left + 'px', top: conversationAction.top + 'px' }"
                @click.stop
            >
                <view class="conversation-action-item danger-action" @click="confirmDeleteSelectedConversation">
                    删除
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js';
import { getNoitceCount, updateConversationSetting, markRead } from '@/request/im.js';
import { getMemberInfosBySendersEnsure } from '@/utils/member_info';

export default {
    data() {
        return {
            NOTICE_GROUP: {
                SYSTEM: 1,
                FOLLOW: 2,
                ACTION: 3
            },

            userConIndex: getApp().globalData.userConIndex,
            conversationList: [],
            showDropdown: false,
            normalListener: null,
            commandListener: null,
            noticeListener: null,
            deletingConId: '',

            conversationTouch: {
                startX: 0,
                startY: 0,
                moved: false
            },

            conversationAction: {
                visible: false,
                left: 0,
                top: 0,
                conversation: null
            },

            systemNoticeCount: 0,
            followNoticeCount: 0,
            actionNoticeCount: 0
        };
    },

    onLoad() {
        DB.pullConversation(this.userConIndex)
            .then((res) => {
                this.conversationList = Array.isArray(res) ? res : [];
            })
            .catch((err) => {
                console.error('pullConversation err', err);
            });

        this.normalListener = uni.$on('normal', (data) => {
            this.userConIndex = data.user_con_index;
            let index = -1;

            for (let i = 0; i < this.conversationList.length; i++) {
                if (this.conversationList[i].con_id == data.msg_body.con_id) {
                    this.conversationList[i].badge_count = Number(data.badge_count);
                    this.conversationList[i].user_con_index = data.user_con_index;
                    this.conversationList[i].last_message_id = data.msg_body.msg_id;
                    this.conversationList[i].last_message = data.msg_body.msg_content;
                    this.conversationList[i].last_message_time = data.msg_body.create_time;
                    index = i;
                    break;
                }
            }

            if (index !== -1) {
                const conversation = this.conversationList.splice(index, 1)[0];
                this.conversationList.unshift(conversation);
            } else {
                DB.getConversationById(data.msg_body.con_id).then((res) => {
                    if (res) {
                        this.conversationList.unshift(res);
                    }
                });
            }
        });

        this.commandListener = uni.$on('command', async (data) => {
            for (let i = 0; i < this.conversationList.length; i++) {
                if (this.conversationList[i].con_id == data.msg_body.con_id) {
                    const cmdMessage = JSONbig.parse(data.msg_body.msg_content);

                    if (data.msg_body.msg_type == 100) {
                        if (cmdMessage.type == 3) {
                            this.conversationList[i].name = cmdMessage.content || '群聊';
                        } else if (cmdMessage.type == 4) {
                            this.conversationList[i].avatar_uri = cmdMessage.content || '/static/conv_avatar.png';
                        }
                    } else if (data.msg_body.msg_type == 101) {
                        this.conversationList[i].read_index_end = cmdMessage.read_index_end;
                        this.conversationList[i].read_badge_count = cmdMessage.read_badge_count;
                    } else if (data.msg_body.msg_type == 102) {
                        const msgId = cmdMessage.msg_id;
                        if (String(msgId) == String(this.conversationList[i].last_message_id)) {
                            const extraMap = JSONbig.parse(cmdMessage.extra || '{}');
                            const isRecall = extraMap.is_recall === true;
                            if (isRecall) {
                                let nickname = '用户';
                                const selfUserId = getApp().globalData.userId;

                                if (String(data.msg_body.sender_id) === String(selfUserId)) {
                                    nickname = '你';
                                } else {
                                    const members = await getMemberInfosBySendersEnsure(
                                        data.msg_body.con_id,
                                        data.msg_body.con_short_id,
                                        [
                                            {
                                                sender_type: 1,
                                                sender_id: data.msg_body.sender_id
                                            }
                                        ]
                                    );
                                    const member = Array.isArray(members) && members.length > 0 ? members[0] : null;
                                    nickname = member?.nick_name || '用户';
                                }

                                this.conversationList[i].last_message = `${nickname}撤回了一条消息`;
                            }
                        }
                    }

                    break;
                }
            }
        });

        this.noticeListener = uni.$on('notice', (data) => {
            const g = data && typeof data.group === 'number' ? data.group : 0;
            const op = data && typeof data.op_type === 'number' ? data.op_type : 0;

            const isSystem = g === this.NOTICE_GROUP.SYSTEM;
            const isFollow = g === this.NOTICE_GROUP.FOLLOW;
            const isAction = g === this.NOTICE_GROUP.ACTION;
            if (!isSystem && !isFollow && !isAction) return;

            if (op === 1) {
                if (isSystem) this.systemNoticeCount = Number(this.systemNoticeCount || 0) + 1;
                if (isFollow) this.followNoticeCount = Number(this.followNoticeCount || 0) + 1;
                if (isAction) this.actionNoticeCount = Number(this.actionNoticeCount || 0) + 1;
                return;
            }

            if (op === 2) {
                if (isSystem) this.systemNoticeCount = 0;
                if (isFollow) this.followNoticeCount = 0;
                if (isAction) this.actionNoticeCount = 0;
            }
        });

        this.loadNoticeCounts();
    },

    onUnload() {
        uni.$off('normal', this.normalListener);
        uni.$off('command', this.commandListener);
        uni.$off('notice', this.noticeListener);
    },

    methods: {
        async loadNoticeCounts() {
            let payload = { group: this.NOTICE_GROUP.SYSTEM };
            const systemRes = await getNoitceCount(payload);
            this.systemNoticeCount =
                systemRes && typeof systemRes.notice_count === 'number'
                    ? systemRes.notice_count
                    : 0;

            payload = { group: this.NOTICE_GROUP.FOLLOW };
            const followRes = await getNoitceCount(payload);
            this.followNoticeCount =
                followRes && typeof followRes.notice_count === 'number'
                    ? followRes.notice_count
                    : 0;

            payload = { group: this.NOTICE_GROUP.ACTION };
            const actionRes = await getNoitceCount(payload);
            this.actionNoticeCount =
                actionRes && typeof actionRes.notice_count === 'number'
                    ? actionRes.notice_count
                    : 0;
        },

        openNotice(group) {
            uni.navigateTo({
                url: `/pages/im/notice?group=${group}`
            });
        },

        goToCreateConversationPage() {
            this.showDropdown = false;
            uni.navigateTo({ url: '/pages/im/create' });
        },

        goToAgentPage() {
            this.showDropdown = false;
            uni.navigateTo({ url: '/pages/agent/agent_list' });
        },

        openChat(conversation) {
            if (this.conversationTouch.moved) return;

            uni.navigateTo({
                url: `/pages/im/conversation?conId=${conversation.con_id}&name=${conversation.name}&conType=${conversation.con_type}`
            });
        },

        onConversationTouchStart(e) {
            const touch = e?.changedTouches?.[0] || e?.touches?.[0] || {};
            this.conversationTouch = {
                startX: touch.clientX ?? touch.pageX ?? 0,
                startY: touch.clientY ?? touch.pageY ?? 0,
                moved: false
            };
        },

        onConversationTouchMove(e) {
            const touch = e?.changedTouches?.[0] || e?.touches?.[0] || {};
            const x = touch.clientX ?? touch.pageX ?? 0;
            const y = touch.clientY ?? touch.pageY ?? 0;

            const dx = Math.abs(x - this.conversationTouch.startX);
            const dy = Math.abs(y - this.conversationTouch.startY);

            if (dx > 8 || dy > 8) {
                this.conversationTouch.moved = true;
            }
        },

        onConversationTouchEnd() {
            setTimeout(() => {
                this.conversationTouch = {
                    startX: 0,
                    startY: 0,
                    moved: false
                };
            }, 80);
        },

        showDeleteConversationAction(e, conversation) {
            if (this.conversationTouch.moved) return;
            if (!conversation?.con_short_id || this.deletingConId) return;

            const point = this.getLongPressPoint(e);
            const menuWidth = 72;
            const menuHeight = 42;
            const sys = uni.getSystemInfoSync();

            let left = point.x - menuWidth / 2;
            let top = point.y - menuHeight - 12;

            left = Math.max(8, Math.min(left, sys.windowWidth - menuWidth - 8));
            if (top < 64) top = point.y + 12;
            top = Math.max(8, Math.min(top, sys.windowHeight - menuHeight - 8));

            this.conversationAction = {
                visible: true,
                left,
                top,
                conversation
            };
        },

        getLongPressPoint(e) {
            const touch =
                e?.changedTouches?.[0] ||
                e?.touches?.[0] ||
                e?.detail ||
                {};

            const sys = uni.getSystemInfoSync();
            const x = touch.clientX ?? touch.pageX ?? touch.x ?? sys.windowWidth / 2;
            const y = touch.clientY ?? touch.pageY ?? touch.y ?? sys.windowHeight / 2;

            return { x, y };
        },

        hideConversationAction() {
            this.conversationAction = {
                visible: false,
                left: 0,
                top: 0,
                conversation: null
            };
        },

        confirmDeleteSelectedConversation() {
            const conversation = this.conversationAction.conversation;
            this.hideConversationAction();
            if (!conversation) return;
            this.confirmDeleteConversation(conversation);
        },

        confirmDeleteConversation(conversation) {
            const name = conversation?.name || '该会话';

            uni.showModal({
                title: '删除会话',
                content: `确定删除「${name}」吗？`,
                confirmText: '删除',
                confirmColor: '#ff4d4f',
                success: res => {
                    if (res.confirm) {
                        this.deleteConversation(conversation);
                    }
                }
            });
        },

        async deleteConversation(conversation) {
            const conShortId = conversation?.con_short_id;
            const conId = conversation?.con_id;
            const lastMessageId = conversation?.last_message_id;

            if (!conShortId || !conId || !lastMessageId || this.deletingConId) return;

            this.deletingConId = String(conId);

            try {
                const messages = await DB.getMessagesByIds([lastMessageId]);
                const lastMessage = Array.isArray(messages) && messages.length > 0 ? messages[0] : null;

                if (!lastMessage || lastMessage.con_index === null || lastMessage.con_index === undefined) {
                    throw new Error('last message not found');
                }

                const unreadCount = Number(conversation.badge_count || 0) - Number(conversation.read_badge_count || 0);
                if (unreadCount > 0) {
                    const readOk = await markRead(conShortId, lastMessage.con_index, conversation.badge_count);
                    if (!readOk) {
                        throw new Error('markRead returned false');
                    }
                }

                const value = (BigInt(String(lastMessage.con_index)) + 1n).toString();
                const ok = await updateConversationSetting({
                    conShortId,
                    type: 'min_index',
                    value
                });

                if (!ok) {
                    throw new Error('updateConversationSetting returned false');
                }

                const map = new Map();
                map.set('status', 1);

                await DB.deleteMessagesByIndex(conId, lastMessage.con_index);
                await DB.updateConversation(conId, map);

                this.conversationList = this.conversationList.filter(
                    item => String(item.con_id) !== String(conId)
                );
            } catch (err) {
                console.error('deleteConversation failed', err);
                uni.showToast({
                    title: '删除失败',
                    icon: 'none'
                });
            } finally {
                this.deletingConId = '';
            }
        },

        formatTime(timestamp) {
            if (timestamp === null || timestamp === undefined || timestamp === '') return '';

            let value = Number(timestamp);
            if (!Number.isFinite(value) || value <= 0) return '';
            if (value > 1e12) value = Math.floor(value / 1000);

            const now = Date.now() / 1000;
            const diff = now - value;

            if (diff < 0) return '刚刚';
            if (diff < 60) return '刚刚';
            if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
            if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
            if (diff < 604800) return Math.floor(diff / 86400) + '天前';

            const date = new Date(value * 1000);
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
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
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

.notice-row {
    display: flex;
    align-items: center;
    background: #fff;
    margin-bottom: 5px;
    padding: 7px 16px;
}

.notice-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.notice-card:active {
    opacity: 0.75;
}

.notice-avatar-wrapper {
    position: relative;
    width: 38px;
    height: 38px;
    margin-bottom: 4px;
}

.notice-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2px solid #f0f0f0;
}

.notice-name {
    font-size: 12px;
    font-weight: 400;
    color: #333;
    line-height: 1.25;
}

.conversation-item {
    position: relative;
    display: flex;
    align-items: center;
    padding: 9px 16px;
    background: #fff;
    margin-bottom: 0;
    transition: background 0.2s;
}

.conversation-item::after {
    content: '';
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 0;
    height: 1px;
    background: linear-gradient(to right, transparent 0%, #e1e4e8 14%, #e1e4e8 86%, transparent 100%);
    pointer-events: none;
}

.conversation-item:active {
    background: #f5f5f5;
}

.avatar-wrapper {
    position: relative;
    flex-shrink: 0;
    margin-right: 12px;
}

.avatar {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: 2px solid #f0f0f0;
}

.unread-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: #fff;
    font-size: 10px;
    font-weight: 400;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
}

.conversation-content {
    flex: 1;
    overflow: hidden;
}

.conversation-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
}

.conversation-name {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    font-weight: 400;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conversation-time {
    font-size: 11px;
    font-weight: 400;
    color: #999;
    margin-left: 8px;
    flex-shrink: 0;
}

.conversation-message {
    display: flex;
    align-items: center;
    min-height: 18px;
}

.last-message {
    min-height: 18px;
    line-height: 18px;
    font-size: 13px;
    font-weight: 400;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conversation-action-mask {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
    background: transparent;
}

.conversation-action-menu {
    position: fixed;
    height: 42px;
    background: #ffffff;
    border-radius: 8px;
    display: flex;
    align-items: center;
    overflow: hidden;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
}

.conversation-action-item {
    min-width: 64px;
    height: 42px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #333333;
    box-sizing: border-box;
}

.conversation-action-item:active {
    background: #f5f5f5;
}

.danger-action {
    color: #333333;
}

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

.empty-hint {
    font-size: 14px;
    color: #999;
}
</style>