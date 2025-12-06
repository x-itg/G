# 放射化学纯度检测仪 - 日志管理系统

## 概述

放射化学纯度检测仪日志管理系统提供了完整的日志轮转、归档、清理和分析功能，确保系统日志的高效管理和长期保存。

### 🔄 日志轮转
- **按文件大小轮转**: 单个文件最大100MB
- **按时间轮转**: 每天自动轮转
- **按记录数轮转**: 每10万条记录轮转
- **手动轮转**: 支持API手动触发

### 📦 日志归档
- **自动压缩**: 7天后的日志自动压缩
- **加密支持**: 可选的日志文件加密
- **分类存储**: 按日志类型分类存储
- **备份恢复**: 完整的备份和恢复机制

### 🧹 日志清理
- **智能清理**: 基于保留策略自动清理
- **分类保留**: 不同类型日志不同保留期限
- **空间管理**: 存储空间使用监控和优化

### 🔍 日志分析
- **全文搜索**: 支持关键词搜索
- **级别过滤**: 按日志级别筛选
- **统计分析**: 性能和使用统计
- **健康监控**: 系统健康状态检查

## 文件结构

```
logging/
├── logManager.js              # 核心日志管理器
├── loggingRoutes.js           # API路由
├── taskScheduler.js           # 定时任务调度器
├── loggingIntegration.js      # 系统集成模块
├── test-logManager.js         # 测试脚本
└── README.md                  # 本文档
```

## 安装和配置

### 1. 安装依赖

```bash
npm install node-cron
```

### 2. 初始化日志系统

```javascript
const { initializeLoggingSystem } = require('./logging/loggingIntegration');

// 在应用启动时初始化
async function startApp() {
    const integrator = await initializeLoggingSystem(app, {
        logManager: {
            rotation: {
                maxFileSize: 100 * 1024 * 1024, // 100MB
                dailyRotation: true
            },
            archive: {
                compressionEnabled: true,
                compressionDelay: 7
            },
            storage: {
                maxStorageSize: 10 * 1024 * 1024 * 1024 // 10GB
            }
        },
        enableScheduler: true
    });
}
```

### 3. 添加中间件

```javascript
const { loggingMiddleware } = require('./logging/loggingIntegration');

// 在Express应用中使用
app.use(loggingMiddleware());
app.use('/api/logging', require('./logging/loggingRoutes'));
```

## API接口

### 日志管理接口

#### 手动轮转日志
```http
POST /api/logging/manage/rotate
Content-Type: application/json

{
    "logType": "info"  // 可选: debug, info, warn, error, fatal, all
}
```

#### 手动清理日志
```http
POST /api/logging/manage/cleanup
Content-Type: application/json

{
    "logType": "all"  // 可选: audit, error, access, system, all
}
```

#### 获取管理状态
```http
GET /api/logging/manage/status
```

#### 备份日志
```http
POST /api/logging/manage/backup
Content-Type: application/json

{
    "logType": "all",
    "includeCompressed": true,
    "destination": "/path/to/backup"
}
```

#### 获取文件列表
```http
GET /api/logging/manage/files?logType=all
```

#### 获取统计信息
```http
GET /api/logging/manage/stats
```

#### 搜索日志
```http
POST /api/logging/manage/search
Content-Type: application/json

{
    "query": "错误信息",
    "options": {
        "logType": "error",
        "startDate": "2025-01-01",
        "endDate": "2025-12-31",
        "level": "error",
        "maxResults": 100
    }
}
```

#### 恢复日志
```http
POST /api/logging/manage/restore
Content-Type: application/json

{
    "backupPath": "/path/to/backup/backup-2025-12-06T08-17-05-822Z"
}
```

#### 健康检查
```http
GET /api/logging/manage/health
```

#### 获取配置
```http
GET /api/logging/manage/config
```

## 轮转策略

### 文件大小轮转
- **阈值**: 100MB
- **触发**: 文件大小达到阈值时自动轮转
- **处理**: 创建新的日志文件，旧文件归档

### 时间轮转
- **频率**: 每天午夜12点
- **格式**: 按日期命名 (YYYY-MM-DD.log)
- **时区**: Asia/Shanghai

### 记录数轮转
- **阈值**: 10万条记录
- **监控**: 实时监控记录数量
- **优化**: 批量写入减少I/O操作

## 归档策略

### 压缩归档
- **延迟**: 7天后自动压缩
- **算法**: Gzip压缩 (级别9)
- **格式**: .gz后缀
- **存储**: 独立归档目录

### 加密归档 (可选)
- **算法**: AES-256-CBC
- **密钥**: 配置化管理
- **格式**: .gz.enc后缀

### 保留期限
| 日志类型 | 保留期限 | 说明 |
|---------|---------|------|
| 审计日志 | 2年 | 合规要求 |
| 错误日志 | 1年 | 故障排查 |
| 访问日志 | 6个月 | 访问分析 |
| 系统日志 | 3个月 | 系统监控 |

## 清理策略

### 自动清理
- **触发**: 每天凌晨2点
- **条件**: 超过保留期限
- **范围**: 归档目录中的过期文件
- **操作**: 删除文件并释放空间

### 存储空间管理
- **阈值**: 85%时开始清理
- **策略**: 优先清理最老的文件
- **监控**: 实时监控存储使用率

## 定时任务

### 任务配置

| 任务 | 调度时间 | 功能 | 说明 |
|------|---------|------|------|
| 轮转任务 | `0 0 * * *` | 日志轮转 | 每天午夜执行 |
| 清理任务 | `0 2 * * *` | 过期清理 | 每天凌晨2点执行 |
| 归档任务 | `0 3 * * 0` | 压缩归档 | 每周日凌晨3点执行 |
| 统计任务 | `0 */6 * * *` | 性能统计 | 每6小时执行 |
| 健康任务 | `0 * * * *` | 健康检查 | 每小时执行 |
| 备份任务 | `0 4 * * *` | 日志备份 | 每天凌晨4点执行 |

### 任务管理

```javascript
// 获取任务状态
const status = taskScheduler.getTaskStatus();

// 手动执行任务
await taskScheduler.runTask('rotation');

// 重置任务
taskScheduler.resetTask('rotation');

// 启用/禁用任务
taskScheduler.toggleTask('rotation', false);
```

## 使用示例

### 基础使用

```javascript
const { createLogManager } = require('./logging/logManager');

// 创建日志管理器
const logManager = createLogManager();

// 获取日志实例
const infoLog = logManager.getLogInstance('info');

// 写入日志
infoLog.write({
    level: 'info',
    message: '系统启动成功',
    metadata: { version: '1.0.0', port: 3000 }
});
```

### 高级功能

```javascript
// 轮转日志
await logManager.rotateLog('info');

// 清理过期日志
await logManager.cleanupLogs('error');

// 搜索日志
const results = await logManager.searchLogs('错误', {
    logType: 'error',
    level: 'error',
    maxResults: 50
});

// 获取统计信息
const stats = await logManager.getLogStats();

// 健康检查
const health = await logManager.healthCheck();
```

### 创建记录器

```javascript
const { createLogger } = require('./logging/loggingIntegration');

// 为模块创建专用记录器
const logger = createLogger('UserService');

logger.info('用户登录', { userId: 123, ip: '192.168.1.1' });
logger.warn('登录失败尝试', { userId: 123, attempts: 3 });
logger.error('数据库连接失败', { error: 'Connection timeout' });
```

## 性能优化

### I/O优化
- **批量写入**: 减少文件I/O次数
- **缓冲机制**: 内存缓冲定期刷新
- **异步操作**: 非阻塞日志写入

### 存储优化
- **压缩存储**: 减少存储空间占用
- **索引优化**: 快速搜索和查询
- **空间监控**: 实时存储使用监控

### 内存优化
- **内存池**: 复用内存缓冲区
- **垃圾回收**: 及时释放不需要的对象
- **内存限制**: 防止内存泄漏

## 监控和告警

### 监控指标
- **存储使用率**: 实时监控存储空间
- **文件数量**: 活跃和归档文件数量
- **任务执行**: 定时任务执行状态
- **性能指标**: 日志处理性能

### 告警规则
- **存储空间**: >85% 警告, >95% 严重
- **任务失败**: 连续3次失败告警
- **性能异常**: 处理时间超过阈值
- **文件异常**: 文件损坏或丢失

## 故障排除

### 常见问题

#### 1. 日志文件过大
**原因**: 轮转策略未生效
**解决**: 
- 检查文件大小阈值配置
- 手动触发轮转操作
- 验证定时任务状态

#### 2. 存储空间不足
**原因**: 清理策略未执行
**解决**:
- 手动执行清理操作
- 检查保留期限配置
- 增加存储空间

#### 3. 搜索功能缓慢
**原因**: 文件未索引或数据量大
**解决**:
- 定期执行日志轮转
- 优化搜索查询条件
- 考虑分页查询

#### 4. 定时任务不执行
**原因**: 任务调度器异常
**解决**:
- 检查任务调度器状态
- 重启任务调度器
- 验证cron表达式

### 调试模式

```javascript
// 启用调试日志
process.env.LOG_DEBUG = 'true';

// 查看详细日志
console.log('Debug info:', logManager.getStatus());
```

## 最佳实践

### 1. 日志级别使用
- **DEBUG**: 详细的调试信息
- **INFO**: 一般信息记录
- **WARN**: 警告信息
- **ERROR**: 错误信息
- **FATAL**: 严重错误

### 2. 日志内容规范
- **结构化**: 使用JSON格式记录
- **上下文**: 包含相关上下文信息
- **敏感信息**: 避免记录密码等敏感数据
- **时间戳**: 总是包含准确的时间戳

### 3. 性能考虑
- **异步写入**: 避免阻塞主流程
- **批量操作**: 减少I/O操作频率
- **存储规划**: 合理配置存储空间
- **定期维护**: 执行定期的维护任务

### 4. 安全考虑
- **访问控制**: 限制日志文件访问权限
- **数据加密**: 敏感日志启用加密
- **审计日志**: 记录所有管理操作
- **备份验证**: 定期验证备份完整性

## 版本历史

### v1.0.0 (2025-12-06)
- 初始版本发布
- 基础日志轮转功能
- 定时任务调度
- API接口实现
- 存储管理优化

## 技术支持

如有问题或建议，请联系技术支持团队。

---

*放射化学纯度检测仪日志管理系统 - 确保您的系统日志安全、高效、可管理*