const express = require('express');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');
const AuthenticationService = require('../services/AuthenticationService');
const PermissionMiddleware = require('./permissionMiddleware');

/**
 * 权限验证中间件使用示例
 * 演示如何在放射化学纯度检测仪应用中使用三级权限系统
 */
class PermissionMiddlewareExample {
    constructor() {
        this.app = express();
        this.dbManager = new SimplifiedDatabaseManager();
        this.authService = new AuthenticationService(this.dbManager);
        this.permissionMiddleware = new PermissionMiddleware(this.dbManager);
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // JSON解析中间件
        this.app.use(express.json());

        // 跨域处理
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }
            next();
        });
    }

    setupRoutes() {
        // ============ 认证相关路由 ============
        
        // 用户登录
        this.app.post('/api/auth/login', async (req, res) => {
            try {
                const { username, password } = req.body;
                
                // 使用认证服务进行用户认证
                const result = await this.authService.authenticate(username, password);
                
                if (result.success) {
                    // 生成JWT令牌
                    const token = this.permissionMiddleware.generateToken(result.user);
                    
                    res.json({
                        success: true,
                        token,
                        user: result.user,
                        message: '登录成功'
                    });
                }
            } catch (error) {
                res.status(401).json({
                    success: false,
                    error: error.message,
                    code: 'AUTHENTICATION_FAILED'
                });
            }
        });

        // 刷新令牌
        this.app.post('/api/auth/refresh', (req, res) => {
            try {
                const { refreshToken } = req.body;
                
                if (!refreshToken) {
                    return res.status(400).json({
                        error: '未提供刷新令牌'
                    });
                }

                const newTokens = this.permissionMiddleware.refreshToken(refreshToken);
                
                res.json({
                    success: true,
                    ...newTokens
                });
            } catch (error) {
                res.status(401).json({
                    success: false,
                    error: error.message,
                    code: 'TOKEN_REFRESH_FAILED'
                });
            }
        });

        // 用户登出
        this.app.post('/api/auth/logout', 
            this.permissionMiddleware.authenticateToken,
            async (req, res) => {
                try {
                    const success = await this.permissionMiddleware.logoutUser(
                        req.user.userId, 
                        req.user.sessionId
                    );
                    
                    if (success) {
                        res.json({
                            success: true,
                            message: '登出成功'
                        });
                    } else {
                        throw new Error('登出失败');
                    }
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        );

        // ============ 权限检查路由 ============

        // OPERATOR权限：创建检测分析
        this.app.post('/api/analyses', 
            this.permissionMiddleware.authenticateToken,
            this.permissionMiddleware.requirePermission('analyses', 'create'),
            this.createAnalysis
        );

        // OPERATOR权限：查看自己的分析
        this.app.get('/api/analyses/my', 
            this.permissionMiddleware.authenticateToken,
            this.permissionMiddleware.requirePermission('analyses', 'read_own'),
            this.getMyAnalyses
        );

        // SUPERVISOR权限：查看所有分析
        this.app.get('/api/analyses/all', 
            this.permissionMiddleware.authenticateToken,
            this.permissionMiddleware.requirePermission('analyses', 'read_all'),
            this.getAllAnalyses
        );

        // SUPERVISOR权限：批准分析
        this.app.put('/api/analyses/:id/approve', 
            this.permissionMiddleware.authenticateToken,
            this.permissionMiddleware.requirePermission('analyses', 'approve'),
            this.approveAnalysis
        );

        // ADMIN权限：用户管理
        this.app.post('/api/users', 
            this.permissionMiddleware.authenticateToken,
            this.permissionMiddleware.requirePermission('users', 'create'),
            this.createUser
        );

        // ADMIN权限：系统配置
        this.app.put('/api/system/config', 
            this.permissionMiddleware.authenticateToken,
            this.permissionMiddleware.requirePermission('system', 'configure'),
            this.configureSystem
        );

        // 所有已认证用户：获取个人信息
        this.app.get('/api/profile', 
            this.permissionMiddleware.authenticateToken,
            this.getProfile
        );

        // ============ 电子签名路由 ============

        // 创建电子签名
        this.app.post('/api/signatures', 
            this.permissionMiddleware.authenticateToken,
            this.createElectronicSignature
        );

        // ============ 设备管理路由 ============

        // 设备读取（OPERATOR及以上）
        this.app.get('/api/devices', 
            this.permissionMiddleware.authenticateToken,
            this.permissionMiddleware.requirePermission('devices', 'read'),
            this.getDevices
        );

        // 设备校准（SUPERVISOR及以上）
        this.app.post('/api/devices/:id/calibrate', 
            this.permissionMiddleware.authenticateToken,
            this.permissionMiddleware.requirePermission('devices', 'calibrate'),
            this.calibrateDevice
        );
    }

    // ============ 路由处理函数 ============

    // 创建检测分析（OPERATOR权限）
    async createAnalysis(req, res) {
        try {
            const analysisData = req.body;
            const user = req.user;

            // 这里实现创建分析的逻辑
            // 例如：保存到数据库、记录审计日志等

            // 记录操作审计
            await this.permissionMiddleware.logPermissionCheck({
                userId: user.userId,
                username: user.username,
                action: 'CREATE_ANALYSIS',
                resource: 'analyses',
                result: 'SUCCESS',
                newValues: analysisData,
                ipAddress: this.permissionMiddleware.getClientIP(req),
                userAgent: req.get('User-Agent'),
                sessionId: user.sessionId
            });

            res.json({
                success: true,
                message: '检测分析创建成功',
                data: {
                    id: 'analysis-id',
                    ...analysisData,
                    createdBy: user.username
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // 获取我的分析（OPERATOR权限）
    async getMyAnalyses(req, res) {
        try {
            const user = req.user;
            
            // 这里实现获取用户自己分析的逻辑
            
            res.json({
                success: true,
                data: [
                    {
                        id: 'analysis-1',
                        name: '样本A分析',
                        status: 'completed',
                        createdBy: user.username
                    }
                ]
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // 获取所有分析（SUPERVISOR权限）
    async getAllAnalyses(req, res) {
        try {
            // 这里实现获取所有分析的逻辑
            
            res.json({
                success: true,
                data: [
                    {
                        id: 'analysis-1',
                        name: '样本A分析',
                        status: 'completed',
                        createdBy: 'operator1'
                    },
                    {
                        id: 'analysis-2',
                        name: '样本B分析',
                        status: 'pending_approval',
                        createdBy: 'operator2'
                    }
                ]
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // 批准分析（SUPERVISOR权限）
    async approveAnalysis(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            
            // 这里实现批准分析的逻辑
            
            // 记录操作审计
            await this.permissionMiddleware.logPermissionCheck({
                userId: user.userId,
                username: user.username,
                action: 'APPROVE_ANALYSIS',
                resource: 'analyses',
                resourceId: id,
                result: 'SUCCESS',
                reason: 'Supervisor approval',
                ipAddress: this.permissionMiddleware.getClientIP(req),
                userAgent: req.get('User-Agent'),
                sessionId: user.sessionId
            });

            res.json({
                success: true,
                message: `分析 ${id} 批准成功`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // 创建用户（ADMIN权限）
    async createUser(req, res) {
        try {
            const userData = req.body;
            const user = req.user;
            
            // 这里实现创建用户的逻辑
            
            res.json({
                success: true,
                message: '用户创建成功',
                data: {
                    id: 'new-user-id',
                    ...userData,
                    createdBy: user.username
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // 配置系统（ADMIN权限）
    async configureSystem(req, res) {
        try {
            const config = req.body;
            const user = req.user;
            
            // 这里实现系统配置的逻辑
            
            res.json({
                success: true,
                message: '系统配置更新成功'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // 获取个人信息
    async getProfile(req, res) {
        try {
            const user = req.user;
            
            res.json({
                success: true,
                data: {
                    userId: user.userId,
                    username: user.username,
                    role: user.role,
                    fullName: user.fullName
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // 创建电子签名
    async createElectronicSignature(req, res) {
        try {
            const signatureData = req.body;
            const user = req.user;

            // 检查签名权限
            if (!this.permissionMiddleware.canCreateElectronicSignature(user.userId, signatureData.action)) {
                return res.status(403).json({
                    error: '无权限创建此类型的电子签名'
                });
            }

            // 这里实现创建电子签名的逻辑
            
            res.json({
                success: true,
                message: '电子签名创建成功'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // 获取设备列表
    async getDevices(req, res) {
        try {
            res.json({
                success: true,
                data: [
                    {
                        id: 'device-1',
                        name: '主检测器',
                        status: 'active',
                        lastCalibration: '2025-12-01'
                    }
                ]
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // 校准设备
    async calibrateDevice(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            
            res.json({
                success: true,
                message: `设备 ${id} 校准完成`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ============ 辅助方法 ============

    /**
     * 启动服务器
     */
    start(port = 3000) {
        this.dbManager.initialize();
        
        this.app.listen(port, () => {
            console.log(`🚀 权限验证中间件示例服务器启动成功`);
            console.log(`📍 服务地址: http://localhost:${port}`);
            console.log(`🔐 支持三级权限系统: OPERATOR, SUPERVISOR, ADMIN`);
            console.log(`📋 符合 CFR 21 Part 11 审计追踪要求`);
            console.log('\n📝 可用API端点:');
            console.log('   POST /api/auth/login - 用户登录');
            console.log('   POST /api/auth/refresh - 刷新令牌');
            console.log('   POST /api/auth/logout - 用户登出');
            console.log('   POST /api/analyses - 创建分析 (OPERATOR)');
            console.log('   GET /api/analyses/my - 查看我的分析 (OPERATOR)');
            console.log('   GET /api/analyses/all - 查看所有分析 (SUPERVISOR)');
            console.log('   PUT /api/analyses/:id/approve - 批准分析 (SUPERVISOR)');
            console.log('   POST /api/users - 创建用户 (ADMIN)');
            console.log('   PUT /api/system/config - 系统配置 (ADMIN)');
            console.log('   GET /api/profile - 获取个人信息');
            console.log('   POST /api/signatures - 创建电子签名');
            console.log('   GET /api/devices - 获取设备列表 (OPERATOR)');
            console.log('   POST /api/devices/:id/calibrate - 校准设备 (SUPERVISOR)');
        });
    }
}

// 如果直接运行此文件，则启动示例服务器
if (require.main === module) {
    const example = new PermissionMiddlewareExample();
    example.start(3000);
}

module.exports = PermissionMiddlewareExample;