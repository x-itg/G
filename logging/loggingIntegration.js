/**
 * 日志管理系统集成模块
 * 将日志轮转、归档和清理系统集成到放射化学纯度检测仪主应用中
 */

const { createLogManager } = require('./logManager');
const { LogTaskScheduler } = require('./taskScheduler');
const loggingRoutes = require('./loggingRoutes');

/**
 * 日志系统集成器
 */
class LoggingSystemIntegrator {
    constructor(app, options = {}) {
        this.app = app;
        this.options = options;
        this.logManager = null;
        this.taskScheduler = null;
        this.isInitialized = false;
        
        // 绑定事件处理器
        this.eventHandlers = new Map();
    }

    /**
     * 初始化日志系统
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('日志系统已初始化');
            return;
        }

        try {
            console.log('🚀 初始化日志管理系统...');

            // 创建日志管理器
            this.logManager = createLogManager(this.options.logManager);
            
            // 等待初始化完成
            await new Promise(resolve => {
                if (this.logManager.isInitialized) {
                    resolve();
                } else {
                    this.logManager.once('initialized', resolve);
                }
            });

            // 创建任务调度器
            if (this.options.enableScheduler !== false) {
                this.taskScheduler = new LogTaskScheduler(this.options.scheduler);
            }

            // 集成到应用
            await this.integrateWithApplication();
            
            // 启动定时任务
            if (this.taskScheduler) {
                await this.taskScheduler.start();
            }

            // 设置事件监听
            this.setupEventHandlers();

            this.isInitialized = true;
            
            console.log('✅ 日志管理系统初始化完成');
            
        } catch (error) {
            console.error('❌ 日志管理系统初始化失败:', error);
            throw error;
        }
    }

    /**
     * 集成到主应用
     */
    async integrateWithApplication() {
        // 添加API路由
        if (this.app) {
            // 添加基础路径
            this.app.use('/api/logging', loggingRoutes);
            
            // 添加到主数据库管理器的集成点
            this.integrateWithDatabaseManager();
            
            console.log('✅ 日志API路由已集成');
        }

        // 添加到系统设置中
        this.addToSystemSettings();
    }

    /**
     * 集成到数据库管理器
     */
    integrateWithDatabaseManager() {
        try {
            // 尝试导入数据库管理器
            const { SimplifiedDatabaseManager } = require('../database/SimplifiedDatabaseManager');
            
            if (SimplifiedDatabaseManager) {
                // 添加日志记录方法到数据库管理器
                SimplifiedDatabaseManager.prototype.recordLog = async function(logType, level, message, metadata = {}) {
                    try {
                        const logEntry = {
                            type: logType,
                            level,
                            message,
                            metadata,
                            timestamp: new Date().toISOString(),
                            source: 'database-manager'
                        };
                        
                        // 记录到日志系统
                        if (this.logManager) {
                            await this.logManager.getLogInstance(logType).write(logEntry);
                        }
                        
                        // 同时记录到数据库
                        const logTable = this.database.prepare(`
                            INSERT INTO system_logs (type, level, message, metadata, timestamp, source)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `);
                        
                        logTable.run(
                            logEntry.type,
                            logEntry.level,
                            logEntry.message,
                            JSON.stringify(logEntry.metadata),
                            logEntry.timestamp,
                            logEntry.source
                        );
                        
                    } catch (error) {
                        console.error('记录日志到数据库失败:', error);
                    }
                };

                console.log('✅ 数据库管理器日志集成完成');
            }
        } catch (error) {
            console.warn('数据库管理器集成失败:', error.message);
        }
    }

    /**
     * 添加到系统设置
     */
    addToSystemSettings() {
        try {
            // 读取现有系统设置
            const settingsPath = require('path').join(__dirname, '../config/system-settings.json');
            const fs = require('fs');
            
            if (fs.existsSync(settingsPath)) {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
                
                // 添加日志管理配置
                settings.logging = {
                    enabled: true,
                    rotation: {
                        maxFileSize: 100 * 1024 * 1024, // 100MB
                        dailyRotation: true,
                        compressionEnabled: true
                    },
                    retention: {
                        audit: 730, // 2年
                        error: 365, // 1年
                        access: 180, // 6个月
                        system: 90  // 3个月
                    },
                    storage: {
                        maxSize: 10 * 1024 * 1024 * 1024, // 10GB
                        cleanupThreshold: 0.85
                    }
                };
                
                // 写回文件
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
                console.log('✅ 系统设置已更新');
            }
        } catch (error) {
            console.warn('系统设置集成失败:', error.message);
        }
    }

    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        // 日志轮转事件
        this.logManager.on('logRotated', (data) => {
            console.log(`📄 日志轮转完成: ${data.logType}, 轮转了 ${data.results.length} 个文件`);
            this.logToDatabase('system', 'info', '日志轮转完成', data);
        });

        // 日志清理事件
        this.logManager.on('logsCleaned', (data) => {
            console.log(`🧹 日志清理完成: ${data.logType}, 清理了 ${data.results.length} 个类型`);
            this.logToDatabase('system', 'info', '日志清理完成', data);
        });

        // 日志备份事件
        this.logManager.on('logsBackedUp', (data) => {
            console.log(`💾 日志备份完成: 备份了 ${data.backupInfo.totalFiles} 个文件`);
            this.logToDatabase('system', 'info', '日志备份完成', data.backupInfo);
        });

        // 日志恢复事件
        this.logManager.on('logsRestored', (data) => {
            console.log(`🔄 日志恢复完成: 恢复了 ${data.restoreInfo.restoredFiles} 个文件`);
            this.logToDatabase('system', 'info', '日志恢复完成', data.restoreInfo);
        });

        // 错误事件
        this.logManager.on('rotationError', (error) => {
            console.error('❌ 日志轮转错误:', error);
            this.logToDatabase('system', 'error', '日志轮转错误', { error: error.message });
        });

        this.logManager.on('cleanupError', (error) => {
            console.error('❌ 日志清理错误:', error);
            this.logToDatabase('system', 'error', '日志清理错误', { error: error.message });
        });

        // 任务调度器事件
        if (this.taskScheduler) {
            this.taskScheduler.on('taskSuccess', (data) => {
                console.log(`✅ 任务执行成功: ${data.taskName}`);
            });

            this.taskScheduler.on('taskFailure', (data) => {
                console.error(`❌ 任务执行失败: ${data.taskName}, 错误: ${data.error}`);
                this.logToDatabase('system', 'error', '任务执行失败', data);
            });
        }
    }

    /**
     * 记录日志到数据库
     */
    async logToDatabase(logType, level, message, metadata = {}) {
        try {
            // 这里可以集成到数据库中
            // 暂时使用console记录
            console.log(`[DB-LOG] ${logType}:${level} ${message}`, metadata);
        } catch (error) {
            console.error('记录到数据库失败:', error);
        }
    }

    /**
     * 获取日志系统状态
     */
    async getStatus() {
        const status = {
            initialized: this.isInitialized,
            logManager: null,
            taskScheduler: null,
            timestamp: new Date()
        };

        try {
            if (this.logManager) {
                status.logManager = await this.logManager.getStatus();
            }

            if (this.taskScheduler) {
                status.taskScheduler = this.taskScheduler.getTaskStatus();
            }
        } catch (error) {
            status.error = error.message;
        }

        return status;
    }

    /**
     * 执行手动操作
     */
    async performAction(action, options = {}) {
        if (!this.isInitialized) {
            throw new Error('日志系统未初始化');
        }

        switch (action) {
            case 'rotate':
                return await this.logManager.rotateLog(options.logType || 'all');
            
            case 'cleanup':
                return await this.logManager.cleanupLogs(options.logType || 'all');
            
            case 'backup':
                return await this.logManager.backupLogs(options);
            
            case 'restore':
                return await this.logManager.restoreLogs(options.backupPath);
            
            case 'stats':
                return await this.logManager.getLogStats();
            
            case 'health':
                return await this.logManager.healthCheck();
            
            case 'search':
                return await this.logManager.searchLogs(options.query, options);
            
            default:
                throw new Error(`不支持的操作: ${action}`);
        }
    }

    /**
     * 获取配置信息
     */
    getConfig() {
        return {
            logManager: this.logManager?.config,
            taskScheduler: this.taskScheduler?.getConfig(),
            integrated: this.isInitialized
        };
    }

    /**
     * 停止日志系统
     */
    async shutdown() {
        try {
            console.log('🔄 停止日志管理系统...');

            if (this.taskScheduler) {
                await this.taskScheduler.cleanup();
            }

            if (this.logManager) {
                await this.logManager.cleanup();
            }

            this.isInitialized = false;
            
            console.log('✅ 日志管理系统已停止');
            
        } catch (error) {
            console.error('❌ 停止日志管理系统失败:', error);
        }
    }
}

/**
 * 日志系统中间件
 */
function loggingMiddleware(options = {}) {
    return (req, res, next) => {
        const startTime = Date.now();
        
        // 记录请求开始
        const logData = {
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            timestamp: new Date().toISOString()
        };

        // 响应结束时记录
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            
            logData.statusCode = res.statusCode;
            logData.duration = duration;
            logData.responseSize = res.get('Content-Length') || 0;

            // 记录到日志系统
            if (global.logManager) {
                const level = res.statusCode >= 400 ? 'error' : 
                            res.statusCode >= 300 ? 'warn' : 'info';
                
                global.logManager.getLogInstance('access').write({
                    ...logData,
                    level,
                    type: 'http-request'
                });
            }
        });

        next();
    };
}

/**
 * 初始化日志系统
 */
async function initializeLoggingSystem(app, options = {}) {
    const integrator = new LoggingSystemIntegrator(app, options);
    await integrator.initialize();
    
    // 设置为全局变量，供中间件使用
    global.logManager = integrator.logManager;
    
    return integrator;
}

/**
 * 创建日志记录器
 */
function createLogger(moduleName, options = {}) {
    return {
        debug: (message, metadata = {}) => log('debug', message, metadata),
        info: (message, metadata = {}) => log('info', message, metadata),
        warn: (message, metadata = {}) => log('warn', message, metadata),
        error: (message, metadata = {}) => log('error', message, metadata),
        fatal: (message, metadata = {}) => log('fatal', message, metadata)
    };

    function log(level, message, metadata) {
        if (global.logManager) {
            const logData = {
                level,
                message,
                metadata: {
                    ...metadata,
                    module: moduleName,
                    timestamp: new Date().toISOString()
                }
            };

            global.logManager.getLogInstance('system').write(logData);
        } else {
            console[level](`[${moduleName}] ${message}`, metadata);
        }
    }
}

module.exports = {
    LoggingSystemIntegrator,
    loggingMiddleware,
    initializeLoggingSystem,
    createLogger
};