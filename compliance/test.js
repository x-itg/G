/**
 * CFR21 Part 11 合规性检查系统测试
 * 验证系统功能是否正常工作
 */

const CFR21ComplianceSystem = require('./index');
const path = require('path');
const fs = require('fs');

class ComplianceSystemTester {
    constructor() {
        this.testResults = [];
        this.system = null;
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🧪 开始CFR21 Part 11合规性系统测试\n');
        
        const startTime = Date.now();
        
        try {
            // 初始化系统
            await this.testSystemInitialization();
            
            // 测试核心功能
            await this.testCoreCompliance();
            
            // 测试报告生成
            await this.testReportGeneration();
            
            // 测试证书生成
            await this.testCertificateGeneration();
            
            // 测试仪表板功能
            await this.testDashboardFunctionality();
            
            // 测试数据导出
            await this.testDataExport();
            
            // 测试配置管理
            await this.testConfigurationManagement();
            
            // 计算测试结果
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.generateTestReport(duration);
            
        } catch (error) {
            console.error('❌ 测试过程中发生严重错误:', error);
            this.recordTestResult('system_critical_error', 'FAIL', error.message);
        }
    }

    /**
     * 测试系统初始化
     */
    async testSystemInitialization() {
        console.log('📋 测试1: 系统初始化');
        
        try {
            // 测试默认初始化
            this.system = new CFR21ComplianceSystem();
            this.recordTestResult('initialization_default', 'PASS', '默认初始化成功');
            
            // 测试自定义配置初始化
            const customSystem = new CFR21ComplianceSystem({
                basePath: './test-path/',
                reportPath: './test-reports/',
                sessionTimeout: 45
            });
            this.recordTestResult('initialization_custom', 'PASS', '自定义配置初始化成功');
            
            // 验证目录创建
            const directories = ['./test-reports/', './test-certificates/', './test-logs/'];
            directories.forEach(dir => {
                if (fs.existsSync(dir)) {
                    this.recordTestResult(`directory_creation_${path.basename(dir)}`, 'PASS', `目录创建成功: ${dir}`);
                } else {
                    this.recordTestResult(`directory_creation_${path.basename(dir)}`, 'FAIL', `目录创建失败: ${dir}`);
                }
            });
            
        } catch (error) {
            this.recordTestResult('initialization', 'FAIL', error.message);
        }
    }

    /**
     * 测试核心合规性检查
     */
    async testCoreCompliance() {
        console.log('📋 测试2: 核心合规性检查');
        
        try {
            // 测试执行完整检查
            const results = await this.system.runFullComplianceCheck({ silent: true });
            
            if (results.success) {
                this.recordTestResult('full_compliance_check', 'PASS', `检查成功，得分: ${results.results.overall.overallScore}%`);
                
                // 验证结果结构
                if (results.results.overall && results.results.overall.sections) {
                    this.recordTestResult('results_structure', 'PASS', '检查结果结构正确');
                } else {
                    this.recordTestResult('results_structure', 'FAIL', '检查结果结构异常');
                }
                
                // 验证部分检查
                const expectedSections = ['11.10', '11.30', '11.50', '11.70', '11.100', '11.200'];
                const actualSections = Object.keys(results.results.overall.sections);
                const sectionsMatch = expectedSections.every(section => actualSections.includes(section));
                
                if (sectionsMatch) {
                    this.recordTestResult('required_sections', 'PASS', '所有必需部分都已检查');
                } else {
                    this.recordTestResult('required_sections', 'FAIL', '缺少部分检查');
                }
                
            } else {
                this.recordTestResult('full_compliance_check', 'FAIL', results.error || '未知错误');
            }
            
        } catch (error) {
            this.recordTestResult('full_compliance_check', 'FAIL', error.message);
        }
    }

    /**
     * 测试报告生成
     */
    async testReportGeneration() {
        console.log('📋 测试3: 报告生成');
        
        try {
            // 先确保有检查结果
            const checkResults = await this.system.runFullComplianceCheck({ silent: true, generateReports: false });
            
            if (checkResults.success) {
                // 测试执行摘要报告生成
                const executiveReport = this.system.reportGenerator.generateExecutiveSummary(checkResults.results);
                if (executiveReport.overallScore >= 0) {
                    this.recordTestResult('executive_report', 'PASS', '执行摘要报告生成成功');
                } else {
                    this.recordTestResult('executive_report', 'FAIL', '执行摘要报告生成失败');
                }
                
                // 测试详细报告生成
                const detailedReport = this.system.reportGenerator.generateDetailedReport(
                    checkResults.results, 
                    checkResults.results.detailedChecks
                );
                if (detailedReport.technicalDetails) {
                    this.recordTestResult('detailed_report', 'PASS', '详细报告生成成功');
                } else {
                    this.recordTestResult('detailed_report', 'FAIL', '详细报告生成失败');
                }
                
                // 测试问题清单生成
                const issueList = this.system.reportGenerator.generateIssueList(checkResults.results);
                if (issueList.issueCategories) {
                    this.recordTestResult('issue_list', 'PASS', '问题清单生成成功');
                } else {
                    this.recordTestResult('issue_list', 'FAIL', '问题清单生成失败');
                }
                
                // 测试修复建议报告生成
                const remediationReport = this.system.reportGenerator.generateRemediationReport(
                    checkResults.results,
                    checkResults.results.detailedChecks
                );
                if (remediationReport.immediateActions) {
                    this.recordTestResult('remediation_report', 'PASS', '修复建议报告生成成功');
                } else {
                    this.recordTestResult('remediation_report', 'FAIL', '修复建议报告生成失败');
                }
            }
            
        } catch (error) {
            this.recordTestResult('report_generation', 'FAIL', error.message);
        }
    }

    /**
     * 测试证书生成
     */
    async testCertificateGeneration() {
        console.log('📋 测试4: 合规性证书');
        
        try {
            // 先执行检查
            const checkResults = await this.system.runFullComplianceCheck({ silent: true, generateReports: false });
            
            if (checkResults.success) {
                // 测试证书生成
                const certificate = this.system.generateComplianceCertificate(checkResults.results);
                
                if (certificate.certificateNumber && certificate.complianceStatus) {
                    this.recordTestResult('certificate_generation', 'PASS', `证书生成成功: ${certificate.certificateNumber}`);
                    
                    // 验证证书内容
                    if (certificate.authorizedBy && certificate.authorizedBy.signature) {
                        this.recordTestResult('certificate_signature', 'PASS', '证书签名生成成功');
                    } else {
                        this.recordTestResult('certificate_signature', 'FAIL', '证书签名生成失败');
                    }
                    
                    if (certificate.verificationCode) {
                        this.recordTestResult('certificate_verification_code', 'PASS', '验证代码生成成功');
                    } else {
                        this.recordTestResult('certificate_verification_code', 'FAIL', '验证代码生成失败');
                    }
                } else {
                    this.recordTestResult('certificate_generation', 'FAIL', '证书生成失败');
                }
            }
            
        } catch (error) {
            this.recordTestResult('certificate_generation', 'FAIL', error.message);
        }
    }

    /**
     * 测试仪表板功能
     */
    async testDashboardFunctionality() {
        console.log('📋 测试5: 仪表板功能');
        
        try {
            // 测试仪表板数据获取
            const dashboard = this.system.getComplianceDashboard();
            
            if (dashboard.systemName && dashboard.timestamp) {
                this.recordTestResult('dashboard_data', 'PASS', '仪表板数据获取成功');
            } else {
                this.recordTestResult('dashboard_data', 'FAIL', '仪表板数据获取失败');
            }
            
            // 验证仪表板字段
            const requiredFields = ['overallStatus', 'complianceScore', 'issues', 'sections'];
            const missingFields = requiredFields.filter(field => !(field in dashboard));
            
            if (missingFields.length === 0) {
                this.recordTestResult('dashboard_fields', 'PASS', '仪表板字段完整');
            } else {
                this.recordTestResult('dashboard_fields', 'FAIL', `缺少字段: ${missingFields.join(', ')}`);
            }
            
        } catch (error) {
            this.recordTestResult('dashboard_functionality', 'FAIL', error.message);
        }
    }

    /**
     * 测试数据导出
     */
    async testDataExport() {
        console.log('📋 测试6: 数据导出');
        
        try {
            // 先执行检查
            await this.system.runFullComplianceCheck({ silent: true, generateReports: false });
            
            // 测试JSON导出
            try {
                const jsonExport = this.system.exportComplianceData('json');
                if (fs.existsSync(jsonExport.file)) {
                    this.recordTestResult('json_export', 'PASS', `JSON导出成功: ${jsonExport.file}`);
                } else {
                    this.recordTestResult('json_export', 'FAIL', 'JSON导出文件未创建');
                }
            } catch (error) {
                this.recordTestResult('json_export', 'FAIL', error.message);
            }
            
            // 测试CSV导出
            try {
                const csvExport = this.system.exportComplianceData('csv');
                if (fs.existsSync(csvExport.file)) {
                    this.recordTestResult('csv_export', 'PASS', `CSV导出成功: ${csvExport.file}`);
                } else {
                    this.recordTestResult('csv_export', 'FAIL', 'CSV导出文件未创建');
                }
            } catch (error) {
                this.recordTestResult('csv_export', 'FAIL', error.message);
            }
            
            // 测试HTML导出
            try {
                const htmlExport = this.system.exportComplianceData('html');
                if (fs.existsSync(htmlExport.file)) {
                    this.recordTestResult('html_export', 'PASS', `HTML导出成功: ${htmlExport.file}`);
                } else {
                    this.recordTestResult('html_export', 'FAIL', 'HTML导出文件未创建');
                }
            } catch (error) {
                this.recordTestResult('html_export', 'FAIL', error.message);
            }
            
        } catch (error) {
            this.recordTestResult('data_export', 'FAIL', error.message);
        }
    }

    /**
     * 测试配置管理
     */
    async testConfigurationManagement() {
        console.log('📋 测试7: 配置管理');
        
        try {
            // 测试自定义配置
            const customConfig = {
                systemValidation: {
                    requireDocumentedValidation: false
                },
                accessControl: {
                    sessionTimeout: 120
                },
                electronicSignatures: {
                    requireTwoFactor: true
                }
            };
            
            const customSystem = new CFR21ComplianceSystem(customConfig);
            
            // 验证配置是否正确应用
            if (customSystem.config.accessControl.sessionTimeout === 120) {
                this.recordTestResult('custom_config_timeout', 'PASS', '自定义会话超时配置成功');
            } else {
                this.recordTestResult('custom_config_timeout', 'FAIL', '自定义会话超时配置失败');
            }
            
            if (customSystem.config.electronicSignatures.requireTwoFactor === true) {
                this.recordTestResult('custom_config_2fa', 'PASS', '自定义两因子认证配置成功');
            } else {
                this.recordTestResult('custom_config_2fa', 'FAIL', '自定义两因子认证配置失败');
            }
            
        } catch (error) {
            this.recordTestResult('configuration_management', 'FAIL', error.message);
        }
    }

    /**
     * 记录测试结果
     */
    recordTestResult(testName, status, message) {
        const result = {
            test: testName,
            status,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const statusIcon = status === 'PASS' ? '✅' : '❌';
        console.log(`  ${statusIcon} ${testName}: ${message}`);
    }

    /**
     * 生成测试报告
     */
    generateTestReport(duration) {
        const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
        const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
        const totalTests = this.testResults.length;
        const passRate = Math.round((passedTests / totalTests) * 100);

        console.log('\n' + '=' * 60);
        console.log('📊 CFR21 Part 11 合规性系统测试报告');
        console.log('=' * 60);
        console.log(`测试时间: ${duration}ms`);
        console.log(`总测试数: ${totalTests}`);
        console.log(`通过: ${passedTests} ✅`);
        console.log(`失败: ${failedTests} ❌`);
        console.log(`通过率: ${passRate}%`);
        console.log('\n详细结果:');
        
        this.testResults.forEach(result => {
            const statusIcon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`  ${statusIcon} ${result.test}: ${result.message}`);
        });

        // 保存测试报告
        this.saveTestReport(duration, passedTests, failedTests, totalTests, passRate);
        
        console.log('\n' + '=' * 60);
        if (passRate >= 90) {
            console.log('🎉 系统测试通过！CFR21 Part 11合规性检查系统运行正常。');
        } else if (passRate >= 75) {
            console.log('⚠️  系统测试基本通过，但存在一些问题需要修复。');
        } else {
            console.log('🚨 系统测试失败！存在严重问题，需要立即修复。');
        }
        console.log('=' * 60);
    }

    /**
     * 保存测试报告
     */
    saveTestReport(duration, passedTests, failedTests, totalTests, passRate) {
        const report = {
            title: 'CFR21 Part 11 合规性系统测试报告',
            testDate: new Date().toISOString(),
            testDuration: duration,
            summary: {
                totalTests,
                passedTests,
                failedTests,
                passRate
            },
            testResults: this.testResults,
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };

        try {
            const reportPath = './test-report-compliance-system.json';
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`📄 测试报告已保存: ${reportPath}`);
        } catch (error) {
            console.warn('⚠️  无法保存测试报告:', error.message);
        }
    }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    const tester = new ComplianceSystemTester();
    tester.runAllTests().catch(error => {
        console.error('测试执行失败:', error);
        process.exit(1);
    });
}

module.exports = ComplianceSystemTester;