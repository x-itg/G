const EventEmitter = require('events');
const { PROTOCOL, ProtocolUtils } = require('./DeviceProtocol');

/**
 * 辐射检测器设备模拟器
 * 用于在开发和测试时模拟真实的硬件设备
 */
class RadiationDetectorSimulator extends EventEmitter {
    constructor() {
        super();
        this.isConnected = false;
        this.deviceStatus = {
            deviceStatus: PROTOCOL.DEVICE_STATUS.OFFLINE,
            probeStatus: PROTOCOL.PROBE_STATUS.IDLE,
            position: { x: 0, y: 0, z: 0, speed: 10 },
            temperature: 25.0,
            voltage: 12.0,
            current: 500,
            lastHeartbeat: Date.now()
        };
        
        this.measurementActive = false;
        this.spectrumData = new Array(1024).fill(0); // 1024通道谱线
        this.countRate = 0;
        this.totalCounts = 0;
        this.liveTime = 0;
        this.realTime = 0;
        
        // 模拟参数
        this.maxX = 200;  // 最大X轴范围 (mm)
        this.maxY = 200;  // 最大Y轴范围 (mm)
        this.maxZ = 50;   // 最大Z轴范围 (mm)
        this.minSpeed = 1;  // 最小速度 (mm/s)
        this.maxSpeed = 50; // 最大速度 (mm/s)
        
        // 移动控制
        this.moveTarget = null;
        this.moveStartTime = 0;
        this.moveDuration = 0;
        
        // 数据模拟
        this.backgroundCount = 10; // 背景计数率
        this.peakPositions = [
            { energy: 59.5, channel: 200, intensity: 1000 },   // Am-241
            { energy: 661.7, channel: 600, intensity: 500 },   // Cs-137
            { energy: 1460.8, channel: 1300, intensity: 200 }  // K-40
        ];
        
        this.simulatorTimer = null;
        this.updateInterval = 100; // 100ms更新一次
        
        console.log('辐射检测器模拟器已初始化');
    }
    
    /**
     * 连接到模拟器
     */
    async connect() {
        if (this.isConnected) {
            return { success: false, error: 'Already connected' };
        }
        
        // 模拟连接延迟
        await this.delay(1000);
        
        this.isConnected = true;
        this.deviceStatus.deviceStatus = PROTOCOL.DEVICE_STATUS.READY;
        this.deviceStatus.lastHeartbeat = Date.now();
        
        this.startSimulation();
        this.emit('connected');
        
        console.log('模拟器连接成功');
        return { success: true };
    }
    
    /**
     * 断开连接
     */
    async disconnect() {
        if (!this.isConnected) {
            return { success: false, error: 'Not connected' };
        }
        
        this.stopSimulation();
        this.isConnected = false;
        this.deviceStatus.deviceStatus = PROTOCOL.DEVICE_STATUS.OFFLINE;
        this.deviceStatus.probeStatus = PROTOCOL.PROBE_STATUS.IDLE;
        
        this.emit('disconnected');
        
        console.log('模拟器已断开连接');
        return { success: true };
    }
    
    /**
     * 处理命令
     * @param {Object} frame 接收的命令帧
     * @returns {Buffer|null} 响应帧
     */
    processCommand(frame) {
        if (!this.isConnected) {
            return this.createErrorResponse(frame, PROTOCOL.ERROR_CODES.DEVICE_NOT_READY);
        }
        
        switch (frame.command) {
            case PROTOCOL.COMMANDS.SYSTEM_STATUS:
                return this.handleSystemStatus(frame);
            
            case PROTOCOL.COMMANDS.DEVICE_CONNECT:
                return this.handleDeviceConnect(frame);
            
            case PROTOCOL.COMMANDS.DEVICE_HEARTBEAT:
                return this.handleDeviceHeartbeat(frame);
            
            case PROTOCOL.COMMANDS.PROBE_POSITION_SET:
                return this.handleProbePositionSet(frame);
            
            case PROTOCOL.COMMANDS.PROBE_POSITION_GET:
                return this.handleProbePositionGet(frame);
            
            case PROTOCOL.COMMANDS.PROBE_MOVE_TO:
                return this.handleProbeMoveTo(frame);
            
            case PROTOCOL.COMMANDS.PROBE_HOME:
                return this.handleProbeHome(frame);
            
            case PROTOCOL.COMMANDS.PROBE_EMERGENCY_STOP:
                return this.handleProbeEmergencyStop(frame);
            
            case PROTOCOL.COMMANDS.PROBE_SPEED_SET:
                return this.handleProbeSpeedSet(frame);
            
            case PROTOCOL.COMMANDS.MEASUREMENT_START:
                return this.handleMeasurementStart(frame);
            
            case PROTOCOL.COMMANDS.MEASUREMENT_STOP:
                return this.handleMeasurementStop(frame);
            
            case PROTOCOL.COMMANDS.STATUS_QUERY:
                return this.handleStatusQuery(frame);
            
            default:
                return this.createErrorResponse(frame, PROTOCOL.ERROR_CODES.INVALID_COMMAND);
        }
    }
    
    /**
     * 处理系统状态查询
     */
    handleSystemStatus(frame) {
        const responseData = Buffer.from([
            0x01,  // 模拟器版本
            0x01,  // 主要版本
            0x00   // 次要版本
        ]);
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.SYSTEM_STATUS,
            responseData,
            0x02, // 目标设备ID (模拟器)
            frame.sourceId
        );
    }
    
    /**
     * 处理设备连接
     */
    handleDeviceConnect(frame) {
        if (this.deviceStatus.deviceStatus !== PROTOCOL.DEVICE_STATUS.OFFLINE) {
            return this.createErrorResponse(frame, PROTOCOL.ERROR_CODES.DEVICE_BUSY);
        }
        
        this.deviceStatus.deviceStatus = PROTOCOL.DEVICE_STATUS.READY;
        this.deviceStatus.lastHeartbeat = Date.now();
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.DEVICE_CONNECT,
            Buffer.from([PROTOCOL.ERROR_CODES.SUCCESS]),
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 处理设备心跳
     */
    handleDeviceHeartbeat(frame) {
        this.deviceStatus.lastHeartbeat = Date.now();
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.DEVICE_HEARTBEAT,
            Buffer.from([PROTOCOL.ERROR_CODES.SUCCESS]),
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 处理探头位置设置
     */
    handleProbePositionSet(frame) {
        const position = ProtocolUtils.decodePositionData(frame.data);
        
        // 验证位置范围
        if (position.x < 0 || position.x > this.maxX ||
            position.y < 0 || position.y > this.maxY ||
            position.z < 0 || position.z > this.maxZ ||
            position.speed < this.minSpeed || position.speed > this.maxSpeed) {
            
            return this.createErrorResponse(frame, PROTOCOL.ERROR_CODES.INVALID_PARAMETERS);
        }
        
        this.deviceStatus.position = position;
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.PROBE_POSITION_SET,
            Buffer.from([PROTOCOL.ERROR_CODES.SUCCESS]),
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 处理探头位置查询
     */
    handleProbePositionGet(frame) {
        const positionData = ProtocolUtils.encodePositionData(this.deviceStatus.position);
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.PROBE_POSITION_GET,
            positionData,
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 处理探头移动到指定位置
     */
    handleProbeMoveTo(frame) {
        const targetPosition = ProtocolUtils.decodePositionData(frame.data);
        
        // 验证目标位置
        if (targetPosition.x < 0 || targetPosition.x > this.maxX ||
            targetPosition.y < 0 || targetPosition.y > this.maxY ||
            targetPosition.z < 0 || targetPosition.z > this.maxZ) {
            
            return this.createErrorResponse(frame, PROTOCOL.ERROR_CODES.INVALID_PARAMETERS);
        }
        
        // 开始移动
        this.moveTarget = targetPosition;
        this.moveStartTime = Date.now();
        
        // 计算移动时间（简化计算）
        const distance = Math.sqrt(
            Math.pow(targetPosition.x - this.deviceStatus.position.x, 2) +
            Math.pow(targetPosition.y - this.deviceStatus.position.y, 2) +
            Math.pow(targetPosition.z - this.deviceStatus.position.z, 2)
        );
        
        this.moveDuration = distance / targetPosition.speed * 1000; // 转换为毫秒
        this.deviceStatus.probeStatus = PROTOCOL.PROBE_STATUS.MOVING;
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.PROBE_MOVE_TO,
            Buffer.from([PROTOCOL.ERROR_CODES.SUCCESS]),
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 处理探头回零
     */
    handleProbeHome(frame) {
        this.moveTarget = { x: 0, y: 0, z: 0, speed: this.deviceStatus.position.speed };
        this.moveStartTime = Date.now();
        this.moveDuration = 1000; // 1秒回零
        this.deviceStatus.probeStatus = PROTOCOL.PROBE_STATUS.HOMING;
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.PROBE_HOME,
            Buffer.from([PROTOCOL.ERROR_CODES.SUCCESS]),
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 处理探头紧急停止
     */
    handleProbeEmergencyStop(frame) {
        this.moveTarget = null;
        this.deviceStatus.probeStatus = PROTOCOL.PROBE_STATUS.EMERGENCY_STOP;
        
        // 延迟500ms后恢复idle状态
        setTimeout(() => {
            this.deviceStatus.probeStatus = PROTOCOL.PROBE_STATUS.IDLE;
        }, 500);
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.PROBE_EMERGENCY_STOP,
            Buffer.from([PROTOCOL.ERROR_CODES.SUCCESS]),
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 处理探头速度设置
     */
    handleProbeSpeedSet(frame) {
        const speed = frame.data[0]; // 简化处理，假设速度在0-255之间
        
        if (speed < this.minSpeed || speed > this.maxSpeed) {
            return this.createErrorResponse(frame, PROTOCOL.ERROR_CODES.INVALID_PARAMETERS);
        }
        
        this.deviceStatus.position.speed = speed;
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.PROBE_SPEED_SET,
            Buffer.from([PROTOCOL.ERROR_CODES.SUCCESS]),
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 处理测量开始
     */
    handleMeasurementStart(frame) {
        if (this.measurementActive) {
            return this.createErrorResponse(frame, PROTOCOL.ERROR_CODES.DEVICE_BUSY);
        }
        
        this.measurementActive = true;
        this.deviceStatus.deviceStatus = PROTOCOL.DEVICE_STATUS.MEASURING;
        this.liveTime = 0;
        this.realTime = 0;
        this.spectrumData.fill(0);
        this.totalCounts = 0;
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.MEASUREMENT_START,
            Buffer.from([PROTOCOL.ERROR_CODES.SUCCESS]),
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 处理测量停止
     */
    handleMeasurementStop(frame) {
        this.measurementActive = false;
        this.deviceStatus.deviceStatus = PROTOCOL.DEVICE_STATUS.READY;
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.MEASUREMENT_STOP,
            Buffer.from([PROTOCOL.ERROR_CODES.SUCCESS]),
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 处理状态查询
     */
    handleStatusQuery(frame) {
        const statusData = ProtocolUtils.encodeDeviceStatus(this.deviceStatus);
        
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.STATUS_QUERY,
            statusData,
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 创建错误响应
     */
    createErrorResponse(frame, errorCode) {
        return ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.ERROR_REPORT,
            Buffer.from([errorCode]),
            0x02,
            frame.sourceId
        );
    }
    
    /**
     * 启动模拟器
     */
    startSimulation() {
        this.simulatorTimer = setInterval(() => {
            this.updateSimulation();
        }, this.updateInterval);
    }
    
    /**
     * 停止模拟器
     */
    stopSimulation() {
        if (this.simulatorTimer) {
            clearInterval(this.simulatorTimer);
            this.simulatorTimer = null;
        }
    }
    
    /**
     * 更新模拟状态
     */
    updateSimulation() {
        const now = Date.now();
        
        // 更新移动状态
        if (this.moveTarget) {
            const elapsed = now - this.moveStartTime;
            const progress = Math.min(elapsed / this.moveDuration, 1.0);
            
            // 线性插值移动
            this.deviceStatus.position.x = this.deviceStatus.position.x + 
                (this.moveTarget.x - this.deviceStatus.position.x) * progress;
            this.deviceStatus.position.y = this.deviceStatus.position.y + 
                (this.moveTarget.y - this.deviceStatus.position.y) * progress;
            this.deviceStatus.position.z = this.deviceStatus.position.z + 
                (this.moveTarget.z - this.deviceStatus.position.z) * progress;
            
            if (progress >= 1.0) {
                this.moveTarget = null;
                this.deviceStatus.probeStatus = PROTOCOL.PROBE_STATUS.IDLE;
            }
        }
        
        // 更新测量状态
        if (this.measurementActive) {
            this.liveTime += this.updateInterval / 1000;
            this.realTime += this.updateInterval / 1000;
            
            // 模拟计数率（基于位置的变化）
            this.updateCountRate();
            
            // 更新谱线数据
            this.updateSpectrumData();
        }
        
        // 发送计数率数据（每5秒一次）
        if (this.measurementActive && now % 5000 < this.updateInterval) {
            this.sendCountRateData();
        }
        
        this.deviceStatus.lastHeartbeat = now;
    }
    
    /**
     * 更新计数率（基于位置的模拟）
     */
    updateCountRate() {
        // 基于位置模拟计数率变化
        const baseRate = this.backgroundCount;
        const positionFactor = 1.0 + 0.1 * Math.sin(this.deviceStatus.position.x / 20) * 
                               Math.cos(this.deviceStatus.position.y / 20);
        
        // 添加随机噪声
        const noise = (Math.random() - 0.5) * 0.1;
        
        this.countRate = Math.max(0, baseRate * positionFactor + noise);
        this.totalCounts += Math.floor(this.countRate * this.updateInterval / 1000);
    }
    
    /**
     * 更新谱线数据
     */
    updateSpectrumData() {
        // 简化的谱线模拟
        const deltaTime = this.updateInterval / 1000;
        
        // 更新每个通道
        for (let i = 0; i < this.spectrumData.length; i++) {
            // 背景噪声
            let counts = Math.floor(Math.random() * 2);
            
            // 添加峰位贡献
            for (const peak of this.peakPositions) {
                const distance = Math.abs(i - peak.channel);
                if (distance < 10) { // 10通道范围内有峰贡献
                    const contribution = peak.intensity * Math.exp(-distance * distance / 50);
                    counts += Math.floor(contribution * deltaTime);
                }
            }
            
            this.spectrumData[i] += counts;
        }
    }
    
    /**
     * 发送计数率数据
     */
    sendCountRateData() {
        const countRateData = {
            timestamp: Date.now(),
            countRate: this.countRate,
            totalCounts: this.totalCounts,
            liveTime: this.liveTime,
            realTime: this.realTime
        };
        
        const dataBuffer = ProtocolUtils.encodeCountRateData(countRateData);
        const frame = ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.DATA_FRAME,
            dataBuffer,
            0x02,
            0x01
        );
        
        this.emit('dataFrame', frame);
    }
    
    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = RadiationDetectorSimulator;