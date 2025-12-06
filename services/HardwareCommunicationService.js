/**
 * 硬件通讯服务
 * Hardware Communication Service
 * 
 * 功能特点:
 * - 支持模拟硬件通讯协议
 * - 支持真实COM口硬件通讯
 * - 数据采集和曲线生成
 * - 硬件状态监控
 * - 多种探头类型支持
 */

const EventEmitter = require('events');

// SerialPort将延迟加载，只在真实硬件模式下才加载

class HardwareCommunicationService extends EventEmitter {
    constructor(db) {
        super();
        this.db = db;
        this.currentMode = 'simulated'; // 'simulated' | 'real'
        this.isConnected = false;
        this.isAcquiring = false;
        this.currentDevice = null;
        this.SerialPort = null; // 延迟加载serialport
        
        // 模拟设备配置
        this.simulatedDevices = {
            hpge_detector: {
                name: '高纯锗探测器',
                manufacturer: 'Ortec',
                model: 'GEM-40P4-76',
                spectralRange: [0, 4095],
                channels: 4096,
                samplingRate: 1000 // ms
            },
            nai_detector: {
                name: '碘化钠探测器', 
                manufacturer: 'Saint-Gobain',
                model: '3x3-inch',
                spectralRange: [0, 1023],
                channels: 1024,
                samplingRate: 500 // ms
            },
            plastic_scintillator: {
                name: '塑料闪烁探测器',
                manufacturer: 'Eljen',
                model: 'EJ-200',
                spectralRange: [0, 255],
                channels: 256,
                samplingRate: 100 // ms
            }
        };
        
        // 真实硬件配置
        this.realHardware = {
            serialPort: null,
            portConfig: {
                comPort: 'COM2',
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            },
            commandSet: {
                initialize: 'INIT\r\n',
                start_acquisition: 'START\r\n',
                stop_acquisition: 'STOP\r\n',
                get_status: 'STATUS\r\n',
                get_data: 'DATA\r\n',
                reset: 'RESET\r\n'
            },
            responseBuffer: '',
            acquisitionTimer: null
        };
        
        // 数据缓冲区
        this.dataBuffer = [];
        this.maxBufferSize = 10000;
        
        // 统计信息
        this.stats = {
            totalAcquisitions: 0,
            totalCounts: 0,
            averageCountRate: 0,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * 获取系统设置以确定通讯模式
     */
    async loadSettings() {
        try {
            const SystemSettingsService = require('./SystemSettingsService');
            const settingsService = new SystemSettingsService(this.db);
            const settings = await settingsService.getHardwareConfig();
            
            if (settings.success) {
                this.currentMode = settings.data.mode;
                this.realHardware.portConfig = settings.data.serialPorts;
                
                // 确保返回完整的配置对象，包含timeout等参数
                return {
                    mode: settings.data.mode,
                    serialPorts: settings.data.serialPorts,
                    connectionParams: settings.data.connectionParams || {},
                    timeout: settings.data.connectionParams?.timeout || 5000,
                    retryAttempts: settings.data.connectionParams?.retryAttempts || 3,
                    bufferSize: settings.data.connectionParams?.bufferSize || 8192
                };
            }
            
            return null;
        } catch (error) {
            console.error('加载硬件设置失败:', error);
            return null;
        }
    }

    /**
     * 初始化硬件通讯
     */
    async initialize(mode = null) {
        try {
            if (mode) {
                this.currentMode = mode;
            } else {
                const settings = await this.loadSettings();
                if (settings) {
                    this.currentMode = settings.mode;
                }
            }
            
            console.log(`硬件通讯初始化 - 模式: ${this.currentMode === 'simulated' ? '模拟' : '真实'}`);
            
            if (this.currentMode === 'simulated') {
                await this.initializeSimulatedDevice();
            } else {
                await this.initializeRealHardware();
            }
            
            this.isConnected = true;
            this.emit('connected', { mode: this.currentMode });
            
            return {
                success: true,
                mode: this.currentMode,
                message: `硬件通讯已初始化 (${this.currentMode === 'simulated' ? '模拟模式' : '真实硬件模式'})`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('硬件通讯初始化失败:', error);
            return {
                success: false,
                error: error.message,
                mode: this.currentMode,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 初始化模拟设备
     */
    async initializeSimulatedDevice() {
        try {
            // 随机选择一个设备类型用于模拟
            const deviceTypes = Object.keys(this.simulatedDevices);
            const randomDevice = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
            
            this.currentDevice = {
                ...this.simulatedDevices[randomDevice],
                deviceId: `SIM_${Date.now()}`,
                isSimulated: true,
                createdAt: new Date().toISOString()
            };
            
            console.log(`模拟设备初始化: ${this.currentDevice.name} (${this.currentDevice.deviceId})`);
            
            // 初始化模拟数据生成器
            this.initializeSimulatedDataGenerator();
            
        } catch (error) {
            console.error('模拟设备初始化失败:', error);
            throw error;
        }
    }

    /**
     * 初始化模拟数据生成器
     */
    initializeSimulatedDataGenerator() {
        this.spectrumGenerator = {
            backgroundSpectrum: this.generateBackgroundSpectrum(),
            peakChannels: [
                Math.floor(this.currentDevice.spectralRange[1] * 0.25), // 在25%位置生成峰
                Math.floor(this.currentDevice.spectralRange[1] * 0.5),  // 在50%位置生成峰
                Math.floor(this.currentDevice.spectralRange[1] * 0.75)  // 在75%位置生成峰
            ],
            peakIntensities: [1000, 2000, 1500],
            noiseLevel: 0.01,
            countRate: 1000 // 每秒计数率
        };
        
        console.log(`模拟数据生成器初始化 - 峰通道: ${this.spectrumGenerator.peakChannels.join(', ')}`);
    }

    /**
     * 生成背景谱线
     */
    generateBackgroundSpectrum() {
        const spectrum = new Array(this.currentDevice.channels).fill(0);
        
        // 生成康普顿连续谱背景
        for (let i = 0; i < spectrum.length; i++) {
            // 康普顿连续谱的典型形状：低能端高，高能端低
            const x = i / spectrum.length;
            spectrum[i] = Math.max(50, 500 * Math.pow(1 - x, 2) + Math.random() * 20);
        }
        
        return spectrum;
    }

    /**
     * 初始化真实硬件
     */
    async initializeRealHardware() {
        try {
            // 动态加载SerialPort
            if (!this.SerialPort) {
                try {
                    this.SerialPort = require('serialport');
                } catch (error) {
                    throw new Error('SerialPort模块不可用。请安装serialport包：npm install serialport');
                }
            }
            
            const { comPort, baudRate, dataBits, stopBits, parity, flowControl } = this.realHardware.portConfig;
            
            this.realHardware.serialPort = new SerialPort(comPort, {
                baudRate: baudRate,
                dataBits: dataBits,
                stopBits: stopBits,
                parity: parity,
                flowControl: flowControl,
                autoOpen: false
            });
            
            // 设置串口事件监听
            this.setupSerialPortEvents();
            
            // 打开串口连接
            return new Promise((resolve, reject) => {
                this.realHardware.serialPort.open((error) => {
                    if (error) {
                        console.error('打开串口失败:', error);
                        reject(error);
                    } else {
                        console.log(`串口连接已建立: ${comPort}`);
                        this.currentDevice = {
                            name: '串口设备',
                            manufacturer: '未知',
                            model: 'COM设备',
                            deviceId: `REAL_${comPort}_${Date.now()}`,
                            isSimulated: false,
                            portName: comPort,
                            createdAt: new Date().toISOString()
                        };
                        resolve();
                    }
                });
            });
            
        } catch (error) {
            console.error('真实硬件初始化失败:', error);
            throw error;
        }
    }

    /**
     * 设置串口事件监听
     */
    setupSerialPortEvents() {
        const port = this.realHardware.serialPort;
        
        // 数据接收事件
        port.on('data', (data) => {
            this.realHardware.responseBuffer += data.toString();
            this.processSerialData();
        });
        
        // 端口打开事件
        port.on('open', () => {
            console.log('串口已打开');
            this.emit('portOpened');
        });
        
        // 端口关闭事件
        port.on('close', () => {
            console.log('串口已关闭');
            this.isConnected = false;
            this.emit('portClosed');
        });
        
        // 错误事件
        port.on('error', (error) => {
            console.error('串口错误:', error);
            this.emit('portError', error);
        });
    }

    /**
     * 处理串口数据
     */
    processSerialData() {
        const buffer = this.realHardware.responseBuffer;
        const lines = buffer.split('\r\n');
        
        // 保留最后一行（可能不完整）
        this.realHardware.responseBuffer = lines.pop();
        
        lines.forEach(line => {
            if (line.trim()) {
                this.emit('dataReceived', line.trim());
                this.parseHardwareResponse(line.trim());
            }
        });
    }

    /**
     * 解析硬件响应
     */
    parseHardwareResponse(response) {
        try {
            // 假设硬件返回的是JSON格式的数据
            const data = JSON.parse(response);
            
            if (data.type === 'spectrum') {
                this.processSpectrumData(data);
            } else if (data.type === 'status') {
                this.emit('statusUpdate', data);
            } else if (data.type === 'error') {
                console.error('硬件错误:', data.message);
                this.emit('hardwareError', data);
            }
            
        } catch (error) {
            // 如果不是JSON，假设是文本格式
            this.emit('textData', response);
        }
    }

    /**
     * 开始数据采集
     */
    async startAcquisition(options = {}) {
        try {
            if (this.isAcquiring) {
                throw new Error('采集已在进行中');
            }
            
            this.isAcquiring = true;
            this.stats.totalAcquisitions++;
            
            console.log(`开始数据采集 - 模式: ${this.currentMode}`);
            
            if (this.currentMode === 'simulated') {
                await this.startSimulatedAcquisition(options);
            } else {
                await this.startRealAcquisition(options);
            }
            
            this.emit('acquisitionStarted', {
                mode: this.currentMode,
                device: this.currentDevice,
                options: options
            });
            
            return {
                success: true,
                mode: this.currentMode,
                message: '数据采集已开始',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('开始数据采集失败:', error);
            this.isAcquiring = false;
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 开始模拟采集
     */
    async startSimulatedAcquisition(options) {
        const {
            duration = 30000, // 30秒
            interval = this.currentDevice.samplingRate,
            addPeaks = true,
            noiseLevel = this.spectrumGenerator.noiseLevel
        } = options;
        
        return new Promise((resolve) => {
            let elapsed = 0;
            const intervalId = setInterval(() => {
                if (elapsed >= duration || !this.isAcquiring) {
                    clearInterval(intervalId);
                    // 直接重置状态，不调用stopAcquisition避免递归调用
                    this.isAcquiring = false;
                    this.emit('acquisitionStopped', {
                        mode: this.currentMode,
                        device: this.currentDevice
                    });
                    resolve();
                    return;
                }
                
                // 生成模拟数据点
                const spectrum = this.generateSimulatedSpectrum(addPeaks, noiseLevel);
                const timestamp = new Date().toISOString();
                
                // 添加到数据缓冲区
                this.addToBuffer({
                    timestamp: timestamp,
                    spectrum: spectrum,
                    totalCounts: spectrum.reduce((sum, count) => sum + count, 0),
                    device: this.currentDevice,
                    mode: 'simulated'
                });
                
                // 发射数据事件
                this.emit('spectrumData', {
                    timestamp: timestamp,
                    spectrum: spectrum,
                    totalCounts: spectrum.reduce((sum, count) => sum + count, 0),
                    device: this.currentDevice
                });
                
                elapsed += interval;
            }, interval);
        });
    }

    /**
     * 生成模拟谱线数据
     */
    generateSimulatedSpectrum(addPeaks = true, noiseLevel = 0.01) {
        const spectrum = [...this.spectrumGenerator.backgroundSpectrum];
        
        if (addPeaks) {
            // 添加高斯峰
            this.spectrumGenerator.peakChannels.forEach((channel, index) => {
                const intensity = this.spectrumGenerator.peakIntensities[index] || 1000;
                this.addGaussianPeak(spectrum, channel, intensity, 10);
            });
        }
        
        // 添加泊松噪声
        for (let i = 0; i < spectrum.length; i++) {
            const noise = this.generatePoissonNoise(spectrum[i] * noiseLevel);
            spectrum[i] = Math.max(0, spectrum[i] + noise);
        }
        
        // 更新统计信息
        const totalCounts = spectrum.reduce((sum, count) => sum + count, 0);
        this.stats.totalCounts += totalCounts;
        this.stats.lastUpdate = new Date().toISOString();
        
        return spectrum;
    }

    /**
     * 添加高斯峰
     */
    addGaussianPeak(spectrum, center, intensity, sigma) {
        for (let i = 0; i < spectrum.length; i++) {
            const distance = i - center;
            const gaussian = intensity * Math.exp(-0.5 * Math.pow(distance / sigma, 2));
            spectrum[i] += gaussian;
        }
    }

    /**
     * 生成泊松噪声
     */
    generatePoissonNoise(mean) {
        if (mean <= 0) return 0;
        
        // 对于大的均值，使用正态近似
        if (mean > 30) {
            const stdDev = Math.sqrt(mean);
            return Math.max(0, Math.round(mean + this.generateNormalNoise(0, stdDev)));
        }
        
        // 对于小的均值，使用泊松分布
        const L = Math.exp(-mean);
        let p = 1.0;
        let k = 0;
        
        do {
            k++;
            p *= Math.random();
        } while (p > L);
        
        return k - 1;
    }

    /**
     * 生成正态分布噪声
     */
    generateNormalNoise(mean = 0, stdDev = 1) {
        let u1 = 0, u2 = 0;
        while (u1 === 0) u1 = Math.random();
        while (u2 === 0) u2 = Math.random();
        
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    }

    /**
     * 开始真实硬件采集
     */
    async startRealAcquisition(options) {
        try {
            const { duration = 30000 } = options;
            
            // 发送开始采集命令
            this.sendCommand('start_acquisition');
            
            // 设置采集超时
            this.realHardware.acquisitionTimer = setTimeout(() => {
                if (this.isAcquiring) {
                    this.stopAcquisition();
                }
            }, duration);
            
        } catch (error) {
            console.error('真实硬件采集失败:', error);
            throw error;
        }
    }

    /**
     * 发送硬件命令
     */
    sendCommand(command) {
        if (!this.realHardware.serialPort || !this.realHardware.serialPort.isOpen) {
            throw new Error('串口未连接');
        }
        
        const commandString = this.realHardware.commandSet[command];
        if (!commandString) {
            throw new Error('未知命令: ' + command);
        }
        
        console.log(`发送命令: ${command} -> ${commandString.trim()}`);
        this.realHardware.serialPort.write(commandString);
    }

    /**
     * 停止数据采集
     */
    async stopAcquisition() {
        try {
            if (!this.isAcquiring) {
                return {
                    success: false,
                    error: '当前未在进行采集',
                    timestamp: new Date().toISOString()
                };
            }
            
            this.isAcquiring = false;
            
            console.log('停止数据采集');
            
            if (this.currentMode === 'simulated') {
                // 模拟模式无需特殊处理
            } else {
                // 真实硬件模式
                if (this.realHardware.acquisitionTimer) {
                    clearTimeout(this.realHardware.acquisitionTimer);
                    this.realHardware.acquisitionTimer = null;
                }
                
                this.sendCommand('stop_acquisition');
            }
            
            this.emit('acquisitionStopped', {
                mode: this.currentMode,
                device: this.currentDevice
            });
            
            return {
                success: true,
                message: '数据采集已停止',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('停止数据采集失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 添加数据到缓冲区
     */
    addToBuffer(data) {
        this.dataBuffer.push({
            ...data,
            id: this.dataBuffer.length,
            bufferIndex: this.dataBuffer.length
        });
        
        // 限制缓冲区大小
        if (this.dataBuffer.length > this.maxBufferSize) {
            this.dataBuffer.shift();
        }
    }

    /**
     * 获取当前谱线数据
     */
    getCurrentSpectrum() {
        if (this.dataBuffer.length === 0) {
            return {
                success: false,
                message: '无可用数据'
            };
        }
        
        const latest = this.dataBuffer[this.dataBuffer.length - 1];
        
        return {
            success: true,
            data: {
                timestamp: latest.timestamp,
                spectrum: latest.spectrum,
                totalCounts: latest.totalCounts,
                device: latest.device,
                mode: latest.mode,
                bufferLength: this.dataBuffer.length
            }
        };
    }

    /**
     * 获取历史数据
     */
    getHistoricalData(options = {}) {
        const {
            startTime = null,
            endTime = null,
            limit = 100,
            offset = 0
        } = options;
        
        let filteredData = this.dataBuffer;
        
        // 按时间过滤
        if (startTime) {
            filteredData = filteredData.filter(item => 
                new Date(item.timestamp) >= new Date(startTime)
            );
        }
        
        if (endTime) {
            filteredData = filteredData.filter(item => 
                new Date(item.timestamp) <= new Date(endTime)
            );
        }
        
        // 分页
        const total = filteredData.length;
        const paginatedData = filteredData
            .slice(offset, offset + limit)
            .map(item => ({
                timestamp: item.timestamp,
                totalCounts: item.totalCounts,
                device: item.device,
                mode: item.mode
            }));
        
        return {
            success: true,
            data: {
                records: paginatedData,
                pagination: {
                    total: total,
                    limit: limit,
                    offset: offset,
                    hasMore: offset + limit < total
                }
            }
        };
    }

    /**
     * 获取硬件状态
     */
    getHardwareStatus() {
        return {
            success: true,
            data: {
                connected: this.isConnected,
                mode: this.currentMode,
                acquiring: this.isAcquiring,
                device: this.currentDevice,
                stats: this.stats,
                bufferSize: this.dataBuffer.length,
                lastUpdate: this.stats.lastUpdate
            }
        };
    }

    /**
     * 处理硬件数据（真实模式）
     */
    processHardwareData(data) {
        try {
            // 假设硬件返回的数据格式
            if (data.spectrum && Array.isArray(data.spectrum)) {
                const timestamp = new Date().toISOString();
                const totalCounts = data.spectrum.reduce((sum, count) => sum + count, 0);
                
                // 添加到缓冲区
                this.addToBuffer({
                    timestamp: timestamp,
                    spectrum: data.spectrum,
                    totalCounts: totalCounts,
                    device: this.currentDevice,
                    mode: 'real'
                });
                
                // 发射数据事件
                this.emit('spectrumData', {
                    timestamp: timestamp,
                    spectrum: data.spectrum,
                    totalCounts: totalCounts,
                    device: this.currentDevice
                });
                
                // 更新统计信息
                this.stats.totalCounts += totalCounts;
                this.stats.lastUpdate = new Date().toISOString();
            }
        } catch (error) {
            console.error('处理硬件数据失败:', error);
            this.emit('dataProcessingError', error);
        }
    }

    /**
     * 断开连接
     */
    async disconnect() {
        try {
            if (this.isAcquiring) {
                await this.stopAcquisition();
            }
            
            if (this.currentMode === 'real' && this.realHardware.serialPort) {
                this.realHardware.serialPort.close();
            }
            
            this.isConnected = false;
            this.currentDevice = null;
            
            this.emit('disconnected', {
                mode: this.currentMode
            });
            
            console.log('硬件通讯已断开');
            
            return {
                success: true,
                message: '硬件通讯已断开',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('断开连接失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 获取可用的串口列表
     */
    async getAvailablePorts() {
        try {
            // 动态加载SerialPort
            if (!this.SerialPort) {
                try {
                    this.SerialPort = require('serialport');
                } catch (error) {
                    console.warn('SerialPort模块不可用，返回空端口列表');
                    return {
                        success: false,
                        error: 'SerialPort模块不可用。请安装serialport包：npm install serialport',
                        data: []
                    };
                }
            }
            
            const ports = await this.SerialPort.list();
            return {
                success: true,
                data: ports.map(port => ({
                    path: port.path,
                    manufacturer: port.manufacturer || '未知',
                    serialNumber: port.serialNumber || '',
                    pnpId: port.pnpId || '',
                    locationId: port.locationId || ''
                }))
            };
        } catch (error) {
            console.error('获取串口列表失败:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * 测试串口连接
     */
    async testPortConnection(portPath, config = {}) {
        try {
            // 动态加载SerialPort
            if (!this.SerialPort) {
                try {
                    this.SerialPort = require('serialport');
                } catch (error) {
                    return {
                        success: false,
                        error: 'SerialPort模块不可用。请安装serialport包：npm install serialport',
                        port: portPath
                    };
                }
            }
            
            const testConfig = {
                baudRate: config.baudRate || 9600,
                dataBits: config.dataBits || 8,
                stopBits: config.stopBits || 1,
                parity: config.parity || 'none',
                flowControl: config.flowControl || 'none',
                autoOpen: false
            };
            
            return new Promise((resolve) => {
                const testPort = new SerialPort(portPath, testConfig);
                
                const timeout = setTimeout(() => {
                    testPort.close();
                    resolve({
                        success: false,
                        error: '连接超时',
                        port: portPath
                    });
                }, 5000);
                
                testPort.open((error) => {
                    clearTimeout(timeout);
                    
                    if (error) {
                        testPort.close();
                        resolve({
                            success: false,
                            error: error.message,
                            port: portPath
                        });
                    } else {
                        testPort.close();
                        resolve({
                            success: true,
                            message: '串口连接测试成功',
                            port: portPath
                        });
                    }
                });
            });
            
        } catch (error) {
            console.error('测试串口连接失败:', error);
            return {
                success: false,
                error: error.message,
                port: portPath
            };
        }
    }

    /**
     * 获取模拟设备配置
     */
    getSimulatedDevices() {
        return {
            success: true,
            data: this.simulatedDevices
        };
    }

    /**
     * 配置模拟设备
     */
    configureSimulatedDevice(deviceType, options = {}) {
        try {
            if (!this.simulatedDevices[deviceType]) {
                throw new Error('不支持的设备类型: ' + deviceType);
            }
            
            // 更新模拟设备配置
            this.spectrumGenerator = {
                ...this.spectrumGenerator,
                ...options
            };
            
            console.log(`模拟设备配置已更新: ${deviceType}`);
            
            return {
                success: true,
                message: `模拟设备配置已更新: ${deviceType}`,
                deviceType: deviceType,
                config: options
            };
            
        } catch (error) {
            console.error('配置模拟设备失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = HardwareCommunicationService;