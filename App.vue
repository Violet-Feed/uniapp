<template>
</template>

<script>
import { flushClickReportQueue } from '@/utils/track.js'

export default {
	onLaunch(options) {
		this.ensureDeepLinkState()
		this._launchOptions = options || {}

		const systemInfo = uni.getSystemInfoSync()
		const app = getApp()

		app.globalData.deviceId = systemInfo.deviceId
		app.globalData.platform = systemInfo.platform
		app.globalData.appReadyForDeepLink = false

		this.registerAuthReadyListener()
		this.setupDeepLinkListener()
	},

	onShow(options) {
		this.ensureDeepLinkState()
		this._lastShowOptions = options || {}

		const app = getApp()
		const platform = app?.globalData?.platform

		if (platform !== 'android' || !app?.globalData?.appReadyForDeepLink) {
			return
		}

		setTimeout(() => {
			this.handleDeepLink('onShow', options, {
				force: false
			})
		}, 500)
	},
	
	onHide() {
	    flushClickReportQueue()
	},

	methods: {
		ensureDeepLinkState() {
			if (!this._handledDeepLinkMap) {
				this._handledDeepLinkMap = Object.create(null)
			}

			if (!this._lastDeepLinkKey) {
				this._lastDeepLinkKey = ''
			}

			if (!this._lastDeepLinkTime) {
				this._lastDeepLinkTime = 0
			}

			if (!this._deepLinkListenerReady) {
				this._deepLinkListenerReady = false
			}

			if (!this._authReadyListenerRegistered) {
				this._authReadyListenerRegistered = false
			}
		},

		registerAuthReadyListener() {
			this.ensureDeepLinkState()

			if (this._authReadyListenerRegistered) {
				return
			}

			this._authReadyListenerRegistered = true

			uni.$on('app-auth-ready', (payload = {}) => {
				const app = getApp()
				app.globalData.appReadyForDeepLink = true

				if (app?.globalData?.platform !== 'android') {
					return
				}

				const pending = this._pendingDeepLink || null
				this._pendingDeepLink = null

				const options = pending?.options || payload.options || this._launchOptions || this._lastShowOptions || {}
				const source = pending?.source || 'authReady'
				const force = !!pending?.config?.force
				const delay = Number(payload.delay || 500)

				setTimeout(() => {
					this.handleDeepLink(source, options, {
						force
					})
				}, delay)
			})
		},

		setupDeepLinkListener() {
			// #ifndef APP-PLUS
			return
			// #endif

			this.ensureDeepLinkState()

			const setup = () => {
				if (this._deepLinkListenerReady) {
					return
				}

				this._deepLinkListenerReady = true

				if (typeof plus === 'undefined' || !plus.globalEvent) {
					return
				}

				plus.globalEvent.addEventListener('newintent', () => {
					console.log('[DeepLink] newintent')

					setTimeout(() => {
						this.handleDeepLink('newintent', {}, {
							force: true
						})
					}, 300)
				})
			}

			if (typeof plus !== 'undefined' && plus.runtime) {
				setup()
			} else if (typeof document !== 'undefined') {
				document.addEventListener('plusready', setup, false)
			}
		},

		handleDeepLink(source, options = {}, config = {}) {
			// #ifndef APP-PLUS
			return
			// #endif

			this.ensureDeepLinkState()

			const app = getApp()
			if (!app?.globalData?.appReadyForDeepLink) {
				this._pendingDeepLink = { source, options, config }
				return
			}

			const force = !!config.force

			try {
				const rawFromPlus = this.getPlusArguments()

				const deepLinkData =
					this.extractDeepLinkDataFromRaw(rawFromPlus) ||
					this.extractDeepLinkDataFromOptions(options)

				if (!deepLinkData || !deepLinkData.creationId) {
					return
				}

				const deepLinkKey = this.buildDeepLinkKey(deepLinkData)

				if (!force && this._handledDeepLinkMap[deepLinkKey]) {
					return
				}

				const pageUrl = this.buildCreationPageUrl(deepLinkData)

				if (!pageUrl) {
					return
				}

				const now = Date.now()

				if (
					!force &&
					this._lastDeepLinkKey === deepLinkKey &&
					now - (this._lastDeepLinkTime || 0) < 3000
				) {
					return
				}

				this._handledDeepLinkMap[deepLinkKey] = true
				this._lastDeepLinkKey = deepLinkKey
				this._lastDeepLinkTime = now

				console.log('[DeepLink] navigate:', pageUrl)

				this.navigateByDeepLink(pageUrl)
			} catch (err) {
				console.error('[DeepLink] error:', err)
			}
		},

		getPlusArguments() {
			// #ifndef APP-PLUS
			return ''
			// #endif

			try {
				if (typeof plus === 'undefined' || !plus.runtime) {
					return ''
				}

				return plus.runtime.arguments || ''
			} catch (err) {
				return ''
			}
		},

		extractDeepLinkDataFromOptions(options) {
			/**
			 * 这里只允许解析 query 里的 creationId。
			 *
			 * 注意：
			 * 不要解析 options.path。
			 * App 正常打开首页时，options.path 可能是 /pages/creation/home。
			 * 如果把它当 deep link 处理，就会错误地 navigateTo tabBar 首页。
			 */
			if (!options || typeof options !== 'object') {
				return null
			}

			const query = options.query || {}

			const creationId =
				query.creationId ||
				query.creation_id ||
				query.id ||
				''

			if (!creationId) {
				return null
			}

			return {
				creationId: String(creationId),
				userId: String(query.userId || query.user_id || ''),
				materialType: String(query.materialType || query.material_type || '')
			}
		},

		extractDeepLinkDataFromRaw(raw) {
			if (!raw) {
				return null
			}

			const rawText = String(raw)
			const onceDecoded = this.safeDecode(rawText)
			const twiceDecoded = this.safeDecode(onceDecoded)

			const candidates = [
				rawText,
				onceDecoded,
				twiceDecoded
			]

			for (const item of candidates) {
				const data = this.extractDeepLinkDataFromString(item)
				if (data && data.creationId) {
					return data
				}
			}

			return null
		},

		extractDeepLinkDataFromString(text) {
			if (!text) {
				return null
			}

			let urlObj = null

			try {
				urlObj = new URL(text)
			} catch (err) {
				urlObj = null
			}

			if (urlObj && urlObj.searchParams) {
				const path = urlObj.searchParams.get('path')

				if (path) {
					const dataFromPath = this.extractDeepLinkDataFromPath(this.safeDecode(path))
					if (dataFromPath && dataFromPath.creationId) {
						return dataFromPath
					}
				}

				const creationId =
					urlObj.searchParams.get('creationId') ||
					urlObj.searchParams.get('creation_id') ||
					urlObj.searchParams.get('id') ||
					''

				if (creationId) {
					return {
						creationId: String(creationId),
						userId: String(
							urlObj.searchParams.get('userId') ||
							urlObj.searchParams.get('user_id') ||
							''
						),
						materialType: String(
							urlObj.searchParams.get('materialType') ||
							urlObj.searchParams.get('material_type') ||
							''
						)
					}
				}
			}

			const pathMatch = String(text).match(/[?&]path=([^&]+)/)

			if (pathMatch && pathMatch[1]) {
				const dataFromPath = this.extractDeepLinkDataFromPath(this.safeDecode(pathMatch[1]))

				if (dataFromPath && dataFromPath.creationId) {
					return dataFromPath
				}
			}

			const creationId =
				this.matchQueryValue(text, 'creationId') ||
				this.matchQueryValue(text, 'creation_id') ||
				this.matchQueryValue(text, 'id') ||
				''

			if (!creationId) {
				return null
			}

			return {
				creationId: String(creationId),
				userId: String(
					this.matchQueryValue(text, 'userId') ||
					this.matchQueryValue(text, 'user_id') ||
					''
				),
				materialType: String(
					this.matchQueryValue(text, 'materialType') ||
					this.matchQueryValue(text, 'material_type') ||
					''
				)
			}
		},

		extractDeepLinkDataFromPath(path) {
			if (!path) {
				return null
			}

			const decodedPath = this.safeDecode(path)

			/**
			 * 这里只解析 path 里面的 query。
			 * 例如：
			 * /pages/creation/creation_video?creationId=xxx&userId=xxx&materialType=2
			 */
			const queryIndex = decodedPath.indexOf('?')
			const queryText = queryIndex >= 0
				? decodedPath.slice(queryIndex + 1)
				: decodedPath

			const creationId =
				this.matchQueryValue(queryText, 'creationId') ||
				this.matchQueryValue(queryText, 'creation_id') ||
				this.matchQueryValue(queryText, 'id') ||
				''

			if (!creationId) {
				return null
			}

			return {
				creationId: String(creationId),
				userId: String(
					this.matchQueryValue(queryText, 'userId') ||
					this.matchQueryValue(queryText, 'user_id') ||
					''
				),
				materialType: String(
					this.matchQueryValue(queryText, 'materialType') ||
					this.matchQueryValue(queryText, 'material_type') ||
					''
				)
			}
		},

		buildDeepLinkKey(data) {
			const creationId = String(data.creationId || '')
			const userId = String(data.userId || '')
			const materialType = String(data.materialType || '')

			return [
				'creation',
				creationId,
				userId,
				materialType
			].join('|')
		},

		buildCreationPageUrl(data) {
			const creationId = data.creationId
			const userId = data.userId || ''
			const materialType = data.materialType || ''

			if (!creationId) {
				return ''
			}

			const basePath =
				Number(materialType) === 2
					? '/pages/creation/creation_video'
					: '/pages/creation/creation_image'

			const params = [
				'creationId=' + encodeURIComponent(String(creationId))
			]

			if (userId) {
				params.push('userId=' + encodeURIComponent(String(userId)))
			}

			return basePath + '?' + params.join('&')
		},

		navigateByDeepLink(url) {
			setTimeout(() => {
				uni.navigateTo({
					url,
					success: () => {
						console.log('[DeepLink] success')
					},
					fail: (err) => {
						console.error('[DeepLink] navigateTo failed:', err)
					}
				})
			}, 300)
		},

		matchQueryValue(text, key) {
			if (!text || !key) {
				return ''
			}

			const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			const reg = new RegExp('(?:^|[?&])' + escapedKey + '=([^&]+)')
			const match = String(text).match(reg)

			if (!match || !match[1]) {
				return ''
			}

			return this.safeDecode(match[1])
		},

		safeDecode(value) {
			if (value === undefined || value === null) {
				return ''
			}

			try {
				return decodeURIComponent(String(value))
			} catch (err) {
				return String(value)
			}
		}
	}
}
</script>

<style>
/* #ifndef APP-NVUE */
@font-face {
	font-family: "VioletSans";
	src: url("/static/fonts/HarmonyOS_Sans_SC_Regular.ttf") format("truetype");
	font-weight: 400;
	font-style: normal;
}

@font-face {
	font-family: "VioletSans";
	src: url("/static/fonts/HarmonyOS_Sans_SC_Medium.ttf") format("truetype");
	font-weight: 500;
	font-style: normal;
}

page,
view,
text,
input,
textarea,
button {
	font-family: "VioletSans", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif;
	font-weight: 400;
}
/* #endif */
</style>