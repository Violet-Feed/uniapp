<template>
  <view
    class="container"
    :style="containerStyle"
    @touchmove.stop.prevent="noop"
  >
    <page-meta page-style="overflow: hidden;" />

    <view class="safe-status-bar" :style="safeStatusBarStyle"></view>

    <view
      v-if="pullDistance > 0 || isRefreshing"
      class="refresh-overlay"
      :style="refreshOverlayStyle"
    >
      <view class="loading-spinner tiny" v-if="isRefreshing"></view>
      <text class="refresh-overlay-text">{{ refresherText }}</text>
    </view>

    <scroll-view
      class="material-scroll"
      :style="materialScrollStyle"
      scroll-y
      :show-scrollbar="false"
      :lower-threshold="120"
      @scroll="onMaterialScroll"
      @scrolltolower="handleScrollToLower"
      @touchstart="onScrollTouchStart"
      @touchmove.stop="onScrollTouchMove"
      @touchend="onScrollTouchEnd"
      @touchcancel="onScrollTouchEnd"
    >
      <view class="scroll-content" :style="scrollContentStyle">
        <view class="material-grid-container" :style="materialGridContainerStyle">
        <view v-if="loading && materials.length === 0" class="initial-loading" :style="emptyStateStyle">
          <text class="initial-loading-text">加载中...</text>
        </view>

        <view class="material-grid" :style="materialGridStyle" v-else-if="materials.length > 0">
          <view
            class="material-card"
            v-for="(material, index) in materials"
            :key="'material-' + (material.material_id || index)"
            :style="materialCardStyle"
            @click="goToMaterialDetail(material)"
            @touchstart="onMaterialTouchStart"
            @touchmove="onMaterialTouchMove"
            @touchend="onMaterialTouchEnd"
            @touchcancel="onMaterialTouchEnd"
            @longpress="showMaterialOptions(material, index)"
          >
            <view class="image-wrapper" :style="imageWrapperStyle">
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

              <image
                v-else
                class="card-image"
                :src="material.cover_url || material.material_url || '/static/images/default.png'"
                mode="aspectFill"
                @error="handleImageError(material)"
              ></image>
            </view>

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

        <view v-else class="empty-state" :style="emptyStateStyle">
          <text class="iconfont icon-neirongchuangzuo empty-icon" :style="emptyIconStyle"></text>
          <text class="empty-text">还没有素材，快来生成第一个作品吧！</text>
        </view>

          <view v-if="isLoadingMore" class="load-more-state">加载中...</view>
          <view v-else-if="!hasMore && materials.length > 0" class="load-more-state">没有更多了</view>
        </view>

        <view v-if="materials.length > 0" class="bottom-spacer" :style="bottomSpacerStyle"></view>
      </view>
    </scroll-view>

    <view
      v-if="materialAction.visible"
      class="material-action-overlay"
      @click="closeMaterialOptions"
    >
      <view class="material-action-menu" @click.stop>
        <view
          v-if="canReCreateAction"
          class="material-action-item"
          :class="{ 'material-action-item-disabled': materialAction.reCreating || materialAction.deleting }"
          @click="handleReCreateFromAction"
        >
          <text class="material-action-text">
            {{ materialAction.reCreating ? '重新生成中...' : '重新生成' }}
          </text>
        </view>

        <view
          class="material-action-item"
          :class="{ 'material-action-item-disabled': materialAction.deleting || materialAction.reCreating }"
          @click="handleDeleteFromAction"
        >
          <text class="material-action-text danger-action-text">
            {{ materialAction.deleting ? '删除中...' : '删除' }}
          </text>
        </view>
      </view>
    </view>

    <view class="input-container" :style="inputContainerStyle" @touchmove.stop.prevent="noop">
      <view class="input-inner" :style="inputInnerStyle">
        <view class="input-top" :style="inputTopStyle">
          <view class="type-selector">
            <view
              class="type-option"
              :class="{ active: generationType === 'image' }"
              @click="selectType('image')"
            >
              <text class="iconfont icon-tupian type-icon"></text>
              <text class="type-text">图片</text>
            </view>

            <view
              class="type-option"
              :class="{ active: generationType === 'video' }"
              @click="selectType('video')"
            >
              <text class="iconfont icon-shipin type-icon"></text>
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

        <view class="input-row" :style="inputRowStyle">
          <view class="upload-btn" :style="inputButtonStyle" @click="openImageSourcePopup">
            <text class="iconfont icon-fujian upload-icon"></text>
          </view>

          <input
            class="prompt-input"
            :style="promptInputStyle"
            v-model="prompt"
            placeholder="输入提示词，描述你想生成的内容..."
            :adjust-position="false"
            cursor-spacing="0"
            confirm-type="send"
            @focus="handleInputFocus"
            @blur="handleInputBlur"
            @keyboardheightchange="handleKeyboardHeightChange"
            @confirm="handleGenerate"
          />

          <view
            class="generate-btn"
            :style="inputButtonStyle"
            :class="{ disabled: !canGenerate || generating }"
            @click="handleGenerate"
          >
            <text class="iconfont icon-simangxing generate-icon"></text>
          </view>
        </view>
      </view>
    </view>

    <custom-tabbar
      v-if="!keyboardVisible"
      active-path="pages/workspace/workspace"
    />

    <view class="avatar-source-mask" v-if="imageSourceVisible" @click="closeImageSourcePopup">
      <view class="avatar-source-panel" @click.stop>
        <view class="avatar-source-item" @click="selectMediaSource('camera')">拍照</view>
        <view class="avatar-source-item" @click="selectMediaSource('album')">从相册选择</view>
      </view>
    </view>
  </view>
</template>

<script>
import { getMaterialByUser, createMaterial, deleteMaterial, reCreateMaterial } from '@/request/creation.js'
import { uploadImage } from '@/request/common.js'

const GRID_TOP_PADDING = 10
const MIN_GRID_SIDE_PADDING = 6
const MAX_GRID_SIDE_PADDING = 10
const MIN_GRID_GAP = 6
const MAX_GRID_GAP = 10

const MIN_INPUT_HEIGHT = 104
const MAX_INPUT_HEIGHT = 136

const MIN_TABBAR_BASE_HEIGHT = 46
const MAX_TABBAR_BASE_HEIGHT = 52

const PULL_TRIGGER_DISTANCE = 64
const PULL_MAX_DISTANCE = 92
const PULL_MOVE_RATIO = 0.62
const REFRESH_HOLD_OFFSET = 42

// 底部“没有更多”到输入栏的呼吸间距。
// 普通态保留 tabbar + 输入栏高度；键盘态只保留贴底输入栏高度。
const LOAD_MORE_BOTTOM_GAP = 4
const LOAD_MORE_KEYBOARD_BOTTOM_GAP = 2

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value))
}

export default {
  data() {
    return {
      materials: [],
      loading: false,
      refreshing: false,
      isRefreshing: false,

      scrollTop: 0,
      pulling: false,
      pullStartY: 0,
      pullDistance: 0,

      page: 1,
      hasMore: true,
      isLoadingMore: false,

      prompt: '',
      uploadedImage: '',
      uploadedSourceUrl: '',
      imageSourceVisible: false,
      generationType: 'image',
      generating: false,

      inputFocused: false,
      keyboardVisible: false,
      keyboardHeight: 0,
      inputBlurTimer: null,

      statusBarHeight: 0,
      safeBottom: 0,
      windowWidth: 375,
      windowHeight: 667,

      gridSidePadding: 8,
      gridGap: 8,

      cardWidth: 170,
      cardHeight: 227,
      imageHeight: 170,
      cardContentHeight: 57,

      inputHeight: 118,
      inputBottom: 50,
      inputInnerPaddingTop: 10,
      inputInnerPaddingX: 10,
      inputInnerPaddingBottom: 6,
      inputTopHeight: 46,
      inputRowHeight: 42,
      inputControlHeight: 38,
      uploadedPreviewSize: 40,

      tabbarBaseHeight: 50,
      tabbarTotalHeight: 50,

      footerReserveHeight: 26,
      emptyTopPadding: 128,
      emptyIconSize: 58,

      materialTouch: {
        startX: 0,
        startY: 0,
        moved: false
      },
      materialScrolling: false,
      materialScrollTimer: null,

      materialAction: {
        visible: false,
        material: null,
        index: -1,
        deleting: false,
        reCreating: false
      },
      materialLongPressGuard: false
    }
  },

  computed: {
    canGenerate() {
      return this.prompt.trim().length > 0
    },

    containerStyle() {
      return (
        'height:' + this.windowHeight + 'px;' +
        'width:' + this.windowWidth + 'px;'
      )
    },

    materialScrollStyle() {
      const height = Math.max(
        0,
        this.windowHeight - this.statusBarHeight
      )

      return (
        'top:' + this.statusBarHeight + 'px;' +
        'height:' + height + 'px;'
      )
    },

    inputContainerStyle() {
      const bottom = this.keyboardVisible ? 0 : this.inputBottom

      return (
        'height:' + this.inputHeight + 'px;' +
        'bottom:' + bottom + 'px;'
      )
    },

    inputInnerStyle() {
      return (
        'padding:' +
        this.inputInnerPaddingTop +
        'px ' +
        this.inputInnerPaddingX +
        'px ' +
        this.inputInnerPaddingBottom +
        'px;'
      )
    },

    safeStatusBarStyle() {
      return 'height:' + this.statusBarHeight + 'px;'
    },

    materialGridContainerStyle() {
      return (
        'padding-top:' + GRID_TOP_PADDING + 'px;' +
        'padding-left:' + this.gridSidePadding + 'px;' +
        'padding-right:' + this.gridSidePadding + 'px;' +
        'padding-bottom:2px;'
      )
    },

    materialGridStyle() {
      return (
        'column-gap:' + this.gridGap + 'px;' +
        'row-gap:' + this.gridGap + 'px;'
      )
    },

    materialCardStyle() {
      return (
        'width:' + this.cardWidth + 'px;' +
        'height:' + this.cardHeight + 'px;'
      )
    },

    imageWrapperStyle() {
      return (
        'width:' + this.cardWidth + 'px;' +
        'height:' + this.imageHeight + 'px;'
      )
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
      return (
        'width:' + this.inputControlHeight + 'px;' +
        'height:' + this.inputControlHeight + 'px;' +
        'border-radius:' + Math.floor(this.inputControlHeight / 2) + 'px;'
      )
    },

    promptInputStyle() {
      return (
        'height:' + this.inputControlHeight + 'px;' +
        'border-radius:' + Math.floor(this.inputControlHeight / 2) + 'px;'
      )
    },

    uploadedImageStyle() {
      return (
        'width:' + this.uploadedPreviewSize + 'px;' +
        'height:' + this.uploadedPreviewSize + 'px;'
      )
    },

    emptyStateStyle() {
      return 'padding-top:' + this.emptyTopPadding + 'px;'
    },

    emptyIconStyle() {
      return 'font-size:' + this.emptyIconSize + 'px;'
    },

    pullVisualOffset() {
      if (this.isRefreshing) return REFRESH_HOLD_OFFSET

      return Math.min(
        REFRESH_HOLD_OFFSET,
        Math.round(this.pullDistance * PULL_MOVE_RATIO)
      )
    },

    scrollContentStyle() {
      const transition = this.pulling
        ? 'none'
        : 'transform 0.16s ease'

      return [
        'transform: translateY(' + this.pullVisualOffset + 'px)',
        'transition:' + transition
      ].join(';')
    },

    refreshOverlayStyle() {
      const top = this.statusBarHeight

      const height = this.isRefreshing
        ? 34
        : Math.min(34, Math.max(0, Math.round(this.pullDistance * 0.48)))

      const opacity = this.isRefreshing
        ? 1
        : Math.min(1, this.pullDistance / PULL_TRIGGER_DISTANCE)

      return [
        'top:' + top + 'px',
        'height:' + height + 'px',
        'opacity:' + opacity
      ].join(';')
    },

    refresherText() {
      if (this.isRefreshing) return '正在刷新...'
      if (this.pullDistance >= PULL_TRIGGER_DISTANCE) return '松开刷新'
      if (this.pullDistance > 0) return '下拉刷新'
      return ''
    },

    bottomSpacerStyle() {
      const inputOffset = this.keyboardVisible ? 0 : this.inputBottom
      const gap = this.keyboardVisible
        ? LOAD_MORE_KEYBOARD_BOTTOM_GAP
        : LOAD_MORE_BOTTOM_GAP
      const height = this.inputHeight + inputOffset + gap

      return 'height:' + height + 'px;'
    },

    canReCreateAction() {
      const material = this.materialAction.material
      if (!material) return false
      return Number(material.status) === 3 || material.uiStatus === 'failed'
    }
  },

  onLoad() {
    this.initLayout()
    this.loadMaterials(true)
    uni.$on('material', this.handleMaterialEvent)
  },

  onBackPress() {
    if (this.materialAction.visible) {
      this.closeMaterialOptions()
      return true
    }
    return false
  },

  onUnload() {
    uni.$off('material', this.handleMaterialEvent)

    if (this.materialScrollTimer) {
      clearTimeout(this.materialScrollTimer)
      this.materialScrollTimer = null
    }

    if (this.inputBlurTimer) {
      clearTimeout(this.inputBlurTimer)
      this.inputBlurTimer = null
    }
  },

  methods: {
    noop() {},

    initLayout() {
      try {
        const sys = uni.getSystemInfoSync()
        const windowWidth = Number(sys.windowWidth || 375)
        const windowHeight = Number(sys.windowHeight || 667)
        const safeAreaInsets = sys.safeAreaInsets || {}

        this.windowWidth = windowWidth
        this.windowHeight = windowHeight
        this.statusBarHeight = Number(sys.statusBarHeight || 0)
        this.safeBottom = Number(safeAreaInsets.bottom || 0)

        this.gridSidePadding = clamp(
          Math.floor(windowWidth * 0.022),
          MIN_GRID_SIDE_PADDING,
          MAX_GRID_SIDE_PADDING
        )

        this.gridGap = clamp(
          Math.floor(windowWidth * 0.02),
          MIN_GRID_GAP,
          MAX_GRID_GAP
        )

        const rawCardWidth = Math.floor((windowWidth - this.gridSidePadding * 2 - this.gridGap) / 2)

        this.cardWidth = rawCardWidth
        this.cardHeight = Math.floor(this.cardWidth * 4 / 3)
        this.imageHeight = this.cardWidth
        this.cardContentHeight = this.cardHeight - this.imageHeight

        this.tabbarBaseHeight = clamp(
          Math.floor(windowWidth * 0.132),
          MIN_TABBAR_BASE_HEIGHT,
          MAX_TABBAR_BASE_HEIGHT
        )

        this.tabbarTotalHeight = this.tabbarBaseHeight + this.safeBottom
        this.inputBottom = this.tabbarTotalHeight

        this.inputHeight = clamp(
          Math.floor(windowHeight * 0.152),
          MIN_INPUT_HEIGHT,
          MAX_INPUT_HEIGHT
        )

        this.inputInnerPaddingTop = clamp(Math.floor(windowWidth * 0.025), 8, 11)
        this.inputInnerPaddingX = clamp(Math.floor(windowWidth * 0.027), 8, 12)
        this.inputInnerPaddingBottom = clamp(Math.floor(windowWidth * 0.014), 4, 7)

        const sectionGap = clamp(Math.floor(windowWidth * 0.018), 6, 8)
        const innerHeight =
          this.inputHeight -
          this.inputInnerPaddingTop -
          this.inputInnerPaddingBottom

        this.inputTopHeight = Math.floor((innerHeight - sectionGap) * 0.48)
        this.inputRowHeight = innerHeight - sectionGap - this.inputTopHeight
        this.inputControlHeight = clamp(Math.floor(this.inputRowHeight * 0.92), 34, 42)
        this.uploadedPreviewSize = clamp(this.inputTopHeight - 6, 34, 48)

        this.footerReserveHeight = clamp(
          Math.floor(windowWidth * 0.068),
          22,
          28
        )

        this.emptyTopPadding = clamp(
          Math.floor(windowHeight * 0.18),
          92,
          150
        )

        this.emptyIconSize = 58

      } catch (e) {
        this.statusBarHeight = 0
        this.safeBottom = 0
        this.windowWidth = 375
        this.windowHeight = 667

        this.gridSidePadding = 8
        this.gridGap = 8

        this.cardWidth = 175
        this.cardHeight = 233
        this.imageHeight = 175
        this.cardContentHeight = 58

        this.tabbarBaseHeight = 50
        this.tabbarTotalHeight = 50
        this.inputBottom = 50

        this.inputHeight = 118
        this.inputInnerPaddingTop = 10
        this.inputInnerPaddingX = 10
        this.inputInnerPaddingBottom = 6
        this.inputTopHeight = 46
        this.inputRowHeight = 42
        this.inputControlHeight = 38
        this.uploadedPreviewSize = 40

        this.footerReserveHeight = 26
        this.emptyTopPadding = 128
        this.emptyIconSize = 58
      }
    },

    handleInputFocus() {
      if (this.inputBlurTimer) {
        clearTimeout(this.inputBlurTimer)
        this.inputBlurTimer = null
      }

      this.inputFocused = true
    },

    handleInputBlur() {
      if (this.inputBlurTimer) {
        clearTimeout(this.inputBlurTimer)
      }

      this.inputBlurTimer = setTimeout(() => {
        if (!this.keyboardVisible) {
          this.inputFocused = false
        }

        this.inputBlurTimer = null
      }, 180)
    },

    handleKeyboardHeightChange(e) {
      const height = Number(e?.detail?.height || 0)

      if (this.inputBlurTimer) {
        clearTimeout(this.inputBlurTimer)
        this.inputBlurTimer = null
      }

      this.keyboardHeight = height

      if (height > 0) {
        this.inputFocused = true
        this.keyboardVisible = true
        return
      }

      setTimeout(() => {
        this.keyboardVisible = false
        this.inputFocused = false
        this.keyboardHeight = 0
      }, 80)
    },

    handleScrollToLower() {
      this.loadMaterials(false)
    },

    handleRefresh() {
      return this.refreshList()
    },

    onMaterialScroll(e) {
      this.scrollTop = Number(e?.detail?.scrollTop || 0)
      this.materialScrolling = true

      if (this.materialScrollTimer) {
        clearTimeout(this.materialScrollTimer)
      }

      this.materialScrollTimer = setTimeout(() => {
        this.materialScrolling = false
        this.materialScrollTimer = null
      }, 140)
    },

    getTouchY(e) {
      const touch = e?.touches?.[0] || e?.changedTouches?.[0] || {}
      return Number(touch.clientY ?? touch.pageY ?? 0)
    },

    onScrollTouchStart(e) {
      if (this.loading || this.isLoadingMore || this.isRefreshing) return

      if (this.inputFocused || this.keyboardVisible) {
        this.pulling = false
        this.pullDistance = 0

        try {
          uni.hideKeyboard()
        } catch (err) {}

        return
      }

      this.pullStartY = this.getTouchY(e)
      this.pulling = this.scrollTop <= 2
      this.pullDistance = 0
    },

    onScrollTouchMove(e) {
      if (!this.pulling || this.loading || this.isLoadingMore || this.isRefreshing) return

      if (this.scrollTop > 2) {
        this.pulling = false
        this.pullDistance = 0
        return
      }

      const currentY = this.getTouchY(e)
      const deltaY = currentY - this.pullStartY

      if (deltaY <= 0) {
        this.pullDistance = 0
        return
      }

      this.pullDistance = Math.min(
        PULL_MAX_DISTANCE,
        Math.floor(deltaY * 0.38)
      )
    },

    async onScrollTouchEnd() {
      if (!this.pulling) return

      const shouldRefresh = this.pullDistance >= PULL_TRIGGER_DISTANCE

      this.pulling = false

      if (!shouldRefresh) {
        this.pullDistance = 0
        return
      }

      await this.refreshList()
    },

    async refreshList() {
      if (this.loading || this.isLoadingMore || this.isRefreshing) {
        this.pullDistance = 0
        return
      }

      this.isRefreshing = true
      this.refreshing = true
      this.pullDistance = PULL_TRIGGER_DISTANCE
      this.hasMore = true

      try {
        await this.loadMaterials(true)
      } finally {
        this.isRefreshing = false
        this.refreshing = false
        this.pullDistance = 0
      }
    },

    onMaterialTouchStart(e) {
      const touch = e?.changedTouches?.[0] || e?.touches?.[0] || {}

      this.materialTouch = {
        startX: touch.clientX ?? touch.pageX ?? 0,
        startY: touch.clientY ?? touch.pageY ?? 0,
        moved: false
      }
    },

    onMaterialTouchMove(e) {
      const touch = e?.changedTouches?.[0] || e?.touches?.[0] || {}

      const x = touch.clientX ?? touch.pageX ?? 0
      const y = touch.clientY ?? touch.pageY ?? 0
      const dx = Math.abs(x - this.materialTouch.startX)
      const dy = Math.abs(y - this.materialTouch.startY)

      if (dx > 8 || dy > 8) {
        this.materialTouch.moved = true
      }
    },

    onMaterialTouchEnd() {
      setTimeout(() => {
        this.materialTouch = {
          startX: 0,
          startY: 0,
          moved: false
        }
      }, 80)
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
        if (!this.isRefreshing) {
          this.materials = []
        }
        this.loading = true
        this.isLoadingMore = false
      } else {
        this.loading = false
        this.isLoadingMore = true
      }

      const res = await getMaterialByUser(this.page)
      if (!res) {
        this.loading = false
        this.isLoadingMore = false
        return
      }

      const list = Array.isArray(res)
        ? res
        : (res && Array.isArray(res.material) ? res.material : [])

      if (!list || list.length === 0) {
        this.hasMore = false
        this.loading = false
        this.isLoadingMore = false
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

      this.loading = false
      this.isLoadingMore = false
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

    openImageSourcePopup() {
      this.imageSourceVisible = true
    },

    closeImageSourcePopup() {
      this.imageSourceVisible = false
    },

    selectMediaSource(sourceType) {
      this.closeImageSourcePopup()

      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: [sourceType],
        success: async (res) => {
          const localPath = res.tempFilePaths[0]
          this.uploadedImage = localPath
          this.uploadedSourceUrl = ''

          uni.showLoading({ title: '上传中...' })

          const uploadRes = await uploadImage(localPath, 'material_source')
          if (!uploadRes || !uploadRes.source_url) {
            this.uploadedImage = ''
            return
          }
          this.uploadedSourceUrl = uploadRes.source_url
          uni.hideLoading()
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

      if (this.materialTouch.moved || this.materialScrolling) {
        return
      }

      this.materialLongPressGuard = true
      this.materialAction = {
        visible: true,
        material,
        index,
        deleting: false,
        reCreating: false
      }

      setTimeout(() => {
        this.materialLongPressGuard = false
      }, 450)
    },

    closeMaterialOptions() {
      if (this.materialAction.deleting || this.materialAction.reCreating) return
      this.resetMaterialAction()
    },

    resetMaterialAction() {
      this.materialAction = {
        visible: false,
        material: null,
        index: -1,
        deleting: false,
        reCreating: false
      }
    },

    handleDeleteFromAction() {
      if (this.materialAction.deleting || this.materialAction.reCreating) return
      this.confirmDeleteMaterial(this.materialAction.material, this.materialAction.index)
    },

    async handleReCreateFromAction() {
      if (this.materialAction.deleting || this.materialAction.reCreating) return

      const material = this.materialAction.material
      const index = this.materialAction.index

      if (!material) return

      if (Number(material.status) !== 3 && material.uiStatus !== 'failed') {
        uni.showToast({
          title: '只有生成失败的素材可以重新生成',
          icon: 'none'
        })
        this.resetMaterialAction()
        return
      }

      if (!material.material_id) {
        uni.showToast({
          title: '无效素材',
          icon: 'none'
        })
        this.resetMaterialAction()
        return
      }

      this.materialAction.reCreating = true

      const ok = await reCreateMaterial({
        materialId: material.material_id
      })

      if (ok) {
        const recreated = this.buildReCreatingMaterial(material)
        const materialId = String(material.material_id || '')
        const targetIndex = this.materials.findIndex(
          item => String(item.material_id) === materialId
        )
        const removeIndex = targetIndex !== -1 ? targetIndex : index

        if (removeIndex >= 0 && removeIndex < this.materials.length) {
          this.materials.splice(removeIndex, 1)
        }

        this.materials.unshift(recreated)

        this.resetMaterialAction()

        uni.showToast({
          title: '开始重新生成',
          icon: 'success'
        })
      } else {
        this.materialAction.reCreating = false
      }
    },

    buildReCreatingMaterial(material) {
      const now = Date.now()
      const prompt = material.prompt || material.displayTitle || ''
      const sourceUrl = material.source_url || material.sourceUrl || ''
      const previewUrl = sourceUrl || '/static/images/placeholder.png'

      return {
        ...material,
        material_id: String(material.material_id),
        material_type: material.material_type || 1,
        prompt,
        source_url: sourceUrl,
        material_url: previewUrl,
        cover_url: previewUrl,
        model: '',
        create_time: now,
        status: 1,
        uiStatus: 'generating',
        displayTitle: prompt || '未命名作品',
        displayTime: this.formatRelativeTime(now)
      }
    },

    removeMaterialFromList(material, fallbackIndex) {
      const materialId = String(material.material_id || '')
      const index = this.materials.findIndex(item => String(item.material_id) === materialId)

      if (index !== -1) {
        this.materials.splice(index, 1)
        return
      }

      if (fallbackIndex >= 0 && fallbackIndex < this.materials.length) {
        this.materials.splice(fallbackIndex, 1)
      }
    },

    confirmDeleteMaterial(material, index) {
      if (!material) return

      const status = Number(material.status)

      if (status === 1) {
        uni.showToast({
          title: '素材生成中，请稍后',
          icon: 'none'
        })
        this.resetMaterialAction()
        return
      }

      if (!material.material_id) {
        uni.showToast({
          title: '无效素材',
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

          const ok = await deleteMaterial({
            materialId: material.material_id
          })

          if (ok) {
            this.materials.splice(index, 1)
            this.resetMaterialAction()

            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } else {
            this.materialAction.deleting = false
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
          title: '图片上传中，请稍后',
          icon: 'none'
        })
        return
      }

      this.generating = true

      const currentPrompt = this.prompt.trim()
      const materialType = this.generationType === 'video' ? 2 : 1
      const sourceUrl = this.uploadedSourceUrl || ''
      const previewUrl = this.uploadedImage || '/static/images/placeholder.png'

      const payload = {
        materialType,
        prompt: currentPrompt,
        sourceUrl
      }

      const data = await createMaterial(payload)

      if (data && data.material_id) {
        let createTime = data.create_time || Date.now()
        if (typeof createTime === 'bigint') {
          createTime = Number(createTime)
        }

        const status = data.status != null ? data.status : 1
        const prompt = data.prompt != null ? data.prompt : currentPrompt
        const materialUrl = data.material_url || previewUrl
        const coverUrl = data.cover_url || materialUrl || previewUrl

        const material = {
          ...data,
          material_id: String(data.material_id),
          material_type: data.material_type != null ? data.material_type : materialType,
          prompt,
          source_url: data.source_url != null ? data.source_url : sourceUrl,
          material_url: materialUrl,
          cover_url: coverUrl,
          model: data.model || '',
          create_time: createTime,
          status,
          uiStatus: this.mapStatusToUi(status),
          displayTitle: prompt || '未命名作品',
          displayTime: this.formatRelativeTime(createTime)
        }

        this.materials.unshift(material)

        uni.showToast({
          title: '开始生成',
          icon: 'success'
        })

        this.prompt = ''
        this.uploadedImage = ''
        this.uploadedSourceUrl = ''
      }

      this.generating = false
    },

    handleImageError(material) {
      if (material) {
        material.cover_url = '/static/images/default.png'
        material.material_url = '/static/images/default.png'
      }
    },

    goToMaterialDetail(material) {
      if (this.materialLongPressGuard || !material) return

      const status = Number(material.status)
      const uiStatus = material.uiStatus || ''
      const materialId = material.material_id || ''
      const materialType = material.material_type || 1
      const materialUrl = material.material_url || material.cover_url || ''
      const coverUrl = material.cover_url || ''
      const prompt = material.prompt || material.displayTitle || ''

      if (status === 1 || uiStatus === 'generating') {
        uni.showToast({
          title: '素材生成中，请稍后',
          icon: 'none'
        })
        return
      }

      if (status === 3 || uiStatus === 'failed') {
        uni.showToast({
          title: '素材生成失败，无法查看',
          icon: 'none'
        })
        return
      }

      if (status === 4 || uiStatus === 'deleted') {
        uni.showToast({
          title: '素材已删除',
          icon: 'none'
        })
        return
      }

      if (!materialId) {
        uni.showToast({
          title: '无效素材',
          icon: 'none'
        })
        return
      }

      uni.navigateTo({
        url:
          `/pages/workspace/material_detail?material_id=${encodeURIComponent(materialId)}` +
          `&material_type=${encodeURIComponent(materialType)}` +
          `&material_url=${encodeURIComponent(materialUrl)}` +
          `&cover_url=${encodeURIComponent(coverUrl)}` +
          `&prompt=${encodeURIComponent(prompt)}`
      })
    }
  }
}
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.container {
  position: fixed;
  left: 0;
  top: 0;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  background-color: #fefefe;
  overflow: hidden;
  overscroll-behavior: none;
}

.safe-status-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 120;
  background-color: #fefefe;
}

.refresh-overlay {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #fefefe;
  overflow: hidden;
  box-sizing: border-box;
  pointer-events: none;
  transition: height 0.12s ease, opacity 0.12s ease;
}

.refresh-overlay-text {
  font-size: 12px;
  color: #999999;
  font-weight: 400;
  line-height: 1;
}

.material-scroll {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 1;
  box-sizing: border-box;
  background-color: #fefefe;
  overflow: hidden;
  overscroll-behavior-y: contain;
}

.scroll-content {
  will-change: transform;
}

.material-grid-container {
  box-sizing: border-box;
}

.initial-loading,
.empty-state {
  text-align: center;
}

.initial-loading {
  color: #999;
  font-size: 14px;
  font-weight: 400;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  color: #d8a25d !important;
  line-height: 1;
  margin-bottom: 16rpx;
  font-size: 58px;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  font-weight: 400;
}

.material-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}

.material-card {
  border-radius: 10px;
  overflow: hidden;
  background-color: #fff;
  box-shadow: 0 1px 8px rgba(31, 35, 41, 0.06);
  position: relative;
  box-sizing: border-box;
}

.image-wrapper {
  position: relative;
  overflow: hidden;
  background-color: #f3f3f3;
  box-sizing: border-box;
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
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.generating-overlay.failed {
  background-color: rgba(0, 0, 0, 0.5);
}

.loading-spinner {
  width: 34px;
  height: 34px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner.tiny {
  width: 14px;
  height: 14px;
  border-width: 2px;
  border-color: #f3f3f3;
  border-top-color: #d8a25d;
}

.generating-text {
  margin-top: 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 400;
}

.failed-icon {
  font-size: 20px;
  color: rgba(253, 231, 209, 1);
}

.card-content {
  padding: 6px 8px 6px;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-title-container {
  width: 100%;
  min-height: 18px;
}

.card-title {
  display: block;
  width: 100%;
  font-size: 12px;
  line-height: 18px;
  color: #333;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-type-tag {
  font-size: 10px;
  line-height: 15px;
  color: #8a5a2b;
  background-color: rgba(253, 231, 209, 1);
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 400;
}

.card-time {
  flex: 1;
  margin-left: 6px;
  font-size: 10px;
  line-height: 14px;
  color: #999;
  font-weight: 400;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.load-more-state {
  padding: 4px 0 0;
  margin: 0;
  text-align: center;
  font-size: 11px;
  line-height: 14px;
  color: #999;
  font-weight: 400;
}

.bottom-spacer {
  width: 100%;
  flex-shrink: 0;
}

.material-action-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 12px 18px;
  box-sizing: border-box;
}

.material-action-menu {
  width: 100%;
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16);
}

.material-action-item {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border-bottom: 1px solid #f4f4f4;
}

.material-action-item:last-child {
  border-bottom: none;
}

.material-action-item:active {
  background: #f8f8f8;
}

.material-action-item-disabled {
  opacity: 0.62;
}

.material-action-text {
  font-size: 15px;
  color: #333333;
  font-weight: 400;
}

.danger-action-text {
  color: #ff3b30;
}

.input-container {
  position: fixed;
  left: 0;
  right: 0;
  background-color: #fff;
  border-top: none;
  box-shadow: none;
  z-index: 100;
  box-sizing: border-box;
}

.input-inner {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 7px;
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
  background-color: #f5f5f7;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: none;
  box-sizing: border-box;
}

.type-option.active {
  background-color: rgba(253, 231, 209, 1);
  border-color: rgba(138, 90, 43, 0.16);
}

.type-icon {
  font-size: 17px;
  color: #8a5a2b;
  line-height: 1;
  font-weight: 400;
}

.type-text {
  font-size: 13px;
  color: #333;
  font-weight: 400;
}

.type-option.active .type-text,
.type-option.active .type-icon {
  color: #8a5a2b;
}

.uploaded-image-container {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(138, 90, 43, 0.16);
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
  width: 18px;
  height: 18px;
  background: #ff4444;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-icon {
  color: #fff;
  font-size: 12px;
  font-weight: 400;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 0;
}

.upload-btn {
  background-color: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.upload-icon {
  font-size: 18px;
  color: #8a5a2b;
  line-height: 1;
  font-weight: 400;
}

.prompt-input {
  flex: 1;
  background-color: #f5f5f7;
  padding: 0 14px;
  font-size: 14px;
  color: #333;
  font-weight: 400;
  box-sizing: border-box;
}

.generate-btn {
  background-color: rgba(253, 231, 209, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: none;
}

.generate-btn.disabled {
  opacity: 0.45;
}

.generate-icon {
  font-size: 20px;
  color: #f5a033;
  line-height: 1;
  font-weight: 400;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.avatar-source-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.36);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  box-sizing: border-box;
}

.avatar-source-panel {
  width: 100%;
  padding: 16rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.avatar-source-item {
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  background: #ffffff;
  color: #222222;
  font-size: 30rpx;
  font-weight: 400;
  box-sizing: border-box;
}

.avatar-source-item:first-child {
  border-radius: 28rpx 28rpx 0 0;
}

.avatar-source-item:last-child {
  border-radius: 0 0 28rpx 28rpx;
  border-top: 1px solid #f1f1f1;
}
</style>