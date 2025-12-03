<template>
    <view class="container">
        <!-- 搜索区域 -->
        <view class="search-wrapper">
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
        <view class="creation-grid-container">
            <!-- 初始加载状态 -->
            <view v-if="loading && creations.length === 0" class="initial-loading">
                <view class="loading-spinner"></view>
                <text class="loading-text">精彩内容加载中...</text>
            </view>

            <!-- 双列网格 -->
            <view class="creation-grid" v-else-if="creations.length > 0">
                <view 
                    class="creation-card" 
                    v-for="(creation, index) in creations" 
                    :key="`creation-${creation.creation_id}-${index}`" 
                    @click="goToCreationDetail(creation)"
                >
                    <!-- 图片容器 -->
                    <view class="image-wrapper">
                        <image 
                            class="card-image" 
                            :src="creation.image || '/static/images/default.png'" 
                            mode="aspectFill"
                            @error="handleImageError(creation)"
                            lazy-load
                        ></image>
                        <!-- 渐变遮罩 -->
                        <view class="image-gradient"></view>
                        <!-- 类型标签 -->
                        <view class="type-badge" v-if="creation.type">
                            <text>{{ creation.type === 'video' ? '📹' : '🖼️' }}</text>
                        </view>
                    </view>
                    
                    <!-- 内容区域 -->
                    <view class="card-content">
                        <view class="card-title-container">
                            <text class="card-title">{{ creation.title }}</text>
                        </view>
                        <view class="card-footer">
                            <view class="card-author">
                                <image 
                                    class="author-avatar" 
                                    :src="creation.author?.avatar || '/static/images/avatar-default.png'" 
                                    mode="aspectFill"
                                    lazy-load
                                ></image>
                                <text class="author-name">{{ creation.author?.name || '未知作者' }}</text>
                            </view>
                            <view 
                                class="card-likes" 
                                @click.stop="toggleDigg(index)"
                            >
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

            <!-- 空状态 -->
            <view v-else class="empty-state">
                <text class="empty-icon">🎨</text>
                <text class="empty-text">暂无创作内容</text>
                <text class="empty-hint">快去创作第一个作品吧！</text>
            </view>
            
            <!-- 加载更多 -->
            <view v-if="loading && creations.length > 0" class="loading-more">
                <view class="loading-spinner small"></view>
                <text class="loading-more-text">
                    {{ hasMore ? '正在加载更多...' : '没有更多了' }}
                </text>
            </view>
        </view>
    </view>
</template>

<script>
import { getCreationsByRec } from '@/request/creation.js'
import { digg, cancelDigg } from '@/request/action.js'

export default {
    data() {
        return {
            keyword: "",
            creations: [],
            loading: false,
            currentPage: 1,
            hasMore: true,
            isRefreshing: false
        };
    },
    onLoad() {
        // 初始加载推荐流
        this.fetchCreations(1, false);
    },
    // 下拉刷新（需要在页面 json 里开启 enablePullDownRefresh）
    onPullDownRefresh() {
        this.refreshList();
    },
    // 上拉触底加载更多
    onReachBottom() {
        if (!this.loading && this.hasMore) {
            this.loadMore();
        }
    },
    methods: {
        /* ========== 列表加载 ========== */
        async fetchCreations(page = 1, append = false) {
            if (this.loading) return;
            this.loading = true;

            try {
                const res = await getCreationsByRec(getApp().globalData.userId);

                // 兼容多种返回格式：数组 或 {creations: [...]}
                const list = Array.isArray(res)
                    ? res
                    : (res && (res.creations || res.list)) 
                        ? (res.creations || res.list)
                        : [];

                const mapped = list.map(item => {
                    const materialType = Number(item.material_type);
                    const isVideo = materialType === 2;

                    return {
                        creation_id: item.creation_id,
                        user_id: item.user_id,
                        image: item.cover_url || item.material_url || '/static/images/default.png',
                        title: item.title || '未命名作品',
                        author: {
                            avatar: item.avatar || item.author_avatar || '/static/user_avatar.png',
                            name: item.username || item.author_name || '未知作者',
                            user_id: item.user_id
                        },
                        type: isVideo ? 'video' : 'image',
                        material_type: materialType,
                        likes: item.digg_count || item.like_count || 0,
                        is_digg: !!item.is_digg
                    };
                });

                if (append) {
                    this.creations = this.creations.concat(mapped);
                    this.currentPage = page;
                } else {
                    this.creations = mapped;
                    this.currentPage = page;
                }

                const pageSize = 20; // 根据你后端分页大小调整
                this.hasMore = list.length >= pageSize && mapped.length > 0;

            } catch (err) {
                console.error("加载创作列表失败：", err);
                if (append && this.currentPage > 1) {
                    this.currentPage -= 1;
                }
                uni.showToast({ title: "加载失败，请重试", icon: "none" });
            } finally {
                this.loading = false;
                if (this.isRefreshing) {
                    this.isRefreshing = false;
                    uni.stopPullDownRefresh();
                }
            }
        },

        async loadMore() {
            if (!this.hasMore) return;
            const nextPage = this.currentPage + 1;
            await this.fetchCreations(nextPage, true);
        },

        async refreshList() {
            this.isRefreshing = true;
            this.hasMore = true;
            await this.fetchCreations(1, false);
        },

        /* ========== 图片出错兜底 ========== */
        handleImageError(creation) {
            if (creation) {
                creation.image = "/static/images/default.png";
            }
        },

        /* ========== 搜索 ========== */
        goToSearchPage() {
            const kw = this.keyword.trim();
            if (kw) {
                uni.navigateTo({
                    url: `/pages/creation/search?keyword=${encodeURIComponent(kw)}`
                });
            } else {
                uni.showToast({
                    title: '请输入搜索词',
                    icon: 'none'
                });
            }
        },

        clearKeyword() {
            this.keyword = '';
        },

        /* ========== 点赞 / 取消点赞 ========== */
        async toggleDigg(index) {
            const item = this.creations[index];
            if (!item || item._digging) return;

            item._digging = true;
            try {
                if (item.is_digg) {
                    // 取消点赞
                    await cancelDigg("creation",item.creation_id);
                    item.is_digg = false;
                    if (item.likes > 0) item.likes -= 1;
                } else {
                    // 点赞
                    await digg("creation",item.creation_id);
                    item.is_digg = true;
                    item.likes += 1;
                }
            } catch (e) {
                console.error('点赞操作失败：', e);
                uni.showToast({
                    title: '操作失败',
                    icon: 'none'
                });
            } finally {
                item._digging = false;
            }
        },

        /* ========== 跳转详情：按类型进入不同详情页 ========== */
        goToCreationDetail(creation) {
            if (!creation || !creation.creation_id) return;

            const creationId = encodeURIComponent(creation.creation_id);
            const userId = encodeURIComponent(
                creation.user_id || creation.author?.user_id || ''
            );

            const isVideo = creation.type === 'video' 
                || Number(creation.material_type) === 2;

            const basePath = isVideo
                ? '/pages/creation/creation_video'
                : '/pages/creation/creation_image';

            uni.navigateTo({
                url: `${basePath}?creationId=${creationId}&userId=${userId}`
            });
        },

        /* ========== 数字格式化 ========== */
        formatNumber(num) {
            if (!num && num !== 0) return '0';
            if (num >= 10000) {
                return (num / 10000).toFixed(1) + 'w';
            }
            if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'k';
            }
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

.search-input-container {
    flex: 1;
    display: flex;
    align-items: center;
    height: 36px;
    background: #f5f7fa;
    border-radius: 18px;
    padding: 0 14px;
    gap: 8px;
    transition: all 0.3s;
}

.search-input-container:focus-within {
    background: #fff;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
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
    transition: all 0.3s;
}

.search-button:active {
    transform: scale(0.95);
}

/* ==================== 创作列表 ==================== */
.creation-grid-container {
    padding: 66px 8px 12px;
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
    pointer-events: none;
}

.type-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
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
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid #f0f0f0;
    object-fit: cover;
    flex-shrink: 0;
}

.author-name {
    font-size: 11px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.card-likes {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
}

.like-icon {
    font-size: 12px;
}

.like-count {
    font-size: 11px;
    color: #999;
}

/* 空状态 */
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

/* 加载更多 */
.loading-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px 0;
}

.loading-spinner.small {
    width: 20px;
    height: 20px;
    border-width: 2px;
}

.loading-more-text {
    font-size: 13px;
    color: #999;
}
</style>
