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
                        placeholder="搜索创作" 
                        @confirm="searchCreations" 
                        @focus="handleInputFocus"
                        :focus="autoFocus"
                    />
                    <text v-if="keyword" class="clear-icon" @click.stop="clearKeyword">✕</text>
                </view>
                <view class="search-button" @click="searchCreations">
                    <text>搜索</text>
                </view>
            </view>
        </view>

        <!-- 筛选栏 -->
        <view class="filter-bar">
            <view 
                class="filter-item" 
                :class="{ active: activeFilter === 'all' }" 
                @click="changeFilter('all')"
            >
                <text class="filter-text">综合</text>
                <view class="filter-indicator" v-if="activeFilter === 'all'"></view>
            </view>
            <view 
                class="filter-item" 
                :class="{ active: activeFilter === 'latest' }" 
                @click="changeFilter('latest')"
            >
                <text class="filter-text">最新</text>
                <view class="filter-indicator" v-if="activeFilter === 'latest'"></view>
            </view>
            <view 
                class="filter-item" 
                :class="{ active: activeFilter === 'user' }" 
                @click="changeFilter('user')"
            >
                <text class="filter-text">用户</text>
                <view class="filter-indicator" v-if="activeFilter === 'user'"></view>
            </view>
            <view 
                class="filter-item" 
                :class="{ active: activeFilter === 'group' }" 
                @click="changeFilter('group')"
            >
                <text class="filter-text">群聊</text>
                <view class="filter-indicator" v-if="activeFilter === 'group'"></view>
            </view>
        </view>

        <!-- 搜索结果统计 -->
        <view class="result-info" v-if="!loading || creations.length > 0">
            <text class="result-text">找到 <text class="result-count">{{ creations.length }}</text> 个相关结果</text>
        </view>

        <!-- 双列创作列表 -->
        <view class="creation-grid-container">
            <!-- 初始加载状态 -->
            <view v-if="loading && creations.length === 0" class="initial-loading">
                <view class="loading-spinner"></view>
                <text class="loading-text">搜索中...</text>
            </view>

            <!-- 双列网格列表 -->
            <view class="creation-grid" v-else-if="creations.length > 0">
                <view 
                    class="creation-card" 
                    v-for="(creation, index) in safeCreations" 
                    :key="`creation-${creation.creation_id}-${index}`" 
                    @click="goToCreationDetail(creation.creation_id)"
                >
                    <!-- 图片容器 -->
                    <view class="image-wrapper">
                        <image 
                            class="card-image" 
                            :src="creation.image" 
                            mode="aspectFill"
                            @error="handleImageError(creation)"
                            lazy-load
                        ></image>
                        <!-- 渐变遮罩 -->
                        <view class="image-gradient"></view>
                        <!-- 类型标签 -->
                        <view class="type-badge" v-if="creation.type">
                            <text>{{ creation.type === 'group' ? '👥' : '👤' }}</text>
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
                                    :src="creation.authorAvatar" 
                                    mode="aspectFill"
                                    lazy-load
                                ></image>
                                <text class="author-name">{{ creation.authorName }}</text>
                            </view>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 空状态 -->
            <view v-else class="empty-state">
                <text class="empty-icon">🔍</text>
                <text class="empty-text">没有找到相关创作</text>
                <text class="empty-hint">试试其他关键词吧</text>
            </view>
            
            <!-- 加载更多提示 -->
            <view v-if="loading && creations.length > 0" class="loading-more">
                <view class="loading-spinner small"></view>
                <text class="loading-more-text">正在加载更多...</text>
            </view>
        </view>
    </view>
</template>

<script>
// 模拟创作数据生成函数
const mockCreations = (page = 1, keyword = '', filter = 'all') => {
    const baseData = [
        {
            creation_id: `cre-1-${page}`,
            image: `https://picsum.photos/id/${237 + page}/400/600`,
            title: "治愈系猫咪摄影集",
            author: { 
                avatar: `https://picsum.photos/id/${64 + page}/100/100`, 
                name: "猫系摄影师" 
            },
            type: "user",
            createTime: new Date(2025, 9, 20 - page).getTime()
        },
        {
            creation_id: `cre-2-${page}`,
            image: `https://picsum.photos/id/${119 + page}/400/600`,
            title: "手工皮具制作教程",
            author: { 
                avatar: `https://picsum.photos/id/${91 + page}/100/100`, 
                name: "手工匠人阿木" 
            },
            type: "user",
            createTime: new Date(2025, 9, 22 - page).getTime()
        },
        {
            creation_id: `cre-3-${page}`,
            image: `https://picsum.photos/id/${160 + page}/400/600`,
            title: "城市夜景拍摄技巧",
            author: { 
                avatar: `https://picsum.photos/id/${22 + page}/100/100`, 
                name: "光影捕手" 
            },
            type: "user",
            createTime: new Date(2025, 9, 18 - page).getTime()
        },
        {
            creation_id: `cre-4-${page}`,
            image: `https://picsum.photos/id/${292 + page}/400/600`,
            title: "复古风手账排版",
            author: { 
                avatar: `https://picsum.photos/id/${54 + page}/100/100`, 
                name: "手账爱好者社群" 
            },
            type: "group",
            createTime: new Date(2025, 9, 25 - page).getTime()
        },
        {
            creation_id: `cre-5-${page}`,
            image: `https://picsum.photos/id/${325 + page}/400/600`,
            title: "家常红烧肉教程",
            author: { 
                avatar: `https://picsum.photos/id/${82 + page}/100/100`, 
                name: "美食分享群" 
            },
            type: "group",
            createTime: new Date(2025, 9, 15 - page).getTime()
        },
        {
            creation_id: `cre-6-${page}`,
            image: `https://picsum.photos/id/${366 + page}/400/600`,
            title: "极简PPT设计",
            author: { 
                avatar: `https://picsum.photos/id/${45 + page}/100/100`, 
                name: "设计狮Leo" 
            },
            type: "user",
            createTime: new Date(2025, 9, 21 - page).getTime()
        }
    ];

    // 关键词筛选
    let filtered = baseData.filter(item => 
        !keyword || item.title.includes(keyword) || item.author.name.includes(keyword)
    );

    // 类型筛选
    if (filter === 'user') filtered = filtered.filter(item => item.type === 'user');
    else if (filter === 'group') filtered = filtered.filter(item => item.type === 'group');

    // 最新排序
    if (filter === 'latest') filtered.sort((a, b) => b.createTime - a.createTime);

    return filtered;
};

export default {
    data() {
        return {
            keyword: '',
            page: 1,
            creations: [],
            loading: true,
            activeFilter: 'all',
            isPageAlive: true,
            autoFocus: false,
            defaultImage: '/static/images/default.png',
            defaultAvatar: '/static/images/avatar-default.png'
        };
    },
    computed: {
        safeCreations() {
            return this.creations.map(item => ({
                creation_id: item.creation_id || `default-${Date.now()}`,
                image: item.image || this.defaultImage,
                title: item.title || '未命名创作',
                authorAvatar: item.author?.avatar || this.defaultAvatar,
                authorName: item.author?.name || '未知作者',
                type: item.type
            }));
        }
    },
    async onLoad(options) {
        this.keyword = decodeURIComponent(options?.keyword || '');
        this.autoFocus = !this.keyword; // 如果没有关键词，自动聚焦
        await this.searchCreations();
    },
    onReachBottom() {
        if (!this.loading && this.isPageAlive && this.creations.length > 0) {
            this.loadMore();
        }
    },
    onUnload() {
        this.isPageAlive = false;
    },
    methods: {
        async searchCreations() {
            if (!this.isPageAlive) return;
            
            this.loading = true;
            this.page = 1;
            
            try {
                await new Promise(resolve => setTimeout(resolve, 600));
                const newData = mockCreations(this.page, this.keyword, this.activeFilter);
                if (this.isPageAlive) {
                    this.creations = newData;
                }
            } catch (err) {
                console.error("搜索失败：", err);
                if (this.isPageAlive) {
                    uni.showToast({ title: "加载失败", icon: "none" });
                }
            } finally {
                if (this.isPageAlive) {
                    this.loading = false;
                }
            }
        },
        
        async loadMore() {
            if (!this.isPageAlive || this.loading) return;
            
            this.loading = true;
            
            try {
                this.page++;
                await new Promise(resolve => setTimeout(resolve, 800));
                const newData = mockCreations(this.page, this.keyword, this.activeFilter);
                if (this.isPageAlive) {
                    this.creations = [...this.creations, ...newData];
                }
            } catch (err) {
                console.error("加载更多失败：", err);
                this.page--;
                if (this.isPageAlive) {
                    uni.showToast({ title: "加载更多失败", icon: "none" });
                }
            } finally {
                if (this.isPageAlive) {
                    this.loading = false;
                }
            }
        },
        
        changeFilter(filterType) {
            if (this.activeFilter === filterType || !this.isPageAlive) return;
            this.activeFilter = filterType;
            this.searchCreations();
        },
        
        goToCreationDetail(creationId) {
            if (!this.isPageAlive) return;
            uni.navigateTo({ 
                url: `/pages/creation/creation?id=${encodeURIComponent(creationId)}` 
            });
        },
        
        handleImageError(creation) {
            if (creation && this.isPageAlive) {
                creation.image = this.defaultImage;
            }
        },
        
        handleInputFocus() {
            // 预留功能
        },
        
        clearKeyword() {
            this.keyword = '';
        },
        
        goBack() {
            uni.navigateBack();
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