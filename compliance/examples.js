/**
 * CFR21 Part 11 合规性检查系统使用示例
 * 展示如何使用合规性检查功能
 */

const CFR21ComplianceSystem = require('./index');

/**
 * 示例1: 执行完整合规性检查
 */
async function exampleFullComplianceCheck() {
    console.log('=== 示例1: 执行完整合规性检查 ===\n');

    try {
        // 初始化合规性系统
        const complianceSystem = new CFR21ComplianceSystem({
            basePath: './',
            reportPath: './compliance-reports/',
            certificatePath: './certificates/'
        });

        // 执行完整检查
        const results = await complianceSystem.runFullComplianceCheck();

        if (results.success) {
            console.log('✅ 合规性检查成功完成');
            console.log(`📊 总体分数: ${results.results.overall.overallScore}%`);
            console.log(`📋 合规状态: ${results.results.overall.complianceStatus}`);
            console.log(`⏱️  检查耗时: ${results.duration}ms`);
        } else {
            console.log('❌ 合规性检查失败:', results.error);
        }

    } catch (error) {
        console.error('示例1执行失败:', error);
    }
}

/**
 * 示例2: 生成合规性证书
 */
async function exampleGenerateCertificate() {
    console.log('\n=== 示例2: 生成合规性证书 ===\n');

    try {
        const complianceSystem = new CFR21ComplianceSystem();

        // 先执行检查（简化版）
        const results = await complianceSystem.compliance.performComprehensiveComplianceCheck();
        
        // 生成证书
        const certificate = complianceSystem.generateComplianceCertificate(results);

        console.log('🏆 合规性证书信息:');
        console.log(`证书编号: ${certificate.certificateNumber}`);
        console.log(`证书状态: ${certificate.complianceStatus}`);
        console.log(`合规分数: ${certificate.complianceScore}%`);
        console.log(`签发日期: ${certificate.issueDate}`);
        console.log(`验证代码: ${certificate.verificationCode}`);

    } catch (error) {
        console.error('示例2执行失败:', error);
    }
}

/**
 * 示例3: 查看合规性仪表板
 */
async function exampleViewDashboard() {
    console.log('\n=== 示例3: 查看合规性仪表板 ===\n');

    try {
        const complianceSystem = new CFR21ComplianceSystem();
        
        // 获取仪表板数据
        const dashboard = complianceSystem.getComplianceDashboard();

        console.log('📊 合规性仪表板:');
        console.log(`系统名称: ${dashboard.systemName}`);
        console.log(`总体状态: ${dashboard.overallStatus}`);
        console.log(`合规分数: ${dashboard.complianceScore}%`);
        console.log(`最后检查: ${dashboard.lastCheck || '未检查'}`);
        
        console.log('\n📈 问题统计:');
        console.log(`关键问题: ${dashboard.issues.critical}`);
        console.log(`高优先级: ${dashboard.issues.high}`);
        console.log(`中优先级: ${dashboard.issues.medium}`);
        console.log(`低优先级: ${dashboard.issues.low}`);

        console.log('\n📋 各部分状态:');
        Object.entries(dashboard.sections).forEach(([section, data]) => {
            console.log(`${section}: ${data.score}% (${data.failed.length}失败, ${data.warnings.length}警告)`);
        });

    } catch (error) {
        console.error('示例3执行失败:', error);
    }
}

/**
 * 示例4: 导出合规性数据
 */
async function exampleExportData() {
    console.log('\n=== 示例4: 导出合规性数据 ===\n');

    try {
        const complianceSystem = new CFR21ComplianceSystem();

        // 执行检查
        await complianceSystem.runFullComplianceCheck({ silent: true });

        // 导出JSON格式
        const jsonExport = complianceSystem.exportComplianceData('json');
        console.log(`📤 JSON数据已导出: ${jsonExport.file} (${jsonExport.size} bytes)`);

        // 导出CSV格式
        const csvExport = complianceSystem.exportComplianceData('csv');
        console.log(`📤 CSV数据已导出: ${csvExport.file} (${csvExport.size} bytes)`);

        // 导出HTML格式
        const htmlExport = complianceSystem.exportComplianceData('html');
        console.log(`📤 HTML报告已导出: ${htmlExport.file} (${htmlExport.size} bytes)`);

    } catch (error) {
        console.error('示例4执行失败:', error);
    }
}

/**
 * 示例5: 持续监控（演示版）
 */
async function exampleContinuousMonitoring() {
    console.log('\n=== 示例5: 持续监控（演示版） ===\n');

    try {
        const complianceSystem = new CFR21ComplianceSystem();

        // 启动持续监控（检查间隔设置为10秒，仅用于演示）
        console.log('🔄 启动持续监控模式...');
        const monitorInterval = complianceSystem.startContinuousMonitoring(10000);

        // 等待30秒后停止监控（实际使用中可以根据需要调整）
        setTimeout(() => {
            complianceSystem.stopContinuousMonitoring();
            console.log('⏹️ 已停止持续监控');
        }, 30000);

        // 在监控期间显示一些信息
        console.log('📡 监控已启动，将每10秒检查一次合规性...');
        console.log('⏱️ 30秒后将自动停止监控（演示用途）');

    } catch (error) {
        console.error('示例5执行失败:', error);
    }
}

/**
 * 示例6: 定制化配置
 */
async function exampleCustomConfiguration() {
    console.log('\n=== 示例6: 定制化配置 ===\n');

    try {
        // 自定义配置
        const customConfig = {
            systemValidation: {
                requireDocumentedValidation: true,
                requireTestResults: true,
                validationPath: './custom-validation/'
            },
            accessControl: {
                sessionTimeout: 60, // 1小时
                maxFailedAttempts: 5,
                passwordRequirements: {
                    minLength: 12,
                    requireUppercase: true,
                    requireLowercase: true,
                    requireNumbers: true,
                    requireSpecialChars: true
                }
            },
            electronicSignatures: {
                requireTwoFactor: true, // 启用两因子认证
                requirePasswordConfirmation: true
            }
        };

        const complianceSystem = new CFR21ComplianceSystem(customConfig);

        console.log('⚙️ 自定义配置已应用:');
        console.log('- 会话超时: 60分钟');
        console.log('- 密码最小长度: 12字符');
        console.log('- 启用两因子认证: 是');
        console.log('- 密码确认要求: 是');

        // 执行检查
        const results = await complianceSystem.runFullComplianceCheck();
        
        if (results.success) {
            console.log(`📊 自定义配置检查结果: ${results.results.overall.overallScore}%`);
        }

    } catch (error) {
        console.error('示例6执行失败:', error);
    }
}

/**
 * 主函数 - 运行所有示例
 */
async function runAllExamples() {
    console.log('🚀 CFR21 Part 11 合规性检查系统使用示例\n');
    console.log('=' * 60);

    try {
        // 按顺序执行所有示例
        await exampleFullComplianceCheck();
        await exampleGenerateCertificate();
        await exampleViewDashboard();
        await exampleExportData();
        // await exampleContinuousMonitoring(); // 注释掉，避免长时间运行
        await exampleCustomConfiguration();

        console.log('\n' + '=' * 60);
        console.log('✅ 所有示例执行完成');
        console.log('\n📁 查看生成的报告文件:');
        console.log('- 合规性报告: ./compliance-reports/');
        console.log('- 合规性证书: ./certificates/');
        console.log('- 检查日志: ./compliance-logs/');

    } catch (error) {
        console.error('示例执行过程中发生错误:', error);
    }
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
    runAllExamples();
}

// 导出示例函数供其他模块使用
module.exports = {
    exampleFullComplianceCheck,
    exampleGenerateCertificate,
    exampleViewDashboard,
    exampleExportData,
    exampleContinuousMonitoring,
    exampleCustomConfiguration,
    runAllExamples
};