const ElectronicSignatureService = require('./electronicSignature');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');

/**
 * 电子签名系统测试套件
 * 验证CFR21 Part 11合规功能
 */
class ElectronicSignatureTestSuite {
    constructor() {
        this.dbManager = new SimplifiedDatabaseManager();
        this.signatureService = new ElectronicSignatureService(this.dbManager);
        this.testResults = [];
        this.initializeDatabase();
    }

    /**
     * 初始化数据库
     */
    initializeDatabase() {
        this.dbManager.initialize();
        console.log('📂 数据库初始化完成');
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🧪 开始电子签名系统测试\n');
        console.log('='.repeat(60));

        // 1. 基础功能测试
        await this.testBasicFunctionality();
        
        // 2. CFR21 Part 11合规测试
        await this.testCFR21Compliance();
        
        // 3. 安全性测试
        await this.testSecurityFeatures();
        
        // 4. 审计功能测试
        await this.testAuditFeatures();
        
        // 5. 集成测试
        await this.testIntegration();
        
        // 显示测试结果
        this.displayTestResults();
    }

    /**
     * 测试基础功能
     */
    async testBasicFunctionality() {
        console.log('\n📋 测试基础功能');
        console.log('-'.repeat(30));
        
        try {
            // 创建测试用户
            const testUser = await this.createTestUser();
            this.logTestResult('CREATE_TEST_USER', true, `用户创建成功: ${testUser.username}`);
            
            // 测试签名创建
            const signatureRequest = {
                userId: testUser.id,
                operation: 'DATA_DELETION',
                entityId: 'test-entity-001',
                entityType: 'TestEntity',
                reason: '测试数据删除',
                comment: '这是测试评论',
                password: 'TestPass123!',
                secondPassword: 'TestPass123!',
                ipAddress: '127.0.0.1',
                userAgent: 'TestAgent/1.0',
                metadata: { test: true }
            };

            const signature = await this.signatureService.createElectronicSignature(signatureRequest);
            this.logTestResult('CREATE_SIGNATURE', true, `签名创建成功: ${signature.signatureId}`);
            
            // 测试签名验证
            const verificationToken = this.signatureService.generateVerificationToken(signature.signatureRecord);
            const verification = await this.signatureService.verifyElectronicSignature(
                signature.signatureId, 
                verificationToken
            );
            this.logTestResult('VERIFY_SIGNATURE', verification.valid, `签名验证: ${verification.message}`);

            // 测试签名历史获取
            const history = this.signatureService.getUserSignatureHistory(testUser.id, { limit: 10 });
            this.logTestResult('GET_SIGNATURE_HISTORY', history.length > 0, `获取到 ${history.length} 条签名记录`);

        } catch (error) {
            this.logTestResult('BASIC_FUNCTIONALITY', false, `基础功能测试失败: ${error.message}`);
        }
    }

    /**
     * 测试CFR21 Part 11合规功能
     */
    async testCFR21Compliance() {
        console.log('\n📜 测试CFR21 Part 11合规功能');
        console.log('-'.repeat(30));
        
        try {
            const testUser = await this.createTestUser();
            
            // 测试关键操作签名要求
            const criticalOperations = ['DATA_DELETION', 'PARAMETER_MODIFICATION', 'USER_PRIVILEGE_CHANGE'];
            
            for (const operation of criticalOperations) {
                const requirement = this.signatureService.checkSignatureRequirement(operation, testUser.role);
                this.logTestResult(
                    `SIGNATURE_REQUIREMENT_${operation}`, 
                    requirement.requiresSignature, 
                    `${operation} 签名要求: ${requirement.requiresSignature ? '需要' : '不需要'}`
                );
            }
            
            // 测试双重身份验证
            try {
                const invalidSignature = {
                    userId: testUser.id,
                    operation: 'DATA_DELETION',
                    entityId: 'test-entity-002',
                    entityType: 'TestEntity',
                    reason: '测试双重验证',
                    comment: '测试评论',
                    password: 'WrongPassword!',
                    ipAddress: '127.0.0.1',
                    userAgent: 'TestAgent/1.0'
                };
                
                await this.signatureService.createElectronicSignature(invalidSignature);
                this.logTestResult('SECOND_FACTOR_VERIFICATION', false, '双重验证应该失败但成功了');
            } catch (error) {
                this.logTestResult('SECOND_FACTOR_VERIFICATION', true, '双重验证正确拒绝无效密码');
            }
            
            // 测试签名字段验证
            try {
                const incompleteSignature = {
                    userId: testUser.id,
                    operation: 'DATA_DELETION',
                    entityId: 'test-entity-003',
                    entityType: 'TestEntity',
                    reason: '', // 空原因，应该失败
                    comment: '测试评论',
                    password: 'TestPass123!',
                    ipAddress: '127.0.0.1',
                    userAgent: 'TestAgent/1.0'
                };
                
                await this.signatureService.createElectronicSignature(incompleteSignature);
                this.logTestResult('FIELD_VALIDATION', false, '字段验证应该失败但成功了');
            } catch (error) {
                this.logTestResult('FIELD_VALIDATION', true, '字段验证正确拒绝不完整的签名');
            }

            // 测试数字签名完整性
            const signatures = this.dbManager.readTable('electronic_signatures');
            if (signatures.length > 0) {
                const latestSignature = signatures[signatures.length - 1];
                const integrityCheck = this.signatureService.validateSignatureIntegrity(latestSignature);
                this.logTestResult('SIGNATURE_INTEGRITY', integrityCheck.valid, `完整性检查: ${integrityCheck.reason}`);
            }

        } catch (error) {
            this.logTestResult('CFR21_COMPLIANCE', false, `CFR21合规测试失败: ${error.message}`);
        }
    }

    /**
     * 测试安全功能
     */
    async testSecurityFeatures() {
        console.log('\n🔒 测试安全功能');
        console.log('-'.repeat(30));
        
        try {
            const testUser = await this.createTestUser();
            
            // 测试签名超时
            const oldSignature = {
                userId: testUser.id,
                operation: 'DATA_DELETION',
                entityId: 'test-entity-004',
                entityType: 'TestEntity',
                reason: '测试超时',
                comment: '测试评论',
                password: 'TestPass123!',
                ipAddress: '127.0.0.1',
                userAgent: 'TestAgent/1.0'
            };
            
            // 模拟创建过期签名（修改signed_at时间）
            const signature = await this.signatureService.createElectronicSignature(oldSignature);
            const signatures = this.dbManager.readTable('electronic_signatures');
            const expiredSignature = signatures.find(sig => sig.id === signature.signatureId);
            
            if (expiredSignature) {
                expiredSignature.signed_at = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10分钟前
                this.dbManager.updateRecord('electronic_signatures', signature.signatureId, expiredSignature);
            }
            
            const verificationToken = this.signatureService.generateVerificationToken(expiredSignature);
            try {
                await this.signatureService.verifyElectronicSignature(signature.signatureId, verificationToken);
                this.logTestResult('SIGNATURE_TIMEOUT', false, '过期签名验证应该失败但成功了');
            } catch (error) {
                this.logTestResult('SIGNATURE_TIMEOUT', true, '过期签名正确被拒绝');
            }
            
            // 测试无效验证令牌
            try {
                await this.signatureService.verifyElectronicSignature(signature.signatureId, 'invalid-token');
                this.logTestResult('INVALID_TOKEN', false, '无效令牌验证应该失败但成功了');
            } catch (error) {
                this.logTestResult('INVALID_TOKEN', true, '无效令牌正确被拒绝');
            }
            
        } catch (error) {
            this.logTestResult('SECURITY_FEATURES', false, `安全功能测试失败: ${error.message}`);
        }
    }

    /**
     * 测试审计功能
     */
    async testAuditFeatures() {
        console.log('\n📊 测试审计功能');
        console.log('-'.repeat(30));
        
        try {
            const testUser = await this.createTestUser();
            
            // 创建一些签名用于审计测试
            for (let i = 0; i < 3; i++) {
                await this.signatureService.createElectronicSignature({
                    userId: testUser.id,
                    operation: 'PARAMETER_MODIFICATION',
                    entityId: `test-entity-${i}`,
                    entityType: 'TestEntity',
                    reason: `审计测试 ${i}`,
                    comment: `审计测试评论 ${i}`,
                    password: 'TestPass123!',
                    ipAddress: '127.0.0.1',
                    userAgent: 'TestAgent/1.0'
                });
            }
            
            // 测试审计报告生成
            const auditReport = this.signatureService.getSignatureAuditReport();
            this.logTestResult('AUDIT_REPORT_GENERATION', 
                auditReport.summary.totalSignatures > 0, 
                `审计报告生成成功，共 ${auditReport.summary.totalSignatures} 个签名`
            );
            
            // 测试审计记录
            const auditRecords = this.dbManager.readTable('signature_audit');
            this.logTestResult('AUDIT_RECORD_CREATION', 
                auditRecords.length > 0, 
                `审计记录创建成功，共 ${auditRecords.length} 条记录`
            );
            
        } catch (error) {
            this.logTestResult('AUDIT_FEATURES', false, `审计功能测试失败: ${error.message}`);
        }
    }

    /**
     * 测试集成功能
     */
    async testIntegration() {
        console.log('\n🔗 测试集成功能');
        console.log('-'.repeat(30));
        
        try {
            const testUser = await this.createTestUser();
            
            // 测试与数据库管理器的集成
            const signature = await this.signatureService.createElectronicSignature({
                userId: testUser.id,
                operation: 'SYSTEM_CONFIG_CHANGE',
                entityId: 'config-001',
                entityType: 'SystemConfig',
                reason: '集成测试',
                comment: '测试数据库集成',
                password: 'TestPass123!',
                ipAddress: '127.0.0.1',
                userAgent: 'TestAgent/1.0'
            });
            
            // 验证签名记录是否正确存储
            const signatures = this.dbManager.readTable('electronic_signatures');
            const storedSignature = signatures.find(sig => sig.id === signature.signatureId);
            this.logTestResult('DATABASE_INTEGRATION', 
                storedSignature !== undefined, 
                `数据库集成成功，签名记录已存储`
            );
            
            // 测试审计日志记录
            const auditLogs = this.dbManager.getAuditEvents({ action: 'CREATE_ELECTRONIC_SIGNATURE' });
            this.logTestResult('AUDIT_LOG_INTEGRATION', 
                auditLogs.length > 0, 
                `审计日志集成成功，共 ${auditLogs.length} 条记录`
            );
            
        } catch (error) {
            this.logTestResult('INTEGRATION', false, `集成测试失败: ${error.message}`);
        }
    }

    /**
     * 创建测试用户
     */
    async createTestUser() {
        const timestamp = Date.now();
        const userData = {
            username: `test.user.${timestamp}`,
            password: 'TestPass123!',
            fullName: `测试用户 ${timestamp}`,
            title: '测试专员',
            department: '测试部门',
            role: 'ADMIN',
            mustChangePassword: false
        };

        return this.dbManager.createUser(userData);
    }

    /**
     * 记录测试结果
     */
    logTestResult(testName, passed, message) {
        this.testResults.push({
            name: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
    }

    /**
     * 显示测试结果
     */
    displayTestResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 测试结果汇总');
        console.log('='.repeat(60));
        
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const successRate = ((passed / total) * 100).toFixed(1);
        
        console.log(`总测试数: ${total}`);
        console.log(`通过测试: ${passed}`);
        console.log(`失败测试: ${total - passed}`);
        console.log(`成功率: ${successRate}%`);
        
        console.log('\n📋 详细结果:');
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.name}: ${result.message}`);
        });
        
        if (passed === total) {
            console.log('\n🎉 所有测试通过！电子签名系统运行正常。');
        } else {
            console.log('\n⚠️ 部分测试失败，请检查系统配置。');
        }
    }

    /**
     * 清理测试数据
     */
    async cleanup() {
        console.log('\n🧹 清理测试数据...');
        
        try {
            // 清理测试用户和签名
            const users = this.dbManager.readTable('users');
            const testUsers = users.filter(user => user.username.startsWith('test.user.'));
            
            testUsers.forEach(user => {
                // 删除用户的签名记录
                const signatures = this.dbManager.readTable('electronic_signatures');
                const userSignatures = signatures.filter(sig => sig.user_id === user.id);
                userSignatures.forEach(sig => {
                    this.dbManager.updateRecord('electronic_signatures', sig.id, { deleted: true });
                });
            });
            
            console.log('✅ 测试数据清理完成');
        } catch (error) {
            console.error('❌ 清理测试数据时出错:', error.message);
        }
    }
}

// 运行测试
if (require.main === module) {
    const testSuite = new ElectronicSignatureTestSuite();
    
    testSuite.runAllTests()
        .then(() => testSuite.cleanup())
        .then(() => {
            console.log('\n🏁 测试套件执行完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 测试套件执行失败:', error);
            process.exit(1);
        });
}

module.exports = ElectronicSignatureTestSuite;