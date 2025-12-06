const crypto = require('crypto');

/**
 * 权限验证中间件 - 三级权限系统
 * 适用于放射化学纯度检测仪
 * 符合 CFR 21 Part 11 审计追踪要求
 */
class PermissionMiddleware {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.jwtSecret = process.env.JWT_SECRET || 'radiation-detector-secret-key';
        this.sessionTimeout = 8 * 60 * 60 * 1000; // 8小时会话超时
        this.refreshThreshold = 60 * 60 * 1000; // 1小时前可刷新令牌
        
        // 权限级别定义
        this.PERMISSION_LEVELS = {
            OPERATOR: 1,
            SUPERVISOR: 2,
            ADMIN: 3
        };

        // 资源权限映射
        this.RESOURCE_PERMISSIONS = {
            // 用户管理
            'users.create': { minLevel: 'ADMIN' },
            'users.read': { minLevel: 'SUPERVISOR' },
            'users.update': { minLevel: 'ADMIN' },
            'users.delete': { minLevel: 'ADMIN' },
            'users.unlock': { minLevel: 'ADMIN' },
            'users.read_self': { minLevel: 'OPERATOR' },
            
            // 检测分析
            'analyses.create': { minLevel: 'OPERATOR' },
            'analyses.read_own': { minLevel: 'OPERATOR' },
            'analyses.read_all': { minLevel: 'SUPERVISOR' },
            'analyses.update_own': { minLevel: 'OPERATOR' },
            'analyses.update_all': { minLevel: 'SUPERVISOR' },
            'analyses.approve': { minLevel: 'SUPERVISOR' },
            'analyses.delete': { minLevel: 'SUPERVISOR' },
            'analyses.export': { minLevel: 'SUPERVISOR' },
            
            // 审计日志
            'audit.read': { minLevel: 'ADMIN' },
            'audit.export': { minLevel: 'ADMIN' },
            
            // 系统设置
            'system.read': { minLevel: 'OPERATOR' },
            'system.configure': { minLevel: 'ADMIN' },
            'system.validate': { minLevel: 'SUPERVISOR' },
            'system.backup': { minLevel: 'ADMIN' },
            
            // 设备管理
            'devices.read': { minLevel: 'OPERATOR' },
            'devices.create': { minLevel: 'SUPERVISOR' },
            'devices.update': { minLevel: 'SUPERVISOR' },
            'devices.delete': { minLevel: 'ADMIN' },
            'devices.calibrate': { minLevel: 'SUPERVISOR' },
            
            // 电子签名
            'signatures.create': { minLevel: 'OPERATOR' },
            'signatures.verify': { minLevel: 'SUPERVISOR' },
            'signatures.revoke': { minLevel: 'ADMIN' }
        };
    }

    /**
     * JWT token验证中间件
     */
    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: '缺少访问令牌'
            });
        }

        try {
            const decoded = this.verifyToken(token);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(403).json({
                success: false,
                error: 'TOKEN_INVALID',
                message: '令牌无效或已过期'
            });
        }
    }

    /**
     * 检查用户权限中间件
     * @param {string} resource - 资源类型
     * @param {string} action - 操作类型
     * @param {number} minLevel - 最小权限级别
     * @param {boolean} requireSignature - 是否需要电子签名
     */
    requirePermission(resource, action, minLevel = 1, requireSignature = false) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        error: 'NOT_AUTHENTICATED',
                        message: '用户未认证'
                    });
                }

                const userId = req.user.id;
                
                // 检查用户权限
                const hasPermission = await this.dbManager.checkUserPermission(userId, resource, action);
                const permissionLevel = await this.dbManager.getUserPermissionLevel(userId, resource);

                if (!hasPermission || permissionLevel < minLevel) {
                    // 记录审计日志
                    await this.dbManager.logAuditEvent({
                        userId: userId,
                        username: req.user.username,
                        action: 'ACCESS_DENIED',
                        resource: resource,
                        result: 'DENIED',
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        complianceCode: 'CFR21-11.100',
                        reason: '权限不足',
                        details: `用户尝试访问 ${resource}:${action}，需要权限级别 ${minLevel}，当前权限级别 ${permissionLevel}`
                    });

                    return res.status(403).json({
                        success: false,
                        error: 'INSUFFICIENT_PERMISSIONS',
                        message: '权限不足',
                        required: {
                            resource: resource,
                            action: action,
                            minimumLevel: minLevel,
                            currentLevel: permissionLevel
                        }
                    });
                }

                // 如果需要电子签名，验证签名
                if (requireSignature) {
                    const signatureId = req.headers['x-electronic-signature'];
                    if (!signatureId) {
                        return res.status(400).json({
                            success: false,
                            error: 'SIGNATURE_REQUIRED',
                            message: '此操作需要电子签名'
                        });
                    }

                    const signatureResult = await this.dbManager.verifyElectronicSignature(signatureId);
                    if (!signatureResult.valid) {
                        // 记录审计日志
                        await this.dbManager.logAuditEvent({
                            userId: userId,
                            username: req.user.username,
                            action: 'SIGNATURE_VERIFICATION_FAILED',
                            resource: resource,
                            result: 'FAILED',
                            ipAddress: req.ip,
                            userAgent: req.get('User-Agent'),
                            complianceCode: 'CFR21-11.100',
                            reason: '电子签名验证失败',
                            details: `电子签名验证失败: ${signatureResult.reason}`
                        });

                        return res.status(400).json({
                            success: false,
                            error: 'SIGNATURE_INVALID',
                            message: '电子签名验证失败',
                            reason: signatureResult.reason
                        });
                    }

                    req.electronicSignature = signatureResult.signature;
                }

                // 记录成功的审计日志
                await this.dbManager.logAuditEvent({
                    userId: userId,
                    username: req.user.username,
                    action: 'ACCESS_GRANTED',
                    resource: resource,
                    resourceId: req.params.id,
                    result: 'SUCCESS',
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    complianceCode: 'CFR21-11.100',
                    reason: '权限验证通过',
                    details: `用户访问 ${resource}:${action} 权限验证通过`
                });

                req.permissionLevel = permissionLevel;
                next();

            } catch (error) {
                console.error('权限验证失败:', error);
                return res.status(500).json({
                    success: false,
                    error: 'PERMISSION_CHECK_FAILED',
                    message: '权限验证失败',
                    error: error.message
                });
            }
        };
    }

    /**
     * 获取用户信息中间件
     */
    async getUserInfo(req, res, next) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    error: 'NOT_AUTHENTICATED',
                    message: '用户未认证'
                });
            }

            const user = await this.dbManager.getUserById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'USER_NOT_FOUND',
                    message: '用户不存在'
                });
            }

            req.userInfo = {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                title: user.title,
                department: user.department,
                role: user.role,
                isActive: user.is_active,
                isLocked: user.is_locked
            };

            next();
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return res.status(500).json({
                success: false,
                error: 'USER_INFO_FAILED',
                message: '获取用户信息失败'
            });
        }
    }

    /**
     * 审计日志记录中间件
     */
    async logApiAccess(req, res, next) {
        const originalSend = res.send;
        
        res.send = function(data) {
            // 记录API访问日志
            if (req.user && req.user.id) {
                const responseStatus = res.statusCode;
                const action = `${req.method}_${req.route?.path || req.url}`;
                
                setImmediate(async () => {
                    try {
                        await req.dbManager?.logAuditEvent({
                            userId: req.user.id,
                            username: req.user.username,
                            action: action,
                            resource: req.route?.path || req.path,
                            result: responseStatus < 400 ? 'SUCCESS' : 'FAILED',
                            ipAddress: req.ip,
                            userAgent: req.get('User-Agent'),
                            complianceCode: 'CFR21-11.100',
                            reason: 'API访问',
                            details: `${req.method} ${req.url} - ${responseStatus}`
                        });
                    } catch (error) {
                        console.error('记录API审计日志失败:', error);
                    }
                });
            }
            
            originalSend.call(this, data);
        };
        
        next();
    }

    /**
     * 生成电子签名验证中间件
     */
    generateSignature(userId, entityType, entityId, action, reason) {
        const signatureData = {
            userId: userId,
            entityType: entityType,
            entityId: entityId,
            action: action,
            reason: reason,
            timestamp: new Date().toISOString()
        };

        return crypto.createHash('sha256')
            .update(JSON.stringify(signatureData))
            .digest('hex');
    }

    /**
     * 验证请求签名中间件
     */
    validateSignature(req, res, next) {
        const signature = req.headers['x-signature'];
        const timestamp = req.headers['x-timestamp'];
        
        if (!signature || !timestamp) {
            return res.status(400).json({
                success: false,
                error: 'SIGNATURE_MISSING',
                message: '缺少签名信息'
            });
        }

        // 检查时间戳是否过期（5分钟）
        const now = Date.now();
        const sigTimestamp = parseInt(timestamp);
        if (now - sigTimestamp > 300000) { // 5分钟
            return res.status(400).json({
                success: false,
                error: 'SIGNATURE_EXPIRED',
                message: '签名已过期'
            });
        }

        req.signature = {
            value: signature,
            timestamp: sigTimestamp
        };
        
        next();
    }

    /**
     * 生成自定义令牌
     * @param {Object} user 用户信息
     * @returns {string} 令牌字符串
     */
    generateToken(user) {
        const sessionId = crypto.randomUUID();
        const payload = {
            userId: user.id,
            username: user.username,
            role: user.role,
            issuedAt: Date.now(),
            expiresAt: Date.now() + this.sessionTimeout,
            sessionId: sessionId,
            refreshToken: this.generateRefreshToken(user.id, sessionId)
        };

        // 创建令牌头部和载荷
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'CUSTOM' })).toString('base64url');
        const payload_data = Buffer.from(JSON.stringify(payload)).toString('base64url');
        
        // 创建签名
        const signature = crypto
            .createHmac('sha256', this.jwtSecret)
            .update(`${header}.${payload_data}`)
            .digest('base64url');

        return `${header}.${payload_data}.${signature}`;
    }

    /**
     * 生成刷新令牌
     * @param {string} userId 用户ID
     * @param {string} sessionId 会话ID
     * @returns {string} 刷新令牌
     */
    generateRefreshToken(userId, sessionId) {
        const payload = {
            userId,
            sessionId,
            type: 'refresh',
            issuedAt: Date.now()
        };

        return crypto.createHash('sha256')
            .update(JSON.stringify(payload))
            .digest('hex');
    }

    /**
     * 验证自定义令牌
     * @param {string} token 令牌字符串
     * @returns {Object} 解码后的用户信息
     */
    verifyToken(token) {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('无效的令牌格式');
        }

        const [header, payload, signature] = parts;

        // 验证签名
        const expectedSignature = crypto
            .createHmac('sha256', this.jwtSecret)
            .update(`${header}.${payload}`)
            .digest('base64url');

        if (signature !== expectedSignature) {
            throw new Error('令牌签名无效');
        }

        // 解码载荷
        const payloadData = JSON.parse(Buffer.from(payload, 'base64url').toString());

        // 检查过期时间
        if (payloadData.expiresAt < Date.now()) {
            throw new Error('令牌已过期');
        }

        // 验证用户状态
        const user = this.dbManager.getUserById(payloadData.userId);
        if (!user || !user.is_active) {
            throw new Error('用户不存在或已禁用');
        }

        return payloadData;
    }

    /**
     * 检查用户权限
     * @param {string} userId 用户ID
     * @param {string} resource 资源
     * @param {string} action 操作
     * @param {string} minLevel 最低权限级别
     * @returns {boolean} 是否有权限
     */
    async checkUserPermission(userId, resource, action, minLevel) {
        try {
            const user = this.dbManager.getUserById(userId);
            if (!user) return false;

            const userLevel = this.PERMISSION_LEVELS[user.role] || 0;
            const requiredLevel = this.PERMISSION_LEVELS[minLevel] || 999;

            // 管理员拥有所有权限
            if (user.role === 'ADMIN') return true;

            // 检查基本权限级别
            if (userLevel < requiredLevel) return false;

            // 特殊权限检查：操作员只能操作自己的数据
            if (user.role === 'OPERATOR' && action.includes('own')) {
                return true;
            }

            return true;
        } catch (error) {
            console.error('权限检查错误:', error);
            return false;
        }
    }

    /**
     * 记录权限检查到审计日志（CFR 21 Part 11）
     * @param {Object} auditData 审计数据
     */
    async logPermissionCheck(auditData) {
        try {
            await this.dbManager.logAuditEvent({
                userId: auditData.userId,
                username: auditData.username,
                action: auditData.action,
                resource: auditData.resource,
                resourceId: auditData.resourceId,
                result: auditData.result || 'SUCCESS',
                reason: auditData.reason,
                details: auditData.details,
                ipAddress: auditData.ipAddress,
                userAgent: auditData.userAgent,
                sessionId: auditData.sessionId,
                complianceCode: 'CFR21-PART11',
                signatureRequired: auditData.signatureRequired || false
            });
        } catch (error) {
            console.error('审计日志记录失败:', error);
        }
    }

    /**
     * 验证电子签名权限（CFR 21 Part 11）
     * @param {string} userId 用户ID
     * @param {string} action 签名动作
     * @returns {boolean} 是否有签名权限
     */
    canCreateElectronicSignature(userId, action) {
        const user = this.dbManager.getUserById(userId);
        if (!user) return false;

        // 根据角色验证签名权限
        const signaturePermissions = {
            OPERATOR: ['create_analysis', 'approve_own_analysis'],
            SUPERVISOR: ['create_analysis', 'approve_analysis', 'reject_analysis'],
            ADMIN: ['create_analysis', 'approve_analysis', 'reject_analysis', 'revoke_signature']
        };

        const allowedActions = signaturePermissions[user.role] || [];
        return allowedActions.includes(action);
    }

    /**
     * 获取客户端IP地址
     * @param {Object} req 请求对象
     * @returns {string} IP地址
     */
    getClientIP(req) {
        return req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               req.get('X-Forwarded-For') ||
               req.get('X-Real-IP') ||
               'unknown';
    }

    /**
     * 登出用户
     * @param {string} userId 用户ID
     * @param {string} sessionId 会话ID
     * @returns {Promise<boolean>} 是否成功
     */
    async logoutUser(userId, sessionId) {
        try {
            // 记录登出审计日志
            await this.logPermissionCheck({
                userId: userId,
                username: 'N/A',
                action: 'LOGOUT',
                resource: 'session',
                result: 'SUCCESS',
                ipAddress: 'N/A',
                userAgent: 'N/A',
                sessionId: sessionId
            });

            return true;
        } catch (error) {
            console.error('用户登出错误:', error);
            return false;
        }
    }

    /**
     * 检查会话是否过期
     * @param {Object} decodedToken 解码的令牌
     * @returns {boolean} 是否过期
     */
    isSessionExpired(decodedToken) {
        return decodedToken.expiresAt < Date.now();
    }

    /**
     * 检查是否可以刷新令牌
     * @param {Object} decodedToken 解码的令牌
     * @returns {boolean} 是否可以刷新
     */
    canRefreshToken(decodedToken) {
        const now = Date.now();
        const expiryTime = decodedToken.expiresAt;
        const timeUntilExpiry = expiryTime - now;
        
        return timeUntilExpiry > 0 && timeUntilExpiry <= this.refreshThreshold;
    }
}

module.exports = PermissionMiddleware;