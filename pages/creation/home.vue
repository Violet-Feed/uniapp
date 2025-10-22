<template>
    <view class="container">
        <!-- 搜索区域 -->
        <view class="search-wrapper">
            <view class="fixed-search-bar">
                <input 
                    v-model="keyword" 
                    type="text" 
                    placeholder="搜索创作" 
                    @focus="handleInputFocus" 
                    @blur="handleInputBlur" 
                    @input="handleInputChange" 
                />
                <button @click="goToSearchPage">搜索</button>
            </view>
            <view v-if="showHotSearchList && hotSearchList.length" class="hot-search-list">
                <view class="hot-search-title">热门搜索</view>
                <view 
                    class="hot-search-item" 
                    v-for="(hotSearch, index) in hotSearchList" 
                    :key="`hot-${index}`" 
                    @mousedown="selectHotSearch(hotSearch)"
                >
                    {{ hotSearch }}
                </view>
            </view>
        </view>

        <!-- 双列创作列表（宫格高度拉长） -->
        <view class="creation-grid-container">
            <view v-if="loading && creations.length === 0" class="initial-loading">加载中...</view>

            <view class="creation-grid" v-else-if="creations.length > 0">
                <view 
                    class="creation-card" 
                    v-for="(creation, index) in creations" 
                    :key="`creation-${creation.creation_id}-${index}`" 
                    @click="goToCreationDetail(creation.creation_id)"
                >
                    <!-- 核心调整：增加图片高度，拉长宫格主体 -->
                    <image 
                        class="card-image" 
                        :src="creation.image || '/static/images/default.png'" 
                        mode="aspectFill"
                        @error="handleImageError(creation)"
                    ></image>
                    <!-- 微调内容区间距，匹配拉长后的卡片比例 -->
                    <view class="card-title-container">
                        <text class="card-title">{{ creation.title }}</text>
                    </view>
                    <view class="card-author">
                        <image 
                            class="author-avatar" 
                            :src="creation.author?.avatar || '/static/images/avatar-default.png'" 
                            mode="aspectFill"
                            lazy-load
                        ></image>
                        <text class="author-name">{{ creation.author?.name || '未知作者' }}</text>
                    </view>
                </view>
            </view>

            <view v-else class="empty-state">暂无创作内容</view>
            <view v-if="loading && creations.length > 0" class="loading-icon">正在加载更多...</view>
        </view>
    </view>
</template>

<script>
// 脚本逻辑保持不变，无需修改
const mockGetCreations = (page = 1) => {
    return [
        {
            creation_id: `cre-${page}-01`,
            image: `https://picsum.photos/id/${237 + page}/400/300`,
            title: "治愈系猫咪摄影集",
            author: { avatar: `https://picsum.photos/id/${64 + page}/100/100`, name: "猫系摄影师" }
        },
        {
            creation_id: `cre-${page}-02`,
            image: `https://picsum.photos/id/${119 + page}/400/300`,
            title: "手工皮具制作教程",
            author: { avatar: `https://picsum.photos/id/${91 + page}/100/100`, name: "手工匠人阿木" }
        },
        {
            creation_id: `cre-${page}-03`,
            image: `https://picsum.photos/id/${160 + page}/400/300`,
            title: "城市夜景拍摄技巧",
            author: { avatar: `https://picsum.photos/id/${22 + page}/100/100`, name: "光影捕手" }
        },
        {
            creation_id: `cre-${page}-04`,
            image: `https://picsum.photos/id/${292 + page}/400/300`,
            title: "复古风手账排版",
            author: { avatar: `https://picsum.photos/id/${54 + page}/100/100`, name: "手账小能手" }
        },
        {
            creation_id: `cre-${page}-05`,
            image: `https://picsum.photos/id/${325 + page}/400/300`,
            title: "家常红烧肉教程",
            author: { avatar: `https://picsum.photos/id/${82 + page}/100/100`, name: "家常菜大厨" }
        },
        {
            creation_id: `cre-${page}-06`,
            image: `https://picsum.photos/id/${366 + page}/400/300`,
            title: "极简PPT设计",
            author: { avatar: `https://picsum.photos/id/${45 + page}/100/100`, name: "设计狮Leo" }
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
            hotSearchList: ["摄影", "手工", "美食", "手账", "PPT设计"],
            showHotSearchList: false
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
            if (creation) creation.image = "/static/images/default.png";
        },
        goToSearchPage() {
            if (this.keyword.trim()) {
                uni.navigateTo({
                    url: `/pages/creation/search?keyword=${this.keyword}`
                });
            } else {
                uni.showToast({
                    title: '请输入搜索词',
                    icon: 'none'
                });
            }
        },
        goToCreationDetail(creationId) {
            uni.navigateTo({ url: `/pages/creation/creation?id=${creationId}` });
        },
        handleInputFocus() {
            if (!this.keyword.trim()) {
                this.showHotSearchList = true;
            }
        },
        handleInputBlur() {
            this.showHotSearchList = false;
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
            this.goToSearchPage();
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

.hot-search-list {
    padding: 0 8px 8px;
    background-color: #fff;
}

.hot-search-title {
    font-size: 10px;
    padding: 5px 0;
    color: #999;
    border-top: 1px solid #f5f5f5;
}

.hot-search-item {
    font-size: 11px;
    padding: 7px 0;
    color: #333;
}

.creation-grid-container {
    padding: 46px 6px 12px;
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

/* 核心调整：图片高度从140px拉长到180px（可根据需求修改数值） */
.card-image {
    width: 100%;
    height: 240px; /* 关键：增加高度，直接拉长宫格主体 */
    object-fit: cover; /* 保持图片比例，避免拉伸变形 */
}

/* 微调内容区间距，让整体更协调（配合拉长的图片） */
.card-title-container {
    padding: 8px 8px 6px; /* 上下内边距从6px/4px增至8px/6px */
}

.card-title {
    font-size: 12px;
    line-height: 1.4; /* 增加行高，提升文字可读性 */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2; /* 保留2行文字，避免标题过长导致卡片高度失控 */
    overflow: hidden;
}

.card-author {
    display: flex;
    align-items: center;
    padding: 0 8px 8px; /* 底部内边距从6px增至8px，与标题区呼应 */
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