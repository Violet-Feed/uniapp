import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js'
import {
	encodePacketType,
	encodeConnectPacket,
	decodeConnectPacket,
	decodeNormalPacket,
	decodeCommandPacket,
	decodeMaterialPacket,
	decodeActionPacket
} from '@/proto_gen/packet.js';
import {
	getConversationInfo
} from '@/request/im.js'

class Socket {
	socket = null;
	socketWriter = null;
	socketReader = null;
	listenIntervalId = null;
	heartIntervalId = null;
	headLength = 5;
	userId = getApp().globalData.userId;

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
					} else if (packetType == encodePacketType.Material) {
						const data = decodeMaterialPacket(dataByte);
						console.log(JSONbig.stringify(data));
						this.handleMaterialPacket(data);
					} else if (packetType == encodePacketType.Action) {
						const data = decodeActionPacket(dataByte);
						console.log(JSONbig.stringify(data));
						this.handleActionPacket(data);
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
			const connectPacket = {
				user_id: this.toInt64(this.userId)
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
		uni.setStorageSync('user_con_index_'+this.userId, Number(data.user_con_index));
		getApp().globalData.userConIndex = data.user_con_index;
		DB.selectConversation(data.msg_body.con_id).then((res) => {
			if (res.length > 0) {
				const map=new Map();
				map.set("badge_count",data.badge_count);
				map.set("user_con_index",data.user_con_index);
				map.set("last_message",data.msg_body.msg_content);
				DB.updateConversation(data.msg_body.con_short_id, map)
				.then(()=>{
					uni.$emit('normal', data);
				})
				.catch((err) => {
					console.log('updateConversation err', err);
				});
			} else {
				getConversationInfo(data.msg_body.con_short_id)
				.then((conInfo)=>{
					const {
						con_short_id,
						con_id,
						con_type,
						user_con_index,
						badge_count
					} = conInfo;
					const {
						name,
						avatar_uri,
						description,
						notice,
						owner_id,
						create_time,
						status,
						extra: coreExtra,
						member_count
					} = conInfo.con_core_info;
					const {
						min_index,
						top_time_stamp,
						push_status,
						read_index_end,
						read_badge_count,
						extra: settingExtra
					} = conInfo.con_setting_info;
					const extra = `${coreExtra},${settingExtra}`;
					const conValue =
						`(${con_short_id}, '${con_id}', ${con_type}, '${name.replace(/'/g, "''")}', '${avatar_uri}', '${description.replace(/'/g, "''")}', '${notice.replace(/'/g, "''")}', ${owner_id}, ${create_time}, ${status}, ${min_index}, ${top_time_stamp}, ${push_status}, '${extra.replace(/'/g, "''")}', ${member_count}, ${badge_count}, ${read_index_end}, ${read_badge_count}, ${user_con_index}, '${data.msg_body.msg_content.replace(/'/g, "''")}')`;
					DB.insertConversation(conValue)
					.then(()=>{
						uni.$emit('normal', data);
					})
					.catch((err) => {
						console.log('insertConversation err', err);
					})
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
			`( ${user_id}, ${con_short_id}, '${con_id}', ${con_type}, ${client_msg_id}, ${msg_id}, ${msg_type}, '${msg_content.replace(/'/g, "''")}', ${create_time}, '${extra.replace(/'/g, "''")}', ${con_index})`;
		DB.insertMessage(msgValue).catch((err) => {
			console.log('insertMessage err', err);
		});
		if(data.msg_body.msg_type==5){
			//TODO:插入成员表/修改会话表
		}
	}
	
	handleCommandPacket(data){
		if (data.user_cmd_index-1n != getApp().globalData.userCmdIndex) {
			console.error("TODO:getByUser")
		}
		uni.setStorageSync('user_cmd_index_'+this.userId, Number(data.user_cmd_index));
		getApp().globalData.userCmdIndex = data.user_cmd_index;
		uni.$emit('command', data);
		const cmdMessage=JSONbig.parse(data.msg_body.msg_content);
		if(data.msg_body.msg_type==101){
			const map=new Map();
			map.set("read_index_end",cmdMessage.read_index_end)
			map.set("read_badge_count",cmdMessage.read_badge_count)
			DB.updateConversation(data.msg_body.con_short_id,map).catch((err) => {
				console.log('updateConversation err', err);
			});
		}else if(data.msg_body.msg_type==102){
			
		}
	}
	
	handleMaterialPacket(data){
		uni.$emit('material', data);
	}
	
	handleActionPacket(data){
		uni.$emit('action', data);
	}
}

export default Socket;