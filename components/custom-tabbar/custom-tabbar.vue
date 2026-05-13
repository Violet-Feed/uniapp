<template>
	<view>
		<!-- 占位，避免 fixed 底栏盖住页面内容 -->
		<view class="violet-tabbar-placeholder" :style="placeholderStyle"></view>

		<view class="violet-tabbar-shell" :style="tabbarShellStyle">
			<view class="violet-tabbar" :style="tabbarStyle">
				<view
					v-for="(item, index) in tabs"
					:key="item.pagePath"
					class="tab-item"
					:class="{ active: isActive(item, index), center: item.center }"
					@click="switchTo(item, index)"
				>
					<view v-if="item.center" class="center-tab">
						<view class="center-button" :style="centerButtonStyle">
							<text
								class="iconfont center-icon"
								:class="item.icon"
								:style="centerIconStyle"
							></text>
						</view>
					</view>

					<view v-else class="normal-tab">
						<view class="tab-icon-slot" :style="tabIconSlotStyle">
							<text
								class="iconfont tab-icon"
								:class="item.icon"
								:style="getTabIconStyle(item)"
							></text>
						</view>

						<view class="tab-text-slot" :style="tabTextSlotStyle">
							<text class="tab-text" :style="tabTextStyle">
								{{ item.text }}
							</text>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
const TAB_ROUTES = [
	{
		text: '首页',
		pagePath: 'pages/creation/home',
		icon: 'icon-shouye',
		iconScale: 1
	},
	{
		text: '朋友',
		pagePath: 'pages/creation/friend',
		icon: 'icon-dongtai1',
		iconScale: 1
	},
	{
		text: '',
		pagePath: 'pages/workspace/workspace',
		icon: 'icon-jiahao_o',
		center: true
	},
	{
		text: '消息',
		pagePath: 'pages/im/home',
		icon: 'icon-xiaoxi',
		iconScale: 1.2
	},
	{
		text: '我的',
		pagePath: 'pages/user/my_profile',
		icon: 'icon-wode',
		iconScale: 0.9
	}
]

const CENTER_BG = 'rgba(253, 231, 209, 1)'

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value))
}

export default {
	name: 'VioletTabBar',

	props: {
		activePath: {
			type: String,
			default: ''
		},
		activeIndex: {
			type: Number,
			default: -1
		}
	},

	data() {
		return {
			tabs: TAB_ROUTES,

			innerActivePath: '',
			innerActiveIndex: 0,

			windowHeight: 667,
			windowWidth: 375,
			safeBottom: 0,

			tabbarBaseHeight: 58,
			tabbarTotalHeight: 58,
			
			tabIconSize: 20,
			tabIconSlotHeight: 29,
			tabTextSlotHeight: 15,
			tabFontSize: 11,
			
			centerButtonSize: 39,
			centerIconSize: 23
		}
	},

	computed: {
		placeholderStyle() {
			return 'height:' + this.tabbarTotalHeight + 'px;'
		},

		tabbarShellStyle() {
			return (
				'height:' + this.tabbarTotalHeight + 'px;' +
				'padding-bottom:' + this.safeBottom + 'px;'
			)
		},

		tabbarStyle() {
			return 'height:' + this.tabbarBaseHeight + 'px;'
		},

		tabIconSlotStyle() {
			return 'height:' + this.tabIconSlotHeight + 'px;'
		},

		tabTextSlotStyle() {
			return 'height:' + this.tabTextSlotHeight + 'px;'
		},

		tabTextStyle() {
			return (
				'font-size:' + this.tabFontSize + 'px;' +
				'line-height:' + this.tabTextSlotHeight + 'px;'
			)
		},

		centerButtonStyle() {
			return (
				'width:' + this.centerButtonSize + 'px;' +
				'height:' + this.centerButtonSize + 'px;' +
				'border-radius:' + Math.floor(this.centerButtonSize / 2) + 'px;' +
				'background:' + CENTER_BG + ';'
			)
		},

		centerIconStyle() {
			return 'font-size:' + this.centerIconSize + 'px;'
		}
	},

	mounted() {
		this.hideNativeTabBar()
		this.initLayout()
		this.syncCurrentRoute()
	},

	methods: {
		hideNativeTabBar() {
			try {
				uni.hideTabBar({
					animation: false
				})
			} catch (e) {}
		},

		initLayout() {
			const sys = uni.getSystemInfoSync()
			const windowHeight = Number(sys.windowHeight || 667)
			const windowWidth = Number(sys.windowWidth || 375)
			const safeInsets = sys.safeAreaInsets || {}

			this.windowHeight = windowHeight
			this.windowWidth = windowWidth
			this.safeBottom = Number(safeInsets.bottom || 0)

			const compact = windowWidth <= 360 || windowHeight <= 640
			const baseHeight = Math.floor(windowWidth * 0.148)
			
			this.tabbarBaseHeight = compact
				? clamp(baseHeight, 52, 56)
				: clamp(baseHeight, 56, 62)
			
			this.tabbarTotalHeight = this.tabbarBaseHeight + this.safeBottom
			
			this.tabIconSize = compact
				? clamp(Math.floor(this.tabbarBaseHeight * 0.36), 18, 20)
				: clamp(Math.floor(this.tabbarBaseHeight * 0.37), 20, 23)
			
			this.tabFontSize = compact
				? clamp(Math.floor(this.tabbarBaseHeight * 0.205), 10, 11)
				: clamp(Math.floor(this.tabbarBaseHeight * 0.205), 11, 12)
			
			this.tabIconSlotHeight = compact
				? clamp(Math.floor(this.tabbarBaseHeight * 0.48), 25, 27)
				: clamp(Math.floor(this.tabbarBaseHeight * 0.48), 27, 30)
			
			this.tabTextSlotHeight = compact
				? clamp(Math.floor(this.tabbarBaseHeight * 0.25), 13, 15)
				: clamp(Math.floor(this.tabbarBaseHeight * 0.25), 15, 17)
			
			this.centerButtonSize = compact
				? clamp(Math.floor(this.tabbarBaseHeight * 0.7), 36, 39)
				: clamp(Math.floor(this.tabbarBaseHeight * 0.7), 39, 44)
			
			this.centerIconSize = clamp(
				Math.floor(this.centerButtonSize * 0.58),
				21,
				25
			)
		},

		getTabIconStyle(item) {
			const scale = Number(item && item.iconScale ? item.iconScale : 1)
			const size = Math.round(this.tabIconSize * scale)

			return (
				'font-size:' + size + 'px;' +
				'line-height:' + this.tabIconSlotHeight + 'px;'
			)
		},

		getCurrentRoutePath() {
			const pages = getCurrentPages()
			const currentPage = pages && pages.length ? pages[pages.length - 1] : null

			if (!currentPage) return ''

			const route =
				currentPage.route ||
				(currentPage.$page && currentPage.$page.route) ||
				(currentPage.$page && currentPage.$page.fullPath) ||
				''

			return String(route).replace(/^\//, '').split('?')[0]
		},

		syncCurrentRoute() {
			const route = this.getCurrentRoutePath()
			if (!route) return

			this.innerActivePath = route

			const index = this.tabs.findIndex(item => item.pagePath === route)
			if (index >= 0) {
				this.innerActiveIndex = index
			}
		},

		isActive(item, index) {
			if (!item) return false

			if (this.activeIndex >= 0) {
				return this.activeIndex === index
			}

			if (this.activePath) {
				return this.activePath === item.pagePath
			}

			if (this.innerActivePath) {
				return this.innerActivePath === item.pagePath
			}

			return this.innerActiveIndex === index
		},

		switchTo(item, index) {
			if (!item) return

			this.innerActivePath = item.pagePath
			this.innerActiveIndex = index

			this.hideNativeTabBar()

			const currentRoute = this.getCurrentRoutePath()
			if (currentRoute === item.pagePath) return

			uni.switchTab({
				url: '/' + item.pagePath,
				success: () => {
					this.innerActivePath = item.pagePath
					this.innerActiveIndex = index

					setTimeout(() => {
						this.hideNativeTabBar()
					}, 50)
				},
				fail: (err) => {
					console.error('switchTab failed:', err)
					this.syncCurrentRoute()
				}
			})
		}
	}
}
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.violet-tabbar-placeholder {
	width: 100%;
	flex-shrink: 0;
}

.violet-tabbar-shell {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	background: transparent;
	box-sizing: border-box;
	padding-left: 0;
	padding-right: 0;
}

.violet-tabbar {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-around;
	background: #ffffff;
	border-radius: 0;
	box-shadow: none;
	box-sizing: border-box;
}

.tab-item {
	flex: 1;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.normal-tab {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.tab-icon-slot {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: visible;
	box-sizing: border-box;
}

.tab-text-slot {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.tab-icon {
	color: #9b9b9b;
	display: block;
	text-align: center;
}

.tab-text {
	color: #9b9b9b;
	font-weight: 400;
	display: block;
	text-align: center;
}

.tab-item.active .tab-icon,
.tab-item.active .tab-text {
	color: #f5a033;
}

.tab-item.center {
	position: relative;
}

.center-tab {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.center-button {
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.center-button:active {
	transform: scale(0.94);
}

.center-icon {
	color: #8a5a2b;
	line-height: 1;
}
</style>