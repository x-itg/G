/**
 * 缓存系统测试运行示例
 * 
 * 此文件演示如何运行放射化学纯度检测仪缓存系统效果验证测试
 */

const CacheSystemTest = require('./cacheSystemTest');

/**
 * 运行缓存系统测试的示例函数
 */
async function runCacheSystemValidation() {
    console.log('🔬 开始运行放射化学纯度检测仪缓存系统效果验证测试...\n');
    
    try {
        // 创建测试实例
        const cacheTest = new CacheSystemTest();
        
        // 运行所有测试
        await cacheTest.runAllTests();
        
        console.log('\n✅ 缓存系统效果验证测试完成！');
        console.log('📄 请查看生成的测试报告文件了解详细结果。');
        
    } catch (error) {
        console.error('❌ 测试执行失败:', error);
        console.error('💡 请检查以下可能的问题:');
        console.error('   1. API服务器是否正在运行 (http://localhost:3000)');
        console.error('   2. 缓存系统是否已正确集成');
        console.error('   3. 网络连接是否正常');
        console.error('   4. 系统资源是否充足');
    }
}

/**
 * 运行特定测试模块的示例
 */
async function runSpecificTests() {
    const cacheTest = new CacheSystemTest();
    
    console.log('🎯 运行特定缓存测试模块...\n');
    
    try {
        // 仅运行性能基准测试
        console.log('📊 第一阶段：性能基准测试');
        await cacheTest.runBaselinePerformanceTests();
        
        // 仅运行缓存效果测试
        console.log('\n🗄️ 第二阶段：缓存效果测试');
        await cacheTest.testStaticResourceCacheEffectiveness();
        await cacheTest.testApiResponseCacheEffectiveness();
        await cacheTest.testDatabaseQueryCacheEffectiveness();
        
        // 仅运行并发测试
        console.log('\n⚡ 第三阶段：并发性能测试');
        await cacheTest.runConcurrencyTests();
        
    } catch (error) {
        console.error('❌ 特定测试执行失败:', error);
    }
}

/**
 * 监控模式：持续监控缓存性能
 */
async function startCacheMonitoring() {
    const cacheTest = new CacheSystemTest();
    
    console.log('📈 启动缓存性能监控模式...\n');
    
    const monitoringInterval = setInterval(async () => {
        try {
            console.log(`🔍 [${new Date().toISOString()}] 执行缓存性能检查...`);
            
            // 获取缓存统计信息
            const staticStats = await cacheTest.getCacheStats('static');
            const apiStats = await cacheTest.getCacheStats('api');
            const dbStats = await cacheTest.getCacheStats('database');
            
            console.log('📊 缓存统计:');
            console.log(`   静态缓存命中率: ${staticStats?.hitRate || 'N/A'}%`);
            console.log(`   API缓存命中率: ${apiStats?.hitRate || 'N/A'}%`);
            console.log(`   数据库缓存命中率: ${dbStats?.hitRate || 'N/A'}%`);
            console.log(`   总请求数: ${staticStats?.totalRequests + apiStats?.totalRequests + dbStats?.totalRequests || 0}`);
            
            // 检查是否需要优化建议
            if (staticStats?.hitRate < 60) {
                console.log('⚠️  静态缓存命中率较低，建议优化TTL设置');
            }
            
            if (apiStats?.hitRate < 60) {
                console.log('⚠️  API缓存命中率较低，建议检查缓存策略');
            }
            
            if (dbStats?.hitRate < 60) {
                console.log('⚠️  数据库缓存命中率较低，建议优化查询模式');
            }
            
            console.log('---');
            
        } catch (error) {
            console.error('❌ 监控检查失败:', error.message);
        }
    }, 30000); // 每30秒检查一次
    
    // 运行10分钟后停止监控
    setTimeout(() => {
        clearInterval(monitoringInterval);
        console.log('⏹️  缓存性能监控已停止');
    }, 600000);
}

// 如果直接运行此文件
if (require.main === module) {
    const args = process.argv.slice(2);
    
    switch (args[0]) {
        case 'full':
            // 运行完整测试
            runCacheSystemValidation();
            break;
            
        case 'specific':
            // 运行特定测试
            runSpecificTests();
            break;
            
        case 'monitor':
            // 启动监控模式
            startCacheMonitoring();
            break;
            
        default:
            // 默认运行完整测试
            console.log('🚀 运行默认的完整缓存系统测试...\n');
            runCacheSystemValidation();
            console.log('\n💡 使用提示:');
            console.log('   node runCacheSystemTest.js full   - 运行完整测试');
            console.log('   node runCacheSystemTest.js specific - 运行特定测试');
            console.log('   node runCacheSystemTest.js monitor - 启动监控模式');
            break;
    }
}

module.exports = {
    runCacheSystemValidation,
    runSpecificTests,
    startCacheMonitoring
};