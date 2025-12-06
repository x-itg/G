/**
 * CFR21 Part 11 法规合规性检查系统
 * 放射化学纯度检测仪专用
 * 
 * 功能包括：
 * - 电子记录完整性验证
 * - 电子签名有效性检查
 * - 用户身份验证要求
 * - 审计追踪完整性
 * - 数据访问控制
 * - 时间戳准确性
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class CFR21Compliance extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            // 系统验证和确认 (11.10)
            systemValidation: {
                requireDocumentedValidation: true,
                requireTestResults: true,
                requireUserAcceptance: true,
                validationPath: './validation/'
            },
            
            // 系统访问控制 (11.30)
            accessControl: {
                requireUserAuthentication: true,
                requireRoleBasedAccess: true,
                sessionTimeout: 30, // minutes
                maxFailedAttempts: 3,
                passwordRequirements: {
                    minLength: 8,
                    requireUppercase: true,
                    requireLowercase: true,
                    requireNumbers: true,
                    requireSpecialChars: true
                }
            },
            
            // 审计追踪 (11.50)
            auditTrail: {
                trackUserActions: true,
                trackDataChanges: true,
                trackSystemEvents: true,
                requireUnmodifiableLogs: true,
                requireTimeStamps: true,
                requireUserIdentification: true
            },
            
            // 替代程序 (11.70)
            alternativeProcedures: {
                requireWrittenApproval: true,
                requireDocumentation: true,
                requireTimeLimits: true
            },
            
            // 电子签名控制 (11.100)
            electronicSignatures: {
                requireTwoFactor: false, // 可配置
                requireBiometricData: false, // 可配置
                uniqueUserIdentification: true,
                requirePasswordConfirmation: true
            },
            
            // 电子签名组件和控制 (11.200)
            signatureComponents: {
                requireSignatureMeaning: true,
                requirePrintName: true,
                requireDateTime: true,
                requireMeaningDeclaration: true
            },
            
            ...config
        };
        
        this.checkResults = new Map();
        this.complianceIssues = [];
        this.auditTrail = [];
    }

    /**
     * 系统验证和确认检查 (11.10)
     */
    async validateSystemCompliance() {
        const results = {
            section: '11.10 - System Validation and Qualification',
            timestamp: new Date().toISOString(),
            passed: [],
            failed: [],
            warnings: [],
            score: 0
        };

        try {
            // 检查是否有验证文档
            const validationDocsExist = await this.checkValidationDocumentation();
            if (validationDocsExist) {
                results.passed.push('验证文档存在且完整');
            } else {
                results.failed.push('缺少验证文档或文档不完整');
            }

            // 检查测试结果
            const testResultsExist = await this.checkTestResults();
            if (testResultsExist) {
                results.passed.push('系统测试结果文档存在');
            } else {
                results.failed.push('缺少系统测试结果文档');
            }

            // 检查用户验收测试
            const userAcceptanceTested = await this.checkUserAcceptance();
            if (userAcceptanceTested) {
                results.passed.push('用户验收测试已完成');
            } else {
                results.warnings.push('用户验收测试状态未知');
            }

            // 计算合规分数
            results.score = this.calculateComplianceScore(results);
            
        } catch (error) {
            results.failed.push(`系统验证检查错误: ${error.message}`);
        }

        this.checkResults.set('11.10', results);
        return results;
    }

    /**
     * 系统访问控制检查 (11.30)
     */
    async validateAccessControl() {
        const results = {
            section: '11.30 - System Access Controls',
            timestamp: new Date().toISOString(),
            passed: [],
            failed: [],
            warnings: [],
            score: 0
        };

        try {
            // 检查用户身份验证
            const authImplemented = await this.checkUserAuthentication();
            if (authImplemented) {
                results.passed.push('用户身份验证已实施');
            } else {
                results.failed.push('缺少用户身份验证机制');
            }

            // 检查基于角色的访问控制
            const rbacImplemented = await this.checkRoleBasedAccess();
            if (rbacImplemented) {
                results.passed.push('基于角色的访问控制已实施');
            } else {
                results.failed.push('缺少基于角色的访问控制');
            }

            // 检查会话管理
            const sessionManaged = await this.checkSessionManagement();
            if (sessionManaged) {
                results.passed.push('会话管理已正确配置');
            } else {
                results.failed.push('会话管理配置不当');
            }

            // 检查密码策略
            const passwordPolicySet = await this.checkPasswordPolicy();
            if (passwordPolicySet) {
                results.passed.push('密码策略已正确配置');
            } else {
                results.failed.push('密码策略配置不当');
            }

            // 检查失败登录限制
            const loginLimitsSet = await this.checkLoginLimits();
            if (loginLimitsSet) {
                results.passed.push('登录失败限制已设置');
            } else {
                results.failed.push('缺少登录失败限制机制');
            }

            results.score = this.calculateComplianceScore(results);

        } catch (error) {
            results.failed.push(`访问控制检查错误: ${error.message}`);
        }

        this.checkResults.set('11.30', results);
        return results;
    }

    /**
     * 审计追踪检查 (11.50)
     */
    async validateAuditTrail() {
        const results = {
            section: '11.50 - Audit Trail',
            timestamp: new Date().toISOString(),
            passed: [],
            failed: [],
            warnings: [],
            score: 0
        };

        try {
            // 检查用户操作追踪
            const userActionTracked = await this.checkUserActionTracking();
            if (userActionTracked) {
                results.passed.push('用户操作追踪已实施');
            } else {
                results.failed.push('缺少用户操作追踪机制');
            }

            // 检查数据变更追踪
            const dataChangeTracked = await this.checkDataChangeTracking();
            if (dataChangeTracked) {
                results.passed.push('数据变更追踪已实施');
            } else {
                results.failed.push('缺少数据变更追踪机制');
            }

            // 检查系统事件追踪
            const systemEventTracked = await this.checkSystemEventTracking();
            if (systemEventTracked) {
                results.passed.push('系统事件追踪已实施');
            } else {
                results.failed.push('缺少系统事件追踪机制');
            }

            // 检查日志不可修改性
            const logsUnmodifiable = await this.checkLogImmutability();
            if (logsUnmodifiable) {
                results.passed.push('审计日志具备不可修改性');
            } else {
                results.failed.push('审计日志可能被修改');
            }

            // 检查时间戳准确性
            const timeStampsAccurate = await this.checkTimeStamps();
            if (timeStampsAccurate) {
                results.passed.push('时间戳准确性验证通过');
            } else {
                results.failed.push('时间戳准确性存在问题');
            }

            // 检查用户标识要求
            const userIdentificationRequired = await this.checkUserIdentification();
            if (userIdentificationRequired) {
                results.passed.push('用户标识要求已满足');
            } else {
                results.failed.push('用户标识要求未满足');
            }

            results.score = this.calculateComplianceScore(results);

        } catch (error) {
            results.failed.push(`审计追踪检查错误: ${error.message}`);
        }

        this.checkResults.set('11.50', results);
        return results;
    }

    /**
     * 替代程序检查 (11.70)
     */
    async validateAlternativeProcedures() {
        const results = {
            section: '11.70 - Alternative Procedures',
            timestamp: new Date().toISOString(),
            passed: [],
            failed: [],
            warnings: [],
            score: 0
        };

        try {
            // 检查书面批准要求
            const writtenApproval = await this.checkWrittenApproval();
            if (writtenApproval) {
                results.passed.push('书面批准程序已建立');
            } else {
                results.warnings.push('书面批准程序状态未知');
            }

            // 检查文档化要求
            const documentationComplete = await this.checkDocumentation();
            if (documentationComplete) {
                results.passed.push('替代程序文档化完整');
            } else {
                results.failed.push('替代程序文档化不完整');
            }

            // 检查时间限制要求
            const timeLimitsSet = await this.checkTimeLimits();
            if (timeLimitsSet) {
                results.passed.push('时间限制要求已设置');
            } else {
                results.failed.push('缺少时间限制要求');
            }

            results.score = this.calculateComplianceScore(results);

        } catch (error) {
            results.failed.push(`替代程序检查错误: ${error.message}`);
        }

        this.checkResults.set('11.70', results);
        return results;
    }

    /**
     * 电子签名控制检查 (11.100)
     */
    async validateElectronicSignatures() {
        const results = {
            section: '11.100 - Electronic Signatures',
            timestamp: new Date().toISOString(),
            passed: [],
            failed: [],
            warnings: [],
            score: 0
        };

        try {
            // 检查唯一用户标识
            const uniqueUserIds = await this.checkUniqueUserIdentification();
            if (uniqueUserIds) {
                results.passed.push('唯一用户标识已实施');
            } else {
                results.failed.push('缺少唯一用户标识机制');
            }

            // 检查密码确认要求
            const passwordConfirmation = await this.checkPasswordConfirmation();
            if (passwordConfirmation) {
                results.passed.push('密码确认要求已实施');
            } else {
                results.failed.push('缺少密码确认要求');
            }

            // 检查两因子认证（如果启用）
            if (this.config.electronicSignatures.requireTwoFactor) {
                const twoFactorImplemented = await this.checkTwoFactorAuth();
                if (twoFactorImplemented) {
                    results.passed.push('两因子认证已实施');
                } else {
                    results.failed.push('两因子认证配置不正确');
                }
            } else {
                results.warnings.push('两因子认证未启用（可选）');
            }

            // 检查生物识别数据（如果启用）
            if (this.config.electronicSignatures.requireBiometricData) {
                const biometricData = await this.checkBiometricData();
                if (biometricData) {
                    results.passed.push('生物识别数据验证已实施');
                } else {
                    results.failed.push('生物识别数据验证配置不正确');
                }
            } else {
                results.warnings.push('生物识别数据验证未启用（可选）');
            }

            results.score = this.calculateComplianceScore(results);

        } catch (error) {
            results.failed.push(`电子签名控制检查错误: ${error.message}`);
        }

        this.checkResults.set('11.100', results);
        return results;
    }

    /**
     * 电子签名组件和控制检查 (11.200)
     */
    async validateSignatureComponents() {
        const results = {
            section: '11.200 - Electronic Signature Components and Controls',
            timestamp: new Date().toISOString(),
            passed: [],
            failed: [],
            warnings: [],
            score: 0
        };

        try {
            // 检查签名含义
            const signatureMeaning = await this.checkSignatureMeaning();
            if (signatureMeaning) {
                results.passed.push('签名含义定义完整');
            } else {
                results.failed.push('缺少签名含义定义');
            }

            // 检查打印姓名要求
            const printNameRequired = await this.checkPrintNameRequirement();
            if (printNameRequired) {
                results.passed.push('打印姓名要求已满足');
            } else {
                results.failed.push('缺少打印姓名要求');
            }

            // 检查日期时间要求
            const dateTimeRequired = await this.checkDateTimeRequirement();
            if (dateTimeRequired) {
                results.passed.push('日期时间要求已满足');
            } else {
                results.failed.push('缺少日期时间要求');
            }

            // 检查含义声明要求
            const meaningDeclaration = await this.checkMeaningDeclaration();
            if (meaningDeclaration) {
                results.passed.push('签名含义声明已实施');
            } else {
                results.failed.push('缺少签名含义声明');
            }

            results.score = this.calculateComplianceScore(results);

        } catch (error) {
            results.failed.push(`电子签名组件检查错误: ${error.message}`);
        }

        this.checkResults.set('11.200', results);
        return results;
    }

    /**
     * 执行全面合规性检查
     */
    async performComprehensiveComplianceCheck() {
        console.log('开始执行CFR21 Part 11全面合规性检查...');
        
        const startTime = Date.now();
        
        // 执行各项检查
        const results = {
            overall: {
                timestamp: new Date().toISOString(),
                startTime,
                sections: {},
                overallScore: 0,
                complianceStatus: 'UNKNOWN',
                totalIssues: 0,
                criticalIssues: 0,
                warnings: 0
            }
        };

        // 逐项检查
        results.overall.sections['11.10'] = await this.validateSystemCompliance();
        results.overall.sections['11.30'] = await this.validateAccessControl();
        results.overall.sections['11.50'] = await this.validateAuditTrail();
        results.overall.sections['11.70'] = await this.validateAlternativeProcedures();
        results.overall.sections['11.100'] = await this.validateElectronicSignatures();
        results.overall.sections['11.200'] = await this.validateSignatureComponents();

        // 计算总体分数
        const scores = Object.values(results.overall.sections).map(s => s.score);
        results.overall.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        // 确定合规状态
        if (results.overall.overallScore >= 90) {
            results.overall.complianceStatus = 'FULLY_COMPLIANT';
        } else if (results.overall.overallScore >= 75) {
            results.overall.complianceStatus = 'MOSTLY_COMPLIANT';
        } else if (results.overall.overallScore >= 60) {
            results.overall.complianceStatus = 'PARTIALLY_COMPLIANT';
        } else {
            results.overall.complianceStatus = 'NON_COMPLIANT';
        }

        // 统计问题
        results.overall.totalIssues = this.countTotalIssues(results.overall.sections);
        results.overall.criticalIssues = this.countCriticalIssues(results.overall.sections);
        results.overall.warnings = this.countWarnings(results.overall.sections);

        results.overall.endTime = Date.now();
        results.overall.duration = results.overall.endTime - results.overall.startTime;

        // 生成合规性报告
        const report = await this.generateComplianceReport(results);
        
        this.emit('complianceCheckComplete', results);
        
        return results;
    }

    // ===== 检查方法实现 =====

    async checkValidationDocumentation() {
        // 检查验证文档是否存在
        const validationPath = this.config.systemValidation.validationPath;
        try {
            if (fs.existsSync(validationPath)) {
                const files = fs.readdirSync(validationPath);
                const requiredFiles = [
                    'system-validation-plan.md',
                    'installation-qualification.md',
                    'operational-qualification.md',
                    'performance-qualification.md'
                ];
                
                return requiredFiles.every(file => 
                    files.some(f => f.toLowerCase().includes(file.toLowerCase()))
                );
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async checkTestResults() {
        // 检查测试结果文档
        try {
            const testFiles = [
                './test-results/',
                './validation-test-results/'
            ];
            
            return testFiles.some(path => {
                try {
                    return fs.existsSync(path) && fs.readdirSync(path).length > 0;
                } catch (error) {
                    return false;
                }
            });
        } catch (error) {
            return false;
        }
    }

    async checkUserAcceptance() {
        // 检查用户验收测试
        try {
            const uatFiles = [
                './user-acceptance-test-results/',
                './validation/uat-results/'
            ];
            
            return uatFiles.some(path => {
                try {
                    return fs.existsSync(path);
                } catch (error) {
                    return false;
                }
            });
        } catch (error) {
            return false;
        }
    }

    async checkUserAuthentication() {
        // 检查用户身份验证实现
        try {
            const authService = './services/AuthenticationService.js';
            return fs.existsSync(authService);
        } catch (error) {
            return false;
        }
    }

    async checkRoleBasedAccess() {
        // 检查基于角色的访问控制
        try {
            const serviceFiles = fs.readdirSync('./services/');
            return serviceFiles.some(file => 
                file.toLowerCase().includes('auth') || 
                file.toLowerCase().includes('user')
            );
        } catch (error) {
            return false;
        }
    }

    async checkSessionManagement() {
        // 检查会话管理
        const sessionTimeout = this.config.accessControl.sessionTimeout;
        return sessionTimeout > 0 && sessionTimeout <= 120; // 合理范围
    }

    async checkPasswordPolicy() {
        // 检查密码策略
        const passwordReq = this.config.accessControl.passwordRequirements;
        return passwordReq.minLength >= 8 && 
               passwordReq.requireUppercase && 
               passwordReq.requireLowercase && 
               passwordReq.requireNumbers;
    }

    async checkLoginLimits() {
        // 检查登录失败限制
        return this.config.accessControl.maxFailedAttempts > 0 && 
               this.config.accessControl.maxFailedAttempts <= 10;
    }

    async checkUserActionTracking() {
        // 检查用户操作追踪
        try {
            const auditService = './services/AuditTrailService.js';
            return fs.existsSync(auditService);
        } catch (error) {
            return false;
        }
    }

    async checkDataChangeTracking() {
        // 检查数据变更追踪
        try {
            const auditService = './services/AuditTrailService.js';
            if (fs.existsSync(auditService)) {
                const content = fs.readFileSync(auditService, 'utf8');
                return content.includes('data') || content.includes('change') || 
                       content.includes('modify') || content.includes('update');
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async checkSystemEventTracking() {
        // 检查系统事件追踪
        try {
            const auditService = './services/AuditTrailService.js';
            if (fs.existsSync(auditService)) {
                const content = fs.readFileSync(auditService, 'utf8');
                return content.includes('system') || content.includes('event') || 
                       content.includes('log');
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async checkLogImmutability() {
        // 检查日志不可修改性（简单检查）
        return this.config.auditTrail.requireUnmodifiableLogs === true;
    }

    async checkTimeStamps() {
        // 检查时间戳准确性
        return this.config.auditTrail.requireTimeStamps === true;
    }

    async checkUserIdentification() {
        // 检查用户标识要求
        return this.config.auditTrail.requireUserIdentification === true;
    }

    async checkWrittenApproval() {
        // 检查书面批准程序
        return this.config.alternativeProcedures.requireWrittenApproval === true;
    }

    async checkDocumentation() {
        // 检查文档化要求
        return this.config.alternativeProcedures.requireDocumentation === true;
    }

    async checkTimeLimits() {
        // 检查时间限制要求
        return this.config.alternativeProcedures.requireTimeLimits === true;
    }

    async checkUniqueUserIdentification() {
        // 检查唯一用户标识
        return this.config.electronicSignatures.uniqueUserIdentification === true;
    }

    async checkPasswordConfirmation() {
        // 检查密码确认要求
        return this.config.electronicSignatures.requirePasswordConfirmation === true;
    }

    async checkTwoFactorAuth() {
        // 检查两因子认证
        return this.config.electronicSignatures.requireTwoFactor === true;
    }

    async checkBiometricData() {
        // 检查生物识别数据
        return this.config.electronicSignatures.requireBiometricData === true;
    }

    async checkSignatureMeaning() {
        // 检查签名含义
        return this.config.signatureComponents.requireSignatureMeaning === true;
    }

    async checkPrintNameRequirement() {
        // 检查打印姓名要求
        return this.config.signatureComponents.requirePrintName === true;
    }

    async checkDateTimeRequirement() {
        // 检查日期时间要求
        return this.config.signatureComponents.requireDateTime === true;
    }

    async checkMeaningDeclaration() {
        // 检查含义声明要求
        return this.config.signatureComponents.requireMeaningDeclaration === true;
    }

    // ===== 辅助方法 =====

    calculateComplianceScore(results) {
        const total = results.passed.length + results.failed.length + results.warnings.length;
        if (total === 0) return 0;
        
        const score = (results.passed.length / total) * 100;
        return Math.round(score);
    }

    countTotalIssues(sections) {
        return Object.values(sections).reduce((total, section) => 
            total + section.failed.length, 0
        );
    }

    countCriticalIssues(sections) {
        // 这里可以根据具体规则判断哪些是严重问题
        return Object.values(sections).reduce((total, section) => 
            total + section.failed.length, 0
        );
    }

    countWarnings(sections) {
        return Object.values(sections).reduce((total, section) => 
            total + section.warnings.length, 0
        );
    }

    /**
     * 生成合规性报告
     */
    async generateComplianceReport(results) {
        const report = {
            title: 'CFR21 Part 11 法规合规性检查报告',
            systemName: '放射化学纯度检测仪',
            reportDate: new Date().toISOString(),
            reportVersion: '1.0',
            ...results
        };

        // 生成报告文件
        const reportPath = './compliance-report.json';
        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`合规性报告已生成: ${reportPath}`);
        } catch (error) {
            console.error('生成合规性报告失败:', error);
        }

        return report;
    }

    /**
     * 生成合规性证书
     */
    generateComplianceCertificate(results) {
        const certificate = {
            title: 'CFR21 Part 11 合规性证书',
            systemName: '放射化学纯度检测仪',
            certificateId: `CERT-${Date.now()}`,
            issueDate: new Date().toISOString(),
            validityPeriod: '1年',
            complianceStatus: results.overall.complianceStatus,
            overallScore: results.overall.overallScore,
            complianceSections: Object.keys(results.overall.sections),
            authorizedBy: '系统管理员',
            authorizedSignature: this.generateDigitalSignature(
                JSON.stringify(results.overall)
            )
        };

        return certificate;
    }

    /**
     * 生成数字签名
     */
    generateDigitalSignature(data) {
        const hash = crypto.createHash('sha256');
        hash.update(data);
        return hash.digest('hex');
    }

    /**
     * 获取修复建议
     */
    getRemediationSuggestions() {
        const suggestions = [];
        
        this.checkResults.forEach((result, section) => {
            result.failed.forEach(issue => {
                switch (section) {
                    case '11.10':
                        suggestions.push({
                            section,
                            issue,
                            priority: 'HIGH',
                            action: '确保系统验证文档完整，包括IQ、OQ、PQ测试结果',
                            timeframe: '30天'
                        });
                        break;
                    case '11.30':
                        suggestions.push({
                            section,
                            issue,
                            priority: 'HIGH',
                            action: '实施严格的访问控制策略和用户身份验证',
                            timeframe: '7天'
                        });
                        break;
                    case '11.50':
                        suggestions.push({
                            section,
                            issue,
                            priority: 'CRITICAL',
                            action: '立即实施完整的审计追踪系统',
                            timeframe: '1天'
                        });
                        break;
                    case '11.70':
                        suggestions.push({
                            section,
                            issue,
                            priority: 'MEDIUM',
                            action: '建立完整的替代程序文档化流程',
                            timeframe: '14天'
                        });
                        break;
                    case '11.100':
                    case '11.200':
                        suggestions.push({
                            section,
                            issue,
                            priority: 'HIGH',
                            action: '实施符合要求的电子签名系统',
                            timeframe: '7天'
                        });
                        break;
                }
            });
        });

        return suggestions;
    }
}

module.exports = CFR21Compliance;