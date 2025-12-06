# 核心功能验证测试说明

## 概述

`coreFunctionalityTest.js` 是放射化学纯度检测仪的核心功能验证测试脚本，用于确保新功能不影响主要检测功能。

## 测试范围

### 1. 核心功能测试
- ✅ 测量数据创建和保存
- ✅ 测量数据查询和显示
- ✅ 数据验证和校验
- ✅ 原始数据处理

### 2. 兼容性测试
- ✅ 数据库架构变更兼容性
- ✅ API向后兼容性
- ✅ 缓存系统兼容性
- ✅ 权限系统兼容性

### 3. 性能基准测试
- ✅ API响应时间 (阈值: <200ms)
- ✅ 数据库查询时间 (阈值: <100ms)
- ✅ 内存使用增长 (阈值: <20%)
- ✅ CPU使用增长 (阈值: <10%)

## 使用方法

### 基础运行
```bash
# 进入项目根目录
cd /workspace/radiation-detector

# 确保API服务器运行在默认端口3001
# 运行核心功能测试
node testing/coreFunctionalityTest.js
```

### 预期输出
```
🚀 开始核心功能验证测试...

==================================================
核心功能测试
==================================================
📊 测试测量数据创建和保存...
✅ 测量数据创建成功
📋 测试测量数据查询和显示...
✅ 测量数据查询成功，记录数: 25
🔍 测试数据验证和校验...
✅ 数据验证和校验正常工作
⚙️ 测试原始数据处理...
✅ 原始数据处理成功

==================================================
兼容性测试
==================================================
🗄️ 测试数据库架构兼容性...
✅ 数据库架构兼容性正常
🔗 测试API向后兼容性...
✅ GET /api/measurements - 兼容
✅ GET /api/status - 兼容
✅ API向后兼容性测试完成: 2/2
💾 测试缓存系统兼容性...
✅ 缓存系统兼容性正常 (性能提升: 15.23%)
🔐 测试权限系统兼容性...
✅ 权限系统兼容性正常

==================================================
性能测试
==================================================
⏱️ 测试API响应时间...
✅ /api/measurements - 平均响应时间: 45.23ms
✅ /api/status - 平均响应时间: 12.15ms
💾 测试数据库查询性能...
✅ 分页查询 - 查询时间: 23.45ms
✅ 状态查询 - 查询时间: 18.67ms
✅ 全量查询 - 查询时间: 67.89ms
🧠 测试内存使用情况...
✅ 内存使用增长: 5.67%

==================================================
清理测试数据
==================================================
🧹 清理测试数据...
✅ 测试数据清理完成

==================================================
核心功能验证测试报告
==================================================
测试时间: 2025-12-06T17:01:01.000Z
整体状态: PASSED

📊 核心功能测试结果:
   通过: 4/4 (100.0%)
   ✅ measurementCreation: PASSED
   ✅ measurementQuery: PASSED
   ✅ dataValidation: PASSED
   ✅ rawDataProcessing: PASSED

🔗 兼容性测试结果:
   通过: 4/4 (100.0%)
   ✅ databaseSchema: PASSED
   ✅ apiBackwardCompatibility: PASSED
   ✅ cacheSystemCompatibility: PASSED
   ✅ permissionSystemCompatibility: PASSED

⚡ 性能测试结果:
   通过: 3/3 (100.0%)
   ✅ apiResponseTime: 在阈值内
   ✅ databaseQueryPerformance: 在阈值内
   ✅ memoryUsage: 在阈值内

🎉 所有核心功能验证测试通过！
```

## 测试报告文件

测试完成后，会在 `test-results/` 目录下生成详细的JSON格式测试报告：

```
test-results/core-functionality-test-2025-12-06T17-01-01-000Z.json
```

报告包含：
- 详细的测试结果数据
- 性能指标
- 错误信息（如有）
- 测试时间戳

## API接口验证

测试会验证以下API接口的正常工作：

| 接口 | 方法 | 预期状态码 | 功能描述 |
|------|------|------------|----------|
| `/api/measurements` | GET | 200 | 获取测量数据列表 |
| `/api/measurements` | POST | 201 | 创建新的测量记录 |
| `/api/measurements/:id` | PUT | 200 | 更新测量记录 |
| `/api/measurements/:id` | DELETE | 200 | 删除测量记录 |
| `/api/status` | GET | 200 | 获取系统状态 |

## 性能基准

测试会在以下方面验证性能：

### API响应时间
- 目标: < 200ms
- 测试方法: 连续5次请求取平均值

### 数据库查询时间
- 目标: < 100ms
- 测试场景: 分页查询、状态查询、全量查询

### 内存使用
- 目标: 增长 < 20%
- 测试方法: 执行100次查询前后的内存对比

## 故障排除

### 常见问题

1. **API服务器未启动**
   ```
   错误: GET /api/measurements failed: connect ECONNREFUSED
   解决: 确保API服务器运行在端口3001
   ```

2. **数据库连接失败**
   ```
   错误: 数据库响应异常
   解决: 检查数据库配置和连接状态
   ```

3. **性能指标超标**
   ```
   警告: API响应时间超过阈值
   解决: 检查系统负载和网络状况
   ```

### 调试模式

如需更详细的调试信息，可以修改脚本中的日志级别：

```javascript
// 在脚本开头添加调试开关
const DEBUG = true;
```

## 集成到CI/CD

可以将此测试集成到自动化部署流程中：

```yaml
# .github/workflows/core-functionality-test.yml
name: Core Functionality Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
      - name: Start API server
        run: npm start &
      - name: Run core functionality tests
        run: node testing/coreFunctionalityTest.js
```

## 自定义配置

可以通过修改脚本顶部的配置来调整测试参数：

```javascript
const CONFIG = {
    API_BASE_URL: 'http://localhost:3001',  // API服务器地址
    TIMEOUT: 30000,                          // 请求超时时间
    PERFORMANCE_THRESHOLDS: {
        API_RESPONSE_TIME: 200,              // API响应时间阈值
        DATABASE_QUERY_TIME: 100,            // 数据库查询时间阈值
        MEMORY_INCREASE: 20,                 // 内存增长阈值
        CPU_INCREASE: 10                     // CPU增长阈值
    }
};
```

## 测试数据清理

测试脚本会自动清理创建的测试数据，但也可以手动清理：

```bash
# 清理所有测试数据
find test-results/ -name "core-functionality-test-*.json" -delete
```

## 报告解读

### 测试状态说明

- **PASSED**: 所有测试项都通过
- **WARNING**: 部分测试通过但存在警告
- **FAILED**: 核心功能测试失败

### 性能指标说明

- **在阈值内**: 性能指标符合预期
- **超过阈值**: 性能指标需要优化

## 联系支持

如果测试过程中遇到问题，请提供：
1. 完整的测试输出日志
2. 系统环境信息
3. 错误日志文件

测试脚本会生成详细的诊断信息，便于问题定位和解决。