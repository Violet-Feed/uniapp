<template>
    <view class="container">
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
                    @click="goToCreationDetail(creation.creation_id)"
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
                        <!-- 统计信息悬浮层 -->
                        <view class="stats-overlay" v-if="creation.likes">
                            <text class="stat-item">❤️ {{ formatNumber(creation.likes) }}</text>
                            <text class="stat-item" v-if="creation.views">👁️ {{ formatNumber(creation.views) }}</text>
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
                            <!-- 时间标签 -->
                            <text class="time-label" v-if="creation.time">{{ creation.time }}</text>
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
                <text class="loading-more-text">正在加载更多...</text>
            </view>
        </view>
    </view>
</template>

<script>
const mockGetCreations = (page = 1) => {
    return [
        {
            creation_id: `cre-${page}-01`,
            image: `https://picsum.photos/id/${237 + page}/400/600`,
            title: "治愈系猫咪摄影集",
            author: { avatar: `https://picsum.photos/id/${64 + page}/100/100`, name: "猫系摄影师" },
            type: "image",
            likes: 1234 + page * 10,
            views: 5678 + page * 50,
            time: "2小时前"
        },
        {
            creation_id: `cre-${page}-02`,
            image: `https://picsum.photos/id/${119 + page}/400/600`,
            title: "手工皮具制作教程",
            author: { avatar: `https://picsum.photos/id/${91 + page}/100/100`, name: "手工匠人阿木" },
            type: "video",
            likes: 856 + page * 15,
            views: 3421 + page * 40,
            time: "5小时前"
        },
        {
            creation_id: `cre-${page}-03`,
            image: `https://picsum.photos/id/${160 + page}/400/600`,
            title: "城市夜景拍摄技巧",
            author: { avatar: `https://picsum.photos/id/${22 + page}/100/100`, name: "光影捕手" },
            type: "image",
            likes: 2341 + page * 20,
            views: 8765 + page * 60,
            time: "1天前"
        },
        {
            creation_id: `cre-${page}-04`,
            image: `https://picsum.photos/id/${292 + page}/400/600`,
            title: "复古风手账排版",
            author: { avatar: `https://picsum.photos/id/${54 + page}/100/100`, name: "手账小能手" },
            type: "image",
            likes: 678 + page * 8,
            views: 2134 + page * 30,
            time: "3天前"
        },
        {
            creation_id: `cre-${page}-05`,
            image: `https://picsum.photos/id/${325 + page}/400/600`,
            title: "家常红烧肉教程",
            author: { avatar: `https://picsum.photos/id/${82 + page}/100/100`, name: "家常菜大厨" },
            type: "video",
            likes: 1987 + page * 12,
            views: 6543 + page * 55,
            time: "1周前"
        },
        {
            creation_id: `cre-${page}-06`,
            image: `https://picsum.photos/id/${366 + page}/400/600`,
            title: "极简PPT设计",
            author: { avatar: `https://picsum.photos/id/${45 + page}/100/100`, name: "设计狮Leo" },
            type: "image",
            likes: 543 + page * 5,
            views: 1876 + page * 25,
            time: "2周前"
        }
    ];
};

export default {
    data() {
        return {
            creations: [],
            loading: false,
            currentPage: 1
        };
    },
    onLoad() {
        setTimeout(() => this.loadInitialData(), 100);
    },
    onReachBottom() {
        if (!this.loading) this.loadMore();
    },
    methods: {
        async loadInitialData() {
            this.loading = true;
            try {
                await new Promise(resolve => setTimeout(resolve, 600));
                this.creations = mockGetCreations(this.currentPage);
            } catch (err) {
                console.error("初始数据加载失败：", err);
                uni.showToast({ title: "加载失败，请重试", icon: "none" });
            } finally {
                this.loading = false;
            }
        },
        
        async loadMore() {
            this.loading = true;
            try {
                this.currentPage++;
                await new Promise(resolve => setTimeout(resolve, 800));
                const newData = mockGetCreations(this.currentPage);
                this.creations = [...this.creations, ...newData];
            } catch (err) {
                this.currentPage--;
                uni.showToast({ title: "加载更多失败", icon: "none" });
            } finally {
                this.loading = false;
            }
        },
        
        handleImageError(creation) {
            if (creation) {
                creation.image = "/static/images/default.png";
            }
        },
        
        goToCreationDetail(creationId) {
            uni.navigateTo({ 
                url: `/pages/creation/creation?id=${encodeURIComponent(creationId)}` 
            });
        },
        
        formatNumber(num) {
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

/* ==================== 创作列表 ==================== */
.creation-grid-container {
    padding: 12px 8px;
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
    position: relative;
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
    transition: transform 0.5s;
}

.creation-card:active .card-image {
    transform: scale(1.05);
}

.image-gradient {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent);
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
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.stats-overlay {
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    pointer-events: none;
}

.stat-item {
    display: flex;
    align-items: center;
    font-size: 11px;
    color: #fff;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    padding: 4px 8px;
    border-radius: 10px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
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

.time-label {
    font-size: 10px;
    color: #999;
    flex-shrink: 0;
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
    animation: float 3s ease-in-out infinite;
}

@keyframes float {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-10px);
    }
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