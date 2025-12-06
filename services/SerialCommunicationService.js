const { SerialPort } = require('serialport');
const EventEmitter = require('events');
const { ProtocolUtils, PROTOCOL } = require('../protocol/DeviceProtocol');
const RadiationDetectorSimulator = require('../protocol/RadiationDetectorSimulator');

class SerialCommunicationService extends EventEmitter {
    constructor() {
        super();
        this.ports = new Map(); // 端口管理
        this.configs = new Map(); // 端口配置
        this.isConnected = false;
        this.dataBuffer = new Map(); // 数据缓冲区
        this.reconnectAttempts = new Map(); // 重连次数
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 5000; // 5秒
        
        // 新增：设备模拟器
        this.simulator = new RadiationDetectorSimulator();
        this.useSimulator = false; // 默认不使用模拟器
        
        // 设置模拟器事件监听
        this.setupSimulatorEvents();
    }
    
    /**
     * 设置模拟器事件监听
     * @private
     */
    setupSimulatorEvents() {
        this.simulator.on('connected', () => {
            this.isConnected = true;
            this.emit('connected', { type: 'simulator' });
        });
        
        this.simulator.on('disconnected', () => {
            this.isConnected = false;
            this.emit('disconnected', { type: 'simulator' });
        });
        
        this.simulator.on('dataFrame', (frame) => {
            this.handleSimulatorData(frame);
        });
    }
    
    /**
     * 启用或禁用设备模拟器
     * @param {boolean} enabled 是否启用模拟器
     */
    setSimulatorMode(enabled) {
        this.useSimulator = enabled;
        console.log(`模拟器模式: ${enabled ? '启用' : '禁用'}`);
        
        if (enabled) {
            console.log('使用设备模拟器进行开发和测试');
        } else {
            console.log('使用真实硬件设备');
        }
        
        return { success: true, simulatorMode: enabled };
    }
    
    /**
     * 配置串口参数
     * @param {Object} config 串口配置
     */
    async configure(config) {
        const { portName, baudRate = 9600, dataBits = 8, parity = 'none', stopBits = 1 } = config;

        // 验证配置
        this.validateSerialConfig(config);

        // 保存配置
        this.configs.set(portName, {
            portName,
            baudRate,
            dataBits,
            parity,
            stopBits,
            flowControl: 'none'
        });

        console.log(`串口配置已保存: ${portName} - ${baudRate} baud`);
        
        // 如果端口已连接，重新配置
        if (this.ports.has(portName)) {
            await this.disconnectPort(portName);
            await this.connectPort(portName);
        }

        return { success: true };
    }
    
    /**
     * 连接所有配置的设备
     */
    async connect() {
        if (this.useSimulator) {
            return await this.connectSimulator();
        }
        
        // 原有的真实设备连接逻辑
        const portList = Array.from(this.configs.keys());
        
        if (portList.length === 0) {
            throw new Error('没有配置任何串口设备');
        }
        
        console.log(`开始连接 ${portList.length} 个串口设备...`);
        
        try {
            const results = [];
            
            for (const [portName, config] of this.configs) {
                try {
                    await this.connectPort(portName);
                    results.push({ portName, success: true });
                } catch (error) {
                    console.error(`连接 ${portName} 失败:`, error.message);
                    results.push({ portName, success: false, error: error.message });
                }
            }

            this.isConnected = results.every(r => r.success);
            
            if (this.isConnected) {
                console.log('所有串口连接成功');
            } else {
                console.warn('部分串口连接失败');
            }

            return { success: this.isConnected, results };
        } catch (error) {
            console.error('串口连接失败:', error.message);
            throw error;
        }
    }
    
    /**
     * 连接模拟器
     * @private
     */
    async connectSimulator() {
        try {
            const result = await this.simulator.connect();
            
            if (result.success) {
                console.log('设备模拟器连接成功');
                this.emit('connected', { type: 'simulator', simulator: true });
                return { success: true, simulator: true };
            } else {
                throw new Error(result.error || '模拟器连接失败');
            }
        } catch (error) {
            console.error('设备模拟器连接失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 连接单个端口
     * @private
     */
    async connectPort(portName) {
        const config = this.configs.get(portName);
        if (!config) {
            throw new Error(`端口 ${portName} 未配置`);
        }

        if (this.ports.has(portName)) {
            await this.disconnectPort(portName);
        }

        return new Promise((resolve, reject) => {
            const port = new SerialPort({
                path: portName,
                baudRate: config.baudRate,
                dataBits: config.dataBits,
                parity: config.parity,
                stopBits: config.stopBits,
                flowControl: config.flowControl
            });

            const onOpen = (error) => {
                if (error) {
                    console.error(`打开端口 ${portName} 失败:`, error.message);
                    reject(error);
                    return;
                }

                console.log(`端口 ${portName} 连接成功`);
                
                // 保存端口实例
                this.ports.set(portName, port);
                this.dataBuffer.set(portName, []);
                this.reconnectAttempts.delete(portName);

                // 设置数据监听
                port.on('data', (data) => this.handleData(portName, data));
                port.on('error', (error) => this.handleError(portName, error));
                port.on('close', (error) => this.handleClose(portName, error));

                resolve({ portName, success: true });
            };

            port.open(onOpen);
        });
    }

    /**
     * 断开连接
     */
    async disconnect() {
        if (this.useSimulator) {
            return await this.disconnectSimulator();
        }
        
        const disconnectPromises = Array.from(this.ports.keys()).map(portName =>
            this.disconnectPort(portName).catch(error => {
                console.error(`断开 ${portName} 失败:`, error.message);
                return { portName, success: false, error: error.message };
            })
        );

        const results = await Promise.all(disconnectPromises);
        this.ports.clear();
        this.dataBuffer.clear();
        this.isConnected = false;

        console.log('所有端口已断开连接');
        this.emit('disconnected', { results });
        
        return { success: true, results };
    }
    
    /**
     * 断开模拟器
     * @private
     */
    async disconnectSimulator() {
        try {
            const result = await this.simulator.disconnect();
            console.log('设备模拟器已断开连接');
            this.emit('disconnected', { type: 'simulator', simulator: true });
            return { success: true, simulator: true };
        } catch (error) {
            console.error('设备模拟器断开失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 断开单个端口
     * @private
     */
    async disconnectPort(portName) {
        const port = this.ports.get(portName);
        if (!port) {
            return { portName, success: true };
        }

        return new Promise((resolve) => {
            port.close((error) => {
                if (error) {
                    console.error(`关闭端口 ${portName} 失败:`, error.message);
                } else {
                    console.log(`端口 ${portName} 已关闭`);
                }

                this.ports.delete(portName);
                this.dataBuffer.delete(portName);
                resolve({ portName, success: !error, error: error?.message });
            });
        });
    }

    /**
     * 发送数据
     * @param {string} portName 端口名称
     * @param {Buffer|string} data 要发送的数据
     * @param {number} timeout 超时时间(ms)
     */
    async send(portName, data, timeout = 5000) {
        if (this.useSimulator) {
            return await this.sendToSimulator(data, timeout);
        }
        
        const port = this.ports.get(portName);
        if (!port) {
            throw new Error(`端口 ${portName} 未连接`);
        }

        return new Promise((resolve, reject) => {
            const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
            
            port.write(dataBuffer, (error) => {
                if (error) {
                    console.error(`发送数据到 ${portName} 失败:`, error.message);
                    reject(error);
                    return;
                }

                console.log(`发送 ${dataBuffer.length} 字节到 ${portName}`);
                resolve({ portName, bytesSent: dataBuffer.length });
            });

            // 设置超时
            if (timeout > 0) {
                setTimeout(() => {
                    reject(new Error(`发送数据超时 (${timeout}ms)`));
                }, timeout);
            }
        });
    }

    /**
     * 发送数据到模拟器
     * @private
     */
    async sendToSimulator(data, timeout = 5000) {
        if (!this.simulator.isConnected) {
            throw new Error('模拟器未连接');
        }
        
        // 解析接收到的命令帧
        const frame = ProtocolUtils.parseFrame(data);
        if (!frame.valid) {
            throw new Error(`无效的协议帧: ${frame.error}`);
        }
        
        // 处理命令并获取响应
        const responseFrame = this.simulator.processCommand(frame);
        if (responseFrame) {
            console.log('模拟器响应已生成');
            return { bytesSent: data.length, response: responseFrame };
        }
        
        return { bytesSent: data.length };
    }

    /**
     * 处理接收到的数据
     * @private
     */
    handleData(portName, data) {
        console.log(`从 ${portName} 接收 ${data.length} 字节数据`);
        
        // 添加到缓冲区
        const buffer = this.dataBuffer.get(portName) || [];
        buffer.push(...data);
        this.dataBuffer.set(portName, buffer);

        // 处理协议帧
        this.processDataBuffer(portName);
        
        // 触发数据接收事件
        this.emit('data', { portName, data: data.toString('hex') });
    }

    /**
     * 处理模拟器数据
     * @private
     */
    handleSimulatorData(frame) {
        console.log('模拟器发送数据帧');
        this.emit('data', { portName: 'SIMULATOR', frame });
    }

    /**
     * 处理数据缓冲区，解析协议帧
     * @private
     */
    processDataBuffer(portName) {
        const buffer = this.dataBuffer.get(portName) || [];
        if (buffer.length < 5) return; // 最小帧长度

        // 查找帧头
        let frameStart = -1;
        for (let i = 0; i < buffer.length; i++) {
            if (buffer[i] === PROTOCOL.FRAME_START) {
                frameStart = i;
                break;
            }
        }

        if (frameStart === -1) return; // 未找到帧头

        // 检查帧长度
        if (frameStart + 2 >= buffer.length) return; // 数据不完整
        
        const frameLength = buffer[frameStart + 1];
        const totalFrameLength = frameLength + 5;

        if (frameStart + totalFrameLength > buffer.length) return; // 帧数据不完整

        // 提取完整帧
        const frameData = buffer.slice(frameStart, frameStart + totalFrameLength);
        const frame = ProtocolUtils.parseFrame(frameData);

        if (frame.valid) {
            console.log(`有效协议帧从 ${portName}: 命令=${frame.command.toString(16)}`);
            this.emit('frame', { portName, frame });
        } else {
            console.warn(`无效协议帧从 ${portName}: ${frame.error}`);
        }

        // 移除已处理的帧
        buffer.splice(0, frameStart + totalFrameLength);
        this.dataBuffer.set(portName, buffer);
    }

    /**
     * 处理端口错误
     * @private
     */
    handleError(portName, error) {
        console.error(`端口 ${portName} 错误:`, error.message);
        this.emit('error', { portName, error });
        
        // 自动重连
        this.handleReconnection(portName, error);
    }

    /**
     * 处理端口关闭
     * @private
     */
    handleClose(portName, error) {
        console.log(`端口 ${portName} 已关闭`);
        this.ports.delete(portName);
        
        if (error) {
            console.error(`端口 ${portName} 异常关闭:`, error.message);
            this.emit('close', { portName, error });
            this.handleReconnection(portName, error);
        } else {
            this.emit('close', { portName, normal: true });
        }
    }

    /**
     * 查找端口
     * @private
     */
    findPortByType(type) {
        for (const [portName, port] of this.ports) {
            if (type === 'control' && (portName.includes('COM2') || portName.includes('ttyS2'))) {
                return portName;
            } else if (type === 'data' && (portName.includes('COM3') || portName.includes('ttyS3'))) {
                return portName;
            }
        }
        return null;
    }

    /**
     * 处理重连逻辑
     * @private
     */
    async handleReconnection(portName, error) {
        const attempts = this.reconnectAttempts.get(portName) || 0;
        
        if (attempts >= this.maxReconnectAttempts) {
            console.error(`端口 ${portName} 重连失败，已达到最大重试次数`);
            this.emit('reconnectionFailed', { portName, error: error.message });
            return;
        }

        this.reconnectAttempts.set(portName, attempts + 1);
        
        console.log(`尝试重连 ${portName}... (${attempts + 1}/${this.maxReconnectAttempts})`);
        
        setTimeout(async () => {
            try {
                await this.connectPort(portName);
                console.log(`端口 ${portName} 重连成功`);
                this.emit('reconnected', { portName });
            } catch (reconnectError) {
                console.error(`重连 ${portName} 失败:`, reconnectError.message);
            }
        }, this.reconnectDelay);
    }

    /**
     * 验证串口配置
     * @private
     */
    validateSerialConfig(config) {
        const { portName, baudRate, dataBits, parity, stopBits } = config;

        if (!portName) {
            throw new Error('端口名称不能为空');
        }

        if (!baudRate || baudRate < 1200 || baudRate > 115200) {
            throw new Error('波特率必须在 1200-115200 之间');
        }

        if (![5, 6, 7, 8].includes(dataBits)) {
            throw new Error('数据位必须是 5, 6, 7, 或 8');
        }

        if (!['none', 'even', 'odd'].includes(parity)) {
            throw new Error('校验位必须是 none, even, 或 odd');
        }

        if (![1, 1.5, 2].includes(stopBits)) {
            throw new Error('停止位必须是 1, 1.5, 或 2');
        }
    }

    /**
     * 获取连接状态
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            simulatorMode: this.useSimulator,
            simulator: this.simulator.isConnected,
            ports: Array.from(this.ports.keys()),
            configs: Object.fromEntries(this.configs),
            dataBuffers: Object.fromEntries(
                Array.from(this.dataBuffer.entries()).map(([key, value]) => [key, value.length])
            )
        };
    }

    /**
     * 获取缓冲区数据
     */
    getBufferData(portName = null) {
        if (portName) {
            return this.dataBuffer.get(portName) || [];
        }
        return Object.fromEntries(this.dataBuffer);
    }

    /**
     * 清空缓冲区
     */
    clearBuffer(portName = null) {
        if (portName) {
            this.dataBuffer.set(portName, []);
        } else {
            for (const key of this.dataBuffer.keys()) {
                this.dataBuffer.set(key, []);
            }
        }
    }

    /**
     * 获取可用端口列表
     */
    async getAvailablePorts() {
        try {
            const ports = await SerialPort.list();
            return ports.map(port => ({
                path: port.path,
                manufacturer: port.manufacturer,
                serialNumber: port.serialNumber,
                pnpId: port.pnpId,
                locationId: port.locationId,
                vendorId: port.vendorId,
                productId: port.productId
            }));
        } catch (error) {
            console.error('获取可用端口列表失败:', error.message);
            throw error;
        }
    }
}

module.exports = SerialCommunicationService;