import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js'
import {
	encodePacketType,
	encodeConnectPacket,
	decodeConnectPacket,
	decodeNormalPacket,
	decodeCommandPacket
} from '@/proto_gen/packet.js';

class Socket {
	socket = null;
	socketWriter = null;
	socketReader = null;
	listenIntervalId = null;
	heartIntervalId = null;
	headLength = 5;

	start() {
		try {
			const JavaSocket = plus.android.importClass("java.net.Socket");
			const InputStream = plus.android.importClass("java.io.InputStream");
			const OutputStream = plus.android.importClass("java.io.OutputStream");

			const StrictMode = plus.android.importClass("android.os.StrictMode");
			const Build = plus.android.importClass("android.os.Build");
			if (Build.VERSION.SDK_INT > 9) {
				const policy = new StrictMode.ThreadPolicy.Builder().permitAll().build();
				StrictMode.setThreadPolicy(policy);
			}

			console.log("连接服务器中...");
			this.socket = new JavaSocket("127.0.0.1", 3001);
			this.socket.setSoTimeout(1000);

			this.socketReader = this.socket.getInputStream();
			this.socketWriter = this.socket.getOutputStream()
			this.listenToServer();
			this.heartBeat();
		} catch (e) {
			console.error('连接出错:', e);
		}
	}

	listenToServer() {
		let reading = false;
		this.listenIntervalId = setInterval(() => {
			try {
				if (!reading && this.socketReader && this.socketReader.available()) {
					reading = true;
					const headByte = new DataView(new ArrayBuffer(this.headLength));
					for (let i = 0; i < this.headLength; ++i) {
						if (this.socketReader && this.socketReader.available()) {
							const byte = this.socketReader.read();
							headByte.setUint8(i, byte);
						}
					}
					const packetType = headByte.getUint8(0, false)
					const dataLength = headByte.getUint32(1, false);
					const dataByte = new Uint8Array(dataLength);
					for (let i = 0; i < dataLength; ++i) {
						if (this.socketReader && this.socketReader.available()) {
							const byte = this.socketReader.read();
							dataByte[i] = byte;
						}
					}
					if (packetType == encodePacketType.Heartbeat) {

					} else if (packetType == encodePacketType.Normal) {
						const data = decodeNormalPacket(dataByte);
						console.log(JSONbig.stringify(data));
						this.handleNormalPacket(data);
					} else if (packetType == encodePacketType.Command) {
						const data = decodeCommandPacket(dataByte);
						console.log(JSONbig.stringify(data));
						this.handleCommandPacket(data);
					}
					reading = false;
				}
			} catch (e) {
				console.error('读取消息出错:', e);
				this.close();
			}
		}, 10);
	}

	heartBeat() {
		if (this.socketWriter) {
			const userId = getApp().globalData.userId;
			const connectPacket = {
				user_id: this.toInt64(userId)
			};
			const dataByte = encodeConnectPacket(connectPacket);
			const headByte = new Int8Array(this.headLength);
			const headDataView = new DataView(headByte.buffer);
			headDataView.setUint8(0, encodePacketType.Connect);
			headDataView.setUint32(1, dataByte.length, false);
			try {
				for (let i = 0; i < headByte.length; ++i) {
					this.socketWriter.write(headByte[i]);
				}
				for (let i = 0; i < dataByte.length; ++i) {
					this.socketWriter.write(dataByte[i]);
				}
				this.socketWriter.flush();
			} catch (e) {
				console.error('发送消息错误:', e);
			}
		} else {
			console.log('未建立连接，无法发送消息');
		}
		this.heartIntervalId = setInterval(() => {
			if (this.socketWriter) {
				const headByte = new Int8Array(this.headLength);
				const headDataView = new DataView(headByte.buffer);
				headDataView.setUint8(0, encodePacketType.Heartbeat);
				headDataView.setUint32(1, 0, false);
				try {
					for (let i = 0; i < headByte.length; ++i) {
						this.socketWriter.write(headByte[i]);
					}
					this.socketWriter.flush();
				} catch (e) {
					console.error('发送消息错误:', e);
				}
			} else {
				console.log('未建立连接，无法发送消息');
			}
		}, 5000);
	}

	close() {
		if (this.socket) {
			try {
				clearInterval(this.listenIntervalId);
				clearInterval(this.heartIntervalId);
				this.socketReader.close();
				this.socketWriter.close();
				this.socket.close();
				this.socket = null;
				this.socketReader = null;
				this.socketWriter = null;
			} catch (e) {
				console.error('关闭连接出错:', e);
			}
		}
	}
	
	toInt64(value) {
		const mask32 = 0xFFFFFFFFn;
		const low = Number(value & mask32);
		const high = Number(value >> 32n);
		return {
			low,
			high,
			unsigned: false
		};
	}
	
	handleNormalPacket(data){
		if(data.pre_user_con_index==undefined){
			data.pre_user_con_index=0;
		}
		if(data.badge_count==undefined){
			data.badge_count=0;
		}
		if(data.msg_body.extra==undefined){
			data.msg_body.extra=''
		}
		if (data.pre_user_con_index != getApp().globalData.userConIndex) {
			console.error("TODO:getByUser")
		}
		getApp().globalData.userConIndex = data.user_con_index;
		uni.$emit('normal', data);
		DB.selectConversation(data.msg_body.con_id).then((res) => {
			if (res.length > 0) {
				DB.updateConversation(data.msg_body.con_short_id, data.badge_count, data
					.user_con_index, data.msg_body.msg_content).catch((err) => {
					console.log('updateConversation err', err);
				});
			} else {
				console.error("TODO:getConversation");
				const {
					con_short_id,
					con_id,
					con_type,
					msg_content
				} = data.msg_body;
				const {
					user_con_index,
					badge_count
				} = data;
				const conValue =
					`(${con_short_id}, '${con_id}', ${con_type}, '', '', '', '', 0, 0, 0, 0, 0, 0, ',', 0, ${badge_count}, 0, 0, ${user_con_index}, ${msg_content})`;
				DB.insertConversation(value).catch((err) => {
					console.log('insertConversation err', err);
				})
			}
		})
		const {
			user_id,
			con_short_id,
			con_id,
			con_type,
			client_msg_id,
			msg_id,
			msg_type,
			msg_content,
			create_time,
			extra,
			con_index
		} = data.msg_body;
		const msgValue =
			`( ${user_id}, ${con_short_id}, '${con_id}', ${con_type}, ${client_msg_id}, ${msg_id}, ${msg_type}, '${msg_content}', ${create_time}, '${extra}', ${con_index})`;
		DB.insertMessage(msgValue).catch((err) => {
			console.log('insertMessage err', err);
		});
	}
	
	handleCommandPacket(data){
		if (data.user_cmd_index != getApp().globalData.userCmdIndex + 1) {
			console.error("TODO:getByUser")
		}
		getApp().userCmdIndex = data.user_cmd_index;
		uni.$emit('command', data);
	}
}

export default Socket;