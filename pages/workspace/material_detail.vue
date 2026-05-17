<template>
	<view class="material-detail-page">
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">素材详情</text>
				</view>

				<view class="nav-right">
					<view class="publish-btn" :style="publishBtnStyle" @click="goPublish">
						<text class="publish-text" :style="publishTextStyle">发布</text>
					</view>
				</view>
			</view>
		</view>

		<view class="page-body" :style="pageBodyStyle">
			<view class="media-section" :style="mediaSectionStyle">
				<image
					v-if="!isVideo && materialUrl"
					class="material-image"
					:style="mediaInnerStyle"
					:src="materialUrl"
					mode="aspectFit"
					@click="openImagePreview"
					@error="onMediaError"
				/>

				<video
					v-else-if="isVideo && materialUrl && !videoHiddenForScroll"
					class="material-video"
					:style="mediaInnerStyle"
					:src="materialUrl"
					controls
					:show-center-play-btn="true"
					:enable-play-gesture="true"
					:show-fullscreen-btn="true"
					object-fit="contain"
					@error="onVideoError"
				></video>

				<view
					v-else-if="isVideo && materialUrl && videoHiddenForScroll"
					class="video-placeholder"
					:style="mediaInnerStyle"
					@click="scrollBackToTop"
				>
					<view class="video-placeholder-play">
						<text class="video-placeholder-play-text">▶</text>
					</view>
					<text class="video-placeholder-title">视频已收起</text>
					<text class="video-placeholder-subtitle">返回顶部后继续播放</text>
				</view>

				<view v-else class="media-empty">
					<text class="iconfont icon-neirongchuangzuo media-empty-icon"></text>
					<text class="media-empty-text">素材不存在</text>
				</view>
			</view>

			<view v-if="materialUrl" class="media-action-wrap" :style="mediaActionWrapStyle">
				<view class="media-action-bar" :style="mediaActionBarStyle">
					<view
						class="media-action-item"
						:class="{ disabled: saving }"
						@click="downloadMaterial"
					>
						<text class="iconfont icon-xiazai media-action-icon"></text>
						<text class="media-action-text">{{ saving ? '保存中' : '下载' }}</text>
					</view>

					<view class="media-action-divider"></view>

					<view class="media-action-item" @click="shareMaterial">
						<text class="iconfont icon-fenxiang media-action-icon"></text>
						<text class="media-action-text">分享</text>
					</view>
				</view>
			</view>

			<view class="prompt-card" :style="promptCardStyle">
				<view class="section-header">
					<view class="section-title-wrap">
						<view class="section-dot"></view>
						<text class="section-title" :style="sectionTitleStyle">提示词</text>
					</view>

					<view class="copy-btn" v-if="promptText" @click="copyPrompt">
						<text class="copy-btn-text">复制</text>
					</view>
				</view>

				<view class="prompt-content-wrap" :style="promptContentStyle">
					<text class="prompt-content" :style="promptTextStyle" v-if="promptText">
						{{ promptText }}
					</text>
					<text class="prompt-empty" :style="promptTextStyle" v-else>
						暂无提示词
					</text>
				</view>
			</view>
		</view>

		<view
			v-if="preview.visible"
			class="image-preview-mask"
			@click="closeImagePreview"
		>
			<image
				class="image-preview-img"
				:src="preview.url"
				mode="aspectFit"
				@click.stop="closeImagePreview"
			></image>
		</view>
	</view>
</template>

<script>
const PAGE_BG = '#f5f5f7'
const THEME_YELLOW = 'rgba(253, 231, 209, 1)'
const THEME_BROWN = '#8a5a2b'

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value))
}

export default {
	data() {
		return {
			materialId: '',
			materialType: 1,
			materialUrl: '',
			coverUrl: '',
			promptText: '',

			saving: false,
			videoHiddenForScroll: false,

			preview: {
				visible: false,
				url: ''
			},

			windowWidth: 375,
			windowHeight: 667,
			statusBarHeight: 0,
			safeBottom: 0,

			navContentHeight: 38,
			navHeight: 38,

			pagePaddingTop: 10,
			pagePaddingBottom: 24,

			mediaHeight: 360,
			actionHeight: 42,
			actionGap: 10,

			cardRadius: 16,
			cardPaddingX: 14,
			cardPaddingY: 14,
			cardGap: 12,

			promptCardMinHeight: 210,
			promptContentMinHeight: 132,

			backIconSize: 20,
			navTitleFontSize: 17,

			publishHeight: 30,
			publishWidth: 58,
			publishFontSize: 14,

			sectionTitleFontSize: 15,
			promptFontSize: 14
		}
	},

	computed: {
		isVideo() {
			return Number(this.materialType) === 2
		},

		navBarStyle() {
			return (
				'height:' + this.navHeight + 'px;' +
				'padding-top:' + this.statusBarHeight + 'px;' +
				'background:' + PAGE_BG + ';'
			)
		},

		navContentStyle() {
			return 'height:' + this.navContentHeight + 'px;'
		},

		backIconStyle() {
			return 'font-size:' + this.backIconSize + 'px;'
		},

		navTitleStyle() {
			return 'font-size:' + this.navTitleFontSize + 'px;'
		},

		publishBtnStyle() {
			return (
				'height:' + this.publishHeight + 'px;' +
				'width:' + this.publishWidth + 'px;' +
				'border-radius:' + Math.floor(this.publishHeight / 2) + 'px;'
			)
		},

		publishTextStyle() {
			return 'font-size:' + this.publishFontSize + 'px;'
		},

		pageBodyStyle() {
			return (
				'padding-top:' + this.navHeight + 'px;' +
				'padding-bottom:' + (this.pagePaddingBottom + this.safeBottom) + 'px;'
			)
		},

		mediaSectionStyle() {
			return (
				'height:' + this.mediaHeight + 'px;' +
				'margin-top:' + this.pagePaddingTop + 'px;' +
				'background:' + PAGE_BG + ';'
			)
		},

		mediaInnerStyle() {
			return (
				'width:100%;' +
				'height:' + this.mediaHeight + 'px;' +
				'background:' + PAGE_BG + ';'
			)
		},

		mediaActionWrapStyle() {
			const marginX = clamp(Math.floor(this.windowWidth * 0.038), 12, 18)
			return 'margin:' + this.actionGap + 'px ' + marginX + 'px 0;'
		},

		mediaActionBarStyle() {
			return (
				'height:' + this.actionHeight + 'px;' +
				'border-radius:' + Math.floor(this.actionHeight / 2) + 'px;'
			)
		},

		promptCardStyle() {
			const marginX = clamp(Math.floor(this.windowWidth * 0.038), 12, 18)

			return (
				'border-radius:' + this.cardRadius + 'px;' +
				'padding:' + this.cardPaddingY + 'px ' + this.cardPaddingX + 'px;' +
				'margin:' + this.cardGap + 'px ' + marginX + 'px 0;' +
				'min-height:' + this.promptCardMinHeight + 'px;'
			)
		},

		promptContentStyle() {
			return (
				'margin-top:' + Math.max(10, Math.floor(this.windowWidth * 0.028)) + 'px;' +
				'min-height:' + this.promptContentMinHeight + 'px;'
			)
		},

		sectionTitleStyle() {
			return 'font-size:' + this.sectionTitleFontSize + 'px;'
		},

		promptTextStyle() {
			return 'font-size:' + this.promptFontSize + 'px;'
		}
	},

	onLoad(options) {
		this.initResponsiveLayout()
		this.initParams(options || {})
	},

	onShow() {
		this.initResponsiveLayout()
	},

	onPageScroll(e) {
		if (!this.isVideo) return

		const scrollTop = Number(e && e.scrollTop ? e.scrollTop : 0)
		const shouldHideVideo = scrollTop > 2

		if (this.videoHiddenForScroll !== shouldHideVideo) {
			this.videoHiddenForScroll = shouldHideVideo
		}
	},

	methods: {
		initResponsiveLayout() {
			try {
				const sys = uni.getSystemInfoSync()
				const windowWidth = Number(sys.windowWidth || 375)
				const windowHeight = Number(sys.windowHeight || 667)
				const statusBarHeight = Number(sys.statusBarHeight || 0)
				const safeAreaInsets = sys.safeAreaInsets || {}
				const safeBottom = Number(safeAreaInsets.bottom || 0)
				const smallScreenBoost = windowWidth <= 360 ? 1 : 0

				this.windowWidth = windowWidth
				this.windowHeight = windowHeight
				this.statusBarHeight = statusBarHeight
				this.safeBottom = safeBottom

				this.navContentHeight = 38
				this.navHeight = this.statusBarHeight + this.navContentHeight

				this.pagePaddingTop = clamp(Math.floor(windowWidth * 0.026), 8, 12)
				this.pagePaddingBottom = clamp(Math.floor(windowWidth * 0.052), 18, 28)

				this.actionHeight = clamp(Math.floor(windowWidth * 0.112), 38, 44)
				this.actionGap = clamp(Math.floor(windowWidth * 0.027), 8, 12)

				const availableHeight =
					windowHeight -
					this.navHeight -
					this.pagePaddingTop -
					this.pagePaddingBottom -
					safeBottom

				this.mediaHeight = clamp(
					Math.floor(Math.min(windowWidth * 1.08, availableHeight * 0.54)),
					270,
					500
				)

				this.cardRadius = clamp(Math.floor(windowWidth * 0.042), 14, 18)
				this.cardPaddingX = clamp(Math.floor(windowWidth * 0.038), 12, 18)
				this.cardPaddingY = clamp(Math.floor(windowWidth * 0.038), 12, 18)
				this.cardGap = clamp(Math.floor(windowWidth * 0.034), 10, 14)

				const remainingHeight =
					availableHeight -
					this.mediaHeight -
					this.actionHeight -
					this.actionGap -
					this.cardGap

				this.promptCardMinHeight = Math.max(
					clamp(Math.floor(windowHeight * 0.24), 170, 250),
					Math.floor(remainingHeight)
				)

				this.promptContentMinHeight = Math.max(
					112,
					this.promptCardMinHeight - this.cardPaddingY * 2 - 42
				)

				this.backIconSize = clamp(Math.floor(this.navContentHeight * 0.52), 19, 22)
				this.navTitleFontSize = clamp(Math.floor(this.navContentHeight * 0.44) + smallScreenBoost, 16, 18)

				this.publishHeight = clamp(Math.floor(this.navContentHeight * 0.74), 28, 32)
				this.publishWidth = clamp(Math.floor(windowWidth * 0.155), 56, 66)
				this.publishFontSize = clamp(Math.floor(windowWidth * 0.036) + smallScreenBoost, 13, 15)

				this.sectionTitleFontSize = clamp(Math.floor(windowWidth * 0.04) + smallScreenBoost, 15, 16)
				this.promptFontSize = clamp(Math.floor(windowWidth * 0.037) + smallScreenBoost, 13, 15)
			} catch (err) {
				this.windowWidth = 375
				this.windowHeight = 667
				this.statusBarHeight = 0
				this.safeBottom = 0

				this.navContentHeight = 38
				this.navHeight = 38

				this.pagePaddingTop = 10
				this.pagePaddingBottom = 24

				this.mediaHeight = 340
				this.actionHeight = 42
				this.actionGap = 10

				this.cardRadius = 16
				this.cardPaddingX = 14
				this.cardPaddingY = 14
				this.cardGap = 12

				this.promptCardMinHeight = 210
				this.promptContentMinHeight = 132

				this.backIconSize = 20
				this.navTitleFontSize = 17

				this.publishHeight = 30
				this.publishWidth = 58
				this.publishFontSize = 14

				this.sectionTitleFontSize = 15
				this.promptFontSize = 14
			}
		},

		initParams(options) {
			this.materialId = this.decodeValue(
				options.material_id ||
				''
			)

			this.materialType = Number(
				this.decodeValue(
					options.material_type ||
					1
				)
			) || 1

			this.materialUrl = this.decodeValue(
				options.material_url ||
				''
			)
			
			this.coverUrl = this.decodeValue(
				options.cover_url ||
				''
			)

			this.promptText = this.decodeValue(
				options.prompt ||
				''
			)
		},

		decodeValue(value) {
			if (value === undefined || value === null) return ''
			const raw = String(value)

			try {
				return decodeURIComponent(raw)
			} catch (err) {
				return raw
			}
		},

		goBack() {
			uni.navigateBack()
		},

		goPublish() {
			if (!this.materialId || !this.materialUrl) {
				uni.showToast({
					title: '素材信息不完整',
					icon: 'none'
				})
				return
			}

			const materialId = encodeURIComponent(this.materialId)
			const materialType = encodeURIComponent(String(this.materialType))
			const materialUrl = encodeURIComponent(this.materialUrl)
			const coverUrl = encodeURIComponent(this.coverUrl)
			const prompt = encodeURIComponent(this.promptText || '')

			uni.navigateTo({
				url:
					`/pages/workspace/publish?material_id=${materialId}` +
					`&material_type=${materialType}` +
					`&material_url=${materialUrl}` +
					`&cover_url=${coverUrl}` +
					`&prompt=${prompt}`
			})
		},

		scrollBackToTop() {
			uni.pageScrollTo({
				scrollTop: 0,
				duration: 220
			})
		},

		openImagePreview() {
			if (this.isVideo || !this.materialUrl) return

			uni.previewImage({
				current: this.materialUrl,
				urls: [this.materialUrl],
				fail: () => {
					this.preview = {
						visible: true,
						url: this.materialUrl
					}
				}
			})
		},

		closeImagePreview() {
			this.preview = {
				visible: false,
				url: ''
			}
		},

		copyPrompt() {
			if (!this.promptText) return

			uni.setClipboardData({
				data: this.promptText,
				success: () => {
					uni.showToast({
						title: '已复制',
						icon: 'success'
					})
				}
			})
		},

		shareMaterial() {
			uni.showToast({
				title: '开发中',
				icon: 'none'
			})
		},

		downloadMaterial() {
			if (!this.materialUrl || this.saving) return

			if (this.isVideo) {
				this.downloadVideo(this.materialUrl)
			} else {
				this.downloadImage(this.materialUrl)
			}
		},

		downloadImage(url) {
			if (!url || this.saving) return

			this.saving = true

			const finish = () => {
				this.saving = false
			}

			// #ifdef H5
			try {
				const a = document.createElement('a')
				a.href = url
				a.download = `material_${this.materialId || Date.now()}.jpg`
				a.target = '_blank'
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)

				uni.showToast({
					title: '已开始下载',
					icon: 'none'
				})
			} catch (err) {
				console.error('H5 下载图片失败：', err)
				window.open(url, '_blank')
			} finally {
				finish()
			}
			return
			// #endif

			const saveToAlbum = (filePath) => {
				uni.saveImageToPhotosAlbum({
					filePath,
					success: () => {
						uni.showToast({
							title: '已保存到相册',
							icon: 'success'
						})
					},
					fail: (err) => {
						console.error('保存图片失败：', err)
						uni.showToast({
							title: '保存失败',
							icon: 'none'
						})
					},
					complete: finish
				})
			}

			if (/^https?:\/\//.test(url)) {
				uni.downloadFile({
					url,
					success: (res) => {
						if (res.statusCode === 200 && res.tempFilePath) {
							saveToAlbum(res.tempFilePath)
							return
						}

						finish()
						uni.showToast({
							title: '下载失败',
							icon: 'none'
						})
					},
					fail: (err) => {
						console.error('下载图片失败：', err)
						finish()
						uni.showToast({
							title: '下载失败',
							icon: 'none'
						})
					}
				})
				return
			}

			saveToAlbum(url)
		},

		downloadVideo(url) {
			if (!url || this.saving) return

			this.saving = true

			const finish = () => {
				this.saving = false
			}

			// #ifdef H5
			try {
				const a = document.createElement('a')
				a.href = url
				a.download = `material_${this.materialId || Date.now()}.mp4`
				a.target = '_blank'
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)

				uni.showToast({
					title: '已开始下载',
					icon: 'none'
				})
			} catch (err) {
				console.error('H5 下载视频失败：', err)
				window.open(url, '_blank')
			} finally {
				finish()
			}
			return
			// #endif

			const saveVideo = (filePath) => {
				uni.saveVideoToPhotosAlbum({
					filePath,
					success: () => {
						uni.showToast({
							title: '已保存到相册',
							icon: 'success'
						})
					},
					fail: (err) => {
						console.error('保存视频失败：', err)
						uni.showToast({
							title: '保存失败',
							icon: 'none'
						})
					},
					complete: finish
				})
			}

			if (/^https?:\/\//.test(url)) {
				uni.downloadFile({
					url,
					success: (res) => {
						if (res.statusCode === 200 && res.tempFilePath) {
							saveVideo(res.tempFilePath)
							return
						}

						finish()
						uni.showToast({
							title: '下载失败',
							icon: 'none'
						})
					},
					fail: (err) => {
						console.error('下载视频失败：', err)
						finish()
						uni.showToast({
							title: '下载失败',
							icon: 'none'
						})
					}
				})
				return
			}

			saveVideo(url)
		},

		onMediaError() {
			uni.showToast({
				title: '素材加载失败',
				icon: 'none'
			})
		},

		onVideoError(err) {
			console.error('视频加载失败：', err)
			uni.showToast({
				title: '视频加载失败',
				icon: 'none'
			})
		}
	}
}
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.material-detail-page {
	min-height: 100vh;
	background: #f5f5f7;
	font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
	box-sizing: border-box;
}

.nav-bar {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 9999;
	background: #f5f5f7;
	box-sizing: border-box;
	overflow: hidden;
}

.nav-content {
	width: 100%;
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	padding-left: 8px;
	padding-right: 8px;
	padding-bottom: 4px;
	box-sizing: border-box;
	background: #f5f5f7;
}

.nav-left,
.nav-right {
	width: 76px;
	height: 30px;
	display: flex;
	align-items: center;
	flex-shrink: 0;
	box-sizing: border-box;
}

.nav-left {
	justify-content: flex-start;
}

.nav-right {
	justify-content: flex-end;
}

.back-icon {
	width: 44px;
	height: 30px;
	line-height: 30px;
	text-align: center;
	color: #222222;
	font-weight: 400;
}

.nav-title-wrap {
	flex: 1;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 0;
	box-sizing: border-box;
}

.nav-title {
	color: #222222;
	font-weight: 400;
	line-height: 30px;
	text-align: center;
}

.publish-btn {
	background: rgba(253, 231, 209, 1);
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.publish-text {
	color: #8a5a2b;
	font-weight: 400;
	line-height: 1;
	text-align: center;
}

.page-body {
	box-sizing: border-box;
}

.media-section {
	width: 100%;
	background: #f5f5f7;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	box-sizing: border-box;
	z-index: 1;
}

.material-image {
	width: 100%;
	background: #f5f5f7;
	display: block;
}

.material-video {
	width: 100%;
	background: #f5f5f7;
	display: block;
	object-fit: contain;
	position: relative;
	z-index: 1;
}

.video-placeholder {
	background: #f5f5f7;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.video-placeholder-play {
	width: 58px;
	height: 58px;
	border-radius: 29px;
	background: rgba(253, 231, 209, 1);
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.video-placeholder-play-text {
	margin-left: 4px;
	font-size: 24px;
	color: #8a5a2b;
	line-height: 1;
	font-weight: 400;
}

.video-placeholder-title {
	margin-top: 14px;
	font-size: 15px;
	color: #333333;
	line-height: 1.4;
	font-weight: 400;
}

.video-placeholder-subtitle {
	margin-top: 6px;
	font-size: 12px;
	color: #999999;
	line-height: 1.4;
	font-weight: 400;
}

.media-action-wrap {
	box-sizing: border-box;
}

.media-action-bar {
	width: 100%;
	background: #ffffff;
	display: flex;
	align-items: center;
	overflow: hidden;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
}

.media-action-item {
	flex: 1;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	box-sizing: border-box;
}

.media-action-item:active {
	background: #fafafa;
}

.media-action-item.disabled {
	opacity: 0.52;
}

.media-action-divider {
	width: 1px;
	height: 18px;
	background: #eeeeee;
	flex-shrink: 0;
}

.media-action-icon {
	font-size: 15px;
	color: #8a5a2b;
	line-height: 1;
	font-weight: 400;
}

.media-action-text {
	font-size: 13px;
	color: #333333;
	line-height: 1;
	font-weight: 400;
}

.media-empty {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.media-empty-icon {
	font-size: 48px;
	color: rgba(253, 190, 120, 1);
	line-height: 1;
	font-weight: 400;
}

.media-empty-text {
	margin-top: 10px;
	color: #999999;
	font-size: 14px;
	font-weight: 400;
}

.prompt-card {
	background: #ffffff;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.section-title-wrap {
	display: flex;
	align-items: center;
	min-width: 0;
}

.section-dot {
	width: 6px;
	height: 6px;
	border-radius: 3px;
	background: rgba(253, 190, 120, 1);
	margin-right: 8px;
	flex-shrink: 0;
}

.section-title {
	color: #1f2329;
	font-weight: 400;
	line-height: 1.4;
}

.copy-btn {
	height: 26px;
	border-radius: 13px;
	padding: 0 10px;
	background: #f5f5f7;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.copy-btn:active {
	opacity: 0.75;
}

.copy-btn-text {
	font-size: 12px;
	color: #8a5a2b;
	font-weight: 400;
	line-height: 1;
}

.prompt-content-wrap {
	background: #fafafa;
	border-radius: 12px;
	padding: 12px;
	box-sizing: border-box;
	flex: 1;
}

.prompt-content,
.prompt-empty {
	display: block;
	color: #4e5969;
	font-weight: 400;
	line-height: 1.75;
	white-space: pre-wrap;
	word-break: break-word;
}

.prompt-empty {
	color: #a0a7b4;
}

.image-preview-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 3000;
	background: rgba(0, 0, 0, 0.96);
	display: flex;
	align-items: center;
	justify-content: center;
}

.image-preview-img {
	width: 100%;
	height: 100%;
}
</style>