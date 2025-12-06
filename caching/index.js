const DatabaseCacheIntegration = require('./cacheIntegration');
const CacheRoutes = require('./cacheRoutes');

/**
 * 数据库缓存系统主入口
 * 为放射化学纯度检测仪提供完整的缓存解决方案
 */
class DatabaseCacheSystem {
    constructor(databaseManager, expressApp = null) {
        this.databaseManager = databaseManager;
        this.expressApp = expressApp;
        
        // 初始化缓存集成
        this.integration = new DatabaseCacheIntegration(databaseManager);
        
        // 缓存统计
        this.startTime = Date.now();
        this.requestCount = 0;
        this.cachedRequestCount = 0;
    }

    /**
     * 初始化缓存系统
     */
    async initialize() {
        try {
            console.log('🔄 初始化数据库缓存系统...');
            
            // 预热缓存
            await this.integration.warmupCache();
            
            // 设置API路由（如果提供了express应用）
            if (this.expressApp) {
                this.setupAPIRoutes();
            }
            
            // 启动性能监控
            this.startPerformanceMonitoring();
            
            console.log('✅ 数据库缓存系统初始化完成');
            
            return true;
        } catch (error) {
            console.error('❌ 数据库缓存系统初始化失败:', error);
            throw error;
        }
    }

    /**
     * 设置API路由
     */
    setupAPIRoutes() {
        try {
            const cacheRoutes = this.integration.getCacheRoutes();
            const router = cacheRoutes.getRouter();
            
            // 注册缓存管理路由
            this.expressApp.use('/api/cache/database', router);
            
            console.log('✅ 缓存API路由已注册');
        } catch (error) {
            console.error('注册缓存API路由失败:', error);
            throw error;
        }
    }

    /**
     * 启动性能监控
     */
    startPerformanceMonitoring() {
        // 每分钟报告性能统计
        setInterval(() => {
            this.reportPerformanceStats();
        }, 60000);

        // 每10秒检查缓存健康状态
        setInterval(() => {
            this.checkCacheHealth();
        }, 10000);
    }

    /**
     * 报告性能统计
     */
    reportPerformanceStats() {
        try {
            const report = this.integration.getPerformanceReport();
            const uptime = Math.floor((Date.now() - this.startTime) / 1000);
            
            console.log('📊 缓存性能报告:');
            console.log(`   运行时长: ${this.formatUptime(uptime)}`);
            console.log(`   总请求数: ${this.requestCount}`);
            console.log(`   缓存命中数: ${this.cachedRequestCount}`);
            console.log(`   缓存命中率: ${report.overall.hitRate.toFixed(2)}%`);
            console.log(`   内存使用率: ${report.overall.memoryUsage.toFixed(2)}%`);
            console.log(`   平均查询时间: ${report.overall.avgQueryTime.toFixed(2)}ms`);
            
            // 记录到数据库
            this.logPerformanceMetrics(report);
        } catch (error) {
            console.error('报告性能统计失败:', error);
        }
    }

    /**
     * 检查缓存健康状态
     */
    checkCacheHealth() {
        try {
            const health = this.integration.getCache().getStats();
            
            if (health.hitRate < 30) {
                console.warn('⚠️  缓存命中率过低:', health.hitRate + '%');
            }
            
            if (health.memoryUsagePercent > 90) {
                console.warn('⚠️  内存使用率过高:', health.memoryUsagePercent + '%');
            }
            
            if (health.slowQueries.length > 20) {
                console.warn('⚠️  慢查询数量过多:', health.slowQueries.length);
            }
        } catch (error) {
            console.error('检查缓存健康状态失败:', error);
        }
    }

    /**
     * 记录性能指标
     */
    async logPerformanceMetrics(report) {
        try {
            const metrics = [
                {
                    metricType: 'cache',
                    metricName: 'hit_rate',
                    value: report.overall.hitRate,
                    unit: 'percent',
                    source: 'database_cache',
                    alertLevel: report.overall.hitRate < 60 ? 'WARNING' : 'NORMAL'
                },
                {
                    metricType: 'cache',
                    metricName: 'memory_usage',
                    value: report.overall.memoryUsage,
                    unit: 'percent',
                    source: 'database_cache',
                    alertLevel: report.overall.memoryUsage > 85 ? 'WARNING' : 'NORMAL'
                },
                {
                    metricType: 'cache',
                    metricName: 'avg_query_time',
                    value: report.overall.avgQueryTime,
                    unit: 'ms',
                    source: 'database_cache',
                    alertLevel: report.overall.avgQueryTime > 100 ? 'WARNING' : 'NORMAL'
                }
            ];

            for (const metric of metrics) {
                await this.databaseManager.recordPerformanceMetric(metric);
            }
        } catch (error) {
            console.error('记录性能指标失败:', error);
        }
    }

    /**
     * 格式化运行时间
     */
    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours}h ${minutes}m ${secs}s`;
    }

    /**
     * 获取缓存系统状态
     */
    getStatus() {
        const integration = this.integration;
        const cache = integration.getCache();
        
        return {
            initialized: true,
            uptime: Date.now() - this.startTime,
            requestCount: this.requestCount,
            cachedRequestCount: this.cachedRequestCount,
            cache: {
                ...cache.getStats(),
                config: cache.getConfig()
            },
            performance: integration.getPerformanceReport()
        };
    }

    /**
     * 获取系统信息
     */
    getSystemInfo() {
        return {
            name: '放射化学纯度检测仪数据库缓存系统',
            version: '1.0.0',
            description: '为放射化学纯度检测仪提供高效的数据库查询缓存',
            features: [
                'LRU缓存算法',
                '查询结果压缩',
                '自动缓存失效',
                '性能监控',
                '缓存预热',
                '慢查询检测',
                '内存管理优化'
            ],
            api: {
                endpoints: [
                    'GET /api/cache/database/stats - 获取缓存统计',
                    'POST /api/cache/database/clear - 清空缓存',
                    'POST /api/cache/database/invalidate - 失效特定缓存',
                    'GET /api/cache/database/queries - 获取热门查询',
                    'POST /api/cache/database/config - 更新配置',
                    'POST /api/cache/database/preload - 预加载缓存',
                    'GET /api/cache/database/performance - 获取性能统计',
                    'GET /api/cache/database/health - 健康检查'
                ]
            },
            cacheStrategies: {
                'user_list': '用户列表查询 - 缓存10分钟',
                'measurement_data': '测量数据查询 - 缓存5分钟',
                'statistics': '统计数据查询 - 缓存15分钟',
                'permissions': '权限查询 - 缓存30分钟',
                'real_time': '实时操作 - 不缓存'
            }
        };
    }

    /**
     * 执行维护任务
     */
    async performMaintenance() {
        console.log('🧹 执行缓存系统维护任务...');
        
        try {
            const cache = this.integration.getCache();
            
            // 清理过期缓存
            cache.cleanupExpired();
            
            // 更新统计
            cache.updateStats();
            
            // 内存监控
            cache.monitorMemory();
            
            // 生成性能报告
            const report = this.integration.getPerformanceReport();
            
            // 记录维护日志
            await this.databaseManager.logAuditEvent({
                userId: 'system',
                username: 'system',
                action: 'CACHE_MAINTENANCE',
                resource: 'database_cache',
                resourceId: 'maintenance',
                result: 'SUCCESS',
                details: `缓存维护完成 - 命中率: ${report.overall.hitRate.toFixed(2)}%, 内存使用: ${report.overall.memoryUsage.toFixed(2)}%`
            });
            
            console.log('✅ 缓存维护任务完成');
            
            return {
                success: true,
                report,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 缓存维护任务失败:', error);
            
            await this.databaseManager.logAuditEvent({
                userId: 'system',
                username: 'system',
                action: 'CACHE_MAINTENANCE_FAILED',
                resource: 'database_cache',
                resourceId: 'maintenance',
                result: 'FAILED',
                details: `缓存维护失败: ${error.message}`
            });
            
            throw error;
        }
    }

    /**
     * 重置缓存系统
     */
    async reset() {
        console.log('🔄 重置缓存系统...');
        
        try {
            const cache = this.integration.getCache();
            
            // 清空所有缓存
            await cache.clear();
            
            // 重新预热
            await this.integration.warmupCache();
            
            // 重置统计
            this.requestCount = 0;
            this.cachedRequestCount = 0;
            this.startTime = Date.now();
            
            console.log('✅ 缓存系统重置完成');
            
            return true;
        } catch (error) {
            console.error('❌ 重置缓存系统失败:', error);
            throw error;
        }
    }

    /**
     * 关闭缓存系统
     */
    async shutdown() {
        console.log('🔄 关闭数据库缓存系统...');
        
        try {
            // 执行最后一次维护
            await this.performMaintenance();
            
            // 关闭缓存集成
            await this.integration.close();
            
            console.log('✅ 数据库缓存系统已关闭');
        } catch (error) {
            console.error('❌ 关闭缓存系统失败:', error);
        }
    }

    /**
     * 获取装饰的数据库管理器
     */
    getDecoratedDatabaseManager() {
        return this.databaseManager;
    }

    /**
     * 获取缓存集成实例
     */
    getIntegration() {
        return this.integration;
    }
}

/**
 * 工厂函数：创建缓存系统实例
 */
function createCacheSystem(databaseManager, expressApp = null) {
    return new DatabaseCacheSystem(databaseManager, expressApp);
}

module.exports = {
    DatabaseCacheSystem,
    createCacheSystem,
    DatabaseCacheIntegration,
    CacheRoutes
};