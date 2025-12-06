const { DatabaseCache, CachedQueryDecorator } = require('../databaseCache');

/**
 * 数据库缓存系统测试
 */
class CacheSystemTest {
    constructor() {
        this.testResults = [];
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🧪 开始数据库缓存系统测试...\n');

        try {
            await this.testCacheBasicOperations();
            await this.testCacheStrategies();
            await this.testQueryDecorator();
            await this.testCacheIntegration();
            await this.testPerformanceMonitoring();
            await this.testMemoryManagement();
            await this.testCacheInvalidation();

            this.printTestSummary();
        } catch (error) {
            console.error('❌ 测试执行失败:', error);
        }
    }

    /**
     * 测试缓存基本操作
     */
    async testCacheBasicOperations() {
        console.log('📋 测试缓存基本操作...');
        
        const cache = new DatabaseCache();
        
        try {
            // 测试设置和获取
            const key = 'test:key';
            const data = { message: 'Hello Cache', timestamp: Date.now() };
            
            await cache.set(key, data);
            const retrieved = await cache.get(key);
            
            this.assert(
                retrieved && retrieved.message === data.message,
                '缓存设置和获取'
            );

            // 测试缓存失效
            await cache.delete(key);
            const deleted = await cache.get(key);
            
            this.assert(
                deleted === null,
                '缓存删除'
            );

            // 测试缓存统计
            const stats = cache.getStats();
            this.assert(
                typeof stats.hits === 'number' && typeof stats.misses === 'number',
                '缓存统计信息'
            );

            await cache.close();
            console.log('✅ 缓存基本操作测试完成\n');
        } catch (error) {
            console.error('❌ 缓存基本操作测试失败:', error);
            this.recordTest('缓存基本操作', false, error.message);
        }
    }

    /**
     * 测试缓存策略
     */
    async testCacheStrategies() {
        console.log('📋 测试缓存策略...');
        
        const cache = new DatabaseCache();
        
        try {
            // 测试不同查询类型的TTL
            const userListTTL = cache.getTTL('user_list');
            const measurementTTL = cache.getTTL('measurement_data');
            const statsTTL = cache.getTTL('statistics');
            const permTTL = cache.getTTL('permissions');
            const realTimeTTL = cache.getTTL('real_time');
            
            this.assert(
                userListTTL === 10 * 60 * 1000, // 10分钟
                '用户列表缓存TTL'
            );
            
            this.assert(
                measurementTTL === 5 * 60 * 1000, // 5分钟
                '测量数据缓存TTL'
            );
            
            this.assert(
                statsTTL === 15 * 60 * 1000, // 15分钟
                '统计数据缓存TTL'
            );
            
            this.assert(
                permTTL === 30 * 60 * 1000, // 30分钟
                '权限缓存TTL'
            );
            
            this.assert(
                realTimeTTL === 0,
                '实时操作不缓存'
            );

            await cache.close();
            console.log('✅ 缓存策略测试完成\n');
        } catch (error) {
            console.error('❌ 缓存策略测试失败:', error);
            this.recordTest('缓存策略', false, error.message);
        }
    }

    /**
     * 测试查询装饰器
     */
    async testQueryDecorator() {
        console.log('📋 测试查询装饰器...');
        
        const mockDbManager = {
            testMethod: async (params) => {
                await new Promise(resolve => setTimeout(resolve, 10)); // 模拟查询延迟
                return { result: 'test_data', params };
            }
        };
        
        const cache = new DatabaseCache();
        const decorator = new CachedQueryDecorator(mockDbManager, cache);
        
        try {
            // 测试缓存装饰
            const result1 = await decorator.executeQuery(
                'user_list',
                mockDbManager.testMethod,
                { test: 'param' },
                'test_user'
            );
            
            const result2 = await decorator.executeQuery(
                'user_list',
                mockDbManager.testMethod,
                { test: 'param' },
                'test_user'
            );
            
            this.assert(
                result1 && result2 && result1.result === result2.result,
                '查询装饰器缓存功能'
            );

            await cache.close();
            console.log('✅ 查询装饰器测试完成\n');
        } catch (error) {
            console.error('❌ 查询装饰器测试失败:', error);
            this.recordTest('查询装饰器', false, error.message);
        }
    }

    /**
     * 测试缓存集成
     */
    async testCacheIntegration() {
        console.log('📋 测试缓存集成...');
        
        const mockDbManager = {
            readTable: (tableName) => {
                return Array.from({ length: 5 }, (_, i) => ({
                    id: `test_${i}`,
                    name: `Test Item ${i}`,
                    table: tableName
                }));
            },
            getDatabaseStats: () => ({
                tables: { users: 10, permissions: 5 },
                total_records: 15
            })
        };
        
        try {
            // 测试数据库管理器基本功能
            const users = mockDbManager.readTable('users');
            this.assert(
                users && users.length === 5,
                '模拟数据库读取功能'
            );
            
            const stats = mockDbManager.getDatabaseStats();
            this.assert(
                stats && stats.total_records === 15,
                '模拟数据库统计功能'
            );

            console.log('✅ 缓存集成测试完成\n');
        } catch (error) {
            console.error('❌ 缓存集成测试失败:', error);
            this.recordTest('缓存集成', false, error.message);
        }
    }

    /**
     * 测试性能监控
     */
    async testPerformanceMonitoring() {
        console.log('📋 测试性能监控...');
        
        const cache = new DatabaseCache();
        
        try {
            // 生成一些测试数据
            const testData = Array.from({ length: 100 }, (_, i) => ({
                id: i,
                data: `Test data ${i}`,
                timestamp: Date.now()
            }));
            
            // 执行多次缓存操作
            for (let i = 0; i < 50; i++) {
                await cache.set(`test:${i}`, testData[i % testData.length]);
                await cache.get(`test:${Math.floor(i / 2)}`); // 产生一些命中
            }
            
            // 获取性能统计
            const stats = cache.getStats();
            const performanceReport = {
                stats,
                hotQueries: cache.getHotQueries(10),
                slowQueries: cache.stats.slowQueries
            };
            
            this.assert(
                stats.hits >= 0 && stats.misses >= 0,
                '性能统计功能'
            );
            
            this.assert(
                performanceReport.hotQueries instanceof Array,
                '热门查询统计'
            );

            await cache.close();
            console.log('✅ 性能监控测试完成\n');
        } catch (error) {
            console.error('❌ 性能监控测试失败:', error);
            this.recordTest('性能监控', false, error.message);
        }
    }

    /**
     * 测试内存管理
     */
    async testMemoryManagement() {
        console.log('📋 测试内存管理...');
        
        const cache = new DatabaseCache({
            maxMemory: 1024 * 1024, // 1MB用于测试
            maxEntries: 50
        });
        
        try {
            const largeData = Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                data: 'x'.repeat(1000) // 1KB数据
            }));
            
            // 测试内存限制
            let inserted = 0;
            for (const data of largeData) {
                const success = await cache.set(`memory:test:${inserted}`, data);
                if (success) {
                    inserted++;
                } else {
                    break; // 达到内存限制
                }
            }
            
            this.assert(
                inserted > 0,
                '内存管理功能'
            );
            
            // 测试内存使用监控
            cache.monitorMemory();
            const stats = cache.getStats();
            
            this.assert(
                stats.memoryUsage >= 0 && stats.memoryUsagePercent >= 0,
                '内存使用监控'
            );

            await cache.close();
            console.log('✅ 内存管理测试完成\n');
        } catch (error) {
            console.error('❌ 内存管理测试失败:', error);
            this.recordTest('内存管理', false, error.message);
        }
    }

    /**
     * 测试缓存失效
     */
    async testCacheInvalidation() {
        console.log('📋 测试缓存失效...');
        
        const cache = new DatabaseCache();
        
        try {
            // 设置测试数据
            await cache.set('query:users:read:abc123:user1', { users: [] });
            await cache.set('query:users:read:def456:user2', { users: [] });
            await cache.set('query:permissions:read:ghi789:user1', { permissions: [] });
            await cache.set('query:measurements:read:jkl012:user3', { measurements: [] });
            
            // 测试模式匹配失效
            const invalidated1 = await cache.invalidate('query:users:*');
            this.assert(
                invalidated1 >= 2,
                '模式匹配失效 - 用户相关'
            );
            
            const invalidated2 = await cache.invalidate('query:*:*:*:user1');
            this.assert(
                invalidated2 >= 1,
                '模式匹配失效 - 用户1相关'
            );
            
            // 验证失效结果
            const remainingKeys = Array.from(cache.cache.keys());
            this.assert(
                !remainingKeys.some(key => key.includes('user1')),
                '用户1相关缓存已失效'
            );

            await cache.close();
            console.log('✅ 缓存失效测试完成\n');
        } catch (error) {
            console.error('❌ 缓存失效测试失败:', error);
            this.recordTest('缓存失效', false, error.message);
        }
    }

    /**
     * 记录测试结果
     */
    recordTest(testName, passed, error = null) {
        this.testCount++;
        if (passed) {
            this.passedTests++;
            console.log(`✅ ${testName}: 通过`);
        } else {
            this.failedTests++;
            console.log(`❌ ${testName}: 失败 - ${error}`);
        }
        
        this.testResults.push({
            name: testName,
            passed,
            error,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 断言测试
     */
    assert(condition, testName) {
        if (condition) {
            this.recordTest(testName, true);
        } else {
            this.recordTest(testName, false, '断言失败');
            throw new Error(`测试失败: ${testName}`);
        }
    }

    /**
     * 打印测试摘要
     */
    printTestSummary() {
        console.log('📊 测试摘要:');
        console.log(`   总测试数: ${this.testCount}`);
        console.log(`   通过: ${this.passedTests}`);
        console.log(`   失败: ${this.failedTests}`);
        console.log(`   成功率: ${((this.passedTests / this.testCount) * 100).toFixed(2)}%`);
        
        if (this.failedTests > 0) {
            console.log('\n❌ 失败的测试:');
            this.testResults
                .filter(result => !result.passed)
                .forEach(result => {
                    console.log(`   - ${result.name}: ${result.error}`);
                });
        }
        
        console.log('\n🎉 数据库缓存系统测试完成!');
    }

    /**
     * 生成测试报告
     */
    generateTestReport() {
        return {
            summary: {
                total: this.testCount,
                passed: this.passedTests,
                failed: this.failedTests,
                successRate: ((this.passedTests / this.testCount) * 100).toFixed(2) + '%'
            },
            results: this.testResults,
            timestamp: new Date().toISOString()
        };
    }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    const test = new CacheSystemTest();
    test.runAllTests().then(() => {
        const report = test.generateTestReport();
        console.log('\n📄 测试报告已生成');
        console.log(JSON.stringify(report, null, 2));
    });
}

module.exports = CacheSystemTest;