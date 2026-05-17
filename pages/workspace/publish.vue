<template>
	<view class="publish-page">
		<view v-if="!coverCropper.visible" class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click.stop="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">发布创作</text>
				</view>

				<view class="nav-right"></view>
			</view>
		</view>

		<view class="content" :style="contentStyle">
			<view v-if="!coverCropper.visible" class="media-section" :style="mediaSectionStyle">
				<video
					v-if="isVideo && materialUrl && !videoHiddenForScroll"
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

				<image
					v-else-if="materialUrl"
					class="material-image"
					:style="mediaInnerStyle"
					:src="materialUrl"
					mode="aspectFit"
					@click="previewImage"
					@error="onMediaError"
				></image>

				<view v-else class="media-empty" :style="mediaInnerStyle">
					<text class="iconfont icon-neirongchuangzuo media-empty-icon"></text>
					<text class="media-empty-text">素材不存在</text>
				</view>
			</view>

			<view class="cover-card" :style="coverCardStyle">
				<view class="cover-header">
					<view class="section-title-wrap">
						<view class="section-dot"></view>
						<text class="section-title" :style="sectionTitleStyle">封面预览</text>
					</view>
				</view>

				<view
					class="cover-preview"
					:style="coverPreviewStyle"
					@click="openCoverSourcePopup"
				>
					<image
						v-if="coverUrl"
						class="cover-image"
						:src="coverUrl"
						mode="aspectFill"
						@error="onCoverError"
					></image>

					<view v-else class="cover-empty">
						<text class="iconfont icon-neirongchuangzuo cover-empty-icon"></text>
						<text class="cover-empty-text">暂无封面</text>
					</view>

					<view class="cover-mask">
						<text class="cover-mask-text">
							{{ uploadingCover ? '封面上传中' : '点击修改封面' }}
						</text>
					</view>
				</view>
			</view>

			<view class="form-card" :style="formCardStyle">
				<view class="section">
					<view class="section-header">
						<view class="section-title-wrap">
							<view class="section-dot"></view>
							<text class="section-title" :style="sectionTitleStyle">标题</text>
						</view>
						<text class="input-counter">{{ title.length }}/50</text>
					</view>

					<input
						class="input"
						:style="inputStyle"
						v-model="title"
						placeholder="请输入标题"
						placeholder-class="input-placeholder"
						:adjust-position="false"
						maxlength="50"
					/>
				</view>

				<view class="section">
					<view class="section-header">
						<view class="section-title-wrap">
							<view class="section-dot"></view>
							<text class="section-title" :style="sectionTitleStyle">内容</text>
						</view>
						<text class="input-counter">{{ content.length }}/500</text>
					</view>

					<textarea
						class="textarea"
						:style="textareaStyle"
						v-model="content"
						placeholder="写点说明、心情或者创作故事..."
						placeholder-class="input-placeholder"
						:adjust-position="false"
						maxlength="500"
					/>
				</view>

				<view class="section last-section">
					<view class="section-header">
						<view class="section-title-wrap">
							<view class="section-dot"></view>
							<text class="section-title" :style="sectionTitleStyle">标签</text>
						</view>
					</view>

					<picker
						mode="selector"
						:range="categoryOptions"
						range-key="label"
						:value="selectedCategoryIndex"
						@change="onCategoryChange"
					>
						<view class="picker-box" :style="inputStyle">
							<text
								class="picker-text"
								:class="{ placeholder: selectedCategoryIndex === -1 }"
								:style="formTextStyle"
							>
								{{
									selectedCategoryIndex === -1
										? '请选择标签'
										: categoryOptions[selectedCategoryIndex].label
								}}
							</text>
							<text class="picker-icon">›</text>
						</view>
					</picker>
				</view>
			</view>
		</view>

		<view class="bottom-bar" :style="bottomBarStyle">
			<button
				class="submit-btn"
				:class="{ disabled: !canPublish || uploadingCover }"
				:style="submitBtnStyle"
				@click="handlePublish"
			>
				<text class="submit-btn-text" :style="submitTextStyle">
					{{ uploadingCover ? '封面上传中' : '发布' }}
				</text>
			</button>
		</view>

		<view
			v-if="preview.visible"
			class="image-preview-mask"
			@click="closePreview"
		>
			<image
				class="image-preview-img"
				:src="preview.url"
				mode="aspectFit"
				@click.stop="closePreview"
			></image>
		</view>

		<avatar-cropper
			:visible="coverCropper.visible"
			:src="coverCropper.src"
			title="裁剪封面"
			mask-shape="rect"
			@close="closeCoverCropper"
			@confirm="onCoverCropped"
		/>

		<view
			class="cover-source-mask"
			v-if="coverSourceVisible"
			@click="closeCoverSourcePopup"
		>
			<view class="cover-source-panel" @click.stop>
				<view class="cover-source-item" @click="chooseCoverForCrop('camera')">拍照</view>
				<view class="cover-source-item" @click="chooseCoverForCrop('album')">从相册选择</view>
				<view
					class="cover-source-item"
					:class="{ disabled: !coverUrl }"
					@click="cropOriginalCover"
				>
					裁剪原封面
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { createCreation } from '@/request/creation.js'
import { uploadImage } from '@/request/common.js'
import AvatarCropper from '@/components/avatar-cropper.vue'

const PAGE_BG = '#f5f5f7'
const THEME_YELLOW = 'rgba(253, 231, 209, 1)'
const THEME_BROWN = '#8a5a2b'

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value))
}

export default {
	components: {
		AvatarCropper
	},

	data() {
		return {
			materialId: '',
			materialType: 1,
			materialUrl: '',
			coverUrl: '',

			title: '',
			content: '',

			categoryOptions: [
				{ label: '生活', value: 'life' },
				{ label: '社会', value: 'society' },
				{ label: '科技', value: 'tech' },
				{ label: '娱乐', value: 'entertainment' }
			],
			selectedCategoryIndex: -1,

			videoHiddenForScroll: false,

			preview: {
				visible: false,
				url: ''
			},

			coverCropper: {
				visible: false,
				src: ''
			},
			coverSourceVisible: false,
			uploadingCover: false,

			windowWidth: 375,
			windowHeight: 667,
			statusBarHeight: 0,
			safeBottom: 0,

			navContentHeight: 38,
			navHeight: 38,

			pagePaddingTop: 10,
			pagePaddingBottom: 24,
			pagePaddingX: 14,

			mediaHeight: 330,
			coverHeight: 200,

			cardRadius: 16,
			cardPaddingX: 14,
			cardPaddingY: 14,
			cardGap: 12,

			inputHeight: 42,
			textareaHeight: 116,

			bottomPaddingTop: 8,
			bottomPaddingX: 16,
			submitHeight: 46,
			bottomContentHeight: 66,

			backIconSize: 20,
			navTitleFontSize: 17,
			sectionTitleFontSize: 15,
			formFontSize: 14,
			submitFontSize: 15
		}
	},

	computed: {
		isVideo() {
			return Number(this.materialType) === 2
		},

		canPublish() {
			return this.title.trim().length > 0 && this.selectedCategoryIndex !== -1
		},

		selectedCategory() {
			if (this.selectedCategoryIndex === -1) return null
			return this.categoryOptions[this.selectedCategoryIndex]
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

		contentStyle() {
			return (
				'padding-top:' + this.navHeight + 'px;' +
				'padding-bottom:' + (this.bottomContentHeight + this.safeBottom + this.pagePaddingBottom) + 'px;'
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

		coverCardStyle() {
			return (
				'border-radius:' + this.cardRadius + 'px;' +
				'padding:' + this.cardPaddingY + 'px ' + this.cardPaddingX + 'px;' +
				'margin:' + this.cardGap + 'px ' + this.pagePaddingX + 'px 0;'
			)
		},

		coverPreviewStyle() {
			return (
				'height:' + this.coverHeight + 'px;' +
				'border-radius:' + Math.floor(this.cardRadius * 0.86) + 'px;'
			)
		},

		formCardStyle() {
			return (
				'border-radius:' + this.cardRadius + 'px;' +
				'padding:' + this.cardPaddingY + 'px ' + this.cardPaddingX + 'px;' +
				'margin:' + this.cardGap + 'px ' + this.pagePaddingX + 'px 0;'
			)
		},

		sectionTitleStyle() {
			return 'font-size:' + this.sectionTitleFontSize + 'px;'
		},

		formTextStyle() {
			return 'font-size:' + this.formFontSize + 'px;'
		},

		inputStyle() {
			return (
				'height:' + this.inputHeight + 'px;' +
				'font-size:' + this.formFontSize + 'px;' +
				'border-radius:' + Math.floor(this.inputHeight * 0.28) + 'px;'
			)
		},

		textareaStyle() {
			return (
				'height:' + this.textareaHeight + 'px;' +
				'font-size:' + this.formFontSize + 'px;' +
				'border-radius:12px;'
			)
		},

		bottomBarStyle() {
			return (
				'padding:' +
				this.bottomPaddingTop +
				'px ' +
				this.bottomPaddingX +
				'px ' +
				(12 + this.safeBottom) +
				'px;'
			)
		},

		submitBtnStyle() {
			return (
				'height:' + this.submitHeight + 'px;' +
				'line-height:' + this.submitHeight + 'px;' +
				'border-radius:' + Math.floor(this.submitHeight / 2) + 'px;' +
				'background:' + THEME_YELLOW + ';'
			)
		},

		submitTextStyle() {
			return 'font-size:' + this.submitFontSize + 'px;color:' + THEME_BROWN + ';'
		}
	},

	onLoad(options) {
		this.initResponsiveLayout()
		this.initParams(options || {})
	},

	onShow() {
		this.initResponsiveLayout()
	},

	onBackPress() {
		if (this.coverCropper.visible) {
			this.closeCoverCropper()
			return true
		}

		if (this.coverSourceVisible) {
			this.closeCoverSourcePopup()
			return true
		}

		return false
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
				this.navHeight = statusBarHeight + this.navContentHeight

				this.pagePaddingTop = clamp(Math.floor(windowWidth * 0.026), 8, 12)
				this.pagePaddingBottom = clamp(Math.floor(windowWidth * 0.052), 18, 28)
				this.pagePaddingX = clamp(Math.floor(windowWidth * 0.038), 12, 18)

				this.cardRadius = clamp(Math.floor(windowWidth * 0.042), 14, 18)
				this.cardPaddingX = clamp(Math.floor(windowWidth * 0.038), 12, 18)
				this.cardPaddingY = clamp(Math.floor(windowWidth * 0.038), 12, 18)
				this.cardGap = clamp(Math.floor(windowWidth * 0.034), 10, 14)

				const availableHeight = windowHeight - this.navHeight - safeBottom
				this.mediaHeight = clamp(
					Math.floor(Math.min(windowWidth * 1.04, availableHeight * 0.42)),
					250,
					420
				)
				this.coverHeight = windowWidth - this.pagePaddingX * 2 - this.cardPaddingX * 2

				this.inputHeight = clamp(Math.floor(windowWidth * 0.112), 40, 46)
				this.textareaHeight = clamp(Math.floor(windowHeight * 0.17), 106, 138)

				this.bottomPaddingTop = clamp(Math.floor(windowWidth * 0.018), 6, 8)
				this.bottomPaddingX = clamp(Math.floor(windowWidth * 0.042), 14, 18)
				this.submitHeight = clamp(Math.floor(windowWidth * 0.122), 42, 48)
				this.bottomContentHeight = this.bottomPaddingTop + this.submitHeight + 12

				this.backIconSize = clamp(Math.floor(this.navContentHeight * 0.52), 19, 22)
				this.navTitleFontSize = clamp(Math.floor(this.navContentHeight * 0.44) + smallScreenBoost, 16, 18)
				this.sectionTitleFontSize = clamp(Math.floor(windowWidth * 0.04) + smallScreenBoost, 15, 16)
				this.formFontSize = clamp(Math.floor(windowWidth * 0.037) + smallScreenBoost, 13, 15)
				this.submitFontSize = clamp(Math.floor(windowWidth * 0.04), 14, 16)
			} catch (err) {
				this.windowWidth = 375
				this.windowHeight = 667
				this.statusBarHeight = 0
				this.safeBottom = 0

				this.navContentHeight = 38
				this.navHeight = 38

				this.pagePaddingTop = 10
				this.pagePaddingBottom = 24
				this.pagePaddingX = 14
				
				this.cardRadius = 16
				this.cardPaddingX = 14
				this.cardPaddingY = 14
				this.cardGap = 12

				this.mediaHeight = 330
				this.coverHeight = this.windowWidth - this.pagePaddingX * 2 - this.cardPaddingX * 2

				this.inputHeight = 42
				this.textareaHeight = 116

				this.bottomPaddingTop = 8
				this.bottomPaddingX = 16
				this.submitHeight = 46
				this.bottomContentHeight = 66

				this.backIconSize = 20
				this.navTitleFontSize = 17
				this.sectionTitleFontSize = 15
				this.formFontSize = 14
				this.submitFontSize = 15
			}
		},

		initParams(options) {
			this.materialId = this.decodeValue(options.material_id || options.materialId || '')
			this.materialType = Number(this.decodeValue(options.material_type || options.materialType || 1)) || 1
			this.materialUrl = this.decodeValue(options.material_url || options.materialUrl || '')
			this.coverUrl = this.decodeValue(options.cover_url || options.coverUrl || '')
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
			if (this.coverCropper.visible) {
				this.closeCoverCropper()
				return
			}

			if (this.coverSourceVisible) {
				this.closeCoverSourcePopup()
				return
			}

			uni.navigateBack()
		},

		scrollBackToTop() {
			uni.pageScrollTo({
				scrollTop: 0,
				duration: 220
			})
		},

		previewImage() {
			if (!this.materialUrl || this.isVideo) return

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

		closePreview() {
			this.preview = {
				visible: false,
				url: ''
			}
		},

		onCategoryChange(e) {
			this.selectedCategoryIndex = Number(e.detail.value)
		},

		openCoverSourcePopup() {
			if (this.uploadingCover) return
			this.coverSourceVisible = true
		},

		closeCoverSourcePopup() {
			this.coverSourceVisible = false
		},

		chooseCoverForCrop(sourceType) {
			if (this.uploadingCover) return

			this.closeCoverSourcePopup()

			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: [sourceType],
				success: (res) => {
					const filePath = res?.tempFilePaths?.[0]
					if (!filePath) return
					this.openCoverCropper(filePath)
				},
				fail: () => {}
			})
		},

		cropOriginalCover() {
			if (this.uploadingCover) return

			this.closeCoverSourcePopup()

			if (!this.coverUrl) {
				uni.showToast({
					title: '暂无原封面',
					icon: 'none'
				})
				return
			}

			if (/^https?:\/\//i.test(this.coverUrl)) {
				uni.downloadFile({
					url: this.coverUrl,
					success: (res) => {
						if (res.statusCode === 200 && res.tempFilePath) {
							this.openCoverCropper(res.tempFilePath)
							return
						}

						this.openCoverCropper(this.coverUrl)
					},
					fail: () => {
						this.openCoverCropper(this.coverUrl)
					}
				})
				return
			}

			this.openCoverCropper(this.coverUrl)
		},

		openCoverCropper(src) {
			if (!src) return

			this.coverCropper = {
				visible: true,
				src
			}
		},

		closeCoverCropper() {
			this.coverCropper = {
				visible: false,
				src: ''
			}
		},

		async onCoverCropped(filePath) {
			this.closeCoverCropper()
			await this.uploadCover(filePath)
		},

		async uploadCover(filePath) {
			if (!filePath || this.uploadingCover) return

			this.uploadingCover = true

			try {
				const uploadRes = await uploadImage(filePath, 'creation_cover')
				const coverUrl = this.parseImageUrl(uploadRes)

				if (!coverUrl) {
					uni.showToast({
						title: '封面上传失败',
						icon: 'none'
					})
					return
				}

				this.coverUrl = coverUrl
			} catch (err) {
				console.error('封面上传失败：', err)
				uni.showToast({
					title: '封面上传失败',
					icon: 'none'
				})
			} finally {
				this.uploadingCover = false
			}
		},

		parseImageUrl(uploadRes) {
			if (!uploadRes) return ''
			if (typeof uploadRes === 'string') return uploadRes

			if (typeof uploadRes === 'object') {
				return (
					uploadRes.source_url ||
					uploadRes.sourceUrl ||
					uploadRes.cover_url ||
					uploadRes.coverUrl ||
					uploadRes.url ||
					uploadRes?.data?.source_url ||
					uploadRes?.data?.sourceUrl ||
					uploadRes?.data?.cover_url ||
					uploadRes?.data?.coverUrl ||
					uploadRes?.data?.url ||
					''
				)
			}

			return ''
		},

		async handlePublish() {
			if (this.uploadingCover) {
				uni.showToast({
					title: '封面上传中',
					icon: 'none'
				})
				return
			}

			if (!this.canPublish) {
				uni.showToast({
					title: '请填写标题并选择标签',
					icon: 'none'
				})
				return
			}

			const payload = {
				material_id: this.materialId,
				cover_url: this.coverUrl,
				title: this.title.trim(),
				content: this.content.trim(),
				category: this.selectedCategory ? this.selectedCategory.value : ''
			}

			const ok = await createCreation(payload)

			if (!ok) return

			uni.showToast({
				title: '发布成功',
				icon: 'success'
			})

			setTimeout(() => {
				uni.navigateBack()
			}, 800)
		},

		onMediaError() {
			uni.showToast({
				title: '素材加载失败',
				icon: 'none'
			})
		},

		onCoverError() {
			uni.showToast({
				title: '封面加载失败',
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
.publish-page {
	min-height: 100vh;
	background: #f5f5f7;
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

.content {
	box-sizing: border-box;
}

.media-section {
	width: 100%;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	box-sizing: border-box;
	background: #f5f5f7;
}

.material-image,
.material-video {
	width: 100%;
	background: #f5f5f7;
	display: block;
	object-fit: contain;
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

.media-empty {
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
	color: #999;
	font-size: 14px;
	font-weight: 400;
}

.cover-card,
.form-card {
	background: #ffffff;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
}

.cover-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.cover-preview {
	position: relative;
	width: 100%;
	overflow: hidden;
	background: #fafafa;
	box-sizing: border-box;
}

.cover-image {
	width: 100%;
	height: 100%;
	display: block;
	background: #f0f1f3;
}

.cover-empty {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: #fafafa;
	box-sizing: border-box;
}

.cover-empty-icon {
	font-size: 42px;
	color: rgba(253, 190, 120, 1);
	line-height: 1;
	font-weight: 400;
}

.cover-empty-text {
	margin-top: 8px;
	color: #999999;
	font-size: 13px;
	font-weight: 400;
	line-height: 1.4;
}

.cover-mask {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 34px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.36);
	box-sizing: border-box;
}

.cover-mask-text {
	color: #ffffff;
	font-size: 13px;
	font-weight: 400;
	line-height: 1;
}

.section {
	margin-bottom: 16px;
}

.last-section {
	margin-bottom: 0;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
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

.input-counter {
	color: #a0a7b4;
	font-size: 12px;
	font-weight: 400;
	line-height: 1;
}

.input,
.textarea,
.picker-box {
	width: 100%;
	background: #fafafa;
	color: #333;
	font-weight: 400;
	box-sizing: border-box;
}

.input {
	padding: 0 12px;
}

.textarea {
	padding: 10px 12px;
	line-height: 1.55;
}

.input-placeholder {
	color: #a0a7b4;
	font-weight: 400;
}

.picker-box {
	padding: 0 12px;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.picker-text {
	color: #333;
	font-weight: 400;
	line-height: 1;
}

.picker-text.placeholder {
	color: #a0a7b4;
}

.picker-icon {
	color: #a0a7b4;
	font-size: 20px;
	line-height: 1;
	transform: rotate(90deg);
	font-weight: 400;
}

.bottom-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background: #f5f5f7;
	box-sizing: border-box;
	z-index: 998;
	box-shadow: none;
	border: none;
}

.submit-btn {
	width: 100%;
	padding: 0;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.submit-btn::after {
	border: none;
}

.submit-btn.disabled {
	opacity: 0.45;
}

.submit-btn-text {
	font-weight: 400;
	line-height: 1;
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

.cover-source-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 12000;
	background: rgba(0, 0, 0, 0.36);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	box-sizing: border-box;
}

.cover-source-panel {
	width: 100%;
	padding: 16rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

.cover-source-item {
	height: 96rpx;
	line-height: 96rpx;
	text-align: center;
	background: #ffffff;
	color: #222222;
	font-size: 30rpx;
	font-weight: 400;
	box-sizing: border-box;
}

.cover-source-item:first-child {
	border-radius: 28rpx 28rpx 0 0;
}

.cover-source-item + .cover-source-item {
	border-top: 1px solid #f1f1f1;
}

.cover-source-item:last-child {
	border-radius: 0 0 28rpx 28rpx;
}

.cover-source-item.disabled {
	color: #b8b8b8;
}
</style>