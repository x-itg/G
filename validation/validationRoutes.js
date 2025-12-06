/**
 * 综合验证管理API路由
 * 
 * 提供以下接口：
 * - POST /api/validation/comprehensive/run - 执行综合验证
 * - GET /api/validation/comprehensive/status - 获取验证状态
 * - GET /api/validation/comprehensive/report - 获取验证报告
 * - POST /api/validation/comprehensive/auto-fix - 自动修复问题
 * - GET /api/validation/comprehensive/history - 获取验证历史
 * - GET /api/validation/comprehensive/modules - 获取可用验证模块
 */

const express = require('express');
const router = express.Router();
const ComprehensiveValidator = require('./comprehensiveValidator');

/**
 * 验证器实例
 */
let validator = null;

/**
 * 获取验证器实例
 */
function getValidator() {
    if (!validator) {
        validator = new ComprehensiveValidator({
            maxRetries: 3,
            timeout: 60000,
            autoFixEnabled: true,
            parallelExecution: true,
            healthCheckEnabled: true
        });
    }
    return validator;
}

/**
 * 执行综合验证
 * POST /api/validation/comprehensive/run
 */
router.post('/run', async (req, res) => {
    try {
        const validator = getValidator();
        
        // 验证请求参数
        const options = {
            modules: req.body.modules || null,
            autoFixEnabled: req.body.autoFixEnabled !== false,
            parallelExecution: req.body.parallelExecution !== false,
            timeout: req.body.timeout || 60000
        };

        // 检查是否已在运行
        if (validator.isRunning) {
            return res.status(409).json({
                error: '验证正在进行中，请等待完成',
                currentValidation: validator.currentValidation
            });
        }

        // 启动验证
        res.status(202).json({
            message: '验证已启动',
            validationId: 'pending',
            status: 'starting'
        });

        // 异步执行验证
        try {
            const report = await validator.runComprehensiveValidation(options);
            
            // 通过WebSocket或服务器发送事件通知前端
            req.app.get('io')?.emit('validation:completed', report);
            
        } catch (error) {
            console.error('验证执行失败:', error);
            req.app.get('io')?.emit('validation:failed', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('启动验证失败:', error);
        res.status(500).json({
            error: '启动验证失败',
            message: error.message
        });
    }
});

/**
 * 获取验证状态
 * GET /api/validation/comprehensive/status
 */
router.get('/status', (req, res) => {
    try {
        const validator = getValidator();
        const status = validator.getValidationStatus();
        
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('获取验证状态失败:', error);
        res.status(500).json({
            error: '获取验证状态失败',
            message: error.message
        });
    }
});

/**
 * 获取验证报告
 * GET /api/validation/comprehensive/report
 */
router.get('/report', (req, res) => {
    try {
        const validator = getValidator();
        const validationId = req.query.validationId;
        
        const report = validator.getValidationReport(validationId);
        
        if (!report) {
            return res.status(404).json({
                error: '未找到验证报告',
                message: '请检查验证ID或稍后再试'
            });
        }

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('获取验证报告失败:', error);
        res.status(500).json({
            error: '获取验证报告失败',
            message: error.message
        });
    }
});

/**
 * 执行自动修复
 * POST /api/validation/comprehensive/auto-fix
 */
router.post('/auto-fix', async (req, res) => {
    try {
        const { moduleType, issueType, issueData } = req.body;
        
        if (!moduleType || !issueType) {
            return res.status(400).json({
                error: '缺少必要参数',
                message: '需要提供 moduleType 和 issueType'
            });
        }

        const validator = getValidator();
        const fixResult = await validator.executeAutoFix(moduleType, issueType, issueData);
        
        res.json({
            success: true,
            data: fixResult
        });
        
    } catch (error) {
        console.error('执行自动修复失败:', error);
        res.status(500).json({
            error: '执行自动修复失败',
            message: error.message
        });
    }
});

/**
 * 获取验证历史
 * GET /api/validation/comprehensive/history
 */
router.get('/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const validator = getValidator();
        const history = validator.getValidationHistory(limit);
        
        res.json({
            success: true,
            data: history,
            total: history.length
        });
    } catch (error) {
        console.error('获取验证历史失败:', error);
        res.status(500).json({
            error: '获取验证历史失败',
            message: error.message
        });
    }
});

/**
 * 获取可用验证模块
 * GET /api/validation/comprehensive/modules
 */
router.get('/modules', (req, res) => {
    try {
        const validator = getValidator();
        const modules = validator.validationModules;
        
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
        console.error('获取验证模块失败:', error);
        res.status(500).json({
            error: '获取验证模块失败',
            message: error.message
        });
    }
});

/**
 * 清除验证历史
 * DELETE /api/validation/comprehensive/history
 */
router.delete('/history', (req, res) => {
    try {
        const validator = getValidator();
        validator.clearValidationHistory();
        
        res.json({
            success: true,
            message: '验证历史已清除'
        });
    } catch (error) {
        console.error('清除验证历史失败:', error);
        res.status(500).json({
            error: '清除验证历史失败',
            message: error.message
        });
    }
});

/**
 * 获取验证结果统计
 * GET /api/validation/comprehensive/statistics
 */
router.get('/statistics', (req, res) => {
    try {
        const validator = getValidator();
        const history = validator.getValidationHistory(100); // 最近100次
        
        if (history.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalValidations: 0,
                    passedValidations: 0,
                    failedValidations: 0,
                    averageExecutionTime: 0,
                    passRate: 0
                }
            });
        }

        const totalValidations = history.length;
        const passedValidations = history.filter(h => h.overall_status === 'PASSED').length;
        const failedValidations = history.filter(h => h.overall_status === 'FAILED').length;
        const averageExecutionTime = history.reduce((sum, h) => {
            const time = parseInt(h.execution_time) || 0;
            return sum + time;
        }, 0) / totalValidations;
        const passRate = (passedValidations / totalValidations * 100).toFixed(2);

        res.json({
            success: true,
            data: {
                totalValidations,
                passedValidations,
                failedValidations,
                averageExecutionTime: Math.round(averageExecutionTime),
                passRate: `${passRate}%`
            }
        });
    } catch (error) {
        console.error('获取验证统计失败:', error);
        res.status(500).json({
            error: '获取验证统计失败',
            message: error.message
        });
    }
});

/**
 * 导出验证报告
 * GET /api/validation/comprehensive/export
 */
router.get('/export', (req, res) => {
    try {
        const format = req.query.format || 'json'; // json, csv, html
        const validationId = req.query.validationId;
        
        const validator = getValidator();
        const report = validator.getValidationReport(validationId);
        
        if (!report) {
            return res.status(404).json({
                error: '未找到验证报告'
            });
        }

        let filename = `validation-report-${Date.now()}`;
        let content;
        let contentType;

        switch (format.toLowerCase()) {
            case 'csv':
                content = convertReportToCSV(report);
                filename += '.csv';
                contentType = 'text/csv';
                break;
            case 'html':
                content = convertReportToHTML(report);
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
        console.error('导出验证报告失败:', error);
        res.status(500).json({
            error: '导出验证报告失败',
            message: error.message
        });
    }
});

/**
 * 将报告转换为CSV格式
 */
function convertReportToCSV(report) {
    const lines = [];
    
    // 标题行
    lines.push('验证项目,状态,执行时间,错误信息');
    
    // 数据行
    for (const [moduleType, result] of Object.entries(report.validation_modules || {})) {
        const moduleName = result.moduleName || moduleType;
        const status = result.status;
        const executionTime = result.executionTime || 0;
        const error = result.error || '';
        
        lines.push(`"${moduleName}","${status}","${executionTime}ms","${error}"`);
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
 * 将报告转换为HTML格式
 */
function convertReportToHTML(report) {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>放射化学纯度检测仪验证报告</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
            .summary { margin: 20px 0; }
            .module { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            .passed { background-color: #d4edda; border-color: #c3e6cb; }
            .failed { background-color: #f8d7da; border-color: #f5c6cb; }
            .warning { background-color: #fff3cd; border-color: #ffeaa7; }
            .auto-fixed { background-color: #d1ecf1; border-color: #bee5eb; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>放射化学纯度检测仪综合验证报告</h1>
            <p><strong>生成时间:</strong> ${report.timestamp}</p>
            <p><strong>验证ID:</strong> ${report.validation_id}</p>
            <p><strong>总体状态:</strong> ${report.overall_status}</p>
            <p><strong>通过率:</strong> ${report.pass_rate}</p>
            <p><strong>执行时间:</strong> ${report.execution_time}</p>
        </div>
        
        <div class="summary">
            <h2>验证摘要</h2>
            <table>
                <tr><th>总模块数</th><td>${report.total_modules}</td></tr>
                <tr><th>通过模块数</th><td>${report.passed_modules}</td></tr>
                <tr><th>失败模块数</th><td>${report.failed_modules}</td></tr>
                <tr><th>自动修复模块数</th><td>${report.auto_fixed_modules}</td></tr>
                <tr><th>警告模块数</th><td>${report.warning_modules}</td></tr>
            </table>
        </div>
        
        <div class="modules">
            <h2>详细验证结果</h2>
    `;
    
    for (const [moduleType, result] of Object.entries(report.validation_modules || {})) {
        const statusClass = result.status.toLowerCase().replace('_', '-');
        html += `
            <div class="module ${statusClass}">
                <h3>${result.moduleName || moduleType}</h3>
                <p><strong>状态:</strong> ${result.status}</p>
                <p><strong>执行时间:</strong> ${result.executionTime || 0}ms</p>
                ${result.error ? `<p><strong>错误:</strong> ${result.error}</p>` : ''}
            </div>
        `;
    }
    
    if (report.recommendations && report.recommendations.length > 0) {
        html += `
            <div class="recommendations">
                <h2>建议</h2>
                <ul>
        `;
        for (const rec of report.recommendations) {
            html += `<li><strong>${rec.module}:</strong> ${rec.recommendation}</li>`;
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

module.exports = router;