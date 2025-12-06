# 放射化学纯度检测仪性能监控系统测试

## 概述

`performanceMonitorTest.js` 是放射化学纯度检测仪的性能监控系统综合测试脚本，用于验证监控系统的准确性和可靠性。

## 测试内容

### 1. 系统资源监控准确性测试
- **CPU使用率监控准确性**: 对比监控系统与操作系统工具的CPU使用率数据
- **内存使用监控准确性**: 验证内存使用监控数据的准确性
- **磁盘空间监控准确性**: 测试磁盘空间监控的准确性
- **系统负载监控准确性**: 验证1分钟、5分钟、15分钟负载平均值监控

### 2. API性能监控准确性测试
- **API响应时间统计准确性**: 测试响应时间监控与实际测量的对比
- **API调用频率统计准确性**: 验证每秒请求数监控的准确性
- **API错误率监控准确性**: 测试错误率计算的准确性
- **API可用性监控准确性**: 验证API可用性监控的准确性

### 3. 数据库性能监控准确性测试
- **数据库查询性能统计**: 对比实际查询时间与监控数据
- **数据库连接数监控**: 测试连接状态监控的准确性
- **数据库操作频率统计**: 验证操作频率监控的准确性
- **慢查询检测准确性**: 测试慢查询检测算法的准确性

### 4. 实时数据采集和显示测试
- **数据采集频率测试**: 验证监控数据采集的频率准确性
- **数据更新及时性**: 测试数据更新的及时性（<5秒要求）
- **监控面板实时性**: 验证监控界面的实时更新
- **WebSocket连接稳定性**: 测试实时数据传输的稳定性

### 5. 监控告警机制测试
- **性能阈值设置和触发**: 测试自定义阈值的告警触发
- **告警消息准确性和及时性**: 验证告警信息的准确性
- **告警级别区分和分类**: 测试告警级别的正确分类
- **告警历史记录和统计**: 验证告警记录和统计功能

### 6. 数据可视化测试
- **监控图表渲染正常**: 测试图表渲染功能
- **数据展示准确直观**: 验证数据展示的准确性
- **交互功能正常工作**: 测试用户交互功能
- **移动端适配正常**: 验证移动端响应式设计

## API接口验证

测试脚本会验证以下监控API接口：

- `GET /api/monitoring/system/current` - 系统监控数据
- `GET /api/monitoring/api/stats` - API性能数据
- `GET /api/monitoring/database/stats` - 数据库性能数据
- `GET /api/monitoring/performance` - 综合性能数据

## 性能基准对比

- **系统监控 vs 操作系统工具**: 对比系统工具的实际数据
- **API性能 vs 实际请求时间**: 验证API性能监控的准确性
- **数据库性能 vs 查询日志**: 对比数据库实际性能
- **实时数据 vs 采样数据**: 验证实时监控与采样的差异

## 验证标准

- **监控数据准确性**: > 95%
- **实时数据更新及时性**: < 5秒
- **告警机制正常工作**: 阈值触发准确
- **数据可视化正常显示**: 图表渲染和交互正常

## 使用方法

### 直接运行测试
```bash
cd radiation-detector/testing
node performanceMonitorTest.js
```

### 作为模块使用
```javascript
const PerformanceMonitorTest = require('./performanceMonitorTest');

async function runTests() {
    const tester = new PerformanceMonitorTest();
    const results = await tester.runFullTest();
    
    console.log('测试结果:', results);
    console.log('总体准确性:', (results.overall_accuracy * 100).toFixed(2) + '%');
}

// 运行测试
runTests().catch(console.error);
```

### 自定义配置运行
```javascript
const PerformanceMonitorTest = require('./performanceMonitorTest');

async function customTest() {
    const tester = new PerformanceMonitorTest();
    
    // 只运行特定测试
    await tester.testSystemResourceMonitoring();
    await tester.testApiPerformanceMonitoring();
    
    // 获取测试结果
    const results = tester.testResults;
}
```

## 测试输出

### 控制台输出
测试过程中会显示详细的进度信息：
- 🚀 开始性能监控准确性测试...
- 📊 测试系统资源监控准确性...
- ├─ 测试CPU使用率监控准确性...
- └─ CPU监控准确性: 96.50%

### 测试报告文件
测试完成后会生成JSON格式的详细报告：
- `performance-monitor-test-report.json` - 包含所有测试结果和详细分析

### 测试结果结构
```json
{
  "timestamp": "2025-12-06T17:01:01.000Z",
  "system_monitoring": {
    "cpu_monitoring": {
      "accuracy_score": 0.965,
      "test_details": {...},
      "benchmarks": {...}
    }
  },
  "api_monitoring": {...},
  "database_monitoring": {...},
  "realtime_monitoring": {...},
  "alert_mechanism": {...},
  "data_visualization": {...},
  "overall_accuracy": 0.94,
  "total_tests": 24,
  "passed_tests": 22,
  "failed_tests": 2
}
```

## 依赖项

测试脚本依赖以下模块：
- `os` - 系统信息获取
- `fs` - 文件系统操作
- `http` - HTTP请求测试
- `perf_hooks` - 性能监控
- `../monitoring/monitoringService` - 监控服务
- `../database/SimplifiedDatabaseManager` - 数据库管理器
- `../monitoring/apiMonitor` - API监控器
- `../monitoring/databaseMonitor` - 数据库监控器

## 错误处理

测试脚本包含完善的错误处理机制：
- 单个测试失败不会影响其他测试
- 提供详细的错误信息和堆栈跟踪
- 失败测试会被标记并包含在最终报告中

## 性能优化建议

基于测试结果，系统会提供优化建议：
- 监控准确性改进建议
- 性能瓶颈识别
- 阈值配置优化建议
- 实时性改进建议

## 扩展性

测试脚本采用模块化设计，可以轻松扩展：
- 添加新的监控类型测试
- 自定义验证标准
- 扩展基准对比功能
- 添加新的性能指标测试

## 注意事项

1. **测试环境**: 建议在生产环境的测试环境中运行
2. **权限要求**: 确保有足够的系统权限访问监控数据
3. **网络依赖**: API测试需要网络连接
4. **数据库依赖**: 数据库测试需要有效的数据库连接
5. **测试时间**: 完整测试可能需要5-10分钟

## 故障排除

### 常见问题

1. **模块导入错误**
   - 确保所有依赖模块正确安装
   - 检查路径是否正确

2. **权限错误**
   - 确保有读取系统监控数据的权限
   - 检查数据库连接权限

3. **网络错误**
   - 检查网络连接
   - 确认API服务器正在运行

4. **数据库错误**
   - 验证数据库文件路径
   - 检查数据库版本兼容性

### 调试模式

启用详细日志：
```javascript
const tester = new PerformanceMonitorTest();
// 设置详细日志级别
process.env.DEBUG = 'performance-monitor:*';
```

## 更新日志

- **v1.0** (2025-12-06): 初始版本，包含完整的性能监控测试功能
- 支持系统、API、数据库、实时监控测试
- 包含告警机制和数据可视化测试
- 提供详细的性能基准对比

## 技术支持

如有问题或建议，请联系开发团队或查看项目文档。