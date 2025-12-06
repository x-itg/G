/**
 * 静态资源缓存系统演示脚本
 * 展示如何在放射化学纯度检测仪中集成使用
 */

const { StaticCache } = require('./staticCache');
const cacheConfig = require('./cacheConfig');

async function demonstrateStaticCache() {
    console.log('🎯 放射化学纯度检测仪 - 静态资源缓存系统演示\n');
    console.log('='.repeat(60));

    try {
        // 1. 创建缓存系统
        console.log('\n📋 步骤1: 创建缓存系统实例');
        const cacheSystem = new StaticCache(cacheConfig);
        console.log('✅ 缓存系统实例创建成功');

        // 2. 初始化缓存系统
        console.log('\n📋 步骤2: 初始化缓存系统');
        await cacheSystem.initialize();
        console.log('✅ 缓存系统初始化完成');

        // 3. 演示基本缓存操作
        console.log('\n📋 步骤3: 演示基本缓存操作');
        
        // 模拟CSS文件缓存
        const cssContent = `
        body {
            background-color: #f0f0f0;
            font-family: Arial, sans-serif;
        }
        .header {
            background-color: #333;
            color: white;
            padding: 20px;
        }
        `;
        
        const cssBuffer = Buffer.from(cssContent);
        const cssCacheKey = cacheSystem.generateCacheKey('/assets/main.css');
        
        await cacheSystem.set(cssCacheKey, {
            data: cssBuffer,
            etag: cacheSystem.generateETag(cssBuffer),
            lastModified: new Date().toISOString(),
            cacheControl: cacheSystem.getCacheControl('/assets/main.css'),
            compressed: cacheSystem.shouldCompress('/assets/main.css', cssBuffer),
            size: cssBuffer.length,
            urlPath: '/assets/main.css',
            timestamp: Date.now()
        });
        
        console.log('✅ CSS文件已缓存:', cssBuffer.length, '字节');

        // 模拟JS文件缓存
        const jsContent = `
        document.addEventListener('DOMContentLoaded', function() {
            console.log('放射化学纯度检测仪启动');
            initRadiationDetector();
        });
        
        function initRadiationDetector() {
            // 初始化检测器逻辑
        }
        `;
        
        const jsBuffer = Buffer.from(jsContent);
        const jsCacheKey = cacheSystem.generateCacheKey('/assets/app.js');
        
        await cacheSystem.set(jsCacheKey, {
            data: jsBuffer,
            etag: cacheSystem.generateETag(jsBuffer),
            lastModified: new Date().toISOString(),
            cacheControl: cacheSystem.getCacheControl('/assets/app.js'),
            compressed: cacheSystem.shouldCompress('/assets/app.js', jsBuffer),
            size: jsBuffer.length,
            urlPath: '/assets/app.js',
            timestamp: Date.now()
        });
        
        console.log('✅ JavaScript文件已缓存:', jsBuffer.length, '字节');

        // 4. 演示缓存获取
        console.log('\n📋 步骤4: 演示缓存获取');
        
        const cachedCSS = await cacheSystem.get(cssCacheKey);
        const cachedJS = await cacheSystem.get(jsCacheKey);
        
        if (cachedCSS && cachedJS) {
            console.log('✅ CSS缓存命中:', cachedCSS.size, '字节');
            console.log('✅ JS缓存命中:', cachedJS.size, '字节');
            console.log('✅ 缓存内容验证通过');
        }

        // 5. 演示统计信息
        console.log('\n📋 步骤5: 获取缓存统计');
        const stats = cacheSystem.getStats();
        console.log('📊 缓存统计:');
        console.log('   内存缓存条目:', stats.memory.entries);
        console.log('   内存缓存命中率:', stats.memory.hitRate + '%');
        console.log('   磁盘缓存条目:', stats.disk.entries);
        console.log('   磁盘缓存命中率:', stats.disk.hitRate + '%');
        console.log('   总体命中率:', stats.overall.hitRate);
        console.log('   总缓存大小:', formatSize(stats.overall.totalSize));

        // 6. 演示缓存文件列表
        console.log('\n📋 步骤6: 获取缓存文件列表');
        const cacheFiles = cacheSystem.getCacheFiles();
        console.log('📁 缓存文件列表:');
        cacheFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.urlPath} (${formatSize(file.size)}) - ${file.type}`);
        });

        // 7. 演示预热功能
        console.log('\n📋 步骤7: 演示缓存预热');
        const warmupPaths = [
            '/index.html',
            '/assets/logo.png',
            '/assets/styles.css'
        ];
        
        await cacheSystem.warmCache(warmupPaths);
        console.log('✅ 缓存预热完成:', warmupPaths.length, '个路径');

        // 8. 演示API路由创建
        console.log('\n📋 步骤8: 创建API路由');
        const { createCacheRoutes } = require('./staticCache');
        const cacheRouter = createCacheRoutes(cacheSystem);
        console.log('✅ API路由创建成功');
        console.log('   可用端点:');
        console.log('   - GET  /api/cache/static/stats   - 获取缓存统计');
        console.log('   - POST /api/cache/static/clear   - 清空缓存');
        console.log('   - POST /api/cache/static/warm    - 预热缓存');
        console.log('   - GET  /api/cache/static/files   - 获取文件列表');

        // 9. 演示压缩功能
        console.log('\n📋 步骤9: 演示压缩功能');
        const largeText = '这是一个大文本内容，'.repeat(100); // 创建大文本
        const textBuffer = Buffer.from(largeText);
        
        console.log('原始大小:', textBuffer.length, '字节');
        
        if (cacheSystem.shouldCompress('/test.txt', textBuffer)) {
            const compressed = await cacheSystem.compress(textBuffer);
            const compressionRatio = ((textBuffer.length - compressed.length) / textBuffer.length * 100).toFixed(1);
            console.log('压缩后大小:', compressed.length, '字节');
            console.log('压缩率:', compressionRatio + '%');
            console.log('✅ 压缩功能正常');
        }

        // 10. 演示清理功能
        console.log('\n📋 步骤10: 演示缓存清理');
        await cacheSystem.cleanup();
        console.log('✅ 缓存清理完成');

        console.log('\n' + '='.repeat(60));
        console.log('🎉 演示完成!');
        console.log('🚀 静态资源缓存系统已准备就绪，可集成到生产环境');

        // 11. 展示集成代码示例
        console.log('\n📋 集成代码示例:');
        console.log(`
// 在您的api-server.js中添加以下代码:

const { StaticCache } = require('./caching/staticCache');
const cacheConfig = require('./caching/cacheConfig');

// 初始化缓存系统
const cacheSystem = new StaticCache(cacheConfig);
await cacheSystem.initialize();

// 添加缓存中间件
app.use(cacheSystem.createMiddleware());

// 添加缓存API路由
const { createCacheRoutes } = require('./caching/staticCache');
app.use('/api/cache/static', createCacheRoutes(cacheSystem));

// 监听缓存事件
cacheSystem.on('fileChanged', ({ filePath, eventType }) => {
    console.log(\`文件变更: \${filePath} (\${eventType})\`);
});

console.log('✅ 静态资源缓存系统集成完成');
        `);

    } catch (error) {
        console.error('❌ 演示过程中发生错误:', error);
    }
}

// 格式化文件大小
function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
    demonstrateStaticCache();
}

module.exports = { demonstrateStaticCache };