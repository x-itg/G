const ErrorLogger = require('./errorLogger');
const ErrorLoggingRoutes = require('./errorLoggingRoutes');
const ErrorHandlerMiddleware = require('./errorHandlerMiddleware');
const ErrorLoggingIntegration = require('./errorLoggingIntegration');

/**
 * 错误日志系统主入口
 * 提供统一的错误日志管理接口
 */
class ErrorLoggingSystem {
    constructor(options = {}) {
        this.options = options;
        this.errorLogger = null;
        this.errorHandler = null;
        this.errorRoutes = null;
        this.integration = null;
        this.isInitialized = false;
    }

    /**
     * 初始化错误日志系统
     */
    async initialize() {
        try {
            console.log('🔄 初始化系统错误日志和异常处理系统...');

            // 1. 初始化错误日志器
            this.errorLogger = new ErrorLogger({
                dbManager: this.options.dbManager,
                logPath: this.options.logPath || path.join(__dirname, 'data'),
                maxRetries: this.options.maxRetries || 3,
                alertThresholds: this.options.alertThresholds || {
                    errorRate: 10,
                    criticalErrors: 5,
                    responseTime: 5000
                }
            });

            // 2. 初始化错误处理器
            this.errorHandler = new ErrorHandlerMiddleware({
                errorLogger: this.errorLogger,
                logErrors: this.options.logErrors !== false,
                respondWithError: this.options.respondWithError !== false
            });

            // 3. 初始化API路由
            this.errorRoutes = new ErrorLoggingRoutes({
                errorLogger: this.errorLogger
            });

            // 4. 初始化系统集成
            this.integration = new ErrorLoggingIntegration({
                errorLogger: this.errorLogger,
                errorHandler: this.errorHandler,
                dbManager: this.options.dbManager
            });

            // 5. 执行集成初始化
            await this.integration.initialize();

            // 6. 设置全局错误处理器
            this.setupGlobalErrorHandlers();

            // 7. 记录系统启动
            await this.integration.logApplicationStartup();

            this.isInitialized = true;
            console.log('✅ 系统错误日志和异常处理系统初始化完成');

        } catch (error) {
            console.error('❌ 系统错误日志和异常处理系统初始化失败:', error);
            throw error;
        }
    }

    /**
     * 设置全局错误处理器
     */
    setupGlobalErrorHandlers() {
        // 全局未捕获异常处理
        process.on('uncaughtException', async (error) => {
            console.error('🚨 未捕获的异常:', error);
            
            if (this.errorLogger) {
                await this.errorLogger.logError({
                    level: 'critical',
                    message: `未捕获的异常: ${error.message}`,
                    stack: error.stack,
                    source: 'process',
                    code: 'UNCAUGHT_EXCEPTION',
                    context: {
                        processId: process.pid,
                        nodeVersion: process.version,
                        memoryUsage: process.memoryUsage(),
                        uptime: process.uptime()
                    }
                });
            }

            // 记录后退出
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        // 未处理的Promise拒绝
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('🚨 未处理的Promise拒绝:', reason);
            
            if (this.errorLogger) {
                await this.errorLogger.logError({
                    level: 'error',
                    message: `未处理的Promise拒绝: ${reason}`,
                    stack: reason instanceof Error ? reason.stack : new Error(reason).stack,
                    source: 'promise',
                    code: 'UNHANDLED_REJECTION',
                    context: {
                        promise: promise.toString(),
                        processId: process.pid
                    }
                });
            }
        });

        // 进程警告
        process.on('warning', async (warning) => {
            console.warn('⚠️ 进程警告:', warning.name, warning.message);
            
            if (this.errorLogger) {
                await this.errorLogger.logError({
                    level: 'warning',
                    message: `进程警告: ${warning.name} - ${warning.message}`,
                    stack: warning.stack,
                    source: 'process_warning',
                    code: warning.code || 'PROCESS_WARNING',
                    context: {
                        warningName: warning.name,
                        processId: process.pid
                    }
                });
            }
        });
    }

    /**
     * 获取Express路由
     */
    getRoutes() {
        if (!this.errorRoutes) {
            throw new Error('错误日志系统尚未初始化');
        }
        return this.errorRoutes.getRouter();
    }

    /**
     * 获取Express错误处理中间件
     */
    getErrorMiddleware() {
        if (!this.errorHandler) {
            throw new Error('错误日志系统尚未初始化');
        }
        return this.errorHandler.errorHandler.bind(this.errorHandler);
    }

    /**
     * 记录错误
     */
    async logError(errorData) {
        if (!this.errorLogger) {
            throw new Error('错误日志系统尚未初始化');
        }
        return await this.errorLogger.logError(errorData);
    }

    /**
     * 获取错误日志
     */
    getErrorLogs(filters = {}) {
        if (!this.errorLogger) {
            throw new Error('错误日志系统尚未初始化');
        }
        return this.errorLogger.getErrorLogs(filters);
    }

    /**
     * 搜索错误日志
     */
    searchErrors(query, filters = {}) {
        if (!this.errorLogger) {
            throw new Error('错误日志系统尚未初始化');
        }
        return this.errorLogger.searchErrors(query, filters);
    }

    /**
     * 获取错误统计
     */
    getErrorStatistics(filters = {}) {
        if (!this.errorLogger) {
            throw new Error('错误日志系统尚未初始化');
        }
        return this.errorLogger.getErrorStatistics(filters);
    }

    /**
     * 导出错误日志
     */
    exportErrorLogs(filters = {}, format = 'json') {
        if (!this.errorLogger) {
            throw new Error('错误日志系统尚未初始化');
        }
        return this.errorLogger.exportErrorLogs(filters, format);
    }

    /**
     * 标记错误为已解决
     */
    async resolveError(errorId, resolvedBy, resolution = '') {
        if (!this.errorLogger) {
            throw new Error('错误日志系统尚未初始化');
        }
        return await this.errorLogger.resolveError(errorId, resolvedBy, resolution);
    }

    /**
     * 获取最近的错误
     */
    getRecentErrors(limit = 50) {
        if (!this.errorLogger) {
            throw new Error('错误日志系统尚未初始化');
        }
        return this.errorLogger.getErrorLogs({ limit });
    }

    /**
     * 获取错误聚合数据
     */
    getErrorAggregation() {
        if (!this.errorLogger) {
            throw new Error('错误日志系统尚未初始化');
        }
        return Array.from(this.errorLogger.errorAggregation.values());
    }

    /**
     * 获取最近的告警通知
     */
    getRecentNotifications(limit = 20) {
        if (!this.errorLogger) {
            throw new Error('错误日志系统尚未初始化');
        }
        return this.errorLogger.getRecentNotifications(limit);
    }

    /**
     * 清理旧日志
     */
    async cleanupOldLogs(daysToKeep = 30) {
        if (!this.errorLogger) {
            throw new Error('错误日志系统尚未初始化');
        }
        return await this.errorLogger.cleanupOldLogs(daysToKeep);
    }

    /**
     * 创建测试错误
     */
    async createTestError(type = 'error') {
        const testErrors = {
            error: {
                level: 'error',
                message: '这是一个测试错误',
                source: 'test',
                code: 'TEST_ERROR'
            },
            warning: {
                level: 'warning',
                message: '这是一个测试警告',
                source: 'test',
                code: 'TEST_WARNING'
            },
            critical: {
                level: 'critical',
                message: '这是一个测试关键错误',
                source: 'test',
                code: 'TEST_CRITICAL'
            },
            database: {
                level: 'error',
                message: '数据库连接测试失败',
                source: 'database',
                code: 'DATABASE_CONNECTION_FAILED',
                context: {
                    database: 'test_db',
                    host: 'localhost',
                    port: 5432
                }
            },
            api: {
                level: 'error',
                message: 'API调用测试失败',
                source: 'api',
                code: 'API_CALL_FAILED',
                context: {
                    url: 'https://api.example.com/test',
                    method: 'GET',
                    statusCode: 500
                }
            }
        };

        const testError = testErrors[type] || testErrors.error;
        return await this.logError(testError);
    }

    /**
     * 运行系统诊断
     */
    async runDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            system: {
                initialized: this.isInitialized,
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            },
            errorLogger: {
                available: !!this.errorLogger,
                aggregationSize: this.errorLogger ? this.errorLogger.errorAggregation.size : 0
            },
            errorHandler: {
                available: !!this.errorHandler
            },
            integration: this.integration ? this.integration.getIntegrationStatus() : null,
            recentErrors: this.getRecentErrors(10),
            errorStatistics: this.getErrorStatistics(),
            testResults: await this.runBasicTests()
        };

        return diagnostics;
    }

    /**
     * 运行基本测试
     */
    async runBasicTests() {
        const tests = {
            logging: { status: 'unknown', message: '' },
            statistics: { status: 'unknown', message: '' },
            search: { status: 'unknown', message: '' },
            export: { status: 'unknown', message: '' }
        };

        try {
            // 测试日志记录
            const errorId = await this.createTestError('error');
            tests.logging = {
                status: errorId ? 'pass' : 'fail',
                message: errorId ? '错误日志记录成功' : '错误日志记录失败'
            };
        } catch (error) {
            tests.logging = {
                status: 'fail',
                message: `错误日志记录测试失败: ${error.message}`
            };
        }

        try {
            // 测试统计
            const stats = this.getErrorStatistics();
            tests.statistics = {
                status: stats ? 'pass' : 'fail',
                message: stats ? '错误统计获取成功' : '错误统计获取失败'
            };
        } catch (error) {
            tests.statistics = {
                status: 'fail',
                message: `错误统计测试失败: ${error.message}`
            };
        }

        try {
            // 测试搜索
            const searchResults = this.searchErrors('test');
            tests.search = {
                status: searchResults ? 'pass' : 'fail',
                message: `错误搜索测试完成，找到 ${searchResults.length} 条记录`
            };
        } catch (error) {
            tests.search = {
                status: 'fail',
                message: `错误搜索测试失败: ${error.message}`
            };
        }

        try {
            // 测试导出
            const exportedData = this.exportErrorLogs({}, 'json');
            tests.export = {
                status: exportedData ? 'pass' : 'fail',
                message: exportedData ? '错误导出功能正常' : '错误导出功能异常'
            };
        } catch (error) {
            tests.export = {
                status: 'fail',
                message: `错误导出测试失败: ${error.message}`
            };
        }

        return tests;
    }

    /**
     * 获取系统状态
     */
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            recentErrors: this.getRecentErrors(5),
            errorCount: this.getErrorStatistics().total,
            criticalErrors: this.getErrorStatistics().by_level?.critical || 0,
            resolvedErrors: this.getErrorStatistics().resolved,
            unresolvedErrors: this.getErrorStatistics().unresolved
        };
    }

    /**
     * 关闭错误日志系统
     */
    async shutdown() {
        try {
            console.log('🔄 关闭系统错误日志和异常处理系统...');
            
            if (this.integration) {
                await this.integration.cleanup();
            }
            
            if (this.errorLogger) {
                await this.errorLogger.logError({
                    level: 'info',
                    message: '错误日志系统已关闭',
                    source: 'system',
                    code: 'SYSTEM_SHUTDOWN'
                });
            }
            
            console.log('✅ 系统错误日志和异常处理系统已关闭');
        } catch (error) {
            console.error('❌ 关闭错误日志系统时发生错误:', error);
        }
    }

    /**
     * 获取实例（单例模式）
     */
    static getInstance(options = {}) {
        if (!ErrorLoggingSystem.instance) {
            ErrorLoggingSystem.instance = new ErrorLoggingSystem(options);
        }
        return ErrorLoggingSystem.instance;
    }
}

// 导出模块
module.exports = ErrorLoggingSystem;

// 如果直接运行此文件，则执行演示
if (require.main === module) {
    const path = require('path');
    
    (async () => {
        try {
            console.log('🚀 启动错误日志系统演示...');
            
            const errorSystem = ErrorLoggingSystem.getInstance({
                logPath: path.join(__dirname, 'data')
            });
            
            await errorSystem.initialize();
            
            // 运行诊断
            console.log('\n📊 运行系统诊断...');
            const diagnostics = await errorSystem.runDiagnostics();
            console.log(JSON.stringify(diagnostics, null, 2));
            
            // 创建一些测试错误
            console.log('\n🔧 创建测试错误...');
            await errorSystem.createTestError('error');
            await errorSystem.createTestError('warning');
            await errorSystem.createTestError('critical');
            await errorSystem.createTestError('database');
            await errorSystem.createTestError('api');
            
            // 显示系统状态
            console.log('\n📈 系统状态:');
            const status = errorSystem.getSystemStatus();
            console.log(JSON.stringify(status, null, 2));
            
            console.log('\n✅ 错误日志系统演示完成');
            
        } catch (error) {
            console.error('❌ 演示过程中发生错误:', error);
        }
    })();
}