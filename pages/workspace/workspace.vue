<template>
    <view class="container">
        <!-- 顶部：双列素材草稿列表 -->
        <view class="material-grid-container">
            <view v-if="loading && materials.length === 0" class="initial-loading">加载中...</view>

            <view class="material-grid" v-else-if="materials.length > 0">
                <view
                    class="material-card"
                    v-for="(material, index) in materials"
                    :key="`material-${material.material_id || index}`"
                    @click="goToMaterialDetail(material)"
                >
                    <!-- 生成中状态（status 数字 / uiStatus 兼容） -->
                    <view v-if="material.uiStatus === 'generating' || material.status === 1" class="card-generating">
                        <view class="generating-overlay">
                            <view class="loading-spinner"></view>
                            <text class="generating-text">生成中...</text>
                        </view>
                        <image
                            class="card-image blurred"
                            :src="material.material_url || '/static/images/placeholder.png'"
                            mode="aspectFill"
                        ></image>
                    </view>

                    <!-- 正常状态 -->
                    <view v-else>
                        <image
                            class="card-image"
                            :src="material.material_url || '/static/images/default.png'"
                            mode="aspectFill"
                            @error="handleImageError(material)"
                        ></image>
                    </view>

                    <view class="card-title-container">
                        <text class="card-title">{{ material.displayTitle || material.prompt || '未命名作品' }}</text>
                    </view>
                    <view class="card-meta">
                        <text class="card-type-tag">
                            {{ material.material_type === 2 ? '视频' : '图片' }}
                        </text>
                        <text class="card-time">{{ material.displayTime }}</text>
                    </view>
                </view>
            </view>

            <view v-else class="empty-state">
                <text class="empty-icon">🎨</text>
                <text class="empty-text">还没有创作，快来生成第一个作品吧！</text>
            </view>

            <!-- 底部加载更多提示 -->
            <view v-if="materials.length > 0" class="load-more-footer">
                <text v-if="isLoadingMore">加载中...</text>
                <text v-else-if="!hasMore">没有更多了</text>
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
import { getMaterialByUser } from '@/request/creation.js'

export default {
    data() {
        return {
            // 素材列表
            materials: [],
            loading: false,

            // 分页相关
            page: 1,
            hasMore: true,
            isLoadingMore: false,

            // 输入相关
            prompt: '',
            uploadedImage: '',
            generationType: 'image', // 'image' 或 'video'

            // 生成计数器（仅用于本地 mock 随机图）
            generationCounter: 1
        }
    },
    computed: {
        canGenerate() {
            return this.prompt.trim().length > 0
        }
    },
    onLoad() {
        // 首次加载第一页数据
        this.loadMaterials(true)
    },
    // uni-app 触底加载更多
    onReachBottom() {
        this.loadMaterials(false)
    },
    methods: {
        /**
         * 加载素材列表
         * @param {Boolean} reset 是否重置（true: 从第一页重新拉取）
         */
        async loadMaterials(reset = false) {
            if (this.loading || this.isLoadingMore) return
            if (!reset && !this.hasMore) return

            if (reset) {
                this.page = 1
                this.hasMore = true
                this.materials = []
                this.loading = true
                this.isLoadingMore = false
            } else {
                this.loading = false
                this.isLoadingMore = true
            }

            try {
                const res = await getMaterialByUser(this.page)
                // 兼容返回结构：可能是 { material: [...] } 也可能直接是 [...]
                const list = Array.isArray(res)
                    ? res
                    : (res && Array.isArray(res.material) ? res.material : [])

                if (!list || list.length === 0) {
                    // 没有更多了
                    this.hasMore = false
                    return
                }

                const mapped = list.map(item => {
                    const createTime = item.create_time || Date.now()
                    return {
                        ...item,
                        // UI 上使用的字段
                        displayTitle: item.prompt || '未命名作品',
                        displayTime: this.formatTime(createTime),
                        // 把后端 status 数字转成 UI 状态
                        // 假设：1=生成中，2=完成（可按你真实枚举改）
                        uiStatus: item.status === 1 ? 'generating' : 'completed'
                    }
                })

                if (reset) {
                    this.materials = mapped
                } else {
                    this.materials = this.materials.concat(mapped)
                }

                // 当前页加载成功，准备下一页
                this.page += 1
            } catch (err) {
                console.error('加载素材失败：', err)
                uni.showToast({
                    title: '加载失败',
                    icon: 'none'
                })
            } finally {
                this.loading = false
                this.isLoadingMore = false
            }
        },

        // 简单时间格式化（毫秒时间戳 -> yyyy-MM-dd HH:mm）
        formatTime(timestamp) {
            try {
                const date = new Date(timestamp)
                const y = date.getFullYear()
                const m = (date.getMonth() + 1).toString().padStart(2, '0')
                const d = date.getDate().toString().padStart(2, '0')
                const hh = date.getHours().toString().padStart(2, '0')
                const mm = date.getMinutes().toString().padStart(2, '0')
                return `${y}-${m}-${d} ${hh}:${mm}`
            } catch (e) {
                return ''
            }
        },

        // 选择生成类型
        selectType(type) {
            this.generationType = type
        },

        // 上传图片
        uploadImage() {
            uni.chooseImage({
                count: 1,
                sizeType: ['compressed'],
                sourceType: ['album', 'camera'],
                success: (res) => {
                    this.uploadedImage = res.tempFilePaths[0]
                },
                fail: (err) => {
                    console.error('选择图片失败：', err)
                }
            })
        },

        // 删除上传的图片
        deleteUploadedImage() {
            this.uploadedImage = ''
        },

        // 处理生成（前端先插一张“生成中”的卡片）
        handleGenerate() {
            if (!this.canGenerate) {
                uni.showToast({
                    title: '请输入提示词',
                    icon: 'none'
                })
                return
            }

            const now = Date.now()

            // 创建新的"生成中"素材卡片（本地）
            const newMaterial = {
                material_id: `mat-gen-${now}`,
                material_type: this.generationType === 'video' ? 2 : 1,
                user_id: '', // 可按实际补
                prompt: this.prompt,
                source_url: this.uploadedImage || '',
                material_url: this.uploadedImage || '/static/images/placeholder.png',
                model: '',
                create_time: now,
                status: 1,               // 1 表示生成中（假定）
                uiStatus: 'generating',  // UI 用
                displayTitle: this.prompt.length > 20
                    ? this.prompt.substring(0, 20) + '...'
                    : this.prompt,
                displayTime: '刚刚'
            }

            // 在列表第一个位置插入
            this.materials.unshift(newMaterial)

            uni.showToast({
                title: '开始生成',
                icon: 'success'
            })

            // TODO: 这里本来应该调用后端生成接口
            // 下方仍然保留一个本地模拟生成完成的逻辑
            setTimeout(() => {
                this.simulateGenerationComplete(newMaterial.material_id)
            }, 5000)

            // 清空输入
            this.prompt = ''
            this.uploadedImage = ''
        },

        // 模拟生成完成（仅前端效果，真实项目用后端回调/轮询替换）
        simulateGenerationComplete(materialId) {
            const index = this.materials.findIndex(m => m.material_id === materialId)
            if (index !== -1) {
                this.materials[index].status = 2
                this.materials[index].uiStatus = 'completed'
                this.materials[index].material_url =
                    `https://picsum.photos/id/${200 + this.generationCounter}/400/300`
                this.materials[index].displayTime = this.formatTime(Date.now())
                this.generationCounter++

                uni.showToast({
                    title: '生成完成',
                    icon: 'success'
                })
            }
        },

        // 图片加载错误处理
        handleImageError(material) {
            if (material) {
                material.material_url = '/static/images/default.png'
            }
        },

		// 跳转到发布页
		goToMaterialDetail(material) {
			// 生成中不允许进入发布
			if (material.uiStatus === 'generating' || material.status === 1) {
				uni.showToast({
					title: '生成中，请稍候',
					icon: 'none'
				})
				return
			}

			const materialId = material.material_id || ''
			const materialType = material.material_type || 1
			const materialUrl = encodeURIComponent(material.material_url || '')

			uni.navigateTo({
				url: `/pages/workspace/publish?material_id=${materialId}&material_type=${materialType}&material_url=${materialUrl}`
			})
		}
		
    }
}
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

/* ==================== 顶部：双列素材列表 ==================== */
.material-grid-container {
    padding: 12px 6px;
    box-sizing: border-box;
}

.initial-loading,
.empty-state {
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

.material-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.material-card {
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
    to {
        transform: rotate(360deg);
    }
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

/* 底部“加载更多”提示 */
.load-more-footer {
    text-align: center;
    padding: 16px 0 80px;
    font-size: 24rpx;
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
