const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

/**
 * 日志查询和分析引擎
 * 支持多条件搜索、时间范围查询、用户行为分析等功能
 * 
 * @class LogQueryEngine
 */
class LogQueryEngine {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.indexPath = path.join(__dirname, 'indices');
        this.cachePath = path.join(__dirname, 'cache');
        this.ensureDirectories();
        
        // 查询缓存
        this.queryCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
        this.maxCacheSize = 1000;
        
        // 日志索引
        this.logIndices = new Map();
        this.indexUpdateQueue = [];
        this.batchIndexSize = 100;
        
        // 性能统计
        this.queryStats = {
            totalQueries: 0,
            avgResponseTime: 0,
            cacheHitRate: 0,
            lastReset: new Date().toISOString()
        };
    }

    ensureDirectories() {
        [this.indexPath, this.cachePath].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * 初始化日志查询引擎
     */
    async initialize() {
        try {
            console.log('🔄 初始化日志查询引擎...');
            
            // 初始化日志索引
            await this.initializeLogIndices();
            
            // 加载缓存
            await this.loadCache();
            
            console.log('✅ 日志查询引擎初始化完成');
        } catch (error) {
            console.error('❌ 日志查询引擎初始化失败:', error);
            throw error;
        }
    }

    /**
     * 初始化日志索引
     */
    async initializeLogIndices() {
        const logTypes = ['audit_logs', 'performance_metrics', 'error_logs', 'access_logs'];
        
        for (const logType of logTypes) {
            await this.createLogIndex(logType);
        }
    }

    /**
     * 创建日志索引
     */
    async createLogIndex(logType) {
        try {
            const indexFile = path.join(this.indexPath, `${logType}_index.json`);
            const index = {
                logType,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                fields: [],
                totalEntries: 0,
                indices: {}
            };

            // 为常用字段创建索引
            const indexedFields = ['timestamp', 'user_id', 'action', 'level', 'ip_address'];
            
            for (const field of indexedFields) {
                index.indices[field] = new Map();
            }

            this.logIndices.set(logType, index);
            await this.saveIndex(logType);
            
            console.log(`✅ 创建日志索引: ${logType}`);
        } catch (error) {
            console.error(`❌ 创建日志索引失败: ${logType}`, error);
        }
    }

    /**
     * 保存索引到文件
     */
    async saveIndex(logType) {
        const index = this.logIndices.get(logType);
        if (!index) return;

        try {
            const indexFile = path.join(this.indexPath, `${logType}_index.json`);
            const serializableIndex = {
                ...index,
                indices: Object.fromEntries(index.indices)
            };
            
            await this.db.atomicWrite(indexFile, serializableIndex);
        } catch (error) {
            console.error(`保存索引失败: ${logType}`, error);
        }
    }

    /**
     * 加载索引文件
     */
    async loadIndex(logType) {
        try {
            const indexFile = path.join(this.indexPath, `${logType}_index.json`);
            if (fs.existsSync(indexFile)) {
                const data = fs.readFileSync(indexFile, 'utf8');
                const indexData = JSON.parse(data);
                
                // 重建 Map 对象
                const indices = new Map();
                for (const [field, fieldIndex] of Object.entries(indexData.indices || {})) {
                    indices.set(field, new Map(fieldIndex));
                }
                
                const index = {
                    ...indexData,
                    indices
                };
                
                this.logIndices.set(logType, index);
                return index;
            }
        } catch (error) {
            console.error(`加载索引失败: ${logType}`, error);
        }
        
        return null;
    }

    /**
     * 获取缓存键
     */
    getCacheKey(query) {
        const queryString = JSON.stringify(query);
        return crypto.createHash('md5').update(queryString).digest('hex');
    }

    /**
     * 检查缓存
     */
    getCachedResult(cacheKey) {
        const cached = this.queryCache.get(cacheKey);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.queryCache.delete(cacheKey);
            return null;
        }

        return cached.result;
    }

    /**
     * 缓存结果
     */
    cacheResult(cacheKey, result) {
        if (this.queryCache.size >= this.maxCacheSize) {
            // 删除最旧的缓存项
            const firstKey = this.queryCache.keys().next().value;
            this.queryCache.delete(firstKey);
        }

        this.queryCache.set(cacheKey, {
            result,
            timestamp: Date.now()
        });
    }

    /**
     * 保存缓存到文件
     */
    async saveCache() {
        try {
            const cacheFile = path.join(this.cachePath, 'query_cache.json');
            const cacheData = Object.fromEntries(this.queryCache);
            await this.db.atomicWrite(cacheFile, cacheData);
        } catch (error) {
            console.error('保存缓存失败:', error);
        }
    }

    /**
     * 加载缓存文件
     */
    async loadCache() {
        try {
            const cacheFile = path.join(this.cachePath, 'query_cache.json');
            if (fs.existsSync(cacheFile)) {
                const data = fs.readFileSync(cacheFile, 'utf8');
                const cacheData = JSON.parse(data);
                
                for (const [key, value] of Object.entries(cacheData)) {
                    if (Date.now() - value.timestamp < this.cacheTimeout) {
                        this.queryCache.set(key, value);
                    }
                }
            }
        } catch (error) {
            console.error('加载缓存失败:', error);
        }
    }

    /**
     * 执行日志查询
     */
    async searchLogs(query) {
        const startTime = performance.now();
        this.queryStats.totalQueries++;

        try {
            // 检查缓存
            const cacheKey = this.getCacheKey(query);
            const cached = this.getCachedResult(cacheKey);
            if (cached) {
                return cached;
            }

            // 构建查询条件
            const searchQuery = this.buildSearchQuery(query);
            
            // 执行搜索
            let results = await this.executeSearch(searchQuery);
            
            // 应用过滤条件
            results = this.applyFilters(results, query.filters || {});
            
            // 全文搜索
            if (query.keywords && query.keywords.length > 0) {
                results = await this.performFullTextSearch(results, query.keywords);
            }
            
            // 排序
            results = this.sortResults(results, query.sortBy || 'timestamp', query.sortOrder || 'desc');
            
            // 分页
            const total = results.length;
            const offset = query.offset || 0;
            const limit = query.limit || 100;
            const paginatedResults = results.slice(offset, offset + limit);

            // 构建响应
            const response = {
                success: true,
                data: paginatedResults,
                pagination: {
                    total,
                    offset,
                    limit,
                    hasMore: offset + limit < total
                },
                query: {
                    executionTime: performance.now() - startTime,
                    totalResults: results.length,
                    cached: false
                }
            };

            // 缓存结果
            this.cacheResult(cacheKey, response);
            
            return response;
            
        } catch (error) {
            console.error('日志搜索失败:', error);
            return {
                success: false,
                error: error.message,
                data: [],
                pagination: { total: 0, offset: 0, limit: 0, hasMore: false }
            };
        }
    }

    /**
     * 构建搜索查询
     */
    buildSearchQuery(query) {
        const searchQuery = {
            logTypes: query.logTypes || ['audit_logs'],
            timeRange: query.timeRange || {},
            filters: query.filters || {},
            keywords: query.keywords || [],
            sortBy: query.sortBy || 'timestamp',
            sortOrder: query.sortOrder || 'desc',
            limit: query.limit || 100,
            offset: query.offset || 0
        };

        return searchQuery;
    }

    /**
     * 执行搜索
     */
    async executeSearch(searchQuery) {
        const allResults = [];
        
        for (const logType of searchQuery.logTypes) {
            let logs = this.db.readTable(logType);
            
            // 时间范围过滤
            if (searchQuery.timeRange.start || searchQuery.timeRange.end) {
                logs = this.filterByTimeRange(logs, searchQuery.timeRange);
            }
            
            allResults.push(...logs.map(log => ({ ...log, logType })));
        }
        
        return allResults;
    }

    /**
     * 按时间范围过滤
     */
    filterByTimeRange(logs, timeRange) {
        return logs.filter(log => {
            const timestamp = new Date(log.timestamp);
            
            if (timeRange.start && timestamp < new Date(timeRange.start)) {
                return false;
            }
            
            if (timeRange.end && timestamp > new Date(timeRange.end)) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * 应用过滤器
     */
    applyFilters(logs, filters) {
        return logs.filter(log => {
            for (const [key, value] of Object.entries(filters)) {
                if (log[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * 执行全文搜索
     */
    async performFullTextSearch(logs, keywords) {
        return logs.filter(log => {
            const searchText = JSON.stringify(log).toLowerCase();
            return keywords.some(keyword => 
                searchText.includes(keyword.toLowerCase())
            );
        });
    }

    /**
     * 排序结果
     */
    sortResults(logs, sortBy, sortOrder) {
        return logs.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            
            // 处理时间排序
            if (sortBy === 'timestamp') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            // 处理数字排序
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
            }
            
            // 处理字符串排序
            const comparison = String(aValue).localeCompare(String(bValue));
            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * 聚合查询
     */
    async aggregateLogs(query) {
        try {
            const results = await this.searchLogs(query);
            const logs = results.data;
            
            const aggregations = {};
            
            // 按字段分组聚合
            for (const [field, config] of Object.entries(query.aggregations || {})) {
                if (config.type === 'groupBy') {
                    aggregations[field] = this.groupByField(logs, field, config);
                } else if (config.type === 'count') {
                    aggregations[field] = this.countByField(logs, field);
                } else if (config.type === 'sum') {
                    aggregations[field] = this.sumByField(logs, field, config.field);
                } else if (config.type === 'avg') {
                    aggregations[field] = this.avgByField(logs, field, config.field);
                }
            }
            
            return {
                success: true,
                data: aggregations,
                total: results.pagination.total
            };
            
        } catch (error) {
            console.error('聚合查询失败:', error);
            return {
                success: false,
                error: error.message,
                data: {}
            };
        }
    }

    /**
     * 按字段分组
     */
    groupByField(logs, field, config = {}) {
        const groups = {};
        
        logs.forEach(log => {
            const key = log[field] || 'unknown';
            if (!groups[key]) {
                groups[key] = {
                    count: 0,
                    items: []
                };
            }
            groups[key].count++;
            groups[key].items.push(log);
        });
        
        // 应用限制和排序
        const result = Object.entries(groups)
            .map(([key, value]) => ({ key, ...value }))
            .sort((a, b) => b.count - a.count);
            
        if (config.limit) {
            return result.slice(0, config.limit);
        }
        
        return result;
    }

    /**
     * 按字段计数
     */
    countByField(logs, field) {
        return logs.reduce((acc, log) => {
            const key = log[field] || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }

    /**
     * 按字段求和
     */
    sumByField(logs, field, sumField) {
        return logs.reduce((acc, log) => {
            const key = log[field] || 'unknown';
            const value = parseFloat(log[sumField]) || 0;
            acc[key] = (acc[key] || 0) + value;
            return acc;
        }, {});
    }

    /**
     * 按字段求平均
     */
    avgByField(logs, field, avgField) {
        const sums = this.sumByField(logs, field, avgField);
        const counts = this.countByField(logs, field);
        
        const result = {};
        for (const key of Object.keys(sums)) {
            result[key] = counts[key] > 0 ? sums[key] / counts[key] : 0;
        }
        
        return result;
    }

    /**
     * 用户行为分析
     */
    async analyzeUserBehavior(timeRange = {}) {
        try {
            const query = {
                logTypes: ['audit_logs', 'access_logs'],
                timeRange: timeRange,
                limit: 10000
            };
            
            const results = await this.searchLogs(query);
            const logs = results.data;
            
            // 分析用户活动模式
            const userActivity = this.analyzeUserActivity(logs);
            
            // 分析操作类型分布
            const actionDistribution = this.analyzeActionDistribution(logs);
            
            // 分析时间模式
            const timePatterns = this.analyzeTimePatterns(logs);
            
            // 分析异常行为
            const anomalies = this.detectAnomalies(logs);
            
            return {
                success: true,
                data: {
                    userActivity,
                    actionDistribution,
                    timePatterns,
                    anomalies,
                    analysisPeriod: timeRange
                }
            };
            
        } catch (error) {
            console.error('用户行为分析失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 分析用户活动
     */
    analyzeUserActivity(logs) {
        const userStats = {};
        
        logs.forEach(log => {
            const userId = log.user_id || log.username || 'anonymous';
            
            if (!userStats[userId]) {
                userStats[userId] = {
                    totalActions: 0,
                    uniqueActions: new Set(),
                    lastActivity: null,
                    ipAddresses: new Set(),
                    successRate: { success: 0, total: 0 }
                };
            }
            
            const stats = userStats[userId];
            stats.totalActions++;
            stats.uniqueActions.add(log.action);
            stats.lastActivity = !stats.lastActivity || 
                new Date(log.timestamp) > new Date(stats.lastActivity) ? 
                log.timestamp : stats.lastActivity;
            stats.ipAddresses.add(log.ip_address);
            
            if (stats.successRate) {
                stats.successRate.total++;
                if (log.result === 'SUCCESS') {
                    stats.successRate.success++;
                }
            }
        });
        
        // 转换 Set 为数组
        Object.values(userStats).forEach(stats => {
            stats.uniqueActions = Array.from(stats.uniqueActions);
            stats.ipAddresses = Array.from(stats.ipAddresses);
            stats.successRate = stats.successRate.total > 0 ? 
                (stats.successRate.success / stats.successRate.total * 100).toFixed(2) + '%' : '0%';
        });
        
        return userStats;
    }

    /**
     * 分析操作类型分布
     */
    analyzeActionDistribution(logs) {
        const distribution = {};
        
        logs.forEach(log => {
            const action = log.action || 'unknown';
            distribution[action] = (distribution[action] || 0) + 1;
        });
        
        return Object.entries(distribution)
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * 分析时间模式
     */
    analyzeTimePatterns(logs) {
        const hourlyPattern = new Array(24).fill(0);
        const dailyPattern = new Array(7).fill(0);
        
        logs.forEach(log => {
            const date = new Date(log.timestamp);
            const hour = date.getHours();
            const day = date.getDay();
            
            hourlyPattern[hour]++;
            dailyPattern[day]++;
        });
        
        return {
            hourly: hourlyPattern,
            daily: dailyPattern,
            peakHour: hourlyPattern.indexOf(Math.max(...hourlyPattern)),
            peakDay: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dailyPattern.indexOf(Math.max(...dailyPattern))]
        };
    }

    /**
     * 检测异常行为
     */
    detectAnomalies(logs) {
        const anomalies = [];
        const userActionCounts = {};
        
        logs.forEach(log => {
            const userId = log.user_id || log.username || 'anonymous';
            userActionCounts[userId] = (userActionCounts[userId] || 0) + 1;
        });
        
        // 检测异常高频率操作
        const avgActions = Object.values(userActionCounts).reduce((a, b) => a + b, 0) / Object.keys(userActionCounts).length;
        
        Object.entries(userActionCounts).forEach(([userId, count]) => {
            if (count > avgActions * 3) {
                anomalies.push({
                    type: 'high_frequency',
                    userId,
                    count,
                    severity: 'medium',
                    description: `用户 ${userId} 的操作频率异常高 (${count} 次)`
                });
            }
        });
        
        // 检测失败率高的用户
        const userFailures = {};
        logs.forEach(log => {
            const userId = log.user_id || log.username || 'anonymous';
            if (!userFailures[userId]) {
                userFailures[userId] = { success: 0, total: 0 };
            }
            userFailures[userId].total++;
            if (log.result === 'SUCCESS') {
                userFailures[userId].success++;
            }
        });
        
        Object.entries(userFailures).forEach(([userId, stats]) => {
            const failureRate = (stats.total - stats.success) / stats.total;
            if (failureRate > 0.5 && stats.total > 5) {
                anomalies.push({
                    type: 'high_failure_rate',
                    userId,
                    failureRate: (failureRate * 100).toFixed(2) + '%',
                    severity: 'high',
                    description: `用户 ${userId} 的失败率异常高 (${failureRate * 100}%)`
                });
            }
        });
        
        return anomalies;
    }

    /**
     * 系统健康分析
     */
    async analyzeSystemHealth(timeRange = {}) {
        try {
            const query = {
                logTypes: ['performance_metrics', 'error_logs'],
                timeRange: timeRange,
                limit: 10000
            };
            
            const results = await this.searchLogs(query);
            const logs = results.data;
            
            // 性能趋势分析
            const performanceTrends = this.analyzePerformanceTrends(logs);
            
            // 错误模式分析
            const errorPatterns = this.analyzeErrorPatterns(logs);
            
            // 系统负载分析
            const systemLoad = this.analyzeSystemLoad(logs);
            
            // 健康评分
            const healthScore = this.calculateHealthScore(performanceTrends, errorPatterns);
            
            return {
                success: true,
                data: {
                    performanceTrends,
                    errorPatterns,
                    systemLoad,
                    healthScore,
                    analysisPeriod: timeRange
                }
            };
            
        } catch (error) {
            console.error('系统健康分析失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 分析性能趋势
     */
    analyzePerformanceTrends(logs) {
        const performanceLogs = logs.filter(log => log.metric_type === 'performance');
        
        const trends = {};
        
        performanceLogs.forEach(log => {
            const metricName = log.metric_name;
            if (!trends[metricName]) {
                trends[metricName] = {
                    values: [],
                    min: Infinity,
                    max: -Infinity,
                    avg: 0
                };
            }
            
            const value = parseFloat(log.value);
            trends[metricName].values.push({
                timestamp: log.timestamp,
                value: value
            });
            
            trends[metricName].min = Math.min(trends[metricName].min, value);
            trends[metricName].max = Math.max(trends[metricName].max, value);
        });
        
        // 计算平均值
        Object.values(trends).forEach(trend => {
            if (trend.values.length > 0) {
                trend.avg = trend.values.reduce((sum, item) => sum + item.value, 0) / trend.values.length;
            }
        });
        
        return trends;
    }

    /**
     * 分析错误模式
     */
    analyzeErrorPatterns(logs) {
        const errorLogs = logs.filter(log => log.level === 'error' || log.alert_level === 'CRITICAL');
        
        const patterns = {
            totalErrors: errorLogs.length,
            errorTypes: {},
            hourlyDistribution: new Array(24).fill(0),
            topErrors: []
        };
        
        errorLogs.forEach(log => {
            // 错误类型统计
            const errorType = log.action || log.metric_name || 'unknown';
            patterns.errorTypes[errorType] = (patterns.errorTypes[errorType] || 0) + 1;
            
            // 小时分布
            const hour = new Date(log.timestamp).getHours();
            patterns.hourlyDistribution[hour]++;
        });
        
        // 顶级错误
        patterns.topErrors = Object.entries(patterns.errorTypes)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        
        return patterns;
    }

    /**
     * 分析系统负载
     */
    analyzeSystemLoad(logs) {
        const performanceLogs = logs.filter(log => log.metric_type === 'performance');
        
        const loadMetrics = {
            cpu: [],
            memory: [],
            responseTime: [],
            activeConnections: []
        };
        
        performanceLogs.forEach(log => {
            const value = parseFloat(log.value);
            const metricName = log.metric_name;
            
            if (metricName.includes('cpu')) {
                loadMetrics.cpu.push(value);
            } else if (metricName.includes('memory')) {
                loadMetrics.memory.push(value);
            } else if (metricName.includes('response')) {
                loadMetrics.responseTime.push(value);
            } else if (metricName.includes('connection')) {
                loadMetrics.activeConnections.push(value);
            }
        });
        
        // 计算负载指标
        const loadAnalysis = {};
        Object.entries(loadMetrics).forEach(([metric, values]) => {
            if (values.length > 0) {
                loadAnalysis[metric] = {
                    current: values[values.length - 1] || 0,
                    average: values.reduce((a, b) => a + b, 0) / values.length,
                    peak: Math.max(...values),
                    trend: values.length > 1 ? 
                        values[values.length - 1] > values[0] ? 'increasing' : 'decreasing' : 'stable'
                };
            }
        });
        
        return loadAnalysis;
    }

    /**
     * 计算健康评分
     */
    calculateHealthScore(performanceTrends, errorPatterns) {
        let score = 100;
        
        // 根据错误数量扣分
        if (errorPatterns.totalErrors > 100) {
            score -= 30;
        } else if (errorPatterns.totalErrors > 50) {
            score -= 20;
        } else if (errorPatterns.totalErrors > 10) {
            score -= 10;
        }
        
        // 根据性能指标调整
        Object.values(performanceTrends).forEach(trend => {
            if (trend.avg > 80) {
                score -= 10;
            } else if (trend.avg > 60) {
                score -= 5;
            }
        });
        
        return Math.max(0, Math.min(100, score));
    }

    /**
     * 安全事件分析
     */
    async analyzeSecurityEvents(timeRange = {}) {
        try {
            const query = {
                logTypes: ['audit_logs', 'access_logs', 'security_logs'],
                timeRange: timeRange,
                filters: { level: 'error' },
                limit: 10000
            };
            
            const results = await this.searchLogs(query);
            const logs = results.data;
            
            // 检测安全威胁
            const threats = this.detectSecurityThreats(logs);
            
            // 分析访问模式
            const accessPatterns = this.analyzeAccessPatterns(logs);
            
            // 检测异常IP
            const suspiciousIPs = this.detectSuspiciousIPs(logs);
            
            // 生成安全报告
            const securityReport = this.generateSecurityReport(threats, accessPatterns, suspiciousIPs);
            
            return {
                success: true,
                data: {
                    threats,
                    accessPatterns,
                    suspiciousIPs,
                    securityReport
                }
            };
            
        } catch (error) {
            console.error('安全事件分析失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 检测安全威胁
     */
    detectSecurityThreats(logs) {
        const threats = [];
        const ipAttempts = {};
        
        logs.forEach(log => {
            const ip = log.ip_address || 'unknown';
            const action = log.action || 'unknown';
            
            // 统计IP尝试次数
            if (!ipAttempts[ip]) {
                ipAttempts[ip] = { failed: 0, total: 0 };
            }
            ipAttempts[ip].total++;
            
            if (log.result === 'FAILURE' || log.result === 'DENIED') {
                ipAttempts[ip].failed++;
            }
            
            // 检测暴力破解
            if (action.includes('login') && log.result === 'FAILURE') {
                if (ipAttempts[ip].failed >= 10) {
                    threats.push({
                        type: 'brute_force',
                        severity: 'high',
                        ip: ip,
                        description: `检测到来自 ${ip} 的暴力破解尝试 (${ipAttempts[ip].failed} 次失败)`,
                        timestamp: log.timestamp
                    });
                }
            }
            
            // 检测权限提升尝试
            if (action.includes('admin') || action.includes('elevate')) {
                threats.push({
                    type: 'privilege_escalation',
                    severity: 'critical',
                    user: log.user_id,
                    ip: ip,
                    description: '检测到权限提升尝试',
                    timestamp: log.timestamp
                });
            }
        });
        
        return threats;
    }

    /**
     * 分析访问模式
     */
    analyzeAccessPatterns(logs) {
        const patterns = {
            uniqueUsers: new Set(),
            uniqueIPs: new Set(),
            commonActions: {},
            timeDistribution: new Array(24).fill(0)
        };
        
        logs.forEach(log => {
            patterns.uniqueUsers.add(log.user_id || log.username);
            patterns.uniqueIPs.add(log.ip_address);
            
            const action = log.action || 'unknown';
            patterns.commonActions[action] = (patterns.commonActions[action] || 0) + 1;
            
            const hour = new Date(log.timestamp).getHours();
            patterns.timeDistribution[hour]++;
        });
        
        return {
            uniqueUsers: patterns.uniqueUsers.size,
            uniqueIPs: patterns.uniqueIPs.size,
            topActions: Object.entries(patterns.commonActions)
                .map(([action, count]) => ({ action, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10),
            timeDistribution: patterns.timeDistribution
        };
    }

    /**
     * 检测可疑IP
     */
    detectSuspiciousIPs(logs) {
        const ipStats = {};
        
        logs.forEach(log => {
            const ip = log.ip_address || 'unknown';
            
            if (!ipStats[ip]) {
                ipStats[ip] = {
                    attempts: 0,
                    failures: 0,
                    uniqueUsers: new Set(),
                    timeSpan: []
                };
            }
            
            ipStats[ip].attempts++;
            ipStats[ip].timeSpan.push(new Date(log.timestamp));
            
            if (log.result === 'FAILURE' || log.result === 'DENIED') {
                ipStats[ip].failures++;
            }
            
            ipStats[ip].uniqueUsers.add(log.user_id || log.username);
        });
        
        const suspiciousIPs = [];
        
        Object.entries(ipStats).forEach(([ip, stats]) => {
            const failureRate = stats.failures / stats.attempts;
            const timeSpan = Math.max(...stats.timeSpan) - Math.min(...stats.timeSpan);
            const attemptsPerHour = stats.attempts / (timeSpan / (1000 * 60 * 60));
            
            // 判断可疑条件
            if (failureRate > 0.8 && stats.attempts > 20) {
                suspiciousIPs.push({
                    ip,
                    attempts: stats.attempts,
                    failures: stats.failures,
                    failureRate: (failureRate * 100).toFixed(2) + '%',
                    uniqueUsers: stats.uniqueUsers.size,
                    severity: 'high',
                    reason: '高失败率'
                });
            } else if (attemptsPerHour > 100) {
                suspiciousIPs.push({
                    ip,
                    attempts: stats.attempts,
                    attemptsPerHour: attemptsPerHour.toFixed(2),
                    uniqueUsers: stats.uniqueUsers.size,
                    severity: 'medium',
                    reason: '高频访问'
                });
            }
        });
        
        return suspiciousIPs.sort((a, b) => a.severity.localeCompare(b.severity));
    }

    /**
     * 生成安全报告
     */
    generateSecurityReport(threats, accessPatterns, suspiciousIPs) {
        const report = {
            summary: {
                totalThreats: threats.length,
                criticalThreats: threats.filter(t => t.severity === 'critical').length,
                highThreats: threats.filter(t => t.severity === 'high').length,
                suspiciousIPs: suspiciousIPs.length
            },
            riskLevel: 'low',
            recommendations: []
        };
        
        // 风险等级评估
        if (threats.some(t => t.severity === 'critical') || suspiciousIPs.length > 5) {
            report.riskLevel = 'critical';
        } else if (threats.some(t => t.severity === 'high') || suspiciousIPs.length > 2) {
            report.riskLevel = 'high';
        } else if (threats.length > 0 || suspiciousIPs.length > 0) {
            report.riskLevel = 'medium';
        }
        
        // 生成建议
        if (threats.some(t => t.type === 'brute_force')) {
            report.recommendations.push('实施登录尝试限制和IP黑名单机制');
        }
        
        if (threats.some(t => t.type === 'privilege_escalation')) {
            report.recommendations.push('加强权限管理和访问控制');
        }
        
        if (suspiciousIPs.length > 0) {
            report.recommendations.push('对可疑IP进行进一步调查和监控');
        }
        
        return report;
    }

    /**
     * 导出查询结果
     */
    async exportResults(query, format = 'json') {
        try {
            const results = await this.searchLogs({ ...query, limit: 100000 }); // 导出大量数据
            
            if (!results.success) {
                throw new Error(results.error);
            }
            
            let exportData;
            let filename;
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            switch (format.toLowerCase()) {
                case 'csv':
                    exportData = this.convertToCSV(results.data);
                    filename = `logs_export_${timestamp}.csv`;
                    break;
                    
                case 'json':
                default:
                    exportData = JSON.stringify(results.data, null, 2);
                    filename = `logs_export_${timestamp}.json`;
                    break;
            }
            
            return {
                success: true,
                data: exportData,
                filename: filename,
                recordCount: results.data.length
            };
            
        } catch (error) {
            console.error('导出查询结果失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 转换为CSV格式
     */
    convertToCSV(data) {
        if (!data || data.length === 0) {
            return '';
        }
        
        // 获取所有字段名
        const headers = new Set();
        data.forEach(row => {
            Object.keys(row).forEach(key => headers.add(key));
        });
        
        const headerArray = Array.from(headers);
        
        // 生成CSV头
        let csv = headerArray.join(',') + '\n';
        
        // 生成CSV数据行
        data.forEach(row => {
            const values = headerArray.map(header => {
                let value = row[header];
                if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                }
                return `"${String(value || '').replace(/"/g, '""')}"`;
            });
            csv += values.join(',') + '\n';
        });
        
        return csv;
    }

    /**
     * 获取查询统计信息
     */
    getQueryStats() {
        const cacheHitRate = this.queryCache.size > 0 ? 
            (this.queryStats.totalQueries > 0 ? 
                ((this.queryStats.totalQueries - this.queryCache.size) / this.queryStats.totalQueries * 100).toFixed(2) : 0) : 0;
        
        return {
            ...this.queryStats,
            cacheSize: this.queryCache.size,
            cacheHitRate: cacheHitRate + '%',
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.queryStats = {
            totalQueries: 0,
            avgResponseTime: 0,
            cacheHitRate: 0,
            lastReset: new Date().toISOString()
        };
    }

    /**
     * 清理过期缓存
     */
    cleanupCache() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, cached] of this.queryCache.entries()) {
            if (now - cached.timestamp > this.cacheTimeout) {
                this.queryCache.delete(key);
                cleanedCount++;
            }
        }
        
        console.log(`清理了 ${cleanedCount} 个过期缓存项`);
        return cleanedCount;
    }

    /**
     * 关闭日志查询引擎
     */
    async close() {
        try {
            // 保存缓存
            await this.saveCache();
            
            // 保存所有索引
            for (const logType of this.logIndices.keys()) {
                await this.saveIndex(logType);
            }
            
            console.log('✅ 日志查询引擎已关闭');
        } catch (error) {
            console.error('❌ 关闭日志查询引擎失败:', error);
        }
    }
}

module.exports = LogQueryEngine;