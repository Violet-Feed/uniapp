<template>
    <view class="create-group-container">
        <!-- 顶部栏 -->
        <view class="header-bar">
            <view class="back-btn" @click="goBack">
                <text class="back-icon">←</text>
            </view>
            <text class="header-title">选择联系人</text>
            <view 
                class="confirm-btn" 
                :class="{ 'confirm-btn-active': selectedCount > 0 }"
                @click="createConversation"
            >
                <text class="confirm-text">创建</text>
                <text class="confirm-count" v-if="selectedCount > 0">({{ selectedCount }})</text>
            </view>
        </view>
        
        <!-- 已选择成员预览 -->
        <view class="selected-preview" v-if="selectedCount > 0">
            <scroll-view class="selected-scroll" scroll-x>
                <view class="selected-list">
                    <view 
                        class="selected-item" 
                        v-for="(user, index) in userList.filter(u => u.selected)" 
                        :key="index"
                    >
                        <view class="selected-avatar-wrapper">
                            <image class="selected-avatar" :src="user.avatar" mode="aspectFill"></image>
                            <view class="remove-badge" @click.stop="toggleUserSelection(userList.indexOf(user))">
                                <text class="remove-icon">✕</text>
                            </view>
                        </view>
                        <text class="selected-name">{{ user.username }}</text>
                    </view>
                </view>
            </scroll-view>
        </view>
        
        <!-- 好友列表 -->
        <scroll-view class="friend-scroll" scroll-y>
            <view class="friend-list">
                <view 
                    class="friend-item" 
                    v-for="(user, index) in userList" 
                    :key="index"
                    @click="toggleUserSelection(index)"
                >
                    <!-- 头像 -->
                    <view class="avatar-wrapper">
                        <image class="avatar" :src="user.avatar" mode="aspectFill"></image>
                    </view>
                    
                    <!-- 用户信息 -->
                    <view class="user-info">
                        <text class="user-name">{{ user.username }}</text>
                        <text class="user-bio" v-if="user.bio">{{ user.bio }}</text>
                    </view>
                    
                    <!-- 选择框 -->
                    <view class="checkbox-wrapper">
                        <view class="custom-checkbox" :class="{ 'checkbox-checked': user.selected }">
                            <text class="checkbox-icon" v-if="user.selected">✓</text>
                        </view>
                    </view>
                </view>
                
                <!-- 空状态 -->
                <view v-if="userList.length === 0" class="empty-state">
                    <text class="empty-icon">👥</text>
                    <text class="empty-text">暂无好友</text>
                    <text class="empty-hint">快去添加好友吧！</text>
                </view>
            </view>
        </scroll-view>
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
    computed: {
        selectedCount() {
            return this.userList.filter(user => user.selected).length;
        }
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
                    user.selected = false;
                }
            }
        }
    },
    methods: {
        goBack() {
            uni.navigateBack();
        },
        toggleUserSelection(index) {
            this.userList[index].selected = !this.userList[index].selected;
        },
        async createConversation() {
            const selectedUserIds = this.userList.filter(user => user.selected).map(user => user.user_id);
            if(selectedUserIds.length==0){
                uni.showToast({
                    title: '请至少选择一位好友',
                    icon: 'none'
                });
                return;
            }
            const {
                token,
                userId
            } = getApp().globalData;
            selectedUserIds.push(userId);
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
            console.log(res);
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
                    const user_con_index = Number.MAX_SAFE_INTEGER;
                    const conValues = `(${con_short_id}, '${con_id}', ${con_type}, '群聊', '/static/conv_avatar.png', '', '', ${owner_id}, ${create_time},0,0,0,0, ',', ${member_count},0,0,0, ${user_con_index}, '')`;
                    DB.insertConversation(conValues)
                    .then(()=>{
                        uni.showToast({
                            title: '创建成功',
                            icon: 'success'
                        });
                        setTimeout(() => {
                            uni.navigateTo({
                                url: `/pages/im/conversation?conId=${con_id}&name=群聊&conType=${con_type}`
                            });
                        }, 500);
                    })
                    .catch((err) => {
                        console.error("insertConversation err", err);
                    })
                }
            }
        }
    }
};
</script>

<style scoped>
.create-group-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f8f9fa;
}

/* ==================== 顶部栏 ==================== */
.header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: sticky;
    top: 0;
    z-index: 100;
}

.back-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.back-icon {
    font-size: 24px;
    color: #fff;
}

.header-title {
    font-size: 17px;
    font-weight: bold;
    color: #fff;
}

.confirm-btn {
    padding: 6px 16px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.3s;
}

.confirm-btn-active {
    background: #fff;
}

.confirm-btn-active .confirm-text,
.confirm-btn-active .confirm-count {
    color: #667eea;
}

.confirm-text {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
}

.confirm-count {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
}

/* ==================== 已选择预览 ==================== */
.selected-preview {
    background: #fff;
    padding: 12px 0;
    border-bottom: 1px solid #e5e5e5;
}

.selected-scroll {
    white-space: nowrap;
}

.selected-list {
    display: inline-flex;
    padding: 0 16px;
    gap: 16px;
}

.selected-item {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}

.selected-avatar-wrapper {
    position: relative;
}

.selected-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid #667eea;
}

.remove-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
}

.remove-icon {
    font-size: 10px;
    color: #fff;
    font-weight: bold;
}

.selected-name {
    font-size: 12px;
    color: #666;
    max-width: 50px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ==================== 好友列表 ==================== */
.friend-scroll {
    flex: 1;
    overflow: hidden;
}

.friend-list {
    padding: 8px 0;
}

.friend-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #fff;
    margin-bottom: 1px;
    transition: background 0.2s;
}

.friend-item:active {
    background: #f5f5f5;
}

/* 头像 */
.avatar-wrapper {
    flex-shrink: 0;
    margin-right: 12px;
}

.avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid #f0f0f0;
}

/* 用户信息 */
.user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
}

.user-name {
    font-size: 15px;
    font-weight: 600;
    color: #333;
}

.user-bio {
    font-size: 13px;
    color: #999;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 选择框 */
.checkbox-wrapper {
    flex-shrink: 0;
    margin-left: 12px;
}

.custom-checkbox {
    width: 22px;
    height: 22px;
    border: 2px solid #ddd;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
}

.checkbox-checked {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: #667eea;
}

.checkbox-icon {
    font-size: 14px;
    font-weight: bold;
    color: #fff;
}

/* ==================== 空状态 ==================== */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 100px 20px;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
}

.empty-text {
    font-size: 16px;
    color: #666;
    margin-bottom: 8px;
}

.empty-hint {
    font-size: 14px;
    color: #999;
}
</style>