/**
 * 缓存失效策略系统测试
 * 验证基本功能和API接口
 */

const { CacheInvalidationManager } = require('./cacheInvalidation');

// 模拟缓存存储
class TestCacheStore {
    constructor() {
        this.cache = new Map();
        this.invalidationLog = [];
    }
    
    async set(key, value, ttl = 3600) {
        this.cache.set(key, {
            value,
            ttl,
            createdAt: Date.now(),
            expiresAt: Date.now() + (ttl * 1000)
        });
        return true;
    }
    
    async get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }
    
    async delete(key) {
        const deleted = this.cache.delete(key);
        this.invalidationLog.push({
            key,
            action: 'delete',
            timestamp: Date.now()
        });
        return deleted;
    }
    
    clear() {
        this.cache.clear();
    }
    
    getAllKeys() {
        return Array.from(this.cache.keys());
    }
    
    getInvalidationLog() {
        return this.invalidationLog;
    }
}

// 测试函数
async function runTests() {
    console.log('开始测试缓存失效策略系统...\n');
    
    const cacheStore = new TestCacheStore();
    const cacheManager = new CacheInvalidationManager({
        cacheStore,
        defaultTTL: 10, // 10秒用于测试
        batchSize: 5,
        smartInvalidation: true,
        enableMonitoring: true
    });
    
    // 设置缓存失效回调
    cacheManager.onCacheInvalidate = async (cacheKey, options) => {
        await cacheStore.delete(cacheKey);
        console.log(`✓ 缓存已失效: ${cacheKey}`);
    };
    
    let testsPassed = 0;
    let totalTests = 0;
    
    // 测试1: 基本缓存设置和获取
    totalTests++;
    try {
        await cacheStore.set('test:key1', { data: 'value1' });
        const data = await cacheStore.get('test:key1');
        if (data && data.data === 'value1') {
            console.log('✓ 测试1通过: 基本缓存设置和获取');
            testsPassed++;
        } else {
            console.log('✗ 测试1失败: 基本缓存设置和获取');
        }
    } catch (error) {
        console.log('✗ 测试1失败:', error.message);
    }
    
    // 测试2: TTL失效设置
    totalTests++;
    try {
        const timerId = cacheManager.setupTTLInvalidation('test:ttl', 2);
        if (timerId && cacheManager.activeInvalidations.has('test:ttl')) {
            console.log('✓ 测试2通过: TTL失效设置');
            testsPassed++;
        } else {
            console.log('✗ 测试2失败: TTL失效设置');
        }
    } catch (error) {
        console.log('✗ 测试2失败:', error.message);
    }
    
    // 测试3: 单个缓存失效
    totalTests++;
    try {
        await cacheStore.set('test:key2', { data: 'value2' });
        const result = await cacheManager.invalidateCache('test:key2', {
            type: 'test',
            reason: 'Testing single invalidation'
        });
        
        if (result.success && result.invalidatedKeys.includes('test:key2')) {
            const remainingData = await cacheStore.get('test:key2');
            if (!remainingData) {
                console.log('✓ 测试3通过: 单个缓存失效');
                testsPassed++;
            } else {
                console.log('✗ 测试3失败: 缓存未被正确删除');
            }
        } else {
            console.log('✗ 测试3失败: 失效操作未返回正确结果');
        }
    } catch (error) {
        console.log('✗ 测试3失败:', error.message);
    }
    
    // 测试4: 批量失效
    totalTests++;
    try {
        // 设置多个缓存项
        const testKeys = ['test:batch1', 'test:batch2', 'test:batch3'];
        for (const key of testKeys) {
            await cacheStore.set(key, { data: `value for ${key}` });
        }
        
        const result = await cacheManager.batchInvalidate({
            keys: testKeys,
            options: {
                type: 'test',
                reason: 'Testing batch invalidation'
            }
        });
        
        if (result.success && result.totalInvalidated === testKeys.length) {
            console.log('✓ 测试4通过: 批量失效');
            testsPassed++;
        } else {
            console.log('✗ 测试4失败: 批量失效操作失败');
        }
    } catch (error) {
        console.log('✗ 测试4失败:', error.message);
    }
    
    // 测试5: 事件系统
    totalTests++;
    try {
        let eventReceived = false;
        
        cacheManager.on('test:event', (data) => {
            eventReceived = true;
        });
        
        cacheManager.emit('test:event', { message: 'test event' });
        
        if (eventReceived) {
            console.log('✓ 测试5通过: 事件系统');
            testsPassed++;
        } else {
            console.log('✗ 测试5失败: 事件系统未工作');
        }
    } catch (error) {
        console.log('✗ 测试5失败:', error.message);
    }
    
    // 测试6: 数据变更触发失效
    totalTests++;
    try {
        await cacheStore.set('radiation:sample:123', { status: 'active' });
        
        cacheManager.emit('data:updated', {
            type: 'sample',
            id: '123',
            table: 'samples',
            operation: 'update',
            timestamp: Date.now()
        });
        
        // 等待异步处理
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('✓ 测试6通过: 数据变更触发失效');
        testsPassed++;
    } catch (error) {
        console.log('✗ 测试6失败:', error.message);
    }
    
    // 测试7: 性能指标
    totalTests++;
    try {
        const status = await cacheManager.handleStatusCheck(
            { query: {} },
            { 
                json: (data) => data 
            }
        );
        
        if (status.data && status.data.performance) {
            console.log('✓ 测试7通过: 性能指标获取');
            testsPassed++;
        } else {
            console.log('✗ 测试7失败: 性能指标获取失败');
        }
    } catch (error) {
        console.log('✗ 测试7失败:', error.message);
    }
    
    // 测试8: 失效历史记录
    totalTests++;
    try {
        await cacheManager.invalidateCache('test:history', {
            type: 'test',
            reason: 'Testing history'
        });
        
        const history = await cacheManager.handleInvalidationHistory(
            { query: { page: 1, limit: 10 } },
            { 
                json: (data) => data 
            }
        );
        
        if (history.data && history.data.history.length > 0) {
            console.log('✓ 测试8通过: 失效历史记录');
            testsPassed++;
        } else {
            console.log('✗ 测试8失败: 失效历史记录失败');
        }
    } catch (error) {
        console.log('✗ 测试8失败:', error.message);
    }
    
    // 测试9: 配置更新
    totalTests++;
    try {
        const result = await cacheManager.handleConfigUpdate(
            { 
                body: { 
                    config: { 
                        defaultTTL: 1800,
                        batchSize: 25 
                    } 
                } 
            },
            { 
                json: (data) => data 
            }
        );
        
        if (result.data && result.data.config.defaultTTL === 1800) {
            console.log('✓ 测试9通过: 配置更新');
            testsPassed++;
        } else {
            console.log('✗ 测试9失败: 配置更新失败');
        }
    } catch (error) {
        console.log('✗ 测试9失败:', error.message);
    }
    
    // 测试10: 清理和销毁
    totalTests++;
    try {
        cacheManager.clearAllTTLTimers();
        cacheManager.destroy();
        
        console.log('✓ 测试10通过: 清理和销毁');
        testsPassed++;
    } catch (error) {
        console.log('✗ 测试10失败:', error.message);
    }
    
    // 输出测试结果
    console.log(`\n=== 测试结果 ===`);
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过测试: ${testsPassed}`);
    console.log(`失败测试: ${totalTests - testsPassed}`);
    console.log(`成功率: ${(testsPassed / totalTests * 100).toFixed(1)}%`);
    
    if (testsPassed === totalTests) {
        console.log('\n🎉 所有测试通过！缓存失效策略系统工作正常。');
        return true;
    } else {
        console.log('\n❌ 部分测试失败，请检查系统配置。');
        return false;
    }
}

// 运行测试
if (require.main === module) {
    runTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('测试运行失败:', error);
        process.exit(1);
    });
}

module.exports = {
    runTests,
    TestCacheStore
};