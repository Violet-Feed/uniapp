import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js'
import {
	encodePacketType,
	encodeConnectPacket,
	decodeConnectPacket,
	decodeNormalPacket,
	decodeCommandPacket,
	decodeMaterialPacket,
	decodeNoticePacket
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
					} else if (packetType == encodePacketType.Notice) {
						const data = decodeNoticePacket(dataByte);
						console.log(JSONbig.stringify(data));
						this.handleNoticePacket(data);
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
	
import {
  ensureUsersCached,
  ensureAgentsCached,
  enqueueGroupRosters
} from "@/utils/im-cache.js";

// ------------------------ socket: handleNormalPacket_new ------------------------
handleNormalPacket_new = async (data) => {
  try {
    if (data.pre_user_con_index === undefined) data.pre_user_con_index = 0;
    if (data.badge_count === undefined) data.badge_count = 0;
    if (data.msg_body?.extra === undefined) data.msg_body.extra = "";

    const newUserConIndex = Number(data.user_con_index);

    if (data.pre_user_con_index != getApp().globalData.userConIndex) {
      console.error("TODO:getByUser");
    }

    uni.setStorageSync("user_con_index_" + this.userId, newUserConIndex);
    getApp().globalData.userConIndex = newUserConIndex;

    const m = data.msg_body;

    await DB.insertMessage([{
      sender_id: m.sender_id,
      sender_type: m.sender_type,
      con_short_id: m.con_short_id,
      con_id: m.con_id,
      con_type: m.con_type,
      client_msg_id: m.client_msg_id,
      msg_id: m.msg_id,
      msg_type: m.msg_type,
      msg_content: m.msg_content || "",
      create_time: m.create_time,
      extra: m.extra || "",
      con_index: m.con_index
    }]);

    const conId = m.con_id;
    const existing = await DB.getConversationById(conId);

    if (existing) {
      const map = new Map();
      map.set("badge_count", data.badge_count);
      map.set("user_con_index", newUserConIndex);
      map.set("last_message", m.msg_content || "");
      await DB.updateConversation(m.con_short_id, map);
      uni.$emit("normal", data);
    } else {
      const conInfo = await getConversationInfo(m.con_short_id);
      if (!conInfo) return;

      let peerId = null;

      if (conInfo.con_type === 1) {
        const parts = String(conInfo.con_id).split(":");
        const selfIdStr = String(this.userId);
        peerId = (parts[0] === selfIdStr) ? BigInt(parts[1]) : BigInt(parts[0]);

        await ensureUsersCached([peerId]);

        const rows = await DB.getUsersByIds([peerId]);
        const u = rows && rows[0] ? rows[0] : null;

        conInfo.con_core_info = conInfo.con_core_info || {};
        conInfo.con_core_info.name = u?.username || conInfo.con_core_info.name || "用户";
        conInfo.con_core_info.avatar_uri = u?.avatar_uri || conInfo.con_core_info.avatar_uri || "/static/user_avatar.png";
      } else if (conInfo.con_type === 4) {
        const parts = String(conInfo.con_id).split(":");
        peerId = BigInt(parts[2]);

        await ensureAgentsCached([peerId]);

        const rows = await DB.getAgentsByIds([peerId]);
        const a = rows && rows[0] ? rows[0] : null;

        conInfo.con_core_info = conInfo.con_core_info || {};
        conInfo.con_core_info.name = a?.agent_name || conInfo.con_core_info.name || "AI";
        conInfo.con_core_info.avatar_uri = a?.avatar_uri || conInfo.con_core_info.avatar_uri || "/static/ai.png";
      } else if (conInfo.con_type === 2) {
        enqueueGroupRosters([conInfo.con_short_id]);

        conInfo.con_core_info = conInfo.con_core_info || {};
        if (!conInfo.con_core_info.name) conInfo.con_core_info.name = "群聊";
        if (!conInfo.con_core_info.avatar_uri) conInfo.con_core_info.avatar_uri = "/static/conv_avatar.png";
      }

      const core = conInfo.con_core_info || {};
      const setting = conInfo.con_setting_info || {};

      await DB.insertConversation([{
        con_short_id: conInfo.con_short_id,
        con_id: conInfo.con_id,
        con_type: conInfo.con_type,
        name: core.name || "",
        avatar_uri: core.avatar_uri || "",
        local_avatar_uri: "",
        description: core.description || "",
        owner_id: core.owner_id ?? 0n,
        create_time: core.create_time ?? 0,
        status: core.status ?? 0,
        min_index: setting.min_index ?? 0,
        top_timestamp: setting.top_timestamp ?? 0,
        push_status: setting.push_status ?? 0,
        core_extra: core.extra || "",
        setting_extra: setting.extra || "",
        member_count: core.member_count ?? 0,
        badge_count: data.badge_count,
        read_index_end: setting.read_index_end ?? 0,
        read_badge_count: setting.read_badge_count ?? 0,
        user_con_index: Number(conInfo.user_con_index ?? newUserConIndex),
        last_message: m.msg_content || "",
        peer_id: peerId
      }]);

      uni.$emit("normal", data);
    }

    if (m.msg_type == 100) {
      // TODO
    }
  } catch (err) {
    console.error("handleNormalPacket_new failed:", err, data);
  }
};
	
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
	
	handleNoticePacket(data){
		uni.$emit('notice', data);
	}
}

export default Socket;