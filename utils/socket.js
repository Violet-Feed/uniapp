import JSONbig from 'json-bigint'
import DB from '@/utils/sqlite.js'
import {
	encodePacketType,
	encodeConnectPacket,
	decodeMessagePacket,
	decodeMaterialPacket,
	decodeNoticePacket
} from '@/proto_gen/packet.js'
import {
	getConversationInfo,
	transformContent,
	handleCommandMessage
} from '@/request/im.js'
import {
	ensureUsersCached,
	ensureAgentsCached,
	enqueueGroupRosters
} from '@/utils/im-cache.js'

// #ifdef APP-IOS
import {
	startTcp,
	stopTcp,
	sendTcpPacket
} from '@/uni_modules/violet-tcp'
// #endif

const DEFAULT_HOST = '8.130.134.60'
const DEFAULT_PORT = 3001
const HEAD_LENGTH = 5
const HEARTBEAT_INTERVAL = 5000
const HEARTBEAT_TIMEOUT = 20000
const RECONNECT_DELAY = 1000

class Socket {
	socket = null
	socketWriter = null
	socketReader = null
	listenIntervalId = null
	heartIntervalId = null
	heartbeatCheckIntervalId = null
	reconnectTimer = null
	headLength = HEAD_LENGTH
	userId = getApp().globalData.userId
	platform = ''
	host = DEFAULT_HOST
	port = DEFAULT_PORT
	started = false
	connecting = false
	lastHeartbeatTime = 0

	constructor(options = {}) {
		this.host = options.host || DEFAULT_HOST
		this.port = Number(options.port || DEFAULT_PORT)
		this.userId = getApp().globalData.userId

		try {
			this.platform = uni.getSystemInfoSync().platform || ''
		} catch (err) {
			this.platform = ''
		}
	}

	start() {
		if (this.started || this.connecting) return

		this.started = true
		this.connecting = true
		this.userId = getApp().globalData.userId

		if (this.platform === 'android') {
			this.startAndroid()
			return
		}

		if (this.platform === 'ios') {
			this.startIOS()
			return
		}

		this.connecting = false
		console.warn('当前平台不支持 TCP socket:', this.platform)
	}

	startAndroid() {
		// #ifdef APP-PLUS
		try {
			const JavaSocket = plus.android.importClass('java.net.Socket')
			const InputStream = plus.android.importClass('java.io.InputStream')
			const OutputStream = plus.android.importClass('java.io.OutputStream')

			const StrictMode = plus.android.importClass('android.os.StrictMode')
			const Build = plus.android.importClass('android.os.Build')

			if (Build.VERSION.SDK_INT > 9) {
				const policy = new StrictMode.ThreadPolicy.Builder().permitAll().build()
				StrictMode.setThreadPolicy(policy)
			}

			console.log('Android TCP 连接服务器中...', this.host, this.port)

			this.socket = new JavaSocket(this.host, this.port)
			this.socket.setSoTimeout(1000)

			this.socketReader = this.socket.getInputStream()
			this.socketWriter = this.socket.getOutputStream()

			this.connecting = false
			this.listenToServerAndroid()
			this.sendConnectPacket()
			this.startHeartbeat()
		} catch (e) {
			this.connecting = false
			this.started = false
			console.error('Android TCP 连接出错:', e)
			this.close()
		}
		// #endif
	}

	startIOS() {
		// #ifdef APP-IOS
		try {
			console.log('iOS TCP 连接服务器中...', this.host, this.port)

			startTcp({
				host: this.host,
				port: this.port,
				onOpen: () => {
					console.log('iOS TCP 已连接')
					this.connecting = false
					this.sendConnectPacket()
					this.startHeartbeat()
				},
				onClose: () => {
					console.log('iOS TCP 已关闭')
					this.close(false)
				},
				onError: (message) => {
					console.error('iOS TCP 错误:', message)
					this.close(false)
				},
				onPacket: (packetType, buffer) => {
					this.handleRawPacket(packetType, new Uint8Array(buffer))
				}
			})
		} catch (e) {
			this.connecting = false
			this.started = false
			console.error('iOS TCP 连接出错:', e)
			this.close()
		}
		// #endif
	}

	listenToServerAndroid() {
		let reading = false

		this.listenIntervalId = setInterval(() => {
			try {
				if (reading || !this.socketReader) return
				if (!this.socketReader.available()) return

				reading = true

				const header = this.readFullyAndroid(this.headLength)
				if (!header || header.length !== this.headLength) {
					reading = false
					return
				}

				const headByte = new DataView(header.buffer)
				const packetType = headByte.getUint8(0)
				const dataLength = headByte.getUint32(1, false)
				const dataByte = dataLength > 0
					? this.readFullyAndroid(dataLength)
					: new Uint8Array(0)

				if (!dataByte || dataByte.length !== dataLength) {
					throw new Error('Android TCP 读取 body 不完整')
				}

				this.handleRawPacket(packetType, dataByte)
				reading = false
			} catch (e) {
				reading = false
				console.error('读取消息出错:', e)
				this.close()
			}
		}, 100)
	}

	readFullyAndroid(length) {
		const data = new Uint8Array(length)
		let offset = 0

		while (offset < length) {
			const byte = this.socketReader.read()

			if (byte < 0) {
				throw new Error('Android TCP 连接已关闭')
			}

			data[offset++] = byte & 0xff
		}

		return data
	}

	handleRawPacket(packetType, dataByte) {
		try {
			if (packetType == encodePacketType.Heartbeat) {
				this.lastHeartbeatTime = Date.now()
				return
			}

			if (packetType == encodePacketType.Message) {
				const data = decodeMessagePacket(dataByte)
				console.log(JSONbig.stringify(data))
				this.handleMessagePacket(data)
				return
			}

			if (packetType == encodePacketType.Material) {
				const data = decodeMaterialPacket(dataByte)
				console.log(JSONbig.stringify(data))
				this.handleMaterialPacket(data)
				return
			}

			if (packetType == encodePacketType.Notice) {
				const data = decodeNoticePacket(dataByte)
				console.log(JSONbig.stringify(data))
				this.handleNoticePacket(data)
			}
		} catch (err) {
			console.error('handleRawPacket failed:', err)
		}
	}

	sendConnectPacket() {
		const connectPacket = {
			user_id: this.toInt64(this.userId)
		}

		const dataByte = encodeConnectPacket(connectPacket)
		this.sendPacket(encodePacketType.Connect, dataByte)
	}

	startHeartbeat() {
		this.clearHeartbeat()

		this.lastHeartbeatTime = Date.now()

		this.heartIntervalId = setInterval(() => {
			this.sendPacket(encodePacketType.Heartbeat, new Uint8Array(0))
		}, HEARTBEAT_INTERVAL)

		this.heartbeatCheckIntervalId = setInterval(() => {
			const now = Date.now()

			if (now - this.lastHeartbeatTime > HEARTBEAT_TIMEOUT) {
				console.warn('TCP heartbeat timeout, reconnect')
				this.reconnect()
			}
		}, 1000)
	}

	clearHeartbeat() {
		if (this.heartIntervalId) {
			clearInterval(this.heartIntervalId)
			this.heartIntervalId = null
		}

		if (this.heartbeatCheckIntervalId) {
			clearInterval(this.heartbeatCheckIntervalId)
			this.heartbeatCheckIntervalId = null
		}
	}

	reconnect() {
		if (this.reconnectTimer) return

		this.close()

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null
			this.start()
		}, RECONNECT_DELAY)
	}

	sendPacket(packetType, dataByte) {
		const body = this.normalizeUint8Array(dataByte)

		if (this.platform === 'android') {
			this.sendPacketAndroid(packetType, body)
			return
		}

		if (this.platform === 'ios') {
			this.sendPacketIOS(packetType, body)
		}
	}

	sendPacketAndroid(packetType, dataByte) {
		if (!this.socketWriter) {
			console.log('未建立连接，无法发送消息')
			return
		}

		const headByte = new Uint8Array(this.headLength)
		const headDataView = new DataView(headByte.buffer)
		headDataView.setUint8(0, packetType)
		headDataView.setUint32(1, dataByte.length, false)

		try {
			for (let i = 0; i < headByte.length; ++i) {
				this.socketWriter.write(headByte[i])
			}

			for (let i = 0; i < dataByte.length; ++i) {
				this.socketWriter.write(dataByte[i])
			}

			this.socketWriter.flush()
		} catch (e) {
			console.error('Android TCP 发送消息错误:', e)
			this.close()
		}
	}

	sendPacketIOS(packetType, dataByte) {
		// #ifdef APP-IOS
		try {
			sendTcpPacket(packetType, this.toExactArrayBuffer(dataByte))
		} catch (e) {
			console.error('iOS TCP 发送消息错误:', e)
			this.close()
		}
		// #endif
	}

	normalizeUint8Array(data) {
		if (!data) return new Uint8Array(0)
		if (data instanceof Uint8Array) return data
		if (data instanceof ArrayBuffer) return new Uint8Array(data)
		return new Uint8Array(data)
	}

	toExactArrayBuffer(uint8Array) {
		const data = this.normalizeUint8Array(uint8Array)
		return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
	}

	close(callNative = true) {
		this.started = false
		this.connecting = false
		this.clearHeartbeat()

		if (this.listenIntervalId) {
			clearInterval(this.listenIntervalId)
			this.listenIntervalId = null
		}

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}

		if (this.platform === 'ios') {
			// #ifdef APP-IOS
			if (callNative) {
				try {
					stopTcp()
				} catch (err) {}
			}
			// #endif
			return
		}

		if (this.socket) {
			try {
				if (this.socketReader) this.socketReader.close()
				if (this.socketWriter) this.socketWriter.close()
				this.socket.close()
			} catch (e) {
				console.error('关闭连接出错:', e)
			}
		}

		this.socket = null
		this.socketReader = null
		this.socketWriter = null
	}

	toInt64(value) {
		const big = typeof value === 'bigint' ? value : BigInt(value || 0)
		const mask32 = 0xFFFFFFFFn
		const low = Number(big & mask32)
		const high = Number(big >> 32n)

		return {
			low,
			high,
			unsigned: false
		}
	}

	handleMessagePacket = async (data) => {
		const msgType = data.msg_body.msg_type
		if (msgType === undefined || msgType === 0) return
		if (msgType >= 100) await this.handleCommandPacket(data)
		if (msgType === 100) {
			data.msg_body.msg_content = await transformContent(data.msg_body)
		}
		if (msgType <= 100) await this.handleNormalPacket(data)
	}

	handleNormalPacket = async (data) => {
		try {
			if (data.pre_user_con_index === undefined) data.pre_user_con_index = 0
			if (data.badge_count === undefined) data.badge_count = 0
			if (data.msg_body?.extra === undefined) data.msg_body.extra = ''

			const newUserConIndex = Number(data.user_con_index)

			if (data.pre_user_con_index != getApp().globalData.userConIndex) {
				console.error('TODO:getByUser')
			}

			uni.setStorageSync('user_con_index_' + this.userId, newUserConIndex)
			getApp().globalData.userConIndex = newUserConIndex

			const m = data.msg_body

			await DB.insertMessage([{
				sender_id: m.sender_id,
				sender_type: m.sender_type,
				con_short_id: m.con_short_id,
				con_id: m.con_id,
				con_type: m.con_type,
				client_msg_id: m.client_msg_id,
				msg_id: m.msg_id,
				msg_type: m.msg_type,
				msg_content: m.msg_content || '',
				create_time: m.create_time,
				extra: m.extra || '',
				con_index: m.con_index
			}])

			const conId = m.con_id
			const existing = await DB.getConversationById(conId)

			if (existing) {
				const map = new Map()
				map.set('badge_count', data.badge_count)
				map.set('user_con_index', newUserConIndex)
				map.set('last_message_id', m.msg_id || '')

				await DB.updateConversation(m.con_id, map)
				uni.$emit('normal', data)
				return
			}

			const res = await getConversationInfo(m.con_short_id)
			const conInfo = res.con_info
			if (!conInfo) return

			let peerId = null

			if (conInfo.con_type === 1) {
				const parts = String(conInfo.con_id).split(':')
				const selfIdStr = String(this.userId)
				peerId = parts[0] === selfIdStr ? BigInt(parts[1]) : BigInt(parts[0])

				await ensureUsersCached([peerId])
				const rows = await DB.getUsersByIds([peerId])
				const u = rows && rows[0] ? rows[0] : null

				conInfo.con_core_info = conInfo.con_core_info || {}
				conInfo.con_core_info.name = u?.username || conInfo.con_core_info.name || '用户'
				conInfo.con_core_info.avatar_uri = u?.avatar_uri || conInfo.con_core_info.avatar_uri || '/static/user_avatar.png'
			} else if (conInfo.con_type === 4) {
				const parts = String(conInfo.con_id).split(':')
				peerId = BigInt(parts[2])

				await ensureAgentsCached([peerId])
				const rows = await DB.getAgentsByIds([peerId])
				const a = rows && rows[0] ? rows[0] : null

				conInfo.con_core_info = conInfo.con_core_info || {}
				conInfo.con_core_info.name = a?.agent_name || conInfo.con_core_info.name || 'AI'
				conInfo.con_core_info.avatar_uri = a?.avatar_uri || conInfo.con_core_info.avatar_uri || '/static/ai_avatar.png'
			} else if (conInfo.con_type === 2) {
				enqueueGroupRosters([conInfo.con_id])
				conInfo.con_core_info = conInfo.con_core_info || {}

				if (!conInfo.con_core_info.name) conInfo.con_core_info.name = '群聊'
				if (!conInfo.con_core_info.avatar_uri) conInfo.con_core_info.avatar_uri = '/static/conv_avatar.png'
			}

			const core = conInfo.con_core_info || {}
			const setting = conInfo.con_setting_info || {}

			await DB.insertConversation([{
				con_short_id: conInfo.con_short_id,
				con_id: conInfo.con_id,
				con_type: conInfo.con_type,
				name: core.name || '群聊',
				avatar_uri: core.avatar_uri || '/static/conv_avatar.png',
				local_avatar_uri: '',
				description: core.description || '',
				owner_id: core.owner_id ?? 0n,
				create_time: core.create_time ?? 0,
				status: core.status ?? 0,
				min_index: setting.min_index ?? 0,
				top_timestamp: setting.top_timestamp ?? 0,
				push_status: setting.push_status ?? 0,
				core_extra: core.extra || '',
				setting_extra: setting.extra || '',
				member_count: core.member_count ?? 0,
				badge_count: data.badge_count,
				read_index_end: setting.read_index_end ?? 0,
				read_badge_count: setting.read_badge_count ?? 0,
				user_con_index: newUserConIndex,
				is_member: conInfo.is_member ?? 1,
				last_message_id: m.msg_id ?? 0,
				peer_id: peerId
			}])

			uni.$emit('normal', data)
		} catch (err) {
			console.error('handleNormalPacket failed:', err, data)
		}
	}

	handleCommandPacket = async (data) => {
		try {
			if (data.user_cmd_index - 1n != getApp().globalData.userCmdIndex) {
				console.error('TODO:getByUser')
			}

			uni.setStorageSync('user_cmd_index_' + this.userId, Number(data.user_cmd_index))
			getApp().globalData.userCmdIndex = data.user_cmd_index
			uni.$emit('command', data)
			await handleCommandMessage(data.msg_body)
		} catch (err) {
			console.error('handleCommandPacket failed:', err, data)
		}
	}

	handleMaterialPacket(data) {
		uni.$emit('material', data)
	}

	handleNoticePacket(data) {
		uni.$emit('notice', data)
	}
}

export default Socket