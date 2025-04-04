import {
	TextDecoder
} from 'text-encoding';

class Socket {
	socket = null;
	socketWriter = null;
	socketReader = null;
	listenIntervalId = null;
	heartIntervalId = null;

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
		const headLength=5;
		let reading=false;
		this.listenIntervalId = setInterval(() => {
			try {
				if (!reading && this.socketReader && this.socketReader.available()) {
					reading=true;
					const headByte = new DataView(new ArrayBuffer(headLength));
					for(let i=0;i<headLength;++i){
						if(this.socketReader && this.socketReader.available()){
							const byte = this.socketReader.read();
							headByte.setInt8(i, byte);
						}
					}
					const packetType=headByte.getInt8(0,false)
					const dataLength = headByte.getInt32(1, false);
					const dataByte = new Int8Array(dataLength);
					for(let i=0;i<dataLength;++i){
						if(this.socketReader && this.socketReader.available()){
							const byte = this.socketReader.read();
							dataByte[i]=byte;
						}
					}
					const decoder = new TextDecoder();
					const data = decoder.decode(dataByte);
					console.log('接收到消息:'+data);
					if(packetType==3){
						const obj=JSON.parse(data);
						console.log(obj);
					}
					reading=false;
				}
			} catch (e) {
				console.error('读取消息出错:', e);
				this.close();
			}
		}, 1);
	}

	heartBeat() {
		if (this.socketWriter) {
			const data = getApp().globalData.userId;
			const encoder = new TextEncoder();
			const dataByte = encoder.encode(data);
			const headByte = new Int8Array(5);
			const headDataView = new DataView(headByte.buffer);
			headDataView.setInt8(0, 1);
			headDataView.setInt32(1, dataByte.length, false);
			try {
				for(let i=0;i<headByte.length;++i){
					this.socketWriter.write(headByte[i]);
				}
				for(let i=0;i<dataByte.length;++i){
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
				const data = "ping";
				const encoder = new TextEncoder();
				const dataByte = encoder.encode(data);
				const headByte = new Int8Array(5);
				const headDataView = new DataView(headByte.buffer);
				headDataView.setInt8(0, 2);
				headDataView.setInt32(1, dataByte.length, false);
				try {
					for(let i=0;i<headByte.length;++i){
						this.socketWriter.write(headByte[i]);
					}
					for(let i=0;i<dataByte.length;++i){
						this.socketWriter.write(dataByte[i]);
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
}

export default Socket;