const { ApiCache, createCacheMiddleware } = require('./apiCache');
const { createCacheRoutes } = require('./cacheRoutes');
const express = require('express');

/**
 * API缓存系统测试
 */
function testApiCache() {
    console.log('🚀 开始API缓存系统测试...\n');
    
    // 1. 创建缓存实例
    console.log('1. 创建缓存实例...');
    const cache = new ApiCache({
        maxCacheSize: 50 * 1024 * 1024, // 50MB
        maxCacheItems: 100,
        cleanupInterval: 30000, // 30秒
        enableMonitoring: true
    });
    
    // 2. 测试缓存键生成
    console.log('\n2. 测试缓存键生成...');
    const key1 = cache.generateCacheKey('GET', '/api/data/measurements', 'user1', { page: 1, limit: 10 });
    const key2 = cache.generateCacheKey('GET', '/api/data/measurements', 'user1', { page: 1, limit: 10 });
    const key3 = cache.generateCacheKey('GET', '/api/data/measurements', 'user2', { page: 1, limit: 10 });
    
    console.log('缓存键1:', key1);
    console.log('缓存键2:', key2);
    console.log('缓存键3:', key3);
    console.log('✓ 键1和键2相同:', key1 === key2);
    console.log('✓ 键1和键3不同:', key1 !== key3);
    
    // 3. 测试缓存设置和获取
    console.log('\n3. 测试缓存设置和获取...');
    const testData = {
        measurements: [
            { id: 1, value: 100, timestamp: new Date().toISOString() },
            { id: 2, value: 200, timestamp: new Date().toISOString() }
        ],
        total: 2,
        page: 1
    };
    
    cache.set(key1, testData, 5 * 60 * 1000); // 5分钟过期
    const cachedData = cache.get(key1);
    
    console.log('原始数据:', JSON.stringify(testData, null, 2));
    console.log('缓存数据:', JSON.stringify(cachedData, null, 2));
    console.log('✓ 数据匹配:', JSON.stringify(testData) === JSON.stringify(cachedData));
    
    // 4. 测试缓存统计
    console.log('\n4. 测试缓存统计...');
    const stats = cache.getStats();
    console.log('缓存统计:', {
        hits: stats.hits,
        misses: stats.misses,
        totalRequests: stats.totalRequests,
        hitRatio: stats.hitRatio + '%',
        cacheSize: stats.cacheSize + ' bytes',
        totalItems: stats.totalItems
    });
    
    // 5. 测试缓存过期
    console.log('\n5. 测试缓存过期...');
    const shortExpiryKey = cache.generateCacheKey('GET', '/api/realtime/data', 'user1', {});
    cache.set(shortExpiryKey, { data: 'temporary' }, 100); // 100毫秒过期
    
    console.log('设置短期缓存...');
    const immediateData = cache.get(shortExpiryKey);
    console.log('✓ 立即获取成功:', immediateData !== null);
    
    setTimeout(() => {
        const expiredData = cache.get(shortExpiryKey);
        console.log('✓ 过期后获取失败:', expiredData === null);
        
        // 6. 测试缓存清理
        console.log('\n6. 测试缓存清理...');
        const beforeCleanup = cache.getStats();
        cache.cleanup();
        const afterCleanup = cache.getStats();
        
        console.log('清理前项目数:', beforeCleanup.totalItems);
        console.log('清理后项目数:', afterCleanup.totalItems);
        
        // 7. 测试缓存失效
        console.log('\n7. 测试缓存失效...');
        const patternKey = cache.generateCacheKey('GET', '/api/users/profile', 'user1', {});
        cache.set(patternKey, { user: 'profile' }, 60000);
        
        const beforeInvalidate = cache.get(patternKey);
        console.log('失效前获取:', beforeInvalidate !== null);
        
        const invalidatedCount = cache.invalidate('users');
        const afterInvalidate = cache.get(patternKey);
        
        console.log('失效项目数:', invalidatedCount);
        console.log('失效后获取:', afterInvalidate === null);
        
        // 8. 测试健康检查
        console.log('\n8. 测试健康检查...');
        const health = cache.getHealthStatus();
        console.log('健康状态:', health.status);
        console.log('问题列表:', health.issues);
        
        // 9. 测试缓存配置
        console.log('\n9. 测试缓存配置...');
        const config = cache.getConfig();
        console.log('缓存策略:', Object.keys(config.strategies).length, '个');
        console.log('最大缓存大小:', config.maxCacheSize / 1024 / 1024, 'MB');
        console.log('最大缓存项:', config.maxCacheItems);
        
        // 10. 测试缓存预热
        console.log('\n10. 测试缓存预热...');
        const urls = [
            '/api/data/measurements',
            '/api/users/info',
            '/api/system/config'
        ];
        
        const mockFetchFunction = async (url) => {
            return {
                url: url,
                data: `预热数据 for ${url}`,
                timestamp: new Date().toISOString()
            };
        };
        
        cache.warmupCache(urls, mockFetchFunction).then(() => {
            const warmupStats = cache.getStats();
            console.log('预热后缓存项数:', warmupStats.totalItems);
            
            console.log('\n✅ API缓存系统测试完成！');
            console.log('\n📊 最终统计:');
            console.log('   缓存命中率:', warmupStats.hitRatio + '%');
            console.log('   总请求数:', warmupStats.totalRequests);
            console.log('   缓存大小:', (warmupStats.cacheSize / 1024).toFixed(2), 'KB');
            console.log('   内存使用:', (warmupStats.memoryUsage.heapUsed / 1024 / 1024).toFixed(2), 'MB');
        });
        
    }, 200); // 等待200毫秒让短期缓存过期
    
    return cache;
}

/**
 * 测试Express中间件
 */
function testCacheMiddleware() {
    console.log('\n🔧 测试缓存中间件...\n');
    
    const cache = new ApiCache();
    const middleware = createCacheMiddleware(cache);
    
    // 模拟Express请求和响应
    const req = {
        method: 'GET',
        url: '/api/data/measurements',
        query: { page: 1 },
        user: { id: 'test-user' }
    };
    
    const res = {
        json: function(data) {
            console.log('响应数据:', data);
            return data;
        },
        set: function(header, value) {
            console.log(`响应头: ${header} = ${value}`);
        }
    };
    
    const next = function() {
        console.log('中间件调用next()');
        
        // 模拟第一次请求
        console.log('\n--- 第一次请求 (缓存未命中) ---');
        middleware(req, res, next);
        
        // 模拟第二次请求
        setTimeout(() => {
            console.log('\n--- 第二次请求 (缓存命中) ---');
            middleware(req, res, next);
        }, 100);
    };
    
    next();
}

/**
 * 测试缓存路由
 */
function testCacheRoutes() {
    console.log('\n🛣️ 测试缓存路由...\n');
    
    const cache = new ApiCache();
    const routes = createCacheRoutes(cache);
    
    console.log('缓存路由已创建');
    console.log('可用端点:');
    console.log('   GET  /cache/api/stats     - 获取缓存统计');
    console.log('   POST /cache/api/clear     - 清空缓存');
    console.log('   POST /cache/api/invalidate - 失效缓存');
    console.log('   GET  /cache/api/config    - 获取配置');
    console.log('   POST /cache/api/config    - 更新配置');
    console.log('   POST /cache/api/warmup    - 预热缓存');
    console.log('   GET  /cache/api/export    - 导出缓存');
    console.log('   GET  /cache/api/details   - 缓存详情');
    console.log('   GET  /cache/api/performance - 性能指标');
    console.log('   GET  /cache/api/health    - 健康检查');
}

// 运行所有测试
if (require.main === module) {
    try {
        // 测试核心缓存功能
        testApiCache();
        
        // 测试中间件
        setTimeout(() => {
            testCacheMiddleware();
        }, 1000);
        
        // 测试路由
        setTimeout(() => {
            testCacheRoutes();
        }, 2000);
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        process.exit(1);
    }
}

module.exports = {
    testApiCache,
    testCacheMiddleware,
    testCacheRoutes
};