<template>
    <view class="container">
        <view class="fixed-search-bar">
            <input v-model="keyword" type="text" placeholder="搜索商品" @focus="handleInputFocus" @blur="handleInputBlur" @input="handleInputChange" />
            <button @click="goToSearchPage">搜索</button>
            <view v-if="showHotSearchList" class="hot-search-list">
                <view class="hot-search-title">热门搜索</view>
                <view class="hot-search-item" v-for="(hotSearch, index) in hotSearchList" :key="index" @mousedown="selectHotSearch(hotSearch)">
                    {{ hotSearch }}
                </view>
            </view>
        </view>
        <scroll-view class="item-list" scroll-y @scrolltolower="loadMore">
            <view style="padding-top: 80px;">
                <view class="item-item" v-for="(item, index) in items" :key="item.id" @click="goToItemDetail(item.item_id)">
                    <image class="item-image" :src="item.image" mode="aspectFill"></image>
                    <view class="item-info">
                        <view class="item-title">{{ item.title }}</view>
                        <view class="item-price">￥{{ item.price }}</view>
                    </view>
                </view>
            </view>
            <view v-if="loading" class="loading-icon">
                正在加载更多商品...
            </view>
        </scroll-view>
    </view>
</template>

<script>
import { getItemsByUser } from "@/request/market.js";

export default {
    data() {
        return {
            keyword: '',
            items: [],
            loading: true,
            hotSearchList: ['手机', '电脑', '鼠标', "笔记本"],
            showHotSearchList: false
        };
    },
    async onLoad() {
        this.items = await getItemsByUser();
        this.loading = false;
    },
    methods: {
        goToSearchPage() {
            if (this.keyword.trim()) {
                uni.navigateTo({
                    url: `/pages/market/search?keyword=${this.keyword}`
                });
            } else {
                uni.showToast({
                    title: '请输入搜索词',
                    icon: 'none'
                });
            }
        },
        async loadMore() {
            this.loading = true;
            let res = await getItemsByUser();
            this.items = this.items.concat(res);
            this.loading = false;
        },
        goToItemDetail(itemId) {
            uni.navigateTo({
                url: `/pages/market/item?id=${itemId}`
            });
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
}

.fixed-search-bar {
    display: flex;
    padding: 10px 20px 10px 20px;
    background-color: white;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1;
    box-sizing: border-box;
}

.fixed-search-bar input {
    flex: 1;
    height: 40px;
    border: 1px solid #ccc;
    border-radius: 5px;
    padding: 0 10px;
    margin-right: 10px;
}

.fixed-search-bar button {
    height: 40px;
    padding: 0px 20px;
    background-color: #007aff;
    color: white;
    border: none;
    border-radius: 5px;
}

.hot-search-list {
    position: absolute;
    top: 50px;
    left: 20px;
    right: 20px;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    z-index: 2;
}

.hot-search-title {
    font-weight: bold;
    padding: 8px 10px;
    border-bottom: 1px solid #eee;
}

.hot-search-item {
    padding: 5px 10px;
    cursor: pointer;
}

.hot-search-item:hover {
    background-color: #f5f5f5;
}

.item-list {
    height: 100vh;
}

.item-item {
    display: flex;
    margin-bottom: 20px;
    padding: 0 20px;
}

.item-image {
    min-width: 100px;
    max-width: 100px;
    min-height: 100px;
    max-height: 100px;
    margin-right: 20px;
}

.item-info {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.item-title {
    font-size: 16px;
    font-weight: bold;
}

.item-price {
    color: red;
}

.loading-icon {
    text-align: center;
    padding: 20px;
}
</style>    