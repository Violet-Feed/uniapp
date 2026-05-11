<template>
	<view>
		<!-- 占位，避免 fixed 底栏盖住页面内容 -->
		<view class="violet-tabbar-placeholder" :style="placeholderStyle"></view>

		<view class="violet-tabbar" :style="tabbarStyle">
			<view
				v-for="(item, index) in tabs"
				:key="item.pagePath"
				class="tab-item"
				:class="{ active: isActive(item, index), center: item.center }"
				@click="switchTo(item, index)"
			>
				<!-- 中间工坊按钮：沿用原来的图片 -->
				<view v-if="item.center" class="center-button" :style="centerButtonStyle">
					<image
						class="center-icon"
						:style="centerIconStyle"
						:src="isActive(item, index) ? item.selectedIconPath : item.iconPath"
						mode="aspectFit"
					></image>
				</view>

				<!-- 其他 tab：只显示文字 -->
				<view v-else class="normal-tab">
					<text class="tab-text" :style="tabTextStyle">
						{{ item.text }}
					</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
const TAB_ROUTES = [
	{
		text: '首页',
		pagePath: 'pages/creation/home'
	},
	{
		text: '朋友',
		pagePath: 'pages/creation/friend'
	},
	{
		text: '',
		pagePath: 'pages/workspace/workspace',
		iconPath: '/static/workspace1.png',
		selectedIconPath: '/static/workspace2.png',
		center: true
	},
	{
		text: '消息',
		pagePath: 'pages/im/home'
	},
	{
		text: '我的',
		pagePath: 'pages/user/my_profile'
	}
]

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
			safeBottom: 0,

			tabbarBaseHeight: 48,
			tabbarTotalHeight: 48,

			tabFontSize: 13,
			centerButtonSize: 36,
			centerIconSize: 24
		}
	},

	computed: {
		placeholderStyle() {
			return 'height:' + this.tabbarTotalHeight + 'px;'
		},

		tabbarStyle() {
			return (
				'height:' + this.tabbarTotalHeight + 'px;' +
				'padding-bottom:' + this.safeBottom + 'px;'
			)
		},

		tabTextStyle() {
			return 'font-size:' + this.tabFontSize + 'px;'
		},

		centerButtonStyle() {
			return (
				'width:' + this.centerButtonSize + 'px;' +
				'height:' + this.centerButtonSize + 'px;' +
				'border-radius:' + Math.floor(this.centerButtonSize / 2) + 'px;'
			)
		},

		centerIconStyle() {
			return (
				'width:' + this.centerIconSize + 'px;' +
				'height:' + this.centerIconSize + 'px;'
			)
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
			const safeInsets = sys.safeAreaInsets || {}

			this.windowHeight = windowHeight
			this.safeBottom = Number(safeInsets.bottom || 0)

			// 主体高度 = 屏幕高度十三分之一
			const baseHeight = Math.floor(windowHeight / 13)

			this.tabbarBaseHeight = Math.max(40, Math.min(62, baseHeight))
			this.tabbarTotalHeight = this.tabbarBaseHeight + this.safeBottom

			this.tabFontSize = Math.max(12, Math.min(14, Math.floor(this.tabbarBaseHeight * 0.24)))

			this.centerButtonSize = Math.max(34, Math.min(48, Math.floor(this.tabbarBaseHeight * 0.76)))
			this.centerIconSize = Math.max(22, Math.min(30, Math.floor(this.centerButtonSize * 0.62)))
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

<style scoped>
.violet-tabbar-placeholder {
	width: 100%;
	flex-shrink: 0;
}

.violet-tabbar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: space-around;
	background: #ffffff;
	border-top: 1px solid rgba(0, 0, 0, 0.08);
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
	align-items: center;
	justify-content: center;
}

.tab-text {
	color: #585858;
	font-weight: bold;
}

.tab-item.active .tab-text {
	color: #9932cc;
}

.tab-item.center {
	position: relative;
}

.center-button {
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
}

.center-icon {
	display: block;
}
</style>