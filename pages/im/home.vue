<template>
    <view class="session-container">
        <!-- 会话列表 -->
        <view class="session-list">
            <view class="session-item" v-for="(session, index) in chatSessions" :key="index" @click="openChat(session)">
                <!-- 头像 -->
                <view class="avatar">
                    <image :src="session.avatar"></image>
                </view>
                <!-- 会话信息 -->
                <view class="session-info">
                    <!-- 对方名称 -->
                    <view class="name">{{ session.name }}</view>
                    <!-- 最新消息 -->
                    <view class="last-message">{{ session.lastMessage }}</view>
                </view>
                <!-- 未读消息数量 -->
                <view class="unread-count" v-if="session.unreadCount > 0">
                    {{ session.unreadCount }}
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            // 模拟聊天会话数据
            chatSessions: [
                {
                    id: 1,
                    name: "张三",
                    avatar: "/static/logo.jpg",
                    lastMessage: "最近忙吗？",
                    unreadCount: 2
                },
                {
                    id: 2,
                    name: "李四",
                    avatar: "/static/logo.jpg",
                    lastMessage: "明天一起吃饭吧。",
                    unreadCount: 0
                },
                {
                    id: 3,
                    name: "王五",
                    avatar: "/static/logo.jpg",
                    lastMessage: "好的，没问题。",
                    unreadCount: 1
                }
            ]
        };
    },
    methods: {
        // 打开聊天页面的方法
        openChat(session) {
            uni.navigateTo({
                url: `/pages/im/conversation?id=${session.id}&name=${session.name}&avatar=${session.avatar}`
            });
        }
    }
};
</script>

<style scoped>
.session-container {
    padding: 10px;
}

.session-list {
    display: flex;
    flex-direction: column;
}

.session-item {
    display: flex;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
}

.avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    overflow: hidden;
    margin-right: 10px;
}

.avatar image {
    width: 100%;
    height: 100%;
}

.session-info {
    flex: 1;
}

.name {
    font-weight: bold;
    margin-bottom: 5px;
}

.last-message {
    color: #666;
    font-size: 14px;
}

.unread-count {
    background-color: #ff0000;
    color: white;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 50%;
}
</style>