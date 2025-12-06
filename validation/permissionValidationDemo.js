/**
 * 放射化学纯度检测仪权限系统验证模块使用示例
 */

const PermissionSystemValidation = require('./permissionSystemValidation');

/**
 * 权限系统验证使用示例
 */
class PermissionValidationDemo {
    constructor() {
        this.validator = new PermissionSystemValidation({
            jwtSecret: 'radiation-detector-production-secret-2025',
            tokenExpiry: '24h',
            signatureExpiry: '8h',
            auditLogPath: './logs/permission-audit.log',
            userPermissionsPath: './data/user_permissions.json'
        });
    }

    /**
     * 运行完整权限系统验证演示
     */
    async runFullValidationDemo() {
        console.log('='.repeat(80));
        console.log('放射化学纯度检测仪权限系统验证演示');
        console.log('='.repeat(80));
        console.log();

        try {
            // 执行完整验证
            const results = await this.validator.executeFullValidation();
            
            // 显示验证结果摘要
            this.displayValidationSummary(results);
            
            // 显示详细结果
            this.displayDetailedResults(results);
            
            // 生成并显示报告
            await this.displayValidationReport();
            
            console.log('='.repeat(80));
            console.log('权限系统验证演示完成');
            console.log('='.repeat(80));
            
            return results;
            
        } catch (error) {
            console.error('验证演示执行失败:', error);
            throw error;
        }
    }

    /**
     * 显示验证结果摘要
     */
    displayValidationSummary(results) {
        console.log('验证结果摘要:');
        console.log('-'.repeat(40));
        console.log(`整体状态: ${results.overall_status}`);
        console.log(`用户权限验证: ${results.user_permissions.status}`);
        console.log(`JWT Token验证: ${results.jwt_tokens.status}`);
        console.log(`三级权限验证: ${results.three_level_access.status}`);
        console.log(`电子签名验证: ${results.electronic_signatures.status}`);
        console.log(`发现问题数量: ${results.issues.length}`);
        console.log(`建议数量: ${results.recommendations.length}`);
        console.log();
    }

    /**
     * 显示详细验证结果
     */
    displayDetailedResults(results) {
        console.log('详细验证结果:');
        console.log('-'.repeat(40));
        
        // 用户权限详细结果
        console.log('1. 用户权限验证:');
        if (results.user_permissions.users) {
            results.user_permissions.users.forEach(user => {
                console.log(`   用户: ${user.username} (${user.user_id})`);
                console.log(`   角色: ${user.role}`);
                console.log(`   状态: ${user.status}`);
                if (user.issues.length > 0) {
                    console.log(`   问题: ${user.issues.join(', ')}`);
                }
                console.log();
            });
        }
        
        // JWT Token详细结果
        console.log('2. JWT Token验证:');
        if (results.jwt_tokens.mechanisms) {
            results.jwt_tokens.mechanisms.forEach(mechanism => {
                console.log(`   机制: ${mechanism.mechanism}`);
                console.log(`   状态: ${mechanism.status}`);
                if (mechanism.test_cases) {
                    mechanism.test_cases.forEach(testCase => {
                        console.log(`     测试: ${testCase.case} - ${testCase.passed ? '通过' : '失败'}`);
                    });
                }
                console.log();
            });
        }
        
        // 三级权限详细结果
        console.log('3. 三级权限验证:');
        if (results.three_level_access.levels) {
            results.three_level_access.levels.forEach(level => {
                console.log(`   角色: ${level.role || level.mechanism}`);
                console.log(`   状态: ${level.status}`);
                console.log();
            });
        }
        
        // 电子签名详细结果
        console.log('4. 电子签名验证:');
        if (results.electronic_signatures.features) {
            results.electronic_signatures.features.forEach(feature => {
                console.log(`   功能: ${feature.feature}`);
                console.log(`   状态: ${feature.status}`);
                console.log();
            });
        }
    }

    /**
     * 显示验证报告
     */
    async displayValidationReport() {
        const report = await this.validator.generateValidationReport();
        
        console.log('验证报告:');
        console.log('-'.repeat(40));
        console.log(`验证时间: ${report.timestamp}`);
        console.log(`总体测试数量: ${report.summary.total_tests}`);
        console.log(`通过测试数量: ${report.summary.passed_tests}`);
        console.log(`失败测试数量: ${report.summary.failed_tests}`);
        console.log(`通过率: ${report.summary.pass_rate}`);
        console.log();
        
        if (report.issues.length > 0) {
            console.log('发现的问题:');
            report.issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
            console.log();
        }
        
        if (report.recommendations.length > 0) {
            console.log('建议:');
            report.recommendations.forEach((recommendation, index) => {
                console.log(`   ${index + 1}. ${recommendation}`);
            });
            console.log();
        }
    }

    /**
     * 运行特定测试场景
     */
    async runSpecificTests(scenario) {
        console.log(`执行特定测试场景: ${scenario}`);
        console.log('-'.repeat(40));
        
        const testResults = await this.validator.executePermissionTests(scenario);
        
        testResults.forEach(result => {
            console.log(`场景: ${result.scenario}`);
            console.log(`角色: ${result.role || 'N/A'}`);
            console.log(`操作: ${result.action || result.test}`);
            console.log(`期望结果: ${result.expected_result || 'N/A'}`);
            console.log(`测试结果: ${result.test_result}`);
            console.log();
        });
        
        return testResults;
    }

    /**
     * 交互式权限验证演示
     */
    async runInteractiveDemo() {
        console.log('交互式权限验证演示');
        console.log('='.repeat(40));
        
        const scenarios = [
            'operator_permissions',
            'supervisor_permissions', 
            'admin_permissions',
            'signature_requirements'
        ];
        
        for (const scenario of scenarios) {
            console.log(`\n执行场景: ${scenario}`);
            await this.runSpecificTests(scenario);
            console.log('-'.repeat(40));
        }
    }
}

/**
 * API路由处理函数
 */
class PermissionValidationAPI {
    constructor(validator) {
        this.validator = validator;
    }

    /**
     * 获取权限验证结果 - GET /api/validation/permissions
     */
    async getValidationResults(req, res) {
        try {
            const results = this.validator.validationResults;
            res.json({
                success: true,
                data: results,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 执行权限测试 - POST /api/validation/permissions/test
     */
    async executePermissionTests(req, res) {
        try {
            const { scenario } = req.body;
            
            if (!scenario) {
                return res.status(400).json({
                    success: false,
                    error: '缺少测试场景参数',
                    available_scenarios: ['operator_permissions', 'supervisor_permissions', 'admin_permissions', 'signature_requirements', 'all']
                });
            }
            
            const testResults = await this.validator.executePermissionTests(scenario);
            
            res.json({
                success: true,
                data: testResults,
                scenario: scenario,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 获取权限验证报告 - GET /api/validation/permissions/report
     */
    async getValidationReport(req, res) {
        try {
            const report = await this.validator.generateValidationReport();
            
            res.json({
                success: true,
                data: report,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 执行完整权限验证 - POST /api/validation/permissions/full
     */
    async executeFullValidation(req, res) {
        try {
            const results = await this.validator.executeFullValidation();
            
            res.json({
                success: true,
                data: results,
                message: '完整权限验证执行完成',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

/**
 * 简单的Express服务器示例
 */
function createValidationServer() {
    const express = require('express');
    const app = express();
    const port = 3000;
    
    app.use(express.json());
    
    const validator = new PermissionSystemValidation();
    const api = new PermissionValidationAPI(validator);
    
    // API路由
    app.get('/api/validation/permissions', api.getValidationResults.bind(api));
    app.post('/api/validation/permissions/test', api.executePermissionTests.bind(api));
    app.get('/api/validation/permissions/report', api.getValidationReport.bind(api));
    app.post('/api/validation/permissions/full', api.executeFullValidation.bind(api));
    
    // 健康检查端点
    app.get('/health', (req, res) => {
        res.json({
            status: 'OK',
            service: '权限系统验证服务',
            timestamp: new Date().toISOString()
        });
    });
    
    return app;
}

// 演示程序入口
async function main() {
    const demo = new PermissionValidationDemo();
    
    try {
        // 运行完整验证演示
        await demo.runFullValidationDemo();
        
        // 如果需要启动API服务器，取消注释下面的代码
        /*
        console.log('\n启动API服务器...');
        const app = createValidationServer();
        app.listen(port, () => {
            console.log(`权限系统验证API服务器运行在 http://localhost:${port}`);
            console.log('可用端点:');
            console.log('  GET  /api/validation/permissions - 获取验证结果');
            console.log('  POST /api/validation/permissions/test - 执行权限测试');
            console.log('  GET  /api/validation/permissions/report - 获取验证报告');
            console.log('  POST /api/validation/permissions/full - 执行完整验证');
            console.log('  GET  /health - 健康检查');
        });
        */
        
    } catch (error) {
        console.error('演示程序执行失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
    main();
}

module.exports = {
    PermissionValidationDemo,
    PermissionValidationAPI,
    createValidationServer
};