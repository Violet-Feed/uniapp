<template>
	<view class="create-page" :style="pageStyle">
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-left" :style="navSideStyle" @click="goBack">
				<text class="iconfont icon-fanhui back-icon" :style="backIconStyle"></text>
			</view>

			<view class="nav-title-wrap" :style="navTitleWrapStyle">
				<text class="nav-title" :style="titleStyle">创建智能体</text>
			</view>

			<view class="nav-right" :style="navSideStyle">
				<view
					class="nav-submit"
					:class="{ disabled: submitting || uploadingAvatar }"
					:style="submitButtonStyle"
					@click="submitCreate"
				>
					<text class="nav-submit-text" :style="submitTextStyle">
						{{ submitting ? '创建中' : '创建' }}
					</text>
				</view>
			</view>
		</view>

		<scroll-view
			scroll-y
			class="form-scroll"
			:style="scrollStyle"
			:show-scrollbar="false"
		>
			<view class="form-wrap" :style="formWrapStyle">
				<view class="avatar-section" :style="avatarSectionStyle">
					<view class="avatar-click" :style="avatarClickStyle" @click="chooseAvatar">
						<image
							class="avatar-preview"
							:style="avatarStyle"
							:src="form.avatarUri || defaultAvatar"
							mode="aspectFill"
						/>
						<view class="avatar-mask">
							<text class="avatar-mask-text" :style="avatarTipStyle">
								{{ uploadingAvatar ? '上传中' : '更换头像' }}
							</text>
						</view>
					</view>
				</view>

				<view class="section-card" :style="cardStyle">
					<text class="section-title" :style="sectionTitleStyle">名称</text>
					<input
						class="section-input"
						:style="inputStyle"
						type="text"
						:value="form.agentName"
						@input="onAgentNameInput"
						placeholder="请输入智能体名称"
						placeholder-class="input-placeholder"
						maxlength="50"
						confirm-type="done"
						:adjust-position="false"
						cursor-spacing="20"
					/>
				</view>

				<view class="section-card" :style="cardStyle">
					<text class="section-title" :style="sectionTitleStyle">简介</text>
					<textarea
						class="section-textarea"
						:style="textareaStyle"
						:value="form.description"
						@input="onDescriptionInput"
						placeholder="请输入智能体描述"
						placeholder-class="input-placeholder"
						maxlength="300"
						:auto-height="false"
						:adjust-position="false"
						cursor-spacing="20"
					/>
				</view>

				<view class="section-card personality-card" :style="personalityCardStyle">
					<text class="section-title" :style="sectionTitleStyle">人格设定</text>
					<textarea
						class="section-textarea"
						:style="largeTextareaStyle"
						:value="form.personality"
						@input="onPersonalityInput"
						placeholder="请输入智能体人格设定"
						placeholder-class="input-placeholder"
						maxlength="1000"
						:auto-height="false"
						:adjust-position="false"
						cursor-spacing="20"
					/>
				</view>
			</view>
		</scroll-view>

		<avatar-cropper
			:visible="avatarCropper.visible"
			:src="avatarCropper.src"
			title="裁剪智能体头像"
			mask-shape="circle"
			@close="closeAvatarCropper"
			@confirm="onAgentAvatarCropped"
		/>
	</view>
</template>

<script>
import { createAgent } from '@/request/agent.js';
import { uploadImage } from '@/request/common.js';
import AvatarCropper from '@/components/avatar-cropper.vue';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default {
	components: {
		AvatarCropper
	},

	data() {
		return {
			submitting: false,
			uploadingAvatar: false,
			defaultAvatar: '/static/ai_avatar.png',
			avatarCropper: {
				visible: false,
				src: ''
			},
			form: {
				agentName: '',
				avatarUri: '',
				description: '',
				personality: ''
			},

			windowWidth: 375,
			windowHeight: 667,
			statusBarHeight: 0,
			safeBottom: 0,

			navContentHeight: 38,
			navSideWidth: 86,
			titleFontSize: 17,
			backIconSize: 20,
			buttonHeight: 32,
			buttonWidth: 64,
			buttonFontSize: 13,

			pagePadding: 14,
			cardPadding: 14,
			cardRadius: 14,
			cardGap: 10,

			avatarSize: 92,
			avatarRadius: 20,
			avatarSectionHeight: 126,
			avatarTipFontSize: 11,

			sectionTitleFontSize: 15,
			inputFontSize: 14,
			inputHeight: 34,
			textareaHeight: 104,
			personalityCardMinHeight: 240,
			largeTextareaMinHeight: 170
		};
	},

	computed: {
		pageStyle() {
			return `min-height:${this.windowHeight}px;`;
		},

		navBarStyle() {
			return [
				`height:${this.statusBarHeight + this.navContentHeight}px`,
				`padding-top:${this.statusBarHeight}px`,
				`padding-left:${this.pagePadding}px`,
				`padding-right:${this.pagePadding}px`
			].join(';') + ';';
		},

		navSideStyle() {
			return `width:${this.navSideWidth}px;height:${this.navContentHeight}px;`;
		},

		navTitleWrapStyle() {
			return [
				`height:${this.navContentHeight}px`,
				`left:${this.navSideWidth + this.pagePadding}px`,
				`right:${this.navSideWidth + this.pagePadding}px`
			].join(';') + ';';
		},

		backIconStyle() {
			return `font-size:${this.backIconSize}px;`;
		},

		titleStyle() {
			return `font-size:${this.titleFontSize}px;`;
		},

		submitButtonStyle() {
			return [
				`width:${this.buttonWidth}px`,
				`height:${this.buttonHeight}px`,
				`border-radius:${Math.floor(this.buttonHeight / 2)}px`
			].join(';') + ';';
		},

		submitTextStyle() {
			return `font-size:${this.buttonFontSize}px;`;
		},

		scrollStyle() {
			const top = this.statusBarHeight + this.navContentHeight;
			return `top:${top}px;bottom:0;`;
		},

		formWrapStyle() {
			return [
				`padding:${this.pagePadding}px`,
				`padding-bottom:${this.safeBottom + 24}px`
			].join(';') + ';';
		},

		avatarSectionStyle() {
			return [
				`height:${this.avatarSectionHeight}px`,
				`margin-bottom:${this.cardGap}px`
			].join(';') + ';';
		},

		cardStyle() {
			return [
				`padding:${this.cardPadding}px`,
				`border-radius:${this.cardRadius}px`,
				`margin-bottom:${this.cardGap}px`
			].join(';') + ';';
		},

		personalityCardStyle() {
			return [
				`padding:${this.cardPadding}px`,
				`border-radius:${this.cardRadius}px`,
				`margin-bottom:0`,
				`min-height:${this.personalityCardMinHeight}px`
			].join(';') + ';';
		},

		avatarClickStyle() {
			return [
				`width:${this.avatarSize}px`,
				`height:${this.avatarSize}px`,
				`border-radius:${this.avatarRadius}px`
			].join(';') + ';';
		},

		avatarStyle() {
			return [
				`width:${this.avatarSize}px`,
				`height:${this.avatarSize}px`,
				`border-radius:${this.avatarRadius}px`
			].join(';') + ';';
		},

		avatarTipStyle() {
			return `font-size:${this.avatarTipFontSize}px;`;
		},

		sectionTitleStyle() {
			return `font-size:${this.sectionTitleFontSize}px;`;
		},

		inputStyle() {
			return [
				`height:${this.inputHeight}px`,
				`font-size:${this.inputFontSize}px`,
				`line-height:${this.inputHeight}px`
			].join(';') + ';';
		},

		textareaStyle() {
			return [
				`height:${this.textareaHeight}px`,
				`font-size:${this.inputFontSize}px`,
				`line-height:${Math.floor(this.inputFontSize * 1.7)}px`
			].join(';') + ';';
		},

		largeTextareaStyle() {
			return [
				`height:${this.largeTextareaMinHeight}px`,
				`font-size:${this.inputFontSize}px`,
				`line-height:${Math.floor(this.inputFontSize * 1.7)}px`
			].join(';') + ';';
		}
	},

	onLoad() {
		this.initResponsiveLayout();
	},

	onShow() {
		this.initResponsiveLayout();
	},

	methods: {
		initResponsiveLayout() {
			try {
				const sys = uni.getSystemInfoSync();
				const width = Number(sys.windowWidth || 375);
				const height = Number(sys.windowHeight || 667);
				const statusBarHeight = Number(sys.statusBarHeight || 0);
				const safeAreaInsets = sys.safeAreaInsets || {};
				const safeBottom = Number(safeAreaInsets.bottom || 0);
				const compact = width <= 360 || height <= 640;

				this.windowWidth = width;
				this.windowHeight = height;
				this.statusBarHeight = statusBarHeight;
				this.safeBottom = safeBottom;

				this.navContentHeight = 38;
				this.navSideWidth = clamp(Math.floor(width * 0.23), 78, 94);
				this.titleFontSize = clamp(Math.floor(this.navContentHeight * 0.44) + (width <= 360 ? 1 : 0), 16, 18);
				this.backIconSize = clamp(Math.floor(width * 0.054), 19, 22);

				this.buttonHeight = clamp(Math.floor(width * 0.086), 30, 34);
				this.buttonWidth = clamp(Math.floor(width * 0.17), 60, 70);
				this.buttonFontSize = clamp(Math.floor(width * 0.034), 12, 14);

				this.pagePadding = clamp(Math.floor(width * 0.038), 12, 18);
				this.cardPadding = clamp(Math.floor(width * 0.038), 12, 18);
				this.cardRadius = clamp(Math.floor(width * 0.038), 12, 18);
				this.cardGap = clamp(Math.floor(width * 0.028), 9, 14);

				this.avatarSize = clamp(Math.floor(width * 0.245), compact ? 82 : 88, 100);
				this.avatarRadius = clamp(Math.floor(this.avatarSize * 0.22), 16, 22);
				this.avatarTipFontSize = clamp(Math.floor(width * 0.03), 10, 12);
				this.avatarSectionHeight = this.avatarSize + clamp(Math.floor(width * 0.07), 24, 34);

				this.sectionTitleFontSize = clamp(Math.floor(width * 0.04), 14, 16);
				this.inputFontSize = clamp(Math.floor(width * 0.037), 13, 15);
				this.inputHeight = clamp(Math.floor(width * 0.092), 32, 38);
				this.textareaHeight = clamp(Math.floor(height * 0.155), 94, 120);

				const navHeight = this.statusBarHeight + this.navContentHeight;
				const formVerticalPadding = this.pagePadding * 2 + this.safeBottom + 24;

				const nameCardHeight =
					this.cardPadding * 2 +
					this.inputHeight +
					clamp(Math.floor(this.sectionTitleFontSize * 1.4), 20, 24) +
					10;

				const descCardHeight =
					this.cardPadding * 2 +
					this.textareaHeight +
					clamp(Math.floor(this.sectionTitleFontSize * 1.4), 20, 24) +
					10;

				const fixedHeights =
					this.avatarSectionHeight +
					this.cardGap +
					nameCardHeight +
					this.cardGap +
					descCardHeight +
					this.cardGap;

				const remainHeight = height - navHeight - formVerticalPadding - fixedHeights;

				this.personalityCardMinHeight = Math.max(
					clamp(Math.floor(height * 0.34), 220, 320),
					remainHeight
				);

				this.largeTextareaMinHeight = Math.max(
					150,
					this.personalityCardMinHeight -
						this.cardPadding * 2 -
						clamp(Math.floor(this.sectionTitleFontSize * 1.4), 20, 24) -
						10
				);
			} catch (err) {
				this.windowWidth = 375;
				this.windowHeight = 667;
				this.statusBarHeight = 0;
				this.safeBottom = 0;
			}
		},

		goBack() {
			uni.navigateBack();
		},

		onAgentNameInput(e) {
			this.form.agentName = e?.detail?.value || '';
		},

		onDescriptionInput(e) {
			this.form.description = e?.detail?.value || '';
		},

		onPersonalityInput(e) {
			this.form.personality = e?.detail?.value || '';
		},

		chooseAvatar() {
			if (this.uploadingAvatar || this.submitting) return;

			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					const filePath = res?.tempFilePaths?.[0];
					if (!filePath) return;

					this.avatarCropper = {
						visible: true,
						src: filePath
					};
				}
			});
		},

		closeAvatarCropper() {
			this.avatarCropper = {
				visible: false,
				src: ''
			};
		},

		async onAgentAvatarCropped(filePath) {
			this.closeAvatarCropper();
			await this.uploadAgentAvatar(filePath);
		},

		async uploadAgentAvatar(filePath) {
			if (!filePath || this.uploadingAvatar || this.submitting) return;

			this.uploadingAvatar = true;

			const uploadRes = await uploadImage(filePath, 'agent_avatar');
			if (uploadRes === undefined) return;

			const avatarUri = this.parseAvatarUri(uploadRes);
			if (!avatarUri) {
				return;
			}

			this.form.avatarUri = avatarUri;
			this.uploadingAvatar = false;
		},

		parseAvatarUri(uploadRes) {
			if (!uploadRes) return '';
			if (typeof uploadRes === 'string') return uploadRes;

			if (typeof uploadRes === 'object') {
				return (
					uploadRes.source_url ||
					uploadRes.sourceUrl ||
					uploadRes.url ||
					uploadRes?.data?.source_url ||
					''
				);
			}

			return '';
		},

		async submitCreate() {
			if (this.submitting || this.uploadingAvatar) return;

			const agentName = (this.form.agentName || '').trim();

			if (!agentName) {
				uni.showToast({
					title: '请输入智能体名称',
					icon: 'none'
				});
				return;
			}

			this.submitting = true;

			const res = await createAgent({
				agentName,
				avatarUri: this.form.avatarUri || '',
				description: (this.form.description || '').trim(),
				personality: (this.form.personality || '').trim()
			});

			if (res) {
				const agentId = res?.agent_id ? String(res.agent_id) : '';
				if (agentId) {
					uni.redirectTo({
						url: `/pages/agent/agent_detail?agentId=${encodeURIComponent(agentId)}`
					});
				}
			}

			this.submitting = false;
		}
	}
};
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.create-page {
	position: relative;
	background: #f7f8fa;
	overflow: hidden;
}

.nav-bar {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 20;
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #ffffff;
	box-sizing: border-box;
}

.nav-left,
.nav-right {
	display: flex;
	align-items: center;
}

.nav-left {
	justify-content: flex-start;
}

.nav-right {
	justify-content: flex-end;
}

.nav-title-wrap {
	position: absolute;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
}

.nav-title {
	color: #1f2329;
	font-weight: 400;
	line-height: 1;
	text-align: center;
}

.back-icon {
	color: #333333;
	font-weight: 400;
	line-height: 1;
}

.nav-submit {
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(253, 231, 209, 1);
	box-shadow: none;
}

.nav-submit.disabled {
	opacity: 0.55;
}

.nav-submit-text {
	color: #8a5a2b;
	font-weight: 400;
	line-height: 1;
}

.form-scroll {
	position: fixed;
	left: 0;
	right: 0;
	background: #f7f8fa;
	box-sizing: border-box;
}

.form-wrap {
	box-sizing: border-box;
}

.avatar-section {
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.avatar-click {
	position: relative;
	overflow: hidden;
	background: #eef1f6;
}

.avatar-preview {
	background: #eef1f6;
	display: block;
}

.avatar-mask {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 30%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.32);
}

.avatar-mask-text {
	color: #ffffff;
	font-weight: 400;
	line-height: 1;
}

.section-card {
	background: #ffffff;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
}

.personality-card {
	box-sizing: border-box;
}

.section-title {
	display: block;
	color: #1f2329;
	font-weight: 400;
	line-height: 1.4;
	margin-bottom: 10px;
}

.section-input,
.section-textarea {
	width: 100%;
	color: #4e5969;
	font-weight: 400;
	background: transparent;
	padding: 0;
	box-sizing: border-box;
}

.section-input {
	line-height: 1;
}

.section-textarea {
	display: block;
	line-height: 1.75;
}

.input-placeholder {
	color: #a0a7b4;
	font-weight: 400;
}
</style>