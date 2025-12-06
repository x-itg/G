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
            // SimplifiedDatabaseManager 会自动创建表文件（JSON文件），无需手动初始化
            // 确保表文件存在
            const tables = ['access_logs', 'access_statistics'];
            tables.forEach(table => {
                const logs = this.dbManager.getRecords(table);
                // 调用getRecords会自动创建表文件如果不存在
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
            // 使用 addRecord 方法保存到数据库
            await this.dbManager.addRecord('access_logs', logData);
            
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
            const logs = this.dbManager.getRecords('access_logs');
            const endDateTime = endDate + 'T23:59:59';
            
            // 过滤日期范围
            const filtered = logs.filter(log => 
                log.timestamp >= startDate && log.timestamp <= endDateTime
            );
            
            // 按日期分组统计
            const statsByDate = {};
            filtered.forEach(log => {
                const date = log.timestamp.split('T')[0];
                if (!statsByDate[date]) {
                    statsByDate[date] = {
                        date,
                        total_requests: 0,
                        response_times: [],
                        response_sizes: [],
                        unique_users: new Set(),
                        error_count: 0,
                        success_count: 0
                    };
                }
                statsByDate[date].total_requests++;
                statsByDate[date].response_times.push(log.response_time || 0);
                statsByDate[date].response_sizes.push(log.response_size || 0);
                if (log.user_id) statsByDate[date].unique_users.add(log.user_id);
                if (log.status_code >= 400) statsByDate[date].error_count++;
                else statsByDate[date].success_count++;
            });
            
            // 计算平均值
            return Object.values(statsByDate).map(stat => ({
                date: stat.date,
                total_requests: stat.total_requests,
                avg_response_time: stat.response_times.reduce((a, b) => a + b, 0) / stat.total_requests,
                avg_response_size: stat.response_sizes.reduce((a, b) => a + b, 0) / stat.total_requests,
                unique_users: stat.unique_users.size,
                error_count: stat.error_count,
                success_count: stat.success_count,
                success_rate: (stat.success_count / stat.total_requests) * 100,
                error_rate: (stat.error_count / stat.total_requests) * 100
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
            const logs = this.dbManager.getRecords('access_logs');
            
            // 过滤日期范围
            const filtered = logs.filter(log => 
                log.timestamp >= startDate && log.timestamp <= (endDate + 'T23:59:59')
            );
            
            // 按URL分组统计
            const statsByUrl = {};
            filtered.forEach(log => {
                if (!statsByUrl[log.url]) {
                    statsByUrl[log.url] = {
                        url: log.url,
                        visits: 0,
                        unique_visitors: new Set(),
                        response_times: [],
                        error_count: 0,
                        success_count: 0
                    };
                }
                statsByUrl[log.url].visits++;
                if (log.user_id) statsByUrl[log.url].unique_visitors.add(log.user_id);
                statsByUrl[log.url].response_times.push(log.response_time || 0);
                if (log.status_code >= 400) statsByUrl[log.url].error_count++;
                else statsByUrl[log.url].success_count++;
            });
            
            // 转换并排序
            const result = Object.values(statsByUrl)
                .map(stat => ({
                    url: stat.url,
                    visits: stat.visits,
                    unique_visitors: stat.unique_visitors.size,
                    avg_response_time: stat.response_times.reduce((a, b) => a + b, 0) / stat.visits,
                    error_count: stat.error_count,
                    success_count: stat.success_count,
                    success_rate: (stat.success_count / stat.visits) * 100,
                    error_rate: (stat.error_count / stat.visits) * 100,
                    popularity_score: stat.visits * 0.7 + stat.unique_visitors.size * 0.3
                }))
                .sort((a, b) => b.visits - a.visits)
                .slice(0, limit);
            
            return result;
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
            const logs = this.dbManager.getRecords('access_logs');
            
            // 过滤有用户ID的记录
            const filtered = logs.filter(log => log.user_id);
            
            // 按用户分组统计
            const statsByUser = {};
            filtered.forEach(log => {
                if (!statsByUser[log.user_id]) {
                    statsByUser[log.user_id] = {
                        user_id: log.user_id,
                        username: log.username,
                        total_visits: 0,
                        response_times: [],
                        timestamps: [],
                        dates: new Set()
                    };
                }
                statsByUser[log.user_id].total_visits++;
                statsByUser[log.user_id].response_times.push(log.response_time || 0);
                statsByUser[log.user_id].timestamps.push(log.timestamp);
                statsByUser[log.user_id].dates.add(log.timestamp.split('T')[0]);
            });
            
            // 转换并排序
            const result = Object.values(statsByUser)
                .map(stat => {
                    const timestamps = stat.timestamps.sort();
                    return {
                        user_id: stat.user_id,
                        username: stat.username,
                        total_visits: stat.total_visits,
                        avg_response_time: stat.response_times.reduce((a, b) => a + b, 0) / stat.total_visits,
                        first_visit: timestamps[0],
                        last_visit: timestamps[timestamps.length - 1],
                        active_days: stat.dates.size,
                        days_since_first_visit: this.daysBetween(timestamps[0], new Date().toISOString()),
                        days_since_last_visit: this.daysBetween(timestamps[timestamps.length - 1], new Date().toISOString())
                    };
                })
                .sort((a, b) => b.total_visits - a.total_visits)
                .slice(0, limit);
            
            return result;
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
            const logs = this.dbManager.getRecords('access_logs');
            
            // 过滤日期范围
            const filtered = logs.filter(log => 
                log.timestamp >= startDate && log.timestamp <= (endDate + 'T23:59:59')
            );
            
            // 按日期分组
            const statsByDate = {};
            filtered.forEach(log => {
                const date = log.timestamp.split('T')[0];
                if (!statsByDate[date]) {
                    statsByDate[date] = {
                        date,
                        users: new Set(),
                        authenticated_users: new Set(),
                        anonymous_ips: new Set(),
                        response_times: [],
                        total_requests: 0,
                        error_requests: 0,
                        success_requests: 0
                    };
                }
                if (log.user_id) {
                    statsByDate[date].users.add(log.user_id);
                    statsByDate[date].authenticated_users.add(log.user_id);
                } else {
                    statsByDate[date].anonymous_ips.add(log.ip_address);
                }
                statsByDate[date].response_times.push(log.response_time || 0);
                statsByDate[date].total_requests++;
                if (log.status_code >= 400) statsByDate[date].error_requests++;
                else statsByDate[date].success_requests++;
            });
            
            // 根据metric返回不同结果
            const result = Object.values(statsByDate).map(stat => {
                if (metric === 'users') {
                    return {
                        date: stat.date,
                        daily_users: stat.users.size,
                        authenticated_users: stat.authenticated_users.size,
                        anonymous_users: stat.anonymous_ips.size
                    };
                } else if (metric === 'response_time') {
                    const times = stat.response_times;
                    return {
                        date: stat.date,
                        avg_response_time: times.reduce((a, b) => a + b, 0) / times.length,
                        min_response_time: Math.min(...times),
                        max_response_time: Math.max(...times),
                        slow_requests: times.filter(t => t > 1000).length
                    };
                } else {
                    return {
                        date: stat.date,
                        total_requests: stat.total_requests,
                        error_requests: stat.error_requests,
                        success_requests: stat.success_requests
                    };
                }
            }).sort((a, b) => a.date.localeCompare(b.date));
            
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
            let logs = this.dbManager.getRecords('access_logs');
            
            // 应用过滤条件
            if (userId) {
                logs = logs.filter(log => log.user_id === userId);
            }
            
            if (startDate) {
                logs = logs.filter(log => log.timestamp >= startDate);
            }
            
            if (endDate) {
                logs = logs.filter(log => log.timestamp <= (endDate + 'T23:59:59'));
            }
            
            // 排序（最新的在前）
            logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            
            const total = logs.length;
            const offset = (page - 1) * limit;
            const paginatedData = logs.slice(offset, offset + limit);
            
            return {
                data: paginatedData,
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
            let logs = this.dbManager.getRecords('access_logs');
            
            const beforeCount = logs.length;
            // 保留cutoffDate之后的日志
            logs = logs.filter(log => log.timestamp >= cutoffDate);
            const afterCount = logs.length;
            const deletedCount = beforeCount - afterCount;
            
            // 写回过滤后的数据
            await this.dbManager.writeTable('access_logs', logs);
            
            console.log(`清理了${daysToKeep}天前的访问日志，删除了${deletedCount}条记录`);
            return { deletedCount, remainingCount: afterCount };
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