const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');

/**
 * 数据库性能监控器
 * 为放射化学纯度检测仪提供数据库性能监控和分析功能
 */
class DatabaseMonitor {
    constructor() {
        // 创建数据库管理器实例
        this.dbManager = new SimplifiedDatabaseManager();
        this.dbManager.initialize();
        
        // 设置监控路径
        this.monitorPath = path.join(__dirname, 'data');
        this.ensureDirectories();
        
        // 性能监控数据存储
        this.performanceData = {
            queryStats: new Map(), // 查询统计
            slowQueries: [], // 慢查询记录
            connectionStats: [], // 连接统计
            operationStats: new Map(), // 操作统计
            alerts: [] // 性能警告
        };
        
        // 性能阈值配置
        this.thresholds = {
            slowQueryTime: 1000, // 慢查询阈值（毫秒）
            maxConnections: 100, // 最大连接数
            highResponseTime: 500, // 高响应时间阈值
            errorRateThreshold: 5, // 错误率阈值（百分比）
            maxQPS: 1000 // 最大QPS
        };
        
        // 实时性能监控
        this.currentStats = {
            activeConnections: 0,
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            averageResponseTime: 0,
            currentQPS: 0,
            responseTimeSamples: []
        };
        
        // 启动监控
        this.startMonitoring();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.monitorPath)) {
            fs.mkdirSync(this.monitorPath, { recursive: true });
        }
    }

    /**
     * 启动性能监控
     */
    startMonitoring() {
        console.log('🚀 启动数据库性能监控...');
        
        // 定期清理过期数据
        setInterval(() => this.cleanupOldData(), 300000); // 每5分钟清理一次
        
        // 定期更新统计信息
        setInterval(() => this.updateStats(), 30000); // 每30秒更新一次
        
        // 初始化性能数据文件
        this.initializeMonitorData();
        
        console.log('✅ 数据库性能监控已启动');
    }

    /**
     * 初始化监控数据文件
     */
    initializeMonitorData() {
        const monitorFiles = [
            'query_performance.json',
            'slow_queries.json',
            'connection_stats.json',
            'operation_frequency.json',
            'performance_trends.json',
            'database_alerts.json'
        ];

        monitorFiles.forEach(file => {
            const filePath = path.join(this.monitorPath, file);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify([], null, 2));
            }
        });
    }

    /**
     * 数据库操作装饰器 - 自动追踪性能指标
     */
    trackOperation(operationType, tableName, operationName) {
        return (target, propertyKey, descriptor) => {
            const originalMethod = descriptor.value;
            
            descriptor.value = async function (...args) {
                const startTime = Date.now();
                const queryId = crypto.randomUUID();
                const operationId = `${operationType}:${tableName}:${operationName}`;
                
                try {
                    // 记录操作开始
                    DatabaseMonitor.recordOperationStart(queryId, operationId, operationType, tableName, operationName);
                    
                    // 执行原始操作
                    const result = await originalMethod.apply(this, args);
                    
                    // 计算响应时间
                    const responseTime = Date.now() - startTime;
                    
                    // 记录成功操作
                    DatabaseMonitor.recordOperationSuccess(queryId, operationId, responseTime, tableName, operationName);
                    
                    return result;
                } catch (error) {
                    // 记录失败操作
                    const responseTime = Date.now() - startTime;
                    DatabaseMonitor.recordOperationFailure(queryId, operationId, responseTime, tableName, operationName, error);
                    throw error;
                }
            };
            
            return descriptor;
        };
    }

    /**
     * 记录操作开始
     */
    static recordOperationStart(queryId, operationId, operationType, tableName, operationName) {
        const monitor = DatabaseMonitor.instance;
        if (!monitor) return;
        
        monitor.currentStats.activeConnections++;
        
        // 记录操作开始信息
        const operationStart = {
            queryId,
            operationId,
            operationType,
            tableName,
            operationName,
            startTime: Date.now(),
            status: 'STARTED'
        };
        
        // 存储到内存中
        if (!monitor.performanceData.queryStats.has(operationId)) {
            monitor.performanceData.queryStats.set(operationId, {
                operationType,
                tableName,
                operationName,
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                totalResponseTime: 0,
                minResponseTime: Infinity,
                maxResponseTime: 0,
                responseTimes: [],
                lastCall: null,
                avgResponseTime: 0,
                p95ResponseTime: 0
            });
        }
    }

    /**
     * 记录操作成功
     */
    static recordOperationSuccess(queryId, operationId, responseTime, tableName, operationName) {
        const monitor = DatabaseMonitor.instance;
        if (!monitor) return;
        
        monitor.currentStats.activeConnections--;
        monitor.currentStats.totalQueries++;
        monitor.currentStats.successfulQueries++;
        monitor.currentStats.responseTimeSamples.push(responseTime);
        
        // 限制响应时间样本数量（保持最近1000个样本）
        if (monitor.currentStats.responseTimeSamples.length > 1000) {
            monitor.currentStats.responseTimeSamples = monitor.currentStats.responseTimeSamples.slice(-1000);
        }
        
        // 更新统计信息
        const stats = monitor.performanceData.queryStats.get(operationId);
        if (stats) {
            stats.totalCalls++;
            stats.successfulCalls++;
            stats.totalResponseTime += responseTime;
            stats.minResponseTime = Math.min(stats.minResponseTime, responseTime);
            stats.maxResponseTime = Math.max(stats.maxResponseTime, responseTime);
            stats.responseTimes.push(responseTime);
            stats.lastCall = new Date().toISOString();
            
            // 计算平均响应时间
            stats.avgResponseTime = stats.totalResponseTime / stats.totalCalls;
            
            // 计算95分位数
            if (stats.responseTimes.length >= 20) {
                const sortedTimes = [...stats.responseTimes].sort((a, b) => a - b);
                const p95Index = Math.floor(sortedTimes.length * 0.95);
                stats.p95ResponseTime = sortedTimes[p95Index];
            }
        }
        
        // 检查是否为慢查询
        if (responseTime > monitor.thresholds.slowQueryTime) {
            monitor.recordSlowQuery(queryId, operationId, responseTime, tableName, operationName, 'SUCCESS');
        }
        
        // 检查性能阈值
        monitor.checkPerformanceThresholds(operationId, responseTime);
    }

    /**
     * 记录操作失败
     */
    static recordOperationFailure(queryId, operationId, responseTime, tableName, operationName, error) {
        const monitor = DatabaseMonitor.instance;
        if (!monitor) return;
        
        monitor.currentStats.activeConnections--;
        monitor.currentStats.totalQueries++;
        monitor.currentStats.failedQueries++;
        monitor.currentStats.responseTimeSamples.push(responseTime);
        
        // 更新统计信息
        const stats = monitor.performanceData.queryStats.get(operationId);
        if (stats) {
            stats.totalCalls++;
            stats.failedCalls++;
            stats.totalResponseTime += responseTime;
            stats.minResponseTime = Math.min(stats.minResponseTime, responseTime);
            stats.maxResponseTime = Math.max(stats.maxResponseTime, responseTime);
            stats.responseTimes.push(responseTime);
            stats.lastCall = new Date().toISOString();
            
            stats.avgResponseTime = stats.totalResponseTime / stats.totalCalls;
            
            if (stats.responseTimes.length >= 20) {
                const sortedTimes = [...stats.responseTimes].sort((a, b) => a - b);
                const p95Index = Math.floor(sortedTimes.length * 0.95);
                stats.p95ResponseTime = sortedTimes[p95Index];
            }
        }
        
        // 记录失败查询
        monitor.recordSlowQuery(queryId, operationId, responseTime, tableName, operationName, 'FAILED', error);
        
        // 记录错误警告
        monitor.createAlert('ERROR', `查询失败: ${operationName}`, {
            operationId,
            responseTime,
            error: error.message
        });
    }

    /**
     * 记录慢查询
     */
    recordSlowQuery(queryId, operationId, responseTime, tableName, operationName, status, error = null) {
        const slowQuery = {
            id: queryId,
            operationId,
            operationName,
            tableName,
            operationType: operationId.split(':')[0],
            responseTime,
            status,
            timestamp: new Date().toISOString(),
            error: error ? error.message : null
        };
        
        this.performanceData.slowQueries.push(slowQuery);
        
        // 保持最近1000个慢查询记录
        if (this.performanceData.slowQueries.length > 1000) {
            this.performanceData.slowQueries = this.performanceData.slowQueries.slice(-1000);
        }
        
        // 保存到文件
        this.saveToFile('slow_queries.json', this.performanceData.slowQueries);
    }

    /**
     * 检查性能阈值
     */
    checkPerformanceThresholds(operationId, responseTime) {
        const stats = this.performanceData.queryStats.get(operationId);
        if (!stats) return;
        
        // 检查响应时间
        if (responseTime > this.thresholds.highResponseTime) {
            this.createAlert('WARNING', `高响应时间: ${stats.operationName}`, {
                operationId,
                responseTime,
                threshold: this.thresholds.highResponseTime
            });
        }
        
        // 检查错误率
        const errorRate = (stats.failedCalls / stats.totalCalls) * 100;
        if (errorRate > this.thresholds.errorRateThreshold) {
            this.createAlert('WARNING', `高错误率: ${stats.operationName}`, {
                operationId,
                errorRate,
                threshold: this.thresholds.errorRateThreshold
            });
        }
    }

    /**
     * 创建性能警告
     */
    createAlert(level, message, data) {
        const alert = {
            id: crypto.randomUUID(),
            level,
            message,
            data,
            timestamp: new Date().toISOString(),
            acknowledged: false
        };
        
        this.performanceData.alerts.push(alert);
        
        // 保存到文件
        this.saveToFile('database_alerts.json', this.performanceData.alerts);
        
        console.warn(`⚠️ 数据库性能警告 [${level}]: ${message}`, data);
    }

    /**
     * 更新统计数据
     */
    updateStats() {
        // 计算平均响应时间
        if (this.currentStats.responseTimeSamples.length > 0) {
            const sum = this.currentStats.responseTimeSamples.reduce((acc, time) => acc + time, 0);
            this.currentStats.averageResponseTime = sum / this.currentStats.responseTimeSamples.length;
        }
        
        // 计算QPS (每秒查询数)
        const oneSecondAgo = Date.now() - 1000;
        const recentQueries = this.currentStats.responseTimeSamples.filter(time => time >= oneSecondAgo);
        this.currentStats.currentQPS = recentQueries.length;
        
        // 计算成功率
        const totalQueries = this.currentStats.successfulQueries + this.currentStats.failedQueries;
        if (totalQueries > 0) {
            this.currentStats.successRate = (this.currentStats.successfulQueries / totalQueries) * 100;
            this.currentStats.errorRate = (this.currentStats.failedQueries / totalQueries) * 100;
        } else {
            this.currentStats.successRate = 100;
            this.currentStats.errorRate = 0;
        }
        
        // 保存统计数据到文件
        this.saveCurrentStats();
    }

    /**
     * 保存当前统计数据
     */
    saveCurrentStats() {
        const statsSnapshot = {
            timestamp: new Date().toISOString(),
            ...this.currentStats,
            queryStats: Object.fromEntries(this.performanceData.queryStats)
        };
        
        this.saveToFile('query_performance.json', statsSnapshot);
    }

    /**
     * 清理过期数据
     */
    cleanupOldData() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        // 清理慢查询
        this.performanceData.slowQueries = this.performanceData.slowQueries.filter(
            query => new Date(query.timestamp).getTime() > oneHourAgo
        );
        
        // 清理警告
        this.performanceData.alerts = this.performanceData.alerts.filter(
            alert => new Date(alert.timestamp).getTime() > oneHourAgo
        );
        
        console.log('🧹 已清理过期性能数据');
    }

    /**
     * 保存数据到文件
     */
    saveToFile(filename, data) {
        try {
            const filePath = path.join(this.monitorPath, filename);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(`保存文件 ${filename} 失败:`, error);
        }
    }

    /**
     * 获取数据库统计信息
     */
    getDatabaseStats() {
        const baseStats = this.dbManager.getDatabaseStats();
        
        return {
            ...baseStats,
            performance: {
                totalQueries: this.currentStats.totalQueries,
                successfulQueries: this.currentStats.successfulQueries,
                failedQueries: this.currentStats.failedQueries,
                averageResponseTime: Math.round(this.currentStats.averageResponseTime * 100) / 100,
                currentQPS: this.currentStats.currentQPS,
                successRate: Math.round(this.currentStats.successRate * 100) / 100,
                errorRate: Math.round(this.currentStats.errorRate * 100) / 100,
                activeConnections: this.currentStats.activeConnections
            }
        };
    }

    /**
     * 获取查询性能详情
     */
    getQueryPerformanceDetails() {
        const queryStatsObj = {};
        this.performanceData.queryStats.forEach((value, key) => {
            queryStatsObj[key] = value;
        });
        
        return {
            timestamp: new Date().toISOString(),
            queries: Array.from(queryStats.entries()).map(([operationId, stats]) => ({
                operationId,
                operationName: stats.operationName,
                tableName: stats.tableName,
                operationType: stats.operationType,
                totalCalls: stats.totalCalls,
                successfulCalls: stats.successfulCalls,
                failedCalls: stats.failedCalls,
                successRate: stats.totalCalls > 0 ? Math.round((stats.successfulCalls / stats.totalCalls) * 100) : 0,
                averageResponseTime: Math.round(stats.avgResponseTime * 100) / 100,
                minResponseTime: stats.minResponseTime === Infinity ? 0 : stats.minResponseTime,
                maxResponseTime: stats.maxResponseTime,
                p95ResponseTime: stats.p95ResponseTime,
                lastCall: stats.lastCall
            }))
        };
    }

    /**
     * 获取慢查询详情
     */
    getSlowQueries(limit = 50) {
        return {
            timestamp: new Date().toISOString(),
            slowQueries: this.performanceData.slowQueries
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit)
        };
    }

    /**
     * 获取性能趋势
     */
    getPerformanceTrends(timeRange = '1h') {
        // 模拟性能趋势数据（实际应该从历史数据计算）
        const trends = {
            timestamp: new Date().toISOString(),
            timeRange,
            qps: this.generateTrendData(60, this.currentStats.currentQPS, 50),
            responseTime: this.generateTrendData(60, this.currentStats.averageResponseTime, 100),
            errorRate: this.generateTrendData(60, this.currentStats.errorRate, 2),
            connectionCount: this.generateTrendData(60, this.currentStats.activeConnections, 10)
        };
        
        return trends;
    }

    /**
     * 生成趋势数据
     */
    generateTrendData(points, currentValue, variance) {
        const data = [];
        const now = Date.now();
        
        for (let i = points - 1; i >= 0; i--) {
            const time = now - (i * 60 * 1000); // 每分钟一个点
            const value = Math.max(0, currentValue + (Math.random() - 0.5) * variance);
            data.push({
                timestamp: new Date(time).toISOString(),
                value: Math.round(value * 100) / 100
            });
        }
        
        return data;
    }

    /**
     * 获取性能警告
     */
    getAlerts(limit = 50, acknowledged = null) {
        let alerts = this.performanceData.alerts;
        
        if (acknowledged !== null) {
            alerts = alerts.filter(alert => alert.acknowledged === acknowledged);
        }
        
        return {
            timestamp: new Date().toISOString(),
            alerts: alerts
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit)
        };
    }

    /**
     * 确认警告
     */
    acknowledgeAlert(alertId) {
        const alert = this.performanceData.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            this.saveToFile('database_alerts.json', this.performanceData.alerts);
            return true;
        }
        return false;
    }

    /**
     * 设置性能阈值
     */
    setPerformanceThresholds(thresholds) {
        this.thresholds = { ...this.thresholds, ...thresholds };
        
        this.createAlert('INFO', '性能阈值已更新', {
            oldThresholds: this.thresholds,
            newThresholds: thresholds
        });
    }

    /**
     * 获取当前阈值
     */
    getPerformanceThresholds() {
        return {
            timestamp: new Date().toISOString(),
            thresholds: this.thresholds
        };
    }

    /**
     * 获取操作频率统计
     */
    getOperationFrequency() {
        const frequency = {};
        
        // 从慢查询中统计操作频率
        this.performanceData.slowQueries.forEach(query => {
            if (!frequency[query.operationName]) {
                frequency[query.operationName] = {
                    operationName: query.operationName,
                    tableName: query.tableName,
                    operationType: query.operationType,
                    totalCalls: 0,
                    slowCalls: 0,
                    averageResponseTime: 0
                };
            }
            
            frequency[query.operationName].totalCalls++;
            frequency[query.operationName].slowCalls++;
        });
        
        // 计算平均值
        Object.values(frequency).forEach(stat => {
            stat.slowCallRate = stat.totalCalls > 0 ? (stat.slowCalls / stat.totalCalls) * 100 : 0;
        });
        
        return {
            timestamp: new Date().toISOString(),
            operationFrequency: Object.values(frequency).sort((a, b) => b.slowCalls - a.slowCalls)
        };
    }

    /**
     * 导出监控数据
     */
    exportMonitoringData() {
        const exportData = {
            exportTime: new Date().toISOString(),
            databaseStats: this.getDatabaseStats(),
            queryPerformance: this.getQueryPerformanceDetails(),
            slowQueries: this.getSlowQueries(),
            performanceTrends: this.getPerformanceTrends(),
            alerts: this.getAlerts(),
            operationFrequency: this.getOperationFrequency(),
            currentThresholds: this.getPerformanceThresholds()
        };
        
        // 将Map转换为普通对象
        const queryStatsObj = {};
        this.performanceData.queryStats.forEach((value, key) => {
            queryStatsObj[key] = value;
        });
        exportData.queryPerformance.queryStats = queryStatsObj;
        
        const exportPath = path.join(this.monitorPath, `monitoring_export_${Date.now()}.json`);
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
        
        return exportPath;
    }
}

// 单例模式
DatabaseMonitor.instance = null;

// 创建单例实例
DatabaseMonitor.getInstance = function() {
    if (!DatabaseMonitor.instance) {
        DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
};

module.exports = DatabaseMonitor;