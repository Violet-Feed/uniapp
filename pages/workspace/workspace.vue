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
          <!-- status = 1 生成中 -->
          <view
            v-if="material.status === 1 || material.uiStatus === 'generating'"
            class="card-generating"
          >
            <view class="generating-overlay">
              <view class="loading-spinner"></view>
              <text class="generating-text">生成中...</text>
            </view>
            <image
              class="card-image blurred"
              :src="material.cover_url || material.material_url || '/static/images/placeholder.png'"
              mode="aspectFill"
            ></image>
          </view>

          <!-- status = 3 生成失败 -->
          <view
            v-else-if="material.status === 3 || material.uiStatus === 'failed'"
            class="card-generating"
          >
            <view class="generating-overlay failed">
              <text class="failed-icon">⚠</text>
              <text class="generating-text">生成失败</text>
            </view>
            <image
              class="card-image"
              :src="material.cover_url || material.material_url || '/static/images/default.png'"
              mode="aspectFill"
              @error="handleImageError(material)"
            ></image>
          </view>

          <!-- status = 2 成功 / 4 已删除 / 其它默认 -->
          <view v-else>
            <image
              class="card-image"
              :src="material.cover_url || material.material_url || '/static/images/default.png'"
              mode="aspectFill"
              @error="handleImageError(material)"
            ></image>
          </view>

          <view class="card-title-container">
            <text class="card-title">
              {{ material.displayTitle || material.prompt || '未命名作品' }}
            </text>
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
          :class="{ disabled: !canGenerate || generating }"
          @click="handleGenerate"
        >
          <text class="generate-icon">✨</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getMaterialByUser, createMaterial } from '@/request/creation.js'
import { uploadImage } from '@/request/common.js'

export default {
  data() {
    return {
      // 素材列表
      materials: [],
      loading: false,

      // 分页
      page: 1,
      hasMore: true,
      isLoadingMore: false,

      // 输入相关
      prompt: '',
      uploadedImage: '',       // 本地预览用
      uploadedSourceUrl: '',   // 后端返回的 source_url
      generationType: 'image', // 'image' 或 'video'
      generating: false
    }
  },
  computed: {
    canGenerate() {
      return this.prompt.trim().length > 0
    }
  },
  onLoad() {
    this.loadMaterials(true)
    uni.$on('material', this.handleMaterialEvent)
  },
  onUnload() {
    uni.$off('material', this.handleMaterialEvent)
  },
  onReachBottom() {
    this.loadMaterials(false)
  },
  onPullDownRefresh() {
    const p = this.loadMaterials(true)
    Promise.resolve(p).finally(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    mapStatusToUi(status) {
      if (status === 1) return 'generating'
      if (status === 2) return 'succeeded'
      if (status === 3) return 'failed'
      if (status === 4) return 'deleted'
      return 'generating'
    },

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
        const list = Array.isArray(res)
          ? res
          : (res && Array.isArray(res.material) ? res.material : [])

        if (!list || list.length === 0) {
          this.hasMore = false
          return
        }

        const mapped = list.map(item => {
          const createTime = item.create_time || Date.now()
          const status = item.status != null ? item.status : 1
          return {
            ...item,
            status,
            uiStatus: this.mapStatusToUi(status),
            displayTitle: item.prompt || '未命名作品',
            create_time: createTime,
            displayTime: this.formatRelativeTime(createTime)
          }
        })

        if (reset) {
          this.materials = mapped
        } else {
          this.materials = this.materials.concat(mapped)
        }

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

    formatRelativeTime(msTimestamp) {
      if (!msTimestamp) return ''
      if (msTimestamp < 1e12) {
        msTimestamp = msTimestamp * 1000
      }

      const now = new Date()
      const target = new Date(msTimestamp)
      const nowMs = now.getTime()
      const diffMs = nowMs - msTimestamp
      const diffSec = Math.floor(diffMs / 1000)

      if (diffSec < 60) {
        return '刚刚'
      }
      if (diffSec < 3600) {
        const m = Math.floor(diffSec / 60)
        return `${m}分钟前`
      }

      const oneDayMs = 24 * 60 * 60 * 1000
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime()

      const pad2 = (n) => (n < 10 ? '0' + n : '' + n)
      const hhmm = `${pad2(target.getHours())}:${pad2(target.getMinutes())}`

      if (msTimestamp >= todayStart) {
        return `今天 ${hhmm}`
      }
      if (msTimestamp >= todayStart - oneDayMs) {
        return `昨天 ${hhmm}`
      }

      const diffDay = Math.floor(diffMs / oneDayMs)
      if (diffDay < 7) {
        return `${diffDay}天前`
      }

      const year = target.getFullYear()
      const month = target.getMonth() + 1
      const day = target.getDate()

      if (year !== now.getFullYear()) {
        return `${year}年${month}月${day}日`
      }
      return `${month}月${day}日`
    },

    handleMaterialEvent(data) {
      if (!data || !data.material_id) return

      const idStr = String(data.material_id)
      const idx = this.materials.findIndex(m => String(m.material_id) === idStr)
	  let createTime = data.create_time
	  if (typeof createTime === 'bigint') {
	    createTime = Number(createTime)
	  }
	  if (!createTime) {
	    createTime = Date.now()
	  }
      const status = data.status != null ? data.status : 1

      if (idx !== -1) {
        const origin = this.materials[idx]
        const updated = {
          ...origin,
          material_id: idStr,
          material_type: data.material_type != null ? data.material_type : origin.material_type,
          material_url: data.material_url != null ? data.material_url : origin.material_url,
          cover_url: data.cover_url != null ? data.cover_url : origin.cover_url,
          status,
          uiStatus: this.mapStatusToUi(status),
          create_time: createTime,
          displayTime: this.formatRelativeTime(createTime)
        }
        this.$set(this.materials, idx, updated)
      } else {
        this.materials.unshift({
          material_id: idStr,
          material_type: data.material_type || 1,
          material_url: data.material_url || '',
          cover_url: data.cover_url || '',
          status,
          uiStatus: this.mapStatusToUi(status),
          prompt: '',
          displayTitle: '未命名作品',
          create_time: createTime,
          displayTime: this.formatRelativeTime(createTime)
        })
      }
    },

    selectType(type) {
      this.generationType = type
    },

    // 选择图片后立即上传，拿到 source_url
    uploadImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const localPath = res.tempFilePaths[0]
          this.uploadedImage = localPath
          this.uploadedSourceUrl = ''

          uni.showLoading({ title: '上传中...' })
          try {
            // 这里的 '/file/upload' 要和后端控制器路径对应
            const uploadRes = await uploadImage(localPath, 'material_source', '')
            if (!uploadRes || !uploadRes.source_url) {
              this.uploadedImage = ''
              uni.showToast({
                title: '上传失败',
                icon: 'none'
              })
              return
            }
            this.uploadedSourceUrl = uploadRes.source_url
          } catch (e) {
            console.error('图片上传失败', e)
            this.uploadedImage = ''
            uni.showToast({
              title: '上传失败',
              icon: 'none'
            })
          } finally {
            uni.hideLoading()
          }
        },
        fail: (err) => {
          console.error('选择图片失败：', err)
        }
      })
    },

    deleteUploadedImage() {
      this.uploadedImage = ''
      this.uploadedSourceUrl = ''
    },

    // 调用 createMaterial，不再上传图片
    async handleGenerate() {
      if (!this.canGenerate || this.generating) {
        if (!this.canGenerate) {
          uni.showToast({
            title: '请输入提示词',
            icon: 'none'
          })
        }
        return
      }

      // 如果用户选了图片，但还没拿到 source_url，则不允许生成
      if (this.uploadedImage && !this.uploadedSourceUrl) {
        uni.showToast({
          title: '图片上传中，请稍后重试',
          icon: 'none'
        })
        return
      }

      this.generating = true
      const now = Date.now()
      const localId = `local-${now}`

      const localMaterial = {
        material_id: localId,
        material_type: this.generationType === 'video' ? 2 : 1,
        prompt: this.prompt.trim(),
        source_url: this.uploadedSourceUrl || '',
        material_url: this.uploadedImage || '/static/images/placeholder.png',
        cover_url: this.uploadedImage || '/static/images/placeholder.png',
        model: '',
        create_time: now,
        status: 1,
        uiStatus: 'generating',
        displayTitle:
          this.prompt.length > 20 ? this.prompt.substring(0, 20) + '...' : this.prompt || '未命名作品',
        displayTime: this.formatRelativeTime(now)
      }
      this.materials.unshift(localMaterial)

      try {
        const payload = {
          materialType: this.generationType === 'video' ? 2 : 1,
          prompt: this.prompt.trim(),
          sourceUrl: this.uploadedSourceUrl || ''
        }

        const data = await createMaterial(payload)
        if (data && data.material_id) {
          const idx = this.materials.findIndex(m => m.material_id === localId)
          if (idx !== -1) {
            const ct = this.materials[idx].create_time || now
            const status = data.status != null ? data.status : 1
            const updated = {
              ...this.materials[idx],
              material_id: String(data.material_id),
              material_type: data.material_type != null
                ? data.material_type
                : this.materials[idx].material_type,
              material_url: data.material_url || this.materials[idx].material_url,
              cover_url: data.cover_url || this.materials[idx].cover_url,
              status,
              uiStatus: this.mapStatusToUi(status),
              create_time: ct,
              displayTime: this.formatRelativeTime(ct)
            }
            this.$set(this.materials, idx, updated)
          }
        }

        uni.showToast({
          title: '开始生成',
          icon: 'success'
        })
      } catch (err) {
        console.error('生成素材失败：', err)
        uni.showToast({
          title: '生成失败',
          icon: 'none'
        })
        const idx = this.materials.findIndex(m => m.material_id === localId)
        if (idx !== -1) {
          const failed = {
            ...this.materials[idx],
            status: 3,
            uiStatus: 'failed',
            displayTime: this.formatRelativeTime(this.materials[idx].create_time)
          }
          this.$set(this.materials, idx, failed)
        }
      } finally {
        this.generating = false
        this.prompt = ''
        this.uploadedImage = ''
        this.uploadedSourceUrl = ''
      }
    },

    handleImageError(material) {
      if (material) {
        material.cover_url = '/static/images/default.png'
        material.material_url = '/static/images/default.png'
      }
    },

    // 只允许 status=2（Succeeded）点击进入发布
    goToMaterialDetail(material) {
      const status = material.status
      if (status === 1 || status === 3 || status === 4) {
        const msg =
          status === 1
            ? '生成中，请稍候'
            : status === 3
            ? '生成失败，无法发布'
            : '素材已删除'
        uni.showToast({
          title: msg,
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
/* 样式不变，沿用你之前那份 */
.container {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  background-color: #f5f5f7;
  min-height: 100vh;
  padding-bottom: 180rpx;
}

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

.card-image {
  width: 100%;
  height: 240px;
  object-fit: cover;
}

.card-image.blurred {
  filter: blur(4px);
  opacity: 0.6;
}

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

.generating-overlay.failed {
  background: rgba(0, 0, 0, 0.5);
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

.failed-icon {
  font-size: 20px;
  color: #ffdf5d;
}

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

.load-more-footer {
  text-align: center;
  padding: 16px 0 80px;
  font-size: 24rpx;
  color: #999;
}

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

.uploaded-image-container {
  position: relative;
  margin-bottom: 12px;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e5e5e5;
  box-sizing: border-box;
}

.uploaded-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.delete-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 22px;
  height: 22px;
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
