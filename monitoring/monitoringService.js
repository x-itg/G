const SystemMonitor = require('./systemMonitor');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');

// 条件导入Express相关模块
let express = null;
let MonitoringRoutes = null;

try {
    express = require('express');
    MonitoringRoutes = require('./monitoringRoutes');
} catch (error) {
    console.warn('Express模块未安装，API路由功能将不可用:', error.message);
}

/**
 * 系统监控服务初始化器
 * 用于在主应用中集成系统监控功能
 */
class MonitoringService {
    constructor() {
        this.databaseManager = null;
        this.systemMonitor = null;
        this.monitoringRoutes = null;
        this.isInitialized = false;
    }

    /**
     * 初始化监控服务
     * @param {Object} options 配置选项
     * @param {SimplifiedDatabaseManager} options.databaseManager 数据库管理器实例
     * @param {number} options.defaultInterval 默认采集间隔（毫秒）
     * @param {Object} options.thresholds 自定义阈值配置
     */
    async initialize(options = {}) {
        try {
            console.log('🔄 初始化系统监控服务...');
            
            // 初始化数据库管理器
            if (!options.databaseManager) {
                this.databaseManager = new SimplifiedDatabaseManager();
                this.databaseManager.initialize();
            } else {
                this.databaseManager = options.databaseManager;
            }

            // 创建系统监控器
            this.systemMonitor = new SystemMonitor(this.databaseManager);
            
            // 应用自定义配置
            if (options.defaultInterval) {
                this.systemMonitor.monitoringIntervalMs = options.defaultInterval;
            }
            
            if (options.thresholds) {
                this.systemMonitor.updateThresholds(options.thresholds);
            }

            // 创建API路由（如果Express可用）
            if (MonitoringRoutes) {
                this.monitoringRoutes = new MonitoringRoutes(this.systemMonitor, this.databaseManager);
            }
            
            this.isInitialized = true;
            
            console.log('✅ 系统监控服务初始化完成');
            
            // 自动启动监控（可选）
            if (options.autoStart !== false) {
                await this.systemMonitor.startMonitoring();
            }
            
            return {
                success: true,
                message: '系统监控服务初始化完成',
                monitor: this.systemMonitor,
                routes: this.monitoringRoutes ? this.monitoringRoutes.getRouter() : null
            };
            
        } catch (error) {
            console.error('❌ 系统监控服务初始化失败:', error);
            throw error;
        }
    }

    /**
     * 获取Express路由
     */
    getRoutes() {
        if (!this.isInitialized) {
            throw new Error('监控服务未初始化，请先调用initialize()方法');
        }
        
        if (!MonitoringRoutes) {
            throw new Error('Express模块未安装，无法提供路由功能');
        }
        
        return this.monitoringRoutes.getRouter();
    }

    /**
     * 获取系统监控器实例
     */
    getMonitor() {
        return this.systemMonitor;
    }

    /**
     * 获取数据库管理器实例
     */
    getDatabaseManager() {
        return this.databaseManager;
    }

    /**
     * 关闭监控服务
     */
    async shutdown() {
        if (this.systemMonitor) {
            await this.systemMonitor.shutdown();
        }
        
        if (this.databaseManager) {
            this.databaseManager.close();
        }
        
        this.isInitialized = false;
        console.log('🔄 系统监控服务已关闭');
    }
}

/**
 * 创建独立的监控服务实例
 */
function createMonitoringService(options = {}) {
    const service = new MonitoringService();
    return service.initialize(options);
}

/**
 * 快速集成到Express应用
 * @param {Express} app Express应用实例
 * @param {Object} options 配置选项
 */
async function setupMonitoring(app, options = {}) {
    if (!express || !MonitoringRoutes) {
        throw new Error('Express模块未安装，请运行: npm install express');
    }
    
    const service = new MonitoringService();
    await service.initialize(options);
    
    // 注册API路由
    app.use('/api/monitoring', service.getRoutes());
    
    console.log('🔗 系统监控路由已注册到 /api/monitoring');
    
    return service;
}

const moduleExports = {
    MonitoringService,
    SystemMonitor,
    createMonitoringService
};

if (MonitoringRoutes) {
    moduleExports.MonitoringRoutes = MonitoringRoutes;
    moduleExports.setupMonitoring = setupMonitoring;
}

module.exports = moduleExports;