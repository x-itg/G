# 放射化学纯度检测仪 - 静态资源缓存系统

## 概述

这是一个为放射化学纯度检测仪设计的静态资源缓存系统，支持内存缓存、磁盘缓存、Gzip压缩、版本控制等特性。

## 功能特性

### 🚀 核心功能
- **双层缓存架构**: 内存缓存 + 磁盘缓存
- **智能压缩**: Gzip压缩支持，减少传输大小
- **版本控制**: ETag和Last-Modified支持
- **文件监控**: 自动检测文件变更并清理缓存
- **缓存预热**: 预加载常用资源，提升用户体验

### 📁 支持的文件类型
- **CSS/JS文件**: 缓存7天，版本控制
- **图片文件**: 缓存30天，ETag验证
- **HTML页面**: 缓存1小时，动态更新
- **字体文件**: 缓存90天，长期缓存

### ⚡ 性能优化
- 异步文件读取和缓存
- 智能缓存大小限制
- 自动清理过期缓存
- 缓存命中率统计

## 文件结构

```
caching/
├── staticCache.js              # 核心缓存系统
├── cacheConfig.js              # 配置文件
├── staticCacheIntegration.js   # 集成示例
├── staticCacheTest.js          # 测试文件
└── README.md                   # 说明文档
```

## 快速开始

### 1. 基本使用

```javascript
const { StaticCache } = require('./caching/staticCache');
const cacheConfig = require('./caching/cacheConfig');

// 创建缓存系统
const cacheSystem = new StaticCache(cacheConfig);

// 初始化
await cacheSystem.initialize();

// 使用中间件
app.use(cacheSystem.createMiddleware());
```

### 2. 集成到现有项目

```javascript
const { StaticCacheIntegration } = require('./caching/staticCacheIntegration');

// 创建集成器
const staticCacheIntegration = new StaticCacheIntegration();

// 初始化缓存系统
await staticCacheIntegration.initializeCache(app);
```

### 3. 创建优化服务器

```javascript
const { createOptimizedServer } = require('./caching/staticCacheIntegration');

// 创建优化服务器
const { app, staticCacheIntegration } = createOptimizedServer();
```

## API 接口

### 缓存统计
```
GET /api/cache/static/stats
```

返回缓存统计信息：
```json
{
  "success": true,
  "data": {
    "memory": {
      "size": 1024000,
      "hits": 150,
      "misses": 25,
      "hitRate": "85.71%"
    },
    "disk": {
      "size": 5120000,
      "hits": 300,
      "misses": 50,
      "hitRate": "85.71%"
    },
    "overall": {
      "hitRate": "85.71%",
      "totalSize": 6144000,
      "cacheTypes": 5
    }
  }
}
```

### 清空缓存
```
POST /api/cache/static/clear
```

### 预热缓存
```
POST /api/cache/static/warm
Content-Type: application/json

{
  "paths": ["/", "/assets/", "/styles/"]
}
```

### 获取缓存文件列表
```
GET /api/cache/static/files
```

## 配置选项

### 缓存配置 (cacheConfig.js)

```javascript
module.exports = {
    // 缓存目录
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
        css: {
            ttl: 7 * 24 * 3600000,
            cacheControl: 'public, max-age=604800, immutable'
        },
        js: {
            ttl: 7 * 24 * 3600000,
            cacheControl: 'public, max-age=604800, immutable'
        },
        image: {
            ttl: 30 * 24 * 3600000,
            cacheControl: 'public, max-age=2592000'
        },
        html: {
            ttl: 3600000,
            cacheControl: 'public, max-age=3600, must-revalidate'
        },
        font: {
            ttl: 90 * 24 * 3600000,
            cacheControl: 'public, max-age=7776000, immutable'
        }
    }
};
```

## 缓存策略

### 文件类型策略

| 文件类型 | 缓存时间 | 策略 | 说明 |
|---------|---------|------|------|
| CSS/JS | 7天 | 版本控制 | 适合带hash的文件 |
| 图片 | 30天 | ETag验证 | 适合静态图片资源 |
| HTML | 1小时 | 动态更新 | 适合经常变化的内容 |
| 字体 | 90天 | 长期缓存 | 适合稳定的字体文件 |

### 压缩策略

- **启用条件**: 文件大小超过阈值(默认1KB)
- **压缩级别**: 1-9级，默认6级
- **排除文件**: 图片、字体等二进制文件

## 监控和调试

### 事件监听

```javascript
cacheSystem.on('fileChanged', ({ filePath, eventType }) => {
    console.log(`文件变更: ${filePath} (${eventType})`);
});

cacheSystem.on('statsUpdate', (stats) => {
    console.log(`缓存统计 - 命中率: ${stats.overall.hitRate}`);
});
```

### 性能监控

```javascript
// 获取缓存统计
const stats = cacheSystem.getStats();
console.log(`内存缓存命中率: ${stats.memory.hitRate}%`);
console.log(`磁盘缓存命中率: ${stats.disk.hitRate}%`);
console.log(`总体命中率: ${stats.overall.hitRate}`);
```

## 测试

运行测试：

```bash
node staticCacheTest.js
```

测试覆盖：
- ✅ 缓存系统初始化
- ✅ 基本缓存功能
- ✅ 不同文件类型缓存
- ✅ 压缩功能
- ✅ API接口
- ✅ 缓存性能
- ✅ 清理功能

## 性能优化建议

### 1. 缓存预热
在服务器启动时预热常用资源：

```javascript
await cacheSystem.warmCache([
    '/',
    '/assets/main.js',
    '/assets/styles.css',
    '/assets/logo.png'
]);
```

### 2. 监控缓存命中率
定期检查缓存性能，目标是达到80%以上的命中率。

### 3. 合理设置缓存时间
- 静态资源(CSS/JS): 7天
- 图片资源: 30天
- HTML页面: 1小时
- 字体文件: 90天

### 4. 启用压缩
对于文本文件启用Gzip压缩，可以减少50-80%的传输大小。

## 故障排除

### 常见问题

**Q: 缓存命中率低怎么办？**
A: 检查缓存配置，适当增加TTL时间，并确保预热常用资源。

**Q: 内存使用过高怎么办？**
A: 调整内存缓存大小限制，启用磁盘缓存作为后备。

**Q: 文件变更后缓存未更新？**
A: 检查文件监控是否启用，或手动清理缓存。

**Q: 压缩效果不明显？**
A: 确认文件类型，图片和字体文件不会压缩，检查压缩阈值设置。

### 调试模式

启用详细日志：

```javascript
cacheConfig.logging = {
    level: 'debug',
    enableConsole: true
};
```

## 许可证

MIT License - 详见项目根目录的LICENSE文件。

## 贡献

欢迎提交Issue和Pull Request来改进这个缓存系统。

## 更新日志

### v1.0.0 (2025-12-06)
- ✅ 初始版本发布
- ✅ 基础缓存功能
- ✅ 双层缓存架构
- ✅ Gzip压缩支持
- ✅ API接口
- ✅ 集成示例
- ✅ 完整测试覆盖