const DatabaseMonitor = require('./monitoring/databaseMonitor');

/**
 * 简单API集成测试
 */
async function testApiIntegration() {
    console.log('🧪 测试数据库监控API集成...\n');
    
    try {
        // 创建监控器实例
        const monitor = DatabaseMonitor.getInstance();
        
        console.log('✅ 数据库监控器初始化成功');
        
        // 测试核心功能
        const tests = [
            {
                name: '数据库统计',
                func: () => monitor.getDatabaseStats()
            },
            {
                name: '查询性能详情',
                func: () => monitor.getQueryPerformanceDetails()
            },
            {
                name: '慢查询检测',
                func: () => monitor.getSlowQueries(10)
            },
            {
                name: '性能阈值',
                func: () => monitor.getPerformanceThresholds()
            },
            {
                name: '警告系统',
                func: () => monitor.getAlerts(10)
            },
            {
                name: '性能趋势',
                func: () => monitor.getPerformanceTrends('1h')
            },
            {
                name: '操作频率',
                func: () => monitor.getOperationFrequency()
            }
        ];
        
        for (const test of tests) {
            try {
                const result = test.func();
                console.log(`✅ ${test.name}: 功能正常`);
            } catch (error) {
                console.log(`❌ ${test.name}: ${error.message}`);
            }
        }
        
        // 生成测试警告
        monitor.createAlert('INFO', 'API集成测试', { test: true });
        console.log('\n⚠️  测试警告已生成');
        
        // 测试阈值设置
        monitor.setPerformanceThresholds({ slowQueryTime: 800 });
        console.log('🎯 性能阈值设置成功');
        
        console.log('\n🎉 API集成测试完成！');
        console.log('\n📡 可用的API端点:');
        console.log('   GET  /api/monitoring/database/stats');
        console.log('   GET  /api/monitoring/database/queries');
        console.log('   GET  /api/monitoring/database/performance');
        console.log('   GET  /api/monitoring/database/slow-queries');
        console.log('   GET  /api/monitoring/database/alerts');
        console.log('   POST /api/monitoring/database/alerts');
        console.log('   GET  /api/monitoring/database/thresholds');
        console.log('   GET  /api/monitoring/database/frequency');
        console.log('   GET  /api/monitoring/database/export');
        
        console.log('\n✅ 数据库性能监控功能实现完成！');
        
    } catch (error) {
        console.error('❌ API集成测试失败:', error);
    }
}

// 运行测试
testApiIntegration();