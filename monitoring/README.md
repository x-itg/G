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

### 数据采集系统接口

#### GET /api/monitoring/collection/status
获取数据采集系统状态和实时监控数据。

**响应示例:**
```json
{
    "success": true,
    "data": {
        "isRunning": true,
        "isCollecting": false,
        "startTime": "2025-12-06T16:08:02.000Z",
        "lastCollection": "2025-12-06T16:08:07.000Z",
        "totalCollected": 1250,
        "totalErrors": 5,
        "activeSources": ["system", "database", "api"],
        "sources": [
            {
                "name": "system",
                "enabled": true,
                "isActive": false,
                "lastCollect": "2025-12-06T16:08:07.000Z",
                "successCount": 415,
                "errorCount": 2,
                "interval": 5000
            }
        ],
        "statistics": {
            "system": { "count": 415, "lastSuccess": "2025-12-06T16:08:07.000Z", "lastError": null },
            "database": { "count": 415, "lastSuccess": "2025-12-06T16:08:07.000Z", "lastError": null }
        }
    },
    "timestamp": "2025-12-06T16:08:02.000Z"
}
```

#### GET /api/monitoring/collection/metrics
获取聚合指标数据。

**查询参数:**
- `metricType`: 指标类型 (system, database, api, custom)
- `metricName`: 指标名称
- `startDate`: 开始日期 (ISO 8601格式)
- `endDate`: 结束日期 (ISO 8601格式)
- `limit`: 记录数量限制 (默认1000)

**响应示例:**
```json
{
    "success": true,
    "data": {
        "cpu_usage": {
            "average": 25.5,
            "min": 10.2,
            "max": 45.8,
            "count": 100
        },
        "memory_usage": {
            "average": 60.3,
            "min": 55.1,
            "max": 68.9,
            "count": 100
        }
    },
    "filters": {
        "startDate": "2025-12-06T15:00:00.000Z",
        "endDate": "2025-12-06T16:00:00.000Z"
    },
    "timestamp": "2025-12-06T16:08:02.000Z"
}
```

#### GET /api/monitoring/collection/raw-metrics
获取原始指标数据。

**查询参数:**
- `metricType`: 指标类型
- `metricName`: 指标名称
- `alertLevel`: 警报级别 (NORMAL, WARNING, CRITICAL)
- `startDate`: 开始日期
- `endDate`: 结束日期
- `limit`: 限制数量 (默认500)

**响应示例:**
```json
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "metricType": "system",
            "metricName": "cpu_usage",
            "value": 25.5,
            "unit": "percent",
            "tags": { "source": "node_process" },
            "timestamp": "2025-12-06T16:08:02.000Z",
            "alertLevel": "NORMAL"
        }
    ],
    "filters": {},
    "count": 1,
    "timestamp": "2025-12-06T16:08:02.000Z"
}
```

#### GET /api/monitoring/collection/quality-report
获取数据质量报告。

**响应示例:**
```json
{
    "success": true,
    "data": {
        "overview": {
            "totalRecords": 10000,
            "timeRange": {
                "start": "2025-12-05T16:08:02.000Z",
                "end": "2025-12-06T16:08:02.000Z"
            },
            "completeness": 98.5,
            "consistency": 99.2,
            "accuracy": 97.8
        },
        "completeness": {
            "score": 98.5,
            "totalRecords": 10000,
            "completeRecords": 9850,
            "missingRecords": 150,
            "issues": ["150 条记录缺少必需字段"]
        },
        "consistency": {
            "score": 99.2,
            "issues": [],
            "issueCount": 0
        },
        "accuracy": {
            "score": 97.8,
            "issues": ["200 个数据点超出合理范围"],
            "issueCount": 1
        },
        "anomalies": {
            "count": 5,
            "anomalies": [
                {
                    "metricName": "cpu_usage",
                    "value": 95.5,
                    "expected": 25.5,
                    "deviation": 70.0,
                    "timestamp": "2025-12-06T12:30:00.000Z",
                    "severity": "high"
                }
            ],
            "severity": { "high": 2, "medium": 3 }
        },
        "recommendations": [
            {
                "type": "accuracy",
                "priority": "high",
                "message": "数据准确性需要改进，建议加强数据验证和异常处理"
            }
        ]
    },
    "timestamp": "2025-12-06T16:08:02.000Z"
}
```

#### POST /api/monitoring/collection/config
配置采集参数。

**请求体:**
```json
{
    "interval": 3000,
    "maxRetries": 5,
    "timeout": 8000,
    "batchSize": 50
}
```

#### POST /api/monitoring/collection/backup
执行数据备份。

**请求体:**
```json
{
    "includeMetrics": true,
    "includeAuditLogs": false,
    "includeUsers": false,
    "outputPath": "./backups"
}
```

**响应示例:**
```json
{
    "success": true,
    "data": {
        "success": true,
        "backupFile": "./backups/backup_2025-12-06T16-08-02-000Z.json",
        "size": 1048576,
        "timestamp": "2025-12-06T16:08:02.000Z"
    },
    "message": "数据备份完成"
}
```

#### GET /api/monitoring/collection/summary
获取性能摘要。

**响应示例:**
```json
{
    "success": true,
    "data": {
        "cpu_usage": 25.5,
        "memory_usage": 60.3,
        "api_response_time": 150.2,
        "active_alerts": 2
    },
    "timestamp": "2025-12-06T16:08:02.000Z"
}
```

#### GET /api/monitoring/collection/health
健康检查接口。

**响应示例:**
```json
{
    "success": true,
    "data": {
        "status": "healthy",
        "isRunning": true,
        "uptime": 3600000,
        "lastCollection": "2025-12-06T16:08:07.000Z",
        "totalCollected": 1250,
        "totalErrors": 5,
        "activeSources": 3
    },
    "timestamp": "2025-12-06T16:08:02.000Z"
}
```

## 配置选项

### 采集配置
```javascript
{
    collection: {
        interval: 5000,        // 采集间隔（毫秒）
        maxRetries: 3,         // 最大重试次数
        timeout: 10000,        // 采集超时时间
        batchSize: 100         // 批处理大小
    }
}
```

### 存储配置
```javascript
{
    storage: {
        maxRecords: 100000,     // 最大记录数
        retentionDays: 30,      // 数据保留天数
        compressionEnabled: true, // 启用压缩
        partitionSize: 10000    // 分区大小
    }
}
```

### 质量检查配置
```javascript
{
    quality: {
        validationEnabled: true,        // 启用数据验证
        anomalyDetectionEnabled: true,  // 启用异常检测
        consistencyCheckEnabled: true,  // 启用一致性检查
        strictness: 'normal'            // 验证严格程度
    }
}
```

## 自定义数据源

```javascript
// 注册自定义数据源
dataCollector.registerDataSource('environmental', {
    name: 'environmentalMonitor',
    type: 'custom',
    enabled: true,
    interval: 10000,
    collector: async () => {
        // 自定义数据采集逻辑
        return [{
            metricType: 'environmental',
            metricName: 'room_temperature',
            value: 22.5,
            unit: 'celsius',
            timestamp: new Date().toISOString()
        }];
    },
    validator: (metric) => {
        // 自定义验证逻辑
        return metric.value >= -50 && metric.value <= 100;
    }
});
```

## 数据模型

### 指标数据结构
```javascript
{
    metricType: 'system|database|api|custom|aggregated',
    metricName: 'cpu_usage|memory_usage|...',
    value: 数值,
    unit: 'percent|bytes|ms|count|...',
    tags: { 标签键值对 },
    source: '数据源名称',
    timestamp: 'ISO时间戳',
    alertLevel: 'NORMAL|WARNING|CRITICAL',
    thresholdWarning: 数值,
    thresholdCritical: 数值,
    metadata: { 额外元数据 }
}
```

### 采集状态结构
```javascript
{
    isRunning: 布尔,
    isCollecting: 布尔,
    startTime: 时间戳,
    lastCollection: 时间戳,
    totalCollected: 数字,
    totalErrors: 数字,
    activeSources: [活跃数据源列表],
    sources: [所有数据源详情],
    statistics: { 各数据源统计信息 }
}
```

## 数据质量管理

### 数据完整性
- 检查必需字段完整性
- 验证数据类型正确性
- 确保时间戳格式有效性

### 数据一致性
- 统一数据格式和命名规范
- 验证数值范围合理性
- 检查时间序列连续性

### 数据准确性
- 异常值检测（基于统计方法）
- 数据合理性验证
- 阈值越界检查

## 性能优化

### 内存管理
- 定期垃圾回收
- 内存使用监控
- 大对象优化处理

### 缓存策略
- 聚合结果缓存
- 频繁查询结果缓存
- 缓存TTL管理

### 批处理优化
- 批量数据写入
- 异步处理队列
- 合并小请求

## 监控和告警

### 内置监控指标
- 采集成功率
- 数据延迟时间
- 错误率统计
- 内存使用情况

### 告警机制
- 阈值监控
- 异常检测告警
- 系统状态监控

## 测试

### 运行测试
```bash
# 快速验证
node dataCollectorTest.js quick

# 完整测试
node dataCollectorTest.js all
```

### 测试覆盖
- 基本功能测试
- API接口测试
- 数据质量测试
- 系统集成测试
- 性能测试

## 最佳实践

### 配置优化
1. 根据实际需求调整采集间隔
2. 合理设置数据保留期限
3. 启用数据压缩节省存储空间

### 监控建议
1. 定期检查采集状态
2. 监控数据质量指标
3. 设置合适的告警阈值

### 性能优化
1. 避免过于频繁的数据采集
2. 合理设置批处理大小
3. 定期清理历史数据

## 故障排除

### 常见问题
1. **采集失败** - 检查数据源配置和网络连接
2. **内存不足** - 调整批处理大小和缓存配置
3. **数据质量问题** - 检查验证规则和异常检测配置

### 日志查看
系统会输出详细的日志信息，包括：
- 采集状态变化
- 数据处理结果
- 错误和警告信息
- 性能统计信息

## 版本信息

- **版本**: 1.0.0
- **兼容性**: Node.js 14+
- **依赖**: express, fs, path, os, crypto, events

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 更新日志

### v1.0.0 (2025-12-06)
- 初始版本发布
- 完整的数据采集和存储功能
- RESTful API接口
- 数据质量管理系统
- 完整的测试套件