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
                        @focus="handleInputFocus" 
                        @blur="handleInputBlur" 
                        @input="handleInputChange"
                        @confirm="goToSearchPage"
                    />
                    <text v-if="keyword" class="clear-icon" @click.stop="clearKeyword">✕</text>
                </view>
                <view class="search-button" @click="goToSearchPage">
                    <text>搜索</text>
                </view>
            </view>
            
            <!-- 热搜列表 - 修复bug：使用@click代替@mousedown -->
            <view v-if="showHotSearchList && hotSearchList.length" class="hot-search-list" @click.stop>
                <view class="hot-search-header">
                    <view class="hot-title-row">
                        <text class="hot-icon">🔥</text>
                        <text class="hot-title">热门搜索</text>
                    </view>
                    <text class="refresh-btn" @click="refreshHotSearch">
                        <text class="refresh-icon">🔄</text>
                    </text>
                </view>
                <view class="hot-search-tags">
                    <view 
                        class="hot-search-tag" 
                        v-for="(hotSearch, index) in displayedHotSearch" 
                        :key="`hot-${index}`" 
                        @click="selectHotSearch(hotSearch)"
                    >
                        <text class="hot-rank" :class="getRankClass(index)">{{ index + 1 }}</text>
                        <text class="hot-text">{{ hotSearch }}</text>
                    </view>
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
                            <view class="card-likes" v-if="creation.likes">
                                <text class="like-icon">❤️</text>
                                <text class="like-count">{{ formatNumber(creation.likes) }}</text>
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
            likes: 1234 + page * 10
        },
        {
            creation_id: `cre-${page}-02`,
            image: `https://picsum.photos/id/${119 + page}/400/600`,
            title: "手工皮具制作教程",
            author: { avatar: `https://picsum.photos/id/${91 + page}/100/100`, name: "手工匠人阿木" },
            type: "video",
            likes: 856 + page * 15
        },
        {
            creation_id: `cre-${page}-03`,
            image: `https://picsum.photos/id/${160 + page}/400/600`,
            title: "城市夜景拍摄技巧",
            author: { avatar: `https://picsum.photos/id/${22 + page}/100/100`, name: "光影捕手" },
            type: "image",
            likes: 2341 + page * 20
        },
        {
            creation_id: `cre-${page}-04`,
            image: `https://picsum.photos/id/${292 + page}/400/600`,
            title: "复古风手账排版",
            author: { avatar: `https://picsum.photos/id/${54 + page}/100/100`, name: "手账小能手" },
            type: "image",
            likes: 678 + page * 8
        },
        {
            creation_id: `cre-${page}-05`,
            image: `https://picsum.photos/id/${325 + page}/400/600`,
            title: "家常红烧肉教程",
            author: { avatar: `https://picsum.photos/id/${82 + page}/100/100`, name: "家常菜大厨" },
            type: "video",
            likes: 1987 + page * 12
        },
        {
            creation_id: `cre-${page}-06`,
            image: `https://picsum.photos/id/${366 + page}/400/600`,
            title: "极简PPT设计",
            author: { avatar: `https://picsum.photos/id/${45 + page}/100/100`, name: "设计狮Leo" },
            type: "image",
            likes: 543 + page * 5
        }
    ];
};

export default {
    data() {
        return {
            keyword: "",
            creations: [],
            loading: false,
            currentPage: 1,
            hotSearchList: [
                "AI绘画教程", 
                "手工制作", 
                "美食摄影", 
                "旅行vlog", 
                "手账排版",
                "PPT设计",
                "摄影技巧",
                "创意短视频"
            ],
            displayedHotSearch: [],
            showHotSearchList: false,
            blurTimer: null // 修复: 添加延时器避免blur和click冲突
        };
    },
    onLoad() {
        this.displayedHotSearch = this.hotSearchList.slice(0, 6);
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
        
        goToSearchPage() {
            if (this.keyword.trim()) {
                uni.navigateTo({
                    url: `/pages/creation/search?keyword=${encodeURIComponent(this.keyword)}`
                });
            } else {
                uni.showToast({
                    title: '请输入搜索词',
                    icon: 'none'
                });
            }
        },
        
        goToCreationDetail(creationId) {
            uni.navigateTo({ 
                url: `/pages/creation/creation?id=${encodeURIComponent(creationId)}` 
            });
        },
        
        handleInputFocus() {
            if (this.blurTimer) {
                clearTimeout(this.blurTimer);
                this.blurTimer = null;
            }
            if (!this.keyword.trim()) {
                this.showHotSearchList = true;
            }
        },
        
        handleInputBlur() {
            // 修复: 延迟关闭热搜列表,避免和点击事件冲突
            this.blurTimer = setTimeout(() => {
                this.showHotSearchList = false;
            }, 200);
        },
        
        handleInputChange() {
            if (this.keyword.trim()) {
                this.showHotSearchList = false;
            } else {
                this.showHotSearchList = true;
            }
        },
        
        selectHotSearch(hotSearch) {
            this.keyword = hotSearch;
            this.showHotSearchList = false;
            this.goToSearchPage();
        },
        
        clearKeyword() {
            this.keyword = '';
            this.showHotSearchList = true;
        },
        
        refreshHotSearch() {
            // 打乱热搜列表
            const shuffled = [...this.hotSearchList].sort(() => Math.random() - 0.5);
            this.displayedHotSearch = shuffled.slice(0, 6);
        },
        
        getRankClass(index) {
            if (index === 0) return 'rank-1';
            if (index === 1) return 'rank-2';
            if (index === 2) return 'rank-3';
            return '';
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

/* ==================== 热搜列表 ==================== */
.hot-search-list {
    padding: 12px;
    background: #fff;
    border-top: 1px solid #f0f0f0;
    animation: slideDown 0.3s ease;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.hot-search-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.hot-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.hot-icon {
    font-size: 18px;
}

.hot-title {
    font-size: 15px;
    font-weight: 600;
    color: #333;
}

.refresh-btn {
    display: flex;
    align-items: center;
    padding: 4px 12px;
    background: #f5f7fa;
    border-radius: 12px;
    font-size: 12px;
    color: #666;
}

.refresh-icon {
    font-size: 14px;
}

.hot-search-tags {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.hot-search-tag {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: #f8f9fa;
    border-radius: 10px;
    transition: all 0.3s;
}

.hot-search-tag:active {
    background: #e8e9eb;
    transform: scale(0.98);
}

.hot-rank {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    background: #e0e0e0;
    color: #666;
}

.hot-rank.rank-1 {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: #fff;
}

.hot-rank.rank-2 {
    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    color: #fff;
}

.hot-rank.rank-3 {
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
    color: #666;
}

.hot-text {
    flex: 1;
    font-size: 14px;
    color: #333;
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