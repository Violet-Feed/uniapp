<template>
    <view class="container">
        <!-- 自定义导航栏 -->
        <view class="nav-bar">
            <view class="nav-back" @click="goBack">
                <text class="nav-back-icon">←</text>
                <text class="nav-back-text">返回</text>
            </view>
            <view class="nav-title">发布创作</view>
        </view>

        <!-- 主体内容 -->
        <view class="content">
            <!-- 素材预览 -->
            <view class="section">
                <view class="section-title">素材预览</view>
                <view class="preview-box">
                    <video
                        v-if="isVideo"
                        class="preview-video"
                        :src="materialUrl"
                        controls
                        show-center-play-btn
                    ></video>
                    <image
                        v-else
                        class="preview-image"
                        :src="materialUrl"
                        mode="aspectFill"
                    ></image>
                </view>
            </view>

            <!-- 标题 -->
            <view class="section">
                <view class="section-title">标题</view>
                <input
                    class="input"
                    v-model="title"
                    placeholder="请输入标题"
                    maxlength="50"
                />
                <view class="input-counter">{{ title.length }}/50</view>
            </view>

            <!-- 正文内容 -->
            <view class="section">
                <view class="section-title">内容</view>
                <textarea
                    class="textarea"
                    v-model="content"
                    placeholder="写点说明、心情或者创作故事..."
                    maxlength="500"
                    auto-height
                />
                <view class="input-counter">{{ content.length }}/500</view>
            </view>

            <!-- 类目选择 -->
            <view class="section">
                <view class="section-title">类目</view>
                <picker
                    mode="selector"
                    :range="categoryOptions"
                    range-key="label"
                    :value="selectedCategoryIndex"
                    @change="onCategoryChange"
                >
                    <view class="picker-box">
                        <text
                            class="picker-text"
                            :class="{ placeholder: selectedCategoryIndex === -1 }"
                        >
                            {{
                                selectedCategoryIndex === -1
                                    ? '请选择类目'
                                    : categoryOptions[selectedCategoryIndex].label
                            }}
                        </text>
                        <!-- 改成简单的符号，保证显示 -->
                        <text class="picker-icon">▼</text>
                    </view>
                </picker>
            </view>
        </view>

        <!-- 底部发布按钮 -->
        <view class="bottom-bar">
            <button
                class="publish-btn"
                :class="{ disabled: !canPublish }"
                @click="handlePublish"
            >
                发布
            </button>
        </view>
    </view>
</template>

<script>
import { createCreation } from '@/request/creation.js' // 按你的实际接口名调整
export default {
    data() {
        return {
            materialId: '',
            materialType: 1, // 1: 图片  2: 视频
            materialUrl: '',

            title: '',
            content: '',
            categoryOptions: [
                { label: '生活', value: 'life' },
                { label: '社会', value: 'society' },
                { label: '科技', value: 'tech' },
                { label: '娱乐', value: 'entertainment' }
            ],
            selectedCategoryIndex: -1
        }
    },
    computed: {
        isVideo() {
            return Number(this.materialType) === 2
        },
        canPublish() {
            return (
                this.title.trim().length > 0 &&
                this.selectedCategoryIndex !== -1
            )
        },
        selectedCategory() {
            if (this.selectedCategoryIndex === -1) return null
            return this.categoryOptions[this.selectedCategoryIndex]
        }
    },
    onLoad(options) {
        // 1. 接收列表页传来的参数
        this.materialId = BigInt(options.material_id)
        this.materialType = Number(options.material_type)

        // 把 encodeURIComponent 过的 URL decode 回来
        this.materialUrl = options.material_url
            ? decodeURIComponent(options.material_url)
            : ''
    },
    methods: {
        goBack() {
            uni.navigateBack()
        },

        onCategoryChange(e) {
            this.selectedCategoryIndex = Number(e.detail.value)
        },

        async handlePublish() {
            if (!this.canPublish) {
                uni.showToast({
                    title: '请填写标题并选择类目',
                    icon: 'none'
                })
                return
            }

            const payload = {
                material_id: this.materialId,
                material_type: this.materialType,
                material_url: this.materialUrl,
                title: this.title.trim(),
                content: this.content.trim(),
                category: this.selectedCategory ? this.selectedCategory.value : ''
            }

            try {
                await createCreation(payload)

                uni.showToast({
                    title: '发布成功',
                    icon: 'success'
                })

                setTimeout(() => {
                    uni.navigateBack()
                }, 800)
            } catch (err) {
                console.error('发布失败：', err)
                uni.showToast({
                    title: '发布失败，请稍后重试',
                    icon: 'none'
                })
            }
        }
    }
}
</script>

<style scoped>
.container {
    background-color: #f5f5f7;
    min-height: 100vh;
}

/* 自定义导航栏 */
.nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 88rpx;
    padding: 0 16rpx;
    display: flex;
    align-items: center;
    background-color: #ffffff;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
    z-index: 100;
}

.nav-back {
    display: flex;
    align-items: center;
    padding: 10rpx 10rpx 10rpx 0;
}

.nav-back-icon {
    font-size: 34rpx;
    margin-right: 4rpx;
}

.nav-back-text {
    font-size: 28rpx;
}

.nav-title {
    flex: 1;
    text-align: center;
    font-size: 32rpx;
    font-weight: 600;
    margin-right: 80rpx; /* 避免被返回按钮覆盖 */
}

/* 主体内容 */
.content {
    padding: 100rpx 12px 120rpx; /* 顶部留给导航栏，底部留给按钮 */
    box-sizing: border-box;
}

.section {
    margin-bottom: 16px;
}

.section-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
}

/* 预览区域：宽高比和列表保持一致（半屏宽 + 240px 高） */
.preview-box {
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);

    /* 关键改动：宽度收窄到接近两列卡片的宽度 */
    width: 48%;
    margin: 0 auto;  /* 居中 */
    padding: 0;
}

.preview-image,
.preview-video {
    width: 100%;
    height: 240px;   /* 和列表 .card-image 高度一致 */
    border-radius: 0;
    object-fit: cover;
}

/* 统一宽度：input / textarea / picker */
.input,
.textarea,
.picker-box {
    width: 100%;
    box-sizing: border-box;
}

/* 输入区域 */
.input {
    background: #fff;
    border-radius: 10px;
    padding: 0 12px;
    height: 80rpx;
    font-size: 28rpx;
}

.textarea {
    background: #fff;
    border-radius: 10px;
    padding: 8px 12px;
    min-height: 160rpx;
    font-size: 28rpx;
}

.input-counter {
    text-align: right;
    font-size: 22rpx;
    color: #aaa;
    margin-top: 4px;
}

/* 类目选择 */
.picker-box {
    background: #fff;
    border-radius: 10px;
    padding: 0 12px;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.picker-text {
    font-size: 28rpx;
    color: #333;
}

.picker-text.placeholder {
    color: #aaa;
}

.picker-icon {
    font-size: 26rpx;
    color: #aaa;
}

/* 底部发布按钮 */
.bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 8px 16px 16px;
    background: #ffffff;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
    z-index: 90;
}

.publish-btn {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 44rpx;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    font-size: 30rpx;
    border: none;
}

.publish-btn.disabled {
    opacity: 0.4;
}
</style>
