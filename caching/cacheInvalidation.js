/**
 * 放射化学纯度检测仪 - 智能缓存失效策略系统
 * 支持多级缓存失效、事件驱动架构、批量失效等高级功能
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

class CacheInvalidationManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            // TTL配置
            defaultTTL: 3600, // 1小时
            maxTTL: 86400, // 24小时
            minTTL: 60, // 1分钟
            
            // 批量操作配置
            batchSize: 100,
            batchTimeout: 5000, // 5秒
            
            // 失效策略配置
            smartInvalidation: true,
            predictiveInvalidation: true,
            
            // 性能配置
            asyncTimeout: 30000,
            enableMonitoring: true,
            ...config
        };
        
        // 缓存失效记录
        this.invalidationHistory = new Map();
        this.activeInvalidations = new Map();
        
        // 失效队列
        this.invalidationQueue = [];
        this.batchQueue = new Map();
        this.processingQueue = false;
        
        // 智能失效策略
        this.accessPatterns = new Map();
        this.predictionCache = new Map();
        
        // 性能监控
        this.performanceMetrics = {
            totalInvalidations: 0,
            successfulInvalidations: 0,
            failedInvalidations: 0,
            averageInvalidationTime: 0,
            lastInvalidationTime: null
        };
        
        // 事件监听器
        this.setupEventListeners();
        
        // 启动定时任务（仅在非测试环境中）
        if (!process.env.TESTING) {
            this.startScheduler();
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 数据变更事件
        this.on('data:updated', (data) => {
            this.handleDataUpdate(data);
        });
        
        // 用户操作事件
        this.on('user:action', (action) => {
            this.handleUserAction(action);
        });
        
        // 系统事件
        this.on('system:event', (event) => {
            this.handleSystemEvent(event);
        });
        
        // 缓存失效完成事件
        this.on('cache:invalidated', (result) => {
            this.handleInvalidationComplete(result);
        });
    }
    
    /**
     * TTL失效策略
     * @param {string} cacheKey - 缓存键
     * @param {number} ttl - 过期时间（秒）
     * @returns {string} 定时器ID
     */
    setupTTLInvalidation(cacheKey, ttl = this.config.defaultTTL) {
        const effectiveTTL = Math.max(
            this.config.minTTL, 
            Math.min(this.config.maxTTL, ttl)
        );
        
        const timerId = setTimeout(() => {
            this.invalidateCache(cacheKey, {
                type: 'ttl',
                reason: 'TTL expired',
                timestamp: Date.now()
            });
        }, effectiveTTL * 1000);
        
        this.activeInvalidations.set(cacheKey, {
            type: 'ttl',
            timerId,
            scheduledTime: Date.now() + (effectiveTTL * 1000),
            ttl: effectiveTTL
        });
        
        return timerId;
    }
    
    /**
     * 主动失效机制
     * @param {string|string[]} cacheKeys - 缓存键或键数组
     * @param {Object} options - 失效选项
     */
    async invalidateCache(cacheKeys, options = {}) {
        const keys = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
        const results = [];
        
        const startTime = Date.now();
        
        try {
            for (const key of keys) {
                const result = await this.invalidateSingleCache(key, options);
                results.push(result);
                
                // 记录失效历史
                this.recordInvalidation(key, options);
                
                // 发送失效事件
                this.emit('cache:invalidated', { key, result, options });
            }
            
            // 更新性能指标
            this.updatePerformanceMetrics(Date.now() - startTime, true);
            
            return {
                success: true,
                invalidatedKeys: keys,
                results: results,
                timestamp: Date.now()
            };
            
        } catch (error) {
            console.log('invalidateCache error caught:', error.message);
            console.log('Error stack:', error.stack);
            this.updatePerformanceMetrics(Date.now() - startTime, false);
            throw new Error(`缓存失效失败: ${error.message}`);
        }
    }
    
    /**
     * 单个缓存失效
     * @param {string} cacheKey - 缓存键
     * @param {Object} options - 失效选项
     */
    async invalidateSingleCache(cacheKey, options = {}) {
        // 清除TTL定时器
        this.clearTTLInvalidation(cacheKey);
        
        // 清除智能预测缓存
        this.predictionCache.delete(cacheKey);
        
        // 触发实际的缓存清除操作
        if (typeof this.onCacheInvalidate === 'function') {
            await this.onCacheInvalidate(cacheKey, options);
        }
        
        return {
            key: cacheKey,
            invalidated: true,
            timestamp: Date.now(),
            method: options.type || 'manual'
        };
    }
    
    /**
     * 清除TTL失效定时器
     * @param {string} cacheKey - 缓存键
     */
    clearTTLInvalidation(cacheKey) {
        const invalidation = this.activeInvalidations.get(cacheKey);
        if (invalidation && invalidation.type === 'ttl' && invalidation.timerId) {
            clearTimeout(invalidation.timerId);
            this.activeInvalidations.delete(cacheKey);
        }
    }
    
    /**
     * 批量失效支持
     * @param {Object} batchRequest - 批量失效请求
     */
    async batchInvalidate(batchRequest) {
        const {
            keys = [],
            pattern = null,
            tags = [],
            batchId = this.generateBatchId(),
            options = {}
        } = batchRequest;
        
        // 生成批量ID
        this.batchQueue.set(batchId, {
            keys: [],
            pattern,
            tags,
            options,
            createdAt: Date.now(),
            status: 'processing'
        });
        
        const startTime = Date.now();
        let totalInvalidated = 0;
        let errors = [];
        
        try {
            // 按批次处理
            for (let i = 0; i < keys.length; i += this.config.batchSize) {
                const batch = keys.slice(i, i + this.config.batchSize);
                
                try {
                    const result = await this.invalidateCache(batch, {
                        ...options,
                        type: 'batch',
                        batchId
                    });
                    totalInvalidated += result.invalidatedKeys.length;
                } catch (error) {
                    errors.push({
                        batch: batch,
                        error: error.message
                    });
                }
                
                // 防止阻塞
                if (i + this.config.batchSize < keys.length) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }
            
            // 更新批次状态
            this.batchQueue.get(batchId).status = 'completed';
            this.batchQueue.get(batchId).completedAt = Date.now();
            this.batchQueue.get(batchId).totalInvalidated = totalInvalidated;
            this.batchQueue.get(batchId).errors = errors;
            
            // 记录批量失效历史
            this.recordBatchInvalidation(batchId, {
                totalKeys: keys.length,
                totalInvalidated,
                errors: errors.length,
                duration: Date.now() - startTime
            });
            
            return {
                success: true,
                batchId,
                totalKeys: keys.length,
                totalInvalidated,
                errors: errors,
                duration: Date.now() - startTime,
                timestamp: Date.now()
            };
            
        } catch (error) {
            this.batchQueue.get(batchId).status = 'failed';
            this.batchQueue.get(batchId).error = error.message;
            throw error;
        }
    }
    
    /**
     * 数据变更触发失效
     * @param {string} dataType - 数据类型
     * @param {Object} data - 数据对象
     * @param {string} operation - 操作类型
     */
    handleDataUpdate(data) {
        const { type, id, table, operation } = data;
        
        // 生成相关缓存键模式
        const cachePatterns = this.generateCachePatterns(data);
        
        // 失效相关缓存
        cachePatterns.forEach(pattern => {
            this.invalidateByPattern(pattern, {
                type: 'data_dependency',
                reason: `Data ${operation} in ${table}`,
                relatedData: data
            });
        });
        
        // 智能失效 - 基于数据关系
        if (this.config.smartInvalidation) {
            this.performSmartInvalidation(data);
        }
    }
    
    /**
     * 生成缓存键模式
     * @param {Object} data - 数据对象
     * @returns {string[]} 缓存键模式数组
     */
    generateCachePatterns(data) {
        const patterns = [];
        const { type, id, table } = data;
        
        // 直接键
        patterns.push(`${table}:${id}`);
        patterns.push(`${type}:${id}`);
        
        // 列表键
        patterns.push(`${table}:list:*`);
        patterns.push(`${type}:list:*`);
        
        // 统计键
        patterns.push(`${table}:stats:*`);
        patterns.push(`${type}:stats:*`);
        
        // 依赖键
        if (data.dependencies) {
            data.dependencies.forEach(dep => {
                patterns.push(`${dep}:${id}`);
                patterns.push(`${dep}:list:*`);
            });
        }
        
        return patterns;
    }
    
    /**
     * 智能预失效策略
     * @param {Object} context - 上下文信息
     */
    async performSmartInvalidation(context) {
        // 分析访问模式
        const accessPattern = this.analyzeAccessPattern(context);
        
        // 预测相关失效
        const predictedInvalidations = this.predictRelatedInvalidations(context);
        
        // 执行预测失效
        for (const prediction of predictedInvalidations) {
            await this.invalidateCache(prediction.keys, {
                type: 'predictive',
                confidence: prediction.confidence,
                reason: prediction.reason
            });
        }
    }
    
    /**
     * 分析访问模式
     * @param {Object} context - 上下文信息
     * @returns {Object} 访问模式分析结果
     */
    analyzeAccessPattern(context) {
        const { type, userId, timestamp } = context;
        const hour = new Date(timestamp).getHours();
        const dayOfWeek = new Date(timestamp).getDay();
        
        const patternKey = `${type}:${hour}:${dayOfWeek}`;
        
        if (!this.accessPatterns.has(patternKey)) {
            this.accessPatterns.set(patternKey, {
                count: 0,
                lastAccess: timestamp,
                avgInterval: 0
            });
        }
        
        const pattern = this.accessPatterns.get(patternKey);
        pattern.count++;
        pattern.lastAccess = timestamp;
        
        return pattern;
    }
    
    /**
     * 预测相关失效
     * @param {Object} context - 上下文信息
     * @returns {Array} 预测失效数组
     */
    predictRelatedInvalidations(context) {
        const predictions = [];
        const { type, id, table } = context;
        
        // 基于历史模式预测
        const relatedKeys = this.findRelatedKeys(type, id);
        if (relatedKeys.length > 0) {
            predictions.push({
                keys: relatedKeys,
                confidence: 0.8,
                reason: 'Based on historical access patterns'
            });
        }
        
        // 基于数据依赖预测
        const dependencyKeys = this.findDependencyKeys(table, id);
        if (dependencyKeys.length > 0) {
            predictions.push({
                keys: dependencyKeys,
                confidence: 0.9,
                reason: 'Based on data dependencies'
            });
        }
        
        return predictions;
    }
    
    /**
     * 查找相关键
     * @param {string} type - 类型
     * @param {string} id - ID
     * @returns {Array} 相关键数组
     */
    findRelatedKeys(type, id) {
        // 这里可以实现更复杂的关联分析逻辑
        return [`${type}:related:${id}`, `${type}:similar:${id}`];
    }
    
    /**
     * 查找依赖键
     * @param {string} table - 表名
     * @param {string} id - ID
     * @returns {Array} 依赖键数组
     */
    findDependencyKeys(table, id) {
        // 这里可以实现更复杂的依赖分析逻辑
        const dependencies = {
            'detection_results': ['samples', 'equipment', 'operators'],
            'samples': ['projects', 'operators'],
            'equipment': ['maintenance_logs', 'calibrations']
        };
        
        const relatedTables = dependencies[table] || [];
        return relatedTables.map(tbl => `${tbl}:${id}`);
    }
    
    /**
     * 按模式失效
     * @param {string} pattern - 模式
     * @param {Object} options - 失效选项
     */
    async invalidateByPattern(pattern, options = {}) {
        // 这里可以实现更复杂的模式匹配逻辑
        // 目前简化实现
        const keys = this.getKeysByPattern(pattern);
        
        if (keys.length > 0) {
            await this.invalidateCache(keys, {
                ...options,
                type: options.type || 'pattern'
            });
        }
    }
    
    /**
     * 根据模式获取键
     * @param {string} pattern - 模式
     * @returns {Array} 匹配的键数组
     */
    getKeysByPattern(pattern) {
        // 简化的模式匹配实现
        // 实际项目中需要更复杂的实现
        if (!pattern || typeof pattern !== 'string') {
            return [];
        }
        return [`${pattern}:example1`, `${pattern}:example2`];
    }
    
    /**
     * 处理用户操作
     * @param {Object} action - 用户操作
     */
    handleUserAction(action) {
        const { type, userId, resource } = action;
        
        // 根据用户操作类型进行相应处理
        switch (type) {
            case 'delete':
                this.invalidateCache(`${resource}:${action.id}`, {
                    type: 'user_action',
                    reason: 'User deleted resource'
                });
                break;
            case 'update':
                this.invalidateCache(`${resource}:${action.id}`, {
                    type: 'user_action',
                    reason: 'User updated resource'
                });
                break;
            case 'bulk_operation':
                this.batchInvalidate({
                    keys: action.keys,
                    options: {
                        type: 'user_action',
                        reason: 'User bulk operation'
                    }
                });
                break;
        }
    }
    
    /**
     * 处理系统事件
     * @param {Object} event - 系统事件
     */
    handleSystemEvent(event) {
        const { type, severity } = event;
        
        switch (type) {
            case 'maintenance':
                this.invalidateAllCache({
                    type: 'system_maintenance',
                    reason: 'System maintenance mode'
                });
                break;
            case 'error':
                if (severity === 'critical') {
                    this.invalidateCriticalCache({
                        type: 'system_error',
                        reason: 'Critical system error'
                    });
                }
                break;
        }
    }
    
    /**
     * 失效所有缓存
     * @param {Object} options - 失效选项
     */
    async invalidateAllCache(options = {}) {
        // 清除所有活动失效
        for (const [key, invalidation] of this.activeInvalidations.entries()) {
            if (invalidation.timerId) {
                clearTimeout(invalidation.timerId);
            }
        }
        this.activeInvalidations.clear();
        
        // 清除所有智能预测缓存
        this.predictionCache.clear();
        
        // 触发全量失效事件
        this.emit('cache:all_invalidated', options);
        
        return {
            success: true,
            message: 'All cache invalidated',
            timestamp: Date.now()
        };
    }
    
    /**
     * 失效关键缓存
     * @param {Object} options - 失效选项
     */
    async invalidateCriticalCache(options = {}) {
        const criticalKeys = this.getCriticalCacheKeys();
        
        await this.invalidateCache(criticalKeys, {
            ...options,
            type: 'critical'
        });
        
        return {
            success: true,
            invalidatedKeys: criticalKeys,
            timestamp: Date.now()
        };
    }
    
    /**
     * 获取关键缓存键
     * @returns {Array} 关键缓存键数组
     */
    getCriticalCacheKeys() {
        // 返回关键业务缓存键
        return [
            'radiation:detection:current',
            'radiation:calibration:status',
            'radiation:safety:alerts',
            'system:health:status'
        ];
    }
    
    /**
     * 记录失效历史
     * @param {string} cacheKey - 缓存键
     * @param {Object} options - 失效选项
     */
    recordInvalidation(cacheKey, options) {
        try {
            // 安全获取当前时间戳
            let timestamp = Date.now();
            if (typeof timestamp !== 'number' || isNaN(timestamp)) {
                timestamp = Date.parse(new Date().toISOString());
            }
            
            const record = {
                key: cacheKey,
                type: options.type || 'manual',
                reason: options.reason || 'Manual invalidation',
                timestamp: timestamp,
                method: 'single'
            };
            
            const historyKey = `${cacheKey}:${timestamp}`;
            this.invalidationHistory.set(historyKey, record);
            
            // 保持历史记录在合理范围内
            this.cleanupHistory();
        } catch (error) {
            console.warn('Failed to record invalidation history:', error.message);
        }
    }
    
    /**
     * 记录批量失效历史
     * @param {string} batchId - 批量ID
     * @param {Object} stats - 统计信息
     */
    recordBatchInvalidation(batchId, stats) {
        try {
            // 安全获取当前时间戳
            let timestamp = Date.now();
            if (typeof timestamp !== 'number' || isNaN(timestamp)) {
                timestamp = Date.parse(new Date().toISOString());
            }
            
            const record = {
                batchId,
                ...stats,
                timestamp: timestamp,
                method: 'batch'
            };
            
            const historyKey = `batch:${batchId}`;
            this.invalidationHistory.set(historyKey, record);
        } catch (error) {
            console.warn('Failed to record batch invalidation history:', error.message);
        }
    }
    
    /**
     * 清理历史记录
     */
    cleanupHistory() {
        const maxHistorySize = 10000;
        
        if (this.invalidationHistory.size > maxHistorySize) {
            const entries = Array.from(this.invalidationHistory.entries());
            const toDelete = entries.slice(0, entries.length - maxHistorySize);
            
            toDelete.forEach(([key]) => {
                this.invalidationHistory.delete(key);
            });
        }
    }
    
    /**
     * 更新性能指标
     * @param {number} duration - 执行时间
     * @param {boolean} success - 是否成功
     */
    updatePerformanceMetrics(duration, success) {
        try {
            console.log('updatePerformanceMetrics called with:', { duration, success });
            
            // 确保duration是有效数字
            const validDuration = isNaN(duration) || duration < 0 ? 0 : duration;
            console.log('validDuration:', validDuration);
            
            this.performanceMetrics.totalInvalidations++;
            
            if (success) {
                this.performanceMetrics.successfulInvalidations++;
            } else {
                this.performanceMetrics.failedInvalidations++;
            }
            
            // 计算平均时间
            const total = this.performanceMetrics.totalInvalidations;
            const currentAvg = this.performanceMetrics.averageInvalidationTime;
            this.performanceMetrics.averageInvalidationTime = 
                (currentAvg * (total - 1) + validDuration) / total;
            
            const now = Date.now();
            console.log('Setting lastInvalidationTime to:', now);
            this.performanceMetrics.lastInvalidationTime = now;
            
            console.log('updatePerformanceMetrics completed successfully');
        } catch (error) {
            console.warn('Failed to update performance metrics:', error.message);
            console.warn('Error stack:', error.stack);
        }
    }
    
    /**
     * 生成批量ID
     * @returns {string} 批量ID
     */
    generateBatchId() {
        return `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }
    
    /**
     * 启动定时任务
     */
    startScheduler() {
        // 清理过期记录
        setInterval(() => {
            this.cleanupHistory();
        }, 3600000); // 每小时清理一次
        
        // 性能监控报告
        if (this.config.enableMonitoring) {
            setInterval(() => {
                this.generatePerformanceReport();
            }, 300000); // 每5分钟报告一次
        }
    }
    
    /**
     * 生成性能报告
     */
    generatePerformanceReport() {
        const metrics = this.performanceMetrics;
        const successRate = metrics.totalInvalidations > 0 
            ? (metrics.successfulInvalidations / metrics.totalInvalidations * 100).toFixed(2)
            : 0;
        
        const report = {
            timestamp: Date.now(),
            metrics: {
                ...metrics,
                successRate: `${successRate}%`
            },
            activeInvalidations: this.activeInvalidations.size,
            batchQueue: this.batchQueue.size,
            historySize: this.invalidationHistory.size
        };
        
        this.emit('performance:report', report);
    }
    
    /**
     * 处理失效完成事件
     * @param {Object} result - 失效结果
     */
    handleInvalidationComplete(result) {
        // 可以在这里添加额外的后处理逻辑
        // 例如：发送通知、更新监控等
        if (result.key && this.config.enableMonitoring) {
            this.logInvalidation(result);
        }
    }
    
    /**
     * 记录失效日志
     * @param {Object} result - 失效结果
     */
    logInvalidation(result) {
        console.log(`[CacheInvalidation] ${result.key} invalidated by ${result.method} at ${new Date(result.timestamp).toISOString()}`);
    }
    
    // ==================== API 接口实现 ====================
    
    /**
     * 手动失效缓存API
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleManualInvalidation(req, res) {
        try {
            const { keys, reason } = req.body;
            
            if (!keys || (Array.isArray(keys) && keys.length === 0)) {
                return res.status(400).json({
                    success: false,
                    error: 'Cache keys are required'
                });
            }
            
            const result = await this.invalidateCache(keys, {
                type: 'api_manual',
                reason: reason || 'API manual invalidation'
            });
            
            res.json({
                success: true,
                data: result
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 批量失效API
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleBatchInvalidation(req, res) {
        try {
            const { keys, pattern, tags } = req.body;
            
            if ((!keys || keys.length === 0) && !pattern) {
                return res.status(400).json({
                    success: false,
                    error: 'Keys or pattern is required for batch invalidation'
                });
            }
            
            let batchKeys = keys;
            
            // 如果提供了模式，生成相应的键
            if (pattern && !keys) {
                batchKeys = this.getKeysByPattern(pattern);
            }
            
            if (!batchKeys || batchKeys.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No valid keys found for batch invalidation'
                });
            }
            
            const result = await this.batchInvalidate({
                keys: batchKeys,
                tags: tags || [],
                options: {
                    type: 'api_batch',
                    reason: 'API batch invalidation'
                }
            });
            
            res.json({
                success: true,
                data: result
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 获取失效历史API
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    handleInvalidationHistory(req, res) {
        try {
            const { 
                page = 1, 
                limit = 50, 
                type, 
                startDate, 
                endDate 
            } = req.query;
            
            let history = Array.from(this.invalidationHistory.values());
            
            // 过滤条件
            if (type) {
                history = history.filter(record => record.type === type);
            }
            
            if (startDate) {
                const start = new Date(startDate).getTime();
                history = history.filter(record => record.timestamp >= start);
            }
            
            if (endDate) {
                const end = new Date(endDate).getTime();
                history = history.filter(record => record.timestamp <= end);
            }
            
            // 排序（最新的在前）
            history.sort((a, b) => b.timestamp - a.timestamp);
            
            // 分页
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + parseInt(limit);
            const paginatedHistory = history.slice(startIndex, endIndex);
            
            res.json({
                success: true,
                data: {
                    history: paginatedHistory,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: history.length,
                        pages: Math.ceil(history.length / limit)
                    }
                }
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 配置失效策略API
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    handleConfigUpdate(req, res) {
        try {
            const { config } = req.body;
            
            if (!config || typeof config !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Valid config object is required'
                });
            }
            
            // 更新配置
            Object.assign(this.config, config);
            
            res.json({
                success: true,
                data: {
                    message: 'Cache invalidation config updated successfully',
                    config: this.config
                }
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 获取失效状态API
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    handleStatusCheck(req, res) {
        try {
            const activeInvalidations = Array.from(this.activeInvalidations.entries()).map(
                ([key, invalidation]) => ({
                    key,
                    type: invalidation.type,
                    scheduledTime: invalidation.scheduledTime,
                    ttl: invalidation.ttl
                })
            );
            
            const batchQueue = Array.from(this.batchQueue.entries()).map(
                ([batchId, batch]) => ({
                    batchId,
                    status: batch.status,
                    createdAt: batch.createdAt,
                    totalKeys: batch.keys.length
                })
            );
            
            const status = {
                timestamp: Date.now(),
                performance: this.performanceMetrics,
                activeInvalidations,
                batchQueue,
                accessPatterns: this.accessPatterns.size,
                historySize: this.invalidationHistory.size,
                config: this.config
            };
            
            res.json({
                success: true,
                data: status
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 获取缓存键统计API
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    handleCacheStats(req, res) {
        try {
            const stats = {
                totalKeys: this.activeInvalidations.size + this.predictionCache.size,
                activeInvalidations: this.activeInvalidations.size,
                predictionCache: this.predictionCache.size,
                accessPatterns: this.accessPatterns.size,
                batchQueue: this.batchQueue.size,
                historySize: this.invalidationHistory.size,
                performance: this.performanceMetrics
            };
            
            res.json({
                success: true,
                data: stats
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 清除所有TTL定时器
     */
    clearAllTTLTimers() {
        for (const [key, invalidation] of this.activeInvalidations.entries()) {
            if (invalidation.type === 'ttl' && invalidation.timerId) {
                clearTimeout(invalidation.timerId);
            }
        }
    }
    
    /**
     * 销毁缓存失效管理器
     */
    destroy() {
        // 清除所有定时器
        this.clearAllTTLTimers();
        
        // 清除所有队列
        this.invalidationQueue = [];
        this.batchQueue.clear();
        
        // 清除所有映射
        this.activeInvalidations.clear();
        this.predictionCache.clear();
        this.accessPatterns.clear();
        this.invalidationHistory.clear();
        
        // 移除所有事件监听器
        this.removeAllListeners();
    }
}

// 创建Express路由处理器
function createCacheInvalidationRoutes(cacheManager) {
    const express = require('express');
    const router = express.Router();
    
    // 手动失效缓存
    router.post('/invalidate', (req, res) => {
        return cacheManager.handleManualInvalidation(req, res);
    });
    
    // 批量失效
    router.post('/invalidate/batch', (req, res) => {
        return cacheManager.handleBatchInvalidation(req, res);
    });
    
    // 获取失效历史
    router.get('/invalidate/history', (req, res) => {
        return cacheManager.handleInvalidationHistory(req, res);
    });
    
    // 配置失效策略
    router.post('/invalidate/config', (req, res) => {
        return cacheManager.handleConfigUpdate(req, res);
    });
    
    // 获取失效状态
    router.get('/invalidate/status', (req, res) => {
        return cacheManager.handleStatusCheck(req, res);
    });
    
    // 获取缓存统计
    router.get('/cache/stats', (req, res) => {
        return cacheManager.handleCacheStats(req, res);
    });
    
    return router;
}

// 工厂函数
function createCacheInvalidationManager(config = {}) {
    return new CacheInvalidationManager(config);
}

// 导出
module.exports = {
    CacheInvalidationManager,
    createCacheInvalidationManager,
    createCacheInvalidationRoutes
};