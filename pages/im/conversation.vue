<template>
    <view class="chat-container">
        <!-- 聊天消息列表 -->
        <scroll-view class="chat-messages" scroll-y="true" :scroll-top="scrollTop" ref="chatMessages">
            <view class="message" :class="{ 'message-left': item.isSelf === false, 'message-right': item.isSelf === true }" v-for="(item, index) in messages" :key="index">
                <!-- 对方消息，头像在左 -->
                <template v-if="!item.isSelf">
                    <view class="avatar" @click="goToUserProfile">
                        <image :src="chatTarget.avatar"></image>
                    </view>
                    <view class="message-content">
                        <view class="bubble">{{ item.content }}</view>
                    </view>
                </template>
                <!-- 自己消息，头像在右 -->
                <template v-else>
                    <view class="message-content">
                        <view class="bubble">{{ item.content }}</view>
                    </view>
                    <view class="avatar" @click="goToUserProfile">
                        <image :src="myAvatar"></image>
                    </view>
                </template>
            </view>
        </scroll-view>
        <!-- 输入框和发送按钮，固定在屏幕底部 -->
        <view class="input-bar">
            <input v-model="inputText" placeholder="请输入消息" @confirm="sendMessage" />
            <button @click="sendMessage">发送</button>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            chatTarget: {
                id: null,
                name: '',
                avatar: '',
                followers: 100,
                following: 50
            },
            messages: [],
            inputText: '',
            scrollTop: 0,
            myAvatar: '/static/logo.jpg'
        };
    },
    onLoad(options) {
        // 获取传递过来的对方昵称
        this.chatTarget.id = options.id;
        this.chatTarget.name = options.name;
        this.chatTarget.avatar = options.avatar;

        // 动态设置导航栏标题
        uni.setNavigationBarTitle({
            title: this.chatTarget.name
        });

        // 加载聊天记录等其他逻辑
        this.loadMessages();
    },
    methods: {
        loadMessages() {
            this.messages = [
                {
                    isSelf: false,
                    content: `你好，我是 ${this.chatTarget.name}`
                },
                {
                    isSelf: true,
                    content: '你好呀'
                }
            ];
            this.$nextTick(() => {
                this.scrollTop = this.$refs.chatMessages.scrollHeight;
            });
        },
        sendMessage() {
            if (this.inputText.trim() === '') return;
            this.messages.push({
                isSelf: true,
                content: this.inputText
            });
            this.inputText = '';
            this.$nextTick(() => {
                this.scrollTop = this.$refs.chatMessages.scrollHeight;
            });
			const token=getApp().globalData.token;
			const con_id="1";
			uni.request({
			    url: 'http://127.0.0.1:3001/api/im/message/send',
			    method: 'POST',
				header: { 
					'content-type': 'application/json',
					Authorization: `Bearer ${token}`,
					},
			    data: {
					con_id:con_id,
					msg_type:1,
			        msg_content: this.searchKeyword
			    },
			    success: (res) => {
			        if (res.statusCode === 200) {
			            
			        } else {
			            uni.showToast({
			                title: '搜索失败，请稍后重试',
			                icon: 'none'
			            });
			        }
			    },
			    fail: (err) => {
			        uni.showToast({
			            title: '网络错误，请稍后重试',
			            icon: 'none'
			        });
			    }
			});
        },
        goToUserProfile() {
            uni.navigateTo({
                url: `/pages/user/user?id=${this.chatTarget.id}&name=${this.chatTarget.name}&avatar=${this.chatTarget.avatar}&followers=${this.chatTarget.followers}&following=${this.chatTarget.following}`
            });
        }
    }
};
</script>

<style scoped>
.chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: relative;
}

.chat-header {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
    position: fixed; /* 固定顶栏 */
    top: 0;
    left: 0;
    right: 0;
    background-color: white; /* 设置背景颜色 */
    z-index: 1; /* 设置层级，确保在消息列表之上 */
}

.chat-header .name {
    font-weight: bold;
    font-size: 18px;
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    margin-top: 10px; 
    margin-bottom: 60px; /* 为输入栏留出空间 */
    padding-left: 10px; /* 统一消息左右间距 */
    padding-right: 10px;
    box-sizing: border-box; /* 确保 padding 包含在元素宽度内 */
}

.message {
    display: flex;
    margin-bottom: 10px;
}

.message-left {
    justify-content: flex-start;
}

.message-right {
    justify-content: flex-end;
}

.avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    margin: 0 10px; /* 头像距离左右两侧的距离相同 */
}

.avatar image {
    width: 100%;
    height: 100%;
}

.message-content {
    max-width: 70%;
}

.bubble {
    padding: 10px;
    border-radius: 10px;
    background-color: #f0f0f0;
}

.message-right .bubble {
    background-color: #0084ff;
    color: white;
}

.input-bar {
    display: flex;
    padding: 10px;
    border-top: 1px solid #ccc;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: white;
    box-sizing: border-box;
}

.input-bar input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    margin-right: 10px;
    height: 40px; /* 输入框高度 */
    box-sizing: border-box;
}

.input-bar button {
    padding: 0 20px; /* 调整按钮内边距 */
    background-color: #0084ff;
    color: white;
    border: none;
    border-radius: 5px;
    height: 40px; /* 按钮高度和输入框相同 */
    box-sizing: border-box;
    display: flex; /* 使用 flex 布局让文字上下居中 */
    justify-content: center;
    align-items: center;
}
</style>