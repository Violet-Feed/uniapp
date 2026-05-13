<template>
  <view v-if="visible" class="cropper-mask" @touchmove.stop.prevent="noop">
    <view class="cropper-header">
      <view class="header-side left" @click="handleCancel">
        <text class="iconfont icon-fanhui header-back-icon"></text>
      </view>

      <view class="header-title">{{ title }}</view>

      <view class="header-side right">
        <view
          class="confirm-btn"
          :class="{ disabled: confirming || !imageReady }"
          @click="handleConfirm"
        >
          {{ confirming ? '处理中' : '确定' }}
        </view>
      </view>
    </view>

    <view class="cropper-body">
      <view
        class="crop-stage"
        :style="stageStyle"
        @touchstart.stop="onTouchStart"
        @touchmove.stop.prevent="onTouchMove"
        @touchend.stop="onTouchEnd"
        @touchcancel.stop="onTouchEnd"
      >
        <image
          v-if="imageReady"
          class="crop-image"
          :src="imagePath"
          mode="widthFix"
          :style="imageStyle"
          draggable="false"
        />

        <view class="dim dim-top" :style="dimTopStyle"></view>
        <view class="dim dim-bottom" :style="dimBottomStyle"></view>
        <view class="dim dim-left" :style="dimLeftStyle"></view>
        <view class="dim dim-right" :style="dimRightStyle"></view>

        <view
          class="crop-frame"
          :class="{ circle: maskShape === 'circle' }"
          :style="cropFrameStyle"
        ></view>
      </view>

      <view class="tips">拖动图片调整位置，双指缩放</view>
    </view>

    <canvas
      class="crop-canvas"
      :canvas-id="canvasId"
      :id="canvasId"
      :style="canvasStyle"
    ></canvas>
  </view>
</template>

<script>
export default {
  name: 'AvatarCropper',

  props: {
    visible: {
      type: Boolean,
      default: false
    },

    src: {
      type: String,
      default: ''
    },

    title: {
      type: String,
      default: '裁剪头像'
    },

    outputWidth: {
      type: Number,
      default: 512
    },

    outputHeight: {
      type: Number,
      default: 512
    },

    maskShape: {
      type: String,
      default: 'circle'
    }
  },

  data() {
    return {
      canvasId: `avatarCropCanvas_${Math.random().toString(36).slice(2)}`,

      imagePath: '',
      imageReady: false,
      confirming: false,

      stageWidth: 375,
      stageHeight: 500,

      cropSize: 340,
      cropLeft: 17,
      cropTop: 80,

      naturalWidth: 0,
      naturalHeight: 0,
      sourceSize: 0,

      scale: 1,
      minScale: 1,
      maxScale: 4,

      imgLeft: 0,
      imgTop: 0,

      dragging: false,
      lastX: 0,
      lastY: 0,

      pinching: false,
      pinchStartDistance: 0,
      pinchStartScale: 1
    }
  },

  computed: {
    stageStyle() {
      return [
        `width:${this.stageWidth}px`,
        `height:${this.stageHeight}px`
      ].join(';')
    },

    imageStyle() {
      const width = this.getDisplayWidth()

      return [
        `width:${width}px`,
        `left:${this.imgLeft}px`,
        `top:${this.imgTop}px`
      ].join(';')
    },

    cropFrameStyle() {
      return [
        `width:${this.cropSize}px`,
        `height:${this.cropSize}px`,
        `left:${this.cropLeft}px`,
        `top:${this.cropTop}px`
      ].join(';')
    },

    dimTopStyle() {
      return [
        'left:0',
        'top:0',
        `width:${this.stageWidth}px`,
        `height:${this.cropTop}px`
      ].join(';')
    },

    dimBottomStyle() {
      return [
        'left:0',
        `top:${this.cropTop + this.cropSize}px`,
        `width:${this.stageWidth}px`,
        `height:${this.stageHeight - this.cropTop - this.cropSize}px`
      ].join(';')
    },

    dimLeftStyle() {
      return [
        'left:0',
        `top:${this.cropTop}px`,
        `width:${this.cropLeft}px`,
        `height:${this.cropSize}px`
      ].join(';')
    },

    dimRightStyle() {
      return [
        `left:${this.cropLeft + this.cropSize}px`,
        `top:${this.cropTop}px`,
        `width:${this.stageWidth - this.cropLeft - this.cropSize}px`,
        `height:${this.cropSize}px`
      ].join(';')
    },

    canvasStyle() {
      return [
        `width:${this.outputWidth}px`,
        `height:${this.outputHeight}px`
      ].join(';')
    }
  },

  watch: {
    visible(val) {
      if (val) {
        this.$nextTick(() => {
          this.initStageSize()
          this.initCropper()
        })
      }
    },

    src() {
      if (this.visible) {
        this.$nextTick(() => {
          this.initStageSize()
          this.initCropper()
        })
      }
    }
  },

  mounted() {
    this.initStageSize()

    if (this.visible) {
      this.initCropper()
    }
  },

  methods: {
    noop() {},

    initStageSize() {
      try {
        const sys = uni.getSystemInfoSync()
        const windowWidth = Number(sys.windowWidth || 375)
        const windowHeight = Number(sys.windowHeight || 667)

        this.stageWidth = windowWidth

        // 裁剪方框略小于屏幕宽度。
        // 375px 屏幕约为 341px，左右各留约 17px。
        const cropInset = Math.max(
          14,
          Math.min(22, Math.floor(windowWidth * 0.045))
        )

        this.cropSize = windowWidth - cropInset * 2
        this.cropLeft = Math.floor((windowWidth - this.cropSize) / 2)

        // 舞台高度大于裁剪框，且比上一版更高。
        // 这样裁剪框上下能露出更多被遮罩压暗的图片。
        const preferredHeight = Math.floor(this.cropSize * 1.75)
        const maxUsableHeight = Math.floor(windowHeight * 0.85)

        this.stageHeight = Math.max(
          this.cropSize + 180,
          Math.min(preferredHeight, maxUsableHeight)
        )

        this.cropTop = Math.floor((this.stageHeight - this.cropSize) / 2)
      } catch (e) {
        this.stageWidth = 375
        this.cropSize = 341
        this.cropLeft = 17
        this.stageHeight = 500
        this.cropTop = 79
      }
    },

    initCropper() {
      this.confirming = false
      this.imageReady = false
      this.imagePath = ''
      this.dragging = false
      this.pinching = false

      if (!this.src) return

      uni.getImageInfo({
        src: this.src,
        success: (info) => {
          this.imagePath = info.path || this.src
          this.naturalWidth = Number(info.width || 1)
          this.naturalHeight = Number(info.height || 1)

          // 初始裁剪源区域取原图短边，避免横向或纵向压缩。
          this.sourceSize = Math.min(this.naturalWidth, this.naturalHeight)

          // 初始状态：原图短边撑满裁剪方框。
          this.minScale = this.cropSize / this.sourceSize
          this.maxScale = this.minScale * 4
          this.scale = this.minScale

          this.resetImageToCenter()

          this.imageReady = true
        },
        fail: (err) => {
          console.error('AvatarCropper getImageInfo failed:', err)

          uni.showToast({
            title: '图片读取失败',
            icon: 'none'
          })

          this.handleCancel()
        }
      })
    },

    resetImageToCenter() {
      const displayWidth = this.getDisplayWidth()
      const displayHeight = this.getDisplayHeight()

      this.imgLeft = this.cropLeft + (this.cropSize - displayWidth) / 2
      this.imgTop = this.cropTop + (this.cropSize - displayHeight) / 2

      this.clampImagePosition()
    },

    getDisplayWidth() {
      return this.naturalWidth * this.scale
    },

    getDisplayHeight() {
      return this.naturalHeight * this.scale
    },

    handleCancel() {
      if (this.confirming) return
      this.$emit('close')
    },

    getTouchPoint(touch) {
      return {
        x: touch.clientX ?? touch.pageX ?? 0,
        y: touch.clientY ?? touch.pageY ?? 0
      }
    },

    getTouchDistance(touches) {
      if (!touches || touches.length < 2) return 0

      const p1 = this.getTouchPoint(touches[0])
      const p2 = this.getTouchPoint(touches[1])

      const dx = p1.x - p2.x
      const dy = p1.y - p2.y

      return Math.sqrt(dx * dx + dy * dy)
    },

    onTouchStart(e) {
      if (!this.imageReady) return

      const touches = e.touches || []
      if (!touches.length) return

      if (touches.length >= 2) {
        this.pinching = true
        this.dragging = false
        this.pinchStartDistance = this.getTouchDistance(touches)
        this.pinchStartScale = this.scale
        return
      }

      const point = this.getTouchPoint(touches[0])

      this.dragging = true
      this.pinching = false
      this.lastX = point.x
      this.lastY = point.y
    },

    onTouchMove(e) {
      if (!this.imageReady) return

      const touches = e.touches || []
      if (!touches.length) return

      if (touches.length >= 2 && this.pinching) {
        const distance = this.getTouchDistance(touches)

        if (!distance || !this.pinchStartDistance) return

        const nextScale = this.pinchStartScale * (distance / this.pinchStartDistance)
        this.setScale(nextScale)

        return
      }

      if (!this.dragging) return

      const point = this.getTouchPoint(touches[0])

      const dx = point.x - this.lastX
      const dy = point.y - this.lastY

      this.imgLeft += dx
      this.imgTop += dy

      this.lastX = point.x
      this.lastY = point.y

      this.clampImagePosition()
    },

    onTouchEnd() {
      this.dragging = false
      this.pinching = false
    },

    setScale(nextScale) {
      const oldScale = this.scale || this.minScale
      const scale = Math.max(this.minScale, Math.min(this.maxScale, nextScale))

      const centerX = this.cropLeft + this.cropSize / 2
      const centerY = this.cropTop + this.cropSize / 2

      const imagePointX = (centerX - this.imgLeft) / oldScale
      const imagePointY = (centerY - this.imgTop) / oldScale

      this.scale = scale

      this.imgLeft = centerX - imagePointX * this.scale
      this.imgTop = centerY - imagePointY * this.scale

      this.clampImagePosition()
    },

    clampImagePosition() {
      const displayWidth = this.getDisplayWidth()
      const displayHeight = this.getDisplayHeight()

      const minLeft = this.cropLeft + this.cropSize - displayWidth
      const maxLeft = this.cropLeft

      const minTop = this.cropTop + this.cropSize - displayHeight
      const maxTop = this.cropTop

      if (displayWidth <= this.cropSize) {
        this.imgLeft = this.cropLeft + (this.cropSize - displayWidth) / 2
      } else {
        this.imgLeft = Math.min(maxLeft, Math.max(minLeft, this.imgLeft))
      }

      if (displayHeight <= this.cropSize) {
        this.imgTop = this.cropTop + (this.cropSize - displayHeight) / 2
      } else {
        this.imgTop = Math.min(maxTop, Math.max(minTop, this.imgTop))
      }
    },

    handleConfirm() {
      if (this.confirming || !this.imageReady || !this.imagePath) return

      this.confirming = true

      const sourceSize = this.cropSize / this.scale

      const sx = (this.cropLeft - this.imgLeft) / this.scale
      const sy = (this.cropTop - this.imgTop) / this.scale

      const safeSx = Math.max(
        0,
        Math.min(this.naturalWidth - sourceSize, sx)
      )

      const safeSy = Math.max(
        0,
        Math.min(this.naturalHeight - sourceSize, sy)
      )

      const ctx = uni.createCanvasContext(this.canvasId, this)

      ctx.clearRect(0, 0, this.outputWidth, this.outputHeight)

      ctx.drawImage(
        this.imagePath,
        safeSx,
        safeSy,
        sourceSize,
        sourceSize,
        0,
        0,
        this.outputWidth,
        this.outputHeight
      )

      ctx.draw(false, () => {
        uni.canvasToTempFilePath({
          canvasId: this.canvasId,
          width: this.outputWidth,
          height: this.outputHeight,
          destWidth: this.outputWidth,
          destHeight: this.outputHeight,
          fileType: 'jpg',
          quality: 0.92,
          success: (res) => {
            this.confirming = false
            this.$emit('confirm', res.tempFilePath)
          },
          fail: (err) => {
            console.error('AvatarCropper canvasToTempFilePath failed:', err)

            this.confirming = false

            uni.showToast({
              title: '裁剪失败',
              icon: 'none'
            })
          }
        }, this)
      })
    }
  }
}
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.cropper-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 2000;
  background: #111111;
  display: flex;
  flex-direction: column;
  font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  box-sizing: border-box;
}

.cropper-header {
  height: 96rpx;
  padding: calc(var(--status-bar-height) + 8rpx) 28rpx 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: content-box;
  color: #ffffff;
}

.header-side {
  width: 120rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  box-sizing: border-box;
}

.header-side.left {
  justify-content: flex-start;
}

.header-side.right {
  justify-content: flex-end;
}

.header-back-icon {
  font-size: 38rpx;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
  line-height: 1;
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 400;
  color: #ffffff;
  line-height: 1;
}

.confirm-btn {
  margin: 0;
  padding: 0 24rpx;
  min-width: 104rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 29rpx;
  background: rgba(253, 231, 209, 1);
  color: #8a5a2b;
  font-size: 26rpx;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.confirm-btn.disabled {
  opacity: 0.55;
}

.cropper-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0 60rpx;
  box-sizing: border-box;
}

.crop-stage {
  position: relative;
  overflow: hidden;
  background: #000000;
}

.crop-image {
  position: absolute;
  z-index: 1;
  display: block;
  will-change: left, top, width;
}

.dim {
  position: absolute;
  z-index: 2;
  background: rgba(0, 0, 0, 0.48);
  pointer-events: none;
}

.crop-frame {
  position: absolute;
  z-index: 3;
  box-sizing: border-box;
  border: 2rpx solid rgba(255, 255, 255, 0.96);
  border-radius: 0;
  box-shadow: 0 0 0 1rpx rgba(0, 0, 0, 0.14);
  pointer-events: none;
}

.crop-frame.circle {
  border-radius: 9999px;
}

.tips {
  margin-top: 34rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.72);
  font-weight: 400;
  line-height: 1.4;
}

.crop-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
  pointer-events: none;
}
</style>