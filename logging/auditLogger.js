const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * 用户操作审计日志系统
 * 为放射化学纯度检测仪提供完整的用户操作审计追踪功能
 * CFR 21 Part 11 兼容的审计日志记录和查询系统
 */
class AuditLogger {
    constructor(dbManager, options = {}) {
        this.dbManager = dbManager;
        this.options = {
            batchSize: options.batchSize || 50,
            batchTimeout: options.batchTimeout || 5000, // 5秒
            enableHashChain: options.enableHashChain !== false,
            logLevel: options.logLevel || 'INFO',
            enableRealTimeLogging: options.enableRealTimeLogging !== false,
            ...options
        };
        
        // 批量写入队列
        this.batchQueue = [];
        this.batchTimer = null;
        this.isProcessingBatch = false;
        
        // 审计链哈希
        this.lastAuditHash = null;
        
        // 审计日志统计
        this.stats = {
            totalLogs: 0,
            successfulLogs: 0,
            failedLogs: 0,
            lastBatchTime: null,
            batchCount: 0
        };
        
        this.initializeAuditChain();
    }

    /**
     * 初始化审计链
     */
    async initializeAuditChain() {
        if (!this.options.enableHashChain) return;
        
        try {
            const lastAudit = this.dbManager.getAuditEvents({ limit: 1 });
            if (lastAudit.length > 0) {
                this.lastAuditHash = this.calculateRecordHash(lastAudit[0]);
            }
        } catch (error) {
            console.warn('初始化审计链失败:', error.message);
        }
    }

    /**
     * 记录用户操作审计日志
     * @param {Object} auditData 审计数据
     * @returns {Promise<string>} 审计记录ID
     */
    async log(auditData) {
        try {
            // 验证和清理审计数据
            const validatedData = this.validateAuditData(auditData);
            
            // 计算审计哈希链
            if (this.options.enableHashChain) {
                validatedData.previous_hash = this.lastAuditHash;
                validatedData.current_hash = this.calculateRecordHash(validatedData);
                this.lastAuditHash = validatedData.current_hash;
            }
            
            // 添加到批量队列
            if (this.options.enableRealTimeLogging) {
                this.addToBatchQueue(validatedData);
            } else {
                await this.processBatch([validatedData]);
            }
            
            this.stats.totalLogs++;
            this.stats.successfulLogs++;
            
            return validatedData.id || validatedData.audit_id;
        } catch (error) {
            this.stats.failedLogs++;
            console.error('记录审计日志失败:', error);
            throw error;
        }
    }

    /**
     * 验证审计数据
     * @private
     */
    validateAuditData(auditData) {
        const validated = {
            id: auditData.id || crypto.randomUUID(),
            user_id: auditData.user_id || auditData.userId,
            username: auditData.username,
            action: auditData.action,
            resource: auditData.resource,
            resource_id: auditData.resource_id || auditData.resourceId,
            timestamp: auditData.timestamp || new Date().toISOString(),
            ip_address: auditData.ip_address || auditData.ipAddress,
            user_agent: auditData.user_agent || auditData.userAgent,
            details: auditData.details,
            result: auditData.result || 'success',
            severity: auditData.severity || this.determineSeverity(auditData.action),
            session_id: auditData.session_id || auditData.sessionId,
            tags: auditData.tags || [],
            old_values: auditData.old_values ? JSON.stringify(auditData.old_values) : null,
            new_values: auditData.new_values ? JSON.stringify(auditData.new_values) : null,
            previous_hash: auditData.previous_hash,
            current_hash: auditData.current_hash
        };

        // 验证必需字段
        if (!validated.username) {
            throw new Error('用户名是必需的');
        }
        if (!validated.action) {
            throw new Error('操作类型是必需的');
        }

        return validated;
    }

    /**
     * 确定严重性级别
     * @private
     */
    determineSeverity(action) {
        const highSeverityActions = [
            'DELETE', 'FAILED_LOGIN', 'ACCOUNT_LOCKED', 'UNAUTHORIZED_ACCESS',
            'SYSTEM_CONFIG_CHANGE', 'USER_ROLE_CHANGE', 'BULK_DELETE'
        ];
        
        const mediumSeverityActions = [
            'UPDATE', 'LOGOUT', 'EXPORT', 'IMPORT', 'PASSWORD_CHANGE'
        ];
        
        if (highSeverityActions.includes(action)) {
            return 'error';
        } else if (mediumSeverityActions.includes(action)) {
            return 'warning';
        } else {
            return 'info';
        }
    }

    /**
     * 计算记录哈希
     * @private
     */
    calculateRecordHash(record) {
        const content = JSON.stringify({
            id: record.id,
            user_id: record.user_id,
            action: record.action,
            resource: record.resource,
            timestamp: record.timestamp,
            previous_hash: record.previous_hash
        });
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * 添加到批量队列
     * @private
     */
    addToBatchQueue(auditData) {
        this.batchQueue.push(auditData);
        
        // 设置批量处理定时器
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => {
                this.processBatch();
            }, this.options.batchTimeout);
        }
        
        // 如果队列达到批量大小，立即处理
        if (this.batchQueue.length >= this.options.batchSize) {
            this.processBatch();
        }
    }

    /**
     * 处理批量写入
     * @private
     */
    async processBatch(forceBatch = null) {
        if (this.isProcessingBatch) return;
        
        const batch = forceBatch || this.batchQueue.splice(0, this.options.batchSize);
        if (batch.length === 0) return;
        
        this.isProcessingBatch = true;
        
        try {
            // 清除定时器
            if (this.batchTimer) {
                clearTimeout(this.batchTimer);
                this.batchTimer = null;
            }
            
            // 批量写入数据库
            for (const auditData of batch) {
                await this.dbManager.logAuditEvent(auditData);
            }
            
            this.stats.batchCount++;
            this.stats.lastBatchTime = new Date().toISOString();
            
            console.log(`批量写入 ${batch.length} 条审计记录完成`);
        } catch (error) {
            console.error('批量写入审计记录失败:', error);
            // 将失败的记录重新放回队列
            this.batchQueue.unshift(...batch);
        } finally {
            this.isProcessingBatch = false;
        }
    }

    /**
     * 强制刷新批量队列
     */
    async flush() {
        await this.processBatch();
    }

    /**
     * 获取审计日志
     * @param {Object} filters 过滤条件
     * @returns {Array} 审计记录列表
     */
    getAuditLogs(filters = {}) {
        let events = this.dbManager.getAuditEvents(filters);
        
        // 应用额外的过滤条件
        if (filters.severity) {
            events = events.filter(event => event.severity === filters.severity);
        }
        
        if (filters.action_type) {
            events = events.filter(event => event.action === filters.action_type);
        }
        
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            events = events.filter(event => 
                event.username.toLowerCase().includes(searchTerm) ||
                event.action.toLowerCase().includes(searchTerm) ||
                event.resource.toLowerCase().includes(searchTerm) ||
                (event.details && event.details.toLowerCase().includes(searchTerm))
            );
        }
        
        if (filters.tags && filters.tags.length > 0) {
            events = events.filter(event => {
                if (!event.tags) return false;
                return filters.tags.some(tag => event.tags.includes(tag));
            });
        }
        
        // 排序
        if (filters.sortBy) {
            events.sort((a, b) => {
                const aVal = a[filters.sortBy];
                const bVal = b[filters.sortBy];
                if (filters.sortOrder === 'ASC') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
        } else {
            // 默认按时间倒序
            events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        
        // 分页
        if (filters.page && filters.pageSize) {
            const startIndex = (filters.page - 1) * filters.pageSize;
            const endIndex = startIndex + filters.pageSize;
            events = events.slice(startIndex, endIndex);
        }
        
        return events;
    }

    /**
     * 获取审计统计信息
     * @param {Object} filters 时间范围过滤
     * @returns {Object} 统计信息
     */
    getAuditStatistics(filters = {}) {
        const events = this.dbManager.getAuditEvents(filters);
        
        const stats = {
            totalEvents: events.length,
            timeRange: {
                start: filters.startDate || 'beginning',
                end: filters.endDate || new Date().toISOString()
            },
            byAction: {},
            byUser: {},
            bySeverity: {},
            byResult: {},
            byHour: {},
            byDay: {}
        };
        
        events.forEach(event => {
            // 按操作类型统计
            stats.byAction[event.action] = (stats.byAction[event.action] || 0) + 1;
            
            // 按用户统计
            stats.byUser[event.username] = (stats.byUser[event.username] || 0) + 1;
            
            // 按严重性统计
            stats.bySeverity[event.severity] = (stats.bySeverity[event.severity] || 0) + 1;
            
            // 按结果统计
            stats.byResult[event.result] = (stats.byResult[event.result] || 0) + 1;
            
            // 按小时统计
            const hour = new Date(event.timestamp).getHours();
            stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
            
            // 按日期统计
            const day = new Date(event.timestamp).toISOString().split('T')[0];
            stats.byDay[day] = (stats.byDay[day] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * 导出审计日志
     * @param {Object} filters 过滤条件
     * @returns {string} 导出的JSON数据
     */
    exportAuditLogs(filters = {}) {
        const events = this.getAuditLogs({ ...filters, page: null, pageSize: null });
        
        const exportData = {
            exportedAt: new Date().toISOString(),
            exportFilters: filters,
            totalRecords: events.length,
            statistics: this.getAuditStatistics(filters),
            auditTrail: events.map(event => ({
                ...event,
                old_values: event.old_values ? JSON.parse(event.old_values) : null,
                new_values: event.new_values ? JSON.parse(event.new_values) : null
            }))
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 清理旧审计日志
     * @param {Object} options 清理选项
     * @returns {Object} 清理结果
     */
    cleanupAuditLogs(options = {}) {
        const {
            olderThanDays = 365,
            keepMinCount = 1000,
            severity = null,
            dryRun = true
        } = options;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        
        let events = this.dbManager.getAuditEvents({ 
            endDate: cutoffDate.toISOString() 
        });
        
        // 按严重性过滤
        if (severity) {
            events = events.filter(event => event.severity !== severity);
        }
        
        // 确保保留最小数量
        const totalEvents = this.dbManager.getAuditEvents({}).length;
        if (totalEvents - events.length < keepMinCount) {
            const needToKeep = keepMinCount - (totalEvents - events.length);
            events = events.slice(needToKeep);
        }
        
        const result = {
            dryRun,
            cutoffDate: cutoffDate.toISOString(),
            candidatesForDeletion: events.length,
            wouldBeDeleted: events.map(event => event.id),
            totalEvents,
            newTotalAfterCleanup: totalEvents - events.length
        };
        
        if (!dryRun && events.length > 0) {
            // 实际删除逻辑（简化实现）
            // 在实际应用中，您可能需要实现更复杂的删除逻辑
            console.log(`将删除 ${events.length} 条审计记录`);
        }
        
        return result;
    }

    /**
     * 验证审计链完整性
     * @returns {Object} 验证结果
     */
    validateAuditChain() {
        try {
            const events = this.dbManager.getAuditEvents({ limit: null });
            let isValid = true;
            const errors = [];
            let previousHash = null;
            
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                
                if (event.previous_hash !== previousHash) {
                    isValid = false;
                    errors.push(`事件 ${event.id} 的前一个哈希不匹配`);
                }
                
                const expectedHash = this.calculateRecordHash(event);
                if (event.current_hash !== expectedHash) {
                    isValid = false;
                    errors.push(`事件 ${event.id} 的哈希值不匹配`);
                }
                
                previousHash = event.current_hash;
            }
            
            return {
                isValid,
                totalRecords: events.length,
                errors,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                isValid: false,
                totalRecords: 0,
                errors: [error.message],
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 获取审计日志统计信息
     * @returns {Object} 内部统计
     */
    getInternalStats() {
        return {
            ...this.stats,
            batchQueueSize: this.batchQueue.length,
            isProcessingBatch: this.isProcessingBatch,
            lastAuditHash: this.lastAuditHash,
            options: this.options
        };
    }

    /**
     * 关闭审计日志器
     */
    async close() {
        // 刷新剩余的批量队列
        await this.flush();
        
        // 清除定时器
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        
        console.log('审计日志器已关闭');
    }
}

/**
 * Express中间件 - 自动记录HTTP请求
 */
function createAuditMiddleware(auditLogger, options = {}) {
    const {
        includeRequestBody = false,
        includeResponseBody = false,
        excludePaths = ['/api/logging/audit', '/health', '/favicon.ico'],
        sensitiveFields = ['password', 'token', 'secret', 'key']
    } = options;

    return (req, res, next) => {
        // 跳过排除的路径
        if (excludePaths.some(path => req.path.includes(path))) {
            return next();
        }

        const startTime = Date.now();
        const originalSend = res.send;
        
        // 拦截响应
        res.send = function(data) {
            const duration = Date.now() - startTime;
            
            // 记录审计日志
            setImmediate(async () => {
                try {
                    await auditLogger.log({
                        user_id: req.user?.id,
                        username: req.user?.username || 'anonymous',
                        action: `${req.method}_${req.path}`,
                        resource: 'http_request',
                        resource_id: `${req.method}_${req.path}`,
                        timestamp: new Date(startTime).toISOString(),
                        ip_address: req.ip || req.connection.remoteAddress,
                        user_agent: req.get('User-Agent'),
                        details: JSON.stringify({
                            method: req.method,
                            path: req.path,
                            query: req.query,
                            duration: duration,
                            statusCode: res.statusCode,
                            userId: req.user?.id
                        }),
                        result: res.statusCode < 400 ? 'success' : 'failure',
                        severity: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warning' : 'info',
                        session_id: req.sessionID,
                        tags: ['http', 'auto_logged']
                    });
                } catch (error) {
                    console.error('自动记录审计日志失败:', error);
                }
            });
            
            return originalSend.call(this, data);
        };
        
        next();
    };
}

/**
 * 手动记录装饰器 - 为关键操作自动添加审计日志
 */
function auditOperation(auditLogger, operationOptions = {}) {
    return function(target, propertyName, descriptor) {
        const method = descriptor.value;
        
        descriptor.value = async function(...args) {
            const startTime = Date.now();
            let result;
            let error = null;
            
            try {
                result = await method.apply(this, args);
                return result;
            } catch (err) {
                error = err;
                throw err;
            } finally {
                // 记录审计日志
                setImmediate(async () => {
                    try {
                        await auditLogger.log({
                            user_id: this.user?.id,
                            username: this.user?.username || 'system',
                            action: operationOptions.action || `${propertyName}_operation`,
                            resource: operationOptions.resource || target.constructor.name,
                            resource_id: operationOptions.resourceId || (result?.id || 'unknown'),
                            timestamp: new Date(startTime).toISOString(),
                            details: JSON.stringify({
                                method: propertyName,
                                args: args.length,
                                duration: Date.now() - startTime,
                                hasError: !!error
                            }),
                            result: error ? 'failure' : 'success',
                            severity: error ? 'error' : 'info',
                            tags: operationOptions.tags || ['operation', 'decorator']
                        });
                    } catch (auditError) {
                        console.error('装饰器审计日志记录失败:', auditError);
                    }
                });
            }
        };
        
        return descriptor;
    };
}

module.exports = {
    AuditLogger,
    createAuditMiddleware,
    auditOperation
};