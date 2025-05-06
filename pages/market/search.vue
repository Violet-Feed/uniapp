<template>
    <view class="container">
        <view class="fixed-search-bar">
            <input v-model="keyword" type="text" placeholder="搜索商品" @confirm="searchItems" />
            <button @click="searchItems">搜索</button>
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
import {getItemsBySearch} from "@/request/market.js"
export default {
    data() {
        return {
            keyword: '',
			page:1,
            items: [],
            loading: true
        };
    },
    async onLoad(options) {
        this.keyword = options.keyword;
        let _=await this.searchItems();
    },
    methods: {
        async searchItems() {
            this.loading = true;
			this.page=1;
			this.items=await getItemsBySearch(this.keyword,this.page);
            this.loading = false;
        },
        async loadMore() {
            this.loading = true;
			this.page++;
			let res=await getItemsBySearch(this.keyword,this.page);
            this.items = this.items.concat(res);
            this.loading = false;
        },
        goToItemDetail(itemId) {
            uni.navigateTo({
                url: `/pages/market/item?id=${itemId}`
            });
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
    padding: 0 20px;
    background-color: #007aff;
    color: white;
    border: none;
    border-radius: 5px;
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