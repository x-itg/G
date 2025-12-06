const crypto = require('crypto');

class AuditTrailService {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }

    /**
     * 记录审计操作（CFR 21 Part 11要求）
     * @param {string} action 操作类型
     * @param {string} entityType 实体类型
     * @param {string} entityId 实体ID
     * @param {Object} oldValues 变更前数据
     * @param {Object} newValues 变更后数据
     * @param {string} userId 用户ID
     * @param {string} reason 签名原因
     * @param {string} comment 注释
     * @param {string} ipAddress IP地址
     * @param {string} userAgent 用户代理
     * @returns {Promise<string>} 审计记录ID
     */
    async logAction(
        action,
        entityType,
        entityId,
        oldValues = {},
        newValues = {},
        userId = null,
        reason = 'OPERATION',
        comment = '',
        ipAddress = null,
        userAgent = null
    ) {
        try {
            // 确保审计追踪是安全的
            const auditData = {
                action: this.validateActionType(action),
                entityType: this.validateEntityType(entityType),
                entityId: this.validateEntityId(entityId),
                oldValues: this.sanitizeData(oldValues),
                newValues: this.sanitizeData(newValues),
                signedBy: userId,
                signatureReason: reason,
                signatureComment: comment,
                ipAddress: ipAddress || this.getCurrentIP(),
                userAgent: userAgent || this.getCurrentUserAgent()
            };

            // 创建审计记录（包含哈希链）
            const auditId = await this.createAuditRecord(auditData);
            
            console.log(`审计记录已创建: ${auditId} - ${action} on ${entityType}:${entityId}`);
            
            return auditId;
        } catch (error) {
            console.error('创建审计记录失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取审计日志
     * @param {Object} filters 过滤条件
     * @returns {Promise<Array>} 审计记录列表
     */
    async getLogs(filters = {}) {
        try {
            let query = `
                SELECT 
                    at.*,
                    u.username as signed_by_username,
                    u.full_name as signed_by_name
                FROM audit_trail at
                LEFT JOIN users u ON at.signed_by = u.id
                WHERE 1=1
            `;
            
            const params = [];
            const conditions = [];

            // 按操作类型过滤
            if (filters.action) {
                conditions.push('at.action = ?');
                params.push(filters.action);
            }

            // 按实体类型过滤
            if (filters.entityType) {
                conditions.push('at.entity_type = ?');
                params.push(filters.entityType);
            }

            // 按实体ID过滤
            if (filters.entityId) {
                conditions.push('at.entity_id = ?');
                params.push(filters.entityId);
            }

            // 按用户过滤
            if (filters.userId) {
                conditions.push('at.signed_by = ?');
                params.push(filters.userId);
            }

            // 按时间范围过滤
            if (filters.startDate) {
                conditions.push('at.timestamp >= ?');
                params.push(filters.startDate);
            }

            if (filters.endDate) {
                conditions.push('at.timestamp <= ?');
                params.push(filters.endDate);
            }

            // 添加条件
            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }

            // 排序
            query += ' ORDER BY at.timestamp DESC';

            // 限制结果数量
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            const logs = await this.dbManager.allQuery(query, params);
            
            // 解析JSON字段
            return logs.map(log => ({
                ...log,
                old_values: log.old_values ? JSON.parse(log.old_values) : {},
                new_values: log.new_values ? JSON.parse(log.new_values) : {},
                changes: this.calculateChanges(log.old_values, log.new_values)
            }));
        } catch (error) {
            console.error('获取审计日志失败:', error.message);
            throw error;
        }
    }

    /**
     * 验证审计链完整性
     * @returns {Promise<Object>} 验证结果
     */
    async validateAuditChain() {
        try {
            const allLogs = await this.dbManager.allQuery(`
                SELECT id, action, entity_type, entity_id, timestamp, previous_hash, current_hash
                FROM audit_trail 
                ORDER BY timestamp ASC
            `);

            let isValid = true;
            const errors = [];
            let previousHash = null;

            for (let i = 0; i < allLogs.length; i++) {
                const log = allLogs[i];
                
                // 验证哈希链
                if (log.previous_hash !== previousHash) {
                    isValid = false;
                    errors.push(`审计记录 ${log.id} 的前一个哈希不匹配`);
                }

                // 重新计算当前哈希
                const expectedHash = this.calculateHash({
                    id: log.id,
                    action: log.action,
                    entityType: log.entity_type,
                    entityId: log.entity_id,
                    timestamp: log.timestamp,
                    previousHash: log.previous_hash
                });

                if (log.current_hash !== expectedHash) {
                    isValid = false;
                    errors.push(`审计记录 ${log.id} 的哈希值不匹配`);
                }

                previousHash = log.current_hash;
            }

            return {
                isValid,
                totalRecords: allLogs.length,
                errors: errors,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('验证审计链失败:', error.message);
            return {
                isValid: false,
                totalRecords: 0,
                errors: [error.message],
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 导出审计日志
     * @param {Object} filters 过滤条件
     * @returns {Promise<string>} 导出的数据
     */
    async exportLogs(filters = {}) {
        try {
            const logs = await this.getLogs({ ...filters, limit: null });
            
            // 使用Promise.all来处理map中的异步操作
            const auditTrail = await Promise.all(logs.map(async log => ({
                id: log.id,
                action: log.action,
                entityType: log.entity_type,
                entityId: log.entity_id,
                userId: log.signed_by,
                userName: log.signed_by_name,
                timestamp: log.timestamp,
                changes: log.changes,
                reason: log.signature_reason,
                comment: log.signature_comment,
                ipAddress: log.ip_address,
                hash: log.current_hash,
                chainValidated: await this.validateRecordHash(log)
            })));

            const exportData = {
                exportedAt: new Date().toISOString(),
                exportFilters: filters,
                totalRecords: logs.length,
                auditTrail: auditTrail
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('导出审计日志失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取特定实体的审计历史
     * @param {string} entityType 实体类型
     * @param {string} entityId 实体ID
     * @returns {Promise<Array>} 审计历史
     */
    async getEntityHistory(entityType, entityId) {
        return await this.getLogs({
            entityType,
            entityId,
            orderBy: 'timestamp ASC'
        });
    }

    /**
     * 获取用户操作历史
     * @param {string} userId 用户ID
     * @param {Object} options 选项
     * @returns {Promise<Array>} 用户操作历史
     */
    async getUserHistory(userId, options = {}) {
        const filters = {
            userId,
            limit: options.limit || 100
        };

        if (options.startDate) filters.startDate = options.startDate;
        if (options.endDate) filters.endDate = options.endDate;
        if (options.action) filters.action = options.action;

        return await this.getLogs(filters);
    }

    /**
     * 生成审计报告
     * @param {Object} parameters 报告参数
     * @returns {Promise<Object>} 审计报告
     */
    async generateAuditReport(parameters = {}) {
        try {
            const {
                startDate,
                endDate,
                entityType,
                userId,
                actions
            } = parameters;

            const filters = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (entityType) filters.entityType = entityType;
            if (userId) filters.userId = userId;
            if (actions) filters.action = actions;

            const logs = await this.getLogs(filters);
            
            // 统计分析
            const report = {
                generatedAt: new Date().toISOString(),
                period: {
                    start: startDate || 'beginning',
                    end: endDate || new Date().toISOString()
                },
                summary: {
                    totalActions: logs.length,
                    uniqueUsers: new Set(logs.map(log => log.signed_by)).size,
                    entityTypes: [...new Set(logs.map(log => log.entity_type))],
                    actionsBreakdown: this.breakdownByAction(logs),
                    entitiesBreakdown: this.breakdownByEntity(logs),
                    userActivity: this.breakdownByUser(logs)
                },
                details: logs,
                chainValidation: await this.validateAuditChain()
            };

            return report;
        } catch (error) {
            console.error('生成审计报告失败:', error.message);
            throw error;
        }
    }

    /**
     * 创建审计记录
     * @private
     */
    async createAuditRecord(auditData) {
        return await this.dbManager.logAuditTrail(auditData);
    }

    /**
     * 计算数据哈希
     * @private
     */
    calculateHash(data) {
        const content = JSON.stringify(data);
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * 验证操作类型
     * @private
     */
    validateActionType(action) {
        const validActions = [
            'CREATE', 'READ', 'UPDATE', 'DELETE',
            'LOGIN', 'LOGOUT', 'SIGN', 'APPROVE', 'REJECT',
            'EXPORT', 'IMPORT', 'PRINT', 'ACCESS',
            'FAILED_LOGIN', 'ACCOUNT_LOCKED', 'PASSWORD_CHANGE',
            'SYSTEM_START', 'SYSTEM_STOP', 'CONFIG_CHANGE'
        ];

        if (!validActions.includes(action)) {
            throw new Error(`无效的操作类型: ${action}`);
        }

        return action;
    }

    /**
     * 验证实体类型
     * @private
     */
    validateEntityType(entityType) {
        const validTypes = [
            'User', 'Analysis', 'Device', 'Configuration',
            'Data', 'Report', 'Audit', 'System'
        ];

        if (!validTypes.includes(entityType)) {
            throw new Error(`无效的实体类型: ${entityType}`);
        }

        return entityType;
    }

    /**
     * 验证实体ID
     * @private
     */
    validateEntityId(entityId) {
        if (!entityId || typeof entityId !== 'string') {
            throw new Error('实体ID无效');
        }

        return entityId;
    }

    /**
     * 清理敏感数据
     * @private
     */
    sanitizeData(data) {
        if (!data || typeof data !== 'object') return {};

        const sensitiveFields = ['password', 'password_hash', 'token', 'secret'];
        const sanitized = { ...data };

        for (const field of sensitiveFields) {
            if (sanitized.hasOwnProperty(field)) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    /**
     * 计算数据变更
     * @private
     */
    calculateChanges(oldValues, newValues) {
        const oldObj = oldValues ? JSON.parse(oldValues) : {};
        const newObj = newValues ? JSON.parse(newValues) : {};
        
        const changes = [];
        const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

        for (const key of allKeys) {
            if (oldObj[key] !== newObj[key]) {
                changes.push({
                    field: key,
                    oldValue: oldObj[key],
                    newValue: newObj[key]
                });
            }
        }

        return changes;
    }

    /**
     * 验证单条记录的哈希
     * @private
     */
    async validateRecordHash(log) {
        const expectedHash = this.calculateHash({
            id: log.id,
            action: log.action,
            entityType: log.entity_type,
            entityId: log.entity_id,
            timestamp: log.timestamp,
            previousHash: log.previous_hash
        });

        return log.current_hash === expectedHash;
    }

    /**
     * 获取当前IP地址
     * @private
     */
    getCurrentIP() {
        // 在Electron环境中，这里返回本地标识
        return 'localhost';
    }

    /**
     * 获取当前用户代理
     * @private
     */
    getCurrentUserAgent() {
        return 'Radiation-Detector-CFR21/1.0.0';
    }

    /**
     * 按操作类型分组统计
     * @private
     */
    breakdownByAction(logs) {
        const breakdown = {};
        for (const log of logs) {
            breakdown[log.action] = (breakdown[log.action] || 0) + 1;
        }
        return breakdown;
    }

    /**
     * 按实体类型分组统计
     * @private
     */
    breakdownByEntity(logs) {
        const breakdown = {};
        for (const log of logs) {
            breakdown[log.entity_type] = (breakdown[log.entity_type] || 0) + 1;
        }
        return breakdown;
    }

    /**
     * 按用户分组统计
     * @private
     */
    breakdownByUser(logs) {
        const breakdown = {};
        for (const log of logs) {
            if (log.signed_by) {
                const userKey = `${log.signed_by_username || 'Unknown'}`;
                breakdown[userKey] = (breakdown[userKey] || 0) + 1;
            }
        }
        return breakdown;
    }
}

module.exports = AuditTrailService;