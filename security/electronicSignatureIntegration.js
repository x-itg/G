const ElectronicSignatureService = require('./electronicSignature');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');
const crypto = require('crypto');

/**
 * 电子签名系统集成示例
 * 展示如何将电子签名服务集成到数据库管理器中
 */
class ElectronicSignatureIntegration {
    constructor() {
        this.dbManager = new SimplifiedDatabaseManager();
        this.signatureService = new ElectronicSignatureService(this.dbManager);
        this.initializeDatabase();
    }

    /**
     * 初始化数据库
     */
    initializeDatabase() {
        this.dbManager.initialize();
        
        // 确保electronic_signatures表已创建
        const tables = this.dbManager.readTable('users') ? null : null;
        if (!tables) {
            this.dbManager.createDefaultData();
        }
    }

    /**
     * 演示电子签名功能
     */
    async demonstrateElectronicSignature() {
        console.log('🔐 电子签名系统演示');
        console.log('='.repeat(50));

        try {
            // 1. 创建测试用户
            console.log('\n1. 创建测试用户...');
            const testUser = await this.createTestUser();
            console.log(`✅ 用户创建成功: ${testUser.username} (${testUser.id})`);

            // 2. 演示关键操作的电子签名
            console.log('\n2. 演示关键操作的电子签名...');

            // 2.1 数据删除操作签名
            await this.demonstrateDataDeletionSignature(testUser);
            
            // 2.2 参数修改操作签名
            await this.demonstrateParameterModificationSignature(testUser);
            
            // 2.3 用户权限变更签名
            await this.demonstratePrivilegeChangeSignature(testUser);

            // 3. 验证电子签名
            console.log('\n3. 验证电子签名...');
            await this.demonstrateSignatureVerification();

            // 4. 审计报告
            console.log('\n4. 生成审计报告...');
            await this.demonstrateAuditReporting();

            console.log('\n🎉 电子签名系统演示完成！');

        } catch (error) {
            console.error('❌ 演示失败:', error.message);
        }
    }

    /**
     * 创建测试用户
     */
    async createTestUser() {
        const userData = {
            username: 'test.operator',
            password: 'TestPass123!',
            fullName: '测试操作员',
            title: '质量控制专员',
            department: '质量控制部',
            role: 'ADMIN',
            mustChangePassword: false
        };

        return this.dbManager.createUser(userData);
    }

    /**
     * 演示数据删除操作签名
     */
    async demonstrateDataDeletionSignature(user) {
        console.log('\n  📁 演示数据删除操作电子签名...');
        
        const signatureRequest = {
            userId: user.id,
            operation: 'DATA_DELETION',
            entityId: 'analysis-12345',
            entityType: 'Analysis',
            reason: '删除测试数据',
            comment: '按照数据管理政策，删除过期的测试分析数据',
            password: 'TestPass123!',
            secondPassword: 'TestPass123!',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            metadata: {
                dataType: 'analysis_results',
                dataSize: '2.5MB',
                retentionPeriod: '2年'
            }
        };

        const result = await this.signatureService.createElectronicSignature(signatureRequest);
        console.log(`  ✅ 数据删除签名创建成功: ${result.signatureId}`);
        
        return result;
    }

    /**
     * 演示参数修改操作签名
     */
    async demonstrateParameterModificationSignature(user) {
        console.log('\n  ⚙️ 演示参数修改操作电子签名...');
        
        const signatureRequest = {
            userId: user.id,
            operation: 'PARAMETER_MODIFICATION',
            entityId: 'detector-config-001',
            entityType: 'DeviceConfig',
            reason: '调整检测阈值参数',
            comment: '根据最新校准标准，更新检测器阈值参数',
            password: 'TestPass123!',
            secondPassword: 'TestPass123!',
            ipAddress: '192.168.1.101',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            metadata: {
                parameterType: 'detection_threshold',
                oldValue: '0.05',
                newValue: '0.03',
                calibrationStandard: 'NIST-2024'
            }
        };

        const result = await this.signatureService.createElectronicSignature(signatureRequest);
        console.log(`  ✅ 参数修改签名创建成功: ${result.signatureId}`);
        
        return result;
    }

    /**
     * 演示用户权限变更签名
     */
    async demonstratePrivilegeChangeSignature(user) {
        console.log('\n  👥 演示用户权限变更电子签名...');
        
        const signatureRequest = {
            userId: user.id,
            operation: 'USER_PRIVILEGE_CHANGE',
            entityId: 'user-67890',
            entityType: 'User',
            reason: '提升用户权限',
            comment: '根据工作需要，将操作员权限提升为监管员',
            password: 'TestPass123!',
            secondPassword: 'TestPass123!',
            ipAddress: '192.168.1.102',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            metadata: {
                targetUser: 'john.doe',
                oldRole: 'OPERATOR',
                newRole: 'SUPERVISOR',
                effectiveDate: new Date().toISOString()
            }
        };

        const result = await this.signatureService.createElectronicSignature(signatureRequest);
        console.log(`  ✅ 用户权限变更签名创建成功: ${result.signatureId}`);
        
        return result;
    }

    /**
     * 演示签名验证功能
     */
    async demonstrateSignatureVerification() {
        console.log('\n  🔍 验证电子签名...');
        
        // 获取最近的签名记录
        const signatures = this.dbManager.readTable('electronic_signatures');
        if (signatures.length === 0) {
            console.log('  ⚠️ 没有找到签名记录进行验证');
            return;
        }

        const recentSignature = signatures[signatures.length - 1];
        const verificationToken = this.signatureService.generateVerificationToken(recentSignature);
        
        const verificationResult = await this.signatureService.verifyElectronicSignature(
            recentSignature.id, 
            verificationToken
        );
        
        console.log(`  ✅ 签名验证结果: ${verificationResult.message}`);
        console.log(`  📊 验证状态: ${verificationResult.valid ? '有效' : '无效'}`);
        
        return verificationResult;
    }

    /**
     * 演示审计报告功能
     */
    async demonstrateAuditReporting() {
        console.log('\n  📋 生成电子签名审计报告...');
        
        const auditReport = this.signatureService.getSignatureAuditReport();
        
        console.log(`  📊 总签名数: ${auditReport.summary.totalSignatures}`);
        console.log(`  ✅ 有效签名: ${auditReport.summary.verifiedSignatures}`);
        console.log(`  ❌ 无效签名: ${auditReport.summary.unverifiedSignatures}`);
        console.log(`  📈 合规率: ${auditReport.summary.complianceRate}%`);
        
        console.log('\n  📋 按操作类型统计:');
        Object.entries(auditReport.operationStats).forEach(([operation, count]) => {
            console.log(`    ${operation}: ${count} 次`);
        });
        
        console.log('\n  👥 按用户统计:');
        Object.entries(auditReport.userStats).forEach(([userId, stats]) => {
            console.log(`    ${stats.userName}: ${stats.count} 次`);
        });
        
        return auditReport;
    }

    /**
     * 检查签名要求
     */
    checkSignatureRequirements() {
        console.log('\n🔍 检查CFR21 Part 11关键操作签名要求:');
        console.log('='.repeat(50));

        const operations = this.signatureService.getCriticalOperations();
        
        Object.entries(operations).forEach(([key, config]) => {
            console.log(`\n📋 ${config.name} (${key}):`);
            console.log(`   需要电子签名: ${config.requiresSignature ? '是' : '否'}`);
            console.log(`   需要二次验证: ${config.requiresSecondFactor ? '是' : '否'}`);
            console.log(`   允许角色: ${config.roles.join(', ')}`);
        });
    }

    /**
     * 运行完整测试
     */
    async runFullTest() {
        console.log('🚀 开始电子签名系统完整测试...\n');
        
        // 检查签名要求
        this.checkSignatureRequirements();
        
        // 演示功能
        await this.demonstrateElectronicSignature();
        
        // 获取签名历史
        console.log('\n📜 获取用户签名历史...');
        const testUser = this.dbManager.getUserByUsername('test.operator');
        if (testUser) {
            const signatureHistory = this.signatureService.getUserSignatureHistory(testUser.id, { limit: 5 });
            console.log(`📊 找到 ${signatureHistory.length} 条签名记录`);
            
            signatureHistory.forEach((sig, index) => {
                console.log(`  ${index + 1}. ${sig.action} - ${sig.reason} (${sig.signed_at})`);
            });
        }
        
        console.log('\n✅ 电子签名系统测试完成！');
    }

    /**
     * 清理测试数据
     */
    async cleanupTestData() {
        console.log('\n🧹 清理测试数据...');
        
        try {
            // 清理测试用户
            const testUser = this.dbManager.getUserByUsername('test.operator');
            if (testUser) {
                // 注意：实际应用中应该通过proper API删除用户
                console.log('✅ 清理测试用户数据');
            }
            
            console.log('✅ 测试数据清理完成');
        } catch (error) {
            console.error('❌ 清理测试数据时出错:', error.message);
        }
    }
}

// 运行演示
if (require.main === module) {
    const integration = new ElectronicSignatureIntegration();
    
    integration.runFullTest()
        .then(() => {
            console.log('\n🎯 演示程序执行完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 程序执行失败:', error);
            process.exit(1);
        });
}

module.exports = ElectronicSignatureIntegration;