const express = require('express');
const LogQueryEngine = require('./logQueryEngine');

/**
 * 日志查询和分析API路由
 * 提供日志搜索、分析和统计功能
 */
class LogQueryRoutes {
    constructor(databaseManager) {
        this.router = express.Router();
        this.logQueryEngine = new LogQueryEngine(databaseManager);
        this.initializeRoutes();
    }

    initializeRoutes() {
        // 初始化查询引擎
        this.logQueryEngine.initialize().catch(error => {
            console.error('日志查询引擎初始化失败:', error);
        });

        /**
         * POST /api/logging/query/search
         * 搜索日志
         * 
         * 请求体：
         * {
         *   "query": {
         *     "timeRange": {"start": "2024-01-01", "end": "2024-12-31"},
         *     "logTypes": ["audit", "error", "access"],
         *     "filters": {
         *       "userId": "user123",
         *       "action": "login",
         *       "level": "error"
         *     },
         *     "keywords": ["failed", "timeout"],
         *     "sortBy": "timestamp",
         *     "sortOrder": "desc",
         *     "limit": 100,
         *     "offset": 0
         *   }
         * }
         */
        this.router.post('/query/search', async (req, res) => {
            try {
                const query = req.body.query || {};
                const result = await this.logQueryEngine.searchLogs(query);
                
                res.json(result);
            } catch (error) {
                console.error('日志搜索失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    data: []
                });
            }
        });

        /**
         * POST /api/logging/query/aggregate
         * 聚合查询
         * 
         * 请求体：
         * {
         *   "query": {
         *     "timeRange": {"start": "2024-01-01", "end": "2024-12-31"},
         *     "logTypes": ["audit_logs"],
         *     "filters": {}
         *   },
         *   "aggregations": {
         *     "user_id": {
         *       "type": "groupBy",
         *       "limit": 10
         *     },
         *     "action_count": {
         *       "type": "count"
         *     },
         *     "avg_response_time": {
         *       "type": "avg",
         *       "field": "response_time"
         *     }
         *   }
         * }
         */
        this.router.post('/query/aggregate', async (req, res) => {
            try {
                const { query, aggregations } = req.body;
                const result = await this.logQueryEngine.aggregateLogs({
                    ...query,
                    aggregations
                });
                
                res.json(result);
            } catch (error) {
                console.error('聚合查询失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * GET /api/logging/analysis/user-behavior
         * 用户行为分析
         * 
         * 查询参数：
         * ?startDate=2024-01-01&endDate=2024-12-31
         */
        this.router.get('/analysis/user-behavior', async (req, res) => {
            try {
                const { startDate, endDate } = req.query;
                const timeRange = {};
                
                if (startDate) timeRange.start = startDate;
                if (endDate) timeRange.end = endDate;
                
                const result = await this.logQueryEngine.analyzeUserBehavior(timeRange);
                res.json(result);
            } catch (error) {
                console.error('用户行为分析失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * GET /api/logging/analysis/system-health
         * 系统健康分析
         * 
         * 查询参数：
         * ?startDate=2024-01-01&endDate=2024-12-31
         */
        this.router.get('/analysis/system-health', async (req, res) => {
            try {
                const { startDate, endDate } = req.query;
                const timeRange = {};
                
                if (startDate) timeRange.start = startDate;
                if (endDate) timeRange.end = endDate;
                
                const result = await this.logQueryEngine.analyzeSystemHealth(timeRange);
                res.json(result);
            } catch (error) {
                console.error('系统健康分析失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * GET /api/logging/analysis/security-events
         * 安全事件分析
         * 
         * 查询参数：
         * ?startDate=2024-01-01&endDate=2024-12-31
         */
        this.router.get('/analysis/security-events', async (req, res) => {
            try {
                const { startDate, endDate } = req.query;
                const timeRange = {};
                
                if (startDate) timeRange.start = startDate;
                if (endDate) timeRange.end = endDate;
                
                const result = await this.logQueryEngine.analyzeSecurityEvents(timeRange);
                res.json(result);
            } catch (error) {
                console.error('安全事件分析失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * POST /api/logging/query/export
         * 导出查询结果
         * 
         * 请求体：
         * {
         *   "query": { ... },
         *   "format": "json" | "csv"
         * }
         */
        this.router.post('/query/export', async (req, res) => {
            try {
                const { query, format = 'json' } = req.body;
                const result = await this.logQueryEngine.exportResults(query, format);
                
                if (result.success) {
                    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
                    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
                    res.send(result.data);
                } else {
                    res.status(500).json(result);
                }
            } catch (error) {
                console.error('导出查询结果失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * GET /api/logging/stats
         * 获取查询统计信息
         */
        this.router.get('/stats', (req, res) => {
            try {
                const stats = this.logQueryEngine.getQueryStats();
                res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                console.error('获取统计信息失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * POST /api/logging/stats/reset
         * 重置统计信息
         */
        this.router.post('/stats/reset', (req, res) => {
            try {
                this.logQueryEngine.resetStats();
                res.json({
                    success: true,
                    message: '统计信息已重置'
                });
            } catch (error) {
                console.error('重置统计信息失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * POST /api/logging/cache/cleanup
         * 清理缓存
         */
        this.router.post('/cache/cleanup', (req, res) => {
            try {
                const cleanedCount = this.logQueryEngine.cleanupCache();
                res.json({
                    success: true,
                    message: `清理了 ${cleanedCount} 个过期缓存项`
                });
            } catch (error) {
                console.error('清理缓存失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * GET /api/logging/indices/status
         * 获取索引状态
         */
        this.router.get('/indices/status', (req, res) => {
            try {
                const indices = {};
                for (const [logType, index] of this.logQueryEngine.logIndices.entries()) {
                    indices[logType] = {
                        totalEntries: index.totalEntries,
                        lastUpdated: index.lastUpdated,
                        fields: index.fields
                    };
                }
                
                res.json({
                    success: true,
                    data: indices
                });
            } catch (error) {
                console.error('获取索引状态失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * POST /api/logging/query/quick-search
         * 快速搜索（简化版）
         * 
         * 请求体：
         * {
         *   "keywords": ["error", "timeout"],
         *   "logTypes": ["audit_logs", "error_logs"],
         *   "timeRange": "1h" | "24h" | "7d" | "30d"
         * }
         */
        this.router.post('/query/quick-search', async (req, res) => {
            try {
                const { keywords, logTypes = ['audit_logs'], timeRange } = req.body;
                
                // 构建时间范围
                const query = {
                    logTypes,
                    keywords: keywords || [],
                    limit: 50
                };
                
                if (timeRange) {
                    const now = new Date();
                    let startTime;
                    
                    switch (timeRange) {
                        case '1h':
                            startTime = new Date(now.getTime() - 60 * 60 * 1000);
                            break;
                        case '24h':
                            startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                            break;
                        case '7d':
                            startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            break;
                        case '30d':
                            startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                            break;
                    }
                    
                    if (startTime) {
                        query.timeRange = { start: startTime.toISOString() };
                    }
                }
                
                const result = await this.logQueryEngine.searchLogs(query);
                res.json(result);
            } catch (error) {
                console.error('快速搜索失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * GET /api/logging/dashboard/summary
         * 获取仪表板摘要信息
         */
        this.router.get('/dashboard/summary', async (req, res) => {
            try {
                const now = new Date();
                const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                
                // 获取24小时内的数据
                const query24h = {
                    timeRange: { start: last24h.toISOString() },
                    logTypes: ['audit_logs', 'error_logs', 'access_logs'],
                    limit: 10000
                };
                
                const result24h = await this.logQueryEngine.searchLogs(query24h);
                const logs24h = result24h.data;
                
                // 统计信息
                const summary = {
                    totalLogs24h: logs24h.length,
                    errorLogs24h: logs24h.filter(log => 
                        log.level === 'error' || log.alert_level === 'CRITICAL'
                    ).length,
                    uniqueUsers24h: new Set(logs24h.map(log => log.user_id || log.username)).size,
                    activeIPs24h: new Set(logs24h.map(log => log.ip_address)).size,
                    topActions: this.getTopActions(logs24h, 5),
                    errorDistribution: this.getErrorDistribution(logs24h),
                    hourlyActivity: this.getHourlyActivity(logs24h),
                    timestamp: now.toISOString()
                };
                
                res.json({
                    success: true,
                    data: summary
                });
            } catch (error) {
                console.error('获取仪表板摘要失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * POST /api/logging/analysis/custom
         * 自定义分析
         * 
         * 请求体：
         * {
         *   "analysisType": "user_activity" | "error_patterns" | "performance_trends",
         *   "timeRange": { "start": "2024-01-01", "end": "2024-12-31" },
         *   "filters": { ... },
         *   "groupBy": "user_id",
         *   "metric": "count" | "avg" | "sum"
         * }
         */
        this.router.post('/analysis/custom', async (req, res) => {
            try {
                const { 
                    analysisType, 
                    timeRange = {}, 
                    filters = {}, 
                    groupBy, 
                    metric = 'count' 
                } = req.body;
                
                const query = {
                    timeRange,
                    filters,
                    logTypes: ['audit_logs', 'error_logs', 'performance_metrics'],
                    limit: 10000
                };
                
                const result = await this.logQueryEngine.searchLogs(query);
                const logs = result.data;
                
                let analysisResult;
                
                switch (analysisType) {
                    case 'user_activity':
                        analysisResult = this.analyzeCustomUserActivity(logs, groupBy, metric);
                        break;
                    case 'error_patterns':
                        analysisResult = this.analyzeCustomErrorPatterns(logs, groupBy, metric);
                        break;
                    case 'performance_trends':
                        analysisResult = this.analyzeCustomPerformanceTrends(logs, groupBy, metric);
                        break;
                    default:
                        throw new Error(`不支持的分析类型: ${analysisType}`);
                }
                
                res.json({
                    success: true,
                    data: {
                        analysisType,
                        groupBy,
                        metric,
                        result: analysisResult,
                        totalRecords: logs.length,
                        timeRange
                    }
                });
            } catch (error) {
                console.error('自定义分析失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    /**
     * 获取顶级操作
     */
    getTopActions(logs, limit = 5) {
        const actionCounts = {};
        logs.forEach(log => {
            const action = log.action || 'unknown';
            actionCounts[action] = (actionCounts[action] || 0) + 1;
        });
        
        return Object.entries(actionCounts)
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * 获取错误分布
     */
    getErrorDistribution(logs) {
        const errorLogs = logs.filter(log => 
            log.level === 'error' || log.alert_level === 'CRITICAL'
        );
        
        return {
            total: errorLogs.length,
            byHour: new Array(24).fill(0),
            byType: {}
        };
    }

    /**
     * 获取每小时活动
     */
    getHourlyActivity(logs) {
        const hourly = new Array(24).fill(0);
        logs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            hourly[hour]++;
        });
        return hourly;
    }

    /**
     * 自定义用户活动分析
     */
    analyzeCustomUserActivity(logs, groupBy, metric) {
        const groups = {};
        
        logs.forEach(log => {
            const key = log[groupBy] || 'unknown';
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(log);
        });
        
        const result = {};
        Object.entries(groups).forEach(([key, groupLogs]) => {
            switch (metric) {
                case 'count':
                    result[key] = groupLogs.length;
                    break;
                case 'avg':
                    result[key] = groupLogs.length / Object.keys(groups).length;
                    break;
                default:
                    result[key] = groupLogs.length;
            }
        });
        
        return result;
    }

    /**
     * 自定义错误模式分析
     */
    analyzeCustomErrorPatterns(logs, groupBy, metric) {
        const errorLogs = logs.filter(log => 
            log.level === 'error' || log.alert_level === 'CRITICAL'
        );
        
        return this.analyzeCustomUserActivity(errorLogs, groupBy, metric);
    }

    /**
     * 自定义性能趋势分析
     */
    analyzeCustomPerformanceTrends(logs, groupBy, metric) {
        const perfLogs = logs.filter(log => log.metric_type === 'performance');
        
        return this.analyzeCustomUserActivity(perfLogs, groupBy, metric);
    }

    /**
     * 获取路由器实例
     */
    getRouter() {
        return this.router;
    }

    /**
     * 获取日志查询引擎实例
     */
    getLogQueryEngine() {
        return this.logQueryEngine;
    }
}

module.exports = LogQueryRoutes;