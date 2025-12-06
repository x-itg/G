const express = require('express');
const path = require('path');

// 导入审计日志系统组件
const { integrateAuditSystem } = require('./logging/auditIntegration');

/**
 * 审计日志系统集成示例
 * 展示如何在现有的放射化学纯度检测仪API服务器中集成审计日志功能
 */
class AuditIntegrationExample {
    constructor() {
        this.app = express();
        this.dbManager = null;
        this.auditIntegration = null;
    }

    /**
     * 初始化集成示例
     */
    async initialize() {
        console.log('🚀 启动审计日志系统集成示例...\n');
        
        try {
            // 1. 初始化数据库管理器
            await this.initializeDatabase();
            
            // 2. 初始化Express应用
            this.initializeExpress();
            
            // 3. 集成审计日志系统
            await this.integrateAuditSystem();
            
            // 4. 设置示例路由
            this.setupExampleRoutes();
            
            // 5. 启动服务器
            this.startServer();
            
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 初始化数据库
     */
    async initializeDatabase() {
        const DatabaseManager = require('./database/SimplifiedDatabaseManager');
        
        this.dbManager = new DatabaseManager();
        this.dbManager.initialize();
        
        console.log('✅ 数据库管理器初始化完成');
    }

    /**
     * 初始化Express应用
     */
    initializeExpress() {
        // 基础中间件
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // CORS设置
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }
            next();
        });
        
        console.log('✅ Express应用初始化完成');
    }

    /**
     * 集成审计日志系统
     */
    async integrateAuditSystem() {
        // 导入权限中间件（如果存在）
        let PermissionMiddleware = null;
        try {
            PermissionMiddleware = require('./middleware/permissionMiddleware');
        } catch (error) {
            console.warn('⚠️  权限中间件未找到，将跳过权限检查');
        }
        
        const permissionMiddleware = PermissionMiddleware ? 
            new PermissionMiddleware(this.dbManager) : null;
        
        // 集成审计日志系统
        this.auditIntegration = integrateAuditSystem(this.dbManager, this.app, {
            enableAutoLogging: true,
            enableHttpMiddleware: true,
            enableRoutes: true,
            enableDecorators: true,
            permissionMiddleware,
            auditLogger: {
                batchSize: 10,           // 测试用小批量
                batchTimeout: 2000,      // 测试用短超时
                enableHashChain: true,
                logLevel: 'INFO',
                enableRealTimeLogging: true
            }
        });
        
        console.log('✅ 审计日志系统集成完成');
    }

    /**
     * 设置示例路由
     */
    setupExampleRoutes() {
        // 健康检查
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                audit_system: 'active'
            });
        });

        // 用户认证示例
        this.setupAuthRoutes();
        
        // 数据操作示例
        this.setupDataRoutes();
        
        // 系统配置示例
        this.setupSystemRoutes();
        
        // 审计日志API（自动可用）
        // - GET /api/logging/audit/search
        // - GET /api/logging/audit/export
        // - POST /api/logging/audit/cleanup
        // - GET /api/logging/audit/statistics
        // - GET /api/logging/audit/validate-chain
        
        console.log('✅ 示例路由设置完成');
    }

    /**
     * 设置认证路由示例
     */
    setupAuthRoutes() {
        // 模拟用户登录
        this.app.post('/api/auth/login', async (req, res) => {
            const { username, password } = req.body;
            
            // 模拟认证逻辑
            const isValid = username && password;
            const user = isValid ? {
                id: `user-${username}`,
                username: username,
                role: 'operator'
            } : null;
            
            if (user) {
                res.json({
                    success: true,
                    token: `token-${Date.now()}`,
                    user: user
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: '认证失败'
                });
            }
        });

        // 模拟用户登出
        this.app.post('/api/auth/logout', (req, res) => {
            res.json({
                success: true,
                message: '已成功登出'
            });
        });
    }

    /**
     * 设置数据操作路由示例
     */
    setupDataRoutes() {
        // 创建样品记录
        this.app.post('/api/samples', async (req, res) => {
            const { name, type, description } = req.body;
            
            // 模拟用户信息
            req.user = {
                id: 'demo-user',
                username: 'demo_operator'
            };
            
            const sample = {
                id: `sample-${Date.now()}`,
                name,
                type,
                description,
                created_at: new Date().toISOString(),
                created_by: req.user.username
            };
            
            // 手动记录审计日志
            await this.auditIntegration.logManualAudit({
                user_id: req.user.id,
                username: req.user.username,
                action: 'CREATE_SAMPLE',
                resource: 'sample',
                resource_id: sample.id,
                details: JSON.stringify({
                    sample_name: name,
                    sample_type: type
                }),
                new_values: JSON.stringify(sample),
                result: 'success',
                severity: 'info',
                tags: ['sample', 'creation']
            });
            
            res.json({
                success: true,
                data: sample
            });
        });

        // 获取样品列表
        this.app.get('/api/samples', (req, res) => {
            // 模拟用户信息
            req.user = {
                id: 'demo-user',
                username: 'demo_operator'
            };
            
            const samples = [
                {
                    id: 'sample-1',
                    name: '样品A',
                    type: 'standard',
                    description: '标准样品',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'sample-2',
                    name: '样品B',
                    type: 'test',
                    description: '测试样品',
                    created_at: new Date().toISOString()
                }
            ];
            
            res.json({
                success: true,
                data: samples
            });
        });

        // 更新样品记录
        this.app.put('/api/samples/:id', async (req, res) => {
            const { id } = req.params;
            const { name, type, description } = req.body;
            
            // 模拟用户信息
            req.user = {
                id: 'demo-user',
                username: 'demo_operator'
            };
            
            const updatedSample = {
                id,
                name,
                type,
                description,
                updated_at: new Date().toISOString(),
                updated_by: req.user.username
            };
            
            // 手动记录审计日志
            await this.auditIntegration.logManualAudit({
                user_id: req.user.id,
                username: req.user.username,
                action: 'UPDATE_SAMPLE',
                resource: 'sample',
                resource_id: id,
                details: JSON.stringify({
                    updated_fields: ['name', 'type', 'description']
                }),
                new_values: JSON.stringify(updatedSample),
                result: 'success',
                severity: 'info',
                tags: ['sample', 'update']
            });
            
            res.json({
                success: true,
                data: updatedSample
            });
        });

        // 删除样品记录
        this.app.delete('/api/samples/:id', async (req, res) => {
            const { id } = req.params;
            
            // 模拟用户信息
            req.user = {
                id: 'demo-user',
                username: 'demo_operator'
            };
            
            // 手动记录审计日志
            await this.auditIntegration.logManualAudit({
                user_id: req.user.id,
                username: req.user.username,
                action: 'DELETE_SAMPLE',
                resource: 'sample',
                resource_id: id,
                details: JSON.stringify({
                    sample_id: id,
                    reason: 'user_request'
                }),
                result: 'success',
                severity: 'warning',
                tags: ['sample', 'deletion']
            });
            
            res.json({
                success: true,
                message: `样品 ${id} 已删除`
            });
        });
    }

    /**
     * 设置系统配置路由示例
     */
    setupSystemRoutes() {
        // 获取系统配置
        this.app.get('/api/system/config', (req, res) => {
            const config = {
                system_name: '放射化学纯度检测仪',
                version: '1.0.0',
                database_path: './database/data',
                audit_enabled: true,
                logging_level: 'INFO'
            };
            
            res.json({
                success: true,
                data: config
            });
        });

        // 更新系统配置
        this.app.put('/api/system/config', async (req, res) => {
            const { logging_level, audit_enabled } = req.body;
            
            // 模拟用户信息
            req.user = {
                id: 'admin-user',
                username: 'admin'
            };
            
            const oldConfig = {
                logging_level: 'INFO',
                audit_enabled: true
            };
            
            const newConfig = {
                logging_level,
                audit_enabled
            };
            
            // 手动记录审计日志
            await this.auditIntegration.logManualAudit({
                user_id: req.user.id,
                username: req.user.username,
                action: 'UPDATE_SYSTEM_CONFIG',
                resource: 'system_config',
                details: JSON.stringify({
                    changed_fields: ['logging_level', 'audit_enabled']
                }),
                old_values: JSON.stringify(oldConfig),
                new_values: JSON.stringify(newConfig),
                result: 'success',
                severity: 'error',
                tags: ['system', 'config', 'critical']
            });
            
            res.json({
                success: true,
                data: newConfig,
                message: '系统配置已更新'
            });
        });
    }

    /**
     * 启动服务器
     */
    startServer() {
        const PORT = process.env.PORT || 3001;
        
        this.app.listen(PORT, () => {
            console.log(`\n🎉 审计日志系统示例服务器已启动`);
            console.log(`📡 服务器地址: http://localhost:${PORT}`);
            console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
            console.log(`📊 审计日志API:`);
            console.log(`   - 搜索日志: GET http://localhost:${PORT}/api/logging/audit/search`);
            console.log(`   - 导出日志: GET http://localhost:${PORT}/api/logging/audit/export`);
            console.log(`   - 获取统计: GET http://localhost:${PORT}/api/logging/audit/statistics`);
            console.log(`   - 验证链: GET http://localhost:${PORT}/api/logging/audit/validate-chain`);
            console.log(`\n📝 测试示例:`);
            console.log(`   - 创建样品: POST http://localhost:${PORT}/api/samples`);
            console.log(`   - 获取样品: GET http://localhost:${PORT}/api/samples`);
            console.log(`   - 更新样品: PUT http://localhost:${PORT}/api/samples/:id`);
            console.log(`   - 删除样品: DELETE http://localhost:${PORT}/api/samples/:id`);
            console.log(`\n💡 提示: 访问任何API都会自动记录审计日志！\n`);
        });
    }

    /**
     * 优雅关闭
     */
    async shutdown() {
        console.log('\n🔄 正在关闭服务器...');
        
        if (this.auditIntegration) {
            await this.auditIntegration.close();
        }
        
        if (this.dbManager) {
            this.dbManager.close();
        }
        
        console.log('✅ 服务器已关闭');
    }
}

// 启动示例
if (require.main === module) {
    const example = new AuditIntegrationExample();
    
    // 优雅关闭处理
    process.on('SIGINT', async () => {
        await example.shutdown();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        await example.shutdown();
        process.exit(0);
    });
    
    example.initialize().catch(error => {
        console.error('启动失败:', error);
        process.exit(1);
    });
}

module.exports = AuditIntegrationExample;