const { AuditLogger } = require('./auditLogger');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');

/**
 * 审计日志系统测试
 * 验证审计日志的各项功能
 */
class AuditLoggerTest {
    constructor() {
        this.dbManager = new SimplifiedDatabaseManager();
        this.auditLogger = new AuditLogger(this.dbManager, {
            batchSize: 5,
            batchTimeout: 1000,
            enableHashChain: true
        });
        this.testResults = [];
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🧪 开始审计日志系统测试...\n');
        
        try {
            // 初始化数据库
            this.dbManager.initialize();
            
            await this.testBasicLogging();
            await this.testBatchLogging();
            await this.testAuditChain();
            await this.testSearchAndFilter();
            await this.testStatistics();
            await this.testExport();
            await this.testCleanup();
            await this.testValidation();
            await this.testMiddleware();
            await this.testDecorator();
            
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
            const auditData = {
                user_id: 'test-user-1',
                username: 'testuser',
                action: 'CREATE',
                resource: 'test_resource',
                resource_id: 'test-123',
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
     * 测试批量日志记录
     */
    async testBatchLogging() {
        console.log('📦 测试批量日志记录...');
        
        try {
            const auditPromises = [];
            
            for (let i = 0; i < 10; i++) {
                const auditData = {
                    user_id: `batch-user-${i}`,
                    username: `batchuser${i}`,
                    action: 'BATCH_OPERATION',
                    resource: 'batch_test',
                    resource_id: `batch-${i}`,
                    details: `批量操作 ${i}`,
                    result: 'success',
                    severity: 'info',
                    tags: ['test', 'batch']
                };
                
                auditPromises.push(this.auditLogger.log(auditData));
            }
            
            await Promise.all(auditPromises);
            await this.auditLogger.flush();
            
            this.addTestResult('批量日志记录', true, '10条批量记录已处理');
        } catch (error) {
            this.addTestResult('批量日志记录', false, error.message);
        }
    }

    /**
     * 测试审计链
     */
    async testAuditChain() {
        console.log('🔗 测试审计链...');
        
        try {
            const validation = this.auditLogger.validateAuditChain();
            
            if (validation.isValid) {
                this.addTestResult('审计链验证', true, `验证通过，共 ${validation.totalRecords} 条记录`);
            } else {
                this.addTestResult('审计链验证', false, `验证失败: ${validation.errors.join(', ')}`);
            }
        } catch (error) {
            this.addTestResult('审计链验证', false, error.message);
        }
    }

    /**
     * 测试搜索和过滤
     */
    async testSearchAndFilter() {
        console.log('🔍 测试搜索和过滤...');
        
        try {
            // 测试按用户过滤
            const userLogs = this.auditLogger.getAuditLogs({
                username: 'testuser'
            });
            
            // 测试按操作类型过滤
            const createLogs = this.auditLogger.getAuditLogs({
                action_type: 'CREATE'
            });
            
            // 测试搜索
            const searchLogs = this.auditLogger.getAuditLogs({
                search: '批量'
            });
            
            // 测试分页
            const pageLogs = this.auditLogger.getAuditLogs({
                page: 1,
                pageSize: 5
            });
            
            this.addTestResult('搜索和过滤', true, 
                `用户过滤: ${userLogs.length}, 操作过滤: ${createLogs.length}, 搜索: ${searchLogs.length}, 分页: ${pageLogs.length}`);
        } catch (error) {
            this.addTestResult('搜索和过滤', false, error.message);
        }
    }

    /**
     * 测试统计功能
     */
    async testStatistics() {
        console.log('📊 测试统计功能...');
        
        try {
            const stats = this.auditLogger.getAuditStatistics();
            
            const requiredFields = ['totalEvents', 'byAction', 'byUser', 'bySeverity', 'byResult'];
            const hasAllFields = requiredFields.every(field => stats.hasOwnProperty(field));
            
            if (hasAllFields && stats.totalEvents > 0) {
                this.addTestResult('统计功能', true, 
                    `总事件: ${stats.totalEvents}, 操作类型: ${Object.keys(stats.byAction).length}`);
            } else {
                this.addTestResult('统计功能', false, '统计结果缺少必要字段或无数据');
            }
        } catch (error) {
            this.addTestResult('统计功能', false, error.message);
        }
    }

    /**
     * 测试导出功能
     */
    async testExport() {
        console.log('📤 测试导出功能...');
        
        try {
            const exportData = this.auditLogger.exportAuditLogs({
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            });
            
            const parsed = JSON.parse(exportData);
            
            if (parsed.hasOwnProperty('auditTrail') && Array.isArray(parsed.auditTrail)) {
                this.addTestResult('导出功能', true, 
                    `导出 ${parsed.auditTrail.length} 条记录`);
            } else {
                this.addTestResult('导出功能', false, '导出数据格式不正确');
            }
        } catch (error) {
            this.addTestResult('导出功能', false, error.message);
        }
    }

    /**
     * 测试清理功能
     */
    async testCleanup() {
        console.log('🧹 测试清理功能...');
        
        try {
            const cleanupResult = this.auditLogger.cleanupAuditLogs({
                olderThanDays: 365,
                keepMinCount: 100,
                dryRun: true
            });
            
            if (cleanupResult.hasOwnProperty('candidatesForDeletion') && 
                cleanupResult.hasOwnProperty('dryRun')) {
                this.addTestResult('清理功能', true, 
                    `模拟清理: ${cleanupResult.candidatesForDeletion} 条记录可删除`);
            } else {
                this.addTestResult('清理功能', false, '清理结果格式不正确');
            }
        } catch (error) {
            this.addTestResult('清理功能', false, error.message);
        }
    }

    /**
     * 测试验证功能
     */
    async testValidation() {
        console.log('✅ 测试数据验证...');
        
        try {
            // 测试无效用户名
            try {
                await this.auditLogger.log({
                    action: 'TEST',
                    resource: 'test'
                });
                this.addTestResult('数据验证', false, '应该拒绝无用户名的记录');
            } catch (error) {
                // 预期的错误
                this.addTestResult('数据验证', true, '正确拒绝了无效数据');
            }
        } catch (error) {
            this.addTestResult('数据验证', false, error.message);
        }
    }

    /**
     * 测试中间件（简化版本）
     */
    async testMiddleware() {
        console.log('🔧 测试中间件...');
        
        try {
            // 简化测试 - 验证中间件函数存在
            const { createAuditMiddleware } = require('./auditLogger');
            
            if (typeof createAuditMiddleware === 'function') {
                this.addTestResult('中间件', true, '中间件函数可用');
            } else {
                this.addTestResult('中间件', false, '中间件函数不可用');
            }
        } catch (error) {
            this.addTestResult('中间件', false, error.message);
        }
    }

    /**
     * 测试装饰器
     */
    async testDecorator() {
        console.log('🎯 测试装饰器...');
        
        try {
            // 测试装饰器功能（模拟版本）
            const auditLogger = this.auditLogger;
            let auditLogged = false;
            
            // 模拟装饰器行为
            const testMethod = async function(data) {
                // 记录审计日志
                await auditLogger.log({
                    user_id: 'test-user',
                    username: 'testuser',
                    action: 'TEST_METHOD',
                    resource: 'TestService',
                    details: JSON.stringify({ data }),
                    result: 'success',
                    severity: 'info',
                    tags: ['test', 'decorator']
                });
                auditLogged = true;
                return { success: true, data };
            };
            
            const result = await testMethod('test-data');
            
            if (result.success && auditLogged) {
                this.addTestResult('装饰器', true, '装饰器方法执行成功');
            } else {
                this.addTestResult('装饰器', false, '装饰器方法执行失败');
            }
        } catch (error) {
            this.addTestResult('装饰器', false, error.message);
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
            console.log('🎉 所有测试通过！审计日志系统工作正常。');
        } else {
            console.log('⚠️  部分测试失败，请检查相关功能。');
        }
        
        // 打印内部统计
        const stats = this.auditLogger.getInternalStats();
        console.log('\n📊 内部统计信息:');
        console.log(`总记录数: ${stats.totalLogs}`);
        console.log(`成功记录: ${stats.successfulLogs}`);
        console.log(`失败记录: ${stats.failedLogs}`);
        console.log(`批量处理次数: ${stats.batchCount}`);
        console.log(`队列大小: ${stats.batchQueueSize}`);
    }

    /**
     * 清理测试数据
     */
    async cleanup() {
        console.log('\n🧹 清理测试数据...');
        await this.auditLogger.close();
    }
}

// 运行测试
if (require.main === module) {
    const test = new AuditLoggerTest();
    
    test.runAllTests().then(() => {
        return test.cleanup();
    }).catch(error => {
        console.error('测试失败:', error);
    });
}

module.exports = AuditLoggerTest;