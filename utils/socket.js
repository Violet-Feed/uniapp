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
	getMessageByInit,
	getConversationInfo,
	transformContent,
	handleCommandMessage
} from '@/request/im.js'
import {
	ensureUsersCached,
	ensureAgentsCached,
	enqueueGroupRosters
} from '@/utils/im-cache.js'
import { httpRequestBackData } from '@/request/common.js'

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
const HEARTBEAT_TIMEOUT = 11000
const RECONNECT_DELAY = 500

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
	packetQueue = []
	packetProcessing = false

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
		
		getApp().globalData.imInitStatus = true;
		uni.$emit('app', {module:"im",type:"beginInit"});
		
		if (this.platform === 'android') {
			this.startAndroid()
			this.startHeartbeatCheck()
			return
		} else if (this.platform === 'ios') {
			this.startIOS()
			this.startHeartbeatCheck()
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

			console.log('Android TCP 连接服务器中...')

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
			console.log('iOS TCP 连接服务器中...')

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
					this.enqueuePacket(packetType, new Uint8Array(buffer))
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

				this.enqueuePacket(packetType, dataByte)
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

	sendConnectPacket() {
		const connectPacket = {
			user_id: this.toInt64(this.userId)
		}

		const dataByte = encodeConnectPacket(connectPacket)
		this.sendPacket(encodePacketType.Connect, dataByte)
	}

	startHeartbeatCheck() {
		if (this.heartbeatCheckIntervalId) return

		this.lastHeartbeatTime = Date.now()

		this.heartbeatCheckIntervalId = setInterval(() => {
			const now = Date.now()

			if (now - this.lastHeartbeatTime > HEARTBEAT_TIMEOUT) {
				console.warn('TCP heartbeat timeout, reconnect')
				this.reconnect()
			}
		}, 1000)
	}

	startHeartbeat() {
		if (this.heartIntervalId) {
			clearInterval(this.heartIntervalId)
			this.heartIntervalId = null
		}

		this.heartIntervalId = setInterval(() => {
			this.sendPacket(encodePacketType.Heartbeat, new Uint8Array(0))
		}, HEARTBEAT_INTERVAL)
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
		console.log("TCP 重连")
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
			console.warn('TCP连接未建立，无法发送消息')
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
	
	enqueuePacket(packetType, dataByte) {
	    this.packetQueue.push({
	        packetType,
	        dataByte
	    })
	    this.drainPacketQueue()
	}
	
	async drainPacketQueue() {
	    if (this.packetProcessing) return
	    this.packetProcessing = true
	    try {
	        while (this.packetQueue.length > 0) {
	            const packet = this.packetQueue.shift()
	            await this.handleRawPacket(packet.packetType, packet.dataByte)
	        }
	    } catch (err) {
	        console.error('drainPacketQueue failed:', err)
	    } finally {
	        this.packetProcessing = false
	        if (this.packetQueue.length > 0) {
	            this.drainPacketQueue()
	        }
	    }
	}
	
	handleRawPacket = async (packetType, dataByte) => {
		try {
			if (packetType == encodePacketType.Connect) {
				if (getApp().globalData.imInitStatus == true){
					await getMessageByInit()
					getApp().globalData.imInitStatus = false;
					uni.$emit('app', {module:"im",type:"finishInit"});
				}
				return
			}
			
			if (packetType == encodePacketType.Heartbeat) {
				this.lastHeartbeatTime = Date.now()
				return
			}
	
			if (packetType == encodePacketType.Message) {
				const data = decodeMessagePacket(dataByte)
				console.log(JSONbig.stringify(data))
				await this.handleMessagePacket(data)
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
			if (newUserConIndex <= Number(getApp().globalData.userConIndex || 0)) return
			if (Number(data.pre_user_con_index) != Number(getApp().globalData.userConIndex || 0)) {
				let fetchIndex = Number(getApp().globalData.userConIndex || 0) + 1
				const targetIndex = Number(data.pre_user_con_index)
				while (fetchIndex <= targetIndex) {
					const limit = targetIndex - fetchIndex + 1
					const res = await httpRequestBackData('/im/get_message_by_user', {
						user_con_index: fetchIndex,
						limit: limit
					})
					if (!res || !Array.isArray(res.cons)) break
					for (const conData of res.cons) {
						const conInfo = conData.con_info
						if (!conInfo) continue
						const conUserConIndex = Number(conInfo.user_con_index)
						if (conUserConIndex > targetIndex) continue
						const msgBodies = conData.msg_bodies || []
						if (msgBodies.length === 0) continue
						const m = msgBodies[0]
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
						const existing = await DB.getConversationById(m.con_id)
						if (existing) {
							await DB.updateConversation(m.con_id, {
								badge_count: conInfo.badge_count || 0,
								user_con_index: conUserConIndex,
								last_message_id: m.msg_id || ''
							})
						} else {
							const core = conInfo.con_core_info || {}
							const setting = conInfo.con_setting_info || {}
							let peerId = null
							if (conInfo.con_type === 1) {
								const parts = String(conInfo.con_id).split(':')
								const selfIdStr = String(this.userId)
								peerId = parts[0] === selfIdStr ? BigInt(parts[1]) : BigInt(parts[0])
								await ensureUsersCached([peerId])
							} else if (conInfo.con_type === 4) {
								const parts = String(conInfo.con_id).split(':')
								peerId = BigInt(parts[2])
								await ensureAgentsCached([peerId])
							}
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
								badge_count: conInfo.badge_count || 0,
								read_index_end: setting.read_index_end ?? 0,
								read_badge_count: setting.read_badge_count ?? 0,
								user_con_index: conUserConIndex,
								is_member: conInfo.is_member ?? 1,
								last_message_id: m.msg_id ?? 0,
								peer_id: peerId
							}])
							enqueueGroupRosters([conInfo.con_id])
						}
						uni.$emit('normal', {
							user_con_index: conUserConIndex,
							badge_count: conInfo.badge_count || 0,
							msg_body: m
						})
					}
					if (!res.has_more) break
					fetchIndex = Number(res.user_con_index) + 1
				}
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
			if (!res || !res.con_info) return
			const conInfo = res.con_info
			let peerId = null
			if (conInfo.con_type === 1) {
				const parts = String(conInfo.con_id).split(':')
				const selfIdStr = String(this.userId)
				peerId = parts[0] === selfIdStr ? BigInt(parts[1]) : BigInt(parts[0])
				await ensureUsersCached([peerId])
			} else if (conInfo.con_type === 4) {
				const parts = String(conInfo.con_id).split(':')
				peerId = BigInt(parts[2])
				await ensureAgentsCached([peerId])
			} else if (conInfo.con_type === 2) {
				enqueueGroupRosters([conInfo.con_id])
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
			if (Number(data.user_cmd_index) <= Number(getApp().globalData.userCmdIndex || 0)) return
			if (Number(data.user_cmd_index) - 1 != Number(getApp().globalData.userCmdIndex || 0)) {
				let fetchIndex = Number(getApp().globalData.userCmdIndex || 0) + 1
				const targetIndex = Number(data.user_cmd_index) - 1
				while (fetchIndex <= targetIndex) {
					const limit = targetIndex - fetchIndex + 1
					const res = await httpRequestBackData('/im/get_command_by_user', {
						user_cmd_index: fetchIndex,
						limit: limit
					})
					if (!res || !Array.isArray(res.msg_bodies)) break
					for (const msg of res.msg_bodies) {
						uni.$emit('command', { msg_body: msg, user_cmd_index: cmdItem.user_cmd_index || 0 })
						await handleCommandMessage(cmdBody)
					}
					if (!res.has_more) break
					fetchIndex = Number(res.user_cmd_index) + 1
				}
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