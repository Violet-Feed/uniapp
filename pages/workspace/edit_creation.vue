<template>
	<view class="container">
		<!-- 自定义导航栏 -->
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<text class="nav-back-icon">←</text>
				<text class="nav-back-text">返回</text>
			</view>
			<view class="nav-title">编辑创作</view>
		</view>

		<!-- 主体内容 -->
		<view class="content">
			<!-- 素材预览 -->
			<view class="section">
				<view class="section-title">素材预览</view>
				<view class="preview-box">
					<video
						v-if="creation.type === 'video'"
						class="preview-video"
						:src="creation.coverImage"
						controls
						show-center-play-btn
					></video>
					<image
						v-else
						class="preview-image"
						:src="creation.coverImage"
						mode="aspectFill"
					></image>
				</view>
			</view>

			<!-- 标题 -->
			<view class="section">
				<view class="section-title">标题</view>
				<input
					class="input"
					v-model="creation.title"
					placeholder="请输入标题"
					maxlength="50"
				/>
				<view class="input-counter">{{ creation.title.length }}/50</view>
			</view>

			<!-- 正文内容 -->
			<view class="section">
				<view class="section-title">内容</view>
				<textarea
					class="textarea"
					v-model="creation.detail"
					placeholder="写点说明、心情或者创作故事..."
					maxlength="500"
					auto-height
				/>
				<view class="input-counter">{{ creation.detail.length }}/500</view>
			</view>

			<!-- 类目选择 -->
			<view class="section">
				<view class="section-title">类目</view>
				<picker
					mode="selector"
					:range="categoryOptions"
					range-key="label"
					:value="selectedCategoryIndex"
					@change="onCategoryChange"
				>
					<view class="picker-box">
						<text
							class="picker-text"
							:class="{ placeholder: selectedCategoryIndex === -1 }"
						>
							{{
								selectedCategoryIndex === -1
									? '请选择类目'
									: categoryOptions[selectedCategoryIndex].label
							}}
						</text>
						<text class="picker-icon">▼</text>
					</view>
				</picker>
			</view>
		</view>

		<!-- 底部保存按钮 -->
		<view class="bottom-bar">
			<button
				class="publish-btn"
				:class="{ disabled: !canSubmit || submitting }"
				@click="handleSubmit"
			>
				{{ submitting ? '保存中...' : '保存' }}
			</button>
		</view>
	</view>
</template>

<script>
import { getCreationById, updateCreation } from '@/request/creation.js'

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
			selectedCategoryIndex: -1
		}
	},

	computed: {
		canSubmit() {
			return this.creation.title.trim().length > 0 && this.selectedCategoryIndex !== -1
		},
		selectedCategory() {
			if (this.selectedCategoryIndex === -1) return null
			return this.categoryOptions[this.selectedCategoryIndex]
		}
	},

	onLoad(options) {
		this.creationId = options.creationId || ''
		this.authorId = options.userId || ''
		this.fetchCreationDetail()
	},

	methods: {
		goBack() {
			uni.navigateBack()
		},

		onCategoryChange(e) {
			this.selectedCategoryIndex = Number(e.detail.value)
		},

		syncCategoryIndex(categoryValue) {
			const idx = this.categoryOptions.findIndex(
				item => item.value === categoryValue
			)
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
						title: '请填写标题并选择类目',
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
		}
	}
}
</script>

<style scoped>
.container {
	background-color: #f5f5f7;
	min-height: 100vh;
}

.nav-bar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: 88rpx;
	padding: 0 16rpx;
	display: flex;
	align-items: center;
	background-color: #ffffff;
	box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
	z-index: 100;
}

.nav-back {
	display: flex;
	align-items: center;
	padding: 10rpx 10rpx 10rpx 0;
}

.nav-back-icon {
	font-size: 34rpx;
	margin-right: 4rpx;
}

.nav-back-text {
	font-size: 28rpx;
}

.nav-title {
	flex: 1;
	text-align: center;
	font-size: 32rpx;
	font-weight: 600;
	margin-right: 80rpx;
}

.content {
	padding: 100rpx 12px 120rpx;
	box-sizing: border-box;
}

.section {
	margin-bottom: 16px;
}

.section-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #333;
	margin-bottom: 8px;
}

.preview-box {
	background: #fff;
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
	width: 48%;
	margin: 0 auto;
	padding: 0;
}

.preview-image,
.preview-video {
	width: 100%;
	height: 240px;
	border-radius: 0;
	object-fit: cover;
}

.input,
.textarea,
.picker-box {
	width: 100%;
	box-sizing: border-box;
}

.input {
	background: #fff;
	border-radius: 10px;
	padding: 0 12px;
	height: 80rpx;
	font-size: 28rpx;
}

.textarea {
	background: #fff;
	border-radius: 10px;
	padding: 8px 12px;
	min-height: 160rpx;
	font-size: 28rpx;
}

.input-counter {
	text-align: right;
	font-size: 22rpx;
	color: #aaa;
	margin-top: 4px;
}

.picker-box {
	background: #fff;
	border-radius: 10px;
	padding: 0 12px;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.picker-text {
	font-size: 28rpx;
	color: #333;
}

.picker-text.placeholder {
	color: #aaa;
}

.picker-icon {
	font-size: 26rpx;
	color: #aaa;
}

.bottom-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 8px 16px 16px;
	background: #ffffff;
	box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
	z-index: 90;
}

.publish-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 44rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	font-size: 30rpx;
	border: none;
}

.publish-btn.disabled {
	opacity: 0.4;
}
</style>