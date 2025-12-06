/**
 * 探头控制系统服务
 * Probe Control System Service
 * 
 * 功能特点:
 * - 三轴位置控制 (X/Y/Z)
 * - 运动轨迹规划和执行
 * - 速度控制算法
 * - 位置反馈和精度验证
 * - 安全保护机制
 * - CFR 21 Part 11 审计记录
 */

const EventEmitter = require('events');

class ProbeControlService extends EventEmitter {
    constructor(db) {
        super();
        this.db = db;
        this.isConnected = false;
        this.isMoving = false;
        this.currentPosition = { x: 0, y: 0, z: 0 };
        this.targetPosition = { x: 0, y: 0, z: 0 };
        
        // 探头控制系统配置
        this.config = {
            // 工作区域范围 (mm)
            workArea: {
                x: { min: 0, max: 1000 },
                y: { min: 0, max: 800 },
                z: { min: 0, max: 500 }
            },
            
            // 速度配置 (mm/s)
            speed: {
                max: 50,
                normal: 20,
                slow: 5,
                approach: 2  // 接近时的慢速
            },
            
            // 加速度配置 (mm/s²)
            acceleration: {
                max: 100,
                normal: 50
            },
            
            // 位置精度要求
            accuracy: {
                positional: 0.1, // mm
                angular: 1.0     // degrees
            },
            
            // 安全参数
            safety: {
                emergencyStopTimeout: 5000, // ms
                watchdogTimeout: 30000,     // ms
                maxSafeForce: 100,          // N
                collisionThreshold: 0.5     // mm
            },
            
            // 串口配置 (COM2: 探头控制)
            serialConfig: {
                comPort: 'COM2',
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            }
        };
        
        // 运动状态
        this.motionState = {
            moving: false,
            paused: false,
            cancelled: false,
            emergencyStop: false,
            currentTrajectory: null,
            remainingDistance: 0,
            estimatedTime: 0,
            progress: 0
        };
        
        // 轨迹记录
        this.trajectoryHistory = [];
        this.maxHistorySize = 1000;
        
        // SerialPort (延迟加载)
        this.serialPort = null;
        this.SerialPort = null;
        
        // 统计信息
        this.stats = {
            totalMovements: 0,
            totalDistance: 0,
            totalTime: 0,
            averageSpeed: 0,
            lastUpdate: new Date().toISOString(),
            errors: 0,
            emergencyStops: 0
        };
        
        // 事件监听器
        this.setupEventListeners();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监控运动状态变化
        this.on('motionStarted', (data) => {
            console.log('探头运动开始:', data);
            this.logOperation('MOTION_START', data);
        });
        
        this.on('motionCompleted', (data) => {
            console.log('探头运动完成:', data);
            this.logOperation('MOTION_COMPLETE', data);
        });
        
        this.on('motionPaused', (data) => {
            console.log('探头运动暂停:', data);
            this.logOperation('MOTION_PAUSE', data);
        });
        
        this.on('motionResumed', (data) => {
            console.log('探头运动恢复:', data);
            this.logOperation('MOTION_RESUME', data);
        });
        
        this.on('emergencyStop', (data) => {
            console.log('紧急停止触发:', data);
            this.stats.emergencyStops++;
            this.logOperation('EMERGENCY_STOP', data);
        });
        
        this.on('positionUpdated', (data) => {
            // 位置更新事件
            console.log('位置已更新:', data.position);
            // 不需要再次调用updateCurrentPosition，避免递归
        });
        
        this.on('error', (error) => {
            console.error('探头控制错误:', error);
            this.stats.errors++;
            this.logOperation('ERROR', { error: error.message });
        });
    }

    /**
     * 初始化探头控制系统
     */
    async initialize() {
        try {
            console.log('初始化探头控制系统...');
            
            // 创建数据库表
            await this.createDatabaseTables();
            
            // 加载配置
            await this.loadConfiguration();
            
            // 初始化串口通讯 (延迟加载)
            await this.initializeSerialCommunication();
            
            // 重置位置
            await this.resetPosition();
            
            this.isConnected = true;
            
            console.log('探头控制系统初始化完成');
            
            return {
                success: true,
                message: '探头控制系统初始化成功',
                config: this.config,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('探头控制系统初始化失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 创建数据库表
     */
    async createDatabaseTables() {
        // 探头位置记录表
        const positionTable = `
            CREATE TABLE IF NOT EXISTS probe_positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                x REAL NOT NULL,
                y REAL NOT NULL,
                z REAL NOT NULL,
                user_id INTEGER,
                session_id TEXT,
                motion_type TEXT DEFAULT 'manual',
                source TEXT DEFAULT 'system',
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `;
        
        // 运动轨迹记录表
        const trajectoryTable = `
            CREATE TABLE IF NOT EXISTS probe_trajectories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                start_x REAL NOT NULL,
                start_y REAL NOT NULL,
                start_z REAL NOT NULL,
                end_x REAL NOT NULL,
                end_y REAL NOT NULL,
                end_z REAL NOT NULL,
                distance REAL NOT NULL,
                duration REAL NOT NULL,
                avg_speed REAL,
                max_speed REAL,
                status TEXT DEFAULT 'completed',
                user_id INTEGER,
                session_id TEXT,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `;
        
        // 操作日志表
        const operationLogTable = `
            CREATE TABLE IF NOT EXISTS probe_operation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                operation_type TEXT NOT NULL,
                operation_data TEXT,
                result TEXT,
                user_id INTEGER,
                session_id TEXT,
                device_id TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `;
        
        try {
            await this.db.run(positionTable);
            await this.db.run(trajectoryTable);
            await this.db.run(operationLogTable);
            
            console.log('探头控制数据库表创建成功');
        } catch (error) {
            console.error('创建数据库表失败:', error);
            throw error;
        }
    }

    /**
     * 加载配置
     */
    async loadConfiguration() {
        try {
            const query = `SELECT key, value FROM system_settings WHERE category = 'probe_control'`;
            const settings = await this.db.all(query);
            
            settings.forEach(setting => {
                const key = setting.key;
                const value = JSON.parse(setting.value);
                
                // 更新配置
                if (key in this.config) {
                    this.config[key] = { ...this.config[key], ...value };
                }
            });
            
        } catch (error) {
            console.warn('加载探头配置失败，使用默认配置:', error.message);
        }
    }

    /**
     * 初始化串口通讯
     */
    async initializeSerialCommunication() {
        try {
            // 延迟加载SerialPort
            if (!this.SerialPort) {
                try {
                    this.SerialPort = require('serialport');
                } catch (error) {
                    console.warn('SerialPort模块不可用，使用模拟模式');
                    this.isConnected = true;
                    return;
                }
            }
            
            this.serialPort = new this.SerialPort(this.config.serialConfig.comPort, {
                baudRate: this.config.serialConfig.baudRate,
                dataBits: this.config.serialConfig.dataBits,
                stopBits: this.config.serialConfig.stopBits,
                parity: this.config.serialConfig.parity,
                flowControl: this.config.serialConfig.flowControl,
                autoOpen: false
            });
            
            this.setupSerialEvents();
            
            return new Promise((resolve, reject) => {
                this.serialPort.open((error) => {
                    if (error) {
                        console.warn('串口连接失败，使用模拟模式:', error.message);
                        this.isConnected = true;
                        resolve();
                    } else {
                        console.log('探头控制串口连接成功');
                        this.isConnected = true;
                        resolve();
                    }
                });
            });
            
        } catch (error) {
            console.warn('串口初始化失败，使用模拟模式:', error.message);
            this.isConnected = true;
        }
    }

    /**
     * 设置串口事件
     */
    setupSerialEvents() {
        if (!this.serialPort) return;
        
        this.serialPort.on('data', (data) => {
            this.processSerialData(data.toString());
        });
        
        this.serialPort.on('open', () => {
            console.log('探头控制串口已打开');
        });
        
        this.serialPort.on('close', () => {
            console.log('探头控制串口已关闭');
            this.isConnected = false;
        });
        
        this.serialPort.on('error', (error) => {
            console.error('探头控制串口错误:', error);
            this.emit('error', error);
        });
    }

    /**
     * 处理串口数据
     */
    processSerialData(data) {
        const lines = data.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            try {
                const message = JSON.parse(line.trim());
                this.parseHardwareResponse(message);
            } catch (error) {
                console.warn('解析硬件响应失败:', line);
            }
        });
    }

    /**
     * 解析硬件响应
     */
    parseHardwareResponse(message) {
        switch (message.type) {
            case 'position':
                this.updateCurrentPosition(message.coordinates);
                break;
            case 'motion_complete':
                this.handleMotionComplete(message);
                break;
            case 'motion_error':
                this.handleMotionError(message);
                break;
            case 'status':
                this.updateMotionStatus(message);
                break;
            default:
                console.log('未知硬件响应:', message);
        }
    }

    /**
     * 更新当前位置
     */
    updateCurrentPosition(position) {
        const oldPosition = { ...this.currentPosition };
        this.currentPosition = { ...position };
        
        // 触发位置更新事件
        this.emit('positionUpdated', {
            position: position,
            previousPosition: oldPosition,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 记录位置
     */
    async recordPosition(motionType = 'manual', userId = null, sessionId = null) {
        try {
            const query = `
                INSERT INTO probe_positions (x, y, z, user_id, session_id, motion_type)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            await this.db.run(query, [
                this.currentPosition.x,
                this.currentPosition.y,
                this.currentPosition.z,
                userId,
                sessionId,
                motionType
            ]);
            
        } catch (error) {
            console.error('记录位置失败:', error);
        }
    }

    /**
     * 运动到指定位置
     */
    async moveToPosition(position, options = {}) {
        try {
            if (this.isMoving) {
                throw new Error('探头正在运动中');
            }
            
            // 先检查原始位置的边界
            const boundaryCheck = this.checkBoundary(position);
            
            if (!boundaryCheck.valid) {
                const errorMessage = `目标位置超出工作区域: ${boundaryCheck.errors.join(', ')}`;
                throw new Error(errorMessage);
            }
            
            // 验证目标位置（格式和数值验证）
            const validatedPosition = this.validatePosition(position);
            
            // 计算运动参数
            const motionParams = this.calculateMotionParameters(this.currentPosition, validatedPosition, options);
            
            // 规划轨迹
            const trajectory = this.planTrajectory(this.currentPosition, validatedPosition, motionParams);
            motionParams.trajectory = trajectory;
            
            // 开始运动
            this.isMoving = true;
            this.motionState = {
                ...this.motionState,
                moving: true,
                targetPosition: validatedPosition,
                ...motionParams
            };
            
            // 触发运动开始事件
            this.emit('motionStarted', {
                from: this.currentPosition,
                to: validatedPosition,
                params: motionParams
            });
            
            // 发送运动命令到硬件
            await this.sendMotionCommand(validatedPosition, motionParams);
            
            // 记录轨迹开始
            await this.startTrajectoryRecording(this.currentPosition, validatedPosition, motionParams);
            
            return {
                success: true,
                message: '运动命令已发送',
                targetPosition: validatedPosition,
                estimatedTime: motionParams.estimatedTime,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            this.isMoving = false;
            this.motionState.moving = false;
            console.error('移动到位置失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 验证位置
     */
    validatePosition(position) {
        // 先验证坐标格式
        if (!this.isValidCoordinate(position.x) || !this.isValidCoordinate(position.y) || !this.isValidCoordinate(position.z)) {
            throw new Error('坐标值无效，必须为数字');
        }
        
        const validated = {
            x: this.clamp(position.x, this.config.workArea.x.min, this.config.workArea.x.max),
            y: this.clamp(position.y, this.config.workArea.y.min, this.config.workArea.y.max),
            z: this.clamp(position.z, this.config.workArea.z.min, this.config.workArea.z.max)
        };
        
        return validated;
    }

    /**
     * 检查边界
     */
    checkBoundary(position) {
        const errors = [];
        
        // 检查X坐标
        if (position.x < this.config.workArea.x.min) {
            errors.push(`X坐标 ${position.x} 超出下边界 ${this.config.workArea.x.min}`);
        } else if (position.x > this.config.workArea.x.max) {
            errors.push(`X坐标 ${position.x} 超出上边界 ${this.config.workArea.x.max}`);
        }
        
        // 检查Y坐标
        if (position.y < this.config.workArea.y.min) {
            errors.push(`Y坐标 ${position.y} 超出下边界 ${this.config.workArea.y.min}`);
        } else if (position.y > this.config.workArea.y.max) {
            errors.push(`Y坐标 ${position.y} 超出上边界 ${this.config.workArea.y.max}`);
        }
        
        // 检查Z坐标
        if (position.z < this.config.workArea.z.min) {
            errors.push(`Z坐标 ${position.z} 超出下边界 ${this.config.workArea.z.min}`);
        } else if (position.z > this.config.workArea.z.max) {
            errors.push(`Z坐标 ${position.z} 超出上边界 ${this.config.workArea.z.max}`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 计算运动参数
     */
    calculateMotionParameters(from, to, options) {
        // 计算距离
        const distance = Math.sqrt(
            Math.pow(to.x - from.x, 2) +
            Math.pow(to.y - from.y, 2) +
            Math.pow(to.z - from.z, 2)
        );
        
        // 速度
        const speed = options.speed || this.config.speed.normal;
        
        // 计算预估时间
        const estimatedTime = distance / speed;
        
        return {
            distance,
            speed,
            estimatedTime,
            acceleration: options.acceleration || this.config.acceleration.normal
        };
    }

    /**
     * 规划轨迹
     */
    planTrajectory(from, to, params) {
        const trajectory = [];
        const steps = Math.max(10, Math.ceil(Math.abs(to.x - from.x + to.y - from.y + to.z - from.z) / 10));
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            
            trajectory.push({
                x: from.x + (to.x - from.x) * t,
                y: from.y + (to.y - from.y) * t,
                z: from.z + (to.z - from.z) * t,
                time: t * params.estimatedTime
            });
        }
        
        return trajectory;
    }

    /**
     * 发送运动命令
     */
    async sendMotionCommand(position, params) {
        if (!this.serialPort || !this.serialPort.isOpen) {
            // 模拟模式 - 直接更新位置
            await this.simulateMovement(position, params);
            return;
        }
        
        const command = {
            type: 'move_to',
            position: position,
            speed: params.speed,
            acceleration: params.acceleration,
            trajectory: params.trajectory
        };
        
        this.serialPort.write(JSON.stringify(command) + '\n');
    }

    /**
     * 模拟运动
     */
    async simulateMovement(targetPosition, params) {
        return new Promise((resolve, reject) => {
            const startPosition = { ...this.currentPosition };
            const steps = params.trajectory.length;
            let currentStep = 0;
            
            // 增加运动间隔，便于测试暂停功能
            const moveInterval = setInterval(() => {
                // 检查是否被暂停或取消
                if (this.motionState.paused) {
                    console.log('运动已暂停，等待恢复...');
                    return; // 暂停状态时不执行下一步
                }
                
                if (this.motionState.cancelled) {
                    clearInterval(moveInterval);
                    console.log('运动已取消');
                    reject(new Error('运动被取消'));
                    return;
                }
                
                if (this.motionState.emergencyStop) {
                    clearInterval(moveInterval);
                    console.log('运动被紧急停止');
                    reject(new Error('运动被紧急停止'));
                    return;
                }
                
                if (currentStep >= steps) {
                    clearInterval(moveInterval);
                    this.updateCurrentPosition(targetPosition);
                    this.handleMotionComplete({ success: true });
                    resolve();
                    return;
                }
                
                const step = params.trajectory[currentStep];
                this.updateCurrentPosition({
                    x: step.x,
                    y: step.y,
                    z: step.z
                });
                
                // 更新进度
                this.motionState.progress = (currentStep / steps) * 100;
                
                currentStep++;
            }, 200); // 增加间隔至200ms，便于测试
        });
    }

    /**
     * 处理运动完成
     */
    async handleMotionComplete(message) {
        this.isMoving = false;
        this.motionState.moving = false;
        
        // 记录轨迹完成
        await this.completeTrajectoryRecording();
        
        // 记录最终位置
        await this.recordPosition('automated');
        
        // 触发运动完成事件
        this.emit('motionCompleted', {
            position: this.currentPosition,
            targetPosition: this.motionState.targetPosition,
            success: message.success || true
        });
        
        // 更新统计
        this.stats.totalMovements++;
        this.stats.lastUpdate = new Date().toISOString();
    }

    /**
     * 处理运动错误
     */
    async handleMotionError(message) {
        this.isMoving = false;
        this.motionState.moving = false;
        
        console.error('探头运动错误:', message);
        
        await this.recordTrajectoryError(message.error);
        
        this.emit('error', new Error(message.error));
        this.emit('motionError', message);
    }

    /**
     * 暂停运动
     */
    async pauseMovement() {
        try {
            if (!this.isMoving) {
                throw new Error('探头当前未在运动');
            }
            
            this.motionState.paused = true;
            this.motionState.moving = false;
            
            // 发送暂停命令
            await this.sendControlCommand('pause');
            
            this.emit('motionPaused', {
                position: this.currentPosition,
                timestamp: new Date().toISOString()
            });
            
            // 记录暂停事件
            await this.logOperation('MOTION_PAUSE', { position: this.currentPosition });
            
            return {
                success: true,
                message: '运动已暂停',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 恢复运动
     */
    async resumeMovement() {
        try {
            if (!this.motionState.paused) {
                throw new Error('运动未被暂停');
            }
            
            this.motionState.paused = false;
            this.motionState.moving = true;
            
            // 发送恢复命令
            await this.sendControlCommand('resume');
            
            this.emit('motionResumed', {
                position: this.currentPosition,
                timestamp: new Date().toISOString()
            });
            
            // 记录恢复事件
            await this.logOperation('MOTION_RESUME', { position: this.currentPosition });
            
            return {
                success: true,
                message: '运动已恢复',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 取消运动
     */
    async cancelMovement() {
        try {
            if (!this.isMoving && !this.motionState.paused) {
                throw new Error('探头当前未在运动');
            }
            
            this.motionState.cancelled = true;
            this.isMoving = false;
            this.motionState.moving = false;
            this.motionState.paused = false;
            
            // 发送取消命令
            await this.sendControlCommand('cancel');
            
            // 记录轨迹取消
            await this.cancelTrajectoryRecording();
            
            this.emit('motionCancelled', {
                position: this.currentPosition,
                timestamp: new Date().toISOString()
            });
            
            return {
                success: true,
                message: '运动已取消',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 紧急停止
     */
    async emergencyStop(reason = 'manual') {
        try {
            this.motionState.emergencyStop = true;
            this.isMoving = false;
            this.motionState.moving = false;
            this.motionState.paused = false;
            
            // 发送紧急停止命令
            await this.sendControlCommand('emergency_stop', { reason });
            
            // 记录轨迹紧急停止
            await this.emergencyStopTrajectoryRecording(reason);
            
            this.emit('emergencyStop', {
                position: this.currentPosition,
                reason: reason,
                timestamp: new Date().toISOString()
            });
            
            return {
                success: true,
                message: '紧急停止已触发',
                reason: reason,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 发送控制命令
     */
    async sendControlCommand(command, params = {}) {
        if (!this.serialPort || !this.serialPort.isOpen) {
            // 模拟模式
            console.log(`模拟发送控制命令: ${command}`, params);
            return;
        }
        
        const commandMessage = {
            type: 'control',
            command: command,
            ...params
        };
        
        this.serialPort.write(JSON.stringify(commandMessage) + '\n');
    }

    /**
     * 重置位置
     */
    async resetPosition(options = {}) {
        try {
            const homePosition = options.homePosition || { x: 0, y: 0, z: 0 };
            
            await this.moveToPosition(homePosition, {
                speed: this.config.speed.slow,
                ...options
            });
            
            return {
                success: true,
                message: '位置已重置',
                position: homePosition,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 获取当前位置
     */
    getCurrentPosition() {
        return {
            success: true,
            data: {
                position: { ...this.currentPosition },
                isMoving: this.isMoving,
                motionState: { ...this.motionState },
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * 获取运动状态
     */
    getMotionStatus() {
        return {
            success: true,
            data: {
                moving: this.motionState.moving,
                paused: this.motionState.paused,
                emergencyStop: this.motionState.emergencyStop,
                cancelled: this.motionState.cancelled,
                currentPosition: this.currentPosition,
                targetPosition: this.motionState.targetPosition,
                progress: this.motionState.progress,
                estimatedTime: this.motionState.estimatedTime,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * 获取系统配置
     */
    getConfiguration() {
        return {
            success: true,
            data: {
                config: this.config,
                stats: this.stats,
                version: '1.0.0',
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * 更新配置
     */
    async updateConfiguration(newConfig) {
        try {
            console.log('开始更新配置:', newConfig);
            
            // 验证新配置（这里应该抛出异常如果配置无效）
            this.validateConfiguration(newConfig);
            
            console.log('配置验证通过');
            
            // 更新配置
            this.config = { ...this.config, ...newConfig };
            
            console.log('配置已更新:', this.config);
            
            // 保存到数据库（可选，失败不应该影响配置更新）
            try {
                await this.saveConfiguration();
            } catch (saveError) {
                console.warn('保存配置到数据库失败，但配置已更新:', saveError.message);
            }
            
            this.emit('configurationUpdated', {
                config: this.config,
                timestamp: new Date().toISOString()
            });
            
            console.log('配置更新完成');
            
            return {
                success: true,
                message: '配置已更新',
                config: this.config,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('配置更新失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 验证配置 - 完善版本
     */
    validateConfiguration(config) {
        const errors = [];
        
        // 验证工作区域
        if (config.workArea) {
            const { x, y, z } = config.workArea;
            
            // 验证X轴
            if (x) {
                if (typeof x.min !== 'number' || typeof x.max !== 'number') {
                    errors.push('X轴工作区域边界必须是数字');
                } else {
                    if (x.min >= x.max) {
                        errors.push('X轴工作区域配置无效：最小值必须小于最大值');
                    }
                    if (x.min < 0) {
                        errors.push('X轴工作区域最小值不能为负数');
                    }
                    if (x.max > 10000) {
                        errors.push('X轴工作区域最大值不能超过10000mm');
                    }
                }
            }
            
            // 验证Y轴
            if (y) {
                if (typeof y.min !== 'number' || typeof y.max !== 'number') {
                    errors.push('Y轴工作区域边界必须是数字');
                } else {
                    if (y.min >= y.max) {
                        errors.push('Y轴工作区域配置无效：最小值必须小于最大值');
                    }
                    if (y.min < 0) {
                        errors.push('Y轴工作区域最小值不能为负数');
                    }
                    if (y.max > 10000) {
                        errors.push('Y轴工作区域最大值不能超过10000mm');
                    }
                }
            }
            
            // 验证Z轴
            if (z) {
                if (typeof z.min !== 'number' || typeof z.max !== 'number') {
                    errors.push('Z轴工作区域边界必须是数字');
                } else {
                    if (z.min >= z.max) {
                        errors.push('Z轴工作区域配置无效：最小值必须小于最大值');
                    }
                    if (z.min < 0) {
                        errors.push('Z轴工作区域最小值不能为负数');
                    }
                    if (z.max > 1000) {
                        errors.push('Z轴工作区域最大值不能超过1000mm');
                    }
                }
            }
            
            // 交叉轴验证 - 确保工作区域合理
            if (x && y && z) {
                if (x.max < 50 || y.max < 50 || z.max < 50) {
                    errors.push('工作区域过小，可能影响设备正常运行');
                }
            }
        }
        
        // 验证速度限制
        if (config.speed) {
            const { max, normal, slow, approach } = config.speed;
            
            if (max !== undefined) {
                if (typeof max !== 'number' || max <= 0) {
                    errors.push('最大速度必须为大于0的数字');
                } else if (max > 1000) {
                    errors.push('最大速度不能超过1000mm/s');
                }
            }
            
            if (normal !== undefined) {
                if (typeof normal !== 'number' || normal <= 0) {
                    errors.push('正常速度必须为大于0的数字');
                } else if (normal > 500) {
                    errors.push('正常速度不能超过500mm/s');
                }
            }
            
            if (slow !== undefined) {
                if (typeof slow !== 'number' || slow <= 0) {
                    errors.push('慢速必须为大于0的数字');
                } else if (slow > 100) {
                    errors.push('慢速不能超过100mm/s');
                }
            }
            
            if (approach !== undefined) {
                if (typeof approach !== 'number' || approach <= 0) {
                    errors.push('接近速度必须为大于0的数字');
                } else if (approach > 50) {
                    errors.push('接近速度不能超过50mm/s');
                }
            }
            
            // 速度层级验证
            if (max && normal && max < normal) {
                errors.push('最大速度不能小于正常速度');
            }
            if (normal && slow && normal < slow) {
                errors.push('正常速度不能小于慢速');
            }
            if (slow && approach && slow < approach) {
                errors.push('慢速不能小于接近速度');
            }
        }
        
        // 验证加速度配置
        if (config.acceleration) {
            const { max, normal } = config.acceleration;
            
            if (max !== undefined) {
                if (typeof max !== 'number' || max <= 0) {
                    errors.push('最大加速度必须为大于0的数字');
                } else if (max > 5000) {
                    errors.push('最大加速度不能超过5000mm/s²');
                }
            }
            
            if (normal !== undefined) {
                if (typeof normal !== 'number' || normal <= 0) {
                    errors.push('正常加速度必须为大于0的数字');
                } else if (normal > 2000) {
                    errors.push('正常加速度不能超过2000mm/s²');
                }
            }
            
            if (max && normal && max < normal) {
                errors.push('最大加速度不能小于正常加速度');
            }
        }
        
        // 验证精度配置
        if (config.accuracy) {
            const { positional, angular } = config.accuracy;
            
            if (positional !== undefined) {
                if (typeof positional !== 'number' || positional <= 0) {
                    errors.push('位置精度必须为大于0的数字');
                } else if (positional > 10) {
                    errors.push('位置精度不能超过10mm');
                } else if (positional < 0.01) {
                    errors.push('位置精度不能小于0.01mm');
                }
            }
            
            if (angular !== undefined) {
                if (typeof angular !== 'number' || angular <= 0) {
                    errors.push('角度精度必须为大于0的数字');
                } else if (angular > 90) {
                    errors.push('角度精度不能超过90度');
                } else if (angular < 0.1) {
                    errors.push('角度精度不能小于0.1度');
                }
            }
        }
        
        // 验证安全参数
        if (config.safety) {
            const { emergencyStopTimeout, watchdogTimeout, maxSafeForce, collisionThreshold } = config.safety;
            
            if (emergencyStopTimeout !== undefined) {
                if (typeof emergencyStopTimeout !== 'number' || emergencyStopTimeout <= 0) {
                    errors.push('紧急停止超时必须为大于0的数字');
                } else if (emergencyStopTimeout > 30000) {
                    errors.push('紧急停止超时不能超过30秒');
                }
            }
            
            if (watchdogTimeout !== undefined) {
                if (typeof watchdogTimeout !== 'number' || watchdogTimeout <= 0) {
                    errors.push('看门狗超时必须为大于0的数字');
                } else if (watchdogTimeout > 300000) {
                    errors.push('看门狗超时不能超过5分钟');
                }
            }
            
            if (maxSafeForce !== undefined) {
                if (typeof maxSafeForce !== 'number' || maxSafeForce <= 0) {
                    errors.push('最大安全力必须为大于0的数字');
                } else if (maxSafeForce > 10000) {
                    errors.push('最大安全力不能超过10000N');
                }
            }
            
            if (collisionThreshold !== undefined) {
                if (typeof collisionThreshold !== 'number' || collisionThreshold <= 0) {
                    errors.push('碰撞阈值必须为大于0的数字');
                } else if (collisionThreshold > 10) {
                    errors.push('碰撞阈值不能超过10mm');
                }
            }
        }
        
        // 验证串口配置
        if (config.serialConfig) {
            const { comPort, baudRate } = config.serialConfig;
            
            if (comPort !== undefined) {
                if (typeof comPort !== 'string' || !comPort.trim()) {
                    errors.push('串口名称不能为空');
                } else if (!/^(COM\d+|auto)$/i.test(comPort)) {
                    errors.push('串口名称格式无效，应为COM1、COM2等或auto');
                }
            }
            
            if (baudRate !== undefined) {
                const validBaudRates = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
                if (!validBaudRates.includes(baudRate)) {
                    errors.push(`波特率必须是以下值之一: ${validBaudRates.join(', ')}`);
                }
            }
        }
        
        // 如果有错误，抛出异常
        if (errors.length > 0) {
            const errorMessage = `配置验证失败:\n${errors.map(error => `• ${error}`).join('\n')}`;
            const error = new Error(errorMessage);
            error.validationErrors = errors;
            throw error;
        }
        
        return {
            valid: true,
            warnings: this.getConfigurationWarnings(config)
        };
    }
    
    /**
     * 获取配置警告（不影响验证但建议注意的配置项）
     */
    getConfigurationWarnings(config) {
        const warnings = [];
        
        // 速度配置警告
        if (config.speed) {
            if (config.speed.max > 200) {
                warnings.push('最大速度较高，建议测试设备响应性');
            }
            if (config.speed.normal > config.speed.max * 0.8) {
                warnings.push('正常速度接近最大速度，建议保留安全余量');
            }
        }
        
        // 工作区域警告
        if (config.workArea) {
            const area = (config.workArea.x.max - config.workArea.x.min) * 
                        (config.workArea.y.max - config.workArea.y.min) * 
                        (config.workArea.z.max - config.workArea.z.min);
            if (area > 1000000) {
                warnings.push('工作区域体积较大，请确保设备物理空间充足');
            }
        }
        
        // 精度配置警告
        if (config.accuracy) {
            if (config.accuracy.positional < 0.01) {
                warnings.push('位置精度要求很高，请确认设备能达到此精度');
            }
        }
        
        return warnings;
    }
    
    /**
     * 预验证配置（用于前端实时验证）
     */
    preValidateConfiguration(config) {
        try {
            const result = this.validateConfiguration(config);
            return {
                valid: true,
                warnings: result.warnings || []
            };
        } catch (error) {
            return {
                valid: false,
                errors: error.validationErrors || [error.message],
                warnings: error.warnings || []
            };
        }
    }

    /**
     * 保存配置到数据库
     */
    async saveConfiguration() {
        try {
            for (const [category, settings] of Object.entries(this.config)) {
                for (const [key, value] of Object.entries(settings)) {
                    const fullKey = `${category}_${key}`;
                    const query = `
                        INSERT OR REPLACE INTO system_settings 
                        (category, key, value) 
                        VALUES ('probe_control', ?, ?)
                    `;
                    await this.db.run(query, [fullKey, JSON.stringify(value)]);
                }
            }
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }

    /**
     * 开始轨迹记录
     */
    async startTrajectoryRecording(startPos, endPos, params) {
        this.currentTrajectory = {
            startPosition: startPos,
            endPosition: endPos,
            startTime: new Date(),
            params: params,
            status: 'recording'
        };
    }

    /**
     * 完成轨迹记录
     */
    async completeTrajectoryRecording() {
        if (!this.currentTrajectory) return;
        
        try {
            const duration = (new Date() - this.currentTrajectory.startTime) / 1000;
            
            const query = `
                INSERT INTO probe_trajectories 
                (start_x, start_y, start_z, end_x, end_y, end_z, distance, duration, avg_speed, max_speed, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            await this.db.run(query, [
                this.currentTrajectory.startPosition.x,
                this.currentTrajectory.startPosition.y,
                this.currentTrajectory.startPosition.z,
                this.currentTrajectory.endPosition.x,
                this.currentTrajectory.endPosition.y,
                this.currentTrajectory.endPosition.z,
                this.currentTrajectory.params.distance,
                duration,
                this.currentTrajectory.params.distance / duration,
                this.currentTrajectory.params.speed,
                'completed'
            ]);
            
            this.currentTrajectory = null;
            
        } catch (error) {
            console.error('完成轨迹记录失败:', error);
        }
    }

    /**
     * 取消轨迹记录
     */
    async cancelTrajectoryRecording() {
        if (!this.currentTrajectory) return;
        
        try {
            const duration = (new Date() - this.currentTrajectory.startTime) / 1000;
            
            const query = `
                INSERT INTO probe_trajectories 
                (start_x, start_y, start_z, end_x, end_y, end_z, distance, duration, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            await this.db.run(query, [
                this.currentTrajectory.startPosition.x,
                this.currentTrajectory.startPosition.y,
                this.currentTrajectory.startPosition.z,
                this.currentTrajectory.endPosition.x,
                this.currentTrajectory.endPosition.y,
                this.currentTrajectory.endPosition.z,
                this.currentTrajectory.params.distance,
                duration,
                'cancelled'
            ]);
            
            this.currentTrajectory = null;
            
        } catch (error) {
            console.error('取消轨迹记录失败:', error);
        }
    }

    /**
     * 紧急停止轨迹记录
     */
    async emergencyStopTrajectoryRecording(reason) {
        await this.cancelTrajectoryRecording();
        
        try {
            const query = `
                INSERT INTO probe_operation_logs 
                (operation_type, operation_data, result)
                VALUES (?, ?, ?)
            `;
            
            await this.db.run(query, [
                'EMERGENCY_STOP',
                JSON.stringify({ reason: reason, position: this.currentPosition }),
                'STOPPED'
            ]);
            
        } catch (error) {
            console.error('记录紧急停止失败:', error);
        }
    }

    /**
     * 记录轨迹错误
     */
    async recordTrajectoryError(error) {
        try {
            const query = `
                INSERT INTO probe_trajectories 
                (start_x, start_y, start_z, end_x, end_y, end_z, distance, duration, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            await this.db.run(query, [
                this.currentTrajectory?.startPosition.x || 0,
                this.currentTrajectory?.startPosition.y || 0,
                this.currentTrajectory?.startPosition.z || 0,
                this.currentTrajectory?.endPosition.x || 0,
                this.currentTrajectory?.endPosition.y || 0,
                this.currentTrajectory?.endPosition.z || 0,
                this.currentTrajectory?.params?.distance || 0,
                0,
                'error'
            ]);
            
        } catch (recordError) {
            console.error('记录轨迹错误失败:', recordError);
        }
    }

    /**
     * 记录操作日志 (CFR 21 Part 11)
     */
    async logOperation(operationType, operationData, result = 'success', userId = null, sessionId = null) {
        try {
            const query = `
                INSERT INTO probe_operation_logs 
                (operation_type, operation_data, result, user_id, session_id)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            await this.db.run(query, [
                operationType,
                JSON.stringify(operationData),
                result,
                userId,
                sessionId
            ]);
            
        } catch (error) {
            console.error('记录操作日志失败:', error);
        }
    }

    /**
     * 获取操作历史
     */
    async getOperationHistory(options = {}) {
        try {
            const {
                limit = 100,
                offset = 0,
                operationType = null,
                startTime = null,
                endTime = null
            } = options;
            
            let query = `
                SELECT id, timestamp, operation_type, operation_data, result, user_id, session_id
                FROM probe_operation_logs
                WHERE 1=1
            `;
            
            const params = [];
            
            if (operationType) {
                query += ' AND operation_type = ?';
                params.push(operationType);
            }
            
            if (startTime) {
                query += ' AND timestamp >= ?';
                params.push(startTime);
            }
            
            if (endTime) {
                query += ' AND timestamp <= ?';
                params.push(endTime);
            }
            
            query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            const logs = await this.db.all(query, params);
            
            return {
                success: true,
                data: {
                    logs: logs.map(log => ({
                        ...log,
                        operation_data: JSON.parse(log.operation_data)
                    })),
                    pagination: {
                        total: await this.getOperationCount(options),
                        limit,
                        offset
                    }
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取操作数量
     */
    async getOperationCount(options = {}) {
        try {
            const { operationType = null, startTime = null, endTime = null } = options;
            
            let query = 'SELECT COUNT(*) as count FROM probe_operation_logs WHERE 1=1';
            const params = [];
            
            if (operationType) {
                query += ' AND operation_type = ?';
                params.push(operationType);
            }
            
            if (startTime) {
                query += ' AND timestamp >= ?';
                params.push(startTime);
            }
            
            if (endTime) {
                query += ' AND timestamp <= ?';
                params.push(endTime);
            }
            
            const result = await this.db.get(query, params);
            return result.count;
            
        } catch (error) {
            return 0;
        }
    }

    /**
     * 断开连接
     */
    async disconnect() {
        try {
            // 停止当前运动
            if (this.isMoving) {
                await this.cancelMovement();
            }
            
            // 关闭串口
            if (this.serialPort) {
                this.serialPort.close();
            }
            
            this.isConnected = false;
            
            this.emit('disconnected', {
                timestamp: new Date().toISOString()
            });
            
            return {
                success: true,
                message: '探头控制系统已断开',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 工具函数：限制数值范围
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    /**
     * 工具函数：验证坐标值
     */
    isValidCoordinate(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }
    
    /**
     * 获取边界状态详细信息
     */
    getBoundaryStatus(position) {
        const status = {
            x: { value: position.x, min: this.config.workArea.x.min, max: this.config.workArea.x.max, valid: true },
            y: { value: position.y, min: this.config.workArea.y.min, max: this.config.workArea.y.max, valid: true },
            z: { value: position.z, min: this.config.workArea.z.min, max: this.config.workArea.z.max, valid: true },
            valid: true
        };
        
        // 检查X坐标
        if (position.x < this.config.workArea.x.min) {
            status.x.valid = false;
            status.x.issue = 'below_min';
        } else if (position.x > this.config.workArea.x.max) {
            status.x.valid = false;
            status.x.issue = 'above_max';
        }
        
        // 检查Y坐标
        if (position.y < this.config.workArea.y.min) {
            status.y.valid = false;
            status.y.issue = 'below_min';
        } else if (position.y > this.config.workArea.y.max) {
            status.y.valid = false;
            status.y.issue = 'above_max';
        }
        
        // 检查Z坐标
        if (position.z < this.config.workArea.z.min) {
            status.z.valid = false;
            status.z.issue = 'below_min';
        } else if (position.z > this.config.workArea.z.max) {
            status.z.valid = false;
            status.z.issue = 'above_max';
        }
        
        // 总体有效性
        status.valid = status.x.valid && status.y.valid && status.z.valid;
        
        return status;
    }
    
    /**
     * 智能位置调整建议
     */
    suggestPositionAdjustment(position) {
        const boundaryStatus = this.getBoundaryStatus(position);
        const adjusted = { ...position };
        const adjustments = [];
        
        // X轴调整建议
        if (!boundaryStatus.x.valid) {
            if (boundaryStatus.x.issue === 'below_min') {
                adjustments.push(`X轴建议调整至最小值 ${boundaryStatus.x.min}`);
                adjusted.x = boundaryStatus.x.min;
            } else {
                adjustments.push(`X轴建议调整至最大值 ${boundaryStatus.x.max}`);
                adjusted.x = boundaryStatus.x.max;
            }
        }
        
        // Y轴调整建议
        if (!boundaryStatus.y.valid) {
            if (boundaryStatus.y.issue === 'below_min') {
                adjustments.push(`Y轴建议调整至最小值 ${boundaryStatus.y.min}`);
                adjusted.y = boundaryStatus.y.min;
            } else {
                adjustments.push(`Y轴建议调整至最大值 ${boundaryStatus.y.max}`);
                adjusted.y = boundaryStatus.y.max;
            }
        }
        
        // Z轴调整建议
        if (!boundaryStatus.z.valid) {
            if (boundaryStatus.z.issue === 'below_min') {
                adjustments.push(`Z轴建议调整至最小值 ${boundaryStatus.z.min}`);
                adjusted.z = boundaryStatus.z.min;
            } else {
                adjustments.push(`Z轴建议调整至最大值 ${boundaryStatus.z.max}`);
                adjusted.z = boundaryStatus.z.max;
            }
        }
        
        return {
            original: position,
            adjusted: adjusted,
            adjustments: adjustments,
            canAdjust: adjustments.length > 0
        };
    }
}

module.exports = ProbeControlService;