/**
 * 放射化学纯度检测仪 - 缓存失效策略使用示例
 * 展示如何在实际项目中使用缓存失效系统
 */

const express = require('express');
const { 
    CacheInvalidationManager, 
    createCacheInvalidationRoutes 
} = require('./cacheInvalidation');

// 模拟缓存存储
class MockCacheStore {
    constructor() {
        this.cache = new Map();
    }
    
    async set(key, value, ttl = 3600) {
        this.cache.set(key, {
            value,
            ttl,
            createdAt: Date.now(),
            expiresAt: Date.now() + (ttl * 1000)
        });
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
        return this.cache.delete(key);
    }
    
    async clear() {
        this.cache.clear();
    }
    
    getAllKeys() {
        return Array.from(this.cache.keys());
    }
}

// 创建模拟缓存存储
const cacheStore = new MockCacheStore();

// 扩展缓存失效管理器，集成实际缓存操作
class RadiationCacheManager extends CacheInvalidationManager {
    constructor(config = {}) {
        super(config);
        this.cacheStore = config.cacheStore || new MockCacheStore();
    }
    
    // 重写缓存失效回调
    async onCacheInvalidate(cacheKey, options) {
        await this.cacheStore.delete(cacheKey);
        console.log(`Cache invalidated: ${cacheKey}`);
    }
    
    // 获取缓存键列表
    getAllCacheKeys() {
        return this.cacheStore.getAllKeys();
    }
    
    // 预热缓存
    async warmupCache() {
        const sampleData = {
            'radiation:detection:current': {
                type: 'current_detection',
                value: 'normal',
                timestamp: Date.now()
            },
            'radiation:calibration:status': {
                type: 'calibration',
                status: 'valid',
                lastCalibration: Date.now()
            },
            'radiation:safety:alerts': {
                type: 'safety',
                alerts: [],
                timestamp: Date.now()
            }
        };
        
        for (const [key, value] of Object.entries(sampleData)) {
            await this.cacheStore.set(key, value);
            // 设置TTL失效
            this.setupTTLInvalidation(key, 3600);
        }
        
        console.log('Cache warmed up successfully');
    }
}

// 创建缓存管理器实例
const cacheManager = new RadiationCacheManager({
    cacheStore,
    defaultTTL: 1800, // 30分钟默认TTL
    batchSize: 50,
    smartInvalidation: true,
    predictiveInvalidation: true,
    enableMonitoring: true
});

// 设置缓存失效回调
cacheManager.onCacheInvalidate = async (cacheKey, options) => {
    await cacheStore.delete(cacheKey);
    console.log(`[Cache] Invalidated: ${cacheKey} (${options.type})`);
};

// 监听缓存失效事件
cacheManager.on('cache:invalidated', (result) => {
    console.log(`[Event] Cache invalidated: ${result.key} by ${result.method}`);
});

cacheManager.on('performance:report', (report) => {
    console.log(`[Performance] Success Rate: ${report.metrics.successRate}`);
});

// 创建Express应用
const app = express();
app.use(express.json());

// 添加缓存失效路由
app.use('/api/cache', createCacheInvalidationRoutes(cacheManager));

// 添加业务路由
app.get('/api/detection/current', async (req, res) => {
    const cacheKey = 'radiation:detection:current';
    let data = await cacheStore.get(cacheKey);
    
    if (!data) {
        // 模拟从数据库获取数据
        data = {
            type: 'current_detection',
            value: 'normal',
            timestamp: Date.now(),
            radiation_level: 0.02,
            unit: 'mSv/h'
        };
        
        await cacheStore.set(cacheKey, data);
        // 设置TTL失效
        cacheManager.setupTTLInvalidation(cacheKey, 1800);
    }
    
    res.json({ success: true, data });
});

app.post('/api/detection/calibrate', async (req, res) => {
    try {
        const { equipmentId } = req.body;
        
        // 执行校准逻辑
        const calibrationResult = {
            equipmentId,
            status: 'success',
            timestamp: Date.now(),
            calibrationData: {
                accuracy: 99.8,
                drift: 0.001,
                nextCalibration: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30天后
            }
        };
        
        // 更新缓存
        const cacheKey = `radiation:calibration:${equipmentId}`;
        await cacheStore.set(cacheKey, calibrationResult, 3600);
        cacheManager.setupTTLInvalidation(cacheKey, 3600);
        
        // 触发数据更新事件
        cacheManager.emit('data:updated', {
            type: 'calibration',
            id: equipmentId,
            table: 'equipment',
            operation: 'update',
            timestamp: Date.now()
        });
        
        res.json({ success: true, data: calibrationResult });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/detection/sample/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 模拟删除样本
        const result = {
            sampleId: id,
            deleted: true,
            timestamp: Date.now()
        };
        
        // 失效相关缓存
        await cacheManager.invalidateCache([
            `radiation:sample:${id}`,
            'radiation:samples:list',
            'radiation:detection:stats'
        ], {
            type: 'manual',
            reason: 'Sample deleted'
        });
        
        // 触发用户操作事件
        cacheManager.emit('user:action', {
            type: 'delete',
            userId: 'user123',
            resource: 'sample',
            id,
            timestamp: Date.now()
        });
        
        res.json({ success: true, data: result });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 批量操作示例
app.post('/api/detection/bulk-update', async (req, res) => {
    try {
        const { sampleIds, updates } = req.body;
        
        // 模拟批量更新
        const results = [];
        for (const sampleId of sampleIds) {
            const update = {
                sampleId,
                status: updates.status,
                timestamp: Date.now()
            };
            results.push(update);
            
            // 更新缓存
            await cacheStore.set(`radiation:sample:${sampleId}`, update, 1800);
            cacheManager.setupTTLInvalidation(`radiation:sample:${sampleId}`, 1800);
        }
        
        // 批量失效相关缓存
        const cacheKeys = sampleIds.map(id => `radiation:sample:${id}`);
        cacheKeys.push('radiation:samples:list');
        
        await cacheManager.batchInvalidate({
            keys: cacheKeys,
            options: {
                type: 'bulk_operation',
                reason: 'Bulk sample update'
            }
        });
        
        res.json({ success: true, data: results });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 系统维护接口
app.post('/api/system/maintenance', async (req, res) => {
    try {
        // 触发系统维护事件
        cacheManager.emit('system:event', {
            type: 'maintenance',
            severity: 'info',
            timestamp: Date.now()
        });
        
        // 失效所有缓存
        await cacheManager.invalidateAllCache({
            type: 'system_maintenance',
            reason: 'System maintenance mode'
        });
        
        res.json({ 
            success: true, 
            message: 'System maintenance mode activated, all cache invalidated' 
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 健康检查接口
app.get('/api/health', async (req, res) => {
    const cacheStats = await cacheManager.handleCacheStats({ query: {} }, {
        json: (data) => data
    });
    
    res.json({
        success: true,
        data: {
            status: 'healthy',
            cache: cacheStats.data,
            timestamp: Date.now()
        }
    });
});

// 初始化函数
async function initializeApplication() {
    console.log('Initializing Radiation Detection Cache System...');
    
    // 预热缓存
    await cacheManager.warmupCache();
    
    // 设置定期清理任务
    setInterval(() => {
        console.log('Running periodic cache cleanup...');
        // 这里可以添加定期清理逻辑
    }, 60000); // 每分钟清理一次
    
    console.log('Application initialized successfully');
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
    console.log(`Radiation Detection Cache Server running on port ${PORT}`);
    await initializeApplication();
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        cacheManager.destroy();
        process.exit(0);
    });
});

module.exports = {
    app,
    cacheManager,
    cacheStore,
    initializeApplication
};

// 如果直接运行此文件，启动服务器
if (require.main === module) {
    console.log('Starting Radiation Detection Cache System...');
}