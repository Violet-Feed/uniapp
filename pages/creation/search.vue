<template>
    <view class="container" v-if="isPageAlive">
        <!-- 搜索区域 -->
        <view class="search-wrapper">
            <view class="fixed-search-bar">
                <input 
                    v-model="keyword" 
                    type="text" 
                    placeholder="搜索创作" 
                    @confirm="searchCreations" 
                    @focus="handleInputFocus"
                />
                <button @click="searchCreations">搜索</button>
            </view>
        </view>

        <!-- 筛选栏 -->
        <view class="filter-bar">
            <view 
                class="filter-item" 
                :class="{ active: activeFilter === 'all' }" 
                @click="changeFilter('all')"
            >
                综合
            </view>
            <view 
                class="filter-item" 
                :class="{ active: activeFilter === 'latest' }" 
                @click="changeFilter('latest')"
            >
                最新
            </view>
            <view 
                class="filter-item" 
                :class="{ active: activeFilter === 'user' }" 
                @click="changeFilter('user')"
            >
                用户
            </view>
            <view 
                class="filter-item" 
                :class="{ active: activeFilter === 'group' }" 
                @click="changeFilter('group')"
            >
                群聊
            </view>
        </view>

        <!-- 双列创作列表 -->
        <view class="creation-grid-container">
            <!-- 初始加载状态 -->
            <view v-if="loading && creations.length === 0" class="initial-loading">加载中...</view>

            <!-- 双列网格列表 -->
            <view class="creation-grid" v-else-if="creations.length > 0">
                <view 
                    class="creation-card" 
                    v-for="(creation, index) in safeCreations" 
                    :key="`creation-${creation.creation_id}-${index}`" 
                    @click="goToCreationDetail(creation.creation_id)"
                >
                    <image 
                        class="card-image" 
                        :src="creation.image" 
                        mode="aspectFill"
                        @error="handleImageError(creation)"
                    ></image>
                    <view class="card-title-container">
                        <text class="card-title">{{ creation.title }}</text>
                    </view>
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

            <!-- 空状态 -->
            <view v-else class="empty-state">没有找到相关创作</view>
            <!-- 加载更多提示 -->
            <view v-if="loading && creations.length > 0" class="loading-icon">正在加载更多...</view>
        </view>
    </view>
</template>

<script>
// 模拟创作数据生成函数（确保输出数据结构安全）
const mockCreations = (page = 1, keyword = '', filter = 'all') => {
    // 基础数据池（确保每个字段都有默认值）
    const baseData = [
        {
            creation_id: `cre-1-${page}`,
            image: `https://picsum.photos/id/${237 + page}/400/300`,
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
            image: `https://picsum.photos/id/${119 + page}/400/300`,
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
            image: `https://picsum.photos/id/${160 + page}/400/300`,
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
            image: `https://picsum.photos/id/${292 + page}/400/300`,
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
            image: `https://picsum.photos/id/${325 + page}/400/300`,
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
            image: `https://picsum.photos/id/${366 + page}/400/300`,
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
        item.title.includes(keyword) || item.author.name.includes(keyword)
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
            creations: [], // 原始数据
            loading: true,
            activeFilter: 'all',
            isPageAlive: true, // 页面存活标记
            defaultImage: '/static/images/default.png', // 默认图片路径
            defaultAvatar: '/static/images/avatar-default.png' // 默认头像路径
        };
    },
    computed: {
        // 安全处理后的创作数据（确保没有undefined/null）
        safeCreations() {
            return this.creations.map(item => ({
                creation_id: item.creation_id || `default-${Date.now()}`,
                image: item.image || this.defaultImage,
                title: item.title || '未命名创作',
                authorAvatar: item.author?.avatar || this.defaultAvatar,
                authorName: item.author?.name || '未知作者'
            }));
        }
    },
    async onLoad(options) {
        this.keyword = options?.keyword || '';
        await this.searchCreations();
    },
    onReachBottom() {
        if (!this.loading && this.isPageAlive) {
            this.loadMore();
        }
    },
    onUnload() {
        // 页面销毁时标记，阻止后续异步操作
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
                // 确保页面存活再更新数据
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
                this.page--; // 回退页码
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
            // 确保对象存在再修改
            if (creation && this.isPageAlive) {
                creation.image = this.defaultImage;
            }
        },
        handleInputFocus() {
            // 预留热搜功能触发点
        }
    }
};
</script>

<style scoped>
.container {
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    background-color: #f5f5f7;
    min-height: 100vh;
}

.search-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 99;
    background-color: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.fixed-search-bar {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    box-sizing: border-box;
}

.fixed-search-bar input {
    flex: 1;
    height: 28px;
    border: 1px solid #eee;
    border-radius: 14px;
    padding: 0 8px;
    margin-right: 4px;
    font-size: 11px;
    outline: none;
    box-sizing: border-box;
}

.fixed-search-bar button {
    height: 28px;
    padding: 0 12px;
    background-color: #007aff;
    color: #fff;
    border: none;
    border-radius: 14px;
    font-size: 11px;
    cursor: pointer;
    box-sizing: border-box;
}

.filter-bar {
    display: flex;
    position: fixed;
    top: 36px;
    left: 0;
    right: 0;
    background-color: #fff;
    z-index: 98;
    border-bottom: 1px solid #f5f5f5;
}

.filter-item {
    flex: 1;
    text-align: center;
    padding: 8px 0;
    font-size: 11px;
    color: #333;
    position: relative;
}

.filter-item.active {
    color: #007aff;
    font-weight: 500;
}

.filter-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 2px;
    background-color: #007aff;
    border-radius: 1px;
}

.creation-grid-container {
    padding: 78px 6px 12px;
    box-sizing: border-box;
}

.initial-loading, .empty-state, .loading-icon {
    padding: 20px 0;
    font-size: 13px;
    text-align: center;
    color: #999;
}

.creation-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.creation-card {
    border-radius: 8px;
    overflow: hidden;
    background-color: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.card-image {
    width: 100%;
    height: 240px;
    object-fit: cover;
}

.card-title-container {
    padding: 8px 8px 4px;
}

.card-title {
    font-size: 12px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
}

.card-author {
    display: flex;
    align-items: center;
    padding: 0 8px 8px;
}

.author-avatar {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid #f5f5f5;
    margin-right: 5px;
    object-fit: cover;
}

.author-name {
    font-size: 12px;
    color: #555;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>