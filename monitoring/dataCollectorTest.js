/**
 * 数据采集系统测试
 * 验证数据采集、存储、API等各项功能
 */
const DataCollector = require('./dataCollector');
const { createDataCollectorAPI } = require('./dataCollectorAPI');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

/**
 * 测试结果记录器
 */
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.errors = [];
    }
    
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }
    
    async run() {
        console.log('🧪 开始运行数据采集系统测试...\n');
        
        for (const { name, testFn } of this.tests) {
            try {
                console.log(`📋 测试: ${name}`);
                await testFn();
                this.passed++;
                console.log('✅ 通过\n');
            } catch (error) {
                this.failed++;
                this.errors.push({ name, error: error.message });
                console.log(`❌ 失败: ${error.message}\n`);
            }
        }
        
        this.printSummary();
    }
    
    printSummary() {
        const total = this.passed + this.failed;
        const passRate = ((this.passed / total) * 100).toFixed(2);
        
        console.log('📊 测试总结:');
        console.log(`  总测试数: ${total}`);
        console.log(`  通过: ${this.passed}`);
        console.log(`  失败: ${this.failed}`);
        console.log(`  通过率: ${passRate}%`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ 失败的测试:');
            this.errors.forEach(({ name, error }) => {
                console.log(`  - ${name}: ${error}`);
            });
        }
        
        // 保存测试结果
        this.saveTestResults();
    }
    
    saveTestResults() {
        const results = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.passed + this.failed,
                passed: this.passed,
                failed: this.failed,
                passRate: ((this.passed / (this.passed + this.failed)) * 100).toFixed(2)
            },
            errors: this.errors
        };
        
        const resultsDir = path.join(__dirname, 'test-results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        const resultsFile = path.join(resultsDir, `data-collector-test-${Date.now()}.json`);
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`\n📁 测试结果已保存到: ${resultsFile}`);
    }
}

/**
 * 创建测试用的数据采集系统实例
 */
function createTestCollector() {
    return new DataCollector({
        interval: 2000, // 测试时使用较短的间隔
        maxRetries: 2,
        timeout: 5000,
        validationEnabled: true,
        anomalyDetectionEnabled: true,
        consistencyCheckEnabled: true,
        maxRecords: 10000,
        retentionDays: 7
    });
}

/**
 * 测试数据采集系统基本功能
 */
function testBasicFunctionality() {
    const runner = new TestRunner();
    
    // 测试1: 初始化数据采集系统
    runner.test('数据采集系统初始化', () => {
        const collector = createTestCollector();
        assert.ok(collector, '数据采集系统实例应该被创建');
        assert.strictEqual(collector.state.isRunning, false, '初始状态应该是停止的');
        assert.ok(collector.db, '数据库管理器应该被初始化');
    });
    
    // 测试2: 启动和停止数据采集系统
    runner.test('启动和停止数据采集系统', async () => {
        const collector = createTestCollector();
        
        // 启动系统
        await collector.start();
        assert.strictEqual(collector.state.isRunning, true, '系统应该正在运行');
        assert.strictEqual(collector.state.startTime !== null, true, '启动时间应该被设置');
        
        // 等待一小段时间让数据采集进行
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 停止系统
        await collector.stop();
        assert.strictEqual(collector.state.isRunning, false, '系统应该停止运行');
    });
    
    // 测试3: 数据采集状态
    runner.test('获取采集状态', async () => {
        const collector = createTestCollector();
        
        const status = collector.getCollectionStatus();
        assert.ok(status, '状态对象应该存在');
        assert.ok(status.isRunning !== undefined, '状态应该包含isRunning字段');
        assert.ok(status.totalCollected !== undefined, '状态应该包含总采集数');
        assert.ok(Array.isArray(status.sources), '数据源列表应该是数组');
    });
    
    // 测试4: 数据源管理
    runner.test('数据源管理', () => {
        const collector = createTestCollector();
        
        // 注册自定义数据源
        collector.registerDataSource('test', {
            name: 'testSource',
            type: 'test',
            enabled: true,
            interval: 3000,
            collector: async () => [{ metricName: 'test', value: 100 }],
            validator: (metric) => metric.value > 0
        });
        
        assert.ok(collector.dataSources.has('test'), '测试数据源应该被注册');
        
        // 取消注册数据源
        collector.unregisterDataSource('test');
        assert.ok(!collector.dataSources.has('test'), '测试数据源应该被移除');
    });
    
    // 测试5: 数据验证和清洗
    runner.test('数据验证和清洗', async () => {
        const collector = createTestCollector();
        
        // 测试有效数据
        const validData = [{
            metricType: 'test',
            metricName: 'cpu_usage',
            value: 75.5,
            unit: 'percent',
            timestamp: new Date().toISOString()
        }];
        
        const source = {
            validator: () => true
        };
        
        const validatedData = await collector.validateAndCleanData(validData, source);
        assert.strictEqual(validatedData.length, 1, '有效数据应该通过验证');
        
        // 测试无效数据
        const invalidData = [{
            metricType: 'test',
            metricName: 'cpu_usage',
            value: 'invalid', // 无效的数值
            timestamp: null // 无效的时间戳
        }];
        
        const cleanedInvalidData = await collector.validateAndCleanData(invalidData, source);
        assert.strictEqual(cleanedInvalidData.length, 0, '无效数据应该被过滤掉');
    });
    
    // 测试6: 数据存储
    runner.test('数据存储', async () => {
        const collector = createTestCollector();
        
        const testMetrics = [{
            metricType: 'test',
            metricName: 'test_metric',
            value: 42,
            unit: 'units',
            timestamp: new Date().toISOString()
        }];
        
        await collector.storeMetrics(testMetrics);
        
        // 验证数据是否被存储
        const storedMetrics = collector.db.getPerformanceMetrics({
            metricName: 'test_metric'
        });
        
        assert.ok(storedMetrics.length > 0, '测试数据应该被存储到数据库');
        assert.strictEqual(storedMetrics[0].value, 42, '存储的数据值应该正确');
    });
    
    // 测试7: 聚合指标
    runner.test('聚合指标', async () => {
        const collector = createTestCollector();
        
        // 存储一些测试数据
        const testMetrics = [
            { metricType: 'test', metricName: 'cpu', value: 10, timestamp: new Date().toISOString() },
            { metricType: 'test', metricName: 'cpu', value: 20, timestamp: new Date().toISOString() },
            { metricType: 'test', metricName: 'cpu', value: 30, timestamp: new Date().toISOString() }
        ];
        
        await collector.storeMetrics(testMetrics);
        
        const aggregated = collector.getAggregatedMetrics();
        assert.ok(aggregated.cpu, 'CPU指标应该有聚合结果');
        assert.strictEqual(aggregated.cpu.average, 20, '平均值应该正确计算');
    });
    
    return runner;
}

/**
 * 测试API接口功能
 */
function testAPIEndpoints() {
    const runner = new TestRunner();
    
    // 测试API路由创建
    runner.test('API路由创建', () => {
        const collector = createTestCollector();
        const apiRouter = createDataCollectorAPI(collector);
        
        assert.ok(apiRouter, 'API路由应该被创建');
        assert.strictEqual(typeof apiRouter.get, 'function', '应该有GET方法');
        assert.strictEqual(typeof apiRouter.post, 'function', '应该有POST方法');
    });
    
    // 测试获取采集状态API
    runner.test('状态API', () => {
        const collector = createTestCollector();
        const status = collector.getCollectionStatus();
        
        const requiredFields = [
            'isRunning', 'isCollecting', 'startTime', 'totalCollected', 
            'totalErrors', 'activeSources', 'sources', 'statistics'
        ];
        
        requiredFields.forEach(field => {
            assert.ok(status[field] !== undefined, `状态应该包含${field}字段`);
        });
    });
    
    return runner;
}

/**
 * 测试数据质量管理功能
 */
function testDataQuality() {
    const runner = new TestRunner();
    
    // 测试数据完整性检查
    runner.test('数据完整性检查', async () => {
        const collector = createTestCollector();
        
        const testData = [
            { metricType: 'test', metricName: 'valid', value: 100, timestamp: new Date().toISOString() },
            { metricType: 'test', metricName: 'invalid', value: 100 }, // 缺少timestamp
            { metricType: 'test', metricName: 'invalid', timestamp: new Date().toISOString() } // 缺少value
        ];
        
        const source = { validator: () => true };
        const validatedData = await collector.validateAndCleanData(testData, source);
        
        assert.strictEqual(validatedData.length, 1, '只有完整的数据应该通过验证');
    });
    
    // 测试异常数据检测
    runner.test('异常数据检测', async () => {
        const collector = createTestCollector();
        
        // 存储一些正常数据
        const normalData = Array(20).fill(0).map((_, i) => ({
            metricType: 'test',
            metricName: 'temperature',
            value: 20 + Math.random() * 5, // 20-25度的正常范围
            timestamp: new Date().toISOString()
        }));
        
        await collector.storeMetrics(normalData);
        
        // 测试聚合指标
        const aggregated = collector.getAggregatedMetrics();
        assert.ok(aggregated.temperature, '温度指标应该有聚合结果');
        assert.ok(aggregated.temperature.average >= 20 && aggregated.temperature.average <= 25, 
                 '平均值应该在正常范围内');
    });
    
    return runner;
}

/**
 * 测试系统集成功能
 */
function testSystemIntegration() {
    const runner = new TestRunner();
    
    // 测试多数据源同时运行
    runner.test('多数据源同时运行', async () => {
        const collector = createTestCollector();
        
        // 添加多个自定义数据源
        for (let i = 1; i <= 3; i++) {
            collector.registerDataSource(`source${i}`, {
                name: `source${i}`,
                type: 'custom',
                enabled: true,
                interval: 1000,
                collector: async () => [{
                    metricType: 'test',
                    metricName: `source${i}_metric`,
                    value: Math.random() * 100,
                    timestamp: new Date().toISOString()
                }]
            });
        }
        
        await collector.start();
        await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
        
        const status = collector.getCollectionStatus();
        assert.ok(status.totalCollected > 0, '应该有数据被采集');
        
        await collector.stop();
    });
    
    // 测试配置更新
    runner.test('配置更新', () => {
        const collector = createTestCollector();
        
        const newConfig = collector.configureCollection({
            interval: 1000,
            maxRetries: 5
        });
        
        assert.strictEqual(newConfig.interval, 1000, '采集间隔应该被更新');
        assert.strictEqual(newConfig.maxRetries, 5, '最大重试次数应该被更新');
    });
    
    // 测试数据备份
    runner.test('数据备份', async () => {
        const collector = createTestCollector();
        
        // 存储一些测试数据
        const testData = [{
            metricType: 'test',
            metricName: 'backup_test',
            value: 999,
            timestamp: new Date().toISOString()
        }];
        
        await collector.storeMetrics(testData);
        
        // 执行备份
        const backupResult = await collector.backupData({
            includeMetrics: true,
            outputPath: path.join(__dirname, 'test-backups')
        });
        
        assert.ok(backupResult.success, '备份应该成功');
        assert.ok(fs.existsSync(backupResult.backupFile), '备份文件应该被创建');
        
        // 清理测试备份文件
        if (fs.existsSync(backupResult.backupFile)) {
            fs.unlinkSync(backupResult.backupFile);
        }
    });
    
    return runner;
}

/**
 * 运行性能测试
 */
function runPerformanceTests() {
    const runner = new TestRunner();
    
    // 测试大数据量处理
    runner.test('大数据量处理性能', async () => {
        const collector = createTestCollector();
        
        const startTime = Date.now();
        
        // 生成大量测试数据
        const batchSize = 1000;
        const testData = Array(batchSize).fill(0).map((_, i) => ({
            metricType: 'performance_test',
            metricName: 'batch_metric',
            value: Math.random() * 1000,
            timestamp: new Date().toISOString(),
            tags: { batch_id: i }
        }));
        
        await collector.storeMetrics(testData);
        
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        console.log(`处理${batchSize}条数据耗时: ${processingTime}ms`);
        assert.ok(processingTime < 10000, '大数据量处理应该在10秒内完成');
        
        // 验证数据被正确存储
        const storedData = collector.db.getPerformanceMetrics({
            metricType: 'performance_test'
        });
        assert.strictEqual(storedData.length, batchSize, '所有数据都应该被存储');
    });
    
    return runner;
}

/**
 * 主要测试函数
 */
async function runAllTests() {
    console.log('🧪 数据采集系统全面测试\n');
    
    // 创建临时测试目录
    const testDir = path.join(__dirname, 'test-temp');
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    
    try {
        // 运行所有测试
        const basicTests = testBasicFunctionality();
        await basicTests.run();
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        const apiTests = testAPIEndpoints();
        await apiTests.run();
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        const qualityTests = testDataQuality();
        await qualityTests.run();
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        const integrationTests = testSystemIntegration();
        await integrationTests.run();
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        const performanceTests = runPerformanceTests();
        await performanceTests.run();
        
        console.log('\n🎉 所有测试完成!');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    } finally {
        // 清理测试目录
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    }
}

/**
 * 快速验证测试
 */
function quickValidation() {
    console.log('⚡ 快速验证测试\n');
    
    try {
        // 验证文件是否存在
        const files = [
            'dataCollector.js',
            'dataCollectorAPI.js',
            'config.js',
            'dataCollectorExample.js'
        ];
        
        files.forEach(file => {
            const filePath = path.join(__dirname, file);
            assert.ok(fs.existsSync(filePath), `${file} 文件应该存在`);
            console.log(`✅ ${file} 存在`);
        });
        
        // 验证模块导入
        const DataCollector = require('./dataCollector');
        const { createDataCollectorAPI } = require('./dataCollectorAPI');
        const config = require('./config');
        
        console.log('✅ 模块导入成功');
        
        // 验证基本功能
        const collector = new DataCollector();
        assert.ok(collector instanceof DataCollector, 'DataCollector应该被正确实例化');
        console.log('✅ DataCollector实例化成功');
        
        // 验证API路由创建（如果没有Express则跳过）
        try {
            const apiRouter = createDataCollectorAPI(collector);
            console.log('✅ API路由创建成功');
        } catch (error) {
            if (error.message.includes('Express is required')) {
                console.log('⚠️ Express不可用，跳过API路由测试');
            } else {
                throw error;
            }
        }
        
        console.log('\n🎉 快速验证通过!');
        
    } catch (error) {
        console.error('❌ 快速验证失败:', error);
    }
}

// 执行测试
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'quick':
        quickValidation();
        break;
    case 'all':
        runAllTests();
        break;
    default:
        console.log(`
数据采集系统测试工具:

使用方法:
  node dataCollectorTest.js <命令>

命令:
  quick  - 快速验证（默认）
  all    - 运行全部测试

示例:
  node dataCollectorTest.js quick
  node dataCollectorTest.js all
        `);
        
        // 默认运行快速验证
        quickValidation();
}

module.exports = {
    TestRunner,
    createTestCollector,
    testBasicFunctionality,
    testAPIEndpoints,
    testDataQuality,
    testSystemIntegration,
    runPerformanceTests,
    runAllTests,
    quickValidation
};