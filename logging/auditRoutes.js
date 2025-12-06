const express = require('express');
const router = express.Router();

/**
 * 审计日志API路由
 * 提供审计日志的查询、导出、清理和统计功能
 */
class AuditLoggingRoutes {
    constructor(auditLogger, permissionMiddleware = null) {
        this.auditLogger = auditLogger;
        this.permissionMiddleware = permissionMiddleware;
        this.setupRoutes();
    }

    setupRoutes() {
        // 搜索审计日志
        router.get('/search', this.checkPermission('audit', 'read'), this.searchAuditLogs.bind(this));
        
        // 导出审计日志
        router.get('/export', this.checkPermission('audit', 'export'), this.exportAuditLogs.bind(this));
        
        // 清理旧日志
        router.post('/cleanup', this.checkPermission('audit', 'admin'), this.cleanupAuditLogs.bind(this));
        
        // 获取审计统计
        router.get('/statistics', this.checkPermission('audit', 'read'), this.getAuditStatistics.bind(this));
        
        // 验证审计链
        router.get('/validate-chain', this.checkPermission('audit', 'admin'), this.validateAuditChain.bind(this));
        
        // 获取内部统计
        router.get('/internal-stats', this.checkPermission('audit', 'admin'), this.getInternalStats.bind(this));
        
        // 刷新批量队列
        router.post('/flush', this.checkPermission('audit', 'admin'), this.flushBatchQueue.bind(this));
    }

    /**
     * 权限检查中间件
     */
    checkPermission(resource, action) {
        return (req, res, next) => {
            if (!this.permissionMiddleware) {
                return next();
            }
            
            if (!req.user) {
                return res.status(401).json({ error: '未认证用户' });
            }
            
            const hasPermission = this.permissionMiddleware.checkUserPermission(
                req.user.id,
                resource,
                action
            );
            
            if (!hasPermission) {
                return res.status(403).json({ error: '权限不足' });
            }
            
            next();
        };
    }

    /**
     * 搜索审计日志
     */
    async searchAuditLogs(req, res) {
        try {
            const {
                page = 1,
                pageSize = 50,
                userId,
                username,
                action,
                resource,
                severity,
                result,
                startDate,
                endDate,
                search,
                tags,
                sortBy = 'timestamp',
                sortOrder = 'DESC'
            } = req.query;

            // 构建过滤条件
            const filters = {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                sortBy,
                sortOrder: sortOrder.toUpperCase()
            };

            if (userId) filters.userId = userId;
            if (username) filters.username = username;
            if (action) filters.action = action;
            if (resource) filters.resource = resource;
            if (severity) filters.severity = severity;
            if (result) filters.result = result;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (search) filters.search = search;
            if (tags) filters.tags = tags.split(',');

            const events = this.auditLogger.getAuditLogs(filters);
            
            // 获取总数（用于分页）
            const totalEvents = this.auditLogger.getAuditLogs({
                ...filters,
                page: null,
                pageSize: null
            }).length;

            res.json({
                success: true,
                data: events,
                pagination: {
                    page: parseInt(page),
                    pageSize: parseInt(pageSize),
                    total: totalEvents,
                    pages: Math.ceil(totalEvents / parseInt(pageSize))
                },
                filters: filters
            });
        } catch (error) {
            console.error('搜索审计日志失败:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 导出审计日志
     */
    async exportAuditLogs(req, res) {
        try {
            const {
                format = 'json',
                startDate,
                endDate,
                userId,
                action,
                resource,
                severity,
                filename = `audit_logs_${new Date().toISOString().split('T')[0]}`
            } = req.query;

            const filters = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (userId) filters.userId = userId;
            if (action) filters.action = action;
            if (resource) filters.resource = resource;
            if (severity) filters.severity = severity;

            const exportData = this.auditLogger.exportAuditLogs(filters);

            if (format === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
                res.send(exportData);
            } else {
                res.status(400).json({
                    success: false,
                    error: '不支持的导出格式'
                });
            }
        } catch (error) {
            console.error('导出审计日志失败:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 清理旧日志
     */
    async cleanupAuditLogs(req, res) {
        try {
            const {
                olderThanDays = 365,
                keepMinCount = 1000,
                severity,
                dryRun = 'true'
            } = req.body;

            const options = {
                olderThanDays: parseInt(olderThanDays),
                keepMinCount: parseInt(keepMinCount),
                severity: severity || null,
                dryRun: dryRun === 'true'
            };

            const result = this.auditLogger.cleanupAuditLogs(options);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('清理审计日志失败:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 获取审计统计
     */
    async getAuditStatistics(req, res) {
        try {
            const {
                startDate,
                endDate,
                groupBy = 'day'
            } = req.query;

            const filters = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const statistics = this.auditLogger.getAuditStatistics(filters);
            statistics.groupBy = groupBy;

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            console.error('获取审计统计失败:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 验证审计链
     */
    async validateAuditChain(req, res) {
        try {
            const validation = this.auditLogger.validateAuditChain();

            res.json({
                success: true,
                data: validation
            });
        } catch (error) {
            console.error('验证审计链失败:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 获取内部统计
     */
    async getInternalStats(req, res) {
        try {
            const stats = this.auditLogger.getInternalStats();

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('获取内部统计失败:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 刷新批量队列
     */
    async flushBatchQueue(req, res) {
        try {
            await this.auditLogger.flush();

            res.json({
                success: true,
                message: '批量队列已刷新'
            });
        } catch (error) {
            console.error('刷新批量队列失败:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 获取路由实例
     */
    getRouter() {
        return router;
    }
}

module.exports = AuditLoggingRoutes;