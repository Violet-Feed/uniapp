<template>
  <view v-if="visible" class="cropper-mask" @touchmove.stop.prevent="noop">
    <view class="cropper-header">
      <view class="header-btn" @click="handleCancel">取消</view>
      <view class="header-title">{{ title }}</view>
      <view class="header-btn primary" :class="{ disabled: confirming || !imageReady }" @click="handleConfirm">
        {{ confirming ? '处理中' : '确定' }}
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
          mode="scaleToFill"
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

      <view class="tips">拖动图片调整位置，双指或滑块缩放</view>

      <slider
        class="zoom-slider"
        :value="zoomValue"
        min="100"
        max="400"
        activeColor="#667eea"
        backgroundColor="#3a3a3a"
        block-size="20"
        @changing="onZoomChange"
        @change="onZoomChange"
      />
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
      default: 'circle' // circle | round | square，仅影响预览遮罩；输出仍为正方形图片
    }
  },

  data() {
    return {
      canvasId: `avatarCropCanvas_${Math.random().toString(36).slice(2)}`,
      imagePath: '',
      imageReady: false,
      confirming: false,

      stageSize: 320,
      cropSize: 280,
      cropLeft: 20,
      cropTop: 20,

      naturalWidth: 0,
      naturalHeight: 0,
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
      pinchStartScale: 1,

      zoomValue: 100
    }
  },

  computed: {
    stageStyle() {
      return `width:${this.stageSize}px;height:${this.stageSize}px;`
    },

    imageStyle() {
      const width = this.naturalWidth * this.scale
      const height = this.naturalHeight * this.scale
      return [
        `width:${width}px`,
        `height:${height}px`,
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
      return `left:0;top:0;width:${this.stageSize}px;height:${this.cropTop}px;`
    },

    dimBottomStyle() {
      return `left:0;top:${this.cropTop + this.cropSize}px;width:${this.stageSize}px;height:${this.stageSize - this.cropTop - this.cropSize}px;`
    },

    dimLeftStyle() {
      return `left:0;top:${this.cropTop}px;width:${this.cropLeft}px;height:${this.cropSize}px;`
    },

    dimRightStyle() {
      return `left:${this.cropLeft + this.cropSize}px;top:${this.cropTop}px;width:${this.stageSize - this.cropLeft - this.cropSize}px;height:${this.cropSize}px;`
    },

    canvasStyle() {
      return `width:${this.outputWidth}px;height:${this.outputHeight}px;`
    }
  },

  watch: {
    visible(val) {
      if (val) {
        this.$nextTick(() => {
          this.initCropper()
        })
      }
    },

    src() {
      if (this.visible) {
        this.$nextTick(() => {
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
        const width = Number(sys.windowWidth || 375)
        this.stageSize = Math.min(width, 430)
        this.cropSize = Math.floor(this.stageSize * 0.78)
        this.cropLeft = Math.floor((this.stageSize - this.cropSize) / 2)
        this.cropTop = this.cropLeft
      } catch (e) {
        this.stageSize = 320
        this.cropSize = 280
        this.cropLeft = 20
        this.cropTop = 20
      }
    },

    initCropper() {
      this.confirming = false
      this.imageReady = false
      this.imagePath = ''

      if (!this.src) return

      uni.getImageInfo({
        src: this.src,
        success: (info) => {
          this.imagePath = info.path || this.src
          this.naturalWidth = Number(info.width || 1)
          this.naturalHeight = Number(info.height || 1)

          this.minScale = Math.max(
            this.cropSize / this.naturalWidth,
            this.cropSize / this.naturalHeight
          )
          this.maxScale = this.minScale * 4
          this.scale = this.minScale
          this.zoomValue = 100

          this.imgLeft = (this.stageSize - this.naturalWidth * this.scale) / 2
          this.imgTop = (this.stageSize - this.naturalHeight * this.scale) / 2
          this.clampImagePosition()

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
      const touches = e.touches || []

      if (touches.length >= 2) {
        this.pinching = true
        this.dragging = false
        this.pinchStartDistance = this.getTouchDistance(touches)
        this.pinchStartScale = this.scale
        return
      }

      const point = this.getTouchPoint(touches[0] || {})
      this.dragging = true
      this.pinching = false
      this.lastX = point.x
      this.lastY = point.y
    },

    onTouchMove(e) {
      const touches = e.touches || []

      if (touches.length >= 2 && this.pinching) {
        const distance = this.getTouchDistance(touches)
        if (!distance || !this.pinchStartDistance) return

        const nextScale = this.pinchStartScale * (distance / this.pinchStartDistance)
        this.setScale(nextScale)
        return
      }

      if (!this.dragging || !touches.length) return

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

    onZoomChange(e) {
      const value = Number(e?.detail?.value || 100)
      this.zoomValue = value
      const nextScale = this.minScale * (value / 100)
      this.setScale(nextScale)
    },

    setScale(nextScale) {
      const oldScale = this.scale || this.minScale
      const scale = Math.max(this.minScale, Math.min(this.maxScale, nextScale))

      const centerX = this.cropLeft + this.cropSize / 2
      const centerY = this.cropTop + this.cropSize / 2
      const imagePointX = (centerX - this.imgLeft) / oldScale
      const imagePointY = (centerY - this.imgTop) / oldScale

      this.scale = scale
      this.zoomValue = Math.round((this.scale / this.minScale) * 100)
      this.imgLeft = centerX - imagePointX * this.scale
      this.imgTop = centerY - imagePointY * this.scale

      this.clampImagePosition()
    },

    clampImagePosition() {
      const width = this.naturalWidth * this.scale
      const height = this.naturalHeight * this.scale

      const minLeft = this.cropLeft + this.cropSize - width
      const maxLeft = this.cropLeft
      const minTop = this.cropTop + this.cropSize - height
      const maxTop = this.cropTop

      if (width <= this.cropSize) {
        this.imgLeft = this.cropLeft + (this.cropSize - width) / 2
      } else {
        this.imgLeft = Math.min(maxLeft, Math.max(minLeft, this.imgLeft))
      }

      if (height <= this.cropSize) {
        this.imgTop = this.cropTop + (this.cropSize - height) / 2
      } else {
        this.imgTop = Math.min(maxTop, Math.max(minTop, this.imgTop))
      }
    },

    handleConfirm() {
      if (this.confirming || !this.imageReady || !this.imagePath) return

      this.confirming = true

      const sx = Math.max(0, (this.cropLeft - this.imgLeft) / this.scale)
      const sy = Math.max(0, (this.cropTop - this.imgTop) / this.scale)
      const sw = Math.min(this.naturalWidth - sx, this.cropSize / this.scale)
      const sh = Math.min(this.naturalHeight - sy, this.cropSize / this.scale)

      const ctx = uni.createCanvasContext(this.canvasId, this)
      ctx.clearRect(0, 0, this.outputWidth, this.outputHeight)
      ctx.drawImage(
        this.imagePath,
        sx,
        sy,
        sw,
        sh,
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

<style scoped>
.cropper-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 2000;
  background: #111;
  display: flex;
  flex-direction: column;
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

.header-btn {
  min-width: 100rpx;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.86);
}

.header-btn.primary {
  color: #8ea2ff;
  text-align: right;
  font-weight: 600;
}

.header-btn.disabled {
  opacity: 0.5;
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
}

.cropper-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30rpx 0 70rpx;
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
  will-change: left, top, width, height;
}

.dim {
  position: absolute;
  z-index: 2;
  background: rgba(0, 0, 0, 0.48);
}

.crop-frame {
  position: absolute;
  z-index: 3;
  box-sizing: border-box;
  border: 2rpx solid rgba(255, 255, 255, 0.96);
  border-radius: 24rpx;
  box-shadow: 0 0 0 1rpx rgba(0, 0, 0, 0.14);
}

.crop-frame.circle {
  border-radius: 9999px;
}

.tips {
  margin-top: 34rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.72);
}

.zoom-slider {
  width: 560rpx;
  margin-top: 28rpx;
}

.crop-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
  pointer-events: none;
}
</style>
