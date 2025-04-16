<template>
    <view class="conversation-container">
        <view class="expand-button" @click="showDropdown = !showDropdown">
            <view class="dot"></view>
            <view class="dot"></view>
            <view class="dot"></view>
        </view>
        <view class="dropdown" v-if="showDropdown">
            <view class="dropdown-item" @click="goToSearchPage">搜索用户</view>
            <view class="dropdown-item" @click="goToCreateConversationPage">创建群聊</view>
            <view class="dropdown-item" @click="goToAIPage">AI问答</view>
        </view>
        <view class="conversation-list">
            <view class="conversation-item" v-for="(conversation, index) in conversationList" :key="index"
                  @click="openChat(conversation)">
                <view class="avatar">
                    <image :src="conversation.avatar_uri"></image>
                </view>
                <view class="conversation-info">
                    <view class="name">{{ conversation.name }}</view>
                    <view class="last-message">{{ conversation.last_message }}</view>
                </view>
                <view class="unread-count" v-if="conversation.badge_count - conversation.read_badge_count > 0">
                    {{ conversation.badge_count - conversation.read_badge_count }}
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js'

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
        goToSearchPage() {
            this.showDropdown = false;
            uni.navigateTo({
                url: '/pages/im/search'
            });
        },
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
        }
    }
};
</script>

<style scoped>
.conversation-container {
    padding: 10px;
    position: relative;
}

.expand-button {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 20px;
    cursor: pointer;
}

.dot {
    width: 4px;
    height: 4px;
    background-color: #000;
    border-radius: 50%;
    margin: 3px auto;
}

.dropdown {
    position: absolute;
    top: 30px;
    right: 10px;
    background-color: #fff;
    border: 1px solid #eee;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 1;
}

.dropdown-item {
    padding: 8px 16px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
}

.dropdown-item:last-child {
    border-bottom: none;
}

.conversation-list {
    display: flex;
    flex-direction: column;
    margin-top: 30px;
}

.conversation-item {
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

.conversation-info {
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