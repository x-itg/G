const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class AuthenticationService {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.maxFailedAttempts = 5;
        this.lockoutDuration = 30 * 60 * 1000; // 30分钟
        this.passwordExpiryDays = 90;
    }

    /**
     * 用户认证（CFR 21 Part 11兼容）
     * @param {string} username 用户名
     * @param {string} password 密码
     * @returns {Promise<Object>} 认证结果
     */
    async authenticate(username, password) {
        const user = await this.dbManager.getUserByUsername(username);
        
        if (!user) {
            throw new Error('用户不存在');
        }

        if (!user.is_active) {
            throw new Error('账户已禁用');
        }

        if (user.is_locked) {
            const lockoutTime = new Date(user.last_login_attempt);
            const now = new Date();
            const timeDiff = now - lockoutTime;
            
            if (timeDiff < this.lockoutDuration) {
                const remainingTime = Math.ceil((this.lockoutDuration - timeDiff) / 60000);
                throw new Error(`账户已锁定，请等待 ${remainingTime} 分钟后重试`);
            } else {
                // 自动解锁
                await this.unlockUser(user.id);
            }
        }

        // 验证密码
        const isValidPassword = this.verifyPassword(password, user.password_hash, user.password_salt);
        
        if (!isValidPassword) {
            await this.recordFailedAttempt(user);
            throw new Error('密码错误');
        }

        // 检查密码是否过期
        const passwordExpiryDate = new Date(user.password_expiry);
        const now = new Date();
        
        if (now > passwordExpiryDate) {
            throw new Error('密码已过期，请联系管理员重置');
        }

        // 记录成功登录
        await this.recordSuccessfulLogin(user);

        // 移除敏感信息
        const { password_hash, password_salt, ...safeUser } = user;
        
        return {
            success: true,
            user: safeUser,
            token: this.generateSessionToken(user)
        };
    }

    /**
     * 创建电子签名（CFR 21 Part 11）
     * @param {Object} signatureData 签名数据
     * @returns {Promise<Object>} 签名结果
     */
    async createElectronicSignature(signatureData) {
        const {
            userId,
            entityType,
            entityId,
            action,
            reason,
            comment,
            password,
            ipAddress,
            userAgent
        } = signatureData;

        // 验证用户身份
        const user = await this.dbManager.getUserById(userId);
        if (!user) {
            throw new Error('用户不存在');
        }

        // 验证密码（双重验证）
        const isValidPassword = this.verifyPassword(password, user.password_hash, user.password_salt);
        if (!isValidPassword) {
            throw new Error('密码验证失败');
        }

        // 根据角色验证必填字段
        this.validateSignatureFields(user.role, { reason, comment });

        // 创建签名记录
        const signature = await this.createSignatureRecord({
            userId,
            entityType,
            entityId,
            action,
            reason,
            comment,
            userFullName: user.full_name,
            userTitle: user.title,
            userDepartment: user.department,
            ipAddress,
            userAgent,
            digitalSignature: this.createDigitalSignature(user, signatureData)
        });

        // 更新密码过期时间（如果需要）
        if (user.must_change_password) {
            await this.updatePasswordExpiry(userId);
        }

        return signature;
    }

    /**
     * 创建用户
     */
    async createUser(userData) {
        // 检查用户名是否已存在
        const existingUser = await this.dbManager.getUserByUsername(userData.username);
        if (existingUser) {
            throw new Error('用户名已存在');
        }

        // 创建用户
        const user = await this.dbManager.createUser(userData);

        // 记录审计日志
        await this.dbManager.logAuditTrail({
            action: 'CREATE',
            entityType: 'User',
            entityId: user.id,
            oldValues: {},
            newValues: {
                username: user.username,
                role: user.role,
                fullName: user.full_name
            },
            signedBy: userData.createdBy,
            signatureReason: 'USER_CREATION'
        });

        return user;
    }

    /**
     * 更新用户密码
     */
    async updatePassword(userId, oldPassword, newPassword) {
        const user = await this.dbManager.getUserById(userId);
        if (!user) {
            throw new Error('用户不存在');
        }

        // 验证旧密码
        const isValidOldPassword = this.verifyPassword(oldPassword, user.password_hash, user.password_salt);
        if (!isValidOldPassword) {
            throw new Error('旧密码错误');
        }

        // 验证新密码强度
        this.validatePasswordStrength(newPassword);

        // 更新密码
        const salt = crypto.randomBytes(32).toString('hex');
        const hash = crypto.pbkdf2Sync(newPassword, salt, 10000, 512, 'sha512').toString('hex');
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + this.passwordExpiryDays);

        await this.dbManager.runQuery(`
            UPDATE users SET 
                password_hash = ?, 
                password_salt = ?, 
                password_expiry = ?,
                must_change_password = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [hash, salt, expiryDate.toISOString(), userId]);

        // 记录审计日志
        await this.dbManager.logAuditTrail({
            action: 'UPDATE',
            entityType: 'User',
            entityId: userId,
            oldValues: { action: 'password_change' },
            newValues: { action: 'password_changed' },
            signedBy: userId,
            signatureReason: 'PASSWORD_CHANGE'
        });

        return true;
    }

    /**
     * 验证电子签名
     */
    async verifyElectronicSignature(signatureId) {
        const signature = await this.dbManager.getQuery(
            'SELECT * FROM electronic_signatures WHERE id = ?',
            [signatureId]
        );

        if (!signature) {
            throw new Error('签名记录不存在');
        }

        // 验证数字签名
        const user = await this.dbManager.getUserById(signature.user_id);
        const expectedSignature = this.createDigitalSignature(user, {
            entityType: signature.entity_type,
            entityId: signature.entity_id,
            action: signature.action,
            reason: signature.reason,
            timestamp: signature.signed_at
        });

        if (signature.digital_signature !== expectedSignature) {
            throw new Error('数字签名验证失败');
        }

        return signature;
    }

    /**
     * 生成会话令牌
     */
    generateSessionToken(user) {
        const payload = {
            userId: user.id,
            username: user.username,
            role: user.role,
            issuedAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24小时
        };

        return crypto.createHash('sha256')
            .update(JSON.stringify(payload))
            .digest('hex');
    }

    /**
     * 验证密码
     */
    verifyPassword(password, hash, salt) {
        const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('hex');
        return computedHash === hash;
    }

    /**
     * 创建数字签名
     */
    createDigitalSignature(user, signatureData) {
        const content = JSON.stringify({
            userId: user.id,
            username: user.username,
            timestamp: new Date().toISOString(),
            entityType: signatureData.entityType,
            entityId: signatureData.entityId,
            action: signatureData.action,
            reason: signatureData.reason
        });

        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * 创建签名记录
     */
    async createSignatureRecord(signatureData) {
        const id = crypto.randomUUID();
        
        await this.dbManager.runQuery(`
            INSERT INTO electronic_signatures (
                id, user_id, entity_type, entity_id, action, reason, comment,
                user_full_name, user_title, user_department, signed_at,
                digital_signature, ip_address, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, signatureData.userId, signatureData.entityType,
            signatureData.entityId, signatureData.action, signatureData.reason,
            signatureData.comment, signatureData.userFullName,
            signatureData.userTitle, signatureData.userDepartment,
            new Date().toISOString(), signatureData.digitalSignature,
            signatureData.ipAddress, signatureData.userAgent
        ]);

        return await this.dbManager.getQuery(
            'SELECT * FROM electronic_signatures WHERE id = ?',
            [id]
        );
    }

    /**
     * 验证签名字段
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
                throw new Error(`${role}签名必须包含${field === 'reason' ? '原因' : '注释'}`);
            }
        }
    }

    /**
     * 验证密码强度
     */
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            throw new Error(`密码至少需要${minLength}个字符`);
        }

        if (!hasUpperCase) {
            throw new Error('密码必须包含至少一个大写字母');
        }

        if (!hasLowerCase) {
            throw new Error('密码必须包含至少一个小写字母');
        }

        if (!hasNumbers) {
            throw new Error('密码必须包含至少一个数字');
        }

        if (!hasSpecialChar) {
            throw new Error('密码必须包含至少一个特殊字符');
        }
    }

    /**
     * 记录失败尝试
     */
    async recordFailedAttempt(user) {
        const newAttempts = user.failed_login_attempts + 1;
        const isLocked = newAttempts >= this.maxFailedAttempts;

        await this.dbManager.runQuery(`
            UPDATE users SET 
                failed_login_attempts = ?, 
                last_login_attempt = CURRENT_TIMESTAMP,
                is_locked = ?
            WHERE id = ?
        `, [newAttempts, isLocked, user.id]);

        // 记录审计日志
        await this.dbManager.logAuditTrail({
            action: 'FAILED_LOGIN',
            entityType: 'User',
            entityId: user.id,
            oldValues: { failedAttempts: user.failed_login_attempts },
            newValues: { 
                failedAttempts: newAttempts,
                isLocked: isLocked
            },
            signedBy: user.id,
            signatureReason: 'FAILED_AUTHENTICATION'
        });

        if (isLocked) {
            throw new Error(`账户已锁定，连续${this.maxFailedAttempts}次登录失败`);
        }
    }

    /**
     * 记录成功登录
     */
    async recordSuccessfulLogin(user) {
        await this.dbManager.runQuery(`
            UPDATE users SET 
                failed_login_attempts = 0,
                last_login_attempt = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [user.id]);
    }

    /**
     * 解锁用户
     */
    async unlockUser(userId) {
        await this.dbManager.runQuery(`
            UPDATE users SET 
                is_locked = 0,
                failed_login_attempts = 0
            WHERE id = ?
        `, [userId]);
    }

    /**
     * 更新密码过期时间
     */
    async updatePasswordExpiry(userId) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + this.passwordExpiryDays);

        await this.dbManager.runQuery(`
            UPDATE users SET password_expiry = ? WHERE id = ?
        `, [expiryDate.toISOString(), userId]);
    }

    /**
     * 检查密码是否需要更改
     */
    async checkPasswordExpiry(userId) {
        const user = await this.dbManager.getUserById(userId);
        if (!user) return false;

        const passwordExpiryDate = new Date(user.password_expiry);
        const warningDate = new Date();
        warningDate.setDate(warningDate.getDate() + 7); // 提前7天警告

        return passwordExpiryDate <= warningDate;
    }

    /**
     * 获取用户权限
     */
    getUserPermissions(role) {
        const permissions = {
            ADMIN: {
                users: ['create', 'read', 'update', 'delete', 'unlock'],
                analyses: ['create', 'read', 'update', 'delete', 'approve', 'export'],
                audit: ['read', 'export'],
                system: ['configure', 'validate', 'backup'],
                devices: ['create', 'read', 'update', 'delete'],
                signatures: ['create', 'verify', 'revoke']
            },
            SUPERVISOR: {
                users: ['read'],
                analyses: ['create', 'read', 'update', 'approve', 'export'],
                audit: ['read'],
                system: ['read'],
                devices: ['read', 'update'],
                signatures: ['create', 'verify']
            },
            OPERATOR: {
                users: ['read_self'],
                analyses: ['create', 'read_own', 'update_own'],
                audit: [],
                system: [],
                devices: ['read'],
                signatures: ['create']
            }
        };

        return permissions[role] || {};
    }

    /**
     * 验证用户权限
     */
    hasPermission(user, resource, action) {
        const permissions = this.getUserPermissions(user.role);
        const resourcePermissions = permissions[resource] || [];
        
        // 特殊处理：操作员只能操作自己的数据
        if (user.role === 'OPERATOR' && action.includes('own')) {
            return resourcePermissions.includes(action.replace('_own', ''));
        }
        
        return resourcePermissions.includes(action);
    }
}

module.exports = AuthenticationService;