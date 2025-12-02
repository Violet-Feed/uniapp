<template>
    <view class="container" v-if="isPageAlive">
        <!-- 搜索区域 -->
        <view class="search-wrapper">
            <view class="fixed-search-bar">
                <view class="back-button" @click="goBack">
                    <text class="back-icon">←</text>
                </view>
                <view class="search-input-container">
                    <text class="search-icon">🔍</text>
                    <input 
                        v-model="keyword" 
                        type="text" 
                        placeholder="搜索创作或用户" 
                        @confirm="onSearchConfirm" 
                        :focus="autoFocus"
                    />
                    <text v-if="keyword" class="clear-icon" @click.stop="clearKeyword">✕</text>
                </view>
                <view class="search-button" @click="onSearchConfirm">
                    <text>搜索</text>
                </view>
            </view>
        </view>

        <!-- 筛选栏：创作 / 用户 / 群聊（群聊先不做） -->
        <view class="filter-bar">
            <view 
                class="filter-item" 
                :class="{ active: activeFilter === 'creation' }" 
                @click="changeFilter('creation')"
            >
                <text class="filter-text">创作</text>
                <view class="filter-indicator" v-if="activeFilter === 'creation'"></view>
            </view>
            <view 
                class="filter-item" 
                :class="{ active: activeFilter === 'user' }" 
                @click="changeFilter('user')"
            >
                <text class="filter-text">用户</text>
                <view class="filter-indicator" v-if="activeFilter === 'user'"></view>
            </view>
            <view class="filter-item disabled">
                <text class="filter-text">群聊</text>
            </view>
        </view>

        <!-- 搜索结果统计 -->
        <view 
            class="result-info" 
            v-if="creationList.length > 0 || userList.length > 0"
        >
            <text class="result-text">
                找到 
                <text class="result-count">
                    {{ activeFilter === 'creation' ? creationList.length : userList.length }}
                </text> 
                个相关结果
            </text>
        </view>

        <!-- 内容区域 -->
        <view class="creation-grid-container">
            <!-- 初始加载状态（创作） -->
            <view 
                v-if="activeFilter === 'creation' && creationLoading && creationList.length === 0" 
                class="initial-loading"
            >
                <view class="loading-spinner"></view>
                <text class="loading-text">搜索中...</text>
            </view>

            <!-- 创作结果：双列宫格 -->
            <view v-if="activeFilter === 'creation'">
                <view class="creation-grid" v-if="creationList.length > 0">
					<view 
						class="creation-card" 
						v-for="(creation, index) in creationList" 
						:key="`creation-${creation.creation_id}-${index}`" 
						@click="goToCreationDetail(creation)"
					>
                        <!-- 图片容器 -->
                        <view class="image-wrapper">
                            <image 
                                class="card-image" 
                                :src="creation.cover" 
                                mode="aspectFill"
                                @error="handleCreationImageError(creation)"
                                lazy-load
                            ></image>
                            <!-- 渐变遮罩 -->
                            <view class="image-gradient"></view>
                        </view>
                        
                        <!-- 内容区域 -->
                        <view class="card-content">
                            <view class="card-title-container">
                                <text class="card-title">{{ creation.title }}</text>
                            </view>

                            <!-- 作者 + 时间 + 点赞 -->
                            <view class="card-footer">
                                <view class="card-author">
                                    <image 
                                        class="author-avatar" 
                                        :src="creation.avatar" 
                                        mode="aspectFill"
                                        lazy-load
                                    ></image>
                                    <view class="author-info">
                                        <text class="author-name">{{ creation.username }}</text>
                                        <text class="card-time">{{ creation.displayTime }}</text>
                                    </view>
                                </view>
                                <view 
                                    class="card-likes"
                                    @click.stop="toggleDigg(creation, index)"
                                >
                                    <text 
                                        class="like-icon"
                                        :class="{ active: creation.is_digg }"
                                    >
                                        {{ creation.is_digg ? '♥️' : '♡' }}
                                    </text>
                                    <text class="like-count">
                                        {{ formatNumber(creation.digg_count) }}
                                    </text>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>

                <!-- 创作空状态 -->
                <view v-else-if="!creationLoading" class="empty-state">
                    <text class="empty-icon">🔍</text>
                    <text class="empty-text">没有找到相关创作</text>
                    <text class="empty-hint">试试其他关键词吧</text>
                </view>
            </view>

            <!-- 用户结果：列表，参考粉丝列表设计 -->
            <view v-else-if="activeFilter === 'user'">
                <scroll-view 
                    class="user-list-scroll" 
                    scroll-y 
                    @scrolltolower="loadMoreUsers"
                    refresher-enabled
                    :refresher-triggered="userRefreshing"
                    @refresherrefresh="onUserRefresh"
                >
                    <view class="user-list" v-if="userList.length > 0">
                        <view 
                            class="user-item" 
                            v-for="(user, index) in userList" 
                            :key="`user-${user.user_id || index}`"
                        >
                            <view class="user-left" @click="goToUserPage(user)">
                                <view class="avatar-wrapper">
                                    <image class="avatar" :src="user.avatar" mode="aspectFill"></image>
                                </view>
                                <view class="user-info">
                                    <view class="user-name-row">
                                        <text class="user-name">{{ user.username }}</text>
                                    </view>
                                    <text class="user-bio" v-if="user.bio">{{ user.bio }}</text>
                                    <text class="user-bio placeholder" v-else>
                                        这个人很懒，什么都没写~
                                    </text>
                                </view>
                            </view>
                            <view class="user-right">
                                <!-- 已关注 -->
                                <view 
                                    v-if="user.is_following"
                                    class="following-btn"
                                    @click.stop="confirmUnfollow(user)"
                                >
                                    <text class="btn-text">✓ 已关注</text>
                                </view>
                                <!-- 未关注 -->
                                <view 
                                    v-else
                                    class="follow-btn" 
                                    @click.stop="followUser(user)"
                                >
                                    <text class="btn-text">+ 关注</text>
                                </view>
                            </view>
                        </view>
                    </view>

                    <!-- 用户空状态 -->
                    <view v-if="!userLoading && userList.length === 0" class="empty-state">
                        <text class="empty-icon">👤</text>
                        <text class="empty-text">没有找到相关用户</text>
                        <text class="empty-hint">试试换个昵称或关键词</text>
                    </view>

                    <!-- 用户加载更多 -->
                    <view v-if="userLoadingMore" class="loading-state">
                        <view class="loading-spinner small"></view>
                        <text class="loading-text">加载中...</text>
                    </view>
                </scroll-view>
            </view>
            
            <!-- 加载更多提示（创作） -->
            <view 
                v-if="creationLoadingMore && activeFilter === 'creation' && creationList.length > 0" 
                class="loading-more"
            >
                <view class="loading-spinner small"></view>
                <text class="loading-more-text">正在加载更多...</text>
            </view>
        </view>
    </view>
</template>

<script>
import { getCreationsBySearch } from '@/request/creation.js';
import { searchUsers } from '@/request/user.js';
import { follow, unfollow, digg, cancelDigg } from '@/request/action.js';
import JSONbig from 'json-bigint';

export default {
    data() {
        return {
            keyword: '',

            // 创作搜索
            creationList: [],
            creationPage: 1,
            creationPageSize: 20,
            creationHasMore: true,
            creationLoading: false,
            creationLoadingMore: false,

            // 用户搜索
            userList: [],
            userPage: 1,
            userHasMore: true,
            userLoading: false,
            userLoadingMore: false,
            userRefreshing: false,

            activeFilter: 'creation',   // 'creation' | 'user'
            isPageAlive: true,

            autoFocus: false,

            defaultImage: '/static/images/default.png',
            defaultAvatar: '/static/user_avatar.png'
        };
    },
    async onLoad(options) {
        this.keyword = decodeURIComponent(options?.keyword || '');
        this.autoFocus = !this.keyword;

        if (this.keyword) {
            await this.searchCreations(true);
        }
    },
    onReachBottom() {
        if (!this.isPageAlive) return;
        if (this.activeFilter === 'creation') {
            this.loadMoreCreations();
        } else if (this.activeFilter === 'user') {
            this.loadMoreUsers();
        }
    },
    onPullDownRefresh() {
        if (!this.isPageAlive) return;
        let p;
        if (this.activeFilter === 'creation') {
            p = this.searchCreations(true);
        } else if (this.activeFilter === 'user') {
            p = this.searchUsers(true);
        }
        Promise.resolve(p).finally(() => {
            uni.stopPullDownRefresh();
        });
    },
    onUnload() {
        this.isPageAlive = false;
    },
    methods: {
        /* ========= 顶部交互 ========= */
        goBack() {
            uni.navigateBack();
        },
        clearKeyword() {
            this.keyword = '';
            this.creationList = [];
            this.userList = [];
        },
        onSearchConfirm() {
            const kw = this.keyword.trim();
            if (!kw) {
                uni.showToast({ title: '请输入搜索词', icon: 'none' });
                return;
            }
            if (this.activeFilter === 'creation') {
                this.searchCreations(true);
            } else if (this.activeFilter === 'user') {
                this.searchUsers(true);
            }
        },
        changeFilter(type) {
            if (this.activeFilter === type) return;
            this.activeFilter = type;
            const kw = this.keyword.trim();
            if (!kw) return;
            if (type === 'creation') {
                this.searchCreations(true);
            } else if (type === 'user') {
                this.searchUsers(true);
            }
        },

        /* ========= 创作搜索 ========= */
        async searchCreations(reset = false) {
            const kw = this.keyword.trim();
            if (!kw) {
                this.creationList = [];
                this.creationHasMore = false;
                return;
            }

            if (reset) {
                this.creationPage = 1;
                this.creationHasMore = true;
                this.creationList = [];
            }

            if (reset) {
                this.creationLoading = true;
            } else {
                this.creationLoadingMore = true;
            }

            const res = await getCreationsBySearch(kw, this.creationPage);
            const list = (res && res.creations) || [];
            const mapped = list.map(item => this.normalizeCreation(item));

            if (reset) {
                this.creationList = mapped;
            } else {
                this.creationList = this.creationList.concat(mapped);
            }

            // 简单判断是否还有更多
            if (!list.length || list.length < this.creationPageSize) {
                this.creationHasMore = false;
            }

            if (reset) {
                this.creationLoading = false;
            } else {
                this.creationLoadingMore = false;
            }
        },

        async loadMoreCreations() {
            if (!this.creationHasMore || this.creationLoading || this.creationLoadingMore) return;
            this.creationPage += 1;
            await this.searchCreations(false);
        },

		normalizeCreation(item) {
			const cover = item.cover_url || this.defaultImage;
			const avatar = item.avatar || this.defaultAvatar;
			return {
				creation_id: item.creation_id,
				// 新增：作者 ID（供跳转详情）
				user_id: item.user_id || item.userId || '',
				// 新增：素材类型（1-图片 / 2-视频）
				material_type: item.material_type || item.materialType || 1,
				cover,
				title: item.title || '未命名创作',
				username: item.username || '未知作者',
				avatar,
				digg_count: item.digg_count || 0,
				is_digg: !!item.is_digg,
				displayTime: this.formatCreationTime(item.create_time)
			};
		},
		goToCreationDetail(creation) {
			if (!creation || !creation.creation_id) return;

			const creationId = encodeURIComponent(creation.creation_id);
			const userId = encodeURIComponent(creation.user_id || '');

			// 1 = 图片，2 = 视频（你后端 Creation 里 materialType 也是这么约定的）
			const isVideo = Number(creation.material_type) === 2;

			const basePath = isVideo
				? '/pages/creation/creation_video'
				: '/pages/creation/creation_image';

			uni.navigateTo({
				url: `${basePath}?creationId=${creationId}&userId=${userId}`
			});
		},

        handleCreationImageError(creation) {
            if (creation) creation.cover = this.defaultImage;
        },

        /* ========= 点赞 / 取消点赞 ========= */
        async toggleDigg(creation, index) {
            if (!creation || creation._digging) return;
            creation._digging = true;

            try {
                if (creation.is_digg) {
                    // 取消点赞
                    await cancelDigg("creation",creation.creation_id);
                    this.creationList[index].is_digg = false;
                    if (this.creationList[index].digg_count > 0) {
                        this.creationList[index].digg_count -= 1;
                    }
                } else {
                    // 点赞
                    await digg("creation",creation.creation_id);
                    this.creationList[index].is_digg = true;
                    this.creationList[index].digg_count += 1;
                }
            } catch (err) {
                // 这里你也可以根据需要加 toast
                console.error('点赞操作失败:', err);
            } finally {
                creation._digging = false;
            }
        },

        /* ========= 用户搜索 ========= */
        async searchUsers(reset = false) {
            const kw = this.keyword.trim();
            if (!kw) {
                this.userList = [];
                this.userHasMore = false;
                return;
            }

            if (reset) {
                this.userPage = 1;
                this.userHasMore = true;
                this.userList = [];
            }

            if (reset) {
                this.userLoading = true;
            } else {
                this.userLoadingMore = true;
            }

            const data = await searchUsers(kw, this.userPage);
            const list = (data && data.user_infos) || [];

            const mapped = list.map(u => ({
                user_id: u.user_id,
                username: u.username,
                avatar: u.avatar && u.avatar !== '' ? u.avatar : this.defaultAvatar,
                bio: u.bio || '',
                is_following: !!u.is_following
            }));

            if (reset) {
                this.userList = mapped;
            } else {
                this.userList = this.userList.concat(mapped);
            }

            if (!list.length) {
                this.userHasMore = false;
            }

            if (reset) {
                this.userLoading = false;
            } else {
                this.userLoadingMore = false;
            }
        },

        async loadMoreUsers() {
            if (!this.userHasMore || this.userLoading || this.userLoadingMore) return;
            this.userPage += 1;
            await this.searchUsers(false);
        },

        async onUserRefresh() {
            this.userRefreshing = true;
            await this.searchUsers(true);
            this.userRefreshing = false;
        },

        goToUserPage(user) {
            uni.navigateTo({
                url: `/pages/user/user_profile?userId=${user.user_id}`
            });
        },

        /* ========= 关注 / 取关 ========= */
        async followUser(user) {
			let res = await follow(getApp().globalData.userId,user.user_id);
			if(res){
				user.is_following = true;
				uni.showToast({ title: '关注成功', icon: 'success' });
			}
        },

        confirmUnfollow(user) {
            uni.showModal({
                title: '提示',
                content: `确定取消关注 ${user.username} 吗？`,
                success: (res) => {
                    if (res.confirm) {
                        this.unfollowUser(user);
                    }
                }
            });
        },

        async unfollowUser(user) {
            let res = await unfollow(getApp().globalData.userId,user.user_id);
            if(res){
				user.is_following = false;
				uni.showToast({ title: '已取消关注', icon: 'success' });
            }
        },

        /* ========= 工具 ========= */
        formatCreationTime(msTimestamp) {
            if (!msTimestamp) return '';
            // 防御：后端如果给的是秒级时间戳，转成毫秒
            if (msTimestamp < 1e12) {
                msTimestamp = msTimestamp * 1000;
            }

            const now = new Date();
            const target = new Date(msTimestamp);
            const nowMs = now.getTime();
            const diffMs = nowMs - msTimestamp;
            const diffSec = Math.floor(diffMs / 1000);

            if (diffSec < 60) return '刚刚';
            if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`;

            const oneDayMs = 24 * 60 * 60 * 1000;
            const todayStart = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            ).getTime();

            const pad2 = n => (n < 10 ? '0' + n : '' + n);
            const hhmm = `${pad2(target.getHours())}:${pad2(target.getMinutes())}`;

            if (msTimestamp >= todayStart) return `今天 ${hhmm}`;
            if (msTimestamp >= todayStart - oneDayMs) return `昨天 ${hhmm}`;

            const diffDay = Math.floor(diffMs / oneDayMs);
            if (diffDay < 7) return `${diffDay}天前`;

            const year = target.getFullYear();
            const month = target.getMonth() + 1;
            const day = target.getDate();

            if (year !== now.getFullYear()) {
                return `${year}年${month}月${day}日`;
            }
            return `${month}月${day}日`;
        },

        formatNumber(num) {
            if (!num) return '0';
            if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num.toString();
        }
    }
};
</script>

<style scoped>
.container {
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    background: linear-gradient(to bottom, #f8f9fa 0%, #f5f5f7 100%);
    min-height: 100vh;
}

/* ==================== 搜索区域 ==================== */
.search-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 999;
    background: #fff;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.fixed-search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    box-sizing: border-box;
}

.back-button {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.back-icon {
    font-size: 24px;
    color: #333;
}

.search-input-container {
    flex: 1;
    display: flex;
    align-items: center;
    height: 36px;
    background: #f5f7fa;
    border-radius: 18px;
    padding: 0 14px;
    gap: 8px;
}

.search-icon {
    font-size: 16px;
    opacity: 0.6;
}

.search-input-container input {
    flex: 1;
    height: 100%;
    border: none;
    background: transparent;
    font-size: 14px;
    outline: none;
}

.clear-icon {
    width: 18px;
    height: 18px;
    background: #ddd;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #fff;
}

.search-button {
    height: 36px;
    padding: 0 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    flex-shrink: 0;
}

/* ==================== 筛选栏 ==================== */
.filter-bar {
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    display: flex;
    background: #fff;
    z-index: 998;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.filter-item {
    flex: 1;
    position: relative;
    text-align: center;
    padding: 12px 0;
    transition: all 0.3s;
}

.filter-item.disabled .filter-text {
    color: #ccc;
}

.filter-text {
    font-size: 14px;
    color: #666;
    font-weight: 400;
    transition: all 0.3s;
}

.filter-item.active .filter-text {
    color: #667eea;
    font-weight: 600;
}

.filter-indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    border-radius: 2px 2px 0 0;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        width: 0;
        opacity: 0;
    }
    to {
        width: 24px;
        opacity: 1;
    }
}

/* ==================== 搜索结果统计 ==================== */
.result-info {
    position: fixed;
    top: 100px;
    left: 0;
    right: 0;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid #f0f0f0;
    z-index: 997;
}

.result-text {
    font-size: 13px;
    color: #666;
}

.result-count {
    color: #667eea;
    font-weight: 600;
}

/* ==================== 创作列表 ==================== */
.creation-grid-container {
    padding: 136px 8px 12px;
    box-sizing: border-box;
}

.initial-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.loading-spinner.small {
    width: 20px;
    height: 20px;
    border-width: 2px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-text {
    margin-top: 16px;
    font-size: 14px;
    color: #999;
}

.creation-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.creation-card {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.3s;
}

.creation-card:active {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.image-wrapper {
    position: relative;
    width: 100%;
    height: 240px;
    overflow: hidden;
}

.card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.image-gradient {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
}

.card-content {
    padding: 10px;
}

.card-title-container {
    margin-bottom: 8px;
}

.card-title {
    font-size: 13px;
    font-weight: 500;
    color: #333;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
}

.card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.card-author {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
}

.author-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid #f0f0f0;
    object-fit: cover;
    flex-shrink: 0;
}

.author-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.author-name {
    font-size: 11px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.card-time {
    font-size: 10px;
    color: #999;
}

/* 点赞区域 */
.card-likes {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
}

.like-icon {
    font-size: 14px;
    transition: transform 0.15s ease;
}

.like-icon.active {
    transform: scale(1.15);
}

.like-count {
    font-size: 11px;
    color: #999;
}

/* ==================== 用户列表（参考粉丝列表） ==================== */
.user-list-scroll {
    height: calc(100vh - 136px);
}

.user-list {
    padding: 8px 0;
}

.user-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #fff;
    margin-bottom: 1px;
}

.user-left {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    overflow: hidden;
}

.avatar-wrapper {
    flex-shrink: 0;
}

.avatar {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    border: 2px solid #f0f0f0;
}

.user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
}

.user-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.user-name {
    font-size: 15px;
    font-weight: 600;
    color: #333;
}

.user-bio {
    font-size: 13px;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.user-bio.placeholder {
    color: #999;
}

.user-right {
    flex-shrink: 0;
    margin-left: 8px;
}

.follow-btn,
.following-btn {
    padding: 6px 16px;
    border-radius: 16px;
    transition: all 0.3s;
}

.follow-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.follow-btn:active {
    transform: scale(0.95);
    box-shadow: 0 1px 4px rgba(102, 126, 234, 0.3);
}

.follow-btn .btn-text {
    color: #fff;
}

.following-btn {
    background: #f0f0f0;
}

.following-btn:active {
    background: #e0e0e0;
    transform: scale(0.95);
}

.following-btn .btn-text {
    color: #666;
}

.btn-text {
    font-size: 13px;
    font-weight: 500;
}

/* 空状态 & 加载更多共用 */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 100px 0;
}

.empty-icon {
    font-size: 80px;
    margin-bottom: 16px;
}

.empty-text {
    font-size: 16px;
    color: #666;
    margin-bottom: 8px;
}

.empty-hint {
    font-size: 13px;
    color: #999;
    text-align: center;
}

.loading-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px 0;
}

.loading-more-text {
    font-size: 13px;
    color: #999;
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0;
}
</style>
