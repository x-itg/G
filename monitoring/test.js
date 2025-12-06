/**
 * 系统监控模块测试文件
 * 用于验证监控功能是否正常工作
 */

const { SystemMonitor, createMonitoringService } = require('./monitoringService');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');

/**
 * 测试结果记录器
 */
class TestRunner {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }

    async test(name, testFunction) {
        console.log(`🧪 测试: ${name}`);
        try {
            await testFunction();
            this.results.push({ name, status: 'PASS', error: null });
            this.passed++;
            console.log(`  ✅ 通过\n`);
        } catch (error) {
            this.results.push({ name, status: 'FAIL', error: error.message });
            this.failed++;
            console.log(`  ❌ 失败: ${error.message}\n`);
        }
    }

    printSummary() {
        console.log('='.repeat(60));
        console.log('测试总结:');
        console.log(`✅ 通过: ${this.passed}`);
        console.log(`❌ 失败: ${this.failed}`);
        console.log(`📊 总计: ${this.passed + this.failed}`);
        console.log('='.repeat(60));
        
        if (this.failed > 0) {
            console.log('\n失败的测试:');
            this.results
                .filter(r => r.status === 'FAIL')
                .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
        }
    }
}

/**
 * 系统监控功能测试
 */
async function runSystemMonitoringTests() {
    const test = new TestRunner();
    
    console.log('🚀 开始系统监控功能测试...\n');
    
    try {
        // 1. 初始化测试
        await test.test('初始化数据库管理器', async () => {
            const db = new SimplifiedDatabaseManager();
            db.initialize();
            const stats = db.getDatabaseStats();
            if (stats.total_records < 0) {
                throw new Error('数据库统计信息无效');
            }
            console.log(`  数据库初始化成功，记录数: ${stats.total_records}`);
            db.close();
        });

        // 2. 创建系统监控器测试
        await test.test('创建系统监控器', async () => {
            const db = new SimplifiedDatabaseManager();
            db.initialize();
            const monitor = new SystemMonitor(db);
            
            if (!monitor) {
                throw new Error('监控器创建失败');
            }
            
            if (typeof monitor.startMonitoring !== 'function') {
                throw new Error('缺少startMonitoring方法');
            }
            
            console.log('  监控器创建成功');
            db.close();
        });

        // 3. 系统信息获取测试
        await test.test('获取系统信息', async () => {
            const db = new SimplifiedDatabaseManager();
            db.initialize();
            const monitor = new SystemMonitor(db);
            
            const systemInfo = await monitor.getSystemInfo();
            if (!systemInfo) {
                throw new Error('系统信息获取失败');
            }
            
            if (!systemInfo.cpu || !systemInfo.memory || !systemInfo.disk) {
                throw new Error('系统信息不完整');
            }
            
            console.log(`  CPU: ${systemInfo.cpu.usage_percent}%`);
            console.log(`  内存: ${systemInfo.memory.usage_percent}%`);
            console.log(`  磁盘: ${systemInfo.disk.total_usage_percent}%`);
            
            db.close();
        });

        // 4. 数据采集测试
        await test.test('数据采集功能', async () => {
            const db = new SimplifiedDatabaseManager();
            db.initialize();
            const monitor = new SystemMonitor(db);
            
            await monitor.collectMetrics();
            
            if (Object.keys(monitor.currentMetrics).length === 0) {
                throw new Error('数据采集后没有更新当前指标');
            }
            
            console.log('  数据采集成功');
            
            db.close();
        });

        // 5. 监控启动停止测试
        await test.test('监控启动和停止', async () => {
            const db = new SimplifiedDatabaseManager();
            db.initialize();
            const monitor = new SystemMonitor(db);
            
            // 启动监控
            const startResult = await monitor.startMonitoring(1000); // 1秒间隔
            if (!startResult.success) {
                throw new Error('监控启动失败');
            }
            
            if (!monitor.isMonitoring) {
                throw new Error('监控状态未正确更新');
            }
            
            console.log('  监控已启动');
            
            // 等待2秒确保采集
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 停止监控
            const stopResult = await monitor.stopMonitoring();
            if (!stopResult.success) {
                throw new Error('监控停止失败');
            }
            
            if (monitor.isMonitoring) {
                throw new Error('监控状态未正确更新为停止');
            }
            
            console.log('  监控已停止');
            
            db.close();
        });

        // 6. 历史数据查询测试
        await test.test('历史数据查询', async () => {
            const db = new SimplifiedDatabaseManager();
            db.initialize();
            const monitor = new SystemMonitor(db);
            
            // 先生成一些测试数据
            for (let i = 0; i < 5; i++) {
                await monitor.recordMetric('SYSTEM', 'cpu_usage', Math.random() * 100, 'percent', {
                    test: true,
                    iteration: i
                });
            }
            
            const history = await monitor.getHistoryData({
                metricName: 'cpu_usage',
                limit: 10
            });
            
            if (!history.data || history.data.length === 0) {
                throw new Error('历史数据查询失败');
            }
            
            console.log(`  查询到 ${history.data.length} 条历史记录`);
            
            db.close();
        });

        // 7. 阈值和警报测试
        await test.test('阈值和警报功能', async () => {
            const db = new SimplifiedDatabaseManager();
            db.initialize();
            const monitor = new SystemMonitor(db);
            
            // 配置低阈值用于测试
            monitor.updateThresholds({
                cpu_warning: 1,
                cpu_critical: 2
            });
            
            // 记录一个会触发警报的值
            await monitor.recordMetric('SYSTEM', 'cpu_usage', 95, 'percent');
            
            // 检查是否触发了正确的警报级别
            const systemInfo = await monitor.getSystemInfo();
            const alerts = monitor.getCurrentAlerts(systemInfo);
            
            if (alerts.length === 0) {
                throw new Error('应该触发CPU警报但没有触发');
            }
            
            console.log(`  触发了 ${alerts.length} 个警报`);
            
            db.close();
        });

        // 8. 数据库集成测试
        await test.test('数据库集成', async () => {
            const db = new SimplifiedDatabaseManager();
            db.initialize();
            const monitor = new SystemMonitor(db);
            
            // 测试性能指标记录
            const metricId = await monitor.recordMetric('SYSTEM', 'test_metric', 42.5, 'units', {
                custom_field: 'test_value'
            });
            
            if (!metricId) {
                throw new Error('性能指标记录失败');
            }
            
            // 验证数据库中是否有记录
            const metrics = db.getPerformanceMetrics({
                metricName: 'test_metric'
            });
            
            if (metrics.length === 0) {
                throw new Error('数据库中没有找到记录的性能指标');
            }
            
            console.log('  数据库集成测试通过');
            
            db.close();
        });

        // 9. 监控核心功能测试
        await test.test('监控核心功能', async () => {
            const db = new SimplifiedDatabaseManager();
            db.initialize();
            const monitor = new SystemMonitor(db);
            
            // 测试核心方法可用性
            if (typeof monitor.startMonitoring !== 'function') {
                throw new Error('startMonitoring方法不存在');
            }
            
            if (typeof monitor.stopMonitoring !== 'function') {
                throw new Error('stopMonitoring方法不存在');
            }
            
            if (typeof monitor.getCurrentSystemStatus !== 'function') {
                throw new Error('getCurrentSystemStatus方法不存在');
            }
            
            if (typeof monitor.collectMetrics !== 'function') {
                throw new Error('collectMetrics方法不存在');
            }
            
            console.log('  所有核心方法可用');
            
            db.close();
        });

        // 10. 系统状态检查测试
        await test.test('系统状态检查', async () => {
            const db = new SimplifiedDatabaseManager();
            db.initialize();
            const monitor = new SystemMonitor(db);
            
            const status = await monitor.getCurrentSystemStatus();
            
            if (!status) {
                throw new Error('系统状态获取失败');
            }
            
            if (typeof status.status !== 'string') {
                throw new Error('系统状态格式错误');
            }
            
            console.log(`  系统状态: ${status.status}`);
            console.log(`  监控状态: ${status.is_monitoring ? '运行中' : '未运行'}`);
            
            db.close();
        });

        // 打印测试总结
        test.printSummary();
        
    } catch (error) {
        console.error('测试过程中发生严重错误:', error);
        test.results.push({ 
            name: 'Critical Error', 
            status: 'FAIL', 
            error: error.message 
        });
        test.failed++;
        test.printSummary();
    }
    
    return test.results;
}

/**
 * API接口测试（模拟）
 */
async function runAPITests() {
    console.log('🔌 API接口测试...\n');
    
    // 这里可以添加更详细的API测试
    // 由于需要启动HTTP服务器，暂时跳过详细测试
    
    console.log('API接口测试需要启动HTTP服务器，建议在实际环境中测试');
    console.log('可用的API端点:');
    console.log('  GET  /api/monitoring/system/current');
    console.log('  GET  /api/monitoring/system/history');
    console.log('  POST /api/monitoring/system/start');
    console.log('  POST /api/monitoring/system/stop');
    console.log('  GET  /api/monitoring/system/stats');
    console.log('  GET  /api/monitoring/health');
    console.log('');
}

/**
 * 性能测试
 */
async function runPerformanceTests() {
    console.log('⚡ 性能测试...\n');
    
    try {
        const db = new SimplifiedDatabaseManager();
        db.initialize();
        const monitor = new SystemMonitor(db);
        
        // 测试数据采集性能
        console.log('测试数据采集性能...');
        const startTime = Date.now();
        
        await monitor.collectMetrics();
        
        const collectTime = Date.now() - startTime;
        console.log(`  数据采集耗时: ${collectTime}ms`);
        
        if (collectTime > 5000) {
            console.log('⚠️ 数据采集耗时较长，可能影响系统性能');
        }
        
        // 测试批量数据记录性能
        console.log('\n测试批量数据记录性能...');
        const batchStart = Date.now();
        
        for (let i = 0; i < 100; i++) {
            await monitor.recordMetric('SYSTEM', 'performance_test', Math.random() * 100, 'percent');
        }
        
        const batchTime = Date.now() - batchStart;
        console.log(`  批量记录100条数据耗时: ${batchTime}ms`);
        
        if (batchTime > 1000) {
            console.log('⚠️ 批量数据记录较慢，可能影响大数据量场景');
        }
        
        db.close();
        
    } catch (error) {
        console.error('性能测试失败:', error);
    }
}

/**
 * 压力测试
 */
async function runStressTest() {
    console.log('💪 压力测试...\n');
    
    try {
        const db = new SimplifiedDatabaseManager();
        db.initialize();
        const monitor = new SystemMonitor(db);
        
        console.log('启动高频率监控测试...');
        await monitor.startMonitoring(100); // 100ms间隔
        
        // 运行5秒
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await monitor.stopMonitoring();
        
        const stats = monitor.getMonitoringStats();
        console.log('压力测试结果:');
        console.log(`  监控状态: ${stats.is_monitoring ? '运行中' : '已停止'}`);
        console.log(`  运行时间: ${stats.uptime_seconds}s`);
        console.log(`  缓存大小: ${stats.cache_size}/${stats.max_cache_size}`);
        
        // 检查内存使用
        const memoryUsage = stats.memory_usage;
        console.log(`  内存使用: RSS=${Math.round(memoryUsage.rss / 1024 / 1024)}MB, Heap=${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
        
        if (memoryUsage.heapUsed > 100 * 1024 * 1024) {
            console.log('⚠️ 堆内存使用较高，可能存在内存泄漏');
        }
        
        db.close();
        
    } catch (error) {
        console.error('压力测试失败:', error);
    }
}

/**
 * 错误处理测试
 */
async function runErrorHandlingTests() {
    console.log('🛡️ 错误处理测试...\n');
    
    try {
        // 测试无效参数
        const db = new SimplifiedDatabaseManager();
        db.initialize();
        const monitor = new SystemMonitor(db);
        
        // 测试无效的记录指标
        console.log('测试无效指标记录...');
        try {
            await monitor.recordMetric(null, null, null);
            console.log('  ⚠️ 应该拒绝null参数但没有');
        } catch (error) {
            console.log('  ✅ 正确拒绝无效参数');
        }
        
        // 测试无效的阈值配置
        console.log('测试无效阈值配置...');
        try {
            monitor.updateThresholds(null);
            console.log('  ⚠️ 应该拒绝null阈值但没有');
        } catch (error) {
            console.log('  ✅ 正确拒绝无效阈值');
        }
        
        // 测试无效的采集间隔
        console.log('测试无效采集间隔...');
        try {
            await monitor.startMonitoring(-1000);
            console.log('  ⚠️ 应该拒绝负数间隔但没有');
        } catch (error) {
            console.log('  ✅ 正确拒绝无效间隔');
        }
        
        db.close();
        
    } catch (error) {
        console.error('错误处理测试失败:', error);
    }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
    console.log('🎯 放射化学纯度检测仪 - 系统监控模块测试\n');
    console.log('='.repeat(60));
    console.log('');
    
    try {
        await runSystemMonitoringTests();
        console.log('');
        
        await runAPITests();
        console.log('');
        
        await runPerformanceTests();
        console.log('');
        
        await runStressTest();
        console.log('');
        
        await runErrorHandlingTests();
        console.log('');
        
        console.log('='.repeat(60));
        console.log('🎉 所有测试完成！');
        console.log('');
        console.log('测试建议:');
        console.log('1. 在生产环境中运行examples.js查看完整功能');
        console.log('2. 使用API接口进行实际监控测试');
        console.log('3. 根据实际需求调整监控阈值');
        console.log('4. 定期清理历史数据以保持性能');
        
    } catch (error) {
        console.error('测试运行失败:', error);
    }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    runSystemMonitoringTests,
    runAPITests,
    runPerformanceTests,
    runStressTest,
    runErrorHandlingTests,
    runAllTests
};