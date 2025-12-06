const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * API响应缓存系统
 * 提供智能的API响应缓存，优化系统性能
 */
class ApiCache extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // 缓存配置
        this.config = {
            // 默认缓存策略
            strategies: {
                // 测量数据列表：缓存5分钟
                'data/measurements': 5 * 60 * 1000,
                'data/list': 5 * 60 * 1000,
                
                // 用户信息：缓存30分钟
                'auth/user': 30 * 60 * 1000,
                'users/info': 30 * 60 * 1000,
                
                // 系统配置：缓存15分钟
                'system/config': 15 * 60 * 1000,
                'settings': 15 * 60 * 1000,
                
                // 统计数据：缓存10分钟
                'statistics': 10 * 60 * 1000,
                'analytics': 10 * 60 * 1000,
                'reports': 10 * 60 * 1000,
                
                // 实时数据：不缓存
                'realtime': 0,
                'stream': 0,
                'live': 0,
                'monitoring': 0
            },
            
            // 缓存大小限制
            maxCacheSize: options.maxCacheSize || 100 * 1024 * 1024, // 100MB
            maxCacheItems: options.maxCacheItems || 1000,
            
            // 缓存清理设置
            cleanupInterval: options.cleanupInterval || 5 * 60 * 1000, // 5分钟
            maxMemoryUsage: options.maxMemoryUsage || 512 * 1024 * 1024, // 512MB
            
            // 性能监控
            enableMonitoring: options.enableMonitoring !== false,
            statsInterval: options.statsInterval || 60000, // 1分钟
        };
        
        // 内存缓存存储
        this.cache = new Map();
        this.cacheMetadata = new Map();
        
        // 统计信息
        this.stats = {
            hits: 0,
            misses: 0,
            totalRequests: 0,
            cacheSize: 0,
            memoryUsage: 0,
            totalItems: 0,
            startTime: Date.now(),
            lastCleanup: Date.now()
        };
        
        // 缓存性能指标
        this.metrics = {
            avgResponseTime: 0,
            cacheHitRatio: 0,
            cacheGrowthRate: 0,
            mostAccessedKeys: new Map(),
            responseTimeHistory: []
        };
        
        // 启动缓存监控
        if (this.config.enableMonitoring) {
            this.startMonitoring();
        }
        
        // 启动定期清理
        this.startCleanup();
        
        console.log('✅ API缓存系统初始化完成');
    }
    
    /**
     * 生成缓存键
     * @param {string} method - HTTP方法
     * @param {string} url - 请求URL
     * @param {string} userId - 用户ID
     * @param {Object} params - 请求参数
     * @returns {string} 缓存键
     */
    generateCacheKey(method, url, userId, params = {}) {
        const paramsString = JSON.stringify(params);
        const paramsHash = crypto.createHash('md5').update(paramsString).digest('hex');
        
        return `${method}:${url}:${userId || 'anonymous'}:${paramsHash}`;
    }
    
    /**
     * 获取缓存过期时间
     * @param {string} url - 请求URL
     * @returns {number} 过期时间（毫秒）
     */
    getCacheExpiry(url) {
        // 匹配缓存策略
        for (const [pattern, expiry] of Object.entries(this.config.strategies)) {
            if (url.includes(pattern)) {
                return expiry;
            }
        }
        
        // 默认缓存时间：1分钟
        return 60 * 1000;
    }
    
    /**
     * 检查是否应该缓存请求
     * @param {string} method - HTTP方法
     * @param {string} url - 请求URL
     * @returns {boolean} 是否应该缓存
     */
    shouldCache(method, url) {
        // 只缓存GET请求
        if (method !== 'GET') {
            return false;
        }
        
        // 不缓存实时数据端点
        if (url.includes('/realtime/') || url.includes('/stream/') || url.includes('/live/')) {
            return false;
        }
        
        // 不缓存健康检查和状态端点
        if (url.includes('/health') || url.includes('/status') || url.includes('/monitoring/realtime')) {
            return false;
        }
        
        // 检查缓存策略
        const expiry = this.getCacheExpiry(url);
        return expiry > 0;
    }
    
    /**
     * 缓存响应数据
     * @param {string} key - 缓存键
     * @param {any} data - 要缓存的数据
     * @param {number} expiry - 过期时间
     */
    set(key, data, expiry) {
        try {
            const serializedData = JSON.stringify(data);
            const size = Buffer.byteLength(serializedData, 'utf8');
            
            // 检查缓存大小限制
            if (this.stats.cacheSize + size > this.config.maxCacheSize) {
                this.cleanup();
            }
            
            // 检查缓存项数量限制
            if (this.stats.totalItems >= this.config.maxCacheItems) {
                this.cleanup();
            }
            
            const cacheEntry = {
                data: serializedData,
                timestamp: Date.now(),
                expiry: expiry,
                size: size
            };
            
            this.cache.set(key, cacheEntry);
            this.cacheMetadata.set(key, {
                accessCount: 1,
                lastAccessed: Date.now(),
                created: Date.now()
            });
            
            this.stats.cacheSize += size;
            this.stats.totalItems = this.cache.size;
            
            // 记录访问统计
            this.recordAccess(key);
            
            this.emit('cacheSet', { key, size, expiry });
            
        } catch (error) {
            console.error('缓存数据失败:', error);
        }
    }
    
    /**
     * 获取缓存数据
     * @param {string} key - 缓存键
     * @returns {any|null} 缓存的数据或null
     */
    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            this.stats.totalRequests++;
            return null;
        }
        
        // 检查是否过期
        if (this.isExpired(key, entry)) {
            this.delete(key);
            this.stats.misses++;
            this.stats.totalRequests++;
            return null;
        }
        
        // 更新访问统计
        this.updateAccessStats(key);
        
        this.stats.hits++;
        this.stats.totalRequests++;
        
        try {
            const data = JSON.parse(entry.data);
            this.emit('cacheHit', { key });
            return data;
        } catch (error) {
            console.error('解析缓存数据失败:', error);
            this.delete(key);
            return null;
        }
    }
    
    /**
     * 检查缓存是否过期
     * @param {string} key - 缓存键
     * @param {Object} entry - 缓存条目
     * @returns {boolean} 是否过期
     */
    isExpired(key, entry) {
        return Date.now() - entry.timestamp > entry.expiry;
    }
    
    /**
     * 删除缓存项
     * @param {string} key - 缓存键
     */
    delete(key) {
        const entry = this.cache.get(key);
        if (entry) {
            this.stats.cacheSize -= entry.size;
            this.cache.delete(key);
            this.cacheMetadata.delete(key);
            this.stats.totalItems = this.cache.size;
            this.emit('cacheDelete', { key });
        }
    }
    
    /**
     * 清空所有缓存
     */
    clear() {
        this.cache.clear();
        this.cacheMetadata.clear();
        this.stats.cacheSize = 0;
        this.stats.totalItems = 0;
        this.emit('cacheClear');
    }
    
    /**
     * 智能清理过期缓存
     */
    cleanup() {
        const now = Date.now();
        const expiredKeys = [];
        
        // 清理过期项
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(key, entry)) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => this.delete(key));
        
        // 如果缓存仍然过大，清理最久未访问的项
        if (this.stats.cacheSize > this.config.maxCacheSize * 0.8) {
            this.cleanupLRU();
        }
        
        this.stats.lastCleanup = now;
        this.emit('cacheCleanup', { 
            expiredItems: expiredKeys.length,
            remainingItems: this.cache.size 
        });
    }
    
    /**
     * 清理最久未访问的缓存项（LRU算法）
     */
    cleanupLRU() {
        const itemsToDelete = [];
        
        // 按最后访问时间排序
        const sortedEntries = Array.from(this.cacheMetadata.entries())
            .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        // 删除最久未访问的25%缓存项
        const deleteCount = Math.ceil(this.cache.size * 0.25);
        for (let i = 0; i < deleteCount && i < sortedEntries.length; i++) {
            itemsToDelete.push(sortedEntries[i][0]);
        }
        
        itemsToDelete.forEach(key => this.delete(key));
    }
    
    /**
     * 记录访问统计
     * @param {string} key - 缓存键
     */
    recordAccess(key) {
        const accessCount = this.metrics.mostAccessedKeys.get(key) || 0;
        this.metrics.mostAccessedKeys.set(key, accessCount + 1);
    }
    
    /**
     * 更新访问统计
     * @param {string} key - 缓存键
     */
    updateAccessStats(key) {
        const metadata = this.cacheMetadata.get(key);
        if (metadata) {
            metadata.accessCount++;
            metadata.lastAccessed = Date.now();
        }
        
        this.recordAccess(key);
    }
    
    /**
     * 失效特定模式的缓存
     * @param {string} pattern - 匹配模式
     */
    invalidate(pattern) {
        const keysToDelete = [];
        
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.delete(key));
        
        this.emit('cacheInvalidate', { 
            pattern, 
            deletedItems: keysToDelete.length 
        });
        
        return keysToDelete.length;
    }
    
    /**
     * 获取缓存统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const hitRatio = this.stats.totalRequests > 0 
            ? (this.stats.hits / this.stats.totalRequests * 100).toFixed(2)
            : 0;
            
        const uptime = Date.now() - this.stats.startTime;
        const memoryUsage = process.memoryUsage();
        
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            totalRequests: this.stats.totalRequests,
            hitRatio: parseFloat(hitRatio),
            cacheSize: this.stats.cacheSize,
            totalItems: this.stats.totalItems,
            uptime: uptime,
            memoryUsage: {
                rss: memoryUsage.rss,
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal,
                external: memoryUsage.external
            },
            mostAccessedKeys: Array.from(this.metrics.mostAccessedKeys.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10),
            lastCleanup: this.stats.lastCleanup,
            timestamp: Date.now()
        };
    }
    
    /**
     * 获取缓存配置
     * @returns {Object} 缓存配置
     */
    getConfig() {
        return {
            strategies: this.config.strategies,
            maxCacheSize: this.config.maxCacheSize,
            maxCacheItems: this.config.maxCacheItems,
            cleanupInterval: this.config.cleanupInterval,
            maxMemoryUsage: this.config.maxMemoryUsage,
            enableMonitoring: this.config.enableMonitoring,
            statsInterval: this.config.statsInterval
        };
    }
    
    /**
     * 更新缓存配置
     * @param {Object} newConfig - 新配置
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        this.emit('configUpdate', newConfig);
    }
    
    /**
     * 启动监控
     */
    startMonitoring() {
        setInterval(() => {
            this.updateMetrics();
            this.emit('metricsUpdate', this.getStats());
        }, this.config.statsInterval);
    }
    
    /**
     * 更新性能指标
     */
    updateMetrics() {
        const stats = this.getStats();
        
        this.metrics.cacheHitRatio = stats.hitRatio;
        this.metrics.avgResponseTime = this.calculateAverageResponseTime();
        
        // 记录历史数据
        this.metrics.responseTimeHistory.push({
            timestamp: Date.now(),
            hitRatio: stats.hitRatio,
            cacheSize: stats.cacheSize,
            totalItems: stats.totalItems
        });
        
        // 保持最近100条记录
        if (this.metrics.responseTimeHistory.length > 100) {
            this.metrics.responseTimeHistory.shift();
        }
    }
    
    /**
     * 计算平均响应时间
     * @returns {number} 平均响应时间
     */
    calculateAverageResponseTime() {
        if (this.metrics.responseTimeHistory.length === 0) {
            return 0;
        }
        
        const recentHistory = this.metrics.responseTimeHistory.slice(-10);
        const totalTime = recentHistory.reduce((sum, item) => sum + item.timestamp, 0);
        return totalTime / recentHistory.length;
    }
    
    /**
     * 启动定期清理
     */
    startCleanup() {
        setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }
    
    /**
     * 预热缓存 - 预先加载常用数据
     * @param {Array} urls - 要预热的URL列表
     * @param {Function} fetchFunction - 获取数据的函数
     */
    async warmupCache(urls, fetchFunction) {
        console.log(`🚀 开始缓存预热，加载 ${urls.length} 个端点...`);
        
        for (const url of urls) {
            try {
                const data = await fetchFunction(url);
                const key = this.generateCacheKey('GET', url, 'system', {});
                const expiry = this.getCacheExpiry(url);
                
                this.set(key, data, expiry);
                console.log(`✅ 预热缓存: ${url}`);
            } catch (error) {
                console.error(`❌ 预热缓存失败: ${url}`, error);
            }
        }
        
        console.log('✅ 缓存预热完成');
    }
    
    /**
     * 导出缓存数据
     * @returns {Object} 缓存数据
     */
    exportCache() {
        const cacheData = {};
        
        for (const [key, entry] of this.cache.entries()) {
            cacheData[key] = {
                data: entry.data,
                timestamp: entry.timestamp,
                expiry: entry.expiry,
                size: entry.size
            };
        }
        
        return {
            cache: cacheData,
            metadata: Object.fromEntries(this.cacheMetadata),
            stats: this.getStats(),
            config: this.getConfig(),
            exportTime: Date.now()
        };
    }
    
    /**
     * 获取缓存健康状态
     * @returns {Object} 健康状态
     */
    getHealthStatus() {
        const stats = this.getStats();
        const memoryUsage = process.memoryUsage();
        
        const health = {
            status: 'healthy',
            issues: [],
            metrics: {}
        };
        
        // 检查缓存命中率
        if (stats.hitRatio < 50) {
            health.issues.push('缓存命中率较低');
            health.status = 'warning';
        }
        
        // 检查缓存大小
        if (stats.cacheSize > this.config.maxCacheSize * 0.9) {
            health.issues.push('缓存大小接近限制');
            health.status = 'warning';
        }
        
        // 检查内存使用
        if (memoryUsage.heapUsed > this.config.maxMemoryUsage) {
            health.issues.push('内存使用过高');
            health.status = 'critical';
        }
        
        health.metrics = {
            hitRatio: stats.hitRatio,
            cacheSize: stats.cacheSize,
            memoryUsage: memoryUsage.heapUsed,
            totalItems: stats.totalItems
        };
        
        return health;
    }
}

/**
 * 创建Express中间件
 * @param {ApiCache} cache - 缓存实例
 * @returns {Function} Express中间件
 */
function createCacheMiddleware(cache) {
    return (req, res, next) => {
        const { method, url, user } = req;
        
        // 检查是否应该缓存
        if (!cache.shouldCache(method, url)) {
            return next();
        }
        
        // 生成缓存键
        const cacheKey = cache.generateCacheKey(
            method, 
            url, 
            user?.id, 
            req.query
        );
        
        // 尝试从缓存获取
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
            // 从缓存返回
            res.set('X-Cache', 'HIT');
            res.set('X-Cache-Key', cacheKey);
            res.set('X-Cache-Age', Math.floor((Date.now() - cachedData.timestamp) / 1000));
            
            return res.json({
                success: true,
                data: cachedData.data,
                cached: true,
                cacheInfo: {
                    hit: true,
                    key: cacheKey,
                    age: Math.floor((Date.now() - cachedData.timestamp) / 1000)
                }
            });
        }
        
        // 缓存未命中，继续处理请求
        res.set('X-Cache', 'MISS');
        
        // 拦截res.json方法来缓存响应
        const originalJson = res.json.bind(res);
        res.json = function(data) {
            // 只有成功的响应才缓存
            if (data && data.success !== false) {
                const expiry = cache.getCacheExpiry(url);
                if (expiry > 0) {
                    cache.set(cacheKey, data, expiry);
                    res.set('X-Cache', 'SET');
                }
            }
            
            return originalJson(data);
        };
        
        next();
    };
}

module.exports = {
    ApiCache,
    createCacheMiddleware
};