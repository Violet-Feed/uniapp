<template>
    <view class="container">
        <!-- 顶部固定安全栏：遮住状态栏 / 刘海区域 -->
        <view class="safe-status-bar" :style="safeStatusBarStyle"></view>

        <!-- 搜索区域 -->
        <view class="search-wrapper" :style="searchWrapperStyle">
            <view class="fixed-search-bar">
                <view class="search-input-container">
                    <text class="search-icon">🔍</text>
                    <input
                        v-model="keyword"
                        type="text"
                        placeholder="搜索你感兴趣的创作..."
                        @confirm="goToSearchPage"
                    />
                    <text v-if="keyword" class="clear-icon" @click.stop="clearKeyword">✕</text>
                </view>
                <view class="search-button" @click="goToSearchPage">
                    <text>搜索</text>
                </view>
            </view>
        </view>

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

                        <view class="video-badge" v-if="creation.type === 'video'">
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
                                    :src="creation.author.avatar || defaultAvatar"
                                    mode="aspectFill"
                                    lazy-load
                                ></image>
                                <text class="author-name">{{ creation.author.name || '未知作者' }}</text>
                            </view>
                            <view class="card-likes" @click.stop="toggleDigg(index)">
                                <text class="like-icon">
                                    {{ creation.is_digg ? '♥️' : '♡' }}
                                </text>
                                <text class="like-count">
                                    {{ formatNumber(creation.likes) }}
                                </text>
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
                <text class="loading-more-text">
                    {{ hasMore ? '正在加载更多...' : '没有更多了' }}
                </text>
            </view>
        </view>
		<custom-tabbar active-path="pages/creation/home" />
    </view>
</template>

<script>
import { getCreationsByRec } from '@/request/creation.js'
import { digg, cancelDigg } from '@/request/action.js'

const SEARCH_AREA_HEIGHT = 58
const GRID_BOTTOM_PADDING = 10
const GRID_ROW_GAP = 6
const MIN_CARD_HEIGHT = 220
const MIN_CARD_CONTENT_HEIGHT = 40
const MAX_CARD_CONTENT_HEIGHT = 52
const MIN_IMAGE_HEIGHT = 150

export default {
    data() {
        return {
            keyword: '',
            creations: [],
            loading: false,
            currentPage: 1,
            hasMore: true,
            isRefreshing: false,

            statusBarHeight: 0,

            defaultImage: '/static/images/default.png',
            defaultAvatar: '/static/user_avatar.png',

            cardHeight: 260,
            imageHeight: 196,
            cardContentHeight: 44
        }
    },

    computed: {
        safeStatusBarStyle() {
            return 'height:' + this.statusBarHeight + 'px;'
        },

        searchWrapperStyle() {
            return 'top:' + this.statusBarHeight + 'px;'
        },

        creationGridContainerStyle() {
            return (
                'padding-top:' + (this.statusBarHeight + SEARCH_AREA_HEIGHT) + 'px;' +
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
        this.fetchCreations(1, false)
    },

    onShow() {
        this.initCardLayout()
    },

    onPullDownRefresh() {
        this.refreshList()
    },

    onReachBottom() {
        if (!this.loading && this.hasMore) {
            this.loadMore()
        }
    },

    methods: {
        initCardLayout() {
            try {
                const sys = uni.getSystemInfoSync()
                const windowHeight = Number(sys.windowHeight || 667)
                this.statusBarHeight = Number(sys.statusBarHeight || 0)

                const availableHeight =
                    windowHeight -
                    this.statusBarHeight -
                    SEARCH_AREA_HEIGHT -
                    GRID_BOTTOM_PADDING

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

        async fetchCreations(page = 1, append = false) {
            if (this.loading) return
            this.loading = true

            try {
                const res = await getCreationsByRec(getApp().globalData.userId)

                const list = Array.isArray(res)
                    ? res
                    : (res && (res.creations || res.list))
                        ? (res.creations || res.list)
                        : []

                const mapped = list.map(item => {
                    const materialType = Number(item.material_type)
                    const isVideo = materialType === 2

                    return {
                        creation_id: item.creation_id,
                        user_id: item.user_id,
                        image: item.cover_url || item.material_url || this.defaultImage,
                        title: item.title || '未命名作品',
                        author: {
                            avatar: item.avatar || item.author_avatar || this.defaultAvatar,
                            name: item.username || item.author_name || '未知作者',
                            user_id: item.user_id
                        },
                        type: isVideo ? 'video' : 'image',
                        material_type: materialType,
                        likes: item.digg_count || item.like_count || 0,
                        is_digg: !!item.is_digg
                    }
                })

                if (append) {
                    this.creations = this.creations.concat(mapped)
                    this.currentPage = page
                } else {
                    this.creations = mapped
                    this.currentPage = page
                }

                const pageSize = 20
                this.hasMore = list.length >= pageSize && mapped.length > 0
            } catch (err) {
                console.error('加载创作列表失败：', err)
                if (append && this.currentPage > 1) {
                    this.currentPage -= 1
                }
                uni.showToast({ title: '加载失败，请重试', icon: 'none' })
            } finally {
                this.loading = false
                if (this.isRefreshing) {
                    this.isRefreshing = false
                    uni.stopPullDownRefresh()
                }
            }
        },

        async loadMore() {
            if (!this.hasMore) return
            const nextPage = this.currentPage + 1
            await this.fetchCreations(nextPage, true)
        },

        async refreshList() {
            this.isRefreshing = true
            this.hasMore = true
            await this.fetchCreations(1, false)
        },

        handleImageError(creation) {
            if (creation) {
                creation.image = this.defaultImage
            }
        },

        goToSearchPage() {
            const kw = this.keyword.trim()
            if (kw) {
                uni.navigateTo({
                    url: '/pages/creation/search?keyword=' + encodeURIComponent(kw)
                })
            } else {
                uni.showToast({
                    title: '请输入搜索词',
                    icon: 'none'
                })
            }
        },

        clearKeyword() {
            this.keyword = ''
        },

        async toggleDigg(index) {
            const item = this.creations[index]
            if (!item || item._digging) return

            item._digging = true
            try {
                if (item.is_digg) {
                    await cancelDigg('creation', item.creation_id)
                    item.is_digg = false
                    if (item.likes > 0) item.likes -= 1
                } else {
                    await digg('creation', item.creation_id)
                    item.is_digg = true
                    item.likes += 1
                }
            } catch (e) {
                console.error('点赞操作失败：', e)
                uni.showToast({
                    title: '操作失败',
                    icon: 'none'
                })
            } finally {
                item._digging = false
            }
        },

        goToCreationDetail(creation) {
            if (!creation || !creation.creation_id) return

            const creationId = encodeURIComponent(creation.creation_id)
            const userId = encodeURIComponent(
                creation.user_id || creation.author.user_id || ''
            )

            const isVideo = creation.type === 'video' || Number(creation.material_type) === 2
            const basePath = isVideo
                ? '/pages/creation/creation_video'
                : '/pages/creation/creation_image'

            uni.navigateTo({
                url: basePath + '?creationId=' + creationId + '&userId=' + userId
            })
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
    padding: 8px 10px;
    box-sizing: border-box;
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
    transition: all 0.3s;
}

.search-input-container:focus-within {
    background: #fff;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
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
    transition: all 0.3s;
}

.search-button:active {
    transform: scale(0.95);
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
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.creation-card {
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
    padding: 4px 6px 4px;
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