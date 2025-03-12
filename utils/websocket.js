import JSONbig from 'json-bigint';
import DB from '@/utils/sqlite.js'
export const connectWebSocket = () => {
	const {
		token
	} = getApp().globalData;
	if (!token) {
		uni.reLaunch({
			url: '/pages/user/login'
		});
		return;
	}

	let heartBeatInterval;
	const socketTask = uni.connectSocket({
		url: `ws://127.0.0.1:3001/api/im/ws?token=${token}`,
		success() {
			//console.log('websocket send');
		},
		fail(err) {
			console.error('websocket send err', err);
			setTimeout(() => {
				connectWebSocket();
			}, 3000);
		}
	});

	socketTask.onOpen(() => {
		console.log('websocket connect');
		heartBeatInterval = setInterval(() => {
			socketTask.send({
				data: 'ping',
				success() {
					//console.log('ping');
				},
				fail(err) {
					console.error('ping err', err);
				}
			});
		}, 5000);
	});

	socketTask.onMessage((res) => {
		const data = JSONbig.parse(res.data);
		console.log('websocket receive data', data);
		if(data.user_con_index!=undefined){
			uni.$emit('normal_message', data);
			getApp().globalData.userConIndex=data.user_con_index;
			DB.updateConversation(data.msg_body.con_short_id, data.badge_count, data.user_con_index)
				.then((res) => {
					console.log(res.rowsAffected);
					if (res.rowsAffected == 0) {
						const {
							con_short_id,
							con_id,
							con_type
						} = data.msg_body;
						const {
							user_con_index,
							badge_count
						} = data;
						const conValue =
							`(${con_short_id}, '${con_id}', ${con_type}, '', '', '', '', 0, 0, 0, 0, 0, 0, ',', 0}, ${badge_count}, 0, 0, ${user_con_index})`;
						DB.insertConversation(value).catch((err) => {
							console.log('insertConversation err', err);
						})
						//TODO:获取core和setting
					}
				})
				.catch((err) => {
					console.log('updateConversation err', err);
				});
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
			const msgValue= `( ${user_id}, ${con_short_id}, '${con_id}', ${con_type}, ${client_msg_id}, ${msg_id}, ${msg_type}, '${msg_content}', ${create_time}, '${extra}', ${con_index})`;
			DB.insertMessage(msgValue).catch((err) => {
				console.log('insertMessage err', err);
			});
		}else if(data.user_cmd_index!=undefined){
			uni.$emit('command_message', data);
			getApp().userCmdIndex=data.user_cmd_index;
		}
	});

	socketTask.onClose(() => {
		console.log('websocket close');
		clearInterval(heartBeatInterval);
	});

	socketTask.onError((err) => {
		console.error('websocket err', err);
	});

	// 将 socketTask 存储在全局变量中，方便在其他地方使用
	getApp().globalData.socketTask = socketTask;
};