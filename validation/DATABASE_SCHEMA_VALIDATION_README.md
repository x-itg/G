# 放射化学纯度检测仪数据库架构验证模块

## 概述

本模块为放射化学纯度检测仪提供完整的数据库架构验证功能，确保数据库表结构、关联关系、索引和约束的完整性，符合CFR 21 Part 11合规性要求。

## 功能特性

### ✅ 验证范围
- **表结构验证**: 验证所有表的字段、数据类型和长度
- **关联关系验证**: 验证表间外键关联和参照完整性
- **索引验证**: 验证主键索引、外键索引和性能索引
- **约束验证**: 验证NOT NULL、UNIQUE、CHECK和FOREIGN KEY约束
- **数据完整性**: 验证数据完整性和业务规则

### 📊 支持的表
- **users** - 用户表
- **measurements** - 测量数据表
- **system_settings** - 系统设置表
- **user_permissions** - 用户权限表
- **audit_logs** - 审计日志表
- **performance_metrics** - 性能指标表
- **electronic_signatures** - 电子签名表

### 🔧 验证标准
- CFR 21 Part 11 兼容的电子签名验证
- 放射化学检测数据完整性检查
- 审计追踪完整性验证
- 权限系统架构验证

## 快速开始

### 1. 基本使用

```javascript
const { DatabaseSchemaValidation } = require('./databaseSchemaValidation');

// 创建验证实例
const validation = new DatabaseSchemaValidation();

// 执行验证
async function runValidation() {
    const report = await validation.validateDatabaseSchema();
    
    console.log(`总体状态: ${report.overall_status}`);
    console.log(`发现的问题: ${report.issues.length}`);
    
    return report;
}
```

### 2. API集成

```javascript
const express = require('express');
const { setupValidationRoutes } = require('./databaseSchemaValidation');

const app = express();
const validation = new DatabaseSchemaValidation();

// 设置验证路由
setupValidationRoutes(app, validation);

app.listen(3000, () => {
    console.log('验证API服务启动');
});
```

### 3. 定时验证

```javascript
// 设置定时验证任务
const validationTask = setInterval(async () => {
    const report = await validation.validateDatabaseSchema();
    
    if (report.overall_status === 'FAILED') {
        console.warn('发现数据库架构问题！');
        // 发送告警通知
    }
}, 30 * 60 * 1000); // 每30分钟执行一次
```

## API 接口

### 验证相关接口

#### GET /api/validation/database/schema
获取数据库架构验证结果

**响应示例:**
```json
{
    "success": true,
    "data": {
        "timestamp": "2025-12-06T09:17:38.388Z",
        "overall_status": "PASSED",
        "tables": {
            "users": {
                "status": "PASSED",
                "record_count": 42,
                "fields": [...],
                "issues": []
            }
        },
        "issues": [],
        "recommendations": []
    }
}
```

#### POST /api/validation/database/repair
修复发现的架构问题

**请求体:**
```json
{
    "auto_repair": true
}
```

**响应示例:**
```json
{
    "success": true,
    "data": {
        "timestamp": "2025-12-06T09:17:38.388Z",
        "issues_found": 5,
        "repairs_attempted": 5,
        "repairs_successful": 3,
        "repairs_failed": 2,
        "details": [...]
    }
}
```

#### GET /api/validation/database/report
获取详细验证报告

**查询参数:**
- `format`: 报告格式 (json|markdown)

**响应示例:**
```json
{
    "success": true,
    "data": {
        "timestamp": "2025-12-06T09:17:38.388Z",
        "overall_status": "PASSED_WITH_WARNINGS",
        "tables": {...},
        "issues": [...],
        "recommendations": [...]
    }
}
```

#### GET /api/validation/database/status
获取验证状态概览

**响应示例:**
```json
{
    "success": true,
    "data": {
        "overall_status": "PASSED",
        "timestamp": "2025-12-06T09:17:38.388Z",
        "issues_count": 2,
        "tables_validated": 7
    }
}
```

### 统计相关接口

#### GET /api/validation/stats
获取验证统计信息

**响应示例:**
```json
{
    "success": true,
    "data": {
        "overall_status": "PASSED",
        "timestamp": "2025-12-06T09:17:38.388Z",
        "issues_summary": {
            "total": 2,
            "high": 0,
            "medium": 2,
            "low": 0
        },
        "tables_summary": {
            "total": 7,
            "passed": 5,
            "failed": 2,
            "warnings": 0
        },
        "tables": {
            "users": {
                "status": "PASSED",
                "record_count": 42,
                "field_count": 11,
                "issues_count": 0
            }
        }
    }
}
```

### 导出相关接口

#### GET /api/validation/export
导出验证报告

**查询参数:**
- `format`: 导出格式 (json|markdown)

**响应示例:**
- JSON格式: 返回完整的验证报告JSON数据
- Markdown格式: 返回格式化的验证报告文档

### 自定义验证接口

#### POST /api/validation/custom
执行自定义验证

**请求体:**
```json
{
    "tables": ["users", "measurements"],
    "options": {
        "strict_mode": true,
        "check_references": true
    }
}
```

## 验证报告格式

### 总体报告结构

```json
{
    "timestamp": "验证时间戳",
    "overall_status": "PASSED|FAILED|PASSED_WITH_WARNINGS|ERROR",
    "tables": {
        "表名": {
            "status": "PASSED|FAILED",
            "record_count": "记录数量",
            "fields": [
                {
                    "field_name": "字段名",
                    "status": "PASSED|FAILED",
                    "issues": [],
                    "config": {
                        "type": "string|number|boolean",
                        "required": true|false,
                        "max_length": 100,
                        "primary_key": true|false
                    }
                }
            ],
            "issues": [
                {
                    "type": "错误类型",
                    "message": "错误描述",
                    "severity": "HIGH|MEDIUM|LOW",
                    "table": "表名",
                    "field": "字段名"
                }
            ]
        }
    },
    "issues": [
        {
            "type": "问题类型",
            "message": "问题描述",
            "severity": "HIGH|MEDIUM|LOW",
            "table": "表名",
            "field": "字段名"
        }
    ],
    "recommendations": [
        {
            "priority": "HIGH|MEDIUM|LOW",
            "category": "问题分类",
            "message": "建议内容",
            "action": "建议操作"
        }
    ]
}
```

### 状态说明

- **PASSED**: 验证通过，无问题
- **FAILED**: 验证失败，存在严重问题
- **PASSED_WITH_WARNINGS**: 验证通过但存在警告
- **ERROR**: 验证过程发生错误

### 问题类型

#### 表级别问题
- `TABLE_NOT_FOUND` - 表不存在
- `TABLE_VALIDATION_ERROR` - 表验证错误
- `PRIMARY_KEY_DUPLICATE` - 主键重复
- `FOREIGN_KEY_VIOLATION` - 外键违规
- `UNIQUE_CONSTRAINT_VIOLATION` - 唯一性约束违规
- `NOT_NULL_CONSTRAINT_VIOLATION` - NOT NULL约束违规
- `ORPHANED_RECORD` - 孤立记录

#### 字段级别问题
- `MISSING_FIELD` - 字段缺失
- `UNEXPECTED_FIELD` - 意外字段
- `INVALID_TYPE` - 类型无效
- `LENGTH_EXCEEDED` - 长度超限
- `REQUIRED_FIELD_EMPTY` - 必填字段为空

## 表结构定义

### users表
用户信息存储表，包含用户基本信息、角色和权限配置。

### measurements表
测量数据表，存储放射化学检测结果和分析数据。

### system_settings表
系统配置表，存储系统运行参数和配置选项。

### user_permissions表
用户权限表，定义用户的权限级别和访问控制。

### audit_logs表
审计日志表，记录所有系统操作和用户行为，符合CFR 21 Part 11要求。

### performance_metrics表
性能指标表，存储系统性能监控数据和指标。

### electronic_signatures表
电子签名表，存储符合CFR 21 Part 11的电子签名信息。

## 配置文件

### 表结构定义

模块使用预定义的表结构进行验证，可以通过修改 `expectedSchemas` 来自定义表结构：

```javascript
const validation = new DatabaseSchemaValidation();

// 自定义表结构
validation.expectedSchemas.custom_table = {
    description: '自定义表描述',
    fields: {
        id: { type: 'string', required: true, primary_key: true },
        name: { type: 'string', required: true, max_length: 100 },
        value: { type: 'number', required: false }
    },
    indexes: ['name'],
    constraints: {
        unique: ['name'],
        not_null: ['id', 'name']
    }
};
```

## 最佳实践

### 1. 定期验证
建议设置定期验证任务，确保数据库架构的完整性：

```javascript
// 每小时验证一次
setInterval(async () => {
    const report = await validation.validateDatabaseSchema();
    
    if (report.overall_status === 'FAILED') {
        // 发送告警通知
        await sendAlert(report);
    }
}, 60 * 60 * 1000);
```

### 2. 部署前验证
在部署新版本前执行完整验证：

```javascript
async function validateBeforeDeployment() {
    const report = await validation.validateDatabaseSchema();
    
    if (report.overall_status !== 'PASSED') {
        throw new Error('数据库架构验证失败，请检查问题后再部署');
    }
}
```

### 3. 监控集成
将验证结果集成到监控系统：

```javascript
// 集成到Prometheus
app.get('/metrics', (req, res) => {
    const metrics = [
        `# TYPE database_validation_status gauge`,
        `database_validation_status{status="${report.overall_status}"} 1`,
        `# TYPE database_issues_total gauge`,
        `database_issues_total ${report.issues.length}`
    ];
    res.send(metrics.join('\n'));
});
```

## 故障排除

### 常见问题

#### 1. 表文件不存在
**问题**: 验证报告显示 "TABLE_NOT_FOUND"
**解决方案**: 
- 检查数据库文件路径是否正确
- 确保所有必需的表文件都存在
- 运行初始化脚本创建缺失的表

#### 2. 外键违规
**问题**: 审计日志引用了不存在的用户ID
**解决方案**:
- 清理孤立记录
- 确保数据完整性
- 修复外键关系

#### 3. 字段类型不匹配
**问题**: 字段类型验证失败
**解决方案**:
- 检查数据转换是否正确
- 更新字段定义以匹配实际数据类型
- 修复数据质量问题

### 调试模式

启用详细日志输出：

```javascript
const validation = new DatabaseSchemaValidation();

// 启用调试模式
process.env.DEBUG = 'database-validation';

await validation.validateDatabaseSchema();
```

## 示例使用

### 独立验证脚本

```javascript
// validation-demo.js
const { DatabaseSchemaValidation } = require('./databaseSchemaValidation');

async function runDemo() {
    const validation = new DatabaseSchemaValidation();
    
    console.log('🔍 开始数据库架构验证...');
    const report = await validation.validateDatabaseSchema();
    
    console.log(`\n📊 验证结果摘要:`);
    console.log(`总体状态: ${report.overall_status}`);
    console.log(`发现的问题: ${report.issues.length}`);
    console.log(`验证的表: ${Object.keys(report.tables).length}`);
    
    if (report.issues.length > 0) {
        console.log('\n❌ 发现的问题:');
        report.issues.forEach((issue, index) => {
            console.log(`${index + 1}. [${issue.severity}] ${issue.message}`);
        });
    }
    
    // 导出报告
    const jsonReport = validation.exportReportAsJSON();
    const markdownReport = validation.exportReportAsMarkdown();
    
    console.log('\n📄 验证报告已生成');
    return report;
}

if (require.main === module) {
    runDemo().catch(console.error);
}
```

### API服务器集成

```javascript
// server.js
const express = require('express');
const { createValidationApp } = require('./api-integration-example');

const { app } = createValidationApp();
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`🚀 验证API服务器启动成功`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
});
```

## 贡献指南

### 添加新的表验证

1. 在 `expectedSchemas` 中定义表结构
2. 实现相应的验证逻辑
3. 添加测试用例
4. 更新文档

### 扩展验证规则

1. 继承 `DatabaseSchemaValidation` 类
2. 重写验证方法
3. 添加自定义验证逻辑

## 更新日志

### v1.0.0 (2025-12-06)
- 初始版本发布
- 实现完整的数据库架构验证功能
- 支持7个核心表的验证
- 提供完整的API接口
- 生成详细的验证报告
- 支持自动修复功能

## 许可证

本模块遵循 MIT 许可证。

## 支持

如有问题或建议，请提交 Issue 或联系开发团队。