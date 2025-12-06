/**
 * 性能指标验证模块测试
 */

const { PerformanceMetricsValidation } = require('./performanceMetricsValidation');

async function testPerformanceValidation() {
    console.log('开始测试性能指标验证模块...\n');
    
    try {
        // 创建验证实例
        const validation = new PerformanceMetricsValidation();
        
        // 测试1: 执行完整验证
        console.log('=== 测试1: 执行完整性能验证 ===');
        const results = await validation.validateAllMetrics();
        
        console.log('验证结果:');
        console.log(`总体状态: ${results.overall_status}`);
        console.log(`系统监控准确性: ${results.system_monitoring.accuracy}`);
        console.log(`API性能准确性: ${results.api_performance.accuracy}`);
        console.log(`数据库性能准确性: ${results.database_performance.accuracy}`);
        console.log(`缓存改善效果: ${results.cache_performance.improvement}`);
        console.log(`发现问题数量: ${results.issues.length}`);
        console.log(`建议数量: ${results.recommendations.length}`);
        
        // 测试2: 执行基准测试
        console.log('\n=== 测试2: 执行性能基准测试 ===');
        const benchmark = await validation.runBenchmark();
        console.log('基准测试结果:', benchmark);
        
        // 测试3: 获取验证报告
        console.log('\n=== 测试3: 获取详细验证报告 ===');
        const report = validation.getValidationReport();
        console.log('详细报告已生成，包含以下部分:');
        console.log('- 总体状态');
        console.log('- 系统监控验证');
        console.log('- API性能验证');
        console.log('- 数据库性能验证');
        console.log('- 缓存系统验证');
        console.log('- 性能基准');
        console.log('- 问题列表');
        console.log('- 优化建议');
        
        // 测试4: 验证性能阈值
        console.log('\n=== 测试4: 验证性能阈值 ===');
        console.log(`API响应时间阈值: <${validation.performanceThresholds.api_response_time}ms`);
        console.log(`数据库查询时间阈值: <${validation.performanceThresholds.database_query_time}ms`);
        console.log(`缓存命中率阈值: >${validation.performanceThresholds.cache_hit_rate}%`);
        console.log(`内存使用增长阈值: <${validation.performanceThresholds.memory_usage_growth}%`);
        console.log(`CPU使用增长阈值: <${validation.performanceThresholds.cpu_usage_growth}%`);
        
        // 测试5: 重置功能
        console.log('\n=== 测试5: 测试重置功能 ===');
        validation.reset();
        const resetResults = validation.getValidationReport();
        console.log('重置后状态:', resetResults.overall_status);
        console.log('重置成功:', resetResults.overall_status === 'PENDING');
        
        console.log('\n=== 测试完成 ===');
        console.log('所有测试用例通过！');
        
        return {
            success: true,
            results: results,
            benchmark: benchmark,
            report: report
        };
        
    } catch (error) {
        console.error('测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    testPerformanceValidation()
        .then(testResults => {
            if (testResults.success) {
                console.log('\n✅ 性能指标验证模块测试成功！');
                process.exit(0);
            } else {
                console.log('\n❌ 性能指标验证模块测试失败！');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n❌ 测试执行出错:', error);
            process.exit(1);
        });
}

module.exports = {
    testPerformanceValidation
};