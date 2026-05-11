<template>
    <view class="conversation-container">
        <!-- 顶部消息栏：包含状态栏 / 刘海区域，消息和加号位于下半部分 -->
        <view class="header-bar" :style="headerBarStyle">
            <view class="header-content" :style="headerContentStyle">
                <text class="header-title" :style="headerTitleDynamicStyle">消息</text>
                <view class="header-actions">
                    <view class="action-btn" :style="actionButtonStyle" @click="showDropdown = !showDropdown">
                        <text class="iconfont icon-jiahao action-icon" :style="actionIconDynamicStyle"></text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 下拉菜单 -->
        <view class="dropdown-overlay" v-if="showDropdown" @click="showDropdown = false">
            <view class="dropdown-menu" :style="dropdownMenuStyle" @click.stop>
                <view class="dropdown-item" @click="goToCreateConversationPage">
                    <text class="iconfont icon-qunliaox item-icon"></text>
                    <text class="item-text">创建群聊</text>
                </view>
                <view class="dropdown-item" @click="goToAgentPage">
                    <text class="iconfont icon-zhinengti item-icon"></text>
                    <text class="item-text">智能体管理</text>
                </view>
            </view>
        </view>

        <!-- 会话列表 -->
        <scroll-view
            class="conversation-scroll"
            :style="conversationScrollStyle"
            scroll-y
            lower-threshold="40"
            @scroll="onConversationScroll"
            @scrolltolower="onConversationScrollToLower"
        >
            <view class="conversation-list">
                <!-- 固定通知入口 -->
                <view class="notice-row" :style="noticeRowStyle">
                    <view class="notice-card notice-card-system" @click="openNotice(NOTICE_GROUP.SYSTEM)">
                        <view class="notice-dot" v-if="systemNoticeCount > 0"></view>

                        <view class="notice-icon-circle notice-icon-system" :style="noticeAvatarStyle">
                            <text
                                class="iconfont icon-tongzhi notice-entry-icon system-icon"
                                :style="systemIconDynamicStyle"
                            ></text>
                        </view>

                        <text class="notice-name" :style="noticeNameDynamicStyle">系统通知</text>
                    </view>

                    <view class="notice-card notice-card-follow" @click="openNotice(NOTICE_GROUP.FOLLOW)">
                        <view class="notice-dot" v-if="followNoticeCount > 0"></view>

                        <view class="notice-icon-circle notice-icon-follow" :style="noticeAvatarStyle">
                            <text
                                class="iconfont icon-wode notice-entry-icon follow-icon"
                                :style="noticeIconDynamicStyle"
                            ></text>
                        </view>

                        <text class="notice-name" :style="noticeNameDynamicStyle">关注通知</text>
                    </view>

                    <view class="notice-card notice-card-action" @click="openNotice(NOTICE_GROUP.ACTION)">
                        <view class="notice-dot" v-if="actionNoticeCount > 0"></view>

                        <view class="notice-icon-circle notice-icon-action" :style="noticeAvatarStyle">
                            <text
                                class="iconfont icon-comment notice-entry-icon comment-icon"
                                :style="noticeIconDynamicStyle"
                            ></text>
                        </view>

                        <text class="notice-name" :style="noticeNameDynamicStyle">互动通知</text>
                    </view>
                </view>

                <!-- 普通会话列表 -->
                <view
                    class="conversation-item"
                    v-for="(conversation, index) in conversationList"
                    :key="conversation.con_id || index"
                    :style="conversationItemStyle"
                    @click="openChat(conversation)"
                    @touchstart="onConversationTouchStart"
                    @touchmove="onConversationTouchMove"
                    @touchend="onConversationTouchEnd"
                    @touchcancel="onConversationTouchEnd"
                    @longpress.stop="showDeleteConversationAction($event, conversation)"
                >
                    <view class="avatar-wrapper">
                        <image
                            class="avatar"
                            :style="avatarStyle"
                            :src="conversation.avatar_uri || '/static/conv_avatar.png'"
                            mode="aspectFill"
                        ></image>
                    </view>

                    <view class="conversation-content">
                        <view class="conversation-main">
                            <text class="conversation-name" :style="conversationNameDynamicStyle">
                                {{ conversation.name }}
                            </text>
                            <text class="last-message" :style="lastMessageDynamicStyle">
                                {{ conversation.last_message || '' }}
                            </text>
                        </view>

                        <view class="conversation-side" :style="conversationSideStyle">
                            <text
                                class="conversation-time"
                                :style="conversationTimeDynamicStyle"
                                v-if="conversation.last_message_time"
                            >
                                {{ formatTime(conversation.last_message_time) }}
                            </text>

                            <view
                                class="side-unread-badge"
                                :style="unreadBadgeDynamicStyle"
                                v-if="conversation.badge_count - conversation.read_badge_count > 0"
                            >
                                {{
                                    conversation.badge_count - conversation.read_badge_count > 99
                                        ? '99+'
                                        : conversation.badge_count - conversation.read_badge_count
                                }}
                            </view>
                        </view>
                    </view>
                </view>

                <view v-if="conversationLoading" class="load-more-state">加载中...</view>
                <view
                    v-else-if="!conversationHasMore && conversationList.length > 0"
                    class="load-more-state"
                >
                    没有更多会话了
                </view>

                <view v-if="conversationList.length === 0 && !conversationLoading" class="empty-state">
                    <text class="iconfont icon-xiaoxi empty-icon"></text>
                    <text class="empty-hint">开始你的第一次对话吧！</text>
                </view>

                <view class="bottom-spacer" :style="bottomSpacerStyle"></view>
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

        <custom-tabbar active-path="pages/im/home" />
    </view>
</template>

<script>
import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js';
import { getNoitceCount, updateConversationSetting, markRead } from '@/request/im.js';
import { getMemberInfosBySendersEnsure } from '@/utils/member_info';
import { enqueueProfileRefresh } from '@/utils/im-cache.js';

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
            conversationPageSize: 50,
            conversationLoading: false,
            conversationHasMore: true,
            conversationLoadArmed: true,
            conversationScrollBoxHeight: 0,
            privateProfileTtlMs: 24 * 60 * 60 * 1000,

            windowHeight: 667,
            windowWidth: 375,
            statusBarHeight: 0,
            safeBottom: 0,

            headerHeight: 56,
            noticeRowHeight: 84,
            conversationItemHeight: 70,
            avatarSize: 46,
            noticeAvatarSize: 44,
            actionButtonSize: 32,
            tabbarSpacerHeight: 64,

            headerTitleFontSize: 16,
            actionIconFontSize: 23,

            conversationNameFontSize: 16,
            lastMessageFontSize: 13,
            conversationTimeFontSize: 11,
            unreadBadgeFontSize: 10,
            unreadBadgeHeight: 16,
            unreadBadgeMinWidth: 18,

            noticeNameFontSize: 12,
            noticeIconFontSize: 21,
            systemIconFontSize: 23,
            conversationSideWidth: 50,

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

    computed: {
        headerBarStyle() {
            return 'height:' + this.headerHeight + 'px;';
        },

        headerContentStyle() {
            const contentHeight = Math.max(32, this.headerHeight - this.statusBarHeight);
            return 'height:' + contentHeight + 'px;margin-top:' + this.statusBarHeight + 'px;';
        },

        headerTitleDynamicStyle() {
            return 'font-size:' + this.headerTitleFontSize + 'px;';
        },

        actionIconDynamicStyle() {
            return 'font-size:' + this.actionIconFontSize + 'px;';
        },

        conversationScrollStyle() {
            const top = this.headerHeight;
            const height = Math.max(0, this.windowHeight - top);
            return 'top:' + top + 'px;height:' + height + 'px;';
        },

        dropdownMenuStyle() {
            return 'top:' + (this.headerHeight + 2) + 'px;';
        },

        noticeRowStyle() {
            return 'height:' + this.noticeRowHeight + 'px;';
        },

        conversationItemStyle() {
            return 'height:' + this.conversationItemHeight + 'px;';
        },

        avatarStyle() {
            return 'width:' + this.avatarSize + 'px;height:' + this.avatarSize + 'px;border-radius:' + Math.floor(this.avatarSize / 2) + 'px;';
        },

        noticeAvatarStyle() {
            return 'width:' + this.noticeAvatarSize + 'px;height:' + this.noticeAvatarSize + 'px;border-radius:' + Math.floor(this.noticeAvatarSize / 2) + 'px;';
        },

        actionButtonStyle() {
            return 'width:' + this.actionButtonSize + 'px;height:' + this.actionButtonSize + 'px;border-radius:' + Math.floor(this.actionButtonSize / 2) + 'px;';
        },

        bottomSpacerStyle() {
            return 'height:' + this.tabbarSpacerHeight + 'px;';
        },

        conversationNameDynamicStyle() {
            return (
                'font-size:' + this.conversationNameFontSize + 'px;' +
                'line-height:' + (this.conversationNameFontSize + 5) + 'px;'
            );
        },

        lastMessageDynamicStyle() {
            return (
                'font-size:' + this.lastMessageFontSize + 'px;' +
                'line-height:' + (this.lastMessageFontSize + 5) + 'px;'
            );
        },

        conversationTimeDynamicStyle() {
            return (
                'font-size:' + this.conversationTimeFontSize + 'px;' +
                'line-height:' + (this.conversationTimeFontSize + 4) + 'px;'
            );
        },

        unreadBadgeDynamicStyle() {
            return (
                'min-width:' + this.unreadBadgeMinWidth + 'px;' +
                'height:' + this.unreadBadgeHeight + 'px;' +
                'border-radius:' + Math.floor(this.unreadBadgeHeight / 2) + 'px;' +
                'font-size:' + this.unreadBadgeFontSize + 'px;'
            );
        },

        noticeNameDynamicStyle() {
            return 'font-size:' + this.noticeNameFontSize + 'px;';
        },

        systemIconDynamicStyle() {
            return 'font-size:' + this.systemIconFontSize + 'px;';
        },

        noticeIconDynamicStyle() {
            return 'font-size:' + this.noticeIconFontSize + 'px;';
        },

        conversationSideStyle() {
            return 'width:' + this.conversationSideWidth + 'px;';
        }
    },

    onLoad() {
        this.initResponsiveLayout();
        this.loadMoreConversations(true);

        this.normalListener = (data) => {
            if (!data || !data.msg_body) return;

            this.userConIndex = data.user_con_index;

            const msgBody = data.msg_body;
            const lastMessageType = Number(msgBody.msg_type ?? msgBody.msgType ?? 0);
            const lastMessageRaw = msgBody.msg_content || '';

            let index = -1;

            for (let i = 0; i < this.conversationList.length; i++) {
                if (this.conversationList[i].con_id == msgBody.con_id) {
                    this.conversationList[i].badge_count = Number(data.badge_count);
                    this.conversationList[i].user_con_index = data.user_con_index;
                    this.conversationList[i].last_message_id = msgBody.msg_id;
                    this.conversationList[i].last_message_type = lastMessageType;
                    this.conversationList[i].last_message = this.buildLastMessagePreview(lastMessageRaw, lastMessageType);
                    this.conversationList[i].last_message_time = msgBody.create_time;

                    index = i;
                    break;
                }
            }

            if (index !== -1) {
                const conversation = this.conversationList.splice(index, 1)[0];
                this.conversationList.unshift(conversation);
            } else {
                DB.getConversationById(msgBody.con_id).then((res) => {
                    if (res) {
                        const conversation = this.normalizeConversationPreview(res);
                        this.conversationList.unshift(conversation);
                        this.refreshPrivateProfilesInPage([conversation]);
                    }
                });
            }
        };

        uni.$on('normal', this.normalListener);

        this.commandListener = async (data) => {
            if (!data || !data.msg_body) return;

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

                                this.conversationList[i].last_message_type = 0;
                                this.conversationList[i].last_message = `${nickname}撤回了一条消息`;
                            }
                        }
                    }

                    break;
                }
            }
        };

        uni.$on('command', this.commandListener);

        this.noticeListener = (data) => {
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
        };

        uni.$on('notice', this.noticeListener);

        this.loadNoticeCounts();
    },

    onShow() {
        this.initResponsiveLayout();
        this.$nextTick(() => this.updateConversationScrollBoxHeight());
    },

    onReady() {
        this.updateConversationScrollBoxHeight();
    },

    onUnload() {
        if (this.normalListener) {
            uni.$off('normal', this.normalListener);
        }

        if (this.commandListener) {
            uni.$off('command', this.commandListener);
        }

        if (this.noticeListener) {
            uni.$off('notice', this.noticeListener);
        }
    },

    methods: {
        initResponsiveLayout() {
            try {
                const sys = uni.getSystemInfoSync();
                const windowWidth = Number(sys.windowWidth || 375);
                const windowHeight = Number(sys.windowHeight || 667);
                const statusBarHeight = Number(sys.statusBarHeight || 0);
                const safeAreaInsets = sys.safeAreaInsets || {};

                this.windowWidth = windowWidth;
                this.windowHeight = windowHeight;
                this.statusBarHeight = statusBarHeight;
                this.safeBottom = Number(safeAreaInsets.bottom || 0);

                const layoutWidth = Math.min(windowWidth, 390);
                
                const smallScreenBoost = layoutWidth <= 360 ? 1 : 0;
                const tinyScreenBoost = layoutWidth <= 330 ? 1 : 0;
                
                const tabbarBaseHeight = Math.max(
                    48,
                    Math.min(52, Math.floor(layoutWidth * 0.134))
                );
                
                this.tabbarSpacerHeight = tabbarBaseHeight + this.safeBottom + 10;
                
                const headerContentHeight = Math.max(
                    38,
                    Math.min(42, Math.floor(layoutWidth * 0.108))
                );
                
                this.headerHeight = statusBarHeight + headerContentHeight;
                
                this.conversationItemHeight = Math.max(
                    66,
                    Math.min(72, Math.floor(layoutWidth * 0.176))
                );
                
                this.noticeRowHeight = Math.max(
                    78,
                    Math.min(86, Math.floor(layoutWidth * 0.222))
                );
                
                this.avatarSize = Math.max(
                    44,
                    Math.min(48, Math.floor(this.conversationItemHeight * 0.67))
                );
                
                this.noticeAvatarSize = Math.max(
                    42,
                    Math.min(46, Math.floor(this.noticeRowHeight * 0.53))
                );
                
                this.actionButtonSize = Math.max(
                    30,
                    Math.min(32, Math.floor(headerContentHeight * 0.74))
                );
                
                this.headerTitleFontSize = Math.max(
                    16,
                    Math.min(17, Math.floor(headerContentHeight * 0.38) + smallScreenBoost)
                );
                
                this.actionIconFontSize = Math.max(
                    22,
                    Math.min(24, Math.floor(headerContentHeight * 0.54) + smallScreenBoost)
                );
                
                this.conversationNameFontSize = Math.max(
                    16,
                    Math.min(17, Math.floor(this.conversationItemHeight * 0.235) + smallScreenBoost + tinyScreenBoost)
                );
                
                this.lastMessageFontSize = Math.max(
                    12,
                    Math.min(13, Math.floor(this.conversationItemHeight * 0.172) + smallScreenBoost)
                );
                
                this.conversationTimeFontSize = Math.max(
                    10,
                    Math.min(11, Math.floor(this.conversationItemHeight * 0.148) + smallScreenBoost)
                );
                
                this.unreadBadgeFontSize = Math.max(
                    9,
                    Math.min(10, Math.floor(this.conversationItemHeight * 0.14) + smallScreenBoost)
                );
                
                this.unreadBadgeHeight = Math.max(
                    16,
                    Math.min(17, Math.floor(this.conversationItemHeight * 0.235))
                );
                
                this.unreadBadgeMinWidth = Math.max(
                    18,
                    Math.min(20, Math.floor(this.conversationItemHeight * 0.29))
                );
                
                this.noticeNameFontSize = Math.max(
                    12,
                    Math.min(13, Math.floor(this.noticeRowHeight * 0.148) + smallScreenBoost)
                );
                
                this.noticeIconFontSize = Math.max(
                    20,
                    Math.min(22, Math.floor(this.noticeAvatarSize * 0.48) + smallScreenBoost)
                );
                
                this.systemIconFontSize = Math.max(
                    22,
                    Math.min(24, Math.floor(this.noticeAvatarSize * 0.52) + smallScreenBoost)
                );
                
                this.conversationSideWidth = Math.max(
                    48,
                    Math.min(52, Math.floor(layoutWidth * 0.13))
                );
            } catch (err) {
                this.windowHeight = 667;
                this.windowWidth = 375;
                this.statusBarHeight = 0;
                this.safeBottom = 0;

                this.conversationItemHeight = 70;
                this.headerHeight = 42;
                this.noticeRowHeight = 84;
                this.avatarSize = 46;
                this.noticeAvatarSize = 44;
                this.actionButtonSize = 32;
                this.tabbarSpacerHeight = 64;

                this.headerTitleFontSize = 16;
                this.actionIconFontSize = 23;
                this.conversationNameFontSize = 16;
                this.lastMessageFontSize = 13;
                this.conversationTimeFontSize = 11;
                this.unreadBadgeFontSize = 10;
                this.unreadBadgeHeight = 16;
                this.unreadBadgeMinWidth = 18;
                this.noticeNameFontSize = 12;
                this.noticeIconFontSize = 21;
                this.systemIconFontSize = 23;
                this.conversationSideWidth = 50;
            }
        },

        updateConversationScrollBoxHeight() {
            this.$nextTick(() => {
                const query = uni.createSelectorQuery().in(this);
                query.select('.conversation-scroll').boundingClientRect(rect => {
                    this.conversationScrollBoxHeight = Number(rect?.height || 0);
                }).exec();
            });
        },

        onConversationScroll(e) {
            const detail = e?.detail || {};
            const scrollTop = Number(detail.scrollTop || 0);
            const scrollHeight = Number(detail.scrollHeight || 0);
            const viewHeight = Number(this.conversationScrollBoxHeight || 0);

            if (!scrollHeight || !viewHeight) return;

            const distanceToBottom = scrollHeight - scrollTop - viewHeight;

            if (distanceToBottom > 120) {
                this.conversationLoadArmed = true;
            }
        },

        onConversationScrollToLower() {
            if (!this.conversationLoadArmed) return;
            if (this.conversationLoading) return;
            if (!this.conversationHasMore) return;

            this.conversationLoadArmed = false;
            this.loadMoreConversations(false);
        },

        async loadMoreConversations(reset = false) {
            if (this.conversationLoading) return;
            if (!reset && !this.conversationHasMore) return;

            this.conversationLoading = true;

            try {
                let beforeUserConIndex;

                if (reset) {
                    beforeUserConIndex = this.userConIndex;
                    this.conversationHasMore = true;
                    this.conversationLoadArmed = true;
                    this.updateConversationScrollBoxHeight();
                } else {
                    const last = this.conversationList[this.conversationList.length - 1];

                    if (!last || last.user_con_index === null || last.user_con_index === undefined) {
                        this.conversationHasMore = false;
                        return;
                    }

                    beforeUserConIndex = Number(last.user_con_index) - 1;

                    if (!Number.isFinite(beforeUserConIndex) || beforeUserConIndex < 0) {
                        this.conversationHasMore = false;
                        return;
                    }
                }

                const res = await DB.pullConversation(beforeUserConIndex, this.conversationPageSize);
                const list = Array.isArray(res) ? res : [];
                const mapped = list.map(item => this.normalizeConversationPreview(item));

                if (reset) {
                    this.refreshPrivateProfilesInPage(mapped);
                    this.conversationList = mapped;
                } else {
                    const existSet = new Set(this.conversationList.map(item => String(item.con_id)));
                    const appendList = mapped.filter(item => !existSet.has(String(item.con_id)));

                    if (appendList.length > 0) {
                        this.refreshPrivateProfilesInPage(appendList);
                        this.conversationList = this.conversationList.concat(appendList);
                    }
                }

                this.conversationHasMore = list.length >= this.conversationPageSize;
                this.$nextTick(() => this.updateConversationScrollBoxHeight());
            } catch (err) {
                console.error('loadMoreConversations failed', err);
            } finally {
                this.conversationLoading = false;
            }
        },

        collectPrivateProfileIds(list) {
            const userIds = [];
            const agentIds = [];

            for (const item of list || []) {
                if (!item) continue;

                if (Number(item.con_type) === 1 && item.peer_id !== null && item.peer_id !== undefined) {
                    userIds.push(item.peer_id);
                } else if (Number(item.con_type) === 4 && item.peer_id !== null && item.peer_id !== undefined) {
                    agentIds.push(item.peer_id);
                }
            }

            return { userIds, agentIds };
        },

        refreshPrivateProfilesInPage(list) {
            const { userIds, agentIds } = this.collectPrivateProfileIds(list);

            if (userIds.length > 0) {
                enqueueProfileRefresh('user', userIds, this.privateProfileTtlMs);
            }

            if (agentIds.length > 0) {
                enqueueProfileRefresh('agent', agentIds, this.privateProfileTtlMs);
            }
        },

        normalizeConversationPreview(conversation) {
            if (!conversation) return conversation;

            const lastMessageType = Number(
                conversation.last_message_type ??
                conversation.msg_type ??
                0
            );

            return {
                ...conversation,
                last_message_type: lastMessageType,
                last_message: this.buildLastMessagePreview(
                    conversation.last_message || '',
                    lastMessageType
                )
            };
        },

        buildLastMessagePreview(content, msgType) {
            if (Number(msgType) !== 4) {
                return content || '';
            }

            const share = this.parseShareLastMessageContent(content);
            const title = share.title || share.name || '分享内容';

            return `[分享] ${title}`;
        },

        parseShareLastMessageContent(content) {
            if (!content) return {};

            if (typeof content === 'object') {
                return content;
            }

            try {
                const data = JSONbig.parse(String(content));
                return data && typeof data === 'object' ? data : {};
            } catch (err) {
                try {
                    const data = JSON.parse(String(content));
                    return data && typeof data === 'object' ? data : {};
                } catch (e) {
                    console.error('parse share last message failed:', e);
                    return {};
                }
            }
        },

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
            const menuWidth = 56;
            const menuHeight = 34;
            const sys = uni.getSystemInfoSync();

            let left = point.x - menuWidth / 2;
            let top = point.y - menuHeight - 8;

            left = Math.max(8, Math.min(left, sys.windowWidth - menuWidth - 8));

            const minTop = this.statusBarHeight + 8;
            if (top < minTop) top = point.y + 8;
            top = Math.max(minTop, Math.min(top, sys.windowHeight - menuHeight - 8));

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

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.conversation-container {
    height: 100vh;
    background: #fdfdfd;
    position: relative;
    overflow: hidden;
    font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.header-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 120;
    box-sizing: border-box;
    background: #fdfdfd;
}

.header-content {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left: 12px;
    padding-right: 12px;
    box-sizing: border-box;
    position: relative;
}

.header-title {
    font-size: 16px;
    font-weight: 400;
    color: #111;
    line-height: 1;
}

.header-actions {
    position: absolute;
    right: 10px;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-btn {
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-sizing: border-box;
}

.action-btn:active {
    transform: scale(0.94);
}

.action-icon {
    font-size: 23px;
    color: #8f9098;
    line-height: 1;
}

.dropdown-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.02);
    z-index: 999;
    animation: fadeIn 0.18s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.dropdown-menu {
    position: absolute;
    right: 6px;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 7px 20px rgba(0, 0, 0, 0.10);
    overflow: hidden;
    animation: slideDown 0.2s ease;
    padding: 3px 0;
    box-sizing: border-box;
    min-width: 122px;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-6px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.dropdown-item {
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 9px;
    gap: 6px;
    transition: background 0.2s;
    box-sizing: border-box;
}

.dropdown-item:active {
    background: #f7f7f8;
}

.item-icon {
    font-size: 15px;
    color: #777;
    line-height: 1;
}

.item-text {
    font-size: 12px;
    font-weight: 400;
    color: #333;
    white-space: nowrap;
}

.conversation-scroll {
    position: fixed;
    left: 0;
    right: 0;
    overflow: hidden;
    background: #fdfdfd;
}

.conversation-list {
    padding: 0 8px 0;
    box-sizing: border-box;
}

.notice-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    box-sizing: border-box;
}

.notice-card {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    position: relative;
    box-sizing: border-box;
    border: 1px solid rgba(0, 0, 0, 0.012);
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.012);
}

.notice-card-system {
    background: rgba(253, 231, 209, 0.13);
}

.notice-card-follow {
    background: rgba(225, 239, 255, 0.18);
}

.notice-card-action {
    background: rgba(255, 225, 229, 0.22);
}

.notice-card:active {
    opacity: 0.78;
}

.notice-dot {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ff3b30;
}

.notice-icon-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
    box-sizing: border-box;
    background: #ffffff !important;
}

.notice-icon-system {
    border: 1px solid rgba(240, 160, 51, 0.18);
}

.notice-icon-follow {
    border: 1px solid rgba(141, 149, 178, 0.20);
}

.notice-icon-action {
    border: 1px solid rgba(255, 92, 112, 0.22);
}

.notice-entry-icon {
    line-height: 1;
}

.system-icon {
    font-size: 23px;
    color: #f0a033;
}

.follow-icon {
    font-size: 21px;
    color: #8d95b2;
}

.comment-icon {
    font-size: 21px;
    color: #ff6b7d;
}

.notice-name {
    font-size: 12px;
    font-weight: 400;
    color: #222;
    line-height: 1.1;
}

.conversation-item {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 10px;
    background: #fff;
    margin-bottom: 4px;
    border-radius: 12px;
    transition: background 0.18s;
    box-sizing: border-box;
    border: 1px solid rgba(0, 0, 0, 0.008);
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.008);
}

.conversation-item::after {
    display: none;
}

.conversation-item:active {
    background: #f8f8f8;
}

.avatar-wrapper {
    position: relative;
    flex-shrink: 0;
    margin-right: 10px;
}

.avatar {
    border: none;
    background: #f2f2f2;
}

.conversation-content {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    overflow: hidden;
}

.conversation-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-right: 6px;
    box-sizing: border-box;
}

.conversation-name {
    font-size: 16px;
    font-weight: 400;
    color: #111;
    line-height: 21px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.last-message {
    margin-top: 1px;
    font-size: 12px;
    font-weight: 400;
    line-height: 17px;
    color: #8f9098;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conversation-side {
    width: 50px;
    height: 100%;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
}

.conversation-time {
    font-size: 10px;
    font-weight: 400;
    color: #8f9098;
    line-height: 14px;
    margin-bottom: 3px;
}

.side-unread-badge {
    min-width: 18px;
    height: 16px;
    padding: 0 5px;
    background: #ff3b30;
    color: #fff;
    font-size: 10px;
    font-weight: 400;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    line-height: 1;
}

.load-more-state {
    padding: 4px 0 0;
    margin: 0;
    text-align: center;
    font-size: 11px;
    line-height: 14px;
    color: #999;
}

.bottom-spacer {
    width: 100%;
    flex-shrink: 0;
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
    height: 34px;
    background: #ffffff;
    border-radius: 7px;
    display: flex;
    align-items: center;
    overflow: hidden;
    box-shadow: 0 5px 14px rgba(0, 0, 0, 0.18);
}

.conversation-action-item {
    min-width: 56px;
    height: 34px;
    padding: 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
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
    padding: 80px 20px;
}

.empty-icon {
    font-size: 50px;
    margin-bottom: 12px;
    color: #c7c7cc;
}

.empty-hint {
    font-size: 13px;
    color: #999;
}
</style>