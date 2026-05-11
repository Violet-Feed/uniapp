<template>
    <view class="container" v-if="isPageAlive">
        <!-- 顶部固定安全栏：遮住状态栏 / 刘海区域 -->
        <view class="safe-status-bar" :style="safeStatusBarStyle"></view>

        <!-- 搜索栏 -->
        <view class="search-wrapper" :style="searchWrapperStyle">
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
                        :focus="autoFocus"
                        @confirm="onSearchConfirm"
                    />
                    <text v-if="keyword" class="clear-icon" @click.stop="clearKeyword">✕</text>
                </view>

                <view class="search-button" @click="onSearchConfirm">
                    <text>搜索</text>
                </view>
            </view>
        </view>

        <!-- 筛选栏：只保留创作 / 用户 -->
        <view class="filter-bar" :style="filterBarStyle">
            <view
                class="filter-item"
                :class="{ active: activeFilter === 'creation' }"
                @click="changeFilter('creation')"
            >
                <text class="filter-text">创作</text>
                <view v-if="activeFilter === 'creation'" class="filter-indicator"></view>
            </view>

            <view
                class="filter-item"
                :class="{ active: activeFilter === 'user' }"
                @click="changeFilter('user')"
            >
                <text class="filter-text">用户</text>
                <view v-if="activeFilter === 'user'" class="filter-indicator"></view>
            </view>
        </view>

        <!-- 内容区域 -->
        <view class="content-container" :style="contentContainerStyle">
            <!-- 创作搜索结果 -->
            <view v-if="activeFilter === 'creation'">
                <view v-if="creationLoading && creationList.length === 0" class="initial-loading">
                    <view class="loading-spinner"></view>
                    <text class="loading-text">搜索中...</text>
                </view>

                <view v-else-if="creationList.length > 0" class="creation-grid">
                    <view
                        v-for="(creation, index) in creationList"
                        :key="'creation-' + creation.creation_id + '-' + index"
                        class="creation-card"
                        :style="cardStyle"
                        @click="goToCreationDetail(creation)"
                    >
                        <view class="image-wrapper" :style="imageWrapperStyle">
                            <image
                                class="card-image"
                                :src="creation.cover"
                                mode="aspectFill"
                                lazy-load
                                @error="handleCreationImageError(creation)"
                            ></image>

                            <view v-if="Number(creation.material_type) === 2" class="video-badge">
                                <text class="video-badge-icon">▶</text>
                            </view>
                        </view>

                        <view class="card-content" :style="cardContentStyle">
                            <view class="card-title-container">
                                <text class="card-title">{{ creation.title }}</text>
                            </view>

                            <view class="card-footer">
                                <view class="card-author">
                                    <image
                                        class="author-avatar"
                                        :src="creation.avatar"
                                        mode="aspectFill"
                                        lazy-load
                                    ></image>
                                    <text class="author-name">{{ creation.username }}</text>
                                </view>

                                <view class="card-likes" @click.stop="toggleDigg(creation, index)">
                                    <text class="like-icon" :class="{ active: creation.is_digg }">
                                        {{ creation.is_digg ? '♥️' : '♡' }}
                                    </text>
                                    <text class="like-count">{{ formatNumber(creation.digg_count) }}</text>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>

                <view v-else class="empty-state">
                    <text class="empty-icon">🔍</text>
                    <text class="empty-text">没有找到相关创作</text>
                    <text class="empty-hint">试试其他关键词吧</text>
                </view>

                <view v-if="creationLoadingMore && creationList.length > 0" class="loading-more">
                    <view class="loading-spinner small"></view>
                    <text class="loading-more-text">正在加载更多...</text>
                </view>
            </view>

            <!-- 用户搜索结果：一屏约 8 个 -->
            <view v-else>
                <view v-if="userLoading && userList.length === 0" class="initial-loading">
                    <view class="loading-spinner"></view>
                    <text class="loading-text">搜索中...</text>
                </view>

                <scroll-view
                    v-else
                    class="user-list-scroll"
                    :style="userListScrollStyle"
                    scroll-y="true"
                    refresher-enabled="true"
                    :refresher-triggered="userRefreshing"
                    @scrolltolower="loadMoreUsers"
                    @refresherrefresh="onUserRefresh"
                >
                    <view v-if="userList.length > 0" class="user-list">
                        <view
                            v-for="(user, index) in userList"
                            :key="'user-' + user.user_id + '-' + index"
                            class="user-item"
                            :style="userItemStyle"
                        >
                            <view class="user-left" @click="goToUserPage(user)">
                                <image class="avatar" :src="user.avatar" mode="aspectFill"></image>
                                <view class="user-info">
                                    <text class="user-name">{{ user.username }}</text>
                                    <text class="user-fans">粉丝：{{ formatFans(user.follower_count) }}</text>
                                </view>
                            </view>

                            <view v-if="!isSelf(user)" class="user-right">
                                <view :class="followBtnClass(user)" @click.stop="onFollowBtnClick(user)">
                                    <text class="btn-text">{{ followBtnText(user) }}</text>
                                </view>
                            </view>
                        </view>
                    </view>

                    <view v-else class="empty-state">
                        <text class="empty-icon">👤</text>
                        <text class="empty-text">没有找到相关用户</text>
                        <text class="empty-hint">试试换个昵称或关键词</text>
                    </view>

                    <view v-if="userLoadingMore" class="loading-state">
                        <view class="loading-spinner small"></view>
                        <text class="loading-text">加载中...</text>
                    </view>
                </scroll-view>
            </view>
        </view>
    </view>
</template>

<script>
import { getCreationsBySearch } from '@/request/creation.js'
import { searchUsers } from '@/request/user.js'
import { follow, unfollow, digg, cancelDigg } from '@/request/action.js'

const SEARCH_AREA_HEIGHT = 50
const FILTER_BAR_HEIGHT = 40
const CONTENT_TOP_HEIGHT = SEARCH_AREA_HEIGHT + FILTER_BAR_HEIGHT
const CONTENT_BOTTOM_PADDING = 10
const GRID_ROW_GAP = 6
const USER_LIST_PADDING_Y = 6

const MIN_CARD_HEIGHT = 220
const MIN_CARD_CONTENT_HEIGHT = 40
const MAX_CARD_CONTENT_HEIGHT = 52
const MIN_IMAGE_HEIGHT = 150
const MIN_USER_ITEM_HEIGHT = 58

export default {
    data() {
        return {
            keyword: '',
            autoFocus: false,
            activeFilter: 'creation',
            isPageAlive: true,

            statusBarHeight: 0,

            creationList: [],
            creationPage: 1,
            creationPageSize: 20,
            creationHasMore: true,
            creationLoading: false,
            creationLoadingMore: false,

            userList: [],
            userPage: 1,
            userHasMore: true,
            userLoading: false,
            userLoadingMore: false,
            userRefreshing: false,

            defaultImage: '/static/images/default.png',
            defaultAvatar: '/static/user_avatar.png',

            cardHeight: 260,
            imageHeight: 216,
            cardContentHeight: 44,
            userListHeight: 500,
            userItemHeight: 68
        }
    },

    computed: {
        safeStatusBarStyle() {
            return 'height:' + this.statusBarHeight + 'px;'
        },

        searchWrapperStyle() {
            return 'top:' + this.statusBarHeight + 'px;'
        },

        filterBarStyle() {
            return 'top:' + (this.statusBarHeight + SEARCH_AREA_HEIGHT) + 'px;'
        },

        contentContainerStyle() {
            return (
                'padding-top:' + (this.statusBarHeight + CONTENT_TOP_HEIGHT + 6) + 'px;' +
                'padding-left:6px;' +
                'padding-right:6px;' +
                'padding-bottom:10px;'
            )
        },

        cardStyle() {
            return 'height:' + this.cardHeight + 'px;'
        },

        imageWrapperStyle() {
            return 'height:' + this.imageHeight + 'px;'
        },

        cardContentStyle() {
            return 'height:' + this.cardContentHeight + 'px;'
        },

        userListScrollStyle() {
            return 'height:' + this.userListHeight + 'px;'
        },

        userItemStyle() {
            return 'height:' + this.userItemHeight + 'px;'
        }
    },

    async onLoad(options) {
        this.initResponsiveLayout()

        const rawKeyword = options && options.keyword ? options.keyword : ''
        this.keyword = decodeURIComponent(rawKeyword)
        this.autoFocus = !this.keyword

        if (this.keyword) {
            await this.searchCreations(true)
        }
    },

    onShow() {
        this.initResponsiveLayout()
    },

    onReachBottom() {
        if (!this.isPageAlive) return

        if (this.activeFilter === 'creation') {
            this.loadMoreCreations()
        } else if (this.activeFilter === 'user') {
            this.loadMoreUsers()
        }
    },

    onPullDownRefresh() {
        if (!this.isPageAlive) {
            uni.stopPullDownRefresh()
            return
        }

        let task = null
        if (this.activeFilter === 'creation') {
            task = this.searchCreations(true)
        } else if (this.activeFilter === 'user') {
            task = this.searchUsers(true)
        }

        Promise.resolve(task).finally(() => {
            uni.stopPullDownRefresh()
        })
    },

    onUnload() {
        this.isPageAlive = false
    },

    methods: {
        initResponsiveLayout() {
            try {
                const systemInfo = uni.getSystemInfoSync()
                const windowHeight = Number(systemInfo.windowHeight || 667)
                this.statusBarHeight = Number(systemInfo.statusBarHeight || 0)

                const availableHeight =
                    windowHeight -
                    this.statusBarHeight -
                    CONTENT_TOP_HEIGHT -
                    CONTENT_BOTTOM_PADDING

                const nextCardHeight = Math.floor((availableHeight - GRID_ROW_GAP * 2) / 2.5)
                this.cardHeight = Math.max(MIN_CARD_HEIGHT, nextCardHeight)

                const nextContentHeight = Math.floor(this.cardHeight / 6)
                this.cardContentHeight = Math.max(
                    MIN_CARD_CONTENT_HEIGHT,
                    Math.min(MAX_CARD_CONTENT_HEIGHT, nextContentHeight)
                )
                this.imageHeight = Math.max(MIN_IMAGE_HEIGHT, this.cardHeight - this.cardContentHeight)

                this.userListHeight = Math.max(
                    320,
                    windowHeight - this.statusBarHeight - CONTENT_TOP_HEIGHT - CONTENT_BOTTOM_PADDING
                )

                this.userItemHeight = Math.max(
                    MIN_USER_ITEM_HEIGHT,
                    Math.floor((this.userListHeight - USER_LIST_PADDING_Y * 2) / 8)
                )
            } catch (err) {
                this.statusBarHeight = 0
                this.cardHeight = 260
                this.cardContentHeight = 44
                this.imageHeight = 216
                this.userListHeight = 500
                this.userItemHeight = 68
            }
        },

        goBack() {
            uni.navigateBack()
        },

        clearKeyword() {
            this.keyword = ''
            this.creationList = []
            this.userList = []
            this.creationHasMore = false
            this.userHasMore = false
        },

        onSearchConfirm() {
            const kw = this.keyword.trim()
            if (!kw) {
                uni.showToast({ title: '请输入搜索词', icon: 'none' })
                return
            }

            if (this.activeFilter === 'creation') {
                this.searchCreations(true)
            } else {
                this.searchUsers(true)
            }
        },

        changeFilter(type) {
            if (this.activeFilter === type) return

            this.activeFilter = type
            const kw = this.keyword.trim()
            if (!kw) return

            if (type === 'creation') {
                this.searchCreations(true)
            } else {
                this.searchUsers(true)
            }
        },

        async searchCreations(reset) {
            const kw = this.keyword.trim()
            if (!kw) {
                this.creationList = []
                this.creationHasMore = false
                return
            }

            if (this.creationLoading || this.creationLoadingMore) return

            if (reset) {
                this.creationPage = 1
                this.creationHasMore = true
                this.creationList = []
                this.creationLoading = true
            } else {
                this.creationLoadingMore = true
            }

            try {
                const res = await getCreationsBySearch(kw, this.creationPage)
                const list = res && res.creations ? res.creations : []
                const mapped = list.map(item => this.normalizeCreation(item))

                if (reset) {
                    this.creationList = mapped
                } else {
                    this.creationList = this.creationList.concat(mapped)
                }

                this.creationHasMore = list.length >= this.creationPageSize
            } catch (err) {
                console.error('搜索创作失败:', err)
                uni.showToast({ title: '搜索失败', icon: 'none' })
            } finally {
                this.creationLoading = false
                this.creationLoadingMore = false
            }
        },

        async loadMoreCreations() {
            if (!this.creationHasMore || this.creationLoading || this.creationLoadingMore) return
            this.creationPage += 1
            await this.searchCreations(false)
        },

        normalizeCreation(item) {
            const materialType = Number(item.material_type || item.materialType || 1)
            const cover = item.cover_url || item.material_url || this.defaultImage
            const avatar = item.avatar || item.author_avatar || this.defaultAvatar

            return {
                creation_id: item.creation_id,
                user_id: item.user_id || item.userId || '',
                material_type: materialType,
                cover: cover,
                title: item.title || '未命名创作',
                username: item.username || item.author_name || '未知作者',
                avatar: avatar,
                digg_count: item.digg_count || 0,
                is_digg: !!item.is_digg
            }
        },

        handleCreationImageError(creation) {
            if (creation) {
                creation.cover = this.defaultImage
            }
        },

        goToCreationDetail(creation) {
            if (!creation || !creation.creation_id) return

            const creationId = encodeURIComponent(creation.creation_id)
            const userId = encodeURIComponent(creation.user_id || '')
            const isVideo = Number(creation.material_type) === 2
            const basePath = isVideo ? '/pages/creation/creation_video' : '/pages/creation/creation_image'

            uni.navigateTo({
                url: basePath + '?creationId=' + creationId + '&userId=' + userId
            })
        },

        async toggleDigg(creation, index) {
            if (!creation || creation._digging) return

            creation._digging = true
            try {
                if (creation.is_digg) {
                    await cancelDigg('creation', creation.creation_id)
                    this.creationList[index].is_digg = false
                    if (this.creationList[index].digg_count > 0) {
                        this.creationList[index].digg_count -= 1
                    }
                } else {
                    await digg('creation', creation.creation_id)
                    this.creationList[index].is_digg = true
                    this.creationList[index].digg_count += 1
                }
            } catch (err) {
                console.error('点赞操作失败:', err)
                uni.showToast({ title: '操作失败', icon: 'none' })
            } finally {
                creation._digging = false
            }
        },

        async searchUsers(reset) {
            const kw = this.keyword.trim()
            if (!kw) {
                this.userList = []
                this.userHasMore = false
                return
            }

            if (this.userLoading || this.userLoadingMore) return

            if (reset) {
                this.userPage = 1
                this.userHasMore = true
                this.userList = []
                this.userLoading = true
            } else {
                this.userLoadingMore = true
            }

            try {
                const data = await searchUsers(kw, this.userPage)
                const list = data && data.user_infos ? data.user_infos : []
                const mapped = list.map(user => this.normalizeUser(user))

                if (reset) {
                    this.userList = mapped
                } else {
                    this.userList = this.userList.concat(mapped)
                }

                this.userHasMore = list.length > 0
            } catch (err) {
                console.error('搜索用户失败:', err)
                uni.showToast({ title: '搜索失败', icon: 'none' })
            } finally {
                this.userLoading = false
                this.userLoadingMore = false
            }
        },

        normalizeUser(user) {
            return {
                user_id: String(user.user_id || user.userId || ''),
                username: user.username || '未知用户',
                avatar: user.avatar && user.avatar !== '' ? user.avatar : this.defaultAvatar,
                follower_count: Number(user.follower_count || user.followerCount || 0),
                is_following: this.toBool(user.is_following || user.isFollowing),
                is_follower: this.toBool(user.is_follower || user.isFollower)
            }
        },

        async loadMoreUsers() {
            if (!this.userHasMore || this.userLoading || this.userLoadingMore) return
            this.userPage += 1
            await this.searchUsers(false)
        },

        async onUserRefresh() {
            this.userRefreshing = true
            await this.searchUsers(true)
            this.userRefreshing = false
        },

        isSelf(user) {
            const app = getApp()
            const me = app && app.globalData ? String(app.globalData.userId || '') : ''
            return String(user && user.user_id ? user.user_id : '') === me
        },

        goToUserPage(user) {
            if (!user) return

            if (this.isSelf(user)) {
                uni.navigateTo({ url: '/pages/user/my_profile_copy' })
                return
            }

            uni.navigateTo({
                url: '/pages/user/user_profile?userId=' + encodeURIComponent(String(user.user_id || ''))
            })
        },

        toBool(value) {
            if (value === true) return true
            if (value === false) return false
            if (value === 1 || value === '1') return true
            if (value === 0 || value === '0') return false
            return !!value
        },

        followBtnText(user) {
            const following = this.toBool(user.is_following)
            const follower = this.toBool(user.is_follower)

            if (following && follower) return '互相关注'
            if (following && !follower) return '已关注'
            if (!following && follower) return '+ 回关'
            return '+ 关注'
        },

        followBtnClass(user) {
            return this.toBool(user.is_following) ? 'following-btn' : 'follow-btn'
        },

        async onFollowBtnClick(user) {
            if (!user) return

            if (this.toBool(user.is_following)) {
                this.confirmUnfollow(user)
                return
            }

            await this.followUser(user)
        },

        async followUser(user) {
            const app = getApp()
            const userId = app && app.globalData ? app.globalData.userId : ''
            const ok = await follow(userId, user.user_id)

            if (ok) {
                user.is_following = true
                uni.showToast({ title: '关注成功', icon: 'success' })
            }
        },

        confirmUnfollow(user) {
            uni.showModal({
                title: '提示',
                content: '确定取消关注 ' + user.username + ' 吗？',
                success: res => {
                    if (res.confirm) {
                        this.unfollowUser(user)
                    }
                }
            })
        },

        async unfollowUser(user) {
            const app = getApp()
            const userId = app && app.globalData ? app.globalData.userId : ''
            const ok = await unfollow(userId, user.user_id)

            if (ok) {
                user.is_following = false
                uni.showToast({ title: '已取消关注', icon: 'success' })
            }
        },

        formatFans(value) {
            const num = Number(value || 0)
            if (num >= 10000) return (num / 10000).toFixed(1) + '万'
            return String(num)
        },

        formatNumber(value) {
            const num = Number(value || 0)
            if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
            return String(num)
        }
    }
}
</script>

<style scoped>
.container {
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    background: linear-gradient(to bottom, #f8f9fa 0%, #f5f5f7 100%);
    min-height: 100vh;
}

.safe-status-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: #ffffff;
}

.search-wrapper {
    position: fixed;
    left: 0;
    right: 0;
    z-index: 999;
    background: #fff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.fixed-search-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 50px;
    padding: 8px 10px;
    box-sizing: border-box;
}

.back-button {
    width: 32px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.back-icon {
    font-size: 23px;
    color: #333;
}

.search-input-container {
    flex: 1;
    display: flex;
    align-items: center;
    height: 34px;
    background: #f5f7fa;
    border-radius: 17px;
    padding: 0 12px;
    gap: 6px;
    box-sizing: border-box;
}

.search-icon {
    font-size: 15px;
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
    height: 34px;
    padding: 0 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 17px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 3px 10px rgba(102, 126, 234, 0.26);
    flex-shrink: 0;
}

.filter-bar {
    position: fixed;
    left: 0;
    right: 0;
    height: 40px;
    display: flex;
    background: #fff;
    z-index: 998;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.035);
}

.filter-item {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.filter-text {
    font-size: 14px;
    color: #666;
    font-weight: 400;
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
}

.content-container {
    padding: 0 6px 10px;
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
    to {
        transform: rotate(360deg);
    }
}

.loading-text {
    margin-top: 16px;
    font-size: 14px;
    color: #999;
}

.creation-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.creation-card {
    width: calc((100% - 6px) / 2);
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.055);
    transition: all 0.24s;
}

.creation-card:active {
    transform: translateY(-1px);
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
}

.image-wrapper {
    position: relative;
    width: 100%;
    overflow: hidden;
    background: #f3f3f3;
}

.card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.video-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 20px;
    height: 20px;
    background: rgba(0, 0, 0, 0.42);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.video-badge-icon {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.94);
    line-height: 1;
    margin-left: 1px;
}

.card-content {
    padding: 4px 6px;
    box-sizing: border-box;
}

.card-title-container {
    height: 16px;
    margin-bottom: 2px;
}

.card-title {
    font-size: 11px;
    font-weight: 500;
    color: #333;
    line-height: 16px;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 16px;
}

.card-author {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
}

.author-avatar {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid #f0f0f0;
    object-fit: cover;
    flex-shrink: 0;
}

.author-name {
    font-size: 10px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.card-likes {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    padding-left: 4px;
}

.like-icon {
    font-size: 10px;
    transition: transform 0.15s ease;
}

.like-icon.active {
    transform: scale(1.12);
}

.like-count {
    font-size: 10px;
    color: #999;
}

.user-list-scroll {
    box-sizing: border-box;
}

.user-list {
    padding: 6px 0;
}

.user-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    background: #fff;
    margin-bottom: 1px;
    box-sizing: border-box;
}

.user-left {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    overflow: hidden;
}

.avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid #f0f0f0;
    flex-shrink: 0;
}

.user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
}

.user-name {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-fans {
    font-size: 11px;
    color: #888;
    line-height: 1.2;
}

.user-right {
    flex-shrink: 0;
    margin-left: 8px;
}

.follow-btn,
.following-btn {
    padding: 5px 14px;
    border-radius: 15px;
}

.follow-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.26);
}

.following-btn {
    background: #f0f0f0;
}

.follow-btn .btn-text {
    color: #fff;
}

.following-btn .btn-text {
    color: #666;
}

.btn-text {
    font-size: 12px;
    font-weight: 500;
}

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
    padding: 18px 0;
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