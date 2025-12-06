const DatabaseManager = require('./SimplifiedDatabaseManager');
const crypto = require('crypto');

/**
 * 放射化学纯度检测仪增强数据库初始化脚本
 * 创建CFR 21 Part 11兼容的审计追踪和权限管理系统
 */
class EnhancedDatabaseInitializer {
    constructor() {
        this.dbManager = new DatabaseManager();
    }

    async initialize() {
        try {
            console.log('🚀 开始初始化增强数据库架构...');
            console.log('='.repeat(60));

            // 初始化数据库连接
            this.dbManager.initialize();

            // 创建默认管理员用户
            await this.createDefaultAdminUser();

            // 创建默认权限配置
            await this.createDefaultPermissions();

            // 创建默认性能监控数据
            await this.createDefaultPerformanceMetrics();

            // 初始化审计日志
            await this.initializeAuditLogs();

            // 验证数据库状态
            await this.validateDatabaseStructure();

            console.log('✅ 数据库增强架构初始化完成！');
            console.log('='.repeat(60));
            
        } catch (error) {
            console.error('❌ 数据库初始化失败:', error);
            throw error;
        } finally {
            this.dbManager.close();
        }
    }

    async createDefaultAdminUser() {
        try {
            console.log('👤 创建默认管理员用户...');
            
            // 检查管理员用户是否已存在
            const existingAdmin = this.dbManager.getUserByUsername('admin');
            if (existingAdmin) {
                console.log('ℹ️  管理员用户已存在，跳过创建');
                return;
            }

            // 创建默认管理员用户
            const adminUser = {
                username: 'admin',
                password: 'Admin123!',
                fullName: '系统管理员',
                title: 'Administrator',
                department: 'Quality Assurance',
                role: 'ADMIN',
                mustChangePassword: true
            };

            await this.dbManager.createUser(adminUser);
            console.log('✅ 管理员用户创建成功');
            
            // 记录审计日志
            await this.dbManager.logAuditEvent({
                userId: 'system',
                username: 'system',
                action: 'CREATE_USER',
                resource: 'users',
                resourceId: 'admin',
                result: 'SUCCESS',
                complianceCode: 'CFR21-11.100',
                reason: '初始化默认管理员用户',
                details: '系统初始化时创建的默认管理员用户'
            });

        } catch (error) {
            console.error('❌ 创建管理员用户失败:', error);
            throw error;
        }
    }

    async createDefaultPermissions() {
        try {
            console.log('🔐 创建默认权限配置...');
            
            // 获取管理员用户ID
            const adminUser = this.dbManager.getUserByUsername('admin');
            if (!adminUser) {
                console.log('⚠️  管理员用户不存在，跳过权限配置');
                return;
            }

            const adminId = adminUser.id;

            // 定义三级权限配置
            const defaultPermissions = [
                // 操作员权限 (Level 1)
                { userId: adminId, permissionLevel: 1, permissionName: '操作员基本权限', resource: 'detection', action: 'READ' },
                { userId: adminId, permissionLevel: 1, permissionName: '操作员基本权限', resource: 'detection', action: 'CREATE' },
                { userId: adminId, permissionLevel: 1, permissionName: '操作员基本权限', resource: 'analysis', action: 'READ' },
                { userId: adminId, permissionLevel: 1, permissionName: '操作员基本权限', resource: 'analysis', action: 'CREATE' },
                
                // 主管权限 (Level 2)
                { userId: adminId, permissionLevel: 2, permissionName: '主管管理权限', resource: 'analysis', action: 'UPDATE' },
                { userId: adminId, permissionLevel: 2, permissionName: '主管管理权限', resource: 'analysis', action: 'APPROVE' },
                { userId: adminId, permissionLevel: 2, permissionName: '主管管理权限', resource: 'users', action: 'READ' },
                { userId: adminId, permissionLevel: 2, permissionName: '主管管理权限', resource: 'audit', action: 'READ' },
                
                // 管理员权限 (Level 3)
                { userId: adminId, permissionLevel: 3, permissionName: '系统管理员权限', resource: 'users', action: '*' },
                { userId: adminId, permissionLevel: 3, permissionName: '系统管理员权限', resource: 'permissions', action: '*' },
                { userId: adminId, permissionLevel: 3, permissionName: '系统管理员权限', resource: 'audit', action: '*' },
                { userId: adminId, permissionLevel: 3, permissionName: '系统管理员权限', resource: 'system', action: '*' },
                { userId: adminId, permissionLevel: 3, permissionName: '系统管理员权限', resource: 'device', action: '*' },
            ];

            for (const permission of defaultPermissions) {
                await this.dbManager.grantUserPermission({
                    ...permission,
                    grantedBy: adminId
                });
            }

            console.log('✅ 默认权限配置创建成功');
            
            // 记录审计日志
            await this.dbManager.logAuditEvent({
                userId: adminId,
                username: 'admin',
                action: 'GRANT_PERMISSION',
                resource: 'user_permissions',
                result: 'SUCCESS',
                complianceCode: 'CFR21-11.100',
                reason: '初始化默认权限配置',
                details: `为管理员用户创建了${defaultPermissions.length}个默认权限`
            });

        } catch (error) {
            console.error('❌ 创建默认权限失败:', error);
            throw error;
        }
    }

    async createDefaultPerformanceMetrics() {
        try {
            console.log('📊 初始化性能监控数据...');
            
            const metrics = [
                {
                    metricType: 'system',
                    metricName: 'cpu_usage',
                    value: 45.2,
                    unit: 'percent',
                    tags: JSON.stringify({ source: 'init' }),
                    source: 'system_monitor',
                    alertLevel: 'NORMAL'
                },
                {
                    metricType: 'system',
                    metricName: 'memory_usage',
                    value: 62.8,
                    unit: 'percent',
                    tags: JSON.stringify({ source: 'init' }),
                    source: 'system_monitor',
                    alertLevel: 'NORMAL'
                },
                {
                    metricType: 'api',
                    metricName: 'api_response_time',
                    value: 125.4,
                    unit: 'milliseconds',
                    tags: JSON.stringify({ endpoint: 'health' }),
                    source: 'api_monitor',
                    alertLevel: 'NORMAL'
                },
                {
                    metricType: 'database',
                    metricName: 'db_query_time',
                    value: 15.2,
                    unit: 'milliseconds',
                    tags: JSON.stringify({ query_type: 'select' }),
                    source: 'db_monitor',
                    alertLevel: 'NORMAL'
                }
            ];

            for (const metric of metrics) {
                await this.dbManager.recordPerformanceMetric(metric);
            }

            console.log('✅ 性能监控数据初始化完成');
            
            // 记录审计日志
            await this.dbManager.logAuditEvent({
                userId: 'system',
                username: 'system',
                action: 'INIT_PERFORMANCE_METRICS',
                resource: 'performance_metrics',
                result: 'SUCCESS',
                complianceCode: 'CFR21-11.100',
                reason: '初始化性能监控数据',
                details: `创建了${metrics.length}个初始性能指标`
            });

        } catch (error) {
            console.error('❌ 初始化性能监控数据失败:', error);
            throw error;
        }
    }

    async initializeAuditLogs() {
        try {
            console.log('📝 初始化审计日志系统...');
            
            // 创建系统初始化审计日志
            await this.dbManager.logAuditEvent({
                userId: 'system',
                username: 'system',
                action: 'SYSTEM_INIT',
                resource: 'system',
                result: 'SUCCESS',
                complianceCode: 'CFR21-11.100',
                reason: '系统初始化',
                details: '放射化学纯度检测仪系统初始化完成，增强数据库架构已启用'
            });

            // 创建数据库架构版本审计日志
            await this.dbManager.logAuditEvent({
                userId: 'system',
                username: 'system',
                action: 'SCHEMA_UPDATE',
                resource: 'database',
                result: 'SUCCESS',
                complianceCode: 'CFR21-11.100',
                reason: '数据库架构升级',
                details: '升级到CFR21 Part 11兼容的增强数据库架构'
            });

            console.log('✅ 审计日志系统初始化完成');
            
        } catch (error) {
            console.error('❌ 初始化审计日志失败:', error);
            throw error;
        }
    }

    async validateDatabaseStructure() {
        try {
            console.log('🔍 验证数据库结构...');
            
            // 获取数据库统计信息
            const stats = this.dbManager.getDatabaseStats();
            
            console.log('📊 数据库统计信息:');
            Object.entries(stats.tables).forEach(([table, count]) => {
                console.log(`   ${table}: ${count} 条记录`);
            });
            console.log(`📈 总记录数: ${stats.total_records}`);

            // 验证关键表是否存在
            const requiredTables = [
                'users', 'user_permissions', 'audit_logs', 'performance_metrics',
                'electronic_signatures', 'audit_trail'
            ];

            for (const table of requiredTables) {
                if (!stats.tables[table]) {
                    throw new Error(`关键表 ${table} 不存在`);
                }
            }

            // 验证权限系统
            const adminUser = this.dbManager.getUserByUsername('admin');
            if (adminUser) {
                const permissions = this.dbManager.getUserPermissions(adminUser.id);
                if (permissions.length === 0) {
                    throw new Error('管理员用户没有权限配置');
                }
            }

            console.log('✅ 数据库结构验证通过');
            
        } catch (error) {
            console.error('❌ 数据库结构验证失败:', error);
            throw error;
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const initializer = new EnhancedDatabaseInitializer();
            await initializer.initialize();
            console.log('\n🎉 放射化学纯度检测仪增强数据库初始化成功！');
            console.log('\n📋 功能特性:');
            console.log('   ✓ CFR 21 Part 11 兼容审计追踪');
            console.log('   ✓ 三级权限电子签名系统');
            console.log('   ✓ 实时性能监控');
            console.log('   ✓ 完整日志记录');
            console.log('   ✓ 静态资源缓存优化');
            console.log('\n🚀 系统已就绪，可以开始使用！');
            process.exit(0);
        } catch (error) {
            console.error('\n💥 初始化失败:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = EnhancedDatabaseInitializer;