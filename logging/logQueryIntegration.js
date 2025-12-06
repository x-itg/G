const LogQueryEngine = require('./logQueryEngine');
const LogQueryRoutes = require('./logQueryRoutes');

/**
 * 日志查询引擎集成器
 * 负责将日志查询引擎集成到数据库管理器和API服务器中
 */
class LogQueryIntegration {
    constructor(databaseManager, app = null) {
        this.db = databaseManager;
        this.app = app;
        this.logQueryEngine = null;
        this.logQueryRoutes = null;
        this.isInitialized = false;
    }

    /**
     * 初始化日志查询系统
     */
    async initialize() {
        try {
            console.log('🔄 初始化日志查询系统...');

            // 创建日志查询引擎实例
            this.logQueryEngine = new LogQueryEngine(this.db);
            
            // 初始化引擎
            await this.logQueryEngine.initialize();

            // 如果提供了Express应用，注册路由
            if (this.app) {
                this.logQueryRoutes = new LogQueryRoutes(this.db);
                this.registerRoutes();
            }

            // 扩展数据库管理器
            this.extendDatabaseManager();

            this.isInitialized = true;
            console.log('✅ 日志查询系统初始化完成');

        } catch (error) {
            console.error('❌ 日志查询系统初始化失败:', error);
            throw error;
        }
    }

    /**
     * 注册API路由
     */
    registerRoutes() {
        if (!this.app || !this.logQueryRoutes) {
            console.warn('无法注册路由：Express应用或路由实例未初始化');
            return;
        }

        try {
            // 注册日志查询路由
            this.app.use('/api/logging', this.logQueryRoutes.getRouter());
            
            console.log('✅ 日志查询API路由已注册');
        } catch (error) {
            console.error('❌ 注册日志查询路由失败:', error);
            throw error;
        }
    }

    /**
     * 扩展数据库管理器，添加日志查询功能
     */
    extendDatabaseManager() {
        if (!this.logQueryEngine) {
            console.warn('无法扩展数据库管理器：日志查询引擎未初始化');
            return;
        }

        // 为数据库管理器添加日志查询方法
        this.db.searchLogs = async (query) => {
            return await this.logQueryEngine.searchLogs(query);
        };

        this.db.aggregateLogs = async (query) => {
            return await this.logQueryEngine.aggregateLogs(query);
        };

        this.db.analyzeUserBehavior = async (timeRange) => {
            return await this.logQueryEngine.analyzeUserBehavior(timeRange);
        };

        this.db.analyzeSystemHealth = async (timeRange) => {
            return await this.logQueryEngine.analyzeSystemHealth(timeRange);
        };

        this.db.analyzeSecurityEvents = async (timeRange) => {
            return await this.logQueryEngine.analyzeSecurityEvents(timeRange);
        };

        this.db.exportLogResults = async (query, format) => {
            return await this.logQueryEngine.exportResults(query, format);
        };

        this.db.getLogQueryStats = () => {
            return this.logQueryEngine.getQueryStats();
        };

        this.db.resetLogQueryStats = () => {
            this.logQueryEngine.resetStats();
        };

        this.db.cleanupLogCache = () => {
            return this.logQueryEngine.cleanupCache();
        };

        console.log('✅ 数据库管理器已扩展日志查询功能');
    }

    /**
     * 获取日志查询引擎实例
     */
    getLogQueryEngine() {
        return this.logQueryEngine;
    }

    /**
     * 获取日志查询路由实例
     */
    getLogQueryRoutes() {
        return this.logQueryRoutes;
    }

    /**
     * 检查是否已初始化
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * 关闭日志查询系统
     */
    async close() {
        try {
            if (this.logQueryEngine) {
                await this.logQueryEngine.close();
            }
            console.log('✅ 日志查询系统已关闭');
        } catch (error) {
            console.error('❌ 关闭日志查询系统失败:', error);
        }
    }
}

/**
 * 创建日志查询集成实例
 * 
 * @param {Object} databaseManager - 数据库管理器实例
 * @param {Object} app - Express应用实例（可选）
 * @returns {LogQueryIntegration} 日志查询集成实例
 */
function createLogQueryIntegration(databaseManager, app = null) {
    return new LogQueryIntegration(databaseManager, app);
}

/**
 * 为现有Express应用快速集成日志查询功能
 * 
 * @param {Object} app - Express应用实例
 * @param {Object} databaseManager - 数据库管理器实例
 * @returns {Promise<LogQueryIntegration>} 日志查询集成实例
 */
async function integrateLogQueryWithApp(app, databaseManager) {
    const integration = createLogQueryIntegration(databaseManager, app);
    await integration.initialize();
    return integration;
}

/**
 * 为数据库管理器添加日志查询功能
 * 
 * @param {Object} databaseManager - 数据库管理器实例
 * @returns {Promise<LogQueryEngine>} 日志查询引擎实例
 */
async function integrateLogQueryWithDatabase(databaseManager) {
    const integration = createLogQueryIntegration(databaseManager);
    await integration.initialize();
    return integration.getLogQueryEngine();
}

module.exports = {
    LogQueryIntegration,
    createLogQueryIntegration,
    integrateLogQueryWithApp,
    integrateLogQueryWithDatabase,
    LogQueryEngine,
    LogQueryRoutes
};