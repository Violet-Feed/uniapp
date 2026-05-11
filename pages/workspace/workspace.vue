<template>
  <view class="container">
    <!-- 顶部固定安全栏：遮住状态栏 / 刘海区域，避免滚动内容透上去 -->
    <view class="safe-status-bar" :style="safeStatusBarStyle"></view>

    <!-- 顶部：双列素材草稿列表 -->
    <view class="material-grid-container" :style="materialGridContainerStyle">
      <view v-if="loading && materials.length === 0" class="initial-loading">加载中...</view>

      <view class="material-grid" v-else-if="materials.length > 0">
        <view
          class="material-card"
          v-for="(material, index) in materials"
          :key="'material-' + (material.material_id || index)"
          :style="materialCardStyle"
          @click="goToMaterialDetail(material)"
          @longpress="showMaterialOptions(material, index)"
        >
          <!-- 封面区域：按整屏高度计算，一屏约 2.5 个素材高度 -->
          <view class="image-wrapper" :style="imageWrapperStyle">
            <!-- status = 1 生成中 -->
            <view
              v-if="material.status === 1 || material.uiStatus === 'generating'"
              class="card-generating"
            >
              <image
                class="card-image blurred"
                :src="material.cover_url || material.material_url || '/static/images/placeholder.png'"
                mode="aspectFill"
              ></image>
              <view class="generating-overlay">
                <view class="loading-spinner"></view>
                <text class="generating-text">生成中...</text>
              </view>
            </view>

            <!-- status = 3 生成失败 -->
            <view
              v-else-if="material.status === 3 || material.uiStatus === 'failed'"
              class="card-generating"
            >
              <image
                class="card-image"
                :src="material.cover_url || material.material_url || '/static/images/default.png'"
                mode="aspectFill"
                @error="handleImageError(material)"
              ></image>
              <view class="generating-overlay failed">
                <text class="failed-icon">⚠</text>
                <text class="generating-text">生成失败</text>
              </view>
            </view>

            <!-- status = 2 成功 / 4 已删除 / 其它默认 -->
            <image
              v-else
              class="card-image"
              :src="material.cover_url || material.material_url || '/static/images/default.png'"
              mode="aspectFill"
              @error="handleImageError(material)"
            ></image>
          </view>

          <!-- 信息区：固定高度，避免提示词一行时日期上跳 -->
          <view class="card-content" :style="cardContentStyle">
            <view class="card-title-container">
              <text class="card-title">
                {{ material.displayTitle || material.prompt || '未命名作品' }}
              </text>
            </view>

            <view class="card-meta">
              <text class="card-type-tag">
                {{ Number(material.material_type) === 2 ? '视频' : '图片' }}
              </text>
              <text class="card-time">{{ material.displayTime }}</text>
            </view>
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

    <!-- 长按素材操作菜单：无取消项，点遮罩关闭，删除红色字体 -->
    <view
      v-if="materialAction.visible"
      class="material-action-mask"
      @click="closeMaterialOptions"
    >
      <view class="material-action-sheet" @click.stop>
        <view
          class="material-action-delete"
          :class="{ disabled: materialAction.deleting }"
          @click="handleDeleteFromAction"
        >
          <text class="material-action-delete-text">
            {{ materialAction.deleting ? '删除中...' : '删除' }}
          </text>
        </view>
      </view>
    </view>

    <!-- 底部：输入区域，占约 1/6 屏幕高度 -->
    <view class="input-container" :style="inputContainerStyle">
      <view class="input-inner">
        <!-- 上半区：图片/视频选择器 + 上传预览 -->
        <view class="input-top" :style="inputTopStyle">
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

          <view v-if="uploadedImage" class="uploaded-image-container" :style="uploadedImageStyle">
            <image class="uploaded-image" :src="uploadedImage" mode="aspectFill"></image>
            <view class="delete-btn" @click="deleteUploadedImage">
              <text class="delete-icon">✕</text>
            </view>
          </view>
        </view>

        <!-- 下半区：输入框和按钮区域 -->
        <view class="input-row" :style="inputRowStyle">
          <view class="upload-btn" :style="inputButtonStyle" @click="uploadImage">
            <text class="upload-icon">📎</text>
          </view>

          <input
            class="prompt-input"
            :style="promptInputStyle"
            v-model="prompt"
            placeholder="输入提示词，描述你想生成的内容..."
            :adjust-position="true"
            confirm-type="send"
            @confirm="handleGenerate"
          />

          <view
            class="generate-btn"
            :style="inputButtonStyle"
            :class="{ disabled: !canGenerate || generating }"
            @click="handleGenerate"
          >
            <text class="generate-icon">✨</text>
          </view>
        </view>
      </view>
    </view>
	<custom-tabbar active-path="pages/workspace/workspace" />
  </view>
</template>

<script>
import { getMaterialByUser, createMaterial, deleteMaterial } from '@/request/creation.js'
import { uploadImage } from '@/request/common.js'

const GRID_TOP_PADDING = 10
const GRID_ROW_GAP = 6
const INPUT_SCREEN_RATIO = 1 / 6
const MIN_INPUT_HEIGHT = 108
const MAX_INPUT_HEIGHT = 160
const INPUT_INNER_PADDING = 10
const INPUT_SECTION_GAP = 8
const MIN_CARD_HEIGHT = 220
const MIN_CARD_CONTENT_HEIGHT = 68
const MAX_CARD_CONTENT_HEIGHT = 76
const MIN_IMAGE_HEIGHT = 150

export default {
  data() {
    return {
      materials: [],
      loading: false,

      page: 1,
      hasMore: true,
      isLoadingMore: false,

      prompt: '',
      uploadedImage: '',
      uploadedSourceUrl: '',
      generationType: 'image',
      generating: false,

      statusBarHeight: 0,
      inputHeight: 120,
      inputTopHeight: 48,
      inputRowHeight: 44,
      inputControlHeight: 38,
      uploadedPreviewSize: 42,
      gridBottomPadding: 132,
      cardHeight: 260,
      imageHeight: 190,
      cardContentHeight: 70,

      materialAction: {
        visible: false,
        material: null,
        index: -1,
        deleting: false
      },
      materialLongPressGuard: false
    }
  },

  computed: {
    canGenerate() {
      return this.prompt.trim().length > 0
    },

    inputContainerStyle() {
      return 'height:' + this.inputHeight + 'px;'
    },

    safeStatusBarStyle() {
      return 'height:' + this.statusBarHeight + 'px;'
    },

    materialGridContainerStyle() {
      return (
        'padding-top:' + (this.statusBarHeight + GRID_TOP_PADDING) + 'px;' +
        'padding-bottom:' + this.gridBottomPadding + 'px;'
      )
    },

    materialCardStyle() {
      return 'height:' + this.cardHeight + 'px;'
    },

    imageWrapperStyle() {
      return 'height:' + this.imageHeight + 'px;'
    },

    cardContentStyle() {
      return 'height:' + this.cardContentHeight + 'px;'
    },

    inputTopStyle() {
      return 'height:' + this.inputTopHeight + 'px;'
    },

    inputRowStyle() {
      return 'height:' + this.inputRowHeight + 'px;'
    },

    inputButtonStyle() {
      return 'width:' + this.inputControlHeight + 'px;height:' + this.inputControlHeight + 'px;border-radius:' + Math.floor(this.inputControlHeight / 2) + 'px;'
    },

    promptInputStyle() {
      return 'height:' + this.inputControlHeight + 'px;border-radius:' + Math.floor(this.inputControlHeight / 2) + 'px;'
    },

    uploadedImageStyle() {
      return 'width:' + this.uploadedPreviewSize + 'px;height:' + this.uploadedPreviewSize + 'px;'
    }
  },

  onLoad() {
    this.initLayout()
    this.loadMaterials(true)
    uni.$on('material', this.handleMaterialEvent)
  },

  onShow() {
    this.initLayout()
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
    initLayout() {
      try {
        const sys = uni.getSystemInfoSync()
        const windowHeight = Number(sys.windowHeight || 667)
        this.statusBarHeight = Number(sys.statusBarHeight || 0)

        // 底部输入区占整屏约 1/6。
        const nextInputHeight = Math.floor(windowHeight * INPUT_SCREEN_RATIO)
        this.inputHeight = Math.max(
          MIN_INPUT_HEIGHT,
          Math.min(MAX_INPUT_HEIGHT, nextInputHeight)
        )
        this.gridBottomPadding = this.inputHeight + 12

        // 输入区内部：上方选择区和下方输入区随 inputHeight 等比变化，近似各占一半。
        const innerHeight = this.inputHeight - INPUT_INNER_PADDING * 2
        this.inputTopHeight = Math.floor((innerHeight - INPUT_SECTION_GAP) / 2)
        this.inputRowHeight = innerHeight - INPUT_SECTION_GAP - this.inputTopHeight
        this.inputControlHeight = Math.max(34, Math.min(44, this.inputRowHeight))
        this.uploadedPreviewSize = Math.max(38, Math.min(54, this.inputTopHeight))

        // 素材卡片高度按“整个屏幕”计算，一屏约 2.5 个素材高度，不扣除输入区。
        const fullScreenCardHeight = Math.floor((windowHeight - GRID_TOP_PADDING - GRID_ROW_GAP * 2) / 2.5)
        this.cardHeight = Math.max(MIN_CARD_HEIGHT, fullScreenCardHeight)

        // 信息区固定高度，保证标题一行/两行时类型和日期都在同一位置。
        const nextContentHeight = Math.floor(this.cardHeight / 3.8)
        this.cardContentHeight = Math.max(
          MIN_CARD_CONTENT_HEIGHT,
          Math.min(MAX_CARD_CONTENT_HEIGHT, nextContentHeight)
        )
        this.imageHeight = Math.max(MIN_IMAGE_HEIGHT, this.cardHeight - this.cardContentHeight)
      } catch (e) {
        this.statusBarHeight = 0
        this.inputHeight = 120
        this.inputTopHeight = 48
        this.inputRowHeight = 44
        this.inputControlHeight = 38
        this.uploadedPreviewSize = 42
        this.gridBottomPadding = 132
        this.cardHeight = 260
        this.cardContentHeight = 70
        this.imageHeight = 190
      }
    },

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
          const prompt = item.prompt || ''

          return {
            ...item,
            status,
            uiStatus: this.mapStatusToUi(status),
            displayTitle: prompt || '未命名作品',
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
      const diffMs = now.getTime() - msTimestamp
      const diffSec = Math.floor(diffMs / 1000)

      if (diffSec < 60) return '刚刚'
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`

      const oneDayMs = 24 * 60 * 60 * 1000
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime()

      const pad2 = (n) => (n < 10 ? '0' + n : '' + n)
      const hhmm = `${pad2(target.getHours())}:${pad2(target.getMinutes())}`

      if (msTimestamp >= todayStart) return `今天 ${hhmm}`
      if (msTimestamp >= todayStart - oneDayMs) return `昨天 ${hhmm}`

      const diffDay = Math.floor(diffMs / oneDayMs)
      if (diffDay < 7) return `${diffDay}天前`

      const year = target.getFullYear()
      const month = target.getMonth() + 1
      const day = target.getDate()

      if (year !== now.getFullYear()) return `${year}年${month}月${day}日`
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
            const uploadRes = await uploadImage(localPath, 'material_source')
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

    showMaterialOptions(material, index) {
      if (!material) return

      this.materialLongPressGuard = true
      this.materialAction = {
        visible: true,
        material,
        index,
        deleting: false
      }

      setTimeout(() => {
        this.materialLongPressGuard = false
      }, 450)
    },

    closeMaterialOptions() {
      if (this.materialAction.deleting) return
      this.resetMaterialAction()
    },

    resetMaterialAction() {
      this.materialAction = {
        visible: false,
        material: null,
        index: -1,
        deleting: false
      }
    },

    handleDeleteFromAction() {
      if (this.materialAction.deleting) return
      this.confirmDeleteMaterial(this.materialAction.material, this.materialAction.index)
    },

    confirmDeleteMaterial(material, index) {
      if (!material) return

      const status = Number(material.status)

      if (status === 1) {
        uni.showToast({
          title: '素材生成中，暂时不能删除',
          icon: 'none'
        })
        this.resetMaterialAction()
        return
      }

      if (!material.material_id) {
        uni.showToast({
          title: '素材ID无效',
          icon: 'none'
        })
        this.resetMaterialAction()
        return
      }

      uni.showModal({
        title: '提示',
        content: '确定要删除这个素材吗？',
        confirmText: '删除',
        confirmColor: '#ff4d4f',
        success: async (res) => {
          if (!res.confirm) return

          this.materialAction.deleting = true

          try {
            const ok = await deleteMaterial({
              materialId: material.material_id
            })

            if (!ok) throw new Error('deleteMaterial 返回失败')

            this.materials.splice(index, 1)
            this.resetMaterialAction()

            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } catch (err) {
            console.error('删除素材失败：', err)
            this.materialAction.deleting = false
            uni.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      })
    },

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
      const currentPrompt = this.prompt.trim()

      const localMaterial = {
        material_id: localId,
        material_type: this.generationType === 'video' ? 2 : 1,
        prompt: currentPrompt,
        source_url: this.uploadedSourceUrl || '',
        material_url: this.uploadedImage || '/static/images/placeholder.png',
        cover_url: this.uploadedImage || '/static/images/placeholder.png',
        model: '',
        create_time: now,
        status: 1,
        uiStatus: 'generating',
        displayTitle: currentPrompt || '未命名作品',
        displayTime: this.formatRelativeTime(now)
      }
      this.materials.unshift(localMaterial)

      try {
        const payload = {
          materialType: this.generationType === 'video' ? 2 : 1,
          prompt: currentPrompt,
          sourceUrl: this.uploadedSourceUrl || ''
        }

        const data = await createMaterial(payload)
        if (data && data.material_id) {
          const idx = this.materials.findIndex(m => m.material_id === localId)
          if (idx !== -1) {
            const createTime = this.materials[idx].create_time || now
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
              create_time: createTime,
              displayTime: this.formatRelativeTime(createTime)
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

    goToMaterialDetail(material) {
      if (this.materialLongPressGuard) return

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
.container {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  background-color: #f5f5f7;
  min-height: 100vh;
}

.safe-status-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 120;
  background-color: #ffffff;
}

.material-grid-container {
  padding: 0 6px 0;
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
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.material-card {
  width: calc((100% - 6px) / 2);
  border-radius: 8px;
  overflow: hidden;
  background-color: #fff;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
  position: relative;
}

.image-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  background-color: #f3f3f3;
}

.card-generating {
  position: relative;
  width: 100%;
  height: 100%;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-image.blurred {
  filter: blur(4px);
  opacity: 0.6;
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

.card-content {
  padding: 5px 7px 5px;
  box-sizing: border-box;
  overflow: hidden;
}

.card-title-container {
  height: 32px;
  margin-bottom: 4px;
}

.card-title {
  font-size: 12px;
  line-height: 16px;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.card-meta {
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-type-tag {
  font-size: 10px;
  line-height: 14px;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2px 8px;
  border-radius: 10px;
}

.card-time {
  font-size: 10px;
  line-height: 14px;
  color: #999;
}

.load-more-footer {
  text-align: center;
  padding: 16px 0 80px;
  font-size: 24rpx;
  color: #999;
}

.material-action-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 300;
  background-color: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: flex-end;
}

.material-action-sheet {
  width: 100%;
  background-color: #f7f7f7;
  padding: 8px calc(8px + env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom)) calc(8px + env(safe-area-inset-left));
  box-sizing: border-box;
}

.material-action-delete {
  height: 52px;
  border-radius: 12px;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.material-action-delete.disabled {
  opacity: 0.6;
}

.material-action-delete-text {
  color: #ff4d4f;
  font-size: 16px;
  font-weight: 500;
}

.input-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #e5e5e5;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 100;
  box-sizing: border-box;
}

.input-inner {
  height: 100%;
  padding: 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 0;
}

.type-selector {
  flex: 1;
  height: 100%;
  display: flex;
  gap: 8px;
}

.type-option {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: #f5f5f7;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s;
  box-sizing: border-box;
}

.type-option.active {
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-color: #667eea;
}

.type-icon {
  font-size: 16px;
}

.type-text {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.uploaded-image-container {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e5e5e5;
  box-sizing: border-box;
  flex-shrink: 0;
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
  width: 20px;
  height: 20px;
  background: #ff4444;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.delete-icon {
  color: #fff;
  font-size: 13px;
  font-weight: bold;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 0;
}

.upload-btn {
  background: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.upload-icon {
  font-size: 19px;
}

.prompt-input {
  flex: 1;
  background: #f5f5f7;
  padding: 0 16px;
  font-size: 14px;
  box-sizing: border-box;
}

.generate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  font-size: 19px;
}
</style>
