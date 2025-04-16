<template>
    <view class="create-group-container">
        <view class="header">
            <view class="confirm-button" @click="createConversation">确定</view>
        </view>
        <view class="friend-list">
            <view class="friend-item" v-for="(user, index) in userList" :key="index">
                <view class="avatar">
                    <image :src="user.avatar"></image>
                </view>
                <view class="name">{{ user.username }}</view>
                <checkbox :checked="user.selected" @change="toggleUserSelection(index)"></checkbox>
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
            userList: []
        };
    },
    async onLoad() {
        const {
            token,
            userId
        } = getApp().globalData;
        const data = {
            user_id: userId
        };
        const dataJson = JSONbig.stringify(data);
        let res = await uni.request({
            url: 'http://127.0.0.1:3000/api/relation/get_friend_list',
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
                this.userList = res.data.user_infos;
                for (const user of this.userList) {
                    if (user.avatar === "") {
                        user.avatar = "/static/user_avatar.png";
                    }
                }
            }
        }
    },
    methods: {
        toggleUserSelection(index) {
            this.userList[index].selected = !this.userList[index].selected;
        },
        async createConversation() {
            const selectedUserIds = this.userList.filter(user => user.selected).map(user => user.user_id);
			if(selectedUserIds.length==0){
				return;
			}
            const {
                token
            } = getApp().globalData.token;
            const data = {
                con_type: 2,
                members: selectedUserIds
            };
            const dataJson = JSONbig.stringify(data);
            let res = await uni.request({
                url: 'http://127.0.0.1:3000/api/im/create_conversation',
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
                    const {
                        con_short_id,
                        con_id,
                        con_type,
                        owner_id,
                        create_time,
                        member_count
                    } = res.data.con_core_info;
                    const user_con_index = 9999;
                    const conValues = `(${con_short_id}, '${con_id}', ${con_type}, '群聊', '', '', '', ${owner_id}, ${create_time},0,0,0,0, ',', ${member_count},0,0,0, ${user_con_index}, '')`;
                    DB.insertConversation(conValues).catch((err) => {
                        console.error("insertConversation err", err);
                    })
                    uni.navigateTo({
                        url: `/pages/im/conversation?conId=${res.data.con_core_info.con_id}&name=群聊&conType=${res.data.con_core_info.con_type}`
                    });
                }
            }
        }
    }
};
</script>

<style scoped>
.create-group-container {
    padding: 10px;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.title {
    font-weight: bold;
    font-size: 18px;
}

.confirm-button {
    background-color: #007aff;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
}

.friend-list {
    display: flex;
    flex-direction: column;
}

.friend-item {
    display: flex;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
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

.name {
    flex: 1;
}
</style>