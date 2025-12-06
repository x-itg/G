/**
 * 静态资源缓存系统集成示例
 * 演示如何在现有的API服务器中集成缓存系统
 */

const express = require('express');
const path = require('path');
const { StaticCache, createCacheRoutes } = require('./staticCache');
const cacheConfig = require('./cacheConfig');

/**
 * 在现有API服务器中集成静态资源缓存的示例
 */
class StaticCacheIntegration {
    constructor() {
        this.cacheSystem = null;
        this.app = null;
    }

    /**
     * 初始化缓存系统
     */
    async initializeCache(app) {
        try {
            // 创建缓存系统实例
            this.cacheSystem = new StaticCache(cacheConfig);
            this.app = app;

            // 注册缓存中间件 - 在静态文件中间件之前
            app.use(this.cacheSystem.createMiddleware());

            // 注册缓存API路由
            const cacheRouter = createCacheRoutes(this.cacheSystem);
            app.use('/api/cache/static', cacheRouter);

            // 监听缓存事件
            this.setupCacheEventListeners();

            // 预热缓存
            await this.prewarmCache();

            console.log('✅ 静态资源缓存系统集成完成');
            return true;

        } catch (error) {
            console.error('❌ 静态资源缓存系统集成失败:', error);
            return false;
        }
    }

    /**
     * 设置缓存事件监听器
     */
    setupCacheEventListeners() {
        if (!this.cacheSystem) return;

        // 缓存初始化完成
        this.cacheSystem.on('initialized', () => {
            console.log('📊 缓存系统已初始化');
        });

        // 文件变更事件
        this.cacheSystem.on('fileChanged', ({ filePath, eventType }) => {
            console.log(`📁 文件变更: ${filePath} (${eventType})`);
        });

        // 统计更新事件
        this.cacheSystem.on('statsUpdate', (stats) => {
            console.log(`📈 缓存统计 - 命中率: ${stats.overall.hitRate}, 总大小: ${this.formatSize(stats.overall.totalSize)}`);
        });

        // 缓存清理事件
        this.cacheSystem.on('cleanup', () => {
            console.log('🧹 缓存清理完成');
        });

        // 缓存预热完成
        this.cacheSystem.on('cacheWarmed', ({ paths }) => {
            console.log(`🔥 缓存预热完成: ${paths.length} 个路径`);
        });

        // 缓存清空
        this.cacheSystem.on('cacheCleared', () => {
            console.log('🗑️ 缓存已清空');
        });
    }

    /**
     * 预热缓存
     */
    async prewarmCache() {
        try {
            // 预热默认路径
            await this.cacheSystem.warmCache(cacheConfig.performance.prewarm.paths);

            // 预热特定文件
            const criticalFiles = [
                '/index.html',
                '/assets/main.js',
                '/assets/styles.css',
                '/assets/logo.png'
            ];

            await this.cacheSystem.warmCache(criticalFiles);

            console.log('🚀 缓存预热完成');
        } catch (error) {
            console.error('缓存预热失败:', error);
        }
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats() {
        if (!this.cacheSystem) {
            return { error: '缓存系统未初始化' };
        }
        return this.cacheSystem.getStats();
    }

    /**
     * 手动清理缓存
     */
    async clearCache() {
        if (!this.cacheSystem) {
            throw new Error('缓存系统未初始化');
        }
        await this.cacheSystem.clearCache();
    }

    /**
     * 获取缓存文件列表
     */
    getCacheFiles() {
        if (!this.cacheSystem) {
            return { error: '缓存系统未初始化' };
        }
        return this.cacheSystem.getCacheFiles();
    }

    /**
     * 格式化文件大小
     */
    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * 销毁缓存系统
     */
    async destroy() {
        if (this.cacheSystem) {
            await this.cacheSystem.destroy();
            this.cacheSystem = null;
        }
    }
}

/**
 * 在现有API服务器中集成缓存的示例代码
 */
function integrateCacheWithExistingServer() {
    // 在api-server.js中添加以下代码：

    // 1. 导入缓存系统
    const StaticCacheIntegration = require('./caching/staticCacheIntegration');
    
    // 2. 在应用初始化后添加缓存
    const staticCacheIntegration = new StaticCacheIntegration();
    
    // 3. 在服务器启动    app.listen(P时初始化缓存
ORT, async () => {
        console.log(`🚀 服务器运行在端口 ${PORT}`);
        
        // 初始化缓存系统
        const cacheInitialized = await staticCacheIntegration.initializeCache(app);
        if (cacheInitialized) {
            console.log('✅ 静态资源缓存系统已启用');
        }
    });

    // 4. 添加缓存相关的路由
    app.get('/api/system/cache-stats', (req, res) => {
        try {
            const stats = staticCacheIntegration.getCacheStats();
            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // 5. 添加缓存清理路由
    app.post('/api/system/clear-cache', async (req, res) => {
        try {
            await staticCacheIntegration.clearCache();
            res.json({
                success: true,
                message: '缓存已清理',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // 6. 优雅关闭时清理缓存
    process.on('SIGINT', async () => {
        console.log('\n正在清理资源...');
        await staticCacheIntegration.destroy();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n正在清理资源...');
        await staticCacheIntegration.destroy();
        process.exit(0);
    });
}

/**
 * 使用示例：完整的API服务器集成
 */
function createOptimizedServer() {
    const app = express();
    const staticCacheIntegration = new StaticCacheIntegration();

    // 中间件顺序很重要
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 安全中间件
    app.use(helmet());
    app.use(cors());

    // 缓存中间件 - 在静态文件之前
    app.use((req, res, next) => {
        // 只有静态资源才使用缓存
        const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.html', '.woff', '.woff2', '.ttf', '.eot'];
        const fileExtension = path.extname(req.path).toLowerCase();
        
        if (staticExtensions.includes(fileExtension)) {
            // 使用缓存中间件
            staticCacheIntegration.cacheSystem?.createMiddleware()(req, res, next);
        } else {
            next();
        }
    });

    // 静态文件服务 - 带缓存头
    app.use(express.static(path.join(__dirname, 'public'), {
        etag: true,
        lastModified: true,
        maxAge: '1h'
    }));

    // 缓存API路由
    app.use('/api/cache', createCacheRoutes(staticCacheIntegration.cacheSystem));

    // 启动服务器
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, async () => {
        console.log(`🚀 优化服务器运行在端口 ${PORT}`);
        await staticCacheIntegration.initializeCache(app);
    });

    return { app, staticCacheIntegration };
}

module.exports = {
    StaticCacheIntegration,
    integrateCacheWithExistingServer,
    createOptimizedServer
};

// 如果直接运行此文件，执行演示
if (require.main === module) {
    console.log('🎯 静态资源缓存系统演示');
    console.log('📋 可用的集成方式:');
    console.log('1. StaticCacheIntegration - 集成到现有服务器');
    console.log('2. createOptimizedServer - 创建优化的服务器');
    console.log('3. integrateCacheWithExistingServer - 集成示例代码');
    
    // 演示创建优化服务器
    const { app, staticCacheIntegration } = createOptimizedServer();
}