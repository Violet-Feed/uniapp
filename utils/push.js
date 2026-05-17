import DB from '@/utils/sqlite.js'
import { getMemberInfosBySendersEnsure } from '@/utils/member_info.js'
import { getUserInfos } from '@/request/user.js'

let installed = false
let permissionPromptVisible = false
let appInForeground = true
let appVisibilityListenerInstalled = false

const DEFAULT_USER_AVATAR = '/static/user_avatar.png'
const DEFAULT_AGENT_AVATAR = '/static/ai_avatar.png'
const DEFAULT_CONV_AVATAR = '/static/conv_avatar.png'

const NOTIFY_PERMISSION_ASKED_KEY = 'notify_permission_asked'

const safeString = (value) => {
	if (value === null || value === undefined) return ''
	if (typeof value === 'bigint') return value.toString()
	return String(value)
}

const safeNumber = (value, fallback = 0) => {
	const n = Number(value)
	return Number.isFinite(n) ? n : fallback
}

const normalizeRoute = (route) => {
	if (!route) return ''

	const value = safeString(route)

	return value.startsWith('/') ? value : `/${value}`
}

const getCurrentPageInfo = () => {
	try {
		const pages = getCurrentPages()
		const page = pages && pages.length > 0 ? pages[pages.length - 1] : null

		if (!page) {
			return {
				route: '',
				options: {}
			}
		}

		return {
			route: normalizeRoute(page.route || page.$page?.route || ''),
			options: page.options || page.$page?.options || {}
		}
	} catch (err) {
		return {
			route: '',
			options: {}
		}
	}
}

const isAppInForeground = () => {
	return appInForeground
}

export const setNotifyAppInForeground = (value) => {
	appInForeground = !!value
}

const installAppVisibilityListener = () => {
	if (appVisibilityListenerInstalled) return

	appVisibilityListenerInstalled = true

	try {
		if (typeof uni.onAppShow === 'function') {
			uni.onAppShow(() => {
				appInForeground = true
			})
		}

		if (typeof uni.onAppHide === 'function') {
			uni.onAppHide(() => {
				appInForeground = false
			})
		}
	} catch (err) {
		console.error('installAppVisibilityListener failed:', err)
	}
}

const isCurrentConversationPage = (conId) => {
	if (!conId) return false

	const { route, options } = getCurrentPageInfo()

	if (route !== '/pages/im/conversation') {
		return false
	}

	const currentConId = options.conId || options.con_id || ''

	return safeString(currentConId) === safeString(conId)
}

const isCurrentNoticePage = (group) => {
	const { route, options } = getCurrentPageInfo()

	if (route !== '/pages/im/notice') {
		return false
	}

	const currentGroup = options.group || options.noticeGroup || 1

	return safeNumber(currentGroup, 1) === safeNumber(group, 1)
}

const hasAskedNotifyPermission = () => {
	return uni.getStorageSync(NOTIFY_PERMISSION_ASKED_KEY) === '1'
}

const markNotifyPermissionAsked = () => {
	uni.setStorageSync(NOTIFY_PERMISSION_ASKED_KEY, '1')
}

const toPlainPayload = (payload = {}) => {
	const result = {}

	Object.keys(payload).forEach((key) => {
		const value = payload[key]

		if (value === undefined || value === null) {
			result[key] = ''
			return
		}

		if (typeof value === 'bigint') {
			result[key] = value.toString()
			return
		}

		result[key] = value
	})

	return result
}

const getNotificationAuthorized = () => {
	// #ifdef APP-PLUS
	try {
		const setting = uni.getAppAuthorizeSetting()
		return setting.notificationAuthorized || 'unknown'
	} catch (err) {
		console.error('getNotificationAuthorized failed:', err)
		return 'unknown'
	}
	// #endif

	return 'authorized'
}

const openAppNotificationSetting = () => {
	// #ifdef APP-PLUS
	try {
		const platform = uni.getSystemInfoSync().platform

		if (platform === 'android') {
			const main = plus.android.runtimeMainActivity()
			const Intent = plus.android.importClass('android.content.Intent')
			const Settings = plus.android.importClass('android.provider.Settings')
			const Uri = plus.android.importClass('android.net.Uri')

			const intent = new Intent()
			const androidVersion = Number(String(plus.os.version || '0').split('.')[0])

			if (androidVersion >= 8) {
				intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
				intent.putExtra(Settings.EXTRA_APP_PACKAGE, main.getPackageName())
			} else {
				intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
				intent.setData(Uri.parse('package:' + main.getPackageName()))
			}

			main.startActivity(intent)
			return
		}

		uni.openAppAuthorizeSetting()
	} catch (err) {
		console.error('openAppNotificationSetting failed:', err)

		try {
			uni.openAppAuthorizeSetting()
		} catch (e) {
			uni.showToast({
				title: '请到系统设置中开启通知权限',
				icon: 'none'
			})
		}
	}
	// #endif
}

const ensureNotificationAuthorized = ({ forcePrompt = false } = {}) => {
	// #ifdef APP-PLUS
	const status = getNotificationAuthorized()
	console.log("push auth:", status)
	if (status !== 'denied') {
		return true
	}

	if (permissionPromptVisible) {
		return false
	}

	if (!forcePrompt && hasAskedNotifyPermission()) {
		return false
	}

	permissionPromptVisible = true

	uni.showModal({
		title: '开启通知权限',
		content: '开启通知权限后，可以及时收到聊天、素材生成和互动通知提醒。',
		confirmText: '去开启',
		cancelText: '暂不开启',
		success(res) {
			markNotifyPermissionAsked()

			if (res.confirm) {
				openAppNotificationSetting()
			}
		},
		fail() {
			markNotifyPermissionAsked()
		},
		complete() {
			permissionPromptVisible = false
		}
	})

	return false
	// #endif

	return true
}

const createLocalNotification = ({ title, content, payload, icon }) => {
	// #ifdef APP-PLUS
	try {
		const authorized = getNotificationAuthorized()

		if (authorized === 'denied') {
			return
		}

		const options = {
			title: title || '通知',
			content: content || '',
			payload: toPlainPayload(payload),
			sound: 'system',
			cover: false,
			delay: 0,
			success() { 				
				console.log('本地通知创建成功:', title, content) 			
			}, 			
			fail(err) { 				
				console.error('本地通知创建失败:', err) 			
			}
		}

		if (icon) {
			options.icon = icon
		}

		uni.createPushMessage(options)
	} catch (err) {
		console.error('createLocalNotification error:', err)
	}
	// #endif
}

const parsePushPayload = (res) => {
	const raw =
		res?.data?.payload ||
		res?.payload ||
		res?.data ||
		{}

	if (!raw) return {}

	if (typeof raw === 'string') {
		try {
			return JSON.parse(raw)
		} catch (err) {
			return {}
		}
	}

	if (raw.payload) {
		if (typeof raw.payload === 'string') {
			try {
				return JSON.parse(raw.payload)
			} catch (err) {
				return raw
			}
		}

		if (typeof raw.payload === 'object') {
			return raw.payload
		}
	}

	return raw
}

const navigateToConversation = (payload = {}) => {
	const conId = safeString(payload.con_id || payload.conId || '')
	const name = safeString(payload.name || payload.con_name || payload.conName || '聊天')
	const conType = safeString(payload.con_type || payload.conType || '')

	if (!conId) return

	const url = `/pages/im/conversation?conId=${conId}&name=${name}&conType=${conType}`

	const { route, options } = getCurrentPageInfo()
	const currentConId = safeString(options.conId || options.con_id || '')

	if (route === '/pages/im/conversation') {
		if (currentConId === conId) {
			return
		}

		uni.redirectTo({
			url,
			fail() {
				uni.navigateTo({
					url,
					fail() {
						uni.reLaunch({
							url,
							fail(err) {
								console.error('open conversation failed:', err)
							}
						})
					}
				})
			}
		})

		return
	}

	uni.navigateTo({
		url,
		fail() {
			uni.redirectTo({
				url,
				fail() {
					uni.reLaunch({
						url,
						fail(err) {
							console.error('open conversation failed:', err)
						}
					})
				}
			})
		}
	})
}

const navigateToNotice = (payload = {}) => {
	const group = safeString(payload.group || 1)
	const url = `/pages/im/notice?group=${group}`

	const { route, options } = getCurrentPageInfo()
	const currentGroup = safeNumber(options.group || options.noticeGroup || 1, 1)

	if (route === '/pages/im/notice') {
		if (currentGroup === safeNumber(group, 1)) {
			return
		}

		uni.redirectTo({
			url,
			fail() {
				uni.navigateTo({
					url,
					fail(err) {
						console.error('open notice failed:', err)
					}
				})
			}
		})

		return
	}

	uni.navigateTo({
		url,
		fail() {
			uni.redirectTo({
				url,
				fail(err) {
					console.error('open notice failed:', err)
				}
			})
		}
	})
}

const handleNotificationClick = (payload = {}) => {
	const type = payload.type || ''

	if (type === 'conversation') {
		navigateToConversation(payload)
		return
	}

	if (type === 'notice') {
		navigateToNotice(payload)
		return
	}

	if (type === 'material') {
		uni.switchTab({
			url: '/pages/workspace/workspace',
			fail(err) {
				console.error('open material page failed:', err)
			}
		})
	}
}

const installPushClickListener = () => {
	// #ifdef APP-PLUS
	uni.onPushMessage((res) => {
		if (res?.type !== 'click') return

		const payload = parsePushPayload(res)
		handleNotificationClick(payload)
	})
	// #endif
}

const shouldSkipSelfMessage = (msgBody) => {
	const app = getApp()
	const currentUserId = app?.globalData?.userId

	if (!currentUserId || !msgBody?.sender_id) return false

	return (
		safeNumber(msgBody.sender_type) === 1 &&
		safeString(msgBody.sender_id) === safeString(currentUserId)
	)
}

const getConversationDisplayInfo = (conversation, msgBody) => {
	const conType = safeNumber(conversation?.con_type || msgBody?.con_type)

	if (conType === 1) {
		return {
			name: conversation?.name || '用户',
			avatar: conversation?.avatar_uri || DEFAULT_USER_AVATAR
		}
	}

	if (conType === 4) {
		return {
			name: conversation?.name || 'AI',
			avatar: conversation?.avatar_uri || DEFAULT_AGENT_AVATAR
		}
	}

	if (conType === 2) {
		return {
			name: conversation?.name || '群聊',
			avatar: conversation?.avatar_uri || DEFAULT_CONV_AVATAR
		}
	}

	return {
		name: conversation?.name || '聊天',
		avatar: conversation?.avatar_uri || DEFAULT_CONV_AVATAR
	}
}

const getSenderDisplayName = (senderInfo, msgBody) => {
	if (senderInfo?.nick_name) return senderInfo.nick_name

	const senderType = safeNumber(msgBody?.sender_type)

	if (senderType === 1) return '用户'
	if (senderType === 2) return 'AI'

	return '成员'
}

const normalizeMessageContent = (msgBody) => {
	if (!msgBody) return ''

	const msgType = safeNumber(msgBody.msg_type)

	if (msgType === 1) {
		return msgBody.msg_content || ''
	}

	if (msgType === 4) {
		return '[分享内容]'
	}

	if (msgType === 2) {
		return '[图片]'
	}

	if (msgType === 3) {
		return '[视频]'
	}

	return msgBody.msg_content || '[消息]'
}

const handleNormal = async (packet) => {
	try {
		const msgBody = packet?.msg_body || packet?.msgBody || null
		if (!msgBody) return

		if (msgBody.sender_type != 1 && msgBody.sender_type != 2) return

		if (shouldSkipSelfMessage(msgBody)) {
			return
		}

		const conId = msgBody.con_id
		if (!conId) return

		if (isAppInForeground() && isCurrentConversationPage(conId)) {
			return
		}

		const conversation = await DB.getConversationById(conId)
		if (!conversation) return

		const senderList = await getMemberInfosBySendersEnsure(conId, msgBody.con_short_id, [
			{
				sender_type: safeNumber(msgBody.sender_type),
				sender_id: msgBody.sender_id
			}
		])

		const senderInfo = Array.isArray(senderList) && senderList.length > 0
			? senderList[0]
			: null

		const { name: conversationName, avatar: conversationAvatar } =
			getConversationDisplayInfo(conversation, msgBody)

		const senderName = getSenderDisplayName(senderInfo, msgBody)
		const messageContent = normalizeMessageContent(msgBody)

		const title = conversationName
		const content = senderName
			? `${senderName}: ${messageContent}`
			: messageContent

		createLocalNotification({
			title,
			content,
			icon: conversationAvatar,
			payload: {
				type: 'conversation',
				con_id: safeString(conversation.con_id || conId),
				name: safeString(conversationName),
				con_type: safeString(conversation.con_type || msgBody.con_type)
			}
		})
	} catch (err) {
		console.error('handleNormal notification failed:', err)
	}
}

const getMaterialNotificationText = (packet) => {
	const status = safeNumber(packet?.status)

	if (status === 2) {
		return {
			title: '素材生成完成',
			content: '你的素材已生成完成'
		}
	}

	if (status === 3) {
		return {
			title: '素材生成失败',
			content: '素材生成失败QAQ'
		}
	}

	return null
}

const handleMaterial = async (packet) => {
	try {
		if (!packet) return

		const text = getMaterialNotificationText(packet)
		if (!text) return

		createLocalNotification({
			title: text.title,
			content: text.content,
			payload: {
				type: 'material'
			}
		})
	} catch (err) {
		console.error('handleMaterial notification failed:', err)
	}
}

const getNoticeTitle = (group) => {
	if (group === 1) return '系统通知'
	if (group === 2) return '关注通知'
	if (group === 3) return '互动通知'
	return '通知'
}

const getNoticeBody = (packet) => {
	return packet?.notice_body || packet?.noticeBody || {}
}

const getNoticeContentJson = (noticeBody) => {
	const raw = noticeBody?.notice_content || ''

	if (!raw) return {}

	if (typeof raw === 'object') {
		return raw
	}

	try {
		const data = JSON.parse(String(raw))
		return data && typeof data === 'object' ? data : {}
	} catch (err) {
		return {}
	}
}

const isSelfNoticeSender = (senderId) => {
	const currentUserId = getApp()?.globalData?.userId

	if (!currentUserId || !senderId) return false

	return safeString(currentUserId) === safeString(senderId)
}

const parseUserInfoList = (res) => {
	if (!res) return []

	if (Array.isArray(res)) return res

	if (Array.isArray(res.user_infos)) return res.user_infos
	if (Array.isArray(res.users)) return res.users
	if (Array.isArray(res.list)) return res.list

	if (res.user_info) return [res.user_info]
	if (res.user) return [res.user]

	return []
}

const getNoticeSenderName = async (senderId) => {
	if (!senderId) return '用户'

	try {
		const res = await getUserInfos({
			userIds: [safeString(senderId)]
		})

		const list = parseUserInfoList(res)
		const user = list.find(item => safeString(item?.user_id || item?.userId || item?.id) === safeString(senderId)) || list[0]

		return (
			user?.username ||
			user?.name ||
			user?.nick_name ||
			user?.nickname ||
			'用户'
		)
	} catch (err) {
		console.error('getNoticeSenderName failed:', err)
		return '用户'
	}
}

const buildNoticeContent = async (packet) => {
	const noticeBody = getNoticeBody(packet)
	const noticeType = safeNumber(noticeBody.notice_type)
	const senderId = noticeBody.sender_id
	const noticeContent = getNoticeContentJson(noticeBody)

	if (noticeType === 1) {
		return '你收到了一条系统消息'
	}

	const username = await getNoticeSenderName(senderId)

	if (noticeType === 2) {
		return `${username}关注了你`
	}

	if (noticeType === 3) {
		return `${username}赞了你的创作`
	}

	if (noticeType === 4) {
		return `${username}赞了你的评论`
	}

	if (noticeType === 5) {
		return `${username}评论了你`
	}

	if (noticeType === 6) {
		return `${username}回复了你`
	}

	return noticeContent.content || '你收到了一条新的通知'
}

const handleNotice = async (packet) => {
	try {
		if (!packet) return

		if (packet.op_type != 1) return

		if (packet.new_notice === false) {
			return
		}

		const group = safeNumber(packet.group)

		if (![1, 2, 3].includes(group)) {
			return
		}

		if (isAppInForeground() && isCurrentNoticePage(group)) {
			return
		}

		const noticeBody = getNoticeBody(packet)
		const noticeType = safeNumber(noticeBody.notice_type)
		const senderId = noticeBody.sender_id

		if (noticeType !== 1 && isSelfNoticeSender(senderId)) {
			return
		}

		const content = await buildNoticeContent(packet)

		createLocalNotification({
			title: getNoticeTitle(group),
			content,
			payload: {
				type: 'notice',
				group: safeString(group)
			}
		})
	} catch (err) {
		console.error('handleNotice notification failed:', err)
	}
}

export const installNotifyListener = () => {
	if (installed) return

	installed = true

	installAppVisibilityListener()

	uni.$on('normal', handleNormal)
	uni.$on('material', handleMaterial)
	uni.$on('notice', handleNotice)

	installPushClickListener()
	
	ensureNotificationAuthorized()
}

export const uninstallNotifyListener = () => {
	if (!installed) return

	installed = false

	uni.$off('normal', handleNormal)
	uni.$off('material', handleMaterial)
	uni.$off('notice', handleNotice)
}

export const checkNotifyPermission = () => {
	return ensureNotificationAuthorized({
		forcePrompt: true
	})
}

export const resetNotifyPermissionAsked = () => {
	uni.removeStorageSync(NOTIFY_PERMISSION_ASKED_KEY)
}