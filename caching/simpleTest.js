/**
 * 简化的缓存失效测试
 * 用于调试时间值问题
 */

const { CacheInvalidationManager } = require('./cacheInvalidation');

// 模拟缓存存储
class SimpleCacheStore {
    constructor() {
        this.cache = new Map();
    }
    
    async set(key, value, ttl = 3600) {
        this.cache.set(key, { value, ttl });
        return true;
    }
    
    async get(key) {
        return this.cache.get(key);
    }
    
    async delete(key) {
        return this.cache.delete(key);
    }
}

async function simpleTest() {
    console.log('开始简单测试...');
    
    const cacheStore = new SimpleCacheStore();
    const cacheManager = new CacheInvalidationManager({
        cacheStore,
        defaultTTL: 10
    });
    
    // 设置简单的缓存失效回调
    cacheManager.onCacheInvalidate = async (cacheKey, options) => {
        await cacheStore.delete(cacheKey);
        console.log(`Cache invalidated: ${cacheKey}`);
    };
    
    try {
        // 测试1: 基本失效
        console.log('测试1: 基本缓存失效');
        await cacheStore.set('test:key1', { data: 'value1' });
        const result1 = await cacheManager.invalidateCache('test:key1', {
            type: 'test',
            reason: 'Basic test'
        });
        console.log('✓ 基本失效成功:', result1.success);
        
        // 测试2: 批量失效
        console.log('\n测试2: 批量失效');
        const keys = ['test:key2', 'test:key3'];
        for (const key of keys) {
            await cacheStore.set(key, { data: `value for ${key}` });
        }
        const result2 = await cacheManager.batchInvalidate({
            keys: keys,
            options: {
                type: 'test',
                reason: 'Batch test'
            }
        });
        console.log('✓ 批量失效成功:', result2.success);
        
        // 测试3: TTL失效
        console.log('\n测试3: TTL失效设置');
        const timerId = cacheManager.setupTTLInvalidation('test:ttl', 1);
        console.log('✓ TTL定时器设置成功:', !!timerId);
        
        // 测试4: 状态检查
        console.log('\n测试4: 状态检查');
        const status = await cacheManager.handleStatusCheck(
            { query: {} },
            { json: (data) => data }
        );
        console.log('✓ 状态检查成功:', status.data ? '有数据' : '无数据');
        
        console.log('\n所有测试通过！');
        
    } catch (error) {
        console.error('测试失败:', error);
        console.error('错误堆栈:', error.stack);
    }
}

simpleTest();