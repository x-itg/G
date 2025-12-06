/**
 * 辐射检测器设备通讯协议定义
 * 适用于COM2(控制端口)和COM3(数据端口)
 * 支持探头位移控制、数据采集、状态监控
 */

// 协议常量定义
const PROTOCOL = {
    // 帧头和帧尾
    FRAME_START: 0xAA,
    FRAME_END: 0x55,
    
    // 命令码定义
    COMMANDS: {
        // 系统控制命令 (COM2)
        SYSTEM_RESET: 0x01,
        SYSTEM_STATUS: 0x02,
        SYSTEM_VERSION: 0x03,
        
        // 设备控制命令 (COM2)
        DEVICE_CONNECT: 0x10,
        DEVICE_DISCONNECT: 0x11,
        DEVICE_HEARTBEAT: 0x12,
        
        // 探头控制命令 (COM2)
        PROBE_POSITION_SET: 0x20,
        PROBE_POSITION_GET: 0x21,
        PROBE_MOVE_TO: 0x22,
        PROBE_MOVE_RELATIVE: 0x23,
        PROBE_HOME: 0x24,
        PROBE_EMERGENCY_STOP: 0x25,
        PROBE_SPEED_SET: 0x26,
        
        // 测量控制命令 (COM2)
        MEASUREMENT_START: 0x30,
        MEASUREMENT_STOP: 0x31,
        MEASUREMENT_PAUSE: 0x32,
        MEASUREMENT_RESUME: 0x33,
        
        // 数据传输命令 (COM3)
        DATA_REQUEST: 0x40,
        DATA_FRAME: 0x41,
        DATA_ACK: 0x42,
        DATA_ERROR: 0x43,
        
        // 设备状态命令
        STATUS_QUERY: 0x50,
        STATUS_RESPONSE: 0x51,
        ERROR_REPORT: 0x52,
        
        // 校准命令
        CALIBRATION_START: 0x60,
        CALIBRATION_DATA: 0x61,
        CALIBRATION_COMPLETE: 0x62,
        CALIBRATION_ERROR: 0x63
    },
    
    // 错误码定义
    ERROR_CODES: {
        SUCCESS: 0x00,
        INVALID_COMMAND: 0x01,
        INVALID_PARAMETERS: 0x02,
        DEVICE_BUSY: 0x03,
        DEVICE_NOT_READY: 0x04,
        COMMUNICATION_ERROR: 0x05,
        TIMEOUT: 0x06,
        CHECKSUM_ERROR: 0x07,
        HARDWARE_ERROR: 0x08,
        CALIBRATION_ERROR: 0x09
    },
    
    // 设备状态定义
    DEVICE_STATUS: {
        OFFLINE: 0x00,
        CONNECTING: 0x01,
        READY: 0x02,
        MEASURING: 0x03,
        MOVING: 0x04,
        ERROR: 0x05,
        CALIBRATING: 0x06
    },
    
    // 探头状态定义
    PROBE_STATUS: {
        IDLE: 0x00,
        MOVING: 0x01,
        HOMING: 0x02,
        POSITIONING: 0x03,
        EMERGENCY_STOP: 0x04,
        ERROR: 0x05
    },
    
    // 数据格式定义
    DATA_FORMATS: {
        // 位置数据 (4字节)
        POSITION_DATA: 'position',
        // 计数率数据 (4字节)
        COUNT_RATE_DATA: 'count_rate',
        // 谱线数据 (可变长度)
        SPECTRUM_DATA: 'spectrum',
        // 时间戳 (8字节)
        TIMESTAMP: 'timestamp'
    }
};

// 位置数据结构
const PositionData = {
    x: 0,  // X轴位置 (单位: mm)
    y: 0,  // Y轴位置 (单位: mm)
    z: 0,  // Z轴位置 (单位: mm)
    speed: 0  // 移动速度 (单位: mm/s)
};

// 计数率数据结构
const CountRateData = {
    timestamp: 0,
    countRate: 0,     // 计数率 (cps)
    totalCounts: 0,   // 总计数
    liveTime: 0,      // 活时间 (s)
    realTime: 0       // 实时时间 (s)
};

// 谱线数据结构
const SpectrumData = {
    channelStart: 0,
    channelEnd: 0,
    counts: [],       // 各通道计数
    liveTime: 0,
    realTime: 0
};

// 设备状态数据结构
const DeviceStatus = {
    deviceStatus: 0,
    probeStatus: 0,
    position: { x: 0, y: 0, z: 0 },
    temperature: 0,     // 温度 (°C)
    voltage: 0,         // 电压 (V)
    current: 0,         // 电流 (mA)
    lastHeartbeat: 0    // 最后心跳时间
};

/**
 * 通讯协议工具类
 */
class ProtocolUtils {
    /**
     * 生成协议帧
     * @param {number} command 命令码
     * @param {Buffer|Array} data 数据
     * @param {number} sourceId 源设备ID (默认: 0x01)
     * @param {number} destId 目标设备ID (默认: 0x02)
     * @returns {Buffer} 完整的协议帧
     */
    static generateFrame(command, data = [], sourceId = 0x01, destId = 0x02) {
        const payload = Buffer.concat([
            Buffer.from([sourceId, destId]),
            Buffer.from([command]),
            Buffer.isBuffer(data) ? data : Buffer.from(data)
        ]);
        
        const checksum = this.calculateChecksum(payload);
        
        return Buffer.concat([
            Buffer.from([PROTOCOL.FRAME_START]),
            Buffer.from([payload.length]),
            payload,
            Buffer.from([checksum]),
            Buffer.from([PROTOCOL.FRAME_END])
        ]);
    }
    
    /**
     * 解析协议帧
     * @param {Buffer} frame 接收的帧数据
     * @returns {Object} 解析结果 {sourceId, destId, command, data, checksum, valid}
     */
    static parseFrame(frame) {
        try {
            if (frame.length < 6) return { valid: false, error: 'Frame too short' };
            
            if (frame[0] !== PROTOCOL.FRAME_START) {
                return { valid: false, error: 'Invalid frame start' };
            }
            
            const length = frame[1];
            if (frame.length !== length + 5) {
                return { valid: false, error: 'Invalid frame length' };
            }
            
            if (frame[length + 3] !== PROTOCOL.FRAME_END) {
                return { valid: false, error: 'Invalid frame end' };
            }
            
            const payload = frame.slice(2, 2 + length);
            const receivedChecksum = frame[2 + length];
            const calculatedChecksum = this.calculateChecksum(payload);
            
            if (receivedChecksum !== calculatedChecksum) {
                return { valid: false, error: 'Checksum mismatch' };
            }
            
            return {
                valid: true,
                sourceId: payload[0],
                destId: payload[1],
                command: payload[2],
                data: payload.slice(3),
                checksum: receivedChecksum
            };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
    
    /**
     * 计算校验和
     * @param {Buffer} data 数据
     * @returns {number} 校验和
     */
    static calculateChecksum(data) {
        let checksum = 0;
        for (let i = 0; i < data.length; i++) {
            checksum ^= data[i];
        }
        return checksum;
    }
    
    /**
     * 编码位置数据
     * @param {Object} position 位置数据
     * @returns {Buffer} 编码后的数据
     */
    static encodePositionData(position) {
        return Buffer.from([
            Math.floor(position.x * 100) & 0xFF,
            Math.floor(position.x * 100) >> 8 & 0xFF,
            Math.floor(position.y * 100) & 0xFF,
            Math.floor(position.y * 100) >> 8 & 0xFF,
            Math.floor(position.z * 100) & 0xFF,
            Math.floor(position.z * 100) >> 8 & 0xFF,
            Math.floor(position.speed * 10) & 0xFF,
            Math.floor(position.speed * 10) >> 8 & 0xFF
        ]);
    }
    
    /**
     * 解码位置数据
     * @param {Buffer} data 编码后的数据
     * @returns {Object} 位置数据
     */
    static decodePositionData(data) {
        return {
            x: ((data[1] << 8) | data[0]) / 100,
            y: ((data[3] << 8) | data[2]) / 100,
            z: ((data[5] << 8) | data[4]) / 100,
            speed: ((data[7] << 8) | data[6]) / 10
        };
    }
    
    /**
     * 编码计数率数据
     * @param {Object} countRate 计数率数据
     * @returns {Buffer} 编码后的数据
     */
    static encodeCountRateData(countRate) {
        const timestamp = Buffer.alloc(8);
        timestamp.writeBigInt64BE(BigInt(countRate.timestamp), 0);
        
        const countRateBuf = Buffer.alloc(4);
        countRateBuf.writeInt32BE(Math.floor(countRate.countRate * 1000), 0);
        
        const totalCountsBuf = Buffer.alloc(8);
        totalCountsBuf.writeBigInt64BE(BigInt(countRate.totalCounts), 0);
        
        const liveTimeBuf = Buffer.alloc(4);
        liveTimeBuf.writeInt32BE(Math.floor(countRate.liveTime * 1000), 0);
        
        const realTimeBuf = Buffer.alloc(4);
        realTimeBuf.writeInt32BE(Math.floor(countRate.realTime * 1000), 0);
        
        return Buffer.concat([timestamp, countRateBuf, totalCountsBuf, liveTimeBuf, realTimeBuf]);
    }
    
    /**
     * 解码计数率数据
     * @param {Buffer} data 编码后的数据
     * @returns {Object} 计数率数据
     */
    static decodeCountRateData(data) {
        const timestamp = data.readBigInt64BE(0);
        const countRate = data.readInt32BE(8) / 1000;
        const totalCounts = data.readBigInt64BE(12);
        const liveTime = data.readInt32BE(20) / 1000;
        const realTime = data.readInt32BE(24) / 1000;
        
        return {
            timestamp: Number(timestamp),
            countRate,
            totalCounts: Number(totalCounts),
            liveTime,
            realTime
        };
    }
    
    /**
     * 编码设备状态
     * @param {Object} status 设备状态
     * @returns {Buffer} 编码后的数据
     */
    static encodeDeviceStatus(status) {
        const positionData = this.encodePositionData(status.position);
        const temperature = Buffer.alloc(2);
        temperature.writeInt16BE(Math.floor(status.temperature * 100), 0);
        
        const voltage = Buffer.alloc(2);
        voltage.writeInt16BE(Math.floor(status.voltage * 100), 0);
        
        const current = Buffer.alloc(2);
        current.writeInt16BE(Math.floor(status.current * 100), 0);
        
        const heartbeat = Buffer.alloc(8);
        heartbeat.writeBigInt64BE(BigInt(status.lastHeartbeat), 0);
        
        return Buffer.concat([
            Buffer.from([status.deviceStatus, status.probeStatus]),
            positionData,
            temperature,
            voltage,
            current,
            heartbeat
        ]);
    }
    
    /**
     * 解码设备状态
     * @param {Buffer} data 编码后的数据
     * @returns {Object} 设备状态
     */
    static decodeDeviceStatus(data) {
        const deviceStatus = data[0];
        const probeStatus = data[1];
        const position = this.decodePositionData(data.slice(2, 10));
        const temperature = data.readInt16BE(10) / 100;
        const voltage = data.readInt16BE(12) / 100;
        const current = data.readInt16BE(14) / 100;
        const lastHeartbeat = Number(data.readBigInt64BE(16));
        
        return {
            deviceStatus,
            probeStatus,
            position,
            temperature,
            voltage,
            current,
            lastHeartbeat
        };
    }
}

module.exports = {
    PROTOCOL,
    PositionData,
    CountRateData,
    SpectrumData,
    DeviceStatus,
    ProtocolUtils
};