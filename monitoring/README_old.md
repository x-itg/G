# 实时性能数据采集和存储系统

为放射化学纯度检测仪提供的统一实时性能数据采集、验证、存储和管理系统。

## 功能特性

### 🚀 核心功能
- **统一数据采集框架** - 支持多源数据聚合（系统、数据库、API、自定义指标）
- **实时数据处理** - 高效的数据采集、验证、清洗和存储
- **数据质量管理** - 数据完整性验证、异常检测、一致性检查
- **数据存储优化** - 时序数据存储、分区索引、数据压缩
- **API接口服务** - RESTful API支持数据查询、配置、备份等操作

### 📊 数据源支持
- **系统监控数据** - CPU、内存、磁盘、网络等系统指标
- **数据库性能数据** - 查询性能、连接池、表统计等
- **API监控数据** - 请求量、响应时间、错误率等
- **自定义指标数据** - 辐射检测器特定指标（温度、电压、辐射水平等）

### 🛠️ 数据管理功能
- **历史数据归档** - 自动清理过期数据
- **数据压缩优化** - 减少存储空间占用
- **数据备份恢复** - 完整的备份和恢复机制
- **数据一致性检查** - 定期验证数据完整性
- **聚合计算引擎** - 支持多维度数据聚合

### 🔧 系统特性
- **事件驱动架构** - 基于Node.js EventEmitter的事件系统
- **配置化管理** - 灵活的配置选项和参数调整
- **错误处理机制** - 完善的错误处理和重试机制
- **性能优化** - 批处理、缓存、内存管理优化

## 文件结构

```
monitoring/
├── dataCollector.js          # 核心数据采集系统
├── dataCollectorAPI.js       # API接口处理器
├── config.js                 # 配置文件
├── dataCollectorExample.js   # 使用示例
├── dataCollectorTest.js      # 测试套件
├── systemMonitor.js          # 系统监控模块（现有）
├── databaseMonitor.js        # 数据库监控模块
├── apiMonitor.js            # API监控模块
├── monitoringRoutes.js      # 路由处理器
├── monitoringService.js     # 服务初始化器
├── examples.js              # 使用示例
├── test.js                  # 功能测试
├── backups/                 # 数据备份目录
├── test-results/           # 测试结果目录
└── README.md              # 项目文档
```

## 安装和使用

### 基本使用

```javascript
const { DataCollector } = require('./monitoring/dataCollector');

// 创建数据采集系统实例
const dataCollector = new DataCollector({
    interval: 5000,        // 5秒采集一次
    maxRecords: 100000,    // 最大记录数
    validationEnabled: true,
    compressionEnabled: true
});

// 启动系统
await dataCollector.start();

// 获取采集状态
const status = dataCollector.getCollectionStatus();
console.log(status);

// 停止系统
await dataCollector.stop();
```

### API接口使用

```javascript
const express = require('express');
const { createDataCollectorAPI } = require('./monitoring/dataCollectorAPI');

const app = express();
const dataCollector = new DataCollector();

// 挂载API路由
app.use('/api/monitoring/collection', createDataCollectorAPI(dataCollector));

app.listen(3001, () => {
    console.log('API服务器运行在端口3001');
});
```

### API接口列表

#### 状态管理
- `GET /api/monitoring/collection/status` - 获取采集状态
- `POST /api/monitoring/collection/start` - 启动数据采集
- `POST /api/monitoring/collection/stop` - 停止数据采集
- `GET /api/monitoring/collection/health` - 健康检查

#### 数据查询
- `GET /api/monitoring/collection/metrics` - 获取聚合指标
- `GET /api/monitoring/collection/raw-metrics` - 获取原始指标数据
- `GET /api/monitoring/collection/summary` - 获取性能摘要
- `GET /api/monitoring/collection/quality-report` - 获取数据质量报告

#### 配置管理
- `POST /api/monitoring/collection/config` - 配置采集参数
- `GET /api/monitoring/collection/sources` - 获取数据源列表
- `PATCH /api/monitoring/collection/sources/:sourceName` - 启用/禁用数据源

#### 数据管理
- `POST /api/monitoring/collection/backup` - 数据备份
- `GET /api/monitoring/collection/backups` - 获取备份列表
- `POST /api/monitoring/collection/restore/:filename` - 恢复数据备份

## 快速开始

### 1. 基本使用

```javascript
const { DataCollector } = require('./monitoring/dataCollector');

// 创建数据采集系统实例
const dataCollector = new DataCollector();

// 启动监控
await dataCollector.start();

// 获取当前状态
const status = dataCollector.getCollectionStatus();
console.log('系统状态:', status);
```

### 2. Express应用集成

```javascript
const express = require('express');
const { createDataCollectorAPI } = require('./monitoring/dataCollectorAPI');

const app = express();
const dataCollector = new DataCollector();

// 集成监控API
app.use('/api/monitoring/collection', createDataCollectorAPI(dataCollector));

app.listen(3001);
```

### 3. 使用监控服务

```javascript
const { createDataCollectorInstance } = require('./monitoring/dataCollectorExample');

// 创建监控服务
const service = createDataCollectorInstance({
    interval: 3000,
    validationEnabled: true,
    anomalyDetectionEnabled: true
});

// 启动服务
await service.start();
```

## API接口文档

### 系统状态接口

#### GET /api/monitoring/system/current
获取当前系统状态和实时监控数据。

**响应示例:**
```json
{
    "success": true,
    "data": {
        "status": "healthy",
        "is_monitoring": true,
        "monitoring_interval": 5000,
        "metrics": {
            "cpu": {
                "usage_percent": 25.5,
                "load_1min": 1.2,
                "cpu_count": 4
            },
            "memory": {
                "usage_percent": 60.3,
                "total_bytes": 8589934592,
                "used_bytes": 5180000000
            },
            "disk": {
                "total_usage_percent": 45.2,
                "drives": [...]
            }
        },
        "alerts": [],
        "timestamp": "2025-12-06T16:08:02.000Z"
    }
}
```

#### GET /api/monitoring/system/history
获取历史监控数据。

**查询参数:**
- `metricName`: 指标名称 (cpu_usage, memory_usage, disk_usage)
- `startDate`: 开始日期 (ISO 8601格式)
- `endDate`: 结束日期 (ISO 8601格式)
- `limit`: 记录数量限制 (默认100)
- `alertLevel`: 警报级别 (NORMAL, WARNING, CRITICAL)

**响应示例:**
```json
{
    "success": true,
    "data": {
        "data": [...],
        "count": 50,
        "filters": {
            "metricType": "SYSTEM",
            "metricName": "cpu_usage",
            "limit": 50
        },
        "timestamp": "2025-12-06T16:08:02.000Z"
    }
}
```

#### POST /api/monitoring/system/start
启动系统监控。

**请求体:**
```json
{
    "interval": 5000  // 采集间隔(毫秒)，可选
}
```

#### POST /api/monitoring/system/stop
停止系统监控。

#### GET /api/monitoring/system/stats
获取监控统计信息。

**响应示例:**
```json
{
    "success": true,
    "data": {
        "is_monitoring": true,
        "monitoring_interval": 5000,
        "uptime_seconds": 3600,
        "memory_usage": {
            "rss": 50485760,
            "heapUsed": 25600000
        },
        "cache_size": 150,
        "max_cache_size": 1000
    }
}
```

### 数据管理接口

#### POST /api/monitoring/system/clean-history
清理历史数据。

**请求体:**
```json
{
    "retentionDays": 30  // 保留天数
}
```

#### PUT /api/monitoring/system/thresholds
更新监控阈值。

**请求体:**
```json
{
    "thresholds": {
        "cpu_warning": 70,
        "cpu_critical": 90,
        "memory_warning": 80,
        "memory_critical": 95
    }
}
```

### 系统信息接口

#### GET /api/monitoring/system/info
获取详细的系统信息。

#### GET /api/monitoring/health
健康检查接口。

#### GET /api/monitoring/system/realtime
获取实时监控数据。

## 配置选项

### 监控阈值配置

```javascript
const thresholds = {
    cpu_warning: 70,      // CPU警告阈值(%)
    cpu_critical: 90,     // CPU严重阈值(%)
    memory_warning: 80,   // 内存警告阈值(%)
    memory_critical: 95,  // 内存严重阈值(%)
    disk_warning: 85,     // 磁盘警告阈值(%)
    disk_critical: 95     // 磁盘严重阈值(%)
};
```

### 服务配置选项

```javascript
const options = {
    defaultInterval: 5000,    // 默认采集间隔(毫秒)
    thresholds: {...},        // 自定义阈值
    autoStart: true          // 是否自动启动监控
};
```

## 数据库集成

监控模块使用现有的`SimplifiedDatabaseManager`进行数据存储：

- **performance_metrics表**: 存储性能指标数据
- **audit_logs表**: 记录监控相关的审计事件
- 支持过滤、排序、分页查询
- 自动创建索引优化查询性能

## 监控指标说明

### CPU指标
- `cpu_usage`: CPU总体使用率百分比
- `load_1min/5min/15min`: 1/5/15分钟平均负载
- `cpu_count`: CPU核心数
- `cpu_model`: CPU型号信息

### 内存指标
- `memory_usage`: 内存使用率百分比
- `total_bytes`: 总内存字节数
- `used_bytes`: 已使用内存字节数
- `free_bytes`: 可用内存字节数
- `process_rss`: 进程常驻内存
- `process_heap_used`: 进程堆内存使用

### 磁盘指标
- `disk_usage`: 磁盘使用率百分比
- `device_id`: 设备标识符
- `total_bytes`: 总存储空间
- `used_bytes`: 已使用空间
- `free_bytes`: 可用空间

## 错误处理

- 自动重试机制
- 详细的错误日志记录
- 优雅降级处理
- 资源清理保证

## 性能优化

- 异步数据采集
- 内存缓存机制
- 批量数据插入
- 连接池管理
- 垃圾回收优化

## 安全考虑

- 输入参数验证
- SQL注入防护
- 资源访问控制
- 审计日志记录
- 敏感信息过滤

## 故障排除

### 常见问题

1. **监控数据不更新**
   - 检查监控是否启动
   - 验证数据库连接
   - 查看错误日志

2. **API响应缓慢**
   - 减少采集间隔
   - 清理历史数据
   - 检查系统负载

3. **内存使用过高**
   - 调整缓存大小
   - 定期清理数据
   - 监控内存泄漏

### 调试模式

```javascript
const monitor = new SystemMonitor(db);
monitor.debug = true; // 启用详细日志
```

## 扩展开发

### 自定义指标

```javascript
// 添加自定义指标采集
class CustomMonitor extends SystemMonitor {
    async collectCustomMetrics() {
        const customData = await this.getCustomData();
        await this.recordMetric('CUSTOM', 'custom_metric', customData.value, 'unit', customData.metadata);
    }
}
```

### 自定义警报

```javascript
// 重写警报计算逻辑
calculateAlertLevel(metricName, value) {
    // 自定义警报逻辑
    return 'WARNING'; // 或 'CRITICAL' 或 'NORMAL'
}
```

## 许可证

本模块遵循项目整体许可证协议。

## 更新日志

### v1.0.0 (2025-12-06)
- 初始版本发布
- 支持CPU、内存、磁盘监控
- 实现历史数据存储
- 提供完整的API接口
- 集成数据库管理
- 添加阈值警报功能