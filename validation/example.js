/**
 * 放射化学纯度检测仪综合验证管理示例
 * 
 * 演示如何使用验证管理系统进行全面的系统验证
 */

const express = require('express');
const { createValidationManager, validationManagerFactory } = require('./index');

/**
 * 创建示例应用程序
 */
function createExampleApp() {
    const app = express();
    app.use(express.json());

    // 创建验证管理器实例
    const validationManager = createValidationManager({
        autoStart: false,
        enableScheduling: false,
        validatorOptions: {
            maxRetries: 3,
            timeout: 30000,
            autoFixEnabled: true,
            parallelExecution: true,
            healthCheckEnabled: true
        }
    });

    // 初始化验证管理器
    validationManager.initialize().catch(error => {
        console.error('验证管理器初始化失败:', error);
    });

    /**
     * 主页 - 显示验证系统状态
     */
    app.get('/', (req, res) => {
        const status = validationManager.getStatus();
        
        res.json({
            message: '放射化学纯度检测仪综合验证管理系统',
            version: '1.4.0',
            status: status,
            endpoints: {
                'GET /status': '获取验证状态',
                'POST /validate': '执行综合验证',
                'GET /report': '获取最新验证报告',
                'GET /history': '获取验证历史',
                'GET /statistics': '获取验证统计',
                'GET /modules': '获取可用验证模块',
                'POST /auto-fix': '执行自动修复',
                'GET /export': '导出验证报告'
            }
        });
    });

    /**
     * 获取验证状态
     */
    app.get('/status', (req, res) => {
        try {
            const status = validationManager.getStatus();
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * 执行综合验证
     */
    app.post('/validate', async (req, res) => {
        try {
            const options = {
                modules: req.body.modules || null,
                autoFixEnabled: req.body.autoFixEnabled !== false,
                parallelExecution: req.body.parallelExecution !== false,
                timeout: req.body.timeout || 60000
            };

            // 检查是否已在运行
            if (validationManager.validator.isRunning) {
                return res.status(409).json({
                    success: false,
                    error: '验证正在进行中，请等待完成',
                    currentValidation: validationManager.validator.currentValidation
                });
            }

            res.json({
                success: true,
                message: '验证已开始，请稍后查看结果',
                validationId: Date.now().toString()
            });

            // 异步执行验证
            try {
                const report = await validationManager.runOnDemandValidation(options);
                
                console.log('\n✅ 验证完成!');
                console.log('总体状态:', report.overall_status);
                console.log('通过率:', report.pass_rate);
                console.log('执行时间:', report.execution_time);
                
                if (report.failed_modules > 0) {
                    console.log('❌ 失败的模块:', report.failed_modules);
                }
                
                if (report.auto_fixed_modules > 0) {
                    console.log('🔧 自动修复的模块:', report.auto_fixed_modules);
                }
                
                console.log('\n详细结果:');
                Object.entries(report.validation_modules).forEach(([module, result]) => {
                    const icon = result.status === 'PASSED' ? '✅' : 
                                result.status === 'AUTO_FIXED' ? '🔧' : 
                                result.status === 'FAILED' ? '❌' : '⚠️';
                    console.log(`${icon} ${result.moduleName || module}: ${result.status} (${result.executionTime}ms)`);
                });

            } catch (error) {
                console.error('验证执行失败:', error);
            }

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * 获取最新验证报告
     */
    app.get('/report', (req, res) => {
        try {
            const report = validationManager.getLatestReport();
            
            if (!report) {
                return res.status(404).json({
                    success: false,
                    error: '没有找到验证报告，请先执行验证'
                });
            }

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * 获取验证历史
     */
    app.get('/history', (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const history = validationManager.getHistory(limit);
            
            res.json({
                success: true,
                data: history,
                total: history.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * 获取验证统计
     */
    app.get('/statistics', (req, res) => {
        try {
            const stats = validationManager.getStatistics();
            
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

    /**
     * 获取可用验证模块
     */
    app.get('/modules', (req, res) => {
        try {
            const modules = validationManager.validator.validationModules;
            
            const moduleList = Array.from(modules.entries()).map(([key, module]) => ({
                id: key,
                name: module.name,
                description: module.description,
                critical: module.critical,
                autoFixable: module.autoFixable
            }));
            
            res.json({
                success: true,
                data: moduleList,
                total: moduleList.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * 执行自动修复
     */
    app.post('/auto-fix', async (req, res) => {
        try {
            const { moduleType, issueType, issueData } = req.body;
            
            if (!moduleType || !issueType) {
                return res.status(400).json({
                    success: false,
                    error: '缺少必要参数: moduleType 和 issueType'
                });
            }

            const fixResult = await validationManager.validator.executeAutoFix(
                moduleType, 
                issueType, 
                issueData || {}
            );
            
            res.json({
                success: true,
                data: fixResult
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * 导出验证报告
     */
    app.get('/export', (req, res) => {
        try {
            const format = req.query.format || 'json';
            const report = validationManager.getLatestReport();
            
            if (!report) {
                return res.status(404).json({
                    success: false,
                    error: '没有找到验证报告'
                });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            let filename = `validation-report-${timestamp}`;
            let content;
            let contentType;

            switch (format.toLowerCase()) {
                case 'csv':
                    content = convertToCSV(report);
                    filename += '.csv';
                    contentType = 'text/csv';
                    break;
                case 'html':
                    content = convertToHTML(report);
                    filename += '.html';
                    contentType = 'text/html';
                    break;
                default:
                    content = JSON.stringify(report, null, 2);
                    filename += '.json';
                    contentType = 'application/json';
            }

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(content);
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * 健康检查端点
     */
    app.get('/health', (req, res) => {
        const status = validationManager.getStatus();
        const stats = validationManager.getStatistics();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            validationManager: {
                isInitialized: status.isInitialized,
                isRunning: status.isRunning,
                lastValidation: validationManager.getLatestReport()?.timestamp || null,
                totalValidations: stats.totalValidations,
                passRate: stats.passRate
            }
        });
    });

    /**
     * 错误处理中间件
     */
    app.use((error, req, res, next) => {
        console.error('API错误:', error);
        res.status(500).json({
            success: false,
            error: '内部服务器错误',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    });

    return { app, validationManager };
}

/**
 * 转换报告为CSV格式
 */
function convertToCSV(report) {
    const lines = [];
    
    // 标题行
    lines.push('模块,状态,执行时间(ms),错误信息');
    
    // 数据行
    for (const [moduleType, result] of Object.entries(report.validation_modules || {})) {
        const moduleName = result.moduleName || moduleType;
        const status = result.status;
        const executionTime = result.executionTime || 0;
        const error = (result.error || '').replace(/"/g, '""');
        
        lines.push(`"${moduleName}","${status}","${executionTime}","${error}"`);
    }
    
    // 总结行
    lines.push('');
    lines.push('总结信息');
    lines.push(`总模块数,${report.total_modules}`);
    lines.push(`通过模块数,${report.passed_modules}`);
    lines.push(`失败模块数,${report.failed_modules}`);
    lines.push(`自动修复模块数,${report.auto_fixed_modules}`);
    lines.push(`通过率,${report.pass_rate}`);
    lines.push(`执行时间,${report.execution_time}`);
    
    return lines.join('\n');
}

/**
 * 转换报告为HTML格式
 */
function convertToHTML(report) {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>放射化学纯度检测仪验证报告</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #2c3e50; margin-bottom: 10px; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .summary-card { background: #ecf0f1; padding: 20px; border-radius: 8px; text-align: center; }
            .summary-card h3 { margin: 0 0 10px 0; color: #34495e; }
            .summary-card .value { font-size: 2em; font-weight: bold; color: #27ae60; }
            .modules { margin-top: 30px; }
            .module { margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 5px solid #bdc3c7; }
            .module.passed { background-color: #d5f4e6; border-left-color: #27ae60; }
            .module.failed { background-color: #ffeaa7; border-left-color: #e17055; }
            .module.auto-fixed { background-color: #dfe6e9; border-left-color: #74b9ff; }
            .module h4 { margin: 0 0 5px 0; color: #2c3e50; }
            .module .status { font-weight: bold; }
            .recommendations { margin-top: 30px; background: #fff3cd; padding: 20px; border-radius: 8px; }
            .recommendations h3 { color: #856404; margin-top: 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>放射化学纯度检测仪综合验证报告</h1>
                <p><strong>生成时间:</strong> ${report.timestamp}</p>
                <p><strong>验证ID:</strong> ${report.validation_id || 'N/A'}</p>
                <p><strong>总体状态:</strong> <span style="color: ${report.overall_status === 'PASSED' ? '#27ae60' : '#e17055'}">${report.overall_status}</span></p>
                <p><strong>通过率:</strong> ${report.pass_rate}</p>
                <p><strong>执行时间:</strong> ${report.execution_time}</p>
            </div>
            
            <div class="summary">
                <div class="summary-card">
                    <h3>总模块数</h3>
                    <div class="value">${report.total_modules}</div>
                </div>
                <div class="summary-card">
                    <h3>通过模块</h3>
                    <div class="value" style="color: #27ae60;">${report.passed_modules}</div>
                </div>
                <div class="summary-card">
                    <h3>失败模块</h3>
                    <div class="value" style="color: #e17055;">${report.failed_modules}</div>
                </div>
                <div class="summary-card">
                    <h3>自动修复</h3>
                    <div class="value" style="color: #74b9ff;">${report.auto_fixed_modules}</div>
                </div>
            </div>
            
            <div class="modules">
                <h2>详细验证结果</h2>
    `;
    
    for (const [moduleType, result] of Object.entries(report.validation_modules || {})) {
        const statusClass = result.status.toLowerCase().replace('_', '-');
        const statusIcon = result.status === 'PASSED' ? '✅' : 
                          result.status === 'AUTO_FIXED' ? '🔧' : 
                          result.status === 'FAILED' ? '❌' : '⚠️';
        
        html += `
            <div class="module ${statusClass}">
                <h4>${statusIcon} ${result.moduleName || moduleType}</h4>
                <p><strong>状态:</strong> <span class="status">${result.status}</span></p>
                <p><strong>执行时间:</strong> ${result.executionTime || 0}ms</p>
                ${result.error ? `<p><strong>错误:</strong> ${result.error}</p>` : ''}
            </div>
        `;
    }
    
    if (report.recommendations && report.recommendations.length > 0) {
        html += `
            </div>
            <div class="recommendations">
                <h3>建议和后续步骤</h3>
                <ul>
        `;
        for (const rec of report.recommendations) {
            html += `<li><strong>${rec.module}:</strong> ${rec.recommendation}</li>`;
        }
        for (const step of report.next_steps || []) {
            html += `<li>${step}</li>`;
        }
        html += `
                </ul>
            </div>
        `;
    }
    
    html += `
        </div>
    </body>
    </html>
    `;
    
    return html;
}

/**
 * 运行示例
 */
async function runExample() {
    console.log('🚀 启动放射化学纯度检测仪综合验证管理系统示例...\n');
    
    // 创建应用程序
    const { app, validationManager } = createExampleApp();
    
    // 启动服务器
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
        console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
        console.log('\n📖 可用的API端点:');
        console.log(`   GET  /                 - 主页和状态`);
        console.log(`   GET  /status           - 获取验证状态`);
        console.log(`   POST /validate         - 执行综合验证`);
        console.log(`   GET  /report           - 获取最新验证报告`);
        console.log(`   GET  /history          - 获取验证历史`);
        console.log(`   GET  /statistics       - 获取验证统计`);
        console.log(`   GET  /modules          - 获取可用验证模块`);
        console.log(`   POST /auto-fix         - 执行自动修复`);
        console.log(`   GET  /export           - 导出验证报告`);
        console.log(`   GET  /health           - 健康检查`);
        
        console.log('\n💡 快速开始:');
        console.log('   1. 在浏览器中打开 http://localhost:3000');
        console.log('   2. 或使用curl测试API: curl http://localhost:3000/status');
        console.log('   3. 执行验证: curl -X POST http://localhost:3000/validate');
        
        console.log('\n⚡ 按 Ctrl+C 停止服务器\n');
    });
    
    // 优雅关闭
    process.on('SIGINT', async () => {
        console.log('\n🛑 正在关闭服务器...');
        
        server.close(async () => {
            console.log('✅ HTTP服务器已关闭');
            
            try {
                await validationManager.shutdown();
                console.log('✅ 验证管理器已关闭');
            } catch (error) {
                console.error('❌ 关闭验证管理器时出错:', error);
            }
            
            console.log('👋 再见!');
            process.exit(0);
        });
    });
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
    runExample().catch(error => {
        console.error('示例运行失败:', error);
        process.exit(1);
    });
}

module.exports = {
    createExampleApp,
    runExample
};