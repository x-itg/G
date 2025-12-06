/**
 * 数据库架构验证模块完整测试演示
 * 
 * 演示如何使用数据库架构验证模块的所有功能
 */

const { DatabaseSchemaValidation, setupValidationRoutes } = require('./databaseSchemaValidation');
const express = require('express');

/**
 * 演示1: 基本验证功能
 */
async function demonstrateBasicValidation() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 演示1: 基本数据库架构验证');
    console.log('='.repeat(60));
    
    const validation = new DatabaseSchemaValidation();
    
    try {
        // 执行验证
        console.log('🔍 正在执行数据库架构验证...');
        const report = await validation.validateDatabaseSchema();
        
        // 显示结果摘要
        console.log('\n📊 验证结果摘要:');
        console.log(`  总体状态: ${report.overall_status}`);
        console.log(`  验证表数: ${Object.keys(report.tables).length}`);
        console.log(`  发现问题: ${report.issues.length}`);
        console.log(`  改进建议: ${report.recommendations.length}`);
        
        // 显示各表状态
        console.log('\n📋 各表验证状态:');
        for (const [tableName, tableValidation] of Object.entries(report.tables)) {
            console.log(`  ${tableName}: ${tableValidation.status} (${tableValidation.record_count} 条记录)`);
            if (tableValidation.issues.length > 0) {
                console.log(`    - 发现 ${tableValidation.issues.length} 个问题`);
            }
        }
        
        // 显示严重问题
        const criticalIssues = report.issues.filter(issue => issue.severity === 'HIGH');
        const mediumIssues = report.issues.filter(issue => issue.severity === 'MEDIUM');
        
        if (criticalIssues.length > 0) {
            console.log('\n❌ 严重问题:');
            criticalIssues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue.message}`);
            });
        }
        
        if (mediumIssues.length > 0) {
            console.log('\n⚠️  中等问题:');
            mediumIssues.slice(0, 5).forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue.message}`);
            });
            if (mediumIssues.length > 5) {
                console.log(`  ... 还有 ${mediumIssues.length - 5} 个问题`);
            }
        }
        
        // 显示建议
        if (report.recommendations.length > 0) {
            console.log('\n💡 改进建议:');
            report.recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. [${rec.priority}] ${rec.message}`);
            });
        }
        
        return report;
        
    } catch (error) {
        console.error('❌ 验证失败:', error.message);
        throw error;
    }
}

/**
 * 演示2: 验证报告导出
 */
async function demonstrateReportExport(validation) {
    console.log('\n' + '='.repeat(60));
    console.log('📄 演示2: 验证报告导出');
    console.log('='.repeat(60));
    
    try {
        // 导出JSON报告
        console.log('📊 导出JSON格式报告...');
        const jsonReport = validation.exportReportAsJSON();
        
        // 导出Markdown报告
        console.log('📝 导出Markdown格式报告...');
        const markdownReport = validation.exportReportAsMarkdown();
        
        // 保存到文件
        const fs = require('fs');
        const path = require('path');
        
        const timestamp = new Date().toISOString().split('T')[0];
        const jsonPath = path.join(__dirname, `validation-report-${timestamp}.json`);
        const mdPath = path.join(__dirname, `validation-report-${timestamp}.md`);
        
        fs.writeFileSync(jsonPath, jsonReport);
        fs.writeFileSync(mdPath, markdownReport);
        
        console.log(`✅ JSON报告已保存: ${jsonPath}`);
        console.log(`✅ Markdown报告已保存: ${mdPath}`);
        
        // 显示报告统计
        const report = validation.getValidationReport();
        console.log('\n📊 报告统计:');
        console.log(`  JSON大小: ${(jsonReport.length / 1024).toFixed(2)} KB`);
        console.log(`  Markdown大小: ${(markdownReport.length / 1024).toFixed(2)} KB`);
        console.log(`  总页数: ${Object.keys(report.tables).length} 个表`);
        console.log(`  问题总数: ${report.issues.length} 个`);
        
        return { jsonPath, mdPath };
        
    } catch (error) {
        console.error('❌ 报告导出失败:', error.message);
        throw error;
    }
}

/**
 * 演示3: 自定义验证
 */
async function demonstrateCustomValidation() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 演示3: 自定义表验证');
    console.log('='.repeat(60));
    
    const validation = new DatabaseSchemaValidation();
    
    try {
        // 只验证特定表
        const targetTables = ['users', 'user_permissions'];
        
        console.log(`🎯 验证指定表: ${targetTables.join(', ')}`);
        
        const customReport = {
            timestamp: new Date().toISOString(),
            overall_status: 'UNKNOWN',
            tables: {},
            issues: [],
            recommendations: []
        };
        
        for (const tableName of targetTables) {
            if (validation.expectedSchemas[tableName]) {
                console.log(`  验证表: ${tableName}`);
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
        
        console.log('\n📊 自定义验证结果:');
        console.log(`  总体状态: ${customReport.overall_status}`);
        console.log(`  验证表数: ${Object.keys(customReport.tables).length}`);
        
        for (const [tableName, tableValidation] of Object.entries(customReport.tables)) {
            console.log(`  ${tableName}: ${tableValidation.status} (${tableValidation.record_count} 条记录)`);
            if (tableValidation.issues.length > 0) {
                console.log(`    - 问题: ${tableValidation.issues.length} 个`);
            }
        }
        
        return customReport;
        
    } catch (error) {
        console.error('❌ 自定义验证失败:', error.message);
        throw error;
    }
}

/**
 * 演示4: API服务器
 */
function demonstrateAPIServer() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 演示4: API服务器启动');
    console.log('='.repeat(60));
    
    const { app } = createTestAPIServer();
    
    const PORT = 3003;
    
    return new Promise((resolve) => {
        const server = app.listen(PORT, () => {
            console.log(`✅ API服务器启动成功`);
            console.log(`📍 服务地址: http://localhost:${PORT}`);
            console.log('');
            console.log('🔗 可用API端点:');
            console.log(`  GET  http://localhost:${PORT}/api/validation/database/status`);
            console.log(`  GET  http://localhost:${PORT}/api/validation/database/schema`);
            console.log(`  GET  http://localhost:${PORT}/api/validation/stats`);
            console.log(`  GET  http://localhost:${PORT}/api/validation/schemas`);
            console.log(`  GET  http://localhost:${PORT}/api/validation/export?format=json`);
            console.log(`  GET  http://localhost:${PORT}/api/validation/export?format=markdown`);
            console.log('');
            console.log('💡 测试命令:');
            console.log(`  curl http://localhost:${PORT}/api/validation/database/status`);
            console.log(`  curl http://localhost:${PORT}/api/validation/stats`);
            
            resolve({ server, port: PORT });
        });
    });
}

/**
 * 创建测试API服务器
 */
function createTestAPIServer() {
    const app = express();
    const validation = new DatabaseSchemaValidation();
    
    // 中间件
    app.use(express.json());
    
    // 设置验证路由
    setupValidationRoutes(app, validation);
    
    // 额外的测试端点
    app.get('/api/test/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: 'database-validation-test',
            timestamp: new Date().toISOString()
        });
    });
    
    app.get('/api/test/quick-validation', async (req, res) => {
        try {
            const report = await validation.validateDatabaseSchema();
            
            // 返回简化版报告
            res.json({
                success: true,
                data: {
                    overall_status: report.overall_status,
                    tables_validated: Object.keys(report.tables).length,
                    issues_count: report.issues.length,
                    critical_issues: report.issues.filter(i => i.severity === 'HIGH').length,
                    timestamp: report.timestamp
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    return { app, validation };
}

/**
 * 演示5: 性能测试
 */
async function demonstratePerformanceTest() {
    console.log('\n' + '='.repeat(60));
    console.log('⚡ 演示5: 验证性能测试');
    console.log('='.repeat(60));
    
    const validation = new DatabaseSchemaValidation();
    
    try {
        console.log('⚡ 开始性能测试...');
        
        // 测试多次验证的性能
        const iterations = 3;
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            console.log(`  第 ${i + 1} 次验证...`);
            
            const startTime = Date.now();
            await validation.validateDatabaseSchema();
            const endTime = Date.now();
            
            const duration = endTime - startTime;
            times.push(duration);
            
            console.log(`    耗时: ${duration}ms`);
        }
        
        // 计算统计信息
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        console.log('\n📊 性能统计:');
        console.log(`  平均耗时: ${avgTime.toFixed(2)}ms`);
        console.log(`  最快耗时: ${minTime}ms`);
        console.log(`  最慢耗时: ${maxTime}ms`);
        console.log(`  性能等级: ${avgTime < 1000 ? '优秀' : avgTime < 3000 ? '良好' : '需优化'}`);
        
        return { times, avgTime, minTime, maxTime };
        
    } catch (error) {
        console.error('❌ 性能测试失败:', error.message);
        throw error;
    }
}

/**
 * 主函数：运行所有演示
 */
async function runAllDemos() {
    console.log('🎬 放射化学纯度检测仪数据库架构验证模块完整演示');
    console.log('='.repeat(80));
    console.log('📅 开始时间:', new Date().toISOString());
    console.log('='.repeat(80));
    
    let validation;
    let apiServer;
    
    try {
        // 演示1: 基本验证
        const basicReport = await demonstrateBasicValidation();
        validation = new DatabaseSchemaValidation();
        
        // 演示2: 报告导出
        await demonstrateReportExport(validation);
        
        // 演示3: 自定义验证
        await demonstrateCustomValidation();
        
        // 演示4: API服务器（启动但不等待）
        apiServer = await demonstrateAPIServer();
        
        // 等待2秒让服务器启动
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 演示5: 性能测试
        await demonstratePerformanceTest();
        
        console.log('\n' + '='.repeat(80));
        console.log('🎉 所有演示完成！');
        console.log('='.repeat(80));
        console.log('📋 演示总结:');
        console.log('  ✅ 基本数据库架构验证');
        console.log('  ✅ 验证报告导出功能');
        console.log('  ✅ 自定义表验证');
        console.log('  ✅ REST API接口');
        console.log('  ✅ 性能测试验证');
        console.log('');
        console.log('📁 生成的文件:');
        console.log('  - validation-report.json (JSON格式报告)');
        console.log('  - validation-report.md (Markdown格式报告)');
        console.log('');
        console.log('🌐 API服务器仍在运行:');
        console.log(`  地址: http://localhost:${apiServer.port}`);
        console.log('  可用端点: /api/validation/*');
        console.log('');
        console.log('🛑 停止服务器: Ctrl+C');
        console.log('='.repeat(80));
        
        // 保持服务器运行
        console.log('\n⏳ 按 Ctrl+C 停止服务器...');
        
    } catch (error) {
        console.error('\n❌ 演示过程中发生错误:', error.message);
        console.error(error.stack);
        
        if (apiServer) {
            apiServer.server.close();
        }
        
        process.exit(1);
    }
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
    // 处理优雅关闭
    process.on('SIGINT', () => {
        console.log('\n\n🛑 正在关闭演示...');
        process.exit(0);
    });
    
    runAllDemos().catch(console.error);
}

module.exports = {
    runAllDemos,
    demonstrateBasicValidation,
    demonstrateReportExport,
    demonstrateCustomValidation,
    demonstrateAPIServer,
    demonstratePerformanceTest,
    createTestAPIServer
};