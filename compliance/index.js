/**
 * CFR21 Part 11 合规性检查系统 - 主入口
 * 放射化学纯度检测仪专用合规性验证和报告系统
 * 
 * 功能：
 * - 自动化合规性检查
 * - 详细报告生成
 * - 问题检测和修复建议
 * - 合规性状态监控
 */

const CFR21Compliance = require('./cfr21Compliance');
const ComplianceChecker = require('./complianceChecker');
const ComplianceReportGenerator = require('./reportGenerator');
const fs = require('fs');
const path = require('path');

class CFR21ComplianceSystem {
    constructor(config = {}) {
        this.config = {
            basePath: './',
            reportPath: './compliance-reports/',
            certificatePath: './certificates/',
            logPath: './compliance-logs/',
            ...config
        };

        // 初始化组件
        this.compliance = new CFR21Compliance(config);
        this.checker = new ComplianceChecker(config);
        this.reportGenerator = new ComplianceReportGenerator();

        // 确保目录存在
        this.ensureDirectories();

        // 设置事件监听
        this.setupEventListeners();
    }

    /**
     * 执行完整合规性检查
     */
    async runFullComplianceCheck(options = {}) {
        console.log('🚀 开始CFR21 Part 11全面合规性检查...');
        
        const startTime = Date.now();
        
        try {
            // 执行核心合规性检查
            console.log('📋 执行核心合规性检查...');
            const complianceResults = await this.compliance.performComprehensiveComplianceCheck();

            // 执行详细检查工具
            console.log('🔧 执行详细检查工具...');
            const checkerResults = await this.checker.checkSystemConfigurationCompliance();
            const userPermissionResults = await this.checker.checkUserPermissionsCompliance();
            const signatureTestResults = await this.checker.testElectronicSignatureCompliance();
            const auditLogResults = await this.checker.validateAuditLogIntegrity();

            // 合并检查结果
            const fullResults = {
                ...complianceResults,
                detailedChecks: {
                    systemConfiguration: checkerResults,
                    userPermissions: userPermissionResults,
                    electronicSignature: signatureTestResults,
                    auditLog: auditLogResults
                }
            };

            // 生成各类报告
            console.log('📊 生成合规性报告...');
            const reports = await this.generateAllReports(fullResults);

            // 保存检查结果
            await this.saveCheckResults(fullResults);

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`✅ 合规性检查完成，耗时 ${duration}ms`);
            console.log(`📄 报告已保存至: ${this.config.reportPath}`);

            return {
                success: true,
                results: fullResults,
                reports,
                summary: this.createExecutiveSummary(fullResults),
                duration
            };

        } catch (error) {
            console.error('❌ 合规性检查失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 生成合规性状态证书
     */
    generateComplianceCertificate(results) {
        console.log('🏆 生成合规性证书...');
        
        const certificate = this.reportGenerator.generateComplianceCertificate(results);
        
        // 保存证书
        const certificateFile = path.join(
            this.config.certificatePath,
            `certificate-${certificate.certificateNumber}.json`
        );
        
        fs.writeFileSync(certificateFile, JSON.stringify(certificate, null, 2));
        
        console.log(`📜 合规性证书已生成: ${certificateFile}`);
        
        return certificate;
    }

    /**
     * 获取合规性仪表板数据
     */
    getComplianceDashboard() {
        const dashboard = {
            timestamp: new Date().toISOString(),
            systemName: '放射化学纯度检测仪',
            overallStatus: 'UNKNOWN',
            lastCheck: null,
            complianceScore: 0,
            sections: {},
            issues: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0
            },
            trends: {
                weeklyScore: [],
                monthlyIssues: []
            }
        };

        // 从最近的检查结果加载数据
        try {
            const latestResults = this.loadLatestCheckResults();
            if (latestResults) {
                dashboard.overallStatus = latestResults.overall.complianceStatus;
                dashboard.complianceScore = latestResults.overall.overallScore;
                dashboard.lastCheck = latestResults.overall.timestamp;
                dashboard.sections = latestResults.overall.sections;
                dashboard.issues = {
                    critical: latestResults.overall.criticalIssues,
                    high: this.countHighPriorityIssues(latestResults),
                    medium: latestResults.overall.warnings,
                    low: this.countLowPriorityIssues(latestResults)
                };
            }
        } catch (error) {
            console.warn('无法加载最新检查结果:', error.message);
        }

        return dashboard;
    }

    /**
     * 持续合规性监控
     */
    startContinuousMonitoring(interval = 3600000) { // 默认每小时检查一次
        console.log(`🔄 启动持续合规性监控，检查间隔: ${interval / 1000}秒`);
        
        this.monitoringInterval = setInterval(async () => {
            try {
                console.log('🔍 执行定时合规性检查...');
                const results = await this.runFullComplianceCheck({ 
                    silent: true,
                    generateReports: false 
                });
                
                if (!results.success) {
                    console.warn('⚠️  定时检查发现问题:', results.error);
                }
                
                // 检查关键问题
                if (results.results && results.results.overall.criticalIssues > 0) {
                    console.error(`🚨 发现${results.results.overall.criticalIssues}个关键问题！`);
                    await this.alertOnCriticalIssues(results.results);
                }
                
            } catch (error) {
                console.error('❌ 定时检查失败:', error);
            }
        }, interval);
        
        return this.monitoringInterval;
    }

    /**
     * 停止持续监控
     */
    stopContinuousMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            console.log('⏹️  已停止持续合规性监控');
        }
    }

    /**
     * 导出合规性数据
     */
    exportComplianceData(format = 'json', dateRange = null) {
        console.log(`📤 导出合规性数据，格式: ${format}`);
        
        const data = {
            exportDate: new Date().toISOString(),
            format,
            dateRange,
            dashboardData: this.getComplianceDashboard(),
            checkHistory: this.loadCheckHistory()
        };

        let exportFile;
        let exportContent;

        switch (format.toLowerCase()) {
            case 'json':
                exportFile = `compliance-export-${Date.now()}.json`;
                exportContent = JSON.stringify(data, null, 2);
                break;
                
            case 'csv':
                exportFile = `compliance-export-${Date.now()}.csv`;
                exportContent = this.convertToCSV(data);
                break;
                
            case 'html':
                exportFile = `compliance-export-${Date.now()}.html`;
                exportContent = this.generateHTMLReport(data);
                break;
                
            default:
                throw new Error(`不支持的导出格式: ${format}`);
        }

        const exportPath = path.join(this.config.reportPath, exportFile);
        fs.writeFileSync(exportPath, exportContent);
        
        console.log(`📁 数据已导出: ${exportPath}`);
        
        return {
            file: exportPath,
            size: fs.statSync(exportPath).size,
            format
        };
    }

    // ===== 私有方法 =====

    async generateAllResults(results) {
        const reports = {};

        // 生成执行摘要
        reports.executiveSummary = this.reportGenerator.generateExecutiveSummary(results);

        // 生成详细技术报告
        reports.detailedReport = this.reportGenerator.generateDetailedReport(
            results, 
            results.detailedChecks
        );

        // 生成问题清单
        reports.issueList = this.reportGenerator.generateIssueList(
            results, 
            results.detailedChecks
        );

        // 生成修复建议报告
        reports.remediationReport = this.reportGenerator.generateRemediationReport(
            results, 
            results.detailedChecks
        );

        return reports;
    }

    async generateAllReports(results) {
        const reports = await this.generateAllResults(results);

        // 保存所有报告
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        for (const [type, report] of Object.entries(reports)) {
            const filename = `${type}-${timestamp}.json`;
            const filepath = path.join(this.config.reportPath, filename);
            
            fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
            console.log(`📄 ${type}报告已保存: ${filepath}`);
        }

        // 生成HTML报告
        const htmlReport = this.generateHTMLReports(results, reports);
        const htmlPath = path.join(this.config.reportPath, `compliance-report-${timestamp}.html`);
        fs.writeFileSync(htmlPath, htmlReport);
        console.log(`📊 HTML报告已保存: ${htmlPath}`);

        return reports;
    }

    ensureDirectories() {
        const directories = [
            this.config.reportPath,
            this.config.certificatePath,
            this.config.logPath
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 创建目录: ${dir}`);
            }
        });
    }

    setupEventListeners() {
        this.compliance.on('complianceCheckComplete', (results) => {
            console.log('📢 合规性检查完成事件触发');
            this.logComplianceEvent('check_completed', results);
        });
    }

    logComplianceEvent(eventType, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: eventType,
            data
        };

        const logFile = path.join(
            this.config.logPath, 
            `compliance-${new Date().toISOString().split('T')[0]}.log`
        );

        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }

    async saveCheckResults(results) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `check-results-${timestamp}.json`;
        const filepath = path.join(this.config.reportPath, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
        
        // 更新最新结果指针
        const latestFile = path.join(this.config.reportPath, 'latest-results.json');
        fs.writeFileSync(latestFile, JSON.stringify(results, null, 2));
    }

    loadLatestCheckResults() {
        try {
            const latestFile = path.join(this.config.reportPath, 'latest-results.json');
            if (fs.existsSync(latestFile)) {
                return JSON.parse(fs.readFileSync(latestFile, 'utf8'));
            }
        } catch (error) {
            console.warn('无法加载最新检查结果:', error.message);
        }
        return null;
    }

    loadCheckHistory() {
        try {
            const files = fs.readdirSync(this.config.reportPath)
                          .filter(f => f.startsWith('check-results-'))
                          .sort()
                          .reverse()
                          .slice(0, 10); // 最近10次检查

            return files.map(file => {
                const filepath = path.join(this.config.reportPath, file);
                const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                return {
                    timestamp: data.overall.timestamp,
                    score: data.overall.overallScore,
                    status: data.overall.complianceStatus,
                    issues: data.overall.totalIssues
                };
            });
        } catch (error) {
            return [];
        }
    }

    countHighPriorityIssues(results) {
        let count = 0;
        Object.values(results.overall.sections).forEach(section => {
            if (['11.30', '11.50'].includes(section.section)) {
                count += section.failed.length;
            }
        });
        return count;
    }

    countLowPriorityIssues(results) {
        let count = 0;
        Object.values(results.overall.sections).forEach(section => {
            if (['11.70'].includes(section.section)) {
                count += section.warnings.length;
            }
        });
        return count;
    }

    async alertOnCriticalIssues(results) {
        const alert = {
            timestamp: new Date().toISOString(),
            severity: 'CRITICAL',
            message: `发现${results.overall.criticalIssues}个关键合规性问题`,
            details: results.overall.sections
        };

        console.error('🚨 合规性警报:', alert.message);
        
        // 这里可以集成邮件、短信等告警机制
        this.logComplianceEvent('critical_alert', alert);
    }

    convertToCSV(data) {
        // 简单的CSV转换逻辑
        const headers = ['时间', '合规性分数', '合规状态', '问题数量'];
        const rows = data.checkHistory.map(check => [
            check.timestamp,
            check.score,
            check.status,
            check.issues
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    generateHTMLReport(data) {
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CFR21 Part 11 合规性报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .status-compliant { color: green; font-weight: bold; }
        .status-partial { color: orange; font-weight: bold; }
        .status-non-compliant { color: red; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CFR21 Part 11 合规性报告</h1>
        <p>系统: ${data.dashboardData.systemName}</p>
        <p>生成时间: ${data.exportDate}</p>
        <p>总体状态: <span class="status-${data.dashboardData.overallStatus.toLowerCase()}">${data.dashboardData.overallStatus}</span></p>
        <p>合规性分数: ${data.dashboardData.complianceScore}%</p>
    </div>
    
    <div class="section">
        <h2>合规性历史趋势</h2>
        <table>
            <tr><th>时间</th><th>分数</th><th>状态</th><th>问题数</th></tr>
            ${data.checkHistory.map(check => `
                <tr>
                    <td>${check.timestamp}</td>
                    <td>${check.score}</td>
                    <td>${check.status}</td>
                    <td>${check.issues}</td>
                </tr>
            `).join('')}
        </table>
    </div>
</body>
</html>`;
    }

    generateHTMLReports(results, reports) {
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CFR21 Part 11 完整合规性报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .score { font-size: 2em; font-weight: bold; color: #333; }
        .status-compliant { color: #28a745; }
        .status-mostly-compliant { color: #17a2b8; }
        .status-partially-compliant { color: #ffc107; }
        .status-non-compliant { color: #dc3545; }
        .issue-list { background: #f8f9fa; padding: 15px; border-radius: 5px; }
        .issue-critical { color: #dc3545; font-weight: bold; }
        .issue-high { color: #fd7e14; font-weight: bold; }
        .issue-medium { color: #ffc107; }
        .issue-low { color: #28a745; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #dee2e6; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .recommendation { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CFR21 Part 11 合规性完整报告</h1>
        <p>放射化学纯度检测仪</p>
        <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        <div class="score">总体分数: ${results.overall.overallScore}%</div>
        <div class="status-${results.overall.complianceStatus.toLowerCase()}">
            合规状态: ${results.overall.complianceStatus}
        </div>
    </div>

    <div class="section">
        <h2>各部分合规性检查结果</h2>
        <table>
            <tr><th>部分</th><th>分数</th><th>状态</th><th>通过项</th><th>失败项</th><th>警告</th></tr>
            ${Object.entries(results.overall.sections).map(([section, data]) => `
                <tr>
                    <td>${section} - ${this.getSectionTitle(section)}</td>
                    <td>${data.score}%</td>
                    <td>${this.getSectionStatus(data)}</td>
                    <td>${data.passed.length}</td>
                    <td class="issue-critical">${data.failed.length}</td>
                    <td class="issue-medium">${data.warnings.length}</td>
                </tr>
            `).join('')}
        </table>
    </div>

    <div class="section">
        <h2>关键问题清单</h2>
        <div class="issue-list">
            ${Object.entries(results.overall.sections).map(([section, data]) => 
                data.failed.length > 0 ? `
                    <h3>${section} - ${this.getSectionTitle(section)}</h3>
                    <ul>
                        ${data.failed.map(issue => `<li class="issue-critical">${issue}</li>`).join('')}
                    </ul>
                ` : ''
            ).join('')}
        </div>
    </div>

    <div class="section">
        <h2>修复建议</h2>
        ${this.generateRemediationHTML(results)}
    </div>

    <div class="section">
        <h2>合规性证书</h2>
        <p>证书编号: CFR21-CERT-${Date.now()}</p>
        <p>签发日期: ${new Date().toLocaleDateString('zh-CN')}</p>
        <p>有效期: 12个月</p>
        <p>合规性状态: <span class="status-${results.overall.complianceStatus.toLowerCase()}">${results.overall.complianceStatus}</span></p>
    </div>
</body>
</html>`;
    }

    getSectionTitle(sectionId) {
        const titles = {
            '11.10': '系统验证和确认',
            '11.30': '系统访问控制',
            '11.50': '审计追踪',
            '11.70': '替代程序',
            '11.100': '电子签名控制',
            '11.200': '电子签名组件和控制'
        };
        return titles[sectionId] || sectionId;
    }

    getSectionStatus(data) {
        if (data.failed.length === 0 && data.warnings.length === 0) {
            return '完全合规';
        } else if (data.failed.length === 0) {
            return '基本合规';
        } else if (data.failed.length <= 2) {
            return '部分合规';
        } else {
            return '不合规';
        }
    }

    generateRemediationHTML(results) {
        let html = '';
        
        if (results.overall.criticalIssues > 0) {
            html += '<div class="recommendation">';
            html += '<h3>紧急修复建议</h3>';
            html += '<p>发现严重合规性问题，需要立即处理：</p>';
            html += '<ul>';
            html += '<li class="issue-critical">优先解决审计追踪和访问控制问题</li>';
            html += '<li class="issue-high">完善电子签名系统</li>';
            html += '<li class="issue-high">确保系统验证文档完整</li>';
            html += '</ul>';
            html += '</div>';
        }

        html += '<div class="recommendation">';
        html += '<h3>持续改进建议</h3>';
        html += '<p>为保持长期合规性，建议：</p>';
        html += '<ul>';
        html += '<li class="issue-medium">建立定期合规性检查机制</li>';
        html += '<li class="issue-medium">加强用户培训和意识提升</li>';
        html += '<li class="issue-low">完善文档管理和版本控制</li>';
        html += '</ul>';
        html += '</div>';

        return html;
    }

    createExecutiveSummary(results) {
        return {
            overallCompliance: results.overall.complianceStatus,
            overallScore: results.overall.overallScore,
            totalIssues: results.overall.totalIssues,
            criticalIssues: results.overall.criticalIssues,
            recommendations: this.getTopRecommendations(results),
            nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        };
    }

    getTopRecommendations(results) {
        const recommendations = [];
        
        if (results.overall.criticalIssues > 0) {
            recommendations.push('立即解决所有关键合规性问题');
        }
        
        if (results.overall.overallScore < 90) {
            recommendations.push('制定全面的合规性改进计划');
        }
        
        recommendations.push('建立持续监控和定期复审机制');
        
        return recommendations.slice(0, 3);
    }
}

module.exports = CFR21ComplianceSystem;