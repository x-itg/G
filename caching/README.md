# 放射化学纯度检测仪 - 缓存管理系统

## 系统概述

放射化学纯度检测仪缓存管理系统是一个完整的缓存解决方案，包括数据库查询缓存和性能监控优化功能。系统采用LRU缓存算法，支持数据压缩、自动失效、性能监控、智能告警、自动优化等特性。

## 🚀 新增功能：缓存性能监控和优化系统

### 核心功能
- **实时性能监控**: 5秒间隔采样，监控缓存命中率、响应时间、内存使用等关键指标
- **智能告警系统**: 支持多级告警（info、warning、critical），可自定义阈值和条件
- **性能趋势分析**: 支持1小时、24小时、7天性能趋势分析，预测性能问题
- **自动优化建议**: 基于性能数据智能生成优化建议，支持自动优化执行
- **分类监控**: 按业务类型（设备、分析、参考、用户）分别监控
- **数据可视化**: 提供Web监控面板，实时展示性能指标和趋势图表

### API接口
- `GET /api/cache/monitor/stats` - 获取缓存性能统计
- `GET /api/cache/monitor/trends` - 获取性能趋势
- `GET /api/cache/monitor/recommendations` - 获取优化建议
- `POST /api/cache/monitor/alerts` - 配置性能告警
- `GET /api/cache/monitor/real-time` - 获取实时监控数据
- `POST /api/cache/monitor/optimize` - 执行自动优化
- `GET /api/cache/monitor/export` - 导出监控数据

### 使用示例
```javascript
const { CacheMonitor, integrateCacheMonitoringRoutes } = require('./cacheMonitor');

// 创建缓存监控实例
const cacheMonitor = new CacheMonitor({
    samplingInterval: 5000,        // 5秒采样间隔
    hitRateThreshold: 0.7,         // 70%命中率告警阈值
    memoryUsageThreshold: 0.8,     // 80%内存使用率告警阈值
    responseTimeThreshold: 100     // 100ms响应时间告警阈值
});

// 注册缓存实例
cacheMonitor.registerCache('myCache', cacheInstance, {
    category: 'analysis',
    priority: 'high'
});

// 记录缓存访问
cacheMonitor.recordAccess('myCache', 'key-1', true, 25, 'analysis');

// 集成API路由
integrateCacheMonitoringRoutes(app, cacheMonitor);
```

### Web监控面板
访问 `/cache-monitor` 查看实时监控面板，包含：
- 实时性能指标展示
- 当前告警状态监控
- 性能趋势图表分析
- 智能优化建议面板
- 一键优化操作控制

### 监控指标
| 指标类型 | 监控内容 | 告警阈值 | 单位 |
|---------|---------|---------|------|
| 缓存命中率 | 整体和分类命中率 | < 70% | 百分比 |
| 响应时间 | 缓存访问平均响应时间 | > 100ms | 毫秒 |
| 内存使用率 | 缓存占用系统内存比例 | > 80% | 百分比 |
| 缓存大小 | 当前缓存项数量 | - | 个数 |
| 失效频率 | 单位时间缓存失效次数 | > 30% | 百分比 |

### 快速测试
```bash
# 运行缓存监控测试
node cacheMonitorTest.js

# 启动监控示例
node cacheIntegrationExample.js
# 访问 http://localhost:3002/cache-monitor 查看监控面板
```

---

## 📋 原有功能：数据库查询缓存系统

放射化学纯度检测仪数据库查询缓存系统是一个高性能的缓存解决方案，专门为优化数据库查询性能而设计。系统采用LRU缓存算法，支持数据压缩、自动失效、性能监控等特性。

## 主要特性

### 🚀 核心功能
- **LRU缓存算法**: 高效的最近最少使用算法
- **查询结果压缩**: 自动压缩大结果集节省内存
- **自动缓存失效**: 数据更新时自动清理相关缓存
- **查询装饰器模式**: 透明的缓存集成
- **性能监控**: 实时监控缓存性能指标

### 📊 缓存策略
- **用户列表查询**: 缓存10分钟
- **测量数据查询**: 缓存5分钟
- **统计数据查询**: 缓存15分钟
- **权限查询**: 缓存30分钟
- **实时操作**: 不缓存

### 🔧 技术特性
- **内存管理**: 智能内存使用控制和优化
- **查询计划缓存**: 缓存复杂查询的执行计划
- **预热机制**: 系统启动时预加载常用数据
- **慢查询检测**: 自动识别和报告慢查询
- **热门查询追踪**: 统计和分析热门查询

## 文件结构

```
caching/
├── databaseCache.js          # 数据库缓存实现
├── cacheIntegration.js       # 缓存集成器
├── cacheRoutes.js           # API路由
├── cacheMonitor.js          # 缓存性能监控系统
├── cacheMonitorTest.js      # 监控功能测试
├── cacheIntegrationExample.js # 监控集成示例
├── index.js                 # 主入口文件
├── test/
│   └── cacheSystemTest.js  # 系统测试
└── README.md               # 说明文档
```

## 快速开始

### 1. 基本使用

```javascript
const { DatabaseCacheSystem } = require('./caching');
const SimplifiedDatabaseManager = require('./database/SimplifiedDatabaseManager');

// 创建数据库管理器
const dbManager = new SimplifiedDatabaseManager();
dbManager.initialize();

// 创建缓存系统
const cacheSystem = new DatabaseCacheSystem(dbManager);

// 初始化缓存系统
await cacheSystem.initialize();

// 获取缓存统计
const stats = cacheSystem.getStatus();
console.log('缓存命中率:', stats.cache.hitRate + '%');
```

### 2. 集成到Express应用

```javascript
const express = require('express');
const app = express();
const { DatabaseCacheSystem } = require('./caching');

const dbManager = new SimplifiedDatabaseManager();
dbManager.initialize();

// 创建缓存系统并集成Express
const cacheSystem = new DatabaseCacheSystem(dbManager, app);

// 初始化
await cacheSystem.initialize();

// 现在可以通过API管理缓存
// GET /api/cache/database/stats
// POST /api/cache/database/clear
// POST /api/cache/database/invalidate
```

### 3. 手动缓存操作

```javascript
const { DatabaseCache } = require('./caching/databaseCache');

const cache = new DatabaseCache();

// 设置缓存
await cache.set('user:123', { name: '张三', role: 'admin' }, {
    ttl: 10 * 60 * 1000, // 10分钟
    queryType: 'user_list',
    userId: '123'
});

// 获取缓存
const user = await cache.get('user:123');

// 失效缓存
await cache.invalidate('user:*');

// 获取统计
const stats = cache.getStats();
console.log('缓存命中率:', stats.hitRate + '%');
```

## API接口

### 缓存统计
```http
GET /api/cache/database/stats
```
返回缓存系统的详细统计信息，包括命中率、内存使用、热门查询等。

### 清空缓存
```http
POST /api/cache/database/clear
```
清空所有缓存条目。

### 失效特定缓存
```http
POST /api/cache/database/invalidate
Content-Type: application/json

{
    "pattern": "user:*"
}
```
使用模式匹配失效特定缓存条目。

### 获取热门查询
```http
GET /api/cache/database/queries?limit=20
```
获取最热门的查询列表。

### 更新配置
```http
POST /api/cache/database/config
Content-Type: application/json

{
    "maxMemory": 200 * 1024 * 1024,
    "defaultTTL": 600000,
    "cacheStrategies": {
        "custom_query": {
            "ttl": 300000,
            "maxSize": 1000
        }
    }
}
```

### 缓存预加载
```http
POST /api/cache/database/preload
Content-Type: application/json

{
    "queryTypes": ["user_list", "statistics", "permissions"]
}
```

### 性能统计
```http
GET /api/cache/database/performance
```
获取查询性能统计和慢查询报告。

### 健康检查
```http
GET /api/cache/database/health
```
检查缓存系统健康状态。

## 配置选项

### 基本配置
```javascript
{
    maxMemory: 100 * 1024 * 1024,      // 最大内存使用 (100MB)
    maxEntries: 10000,                 // 最大缓存条目数
    defaultTTL: 5 * 60 * 1000,         // 默认TTL (5分钟)
    compressionEnabled: true,           // 启用数据压缩
    statsEnabled: true                  // 启用性能统计
}
```

### 缓存策略配置
```javascript
{
    cacheStrategies: {
        'user_list': {
            ttl: 10 * 60 * 1000,        // 10分钟
            maxSize: 1000               // 最大条目数
        },
        'measurement_data': {
            ttl: 5 * 60 * 1000,         // 5分钟
            maxSize: 5000
        },
        'statistics': {
            ttl: 15 * 60 * 1000,        // 15分钟
            maxSize: 2000
        },
        'permissions': {
            ttl: 30 * 60 * 1000,        // 30分钟
            maxSize: 1000
        },
        'real_time': {
            ttl: 0,                     // 不缓存
            maxSize: 0
        }
    }
}
```

## 性能优化建议

### 1. 内存优化
- 根据应用内存情况调整 `maxMemory` 配置
- 启用数据压缩 (`compressionEnabled: true`)
- 定期执行缓存清理和维护

### 2. 缓存策略优化
- 根据查询频率调整不同类型的TTL
- 对于频繁查询的数据，使用更长的TTL
- 对于数据变化频繁的查询，使用较短的TTL或不缓存

### 3. 查询优化
- 使用查询装饰器自动缓存常用查询
- 避免缓存过大的结果集
- 合理设置缓存键的命名规范

### 4. 监控和调优
- 定期查看缓存命中率，低于60%需要优化
- 监控慢查询数量，及时优化数据库查询
- 关注内存使用率，避免超过85%

## 故障排除

### 缓存命中率低
**可能原因:**
- 缓存TTL设置过短
- 查询模式变化频繁
- 缓存键生成策略不合理

**解决方案:**
- 增加相关查询类型的TTL
- 优化查询模式的一致性
- 检查缓存键生成逻辑

### 内存使用过高
**可能原因:**
- 缓存数据过大
- 内存限制设置不当
- 缓存清理不及时

**解决方案:**
- 启用数据压缩
- 调整 `maxMemory` 配置
- 定期执行缓存清理

### 缓存失效频繁
**可能原因:**
- 数据更新过于频繁
- 缓存失效策略过于激进
- 查询参数变化过多

**解决方案:**
- 优化数据更新策略
- 调整失效策略
- 使用更精确的缓存键

## 最佳实践

### 1. 缓存键设计
```javascript
// 好的缓存键设计
const cacheKey = `query:${table}:${operation}:${paramsHash}:${userId}`;

// 避免过于具体或过于宽泛
```

### 2. 缓存数据选择
- 缓存计算成本高的查询结果
- 缓存相对稳定的数据
- 避免缓存过于庞大的数据集

### 3. 缓存更新策略
- 在数据更新时及时失效相关缓存
- 使用事件驱动的方式自动清理缓存
- 定期执行缓存预热

### 4. 性能监控
- 设置合适的监控指标阈值
- 定期查看性能报告
- 根据业务需求调整配置

## 测试

运行缓存系统测试：
```bash
node caching/test/cacheSystemTest.js
```

测试包括：
- 缓存基本操作测试
- 缓存策略测试
- 查询装饰器测试
- 缓存集成测试
- 性能监控测试
- 内存管理测试
- 缓存失效测试

## 监控和运维

### 关键指标
- **缓存命中率**: 目标 > 60%
- **内存使用率**: 目标 < 85%
- **平均查询时间**: 目标 < 100ms
- **慢查询数量**: 目标 < 10个

### 运维任务
- 每日检查缓存健康状态
- 每周生成性能报告
- 每月清理过期缓存
- 定期备份缓存配置

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

## 更新日志

### v2.0.0 (2025-12-06)
- 新增缓存性能监控和优化系统
- 实现实时性能监控和趋势分析
- 添加智能告警机制和优化建议
- 提供Web监控面板和数据可视化
- 支持自动优化执行和性能调优
- 完成监控功能测试和验证

### v1.0.0 (2025-12-06)
- 初始版本发布
- 实现基础缓存功能
- 添加性能监控
- 集成API接口
- 完成系统测试

## 支持

如有问题或建议，请联系开发团队或提交Issue。