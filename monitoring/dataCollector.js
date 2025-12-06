const os = require('os');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const crypto = require('crypto');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');

/**
 * 实时性能数据采集和存储系统
 * 为放射化学纯度检测仪提供统一的数据采集、验证、存储和管理功能
 */
class DataCollector extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // 初始化数据库管理器
        this.db = new SimplifiedDatabaseManager();
        this.db.initialize();
        
        // 配置选项
        this.config = {
            // 数据采集配置
            collection: {
                interval: options.interval || 5000, // 采集间隔（毫秒）
                maxRetries: options.maxRetries || 3,
                timeout: options.timeout || 10000,
                batchSize: options.batchSize || 100
            },
            
            // 数据存储配置
            storage: {
                maxRecords: options.maxRecords || 100000,
                retentionDays: options.retentionDays || 30,
                compressionEnabled: options.compressionEnabled || true,
                partitionSize: options.partitionSize || 10000
            },
            
            // 数据质量配置
            quality: {
                validationEnabled: options.validationEnabled || true,
                anomalyDetectionEnabled: options.anomalyDetectionEnabled || true,
                consistencyCheckEnabled: options.consistencyCheckEnabled || true
            },
            
            // 监控配置
            monitoring: {
                systemMetrics: options.systemMetrics !== false,
                databaseMetrics: options.databaseMetrics !== false,
                apiMetrics: options.apiMetrics !== false,
                customMetrics: options.customMetrics !== false
            }
        };
        
        // 内部状态
        this.state = {
            isRunning: false,
            isCollecting: false,
            startTime: null,
            lastCollection: null,
            totalCollected: 0,
            totalErrors: 0,
            activeSources: new Set(),
            collectionStats: {
                system: { count: 0, lastSuccess: null, lastError: null },
                database: { count: 0, lastSuccess: null, lastError: null },
                api: { count: 0, lastSuccess: null, lastError: null },
                custom: { count: 0, lastSuccess: null, lastError: null }
            }
        };
        
        // 数据源配置
        this.dataSources = new Map();
        this.setupDataSources();
        
        // 数据验证规则
        this.validationRules = new Map();
        this.setupValidationRules();
        
        // 数据聚合缓存
        this.aggregationCache = new Map();
        this.setupAggregationCache();
        
        // 异常检测器
        this.anomalyDetector = null;
        if (this.config.quality.anomalyDetectionEnabled) {
            this.setupAnomalyDetector();
        }
        
        console.log('🔄 实时性能数据采集系统已初始化');
    }
    
    /**
     * 启动数据采集系统
     */
    async start() {
        if (this.state.isRunning) {
            console.warn('⚠️ 数据采集系统已在运行中');
            return;
        }
        
        try {
            console.log('🚀 启动实时性能数据采集系统...');
            
            this.state.isRunning = true;
            this.state.isCollecting = false;
            this.state.startTime = new Date();
            
            // 启动数据采集循环
            this.startCollectionLoop();
            
            // 启动后台任务
            this.startBackgroundTasks();
            
            // 记录启动事件
            await this.logCollectionEvent('SYSTEM_START', '数据采集系统启动');
            
            console.log('✅ 实时性能数据采集系统已启动');
            this.emit('started');
            
        } catch (error) {
            console.error('❌ 启动数据采集系统失败:', error);
            this.state.isRunning = false;
            throw error;
        }
    }
    
    /**
     * 停止数据采集系统
     */
    async stop() {
        if (!this.state.isRunning) {
            console.warn('⚠️ 数据采集系统未运行');
            return;
        }
        
        try {
            console.log('🛑 停止实时性能数据采集系统...');
            
            this.state.isRunning = false;
            this.state.isCollecting = false;
            
            // 停止所有定时器
            if (this.collectionTimer) {
                clearInterval(this.collectionTimer);
            }
            
            if (this.maintenanceTimer) {
                clearInterval(this.maintenanceTimer);
            }
            
            // 停止所有数据源
            for (const [name, source] of this.dataSources) {
                if (source.stop) {
                    await source.stop();
                }
            }
            
            // 记录停止事件
            await this.logCollectionEvent('SYSTEM_STOP', '数据采集系统停止');
            
            console.log('✅ 实时性能数据采集系统已停止');
            this.emit('stopped');
            
        } catch (error) {
            console.error('❌ 停止数据采集系统失败:', error);
            throw error;
        }
    }
    
    /**
     * 设置数据源
     */
    setupDataSources() {
        // 系统监控数据源
        if (this.config.monitoring.systemMetrics) {
            this.registerDataSource('system', {
                name: 'systemMonitor',
                type: 'system',
                enabled: true,
                interval: this.config.collection.interval,
                collector: this.collectSystemMetrics.bind(this),
                validator: this.validateSystemMetrics.bind(this)
            });
        }
        
        // 数据库监控数据源
        if (this.config.monitoring.databaseMetrics) {
            this.registerDataSource('database', {
                name: 'databaseMonitor',
                type: 'database',
                enabled: true,
                interval: this.config.collection.interval,
                collector: this.collectDatabaseMetrics.bind(this),
                validator: this.validateDatabaseMetrics.bind(this)
            });
        }
        
        // API监控数据源
        if (this.config.monitoring.apiMetrics) {
            this.registerDataSource('api', {
                name: 'apiMonitor',
                type: 'api',
                enabled: true,
                interval: this.config.collection.interval,
                collector: this.collectApiMetrics.bind(this),
                validator: this.validateApiMetrics.bind(this)
            });
        }
        
        // 自定义指标数据源
        if (this.config.monitoring.customMetrics) {
            this.registerDataSource('custom', {
                name: 'customMetrics',
                type: 'custom',
                enabled: true,
                interval: this.config.collection.interval,
                collector: this.collectCustomMetrics.bind(this),
                validator: this.validateCustomMetrics.bind(this)
            });
        }
    }
    
    /**
     * 注册数据源
     */
    registerDataSource(name, config) {
        this.dataSources.set(name, {
            ...config,
            isActive: false,
            lastCollect: null,
            errorCount: 0,
            successCount: 0
        });
        
        console.log(`📊 已注册数据源: ${name}`);
    }
    
    /**
     * 取消注册数据源
     */
    unregisterDataSource(name) {
        const source = this.dataSources.get(name);
        if (source && source.stop) {
            source.stop();
        }
        this.dataSources.delete(name);
        this.state.activeSources.delete(name);
        
        console.log(`🗑️ 已取消注册数据源: ${name}`);
    }
    
    /**
     * 启动数据采集循环
     */
    startCollectionLoop() {
        this.collectionTimer = setInterval(async () => {
            if (!this.state.isRunning || this.state.isCollecting) {
                return;
            }
            
            try {
                this.state.isCollecting = true;
                await this.performCollection();
            } catch (error) {
                console.error('数据采集循环错误:', error);
                this.state.totalErrors++;
            } finally {
                this.state.isCollecting = false;
            }
        }, this.config.collection.interval);
    }
    
    /**
     * 执行数据采集
     */
    async performCollection() {
        const collectionPromises = [];
        
        for (const [name, source] of this.dataSources) {
            if (!source.enabled || !this.state.isRunning) {
                continue;
            }
            
            // 检查是否可以采集
            if (!this.canCollect(source)) {
                continue;
            }
            
            collectionPromises.push(
                this.collectFromSource(name, source)
            );
        }
        
        if (collectionPromises.length > 0) {
            const results = await Promise.allSettled(collectionPromises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            this.state.totalCollected += successful;
            
            // 触发采集完成事件
            this.emit('collectionCompleted', {
                total: collectionPromises.length,
                successful,
                failed: collectionPromises.length - successful,
                timestamp: new Date()
            });
        }
        
        this.state.lastCollection = new Date();
    }
    
    /**
     * 从指定数据源采集数据
     */
    async collectFromSource(sourceName, source) {
        try {
            const startTime = Date.now();
            
            // 更新数据源状态
            source.isActive = true;
            this.state.activeSources.add(sourceName);
            
            // 采集数据
            const rawData = await source.collector();
            
            if (!rawData) {
                throw new Error('数据源返回空数据');
            }
            
            // 数据验证和清洗
            const validatedData = await this.validateAndCleanData(rawData, source);
            
            // 存储数据
            await this.storeMetrics(validatedData);
            
            // 更新统计信息
            source.successCount++;
            source.lastCollect = new Date();
            source.errorCount = 0;
            
            // 更新全局统计
            this.state.collectionStats[sourceName].count++;
            this.state.collectionStats[sourceName].lastSuccess = new Date();
            
            const duration = Date.now() - startTime;
            console.log(`✅ ${sourceName} 数据采集完成，耗时: ${duration}ms，数据量: ${validatedData.length}`);
            
            return validatedData;
            
        } catch (error) {
            source.errorCount++;
            this.state.collectionStats[sourceName].lastError = error.message;
            this.state.totalErrors++;
            
            console.error(`❌ ${sourceName} 数据采集失败:`, error);
            throw error;
        } finally {
            source.isActive = false;
            this.state.activeSources.delete(sourceName);
        }
    }
    
    /**
     * 检查是否可以采集数据
     */
    canCollect(source) {
        // 检查间隔时间
        if (source.lastCollect && source.interval) {
            const timeSinceLastCollect = Date.now() - new Date(source.lastCollect).getTime();
            if (timeSinceLastCollect < source.interval) {
                return false;
            }
        }
        
        // 检查错误次数
        if (source.errorCount >= this.config.collection.maxRetries) {
            console.warn(`⚠️ 数据源 ${source.name} 错误次数过多，暂停采集`);
            return false;
        }
        
        return true;
    }
    
    /**
     * 采集系统指标
     */
    async collectSystemMetrics() {
        const metrics = [];
        const timestamp = new Date();
        
        try {
            // CPU使用率
            const cpuUsage = process.cpuUsage();
            const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000 * 100).toFixed(2);
            
            metrics.push({
                metricType: 'system',
                metricName: 'cpu_usage',
                value: parseFloat(cpuPercent),
                unit: 'percent',
                tags: { source: 'node_process' },
                timestamp: timestamp.toISOString(),
                alertLevel: parseFloat(cpuPercent) > 80 ? 'WARNING' : 'NORMAL'
            });
            
            // 内存使用情况
            const memoryUsage = process.memoryUsage();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            
            metrics.push({
                metricType: 'system',
                metricName: 'memory_usage',
                value: parseFloat((memoryUsage.heapUsed / totalMem * 100).toFixed(2)),
                unit: 'percent',
                tags: { type: 'heap' },
                timestamp: timestamp.toISOString(),
                alertLevel: (memoryUsage.heapUsed / totalMem) > 0.8 ? 'WARNING' : 'NORMAL'
            });
            
            metrics.push({
                metricType: 'system',
                metricName: 'memory_used',
                value: memoryUsage.heapUsed,
                unit: 'bytes',
                tags: { type: 'heap_used' },
                timestamp: timestamp.toISOString()
            });
            
            metrics.push({
                metricType: 'system',
                metricName: 'system_memory_free',
                value: freeMem,
                unit: 'bytes',
                timestamp: timestamp.toISOString()
            });
            
            // 系统负载
            const loadAvg = os.loadavg();
            metrics.push({
                metricType: 'system',
                metricName: 'load_average',
                value: loadAvg[0],
                unit: 'number',
                tags: { period: '1min' },
                timestamp: timestamp.toISOString(),
                alertLevel: loadAvg[0] > 4 ? 'WARNING' : 'NORMAL'
            });
            
            // 事件循环延迟
            const eventLoopDelay = process.hrtime.bigint();
            metrics.push({
                metricType: 'system',
                metricName: 'event_loop_delay',
                value: Number(eventLoopDelay) / 1000000, // 转换为毫秒
                unit: 'milliseconds',
                timestamp: timestamp.toISOString(),
                alertLevel: eventLoopDelay > 10000000 ? 'WARNING' : 'NORMAL'
            });
            
        } catch (error) {
            console.error('系统指标采集失败:', error);
            throw error;
        }
        
        return metrics;
    }
    
    /**
     * 采集数据库指标
     */
    async collectDatabaseMetrics() {
        const metrics = [];
        const timestamp = new Date();
        
        try {
            // 数据库统计信息
            const dbStats = this.db.getDatabaseStats();
            
            // 总记录数
            metrics.push({
                metricType: 'database',
                metricName: 'total_records',
                value: dbStats.total_records,
                unit: 'count',
                timestamp: timestamp.toISOString()
            });
            
            // 各表记录数
            Object.entries(dbStats.tables).forEach(([table, count]) => {
                metrics.push({
                    metricType: 'database',
                    metricName: 'table_records',
                    value: count,
                    unit: 'count',
                    tags: { table },
                    timestamp: timestamp.toISOString()
                });
            });
            
            // 性能指标记录数
            const perfMetrics = this.db.getPerformanceMetrics({ limit: 100 });
            metrics.push({
                metricType: 'database',
                metricName: 'performance_metrics_count',
                value: perfMetrics.length,
                unit: 'count',
                timestamp: timestamp.toISOString()
            });
            
            // 最近的性能指标
            if (perfMetrics.length > 0) {
                const recentMetrics = this.db.getSystemPerformanceSummary();
                
                metrics.push({
                    metricType: 'database',
                    metricName: 'avg_cpu_usage',
                    value: recentMetrics.cpu_usage,
                    unit: 'percent',
                    timestamp: timestamp.toISOString()
                });
                
                metrics.push({
                    metricType: 'database',
                    metricName: 'avg_memory_usage',
                    value: recentMetrics.memory_usage,
                    unit: 'percent',
                    timestamp: timestamp.toISOString()
                });
                
                metrics.push({
                    metricType: 'database',
                    metricName: 'active_alerts',
                    value: recentMetrics.active_alerts,
                    unit: 'count',
                    timestamp: timestamp.toISOString()
                });
            }
            
        } catch (error) {
            console.error('数据库指标采集失败:', error);
            throw error;
        }
        
        return metrics;
    }
    
    /**
     * 采集API指标
     */
    async collectApiMetrics() {
        const metrics = [];
        const timestamp = new Date();
        
        try {
            // API请求统计
            const apiStats = this.getApiStatistics();
            
            metrics.push({
                metricType: 'api',
                metricName: 'total_requests',
                value: apiStats.totalRequests || 0,
                unit: 'count',
                timestamp: timestamp.toISOString()
            });
            
            metrics.push({
                metricType: 'api',
                metricName: 'avg_response_time',
                value: apiStats.avgResponseTime || 0,
                unit: 'milliseconds',
                timestamp: timestamp.toISOString()
            });
            
            metrics.push({
                metricType: 'api',
                metricName: 'error_rate',
                value: apiStats.errorRate || 0,
                unit: 'percent',
                timestamp: timestamp.toISOString(),
                alertLevel: (apiStats.errorRate || 0) > 5 ? 'WARNING' : 'NORMAL'
            });
            
            // 活跃连接数
            metrics.push({
                metricType: 'api',
                metricName: 'active_connections',
                value: this.getActiveConnections(),
                unit: 'count',
                timestamp: timestamp.toISOString()
            });
            
        } catch (error) {
            console.error('API指标采集失败:', error);
            throw error;
        }
        
        return metrics;
    }
    
    /**
     * 采集自定义指标
     */
    async collectCustomMetrics() {
        const metrics = [];
        const timestamp = new Date();
        
        try {
            // 辐射检测器特定指标
            metrics.push({
                metricType: 'custom',
                metricName: 'detector_temperature',
                value: this.getDetectorTemperature(),
                unit: 'celsius',
                timestamp: timestamp.toISOString()
            });
            
            metrics.push({
                metricType: 'custom',
                metricName: 'detector_voltage',
                value: this.getDetectorVoltage(),
                unit: 'volts',
                timestamp: timestamp.toISOString()
            });
            
            metrics.push({
                metricType: 'custom',
                metricName: 'background_radiation',
                value: this.getBackgroundRadiation(),
                unit: 'cps',
                timestamp: timestamp.toISOString()
            });
            
            metrics.push({
                metricType: 'custom',
                metricName: 'detector_status',
                value: this.getDetectorStatus(),
                unit: 'status',
                timestamp: timestamp.toISOString()
            });
            
        } catch (error) {
            console.error('自定义指标采集失败:', error);
            throw error;
        }
        
        return metrics;
    }
    
    /**
     * 数据验证和清洗
     */
    async validateAndCleanData(rawData, source) {
        if (!this.config.quality.validationEnabled) {
            return rawData;
        }
        
        const validatedData = [];
        
        for (const metric of rawData) {
            try {
                // 基本字段验证
                const isValid = this.validateMetric(metric, source);
                
                if (isValid) {
                    // 数据清洗
                    const cleanedMetric = this.cleanMetric(metric);
                    validatedData.push(cleanedMetric);
                } else {
                    console.warn('⚠️ 数据验证失败:', metric);
                }
                
            } catch (error) {
                console.error('数据验证错误:', error);
            }
        }
        
        return validatedData;
    }
    
    /**
     * 验证指标数据
     */
    validateMetric(metric, source) {
        // 必需字段检查
        const requiredFields = ['metricType', 'metricName', 'value', 'timestamp'];
        for (const field of requiredFields) {
            if (metric[field] === undefined || metric[field] === null) {
                console.warn(`缺少必需字段: ${field}`);
                return false;
            }
            }
        
        // 数据类型验证
        if (typeof metric.value !== 'number' && typeof metric.value !== 'string') {
            console.warn('指标值必须是数字或字符串');
            return false;
        }
        
        // 时间戳验证
        const timestamp = new Date(metric.timestamp);
        if (isNaN(timestamp.getTime())) {
            console.warn('无效的时间戳');
            return false;
        }
        
        // 使用特定验证规则
        const validator = source.validator;
        if (validator && !validator(metric)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 清洗指标数据
     */
    cleanMetric(metric) {
        const cleaned = { ...metric };
        
        // 确保时间戳格式
        if (typeof cleaned.timestamp === 'string') {
            cleaned.timestamp = cleaned.timestamp;
        } else {
            cleaned.timestamp = new Date(cleaned.timestamp).toISOString();
        }
        
        // 确保数值格式
        if (typeof cleaned.value === 'string') {
            const numericValue = parseFloat(cleaned.value);
            if (!isNaN(numericValue)) {
                cleaned.value = numericValue;
            }
        }
        
        // 确保标签是对象
        if (cleaned.tags && typeof cleaned.tags !== 'object') {
            cleaned.tags = {};
        }
        
        // 添加默认值
        cleaned.unit = cleaned.unit || 'unit';
        cleaned.alertLevel = cleaned.alertLevel || 'NORMAL';
        cleaned.source = cleaned.source || 'unknown';
        
        return cleaned;
    }
    
    /**
     * 存储指标数据
     */
    async storeMetrics(metrics) {
        try {
            for (const metric of metrics) {
                this.db.recordPerformanceMetric(metric);
            }
            
            // 触发数据存储事件
            this.emit('dataStored', {
                count: metrics.length,
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('数据存储失败:', error);
            throw error;
        }
    }
    
    /**
     * 设置验证规则
     */
    setupValidationRules() {
        // 系统指标验证规则
        this.validationRules.set('system', {
            cpu_usage: { min: 0, max: 100 },
            memory_usage: { min: 0, max: 100 },
            load_average: { min: 0, max: 10 }
        });
        
        // 数据库指标验证规则
        this.validationRules.set('database', {
            total_records: { min: 0 },
            performance_metrics_count: { min: 0 }
        });
        
        // API指标验证规则
        this.validationRules.set('api', {
            total_requests: { min: 0 },
            avg_response_time: { min: 0, max: 30000 },
            error_rate: { min: 0, max: 100 }
        });
        
        // 自定义指标验证规则
        this.validationRules.set('custom', {
            detector_temperature: { min: -50, max: 50 },
            detector_voltage: { min: 0, max: 5000 },
            background_radiation: { min: 0, max: 1000 }
        });
    }
    
    /**
     * 系统指标验证
     */
    validateSystemMetrics(metric) {
        const rules = this.validationRules.get('system');
        if (rules && rules[metric.metricName]) {
            const rule = rules[metric.metricName];
            const value = parseFloat(metric.value);
            
            if (rule.min !== undefined && value < rule.min) {
                return false;
            }
            if (rule.max !== undefined && value > rule.max) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 数据库指标验证
     */
    validateDatabaseMetrics(metric) {
        const rules = this.validationRules.get('database');
        if (rules && rules[metric.metricName]) {
            const rule = rules[metric.metricName];
            const value = parseFloat(metric.value);
            
            if (rule.min !== undefined && value < rule.min) {
                return false;
            }
            if (rule.max !== undefined && value > rule.max) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * API指标验证
     */
    validateApiMetrics(metric) {
        const rules = this.validationRules.get('api');
        if (rules && rules[metric.metricName]) {
            const rule = rules[metric.metricName];
            const value = parseFloat(metric.value);
            
            if (rule.min !== undefined && value < rule.min) {
                return false;
            }
            if (rule.max !== undefined && value > rule.max) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 自定义指标验证
     */
    validateCustomMetrics(metric) {
        const rules = this.validationRules.get('custom');
        if (rules && rules[metric.metricName]) {
            const rule = rules[metric.metricName];
            const value = parseFloat(metric.value);
            
            if (rule.min !== undefined && value < rule.min) {
                return false;
            }
            if (rule.max !== undefined && value > rule.max) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 设置聚合缓存
     */
    setupAggregationCache() {
        // 1分钟聚合
        this.aggregationCache.set('1m', new Map());
        // 5分钟聚合
        this.aggregationCache.set('5m', new Map());
        // 15分钟聚合
        this.aggregationCache.set('15m', new Map());
        // 1小时聚合
        this.aggregationCache.set('1h', new Map());
    }
    
    /**
     * 设置异常检测器
     */
    setupAnomalyDetector() {
        // 简单的异常检测逻辑
        this.anomalyDetector = {
            thresholds: new Map(),
            history: new Map(),
            
            check(metricName, value) {
                // 更新历史数据
                if (!this.history.has(metricName)) {
                    this.history.set(metricName, []);
                }
                
                const history = this.history.get(metricName);
                history.push({ value, timestamp: Date.now() });
                
                // 保持最近100个数据点
                if (history.length > 100) {
                    history.shift();
                }
                
                // 计算统计信息
                if (history.length >= 10) {
                    const values = history.map(h => h.value);
                    const mean = values.reduce((a, b) => a + b, 0) / values.length;
                    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
                    const stdDev = Math.sqrt(variance);
                    
                    // 检查是否为异常值（超过2个标准差）
                    const deviation = Math.abs(value - mean);
                    if (deviation > 2 * stdDev) {
                        return {
                            isAnomaly: true,
                            reason: '超过2个标准差',
                            expected: mean,
                            actual: value
                        };
                    }
                }
                
                return { isAnomaly: false };
            }
        };
    }
    
    /**
     * 启动后台任务
     */
    startBackgroundTasks() {
        // 数据清理和维护任务
        this.maintenanceTimer = setInterval(() => {
            this.performMaintenance();
        }, 60 * 60 * 1000); // 每小时执行一次
        
        // 数据聚合任务
        setInterval(() => {
            this.performAggregation();
        }, 5 * 60 * 1000); // 每5分钟执行一次
    }
    
    /**
     * 执行维护任务
     */
    async performMaintenance() {
        try {
            console.log('🧹 执行数据维护任务...');
            
            // 数据清理
            await this.cleanupOldData();
            
            // 数据压缩
            await this.compressOldData();
            
            // 数据一致性检查
            await this.checkDataConsistency();
            
            console.log('✅ 数据维护任务完成');
            
        } catch (error) {
            console.error('❌ 数据维护任务失败:', error);
        }
    }
    
    /**
     * 执行数据聚合
     */
    async performAggregation() {
        try {
            // 获取最近的指标数据
            const recentMetrics = this.db.getPerformanceMetrics({
                startDate: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                limit: 1000
            });
            
            // 按指标名称分组聚合
            const groupedMetrics = this.groupMetricsByName(recentMetrics);
            
            for (const [metricName, metrics] of groupedMetrics) {
                const aggregated = this.aggregateMetrics(metrics);
                
                // 存储聚合结果
                this.db.recordPerformanceMetric({
                    metricType: 'aggregated',
                    metricName: `${metricName}_avg`,
                    value: aggregated.average,
                    unit: metrics[0]?.unit || 'unit',
                    timestamp: new Date().toISOString(),
                    source: 'aggregation'
                });
            }
            
        } catch (error) {
            console.error('数据聚合失败:', error);
        }
    }
    
    /**
     * 分组指标数据
     */
    groupMetricsByName(metrics) {
        const grouped = new Map();
        
        metrics.forEach(metric => {
            if (!grouped.has(metric.metricName)) {
                grouped.set(metric.metricName, []);
            }
            grouped.get(metric.metricName).push(metric);
        });
        
        return grouped;
    }
    
    /**
     * 聚合指标数据
     */
    aggregateMetrics(metrics) {
        const values = metrics.map(m => parseFloat(m.value)).filter(v => !isNaN(v));
        
        if (values.length === 0) {
            return { average: 0, min: 0, max: 0, count: 0 };
        }
        
        return {
            average: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            count: values.length
        };
    }
    
    /**
     * 清理旧数据
     */
    async cleanupOldData() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.storage.retentionDays);
            
            // 这里可以实现更复杂的清理逻辑
            console.log(`清理 ${cutoffDate.toISOString()} 之前的数据`);
            
        } catch (error) {
            console.error('数据清理失败:', error);
            throw error;
        }
    }
    
    /**
     * 压缩旧数据
     */
    async compressOldData() {
        if (!this.config.storage.compressionEnabled) {
            return;
        }
        
        try {
            // 实现数据压缩逻辑
            console.log('压缩旧数据...');
            
        } catch (error) {
            console.error('数据压缩失败:', error);
        }
    }
    
    /**
     * 检查数据一致性
     */
    async checkDataConsistency() {
        if (!this.config.quality.consistencyCheckEnabled) {
            return;
        }
        
        try {
            // 检查数据一致性
            const metrics = this.db.getPerformanceMetrics({ limit: 1000 });
            const inconsistencies = [];
            
            for (const metric of metrics) {
                // 检查必需字段
                const requiredFields = ['metricType', 'metricName', 'value', 'timestamp'];
                for (const field of requiredFields) {
                    if (!metric[field]) {
                        inconsistencies.push({
                            type: 'missing_field',
                            metricId: metric.id,
                            field,
                            timestamp: metric.timestamp
                        });
                    }
                }
                
                // 检查时间戳有效性
                const timestamp = new Date(metric.timestamp);
                if (isNaN(timestamp.getTime())) {
                    inconsistencies.push({
                        type: 'invalid_timestamp',
                        metricId: metric.id,
                        timestamp: metric.timestamp
                    });
                }
            }
            
            if (inconsistencies.length > 0) {
                console.warn(`发现 ${inconsistencies.length} 个数据不一致问题`);
                this.emit('dataInconsistency', inconsistencies);
            }
            
        } catch (error) {
            console.error('数据一致性检查失败:', error);
        }
    }
    
    /**
     * 记录采集事件
     */
    async logCollectionEvent(eventType, description) {
        try {
            this.db.recordPerformanceMetric({
                metricType: 'system',
                metricName: 'collection_event',
                value: 1,
                unit: 'count',
                tags: { event_type: eventType, description },
                timestamp: new Date().toISOString(),
                metadata: { eventType, description }
            });
        } catch (error) {
            console.error('记录采集事件失败:', error);
        }
    }
    
    /**
     * 获取采集状态
     */
    getCollectionStatus() {
        return {
            isRunning: this.state.isRunning,
            isCollecting: this.state.isCollecting,
            startTime: this.state.startTime,
            lastCollection: this.state.lastCollection,
            totalCollected: this.state.totalCollected,
            totalErrors: this.state.totalErrors,
            activeSources: Array.from(this.state.activeSources),
            sources: Array.from(this.dataSources.entries()).map(([name, source]) => ({
                name,
                enabled: source.enabled,
                isActive: source.isActive,
                lastCollect: source.lastCollect,
                successCount: source.successCount,
                errorCount: source.errorCount,
                interval: source.interval
            })),
            statistics: this.state.collectionStats
        };
    }
    
    /**
     * 配置采集参数
     */
    configureCollection(config) {
        const validConfig = {};
        
        if (config.interval) validConfig.interval = config.interval;
        if (config.maxRetries) validConfig.maxRetries = config.maxRetries;
        if (config.timeout) validConfig.timeout = config.timeout;
        if (config.batchSize) validConfig.batchSize = config.batchSize;
        
        this.config.collection = { ...this.config.collection, ...validConfig };
        
        console.log('✅ 采集配置已更新:', validConfig);
        return validConfig;
    }
    
    /**
     * 获取聚合指标
     */
    getAggregatedMetrics(filters = {}) {
        try {
            const metrics = this.db.getPerformanceMetrics(filters);
            const grouped = this.groupMetricsByName(metrics);
            const aggregated = new Map();
            
            for (const [metricName, metricList] of grouped) {
                aggregated.set(metricName, this.aggregateMetrics(metricList));
            }
            
            return Object.fromEntries(aggregated);
            
        } catch (error) {
            console.error('获取聚合指标失败:', error);
            return {};
        }
    }
    
    /**
     * 数据备份
     */
    async backupData(options = {}) {
        try {
            const backupOptions = {
                timestamp: new Date(),
                includeMetrics: options.includeMetrics !== false,
                includeAuditLogs: options.includeAuditLogs || false,
                includeUsers: options.includeUsers || false,
                outputPath: options.outputPath || path.join(__dirname, 'backups')
            };
            
            // 确保备份目录存在
            if (!fs.existsSync(backupOptions.outputPath)) {
                fs.mkdirSync(backupOptions.outputPath, { recursive: true });
            }
            
            const backupData = {
                metadata: {
                    timestamp: backupOptions.timestamp.toISOString(),
                    version: '1.0',
                    source: 'radiation-detector-data-collector'
                },
                data: {}
            };
            
            // 备份性能指标
            if (backupOptions.includeMetrics) {
                backupData.data.performance_metrics = this.db.getPerformanceMetrics();
            }
            
            // 备份审计日志
            if (backupOptions.includeAuditLogs) {
                backupData.data.audit_logs = this.db.getAuditEvents();
            }
            
            // 备份用户数据
            if (backupOptions.includeUsers) {
                backupData.data.users = this.db.readTable('users');
            }
            
            // 写入备份文件
            const backupFile = path.join(backupOptions.outputPath, 
                `backup_${backupOptions.timestamp.toISOString().replace(/[:.]/g, '-')}.json`);
            
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
            
            console.log('✅ 数据备份完成:', backupFile);
            return {
                success: true,
                backupFile,
                size: fs.statSync(backupFile).size,
                timestamp: backupOptions.timestamp
            };
            
        } catch (error) {
            console.error('❌ 数据备份失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取API统计信息（模拟）
     */
    getApiStatistics() {
        return {
            totalRequests: Math.floor(Math.random() * 1000),
            avgResponseTime: Math.floor(Math.random() * 500),
            errorRate: Math.random() * 10
        };
    }
    
    /**
     * 获取活跃连接数（模拟）
     */
    getActiveConnections() {
        return Math.floor(Math.random() * 50);
    }
    
    /**
     * 获取检测器温度（模拟）
     */
    getDetectorTemperature() {
        return 20 + (Math.random() - 0.5) * 10; // 15-25°C
    }
    
    /**
     * 获取检测器电压（模拟）
     */
    getDetectorVoltage() {
        return 1200 + Math.random() * 100; // 1200-1300V
    }
    
    /**
     * 获取背景辐射（模拟）
     */
    getBackgroundRadiation() {
        return Math.random() * 50; // 0-50 cps
    }
    
    /**
     * 获取检测器状态（模拟）
     */
    getDetectorStatus() {
        const statuses = ['OK', 'WARNING', 'ERROR', 'MAINTENANCE'];
        return statuses[Math.floor(Math.random() * statuses.length)];
    }
}

module.exports = DataCollector;