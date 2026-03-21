<template>
    <view class="chat-container">
        <!-- 顶部导航栏 -->
        <view class="chat-header">
            <view class="header-left" @click="goBack">
                <text class="back-icon">←</text>
            </view>
            <view class="header-center">
                <text class="chat-title">{{ chatName }}</text>
            </view>
            <view class="header-right" @click="goToSettings" v-if="conversation.con_type == 2">
                <text class="settings-icon">⋮</text>
            </view>
        </view>

        <!-- 消息列表 -->
        <scroll-view class="chat-messages" scroll-y="true" :scroll-into-view="scrollIntoViewId" @scroll="onScroll">
            <view class="messages">
                <!-- 加载提示 -->
                <view v-if="isLoading" class="loading-tip">
                    <view class="loading-spinner"></view>
                    <text class="loading-text">加载中...</text>
                </view>

                <!-- 消息列表 -->
                <view v-for="(message, index) in messages" :key="String(message.msg_id || index)" :id="'message-' + String(message.msg_id)">
                    <!-- 时间戳 -->
                    <view class="message-time" v-if="shouldShowTime(index)">
                        <text class="time-text">{{ formatTime(message.create_time) }}</text>
                    </view>

					<!-- 我发送的消息 -->
					<view class="message message-right" v-if="isSelfMessage(message)">
						<view class="message-status">
							<view class="status-loading" v-if="message.status == -1"></view>
						</view>
						<view class="message-content message-content-right">
							<text v-if="message.nick_name" class="sender-name sender-name-right">{{ message.nick_name }}</text>
							<view class="bubble bubble-right">
								<text class="bubble-text">{{ message.msg_content }}</text>
							</view>
						</view>
						<view class="avatar-box" @click="goToUserProfile(message)">
							<image class="avatar" :src="message.avatar_uri || myAvatar || userDefaultAvatar" mode="aspectFill"></image>
						</view>
					</view>

                    <!-- 他人/AI 发送的消息 -->
                    <view class="message message-left" v-else-if="isOtherSenderMessage(message)">
                        <view class="avatar-box" @click="goToUserProfile(message)">
                            <image class="avatar" :src="message.avatar_uri || (message.sender_type == 1 ? userDefaultAvatar : aiDefaultAvatar)" mode="aspectFill"></image>
                        </view>
                        <view class="message-content message-content-left">
                            <text v-if="message.nick_name" class="sender-name">{{ message.nick_name }}</text>
                            <view class="bubble bubble-left">
                                <text class="bubble-text">{{ message.msg_content }}</text>
                            </view>
                        </view>
                    </view>

                    <!-- 系统消息 -->
                    <view class="message message-center" v-else>
                        <view class="system-message">
                            <text class="system-text">{{ message.msg_content }}</text>
                        </view>
                    </view>
                </view>
            </view>
        </scroll-view>

        <!-- 输入栏 -->
        <view class="input-bar">
            <view class="input-wrapper">
                <input class="input-field" v-model="inputText" placeholder="说点什么..." placeholder-class="input-placeholder" @confirm="sendMessage" confirm-type="send" />
            </view>
            <view class="send-btn" :class="{ 'send-btn-active': inputText.trim() }" @click="sendMessage">
                <text class="send-icon">➤</text>
            </view>
        </view>
    </view>
</template>

<script>
import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js';
import { sendMessage, getMessageByConversation } from '@/request/im.js';

export default {
    data() {
        return {
            userId: getApp().globalData.userId,
            myAvatar: getApp().globalData.avatar,
            senderInfoMap: new Map(),
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
            aiDefaultAvatar: '/static/ai.png'
        };
    },

    async onLoad(options) {
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
                this.messages = res.reverse();
                this.conIndex = this.messages[0].con_index - 1;
            }

            if (this.conIndex <= this.conversation.min_index) {
                this.hasMore = false;
            } else if (this.messages.length < 20) {
                res = await getMessageByConversation(this.conversation.con_short_id, this.conIndex, 20 - this.messages.length);
                if (res.length > 0) {
                    await this.fillSenderInfos(res);
                    res.reverse();
                    this.messages = res.concat(this.messages);
                    this.conIndex = this.messages[0].con_index - 1;
                }
                if (res.length === 0 || this.conIndex <= this.conversation.min_index) {
                    this.hasMore = false;
                }
            }
        }

        setTimeout(() => this.scrollToBottom(), 100);

        this.normalListener = async (data) => {
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
        };
        uni.$on('normal', this.normalListener);

        this.commandListener = (data) => {
            if (this.conversation.con_id == data.msg_body.con_id) {
                const cmdMessage = JSONbig.parse(data.msg_body.msg_content);
                if (data.msg_body.msg_type == 101) {
                    this.conversation.read_index_end = cmdMessage.read_index_end;
                    this.conversation.read_badge_count = cmdMessage.read_badge_count;
                }
            }
        };
        uni.$on('command', this.commandListener);
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

            if (senders.length > 0 && typeof DB.getMemberInfosBySenders === 'function') {
                try {
                    const infos = await DB.getMemberInfosBySenders(this.conversation.con_id, senders);
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

        isSelfMessage(message) {
            return !!message && Number(message.sender_type) === 1 && String(message.sender_id) === String(this.userId);
        },

        isOtherSenderMessage(message) {
            return !!message && (Number(message.sender_type) === 1 || Number(message.sender_type) === 2) && !this.isSelfMessage(message);
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
            if (this.inputText.trim() === '') return;

            const token = getApp().globalData.token;
            const clientMsgId = getApp().globalData.msgIdGenerator.nextId();
            const sendingText = this.inputText;

            const payload = {
                conShortId: BigInt(this.conversation.con_short_id),
                conId: this.conversation.con_id,
                conType: this.conversation.con_type,
                clientMsgId: clientMsgId,
                msgType: 1,
                msgContent: sendingText
            };
            let res = await sendMessage(payload);
			if (res) {
				const selfKey = `1:${String(this.userId)}`;
				let selfInfo = this.senderInfoMap.get(selfKey) || {};
				if (!selfInfo.nick_name || !selfInfo.avatar_uri) {
					try {
						const infos = await DB.getMemberInfosBySenders(this.conversation.con_id, [{ sender_type: 1, sender_id: this.userId }]);
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
				if (this.messages.length === 0 || this.compareBigIntLike(this.messages[this.messages.length - 1].client_msg_id, clientMsgId) < 0) {
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
                    res = await getMessageByConversation(this.conversation.con_short_id, this.conIndex, 20 - res.length);
                    if (res.length > 0) {
                        await this.fillSenderInfos(res);
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
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f0f2f5;
}

.chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    background: #fff;
    border-bottom: 1px solid #e5e5e5;
    padding: 0 16px;
    flex-shrink: 0;
}

.header-left,
.header-right {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.back-icon {
    font-size: 24px;
    color: #333;
    font-weight: 500;
}

.header-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.chat-title {
    font-size: 17px;
    font-weight: 600;
    color: #333;
}

.settings-icon {
    font-size: 24px;
    color: #333;
    font-weight: 600;
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px 12px 12px 8px;
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
    padding: 16px 0;
}

.loading-spinner {
    width: 16px;
    height: 16px;
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
    font-size: 13px;
    color: #999;
}

.message-time {
    display: flex;
    justify-content: center;
    margin: 16px 0 12px;
}

.time-text {
    font-size: 12px;
    color: #999;
    background: rgba(0, 0, 0, 0.05);
    padding: 4px 12px;
    border-radius: 12px;
}

.message {
    display: flex;
    margin-bottom: 16px;
    align-items: flex-end;
    padding: 0 4px;
}

.message-left {
    justify-content: flex-start;
}

.message-right {
    justify-content: flex-end;
}

.message-center {
    justify-content: center;
}

.avatar-box {
    flex-shrink: 0;
}

.avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid #fff;
}

.message-left .avatar-box {
    margin-right: 8px;
}

.message-right .avatar-box {
    margin-left: 6px;
    margin-right: 8px;
}

.message-content {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 36px;
}

.message-content-left {
    max-width: calc(100% - 96px);
    align-items: flex-start;
}

.message-content-right {
    max-width: calc(100% - 96px);
    align-items: flex-end;
}

.sender-name {
    font-size: 12px;
    line-height: 1.2;
    color: #999;
    margin: 0 0 2px 6px;
}

.sender-name-right {
    margin: 0 6px 2px 0;
    text-align: right;
    align-self: flex-end;
}

.bubble {
    padding: 8px 16px;
    border-radius: 18px;
    word-break: break-word;
    position: relative;
    display: inline-block;
}

.bubble-text {
    font-size: 15px;
    line-height: 1.5;
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
    text-align: right;
}

.message-status {
    display: flex;
    align-items: center;
    margin-right: 4px;
}

.status-loading {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(102, 126, 234, 0.3);
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.system-message {
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 16px;
    max-width: 80%;
}

.system-text {
    font-size: 13px;
    color: #666;
    text-align: center;
}

.input-bar {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #fff;
    border-top: 1px solid #e5e5e5;
    gap: 12px;
    flex-shrink: 0;
}

.input-wrapper {
    flex: 1;
    background: #f0f2f5;
    border-radius: 24px;
    overflow: hidden;
}

.input-field {
    height: 40px;
    padding: 0 16px;
    font-size: 15px;
    color: #333;
    background: transparent;
}

.input-placeholder {
    color: #999;
}

.send-btn {
    width: 40px;
    height: 40px;
    background: #e0e0e0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
}

.send-btn-active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.send-btn:active {
    transform: scale(0.95);
}

.send-icon {
    font-size: 20px;
    font-weight: bold;
    color: #999;
}

.send-btn-active .send-icon {
    color: #fff;
}
</style>