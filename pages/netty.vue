<template>
  <view>
    <button @click="sendMessage">发送消息</button>
    <view v-for="(message, index) in receivedMessages" :key="index">{{ message }}</view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      socket: null,
      socketWriter: null,
      socketReader: null,
      receivedMessages: [],
      intervalId: null
    };
  },
  onReady() {
    try {
      var Socket = plus.android.importClass("java.net.Socket");
      var PrintWriter = plus.android.importClass("java.io.PrintWriter");
      var BufferedWriter = plus.android.importClass("java.io.BufferedWriter");
      var OutputStreamWriter = plus.android.importClass("java.io.OutputStreamWriter");
      var BufferedReader = plus.android.importClass("java.io.BufferedReader");
      var InputStreamReader = plus.android.importClass("java.io.InputStreamReader");

      var StrictMode = plus.android.importClass("android.os.StrictMode");
      var Build = plus.android.importClass("android.os.Build");
      if (Build.VERSION.SDK_INT > 9) {
        var policy = new StrictMode.ThreadPolicy.Builder().permitAll().build();
        StrictMode.setThreadPolicy(policy);
      }

      console.log("连接服务器中...");
      this.socket = new Socket("127.0.0.1", 3001);
      this.socket.setSoTimeout(10000); 

      var inputStreamReader = new InputStreamReader(this.socket.getInputStream(), "UTF-8");
      this.socketReader = new BufferedReader(inputStreamReader);

      var outputStreamWriter = new OutputStreamWriter(this.socket.getOutputStream(), "UTF-8");
      var bufferWriter = new BufferedWriter(outputStreamWriter);
      this.socketWriter = new PrintWriter(bufferWriter, true);

      this.listenToServer();
    } catch (e) {
      console.error('连接出错:', e);
    }
  },
  methods: {
    listenToServer() {
      const that = this;
      this.intervalId = setInterval(() => {
        try {
          if (this.socket && this.socket.isConnected() && !this.socket.isClosed()) {
            // 检查是否有数据可读
            if (that.socketReader.ready()) {
              var msgBeReceived = that.socketReader.readLine();
              if (msgBeReceived === null) {
                console.log('服务器断开连接');
                clearInterval(this.intervalId);
                this.closeConnection();
                return;
              }
              that.receivedMessages.push(msgBeReceived);
              console.log('读取信息', msgBeReceived);
            }
          }
        } catch (e) {
          if (e.message.includes('SocketTimeoutException')) {
            console.log('读取超时，继续等待...');
          } else {
            console.error('读取消息出错:', e);
            clearInterval(this.intervalId);
            this.closeConnection();
          }
        }
      }, 100);
    },
    sendMessage() {
      if (this.socketWriter) {
        this.socketWriter.println("hello!");
        console.log('消息已发送');
      } else {
        console.log('未建立连接，无法发送消息');
      }
    },
    closeConnection() {
      if (this.socket) {
        try {
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
  },
  onUnload() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.closeConnection();
  }
};
</script>

<style>
</style>