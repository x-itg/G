/**
 * CFR21 Part 11 合规性报告生成器
 * 生成详细的合规性报告、问题清单和修复建议
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ComplianceReportGenerator {
    constructor() {
        this.reportTemplates = {
            executive: this.getExecutiveSummaryTemplate(),
            detailed: this.getDetailedReportTemplate(),
            technical: this.getTechnicalReportTemplate(),
            certificate: this.getCertificateTemplate()
        };
    }

    /**
     * 生成执行摘要报告
     */
    generateExecutiveSummary(complianceResults) {
        const summary = {
            reportType: '执行摘要',
            generationTime: new Date().toISOString(),
            systemName: '放射化学纯度检测仪',
            overallStatus: complianceResults.overall.complianceStatus,
            overallScore: complianceResults.overall.overallScore,
            executiveSummary: this.createExecutiveSummary(complianceResults),
            keyFindings: this.extractKeyFindings(complianceResults),
            recommendations: this.createExecutiveRecommendations(complianceResults),
            nextSteps: this.createNextSteps(complianceResults)
        };

        return summary;
    }

    /**
     * 生成详细技术报告
     */
    generateDetailedReport(complianceResults, checkerResults) {
        const report = {
            reportType: '详细技术报告',
            generationTime: new Date().toISOString(),
            systemName: '放射化学纯度检测仪',
            reportId: `RPT-${Date.now()}`,
            sections: this.generateDetailedSections(complianceResults, checkerResults),
            issues: this.categorizeIssues(complianceResults),
            technicalDetails: this.extractTechnicalDetails(complianceResults, checkerResults),
            riskAssessment: this.assessComplianceRisks(complianceResults),
            remediationPlan: this.createRemediationPlan(complianceResults)
        };

        return report;
    }

    /**
     * 生成合规性证书
     */
    generateComplianceCertificate(complianceResults) {
        const certificate = {
            title: 'CFR21 Part 11 合规性证书',
            certificateNumber: `CFR21-CERT-${Date.now()}`,
            systemName: '放射化学纯度检测仪',
            issueDate: new Date().toISOString(),
            validityPeriod: '12个月',
            certificateType: '法规合规性认证',
            complianceStatus: complianceResults.overall.complianceStatus,
            complianceScore: complianceResults.overall.overallScore,
            complianceScope: this.getComplianceScope(complianceResults),
            conditions: this.getComplianceConditions(complianceResults),
            authorizedBy: {
                name: '系统管理员',
                title: '合规性负责人',
                signature: this.generateCertificateSignature(complianceResults),
                date: new Date().toISOString()
            },
            verificationCode: this.generateVerificationCode(complianceResults)
        };

        return certificate;
    }

    /**
     * 生成问题清单
     */
    generateIssueList(complianceResults, checkerResults) {
        const issues = {
            reportType: '合规性问题清单',
            generationTime: new Date().toISOString(),
            totalIssues: complianceResults.overall.totalIssues,
            criticalIssues: complianceResults.overall.criticalIssues,
            warningIssues: complianceResults.overall.warnings,
            issueCategories: this.categorizeIssues(complianceResults),
            prioritizedIssues: this.prioritizeIssues(complianceResults),
            affectedSystems: this.identifyAffectedSystems(complianceResults),
            businessImpact: this.assessBusinessImpact(complianceResults)
        };

        return issues;
    }

    /**
     * 生成修复建议报告
     */
    generateRemediationReport(complianceResults, checkerResults) {
        const remediation = {
            reportType: '修复建议报告',
            generationTime: new Date().toISOString(),
            executiveSummary: this.createRemediationExecutiveSummary(complianceResults),
            immediateActions: this.getImmediateActions(complianceResults),
            shortTermActions: this.getShortTermActions(complianceResults),
            longTermActions: this.getLongTermActions(complianceResults),
            implementationPlan: this.createImplementationPlan(complianceResults),
            resourceRequirements: this.assessResourceRequirements(complianceResults),
            riskMitigation: this.createRiskMitigationPlan(complianceResults)
        };

        return remediation;
    }

    // ===== 报告生成方法 =====

    createExecutiveSummary(results) {
        const statusText = {
            'FULLY_COMPLIANT': '系统完全符合CFR21 Part 11要求',
            'MOSTLY_COMPLIANT': '系统基本符合CFR21 Part 11要求，存在少量需要改进的地方',
            'PARTIALLY_COMPLIANT': '系统部分符合CFR21 Part 11要求，需要进行重要改进',
            'NON_COMPLIANT': '系统不符合CFR21 Part 11要求，需要紧急整改'
        };

        return {
            complianceLevel: statusText[results.overall.complianceStatus] || '状态未知',
            overallScore: `${results.overall.overallScore}%`,
            complianceAreas: Object.keys(results.overall.sections).length,
            criticalFindings: this.countCriticalFindings(results),
            recommendation: this.getOverallRecommendation(results)
        };
    }

    extractKeyFindings(results) {
        const findings = [];
        
        Object.entries(results.overall.sections).forEach(([section, data]) => {
            if (data.failed.length > 0) {
                findings.push({
                    section,
                    severity: 'HIGH',
                    finding: `${data.failed.length}项关键要求未满足`,
                    impact: this.getSectionImpact(section)
                });
            }
            
            if (data.warnings.length > 0) {
                findings.push({
                    section,
                    severity: 'MEDIUM',
                    finding: `${data.warnings.length}项建议需要关注`,
                    impact: this.getSectionImpact(section)
                });
            }
        });

        return findings;
    }

    createExecutiveRecommendations(results) {
        const recommendations = [];
        
        if (results.overall.overallScore < 90) {
            recommendations.push({
                priority: 'HIGH',
                recommendation: '立即实施全面的合规性改进计划',
                timeline: '30天内完成'
            });
        }

        if (results.overall.criticalIssues > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                recommendation: '优先解决所有严重合规性问题',
                timeline: '7天内开始'
            });
        }

        recommendations.push({
            priority: 'MEDIUM',
            recommendation: '建立持续合规性监控机制',
            timeline: '90天内建立'
        });

        return recommendations;
    }

    createNextSteps(results) {
        return [
            {
                step: 1,
                action: '审查详细技术报告',
                timeline: '1-2天',
                responsible: '技术团队'
            },
            {
                step: 2,
                action: '制定修复计划',
                timeline: '3-5天',
                responsible: '合规性团队'
            },
            {
                step: 3,
                action: '实施修复措施',
                timeline: '7-30天',
                responsible: '开发团队'
            },
            {
                step: 4,
                action: '验证修复效果',
                timeline: '31-45天',
                responsible: '质量保证团队'
            }
        ];
    }

    generateDetailedSections(results, checkerResults) {
        const sections = {};
        
        Object.entries(results.overall.sections).forEach(([sectionId, data]) => {
            sections[sectionId] = {
                title: this.getSectionTitle(sectionId),
                score: data.score,
                status: this.getSectionStatus(data),
                requirements: this.getSectionRequirements(sectionId),
                findings: {
                    passed: data.passed,
                    failed: data.failed,
                    warnings: data.warnings
                },
                technicalDetails: this.getTechnicalSectionDetails(sectionId, checkerResults)
            };
        });

        return sections;
    }

    categorizeIssues(results) {
        const categories = {
            critical: [],
            high: [],
            medium: [],
            low: [],
            informational: []
        };

        Object.entries(results.overall.sections).forEach(([section, data]) => {
            data.failed.forEach(issue => {
                categories.critical.push({
                    section,
                    issue,
                    impact: '严重影响合规性'
                });
            });

            data.warnings.forEach(issue => {
                categories.medium.push({
                    section,
                    issue,
                    impact: '需要关注但不紧急'
                });
            });
        });

        return categories;
    }

    prioritizeIssues(results) {
        const priorities = {
            P1_Critical: [],
            P2_High: [],
            P3_Medium: [],
            P4_Low: []
        };

        // 根据CFR21 Part 11的关键性对问题进行优先级排序
        Object.entries(results.overall.sections).forEach(([section, data]) => {
            if (['11.50', '11.30'].includes(section)) {
                // 审计追踪和访问控制是关键
                data.failed.forEach(issue => {
                    priorities.P1_Critical.push({ section, issue });
                });
            } else if (['11.100', '11.200'].includes(section)) {
                // 电子签名相关
                data.failed.forEach(issue => {
                    priorities.P2_High.push({ section, issue });
                });
            } else {
                data.failed.forEach(issue => {
                    priorities.P3_Medium.push({ section, issue });
                });
            }
        });

        return priorities;
    }

    assessComplianceRisks(results) {
        return {
            regulatoryRisk: this.assessRegulatoryRisk(results),
            operationalRisk: this.assessOperationalRisk(results),
            securityRisk: this.assessSecurityRisk(results),
            dataIntegrityRisk: this.assessDataIntegrityRisk(results)
        };
    }

    createRemediationPlan(results) {
        return {
            immediate: this.getImmediateRemediation(results),
            shortTerm: this.getShortTermRemediation(results),
            longTerm: this.getLongTermRemediation(results),
            milestones: this.createRemediationMilestones(results)
        };
    }

    getComplianceScope(results) {
        return {
            sections: Object.keys(results.overall.sections),
            areas: [
                '系统验证和确认',
                '访问控制',
                '审计追踪',
                '替代程序',
                '电子签名控制',
                '电子签名组件'
            ]
        };
    }

    getComplianceConditions(results) {
        const conditions = [];
        
        if (results.overall.overallScore < 90) {
            conditions.push('需要定期复审合规性状态');
        }
        
        if (results.overall.criticalIssues > 0) {
            conditions.push('必须在规定时间内解决所有关键问题');
        }

        conditions.push('证书有效期为12个月，需要定期更新');

        return conditions;
    }

    generateCertificateSignature(results) {
        const certificateData = JSON.stringify({
            status: results.overall.complianceStatus,
            score: results.overall.overallScore,
            timestamp: new Date().toISOString()
        });
        
        const hash = crypto.createHash('sha256');
        hash.update(certificateData);
        return hash.digest('hex').substring(0, 16);
    }

    generateVerificationCode(results) {
        const verificationData = {
            system: '放射化学纯度检测仪',
            compliance: results.overall.complianceStatus,
            score: results.overall.overallScore,
            timestamp: new Date().toISOString()
        };
        
        return crypto.createHash('sha256')
                    .update(JSON.stringify(verificationData))
                    .digest('hex')
                    .substring(0, 12)
                    .toUpperCase();
    }

    // ===== 辅助方法 =====

    getSectionTitle(sectionId) {
        const titles = {
            '11.10': '系统验证和确认',
            '11.30': '系统访问控制',
            '11.50': '审计追踪',
            '11.70': '替代程序',
            '11.100': '电子签名控制',
            '11.200': '电子签名组件和控制'
        };
        return titles[sectionId] || `第${sectionId}部分`;
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

    getSectionRequirements(sectionId) {
        const requirements = {
            '11.10': [
                '验证文档完整性',
                '测试结果记录',
                '用户验收确认'
            ],
            '11.30': [
                '用户身份验证',
                '访问权限控制',
                '会话管理',
                '密码策略'
            ],
            '11.50': [
                '用户操作追踪',
                '数据变更记录',
                '系统事件记录',
                '时间戳要求'
            ],
            '11.70': [
                '书面批准程序',
                '文档化要求',
                '时间限制'
            ],
            '11.100': [
                '唯一用户标识',
                '密码确认',
                '两因子认证(可选)',
                '生物识别(可选)'
            ],
            '11.200': [
                '签名含义定义',
                '打印姓名要求',
                '日期时间记录',
                '含义声明'
            ]
        };
        return requirements[sectionId] || [];
    }

    getTechnicalSectionDetails(sectionId, checkerResults) {
        return {
            implementationStatus: '已检查',
            lastValidation: new Date().toISOString(),
            recommendations: this.getSectionRecommendations(sectionId)
        };
    }

    extractTechnicalDetails(results, checkerResults) {
        return {
            systemConfiguration: checkerResults?.systemConfiguration || {},
            userPermissions: checkerResults?.userPermissions || {},
            electronicSignature: checkerResults?.electronicSignature || {},
            auditLog: checkerResults?.auditLog || {},
            timestamp: new Date().toISOString()
        };
    }

    assessComplianceRisks(results) {
        return {
            regulatoryRisk: this.assessRegulatoryRisk(results),
            operationalRisk: this.assessOperationalRisk(results),
            securityRisk: this.assessSecurityRisk(results),
            dataIntegrityRisk: this.assessDataIntegrityRisk(results)
        };
    }

    assessRegulatoryRisk(results) {
        const score = 100 - results.overall.overallScore;
        return {
            level: score > 30 ? 'HIGH' : score > 15 ? 'MEDIUM' : 'LOW',
            description: score > 30 ? '高监管风险，需要立即整改' : 
                        score > 15 ? '中等监管风险，需要关注' : '低监管风险',
            score
        };
    }

    assessOperationalRisk(results) {
        const criticalIssues = results.overall.criticalIssues;
        return {
            level: criticalIssues > 5 ? 'HIGH' : criticalIssues > 2 ? 'MEDIUM' : 'LOW',
            description: criticalIssues > 5 ? '高运营风险，影响系统稳定性' : 
                        criticalIssues > 2 ? '中等运营风险，需要处理' : '低运营风险',
            criticalIssues
        };
    }

    assessSecurityRisk(results) {
        const accessControlScore = results.overall.sections['11.30']?.score || 0;
        return {
            level: accessControlScore < 60 ? 'HIGH' : accessControlScore < 80 ? 'MEDIUM' : 'LOW',
            description: accessControlScore < 60 ? '高安全风险，访问控制不足' : 
                        accessControlScore < 80 ? '中等安全风险，需要加强' : '低安全风险',
            accessControlScore
        };
    }

    assessDataIntegrityRisk(results) {
        const auditTrailScore = results.overall.sections['11.50']?.score || 0;
        return {
            level: auditTrailScore < 60 ? 'HIGH' : auditTrailScore < 80 ? 'MEDIUM' : 'LOW',
            description: auditTrailScore < 60 ? '高数据完整性风险，审计追踪不足' : 
                        auditTrailScore < 80 ? '中等数据完整性风险，需要改进' : '低数据完整性风险',
            auditTrailScore
        };
    }

    createRemediationPlan(results) {
        return {
            immediate: this.getImmediateRemediation(results),
            shortTerm: this.getShortTermRemediation(results),
            longTerm: this.getLongTermRemediation(results),
            milestones: this.createRemediationMilestones(results)
        };
    }

    getImmediateRemediation(results) {
        const immediate = [];
        if (results.overall.criticalIssues > 0) {
            immediate.push('立即修复所有关键合规性问题');
            immediate.push('实施紧急安全措施');
        }
        return immediate.length > 0 ? immediate : ['当前无紧急修复项目'];
    }

    getShortTermRemediation(results) {
        return [
            '完善系统验证文档',
            '加强访问控制机制',
            '建立完整的审计追踪系统',
            '实施电子签名验证'
        ];
    }

    getLongTermRemediation(results) {
        return [
            '建立持续合规性监控机制',
            '定期进行合规性培训',
            '完善文档管理和版本控制',
            '建立风险评估和管控体系'
        ];
    }

    createRemediationMilestones(results) {
        return [
            {
                milestone: '第1周',
                goal: '修复关键问题',
                status: 'pending'
            },
            {
                milestone: '第1个月',
                goal: '完善核心功能',
                status: 'pending'
            },
            {
                milestone: '第3个月',
                goal: '全面合规达标',
                status: 'pending'
            }
        ];
    }

    getSectionRecommendations(sectionId) {
        const recommendations = {
            '11.10': [
                '确保验证文档完整性和时效性',
                '建立定期验证计划'
            ],
            '11.30': [
                '加强密码策略',
                '定期审查用户权限'
            ],
            '11.50': [
                '完善审计日志配置',
                '确保日志不可修改性'
            ],
            '11.70': [
                '建立替代程序审批流程',
                '文档化所有例外情况'
            ],
            '11.100': [
                '实施电子签名验证机制',
                '确保签名唯一性'
            ],
            '11.200': [
                '完善签名含义定义',
                '确保签名完整性'
            ]
        };
        return recommendations[sectionId] || [];
    }

    countCriticalFindings(results) {
        return Object.values(results.overall.sections)
                     .reduce((total, section) => total + section.failed.length, 0);
    }

    getOverallRecommendation(results) {
        if (results.overall.overallScore >= 90) {
            return '系统已符合CFR21 Part 11要求，建议保持当前配置并定期检查';
        } else if (results.overall.overallScore >= 75) {
            return '系统基本合规，需要针对发现的问题进行改进';
        } else {
            return '系统需要重要改进，建议制定全面的合规性提升计划';
        }
    }

    getSectionImpact(section) {
        const impacts = {
            '11.10': '影响系统验证和合规性基础',
            '11.30': '影响系统安全性和数据保护',
            '11.50': '影响监管合规性和审计能力',
            '11.70': '影响操作程序的规范性',
            '11.100': '影响电子签名的法律效力',
            '11.200': '影响电子签名的完整性'
        };
        return impacts[section] || '影响系统合规性';
    }

    // 获取模板
    getExecutiveSummaryTemplate() {
        return {
            title: 'CFR21 Part 11 合规性执行摘要',
            sections: ['summary', 'findings', 'recommendations', 'nextSteps']
        };
    }

    getDetailedReportTemplate() {
        return {
            title: 'CFR21 Part 11 合规性详细报告',
            sections: ['technical', 'issues', 'remediation']
        };
    }

    getTechnicalReportTemplate() {
        return {
            title: 'CFR21 Part 11 技术合规性报告',
            sections: ['technical', 'implementation', 'testing']
        };
    }

    getCertificateTemplate() {
        return {
            title: 'CFR21 Part 11 合规性证书',
            sections: ['status', 'scope', 'conditions']
        };
    }
}

module.exports = ComplianceReportGenerator;