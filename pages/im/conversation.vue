<template>
    <view class="chat-container">
        <!-- 顶部导航栏：包含刘海 / 状态栏区域 -->
        <view class="chat-header" :style="chatHeaderStyle">
            <view class="chat-header-content" :style="chatHeaderContentStyle">
                <view class="header-left" @click="goBack">
                    <text class="back-icon">‹</text>
                </view>
                <view class="header-center">
                    <text class="chat-title">{{ chatName }}</text>
                </view>
                <view class="header-right" @click="goToSettings" v-if="conversation.con_type == 2 && canSendMessage">
                    <text class="settings-icon">⋮</text>
                </view>
                <view class="header-right-placeholder" v-else></view>
            </view>
        </view>

        <!-- 消息列表 -->
        <scroll-view
            class="chat-messages"
            :style="chatMessagesStyle"
            scroll-y="true"
            :scroll-into-view="scrollIntoViewId"
            @scroll="onScroll"
        >
            <view class="messages">
                <view v-if="isLoading" class="loading-tip" :style="systemRowStyle">
                    <view class="loading-spinner"></view>
                    <text class="loading-text">加载中...</text>
                </view>

                <view
                    v-for="(message, index) in messages"
                    :key="String(message.msg_id || index)"
                    :id="'message-' + String(message.msg_id)"
                >
                    <view class="message-time" :style="systemRowStyle" v-if="shouldShowTime(index)">
                        <text class="time-text">{{ formatTime(message.create_time) }}</text>
                    </view>

                    <view class="message message-right" :style="messageRowStyle" v-if="isSelfMessage(message)">
                        <view class="message-content message-content-right" :style="messageContentStyle">
                            <text v-if="message.nick_name" class="sender-name sender-name-right">{{ message.nick_name }}</text>

                            <view class="self-bubble-row">
                                <view class="message-status">
                                    <view class="status-loading" v-if="message.status == -1"></view>
                                </view>

                                <view
                                    v-if="isShareMessage(message)"
                                    class="share-card share-card-right"
                                    :style="shareCardStyle"
                                    @click="goToShareCreationDetail(message)"
                                    @touchstart="onMessageTouchStart"
                                    @touchmove="onMessageTouchMove"
                                    @touchend="onMessageTouchEnd"
                                    @touchcancel="onMessageTouchEnd"
                                    @longpress.stop="showMessageActions($event, message)"
                                >
                                    <view class="share-image-wrapper" :style="shareImageWrapperStyle">
                                        <image class="share-card-image" :src="getShareCoverUrl(message)" mode="aspectFill"></image>
                                        <view class="share-video-badge" v-if="isShareVideo(message)">
                                            <text class="share-video-badge-icon">▶</text>
                                        </view>
                                    </view>

                                    <view class="share-card-content" :style="shareCardContentStyle">
                                        <view class="share-card-title-container">
                                            <text class="share-card-title">{{ getShareTitle(message) }}</text>
                                        </view>

                                        <view class="share-card-footer">
                                            <view class="share-card-author" @click.stop="goToShareUserPage(message)">
                                                <image class="share-author-avatar" :src="getShareAuthorAvatar(message)" mode="aspectFill"></image>
                                                <text class="share-author-name">{{ getShareAuthorName(message) }}</text>
                                            </view>
                                        </view>
                                    </view>
                                </view>

                                <view
                                    v-else
                                    class="bubble bubble-right"
                                    @touchstart="onMessageTouchStart"
                                    @touchmove="onMessageTouchMove"
                                    @touchend="onMessageTouchEnd"
                                    @touchcancel="onMessageTouchEnd"
                                    @longpress.stop="showMessageActions($event, message)"
                                >
                                    <text class="bubble-text">{{ message.msg_content }}</text>
                                </view>
                            </view>
                        </view>

                        <view class="avatar-box" :style="avatarBoxStyle" @click="goToUserProfile(message)">
                            <image class="avatar" :style="avatarStyle" :src="message.avatar_uri || myAvatar || userDefaultAvatar" mode="aspectFill"></image>
                        </view>
                    </view>

                    <view class="message message-left" :style="messageRowStyle" v-else-if="isOtherSenderMessage(message)">
                        <view class="avatar-box" :style="avatarBoxStyle" @click="goToUserProfile(message)">
                            <image
                                class="avatar"
                                :style="avatarStyle"
                                :src="message.avatar_uri || (message.sender_type == 1 ? userDefaultAvatar : aiDefaultAvatar)"
                                mode="aspectFill"
                            ></image>
                        </view>

                        <view class="message-content message-content-left" :style="messageContentStyle">
                            <text v-if="message.nick_name" class="sender-name">{{ message.nick_name }}</text>

                            <view
                                v-if="isShareMessage(message)"
                                class="share-card share-card-left"
                                :style="shareCardStyle"
                                @click="goToShareCreationDetail(message)"
                                @touchstart="onMessageTouchStart"
                                @touchmove="onMessageTouchMove"
                                @touchend="onMessageTouchEnd"
                                @touchcancel="onMessageTouchEnd"
                                @longpress.stop="showMessageActions($event, message)"
                            >
                                <view class="share-image-wrapper" :style="shareImageWrapperStyle">
                                    <image class="share-card-image" :src="getShareCoverUrl(message)" mode="aspectFill"></image>
                                    <view class="share-video-badge" v-if="isShareVideo(message)">
                                        <text class="share-video-badge-icon">▶</text>
                                    </view>
                                </view>

                                <view class="share-card-content" :style="shareCardContentStyle">
                                    <view class="share-card-title-container">
                                        <text class="share-card-title">{{ getShareTitle(message) }}</text>
                                    </view>

                                    <view class="share-card-footer">
                                        <view class="share-card-author" @click.stop="goToShareUserPage(message)">
                                            <image class="share-author-avatar" :src="getShareAuthorAvatar(message)" mode="aspectFill"></image>
                                            <text class="share-author-name">{{ getShareAuthorName(message) }}</text>
                                        </view>
                                    </view>
                                </view>
                            </view>

                            <view
                                v-else
                                class="bubble bubble-left"
                                @touchstart="onMessageTouchStart"
                                @touchmove="onMessageTouchMove"
                                @touchend="onMessageTouchEnd"
                                @touchcancel="onMessageTouchEnd"
                                @longpress.stop="showMessageActions($event, message)"
                            >
                                <text class="bubble-text">{{ message.msg_content }}</text>
                            </view>
                        </view>
                    </view>

                    <view class="message message-center" :style="systemRowStyle" v-else>
                        <view
                            class="system-message"
                            @touchstart="onMessageTouchStart"
                            @touchmove="onMessageTouchMove"
                            @touchend="onMessageTouchEnd"
                            @touchcancel="onMessageTouchEnd"
                            @longpress.stop="showMessageActions($event, message)"
                        >
                            <text class="system-text">{{ message.msg_content }}</text>
                        </view>
                    </view>
                </view>
            </view>
        </scroll-view>

        <view class="message-action-mask" v-if="messageAction.visible" @click="hideMessageActions">
            <view
                class="message-action-menu"
                :style="{ left: messageAction.left + 'px', top: messageAction.top + 'px' }"
                @click.stop
            >
                <view class="message-action-item" v-if="canCopyMessage(messageAction.message)" @click="copyMessage">复制</view>
                <view class="message-action-item danger-action" v-if="canRecallMessage(messageAction.message)" @click="recallSelectedMessage">撤回</view>
            </view>
        </view>

        <view class="input-bar" :style="inputBarStyle" v-if="canSendMessage">
            <view class="input-wrapper">
                <input
                    class="input-field"
                    v-model="inputText"
                    placeholder="说点什么..."
                    placeholder-class="input-placeholder"
                    @confirm="sendMessage"
                    confirm-type="send"
                />
            </view>
            <view class="send-btn" :class="{ 'send-btn-active': inputText.trim() }" @click="sendMessage">
                <text class="send-icon">➤</text>
            </view>
        </view>

        <view class="disabled-input-bar" :style="inputBarStyle" v-else>
            <text class="disabled-input-text">无法在已退出的群聊中发送消息</text>
        </view>
    </view>
</template>

<script>
import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js';
import { sendMessage, getMessageByConversation, markRead, recallMessage, handleMessageExtra } from '@/request/im.js';
import { getMemberInfosBySendersEnsure } from '@/utils/member_info';
import { enqueueProfileRefresh } from '@/utils/im-cache.js';
import { getUserInfos } from '@/request/user.js';

export default {
    data() {
        return {
            userId: getApp().globalData.userId,
            myAvatar: getApp().globalData.avatar,
            senderInfoMap: new Map(),
            shareAuthorInfoMap: new Map(),
            conversation: {},
            conIndex: Number.MAX_SAFE_INTEGER,
            messages: [],
            inputText: '',
            scrollIntoViewId: '',
            hasMore: true,
            isLoading: false,
            normalListener: null,
            commandListener: null,
            chatName: '',
            userDefaultAvatar: '/static/user_avatar.png',
            aiDefaultAvatar: '/static/ai.png',
            defaultCover: '/static/images/default.png',
            firstPageProfileRefreshed: false,
            groupProfileTtlMs: 7 * 24 * 60 * 60 * 1000,

            windowHeight: 667,
            statusBarHeight: 0,
            bottomSafeHeight: 0,
            headerHeight: 60,
            headerContentHeight: 44,
            inputBarHeight: 56,
            messageUnitHeight: 48,
            halfMessageHeight: 24,
            avatarSize: 34,
            messageGap: 6,
            shareCardWidth: 176,
            shareCardHeight: 236,
            shareImageHeight: 194,
            shareContentHeight: 42,

            messageAction: {
                visible: false,
                left: 0,
                top: 0,
                message: null
            },
            messageTouch: {
                startX: 0,
                startY: 0,
                moved: false
            }
        };
    },

    computed: {
        canSendMessage() {
            return Number(this.conversation?.is_member ?? 1) !== 0;
        },

        chatHeaderStyle() {
            return 'height:' + this.headerHeight + 'px;';
        },

        chatHeaderContentStyle() {
            return 'height:' + this.headerContentHeight + 'px;margin-top:' + this.statusBarHeight + 'px;';
        },

        chatMessagesStyle() {
            return 'top:' + this.headerHeight + 'px;bottom:' + this.inputBarHeight + 'px;';
        },

        inputBarStyle() {
            return 'height:' + this.inputBarHeight + 'px;padding-bottom:' + this.bottomSafeHeight + 'px;';
        },

        messageRowStyle() {
            return 'margin-bottom:' + this.messageGap + 'px;';
        },

        systemRowStyle() {
            return 'height:' + this.halfMessageHeight + 'px;margin-bottom:' + Math.max(2, Math.floor(this.messageGap / 2)) + 'px;';
        },

        avatarBoxStyle() {
            return 'width:' + this.avatarSize + 'px;height:' + this.avatarSize + 'px;';
        },

        avatarStyle() {
            return 'width:' + this.avatarSize + 'px;height:' + this.avatarSize + 'px;border-radius:' + Math.floor(this.avatarSize / 2) + 'px;';
        },

        messageContentStyle() {
            return 'min-height:' + this.avatarSize + 'px;';
        },

        shareCardStyle() {
            return 'width:' + this.shareCardWidth + 'px;height:' + this.shareCardHeight + 'px;';
        },

        shareImageWrapperStyle() {
            return 'height:' + this.shareImageHeight + 'px;';
        },

        shareCardContentStyle() {
            return 'height:' + this.shareContentHeight + 'px;';
        }
    },

    async onLoad(options) {
        this.initResponsiveLayout();

        this.conversation.con_short_id = 0;
        this.conversation.con_id = options.conId;
        this.conversation.con_type = Number(options.conType);
        this.chatName = options.name || '聊天';
        uni.setNavigationBarTitle({ title: options.name || '聊天' });

        let res = await DB.getConversationById(options.conId);
        const conversation = Array.isArray(res) ? res[0] : res;

        if (conversation) {
            this.conversation = conversation;

            res = await DB.pullMessage(this.conversation.con_id, this.conIndex);
            if (res.length > 0) {
                await this.fillSenderInfos(res);
                this.normalizeMessages(res);
                await this.ensureShareAuthorInfos(res);

                this.messages = res.reverse();
                this.conIndex = this.messages[0].con_index - 1;
            }

            if (this.conIndex <= this.conversation.min_index) {
                this.hasMore = false;
            } else if (this.messages.length < 20) {
                res = await getMessageByConversation(this.conversation.con_short_id, this.conIndex, 20 - this.messages.length);
                if (res.length > 0) {
                    await this.fillSenderInfos(res);
                    this.normalizeMessages(res);
                    await this.ensureShareAuthorInfos(res);

                    res.reverse();
                    this.messages = res.concat(this.messages);
                    this.conIndex = this.messages[0].con_index - 1;
                }

                if (res.length === 0 || this.conIndex <= this.conversation.min_index) {
                    this.hasMore = false;
                }
            }

            this.refreshFirstPageGroupProfiles();

            if (this.conversation.badge_count - this.conversation.read_badge_count > 0 && this.messages.length > 0) {
                markRead(
                    this.conversation.con_short_id,
                    this.messages[this.messages.length - 1].con_index,
                    this.conversation.badge_count
                );
            }
        }

        setTimeout(() => this.scrollToBottom(), 100);

        this.normalListener = async (data) => {
            if (!data || !data.msg_body) return;
            if (this.conversation.con_id != data.msg_body.con_id) return;

            const msg = data.msg_body;

            if (String(this.conversation.con_short_id || 0) === '0' && String(msg.con_short_id || 0) !== '0') {
                this.conversation.con_short_id = msg.con_short_id;
                for (const item of this.messages) {
                    if (String(item.con_short_id || 0) === '0') {
                        item.con_short_id = msg.con_short_id;
                    }
                }
            }

            await this.fillSenderInfos([msg]);
            this.normalizeMessages([msg]);
            await this.ensureShareAuthorInfos([msg]);

            if (this.isSelfMessage(msg)) {
                for (let i = this.messages.length - 1; i >= 0; i--) {
                    if (String(this.messages[i].msg_id) === String(msg.msg_id)) {
                        this.messages.splice(i, 1, msg);
                        return;
                    }
                    if (this.messages[i].con_index && BigInt(this.messages[i].con_index) < BigInt(msg.con_index)) {
                        break;
                    }
                }
            }

            let maxConIndex = 0n;
            for (let i = this.messages.length - 1; i >= 0; i--) {
                if (this.messages[i].con_index) {
                    maxConIndex = BigInt(this.messages[i].con_index);
                    break;
                }
            }

            if (msg.con_index && BigInt(msg.con_index) <= maxConIndex) {
                return;
            }

            this.messages.push(msg);
            this.scrollToBottom();
        };

        uni.$on('normal', this.normalListener);

        this.commandListener = async (data) => {
            if (!data || !data.msg_body) return;

            if (this.conversation.con_id == data.msg_body.con_id) {
                const cmdMessage = JSONbig.parse(data.msg_body.msg_content);

                if (data.msg_body.msg_type == 100) {
                    this.handleConversationCommand(cmdMessage);
                } else if (data.msg_body.msg_type == 101) {
                    this.conversation.read_index_end = cmdMessage.read_index_end;
                    this.conversation.read_badge_count = cmdMessage.read_badge_count;
                } else if (data.msg_body.msg_type == 102) {
                    const msgId = cmdMessage.msg_id;
                    if (msgId === null || msgId === undefined || msgId === '') return;

                    const index = this.findMessageIndexById(msgId);
                    if (index === -1) return;

                    this.messages[index].extra = cmdMessage.extra || '{}';

                    const nextMessage = await handleMessageExtra(this.messages[index]);
                    this.normalizeMessages([nextMessage]);
                    await this.ensureShareAuthorInfos([nextMessage]);

                    this.messages.splice(index, 1, nextMessage);
                }
            }
        };

        uni.$on('command', this.commandListener);
    },

    onShow() {
        this.initResponsiveLayout();
    },

    onUnload() {
        if (this.normalListener) {
            uni.$off('normal', this.normalListener);
        }
        if (this.commandListener) {
            uni.$off('command', this.commandListener);
        }
    },

    methods: {
        initResponsiveLayout() {
            try {
                const sys = uni.getSystemInfoSync();
                const windowHeight = Number(sys.windowHeight || 667);
                const statusBarHeight = Number(sys.statusBarHeight || 0);
                const safeInsets = sys.safeAreaInsets || {};
                const bottomSafeHeight = Number(safeInsets.bottom || 0);

                this.windowHeight = windowHeight;
                this.statusBarHeight = statusBarHeight;
                this.bottomSafeHeight = bottomSafeHeight;

                // 视觉高度约束：顶部群名内容区 1H、消息列表 10H、底部输入内容区 1H。
                // 顶部额外包含状态栏，底部额外包含安全区；H 即一个“头像行”。
                const usableHeight = Math.max(420, windowHeight - statusBarHeight - bottomSafeHeight);
                const rawUnitHeight = Math.floor(usableHeight / 12);

                this.messageUnitHeight = Math.max(34, Math.min(52, rawUnitHeight));
                this.messageGap = Math.max(4, Math.min(8, Math.floor(this.messageUnitHeight * 0.16)));
                this.avatarSize = Math.max(28, Math.min(38, this.messageUnitHeight - this.messageGap));
                this.halfMessageHeight = Math.max(16, Math.floor(this.messageUnitHeight / 2));

                this.headerContentHeight = this.messageUnitHeight;
                this.headerHeight = statusBarHeight + this.headerContentHeight;
                this.inputBarHeight = this.messageUnitHeight + bottomSafeHeight;

                // 分享创作卡片同步首页样式：小圆角、封面占主体、信息区约 1/6。
                this.shareCardWidth = Math.max(160, Math.min(190, Math.floor(sys.windowWidth * 0.48)));
                this.shareCardHeight = Math.floor(this.shareCardWidth * 1.34);
                this.shareContentHeight = Math.max(38, Math.floor(this.shareCardHeight / 6));
                this.shareImageHeight = this.shareCardHeight - this.shareContentHeight;
            } catch (err) {
                this.windowHeight = 667;
                this.statusBarHeight = 0;
                this.bottomSafeHeight = 0;
                this.headerContentHeight = 44;
                this.headerHeight = 44;
                this.inputBarHeight = 44;
                this.messageUnitHeight = 44;
                this.messageGap = 6;
                this.avatarSize = 34;
                this.halfMessageHeight = 22;
                this.shareCardWidth = 176;
                this.shareCardHeight = 236;
                this.shareContentHeight = 42;
                this.shareImageHeight = 194;
            }
        },

        isGroupConversation() {
            return Number(this.conversation?.con_type) === 2;
        },

        collectSenderProfileIds(messages) {
            const userMap = new Map();
            const agentMap = new Map();
            const selfUserId = String(this.userId || getApp().globalData.userId || '');
        
            for (const message of messages || []) {
                if (!message) continue;
                if (message.sender_id === null || message.sender_id === undefined) continue;
        
                const senderType = Number(message.sender_type);
                const senderId = String(message.sender_id);
                const key = senderId;
        
                if (senderType === 1) {
                    if (selfUserId && senderId === selfUserId) continue;
                    userMap.set(key, message.sender_id);
                } else if (senderType === 2) {
                    agentMap.set(key, message.sender_id);
                }
            }
        
            return {
                userIds: Array.from(userMap.values()),
                agentIds: Array.from(agentMap.values())
            };
        },

        refreshFirstPageGroupProfiles() {
            if (this.firstPageProfileRefreshed) return;
            if (!this.isGroupConversation()) return;
            if (!Array.isArray(this.messages) || this.messages.length === 0) return;

            const { userIds, agentIds } = this.collectSenderProfileIds(this.messages);

            if (userIds.length > 0) {
                enqueueProfileRefresh('user', userIds, this.groupProfileTtlMs);
            }

            if (agentIds.length > 0) {
                enqueueProfileRefresh('agent', agentIds, this.groupProfileTtlMs);
            }

            this.firstPageProfileRefreshed = true;
        },

        async fillSenderInfos(messages) {
            if (!Array.isArray(messages) || messages.length === 0) return;

            const senders = [];
            const missingSet = new Set();

            for (const message of messages) {
                if (!message) continue;
                if (Number(message.sender_type) !== 1 && Number(message.sender_type) !== 2) continue;

                if (message.nick_name || message.avatar_uri) {
                    const key = `${Number(message.sender_type)}:${String(message.sender_id)}`;
                    this.senderInfoMap.set(key, {
                        nick_name: message.nick_name || '',
                        avatar_uri: message.avatar_uri || ''
                    });
                    continue;
                }

                const key = `${Number(message.sender_type)}:${String(message.sender_id)}`;
                if (!this.senderInfoMap.has(key) && !missingSet.has(key)) {
                    missingSet.add(key);
                    senders.push({
                        sender_type: message.sender_type,
                        sender_id: message.sender_id
                    });
                }
            }

            if (senders.length > 0) {
                try {
                    const infos = await getMemberInfosBySendersEnsure(
                        this.conversation.con_id,
                        BigInt(this.conversation.con_short_id),
                        senders
                    );

                    if (Array.isArray(infos)) {
                        for (const info of infos) {
                            const key = `${Number(info.sender_type)}:${String(info.sender_id)}`;
                            this.senderInfoMap.set(key, {
                                nick_name: info.nick_name || '',
                                avatar_uri: info.avatar_uri || ''
                            });
                        }
                    }
                } catch (err) {
                    console.error('getMemberInfosBySenders failed:', err);
                }
            }

            for (const message of messages) {
                if (!message) continue;
                if (Number(message.sender_type) !== 1 && Number(message.sender_type) !== 2) continue;

                const key = `${Number(message.sender_type)}:${String(message.sender_id)}`;
                const cached = this.senderInfoMap.get(key);

                if (cached) {
                    if (!message.nick_name) {
                        message.nick_name = cached.nick_name || '';
                    }
                    if (!message.avatar_uri) {
                        message.avatar_uri = cached.avatar_uri || '';
                    }
                }
            }
        },

        normalizeMessages(messages) {
            if (!Array.isArray(messages)) return;

            for (const message of messages) {
                if (!message) continue;

                if (this.isShareMessage(message)) {
                    message.share_content = this.parseShareContent(message);
                }
            }
        },

        isShareMessage(message) {
            return !!message && Number(message.msg_type ?? message.msgType) === 4;
        },

        parseShareContent(message) {
            const raw = message?.msg_content ?? message?.content ?? '';

            if (!raw) return {};

            if (typeof raw === 'object') {
                return raw;
            }

            try {
                const data = JSONbig.parse(String(raw));
                return data && typeof data === 'object' ? data : {};
            } catch (err) {
                try {
                    const data = JSON.parse(String(raw));
                    return data && typeof data === 'object' ? data : {};
                } catch (e) {
                    console.error('parse share message failed:', e);
                    return {};
                }
            }
        },

        getShareContent(message) {
            if (!message) return {};

            if (message.share_content && typeof message.share_content === 'object') {
                return message.share_content;
            }

            return this.parseShareContent(message);
        },

        getShareCoverUrl(message) {
            const share = this.getShareContent(message);

            return share.coverUrl ||
                share.cover_url ||
                share.image ||
                share.materialUrl ||
                share.material_url ||
                this.defaultCover;
        },

        getShareTitle(message) {
            const share = this.getShareContent(message);

            return share.title || share.name || '未命名作品';
        },

        getShareAuthorAvatar(message) {
            const share = this.getShareContent(message);
            const cached = this.getShareAuthorInfo(message);

            return share.authorAvatarUrl ||
                share.author_avatar_url ||
                share.authorAvatar ||
                share.author_avatar ||
                share.avatar ||
                cached.avatar ||
                this.userDefaultAvatar;
        },

        getShareAuthorName(message) {
            const share = this.getShareContent(message);
            const cached = this.getShareAuthorInfo(message);

            return share.authorName ||
                share.author_name ||
                share.username ||
                cached.username ||
                cached.name ||
                '未知作者';
        },

        isShareVideo(message) {
            const share = this.getShareContent(message);
            const materialType = share.materialType ?? share.material_type;
            const type = share.type ?? share.creationType ?? share.creation_type;
            return type === 'video' || Number(materialType) === 2;
        },

        getShareMaterialTypeIcon(message) {
            return this.isShareVideo(message) ? '▶' : '';
        },

        getIdString(value) {
            if (value === null || value === undefined) return '';
            return String(value);
        },

        getShareAuthorId(message) {
            const share = this.getShareContent(message);

            return this.getIdString(
                share.authorId ??
                share.author_id ??
                share.userId ??
                share.user_id ??
                ''
            );
        },

        getShareAuthorInfo(message) {
            const authorId = this.getShareAuthorId(message);
            if (!authorId) return {};
            return this.shareAuthorInfoMap.get(String(authorId)) || {};
        },

        collectShareAuthorIds(messages) {
            const idSet = new Set();

            for (const message of messages || []) {
                if (!this.isShareMessage(message)) continue;

                const authorId = this.getShareAuthorId(message);
                if (!authorId) continue;
                if (this.shareAuthorInfoMap.has(String(authorId))) continue;

                idSet.add(String(authorId));
            }

            return Array.from(idSet);
        },

        async ensureShareAuthorInfos(messages) {
            const userIds = this.collectShareAuthorIds(messages);
            if (!userIds.length) return;

            try {
                const res = await getUserInfos({ userIds });
                const list = Array.isArray(res)
                    ? res
                    : (res && Array.isArray(res.user_infos))
                        ? res.user_infos
                        : (res && Array.isArray(res.users))
                            ? res.users
                            : [];

                for (const user of list) {
                    if (!user) continue;

                    const userId = this.getIdString(user.user_id ?? user.userId ?? user.id ?? '');
                    if (!userId) continue;

                    this.shareAuthorInfoMap.set(String(userId), {
                        user_id: userId,
                        username: user.username || user.name || user.nick_name || '',
                        name: user.username || user.name || user.nick_name || '',
                        avatar: user.avatar || user.avatar_url || user.avatarUrl || ''
                    });
                }
            } catch (err) {
                console.error('get share author infos failed:', err);
            }
        },

        getShareCreationId(message) {
            const share = this.getShareContent(message);

            return this.getIdString(
                share.creationId ??
                share.creation_id ??
                ''
            );
        },

        isSelfMessage(message) {
            return !!message && Number(message.sender_type) === 1 && String(message.sender_id) === String(this.userId);
        },

        isOtherSenderMessage(message) {
            return !!message &&
                (Number(message.sender_type) === 1 || Number(message.sender_type) === 2) &&
                !this.isSelfMessage(message);
        },

        compareBigIntLike(a, b) {
            const aa = BigInt(a || 0);
            const bb = BigInt(b || 0);
            if (aa === bb) return 0;
            return aa > bb ? 1 : -1;
        },

        goBack() {
            uni.navigateBack();
        },

        goToSettings() {
            uni.navigateTo({
                url: `/pages/im/setting?conId=${this.conversation.con_id}&conType=${this.conversation.con_type}`
            });
        },

        async sendMessage() {
            if (!this.canSendMessage) return;
            if (this.inputText.trim() === '') return;

            const clientMsgId = getApp().globalData.randomIdGenerator.nextId();
            const sendingText = this.inputText;

            const payload = {
                conShortId: BigInt(this.conversation.con_short_id),
                conId: this.conversation.con_id,
                conType: this.conversation.con_type,
                clientMsgId: clientMsgId,
                msgType: 1,
                msgContent: sendingText
            };

            const res = await sendMessage(payload);

            if (res) {
                const selfKey = `1:${String(this.userId)}`;
                let selfInfo = this.senderInfoMap.get(selfKey) || {};

                if (!selfInfo.nick_name || !selfInfo.avatar_uri) {
                    try {
                        const infos = await getMemberInfosBySendersEnsure(
                            this.conversation.con_id,
                            BigInt(this.conversation.con_short_id),
                            [{ sender_type: 1, sender_id: this.userId }]
                        );

                        if (Array.isArray(infos) && infos.length > 0) {
                            selfInfo = {
                                nick_name: infos[0].nick_name || '',
                                avatar_uri: infos[0].avatar_uri || ''
                            };
                            this.senderInfoMap.set(selfKey, selfInfo);
                        }
                    } catch (err) {
                        console.error('get self member info failed:', err);
                    }
                }

                const optimisticMessage = {
                    sender_id: this.userId,
                    sender_type: 1,
                    con_short_id: this.conversation.con_short_id,
                    con_id: this.conversation.con_id,
                    con_type: this.conversation.con_type,
                    client_msg_id: clientMsgId,
                    msg_id: res.msg_id,
                    msg_type: 1,
                    msg_content: sendingText,
                    create_time: Date.now() / 1000,
                    status: -1,
                    nick_name: selfInfo.nick_name || '',
                    avatar_uri: selfInfo.avatar_uri || this.myAvatar || ''
                };

                this.senderInfoMap.set(selfKey, {
                    nick_name: optimisticMessage.nick_name || '',
                    avatar_uri: optimisticMessage.avatar_uri || ''
                });

                if (
                    this.messages.length === 0 ||
                    this.compareBigIntLike(this.messages[this.messages.length - 1].client_msg_id, clientMsgId) < 0
                ) {
                    this.messages.push(optimisticMessage);
                }

                this.inputText = '';
                this.scrollToBottom();
            }
        },

        goToUserProfile(message) {
            if (Number(message.sender_type) == 1) {
                if (String(message.sender_id) === String(this.userId)) {
                    uni.navigateTo({
                        url: '/pages/user/my_profile_copy'
                    });
                    return;
                }

                uni.navigateTo({
                    url: `/pages/user/user_profile?userId=${BigInt(message.sender_id)}`
                });
                return;
            }

            uni.navigateTo({
                url: `/pages/agent/agent_detail?agentId=${encodeURIComponent(message.sender_id)}`
            });
        },

        goToUserPage(userId) {
            const targetId = this.getIdString(userId);
            if (!targetId) return;

            const currentUserId = getApp().globalData.userId;

            if (String(targetId) === String(currentUserId)) {
                uni.navigateTo({
                    url: '/pages/user/my_profile_copy'
                });
                return;
            }

            uni.navigateTo({
                url: `/pages/user/user_profile?userId=${encodeURIComponent(targetId)}`
            });
        },

        goToShareUserPage(message) {
            const authorId = this.getShareAuthorId(message);
            this.goToUserPage(authorId);
        },

        goToShareCreationDetail(message) {
            if (this.messageTouch.moved) return;

            const share = this.getShareContent(message);
            const creationId = this.getShareCreationId(message);
            if (!creationId) return;

            const userId = this.getShareAuthorId(message);
            const materialType = share.materialType ?? share.material_type;
            const type = share.type ?? share.creationType ?? share.creation_type;

            const isVideo = type === 'video' || Number(materialType) === 2;

            const basePath = isVideo
                ? '/pages/creation/creation_video'
                : '/pages/creation/creation_image';

            uni.navigateTo({
                url: `${basePath}?creationId=${encodeURIComponent(creationId)}&userId=${encodeURIComponent(userId || '')}`
            });
        },

        scrollToBottom() {
            this.$nextTick(() => {
                if (this.messages.length > 0) {
                    this.scrollIntoViewId = 'message-' + String(this.messages[this.messages.length - 1].msg_id);
                }
            });
        },

        async onScroll(e) {
            if (e.detail.scrollTop == 0 && this.hasMore) {
                this.isLoading = true;

                let res = await DB.pullMessage(this.conversation.con_id, this.conIndex);
                await this.fillSenderInfos(res);
                this.normalizeMessages(res);
                await this.ensureShareAuthorInfos(res);

                let newMessages = res.reverse();

                if (res.length > 0) {
                    if (this.conIndex != newMessages[res.length - 1].con_index) {
                        console.error('TODO:getByConversation');
                    }
                    this.conIndex = newMessages[0].con_index - 1;
                }

                if (this.conIndex <= this.conversation.min_index) {
                    this.hasMore = false;
                } else if (res.length < 20) {
                    res = await getMessageByConversation(
                        this.conversation.con_short_id,
                        this.conIndex,
                        20 - res.length
                    );

                    if (res.length > 0) {
                        await this.fillSenderInfos(res);
                        this.normalizeMessages(res);
                        await this.ensureShareAuthorInfos(res);

                        res.reverse();
                        newMessages = res.concat(newMessages);
                        this.conIndex = newMessages[0].con_index - 1;
                    }

                    if (res.length === 0 || this.conIndex <= this.conversation.min_index) {
                        this.hasMore = false;
                    }
                }

                const firstMsgId = this.messages.length > 0 ? this.messages[0].msg_id : '';

                this.$nextTick(() => {
                    this.messages = newMessages.concat(this.messages);

                    if (firstMsgId) {
                        this.scrollIntoViewId = 'message-' + String(firstMsgId);
                    }

                    this.isLoading = false;
                });
            }
        },

        onMessageTouchStart(e) {
            const touch = e?.changedTouches?.[0] || e?.touches?.[0] || {};
            this.messageTouch = {
                startX: touch.clientX ?? touch.pageX ?? 0,
                startY: touch.clientY ?? touch.pageY ?? 0,
                moved: false
            };
        },

        onMessageTouchMove(e) {
            const touch = e?.changedTouches?.[0] || e?.touches?.[0] || {};
            const x = touch.clientX ?? touch.pageX ?? 0;
            const y = touch.clientY ?? touch.pageY ?? 0;
            const dx = Math.abs(x - this.messageTouch.startX);
            const dy = Math.abs(y - this.messageTouch.startY);

            if (dx > 8 || dy > 8) {
                this.messageTouch.moved = true;
            }
        },

        onMessageTouchEnd() {
            setTimeout(() => {
                this.messageTouch = {
                    startX: 0,
                    startY: 0,
                    moved: false
                };
            }, 80);
        },

        showMessageActions(e, message) {
            if (!message) return;
            if (Number(message.sender_type) === 3 || Number(message.send_type) === 3) return;
            if (this.messageTouch.moved) return;

            const canCopy = this.canCopyMessage(message);
            const canRecall = this.canRecallMessage(message);

            if (!canCopy && !canRecall) return;

            const point = this.getLongPressPoint(e);
            const menuWidth = canCopy && canRecall ? 128 : 72;
            const menuHeight = 42;
            const sys = uni.getSystemInfoSync();

            let left = point.x - menuWidth / 2;
            let top = point.y - menuHeight - 12;

            left = Math.max(8, Math.min(left, sys.windowWidth - menuWidth - 8));
            if (top < this.headerHeight) top = point.y + 12;
            top = Math.max(8, Math.min(top, sys.windowHeight - menuHeight - 8));

            this.messageAction = {
                visible: true,
                left,
                top,
                message
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

        hideMessageActions() {
            this.messageAction = {
                visible: false,
                left: 0,
                top: 0,
                message: null
            };
        },

        canCopyMessage(message) {
            if (!message) return false;
            if (this.isShareMessage(message)) return false;
            if (Number(message.sender_type) === 3 || Number(message.send_type) === 3) return false;

            const text = message.msg_content;
            return text !== null && text !== undefined && String(text).length > 0;
        },

        canRecallMessage(message) {
            if (!this.isSelfMessage(message)) return false;
            if (!message?.msg_id) return false;
            if (message.status == -1) return false;

            let createTime = Number(message.create_time || 0);
            if (!Number.isFinite(createTime) || createTime <= 0) return false;
            if (createTime > 1e12) createTime = createTime / 1000;

            const now = Date.now() / 1000;
            return now - createTime <= 5 * 60;
        },

        copyMessage() {
            const message = this.messageAction.message;

            if (!this.canCopyMessage(message)) {
                this.hideMessageActions();
                return;
            }

            const text = message?.msg_content || '';

            this.hideMessageActions();

            uni.setClipboardData({
                data: String(text),
                success: () => {
                    uni.showToast({
                        title: '已复制',
                        icon: 'none'
                    });
                }
            });
        },

        async recallSelectedMessage() {
            const message = this.messageAction.message;

            if (!this.canRecallMessage(message)) {
                this.hideMessageActions();
                return;
            }

            const msgId = message.msg_id;
            const index = this.findMessageIndexById(msgId);

            this.hideMessageActions();

            const ok = await recallMessage({
                conShortId: this.conversation.con_short_id,
                msg_id: msgId
            });

            if (!ok) return;

            if (index !== -1) {
                this.messages.splice(index, 1, {
                    ...this.messages[index],
                    status: -1
                });
            }
        },

        findMessageIndexById(msgId) {
            return this.messages.findIndex(item => String(item.msg_id) === String(msgId));
        },

        handleConversationCommand(cmdMessage) {
            if (cmdMessage.type == 3) {
                const newName = cmdMessage.content || '群聊';
                this.chatName = newName;
                this.conversation.name = newName;
                uni.setNavigationBarTitle({ title: newName });
            }
        },

        formatTime(timestamp) {
            const now = Date.now() / 1000;
            const diff = now - Number(timestamp);

            if (diff < 60) return '刚刚';
            if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
            if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
            if (diff < 604800) return Math.floor(diff / 86400) + '天前';

            const date = new Date(Number(timestamp) * 1000);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        },

        shouldShowTime(index) {
            try {
                if (index === 0) return true;

                const currentTime = Number(this.messages[index].create_time);
                const prevTime = Number(this.messages[index - 1].create_time);
                const timeDiff = (currentTime - prevTime) / 60;

                return timeDiff > 5;
            } catch (err) {
                console.log(err);
                return false;
            }
        }
    }
};
</script>

<style scoped>
.chat-container {
    position: relative;
    height: 100vh;
    background: #f0f2f5;
    overflow: hidden;
}

.chat-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 120;
    background: #fff;
    border-bottom: 1px solid #e5e5e5;
    box-sizing: border-box;
}

.chat-header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    box-sizing: border-box;
}

.header-left,
.header-right,
.header-right-placeholder {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.back-icon {
    font-size: 30px;
    line-height: 30px;
    color: #333;
    font-weight: 300;
}

.header-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
}

.chat-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.settings-icon {
    font-size: 22px;
    color: #333;
    font-weight: 600;
}

.chat-messages {
    position: fixed;
    left: 0;
    right: 0;
    overflow-y: auto;
    padding: 8px 8px 8px 8px;
    box-sizing: border-box;
}

.messages {
    min-height: 100%;
    display: flex;
    flex-direction: column;
}

.loading-tip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.loading-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #f3f3f3;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loading-text {
    font-size: 12px;
    color: #999;
}

.message-time {
    display: flex;
    justify-content: center;
    align-items: center;
}

.time-text {
    font-size: 9px;
    line-height: 12px;
    color: #999;
    background: rgba(0, 0, 0, 0.05);
    padding: 1px 8px;
    border-radius: 9px;
}

.message {
    display: flex;
    align-items: flex-start;
    padding: 0;
}

.message-left {
    justify-content: flex-start;
}

.message-right {
    justify-content: flex-end;
}

.message-center {
    justify-content: center;
    align-items: center;
}

.avatar-box {
    flex-shrink: 0;
}

.avatar {
    border: 2px solid #fff;
    box-sizing: border-box;
}

.message-left .avatar-box {
    margin-left: 0;
    margin-right: 7px;
}

.message-right .avatar-box {
    margin-left: 7px;
    margin-right: 0;
}

.message-content {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.message-content-left {
    max-width: calc(100% - 82px);
    align-items: flex-start;
}

.message-content-right {
    flex: 0 1 auto;
    max-width: calc(100% - 82px);
    align-items: flex-end;
}

.sender-name {
    font-size: 9px;
    line-height: 11px;
    color: #999;
    margin: 0 0 2px 6px;
}

.sender-name-right {
    margin: 0 6px 2px 0;
    text-align: right;
    align-self: flex-end;
}

.bubble {
    padding: 5px 10px;
    border-radius: 13px;
    word-break: break-word;
    position: relative;
    display: inline-block;
}

.bubble-text {
    font-size: 13px;
    line-height: 18px;
    text-align: left;
}

.bubble-left {
    background: #fff;
    color: #333;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    text-align: left;
}

.bubble-right {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    text-align: left;
}

.self-bubble-row {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
}

.message-status {
    width: 14px;
    min-width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 4px;
    padding-top: 7px;
    flex-shrink: 0;
    box-sizing: content-box;
}

.status-loading {
    width: 11px;
    height: 11px;
    border: 2px solid rgba(102, 126, 234, 0.3);
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.share-card {
    background: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.055);
    transition: all 0.24s;
}

.share-card-left {
    align-self: flex-start;
}

.share-card-right {
    align-self: flex-end;
}

.share-card:active {
    transform: translateY(-1px);
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
}

.share-image-wrapper {
    position: relative;
    width: 100%;
    overflow: hidden;
    background: #f3f3f3;
}

.share-card-image {
    width: 100%;
    height: 100%;
    display: block;
}

.share-video-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 20px;
    height: 20px;
    background: rgba(0, 0, 0, 0.42);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.share-video-badge-icon {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.94);
    line-height: 1;
    margin-left: 1px;
}

.share-card-content {
    padding: 4px 6px;
    box-sizing: border-box;
}

.share-card-title-container {
    height: 16px;
    margin-bottom: 2px;
}

.share-card-title {
    font-size: 11px;
    font-weight: 500;
    color: #333;
    line-height: 16px;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.share-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 16px;
}

.share-card-author {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
}

.share-author-avatar {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid #f0f0f0;
    flex-shrink: 0;
    background: #f0f0f0;
}

.share-author-name {
    font-size: 10px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.system-message {
    padding: 1px 8px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 9px;
    max-width: 80%;
}

.system-text {
    font-size: 9px;
    line-height: 12px;
    color: #666;
    text-align: center;
}

.message-action-mask {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
    background: transparent;
}

.message-action-menu {
    position: fixed;
    height: 42px;
    background: #ffffff;
    border-radius: 8px;
    display: flex;
    align-items: center;
    overflow: hidden;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}

.message-action-item {
    min-width: 64px;
    height: 42px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #333333;
    border-right: 1px solid #eeeeee;
    box-sizing: border-box;
}

.message-action-item:last-child {
    border-right: none;
}

.message-action-item:active {
    background: #f5f5f5;
}

.danger-action {
    color: #333333;
}

.input-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    padding: 6px 14px 6px;
    background: #fff;
    border-top: 1px solid #e5e5e5;
    gap: 10px;
    box-sizing: border-box;
    z-index: 110;
}

.disabled-input-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 14px;
    background: #fff;
    border-top: 1px solid #e5e5e5;
    box-sizing: border-box;
    z-index: 110;
}

.disabled-input-text {
    font-size: 13px;
    color: #999;
}

.input-wrapper {
    flex: 1;
    background: #f0f2f5;
    border-radius: 20px;
    overflow: hidden;
}

.input-field {
    height: 36px;
    padding: 0 14px;
    font-size: 14px;
    color: #333;
    background: transparent;
}

.input-placeholder {
    color: #999;
}

.send-btn {
    width: 36px;
    height: 36px;
    background: #e0e0e0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
    flex-shrink: 0;
}

.send-btn-active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.send-btn:active {
    transform: scale(0.95);
}

.send-icon {
    font-size: 18px;
    font-weight: bold;
    color: #999;
}

.send-btn-active .send-icon {
    color: #fff;
}
</style>
