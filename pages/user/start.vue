<template>
	<view class="launch-container" :style="containerStyle">
		<page-meta page-style="overflow: hidden;" />

		<view class="bg-layer">
			<view class="bg-circle bg-circle-left" :style="leftCircleStyle"></view>
			<view class="bg-circle bg-circle-right" :style="rightCircleStyle"></view>
			<view class="bg-circle bg-circle-top" :style="topCircleStyle"></view>
			<view class="brush brush-logo"></view>
		</view>

		<view class="launch-main" :style="mainStyle">
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
		</view>

		<view class="bottom-motto" :style="bottomMottoStyle">
			<text class="bottom-motto-text" :style="bottomMottoTextStyle">
				花无凋零之日 意无传递之时
			</text>
		</view>
	</view>
</template>

<script>
import DB from '@/utils/sqlite.js'
import { init } from '@/utils/init.js'

const LOGIN_URL = '/pages/user/login'
const HOME_URL = '/pages/creation/home'

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value))
}

export default {
	data() {
		return {
			bootstrapped: false,
			launchOptions: {},

			windowWidth: 375,
			windowHeight: 667,
			statusBarHeight: 0,
			safeBottom: 0,

			pagePaddingX: 40,
			mainTop: 140,
			logoBottom: 66,

			brandImageWidth: 210,

			sloganTop: 20,
			sloganFontSize: 15,
			sloganMarkFontSize: 27,
			sloganGap: 10,

			bottomMottoBottom: 36,
			bottomMottoFontSize: 16,

			leftCircleSize: 170,
			rightCircleSize: 48,
			topCircleSize: 70
		}
	},

	computed: {
		containerStyle() {
			return (
				'padding-left:' + this.pagePaddingX + 'px;' +
				'padding-right:' + this.pagePaddingX + 'px;' +
				'padding-top:' + this.statusBarHeight + 'px;' +
				'padding-bottom:' + (24 + this.safeBottom) + 'px;'
			)
		},

		mainStyle() {
			return 'padding-top:' + this.mainTop + 'px;'
		},

		logoSectionStyle() {
			return 'margin-bottom:' + this.logoBottom + 'px;'
		},

		brandImageStyle() {
			return 'width:' + this.brandImageWidth + 'px;'
		},

		sloganRowStyle() {
			return (
				'margin-top:' + this.sloganTop + 'px;' +
				'gap:' + this.sloganGap + 'px;'
			)
		},

		sloganTextStyle() {
			return 'font-size:' + this.sloganFontSize + 'px;'
		},

		sloganMarkStyle() {
			return 'font-size:' + this.sloganMarkFontSize + 'px;'
		},

		bottomMottoStyle() {
			return 'bottom:' + (this.bottomMottoBottom + this.safeBottom) + 'px;'
		},

		bottomMottoTextStyle() {
			return 'font-size:' + this.bottomMottoFontSize + 'px;'
		},

		leftCircleStyle() {
			return (
				'width:' + this.leftCircleSize + 'px;' +
				'height:' + this.leftCircleSize + 'px;' +
				'border-radius:' + Math.floor(this.leftCircleSize / 2) + 'px;'
			)
		},

		rightCircleStyle() {
			return (
				'width:' + this.rightCircleSize + 'px;' +
				'height:' + this.rightCircleSize + 'px;' +
				'border-radius:' + Math.floor(this.rightCircleSize / 2) + 'px;'
			)
		},

		topCircleStyle() {
			return (
				'width:' + this.topCircleSize + 'px;' +
				'height:' + this.topCircleSize + 'px;' +
				'border-radius:' + Math.floor(this.topCircleSize / 2) + 'px;'
			)
		}
	},

	onLoad(options) {
		this.launchOptions = options || {}
		//this.initResponsiveLayout()
		this.bootstrap()
	},

	onShow() {
		this.initResponsiveLayout()
	},
	
	onUnload() {
		this.closeAppSplash();
	},

	methods: {
		closeAppSplash() {
		    // #ifdef APP-PLUS
		    setTimeout(() => {
		      try {
		        plus.navigator.closeSplashscreen()
		      } catch (err) {}
		    }, 1000)
		    // #endif
		},
		
		async bootstrap() {
			if (this.bootstrapped) return
			this.bootstrapped = true

			try {
				const systemInfo = uni.getSystemInfoSync()
				const app = getApp()

				app.globalData.deviceId = systemInfo.deviceId
				app.globalData.platform = systemInfo.platform
				app.globalData.appReadyForDeepLink = false

				if (systemInfo.platform !== 'android' && this.platform !== 'ios') {
					console.log('暂不支持该平台')
					uni.showToast({
						title: '目前仅支持Android/IOS',
						icon: 'none'
					});
					this.goLogin()
					return
				}

				const token = uni.getStorageSync('token')
				const userId = uni.getStorageSync('user_id')

				if (!token || !userId) {
					this.goLogin()
					return
				}

				const ok = await init()

				if (!ok) {
					this.goLogin()
					return
				}
				
				this.goHome()
			} catch (err) {
				console.error('启动初始化失败:', err)
				this.goLogin()
			}
		},

		goHome() {
			uni.reLaunch({
				url: HOME_URL,
				success: () => {
					setTimeout(() => {
						uni.$emit('app-auth-ready', {
							options: this.launchOptions,
							delay: 500
						})
					}, 300)
				}
			})
		},

		goLogin() {
			uni.reLaunch({
				url: LOGIN_URL
			})
		},

		initResponsiveLayout() {
			try {
				const sys = uni.getSystemInfoSync()
				const windowWidth = Number(sys.windowWidth || 375)
				const windowHeight = Number(sys.windowHeight || 667)
				const statusBarHeight = Number(sys.statusBarHeight || 0)
				const safeAreaInsets = sys.safeAreaInsets || {}
				const isShort = windowHeight <= 680

				this.windowWidth = windowWidth
				this.windowHeight = windowHeight
				this.statusBarHeight = statusBarHeight
				this.safeBottom = Number(safeAreaInsets.bottom || 0)

				this.pagePaddingX = clamp(Math.floor(windowWidth * 0.108), 28, 46)

				this.mainTop = clamp(
					Math.floor(windowHeight * (isShort ? 0.145 : 0.185)),
					isShort ? 94 : 128,
					isShort ? 116 : 158
				)

				this.logoBottom = clamp(
					Math.floor(windowHeight * (isShort ? 0.06 : 0.08)),
					isShort ? 34 : 52,
					isShort ? 48 : 74
				)

				this.brandImageWidth = clamp(Math.floor(windowWidth * 0.48), 160, 200)

				this.sloganTop = clamp(Math.floor(windowWidth * 0.05), 16, 22)
				this.sloganFontSize = clamp(Math.floor(windowWidth * 0.04), 14, 16)
				this.sloganMarkFontSize = clamp(Math.floor(windowWidth * 0.072), 24, 30)
				this.sloganGap = clamp(Math.floor(windowWidth * 0.024), 8, 12)

				this.bottomMottoBottom = clamp(Math.floor(windowHeight * 0.052), 30, 48)
				this.bottomMottoFontSize = clamp(Math.floor(windowWidth * 0.043), 15, 17)

				this.leftCircleSize = clamp(Math.floor(windowWidth * 0.45), 140, 186)
				this.rightCircleSize = clamp(Math.floor(windowWidth * 0.128), 42, 54)
				this.topCircleSize = clamp(Math.floor(windowWidth * 0.18), 58, 72)
			} catch (err) {
				this.windowWidth = 375
				this.windowHeight = 667
				this.statusBarHeight = 0
				this.safeBottom = 0

				this.pagePaddingX = 40
				this.mainTop = 140
				this.logoBottom = 66

				this.brandImageWidth = 180

				this.sloganTop = 20
				this.sloganFontSize = 15
				this.sloganMarkFontSize = 27
				this.sloganGap = 10

				this.bottomMottoBottom = 36
				this.bottomMottoFontSize = 16

				this.leftCircleSize = 170
				this.rightCircleSize = 48
				this.topCircleSize = 70
			}
		}
	}
}
</script>

<style scoped>
.launch-container {
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

.launch-main {
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

.bottom-motto {
	position: absolute;
	left: 0;
	right: 0;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
}

.bottom-motto-text {
	color: #8a5a2b;
	font-weight: 400;
	line-height: 1.4;
	letter-spacing: 1px;
	text-align: center;
}
</style>
