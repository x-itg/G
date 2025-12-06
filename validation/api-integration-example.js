/**
 * 数据库架构验证模块API集成示例
 * 
 * 演示如何在Express.js应用中使用数据库架构验证模块
 */

const express = require('express');
const { DatabaseSchemaValidation, setupValidationRoutes } = require('./databaseSchemaValidation');

/**
 * 创建包含数据库架构验证的Express应用
 */
function createValidationApp() {
    const app = express();
    const validation = new DatabaseSchemaValidation();

    // 基础中间件
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // 跨域处理
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        } else {
            next();
        }
    });

    // 设置验证路由
    setupValidationRoutes(app, validation);

    // 健康检查端点
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: 'radiation-detector-validation',
            timestamp: new Date().toISOString()
        });
    });

    // 自定义验证端点
    app.post('/api/validation/custom', async (req, res) => {
        try {
            const { tables, options } = req.body;
            
            // 如果指定了特定表，只验证这些表
            if (tables && Array.isArray(tables)) {
                const customReport = {
                    timestamp: new Date().toISOString(),
                    overall_status: 'UNKNOWN',
                    tables: {},
                    issues: [],
                    recommendations: []
                };

                for (const tableName of tables) {
                    if (validation.expectedSchemas[tableName]) {
                        const tableValidation = await validation.validateTable(
                            tableName, 
                            validation.expectedSchemas[tableName]
                        );
                        customReport.tables[tableName] = tableValidation;
                    }
                }

                // 确定状态
                validation.validationReport = customReport;
                validation.determineOverallStatus();
                validation.generateRecommendations();
            } else {
                // 执行完整验证
                await validation.validateDatabaseSchema();
            }

            res.json({
                success: true,
                data: validation.getValidationReport()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // 获取表结构定义
    app.get('/api/validation/schemas', (req, res) => {
        res.json({
            success: true,
            data: validation.expectedSchemas
        });
    });

    // 验证特定表结构
    app.get('/api/validation/schema/:tableName', (req, res) => {
        const { tableName } = req.params;
        
        if (validation.expectedSchemas[tableName]) {
            res.json({
                success: true,
                data: {
                    tableName,
                    schema: validation.expectedSchemas[tableName]
                }
            });
        } else {
            res.status(404).json({
                success: false,
                error: `表 ${tableName} 的架构定义不存在`
            });
        }
    });

    // 获取验证统计信息
    app.get('/api/validation/stats', async (req, res) => {
        try {
            if (!validation.validationReport.timestamp) {
                await validation.validateDatabaseSchema();
            }

            const report = validation.getValidationReport();
            const stats = {
                overall_status: report.overall_status,
                timestamp: report.timestamp,
                tables: {},
                issues_summary: {
                    total: report.issues.length,
                    high: report.issues.filter(i => i.severity === 'HIGH').length,
                    medium: report.issues.filter(i => i.severity === 'MEDIUM').length,
                    low: report.issues.filter(i => i.severity === 'LOW').length
                },
                tables_summary: {
                    total: Object.keys(report.tables).length,
                    passed: Object.values(report.tables).filter(t => t.status === 'PASSED').length,
                    failed: Object.values(report.tables).filter(t => t.status === 'FAILED').length,
                    warnings: Object.values(report.tables).filter(t => t.status === 'PASSED_WITH_WARNINGS').length
                }
            };

            // 详细表统计
            for (const [tableName, tableValidation] of Object.entries(report.tables)) {
                stats.tables[tableName] = {
                    status: tableValidation.status,
                    record_count: tableValidation.record_count,
                    field_count: tableValidation.fields.length,
                    issues_count: tableValidation.issues.length
                };
            }

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // 导出验证报告
    app.get('/api/validation/export', (req, res) => {
        try {
            const format = req.query.format || 'json';
            const filename = `database-validation-report-${new Date().toISOString().split('T')[0]}`;
            
            if (format === 'markdown') {
                res.setHeader('Content-Type', 'text/markdown');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.md"`);
                res.send(validation.exportReportAsMarkdown());
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
                res.send(validation.exportReportAsJSON());
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // 定时验证任务示例
    app.post('/api/validation/schedule', (req, res) => {
        try {
            const { interval, enabled } = req.body;
            
            if (enabled) {
                // 设置定时验证任务（每30分钟执行一次）
                const intervalMs = interval || 30 * 60 * 1000;
                
                const validationTask = setInterval(async () => {
                    console.log(`⏰ 执行定时验证任务 - ${new Date().toISOString()}`);
                    try {
                        await validation.validateDatabaseSchema();
                        
                        if (validation.validationReport.overall_status === 'FAILED') {
                            console.warn('⚠️  定时验证发现问题，发送告警通知');
                            // 这里可以添加告警通知逻辑
                        }
                    } catch (error) {
                        console.error('❌ 定时验证任务失败:', error);
                    }
                }, intervalMs);

                res.json({
                    success: true,
                    message: `定时验证任务已启动，间隔: ${intervalMs}ms`
                });
            } else {
                // 停止定时任务
                // 注意：在实际应用中需要维护任务ID来停止特定任务
                res.json({
                    success: true,
                    message: '定时验证任务已停止'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // 错误处理中间件
    app.use((error, req, res, next) => {
        console.error('API错误:', error);
        res.status(500).json({
            success: false,
            error: '服务器内部错误',
            message: process.env.NODE_ENV === 'development' ? error.message : '请查看服务器日志'
        });
    });

    return { app, validation };
}

// 如果直接运行此文件，启动示例服务器
if (require.main === module) {
    const { app } = createValidationApp();
    const PORT = process.env.PORT || 3002;
    
    app.listen(PORT, () => {
        console.log(`🚀 数据库验证API服务器启动成功`);
        console.log(`📍 服务地址: http://localhost:${PORT}`);
        console.log(`📖 API文档:`);
        console.log(`   GET  /api/validation/database/schema      - 获取架构验证结果`);
        console.log(`   POST /api/validation/database/repair      - 修复架构问题`);
        console.log(`   GET  /api/validation/database/report      - 获取详细验证报告`);
        console.log(`   GET  /api/validation/database/status      - 获取验证状态`);
        console.log(`   GET  /api/validation/stats                - 获取验证统计`);
        console.log(`   GET  /api/validation/schemas              - 获取表结构定义`);
        console.log(`   GET  /api/validation/export               - 导出验证报告`);
        console.log(`   POST /api/validation/custom               - 自定义验证`);
        console.log(`   POST /api/validation/schedule             - 设置定时验证`);
        console.log('');
        console.log(`🧪 测试端点:`);
        console.log(`   curl http://localhost:${PORT}/api/validation/database/status`);
        console.log(`   curl http://localhost:${PORT}/api/validation/stats`);
        console.log(`   curl http://localhost:${PORT}/api/validation/database/report`);
    });
}

module.exports = {
    createValidationApp
};