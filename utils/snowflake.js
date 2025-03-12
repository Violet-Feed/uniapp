class Snowflake {
    constructor() {
        // 起始时间戳
        this.startTimestamp = 1288834974657;
        // 数据中心 ID 所占位数
        this.dataCenterIdBits = 5;
        // 机器 ID 所占位数
        this.workerIdBits = 5;
        // 序列号所占位数
        this.sequenceBits = 12;

        // 时间戳左移位数
        this.timestampShift = this.sequenceBits + this.dataCenterIdBits + this.workerIdBits;

        this.sequence = 0;
        this.lastTimestamp = -1;
    }

    // 获取当前时间戳
    getCurrentTimestamp() {
        return Date.now();
    }

    // 等待下一毫秒
    waitNextMillis(lastTimestamp) {
        let timestamp = this.getCurrentTimestamp();
        while (timestamp <= lastTimestamp) {
            timestamp = this.getCurrentTimestamp();
        }
        return timestamp;
    }

    // 生成唯一 ID
    nextId() {
        let timestamp = this.getCurrentTimestamp();

        if (timestamp < this.lastTimestamp) {
            throw new Error('Clock moved backwards. Refusing to generate id for ' + (this.lastTimestamp - timestamp) + ' milliseconds');
        }

        if (timestamp === this.lastTimestamp) {
            this.sequence = (this.sequence + 1) & this.maxSequence;
            if (this.sequence === 0) {
                timestamp = this.waitNextMillis(this.lastTimestamp);
            }
        } else {
            this.sequence = 0;
        }

        this.lastTimestamp = timestamp;
        return (BigInt(timestamp - this.startTimestamp) << BigInt(this.timestampShift)) | BigInt(this.sequence);
    }
}
export default Snowflake;