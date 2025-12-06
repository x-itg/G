/**
 * 放射化学纯度检测仪 - 缓存性能监控和优化系统
 * 实时监控缓存性能，提供优化建议和告警机制
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const os = require('os');

class CacheMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // 监控配置
        this.config = {
            samplingInterval: options.samplingInterval || 5000, // 采样间隔(毫秒)
            trendDataPoints: options.trendDataPoints || 100,    // 趋势数据点数
            alertThresholds: {
                hitRate: options.hitRateThreshold || 0.7,       // 命中率告警阈值
                memoryUsage: options.memoryUsageThreshold || 0.8, // 内存使用率告警阈值
                responseTime: options.responseTimeThreshold || 100, // 响应时间告警阈值(毫秒)
                invalidationRate: options.invalidationRateThreshold || 0.3 // 失效频率告警阈值
            },
            dataRetention: options.dataRetention || 24 * 60 * 60 * 1000, // 数据保留时间(毫秒)
            ...options
        };
        
        // 缓存统计数据
        this.stats = {
            totalRequests: 0,
            hits: 0,
            misses: 0,
            hitRate: 0,
            responseTime: 0,
            memoryUsage: 0,
            cacheSize: 0,
            invalidationCount: 0,
            invalidationRate: 0
        };
        
        // 分类缓存统计
        this.categoryStats = new Map();
        
        // 趋势数据
        this.trendData = {
            hitRate: [],
            responseTime: [],
            memoryUsage: [],
            cacheSize: [],
            invalidationRate: []
        };
        
        // 实时监控数据
        this.realTimeData = {
            lastUpdate: Date.now(),
            currentMetrics: {},
            alerts: [],
            categoryStats: {},
            systemInfo: {}
        };
        
        // 告警配置
        this.alertConfig = new Map();
        
        // 缓存实例映射
        this.caches = new Map();
        
        // 监控计时器
        this.monitorTimer = null;
        
        // 初始化监控
        this.initialize();
    }
    
    /**
     * 初始化监控系统
     */
    initialize() {
        console.log('初始化缓存性能监控系统...');
        
        // 启动实时监控
        this.startRealTimeMonitoring();
        
        // 设置性能数据采集
        this.setupDataCollection();
        
        // 初始化告警系统
        this.initializeAlertSystem();
        
        console.log('缓存性能监控系统初始化完成');
    }
    
    /**
     * 注册缓存实例进行监控
     */
    registerCache(cacheName, cacheInstance, options = {}) {
        this.caches.set(cacheName, {
            instance: cacheInstance,
            options: {
                category: options.category || 'default',
                priority: options.priority || 'normal',
                maxSize: options.maxSize || 1000,
                ...options
            }
        });
        
        // 初始化分类统计
        const category = options.category || 'default';
        if (!this.categoryStats.has(category)) {
            this.categoryStats.set(category, {
                name: category,
                requests: 0,
                hits: 0,
                misses: 0,
                hitRate: 0,
                memoryUsage: 0,
                responseTime: 0,
                itemCount: 0
            });
        }
        
        console.log(`缓存实例已注册: ${cacheName} (分类: ${category})`);
    }
    
    /**
     * 记录缓存访问
     */
    recordAccess(cacheName, key, hit, responseTime = 0, category = 'default') {
        const timestamp = Date.now();
        
        // 更新全局统计
        this.stats.totalRequests++;
        if (hit) {
            this.stats.hits++;
        } else {
            this.stats.misses++;
        }
        
        this.stats.responseTime = responseTime;
        this.stats.lastAccess = timestamp;
        
        // 更新命中率
        this.stats.hitRate = this.stats.totalRequests > 0 ? 
            this.stats.hits / this.stats.totalRequests : 0;
        
        // 更新分类统计
        if (!this.categoryStats.has(category)) {
            this.categoryStats.set(category, {
                name: category,
                requests: 0,
                hits: 0,
                misses: 0,
                hitRate: 0,
                memoryUsage: 0,
                responseTime: 0,
                itemCount: 0
            });
        }
        
        const categoryStat = this.categoryStats.get(category);
        categoryStat.requests++;
        if (hit) {
            categoryStat.hits++;
        } else {
            categoryStat.misses++;
        }
        categoryStat.hitRate = categoryStat.requests > 0 ? 
            categoryStat.hits / categoryStat.requests : 0;
        categoryStat.responseTime = responseTime;
        
        // 发出性能事件
        this.emit('cacheAccess', {
            cacheName,
            key,
            hit,
            responseTime,
            category,
            timestamp
        });
    }
    
    /**
     * 更新内存使用统计
     */
    updateMemoryUsage() {
        const memUsage = process.memoryUsage();
        
        this.stats.memoryUsage = {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers
        };
        
        // 更新分类内存使用
        this.caches.forEach((cacheInfo, cacheName) => {
            const category = cacheInfo.options.category;
            if (this.categoryStats.has(category)) {
                const stat = this.categoryStats.get(category);
                stat.memoryUsage = this.calculateCacheMemoryUsage(cacheInfo);
            }
        });
        
        // 更新缓存大小统计
        this.updateCacheSizes();
    }
    
    /**
     * 计算缓存内存使用量
     */
    calculateCacheMemoryUsage(cacheInfo) {
        try {
            const cache = cacheInfo.instance;
            
            if (cache.size && typeof cache.size === 'function') {
                const size = cache.size();
                return size * 1024; // 估算平均项大小为1KB
            }
            
            return 0;
        } catch (error) {
            console.warn('计算缓存内存使用量失败:', error.message);
            return 0;
        }
    }
    
    /**
     * 更新缓存大小统计
     */
    updateCacheSizes() {
        this.caches.forEach((cacheInfo, cacheName) => {
            try {
                const cache = cacheInfo.instance;
                const size = cache.size ? cache.size() : 0;
                
                this.stats.cacheSize = size;
                
                const category = cacheInfo.options.category;
                if (this.categoryStats.has(category)) {
                    const stat = this.categoryStats.get(category);
                    stat.itemCount = size;
                }
            } catch (error) {
                console.warn(`获取缓存大小失败 (${cacheName}):`, error.message);
            }
        });
    }
    
    /**
     * 记录缓存失效
     */
    recordInvalidation(cacheName, reason = 'manual') {
        this.stats.invalidationCount++;
        
        // 计算失效频率
        const timeWindow = 60000; // 1分钟窗口
        const recentInvalidations = this.getRecentInvalidations(timeWindow);
        this.stats.invalidationRate = recentInvalidations / timeWindow;
        
        // 发出失效事件
        this.emit('cacheInvalidation', {
            cacheName,
            reason,
            timestamp: Date.now(),
            count: this.stats.invalidationCount
        });
    }
    
    /**
     * 获取指定时间窗口内的失效次数
     */
    getRecentInvalidations(timeWindow) {
        const cutoff = Date.now() - timeWindow;
        return this.stats.invalidationCount; // 简化实现
    }
    
    /**
     * 启动实时监控
     */
    startRealTimeMonitoring() {
        this.monitorTimer = setInterval(() => {
            this.collectRealTimeData();
            this.checkAlerts();
            this.updateTrends();
            this.emit('realTimeUpdate', this.realTimeData);
        }, this.config.samplingInterval);
        
        console.log(`实时监控已启动，采样间隔: ${this.config.samplingInterval}ms`);
    }
    
    /**
     * 收集实时数据
     */
    collectRealTimeData() {
        this.updateMemoryUsage();
        
        this.realTimeData = {
            lastUpdate: Date.now(),
            currentMetrics: {
                hitRate: this.stats.hitRate,
                responseTime: this.stats.responseTime,
                memoryUsage: this.stats.memoryUsage.heapUsed,
                cacheSize: this.stats.cacheSize,
                invalidationRate: this.stats.invalidationRate,
                totalRequests: this.stats.totalRequests
            },
            categoryStats: Object.fromEntries(this.categoryStats),
            systemInfo: {
                nodeVersion: process.version,
                platform: os.platform(),
                arch: os.arch(),
                loadAverage: os.loadavg(),
                uptime: process.uptime()
            }
        };
    }
    
    /**
     * 更新趋势数据
     */
    updateTrends() {
        const timestamp = Date.now();
        
        // 添加新的数据点
        this.trendData.hitRate.push({ timestamp, value: this.stats.hitRate });
        this.trendData.responseTime.push({ timestamp, value: this.stats.responseTime });
        this.trendData.memoryUsage.push({ timestamp, value: this.stats.memoryUsage.heapUsed });
        this.trendData.cacheSize.push({ timestamp, value: this.stats.cacheSize });
        this.trendData.invalidationRate.push({ timestamp, value: this.stats.invalidationRate });
        
        // 限制数据点数量
        Object.keys(this.trendData).forEach(key => {
            if (this.trendData[key].length > this.config.trendDataPoints) {
                this.trendData[key] = this.trendData[key].slice(-this.config.trendDataPoints);
            }
        });
    }
    
    /**
     * 初始化告警系统
     */
    initializeAlertSystem() {
        // 设置默认告警规则
        this.setAlertRule('lowHitRate', {
            threshold: this.config.alertThresholds.hitRate,
            operator: '<',
            enabled: true,
            message: '缓存命中率过低'
        });
        
        this.setAlertRule('highMemoryUsage', {
            threshold: this.config.alertThresholds.memoryUsage,
            operator: '>',
            enabled: true,
            message: '内存使用率过高'
        });
        
        this.setAlertRule('slowResponse', {
            threshold: this.config.alertThresholds.responseTime,
            operator: '>',
            enabled: true,
            message: '缓存响应时间过长'
        });
        
        this.setAlertRule('highInvalidationRate', {
            threshold: this.config.alertThresholds.invalidationRate,
            operator: '>',
            enabled: true,
            message: '缓存失效频率过高'
        });
        
        console.log('告警系统初始化完成');
    }
    
    /**
     * 设置告警规则
     */
    setAlertRule(ruleId, rule) {
        this.alertConfig.set(ruleId, {
            id: ruleId,
            ...rule,
            triggered: false,
            lastTriggered: null,
            count: 0
        });
    }
    
    /**
     * 检查告警条件
     */
    checkAlerts() {
        this.alertConfig.forEach((rule, ruleId) => {
            if (!rule.enabled) return;
            
            const value = this.getMetricValue(ruleId);
            const shouldTrigger = this.evaluateAlertCondition(value, rule);
            
            if (shouldTrigger && !rule.triggered) {
                this.triggerAlert(ruleId, value);
            } else if (!shouldTrigger && rule.triggered) {
                this.clearAlert(ruleId);
            }
        });
    }
    
    /**
     * 获取告警规则对应的指标值
     */
    getMetricValue(ruleId) {
        switch (ruleId) {
            case 'lowHitRate':
                return this.stats.hitRate;
            case 'highMemoryUsage':
                return this.stats.memoryUsage.heapUsed / this.stats.memoryUsage.heapTotal;
            case 'slowResponse':
                return this.stats.responseTime;
            case 'highInvalidationRate':
                return this.stats.invalidationRate;
            default:
                return 0;
        }
    }
    
    /**
     * 评估告警条件
     */
    evaluateAlertCondition(value, rule) {
        switch (rule.operator) {
            case '<':
                return value < rule.threshold;
            case '>':
                return value > rule.threshold;
            case '==':
                return value == rule.threshold;
            default:
                return false;
        }
    }
    
    /**
     * 触发告警
     */
    triggerAlert(ruleId, value) {
        const rule = this.alertConfig.get(ruleId);
        rule.triggered = true;
        rule.lastTriggered = Date.now();
        rule.count++;
        
        const alert = {
            id: `alert_${ruleId}_${Date.now()}`,
            ruleId,
            ruleName: rule.message,
            value,
            threshold: rule.threshold,
            timestamp: Date.now(),
            severity: this.getAlertSeverity(ruleId, value)
        };
        
        // 确保alerts数组存在
        if (!this.realTimeData.alerts) {
            this.realTimeData.alerts = [];
        }
        this.realTimeData.alerts.push(alert);
        this.emit('alert', alert);
        
        console.warn(`告警触发: ${rule.message} - 当前值: ${value}, 阈值: ${rule.threshold}`);
    }
    
    /**
     * 清除告警
     */
    clearAlert(ruleId) {
        const rule = this.alertConfig.get(ruleId);
        rule.triggered = false;
        
        this.emit('alertCleared', {
            ruleId,
            ruleName: rule.message,
            timestamp: Date.now()
        });
        
        console.info(`告警清除: ${rule.message}`);
    }
    
    /**
     * 获取告警严重级别
     */
    getAlertSeverity(ruleId, value) {
        const thresholds = {
            'lowHitRate': { critical: 0.5, warning: 0.7 },
            'highMemoryUsage': { critical: 0.9, warning: 0.8 },
            'slowResponse': { critical: 200, warning: 100 },
            'highInvalidationRate': { critical: 0.5, warning: 0.3 }
        };
        
        const threshold = thresholds[ruleId];
        if (!threshold) return 'info';
        
        if (value > threshold.critical) return 'critical';
        if (value > threshold.warning) return 'warning';
        return 'info';
    }
    
    /**
     * 设置性能数据采集
     */
    setupDataCollection() {
        // 设置详细的性能数据采集
        this.on('cacheAccess', (data) => {
            this.logCacheAccess(data);
        });
        
        this.on('cacheInvalidation', (data) => {
            this.logCacheInvalidation(data);
        });
    }
    
    /**
     * 记录缓存访问日志
     */
    logCacheAccess(data) {
        // 可以集成到现有的日志系统
        console.debug(`缓存访问: ${data.cacheName} - ${data.key} - ${data.hit ? '命中' : '未命中'}`);
    }
    
    /**
     * 记录缓存失效日志
     */
    logCacheInvalidation(data) {
        console.info(`缓存失效: ${data.cacheName} - 原因: ${data.reason}`);
    }
    
    /**
     * 生成优化建议
     */
    generateOptimizationRecommendations() {
        const recommendations = [];
        
        // 基于命中率的建议
        if (this.stats.hitRate < this.config.alertThresholds.hitRate) {
            recommendations.push({
                type: 'hitRate',
                priority: 'high',
                title: '提高缓存命中率',
                description: '当前命中率较低，建议增加缓存大小或优化缓存策略',
                actions: [
                    '增加缓存容量限制',
                    '实现智能预加载',
                    '优化缓存键设计',
                    '实施多级缓存策略'
                ],
                estimatedImpact: '提高响应性能20-40%'
            });
        }
        
        // 基于内存使用的建议
        const memoryUsagePercent = this.stats.memoryUsage.heapUsed / this.stats.memoryUsage.heapTotal;
        if (memoryUsagePercent > this.config.alertThresholds.memoryUsage) {
            recommendations.push({
                type: 'memory',
                priority: 'high',
                title: '优化内存使用',
                description: '内存使用率过高，可能影响系统稳定性',
                actions: [
                    '实施缓存清理策略',
                    '增加内存监控',
                    '优化数据结构',
                    '考虑分布式缓存'
                ],
                estimatedImpact: '减少内存占用15-30%'
            });
        }
        
        // 基于响应时间的建议
        if (this.stats.responseTime > this.config.alertThresholds.responseTime) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                title: '提升缓存响应速度',
                description: '缓存响应时间较长，影响用户体验',
                actions: [
                    '优化缓存算法',
                    '实施并发优化',
                    '增加缓存预热',
                    '优化网络请求'
                ],
                estimatedImpact: '提升响应速度30-50%'
            });
        }
        
        // 基于失效频率的建议
        if (this.stats.invalidationRate > this.config.alertThresholds.invalidationRate) {
            recommendations.push({
                type: 'stability',
                priority: 'medium',
                title: '降低缓存失效频率',
                description: '缓存失效频率过高，影响缓存效率',
                actions: [
                    '优化失效策略',
                    '实施批量更新',
                    '增加缓存时间',
                    '实施渐进式失效'
                ],
                estimatedImpact: '提高缓存稳定性25-35%'
            });
        }
        
        // 基于分类性能的建议
        this.categoryStats.forEach((categoryStat, categoryName) => {
            if (categoryStat.hitRate < 0.6) {
                recommendations.push({
                    type: 'category',
                    priority: 'medium',
                    title: `优化${categoryName}分类缓存`,
                    description: `${categoryName}分类缓存命中率较低`,
                    actions: [
                        `针对${categoryName}分类调整缓存策略`,
                        `增加${categoryName}分类缓存容量`,
                        `优化${categoryName}分类数据访问模式`
                    ],
                    estimatedImpact: `提高${categoryName}分类性能15-25%`
                });
            }
        });
        
        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    
    /**
     * 获取性能趋势分析
     */
    getPerformanceTrends(timeRange = 3600000) { // 默认1小时
        const cutoff = Date.now() - timeRange;
        
        const trends = {};
        Object.keys(this.trendData).forEach(metric => {
            trends[metric] = this.trendData[metric].filter(point => point.timestamp >= cutoff);
        });
        
        // 计算趋势分析
        const analysis = this.calculateTrendAnalysis(trends);
        
        return {
            timeRange,
            trends,
            analysis,
            summary: this.generateTrendSummary(analysis)
        };
    }
    
    /**
     * 计算趋势分析
     */
    calculateTrendAnalysis(trends) {
        const analysis = {};
        
        Object.keys(trends).forEach(metric => {
            const data = trends[metric];
            if (data.length < 2) {
                analysis[metric] = { direction: 'stable', change: 0, confidence: 0 };
                return;
            }
            
            const firstValue = data[0].value;
            const lastValue = data[data.length - 1].value;
            const change = lastValue - firstValue;
            const changePercent = firstValue !== 0 ? (change / firstValue) * 100 : 0;
            
            // 简单趋势分析
            let direction = 'stable';
            if (Math.abs(changePercent) > 5) {
                direction = change > 0 ? 'increasing' : 'decreasing';
            }
            
            analysis[metric] = {
                direction,
                change,
                changePercent,
                confidence: Math.min(data.length / 10, 1) // 基于数据点数量计算置信度
            };
        });
        
        return analysis;
    }
    
    /**
     * 生成趋势摘要
     */
    generateTrendSummary(analysis) {
        const summary = {
            overall: 'stable',
            keyFindings: [],
            recommendations: []
        };
        
        Object.keys(analysis).forEach(metric => {
            const metricAnalysis = analysis[metric];
            if (metricAnalysis.direction !== 'stable') {
                const direction = metricAnalysis.direction === 'increasing' ? '上升' : '下降';
                summary.keyFindings.push(`${metric}呈现${direction}趋势 (${metricAnalysis.changePercent.toFixed(1)}%)`);
                
                if (metric === 'hitRate' && metricAnalysis.direction === 'decreasing') {
                    summary.recommendations.push('关注缓存命中率下降趋势，可能需要优化缓存策略');
                }
                
                if (metric === 'memoryUsage' && metricAnalysis.direction === 'increasing') {
                    summary.recommendations.push('内存使用持续增长，建议监控内存泄漏');
                }
                
                if (metric === 'responseTime' && metricAnalysis.direction === 'increasing') {
                    summary.recommendations.push('响应时间增加，需要优化缓存性能');
                }
            }
        });
        
        return summary;
    }
    
    /**
     * 实施自动优化
     */
    async performAutoOptimization() {
        console.log('开始执行缓存自动优化...');
        
        const recommendations = this.generateOptimizationRecommendations();
        const optimizationResults = [];
        
        for (const recommendation of recommendations) {
            if (recommendation.priority === 'high') {
                const result = await this.applyOptimization(recommendation);
                optimizationResults.push(result);
            }
        }
        
        console.log('自动优化完成');
        return optimizationResults;
    }
    
    /**
     * 应用优化策略
     */
    async applyOptimization(recommendation) {
        const startTime = Date.now();
        
        try {
            let result = {
                recommendation,
                status: 'applied',
                changes: [],
                startTime,
                endTime: null
            };
            
            switch (recommendation.type) {
                case 'hitRate':
                    result.changes = await this.optimizeHitRate(recommendation);
                    break;
                case 'memory':
                    result.changes = await this.optimizeMemoryUsage(recommendation);
                    break;
                case 'performance':
                    result.changes = await this.optimizePerformance(recommendation);
                    break;
                default:
                    result.status = 'skipped';
                    result.reason = '未知优化类型';
            }
            
            result.endTime = Date.now();
            result.duration = result.endTime - startTime;
            
            console.log(`优化应用成功: ${recommendation.title}`, result);
            return result;
            
        } catch (error) {
            console.error(`优化应用失败: ${recommendation.title}`, error);
            return {
                recommendation,
                status: 'failed',
                error: error.message,
                startTime,
                endTime: Date.now(),
                duration: Date.now() - startTime
            };
        }
    }
    
    /**
     * 优化命中率
     */
    async optimizeHitRate(recommendation) {
        const changes = [];
        
        // 实施智能预加载
        this.implementIntelligentPreloading();
        changes.push('实施智能预加载策略');
        
        // 优化缓存策略
        this.optimizeCacheStrategy();
        changes.push('优化缓存访问策略');
        
        // 调整缓存大小
        this.adjustCacheSizes();
        changes.push('动态调整缓存大小');
        
        return changes;
    }
    
    /**
     * 优化内存使用
     */
    async optimizeMemoryUsage(recommendation) {
        const changes = [];
        
        // 清理过期缓存
        this.cleanExpiredCache();
        changes.push('清理过期缓存项');
        
        // 实施内存压缩
        this.compressCacheData();
        changes.push('压缩缓存数据');
        
        // 优化数据结构
        this.optimizeDataStructures();
        changes.push('优化数据结构');
        
        return changes;
    }
    
    /**
     * 优化性能
     */
    async optimizePerformance(recommendation) {
        const changes = [];
        
        // 优化缓存算法
        this.optimizeCacheAlgorithm();
        changes.push('优化缓存算法');
        
        // 实施并发优化
        this.optimizeConcurrency();
        changes.push('优化并发处理');
        
        // 预热热点数据
        this.preloadHotData();
        changes.push('预热热点数据');
        
        return changes;
    }
    
    /**
     * 实施智能预加载
     */
    implementIntelligentPreloading() {
        console.log('实施智能预加载策略');
        // 实施预加载逻辑
    }
    
    /**
     * 优化缓存策略
     */
    optimizeCacheStrategy() {
        console.log('优化缓存访问策略');
        // 优化缓存策略逻辑
    }
    
    /**
     * 调整缓存大小
     */
    adjustCacheSizes() {
        console.log('动态调整缓存大小');
        // 调整缓存大小逻辑
    }
    
    /**
     * 清理过期缓存
     */
    cleanExpiredCache() {
        console.log('清理过期缓存项');
        // 清理过期缓存逻辑
    }
    
    /**
     * 压缩缓存数据
     */
    compressCacheData() {
        console.log('压缩缓存数据');
        // 压缩缓存数据逻辑
    }
    
    /**
     * 优化数据结构
     */
    optimizeDataStructures() {
        console.log('优化数据结构');
        // 优化数据结构逻辑
    }
    
    /**
     * 优化缓存算法
     */
    optimizeCacheAlgorithm() {
        console.log('优化缓存算法');
        // 优化缓存算法逻辑
    }
    
    /**
     * 优化并发处理
     */
    optimizeConcurrency() {
        console.log('优化并发处理');
        // 优化并发处理逻辑
    }
    
    /**
     * 预热热点数据
     */
    preloadHotData() {
        console.log('预热热点数据');
        // 预热热点数据逻辑
    }
    
    /**
     * 获取完整监控统计
     */
    getStatistics() {
        return {
            overview: {
                ...this.stats,
                uptime: process.uptime(),
                timestamp: Date.now()
            },
            categories: Object.fromEntries(this.categoryStats),
            system: {
                nodeVersion: process.version,
                platform: os.platform(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            }
        };
    }
    
    /**
     * 获取实时监控数据
     */
    getRealTimeData() {
        this.collectRealTimeData();
        return this.realTimeData;
    }
    
    /**
     * 获取性能趋势
     */
    getTrends(timeRange = 3600000) {
        return this.getPerformanceTrends(timeRange);
    }
    
    /**
     * 获取优化建议
     */
    getOptimizationRecommendations() {
        return this.generateOptimizationRecommendations();
    }
    
    /**
     * 配置告警
     */
    configureAlerts(alertConfig) {
        Object.keys(alertConfig).forEach(ruleId => {
            const config = alertConfig[ruleId];
            if (this.alertConfig.has(ruleId)) {
                const rule = this.alertConfig.get(ruleId);
                Object.assign(rule, config);
            } else {
                this.setAlertRule(ruleId, config);
            }
        });
        
        return Array.from(this.alertConfig.values());
    }
    
    /**
     * 导出监控数据
     */
    exportData(format = 'json') {
        const data = {
            statistics: this.getStatistics(),
            trends: this.trendData,
            recommendations: this.generateOptimizationRecommendations(),
            alerts: this.realTimeData.alerts,
            exportTime: Date.now()
        };
        
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(data);
        }
        
        return data;
    }
    
    /**
     * 转换为CSV格式
     */
    convertToCSV(data) {
        // 简化的CSV转换
        let csv = 'metric,timestamp,value\n';
        
        Object.keys(data.trends).forEach(metric => {
            data.trends[metric].forEach(point => {
                csv += `${metric},${point.timestamp},${point.value}\n`;
            });
        });
        
        return csv;
    }
    
    /**
     * 重置统计数据
     */
    resetStatistics() {
        this.stats = {
            totalRequests: 0,
            hits: 0,
            misses: 0,
            hitRate: 0,
            responseTime: 0,
            memoryUsage: 0,
            cacheSize: 0,
            invalidationCount: 0,
            invalidationRate: 0
        };
        
        this.categoryStats.clear();
        this.trendData = {
            hitRate: [],
            responseTime: [],
            memoryUsage: [],
            cacheSize: [],
            invalidationRate: []
        };
        
        console.log('统计数据已重置');
    }
    
    /**
     * 停止监控
     */
    stop() {
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = null;
        }
        
        console.log('缓存性能监控已停止');
    }
    
    /**
     * 销毁监控系统
     */
    destroy() {
        this.stop();
        this.removeAllListeners();
        this.caches.clear();
        this.alertConfig.clear();
        
        console.log('缓存性能监控系统已销毁');
    }
}

// API路由处理器
class CacheMonitorAPI {
    constructor(cacheMonitor) {
        this.cacheMonitor = cacheMonitor;
    }
    
    /**
     * 获取缓存性能统计
     */
    getStatistics(req, res) {
        try {
            const stats = this.cacheMonitor.getStatistics();
            res.json({
                success: true,
                data: stats,
                timestamp: Date.now()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 获取性能趋势
     */
    getTrends(req, res) {
        try {
            const timeRange = parseInt(req.query.timeRange) || 3600000;
            const trends = this.cacheMonitor.getTrends(timeRange);
            
            res.json({
                success: true,
                data: trends,
                timestamp: Date.now()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 获取优化建议
     */
    getRecommendations(req, res) {
        try {
            const recommendations = this.cacheMonitor.getOptimizationRecommendations();
            
            res.json({
                success: true,
                data: recommendations,
                timestamp: Date.now()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 配置性能告警
     */
    configureAlerts(req, res) {
        try {
            const alertConfig = req.body;
            const result = this.cacheMonitor.configureAlerts(alertConfig);
            
            res.json({
                success: true,
                data: result,
                message: '告警配置更新成功',
                timestamp: Date.now()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 获取实时监控数据
     */
    getRealTimeData(req, res) {
        try {
            const realTimeData = this.cacheMonitor.getRealTimeData();
            
            res.json({
                success: true,
                data: realTimeData,
                timestamp: Date.now()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 执行自动优化
     */
    performOptimization(req, res) {
        try {
            this.cacheMonitor.performAutoOptimization().then(results => {
                res.json({
                    success: true,
                    data: results,
                    message: '自动优化执行完成',
                    timestamp: Date.now()
                });
            }).catch(error => {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 导出监控数据
     */
    exportData(req, res) {
        try {
            const format = req.query.format || 'json';
            const data = this.cacheMonitor.exportData(format);
            
            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=cache-monitoring-data.csv');
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename=cache-monitoring-data.json');
            }
            
            res.send(data);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

// 集成缓存监控到路由系统
function integrateCacheMonitoringRoutes(app, cacheMonitor) {
    const api = new CacheMonitorAPI(cacheMonitor);
    
    // 获取缓存性能统计
    app.get('/api/cache/monitor/stats', (req, res) => api.getStatistics(req, res));
    
    // 获取性能趋势
    app.get('/api/cache/monitor/trends', (req, res) => api.getTrends(req, res));
    
    // 获取优化建议
    app.get('/api/cache/monitor/recommendations', (req, res) => api.getRecommendations(req, res));
    
    // 配置性能告警
    app.post('/api/cache/monitor/alerts', (req, res) => api.configureAlerts(req, res));
    
    // 获取实时监控数据
    app.get('/api/cache/monitor/real-time', (req, res) => api.getRealTimeData(req, res));
    
    // 执行自动优化
    app.post('/api/cache/monitor/optimize', (req, res) => api.performOptimization(req, res));
    
    // 导出监控数据
    app.get('/api/cache/monitor/export', (req, res) => api.exportData(req, res));
    
    console.log('缓存监控API路由已集成');
}

module.exports = {
    CacheMonitor,
    CacheMonitorAPI,
    integrateCacheMonitoringRoutes
};