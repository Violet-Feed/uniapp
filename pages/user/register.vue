<template>
	<view class="register-container" :style="containerStyle">
		<view class="bg-layer">
			<view class="bg-circle bg-circle-left" :style="leftCircleStyle"></view>
			<view class="bg-circle bg-circle-right" :style="rightCircleStyle"></view>
			<view class="bg-circle bg-circle-top" :style="topCircleStyle"></view>
			<view class="brush brush-logo"></view>
		</view>

		<view class="register-main" :style="mainStyle">
			<view class="logo-section" :style="logoSectionStyle">
				<image
					class="brand-image"
					:style="brandImageStyle"
					src="/static/violet.png"
					mode="widthFix"
				></image>

				<view class="slogan-row" :style="sloganRowStyle">
					<text class="slogan-mark" :style="sloganMarkStyle">≺</text>
					<text class="slogan-text" :style="sloganTextStyle">
						让每一次灵感，都有机会变成一次互动
					</text>
					<text class="slogan-mark" :style="sloganMarkStyle">≻</text>
				</view>
			</view>

			<view class="form-section" :style="formSectionStyle">
				<view class="input-wrapper" :style="inputWrapperStyle">
					<view class="input-icon-wrap" :style="inputIconWrapStyle">
						<text class="iconfont icon-wode input-line-icon" :style="inputIconStyle"></text>
					</view>
					<input
						class="input-field"
						:style="inputFieldStyle"
						v-model="username"
						placeholder="用户名"
						placeholder-class="input-placeholder"
						:adjust-position="false"
						@focus="onFocus('username')"
						@blur="onBlur"
					/>
				</view>

				<view class="input-wrapper" :style="inputWrapperStyle">
					<view class="input-icon-wrap" :style="inputIconWrapStyle">
						<text class="iconfont icon-ziyuanxhdpi input-line-icon" :style="inputIconStyle"></text>
					</view>
					<input
						class="input-field"
						:style="inputFieldStyle"
						v-model="password"
						type="password"
						placeholder="密码"
						placeholder-class="input-placeholder"
						:adjust-position="false"
						@focus="onFocus('password')"
						@blur="onBlur"
					/>
				</view>

				<view class="input-wrapper" :style="inputWrapperStyle">
					<view class="input-icon-wrap" :style="inputIconWrapStyle">
						<text class="iconfont icon-ziyuanxhdpi input-line-icon" :style="inputIconStyle"></text>
					</view>
					<input
						class="input-field"
						:style="inputFieldStyle"
						v-model="confirmPassword"
						type="password"
						placeholder="再次输入密码"
						placeholder-class="input-placeholder"
						:adjust-position="false"
						@focus="onFocus('confirm')"
						@blur="onBlur"
					/>
				</view>

				<button
					class="register-btn"
					:class="{ 'register-btn-loading': isLoading }"
					:style="registerBtnStyle"
					@click="register"
					:disabled="isLoading"
				>
					<view v-if="isLoading" class="loading-spinner"></view>
					<text v-else class="btn-text" :style="btnTextStyle">注册</text>
				</button>

				<view class="footer-links" :style="footerStyle">
					<text class="link-text" :style="footerTextStyle">已有账号？</text>
					<text class="link-btn" :style="footerLinkStyle" @click="goToLogin">立即登录</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { register } from '@/request/user.js';

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value));
};

export default {
	data() {
		return {
			username: '',
			password: '',
			confirmPassword: '',
			isLoading: false,
			focusedField: '',

			windowWidth: 375,
			windowHeight: 667,
			statusBarHeight: 0,
			safeBottom: 0,

			pagePaddingX: 40,
			mainTop: 140,
			logoBottom: 66,
			formWidth: 320,

			brandImageWidth: 210,

			sloganTop: 20,
			sloganFontSize: 15,
			sloganMarkFontSize: 27,
			sloganGap: 10,

			inputHeight: 58,
			inputRadius: 23,
			inputGap: 16,
			inputIconWidth: 54,
			inputIconFontSize: 25,
			inputFontSize: 17,

			registerBtnHeight: 58,
			registerBtnRadius: 20,
			registerBtnMarginTop: 16,
			btnFontSize: 20,

			footerMarginTop: 26,
			footerFontSize: 16,

			leftCircleSize: 170,
			rightCircleSize: 48,
			topCircleSize: 70
		};
	},

	computed: {
		containerStyle() {
			return (
				'padding-left:' + this.pagePaddingX + 'px;' +
				'padding-right:' + this.pagePaddingX + 'px;' +
				'padding-top:' + this.statusBarHeight + 'px;' +
				'padding-bottom:' + (24 + this.safeBottom) + 'px;'
			);
		},

		mainStyle() {
			return 'padding-top:' + this.mainTop + 'px;';
		},

		logoSectionStyle() {
			return 'margin-bottom:' + this.logoBottom + 'px;';
		},

		brandImageStyle() {
			return 'width:' + this.brandImageWidth + 'px;';
		},

		sloganRowStyle() {
			return (
				'margin-top:' + this.sloganTop + 'px;' +
				'gap:' + this.sloganGap + 'px;'
			);
		},

		sloganTextStyle() {
			return 'font-size:' + this.sloganFontSize + 'px;';
		},

		sloganMarkStyle() {
			return 'font-size:' + this.sloganMarkFontSize + 'px;';
		},

		formSectionStyle() {
			return 'width:' + this.formWidth + 'px;';
		},

		inputWrapperStyle() {
			return (
				'height:' + this.inputHeight + 'px;' +
				'border-radius:' + this.inputRadius + 'px;' +
				'margin-bottom:' + this.inputGap + 'px;'
			);
		},

		inputIconWrapStyle() {
			return 'width:' + this.inputIconWidth + 'px;';
		},

		inputIconStyle() {
			return 'font-size:' + this.inputIconFontSize + 'px;';
		},

		inputFieldStyle() {
			return (
				'height:' + this.inputHeight + 'px;' +
				'font-size:' + this.inputFontSize + 'px;'
			);
		},

		registerBtnStyle() {
			return (
				'height:' + this.registerBtnHeight + 'px;' +
				'line-height:' + this.registerBtnHeight + 'px;' +
				'border-radius:' + this.registerBtnRadius + 'px;' +
				'margin-top:' + this.registerBtnMarginTop + 'px;'
			);
		},

		btnTextStyle() {
			return 'font-size:' + this.btnFontSize + 'px;';
		},

		footerStyle() {
			return 'margin-top:' + this.footerMarginTop + 'px;';
		},

		footerTextStyle() {
			return 'font-size:' + this.footerFontSize + 'px;';
		},

		footerLinkStyle() {
			return 'font-size:' + this.footerFontSize + 'px;';
		},

		leftCircleStyle() {
			return (
				'width:' + this.leftCircleSize + 'px;' +
				'height:' + this.leftCircleSize + 'px;' +
				'border-radius:' + Math.floor(this.leftCircleSize / 2) + 'px;'
			);
		},

		rightCircleStyle() {
			return (
				'width:' + this.rightCircleSize + 'px;' +
				'height:' + this.rightCircleSize + 'px;' +
				'border-radius:' + Math.floor(this.rightCircleSize / 2) + 'px;'
			);
		},

		topCircleStyle() {
			return (
				'width:' + this.topCircleSize + 'px;' +
				'height:' + this.topCircleSize + 'px;' +
				'border-radius:' + Math.floor(this.topCircleSize / 2) + 'px;'
			);
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
				const windowWidth = Number(sys.windowWidth || 375);
				const windowHeight = Number(sys.windowHeight || 667);
				const statusBarHeight = Number(sys.statusBarHeight || 0);
				const safeAreaInsets = sys.safeAreaInsets || {};
				const isShort = windowHeight <= 680;

				this.windowWidth = windowWidth;
				this.windowHeight = windowHeight;
				this.statusBarHeight = statusBarHeight;
				this.safeBottom = Number(safeAreaInsets.bottom || 0);

				this.pagePaddingX = clamp(Math.floor(windowWidth * 0.108), 28, 46);
				this.formWidth = clamp(windowWidth - this.pagePaddingX * 2, 288, 340);

				this.mainTop = clamp(
					Math.floor(windowHeight * (isShort ? 0.145 : 0.185)),
					isShort ? 94 : 128,
					isShort ? 116 : 158
				);

				this.logoBottom = clamp(
					Math.floor(windowHeight * (isShort ? 0.06 : 0.08)),
					isShort ? 34 : 52,
					isShort ? 48 : 74
				);

				this.brandImageWidth = clamp(Math.floor(windowWidth * 0.48), 160, 200);

				this.sloganTop = clamp(Math.floor(windowWidth * 0.05), 16, 22);
				this.sloganFontSize = clamp(Math.floor(windowWidth * 0.04), 14, 16);
				this.sloganMarkFontSize = clamp(Math.floor(windowWidth * 0.072), 24, 30);
				this.sloganGap = clamp(Math.floor(windowWidth * 0.024), 8, 12);

				this.inputHeight = clamp(Math.floor(windowWidth * 0.155), 52, 60);
				this.inputRadius = clamp(Math.floor(this.inputHeight * 0.39), 20, 24);
				this.inputGap = clamp(Math.floor(windowHeight * 0.021), 12, 18);
				this.inputIconWidth = clamp(Math.floor(windowWidth * 0.145), 48, 58);
				this.inputIconFontSize = clamp(Math.floor(windowWidth * 0.066), 22, 26);
				this.inputFontSize = clamp(Math.floor(windowWidth * 0.044), 15, 17);

				this.registerBtnHeight = clamp(Math.floor(windowWidth * 0.155), 52, 60);
				this.registerBtnRadius = clamp(Math.floor(this.registerBtnHeight * 0.36), 18, 22);
				this.registerBtnMarginTop = this.inputGap;
				this.btnFontSize = clamp(Math.floor(windowWidth * 0.052), 18, 21);

				this.footerMarginTop = clamp(Math.floor(windowHeight * 0.036), isShort ? 18 : 22, isShort ? 26 : 32);
				this.footerFontSize = clamp(Math.floor(windowWidth * 0.043), 15, 17);

				this.leftCircleSize = clamp(Math.floor(windowWidth * 0.45), 140, 186);
				this.rightCircleSize = clamp(Math.floor(windowWidth * 0.128), 42, 54);
				this.topCircleSize = clamp(Math.floor(windowWidth * 0.18), 58, 72);
			} catch (err) {
				this.windowWidth = 375;
				this.windowHeight = 667;
				this.statusBarHeight = 0;
				this.safeBottom = 0;

				this.pagePaddingX = 40;
				this.mainTop = 140;
				this.logoBottom = 66;
				this.formWidth = 320;

				this.brandImageWidth = 180;

				this.sloganTop = 20;
				this.sloganFontSize = 15;
				this.sloganMarkFontSize = 27;
				this.sloganGap = 10;

				this.inputHeight = 58;
				this.inputRadius = 23;
				this.inputGap = 16;
				this.inputIconWidth = 54;
				this.inputIconFontSize = 25;
				this.inputFontSize = 17;

				this.registerBtnHeight = 58;
				this.registerBtnRadius = 20;
				this.registerBtnMarginTop = this.inputGap;
				this.btnFontSize = 20;

				this.footerMarginTop = 26;
				this.footerFontSize = 16;

				this.leftCircleSize = 170;
				this.rightCircleSize = 48;
				this.topCircleSize = 70;
			}
		},

		onFocus(field) {
			this.focusedField = field;
		},

		onBlur() {
			this.focusedField = '';
		},

		async register() {
			if (!this.username) {
				uni.showToast({
					title: '请输入用户名',
					icon: 'none'
				});
				return;
			}

			if (!this.password) {
				uni.showToast({
					title: '请输入密码',
					icon: 'none'
				});
				return;
			}

			if (this.password.length < 6) {
				uni.showToast({
					title: '密码至少6个字符',
					icon: 'none'
				});
				return;
			}

			if (this.password !== this.confirmPassword) {
				uni.showToast({
					title: '两次密码输入不一致',
					icon: 'none'
				});
				return;
			}

			this.isLoading = true;

			try {
				const res = await register(this.username, this.password, this.confirmPassword);

				if (res) {
					uni.showToast({
						title: '注册成功',
						icon: 'success'
					});

					setTimeout(() => {
						uni.reLaunch({
							url: '/pages/user/login'
						});
					}, 500);
				}
			} finally {
				this.isLoading = false;
			}
		},

		goToLogin() {
			uni.navigateBack();
		}
	}
};
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.register-container {
	min-height: 100vh;
	background:
		radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.68) 32%, rgba(253, 231, 209, 0.32) 58%, rgba(255, 255, 255, 0.08) 100%),
		linear-gradient(160deg, rgba(253, 231, 209, 1) 0%, #fff7ee 38%, #ffffff 66%, #fffaf5 100%);
	display: flex;
	flex-direction: column;
	align-items: center;
	position: relative;
	overflow: hidden;
	box-sizing: border-box;
}

.bg-layer {
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 0;
	pointer-events: none;
	overflow: hidden;
}

.bg-circle {
	position: absolute;
	background: rgba(253, 231, 209, 0.76);
}

.bg-circle-left {
	left: -120px;
	top: 35%;
}

.bg-circle-right {
	right: 14%;
	top: 19%;
	background: rgba(253, 231, 209, 0.82);
}

.bg-circle-top {
	left: 8%;
	top: -42px;
	background: rgba(253, 231, 209, 0.58);
}

.brush-logo {
	position: absolute;
	left: 20%;
	right: 14%;
	top: 35%;
	height: 42px;
	background: rgba(255, 255, 255, 0.58);
	filter: blur(1px);
	transform: rotate(-1deg);
}

.register-main {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	position: relative;
	z-index: 1;
	box-sizing: border-box;
}

.logo-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
}

.brand-image {
	display: block;
}

.slogan-row {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
}

.slogan-text {
	color: #5f6368;
	line-height: 1.45;
	text-align: center;
	white-space: nowrap;
}

.slogan-mark {
	color: #f5a623;
	line-height: 1;
	font-weight: 700;
}

.form-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	box-sizing: border-box;
}

.input-wrapper {
	width: 100%;
	display: flex;
	align-items: center;
	background: rgba(255, 255, 255, 0.92);
	box-shadow: 0 10px 28px rgba(138, 90, 43, 0.06);
	box-sizing: border-box;
	overflow: hidden;
}

.input-icon-wrap {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.input-line-icon {
	color: #7f7f7f;
	line-height: 1;
	font-weight: 400;
}

.input-field {
	flex: 1;
	color: #333333;
	background: transparent;
	border: none;
	font-weight: 400;
	box-sizing: border-box;
}

.input-placeholder {
	color: #b8b8b8;
	font-weight: 400;
}

.register-btn {
	width: 100%;
	padding: 0;
	border: none;
	background: rgba(253, 231, 209, 1);
	box-shadow: 0 10px 24px rgba(138, 90, 43, 0.1);
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.register-btn::after {
	border: none;
}

.register-btn:active:not(.register-btn-loading) {
	transform: scale(0.992);
	opacity: 0.9;
}

.register-btn-loading {
	opacity: 0.74;
}

.btn-text {
	color: #202124;
	line-height: 1;
	font-weight: 400;
	letter-spacing: 2px;
}

.loading-spinner {
	width: 20px;
	height: 20px;
	border: 3px solid rgba(138, 90, 43, 0.18);
	border-top-color: #8a5a2b;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

.footer-links {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
}

.link-text {
	color: #6f7277;
	font-weight: 400;
	line-height: 1;
}

.link-btn {
	color: #8a5a2b;
	font-weight: 400;
	line-height: 1;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>