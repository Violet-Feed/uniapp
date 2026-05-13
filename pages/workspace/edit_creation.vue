<template>
	<view class="edit-page">
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click.stop="goBack">
					<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">编辑创作</text>
				</view>

				<view class="nav-right"></view>
			</view>
		</view>

		<view class="content" :style="contentStyle">
			<view class="media-section" :style="mediaSectionStyle">
				<video
					v-if="isVideoCreation && creation.coverImage && !videoHiddenForScroll"
					class="material-video"
					:style="mediaInnerStyle"
					:src="creation.coverImage"
					controls
					:show-center-play-btn="true"
					:enable-play-gesture="true"
					:show-fullscreen-btn="true"
					object-fit="contain"
					@error="onVideoError"
				></video>

				<view
					v-else-if="isVideoCreation && creation.coverImage && videoHiddenForScroll"
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
					v-else-if="creation.coverImage"
					class="material-image"
					:style="mediaInnerStyle"
					:src="creation.coverImage"
					mode="aspectFit"
					@click="previewImage"
					@error="onMediaError"
				></image>

				<view v-else class="media-empty" :style="mediaInnerStyle">
					<text class="iconfont icon-neirongchuangzuo media-empty-icon"></text>
					<text class="media-empty-text">素材不存在</text>
				</view>
			</view>

			<view class="form-card" :style="formCardStyle">
				<view class="section">
					<view class="section-header">
						<view class="section-title-wrap">
							<view class="section-dot"></view>
							<text class="section-title" :style="sectionTitleStyle">标题</text>
						</view>
						<text class="input-counter">{{ creation.title.length }}/50</text>
					</view>

					<input
						class="input"
						:style="inputStyle"
						v-model="creation.title"
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
						<text class="input-counter">{{ creation.detail.length }}/500</text>
					</view>

					<textarea
						class="textarea"
						:style="textareaStyle"
						v-model="creation.detail"
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
				:class="{ disabled: !canSubmit || submitting }"
				:style="submitBtnStyle"
				@click="handleSubmit"
			>
				<text class="submit-btn-text" :style="submitTextStyle">
					{{ submitting ? '保存中...' : '保存' }}
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
	</view>
</template>

<script>
import { getCreationById, updateCreation } from '@/request/creation.js'

const PAGE_BG = '#f5f5f7'
const THEME_YELLOW = 'rgba(253, 231, 209, 1)'
const THEME_BROWN = '#8a5a2b'

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value))
}

export default {
	data() {
		return {
			creationId: '',
			authorId: '',
			submitting: false,

			creation: {
				creationId: '',
				userId: '',
				type: 'image',
				title: '',
				detail: '',
				category: '',
				time: '',
				coverImage: '',
				images: []
			},

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
		isVideoCreation() {
			return this.creation.type === 'video'
		},

		canSubmit() {
			return this.creation.title.trim().length > 0 && this.selectedCategoryIndex !== -1
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
		this.creationId = options.creationId || ''
		this.authorId = options.userId || ''
		this.fetchCreationDetail()
	},

	onShow() {
		this.initResponsiveLayout()
	},

	onPageScroll(e) {
		if (!this.isVideoCreation) return

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

				const availableHeight = windowHeight - this.navHeight - safeBottom
				this.mediaHeight = clamp(
					Math.floor(Math.min(windowWidth * 1.04, availableHeight * 0.42)),
					250,
					420
				)

				this.cardRadius = clamp(Math.floor(windowWidth * 0.042), 14, 18)
				this.cardPaddingX = clamp(Math.floor(windowWidth * 0.038), 12, 18)
				this.cardPaddingY = clamp(Math.floor(windowWidth * 0.038), 12, 18)
				this.cardGap = clamp(Math.floor(windowWidth * 0.034), 10, 14)

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

				this.mediaHeight = 330

				this.cardRadius = 16
				this.cardPaddingX = 14
				this.cardPaddingY = 14
				this.cardGap = 12

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

		goBack() {
			uni.navigateBack()
		},

		scrollBackToTop() {
			uni.pageScrollTo({
				scrollTop: 0,
				duration: 220
			})
		},

		previewImage() {
			if (!this.creation.coverImage || this.isVideoCreation) return

			uni.previewImage({
				current: this.creation.coverImage,
				urls: [this.creation.coverImage],
				fail: () => {
					this.preview = {
						visible: true,
						url: this.creation.coverImage
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

		syncCategoryIndex(categoryValue) {
			const idx = this.categoryOptions.findIndex(item => item.value === categoryValue)
			this.selectedCategoryIndex = idx
		},

		async fetchCreationDetail() {
			try {
				const res = await getCreationById(this.creationId)
				if (!res || !res.creation) {
					uni.showToast({
						title: '获取作品失败',
						icon: 'none'
					})
					return false
				}

				const materialType = res.creation.material_type
				const isVideo = materialType === 2

				this.creation.creationId = res.creation.creation_id || this.creationId
				this.creation.userId = res.creation.user_id || this.authorId
				this.creation.type = isVideo ? 'video' : 'image'
				this.creation.title = res.creation.title || ''
				this.creation.detail = res.creation.content || ''
				this.creation.category = res.creation.category || ''
				this.creation.time = res.creation.create_time || ''

				const cover = res.creation.material_url || res.creation.cover_url || ''
				this.creation.coverImage = cover
				this.creation.images = cover ? [cover] : []

				this.syncCategoryIndex(this.creation.category)
				return true
			} catch (e) {
				console.error('获取作品详情失败：', e)
				uni.showToast({
					title: '获取作品失败',
					icon: 'none'
				})
				return false
			}
		},

		async handleSubmit() {
			if (!this.canSubmit || this.submitting) {
				if (!this.canSubmit) {
					uni.showToast({
						title: '请填写标题并选择标签',
						icon: 'none'
					})
				}
				return
			}

			this.submitting = true

			try {
				const ok = await updateCreation({
					creationId: this.creation.creationId,
					title: this.creation.title.trim(),
					content: this.creation.detail.trim(),
					category: this.selectedCategory ? this.selectedCategory.value : ''
				})

				if (!ok) {
					throw new Error('updateCreation 返回失败')
				}

				uni.showToast({
					title: '保存成功',
					icon: 'success'
				})

				setTimeout(() => {
					uni.navigateBack()
				}, 600)
			} catch (e) {
				console.error('更新作品失败：', e)
				uni.showToast({
					title: '保存失败',
					icon: 'none'
				})
			} finally {
				this.submitting = false
			}
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
.edit-page {
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

.form-card {
	background: #ffffff;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
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
</style>