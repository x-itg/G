const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');

/**
 * 系统错误日志和异常处理系统
 * 为放射化学纯度检测仪提供全面的错误跟踪和管理功能
 */
class ErrorLogger {
    constructor(options = {}) {
        this.dbManager = options.dbManager || new SimplifiedDatabaseManager();
        this.logPath = options.logPath || path.join(__dirname, 'data');
        this.maxRetries = options.maxRetries || 3;
        this.notificationQueue = [];
        this.errorAggregation = new Map(); // 错误聚合
        this.statisticsCache = new Map();
        this.alertThresholds = options.alertThresholds || {
            errorRate: 10, // 每小时错误数
            criticalErrors: 5, // 关键错误数
            responseTime: 5000 // 响应时间阈值(ms)
        };
        
        this.ensureDirectories();
        this.initializeErrorLogger();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath, { recursive: true });
        }
        
        // 创建错误日志专用目录
        const errorDataPath = path.join(this.logPath, 'error-logs');
        if (!fs.existsSync(errorDataPath)) {
            fs.mkdirSync(errorDataPath, { recursive: true });
        }
    }

    initializeErrorLogger() {
        try {
            console.log('🔄 初始化系统错误日志系统...');
            
            // 初始化错误日志表
            this.createErrorLogTables();
            
            // 设置全局错误处理器
            this.setupGlobalErrorHandlers();
            
            // 设置异步错误捕获
            this.setupAsyncErrorHandlers();
            
            console.log('✅ 系统错误日志系统初始化完成');
        } catch (error) {
            console.error('❌ 错误日志系统初始化失败:', error);
            throw error;
        }
    }

    createErrorLogTables() {
        // 创建错误日志表
        const errorLogTable = [
            {
                id: 'TEXT PRIMARY KEY',
                timestamp: 'TEXT NOT NULL',
                level: 'TEXT NOT NULL',
                message: 'TEXT NOT NULL',
                stack: 'TEXT',
                context: 'TEXT',
                source: 'TEXT',
                code: 'TEXT',
                resolved: 'BOOLEAN DEFAULT FALSE',
                resolved_at: 'TEXT',
                resolved_by: 'TEXT',
                occurrence_count: 'INTEGER DEFAULT 1',
                first_occurrence: 'TEXT NOT NULL',
                last_occurrence: 'TEXT NOT NULL',
                user_id: 'TEXT',
                session_id: 'TEXT',
                ip_address: 'TEXT',
                user_agent: 'TEXT',
                url: 'TEXT',
                method: 'TEXT',
                metadata: 'TEXT',
                alert_sent: 'BOOLEAN DEFAULT FALSE',
                created_at: 'TEXT NOT NULL'
            }
        ];

        // 初始化错误日志数据文件
        const errorLogPath = path.join(this.logPath, 'error-logs', 'error_logs.json');
        if (!fs.existsSync(errorLogPath)) {
            fs.writeFileSync(errorLogPath, JSON.stringify([], null, 2));
        }

        // 创建错误统计表
        const errorStatsPath = path.join(this.logPath, 'error-logs', 'error_statistics.json');
        if (!fs.existsSync(errorStatsPath)) {
            fs.writeFileSync(errorStatsPath, JSON.stringify([], null, 2));
        }

        // 创建错误通知表
        const errorNotificationsPath = path.join(this.logPath, 'error-logs', 'error_notifications.json');
        if (!fs.existsSync(errorNotificationsPath)) {
            fs.writeFileSync(errorNotificationsPath, JSON.stringify([], null, 2));
        }
    }

    /**
     * 记录错误
     */
    async logError(errorData) {
        try {
            const errorId = crypto.randomUUID();
            const timestamp = new Date().toISOString();
            
            // 构建错误记录
            const errorRecord = {
                id: errorId,
                timestamp,
                level: errorData.level || 'error',
                message: errorData.message || 'Unknown error',
                stack: errorData.stack || this.extractStackTrace(),
                context: JSON.stringify(errorData.context || {}),
                source: errorData.source || 'system',
                code: errorData.code || 'UNKNOWN',
                resolved: false,
                occurrence_count: 1,
                first_occurrence: timestamp,
                last_occurrence: timestamp,
                user_id: errorData.context?.userId,
                session_id: errorData.context?.sessionId,
                ip_address: errorData.context?.ipAddress,
                user_agent: errorData.context?.userAgent,
                url: errorData.context?.url,
                method: errorData.context?.method,
                metadata: JSON.stringify(errorData.metadata || {}),
                alert_sent: false,
                created_at: timestamp
            };

            // 检查是否已存在相同错误（去重）
            const existingError = await this.findSimilarError(errorRecord);
            if (existingError) {
                return await this.updateExistingError(existingError.id, errorRecord);
            }

            // 保存错误记录
            await this.saveErrorRecord(errorRecord);
            
            // 更新错误聚合
            await this.updateErrorAggregation(errorRecord);
            
            // 检查是否需要发送告警
            await this.checkAlertConditions(errorRecord);
            
            // 触发实时通知
            await this.triggerRealtimeNotification(errorRecord);
            
            return errorId;
        } catch (logError) {
            console.error('记录错误日志失败:', logError);
            return null;
        }
    }

    /**
     * 查找相似错误（用于错误聚合）
     */
    async findSimilarError(newErrorRecord) {
        try {
            const errors = this.getErrorLogs();
            const similarThreshold = 0.8; // 相似度阈值
            
            for (const existingError of errors) {
                const similarity = this.calculateErrorSimilarity(newErrorRecord, existingError);
                if (similarity > similarThreshold) {
                    return existingError;
                }
            }
            return null;
        } catch (error) {
            console.error('查找相似错误失败:', error);
            return null;
        }
    }

    /**
     * 计算错误相似度
     */
    calculateErrorSimilarity(error1, error2) {
        let similarity = 0;
        let factors = 0;

        // 消息相似度
        if (error1.message && error2.message) {
            const messageSim = this.stringSimilarity(error1.message, error2.message);
            similarity += messageSim * 0.4;
            factors += 0.4;
        }

        // 代码相似度
        if (error1.code === error2.code) {
            similarity += 0.3;
            factors += 0.3;
        }

        // 源相似度
        if (error1.source === error2.source) {
            similarity += 0.2;
            factors += 0.2;
        }

        // 上下文相似度
        const context1 = JSON.parse(error1.context || '{}');
        const context2 = JSON.parse(error2.context || '{}');
        if (context1.url && context2.url && context1.url === context2.url) {
            similarity += 0.1;
            factors += 0.1;
        }

        return factors > 0 ? similarity / factors : 0;
    }

    /**
     * 字符串相似度计算（简单的编辑距离）
     */
    stringSimilarity(str1, str2) {
        if (str1 === str2) return 1;
        if (!str1 || !str2) return 0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Levenshtein距离计算
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * 更新现有错误记录
     */
    async updateExistingError(existingErrorId, newErrorRecord) {
        try {
            const errors = this.getErrorLogs();
            const errorIndex = errors.findIndex(e => e.id === existingErrorId);
            
            if (errorIndex !== -1) {
                const existingError = errors[errorIndex];
                
                // 更新出现次数和最后发生时间
                existingError.occurrence_count = (existingError.occurrence_count || 1) + 1;
                existingError.last_occurrence = newErrorRecord.timestamp;
                
                // 如果是更严重的级别，更新级别
                if (this.getErrorLevelPriority(newErrorRecord.level) > this.getErrorLevelPriority(existingError.level)) {
                    existingError.level = newErrorRecord.level;
                    existingError.message = newErrorRecord.message;
                    existingError.stack = newErrorRecord.stack;
                }
                
                // 保存更新后的记录
                await this.saveErrorRecords(errors);
                
                return existingErrorId;
            }
        } catch (error) {
            console.error('更新现有错误记录失败:', error);
        }
        
        // 如果更新失败，创建新记录
        return await this.saveErrorRecord(newErrorRecord);
    }

    /**
     * 获取错误级别优先级
     */
    getErrorLevelPriority(level) {
        const priorities = {
            'info': 0,
            'warning': 1,
            'error': 2,
            'critical': 3
        };
        return priorities[level] || 0;
    }

    /**
     * 保存错误记录
     */
    async saveErrorRecord(errorRecord) {
        try {
            const errorLogPath = path.join(this.logPath, 'error-logs', 'error_logs.json');
            const errors = this.getErrorLogs();
            errors.push(errorRecord);
            
            // 限制日志文件大小，保留最近10000条记录
            if (errors.length > 10000) {
                errors.splice(0, errors.length - 10000);
            }
            
            const content = JSON.stringify(errors, null, 2);
            await promisify(fs.writeFile)(errorLogPath, content, 'utf8');
            
            return errorRecord.id;
        } catch (error) {
            console.error('保存错误记录失败:', error);
            throw error;
        }
    }

    /**
     * 保存多个错误记录
     */
    async saveErrorRecords(errors) {
        try {
            const errorLogPath = path.join(this.logPath, 'error-logs', 'error_logs.json');
            const content = JSON.stringify(errors, null, 2);
            await promisify(fs.writeFile)(errorLogPath, content, 'utf8');
        } catch (error) {
            console.error('保存错误记录失败:', error);
            throw error;
        }
    }

    /**
     * 获取错误日志
     */
    getErrorLogs(filters = {}) {
        try {
            const errorLogPath = path.join(this.logPath, 'error-logs', 'error_logs.json');
            if (!fs.existsSync(errorLogPath)) {
                return [];
            }
            
            const content = fs.readFileSync(errorLogPath, 'utf8');
            if (!content || content.trim() === '') {
                return [];
            }
            
            let errors = JSON.parse(content);
            
            // 应用过滤器
            if (filters.level) {
                errors = errors.filter(error => error.level === filters.level);
            }
            if (filters.source) {
                errors = errors.filter(error => error.source === filters.source);
            }
            if (filters.resolved !== undefined) {
                errors = errors.filter(error => error.resolved === filters.resolved);
            }
            if (filters.startDate) {
                errors = errors.filter(error => error.timestamp >= filters.startDate);
            }
            if (filters.endDate) {
                errors = errors.filter(error => error.timestamp <= filters.endDate);
            }
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                errors = errors.filter(error => 
                    error.message.toLowerCase().includes(searchTerm) ||
                    error.stack?.toLowerCase().includes(searchTerm) ||
                    error.code?.toLowerCase().includes(searchTerm)
                );
            }
            
            // 排序
            errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // 限制结果数量
            if (filters.limit) {
                errors = errors.slice(0, filters.limit);
            }
            
            return errors;
        } catch (error) {
            console.error('获取错误日志失败:', error);
            return [];
        }
    }

    /**
     * 更新错误聚合
     */
    async updateErrorAggregation(errorRecord) {
        try {
            const aggregationKey = `${errorRecord.code}_${errorRecord.source}`;
            const existing = this.errorAggregation.get(aggregationKey);
            
            if (existing) {
                existing.count++;
                existing.lastOccurrence = errorRecord.timestamp;
                existing.level = this.getErrorLevelPriority(errorRecord.level) > 
                    this.getErrorLevelPriority(existing.level) ? errorRecord.level : existing.level;
            } else {
                this.errorAggregation.set(aggregationKey, {
                    key: aggregationKey,
                    code: errorRecord.code,
                    source: errorRecord.source,
                    message: errorRecord.message,
                    count: 1,
                    firstOccurrence: errorRecord.timestamp,
                    lastOccurrence: errorRecord.timestamp,
                    level: errorRecord.level
                });
            }
            
            // 清理过期的聚合数据（24小时前）
            this.cleanupExpiredAggregations();
            
        } catch (error) {
            console.error('更新错误聚合失败:', error);
        }
    }

    /**
     * 清理过期的聚合数据
     */
    cleanupExpiredAggregations() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        for (const [key, aggregation] of this.errorAggregation.entries()) {
            if (aggregation.lastOccurrence < oneDayAgo) {
                this.errorAggregation.delete(key);
            }
        }
    }

    /**
     * 检查告警条件
     */
    async checkAlertConditions(errorRecord) {
        try {
            const recentErrors = this.getRecentErrors(1); // 最近1小时的错误
            const recentCriticalErrors = recentErrors.filter(e => e.level === 'critical');
            const errorRate = recentErrors.length;
            
            let shouldAlert = false;
            let alertReason = '';
            
            if (errorRate > this.alertThresholds.errorRate) {
                shouldAlert = true;
                alertReason = `错误率过高: ${errorRate}/小时 (阈值: ${this.alertThresholds.errorRate})`;
            }
            
            if (recentCriticalErrors.length > this.alertThresholds.criticalErrors) {
                shouldAlert = true;
                alertReason = `关键错误过多: ${recentCriticalErrors.length} (阈值: ${this.alertThresholds.criticalErrors})`;
            }
            
            if (shouldAlert && !errorRecord.alert_sent) {
                await this.sendAlert(errorRecord, alertReason);
                errorRecord.alert_sent = true;
            }
            
        } catch (error) {
            console.error('检查告警条件失败:', error);
        }
    }

    /**
     * 获取最近的错误
     */
    getRecentErrors(hours = 1) {
        const oneHourAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        return this.getErrorLogs({ startDate: oneHourAgo });
    }

    /**
     * 发送告警
     */
    async sendAlert(errorRecord, reason) {
        try {
            const alert = {
                id: crypto.randomUUID(),
                error_id: errorRecord.id,
                timestamp: new Date().toISOString(),
                level: 'ALERT',
                reason: reason,
                error_message: errorRecord.message,
                error_code: errorRecord.code,
                source: errorRecord.source,
                occurrence_count: errorRecord.occurrence_count,
                status: 'SENT',
                channels: ['console', 'file'], // 可以扩展为邮件、短信等
                metadata: {
                    alert_type: 'threshold_exceeded',
                    threshold_breached: reason
                }
            };
            
            // 保存告警记录
            await this.saveNotification(alert);
            
            // 输出告警到控制台
            console.error(`🚨 系统告警: ${reason}`);
            console.error(`错误: ${errorRecord.message}`);
            console.error(`代码: ${errorRecord.code}`);
            console.error(`源: ${errorRecord.source}`);
            console.error(`发生次数: ${errorRecord.occurrence_count}`);
            
            return alert.id;
        } catch (error) {
            console.error('发送告警失败:', error);
        }
    }

    /**
     * 保存通知
     */
    async saveNotification(notification) {
        try {
            const notificationPath = path.join(this.logPath, 'error-logs', 'error_notifications.json');
            let notifications = [];
            
            if (fs.existsSync(notificationPath)) {
                const content = fs.readFileSync(notificationPath, 'utf8');
                if (content) {
                    notifications = JSON.parse(content);
                }
            }
            
            notifications.push(notification);
            
            // 限制通知记录数量
            if (notifications.length > 1000) {
                notifications.splice(0, notifications.length - 1000);
            }
            
            await promisify(fs.writeFile)(notificationPath, JSON.stringify(notifications, null, 2), 'utf8');
            
        } catch (error) {
            console.error('保存通知失败:', error);
        }
    }

    /**
     * 触发实时通知
     */
    async triggerRealtimeNotification(errorRecord) {
        try {
            this.notificationQueue.push({
                timestamp: new Date().toISOString(),
                type: 'error_occurred',
                data: errorRecord
            });
            
            // 限制队列大小
            if (this.notificationQueue.length > 100) {
                this.notificationQueue.splice(0, this.notificationQueue.length - 100);
            }
            
        } catch (error) {
            console.error('触发实时通知失败:', error);
        }
    }

    /**
     * 设置全局错误处理器
     */
    setupGlobalErrorHandlers() {
        // 捕获未处理的JavaScript错误
        process.on('uncaughtException', async (error) => {
            await this.logError({
                level: 'critical',
                message: `未捕获的异常: ${error.message}`,
                stack: error.stack,
                source: 'process',
                code: 'UNCAUGHT_EXCEPTION',
                context: {
                    processId: process.pid,
                    nodeVersion: process.version
                }
            });
        });

        // 捕获未处理的Promise拒绝
        process.on('unhandledRejection', async (reason, promise) => {
            await this.logError({
                level: 'error',
                message: `未处理的Promise拒绝: ${reason}`,
                stack: reason instanceof Error ? reason.stack : new Error(reason).stack,
                source: 'promise',
                code: 'UNHANDLED_REJECTION',
                context: {
                    promise: promise.toString(),
                    processId: process.pid
                }
            });
        });

        // 捕获警告
        process.on('warning', async (warning) => {
            await this.logError({
                level: 'warning',
                message: `进程警告: ${warning.name} - ${warning.message}`,
                stack: warning.stack,
                source: 'process_warning',
                code: warning.code || 'WARNING'
            });
        });
    }

    /**
     * 设置异步错误捕获
     */
    setupAsyncErrorHandlers() {
        // Express.js错误处理中间件
        this.expressErrorHandler = async (error, req, res, next) => {
            await this.logError({
                level: 'error',
                message: `API错误: ${error.message}`,
                stack: error.stack,
                source: 'api',
                code: error.code || 'API_ERROR',
                context: {
                    url: req.url,
                    method: req.method,
                    userId: req.user?.id,
                    sessionId: req.sessionID,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent'),
                    headers: req.headers
                },
                metadata: {
                    statusCode: res.statusCode,
                    headers: res.getHeaders()
                }
            });

            // 发送错误响应
            res.status(error.status || 500).json({
                error: {
                    message: error.message,
                    code: error.code || 'INTERNAL_ERROR',
                    timestamp: new Date().toISOString()
                }
            });
        };

        // HTTP请求错误拦截
        this.setupHttpErrorInterception();
    }

    /**
     * 设置HTTP错误拦截
     */
    setupHttpErrorInterception() {
        const originalEmit = process.emit;
        
        process.emit = function(name, data, ...args) {
            if (name === 'warning' && data && data.code === 'ECONNRESET') {
                // 记录网络连接错误
                require('../logging/errorLogger').getInstance().logError({
                    level: 'warning',
                    message: `网络连接重置: ${data.message}`,
                    source: 'network',
                    code: 'CONNECTION_RESET'
                });
            }
            
            return originalEmit.apply(process, [name, data, ...args]);
        };
    }

    /**
     * 提取堆栈跟踪
     */
    extractStackTrace() {
        try {
            const stack = new Error().stack;
            return stack;
        } catch (error) {
            return '无法获取堆栈跟踪';
        }
    }

    /**
     * 标记错误为已解决
     */
    async resolveError(errorId, resolvedBy, resolution = '') {
        try {
            const errors = this.getErrorLogs();
            const errorIndex = errors.findIndex(e => e.id === errorId);
            
            if (errorIndex !== -1) {
                errors[errorIndex].resolved = true;
                errors[errorIndex].resolved_at = new Date().toISOString();
                errors[errorIndex].resolved_by = resolvedBy;
                errors[errorIndex].resolution = resolution;
                
                await this.saveErrorRecords(errors);
                
                // 记录解决事件
                await this.logError({
                    level: 'info',
                    message: `错误已解决: ${errors[errorIndex].message}`,
                    source: 'resolution',
                    code: 'ERROR_RESOLVED',
                    context: {
                        resolvedErrorId: errorId,
                        resolvedBy,
                        resolution
                    }
                });
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('标记错误为已解决失败:', error);
            return false;
        }
    }

    /**
     * 获取错误统计
     */
    getErrorStatistics(filters = {}) {
        try {
            const errors = this.getErrorLogs(filters);
            const stats = {
                total: errors.length,
                by_level: {},
                by_source: {},
                by_code: {},
                resolved: errors.filter(e => e.resolved).length,
                unresolved: errors.filter(e => !e.resolved).length,
                recent_trend: this.calculateRecentTrend(errors),
                top_errors: this.getTopErrors(errors, 10),
                aggregation: Array.from(this.errorAggregation.values())
            };
            
            // 按级别统计
            errors.forEach(error => {
                stats.by_level[error.level] = (stats.by_level[error.level] || 0) + 1;
            });
            
            // 按源统计
            errors.forEach(error => {
                stats.by_source[error.source] = (stats.by_source[error.source] || 0) + 1;
            });
            
            // 按代码统计
            errors.forEach(error => {
                stats.by_code[error.code] = (stats.by_code[error.code] || 0) + 1;
            });
            
            return stats;
        } catch (error) {
            console.error('获取错误统计失败:', error);
            return null;
        }
    }

    /**
     * 计算最近趋势
     */
    calculateRecentTrend(errors) {
        const now = new Date();
        const trends = {};
        
        // 按小时分组
        for (let i = 0; i < 24; i++) {
            const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
            const hourKey = hour.toISOString().substr(0, 13); // YYYY-MM-DDTHH
            trends[hourKey] = 0;
        }
        
        // 统计每小时错误数
        errors.forEach(error => {
            const errorHour = error.timestamp.substr(0, 13);
            if (trends.hasOwnProperty(errorHour)) {
                trends[errorHour]++;
            }
        });
        
        return Object.entries(trends)
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => a.hour.localeCompare(b.hour));
    }

    /**
     * 获取顶级错误
     */
    getTopErrors(errors, limit = 10) {
        const errorCounts = {};
        
        errors.forEach(error => {
            const key = `${error.code}_${error.message}`;
            if (!errorCounts[key]) {
                errorCounts[key] = {
                    code: error.code,
                    message: error.message,
                    source: error.source,
                    count: 0,
                    lastOccurrence: error.timestamp,
                    level: error.level
                };
            }
            errorCounts[key].count++;
            if (error.timestamp > errorCounts[key].lastOccurrence) {
                errorCounts[key].lastOccurrence = error.timestamp;
            }
        });
        
        return Object.values(errorCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * 导出错误日志
     */
    exportErrorLogs(filters = {}, format = 'json') {
        try {
            const errors = this.getErrorLogs(filters);
            
            switch (format.toLowerCase()) {
                case 'json':
                    return JSON.stringify(errors, null, 2);
                    
                case 'csv':
                    return this.convertToCSV(errors);
                    
                case 'html':
                    return this.convertToHTML(errors);
                    
                default:
                    throw new Error(`不支持的导出格式: ${format}`);
            }
        } catch (error) {
            console.error('导出错误日志失败:', error);
            throw error;
        }
    }

    /**
     * 转换为CSV格式
     */
    convertToCSV(errors) {
        const headers = [
            'ID', '时间戳', '级别', '消息', '堆栈', '源', '代码', 
            '已解决', '用户ID', '会话ID', 'IP地址', 'URL', '方法'
        ];
        
        const csvRows = [headers.join(',')];
        
        errors.forEach(error => {
            const row = [
                error.id,
                error.timestamp,
                error.level,
                `"${error.message.replace(/"/g, '""')}"`,
                `"${(error.stack || '').replace(/"/g, '""')}"`,
                error.source,
                error.code,
                error.resolved ? '是' : '否',
                error.user_id || '',
                error.session_id || '',
                error.ip_address || '',
                error.url || '',
                error.method || ''
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }

    /**
     * 转换为HTML格式
     */
    convertToHTML(errors) {
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>错误日志报告</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .error { color: #d32f2f; }
                .warning { color: #f57c00; }
                .info { color: #1976d2; }
                .critical { color: #c62828; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>系统错误日志报告</h1>
            <p>生成时间: ${new Date().toISOString()}</p>
            <p>总记录数: ${errors.length}</p>
            
            <table>
                <thead>
                    <tr>
                        <th>时间戳</th>
                        <th>级别</th>
                        <th>消息</th>
                        <th>源</th>
                        <th>代码</th>
                        <th>已解决</th>
                        <th>URL</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        errors.forEach(error => {
            html += `
                <tr>
                    <td>${error.timestamp}</td>
                    <td class="${error.level}">${error.level}</td>
                    <td>${error.message}</td>
                    <td>${error.source}</td>
                    <td>${error.code}</td>
                    <td>${error.resolved ? '是' : '否'}</td>
                    <td>${error.url || ''}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        </body>
        </html>
        `;
        
        return html;
    }

    /**
     * 搜索错误日志
     */
    searchErrors(query, filters = {}) {
        try {
            const searchFilters = {
                ...filters,
                search: query
            };
            
            return this.getErrorLogs(searchFilters);
        } catch (error) {
            console.error('搜索错误日志失败:', error);
            return [];
        }
    }

    /**
     * 获取最近的错误通知
     */
    getRecentNotifications(limit = 50) {
        try {
            const notificationPath = path.join(this.logPath, 'error-logs', 'error_notifications.json');
            if (!fs.existsSync(notificationPath)) {
                return [];
            }
            
            const content = fs.readFileSync(notificationPath, 'utf8');
            if (!content) {
                return [];
            }
            
            let notifications = JSON.parse(content);
            notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return notifications.slice(0, limit);
        } catch (error) {
            console.error('获取最近通知失败:', error);
            return [];
        }
    }

    /**
     * 清理旧日志
     */
    async cleanupOldLogs(daysToKeep = 30) {
        try {
            const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
            const errors = this.getErrorLogs();
            
            const keptErrors = errors.filter(error => error.timestamp >= cutoffDate);
            const removedCount = errors.length - keptErrors.length;
            
            if (removedCount > 0) {
                await this.saveErrorRecords(keptErrors);
                console.log(`清理了 ${removedCount} 条过期错误日志`);
            }
            
            return removedCount;
        } catch (error) {
            console.error('清理旧日志失败:', error);
            return 0;
        }
    }

    // 单例模式
    static getInstance() {
        if (!ErrorLogger.instance) {
            ErrorLogger.instance = new ErrorLogger();
        }
        return ErrorLogger.instance;
    }
}

module.exports = ErrorLogger;