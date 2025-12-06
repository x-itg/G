/**
 * 日志查询引擎测试文件
 * 验证日志查询和分析功能的正确性
 */

const assert = require('assert');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');
const LogQueryEngine = require('./logQueryEngine');
const { createLogQueryIntegration } = require('./logQueryIntegration');

/**
 * 日志查询引擎测试套件
 */
class LogQueryTestSuite {
    constructor() {
        this.db = null;
        this.logQueryEngine = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
    }

    /**
     * 记录测试结果
     */
    recordTest(testName, passed, error = null) {
        this.testResults.total++;
        if (passed) {
            this.testResults.passed++;
            console.log(`✅ ${testName}`);
        } else {
            this.testResults.failed++;
            console.log(`❌ ${testName}: ${error}`);
            this.testResults.details.push({ test: testName, error: error.message });
        }
    }

    /**
     * 初始化测试环境
     */
    async setup() {
        console.log('🔧 初始化测试环境...');
        
        this.db = new SimplifiedDatabaseManager();
        this.db.initialize();
        
        const integration = await createLogQueryIntegration(this.db);
        this.logQueryEngine = integration.getLogQueryEngine();
        
        // 创建测试数据
        await this.createTestData();
        
        console.log('✅ 测试环境初始化完成\n');
    }

    /**
     * 创建测试数据
     */
    async createTestData() {
        const testLogs = [
            // 审计日志
            {
                table: 'audit_logs',
                data: [
                    {
                        id: 'audit001',
                        user_id: 'test_user_1',
                        username: 'testuser1',
                        action: 'login',
                        resource: 'system',
                        result: 'SUCCESS',
                        ip_address: '192.168.1.100',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        level: 'info'
                    },
                    {
                        id: 'audit002',
                        user_id: 'test_user_2',
                        username: 'testuser2',
                        action: 'measurement_start',
                        resource: 'detector',
                        result: 'SUCCESS',
                        ip_address: '192.168.1.101',
                        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                        level: 'info'
                    },
                    {
                        id: 'audit003',
                        user_id: 'test_user_3',
                        username: 'testuser3',
                        action: 'data_export',
                        resource: 'results',
                        result: 'FAILURE',
                        ip_address: '192.168.1.102',
                        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                        level: 'error'
                    },
                    {
                        id: 'audit004',
                        user_id: 'test_user_1',
                        username: 'testuser1',
                        action: 'system_config',
                        resource: 'settings',
                        result: 'SUCCESS',
                        ip_address: '192.168.1.100',
                        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                        level: 'info'
                    },
                    {
                        id: 'audit005',
                        user_id: 'test_user_4',
                        username: 'testuser4',
                        action: 'login',
                        resource: 'system',
                        result: 'FAILURE',
                        ip_address: '192.168.1.103',
                        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                        level: 'error'
                    }
                ]
            },
            // 性能指标
            {
                table: 'performance_metrics',
                data: [
                    {
                        id: 'perf001',
                        metric_type: 'performance',
                        metric_name: 'cpu_usage',
                        value: 45.2,
                        unit: '%',
                        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                        alert_level: 'NORMAL'
                    },
                    {
                        id: 'perf002',
                        metric_type: 'performance',
                        metric_name: 'memory_usage',
                        value: 68.7,
                        unit: '%',
                        timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
                        alert_level: 'NORMAL'
                    },
                    {
                        id: 'perf003',
                        metric_type: 'performance',
                        metric_name: 'api_response_time',
                        value: 125.3,
                        unit: 'ms',
                        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                        alert_level: 'WARNING'
                    },
                    {
                        id: 'perf004',
                        metric_type: 'performance',
                        metric_name: 'cpu_usage',
                        value: 85.1,
                        unit: '%',
                        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
                        alert_level: 'CRITICAL'
                    }
                ]
            }
        ];

        // 插入测试数据
        for (const tableData of testLogs) {
            for (const record of tableData.data) {
                await this.db.addRecord(tableData.table, record);
            }
        }
    }

    /**
     * 测试基本日志搜索功能
     */
    async testBasicSearch() {
        console.log('🔍 测试基本日志搜索...');
        
        try {
            const query = {
                logTypes: ['audit_logs'],
                filters: {
                    result: 'SUCCESS'
                },
                sortBy: 'timestamp',
                sortOrder: 'desc',
                limit: 10
            };
            
            const result = await this.logQueryEngine.searchLogs(query);
            
            // 验证结果
            assert.strictEqual(result.success, true, '搜索应该成功');
            assert(Array.isArray(result.data), '结果应该是数组');
            assert(result.data.length > 0, '应该返回结果');
            
            // 验证过滤条件生效
            const allSuccess = result.data.every(log => log.result === 'SUCCESS');
            assert.strictEqual(allSuccess, true, '所有结果应该都是成功的操作');
            
            this.recordTest('基本日志搜索', true);
        } catch (error) {
            this.recordTest('基本日志搜索', false, error);
        }
    }

    /**
     * 测试时间范围搜索
     */
    async testTimeRangeSearch() {
        console.log('⏰ 测试时间范围搜索...');
        
        try {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
            
            const query = {
                logTypes: ['audit_logs'],
                timeRange: {
                    start: twoHoursAgo,
                    end: oneHourAgo
                },
                limit: 10
            };
            
            const result = await this.logQueryEngine.searchLogs(query);
            
            assert.strictEqual(result.success, true, '时间范围搜索应该成功');
            
            // 验证时间范围过滤
            const allInRange = result.data.every(log => {
                const logTime = new Date(log.timestamp);
                return logTime >= new Date(twoHoursAgo) && logTime <= new Date(oneHourAgo);
            });
            assert.strictEqual(allInRange, true, '所有结果应该在指定时间范围内');
            
            this.recordTest('时间范围搜索', true);
        } catch (error) {
            this.recordTest('时间范围搜索', false, error);
        }
    }

    /**
     * 测试关键词搜索
     */
    async testKeywordSearch() {
        console.log('🔎 测试关键词搜索...');
        
        try {
            const query = {
                logTypes: ['audit_logs'],
                keywords: ['FAILURE', 'error'],
                limit: 10
            };
            
            const result = await this.logQueryEngine.searchLogs(query);
            
            assert.strictEqual(result.success, true, '关键词搜索应该成功');
            
            // 验证关键词过滤
            const allContainKeyword = result.data.every(log => {
                const logText = JSON.stringify(log).toLowerCase();
                return logText.includes('failure') || logText.includes('error');
            });
            assert.strictEqual(allContainKeyword, true, '所有结果应该包含关键词');
            
            this.recordTest('关键词搜索', true);
        } catch (error) {
            this.recordTest('关键词搜索', false, error);
        }
    }

    /**
     * 测试聚合查询
     */
    async testAggregation() {
        console.log('📊 测试聚合查询...');
        
        try {
            const query = {
                logTypes: ['audit_logs'],
                aggregations: {
                    user_group: {
                        type: 'groupBy',
                        field: 'username'
                    },
                    action_count: {
                        type: 'count'
                    }
                }
            };
            
            const result = await this.logQueryEngine.aggregateLogs(query);
            
            assert.strictEqual(result.success, true, '聚合查询应该成功');
            assert(typeof result.data === 'object', '聚合结果应该是对象');
            
            if (result.data.user_group) {
                assert(Array.isArray(result.data.user_group), '分组结果应该是数组');
                assert(result.data.user_group.length > 0, '应该有分组结果');
            }
            
            this.recordTest('聚合查询', true);
        } catch (error) {
            this.recordTest('聚合查询', false, error);
        }
    }

    /**
     * 测试用户行为分析
     */
    async testUserBehaviorAnalysis() {
        console.log('👤 测试用户行为分析...');
        
        try {
            const timeRange = {
                start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            };
            
            const result = await this.logQueryEngine.analyzeUserBehavior(timeRange);
            
            assert.strictEqual(result.success, true, '用户行为分析应该成功');
            assert(typeof result.data === 'object', '分析结果应该是对象');
            
            this.recordTest('用户行为分析', true);
        } catch (error) {
            this.recordTest('用户行为分析', false, error);
        }
    }

    /**
     * 测试系统健康分析
     */
    async testSystemHealthAnalysis() {
        console.log('🏥 测试系统健康分析...');
        
        try {
            const timeRange = {
                start: new Date(Date.now() - 60 * 60 * 1000).toISOString()
            };
            
            const result = await this.logQueryEngine.analyzeSystemHealth(timeRange);
            
            assert.strictEqual(result.success, true, '系统健康分析应该成功');
            assert(typeof result.data === 'object', '分析结果应该是对象');
            
            this.recordTest('系统健康分析', true);
        } catch (error) {
            this.recordTest('系统健康分析', false, error);
        }
    }

    /**
     * 测试安全事件分析
     */
    async testSecurityAnalysis() {
        console.log('🔒 测试安全事件分析...');
        
        try {
            const timeRange = {
                start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            };
            
            const result = await this.logQueryEngine.analyzeSecurityEvents(timeRange);
            
            assert.strictEqual(result.success, true, '安全事件分析应该成功');
            assert(typeof result.data === 'object', '分析结果应该是对象');
            
            this.recordTest('安全事件分析', true);
        } catch (error) {
            this.recordTest('安全事件分析', false, error);
        }
    }

    /**
     * 测试导出功能
     */
    async testExport() {
        console.log('📤 测试导出功能...');
        
        try {
            const query = {
                logTypes: ['audit_logs'],
                limit: 10
            };
            
            // 测试JSON导出
            const jsonResult = await this.logQueryEngine.exportResults(query, 'json');
            assert.strictEqual(jsonResult.success, true, 'JSON导出应该成功');
            assert(typeof jsonResult.data === 'string', 'JSON导出数据应该是字符串');
            assert(jsonResult.filename, '应该有导出文件名');
            
            // 测试CSV导出
            const csvResult = await this.logQueryEngine.exportResults(query, 'csv');
            assert.strictEqual(csvResult.success, true, 'CSV导出应该成功');
            assert(typeof csvResult.data === 'string', 'CSV导出数据应该是字符串');
            
            this.recordTest('导出功能', true);
        } catch (error) {
            this.recordTest('导出功能', false, error);
        }
    }

    /**
     * 测试缓存功能
     */
    async testCache() {
        console.log('💾 测试缓存功能...');
        
        try {
            const query = {
                logTypes: ['audit_logs'],
                filters: { result: 'SUCCESS' }
            };
            
            // 第一次查询
            const result1 = await this.logQueryEngine.searchLogs(query);
            
            // 第二次相同查询（应该使用缓存）
            const result2 = await this.logQueryEngine.searchLogs(query);
            
            assert.strictEqual(result1.success, true, '第一次查询应该成功');
            assert.strictEqual(result2.success, true, '第二次查询应该成功');
            assert.strictEqual(result1.data.length, result2.data.length, '两次查询结果应该相同');
            
            this.recordTest('缓存功能', true);
        } catch (error) {
            this.recordTest('缓存功能', false, error);
        }
    }

    /**
     * 测试错误处理
     */
    async testErrorHandling() {
        console.log('🚫 测试错误处理...');
        
        try {
            // 测试无效查询
            const invalidQuery = {
                logTypes: ['invalid_log_type'],
                limit: 10
            };
            
            const result = await this.logQueryEngine.searchLogs(invalidQuery);
            
            // 应该优雅地处理错误而不是崩溃
            assert.strictEqual(typeof result === 'object', true, '应该返回结果对象');
            
            this.recordTest('错误处理', true);
        } catch (error) {
            this.recordTest('错误处理', false, error);
        }
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🚀 开始运行日志查询引擎测试套件\n');
        console.log('=' .repeat(60));
        
        try {
            await this.setup();
            
            await this.testBasicSearch();
            await this.testTimeRangeSearch();
            await this.testKeywordSearch();
            await this.testAggregation();
            await this.testUserBehaviorAnalysis();
            await this.testSystemHealthAnalysis();
            await this.testSecurityAnalysis();
            await this.testExport();
            await this.testCache();
            await this.testErrorHandling();
            
        } catch (error) {
            console.error('❌ 测试过程中出现严重错误:', error);
        } finally {
            await this.cleanup();
            this.printTestResults();
        }
    }

    /**
     * 清理测试环境
     */
    async cleanup() {
        console.log('\n🧹 清理测试环境...');
        if (this.db) {
            this.db.close();
        }
        console.log('✅ 测试环境清理完成');
    }

    /**
     * 打印测试结果
     */
    printTestResults() {
        console.log('\n' + '=' .repeat(60));
        console.log('📋 测试结果总结');
        console.log('=' .repeat(60));
        console.log(`总测试数: ${this.testResults.total}`);
        console.log(`通过: ${this.testResults.passed} ✅`);
        console.log(`失败: ${this.testResults.failed} ❌`);
        console.log(`成功率: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        
        if (this.testResults.failed > 0) {
            console.log('\n❌ 失败的测试:');
            this.testResults.details.forEach(detail => {
                console.log(`- ${detail.test}: ${detail.error}`);
            });
        }
        
        console.log('\n' + '=' .repeat(60));
        
        // 返回测试是否全部通过
        return this.testResults.failed === 0;
    }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    const testSuite = new LogQueryTestSuite();
    testSuite.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = LogQueryTestSuite;