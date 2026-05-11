<template>
    <view class="container">
        <!-- 顶部固定安全栏：遮住状态栏 / 刘海区域 -->
        <view class="safe-status-bar" :style="safeStatusBarStyle"></view>

        <!-- 双列创作列表 -->
        <view class="creation-grid-container" :style="creationGridContainerStyle">
            <view v-if="loading && creations.length === 0" class="initial-loading">
                <view class="loading-spinner"></view>
                <text class="loading-text">精彩内容加载中...</text>
            </view>

            <view class="creation-grid" v-else-if="creations.length > 0">
                <view
                    class="creation-card"
                    v-for="(creation, index) in creations"
                    :key="'creation-' + creation.creation_id + '-' + index"
                    :style="cardStyle"
                    @click="goToCreationDetail(creation)"
                >
                    <view class="image-wrapper" :style="imageWrapperStyle">
                        <image
                            class="card-image"
                            :src="creation.image || defaultImage"
                            mode="aspectFill"
                            @error="handleImageError(creation)"
                            lazy-load
                        ></image>

                        <view class="video-badge" v-if="isVideoCreation(creation)">
                            <text class="video-badge-icon">▶</text>
                        </view>
                    </view>

                    <view class="card-content" :style="cardContentStyle">
                        <view class="card-title-container">
                            <text class="card-title">{{ creation.title || '未命名作品' }}</text>
                        </view>

                        <view class="card-footer">
                            <view class="card-author">
                                <image
                                    class="author-avatar"
                                    :src="creation.author.avatar || defaultAvatar"
                                    mode="aspectFill"
                                    lazy-load
                                ></image>
                                <text class="author-name">{{ creation.author.name || '未知作者' }}</text>
                            </view>

                            <view class="card-likes" @click.stop="toggleDigg(creation, index)">
                                <text class="like-icon" :class="{ liked: creation.is_digg }">
                                    {{ creation.is_digg ? '♥' : '♡' }}
                                </text>
                                <text class="like-count">{{ formatNumber(creation.likes) }}</text>
                            </view>
                        </view>
                    </view>
                </view>
            </view>

            <view v-else class="empty-state">
                <text class="empty-icon">🎨</text>
                <text class="empty-text">暂无创作内容</text>
                <text class="empty-hint">快去创作第一个作品吧！</text>
            </view>

            <view v-if="loading && creations.length > 0" class="loading-more">
                <view class="loading-spinner small"></view>
                <text class="loading-more-text">正在加载更多...</text>
            </view>
        </view>
		<custom-tabbar active-path="pages/creation/friend" />
    </view>
</template>

<script>
import { getCreationsByFriend } from '@/request/creation.js'
import { digg, cancelDigg } from '@/request/action.js'

const PAGE_VERTICAL_PADDING = 20
const GRID_ROW_GAP = 6
const MIN_CARD_HEIGHT = 220
const MIN_CARD_CONTENT_HEIGHT = 40
const MAX_CARD_CONTENT_HEIGHT = 52
const MIN_IMAGE_HEIGHT = 150

export default {
    data() {
        return {
            creations: [],
            loading: false,
            currentPage: 1,
            hasMore: true,

            statusBarHeight: 0,

            defaultImage: '/static/images/default.png',
            defaultAvatar: '/static/user_avatar.png',

            cardHeight: 260,
            imageHeight: 216,
            cardContentHeight: 44
        }
    },

    computed: {
        safeStatusBarStyle() {
            return 'height:' + this.statusBarHeight + 'px;'
        },

        creationGridContainerStyle() {
            return (
                'padding-top:' + (this.statusBarHeight + 10) + 'px;' +
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
        }
    },

    onLoad() {
        this.initCardLayout()
        this.loadInitialData()
    },

    onShow() {
        this.initCardLayout()
    },

    onReachBottom() {
        if (!this.loading && this.hasMore) {
            this.loadMore()
        }
    },

    onPullDownRefresh() {
        this.loadInitialData().finally(() => {
            uni.stopPullDownRefresh()
        })
    },

    methods: {
        initCardLayout() {
            try {
                const systemInfo = uni.getSystemInfoSync()
                const windowHeight = Number(systemInfo.windowHeight || 667)
                this.statusBarHeight = Number(systemInfo.statusBarHeight || 0)

                const availableHeight =
                    windowHeight -
                    this.statusBarHeight -
                    PAGE_VERTICAL_PADDING

                const nextCardHeight = Math.floor((availableHeight - GRID_ROW_GAP * 2) / 2.5)

                this.cardHeight = Math.max(MIN_CARD_HEIGHT, nextCardHeight)

                const nextContentHeight = Math.floor(this.cardHeight / 6)
                this.cardContentHeight = Math.max(
                    MIN_CARD_CONTENT_HEIGHT,
                    Math.min(MAX_CARD_CONTENT_HEIGHT, nextContentHeight)
                )
                this.imageHeight = Math.max(MIN_IMAGE_HEIGHT, this.cardHeight - this.cardContentHeight)
            } catch (err) {
                this.statusBarHeight = 0
                this.cardHeight = 260
                this.cardContentHeight = 44
                this.imageHeight = 216
            }
        },

        async loadInitialData() {
            this.loading = true
            this.currentPage = 1
            this.hasMore = true

            try {
                const list = await this.fetchPage(this.currentPage)
                this.creations = list
                if (!list.length) this.hasMore = false
            } catch (err) {
                console.error('初始数据加载失败：', err)
                uni.showToast({ title: '加载失败，请重试', icon: 'none' })
            } finally {
                this.loading = false
            }
        },

        async loadMore() {
            if (!this.hasMore) return

            this.loading = true
            const nextPage = this.currentPage + 1

            try {
                const list = await this.fetchPage(nextPage)
                if (!list.length) {
                    this.hasMore = false
                } else {
                    this.creations = this.creations.concat(list)
                    this.currentPage = nextPage
                }
            } catch (err) {
                console.error('加载更多失败：', err)
                uni.showToast({ title: '加载更多失败', icon: 'none' })
            } finally {
                this.loading = false
            }
        },

        async fetchPage(page) {
            const res = await getCreationsByFriend(page)
            const rawList = res && Array.isArray(res.creations) ? res.creations : []
            if (!rawList.length) return []

            return rawList.map(item => {
                const materialType = Number(item.material_type || item.materialType || 1)

                return {
                    creation_id: item.creation_id,
                    user_id: item.user_id || item.userId || '',
                    material_type: materialType,
                    image: item.cover_url || item.material_url || this.defaultImage,
                    title: item.title || '未命名作品',
                    type: materialType === 2 ? 'video' : 'image',
                    likes: item.digg_count || 0,
                    is_digg: !!item.is_digg,
                    author: {
                        avatar: item.avatar || this.defaultAvatar,
                        name: item.username || '未知作者'
                    },
                    raw: item
                }
            })
        },

        handleImageError(creation) {
            if (creation) {
                creation.image = this.defaultImage
            }
        },

        isVideoCreation(creation) {
            if (!creation) return false
            return creation.type === 'video' || Number(creation.material_type) === 2
        },

        goToCreationDetail(creation) {
            if (!creation || !creation.creation_id) return

            const creationId = encodeURIComponent(creation.creation_id)
            const userId = encodeURIComponent(creation.user_id || '')
            const basePath = this.isVideoCreation(creation)
                ? '/pages/creation/creation_video'
                : '/pages/creation/creation_image'

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
                    this.creations[index].is_digg = false
                    if (this.creations[index].likes > 0) {
                        this.creations[index].likes -= 1
                    }
                } else {
                    await digg('creation', creation.creation_id)
                    this.creations[index].is_digg = true
                    this.creations[index].likes += 1
                }
            } catch (err) {
                console.error('点赞操作失败:', err)
                uni.showToast({
                    title: '操作失败，请稍后重试',
                    icon: 'none'
                })
            } finally {
                creation._digging = false
            }
        },

        formatNumber(num) {
            const n = Number(num || 0)
            if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
            if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
            return n.toString()
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

.creation-grid-container {
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
    line-height: 1;
    color: #999;
}

.like-icon.liked {
    color: #e74c3c;
}

.like-count {
    font-size: 10px;
    color: #999;
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
</style>