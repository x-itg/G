/**
 * 系统验证功能测试文件 (Node.js版本)
 * 直接测试ValidationService而不通过HTTP API
 */

const path = require('path');
const fs = require('fs');

// 导入验证服务
const ValidationService = require('../services/ValidationService');

// Mock数据库管理器
class MockDatabaseManager {
    constructor() {
        this.database = {
            all: (sql, params, callback) => {
                // 模拟数据库查询
                callback(null, []);
            },
            get: (sql, params, callback) => {
                // 模拟单条记录查询
                callback(null, null);
            },
            run: (sql, params, callback) => {
                // 模拟数据库操作
                callback.call({ lastID: 1, changes: 1 });
            }
        };
    }
    
    getDatabase() {
        return this.database;
    }
    
    async initialize() {
        return true;
    }
}

const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

function log(message) {
    console.log(`[验证测试] ${message}`);
}

function pass(testName) {
    testResults.total++;
    testResults.passed++;
    console.log(`✅ 通过: ${testName}`);
}

function fail(testName, error) {
    testResults.total++;
    testResults.failed++;
    testResults.errors.push(`${testName}: ${error}`);
    console.error(`❌ 失败: ${testName} - ${error}`);
}

/**
 * 执行所有验证功能测试
 */
async function runValidationTests() {
    console.log('\n===================================================');
    console.log('  开始执行 CFR 21 Part 11 验证功能测试 (Node.js)');
    console.log('===================================================\n');

    // 初始化验证服务
    const dbManager = new MockDatabaseManager();
    const validationService = new ValidationService(dbManager);

    // 基础测试
    await testDataIntegrityValidation(validationService);
    await testElectronicSignatureValidation(validationService);
    await testFileIntegrityValidation(validationService);
    await testDatabaseIntegrityCheck(validationService);
    await testCFR21ComplianceAssessment(validationService);
    await testValidationHistoryManagement(validationService);

    // 输出测试结果
    printTestResults();
}

/**
 * 测试数据完整性验证功能
 */
async function testDataIntegrityValidation(validationService) {
    log('测试数据完整性验证功能');
    
    try {
        // 测试数据
        const testData = {
            measurementId: 'MEAS-2024-001',
            timestamp: '2024-12-04T16:55:03Z',
            position: { x: 10.5, y: 20.3, z: 5.1 },
            counts: 1250,
            operator: 'admin'
        };

        // 生成期望的哈希值
        const expectedHash = validationService.generateDataHash(testData, 'sha256');
        
        // 验证数据完整性
        const result = validationService.validateDataIntegrity(testData, expectedHash, 'sha256');
        
        if (result.valid && result.actualHash === expectedHash) {
            pass('数据完整性验证 - 匹配哈希值');
        } else {
            fail('数据完整性验证', '验证结果不正确');
        }

        // 测试不匹配的情况
        const wrongHash = '0000000000000000000000000000000000000000000000000000000000000000';
        const wrongResult = validationService.validateDataIntegrity(testData, wrongHash, 'sha256');
        
        if (!wrongResult.valid && wrongResult.actualHash !== wrongHash) {
            pass('数据完整性验证 - 不匹配哈希值检测');
        } else {
            fail('数据完整性验证', '未检测到不匹配的哈希值');
        }

    } catch (error) {
        fail('数据完整性验证功能', error.message);
    }
}

/**
 * 测试电子签名功能
 */
async function testElectronicSignatureValidation(validationService) {
    log('测试电子签名功能');
    
    try {
        // 测试文档
        const testDocument = {
            type: 'analysis_report',
            id: 'REPORT-2024-001',
            content: '辐射检测分析报告数据'
        };

        // 签名者信息
        const testSigner = {
            userId: 1,
            username: 'admin',
            role: 'admin'
        };

        // Mock saveSignatureToDatabase方法
        validationService.saveSignatureToDatabase = async (signature) => {
            return signature;
        };

        // 生成电子签名
        const signature = await validationService.generateElectronicSignature(testDocument, testSigner, 'approved');
        
        if (signature.id && signature.signature_hash && signature.timestamp) {
            pass('电子签名生成');
            
            // Mock getSignatureFromDatabase方法
            validationService.getSignatureFromDatabase = async (signatureId) => {
                return signatureId === signature.id ? signature : null;
            };

            // 验证刚生成的签名
            const verifyResult = await validationService.validateElectronicSignature(signature.id);
            
            if (verifyResult.valid && verifyResult.signature) {
                pass('电子签名验证');
            } else {
                fail('电子签名验证', '签名验证失败');
            }
            
        } else {
            fail('电子签名生成', '签名生成失败');
        }

    } catch (error) {
        fail('电子签名功能', error.message);
    }
}

/**
 * 测试文件完整性验证功能
 */
async function testFileIntegrityValidation(validationService) {
    log('测试文件完整性验证功能');
    
    try {
        const testFilePath = '/tmp/test-validation-file.txt';
        const testContent = '这是一个测试文件，用于验证文件完整性检查功能';
        
        // 创建测试文件
        fs.writeFileSync(testFilePath, testContent);
        
        // 生成文件的哈希值
        const fileBuffer = fs.readFileSync(testFilePath);
        const crypto = require('crypto');
        const expectedChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        // 验证文件完整性
        const result = await validationService.validateFileIntegrity(testFilePath, expectedChecksum);
        
        if (result.valid && result.actualChecksum === expectedChecksum) {
            pass('文件完整性验证');
        } else {
            fail('文件完整性验证', '文件完整性检查失败');
        }
        
        // 清理测试文件
        fs.unlinkSync(testFilePath);

    } catch (error) {
        fail('文件完整性验证功能', error.message);
    }
}

/**
 * 测试数据库完整性检查
 */
async function testDatabaseIntegrityCheck(validationService) {
    log('测试数据库完整性检查');
    
    try {
        // Mock executeQuery方法
        validationService.executeQuery = async (sql) => {
            if (sql.includes('COUNT(*)')) {
                return [{ count: 5 }];
            }
            if (sql.includes('PRAGMA foreign_key_check')) {
                return []; // 无违规
            }
            return [];
        };

        // Mock其他方法
        validationService.checkForeignKeyConstraints = async (table) => ({
            status: 'ok',
            message: '外键约束正常'
        });

        validationService.performDataConsistencyCheck = async () => ({
            status: 'ok',
            errors: [],
            details: { checksPerformed: ['admin_users', 'audit_log_integrity'], totalErrors: 0 }
        });

        const result = await validationService.performDatabaseIntegrityCheck();
        
        if (result.timestamp && result.checks && result.overallStatus) {
            pass('数据库完整性检查');
            
            // 验证检查结果结构
            if (result.checks.length > 0) {
                pass('数据库完整性检查 - 检查项存在');
            } else {
                fail('数据库完整性检查', '缺少检查项');
            }
        } else {
            fail('数据库完整性检查', '检查结果格式不正确');
        }

    } catch (error) {
        fail('数据库完整性检查功能', error.message);
    }
}

/**
 * 测试CFR 21 Part 11合规性评估
 */
async function testCFR21ComplianceAssessment(validationService) {
    log('测试CFR 21 Part 11合规性评估');
    
    try {
        // Mock检查方法
        validationService.checkAccessControlCompliance = async () => ({
            status: 'compliant',
            issue: null,
            recommendations: ['访问控制正常']
        });

        validationService.checkAuditTrailCompliance = async () => ({
            status: 'compliant',
            issue: null,
            recommendations: ['审计日志正常']
        });

        validationService.checkElectronicSignatureCompliance = async () => ({
            status: 'compliant',
            issue: null,
            recommendations: ['电子签名正常']
        });

        validationService.checkDataIntegrityCompliance = async () => ({
            status: 'compliant',
            issue: null,
            recommendations: ['数据完整性正常']
        });

        validationService.checkRecordKeepingCompliance = async () => ({
            status: 'compliant',
            issue: null,
            recommendations: ['记录保持正常']
        });

        validationService.checkSystemValidationCompliance = async () => ({
            status: 'compliant',
            issue: null,
            recommendations: ['系统验证正常']
        });

        const compliance = await validationService.assessCFR21Compliance();
        
        if (compliance.timestamp && compliance.requirements && compliance.overallStatus) {
            pass('CFR 21 Part 11合规性评估');
            
            // 验证合规性要求
            const requirements = compliance.requirements;
            const requiredChecks = [
                'accessControl',
                'auditTrails', 
                'electronicSignatures',
                'dataIntegrity',
                'recordKeeping',
                'systemValidation'
            ];
            
            let requiredChecksPassed = 0;
            for (const check of requiredChecks) {
                if (requirements[check]) {
                    requiredChecksPassed++;
                }
            }
            
            if (requiredChecksPassed === requiredChecks.length) {
                pass('CFR 21 Part 11合规性检查 - 所有检查项目');
            } else {
                fail('CFR 21 Part 11合规性检查', `缺少 ${requiredChecks.length - requiredChecksPassed} 个检查项目`);
            }
        } else {
            fail('CFR 21 Part 11合规性评估', '评估结果格式不正确');
        }

    } catch (error) {
        fail('CFR 21 Part 11合规性评估功能', error.message);
    }
}

/**
 * 测试验证历史管理
 */
async function testValidationHistoryManagement(validationService) {
    log('测试验证历史管理');
    
    try {
        // 测试初始状态
        const initialHistory = validationService.getValidationHistory();
        if (Array.isArray(initialHistory)) {
            pass('验证历史获取');
        } else {
            fail('验证历史获取', '历史记录格式不正确');
        }
        
        // 执行一次验证操作以产生历史记录
        const testData = { test: true };
        const hash = validationService.generateDataHash(testData);
        validationService.validateDataIntegrity(testData, hash);
        
        // 检查是否记录了历史
        const historyAfterValidation = validationService.getValidationHistory();
        if (historyAfterValidation.length > 0) {
            pass('验证历史记录');
        } else {
            fail('验证历史记录', '历史记录未生成');
        }
        
        // 测试清空历史
        validationService.clearValidationHistory();
        const clearedHistory = validationService.getValidationHistory();
        if (clearedHistory.length === 0) {
            pass('验证历史清空');
        } else {
            fail('验证历史清空', '历史记录未正确清空');
        }

    } catch (error) {
        fail('验证历史管理', error.message);
    }
}

/**
 * 输出测试结果
 */
function printTestResults() {
    console.log('\n===================================================');
    console.log('  验证功能测试结果');
    console.log('===================================================');
    console.log(`总测试数: ${testResults.total}`);
    console.log(`通过: ${testResults.passed}`);
    console.log(`失败: ${testResults.failed}`);
    console.log(`成功率: ${testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0}%`);
    
    if (testResults.errors.length > 0) {
        console.log('\n失败的测试:');
        testResults.errors.forEach(error => {
            console.log(`  - ${error}`);
        });
    }
    
    console.log('\n===================================================');
    
    // 返回测试结果
    return {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0,
        errors: testResults.errors
    };
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    runValidationTests()
        .then(results => {
            console.log('验证功能测试完成');
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('验证功能测试执行失败:', error);
            process.exit(1);
        });
}

module.exports = {
    runValidationTests,
    testDataIntegrityValidation,
    testElectronicSignatureValidation,
    testFileIntegrityValidation,
    testDatabaseIntegrityCheck,
    testCFR21ComplianceAssessment,
    testValidationHistoryManagement
};