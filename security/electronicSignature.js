const crypto = require('crypto');
const path = require('path');

/**
 * 电子签名验证机制
 * CFR21 Part 11 兼容的电子签名系统
 * 为放射化学纯度检测仪设计
 */
class ElectronicSignatureService {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.signatureTimeout = 5 * 60 * 1000; // 5分钟签名超时
        this.maxSignatureAttempts = 3; // 最大签名尝试次数
        
        // CFR21 Part 11 合规要求的关键操作
        this.criticalOperations = {
            'DATA_DELETION': {
                name: '数据删除',
                requiresSignature: true,
                requiresSecondFactor: true,
                roles: ['ADMIN', 'SUPERVISOR']
            },
            'PARAMETER_MODIFICATION': {
                name: '参数修改',
                requiresSignature: true,
                requiresSecondFactor: true,
                roles: ['ADMIN', 'SUPERVISOR']
            },
            'USER_PRIVILEGE_CHANGE': {
                name: '用户权限变更',
                requiresSignature: true,
                requiresSecondFactor: true,
                roles: ['ADMIN']
            },
            'SYSTEM_CONFIG_CHANGE': {
                name: '系统配置更改',
                requiresSignature: true,
                requiresSecondFactor: true,
                roles: ['ADMIN']
            },
            'CALIBRATION_CHANGE': {
                name: '校准参数更改',
                requiresSignature: true,
                requiresSecondFactor: true,
                roles: ['ADMIN', 'SUPERVISOR']
            },
            'REPORT_DELETION': {
                name: '报告删除',
                requiresSignature: true,
                requiresSecondFactor: true,
                roles: ['ADMIN', 'SUPERVISOR']
            }
        };

        this.initializeAuditTable();
    }

    /**
     * 初始化电子签名审计表
     */
    initializeAuditTable() {
        // 确保 signature_audit 表存在
        try {
            const auditData = this.dbManager.readTable('signature_audit');
            if (!auditData || !Array.isArray(auditData)) {
                this.dbManager.writeTable('signature_audit', []);
            }
            console.log('📊 电子签名审计表初始化完成');
        } catch (error) {
            console.warn('⚠️ 电子签名审计表初始化失败:', error.message);
        }
    }

    /**
     * 创建电子签名（CFR21 Part 11合规）
     * @param {Object} signatureRequest 签名请求
     * @returns {Promise<Object>} 签名结果
     */
    async createElectronicSignature(signatureRequest) {
        const {
            userId,
            operation,
            entityId,
            entityType,
            reason,
            comment,
            password,
            secondPassword,
            ipAddress,
            userAgent,
            metadata = {}
        } = signatureRequest;

        try {
            // 1. 验证用户身份
            const user = await this.dbManager.getUserById(userId);
            if (!user || !user.is_active || user.is_locked) {
                throw new Error('用户身份验证失败：用户不存在或账户被禁用/锁定');
            }

            // 2. 验证操作权限
            const operationConfig = this.criticalOperations[operation];
            if (!operationConfig) {
                throw new Error(`不支持的操作类型: ${operation}`);
            }

            if (!operationConfig.roles.includes(user.role)) {
                throw new Error(`用户角色 ${user.role} 无权限执行此操作`);
            }

            // 3. 验证密码（双重验证）
            await this.verifyUserPassword(user, password, secondPassword);

            // 4. 验证必填字段
            this.validateSignatureFields(user.role, { reason, comment });

            // 5. 创建数字签名（使用临时ID）
            const tempSignatureId = crypto.randomUUID();
            const digitalSignature = this.createDigitalSignature({
                signatureId: tempSignatureId,
                userId,
                operation,
                entityId,
                entityType,
                reason,
                comment,
                timestamp: new Date().toISOString()
            });

            // 6. 保存签名记录
            const signatureRecord = await this.saveSignatureRecord({
                tempSignatureId,
                userId,
                operation,
                entityId,
                entityType,
                reason,
                comment,
                digitalSignature,
                userFullName: user.full_name,
                userTitle: user.title,
                userDepartment: user.department,
                ipAddress,
                userAgent,
                metadata
            });

            // 8. 记录审计日志
            await this.dbManager.logAuditEvent({
                userId,
                username: user.username,
                action: 'CREATE_ELECTRONIC_SIGNATURE',
                resource: operation,
                resourceId: entityId,
                result: 'SUCCESS',
                ipAddress,
                userAgent,
                signatureRequired: true,
                electronicSignatureId: signatureRecord.id,
                complianceCode: 'CFR21_PART_11',
                reason: `创建电子签名 - ${operationConfig.name}`,
                details: {
                    operation,
                    entityType,
                    signatureId: signatureRecord.id,
                    digitalSignature: digitalSignature.substring(0, 16) + '...'
                }
            });

            // 9. 生成签名验证令牌
            const verificationToken = this.generateVerificationToken(signatureRecord);

            return {
                success: true,
                signatureId: signatureRecord.id,
                signatureRecord,
                verificationToken,
                expiresAt: new Date(Date.now() + this.signatureTimeout).toISOString(),
                message: '电子签名创建成功'
            };

        } catch (error) {
            // 记录失败的签名尝试
            await this.dbManager.logAuditEvent({
                userId,
                username: user?.username || 'unknown',
                action: 'CREATE_ELECTRONIC_SIGNATURE_FAILED',
                resource: operation,
                resourceId: entityId,
                result: 'FAILED',
                ipAddress,
                userAgent,
                complianceCode: 'CFR21_PART_11',
                reason: error.message,
                details: { error: error.message }
            });

            throw error;
        }
    }

    /**
     * 验证电子签名
     * @param {string} signatureId 签名ID
     * @param {string} verificationToken 验证令牌
     * @returns {Promise<Object>} 验证结果
     */
    async verifyElectronicSignature(signatureId, verificationToken) {
        try {
            // 1. 获取签名记录
            const signatures = this.dbManager.readTable('electronic_signatures');
            const signatureRecord = signatures.find(sig => sig.id === signatureId);
            if (!signatureRecord) {
                throw new Error('签名记录不存在');
            }

            // 2. 验证签名是否过期
            if (this.isSignatureExpired(signatureRecord.signed_at)) {
                throw new Error('签名已过期');
            }

            // 3. 验证令牌
            const expectedToken = this.generateVerificationToken(signatureRecord);
            if (verificationToken !== expectedToken) {
                throw new Error('验证令牌无效');
            }

            // 4. 重新计算数字签名进行验证
            const expectedSignature = this.createDigitalSignature({
                signatureId: signatureRecord.id,
                userId: signatureRecord.user_id,
                operation: signatureRecord.action,
                entityId: signatureRecord.entity_id,
                entityType: signatureRecord.entity_type,
                reason: signatureRecord.reason,
                comment: signatureRecord.comment,
                timestamp: signatureRecord.signed_at
            });

            const isValid = signatureRecord.digital_signature === expectedSignature;

            // 5. 记录验证结果到审计表
            await this.recordSignatureAudit({
                signatureId,
                verificationResult: isValid ? 'VALID' : 'INVALID',
                verifiedBy: signatureRecord.user_id,
                verifierIp: signatureRecord.ip_address,
                verifierUserAgent: signatureRecord.user_agent,
                discrepancyNotes: isValid ? null : '数字签名验证失败',
                complianceStatus: isValid ? 'COMPLIANT' : 'NON_COMPLIANT'
            });

            // 6. 记录验证审计日志
            await this.dbManager.logAuditEvent({
                userId: signatureRecord.user_id,
                username: 'system',
                action: 'VERIFY_ELECTRONIC_SIGNATURE',
                resource: signatureRecord.action,
                resourceId: signatureRecord.entity_id,
                result: isValid ? 'SUCCESS' : 'FAILED',
                signatureRequired: true,
                electronicSignatureId: signatureId,
                complianceCode: 'CFR21_PART_11',
                reason: `电子签名验证 - ${isValid ? '成功' : '失败'}`,
                details: {
                    isValid,
                    signatureRecord: {
                        operation: signatureRecord.action,
                        user: signatureRecord.user_full_name,
                        timestamp: signatureRecord.signed_at
                    }
                }
            });

            return {
                valid: isValid,
                signatureRecord,
                verifiedAt: new Date().toISOString(),
                message: isValid ? '签名验证成功' : '签名验证失败'
            };

        } catch (error) {
            // 记录验证失败
            await this.dbManager.logAuditEvent({
                userId: 'system',
                username: 'system',
                action: 'VERIFY_ELECTRONIC_SIGNATURE_FAILED',
                resource: 'ELECTRONIC_SIGNATURE',
                resourceId: signatureId,
                result: 'FAILED',
                complianceCode: 'CFR21_PART_11',
                reason: error.message,
                details: { error: error.message }
            });

            throw error;
        }
    }

    /**
     * 检查操作是否需要电子签名
     * @param {string} operation 操作类型
     * @param {string} userRole 用户角色
     * @returns {Object} 签名要求配置
     */
    checkSignatureRequirement(operation, userRole) {
        const operationConfig = this.criticalOperations[operation];
        if (!operationConfig) {
            return { requiresSignature: false };
        }

        const canPerform = operationConfig.roles.includes(userRole);
        return {
            requiresSignature: operationConfig.requiresSignature && canPerform,
            requiresSecondFactor: operationConfig.requiresSecondFactor,
            operationName: operationConfig.name,
            allowedRoles: operationConfig.roles
        };
    }

    /**
     * 获取用户的电子签名历史
     * @param {string} userId 用户ID
     * @param {Object} filters 过滤器
     * @returns {Array} 签名历史记录
     */
    getUserSignatureHistory(userId, filters = {}) {
        let signatures = this.dbManager.getRecords('electronic_signatures', { user_id: userId });

        // 应用过滤器
        if (filters.operation) {
            signatures = signatures.filter(sig => sig.action === filters.operation);
        }
        if (filters.entityType) {
            signatures = signatures.filter(sig => sig.entity_type === filters.entityType);
        }
        if (filters.startDate) {
            signatures = signatures.filter(sig => sig.signed_at >= filters.startDate);
        }
        if (filters.endDate) {
            signatures = signatures.filter(sig => sig.signed_at <= filters.endDate);
        }

        // 排序
        signatures.sort((a, b) => new Date(b.signed_at) - new Date(a.signed_at));

        // 限制结果数量
        if (filters.limit) {
            signatures = signatures.slice(0, filters.limit);
        }

        return signatures;
    }

    /**
     * 获取系统电子签名审核报告
     * @param {Object} filters 过滤器
     * @returns {Object} 审核报告
     */
    getSignatureAuditReport(filters = {}) {
        const signatures = this.dbManager.readTable('electronic_signatures');
        const auditRecords = this.dbManager.readTable('signature_audit');

        // 统计数据
        const totalSignatures = signatures.length;
        const verifiedSignatures = auditRecords.filter(a => a.verification_result === 'VALID').length;
        const unverifiedSignatures = auditRecords.filter(a => a.verification_result === 'INVALID').length;
        const complianceRate = totalSignatures > 0 ? (verifiedSignatures / totalSignatures) * 100 : 0;

        // 按操作类型统计
        const operationStats = {};
        signatures.forEach(sig => {
            if (!operationStats[sig.action]) {
                operationStats[sig.action] = 0;
            }
            operationStats[sig.action]++;
        });

        // 按用户统计
        const userStats = {};
        signatures.forEach(sig => {
            if (!userStats[sig.user_id]) {
                userStats[sig.user_id] = {
                    userName: sig.user_full_name,
                    count: 0
                };
            }
            userStats[sig.user_id].count++;
        });

        return {
            summary: {
                totalSignatures,
                verifiedSignatures,
                unverifiedSignatures,
                complianceRate: Math.round(complianceRate * 100) / 100
            },
            operationStats,
            userStats,
            recentAuditRecords: auditRecords.slice(-10),
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * 撤销电子签名
     * @param {string} signatureId 签名ID
     * @param {Object} revocationData 撤销数据
     * @returns {Promise<Object>} 撤销结果
     */
    async revokeElectronicSignature(signatureId, revocationData) {
        const {
            revokedBy,
            reason,
            ipAddress,
            userAgent
        } = revocationData;

        try {
            // 获取签名记录
            const signatures = this.dbManager.readTable('electronic_signatures');
            const signatureRecord = signatures.find(sig => sig.id === signatureId);
            if (!signatureRecord) {
                throw new Error('签名记录不存在');
            }

            // 验证撤销权限（只有管理员可以撤销）
            const user = await this.dbManager.getUserById(revokedBy);
            if (!user || user.role !== 'ADMIN') {
                throw new Error('只有管理员可以撤销电子签名');
            }

            // 更新签名状态
            this.dbManager.updateRecord('electronic_signatures', signatureId, {
                is_revoked: true,
                revoked_at: new Date().toISOString(),
                revoked_by: revokedBy,
                revocation_reason: reason,
                revocation_ip: ipAddress,
                revocation_user_agent: userAgent
            });

            // 记录撤销审计日志
            await this.dbManager.logAuditEvent({
                userId: revokedBy,
                username: user.username,
                action: 'REVOKE_ELECTRONIC_SIGNATURE',
                resource: signatureRecord.action,
                resourceId: signatureRecord.entity_id,
                result: 'SUCCESS',
                ipAddress,
                userAgent,
                signatureRequired: true,
                electronicSignatureId: signatureId,
                complianceCode: 'CFR21_PART_11',
                reason: `撤销电子签名 - ${reason}`,
                details: {
                    originalSignature: {
                        user: signatureRecord.user_full_name,
                        operation: signatureRecord.action,
                        timestamp: signatureRecord.signed_at
                    }
                }
            });

            return {
                success: true,
                revokedSignatureId: signatureId,
                revokedAt: new Date().toISOString(),
                message: '电子签名撤销成功'
            };

        } catch (error) {
            throw error;
        }
    }

    // ==================== 私有方法 ====================

    /**
     * 生成唯一签名ID
     */
    generateSignatureId() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        return `SIG-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * 创建数字签名
     */
    createDigitalSignature(data) {
        const content = JSON.stringify({
            signatureId: data.signatureId,
            userId: data.userId,
            operation: data.operation,
            entityId: data.entityId,
            entityType: data.entityType,
            reason: data.reason,
            comment: data.comment,
            timestamp: data.timestamp
        });

        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * 生成验证令牌
     */
    generateVerificationToken(signatureRecord) {
        const content = JSON.stringify({
            signatureId: signatureRecord.id,
            digitalSignature: signatureRecord.digital_signature,
            timestamp: signatureRecord.signed_at
        });

        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * 验证用户密码（双重验证）
     */
    async verifyUserPassword(user, primaryPassword, secondaryPassword) {
        // 验证主密码
        const isValidPrimary = this.dbManager.verifyPassword 
            ? this.dbManager.verifyPassword(primaryPassword, user.password_hash, user.password_salt)
            : this.verifyPassword(primaryPassword, user.password_hash, user.password_salt);

        if (!isValidPrimary) {
            throw new Error('主密码验证失败');
        }

        // 如果需要二次验证
        if (secondaryPassword) {
            const isValidSecondary = this.verifyPassword(secondaryPassword, user.password_hash, user.password_salt);
            if (!isValidSecondary) {
                throw new Error('二次密码验证失败');
            }
        }

        return true;
    }

    /**
     * 验证密码（内部方法）
     */
    verifyPassword(password, hash, salt) {
        const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('hex');
        return computedHash === hash;
    }

    /**
     * 验证签名字段要求
     */
    validateSignatureFields(role, fields) {
        const requirements = {
            OPERATOR: ['reason'],
            SUPERVISOR: ['reason', 'comment'],
            ADMIN: ['reason', 'comment']
        };

        const required = requirements[role] || [];
        
        for (const field of required) {
            if (!fields[field] || fields[field].trim() === '') {
                const fieldName = field === 'reason' ? '原因' : '注释';
                throw new Error(`${role}签名必须包含${fieldName}`);
            }
        }
    }

    /**
     * 保存签名记录
     */
    async saveSignatureRecord(signatureData) {
        const signatureId = await this.dbManager.createElectronicSignature({
            userId: signatureData.userId,
            entityType: signatureData.entityType,
            entityId: signatureData.entityId,
            action: signatureData.operation,
            reason: signatureData.reason,
            comment: signatureData.comment,
            userFullName: signatureData.userFullName,
            userTitle: signatureData.userTitle,
            userDepartment: signatureData.userDepartment,
            ipAddress: signatureData.ipAddress,
            userAgent: signatureData.userAgent,
            secondFactorVerified: !!signatureData.secondPassword,
            metadata: signatureData.metadata,
            digitalSignature: signatureData.digitalSignature
        });
        
        // 获取完整的签名记录
        const signatures = this.dbManager.readTable('electronic_signatures');
        return signatures.find(sig => sig.id === signatureId);
    }

    /**
     * 记录签名审计
     */
    async recordSignatureAudit(auditData) {
        return await this.dbManager.addRecord('signature_audit', {
            id: crypto.randomUUID(),
            signature_id: auditData.signatureId,
            verification_result: auditData.verificationResult,
            verified_at: auditData.verifiedAt,
            verified_by: auditData.verifiedBy,
            verifier_ip: auditData.verifierIp,
            verifier_user_agent: auditData.verifierUserAgent,
            discrepancy_notes: auditData.discrepancyNotes,
            compliance_status: auditData.complianceStatus,
            created_at: new Date().toISOString()
        });
    }

    /**
     * 检查签名是否过期
     */
    isSignatureExpired(signedAt) {
        const signedTime = new Date(signedAt);
        const now = new Date();
        return (now - signedTime) > this.signatureTimeout;
    }

    /**
     * 获取关键操作配置
     */
    getCriticalOperations() {
        return this.criticalOperations;
    }

    /**
     * 验证签名完整性
     */
    validateSignatureIntegrity(signatureRecord) {
        try {
            // 验证必需的字段存在
            const requiredFields = [
                'id', 'user_id', 'entity_type', 'entity_id', 'action',
                'digital_signature', 'signed_at', 'user_full_name'
            ];

            for (const field of requiredFields) {
                if (!signatureRecord[field]) {
                    return { valid: false, reason: `缺少必需字段: ${field}` };
                }
            }

            // 验证时间戳格式
            const signedAt = new Date(signatureRecord.signed_at);
            if (isNaN(signedAt.getTime())) {
                return { valid: false, reason: '无效的时间戳格式' };
            }

            // 验证数字签名格式
            if (signatureRecord.digital_signature.length !== 64) {
                return { valid: false, reason: '数字签名格式无效' };
            }

            return { valid: true, reason: '签名完整性验证通过' };

        } catch (error) {
            return { valid: false, reason: `完整性验证错误: ${error.message}` };
        }
    }
}

module.exports = ElectronicSignatureService;