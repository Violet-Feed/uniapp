class Snowflake {
    constructor() {
        // 起始时间戳
        this.startTimestamp = 1288834974657n;
        // 数据中心 ID 所占位数
        this.dataCenterIdBits = 5n;
        // 机器 ID 所占位数
        this.workerIdBits = 5n;
        // 序列号所占位数
        this.sequenceBits = 12n;

        // 时间戳左移位数
        this.timestampShift = this.sequenceBits + this.dataCenterIdBits + this.workerIdBits;
		
		this.maxSequence=-1n ^ (-1n << this.sequenceBits)

        this.sequence = 0n;
        this.lastTimestamp = -1n;
    }

    // 获取当前时间戳
    getCurrentTimestamp() {
        return BigInt(Date.now());
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
            this.sequence = (this.sequence + 1n) & this.maxSequence;
            if (this.sequence === 0n) {
                timestamp = this.waitNextMillis(this.lastTimestamp);
            }
        } else {
            this.sequence = 0n;
        }

        this.lastTimestamp = timestamp;
        return (timestamp - this.startTimestamp) << this.timestampShift | this.sequence;
    }
}
export default Snowflake;