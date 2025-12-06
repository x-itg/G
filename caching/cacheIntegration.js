const { DatabaseCache, CachedQueryDecorator } = require('./databaseCache');
const CacheRoutes = require('./cacheRoutes');

/**
 * 数据库缓存集成器
 * 将缓存系统集成到SimplifiedDatabaseManager中
 */
class DatabaseCacheIntegration {
    constructor(databaseManager) {
        this.databaseManager = databaseManager;
        
        // 初始化缓存系统
        this.cache = new DatabaseCache({
            maxMemory: 100 * 1024 * 1024, // 100MB
            maxEntries: 10000,
            defaultTTL: 5 * 60 * 1000, // 5分钟
            compressionEnabled: true,
            statsEnabled: true
        });

        // 初始化查询装饰器
        this.decorator = new CachedQueryDecorator(databaseManager, this.cache);

        // 缓存策略映射
        this.queryTypeMapping = {
            // 用户相关查询
            'getUserByUsername': 'user_list',
            'getUserById': 'user_list',
            'getUserPermissions': 'permissions',
            'getUserPermissionLevel': 'permissions',
            'checkUserPermission': 'permissions',

            // 审计日志查询
            'getAuditEvents': 'statistics',
            'getErrorLogs': 'statistics',
            'getErrorStatistics': 'statistics',

            // 性能指标查询
            'getPerformanceMetrics': 'statistics',
            'getSystemPerformanceSummary': 'statistics',

            // 通用查询
            'getRecords': 'measurement_data',
            'getRecord': 'real_time',

            // 数据库统计
            'getDatabaseStats': 'statistics'
        };

        this.initializeDecoratedMethods();
        this.setupEventHandlers();
    }

    /**
     * 初始化装饰的方法
     */
    initializeDecoratedMethods() {
        // 用户管理方法
        this.decorateMethod('getUserByUsername', 'user_list');
        this.decorateMethod('getUserById', 'user_list');
        this.decorateMethod('getUserPermissions', 'permissions');
        this.decorateMethod('getUserPermissionLevel', 'permissions');
        this.decorateMethod('checkUserPermission', 'permissions');

        // 审计日志方法
        this.decorateMethod('getAuditEvents', 'statistics');
        this.decorateMethod('getErrorLogs', 'statistics');
        this.decorateMethod('getErrorStatistics', 'statistics');

        // 性能指标方法
        this.decorateMethod('getPerformanceMetrics', 'statistics');
        this.decorateMethod('getSystemPerformanceSummary', 'statistics');

        // 通用数据方法
        this.decorateMethod('getRecords', 'measurement_data');
        this.decorateMethod('getRecord', 'real_time');

        // 数据库统计
        this.decorateMethod('getDatabaseStats', 'statistics');
    }

    /**
     * 装饰数据库方法
     */
    decorateMethod(methodName, queryType) {
        if (typeof this.databaseManager[methodName] === 'function') {
            const originalMethod = this.databaseManager[methodName];
            
            this.databaseManager[methodName] = async (...args) => {
                return await this.decorator.executeQuery(queryType, originalMethod, ...args);
            };
        }
    }

    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        // 监听数据更新事件，自动失效相关缓存
        this.databaseManager.on = this.databaseManager.on || ((event, handler) => {
            if (!this.eventHandlers) this.eventHandlers = new Map();
            if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, []);
            this.eventHandlers.get(event).push(handler);
        });

        // 模拟事件发射
        this.databaseManager.emit = (event, data) => {
            if (this.eventHandlers && this.eventHandlers.has(event)) {
                for (const handler of this.eventHandlers.get(event)) {
                    handler(data);
                }
            }
        };

        // 监听数据更新事件
        this.databaseManager.on('dataUpdated', (data) => {
            this.handleDataUpdate(data);
        });

        this.databaseManager.on('userUpdated', (data) => {
            this.handleUserUpdate(data);
        });

        this.databaseManager.on('permissionChanged', (data) => {
            this.handlePermissionChange(data);
        });
    }

    /**
     * 处理数据更新
     */
    async handleDataUpdate(data) {
        const { table, operation, id, userId } = data;
        
        try {
            // 失效相关缓存
            const patterns = [
                `${this.cache.prefixes.query}:${table}:*`,
                `${this.cache.prefixes.query}:*:*:${userId || '*'}`
            ];

            for (const pattern of patterns) {
                await this.cache.invalidate(pattern);
            }

            console.log(`数据更新已失效相关缓存: ${table}.${operation}.${id}`);
        } catch (error) {
            console.error('失效缓存失败:', error);
        }
    }

    /**
     * 处理用户更新
     */
    async handleUserUpdate(data) {
        const { userId, operation } = data;
        
        try {
            // 失效用户相关缓存
            const patterns = [
                `${this.cache.prefixes.query}:users:*`,
                `${this.cache.prefixes.query}:user_permissions:*`,
                `${this.cache.prefixes.query}:*:*:${userId}`
            ];

            for (const pattern of patterns) {
                await this.cache.invalidate(pattern);
            }

            console.log(`用户更新已失效相关缓存: ${userId}.${operation}`);
        } catch (error) {
            console.error('失效用户缓存失败:', error);
        }
    }

    /**
     * 处理权限变更
     */
    async handlePermissionChange(data) {
        const { userId, resource, action } = data;
        
        try {
            // 失效权限相关缓存
            const patterns = [
                `${this.cache.prefixes.query}:user_permissions:*`,
                `${this.cache.prefixes.permission}:*`,
                `${this.cache.prefixes.query}:*:*:${userId}`
            ];

            for (const pattern of patterns) {
                await this.cache.invalidate(pattern);
            }

            console.log(`权限变更已失效相关缓存: ${userId}.${resource}.${action}`);
        } catch (error) {
            console.error('失效权限缓存失败:', error);
        }
    }

    /**
     * 获取缓存路由
     */
    getCacheRoutes() {
        return new CacheRoutes(this.databaseManager);
    }

    /**
     * 获取缓存实例
     */
    getCache() {
        return this.cache;
    }

    /**
     * 执行缓存查询
     */
    async executeCachedQuery(queryType, method, ...args) {
        return await this.decorator.executeQuery(queryType, method, ...args);
    }

    /**
     * 手动失效缓存
     */
    async invalidateCache(pattern) {
        return await this.cache.invalidate(pattern);
    }

    /**
     * 预热缓存
     */
    async warmupCache() {
        try {
            console.log('开始缓存预热...');
            
            // 预加载常用数据
            const warmupQueries = [
                { type: 'user_list', query: () => this.databaseManager.readTable('users') },
                { type: 'statistics', query: () => this.databaseManager.getDatabaseStats() },
                { type: 'permissions', query: () => this.databaseManager.readTable('user_permissions') }
            ];

            for (const warmup of warmupQueries) {
                try {
                    const data = await warmup.query();
                    const cacheKey = this.cache.generateCacheKey(
                        'warmup',
                        warmup.type,
                        {},
                        'system'
                    );
                    
                    await this.cache.set(cacheKey, data, {
                        queryType: warmup.type,
                        userId: 'system',
                        ttl: this.cache.getTTL(warmup.type)
                    });
                    
                    console.log(`预热 ${warmup.type} 缓存完成`);
                } catch (error) {
                    console.error(`预热 ${warmup.type} 失败:`, error);
                }
            }

            console.log('缓存预热完成');
        } catch (error) {
            console.error('缓存预热失败:', error);
        }
    }

    /**
     * 获取缓存性能报告
     */
    getPerformanceReport() {
        const stats = this.cache.getStats();
        const queryStats = Array.from(this.cache.queryStats.entries())
            .map(([queryType, stats]) => ({
                queryType,
                ...stats,
                hitRate: stats.count > 0 ? (stats.cacheHits / stats.count * 100).toFixed(2) : 0,
                efficiency: stats.count > 0 ? (stats.cacheHits / stats.count) : 0
            }))
            .sort((a, b) => b.efficiency - a.efficiency);

        const hotQueries = this.cache.getHotQueries(10);

        return {
            overall: {
                hitRate: stats.hitRate,
                memoryUsage: stats.memoryUsagePercent,
                totalQueries: stats.totalQueries,
                avgQueryTime: stats.avgQueryTime
            },
            queryPerformance: queryStats,
            hotQueries,
            recommendations: this.generateRecommendations(stats, queryStats)
        };
    }

    /**
     * 生成优化建议
     */
    generateRecommendations(stats, queryStats) {
        const recommendations = [];

        // 缓存命中率建议
        if (stats.hitRate < 60) {
            recommendations.push({
                type: 'hit_rate',
                priority: 'high',
                message: '缓存命中率较低，建议检查缓存策略或增加缓存TTL',
                action: 'increase_ttl'
            });
        }

        // 内存使用建议
        if (stats.memoryUsagePercent > 85) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                message: '内存使用率较高，建议增加内存限制或清理过期缓存',
                action: 'optimize_memory'
            });
        }

        // 慢查询建议
        if (stats.slowQueries.length > 10) {
            recommendations.push({
                type: 'slow_queries',
                priority: 'medium',
                message: '存在较多慢查询，建议优化查询或增加缓存',
                action: 'optimize_queries'
            });
        }

        // 查询效率建议
        const inefficientQueries = queryStats.filter(q => q.hitRate < 30 && q.count > 10);
        if (inefficientQueries.length > 0) {
            recommendations.push({
                type: 'inefficient_queries',
                priority: 'low',
                message: `发现 ${inefficientQueries.length} 个效率较低的查询类型`,
                action: 'review_strategies'
            });
        }

        return recommendations;
    }

    /**
     * 关闭缓存系统
     */
    async close() {
        try {
            await this.cache.close();
            console.log('数据库缓存集成器已关闭');
        } catch (error) {
            console.error('关闭缓存系统失败:', error);
        }
    }

    /**
     * 获取缓存配置
     */
    getConfig() {
        return {
            cache: this.cache.getConfig(),
            queryMapping: this.queryTypeMapping,
            decoratedMethods: Object.keys(this.queryTypeMapping)
        };
    }

    /**
     * 更新缓存配置
     */
    updateConfig(config) {
        if (config.cache) {
            this.cache.updateConfig(config.cache);
        }
        
        if (config.queryMapping) {
            this.queryTypeMapping = { ...this.queryTypeMapping, ...config.queryMapping };
        }
        
        console.log('缓存集成配置已更新');
    }
}

module.exports = DatabaseCacheIntegration;