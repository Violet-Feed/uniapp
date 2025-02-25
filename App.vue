<template>
</template>

<script>
export default {
  onLaunch() {
    let socketTask;
    let pingInterval;
    const url = 'ws://127.0.0.1:3001/api/im/ws';

    const connectWebSocket = () => {
      // 初始化 WebSocket 连接
      socketTask = uni.connectSocket({
        url,
        success() {
          console.log('WebSocket 连接请求已发送');
        },
        fail(err) {
          console.error('WebSocket 连接请求失败:', err);
		  setTimeout(() => {
			connectWebSocket();
		  }, 3000); // 3 秒后重新连接
        }
      });

      // 监听 WebSocket 连接成功事件
      socketTask.onOpen(() => {
        console.log('WebSocket 连接已成功建立');
        // 开启定时器，每五秒发送一条 ping 消息
        pingInterval = setInterval(() => {
          socketTask.send({
            data: 'ping',
            success() {
              console.log('ping 消息发送成功');
            },
            fail(err) {
              console.error('ping 消息发送失败:', err);
              clearInterval(pingInterval);
              // 尝试重新连接
              setTimeout(() => {
                connectWebSocket();
              }, 3000); // 3 秒后重新连接
            }
          });
        }, 5000);

        // 当 WebSocket 连接关闭时清除定时器
        socketTask.onClose(() => {
          console.log('WebSocket 连接已关闭');
          clearInterval(pingInterval);
        });

        // 当 WebSocket 连接出错时清除定时器并尝试重新连接
        socketTask.onError((err) => {
          console.error('WebSocket 连接出错:', err);
          clearInterval(pingInterval);
          setTimeout(() => {
            connectWebSocket();
          }, 3000); // 3 秒后重新连接
        });
      });

      // 监听接收到服务器消息事件
      socketTask.onMessage((res) => {
        console.log('收到服务器消息:', res.data);
      });

      // 将 socketTask 存储在全局变量中，方便在其他页面使用
      getApp().globalData.socketTask = socketTask;
    };

    // 首次连接
    connectWebSocket();
  },
};
</script>

<style>
</style>