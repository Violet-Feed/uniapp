<template>
    <view class="chat-container">
        <view class="chat-header" :style="chatHeaderStyle">
            <view class="chat-header-content" :style="chatHeaderContentStyle">
                <view class="header-left" :style="headerButtonStyle" @click="goBack">
                    <text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
                </view>

                <view class="header-center">
                    <text class="chat-title" :style="chatTitleStyle">{{ chatName }}</text>
                </view>

                <view
                    class="header-right"
                    :style="headerButtonStyle"
                    @click="goToSettings"
                    v-if="conversation.con_type == 2 && canSendMessage"
                >
                    <text class="iconfont icon-gengduo settings-icon" :style="settingsIconStyle"></text>
                </view>

                <view class="header-right-placeholder" :style="headerButtonStyle" v-else></view>
            </view>
        </view>

        <scroll-view
            class="chat-messages"
            :style="chatMessagesStyle"
            scroll-y="true"
            :scroll-into-view="scrollIntoViewId"
            @scroll="onScroll"
            @touchstart="onChatScrollTouchStart"
        >
            <view class="messages">
                <view v-if="isLoading" class="loading-tip" :style="systemRowStyle">
                    <view class="loading-spinner" :style="loadingSpinnerStyle"></view>
                    <text class="loading-text" :style="loadingTextStyle">加载中...</text>
                </view>

                <view
                    v-for="(message, index) in messages"
                    :key="String(message.msg_id || index)"
                    :id="'message-' + String(message.msg_id)"
                >
                    <view class="message-time" :style="systemRowStyle" v-if="shouldShowTime(index)">
                        <text class="time-text" :style="timeTextStyle">{{ formatTime(message.create_time) }}</text>
                    </view>

                    <view class="message message-right" :style="messageRowStyle" v-if="isSelfMessage(message)">
                        <view class="message-content message-content-right" :style="messageContentStyle">
                            <text
                                v-if="message.nick_name || message.global_name"
                                class="sender-name sender-name-right"
                                :style="senderNameRightStyle"
                            >
                                {{ message.nick_name || message.global_name }}
                            </text>

                            <view class="self-bubble-row">
                                <view class="message-status" :style="messageStatusStyle">
                                    <view class="status-loading" :style="statusLoadingStyle" v-if="message.status == -1"></view>
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
                                        <image class="share-card-image" :src="message.share_content.coverUrl" mode="aspectFill"></image>
                                        <view class="share-video-badge" v-if="Number(message.share_content.materialType) === 2">
                                            <text class="share-video-badge-icon">▶</text>
                                        </view>
                                    </view>

                                    <view class="share-card-content" :style="shareCardContentStyle">
                                        <view class="share-card-title-container">
                                            <text class="share-card-title">{{ message.share_content.title || '未知作品' }}</text>
                                        </view>

                                        <view class="share-card-footer">
                                            <view class="share-card-author" @click.stop="goToShareUserPage(message)">
                                                <image
                                                    class="share-author-avatar"
                                                    :src="getShareAuthorInfo(message).avatar || userDefaultAvatar"
                                                    mode="aspectFill"
                                                ></image>
                                                <text class="share-author-name">
                                                    {{ getShareAuthorInfo(message).username || '未知作者' }}
                                                </text>
                                            </view>
                                        </view>
                                    </view>
                                </view>

                                <view
                                    v-else
                                    class="bubble bubble-right"
                                    :style="bubbleStyle"
                                    @touchstart="onMessageTouchStart"
                                    @touchmove="onMessageTouchMove"
                                    @touchend="onMessageTouchEnd"
                                    @touchcancel="onMessageTouchEnd"
                                    @longpress.stop="showMessageActions($event, message)"
                                >
                                    <text class="bubble-text" :style="bubbleTextStyle">{{ message.msg_content }}</text>
                                </view>
                            </view>
                        </view>

                        <view class="avatar-box" :style="avatarBoxStyle" @click="goToUserProfile(message)">
                            <image
                                class="avatar"
                                :style="avatarStyle"
                                :src="message.avatar_uri || message.local_avatar_uri || userDefaultAvatar"
                                mode="aspectFill"
                                @error="onMsgAvatarErr(message)"
                            ></image>
                        </view>
                    </view>

                    <view class="message message-left" :style="messageRowStyle" v-else-if="isOtherSenderMessage(message)">
                        <view class="avatar-box" :style="avatarBoxStyle" @click="goToUserProfile(message)">
                            <image
                                class="avatar"
                                :style="avatarStyle"
                                :src="message.avatar_uri || message.local_avatar_uri || (message.sender_type == 1 ? userDefaultAvatar : aiDefaultAvatar)"
                                mode="aspectFill"
                                @error="onMsgAvatarErr(message)"
                            ></image>
                        </view>

                        <view class="message-content message-content-left" :style="messageContentStyle">
                            <text v-if="message.nick_name || message.global_name" class="sender-name" :style="senderNameStyle">
                                {{ message.nick_name || message.global_name }}
                            </text>

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
                                    <image class="share-card-image" :src="message.share_content.coverUrl" mode="aspectFill"></image>
                                    <view class="share-video-badge" v-if="Number(message.share_content.materialType) === 2">
                                        <text class="share-video-badge-icon">▶</text>
                                    </view>
                                </view>

                                <view class="share-card-content" :style="shareCardContentStyle">
                                    <view class="share-card-title-container">
                                        <text class="share-card-title">{{ message.share_content.title || '未知作品' }}</text>
                                    </view>

                                    <view class="share-card-footer">
                                        <view class="share-card-author" @click.stop="goToShareUserPage(message)">
                                            <image
                                                class="share-author-avatar"
                                                :src="getShareAuthorInfo(message).avatar || userDefaultAvatar"
                                                mode="aspectFill"
                                            ></image>
                                            <text class="share-author-name">
                                                {{ getShareAuthorInfo(message).username || '未知作者' }}
                                            </text>
                                        </view>
                                    </view>
                                </view>
                            </view>

                            <view
                                v-else
                                class="bubble bubble-left"
                                :style="bubbleStyle"
                                @touchstart="onMessageTouchStart"
                                @touchmove="onMessageTouchMove"
                                @touchend="onMessageTouchEnd"
                                @touchcancel="onMessageTouchEnd"
                                @longpress.stop="showMessageActions($event, message)"
                            >
                                <text class="bubble-text" :style="bubbleTextStyle">{{ message.msg_content }}</text>
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
                            <text class="system-text" :style="systemTextStyle">{{ message.msg_content }}</text>
                        </view>
                    </view>
                </view>
            </view>
        </scroll-view>

		<view
            v-if="floatingUnreadCount > 0"
            class="new-message-float"
            :style="newMessageFloatStyle"
            @click="jumpToFirstFloatingUnread"
        >
            <text class="new-message-float-text">{{ floatingUnreadCount }} 条新消息</text>
        </view>

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
            <view class="input-wrapper" :style="inputWrapperStyle">
                <textarea
                    class="input-field"
                    :style="inputFieldStyle"
                    v-model="inputText"
                    placeholder="说点什么..."
                    placeholder-class="input-placeholder"
                    :adjust-position="false"
                    :focus="inputFocused"
                    cursor-spacing="0"
                    :maxlength="-1"
                    :show-confirm-bar="false"
                    :disable-default-padding="true"
                    @focus="handleInputFocus"
                    @blur="handleInputBlur"
                    @keyboardheightchange="handleKeyboardHeightChange"
                    @linechange="handleInputLineChange"
                />
            </view>

            <view
                class="send-btn"
                :class="{ 'send-btn-active': inputText.trim() }"
                :style="sendButtonStyle"
                @touchstart.prevent.stop="handleSendTouchStart"
                @touchend.prevent.stop="handleSendTouchEnd"
                @touchcancel.prevent.stop="handleSendTouchCancel"
            >
                <text class="send-text" :style="sendTextStyle">发送</text>
            </view>
        </view>

        <view class="disabled-input-bar" :style="inputBarStyle" v-else>
            <text class="disabled-input-text" :style="disabledInputTextStyle">无法在已退出的群聊中发送消息</text>
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

const clamp = (value, min, max) => {
    return Math.max(min, Math.min(max, value));
};

export default {
    data() {
        return {
            userId: getApp().globalData.userId,
            senderInfoMap: new Map(),
            shareAuthorInfoMap: new Map(),
            conversation: {},
            conIndex: Number.MAX_SAFE_INTEGER,
            messages: [],
            inputText: '',
            scrollIntoViewId: '',
            hasMore: true,
            isLoading: false,
			
			isAtBottom: true,
			chatScrollTop: 0,
			bottomThreshold: 80,
			
			floatingUnreadIds: [],
			floatingUnreadMap: {},
			firstFloatingUnreadId: '',
			
			checkFloatingUnreadTimer: null,
			checkingFloatingUnreadVisible: false,
			
            normalListener: null,
            commandListener: null,
            appListener: null,
            
            imInitLoading: false,
            imInitFinishing: false,
			imEventQueue: [],
			imEventProcessing: false,
			maxConIndex: 0,
			
            chatName: '',
            userDefaultAvatar: '/static/user_avatar.png',
            aiDefaultAvatar: '/static/ai_avatar.png',
            firstPageProfileRefreshed: false,
            groupProfileTtlMs: 7 * 24 * 60 * 60 * 1000,

            windowHeight: 667,
            windowWidth: 375,
            statusBarHeight: 0,
            bottomSafeHeight: 0,

            headerHeight: 42,
            headerContentHeight: 42,
            headerButtonSize: 30,
            headerTitleFontSize: 16,
            backIconSize: 19,
            settingsIconSize: 20,

            inputBarHeight: 44,
            baseInputBarHeight: 44,

            inputContentHeight: 34,
            baseInputContentHeight: 34,
            maxInputContentHeight: 94,

            textareaLineHeight: 20,
            textareaPaddingTop: 7,
            textareaPaddingBottom: 7,
            textareaPaddingLeft: 13,
            textareaPaddingRight: 22,

            inputBarTopGap: 4,
            inputBarBottomGap: 4,

            inputFontSize: 14,
            sendButtonHeight: 34,
            sendButtonWidth: 52,
            sendTextFontSize: 13,

            messageUnitHeight: 46,
            halfMessageHeight: 23,
            avatarSize: 38,
            messageGap: 8,
            messageSidePadding: 10,
            avatarGap: 8,
            bubbleFontSize: 14,
            bubbleLineHeight: 20,
            bubbleVerticalPadding: 7,
            bubbleHorizontalPadding: 11,
            bubbleRadius: 14,
            senderNameFontSize: 10,
            senderNameLineHeight: 12,
            timeFontSize: 10,
            timeLineHeight: 13,
            systemFontSize: 10,
            systemLineHeight: 13,

            shareCardWidth: 176,
            shareCardHeight: 246,
            shareImageHeight: 176,
            shareContentHeight: 70,
			
            inputBottomOffset: 0,
            inputFocused: false,
            keyboardVisible: false,
            keyboardHeight: 0,
            inputBlurTimer: null,
            sendingByTouch: false,
            sendingMessage: false,

            readMarkBaseIndex: '0',
            readMarkBaseBadgeCount: 0,
            pendingReadIndexEnd: '',
            pendingReadBadgeCount: 0,
            pendingReadMsgMap: {},
            readMarkFlushed: false,

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
            return [
                'height:' + this.headerContentHeight + 'px',
                'margin-top:' + this.statusBarHeight + 'px',
                'padding-left:' + this.messageSidePadding + 'px',
                'padding-right:' + this.messageSidePadding + 'px'
            ].join(';') + ';';
        },

        headerButtonStyle() {
            return 'width:' + this.headerButtonSize + 'px;height:' + this.headerButtonSize + 'px;';
        },

        backIconStyle() {
            return 'font-size:' + this.backIconSize + 'px;';
        },

        settingsIconStyle() {
            return 'font-size:' + this.settingsIconSize + 'px;';
        },

        chatTitleStyle() {
            return [
                'font-size:' + this.headerTitleFontSize + 'px',
                'max-width:' + Math.floor(this.windowWidth * 0.62) + 'px'
            ].join(';') + ';';
        },

        chatMessagesStyle() {
            const bottom = this.inputBarHeight + this.inputBottomOffset;
        
            return [
                'top:' + this.headerHeight + 'px',
                'bottom:' + bottom + 'px',
                'padding:' + Math.max(8, Math.floor(this.messageGap * 0.9)) + 'px ' + this.messageSidePadding + 'px ' + Math.max(10, this.messageGap) + 'px'
            ].join(';') + ';';
        },

        inputBarStyle() {
            return [
                'height:' + this.inputBarHeight + 'px',
                'padding-top:' + this.inputBarTopGap + 'px',
                'padding-bottom:' + (this.bottomSafeHeight + this.inputBarBottomGap) + 'px',
                'bottom:' + this.inputBottomOffset + 'px',
                'box-sizing:border-box',
                'align-items:flex-end'
            ].join(';') + ';';
        },


        inputWrapperStyle() {
            const radiusBase = this.baseInputContentHeight || 34;

            return [
                'height:' + this.inputContentHeight + 'px',
                'border-radius:' + Math.floor(radiusBase / 2) + 'px',
                'align-self:flex-end',
                'box-sizing:border-box'
            ].join(';') + ';';
        },

        inputFieldStyle() {
            return [
                'height:' + this.inputContentHeight + 'px',
                'min-height:' + this.baseInputContentHeight + 'px',
                'max-height:' + this.maxInputContentHeight + 'px',
                'font-size:' + this.inputFontSize + 'px',
                'line-height:' + this.textareaLineHeight + 'px',
                'padding-top:' + this.textareaPaddingTop + 'px',
                'padding-bottom:' + this.textareaPaddingBottom + 'px',
                'padding-left:' + this.textareaPaddingLeft + 'px',
                'padding-right:' + this.textareaPaddingRight + 'px',
                'box-sizing:border-box',
                'overflow-y:auto'
            ].join(';') + ';';
        },

        sendButtonStyle() {
            const marginBottom = Math.max(
                0,
                Math.floor((this.baseInputContentHeight - this.sendButtonHeight) / 2)
            );

            return [
                'width:' + this.sendButtonWidth + 'px',
                'height:' + this.sendButtonHeight + 'px',
                'border-radius:' + Math.floor(this.sendButtonHeight / 2) + 'px',
                'align-self:flex-end',
                'margin-bottom:' + marginBottom + 'px'
            ].join(';') + ';';
        },

        sendTextStyle() {
            return 'font-size:' + this.sendTextFontSize + 'px;';
        },

        disabledInputTextStyle() {
            return 'font-size:' + this.inputFontSize + 'px;';
        },

        messageRowStyle() {
            return 'margin-bottom:' + this.messageGap + 'px;';
        },

        systemRowStyle() {
            return 'height:' + this.halfMessageHeight + 'px;margin-bottom:' + Math.max(3, Math.floor(this.messageGap * 0.45)) + 'px;';
        },

        loadingSpinnerStyle() {
            const size = clamp(Math.floor(this.timeFontSize * 1.28), 12, 15);
            return 'width:' + size + 'px;height:' + size + 'px;';
        },

        loadingTextStyle() {
            return 'font-size:' + this.timeFontSize + 'px;';
        },

        timeTextStyle() {
            return 'font-size:' + this.timeFontSize + 'px;line-height:' + this.timeLineHeight + 'px;';
        },

        systemTextStyle() {
            return 'font-size:' + this.systemFontSize + 'px;line-height:' + this.systemLineHeight + 'px;';
        },

        avatarBoxStyle() {
            return 'width:' + this.avatarSize + 'px;height:' + this.avatarSize + 'px;';
        },

        avatarStyle() {
            return 'width:' + this.avatarSize + 'px;height:' + this.avatarSize + 'px;border-radius:' + Math.floor(this.avatarSize / 2) + 'px;';
        },

        messageContentStyle() {
            return [
                'min-height:' + this.avatarSize + 'px',
                'max-width:calc(100% - ' + (this.avatarSize + this.avatarGap + 46) + 'px)'
            ].join(';') + ';';
        },

        senderNameStyle() {
            return 'font-size:' + this.senderNameFontSize + 'px;line-height:' + this.senderNameLineHeight + 'px;margin-bottom:' + Math.max(3, Math.floor(this.messageGap * 0.32)) + 'px;';
        },

        senderNameRightStyle() {
            return 'font-size:' + this.senderNameFontSize + 'px;line-height:' + this.senderNameLineHeight + 'px;margin-bottom:' + Math.max(3, Math.floor(this.messageGap * 0.32)) + 'px;';
        },

        bubbleStyle() {
            return [
                'padding:' + this.bubbleVerticalPadding + 'px ' + this.bubbleHorizontalPadding + 'px',
                'border-radius:' + this.bubbleRadius + 'px',
                'max-width:' + Math.floor(this.windowWidth * 0.68) + 'px'
            ].join(';') + ';';
        },

        bubbleTextStyle() {
            return 'font-size:' + this.bubbleFontSize + 'px;line-height:' + this.bubbleLineHeight + 'px;';
        },

        messageStatusStyle() {
            const size = clamp(Math.floor(this.avatarSize * 0.42), 14, 18);
            return [
                'width:' + size + 'px',
                'min-width:' + size + 'px',
                'height:' + size + 'px',
                'margin-right:' + Math.max(4, Math.floor(this.avatarGap * 0.55)) + 'px',
                'padding-top:' + Math.floor(this.bubbleVerticalPadding + 1) + 'px'
            ].join(';') + ';';
        },

        statusLoadingStyle() {
            const size = clamp(Math.floor(this.avatarSize * 0.31), 11, 14);
            return 'width:' + size + 'px;height:' + size + 'px;';
        },

        shareCardStyle() {
            return 'width:' + this.shareCardWidth + 'px;height:' + this.shareCardHeight + 'px;';
        },

        shareImageWrapperStyle() {
            return 'height:' + this.shareImageHeight + 'px;';
        },

        shareCardContentStyle() {
            return 'height:' + this.shareContentHeight + 'px;';
        },

        floatingUnreadCount() {
		    return this.floatingUnreadIds.length;
		},
		
		newMessageFloatStyle() {
		    const bottom = this.inputBarHeight + this.inputBottomOffset + 12;
		
		    return [
		        'bottom:' + bottom + 'px',
		        'right:' + Math.max(12, this.messageSidePadding) + 'px'
		    ].join(';') + ';';
		},
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
			//this.conIndex为下一个消息应该的index，也就是当前最小index-1
            res = await DB.pullMessage(this.conversation.con_id, this.conIndex);
            if (res.length > 0) {
                this.messages = res.reverse();
                this.conIndex = this.messages[0].con_index - 1;
            }
            if (this.conIndex <= this.conversation.min_index) {
                this.hasMore = false;
            } else if (this.messages.length < 20) {
                res = await getMessageByConversation(this.conversation.con_short_id, this.conIndex, 20 - this.messages.length);
				if (res) {
					if (res.length > 0) {				
					    res.reverse();
					    this.messages = res.concat(this.messages);
					    this.conIndex = this.messages[0].con_index - 1;
					}
					if (res.length === 0 || this.conIndex <= this.conversation.min_index) {
					    this.hasMore = false;
					}
				}
            }

            if (this.messages.length > 0) {
                await this.fillMessageGaps(this.messages)
				await this.fillSenderInfos(this.messages);
				await this.fillShareInfos(this.messages);
            }

            this.refreshFirstPageGroupProfiles();

            this.initReadMarkState();

            if (this.conversation.badge_count - this.conversation.read_badge_count > 0 && this.messages.length > 0) {
                const latestMessage = this.messages[this.messages.length - 1];

                if (latestMessage && latestMessage.con_index) {
                    markRead(
                        this.conversation.con_short_id,
                        latestMessage.con_index,
                        this.conversation.badge_count
                    );

                    this.readMarkBaseIndex = String(latestMessage.con_index);
                    this.readMarkBaseBadgeCount = Number(this.conversation.badge_count || 0);
                    this.pendingReadIndexEnd = '';
                    this.pendingReadBadgeCount = this.readMarkBaseBadgeCount;
                    this.pendingReadMsgMap = {};

                    this.conversation.read_index_end = latestMessage.con_index;
                    this.conversation.read_badge_count = this.readMarkBaseBadgeCount;
                }
            }
			this.refreshMaxConIndexFromMessages();
        }

        setTimeout(() => this.scrollToBottom(), 100);

        this.imInitLoading = getApp().globalData.imInitStatus === true;
        this.imInitFinishing = false;
        this.commandQueue = [];
        
        this.normalListener = async (data) => {
            if (!data || !data.msg_body) return;
            if (this.conversation.con_id != data.msg_body.con_id) return;
            this.enqueueImEvent('normal', data);
        };
        
        uni.$on('normal', this.normalListener);

        this.commandListener = async (data) => {
            if (!data || !data.msg_body) return;
            if (this.conversation.con_id != data.msg_body.con_id) return;
            this.enqueueImEvent('command', data);
        };

        uni.$on('command', this.commandListener);
		
		this.appListener = async (data) => {
		    if (!data || data.module !== 'im') return;
		
		    if (data.type === 'beginInit') {
		        this.handleBeginImInit();
		        return;
		    }
		
		    if (data.type === 'finishInit') {
		        await this.finishImInit();
		        return;
		    }
		
		    if (data.type === 'userRefresh') {
				this.enqueueImEvent('userRefresh', data.data || []);
		        return;
		    }
		
		    if (data.type === 'agentRefresh') {
				this.enqueueImEvent('agentRefresh', data.data || []);
		    }
		};
		
		uni.$on('app', this.appListener);
    },

    onShow() {
        this.initResponsiveLayout();
    },

    onUnload() {
        this.flushReadMarkOnExit();

        if (this.normalListener) {
            uni.$off('normal', this.normalListener);
        }
        if (this.commandListener) {
            uni.$off('command', this.commandListener);
        }
		if (this.appListener) {
		    uni.$off('app', this.appListener);
		}
        if (this.inputBlurTimer) {
            clearTimeout(this.inputBlurTimer);
            this.inputBlurTimer = null;
        }
        if (this.checkFloatingUnreadTimer) {
            clearTimeout(this.checkFloatingUnreadTimer);
            this.checkFloatingUnreadTimer = null;
        }

    },

    methods: {
        noop() {},

        hideKeyboardOnly() {
            try {
                uni.hideKeyboard();
            } catch (err) {}
        },

        onChatScrollTouchStart() {
            if (!this.inputFocused && !this.keyboardVisible) return;

            this.hideMessageActions();
            this.hideKeyboardOnly();
        },

        handleInputFocus() {
            if (this.inputBlurTimer) {
                clearTimeout(this.inputBlurTimer);
                this.inputBlurTimer = null;
            }

            this.hideMessageActions();
            this.inputFocused = true;
        },

        handleInputBlur() {
            if (this.inputBlurTimer) {
                clearTimeout(this.inputBlurTimer);
            }

            if (this.sendingByTouch) {
                this.inputFocused = true;
                return;
            }

            this.inputBlurTimer = setTimeout(() => {
                if (!this.keyboardVisible) {
                    this.inputFocused = false;
                }

                this.inputBlurTimer = null;
            }, 180);
        },

        handleKeyboardHeightChange(e) {
            const height = Number(e?.detail?.height || 0);

            if (this.inputBlurTimer) {
                clearTimeout(this.inputBlurTimer);
                this.inputBlurTimer = null;
            }

            this.keyboardHeight = height;

            if (height > 0) {
                this.keyboardVisible = true;
                this.inputFocused = true;
                return;
            }

            setTimeout(() => {
                if (this.sendingByTouch) {
                    this.inputFocused = true;
                    return;
                }

                this.keyboardVisible = false;
                this.keyboardHeight = 0;
                this.inputFocused = false;
            }, 80);
        },

        handleInputLineChange(e) {
            const lineCount = Math.max(1, Number(e?.detail?.lineCount || 1));

            const nextContentHeight = clamp(
                lineCount * this.textareaLineHeight +
                    this.textareaPaddingTop +
                    this.textareaPaddingBottom,
                this.baseInputContentHeight,
                this.maxInputContentHeight
            );

            if (Math.abs(nextContentHeight - this.inputContentHeight) < 1) {
                return;
            }

            this.inputContentHeight = nextContentHeight;

            const extraHeight = this.inputContentHeight - this.baseInputContentHeight;
            this.inputBarHeight = this.baseInputBarHeight + extraHeight;

            this.$nextTick(() => {
                if (this.isAtBottom) {
                    this.scrollToBottom();
                }
            });
        },

        resetInputHeight() {
            this.inputContentHeight = this.baseInputContentHeight;
            this.inputBarHeight = this.baseInputBarHeight;
        },

        safeBigInt(value, fallback = 0n) {
            try {
                if (value === null || value === undefined || value === '') return fallback;
                return BigInt(value);
            } catch (err) {
                return fallback;
            }
        },

        initReadMarkState() {
            this.readMarkBaseIndex = String(this.conversation.read_index_end || 0);
            this.readMarkBaseBadgeCount = Number(this.conversation.read_badge_count || 0);

            if (!Number.isFinite(this.readMarkBaseBadgeCount)) {
                this.readMarkBaseBadgeCount = 0;
            }

            this.pendingReadIndexEnd = '';
            this.pendingReadBadgeCount = this.readMarkBaseBadgeCount;
            this.pendingReadMsgMap = {};
            this.readMarkFlushed = false;
        },

        isReadableIncomingMessage(message) {
            if (!message) return false;
            if (!message.con_index) return false;
            if (this.isSelfMessage(message)) return false;

            const senderType = Number(message.sender_type);
            return senderType === 1 || senderType === 2;
        },

        recordPendingReadMessage(message) {
            if (!this.isReadableIncomingMessage(message)) return;

            const msgId = String(message.msg_id || '');
            if (!msgId) return;

            if (this.pendingReadMsgMap[msgId]) return;

            const msgIndex = this.safeBigInt(message.con_index);
            const baseIndex = this.safeBigInt(this.readMarkBaseIndex);

            if (msgIndex <= baseIndex) return;

            this.pendingReadMsgMap = {
                ...this.pendingReadMsgMap,
                [msgId]: true
            };

            const currentPendingIndex = this.pendingReadIndexEnd
                ? this.safeBigInt(this.pendingReadIndexEnd)
                : baseIndex;

            if (msgIndex > currentPendingIndex) {
                this.pendingReadIndexEnd = String(message.con_index);
            }

            const readCount = Object.keys(this.pendingReadMsgMap).length;
            this.pendingReadBadgeCount = this.readMarkBaseBadgeCount + readCount;
        },

        recordPendingReadByMsgId(msgId) {
            const id = String(msgId || '');
            if (!id) return;

            const message = this.messages.find(item => String(item.msg_id || '') === id);
            this.recordPendingReadMessage(message);
        },

        recordFloatingUnreadAsRead(ids) {
            if (!Array.isArray(ids) || ids.length === 0) return;

            ids.forEach(id => {
                this.recordPendingReadByMsgId(id);
            });
        },

        flushReadMarkOnExit() {
            if (this.readMarkFlushed) return;
            this.readMarkFlushed = true;

            if (!this.pendingReadIndexEnd) return;

            const pendingIndex = this.safeBigInt(this.pendingReadIndexEnd);
            const baseIndex = this.safeBigInt(this.readMarkBaseIndex);

            if (pendingIndex <= baseIndex) return;
            if (this.pendingReadBadgeCount <= this.readMarkBaseBadgeCount) return;
            if (!this.conversation || !this.conversation.con_short_id) return;

            markRead(
                this.conversation.con_short_id,
                this.pendingReadIndexEnd,
                this.pendingReadBadgeCount
            );

            this.conversation.read_index_end = this.pendingReadIndexEnd;
            this.conversation.read_badge_count = this.pendingReadBadgeCount;
        },
		
		refreshMaxConIndexFromMessages() {
		    for (let i = this.messages.length - 1; i >= 0; i--) {
		        if (this.messages[i].con_index) {
		            this.maxConIndex = this.messages[i].con_index;
		            return;
		        }
		    }
		
		    this.maxConIndex = 0;
		},
		
		enqueueImEvent(type, data) {
		    this.imEventQueue.push({
		        type,
		        data
		    });
		
		    this.drainImEventQueue();
		},
		
		async drainImEventQueue() {
		    if (this.imEventProcessing) return;
		    if (this.imInitLoading || this.imInitFinishing) return;
		
		    this.imEventProcessing = true;
		
		    try {
		        while (this.imEventQueue.length > 0) {
		            if (this.imInitLoading || this.imInitFinishing) break;
		
		            const event = this.imEventQueue.shift();
		            if (!event) return;
		            if (event.type === 'normal') {
		                await this.handleNormalMessage(event.data);
		                return;
		            }
		            if (event.type === 'command') {
		                await this.handleCommandMessage(event.data);
		                return;
		            }
		            if (event.type === 'userRefresh') {
		                this.handleUserRefresh(event.data || []);
		                return;
		            }
		            if (event.type === 'agentRefresh') {
		                this.handleAgentRefresh(event.data || []);
		            }
		        }
		    } catch (err) {
		        console.error('drainImEventQueue failed:', err);
		    } finally {
		        this.imEventProcessing = false;
				if (this.imEventQueue.length > 0) {
				    this.drainImEventQueue()
				}
		    }
		},
		
		handleBeginImInit() {
		    this.imInitLoading = true;
		    this.imInitFinishing = false;
		},
		
		async finishImInit() {
		    if (this.imInitFinishing) return;
		
		    this.imInitLoading = true;
		    this.imInitFinishing = true;
		
		try {
		        const newMessages = await DB.pullMessageReverse(
		            this.conversation.con_id,
		            this.maxConIndex
		        );
		
		        if (newMessages && newMessages.length > 0) {
		            const loadedMin = Number(newMessages[0].con_index)
		            const expectedMin = Number(this.maxConIndex) + 1
		            if (loadedMin > expectedMin) {
		                const filled = await this.fetchAndFillGap(expectedMin, loadedMin - 1)
		                newMessages = filled.concat(newMessages)
		            }
		            this.maxConIndex = newMessages[newMessages.length - 1].con_index;
		            await this.fillMessageGaps(newMessages)
		            await this.fillSenderInfos(newMessages);
		            await this.fillShareInfos(newMessages);
		            this.appendNewDbMessages(newMessages);
		        }
		    } finally {
		        this.imInitFinishing = false;
		        this.imInitLoading = false;
		    }
		
		    await this.drainImEventQueue();
		},
		
		appendNewDbMessages(newMessages) {
		    if (!newMessages || newMessages.length === 0) return;
		
		    const firstIndex = BigInt(newMessages[0].con_index);
		    const dbMsgIds = new Set(newMessages.map(item => String(item.msg_id)));
		    const pendingTail = [];
		
		    while (this.messages.length > 0) {
		        const last = this.messages[this.messages.length - 1];
		
		        if (!last.con_index) {
		            this.messages.pop();
		
		            if (!dbMsgIds.has(String(last.msg_id))) {
		                pendingTail.unshift(last);
		            }
		
		            continue;
		        }
		
		        if (BigInt(last.con_index) >= firstIndex) {
		            this.messages.pop();
		            continue;
		        }
		
		        break;
		    }
		
		    const shouldScrollToBottom = this.isAtBottom;
		
		    this.messages = this.messages.concat(newMessages, pendingTail);
		
		    if (shouldScrollToBottom) {
		        for (const msg of newMessages) {
		            this.recordPendingReadMessage(msg);
		        }
		
		        this.scrollToBottom();
		        return;
		    }
		
		    for (const msg of newMessages) {
		        if (!this.isSelfMessage(msg)) {
		            this.addFloatingUnread(msg);
		        }
		    }
		},
		
		async handleNormalMessage(data) {
			const msg = data.msg_body;
			        
			if (msg.con_index && BigInt(msg.con_index) <= BigInt(this.maxConIndex)) {
			    return;
			}

			if (msg.con_index && BigInt(msg.con_index) > BigInt(this.maxConIndex) + 1n) {
			    const gapStart = Number(this.maxConIndex) + 1
			    const gapEnd = Number(msg.con_index) - 1
			    const filled = await this.fetchAndFillGap(gapStart, gapEnd)
			    if (filled.length > 0) {
			        await this.fillSenderInfos(filled)
			        await this.fillShareInfos(filled)
		            let insertIndex = 0
		            for (let i = this.messages.length - 1; i >= 0; i--) {
		                if (this.messages[i].con_index) {
		                    insertIndex = i + 1
		                    break
		                }
		            }
		            this.messages.splice(insertIndex, 0, ...filled)
			    }
			    this.maxConIndex = gapEnd
			}

			if (msg.con_index && BigInt(msg.con_index) > BigInt(this.maxConIndex)) {
			    this.maxConIndex = msg.con_index;
			}
			
		    if (String(this.conversation.con_short_id || 0) === '0' && String(msg.con_short_id || 0) !== '0') {
		        this.conversation.con_short_id = msg.con_short_id;
		        for (const item of this.messages) {
		            if (String(item.con_short_id || 0) === '0') {
		                item.con_short_id = msg.con_short_id;
		            }
		        }
		    }
		
		    await this.fillSenderInfos([msg]);
		    await this.fillShareInfos([msg]);
            
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
		
		    let insertIndex = 0;
		    for (let i = this.messages.length - 1; i >= 0; i--) {
		        if (this.messages[i].con_index) {
		            insertIndex = i + 1;
		            break;
		        }
		    }
		    this.messages.splice(insertIndex, 0, msg);
			
			const shouldScrollToBottom = this.isAtBottom || this.isSelfMessage(msg);
		    if (shouldScrollToBottom) {
		        this.recordPendingReadMessage(msg);
		        this.scrollToBottom();
		    } else {
		        this.addFloatingUnread(msg);
		    }
		},
		
		async handleCommandMessage(data) {
		    const msgBody = data.msg_body;
		    const cmdMessage = JSONbig.parse(msgBody.msg_content);
		
		    if (msgBody.msg_type == 100) {
		        this.handleConversationCommand(cmdMessage);
		    } else if (msgBody.msg_type == 101) {
		        this.conversation.read_index_end = cmdMessage.read_index_end;
		        this.conversation.read_badge_count = cmdMessage.read_badge_count;
		    } else if (msgBody.msg_type == 102) {
		        const msgId = cmdMessage.msg_id;
		        if (msgId === null || msgId === undefined || msgId === '') return;
		
		        const index = this.findMessageIndexById(msgId);
		        if (index === -1) return;
		
		        this.messages[index].extra = cmdMessage.extra || '{}';
		
		        const nextMessage = await handleMessageExtra(this.messages[index]);
		
		        this.messages.splice(index, 1, nextMessage);
		    } else if (msgBody.msg_type == 103) {
		        if (cmdMessage.type == 1) {
		            uni.showToast({ title: '会话已删除', icon: 'none' });
		            setTimeout(() => {
		                uni.navigateBack();
		            }, 500);
		        }
		    } else if (msgBody.msg_type == 104) {
		        if (cmdMessage.type == 1) {
		            const newNickName = cmdMessage.content || '';
		            const senderKey = `${Number(msgBody.sender_type)}:${String(msgBody.sender_id)}`;
		            const old = this.senderInfoMap.get(senderKey) || {};
		
		            this.senderInfoMap.set(senderKey, {
		                nick_name: newNickName,
		                global_name: old.global_name || '',
		                avatar_uri: old.avatar_uri || '',
		                local_avatar_uri: old.local_avatar_uri || ''
		            });
		
		            for (let i = this.messages.length - 1; i >= 0; i--) {
		                const msg = this.messages[i];
		                if (Number(msg.sender_type) !== Number(msgBody.sender_type)) continue;
		                if (String(msg.sender_id) !== String(msgBody.sender_id)) continue;
		                msg.nick_name = newNickName;
		            }
		        }
		    }
		},
		
		handleUserRefresh(list) {
		    if (!Array.isArray(list) || list.length === 0) return;
		
		    const map = new Map();
		
		    for (const user of list) {
		        if (!user || user.user_id === null || user.user_id === undefined) continue;
		        map.set(String(user.user_id), user);
		    }
		
		    if (map.size === 0) return;
		
		    if (Number(this.conversation.con_type) === 1) {
		        const user = map.get(String(this.conversation.peer_id));
		
		        if (user) {
		            this.chatName = user.username || this.chatName;
		            this.conversation.name = this.chatName;
		            this.conversation.avatar_uri = user.avatar_uri || this.conversation.avatar_uri;
		            uni.setNavigationBarTitle({ title: this.chatName });
		        }
		    }
		
		    for (const user of map.values()) {
		        const senderKey = `1:${String(user.user_id)}`;
		
		        if (this.senderInfoMap.has(senderKey)) {
		            const old = this.senderInfoMap.get(senderKey);
		
		            this.senderInfoMap.set(senderKey, {
		                nick_name: old.nick_name || '',
		                global_name: user.username || old.global_name || '',
		                avatar_uri: user.avatar_uri || old.avatar_uri || '',
		                local_avatar_uri: old.local_avatar_uri || ''
		            });
		        }
		    }
		
		    for (let i = this.messages.length - 1; i >= 0; i--) {
		        const msg = this.messages[i];
		
		        if (Number(msg.sender_type) === 1) {
		            const user = map.get(String(msg.sender_id));
		
		            if (user) {
		                msg.global_name = user.username || msg.global_name;
		                msg.avatar_uri = user.avatar_uri || msg.avatar_uri;
		            }
		        }
		    }
		},
		
		handleAgentRefresh(list) {
		    if (!Array.isArray(list) || list.length === 0) return;
		
		    const map = new Map();
		
		    for (const agent of list) {
		        if (!agent || agent.agent_id === null || agent.agent_id === undefined) continue;
		        map.set(String(agent.agent_id), agent);
		    }
		
		    if (map.size === 0) return;
		
		    if (Number(this.conversation.con_type) === 4) {
		        const agent = map.get(String(this.conversation.peer_id));
		
		        if (agent) {
		            this.chatName = agent.agent_name || this.chatName;
		            this.conversation.name = this.chatName;
		            this.conversation.avatar_uri = agent.avatar_uri || this.conversation.avatar_uri;
		            uni.setNavigationBarTitle({ title: this.chatName });
		        }
		    }
		
		    for (const agent of map.values()) {
		        const senderKey = `2:${String(agent.agent_id)}`;
		
		        if (!this.senderInfoMap.has(senderKey)) continue;
		
		        const old = this.senderInfoMap.get(senderKey);
		
		        this.senderInfoMap.set(senderKey, {
		            nick_name: old.nick_name || '',
		            global_name: agent.agent_name || old.global_name || '',
		            avatar_uri: agent.avatar_uri || old.avatar_uri || '',
		            local_avatar_uri: old.local_avatar_uri || ''
		        });
		    }
		
		    for (let i = this.messages.length - 1; i >= 0; i--) {
		        const msg = this.messages[i];
		
		        if (Number(msg.sender_type) !== 2) continue;
		
		        const agent = map.get(String(msg.sender_id));
		        if (!agent) continue;
		
		        msg.global_name = agent.agent_name || msg.global_name;
		        msg.avatar_uri = agent.avatar_uri || msg.avatar_uri;
		    }
		},

        initResponsiveLayout() {
            try {
                const sys = uni.getSystemInfoSync();
                const windowWidth = Number(sys.windowWidth || 375);
                const windowHeight = Number(sys.windowHeight || 667);
                const statusBarHeight = Number(sys.statusBarHeight || 0);
                const safeInsets = sys.safeAreaInsets || {};
                const bottomSafeHeight = Number(safeInsets.bottom || 0);
                const compact = windowWidth <= 360 || windowHeight <= 640;
                
                const inputBottomOffset = bottomSafeHeight > 0
                    ? 0
                    : clamp(Math.floor(windowWidth * 0.02), 7, 10);

                this.windowWidth = windowWidth;
                this.windowHeight = windowHeight;
                this.statusBarHeight = statusBarHeight;
                this.bottomSafeHeight = bottomSafeHeight;
                this.inputBottomOffset = inputBottomOffset;

                this.messageSidePadding = clamp(Math.floor(windowWidth * 0.03), 10, 14);

                this.headerContentHeight = 42;
                this.headerHeight = statusBarHeight + this.headerContentHeight;
                this.headerButtonSize = 30;
                this.headerTitleFontSize = 16;
                this.backIconSize = 19;
                this.settingsIconSize = 20;

                this.inputFontSize = clamp(Math.floor(windowWidth * 0.038), 14, 16);
                this.textareaLineHeight = clamp(Math.floor(this.inputFontSize * 1.42), 20, 23);

                this.textareaPaddingTop = clamp(Math.floor(windowWidth * 0.018), 6, 7);
                this.textareaPaddingBottom = this.textareaPaddingTop;
                this.textareaPaddingLeft = clamp(Math.floor(windowWidth * 0.034), 12, 14);
                this.textareaPaddingRight = clamp(Math.floor(windowWidth * 0.06), 22, 26);

                this.baseInputContentHeight = clamp(
                    this.textareaLineHeight + this.textareaPaddingTop + this.textareaPaddingBottom,
                    34,
                    38
                );

                this.maxInputContentHeight =
                    this.textareaLineHeight * 4 +
                    this.textareaPaddingTop +
                    this.textareaPaddingBottom;

                this.inputBarTopGap = 4;
                this.inputBarBottomGap = 4;

                this.baseInputBarHeight =
                    this.baseInputContentHeight +
                    bottomSafeHeight +
                    this.inputBarTopGap +
                    this.inputBarBottomGap;

                this.inputContentHeight = this.baseInputContentHeight;
                this.inputBarHeight = this.baseInputBarHeight;

                this.sendButtonHeight = clamp(Math.floor(this.baseInputContentHeight * 0.95), 33, 37);
                this.sendButtonWidth = clamp(Math.floor(this.sendButtonHeight * 1.55), 50, 56);
                this.sendTextFontSize = clamp(Math.floor(windowWidth * 0.034), 13, 14);

                this.messageUnitHeight = clamp(Math.floor(windowWidth * 0.125), 46, 56);
                this.messageGap = clamp(Math.floor(windowWidth * 0.026), compact ? 7 : 8, 11);
                this.avatarSize = clamp(Math.floor(windowWidth * 0.105), 36, 44);
                this.avatarGap = clamp(Math.floor(windowWidth * 0.023), 8, 10);

                this.halfMessageHeight = clamp(Math.floor(this.messageUnitHeight * 0.52), 22, 28);

                this.bubbleFontSize = clamp(Math.floor(windowWidth * 0.038), 14, 16);
                this.bubbleLineHeight = clamp(Math.floor(this.bubbleFontSize * 1.45), 20, 23);
                this.bubbleVerticalPadding = clamp(Math.floor(windowWidth * 0.021), 7, 9);
                this.bubbleHorizontalPadding = clamp(Math.floor(windowWidth * 0.032), 11, 14);
                this.bubbleRadius = clamp(Math.floor(this.bubbleLineHeight * 0.78), 14, 18);

                this.senderNameFontSize = clamp(Math.floor(windowWidth * 0.028), 10, 12);
                this.senderNameLineHeight = this.senderNameFontSize + 3;
                this.timeFontSize = clamp(Math.floor(windowWidth * 0.026), 10, 11);
                this.timeLineHeight = this.timeFontSize + 4;
                this.systemFontSize = this.timeFontSize;
                this.systemLineHeight = this.timeLineHeight;

                this.shareCardWidth = clamp(Math.floor(windowWidth * 0.47), 168, 204);
                this.shareCardHeight = Math.floor(this.shareCardWidth * 7 / 5);
                this.shareImageHeight = this.shareCardWidth;
                this.shareContentHeight = this.shareCardHeight - this.shareImageHeight;
            } catch (err) {
                this.windowHeight = 667;
                this.windowWidth = 375;
                this.statusBarHeight = 0;
                this.bottomSafeHeight = 0;
				this.inputBottomOffset = 8;
                this.headerContentHeight = 42;
                this.headerHeight = 42;
                this.headerButtonSize = 30;
                this.headerTitleFontSize = 16;
                this.backIconSize = 19;
                this.settingsIconSize = 20;
                this.inputFontSize = 14;
                this.textareaLineHeight = 20;

                this.textareaPaddingTop = 7;
                this.textareaPaddingBottom = 7;
                this.textareaPaddingLeft = 13;
                this.textareaPaddingRight = 22;

                this.baseInputContentHeight = 34;
                this.maxInputContentHeight = 94;

                this.inputBarTopGap = 4;
                this.inputBarBottomGap = 4;

                this.baseInputBarHeight = 44;
                this.inputContentHeight = this.baseInputContentHeight;
                this.inputBarHeight = this.baseInputBarHeight;

                this.sendButtonHeight = 34;
                this.sendButtonWidth = 52;
                this.sendTextFontSize = 13;
                this.messageUnitHeight = 48;
                this.messageGap = 8;
                this.avatarSize = 38;
                this.avatarGap = 8;
                this.halfMessageHeight = 24;
                this.bubbleFontSize = 14;
                this.bubbleLineHeight = 20;
                this.bubbleVerticalPadding = 7;
                this.bubbleHorizontalPadding = 11;
                this.bubbleRadius = 14;
                this.senderNameFontSize = 10;
                this.senderNameLineHeight = 13;
                this.timeFontSize = 10;
                this.timeLineHeight = 14;
                this.systemFontSize = 10;
                this.systemLineHeight = 14;
                this.messageSidePadding = 10;
                this.shareCardWidth = 176;
                this.shareCardHeight = 246;
                this.shareContentHeight = 70;
                this.shareImageHeight = 176;
                this.shareTitleFontSize = 12;
                this.shareTitleLineHeight = 18;
                this.shareAuthorFontSize = 10;
                this.shareAuthorAvatarSize = 16;
                this.shareVideoBadgeSize = 20;
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

        async fetchAndFillGap(gapStart, gapEnd) {
            const count = Number(gapEnd) - Number(gapStart) + 1
            if (count <= 0) return []
            const res = await getMessageByConversation(this.conversation.con_short_id, gapEnd, count)
            if (!res || res.length === 0) return []
            res.reverse()
            return res
        },

        async fillMessageGaps(messages) {
            if (!messages || messages.length < 2) return
            const gaps = []
            for (let i = 0; i < messages.length - 1; i++) {
                const diff = BigInt(messages[i + 1].con_index) - BigInt(messages[i].con_index)
                if (diff > 1n) {
                    gaps.push({
                        start: Number(messages[i].con_index) + 1,
                        end: Number(messages[i + 1].con_index) - 1
                    })
                }
            }
            for (const g of gaps) {
                const filled = await this.fetchAndFillGap(g.start, g.end)
                messages.push(...filled)
            }
            if (gaps.length > 0) {
                messages.sort((a, b) => Number(a.con_index) - Number(b.con_index))
            }
        },

        async fillSenderInfos(messages) {
            if (!Array.isArray(messages) || messages.length === 0) return;

            const senders = [];
            const missingSet = new Set();

            for (const message of messages) {
                if (!message) continue;
                if (Number(message.sender_type) !== 1 && Number(message.sender_type) !== 2) continue;

                if (message.nick_name || message.global_name || message.avatar_uri || message.local_avatar_uri) {
                    const key = `${Number(message.sender_type)}:${String(message.sender_id)}`;
                    this.senderInfoMap.set(key, {
                        nick_name: message.nick_name || '',
                        global_name: message.global_name || '',
                        avatar_uri: message.avatar_uri || '',
                        local_avatar_uri: message.local_avatar_uri || ''
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

					for (const info of infos) {
						const key = `${Number(info.sender_type)}:${String(info.sender_id)}`;
						this.senderInfoMap.set(key, {
							nick_name: info.nick_name || '',
							global_name: info.global_name || '',
							avatar_uri: info.avatar_uri || '',
							local_avatar_uri: info.local_avatar_uri || ''
						});
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
                    if (!message.global_name) {
                        message.global_name = cached.global_name || '';
                    }
                    if (!message.avatar_uri) {
                        message.avatar_uri = cached.avatar_uri || '';
                    }
                    if (!message.local_avatar_uri) {
                        message.local_avatar_uri = cached.local_avatar_uri || '';
                    }
                }
            }
        },

        async onMsgAvatarErr(msg) {
            if (msg.avatar_uri) {
                msg.avatar_uri = ''
                return
            }
            if (msg.local_avatar_uri) {
                msg.local_avatar_uri = ''
                const key = `${Number(msg.sender_type)}:${String(msg.sender_id)}`
                const cached = this.senderInfoMap.get(key)
                if (cached) cached.local_avatar_uri = ''
                try {
                    if (Number(msg.sender_type) === 1) {
                        await DB.updateUser(msg.sender_id, { local_avatar_uri: '', modify_time: Date.now() })
                    } else if (Number(msg.sender_type) === 2) {
                        await DB.updateAgent(msg.sender_id, { local_avatar_uri: '', modify_time: Date.now() })
                    }
                } catch (e) {
                    console.error('清除本地头像失败：', e)
                }
            }
        },

        async fillShareInfos(messages) {
            if (!Array.isArray(messages) || !messages.length) return;

            const idSet = new Set();

            for (const message of messages) {
                if (!message) continue;

                if (this.isShareMessage(message)) {
                    const raw = message.msg_content;
                    try {
                        message.share_content = JSONbig.parse(String(raw)) || {};
                    } catch (err) {
                        console.error('parse share message failed:', err);
                        message.share_content = {};
                    }

                    const authorId = String(message.share_content.authorId || '');
                    if (authorId && !this.shareAuthorInfoMap.has(authorId)) {
                        idSet.add(authorId);
                    }
                }
            }

            if (!idSet.size) return;

            const userIds = Array.from(idSet);

			const res = await getUserInfos({ userIds });
			const list = res ? res.user_infos : [];

			for (const user of list) {
				if (!user) continue;
				const userId = String(user.user_id || '');
				if (!userId) continue;
				this.shareAuthorInfoMap.set(userId, {
					avatar: user.avatar || '',
					username: user.username || ''
				});
			}
        },

        isShareMessage(message) {
            return !!message && Number(message.msg_type ?? message.msgType) === 4;
        },

        getShareAuthorInfo(message) {
            const authorId = String((message.share_content || {}).authorId || '');
            if (!authorId) return {};
            return this.shareAuthorInfoMap.get(authorId) || {};
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
            if (this.sendingMessage) return;
            if (!this.canSendMessage) return;
            if (this.inputText.trim() === '') return;

            this.sendingMessage = true;

            const clientMsgId = getApp().globalData.randomIdGenerator.nextId();
            const sendingText = this.inputText;

            try {
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
                                    global_name: infos[0].global_name || '',
                                    avatar_uri: infos[0].avatar_uri || '',
                                    local_avatar_uri: infos[0].local_avatar_uri || ''
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
                        global_name: selfInfo.global_name || '',
                        avatar_uri: selfInfo.avatar_uri || '',
                        local_avatar_uri: selfInfo.local_avatar_uri || ''
                    };

                    this.senderInfoMap.set(selfKey, {
                        nick_name: optimisticMessage.nick_name || '',
                        global_name: optimisticMessage.global_name || '',
                        avatar_uri: optimisticMessage.avatar_uri || '',
                        local_avatar_uri: optimisticMessage.local_avatar_uri || ''
                    });

                    if (
                        this.messages.length === 0 ||
                        this.compareBigIntLike(this.messages[this.messages.length - 1].client_msg_id, clientMsgId) < 0
                    ) {
                        this.messages.push(optimisticMessage);
                    }

                    this.inputText = '';
                    this.resetInputHeight();
                    this.scrollToBottom();
                }
            } finally {
                this.sendingMessage = false;
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
            const targetId = String(userId || '');
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
            const share = message.share_content;
            const authorId = String(share.authorId || '');
            this.goToUserPage(authorId);
        },

        goToShareCreationDetail(message) {
            if (this.messageTouch.moved) return;

            const share = message.share_content;
            const creationId = String(share.creationId || '');
            if (!creationId) return;

            const userId = String(share.authorId || '');
            const isVideo = Number(share.materialType) === 2;

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
                    const lastMessage = this.messages[this.messages.length - 1];
        
                    if (!lastMessage || lastMessage.msg_id === undefined || lastMessage.msg_id === null) {
                        return;
                    }
        
                    this.setScrollIntoView('message-' + String(lastMessage.msg_id));
                    this.isAtBottom = true;
                    this.recordFloatingUnreadAsRead(this.floatingUnreadIds);
                    this.clearFloatingUnread();
                }
            });
        },

        async onScroll(e) {
			this.updateBottomState(e);
			
            if (e.detail.scrollTop == 0 && this.hasMore) {
                this.isLoading = true;

                let res = await DB.pullMessage(this.conversation.con_id, this.conIndex);
                let newMessages = []
                if (res.length > 0) {
					newMessages = res.reverse();
                    const loadedMax = Number(newMessages[newMessages.length - 1].con_index)
                    const expectedMax = Number(this.conIndex)
                    if (loadedMax < expectedMax) {
                        const filled = await this.fetchAndFillGap(loadedMax + 1, expectedMax)
                        newMessages.push(...filled)
                    }
					this.conIndex = newMessages[0].con_index - 1;
                }
                if (this.conIndex <= this.conversation.min_index) {
                    this.hasMore = false;
                } else if (res.length < 20) {
                    res = await getMessageByConversation(this.conversation.con_short_id, this.conIndex, 20 - newMessages.length);
					if (res) {
						if (res.length > 0) {
						    res.reverse();
						    newMessages = res.concat(newMessages);
						    this.conIndex = newMessages[0].con_index - 1;
						}
						if (res.length === 0 || this.conIndex <= this.conversation.min_index) {
						    this.hasMore = false;
						}
					}
                }
				if (newMessages.length > 0) {
					await this.fillMessageGaps(newMessages)
					await this.fillSenderInfos(newMessages)
					await this.fillShareInfos(newMessages)
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
			const menuWidth = canCopy && canRecall ? 112 : 58;
			const menuHeight = 34;
			const sys = uni.getSystemInfoSync();

			const safeTop = this.headerHeight + 8;
			const safeBottom = Number(this.bottomSafeHeight || 0) + 12;

			// X 轴跟随手指，只做屏幕边界限制
			let left = point.x - menuWidth / 2;
			left = Math.max(8, Math.min(left, sys.windowWidth - menuWidth - 8));

			// Y 轴避开手指：优先在手指上方 40px
			let top = point.y - menuHeight - 40;

			// 上方空间不够时，放到手指下方 40px
			if (top < safeTop) {
				top = point.y + 40;
			}

			top = Math.max(
				safeTop,
				Math.min(top, sys.windowHeight - safeBottom - menuHeight)
			);

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
                msgId: msgId
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
            if (cmdMessage.type == 2 && String(cmdMessage.content) === String(this.userId)) {
                this.conversation.is_member = 0;
            }

            if (cmdMessage.type == 3) {
                const newName = cmdMessage.content || '群聊';
                this.chatName = newName;
                this.conversation.name = newName;
                uni.setNavigationBarTitle({ title: newName });
            }
        },
		
		getChatViewportHeight() {
		    const height =
		        this.windowHeight -
		        this.headerHeight -
		        this.inputBarHeight -
		        this.inputBottomOffset;
		
		    return Math.max(0, height);
		},
		
		updateBottomState(e) {
		    const detail = e?.detail || {};
		    const scrollTop = Number(detail.scrollTop || 0);
		    const scrollHeight = Number(detail.scrollHeight || 0);
		    const viewportHeight = this.getChatViewportHeight();
		
		    this.chatScrollTop = scrollTop;
		
		    if (!scrollHeight || !viewportHeight) {
		        return;
		    }
		
		    const distanceToBottom = scrollHeight - scrollTop - viewportHeight;
		
		    this.isAtBottom = distanceToBottom <= this.bottomThreshold;
		
		    if (this.isAtBottom) {
		        this.recordFloatingUnreadAsRead(this.floatingUnreadIds);
		        this.clearFloatingUnread();
		        return;
		    }
		
		    this.scheduleCheckFloatingUnreadVisible();
		},
		
		setScrollIntoView(id) {
		    if (!id) return;
		
		    this.scrollIntoViewId = '';
		
		    this.$nextTick(() => {
		        this.scrollIntoViewId = id;
		    });
		},
		

		
		getFloatingMessageId(message) {
		    if (!message) return '';
		    if (message.msg_id === undefined || message.msg_id === null) return '';
		
		    return String(message.msg_id);
		},
		
        addFloatingUnread(message) {
            const msgId = this.getFloatingMessageId(message);
            if (!msgId) return;

            if (this.floatingUnreadMap[msgId]) {
                return;
            }

            this.floatingUnreadMap = {
                ...this.floatingUnreadMap,
                [msgId]: true
            };

            this.floatingUnreadIds = this.floatingUnreadIds.concat(msgId);

            if (!this.firstFloatingUnreadId) {
                this.firstFloatingUnreadId = msgId;
            }

            this.$nextTick(() => {
                this.scheduleCheckFloatingUnreadVisible();
            });
        },
		
		clearFloatingUnread() {
		    this.floatingUnreadIds = [];
		    this.floatingUnreadMap = {};
		    this.firstFloatingUnreadId = '';
		},
		
		jumpToFirstFloatingUnread() {
		    if (!this.firstFloatingUnreadId) {
		        this.scrollToBottom();
		        return;
		    }
		
		    this.setScrollIntoView('message-' + String(this.firstFloatingUnreadId));
		
		    this.$nextTick(() => {
		        setTimeout(() => {
		            this.checkFloatingUnreadVisible();
		        }, 60);
		    });
		},
		
		removeFloatingUnread(msgId) {
		    const id = String(msgId || '');

		    if (!id) return;
		    if (!this.floatingUnreadMap[id]) return;

		    this.recordPendingReadByMsgId(id);

		    const nextMap = {
		        ...this.floatingUnreadMap
		    };

		    delete nextMap[id];

		    this.floatingUnreadMap = nextMap;

		    this.floatingUnreadIds = this.floatingUnreadIds.filter(item => {
		        return String(item) !== id;
		    });

		    this.firstFloatingUnreadId = this.floatingUnreadIds.length > 0
		        ? this.floatingUnreadIds[0]
		        : '';
		},
		
        scheduleCheckFloatingUnreadVisible() {
            if (!this.floatingUnreadIds.length) return;

            if (!this.checkingFloatingUnreadVisible) {
                this.checkFloatingUnreadVisible();
                return;
            }

            if (this.checkFloatingUnreadTimer) {
                clearTimeout(this.checkFloatingUnreadTimer);
            }

            this.checkFloatingUnreadTimer = setTimeout(() => {
                this.checkFloatingUnreadTimer = null;
                this.checkFloatingUnreadVisible();
            }, 32);
        },
		
        checkFloatingUnreadVisible() {
            if (this.checkingFloatingUnreadVisible) return;
            if (!this.floatingUnreadIds.length) return;

            this.checkingFloatingUnreadVisible = true;

            const ids = this.floatingUnreadIds.slice();

            const query = uni.createSelectorQuery().in(this);

            query.select('.chat-messages').boundingClientRect();

            ids.forEach(id => {
                query.select('#message-' + id).boundingClientRect();
            });

            query.exec((res) => {
                this.checkingFloatingUnreadVisible = false;

                const container = res && res[0];
                const nodes = res ? res.slice(1) : [];

                if (!container || !Array.isArray(nodes)) return;

                const visibleIds = [];

                nodes.forEach((node, index) => {
                    if (!node) return;

                    const nodeTop = Number(node.top);
                    const nodeBottom = Number(node.bottom);
                    const nodeHeight = Math.max(1, Number(node.height || nodeBottom - nodeTop));

                    const containerTop = Number(container.top);
                    const containerBottom = Number(container.bottom);

                    const visibleTop = Math.max(nodeTop, containerTop);
                    const visibleBottom = Math.min(nodeBottom, containerBottom);
                    const visibleHeight = Math.max(0, visibleBottom - visibleTop);

                    const visibleRatio = visibleHeight / nodeHeight;

                    const enoughVisible = visibleRatio >= 0.55;

                    const passedBottomEdge = nodeTop <= containerBottom - Math.min(48, nodeHeight * 0.45);

                    if (!enoughVisible || !passedBottomEdge) return;

                    const msgId = ids[index];

                    if (msgId) {
                        visibleIds.push(msgId);
                    }
                });

                visibleIds.forEach(id => {
                    this.removeFloatingUnread(id);
                });
            });
        },
		
		handleSendTouchStart() {
            if (!this.canSendMessage) return;
            if (!this.inputText.trim()) return;

            this.sendingByTouch = true;
            this.inputFocused = true;
        },

        handleSendTouchEnd() {
            if (!this.sendingByTouch) return;

            this.sendMessage();

            this.$nextTick(() => {
                this.inputFocused = true;
                this.sendingByTouch = false;
            });
        },

        handleSendTouchCancel() {
            this.sendingByTouch = false;
        },

        formatTime(timestamp) {
            if (!timestamp) return ''

            let ms = Number(timestamp)
            if (!Number.isFinite(ms) || ms <= 0) return ''
            if (ms < 1e12) ms = ms * 1000

            const now = new Date()
            const target = new Date(ms)
            const diffMs = now.getTime() - ms
            const diffSec = Math.floor(diffMs / 1000)

            const pad2 = (n) => (n < 10 ? '0' + n : '' + n)
            const hhmm = `${pad2(target.getHours())}:${pad2(target.getMinutes())}`

            if (diffSec < 3600) return hhmm

            const oneDayMs = 24 * 60 * 60 * 1000
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

            if (ms >= todayStart) return hhmm
            if (ms >= todayStart - oneDayMs) return `昨天 ${hhmm}`

            const weekdays = ['日', '一', '二', '三', '四', '五', '六']
            const diffDay = Math.floor(diffMs / oneDayMs)

            if (diffDay < 7) return `周${weekdays[target.getDay()]} ${hhmm}`

            const month = target.getMonth() + 1
            const day = target.getDate()

            if (target.getFullYear() !== now.getFullYear()) return `${target.getFullYear()}年${month}月${day}日 ${hhmm}`
            return `${month}月${day}日 ${hhmm}`
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

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.chat-container {
    position: relative;
    height: 100vh;
    background: #fefefe;
    overflow: hidden;
    font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.chat-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 120;
    background: #fefefe;
    border-bottom: none;
    box-sizing: border-box;
}

.chat-header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
}

.header-left,
.header-right,
.header-right-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.back-icon {
    line-height: 1;
    color: #333;
    font-weight: 400;
}

.header-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
}

.chat-title {
    font-weight: 400;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.settings-icon {
    color: #333;
    font-weight: 400;
    line-height: 1;
}

.chat-messages {
    position: fixed;
    left: 0;
    right: 0;
    overflow-y: auto;
    box-sizing: border-box;
    background: #fefefe;
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
    gap: 6px;
}

.loading-spinner {
    border: 2px solid #f3f3f3;
    border-top-color: #d8a25d;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    box-sizing: border-box;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loading-text {
    color: #d8dce4;
    font-weight: 400;
}

.message-time {
    display: flex;
    justify-content: center;
    align-items: center;
}

.time-text {
    color: #999;
    background: transparent;
    padding: 0;
    border-radius: 0;
    font-weight: 400;
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
    border: none;
    box-sizing: border-box;
    background: #f2f2f2;
}

.message-left .avatar-box {
    margin-left: 0;
    margin-right: 8px;
}

.message-right .avatar-box {
    margin-left: 8px;
    margin-right: 0;
}

.message-content {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.message-content-left {
    align-items: flex-start;
}

.message-content-right {
    flex: 0 1 auto;
    align-items: flex-end;
}

.sender-name {
    color: #999;
    margin: 0 0 0 6px;
    font-weight: 400;
}

.sender-name-right {
    margin: 0 6px 0 0;
    text-align: right;
    align-self: flex-end;
}

.bubble {
    word-break: break-word;
    position: relative;
    display: inline-block;
    box-shadow: none;
    box-sizing: border-box;
}

.bubble-text {
    text-align: left;
    font-weight: 400;
}

.bubble-left {
    background: #f0f2f5;
    color: #333;
    text-align: left;
}

.bubble-right {
    background: rgba(253, 231, 209, 1);
    color: #5f4026;
    text-align: left;
}

.self-bubble-row {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
}

.message-status {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-sizing: content-box;
}

.status-loading {
    border: 2px solid rgba(216, 162, 93, 0.25);
    border-top-color: #d8a25d;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    box-sizing: border-box;
}

.share-card {
    background: #ffffff;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 1px 7px rgba(0, 0, 0, 0.06);
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
    object-fit: cover;
    object-position: center center;
}

.share-video-badge {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 24px;
    height: 24px;
    background: rgba(0, 0, 0, 0.42);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.share-video-badge-icon {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.94);
    line-height: 1;
    margin-left: 1px;
    font-weight: 400;
}

.share-card-content {
    padding: 7px 8px 6px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.share-card-title-container {
    min-height: 22px;
}

.share-card-title {
    font-size: 15px;
    font-weight: 400;
    color: #333;
    line-height: 22px;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.share-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 31px;
    margin-top: 5px;
}

.share-card-author {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
}

.share-author-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid #f0f0f0;
    object-fit: cover;
    flex-shrink: 0;
    background: #f0f0f0;
    box-sizing: border-box;
}

.share-author-name {
    font-size: 14px;
    font-weight: 400;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.system-message {
    padding: 0;
    background: transparent;
    border-radius: 0;
    max-width: 80%;
}

.system-text {
    color: #999;
    text-align: center;
    font-weight: 400;
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
    height: 34px;
    background: #ffffff;
    border-radius: 7px;
    display: flex;
    align-items: center;
    overflow: hidden;
    box-shadow: 0 5px 14px rgba(0, 0, 0, 0.18);
}

.message-action-item {
    min-width: 56px;
    height: 34px;
    padding: 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: #333333;
    border-right: 1px solid #eeeeee;
    box-sizing: border-box;
    font-weight: 400;
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
    align-items: flex-start;
    padding-left: 10px;
    padding-right: 10px;
    background: #fefefe;
    border-top: none;
    gap: 8px;
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
    padding-left: 10px;
    padding-right: 10px;
    background: #fefefe;
    border-top: none;
    box-sizing: border-box;
    z-index: 110;
}

.disabled-input-text {
    color: #999;
    font-weight: 400;
}

.input-wrapper {
    flex: 1;
    background: #f0f2f5;
    overflow: hidden;
}

.input-field {
    color: #333;
    background: transparent;
    font-weight: 400;
    box-sizing: border-box;
}

.input-placeholder {
    color: #999;
}

.send-btn {
    background: rgba(253, 231, 209, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    box-shadow: none;
}

.send-btn-active {
    background: rgba(253, 231, 209, 1);
    box-shadow: 0 2px 8px rgba(253, 231, 209, 0.55);
}

.send-btn:active {
    transform: scale(0.95);
}

.send-text {
    font-weight: 400;
    color: #8a5a2b;
    line-height: 1;
}

.new-message-float {
    position: fixed;
    z-index: 40;
    height: 32px;
    padding: 0 13px;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
}

.new-message-float-text {
    font-size: 13px;
    color: #2f80ed;
    line-height: 32px;
}
</style>