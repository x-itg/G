/**
 * 静态资源缓存配置文件
 */

module.exports = {
    // 缓存目录配置
    cacheDir: './cache',
    
    // 内存缓存配置
    memoryCache: {
        enabled: true,
        maxSize: 100 * 1024 * 1024, // 100MB
        maxEntries: 1000,
        ttl: 3600000 // 1小时
    },
    
    // 磁盘缓存配置
    diskCache: {
        enabled: true,
        maxSize: 500 * 1024 * 1024, // 500MB
        ttl: 24 * 3600000 // 24小时
    },
    
    // 压缩配置
    compression: {
        enabled: true,
        level: 6,
        threshold: 1024 // 1KB以上才压缩
    },
    
    // 文件类型缓存策略
    strategies: {
        // CSS/JS文件：缓存7天，版本控制
        css: {
            ttl: 7 * 24 * 3600000,
            cacheControl: 'public, max-age=604800, immutable'
        },
        js: {
            ttl: 7 * 24 * 3600000,
            cacheControl: 'public, max-age=604800, immutable'
        },
        
        // 图片文件：缓存30天，ETag验证
        image: {
            ttl: 30 * 24 * 3600000,
            cacheControl: 'public, max-age=2592000'
        },
        
        // HTML页面：缓存1小时，动态更新
        html: {
            ttl: 3600000,
            cacheControl: 'public, max-age=3600, must-revalidate'
        },
        
        // 字体文件：缓存90天，长期缓存
        font: {
            ttl: 90 * 24 * 3600000,
            cacheControl: 'public, max-age=7776000, immutable'
        }
    },
    
    // 文件监控配置
    watch: {
        enabled: true,
        interval: 5000 // 5秒检查一次
    },
    
    // 统计配置
    stats: {
        enabled: true,
        interval: 60000 // 1分钟收集一次统计
    },
    
    // 日志配置
    logging: {
        level: 'info', // debug, info, warn, error
        enableConsole: true,
        enableFile: true,
        logDir: './logs'
    },
    
    // 安全配置
    security: {
        maxCacheSize: 1024 * 1024 * 1024, // 1GB
        allowedExtensions: ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.html', '.woff', '.woff2', '.ttf', '.eot'],
        blockedPaths: ['../', '/../', '\\..\\']
    },
    
    // 性能配置
    performance: {
        // 预热策略
        prewarm: {
            enabled: true,
            paths: [
                '/',
                '/assets/',
                '/js/',
                '/styles/',
                '/images/'
            ]
        },
        
        // 清理策略
        cleanup: {
            enabled: true,
            interval: 3600000, // 1小时
            maxAge: 7 * 24 * 3600000 // 7天
        },
        
        // 压缩策略
        compression: {
            types: ['text/css', 'text/javascript', 'text/html', 'application/javascript', 'application/json'],
            excludeTypes: ['image/', 'application/font-', 'application/octet-stream']
        }
    }
};