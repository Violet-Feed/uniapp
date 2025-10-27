<template>
    <view class="container">
        <!-- 顶部：双列创作草稿列表 -->
        <view class="creation-grid-container">
            <view v-if="loading && creations.length === 0" class="initial-loading">加载中...</view>

            <view class="creation-grid" v-else-if="creations.length > 0">
                <view 
                    class="creation-card" 
                    v-for="(creation, index) in creations" 
                    :key="`creation-${creation.creation_id}-${index}`" 
                    @click="goToCreationDetail(creation)"
                >
                    <!-- 生成中状态 -->
                    <view v-if="creation.status === 'generating'" class="card-generating">
                        <view class="generating-overlay">
                            <view class="loading-spinner"></view>
                            <text class="generating-text">生成中...</text>
                        </view>
                        <image 
                            class="card-image blurred" 
                            :src="creation.image || '/static/images/placeholder.png'" 
                            mode="aspectFill"
                        ></image>
                    </view>
                    
                    <!-- 正常状态 -->
                    <view v-else>
                        <image 
                            class="card-image" 
                            :src="creation.image || '/static/images/default.png'" 
                            mode="aspectFill"
                            @error="handleImageError(creation)"
                        ></image>
                    </view>
                    
                    <view class="card-title-container">
                        <text class="card-title">{{ creation.title }}</text>
                    </view>
                    <view class="card-meta">
                        <text class="card-type-tag">{{ creation.type === 'video' ? '视频' : '图片' }}</text>
                        <text class="card-time">{{ creation.time }}</text>
                    </view>
                </view>
            </view>

            <view v-else class="empty-state">
                <text class="empty-icon">🎨</text>
                <text class="empty-text">还没有创作，快来生成第一个作品吧！</text>
            </view>
        </view>

        <!-- 底部：输入区域（固定在底部） -->
        <view class="input-container">
            <!-- 图片/视频选择器 -->
            <view class="type-selector">
                <view 
                    class="type-option" 
                    :class="{ active: generationType === 'image' }"
                    @click="selectType('image')"
                >
                    <text class="type-icon">🖼️</text>
                    <text class="type-text">图片</text>
                </view>
                <view 
                    class="type-option" 
                    :class="{ active: generationType === 'video' }"
                    @click="selectType('video')"
                >
                    <text class="type-icon">🎬</text>
                    <text class="type-text">视频</text>
                </view>
            </view>

            <!-- 上传的图片预览 -->
            <view v-if="uploadedImage" class="uploaded-image-container">
                <image class="uploaded-image" :src="uploadedImage" mode="aspectFill"></image>
                <view class="delete-btn" @click="deleteUploadedImage">
                    <text class="delete-icon">✕</text>
                </view>
            </view>

            <!-- 输入框和按钮区域 -->
            <view class="input-row">
                <!-- 上传图片按钮 -->
                <view class="upload-btn" @click="uploadImage">
                    <text class="upload-icon">📎</text>
                </view>

                <!-- 提示词输入框 -->
                <input 
                    class="prompt-input" 
                    v-model="prompt" 
                    placeholder="输入提示词，描述你想生成的内容..."
                    :adjust-position="true"
                    confirm-type="send"
                    @confirm="handleGenerate"
                />

                <!-- 生成按钮 -->
                <view 
                    class="generate-btn" 
                    :class="{ disabled: !canGenerate }"
                    @click="handleGenerate"
                >
                    <text class="generate-icon">✨</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            // 创作列表
            creations: [],
            loading: false,
            
            // 输入相关
            prompt: '',
            uploadedImage: '',
            generationType: 'image', // 'image' 或 'video'
            
            // 生成计数器
            generationCounter: 1
        };
    },
    computed: {
        canGenerate() {
            return this.prompt.trim().length > 0;
        }
    },
    onLoad() {
        this.loadInitialData();
    },
    methods: {
        // 加载初始数据（模拟历史草稿）
        async loadInitialData() {
            this.loading = true;
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                this.creations = [
                    {
                        creation_id: 'cre-001',
                        image: 'https://picsum.photos/id/237/400/300',
                        title: '梦幻森林场景',
                        type: 'image',
                        time: '2小时前',
                        status: 'completed'
                    },
                    {
                        creation_id: 'cre-002',
                        image: 'https://picsum.photos/id/119/400/300',
                        title: '未来城市概念图',
                        type: 'video',
                        time: '5小时前',
                        status: 'completed'
                    }
                ];
            } catch (err) {
                console.error("加载失败：", err);
            } finally {
                this.loading = false;
            }
        },

        // 选择生成类型
        selectType(type) {
            this.generationType = type;
        },

        // 上传图片
        uploadImage() {
            uni.chooseImage({
                count: 1,
                sizeType: ['compressed'],
                sourceType: ['album', 'camera'],
                success: (res) => {
                    this.uploadedImage = res.tempFilePaths[0];
                },
                fail: (err) => {
                    console.error('选择图片失败：', err);
                }
            });
        },

        // 删除上传的图片
        deleteUploadedImage() {
            this.uploadedImage = '';
        },

        // 处理生成
        handleGenerate() {
            if (!this.canGenerate) {
                uni.showToast({
                    title: '请输入提示词',
                    icon: 'none'
                });
                return;
            }

            // 创建新的"生成中"卡片
            const newCreation = {
                creation_id: `cre-gen-${Date.now()}`,
                image: this.uploadedImage || '/static/images/placeholder.png',
                title: this.prompt.substring(0, 20) + (this.prompt.length > 20 ? '...' : ''),
                type: this.generationType,
                time: '刚刚',
                status: 'generating'
            };

            // 在列表第一个位置插入
            this.creations.unshift(newCreation);

            // 显示提示
            uni.showToast({
                title: '开始生成',
                icon: 'success'
            });

            // 模拟生成完成（实际应该调用后端API）
            setTimeout(() => {
                this.simulateGenerationComplete(newCreation.creation_id);
            }, 5000);

            // 清空输入
            this.prompt = '';
            this.uploadedImage = '';
        },

        // 模拟生成完成
        simulateGenerationComplete(creationId) {
            const index = this.creations.findIndex(c => c.creation_id === creationId);
            if (index !== -1) {
                this.creations[index].status = 'completed';
                this.creations[index].image = `https://picsum.photos/id/${200 + this.generationCounter}/400/300`;
                this.generationCounter++;
                
                uni.showToast({
                    title: '生成完成',
                    icon: 'success'
                });
            }
        },

        // 图片加载错误处理
        handleImageError(creation) {
            if (creation) {
                creation.image = '/static/images/default.png';
            }
        },

        // 跳转到详情页
        goToCreationDetail(creation) {
            if (creation.status === 'generating') {
                uni.showToast({
                    title: '生成中，请稍候',
                    icon: 'none'
                });
                return;
            }
            uni.navigateTo({
                url: `/pages/creation/detail?id=${creation.creation_id}`
            });
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
    padding-bottom: 180rpx; /* 为底部输入区域留出空间 */
}

/* ==================== 顶部：双列创作列表 ==================== */
.creation-grid-container {
    padding: 12px 6px;
    box-sizing: border-box;
}

.initial-loading, .empty-state {
    padding: 100rpx 0;
    text-align: center;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.empty-icon {
    font-size: 80rpx;
    margin-bottom: 20rpx;
}

.empty-text {
    font-size: 28rpx;
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
    position: relative;
}

/* 卡片图片 */
.card-image {
    width: 100%;
    height: 240px;
    object-fit: cover;
}

.card-image.blurred {
    filter: blur(4px);
    opacity: 0.6;
}

/* 生成中状态 */
.card-generating {
    position: relative;
}

.generating-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    z-index: 10;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.generating-text {
    margin-top: 12px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
}

/* 卡片标题 */
.card-title-container {
    padding: 8px 8px 6px;
}

.card-title {
    font-size: 12px;
    line-height: 1.4;
    color: #333;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
}

/* 卡片元信息 */
.card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px 8px;
}

.card-type-tag {
    font-size: 10px;
    color: #fff;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2px 8px;
    border-radius: 10px;
}

.card-time {
    font-size: 11px;
    color: #999;
}

/* ==================== 底部：输入区域 ==================== */
.input-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-top: 1px solid #e5e5e5;
    padding: 12px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
    z-index: 100;
}

/* 类型选择器 */
.type-selector {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
}

.type-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    background: #f5f5f7;
    border-radius: 8px;
    border: 2px solid transparent;
    transition: all 0.3s;
}

.type-option.active {
    background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
    border-color: #667eea;
}

.type-icon {
    font-size: 18px;
}

.type-text {
    font-size: 14px;
    color: #333;
    font-weight: 500;
}

/* 上传的图片预览 */
.uploaded-image-container {
    position: relative;
    margin-bottom: 12px;
    width: 80px;
    height: 80px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid #e5e5e5;
}

.uploaded-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.delete-btn {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 24px;
    height: 24px;
    background: #ff4444;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.delete-icon {
    color: #fff;
    font-size: 14px;
    font-weight: bold;
}

/* 输入框行 */
.input-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.upload-btn {
    width: 40px;
    height: 40px;
    background: #f5f5f7;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.upload-icon {
    font-size: 20px;
}

.prompt-input {
    flex: 1;
    height: 40px;
    background: #f5f5f7;
    border-radius: 20px;
    padding: 0 16px;
    font-size: 14px;
}

.generate-btn {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.3s;
}

.generate-btn.disabled {
    opacity: 0.4;
}

.generate-icon {
    font-size: 20px;
}
</style>