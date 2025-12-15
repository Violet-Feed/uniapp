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
            <view class="header-right" @click="goToSettings">
                <text class="settings-icon">⋮</text>
            </view>
        </view>

        <!-- 消息列表 -->
        <scroll-view 
            class="chat-messages" 
            scroll-y="true" 
            :scroll-into-view="scrollIntoViewId" 
            @scroll="onScroll"
        >
            <view class="messages">
                <!-- 加载提示 -->
                <view v-if="isLoading" class="loading-tip">
                    <view class="loading-spinner"></view>
                    <text class="loading-text">加载中...</text>
                </view>
                
                <!-- 消息列表 -->
                <view v-for="(message, index) in messages" :key="index" :id="'message-' + message.msg_id">
                    <!-- 时间戳 -->
                    <view class="message-time" v-if="shouldShowTime(index)">
                        <text class="time-text">{{ formatTime(message.create_time) }}</text>
                    </view>
                    
                    <!-- 我发送的消息 -->
                    <view class="message message-right" v-if="message.user_id==userId">
                        <view class="message-status">
                            <view class="status-loading" v-if="message.status == -1"></view>
                        </view>
                        <view class="message-content">
                            <view class="bubble bubble-right">
                                <text class="bubble-text">{{ transformContent(message) }}</text>
                            </view>
                        </view>
                        <view class="avatar-box" @click="goToUserProfile(message)">
                            <image class="avatar" :src="myAvatar" mode="aspectFill"></image>
                        </view>
                    </view>
                    
                    <!-- 他人发送的消息 -->
                    <view class="message message-left" v-else-if="message.user_id>10">
                        <view class="avatar-box" @click="goToUserProfile(message)">
                            <image class="avatar" :src="conversation.avatar_uri" mode="aspectFill"></image>
                        </view>
                        <view class="message-content">
                            <view class="bubble bubble-left">
                                <text class="bubble-text">{{ transformContent(message) }}</text>
                            </view>
                        </view>
                    </view>
                    
                    <!-- 系统消息 -->
                    <view class="message message-center" v-else>
                        <view class="system-message">
                            <text class="system-text">{{ transformContent(message) }}</text>
                        </view>
                    </view>
                </view>
            </view>
        </scroll-view>
        
        <!-- 输入栏 -->
        <view class="input-bar">
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
    </view>
</template>

<script>
import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js'
import { getMessageByConversation, markRead } from '@/request/im.js';
export default {
    data() {
        return {
            userId: getApp().globalData.userId,
            myAvatar: getApp().globalData.avatar,
            members: new Map(),
            conversation: {},
            conIndex: Number.MAX_SAFE_INTEGER,
            messages: [],
            inputText: '',
            scrollIntoViewId: '',
            hasMore: true,
            isLoading: false,
            normalListener: null,
            commandListener: null,
            chatName: '', // 聊天对象昵称
        };
    },
    async onLoad(options) {
        this.conversation.con_short_id = 0;
        this.conversation.con_id = options.conId;
        this.conversation.con_type = Number(options.conType);
        this.chatName = options.name || '聊天'; // 保存聊天对象昵称
        uni.setNavigationBarTitle({ title: options.name });
        let res = await DB.selectConversation(options.conId);
        if (res.length > 0) {
            this.conversation = res[0];
            res = await DB.pullMessage(this.conversation.con_id, this.conIndex);
            if (res.length > 0) {
                this.messages = res.reverse();
                this.conIndex = this.messages[0].con_index - 1;
            }
            if (this.conIndex <= this.conversation.min_index) {
                this.hasMore = false;
            } else if (this.messages.length < 20) {
                res = await getMessageByConversation(this.conversation.con_short_id, this.conIndex, 20 - this.messages.length);
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
        setTimeout(() => this.scrollToBottom(), 100);

        this.normalListener = uni.$on('normal', (data) => {
            if (this.conversation.con_id == data.msg_body.con_id) {
                if (this.userId == data.msg_body.user_id) {
                    for (let i = this.messages.length - 1; i >= 0; i--) {
                        if (BigInt(this.messages[i].msg_id) == data.msg_body.msg_id) {
                            this.messages[i] = data.msg_body;
                            return;
                        }
                        if (this.messages[i].con_index && BigInt(this.messages[i].con_index) < data.msg_body.con_index) {
                            break;
                        }
                    }
                }
                this.messages.push(data.msg_body);
            }
        });

        this.commandListener = uni.$on('command', (data) => {
            if (this.conversation.con_id == data.msg_body.con_id) {
                const cmdMessage = JSONbig.parse(data.msg_body.msg_content);
                if (data.msg_body.msg_type == 101) {
                    this.conversation.read_index_end = cmdMessage.read_index_end;
                    this.conversation.read_badge_count = cmdMessage.read_badge_count;
                }
            }
        });
    },
    onUnload() {
        uni.$off('normal', this.normalListener);
        uni.$off('command', this.commandListener);
    },
    methods: {
        // 返回上一页
        goBack() {
            uni.navigateBack();
        },
        // 跳转到设置页面
        goToSettings() {
            uni.navigateTo({
                url: `/pages/im/setting?conId=${this.conversation.con_id}&conType=${this.conversation.con_type}`
            });
        },
        async sendMessage() {
            if (this.inputText.trim() === '') return;
            const token = getApp().globalData.token;
            const clientMsgId = getApp().globalData.msgIdGenerator.nextId();
            const data = {
                con_short_id: BigInt(this.conversation.con_short_id),
                con_id: this.conversation.con_id,
                con_type: this.conversation.con_type,
                client_msg_id: clientMsgId,
                msg_type: 1,
                msg_content: this.inputText
            };
            const dataJson = JSONbig.stringify(data);
            let res = await uni.request({
                url: 'http://127.0.0.1:3000/api/im/send_message',
                method: 'POST',
                header: {
                    'content-type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                data: dataJson,
                dataType: 'string',
            });
            if (res.statusCode === 200) {
                res = JSONbig.parse(res.data);
                if (res.code === 1000) {
                    if (this.messages.length == 0 || this.messages[this.messages.length - 1].client_msg_id < clientMsgId) {
                        this.messages.push({
                            user_id: this.userId,
                            con_short_id: this.conversation.con_short_id,
                            con_id: this.conversation.con_id,
                            con_type: this.conversation.con_type,
                            client_msg_id: clientMsgId,
                            msg_id: res.data.msg_id,
                            msg_type: 1,
                            msg_content: this.inputText,
                            create_time: Date.now() / 1000,
                            status: -1
                        });
                    }
                    this.inputText = '';
                    this.scrollToBottom();
                } else {
                    uni.showToast({ title: '服务器错误', icon: 'none' });
                }
            } else {
                uni.showToast({ title: '网络错误', icon: 'none' });
            }
        },
        goToUserProfile(message) {
            uni.navigateTo({
                url: `/pages/user/user_profile?userId=${BigInt(message.user_id)}`
            });
        },
        scrollToBottom() {
            this.$nextTick(() => {
                if (this.messages.length > 0) {
                    this.scrollIntoViewId = 'message-' + this.messages[this.messages.length - 1].msg_id;
                }
            });
        },
        async onScroll(e) {
            if (e.detail.scrollTop == 0 && this.hasMore) {
                this.isLoading = true;
                let res = await DB.pullMessage(this.conversation.con_id, this.conIndex);
                let newMessages = res.reverse();
                if (res.length > 0) {
                    if (this.conIndex != newMessages[res.length - 1].con_index) {
                        console.error("TODO:getByConversation");
                    }
                    this.conIndex = newMessages[0].con_index - 1;
                }
                if (this.conIndex <= this.conversation.min_index) {
                    this.hasMore = false;
                } else if (res.length < 20) {
                    res = await getMessageByConversation(this.conversation.con_short_id, this.conIndex, 20 - res.length);
                    if (res.length > 0) {
                        res.reverse();
                        newMessages = res.concat(newMessages);
                        this.conIndex = newMessages[0].con_index - 1;
                    }
                    if (res.length === 0 || this.conIndex <= this.conversation.min_index) {
                        this.hasMore = false;
                    }
                }
                const firstMsgId = this.messages[0].msg_id;
                this.$nextTick(() => {
                    this.messages = newMessages.concat(this.messages);
                    this.scrollIntoViewId = 'message-' + firstMsgId;
                    this.isLoading = false;
                });
            }
        },
        transformContent(message) {
    if (message.msg_type == 5) {
        try {
            const data = JSON.parse(message.msg_content);
            const operator = data.operator || '未知用户';
            switch (data.type) {
                case 1: // Add_Member - 添加成员
                    if (Array.isArray(data.content) && data.content.length > 0) {
                        // 提取成员昵称
                        const memberNames = data.content.join('、');
                        return `${operator} 邀请 ${memberNames} 加入了群聊`;
                    }
                    // 如果没有content，说明是操作者自己加入
                    return `${operator} 加入了群聊`;
                case 2: // Remove_Member - 移除成员
                    if (Array.isArray(data.content) && data.content.length > 0) {
                        const memberNames = data.content.join('、');
                        return `${operator} 将 ${memberNames} 移出了群聊`;
                    }
                    // 如果没有content，说明是操作者自己退出
                    return `${operator} 退出了群聊`;
                case 3: // Modify_Name - 修改群名
                    return `${operator} 修改群名为 "${data.content}"`;
                case 4: // Modify_Description - 修改群资料
                    return `${operator} 修改群资料为 "${data.content}"`;    
                default:
                    // 未知类型，返回原始内容
                    console.warn('未知的群聊消息类型:', data.type);
                    return message.msg_content;
            }
        } catch (e) {
            // JSON解析失败，返回原始内容
            console.error('解析群聊消息失败:', e, message.msg_content);
            return message.msg_content;
        }
    }
            return message.msg_content;
        },
        formatTime(timestamp) {
            const date = new Date(Number(timestamp) * 1000);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1);
            const day = String(date.getDate());
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            return `${year}年${month}月${day}日 ${hour}:${minute}`;
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

/* 顶部导航栏 */
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

/* 修复右边头像与文字对齐 */
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
    to { transform: rotate(360deg); }
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
    max-width: 70%;
    display: flex;
    flex-direction: column;
}

.message-right .message-content {
    align-items: flex-end; /* 让右气泡整体靠右 */
    max-width: calc(100% - 96px);
}

.bubble {
    padding: 12px 16px;
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
    text-align: right; /* 右侧气泡文本右对齐 */
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