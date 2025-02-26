export const connectWebSocket = () => {
    const app = getApp();
    const { token } = app.globalData;
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
            console.log('WebSocket 连接请求已发送');
        },
        fail(err) {
            console.error('WebSocket 连接请求失败:', err);
			setTimeout(() => {
			  connectWebSocket();
			}, 3000);
        }
    });

    socketTask.onOpen(() => {
        console.log('WebSocket 连接已成功建立');
		heartBeatInterval = setInterval(() => {
		  socketTask.send({
		    data: 'ping',
		    success() {
		      console.log('ping 消息发送成功');
		    },
		    fail(err) {
		      console.error('ping 消息发送失败:', err);
		    }
		  });
		}, 5000);
    });

    socketTask.onMessage((res) => {
        console.log('收到服务器消息:', res.data);
    });

    socketTask.onClose(() => {
        console.log('WebSocket 连接已关闭');
		clearInterval(heartBeatInterval);
    });

    socketTask.onError((err) => {
        console.error('WebSocket 连接出错:', err);
    });

    // 将 socketTask 存储在全局变量中，方便在其他地方使用
    app.globalData.socketTask = socketTask;
};