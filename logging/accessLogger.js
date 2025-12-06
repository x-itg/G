const express = require('express');
const path = require('path');
const fs = require('fs').promises;

class AccessLogger {
    constructor(dbManager, options = {}) {
        this.dbManager = dbManager;
        this.options = {
            logRetentionDays: options.logRetentionDays || 30,
            enableAnalytics: options.enableAnalytics !== false,
            enableRealTime: options.enableRealTime !== false,
            logLevel: options.logLevel || 'info',
            ...options
        };
        
        this.router = express.Router();
        this.accessLogs = new Map(); // 内存缓存用于实时统计
        this.requestStats = new Map(); // 请求统计缓存
        this.userStats = new Map(); // 用户统计缓存
        this.pathStats = new Map(); // 路径统计缓存
        
        this.setupDatabase();
        this.setupRoutes();
        this.startCleanupTask();
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 设置数据库表
     */
    async setupDatabase() {
        try {
            await this.dbManager.createTable('access_logs', {
                id: 'TEXT PRIMARY KEY',
                timestamp: 'TEXT NOT NULL',
                method: 'TEXT NOT NULL',
                url: 'TEXT NOT NULL',
                status_code: 'INTEGER NOT NULL',
                response_time: 'INTEGER',
                response_size: 'INTEGER',
                user_id: 'TEXT',
                username: 'TEXT',
                ip_address: 'TEXT',
                user_agent: 'TEXT',
                referer: 'TEXT',
                session_id: 'TEXT',
                request_id: 'TEXT NOT NULL',
                created_at: 'TEXT DEFAULT CURRENT_TIMESTAMP'
            });

            await this.dbManager.createTable('access_statistics', {
                id: 'TEXT PRIMARY KEY',
                date: 'TEXT NOT NULL',
                endpoint: 'TEXT',
                method: 'TEXT NOT NULL',
                total_requests: 'INTEGER DEFAULT 0',
                unique_users: 'INTEGER DEFAULT 0',
                avg_response_time: 'REAL DEFAULT 0',
                success_rate: 'REAL DEFAULT 0',
                created_at: 'TEXT DEFAULT CURRENT_TIMESTAMP'
            });

            console.log('访问日志数据库表设置完成');
        } catch (error) {
            console.error('访问日志数据库设置失败:', error);
        }
    }

    /**
     * Express中间件 - 记录访问日志
     */
    middleware() {
        return async (req, res, next) => {
            const startTime = Date.now();
            const requestId = this.generateId();
            
            // 扩展res对象，添加end方法拦截
            const originalEnd = res.end;
            const chunks = [];
            
            res.end = function(chunk, encoding) {
                if (chunk) {
                    chunks.push(Buffer.from(chunk, encoding));
                }
                
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                const responseSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                
                // 记录访问日志
                const logData = {
                    id: this.generateId(),
                    timestamp: new Date().toISOString(),
                    method: req.method,
                    url: req.url,
                    status_code: res.statusCode,
                    response_time: responseTime,
                    response_size: responseSize,
                    user_id: req.user?.id || null,
                    username: req.user?.username || null,
                    ip_address: this.getClientIP(req),
                    user_agent: req.get('User-Agent'),
                    referer: req.get('Referer'),
                    session_id: req.sessionID || req.get('X-Session-ID'),
                    request_id: requestId
                };

                // 异步记录日志
                this.logAccess(logData).catch(console.error);
                
                // 更新实时统计
                this.updateRealTimeStats(logData);
                
                // 调用原始end方法
                originalEnd.call(res, chunk, encoding);
            }.bind(this);
            
            // 添加请求ID到请求对象
            req.requestId = requestId;
            req.startTime = startTime;
            
            next();
        };
    }

    /**
     * 记录访问日志到数据库
     */
    async logAccess(logData) {
        try {
            // 保存到数据库
            await this.dbManager.insert('access_logs', logData);
            
            // 缓存到内存
            this.accessLogs.set(logData.id, logData);
            
            // 保持内存缓存大小限制
            if (this.accessLogs.size > 1000) {
                const oldestKey = this.accessLogs.keys().next().value;
                this.accessLogs.delete(oldestKey);
            }
        } catch (error) {
            console.error('记录访问日志失败:', error);
        }
    }

    /**
     * 更新实时统计
     */
    updateRealTimeStats(logData) {
        const { url, method, user_id, timestamp } = logData;
        const date = timestamp.split('T')[0];
        const hour = new Date(timestamp).getHours();
        
        // 请求统计
        const requestKey = `${method} ${url}`;
        if (!this.requestStats.has(requestKey)) {
            this.requestStats.set(requestKey, {
                count: 0,
                totalTime: 0,
                errors: 0,
                success: 0
            });
        }
        
        const requestStats = this.requestStats.get(requestKey);
        requestStats.count++;
        requestStats.totalTime += logData.response_time;
        if (logData.status_code >= 400) {
            requestStats.errors++;
        } else {
            requestStats.success++;
        }
        
        // 用户统计
        if (user_id) {
            const userKey = user_id;
            if (!this.userStats.has(userKey)) {
                this.userStats.set(userKey, {
                    username: logData.username,
                    visits: new Set(),
                    totalTime: 0,
                    lastVisit: null
                });
            }
            
            const userStat = this.userStats.get(userKey);
            userStat.visits.add(date);
            userStat.totalTime += logData.response_time;
            userStat.lastVisit = timestamp;
        }
        
        // 路径统计
        const pathKey = url.split('?')[0]; // 移除查询参数
        if (!this.pathStats.has(pathKey)) {
            this.pathStats.set(pathKey, {
                count: 0,
                uniqueUsers: new Set(),
                hourDistribution: new Array(24).fill(0),
                methods: new Set()
            });
        }
        
        const pathStat = this.pathStats.get(pathKey);
        pathStat.count++;
        pathStat.uniqueUsers.add(user_id || logData.ip_address);
        pathStat.hourDistribution[hour]++;
        pathStat.methods.add(method);
    }

    /**
     * 获取客户端IP地址
     */
    getClientIP(req) {
        return req.ip || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress ||
               req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] ||
               'unknown';
    }

    /**
     * 设置API路由
     */
    setupRoutes() {
        // 获取访问统计
        this.router.get('/statistics', async (req, res) => {
            try {
                const { startDate, endDate, period = 'day' } = req.query;
                
                const stats = await this.getAccessStatistics({
                    startDate: startDate || this.getDateDaysAgo(7),
                    endDate: endDate || new Date().toISOString().split('T')[0],
                    period
                });
                
                res.json({
                    success: true,
                    data: stats,
                    period,
                    generated_at: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取访问统计失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // 获取热门页面
        this.router.get('/popular', async (req, res) => {
            try {
                const { limit = 10, period = 'day' } = req.query;
                
                const popularPages = await this.getPopularPages(parseInt(limit), period);
                
                res.json({
                    success: true,
                    data: popularPages,
                    limit: parseInt(limit),
                    generated_at: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取热门页面失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // 获取用户访问统计
        this.router.get('/users', async (req, res) => {
            try {
                const { limit = 20 } = req.query;
                
                const userStats = await this.getUserStatistics(parseInt(limit));
                
                res.json({
                    success: true,
                    data: userStats,
                    limit: parseInt(limit),
                    generated_at: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取用户统计失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // 获取访问趋势
        this.router.get('/trends', async (req, res) => {
            try {
                const { days = 7, metric = 'requests' } = req.query;
                
                const trends = await this.getAccessTrends(parseInt(days), metric);
                
                res.json({
                    success: true,
                    data: trends,
                    days: parseInt(days),
                    metric,
                    generated_at: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取访问趋势失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // 清理旧日志
        this.router.post('/cleanup', async (req, res) => {
            try {
                const { daysToKeep } = req.body;
                const days = daysToKeep || this.options.logRetentionDays;
                
                const result = await this.cleanupOldLogs(days);
                
                res.json({
                    success: true,
                    message: `已清理${days}天前的访问日志`,
                    result,
                    cleaned_at: new Date().toISOString()
                });
            } catch (error) {
                console.error('清理日志失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // 获取实时统计
        this.router.get('/realtime', (req, res) => {
            try {
                const realtimeStats = this.getRealtimeStatistics();
                
                res.json({
                    success: true,
                    data: realtimeStats,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取实时统计失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // 获取访问详情
        this.router.get('/details', async (req, res) => {
            try {
                const { page = 1, limit = 50, userId, startDate, endDate } = req.query;
                
                const details = await this.getAccessDetails({
                    page: parseInt(page),
                    limit: parseInt(limit),
                    userId,
                    startDate,
                    endDate
                });
                
                res.json({
                    success: true,
                    data: details,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: details.total
                    },
                    generated_at: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取访问详情失败:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    /**
     * 获取访问统计
     */
    async getAccessStatistics({ startDate, endDate, period = 'day' }) {
        try {
            let query = `
                SELECT 
                    DATE(timestamp) as date,
                    method,
                    url,
                    COUNT(*) as total_requests,
                    AVG(response_time) as avg_response_time,
                    AVG(response_size) as avg_response_size,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
                    COUNT(CASE WHEN status_code < 400 THEN 1 END) as success_count
                FROM access_logs 
                WHERE timestamp BETWEEN ? AND ?
            `;
            
            const params = [startDate, endDate + 'T23:59:59'];
            
            const result = await this.dbManager.executeQuery(query, params);
            
            return result.map(row => ({
                ...row,
                success_rate: (row.success_count / row.total_requests) * 100,
                error_rate: (row.error_count / row.total_requests) * 100
            }));
        } catch (error) {
            console.error('获取访问统计失败:', error);
            return [];
        }
    }

    /**
     * 获取热门页面
     */
    async getPopularPages(limit = 10, period = 'day') {
        try {
            const startDate = this.getDateDaysAgo(period === 'hour' ? 1 : 7);
            const endDate = new Date().toISOString().split('T')[0];
            
            const query = `
                SELECT 
                    url,
                    COUNT(*) as visits,
                    COUNT(DISTINCT user_id) as unique_visitors,
                    AVG(response_time) as avg_response_time,
                    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
                    COUNT(CASE WHEN status_code < 400 THEN 1 END) as success_count
                FROM access_logs 
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY url
                ORDER BY visits DESC
                LIMIT ?
            `;
            
            const result = await this.dbManager.executeQuery(query, [
                startDate, 
                endDate + 'T23:59:59', 
                limit
            ]);
            
            return result.map(row => ({
                ...row,
                success_rate: (row.success_count / row.visits) * 100,
                error_rate: (row.error_count / row.visits) * 100,
                popularity_score: row.visits * 0.7 + row.unique_visitors * 0.3
            }));
        } catch (error) {
            console.error('获取热门页面失败:', error);
            return [];
        }
    }

    /**
     * 获取用户统计
     */
    async getUserStatistics(limit = 20) {
        try {
            const query = `
                SELECT 
                    user_id,
                    username,
                    COUNT(*) as total_visits,
                    AVG(response_time) as avg_response_time,
                    MIN(timestamp) as first_visit,
                    MAX(timestamp) as last_visit,
                    COUNT(DISTINCT DATE(timestamp)) as active_days
                FROM access_logs 
                WHERE user_id IS NOT NULL
                GROUP BY user_id, username
                ORDER BY total_visits DESC
                LIMIT ?
            `;
            
            const result = await this.dbManager.executeQuery(query, [limit]);
            
            return result.map(row => ({
                ...row,
                days_since_first_visit: this.daysBetween(row.first_visit, new Date().toISOString()),
                days_since_last_visit: this.daysBetween(row.last_visit, new Date().toISOString())
            }));
        } catch (error) {
            console.error('获取用户统计失败:', error);
            return [];
        }
    }

    /**
     * 获取访问趋势
     */
    async getAccessTrends(days = 7, metric = 'requests') {
        try {
            const startDate = this.getDateDaysAgo(days);
            const endDate = new Date().toISOString().split('T')[0];
            
            let query;
            let orderBy;
            
            if (metric === 'users') {
                query = `
                    SELECT 
                        DATE(timestamp) as date,
                        COUNT(DISTINCT user_id) as daily_users,
                        COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END) as authenticated_users,
                        COUNT(DISTINCT CASE WHEN user_id IS NULL THEN ip_address END) as anonymous_users
                    FROM access_logs 
                    WHERE timestamp BETWEEN ? AND ?
                    GROUP BY DATE(timestamp)
                    ORDER BY date
                `;
            } else if (metric === 'response_time') {
                query = `
                    SELECT 
                        DATE(timestamp) as date,
                        AVG(response_time) as avg_response_time,
                        MIN(response_time) as min_response_time,
                        MAX(response_time) as max_response_time,
                        COUNT(CASE WHEN response_time > 1000 THEN 1 END) as slow_requests
                    FROM access_logs 
                    WHERE timestamp BETWEEN ? AND ?
                    GROUP BY DATE(timestamp)
                    ORDER BY date
                `;
            } else {
                query = `
                    SELECT 
                        DATE(timestamp) as date,
                        COUNT(*) as total_requests,
                        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_requests,
                        COUNT(CASE WHEN status_code < 400 THEN 1 END) as success_requests
                    FROM access_logs 
                    WHERE timestamp BETWEEN ? AND ?
                    GROUP BY DATE(timestamp)
                    ORDER BY date
                `;
            }
            
            const result = await this.dbManager.executeQuery(query, [
                startDate, 
                endDate + 'T23:59:59'
            ]);
            
            return result;
        } catch (error) {
            console.error('获取访问趋势失败:', error);
            return [];
        }
    }

    /**
     * 获取实时统计
     */
    getRealtimeStatistics() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // 从内存缓存计算实时统计
        let todayRequests = 0;
        let todayErrors = 0;
        let todayUniqueUsers = new Set();
        
        for (const log of this.accessLogs.values()) {
            if (log.timestamp.startsWith(today)) {
                todayRequests++;
                if (log.status_code >= 400) {
                    todayErrors++;
                }
                if (log.user_id) {
                    todayUniqueUsers.add(log.user_id);
                }
            }
        }
        
        // 活跃用户统计
        const activeUsers = [];
        for (const [userId, userStat] of this.userStats) {
            const lastVisitDate = userStat.lastVisit ? 
                userStat.lastVisit.split('T')[0] : null;
            if (lastVisitDate === today) {
                activeUsers.push({
                    user_id: userId,
                    username: userStat.username,
                    visit_count: userStat.visits.size,
                    total_time: userStat.totalTime
                });
            }
        }
        
        // 最受欢迎的页面
        const popularPages = Array.from(this.pathStats.entries())
            .map(([path, stats]) => ({
                path,
                visits: stats.count,
                unique_users: stats.uniqueUsers.size,
                methods: Array.from(stats.methods)
            }))
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 10);
        
        return {
            today: {
                total_requests: todayRequests,
                error_requests: todayErrors,
                success_requests: todayRequests - todayErrors,
                unique_users: todayUniqueUsers.size,
                error_rate: todayRequests > 0 ? (todayErrors / todayRequests) * 100 : 0
            },
            active_users: activeUsers,
            popular_pages: popularPages,
            system_load: {
                memory_usage: process.memoryUsage(),
                uptime: process.uptime(),
                timestamp: now.toISOString()
            }
        };
    }

    /**
     * 获取访问详情
     */
    async getAccessDetails({ page = 1, limit = 50, userId, startDate, endDate }) {
        try {
            let whereConditions = [];
            let params = [];
            
            if (userId) {
                whereConditions.push('user_id = ?');
                params.push(userId);
            }
            
            if (startDate) {
                whereConditions.push('timestamp >= ?');
                params.push(startDate);
            }
            
            if (endDate) {
                whereConditions.push('timestamp <= ?');
                params.push(endDate + 'T23:59:59');
            }
            
            const whereClause = whereConditions.length > 0 ? 
                'WHERE ' + whereConditions.join(' AND ') : '';
            
            const offset = (page - 1) * limit;
            params.push(limit, offset);
            
            // 获取总数
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM access_logs ${whereClause}
            `;
            const countResult = await this.dbManager.executeQuery(countQuery, params.slice(0, -2));
            const total = countResult[0].total;
            
            // 获取分页数据
            const dataQuery = `
                SELECT *
                FROM access_logs 
                ${whereClause}
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            `;
            
            const result = await this.dbManager.executeQuery(dataQuery, params);
            
            return {
                data: result,
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error('获取访问详情失败:', error);
            return {
                data: [],
                total: 0,
                page,
                limit,
                total_pages: 0
            };
        }
    }

    /**
     * 清理旧日志
     */
    async cleanupOldLogs(daysToKeep) {
        try {
            const cutoffDate = this.getDateDaysAgo(daysToKeep);
            
            const query = `
                DELETE FROM access_logs 
                WHERE timestamp < ?
            `;
            
            const result = await this.dbManager.executeQuery(query, [cutoffDate]);
            
            console.log(`清理了${daysToKeep}天前的访问日志`);
            return result;
        } catch (error) {
            console.error('清理旧日志失败:', error);
            throw error;
        }
    }

    /**
     * 启动清理任务
     */
    startCleanupTask() {
        // 每天凌晨2点清理旧日志
        setInterval(async () => {
            try {
                await this.cleanupOldLogs(this.options.logRetentionDays);
            } catch (error) {
                console.error('定时清理任务失败:', error);
            }
        }, 24 * 60 * 60 * 1000); // 24小时
        
        console.log('访问日志清理任务已启动');
    }

    /**
     * 工具方法：获取N天前的日期
     */
    getDateDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }

    /**
     * 工具方法：计算天数差
     */
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * 导出路由
     */
    getRoutes() {
        return this.router;
    }

    /**
     * 导出中间件
     */
    getMiddleware() {
        return this.middleware();
    }
}

module.exports = AccessLogger;