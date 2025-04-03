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
            const PrintWriter = plus.android.importClass("java.io.PrintWriter");
            const BufferedWriter = plus.android.importClass("java.io.BufferedWriter");
            const OutputStreamWriter = plus.android.importClass("java.io.OutputStreamWriter");
            const InputStream = plus.android.importClass("java.io.InputStream");

            const StrictMode = plus.android.importClass("android.os.StrictMode");
            const Build = plus.android.importClass("android.os.Build");
            if (Build.VERSION.SDK_INT > 9) {
                const policy = new StrictMode.ThreadPolicy.Builder().permitAll().build();
                StrictMode.setThreadPolicy(policy);
            }

            console.log("连接服务器中...");
            this.socket = new JavaSocket("127.0.0.1", 3001);
            this.socket.setSoTimeout(1000);

            const inputStream = this.socket.getInputStream();
            this.socketReader = inputStream;

            const outputStreamWriter = new OutputStreamWriter(this.socket.getOutputStream());
            const bufferWriter = new BufferedWriter(outputStreamWriter);
            this.socketWriter = new PrintWriter(bufferWriter, true);

            this.listenToServer();
            this.heartBeat();
        } catch (e) {
            console.error('连接出错:', e);
        }
    }

    listenToServer() {
        let receiveHeadSize = 0;
        let receiveDataSize = 0;
        const headByte = new DataView(new ArrayBuffer(8));
        let dataByte;
        let dataSize;

        this.listenIntervalId = setInterval(() => {
            try {
                if (this.socketReader&&this.socketReader.available()) {
                    const byte = this.socketReader.read();
                    if (receiveHeadSize < 8) {
                        headByte.setUint8(receiveHeadSize++, byte);
                        if (receiveHeadSize === 8) {
                            dataSize = Number(headByte.getBigInt64(0, false));
                            dataByte = new Uint8Array(dataSize);
                        }
                    } else {
                        dataByte[receiveDataSize++] = byte;
                        if (receiveDataSize === dataSize) {
                            const decoder = new TextDecoder();
                            const data = decoder.decode(dataByte);
                            //console.log('接收到消息:'+data);
                            receiveHeadSize = 0;
                            receiveDataSize = 0;
                        }
                    }
                }
            } catch (e) {
                console.error('读取消息出错:', e);
                this.close();
            }
        }, 1);
    }

    heartBeat() {
        this.heartIntervalId = setInterval(() => {
            if (this.socketWriter) {
                this.socketWriter.println("ping");
                //console.log('消息已发送');
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