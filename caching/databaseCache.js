const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

/**
 * 数据库查询缓存系统
 * 为放射化学纯度检测仪提供高效的数据查询缓存
 */
class DatabaseCache {
    constructor(options = {}) {
        // 缓存配置
        this.config = {
            maxMemory: options.maxMemory || 100 * 1024 * 1024, // 100MB
            maxEntries: options.maxEntries || 10000,
            defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 5分钟
            compressionEnabled: options.compressionEnabled || true,
            statsEnabled: options.statsEnabled || true
        };

        // 缓存策略配置
        this.cacheStrategies = {
            'user_list': { ttl: 10 * 60 * 1000, maxSize: 1000 }, // 10分钟
            'measurement_data': { ttl: 5 * 60 * 1000, maxSize: 5000 }, // 5分钟
            'statistics': { ttl: 15 * 60 * 1000, maxSize: 2000 }, // 15分钟
            'permissions': { ttl: 30 * 60 * 1000, maxSize: 1000 }, // 30分钟
            'real_time': { ttl: 0, maxSize: 0 } // 不缓存
        };

        // LRU缓存结构
        this.cache = new Map(); // key -> CacheEntry
        this.accessOrder = new Map(); // 访问顺序追踪
        this.queryStats = new Map(); // 查询统计
        this.hotQueries = new Map(); // 热门查询追踪
        
        // 性能统计
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalQueries: 0,
            cacheSize: 0,
            memoryUsage: 0,
            avgQueryTime: 0,
            slowQueries: [],
            queryTimes: []
        };

        // 预定义缓存键前缀
        this.prefixes = {
            query: 'query',
            plan: 'plan',
            user: 'user',
            permission: 'permission',
            stats: 'stats',
            measurement: 'measurement'
        };

        // 内存管理
        this.memoryThresholds = {
            warning: 0.8, // 80%
            critical: 0.95 // 95%
        };

        this.initializeMonitoring();
    }

    /**
     * 生成缓存键
     */
    generateCacheKey(table, operation, params, userId) {
        const paramsHash = crypto.createHash('sha256')
            .update(JSON.stringify(params))
            .digest('hex')
            .substring(0, 16);
        
        return `${this.prefixes.query}:${table}:${operation}:${paramsHash}:${userId}`;
    }

    /**
     * 压缩数据
     */
    compressData(data) {
        if (!this.config.compressionEnabled || !data) return data;
        
        try {
            const jsonString = JSON.stringify(data);
            return {
                _compressed: true,
                data: Buffer.from(jsonString).toString('base64'),
                originalSize: jsonString.length,
                compressedSize: Buffer.byteLength(jsonString)
            };
        } catch (error) {
            console.warn('数据压缩失败:', error.message);
            return data;
        }
    }

    /**
     * 解压缩数据
     */
    decompressData(compressedData) {
        if (!compressedData || !compressedData._compressed) return compressedData;
        
        try {
            const jsonString = Buffer.from(compressedData.data, 'base64').toString();
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('数据解压缩失败:', error.message);
            return compressedData;
        }
    }

    /**
     * 获取缓存TTL
     */
    getTTL(queryType, customTTL) {
        if (customTTL !== undefined) return customTTL;
        
        const strategy = this.cacheStrategies[queryType];
        return strategy ? strategy.ttl : this.config.defaultTTL;
    }

    /**
     * 缓存数据
     */
    async set(key, data, options = {}) {
        const startTime = Date.now();
        
        try {
            // 检查缓存大小限制
            if (this.cache.size >= this.config.maxEntries) {
                await this.evictLRU();
            }

            // 压缩数据
            const dataToStore = this.compressData(data);
            const size = this.calculateSize(dataToStore);
            
            // 检查内存限制
            if (this.stats.memoryUsage + size > this.config.maxMemory) {
                await this.freeMemory(size);
            }

            const entry = {
                key,
                data: dataToStore,
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                accessCount: 1,
                size,
                ttl: options.ttl || this.config.defaultTTL,
                queryType: options.queryType || 'default',
                userId: options.userId,
                tags: options.tags || []
            };

            // 更新缓存
            this.cache.set(key, entry);
            this.accessOrder.set(key, Date.now());
            
            // 更新统计
            this.stats.cacheSize++;
            this.stats.memoryUsage += size;

            // 记录热门查询
            this.recordHotQuery(key, options.queryType);

            // 记录查询时间
            const queryTime = Date.now() - startTime;
            this.recordQueryTime(queryTime);

            return true;
        } catch (error) {
            console.error('缓存设置失败:', error);
            return false;
        }
    }

    /**
     * 获取缓存数据
     */
    async get(key) {
        const startTime = Date.now();
        
        try {
            const entry = this.cache.get(key);
            
            if (!entry) {
                this.stats.misses++;
                this.stats.totalQueries++;
                return null;
            }

            // 检查TTL
            const now = Date.now();
            if (entry.ttl > 0 && now - entry.createdAt > entry.ttl) {
                this.cache.delete(key);
                this.accessOrder.delete(key);
                this.stats.cacheSize--;
                this.stats.memoryUsage -= entry.size;
                this.stats.misses++;
                this.stats.totalQueries++;
                return null;
            }

            // 更新访问信息
            entry.lastAccessed = now;
            entry.accessCount++;
            this.accessOrder.set(key, now);

            // 更新统计
            this.stats.hits++;
            this.stats.totalQueries++;

            // 记录查询时间
            const queryTime = Date.now() - startTime;
            this.recordQueryTime(queryTime);

            // 检查慢查询
            if (queryTime > 100) { // 超过100ms认为是慢查询
                this.recordSlowQuery(key, queryTime);
            }

            // 返回解压缩的数据
            return this.decompressData(entry.data);
        } catch (error) {
            console.error('缓存获取失败:', error);
            this.stats.misses++;
            this.stats.totalQueries++;
            return null;
        }
    }

    /**
     * 删除缓存条目
     */
    async delete(key) {
        const entry = this.cache.get(key);
        if (entry) {
            this.cache.delete(key);
            this.accessOrder.delete(key);
            this.stats.cacheSize--;
            this.stats.memoryUsage -= entry.size;
            return true;
        }
        return false;
    }

    /**
     * LRU淘汰策略
     */
    async evictLRU() {
        let oldestKey = null;
        let oldestTime = Infinity;

        // 找到最久未访问的条目
        for (const [key, accessTime] of this.accessOrder.entries()) {
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            await this.delete(oldestKey);
            this.stats.evictions++;
        }
    }

    /**
     * 释放内存
     */
    async freeMemory(requiredSize) {
        const targetSize = this.stats.memoryUsage + requiredSize - this.config.maxMemory * 0.8;
        let freed = 0;

        // 按访问频率和旧程度排序
        const entries = Array.from(this.cache.entries())
            .map(([key, entry]) => ({
                key,
                score: (entry.accessCount * 0.7) + ((Date.now() - entry.lastAccessed) * 0.3)
            }))
            .sort((a, b) => b.score - a.score); // 从高分到低分删除

        for (const { key } of entries) {
            const entry = this.cache.get(key);
            if (entry) {
                await this.delete(key);
                freed += entry.size;
                this.stats.evictions++;
                
                if (freed >= targetSize) break;
            }
        }
    }

    /**
     * 计算数据大小
     */
    calculateSize(data) {
        try {
            const jsonString = JSON.stringify(data);
            return Buffer.byteLength(jsonString, 'utf8');
        } catch (error) {
            return 1024; // 默认1KB
        }
    }

    /**
     * 记录热门查询
     */
    recordHotQuery(key, queryType) {
        const existing = this.hotQueries.get(key) || {
            count: 0,
            queryType,
            lastAccess: Date.now()
        };
        
        existing.count++;
        existing.lastAccess = Date.now();
        this.hotQueries.set(key, existing);

        // 保持热门查询数量在合理范围
        if (this.hotQueries.size > 1000) {
            const sortedQueries = Array.from(this.hotQueries.entries())
                .sort((a, b) => b[1].lastAccess - a[1].lastAccess)
                .slice(1000);
            
            this.hotQueries = new Map(sortedQueries);
        }
    }

    /**
     * 记录查询时间
     */
    recordQueryTime(time) {
        this.stats.queryTimes.push(time);
        if (this.stats.queryTimes.length > 1000) {
            this.stats.queryTimes.shift();
        }
        
        // 计算平均查询时间
        const sum = this.stats.queryTimes.reduce((acc, t) => acc + t, 0);
        this.stats.avgQueryTime = sum / this.stats.queryTimes.length;
    }

    /**
     * 记录慢查询
     */
    recordSlowQuery(key, time) {
        this.stats.slowQueries.push({
            key,
            time,
            timestamp: Date.now()
        });
        
        // 保持慢查询记录在合理范围
        if (this.stats.slowQueries.length > 100) {
            this.stats.slowQueries.shift();
        }
    }

    /**
     * 获取缓存统计信息
     */
    getStats() {
        const hitRate = this.stats.totalQueries > 0 ? 
            (this.stats.hits / this.stats.totalQueries * 100).toFixed(2) : 0;
        
        const memoryUsagePercent = (this.stats.memoryUsage / this.config.maxMemory * 100).toFixed(2);

        return {
            hitRate: parseFloat(hitRate),
            memoryUsagePercent: parseFloat(memoryUsagePercent),
            ...this.stats,
            memoryThreshold: {
                warning: this.config.maxMemory * this.memoryThresholds.warning,
                critical: this.config.maxMemory * this.memoryThresholds.critical
            }
        };
    }

    /**
     * 获取热门查询
     */
    getHotQueries(limit = 20) {
        return Array.from(this.hotQueries.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, limit)
            .map(([key, info]) => ({
                key,
                ...info
            }));
    }

    /**
     * 失效特定查询缓存
     */
    async invalidate(pattern) {
        let invalidated = 0;
        
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                await this.delete(key);
                invalidated++;
            }
        }
        
        return invalidated;
    }

    /**
     * 清空所有缓存
     */
    async clear() {
        this.cache.clear();
        this.accessOrder.clear();
        this.stats.cacheSize = 0;
        this.stats.memoryUsage = 0;
        this.stats.hits = 0;
        this.stats.misses = 0;
        this.stats.evictions = 0;
        this.stats.totalQueries = 0;
        this.stats.slowQueries = [];
        this.stats.queryTimes = [];
        this.hotQueries.clear();
        
        console.log('数据库缓存已清空');
    }

    /**
     * 缓存预加载
     */
    async preload(queryTypes) {
        const preloaded = [];
        
        for (const queryType of queryTypes) {
            try {
                const strategy = this.cacheStrategies[queryType];
                if (strategy && strategy.preloadQueries) {
                    for (const query of strategy.preloadQueries) {
                        const key = this.generateCacheKey(query.table, query.operation, query.params, query.userId);
                        
                        if (!this.cache.has(key)) {
                            // 这里应该调用实际的数据库查询
                            // const data = await dbManager.executeQuery(query);
                            // await this.set(key, data, { queryType, ...query });
                            preloaded.push(key);
                        }
                    }
                }
            } catch (error) {
                console.error(`预加载 ${queryType} 失败:`, error);
            }
        }
        
        return preloaded;
    }

    /**
     * 监控初始化
     */
    initializeMonitoring() {
        // 定期清理过期缓存
        setInterval(() => {
            this.cleanupExpired();
        }, 60000); // 每分钟清理一次

        // 定期更新统计
        setInterval(() => {
            this.updateStats();
        }, 30000); // 每30秒更新一次统计

        // 内存监控
        setInterval(() => {
            this.monitorMemory();
        }, 10000); // 每10秒监控一次内存
    }

    /**
     * 清理过期缓存
     */
    cleanupExpired() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.ttl > 0 && now - entry.createdAt > entry.ttl) {
                this.cache.delete(key);
                this.accessOrder.delete(key);
                this.stats.cacheSize--;
                this.stats.memoryUsage -= entry.size;
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`清理了 ${cleaned} 个过期缓存条目`);
        }
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        // 重新计算内存使用
        this.stats.memoryUsage = Array.from(this.cache.values())
            .reduce((total, entry) => total + entry.size, 0);
        
        // 更新缓存大小
        this.stats.cacheSize = this.cache.size;
    }

    /**
     * 内存监控
     */
    monitorMemory() {
        const usagePercent = this.stats.memoryUsage / this.config.maxMemory;
        
        if (usagePercent >= this.memoryThresholds.critical) {
            console.warn('内存使用率达到临界值，执行紧急清理');
            this.freeMemory(this.config.maxMemory * 0.1);
        } else if (usagePercent >= this.memoryThresholds.warning) {
            console.log(`内存使用率达到 ${ (usagePercent * 100).toFixed(1) }%`);
        }
    }

    /**
     * 获取缓存配置
     */
    getConfig() {
        return {
            ...this.config,
            cacheStrategies: this.cacheStrategies,
            memoryThresholds: this.memoryThresholds
        };
    }

    /**
     * 更新缓存配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.cacheStrategies) {
            this.cacheStrategies = { ...this.cacheStrategies, ...newConfig.cacheStrategies };
        }
        
        console.log('缓存配置已更新');
    }

    /**
     * 关闭缓存系统
     */
    async close() {
        // 清理所有缓存
        await this.clear();
        
        // 关闭监控
        // 注意：在实际使用中应该保存interval ID以便清理
        console.log('数据库缓存系统已关闭');
    }
}

/**
 * 查询装饰器
 */
class CachedQueryDecorator {
    constructor(databaseManager, cache) {
        this.databaseManager = databaseManager;
        this.cache = cache;
    }

    /**
     * 装饰数据库查询方法
     */
    async executeQuery(queryType, originalMethod, ...args) {
        const startTime = Date.now();
        
        try {
            // 生成缓存键
            const params = args[0] || {};
            const userId = args[1] || 'anonymous';
            const cacheKey = this.cache.generateCacheKey(
                params.table || 'unknown',
                params.operation || 'read',
                params,
                userId
            );

            // 检查是否应该缓存
            const shouldCache = this.shouldCache(queryType);
            if (!shouldCache) {
                const result = await originalMethod.apply(this.databaseManager, args);
                this.recordQueryStats(queryType, Date.now() - startTime, false);
                return result;
            }

            // 尝试从缓存获取
            let cachedResult = await this.cache.get(cacheKey);
            if (cachedResult !== null) {
                this.recordQueryStats(queryType, Date.now() - startTime, true);
                return cachedResult;
            }

            // 执行实际查询
            const result = await originalMethod.apply(this.databaseManager, args);
            
            // 获取TTL并缓存结果
            const ttl = this.cache.getTTL(queryType);
            if (ttl > 0) {
                await this.cache.set(cacheKey, result, {
                    ttl,
                    queryType,
                    userId,
                    tags: [queryType]
                });
            }

            this.recordQueryStats(queryType, Date.now() - startTime, false);
            return result;
        } catch (error) {
            console.error(`查询执行失败 (${queryType}):`, error);
            throw error;
        }
    }

    /**
     * 判断是否应该缓存
     */
    shouldCache(queryType) {
        const strategy = this.cache.cacheStrategies[queryType];
        return strategy && strategy.ttl > 0;
    }

    /**
     * 记录查询统计
     */
    recordQueryStats(queryType, queryTime, fromCache) {
        const existing = this.cache.queryStats.get(queryType) || {
            count: 0,
            cacheHits: 0,
            totalTime: 0,
            avgTime: 0
        };
        
        existing.count++;
        existing.totalTime += queryTime;
        existing.avgTime = existing.totalTime / existing.count;
        
        if (fromCache) {
            existing.cacheHits++;
        }
        
        this.cache.queryStats.set(queryType, existing);
    }
}

module.exports = { DatabaseCache, CachedQueryDecorator };