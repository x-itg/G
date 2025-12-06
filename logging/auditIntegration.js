const { AuditLogger, createAuditMiddleware, auditOperation } = require('./auditLogger');
const AuditLoggingRoutes = require('./auditRoutes');

/**
 * 审计日志系统集成示例
 * 展示如何在放射化学纯度检测仪主应用中集成审计日志功能
 */
class AuditSystemIntegration {
    constructor(dbManager, app, options = {}) {
        this.dbManager = dbManager;
        this.app = app;
        this.options = {
            enableAutoLogging: options.enableAutoLogging !== false,
            enableHttpMiddleware: options.enableHttpMiddleware !== false,
            enableRoutes: options.enableRoutes !== false,
            permissionMiddleware: options.permissionMiddleware,
            ...options
        };
        
        // 初始化审计日志器
        this.auditLogger = new AuditLogger(dbManager, options.auditLogger);
        
        this.setupIntegration();
    }

    /**
     * 设置集成
     */
    setupIntegration() {
        console.log('🔄 开始集成审计日志系统...');
        
        // 设置HTTP请求中间件
        if (this.options.enableHttpMiddleware) {
            this.setupHttpMiddleware();
        }
        
        // 设置API路由
        if (this.options.enableRoutes) {
            this.setupApiRoutes();
        }
        
        // 设置操作装饰器
        if (this.options.enableDecorators) {
            this.setupOperationDecorators();
        }
        
        // 设置关键事件监听
        this.setupEventListeners();
        
        console.log('✅ 审计日志系统集成完成');
    }

    /**
     * 设置HTTP请求中间件
     */
    setupHttpMiddleware() {
        const auditMiddleware = createAuditMiddleware(this.auditLogger, {
            includeRequestBody: false,
            includeResponseBody: false,
            excludePaths: [
                '/api/logging/audit',
                '/health',
                '/favicon.ico',
                '/api/ping'
            ],
            sensitiveFields: ['password', 'token', 'secret', 'key']
        });
        
        // 全局中间件 - 在所有路由之前
        this.app.use(auditMiddleware);
        
        console.log('✅ HTTP请求审计中间件已启用');
    }

    /**
     * 设置API路由
     */
    setupApiRoutes() {
        const auditRoutes = new AuditLoggingRoutes(
            this.auditLogger,
            this.options.permissionMiddleware
        );
        
        this.app.use('/api/logging/audit', auditRoutes.getRouter());
        
        console.log('✅ 审计日志API路由已启用');
    }

    /**
     * 设置操作装饰器
     */
    setupOperationDecorators() {
        // 为关键服务类添加审计装饰器
        this.decorateServiceMethods();
        
        console.log('✅ 操作审计装饰器已启用');
    }

    /**
     * 为服务方法添加审计装饰器
     */
    decorateServiceMethods() {
        // 这里可以装饰关键服务类的方法
        // 示例：为数据处理服务添加审计
        if (this.dataProcessingService) {
            this.decorateMethod(this.dataProcessingService, 'processData', {
                action: 'PROCESS_DATA',
                resource: 'DataProcessingService',
                tags: ['data_processing', 'critical']
            });
        }
        
        // 示例：为用户管理服务添加审计
        if (this.userManagementService) {
            this.decorateMethod(this.userManagementService, 'createUser', {
                action: 'CREATE_USER',
                resource: 'UserManagementService',
                tags: ['user_management', 'security']
            });
            
            this.decorateMethod(this.userManagementService, 'updateUser', {
                action: 'UPDATE_USER',
                resource: 'UserManagementService',
                tags: ['user_management', 'security']
            });
            
            this.decorateMethod(this.userManagementService, 'deleteUser', {
                action: 'DELETE_USER',
                resource: 'UserManagementService',
                tags: ['user_management', 'security', 'critical']
            });
        }
        
        // 示例：为系统设置服务添加审计
        if (this.systemSettingsService) {
            this.decorateMethod(this.systemSettingsService, 'updateSettings', {
                action: 'UPDATE_SYSTEM_SETTINGS',
                resource: 'SystemSettingsService',
                tags: ['system_config', 'critical']
            });
        }
    }

    /**
     * 装饰单个方法
     */
    decorateMethod(service, methodName, auditOptions) {
        if (typeof service[methodName] === 'function') {
            const originalMethod = service[methodName];
            const auditLogger = this.auditLogger;
            
            service[methodName] = async function(...args) {
                const startTime = Date.now();
                let result;
                let error = null;
                
                try {
                    result = await originalMethod.apply(this, args);
                    return result;
                } catch (err) {
                    error = err;
                    throw err;
                } finally {
                    // 异步记录审计日志
                    setImmediate(async () => {
                        try {
                            await auditLogger.log({
                                user_id: this.user?.id,
                                username: this.user?.username || 'system',
                                action: auditOptions.action,
                                resource: auditOptions.resource,
                                resource_id: result?.id || 'unknown',
                                timestamp: new Date(startTime).toISOString(),
                                details: JSON.stringify({
                                    method: methodName,
                                    args: args.length,
                                    duration: Date.now() - startTime,
                                    hasError: !!error,
                                    resultId: result?.id
                                }),
                                result: error ? 'failure' : 'success',
                                severity: error ? 'error' : 'info',
                                tags: auditOptions.tags || ['operation']
                            });
                        } catch (auditError) {
                            console.error('方法审计日志记录失败:', auditError);
                        }
                    });
                }
            };
        }
    }

    /**
     * 设置关键事件监听
     */
    setupEventListeners() {
        // 监听用户认证事件
        this.setupAuthenticationListeners();
        
        // 监听系统事件
        this.setupSystemEventListeners();
        
        console.log('✅ 关键事件监听器已启用');
    }

    /**
     * 设置认证事件监听
     */
    setupAuthenticationListeners() {
        // 用户登录事件
        this.app.post('/api/auth/login', async (req, res, next) => {
            res.on('finish', async () => {
                try {
                    await this.auditLogger.log({
                        user_id: res.locals.user?.id,
                        username: req.body.username,
                        action: 'LOGIN',
                        resource: 'authentication',
                        timestamp: new Date().toISOString(),
                        ip_address: req.ip,
                        user_agent: req.get('User-Agent'),
                        details: JSON.stringify({
                            success: res.statusCode === 200,
                            method: req.body.method || 'password'
                        }),
                        result: res.statusCode === 200 ? 'success' : 'failure',
                        severity: res.statusCode === 200 ? 'info' : 'warning',
                        session_id: req.sessionID,
                        tags: ['authentication', 'login']
                    });
                } catch (error) {
                    console.error('登录审计日志记录失败:', error);
                }
            });
            next();
        });
        
        // 用户登出事件
        this.app.post('/api/auth/logout', async (req, res, next) => {
            res.on('finish', async () => {
                try {
                    await this.auditLogger.log({
                        user_id: req.user?.id,
                        username: req.user?.username,
                        action: 'LOGOUT',
                        resource: 'authentication',
                        timestamp: new Date().toISOString(),
                        ip_address: req.ip,
                        user_agent: req.get('User-Agent'),
                        details: JSON.stringify({
                            success: res.statusCode === 200
                        }),
                        result: res.statusCode === 200 ? 'success' : 'failure',
                        severity: 'info',
                        session_id: req.sessionID,
                        tags: ['authentication', 'logout']
                    });
                } catch (error) {
                    console.error('登出审计日志记录失败:', error);
                }
            });
            next();
        });
    }

    /**
     * 设置系统事件监听
     */
    setupSystemEventListeners() {
        // 系统启动事件
        process.on('SIGTERM', async () => {
            await this.logSystemEvent('SYSTEM_SHUTDOWN', 'system');
        });
        
        process.on('SIGINT', async () => {
            await this.logSystemEvent('SYSTEM_SHUTDOWN', 'system');
        });
        
        // 未捕获异常
        process.on('uncaughtException', async (error) => {
            await this.logSystemEvent('UNCAUGHT_EXCEPTION', 'system', {
                error: error.message,
                stack: error.stack
            }, 'error');
        });
    }

    /**
     * 记录系统事件
     */
    async logSystemEvent(action, resource, details = {}, severity = 'info') {
        try {
            await this.auditLogger.log({
                user_id: 'system',
                username: 'system',
                action,
                resource,
                timestamp: new Date().toISOString(),
                details: JSON.stringify(details),
                result: 'success',
                severity,
                tags: ['system', 'automatic']
            });
        } catch (error) {
            console.error('系统事件审计日志记录失败:', error);
        }
    }

    /**
     * 手动记录审计日志
     */
    async logManualAudit(data) {
        return await this.auditLogger.log(data);
    }

    /**
     * 获取审计日志器实例
     */
    getAuditLogger() {
        return this.auditLogger;
    }

    /**
     * 关闭审计系统
     */
    async close() {
        console.log('🔄 正在关闭审计日志系统...');
        
        await this.auditLogger.close();
        
        console.log('✅ 审计日志系统已关闭');
    }
}

/**
 * 快捷集成函数
 */
function integrateAuditSystem(dbManager, app, options = {}) {
    const integration = new AuditSystemIntegration(dbManager, app, options);
    
    // 全局审计日志函数
    app.locals.audit = {
        log: integration.logManualAudit.bind(integration),
        getLogger: integration.getAuditLogger.bind(integration)
    };
    
    return integration;
}

module.exports = {
    AuditSystemIntegration,
    integrateAuditSystem
};