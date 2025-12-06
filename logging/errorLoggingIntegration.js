const ErrorLogger = require('./errorLogger');
const ErrorHandlerMiddleware = require('./errorHandlerMiddleware');

/**
 * 错误日志系统集成器
 * 将错误日志功能集成到SimplifiedDatabaseManager和其他系统组件中
 */
class ErrorLoggingIntegration {
    constructor(options = {}) {
        this.errorLogger = options.errorLogger || ErrorLogger.getInstance();
        this.errorHandler = options.errorHandler || new ErrorHandlerMiddleware({
            errorLogger: this.errorLogger
        });
        this.dbManager = options.dbManager;
        this.isInitialized = false;
    }

    /**
     * 初始化错误日志系统集成
     */
    async initialize() {
        try {
            console.log('🔄 初始化错误日志系统集成...');

            // 集成到数据库管理器
            if (this.dbManager) {
                await this.integrateWithDatabaseManager(this.dbManager);
            }

            // 设置全局错误处理器
            this.errorHandler.setupGlobalHandlers();

            // 创建错误日志表
            await this.createErrorLoggingTables();

            this.isInitialized = true;
            console.log('✅ 错误日志系统集成初始化完成');

        } catch (error) {
            console.error('❌ 错误日志系统集成初始化失败:', error);
            throw error;
        }
    }

    /**
     * 集成到数据库管理器
     */
    async integrateWithDatabaseManager(dbManager) {
        try {
            // 为数据库操作添加错误处理
            const originalMethods = {
                readTable: dbManager.readTable.bind(dbManager),
                writeTable: dbManager.writeTable.bind(dbManager),
                addRecord: dbManager.addRecord.bind(dbManager),
                updateRecord: dbManager.updateRecord.bind(dbManager),
                getRecord: dbManager.getRecord.bind(dbManager)
            };

            // 重写方法以包含错误处理
            dbManager.readTable = this.wrapWithErrorHandling(
                originalMethods.readTable, 
                'readTable', 
                dbManager
            );

            dbManager.writeTable = this.wrapWithErrorHandling(
                originalMethods.writeTable, 
                'writeTable', 
                dbManager
            );

            dbManager.addRecord = this.wrapWithErrorHandling(
                originalMethods.addRecord, 
                'addRecord', 
                dbManager
            );

            dbManager.updateRecord = this.wrapWithErrorHandling(
                originalMethods.updateRecord, 
                'updateRecord', 
                dbManager
            );

            dbManager.getRecord = this.wrapWithErrorHandling(
                originalMethods.getRecord, 
                'getRecord', 
                dbManager
            );

            // 添加错误日志记录方法
            dbManager.logError = async (errorData) => {
                return await this.errorLogger.logError(errorData);
            };

            dbManager.getErrorLogs = (filters) => {
                return this.errorLogger.getErrorLogs(filters);
            };

            dbManager.getErrorStatistics = (filters) => {
                return this.errorLogger.getErrorStatistics(filters);
            };

            dbManager.resolveError = (errorId, resolvedBy, resolution) => {
                return this.errorLogger.resolveError(errorId, resolvedBy, resolution);
            };

            // 为数据库连接添加监控
            this.setupDatabaseConnectionMonitoring(dbManager);

            console.log('✅ 数据库管理器错误处理集成完成');

        } catch (error) {
            console.error('❌ 数据库管理器集成失败:', error);
            throw error;
        }
    }

    /**
     * 用错误处理包装方法
     */
    wrapWithErrorHandling(originalMethod, methodName, context) {
        return async (...args) => {
            try {
                return await originalMethod(...args);
            } catch (error) {
                // 记录数据库错误
                await this.errorLogger.logError({
                    level: 'error',
                    message: `数据库操作失败 (${methodName}): ${error.message}`,
                    stack: error.stack,
                    source: 'database',
                    code: error.code || 'DATABASE_ERROR',
                    context: {
                        method: methodName,
                        arguments: this.sanitizeArguments(args),
                        databasePath: context.dbPath
                    },
                    metadata: {
                        operation: methodName,
                        tablePath: args[0] // 通常第一个参数是表名
                    }
                });

                throw error;
            }
        };
    }

    /**
     * 清理参数（移除敏感信息）
     */
    sanitizeArguments(args) {
        if (!args || args.length === 0) return args;
        
        return args.map(arg => {
            if (typeof arg === 'string' && (arg.includes('password') || arg.includes('token'))) {
                return '[REDACTED]';
            }
            if (typeof arg === 'object') {
                const sanitized = { ...arg };
                const sensitiveFields = ['password', 'token', 'secret', 'key'];
                sensitiveFields.forEach(field => {
                    if (sanitized[field]) {
                        sanitized[field] = '[REDACTED]';
                    }
                });
                return sanitized;
            }
            return arg;
        });
    }

    /**
     * 设置数据库连接监控
     */
    setupDatabaseConnectionMonitoring(dbManager) {
        // 监控文件锁超时
        const originalAcquireLock = dbManager.acquireLock.bind(dbManager);
        dbManager.acquireLock = async (tableName, timeout = 5000) => {
            const startTime = Date.now();
            try {
                const result = await originalAcquireLock(tableName, timeout);
                const duration = Date.now() - startTime;
                
                if (duration > timeout * 0.8) {
                    await this.errorLogger.logError({
                        level: 'warning',
                        message: `数据库锁获取时间过长: ${tableName}`,
                        source: 'database',
                        code: 'LOCK_TIMEOUT_WARNING',
                        context: {
                            tableName,
                            timeout,
                            actualDuration: duration
                        }
                    });
                }
                
                return result;
            } catch (error) {
                await this.errorLogger.logError({
                    level: 'error',
                    message: `数据库锁获取失败: ${tableName}`,
                    stack: error.stack,
                    source: 'database',
                    code: 'LOCK_ACQUIRE_FAILED',
                    context: {
                        tableName,
                        timeout
                    }
                });
                
                throw error;
            }
        };

        // 监控原子写入操作
        const originalAtomicWrite = dbManager.atomicWrite.bind(dbManager);
        dbManager.atomicWrite = async (filePath, data) => {
            try {
                return await originalAtomicWrite(filePath, data);
            } catch (error) {
                await this.errorLogger.logError({
                    level: 'error',
                    message: `原子写入失败: ${filePath}`,
                    stack: error.stack,
                    source: 'database',
                    code: 'ATOMIC_WRITE_FAILED',
                    context: {
                        filePath,
                        dataSize: data ? data.length : 0
                    }
                });
                
                throw error;
            }
        };
    }

    /**
     * 创建错误日志相关的数据表
     */
    async createErrorLoggingTables() {
        try {
            if (this.dbManager) {
                // 创建错误日志表
                const errorLogsTableExists = this.tableExists('error_logs');
                if (!errorLogsTableExists) {
                    await this.dbManager.addRecord('system_tables', {
                        table_name: 'error_logs',
                        description: '系统错误日志表',
                        created_at: new Date().toISOString()
                    });
                }

                // 创建错误统计表
                const errorStatsTableExists = this.tableExists('error_statistics');
                if (!errorStatsTableExists) {
                    await this.dbManager.addRecord('system_tables', {
                        table_name: 'error_statistics',
                        description: '错误统计表',
                        created_at: new Date().toISOString()
                    });
                }

                // 创建错误通知表
                const errorNotificationsTableExists = this.tableExists('error_notifications');
                if (!errorNotificationsTableExists) {
                    await this.dbManager.addRecord('system_tables', {
                        table_name: 'error_notifications',
                        description: '错误通知表',
                        created_at: new Date().toISOString()
                    });
                }
            }

            console.log('✅ 错误日志数据表创建完成');

        } catch (error) {
            console.error('❌ 创建错误日志数据表失败:', error);
        }
    }

    /**
     * 检查表是否存在
     */
    tableExists(tableName) {
        try {
            if (this.dbManager) {
                const records = this.dbManager.getRecords('system_tables', { table_name: tableName });
                return records.length > 0;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * 创建Express错误处理中间件
     */
    createExpressMiddleware() {
        return this.errorHandler.errorHandler.bind(this.errorHandler);
    }

    /**
     * 获取异步错误处理包装器
     */
    getAsyncErrorHandler(handler) {
        return this.errorHandler.asyncErrorHandler(handler);
    }

    /**
     * 获取同步错误处理包装器
     */
    getSyncErrorHandler(handler) {
        return this.errorHandler.syncErrorHandler(handler);
    }

    /**
     * 记录应用程序启动错误
     */
    async logApplicationStartup() {
        try {
            await this.errorLogger.logError({
                level: 'info',
                message: '应用程序启动',
                source: 'application',
                code: 'APP_STARTUP',
                context: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    pid: process.pid,
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage()
                },
                metadata: {
                    environment: process.env.NODE_ENV || 'development',
                    args: process.argv.slice(2)
                }
            });
        } catch (error) {
            console.error('记录应用程序启动错误失败:', error);
        }
    }

    /**
     * 记录应用程序关闭
     */
    async logApplicationShutdown(reason = 'Normal shutdown') {
        try {
            await this.errorLogger.logError({
                level: 'info',
                message: `应用程序关闭: ${reason}`,
                source: 'application',
                code: 'APP_SHUTDOWN',
                context: {
                    reason: reason,
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    pid: process.pid,
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage()
                }
            });
        } catch (error) {
            console.error('记录应用程序关闭失败:', error);
        }
    }

    /**
     * 设置进程信号处理
     */
    setupProcessSignalHandlers() {
        const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
        
        signals.forEach(signal => {
            process.on(signal, async (code) => {
                await this.logApplicationShutdown(`Received ${signal} signal`);
                
                // 优雅关闭
                setTimeout(() => {
                    process.exit(code);
                }, 1000);
            });
        });

        // 优雅关闭处理
        process.on('exit', async (code) => {
            console.log(`应用程序退出，退出码: ${code}`);
        });
    }

    /**
     * 获取错误日志集成状态
     */
    getIntegrationStatus() {
        return {
            initialized: this.isInitialized,
            errorLoggerAvailable: !!this.errorLogger,
            errorHandlerAvailable: !!this.errorHandler,
            databaseIntegrated: !!this.dbManager,
            globalHandlersSetup: true
        };
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            await this.logApplicationShutdown('Cleanup initiated');
            console.log('✅ 错误日志系统清理完成');
        } catch (error) {
            console.error('❌ 错误日志系统清理失败:', error);
        }
    }
}

module.exports = ErrorLoggingIntegration;