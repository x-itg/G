/**
 * 数据库架构验证模块简化演示
 * 
 * 演示如何使用数据库架构验证模块的基本功能
 */

const { DatabaseSchemaValidation } = require('./databaseSchemaValidation');
const fs = require('fs');
const path = require('path');

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
 * 演示4: 性能测试
 */
async function demonstratePerformanceTest() {
    console.log('\n' + '='.repeat(60));
    console.log('⚡ 演示4: 验证性能测试');
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
 * 演示5: 架构问题修复
 */
async function demonstrateSchemaRepair() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 演示5: 架构问题修复');
    console.log('='.repeat(60));
    
    const validation = new DatabaseSchemaValidation();
    
    try {
        // 先执行验证
        console.log('🔍 执行验证以发现需要修复的问题...');
        await validation.validateDatabaseSchema();
        
        const initialIssues = validation.validationReport.issues.length;
        console.log(`发现 ${initialIssues} 个问题需要修复`);
        
        // 尝试修复问题
        console.log('🔧 开始修复问题...');
        const repairReport = await validation.repairSchemaIssues();
        
        console.log('\n📊 修复结果:');
        console.log(`  尝试修复: ${repairReport.repairs_attempted} 个问题`);
        console.log(`  成功修复: ${repairReport.repairs_successful} 个问题`);
        console.log(`  修复失败: ${repairReport.repairs_failed} 个问题`);
        
        // 显示修复详情
        if (repairReport.details.length > 0) {
            console.log('\n🔧 修复详情:');
            repairReport.details.slice(0, 5).forEach((detail, index) => {
                const status = detail.repair.success ? '✅' : '❌';
                console.log(`  ${index + 1}. ${status} ${detail.issue.type}: ${detail.repair.message}`);
            });
            
            if (repairReport.details.length > 5) {
                console.log(`  ... 还有 ${repairReport.details.length - 5} 个修复详情`);
            }
        }
        
        return repairReport;
        
    } catch (error) {
        console.error('❌ 问题修复失败:', error.message);
        throw error;
    }
}

/**
 * 演示6: 表结构定义展示
 */
async function demonstrateSchemaDefinitions() {
    console.log('\n' + '='.repeat(60));
    console.log('📚 演示6: 表结构定义展示');
    console.log('='.repeat(60));
    
    const validation = new DatabaseSchemaValidation();
    
    console.log('📋 支持的表结构定义:');
    
    for (const [tableName, schema] of Object.entries(validation.expectedSchemas)) {
        console.log(`\n🏗️  ${tableName} 表:`);
        console.log(`  描述: ${schema.description}`);
        console.log(`  字段数: ${Object.keys(schema.fields).length}`);
        console.log(`  索引数: ${schema.indexes ? schema.indexes.length : 0}`);
        
        // 显示主要字段
        console.log('  主要字段:');
        const mainFields = Object.entries(schema.fields)
            .filter(([_, config]) => config.primary_key || config.required)
            .slice(0, 5);
        
        mainFields.forEach(([fieldName, fieldConfig]) => {
            const type = fieldConfig.type;
            const required = fieldConfig.required ? ' (必填)' : '';
            const primary = fieldConfig.primary_key ? ' [主键]' : '';
            const maxLen = fieldConfig.max_length ? `, 最大长度: ${fieldConfig.max_length}` : '';
            
            console.log(`    - ${fieldName}: ${type}${required}${primary}${maxLen}`);
        });
        
        if (Object.keys(schema.fields).length > 5) {
            console.log(`    ... 还有 ${Object.keys(schema.fields).length - 5} 个字段`);
        }
        
        // 显示约束
        if (schema.constraints) {
            const constraints = [];
            if (schema.constraints.unique) constraints.push(`唯一性: ${schema.constraints.unique.join(', ')}`);
            if (schema.constraints.not_null) constraints.push(`非空: ${schema.constraints.not_null.length} 个字段`);
            if (schema.constraints.foreign_keys) constraints.push(`外键: ${schema.constraints.foreign_keys.length} 个`);
            
            if (constraints.length > 0) {
                console.log(`  约束: ${constraints.join('; ')}`);
            }
        }
    }
    
    return validation.expectedSchemas;
}

/**
 * 主函数：运行所有演示
 */
async function runAllDemos() {
    console.log('🎬 放射化学纯度检测仪数据库架构验证模块演示');
    console.log('='.repeat(80));
    console.log('📅 开始时间:', new Date().toISOString());
    console.log('='.repeat(80));
    
    try {
        // 演示1: 基本验证
        const basicReport = await demonstrateBasicValidation();
        
        // 演示2: 报告导出
        await demonstrateReportExport(basicReport.validation || new DatabaseSchemaValidation());
        
        // 演示3: 自定义验证
        await demonstrateCustomValidation();
        
        // 演示4: 性能测试
        await demonstratePerformanceTest();
        
        // 演示5: 问题修复
        await demonstrateSchemaRepair();
        
        // 演示6: 表结构定义
        await demonstrateSchemaDefinitions();
        
        console.log('\n' + '='.repeat(80));
        console.log('🎉 所有演示完成！');
        console.log('='.repeat(80));
        console.log('📋 演示总结:');
        console.log('  ✅ 基本数据库架构验证');
        console.log('  ✅ 验证报告导出功能');
        console.log('  ✅ 自定义表验证');
        console.log('  ✅ 性能测试验证');
        console.log('  ✅ 架构问题修复');
        console.log('  ✅ 表结构定义展示');
        console.log('');
        console.log('📁 生成的文件:');
        console.log('  - validation-report-YYYY-MM-DD.json (JSON格式报告)');
        console.log('  - validation-report-YYYY-MM-DD.md (Markdown格式报告)');
        console.log('');
        console.log('📚 更多信息请查看:');
        console.log('  - DATABASE_SCHEMA_VALIDATION_README.md');
        console.log('  - api-integration-example.js');
        console.log('='.repeat(80));
        
    } catch (error) {
        console.error('\n❌ 演示过程中发生错误:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
    runAllDemos().catch(console.error);
}

module.exports = {
    runAllDemos,
    demonstrateBasicValidation,
    demonstrateReportExport,
    demonstrateCustomValidation,
    demonstratePerformanceTest,
    demonstrateSchemaRepair,
    demonstrateSchemaDefinitions
};