const express = require('express');
const ErrorLogger = require('./errorLogger');
const path = require('path');
const fs = require('fs');

/**
 * 错误日志API路由
 * 提供错误日志的查询、管理和统计功能
 */
class ErrorLoggingRoutes {
    constructor(options = {}) {
        this.router = express.Router();
        this.errorLogger = options.errorLogger || ErrorLogger.getInstance();
        this.setupRoutes();
    }

    setupRoutes() {
        // 获取最近的错误日志
        this.router.get('/recent', this.getRecentErrors.bind(this));
        
        // 搜索错误日志
        this.router.get('/search', this.searchErrors.bind(this));
        
        // 获取错误统计
        this.router.get('/statistics', this.getErrorStatistics.bind(this));
        
        // 导出错误日志
        this.router.get('/export', this.exportErrorLogs.bind(this));
        
        // 标记错误为已解决
        this.router.post('/resolve', this.resolveError.bind(this));
        
        // 获取错误详情
        this.router.get('/:errorId', this.getErrorDetails.bind(this));
        
        // 获取错误聚合数据
        this.router.get('/aggregation/overview', this.getErrorAggregation.bind(this));
        
        // 获取告警通知
        this.router.get('/notifications/recent', this.getRecentNotifications.bind(this));
        
        // 清理旧日志
        this.router.post('/cleanup', this.cleanupOldLogs.bind(this));
        
        // 获取错误趋势
        this.router.get('/trends', this.getErrorTrends.bind(this));
        
        // 获取实时错误流
        this.router.get('/stream', this.getErrorStream.bind(this));
    }

    /**
     * 获取最近的错误日志
     */
    async getRecentErrors(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const level = req.query.level;
            const source = req.query.source;
            const resolved = req.query.resolved;
            const hours = parseInt(req.query.hours) || 24;

            const filters = {
                limit: limit
            };

            if (level) filters.level = level;
            if (source) filters.source = source;
            if (resolved !== undefined) filters.resolved = resolved === 'true';

            // 添加时间范围过滤
            const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
            filters.startDate = startDate;

            const errors = this.errorLogger.getErrorLogs(filters);

            res.json({
                success: true,
                data: {
                    errors: errors,
                    total: errors.length,
                    filters: filters
                }
            });
        } catch (error) {
            console.error('获取最近错误失败:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_RECENT_ERRORS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 搜索错误日志
     */
    async searchErrors(req, res) {
        try {
            const query = req.query.q;
            if (!query) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_QUERY',
                        message: '搜索关键词不能为空'
                    }
                });
            }

            const filters = {
                limit: parseInt(req.query.limit) || 100,
                level: req.query.level,
                source: req.query.source,
                resolved: req.query.resolved,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            // 处理resolved参数
            if (filters.resolved !== undefined) {
                filters.resolved = filters.resolved === 'true';
            }

            const errors = this.errorLogger.searchErrors(query, filters);

            res.json({
                success: true,
                data: {
                    query: query,
                    errors: errors,
                    total: errors.length,
                    filters: filters
                }
            });
        } catch (error) {
            console.error('搜索错误日志失败:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'SEARCH_ERRORS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取错误统计
     */
    async getErrorStatistics(req, res) {
        try {
            const period = req.query.period || '24h';
            const filters = {};

            // 根据时间周期设置过滤条件
            const now = new Date();
            let startDate;

            switch (period) {
                case '1h':
                    startDate = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case '24h':
                    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }

            filters.startDate = startDate.toISOString();

            const statistics = this.errorLogger.getErrorStatistics(filters);

            res.json({
                success: true,
                data: {
                    statistics: statistics,
                    period: period,
                    generatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('获取错误统计失败:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_STATISTICS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 导出错误日志
     */
    async exportErrorLogs(req, res) {
        try {
            const format = req.query.format || 'json';
            const level = req.query.level;
            const source = req.query.source;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;

            const filters = {};
            if (level) filters.level = level;
            if (source) filters.source = source;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const exportedData = this.errorLogger.exportErrorLogs(filters, format);

            const filename = `error-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
            
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            switch (format.toLowerCase()) {
                case 'json':
                    res.setHeader('Content-Type', 'application/json');
                    break;
                case 'csv':
                    res.setHeader('Content-Type', 'text/csv');
                    break;
                case 'html':
                    res.setHeader('Content-Type', 'text/html');
                    break;
                default:
                    res.setHeader('Content-Type', 'application/json');
            }

            res.send(exportedData);
        } catch (error) {
            console.error('导出错误日志失败:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'EXPORT_ERRORS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 标记错误为已解决
     */
    async resolveError(req, res) {
        try {
            const { errorId, resolvedBy, resolution } = req.body;

            if (!errorId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_ERROR_ID',
                        message: '错误ID不能为空'
                    }
                });
            }

            const success = await this.errorLogger.resolveError(
                errorId, 
                resolvedBy || 'system', 
                resolution || ''
            );

            if (success) {
                res.json({
                    success: true,
                    message: '错误已标记为已解决',
                    data: {
                        errorId: errorId,
                        resolvedBy: resolvedBy || 'system',
                        resolvedAt: new Date().toISOString()
                    }
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'ERROR_NOT_FOUND',
                        message: '未找到指定的错误记录'
                    }
                });
            }
        } catch (error) {
            console.error('标记错误为已解决失败:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'RESOLVE_ERROR_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取错误详情
     */
    async getErrorDetails(req, res) {
        try {
            const { errorId } = req.params;

            const errors = this.errorLogger.getErrorLogs({ limit: 1 });
            const error = errors.find(e => e.id === errorId);

            if (!error) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'ERROR_NOT_FOUND',
                        message: '未找到指定的错误记录'
                    }
                });
            }

            // 解析上下文和元数据
            try {
                error.context = JSON.parse(error.context || '{}');
                error.metadata = JSON.parse(error.metadata || '{}');
            } catch (parseError) {
                console.warn('解析错误上下文失败:', parseError);
            }

            res.json({
                success: true,
                data: {
                    error: error
                }
            });
        } catch (error) {
            console.error('获取错误详情失败:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_ERROR_DETAILS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取错误聚合数据
     */
    async getErrorAggregation(req, res) {
        try {
            const aggregation = Array.from(this.errorLogger.errorAggregation.values());
            
            // 按发生次数排序
            aggregation.sort((a, b) => b.count - a.count);

            res.json({
                success: true,
                data: {
                    aggregation: aggregation,
                    total: aggregation.length,
                    generatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('获取错误聚合失败:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_AGGREGATION_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取最近的告警通知
     */
    async getRecentNotifications(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 20;
            const notifications = this.errorLogger.getRecentNotifications(limit);

            res.json({
                success: true,
                data: {
                    notifications: notifications,
                    total: notifications.length
                }
            });
        } catch (error) {
            console.error('获取告警通知失败:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_NOTIFICATIONS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 清理旧日志
     */
    async cleanupOldLogs(req, res) {
        try {
            const daysToKeep = parseInt(req.body.daysToKeep) || 30;
            
            if (daysToKeep < 1 || daysToKeep > 365) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_DAYS',
                        message: '保留天数必须在1-365之间'
                    }
                });
            }

            const removedCount = await this.errorLogger.cleanupOldLogs(daysToKeep);

            res.json({
                success: true,
                message: `成功清理了 ${removedCount} 条过期日志`,
                data: {
                    removedCount: removedCount,
                    daysToKeep: daysToKeep,
                    cleanupAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('清理旧日志失败:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'CLEANUP_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取错误趋势
     */
    async getErrorTrends(req, res) {
        try {
            const period = req.query.period || '24h';
            const errors = this.errorLogger.getErrorLogs();
            
            const trends = this.errorLogger.calculateRecentTrend 
                ? this.errorLogger.calculateRecentTrend(errors)
                : [];

            res.json({
                success: true,
                data: {
                    trends: trends,
                    period: period,
                    generatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('获取错误趋势失败:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'GET_TRENDS_FAILED',
                    message: error.message
                }
            });
        }
    }

    /**
     * 获取实时错误流
     */
    async getErrorStream(req, res) {
        try {
            // 设置SSE头部
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');

            // 发送初始连接确认
            res.write(`data: ${JSON.stringify({
                type: 'connected',
                timestamp: new Date().toISOString(),
                message: '错误日志流已连接'
            })}\n\n`);

            // 监听错误通知队列变化
            const checkForNewErrors = () => {
                try {
                    const recentErrors = this.errorLogger.getRecentErrors(1); // 最近1分钟
                    
                    if (recentErrors.length > 0) {
                        const latestError = recentErrors[0];
                        
                        res.write(`data: ${JSON.stringify({
                            type: 'new_error',
                            timestamp: new Date().toISOString(),
                            error: latestError
                        })}\n\n`);
                    }
                } catch (error) {
                    console.error('检查新错误失败:', error);
                }
            };

            // 定期检查新错误
            const interval = setInterval(checkForNewErrors, 5000); // 每5秒检查一次

            // 客户端断开连接时清理
            req.on('close', () => {
                clearInterval(interval);
                res.end();
            });

        } catch (error) {
            console.error('建立错误流失败:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'STREAM_FAILED',
                    message: error.message
                }
            });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = ErrorLoggingRoutes;