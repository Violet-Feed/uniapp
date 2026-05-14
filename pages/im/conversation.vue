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
                                v-if="message.nick_name"
                                class="sender-name sender-name-right"
                                :style="senderNameRightStyle"
                            >
                                {{ message.nick_name }}
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
                                        <image class="share-card-image" :src="getShareCoverUrl(message)" mode="aspectFill"></image>
                                        <view class="share-video-badge" :style="shareVideoBadgeStyle" v-if="isShareVideo(message)">
                                            <text class="share-video-badge-icon" :style="shareVideoBadgeIconStyle">▶</text>
                                        </view>
                                    </view>

                                    <view class="share-card-content" :style="shareCardContentStyle">
                                        <view class="share-card-title-container" :style="shareTitleContainerStyle">
                                            <text class="share-card-title" :style="shareTitleStyle">{{ getShareTitle(message) }}</text>
                                        </view>

                                        <view class="share-card-footer" :style="shareFooterStyle">
                                            <view class="share-card-author" @click.stop="goToShareUserPage(message)">
                                                <image
                                                    class="share-author-avatar"
                                                    :style="shareAuthorAvatarStyle"
                                                    :src="getShareAuthorAvatar(message)"
                                                    mode="aspectFill"
                                                ></image>
                                                <text class="share-author-name" :style="shareAuthorNameStyle">
                                                    {{ getShareAuthorName(message) }}
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
                                :src="message.avatar_uri || myAvatar || userDefaultAvatar"
                                mode="aspectFill"
                            ></image>
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
                            <text v-if="message.nick_name" class="sender-name" :style="senderNameStyle">
                                {{ message.nick_name }}
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
                                    <image class="share-card-image" :src="getShareCoverUrl(message)" mode="aspectFill"></image>
                                    <view class="share-video-badge" :style="shareVideoBadgeStyle" v-if="isShareVideo(message)">
                                        <text class="share-video-badge-icon" :style="shareVideoBadgeIconStyle">▶</text>
                                    </view>
                                </view>

                                <view class="share-card-content" :style="shareCardContentStyle">
                                    <view class="share-card-title-container" :style="shareTitleContainerStyle">
                                        <text class="share-card-title" :style="shareTitleStyle">{{ getShareTitle(message) }}</text>
                                    </view>

                                    <view class="share-card-footer" :style="shareFooterStyle">
                                        <view class="share-card-author" @click.stop="goToShareUserPage(message)">
                                            <image
                                                class="share-author-avatar"
                                                :style="shareAuthorAvatarStyle"
                                                :src="getShareAuthorAvatar(message)"
                                                mode="aspectFill"
                                            ></image>
                                            <text class="share-author-name" :style="shareAuthorNameStyle">
                                                {{ getShareAuthorName(message) }}
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
            chatName: '',
            userDefaultAvatar: '/static/user_avatar.png',
            aiDefaultAvatar: '/static/ai_avatar.png',
            defaultCover: '/static/images/default.png',
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
            shareCardHeight: 235,
            shareImageHeight: 188,
            shareContentHeight: 47,
            shareTitleFontSize: 12,
            shareTitleLineHeight: 18,
            shareAuthorFontSize: 10,
            shareAuthorAvatarSize: 16,
            shareVideoBadgeSize: 20,
			
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
            return 'height:' + this.shareContentHeight + 'px;padding:' + Math.max(5, Math.floor(this.shareContentHeight * 0.12)) + 'px ' + Math.max(6, Math.floor(this.shareContentHeight * 0.15)) + 'px;';
        },

        shareTitleContainerStyle() {
            return 'height:' + this.shareTitleLineHeight + 'px;';
        },

        shareTitleStyle() {
            return 'font-size:' + this.shareTitleFontSize + 'px;line-height:' + this.shareTitleLineHeight + 'px;';
        },

        shareFooterStyle() {
            return 'height:' + Math.max(18, this.shareAuthorAvatarSize + 2) + 'px;';
        },

        shareAuthorAvatarStyle() {
            return 'width:' + this.shareAuthorAvatarSize + 'px;height:' + this.shareAuthorAvatarSize + 'px;border-radius:' + Math.floor(this.shareAuthorAvatarSize / 2) + 'px;';
        },

        shareAuthorNameStyle() {
            return 'font-size:' + this.shareAuthorFontSize + 'px;line-height:' + Math.max(14, this.shareAuthorAvatarSize) + 'px;';
        },

        shareVideoBadgeStyle() {
            return 'width:' + this.shareVideoBadgeSize + 'px;height:' + this.shareVideoBadgeSize + 'px;border-radius:' + Math.floor(this.shareVideoBadgeSize / 2) + 'px;';
        },

        shareVideoBadgeIconStyle() {
            return 'font-size:' + clamp(Math.floor(this.shareVideoBadgeSize * 0.52), 10, 13) + 'px;';
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
				if (res) {
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

			const shouldScrollToBottom = this.isAtBottom || this.isSelfMessage(msg);
			
            this.messages.push(msg);

            if (shouldScrollToBottom) {
                this.recordPendingReadMessage(msg);
                this.scrollToBottom();
            } else {
                this.addFloatingUnread(msg);
            }
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
        this.flushReadMarkOnExit();

        if (this.normalListener) {
            uni.$off('normal', this.normalListener);
        }
        if (this.commandListener) {
            uni.$off('command', this.commandListener);
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
                this.shareCardHeight = Math.floor(this.shareCardWidth * 4 / 3);
                this.shareContentHeight = clamp(Math.floor(this.shareCardWidth * 0.27), 45, 56);
                this.shareImageHeight = this.shareCardHeight - this.shareContentHeight;
                this.shareTitleFontSize = clamp(Math.floor(windowWidth * 0.032), 12, 14);
                this.shareTitleLineHeight = this.shareTitleFontSize + 6;
                this.shareAuthorFontSize = clamp(Math.floor(windowWidth * 0.027), 10, 12);
                this.shareAuthorAvatarSize = clamp(Math.floor(windowWidth * 0.045), 16, 19);
                this.shareVideoBadgeSize = clamp(Math.floor(windowWidth * 0.056), 20, 24);
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
                this.shareCardHeight = 235;
                this.shareContentHeight = 47;
                this.shareImageHeight = 188;
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
					if (res) {
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

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.chat-container {
    position: relative;
    height: 100vh;
    background: #fdfdfd;
    overflow: hidden;
    font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.chat-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 120;
    background: #fdfdfd;
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
    background: #fdfdfd;
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
    border-radius: 9px;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.055);
    transition: all 0.24s;
}

.share-card-left {
    align-self: flex-start;
    background: #f0f2f5;
}

.share-card-right {
    align-self: flex-end;
    background: rgba(253, 231, 209, 1);
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
    background: rgba(0, 0, 0, 0.42);
    display: flex;
    align-items: center;
    justify-content: center;
}

.share-video-badge-icon {
    color: rgba(255, 255, 255, 0.94);
    line-height: 1;
    margin-left: 1px;
    font-weight: 400;
}

.share-card-content {
    box-sizing: border-box;
    background: #f0f2f5;
}

.share-card-title-container {
    overflow: hidden;
}

.share-card-title {
    font-weight: 400;
    color: #333;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.share-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.share-card-author {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
}

.share-author-avatar {
    border: 1px solid rgba(240, 240, 240, 0.8);
    flex-shrink: 0;
    background: #f0f0f0;
    box-sizing: border-box;
}

.share-author-name {
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 400;
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
    background: #fdfdfd;
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
    background: #fdfdfd;
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