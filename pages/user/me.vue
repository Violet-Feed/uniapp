<template>
    <view class="user-profile-container">
        <view class="avatar">
            <image :src="userInfo.avatar"></image>
        </view>
        <view class="name">{{ userInfo.name }}</view>
        <view class="stats">
            <view @click="goToFansList">粉丝数: {{ userInfo.followers }}</view>
            <view @click="goToFollowingList">关注数: {{ userInfo.following }}</view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            userInfo: {
                id: null,
                name: '',
                avatar: '',
                followers: 0,
                following: 0
            }
        };
    },
    onLoad(options) {
		console.log(getApp().globalData.userId);
        this.userInfo.id = getApp().globalData.userId;
        this.userInfo.name = getApp().globalData.username;
        this.userInfo.avatar = getApp().globalData.avatar;
        this.userInfo.followers = 0;
        this.userInfo.following = 0;
    },
    methods: {
        goToFansList() {
            uni.navigateTo({
                url: `/pages/user/followed_list?id=${this.userInfo.id}&name=${this.userInfo.name}`
            });
        },
        goToFollowingList() {
            uni.navigateTo({
                url: `/pages/user/following_list?id=${this.userInfo.id}&name=${this.userInfo.name}`
            });
        }
    }
};
</script>

<style scoped>
.user-profile-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
}

.avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: 10px;
}

.avatar image {
    width: 100%;
    height: 100%;
}

.name {
    font-weight: bold;
    font-size: 18px;
    margin-bottom: 10px;
}

.stats {
    display: flex;
    justify-content: space-around;
    width: 100%;
    margin-bottom: 20px;
}

.stats view {
    cursor: pointer;
}

button {
    padding: 10px 20px;
    background-color: #0084ff;
    color: white;
    border: none;
    border-radius: 5px;
}
</style>