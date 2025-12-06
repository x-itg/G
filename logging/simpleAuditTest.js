const { AuditLogger } = require('./auditLogger');

/**
 * 简化的审计日志系统测试
 * 只测试核心功能，不依赖复杂的数据库操作
 */
class SimpleAuditTest {
    constructor() {
        this.testResults = [];
        this.auditLogger = null;
    }

    /**
     * 运行简化的测试
     */
    async runSimpleTests() {
        console.log('🧪 开始简化的审计日志系统测试...\n');
        
        try {
            await this.testBasicLogging();
            await this.testDataValidation();
            await this.testSeverityLevels();
            await this.testHashCalculation();
            
            this.printTestResults();
        } catch (error) {
            console.error('❌ 测试过程中发生错误:', error);
        }
    }

    /**
     * 测试基本日志记录
     */
    async testBasicLogging() {
        console.log('📝 测试基本日志记录...');
        
        try {
            // 模拟数据库管理器
            const mockDbManager = {
                async logAuditEvent(auditData) {
                    console.log('模拟写入审计记录:', auditData.id);
                    return auditData.id;
                },
                getAuditEvents(filters = {}) {
                    return [];
                }
            };
            
            this.auditLogger = new AuditLogger(mockDbManager, {
                batchSize: 5,
                batchTimeout: 1000,
                enableHashChain: true
            });
            
            const auditData = {
                user_id: 'test-user-1',
                username: 'testuser',
                action: 'CREATE',
                resource: 'test_resource',
                details: '测试创建操作',
                result: 'success',
                severity: 'info',
                tags: ['test', 'basic']
            };
            
            const auditId = await this.auditLogger.log(auditData);
            
            this.addTestResult('基本日志记录', true, `审计ID: ${auditId}`);
        } catch (error) {
            this.addTestResult('基本日志记录', false, error.message);
        }
    }

    /**
     * 测试数据验证
     */
    async testDataValidation() {
        console.log('✅ 测试数据验证...');
        
        try {
            // 测试有效数据
            const validData = {
                username: 'testuser',
                action: 'CREATE',
                resource: 'test'
            };
            
            // 这应该成功
            const auditLogger = this.auditLogger;
            const validated = auditLogger.validateAuditData(validData);
            
            if (validated.username === 'testuser' && validated.action === 'CREATE') {
                this.addTestResult('数据验证', true, '有效数据验证通过');
            } else {
                this.addTestResult('数据验证', false, '数据验证失败');
            }
            
            // 测试无效数据（缺少必需字段）
            try {
                const invalidData = {
                    action: 'CREATE',
                    resource: 'test'
                };
                auditLogger.validateAuditData(invalidData);
                this.addTestResult('无效数据验证', false, '应该拒绝无效数据');
            } catch (error) {
                this.addTestResult('无效数据验证', true, '正确拒绝了无效数据');
            }
            
        } catch (error) {
            this.addTestResult('数据验证', false, error.message);
        }
    }

    /**
     * 测试严重性级别
     */
    async testSeverityLevels() {
        console.log('⚠️  测试严重性级别...');
        
        try {
            const auditLogger = this.auditLogger;
            
            // 测试不同操作的严重性
            const deleteSeverity = auditLogger.determineSeverity('DELETE');
            const createSeverity = auditLogger.determineSeverity('CREATE');
            const loginSeverity = auditLogger.determineSeverity('LOGIN');
            
            if (deleteSeverity === 'error' && 
                createSeverity === 'info' && 
                loginSeverity === 'info') {
                this.addTestResult('严重性级别', true, '严重性级别计算正确');
            } else {
                this.addTestResult('严重性级别', false, '严重性级别计算错误');
            }
            
        } catch (error) {
            this.addTestResult('严重性级别', false, error.message);
        }
    }

    /**
     * 测试哈希计算
     */
    async testHashCalculation() {
        console.log('🔐 测试哈希计算...');
        
        try {
            const auditLogger = this.auditLogger;
            
            const testRecord = {
                id: 'test-123',
                user_id: 'user-456',
                action: 'TEST_ACTION',
                resource: 'test_resource',
                timestamp: new Date().toISOString(),
                previous_hash: null
            };
            
            const hash = auditLogger.calculateRecordHash(testRecord);
            
            if (hash && hash.length === 64) { // SHA-256 hash is 64 characters
                this.addTestResult('哈希计算', true, `哈希长度: ${hash.length}`);
            } else {
                this.addTestResult('哈希计算', false, '哈希计算失败');
            }
            
        } catch (error) {
            this.addTestResult('哈希计算', false, error.message);
        }
    }

    /**
     * 添加测试结果
     */
    addTestResult(testName, success, message) {
        this.testResults.push({
            name: testName,
            success,
            message
        });
        
        const status = success ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
    }

    /**
     * 打印测试结果摘要
     */
    printTestResults() {
        console.log('\n📋 测试结果摘要:');
        console.log('='.repeat(50));
        
        const passed = this.testResults.filter(r => r.success).length;
        const total = this.testResults.length;
        
        this.testResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.name}: ${result.message}`);
        });
        
        console.log('='.repeat(50));
        console.log(`🎯 测试通过率: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
        
        if (passed === total) {
            console.log('🎉 所有核心功能测试通过！审计日志系统核心功能正常。');
        } else {
            console.log('⚠️  部分测试失败，请检查相关功能。');
        }
    }
}

// 运行简化测试
if (require.main === module) {
    const test = new SimpleAuditTest();
    
    test.runSimpleTests().catch(error => {
        console.error('测试失败:', error);
    });
}

module.exports = SimpleAuditTest;