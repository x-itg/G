/**
 * 系统验证功能测试文件
 * 测试 CFR 21 Part 11 验证功能的各种场景
 */

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
    console.log('  开始执行 CFR 21 Part 11 验证功能测试');
    console.log('===================================================\n');

    // 基础测试
    await testDataIntegrityValidation();
    await testElectronicSignatureValidation();
    await testFileIntegrityValidation();
    await testDatabaseIntegrityCheck();
    await testCFR21ComplianceAssessment();
    await testValidationReportGeneration();

    // 综合测试
    await testValidationWorkflow();
    await testValidationHistoryManagement();

    // 输出测试结果
    printTestResults();
}

/**
 * 测试数据完整性验证功能
 */
async function testDataIntegrityValidation() {
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

        // 生成期望的哈希值 (简化测试)
        const crypto = require('crypto');
        const expectedHash = crypto.createHash('sha256').update(JSON.stringify(testData)).digest('hex');
        
        // 发送验证请求
        const response = await fetch('/api/validation/data-integrity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                data: testData, 
                expectedHash: expectedHash, 
                algorithm: 'sha256' 
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.result.valid) {
            pass('数据完整性验证 - 匹配哈希值');
        } else {
            fail('数据完整性验证', '验证请求失败或结果不正确');
        }

        // 测试不匹配的情况
        const wrongHash = '0000000000000000000000000000000000000000000000000000000000000000';
        const wrongResponse = await fetch('/api/validation/data-integrity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                data: testData, 
                expectedHash: wrongHash, 
                algorithm: 'sha256' 
            })
        });
        
        const wrongResult = await wrongResponse.json();
        
        if (wrongResult.success && !wrongResult.result.valid) {
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
async function testElectronicSignatureValidation() {
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

        // 生成电子签名
        const signatureResponse = await fetch('/api/validation/generate-signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                document: testDocument, 
                signer: testSigner, 
                action: 'approved' 
            })
        });
        
        const signatureResult = await signatureResponse.json();
        
        if (signatureResult.success && signatureResult.signature.id) {
            pass('电子签名生成');
            
            // 验证刚生成的签名
            const verifyResponse = await fetch('/api/validation/verify-signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signatureId: signatureResult.signature.id })
            });
            
            const verifyResult = await verifyResponse.json();
            
            if (verifyResult.success && verifyResult.result.valid) {
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
async function testFileIntegrityValidation() {
    log('测试文件完整性验证功能');
    
    try {
        const testFilePath = '/tmp/test-file.txt';
        const fs = require('fs');
        const crypto = require('crypto');
        
        // 创建测试文件
        const testContent = '这是一个测试文件，用于验证文件完整性检查功能';
        fs.writeFileSync(testFilePath, testContent);
        
        // 生成文件的哈希值
        const fileBuffer = fs.readFileSync(testFilePath);
        const expectedChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        // 验证文件完整性
        const response = await fetch('/api/validation/file-integrity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                filePath: testFilePath, 
                expectedChecksum: expectedChecksum 
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.result.valid) {
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
async function testDatabaseIntegrityCheck() {
    log('测试数据库完整性检查');
    
    try {
        const response = await fetch('/api/validation/database-integrity');
        const result = await response.json();
        
        if (result.success && result.result.timestamp && result.result.checks) {
            pass('数据库完整性检查');
            
            // 验证检查结果结构
            const checks = result.result.checks;
            if (checks.length > 0) {
                pass('数据库完整性检查 - 检查项存在');
            } else {
                fail('数据库完整性检查', '缺少检查项');
            }
        } else {
            fail('数据库完整性检查', '检查请求失败或结果格式不正确');
        }

    } catch (error) {
        fail('数据库完整性检查功能', error.message);
    }
}

/**
 * 测试CFR 21 Part 11合规性评估
 */
async function testCFR21ComplianceAssessment() {
    log('测试CFR 21 Part 11合规性评估');
    
    try {
        const response = await fetch('/api/validation/cfr21-compliance');
        const result = await response.json();
        
        if (result.success && result.compliance.timestamp && result.compliance.requirements) {
            pass('CFR 21 Part 11合规性评估');
            
            // 验证合规性要求
            const requirements = result.compliance.requirements;
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
            fail('CFR 21 Part 11合规性评估', '评估请求失败或结果格式不正确');
        }

    } catch (error) {
        fail('CFR 21 Part 11合规性评估功能', error.message);
    }
}

/**
 * 测试验证报告生成
 */
async function testValidationReportGeneration() {
    log('测试验证报告生成');
    
    try {
        const response = await fetch('/api/validation/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: '测试验证报告',
                period: 'daily',
                scope: 'full_system'
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.report.id && result.report.generatedAt) {
            pass('验证报告生成');
            
            // 验证报告内容
            const report = result.report;
            if (report.statistics && report.compliance && report.recommendations) {
                pass('验证报告内容完整性');
            } else {
                fail('验证报告内容', '报告内容结构不完整');
            }
        } else {
            fail('验证报告生成', '报告生成失败');
        }

    } catch (error) {
        fail('验证报告生成功能', error.message);
    }
}

/**
 * 测试验证工作流程
 */
async function testValidationWorkflow() {
    log('测试验证工作流程');
    
    try {
        // 1. 生成电子签名
        const document = { type: 'test_document', id: 'DOC-001' };
        const signer = { userId: 1, username: 'test_user', role: 'operator' };
        
        const signatureResponse = await fetch('/api/validation/generate-signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document, signer, action: 'reviewed' })
        });
        
        const signatureResult = await signatureResponse.json();
        
        if (!signatureResult.success) {
            fail('验证工作流程', '签名生成失败');
            return;
        }
        
        // 2. 验证电子签名
        const verifyResponse = await fetch('/api/validation/verify-signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signatureId: signatureResult.signature.id })
        });
        
        const verifyResult = await verifyResponse.json();
        
        if (!verifyResult.success || !verifyResult.result.valid) {
            fail('验证工作流程', '签名验证失败');
            return;
        }
        
        // 3. 执行数据完整性验证
        const testData = { workflow_test: true, timestamp: new Date().toISOString() };
        const crypto = require('crypto');
        const dataHash = crypto.createHash('sha256').update(JSON.stringify(testData)).digest('hex');
        
        const dataResponse = await fetch('/api/validation/data-integrity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: testData, expectedHash: dataHash })
        });
        
        const dataResult = await dataResponse.json();
        
        if (!dataResult.success || !dataResult.result.valid) {
            fail('验证工作流程', '数据完整性验证失败');
            return;
        }
        
        // 4. 生成验证报告
        const reportResponse = await fetch('/api/validation/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: '工作流程验证报告',
                period: 'daily',
                scope: 'full_system'
            })
        });
        
        const reportResult = await reportResponse.json();
        
        if (reportResult.success && reportResult.report.id) {
            pass('验证工作流程');
        } else {
            fail('验证工作流程', '报告生成失败');
        }

    } catch (error) {
        fail('验证工作流程', error.message);
    }
}

/**
 * 测试验证历史管理
 */
async function testValidationHistoryManagement() {
    log('测试验证历史管理');
    
    try {
        // 获取验证历史
        const historyResponse = await fetch('/api/validation/history');
        const historyResult = await historyResponse.json();
        
        if (historyResult.success && Array.isArray(historyResult.history)) {
            pass('验证历史获取');
        } else {
            fail('验证历史获取', '历史记录获取失败');
        }
        
        // 清空验证历史
        const clearResponse = await fetch('/api/validation/history', { method: 'DELETE' });
        const clearResult = await clearResponse.json();
        
        if (clearResult.success) {
            pass('验证历史清空');
        } else {
            fail('验证历史清空', '历史记录清空失败');
        }
        
        // 再次获取验证历史（应该为空）
        const emptyHistoryResponse = await fetch('/api/validation/history');
        const emptyHistoryResult = await emptyHistoryResponse.json();
        
        if (emptyHistoryResult.success && emptyHistoryResult.history.length === 0) {
            pass('验证历史清空确认');
        } else {
            fail('验证历史清空确认', '历史记录未正确清空');
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
    testValidationReportGeneration,
    testValidationWorkflow,
    testValidationHistoryManagement
};