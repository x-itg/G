/**
 * 探头控制系统测试
 * Probe Control System Tests
 * 
 * 测试探头控制系统的核心功能
 */

const path = require('path');
const fs = require('fs');

// 模拟数据库
class MockDatabase {
    constructor() {
        this.data = new Map();
        this.tables = new Map();
    }
    
    run(sql, params = []) {
        // 模拟SQL执行
        if (sql.includes('CREATE TABLE')) {
            const tableName = this.extractTableName(sql);
            this.tables.set(tableName, []);
        }
        return { changes: 1, lastID: 1 };
    }
    
    get(sql, params = []) {
        // 模拟SELECT查询
        return {};
    }
    
    all(sql, params = []) {
        // 模拟SELECT ALL查询
        return [];
    }
    
    extractTableName(sql) {
        const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        return match ? match[1] : 'unknown';
    }
}

// 测试结果收集
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

/**
 * 运行所有探头控制测试
 */
async function runProbeControlTests() {
    console.log('\n🎯 开始探头控制系统测试...\n');
    
    try {
        // 初始化模拟数据库
        const mockDb = new MockDatabase();
        
        // 导入服务类
        const ProbeControlService = require('../services/ProbeControlService');
        const probeControlService = new ProbeControlService(mockDb);
        
        // 1. 测试服务初始化
        await testProbeControlService(probeControlService);
        
        // 2. 测试位置控制
        await testPositionControl(probeControlService);
        
        // 3. 测试运动控制
        await testMotionControl(probeControlService);
        
        // 4. 测试安全保护
        await testSafetyFeatures(probeControlService);
        
        // 5. 测试配置管理
        await testConfigurationManagement(probeControlService);
        
        // 打印测试结果
        printTestResults();
        
    } catch (error) {
        console.error('❌ 探头控制系统测试执行失败:', error);
    }
}

/**
 * 测试探头控制服务
 */
async function testProbeControlService(service) {
    console.log('🔧 测试ProbeControlService...');
    
    // 1. 测试初始化
    try {
        const result = await service.initialize();
        
        if (result.success) {
            addTestResult('ProbeControl - 初始化', true, '服务初始化成功');
        } else {
            addTestResult('ProbeControl - 初始化', false, '初始化失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('ProbeControl - 初始化', false, '初始化异常: ' + error.message);
    }
    
    // 2. 测试获取当前位置
    try {
        const result = service.getCurrentPosition();
        
        if (result.success && result.data.position) {
            addTestResult('ProbeControl - 获取位置', true, '成功获取当前位置');
        } else {
            addTestResult('ProbeControl - 获取位置', false, '获取位置失败');
        }
    } catch (error) {
        addTestResult('ProbeControl - 获取位置', false, '获取位置异常: ' + error.message);
    }
    
    // 3. 测试获取运动状态
    try {
        const result = service.getMotionStatus();
        
        if (result.success) {
            addTestResult('ProbeControl - 获取状态', true, '成功获取运动状态');
        } else {
            addTestResult('ProbeControl - 获取状态', false, '获取状态失败');
        }
    } catch (error) {
        addTestResult('ProbeControl - 获取状态', false, '获取状态异常: ' + error.message);
    }
    
    // 4. 测试获取配置
    try {
        const result = service.getConfiguration();
        
        if (result.success && result.data.config) {
            addTestResult('ProbeControl - 获取配置', true, '成功获取系统配置');
        } else {
            addTestResult('ProbeControl - 获取配置', false, '获取配置失败');
        }
    } catch (error) {
        addTestResult('ProbeControl - 获取配置', false, '获取配置异常: ' + error.message);
    }
}

/**
 * 测试位置控制
 */
async function testPositionControl(service) {
    console.log('📍 测试位置控制...');
    
    // 1. 测试移动到有效位置
    try {
        const targetPosition = { x: 100, y: 200, z: 50 };
        const result = await service.moveToPosition(targetPosition);
        
        if (result.success) {
            addTestResult('Position - 有效位置移动', true, '成功移动到有效位置');
        } else {
            addTestResult('Position - 有效位置移动', false, '移动失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('Position - 有效位置移动', false, '移动异常: ' + error.message);
    }
    
    // 2. 测试边界检查
    try {
        // 测试超边界位置
        const outOfBoundsPosition = { x: 2000, y: 3000, z: 4000 };
        const result = await service.moveToPosition(outOfBoundsPosition);
        
        if (!result.success && result.error.includes('超出工作区域')) {
            addTestResult('Position - 边界检查', true, '正确拒绝超边界位置');
        } else {
            addTestResult('Position - 边界检查', false, '边界检查失败: ' + (result.error || '未知错误'));
        }
    } catch (error) {
        addTestResult('Position - 边界检查', false, '边界检查异常: ' + error.message);
    }
    
    // 3. 测试边界状态详细信息
    try {
        const testPosition = { x: 1500, y: -50, z: 600 };
        const boundaryStatus = service.getBoundaryStatus(testPosition);
        
        if (!boundaryStatus.valid && 
            !boundaryStatus.x.valid && 
            !boundaryStatus.y.valid && 
            !boundaryStatus.z.valid) {
            addTestResult('Position - 边界状态', true, '正确获取边界状态信息');
        } else {
            addTestResult('Position - 边界状态', false, '边界状态检查不正确');
        }
    } catch (error) {
        addTestResult('Position - 边界状态', false, '边界状态异常: ' + error.message);
    }
    
    // 4. 测试位置调整建议
    try {
        const testPosition = { x: 1500, y: 200, z: 300 };
        const suggestion = service.suggestPositionAdjustment(testPosition);
        
        if (suggestion.canAdjust && suggestion.adjustments.length > 0) {
            addTestResult('Position - 调整建议', true, '正确生成位置调整建议');
        } else {
            addTestResult('Position - 调整建议', false, '位置调整建议不正确');
        }
    } catch (error) {
        addTestResult('Position - 调整建议', false, '调整建议异常: ' + error.message);
    }
}

/**
 * 测试运动控制
 */
async function testMotionControl(service) {
    console.log('🏃 测试运动控制...');
    
    // 1. 测试运动暂停
    try {
        const result = await service.pauseMovement();
        
        if (result.success || result.error.includes('未在运动')) {
            addTestResult('Motion - 暂停', true, '暂停功能正常');
        } else {
            addTestResult('Motion - 暂停', false, '暂停失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('Motion - 暂停', false, '暂停异常: ' + error.message);
    }
    
    // 2. 测试运动恢复
    try {
        const result = await service.resumeMovement();
        
        if (result.success || result.error.includes('未被暂停')) {
            addTestResult('Motion - 恢复', true, '恢复功能正常');
        } else {
            addTestResult('Motion - 恢复', false, '恢复失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('Motion - 恢复', false, '恢复异常: ' + error.message);
    }
    
    // 3. 测试运动取消
    try {
        const result = await service.cancelMovement();
        
        if (result.success || result.error.includes('未在运动')) {
            addTestResult('Motion - 取消', true, '取消功能正常');
        } else {
            addTestResult('Motion - 取消', false, '取消失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('Motion - 取消', false, '取消异常: ' + error.message);
    }
    
    // 4. 测试位置重置
    try {
        const result = await service.resetPosition();
        
        if (result.success) {
            addTestResult('Motion - 重置', true, '位置重置成功');
        } else {
            addTestResult('Motion - 重置', false, '重置失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('Motion - 重置', false, '重置异常: ' + error.message);
    }
}

/**
 * 测试安全保护功能
 */
async function testSafetyFeatures(service) {
    console.log('🛡️ 测试安全保护功能...');
    
    // 1. 测试紧急停止
    try {
        const result = await service.emergencyStop('test_emergency');
        
        if (result.success) {
            addTestResult('Safety - 紧急停止', true, '紧急停止功能正常');
        } else {
            addTestResult('Safety - 紧急停止', false, '紧急停止失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('Safety - 紧急停止', false, '紧急停止异常: ' + error.message);
    }
    
    // 2. 测试运动中暂停
    try {
        // 开始一个长时间的运动（使用较远的距离）
        const longMovement = service.moveToPosition({ x: 500, y: 400, z: 250 });
        
        // 短暂等待让运动开始
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 尝试暂停
        const result = await service.pauseMovement();
        
        if (result.success) {
            // 等待确保暂停生效
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 尝试恢复
            const resumeResult = await service.resumeMovement();
            
            if (resumeResult.success) {
                addTestResult('Safety - 运动中暂停', true, '运动中暂停和恢复成功');
            } else {
                addTestResult('Safety - 运动中暂停', false, '运动恢复失败: ' + resumeResult.error);
            }
        } else {
            addTestResult('Safety - 运动中暂停', false, '运动暂停失败: ' + result.error);
        }
        
        // 等待运动完成
        await longMovement;
        
    } catch (error) {
        addTestResult('Safety - 运动中暂停', false, '运动中暂停异常: ' + error.message);
    }
    
    // 3. 测试操作历史记录
    try {
        const result = await service.getOperationHistory({ limit: 10 });
        
        if (result.success) {
            addTestResult('Safety - 操作历史', true, '操作历史记录功能正常');
        } else {
            addTestResult('Safety - 操作历史', false, '操作历史记录失败');
        }
    } catch (error) {
        addTestResult('Safety - 操作历史', false, '操作历史记录异常: ' + error.message);
    }
}

/**
 * 测试配置管理
 */
async function testConfigurationManagement(service) {
    console.log('⚙️ 测试配置管理...');
    
    // 1. 测试更新配置
    try {
        const newConfig = {
            workArea: {
                x: { min: 0, max: 1200 },
                y: { min: 0, max: 900 },
                z: { min: 0, max: 600 }
            },
            speed: {
                max: 60,
                normal: 25,
                slow: 8,
                approach: 3
            }
        };
        
        const result = await service.updateConfiguration(newConfig);
        
        if (result.success) {
            addTestResult('Config - 更新配置', true, '配置更新成功');
        } else {
            addTestResult('Config - 更新配置', false, '配置更新失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('Config - 更新配置', false, '配置更新异常: ' + error.message);
    }
    
    // 2. 测试配置验证
    try {
        // 测试无效配置
        const invalidConfig = {
            workArea: {
                x: { min: 100, max: 50 }, // 最小值大于最大值
                y: { min: 0, max: 800 },
                z: { min: 0, max: 500 }
            }
        };
        
        const result = await service.updateConfiguration(invalidConfig);
        
        if (!result.success && result.error) {
            if (result.error.includes('最小值必须小于最大值')) {
                addTestResult('Config - 配置验证', true, '正确拒绝无效配置');
            } else {
                addTestResult('Config - 配置验证', false, '配置验证错误信息不正确: ' + result.error);
            }
        } else {
            addTestResult('Config - 配置验证', false, '配置验证失败，应该拒绝无效配置');
        }
    } catch (error) {
        addTestResult('Config - 配置验证', false, '配置验证异常: ' + error.message);
    }
    
    // 3. 测试负数边界配置验证
    try {
        const invalidNegativeConfig = {
            workArea: {
                x: { min: -10, max: 1000 }, // 负数最小值
                y: { min: 0, max: 800 },
                z: { min: 0, max: 500 }
            }
        };
        
        const result = await service.updateConfiguration(invalidNegativeConfig);
        
        if (!result.success && result.error) {
            if (result.error.includes('不能为负数')) {
                addTestResult('Config - 负数边界验证', true, '正确拒绝负数边界配置');
            } else {
                addTestResult('Config - 负数边界验证', false, '负数边界验证错误信息不正确: ' + result.error);
            }
        } else {
            addTestResult('Config - 负数边界验证', false, '配置验证失败，应该拒绝负数边界');
        }
    } catch (error) {
        addTestResult('Config - 负数边界验证', false, '负数边界验证异常: ' + error.message);
    }
    
    // 3. 测试断开连接
    try {
        const result = await service.disconnect();
        
        if (result.success) {
            addTestResult('Config - 断开连接', true, '断开连接成功');
        } else {
            addTestResult('Config - 断开连接', false, '断开连接失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('Config - 断开连接', false, '断开连接异常: ' + error.message);
    }
}

/**
 * 添加测试结果
 */
function addTestResult(testName, passed, details) {
    testResults.total++;
    
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName}: ${details}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}: ${details}`);
    }
    
    testResults.details.push({
        test: testName,
        passed: passed,
        details: details,
        timestamp: new Date().toISOString()
    });
}

/**
 * 打印测试结果
 */
function printTestResults() {
    console.log('\n============================================================');
    console.log('🎯 探头控制系统测试结果');
    console.log('============================================================');
    console.log(`📊 总计测试: ${testResults.total}`);
    console.log(`✅ 通过: ${testResults.passed}`);
    console.log(`❌ 失败: ${testResults.failed}`);
    console.log(`📈 通过率: ${testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0}%`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ 失败的测试:');
        testResults.details.forEach(result => {
            if (!result.passed) {
                console.log(`   • ${result.test}: ${result.details}`);
            }
        });
    }
    
    console.log('============================================================');
    
    // 保存测试报告
    saveTestReport();
}

/**
 * 保存测试报告
 */
function saveTestReport() {
    const report = {
        testSuite: '探头控制系统测试',
        timestamp: new Date().toISOString(),
        results: testResults,
        summary: {
            total: testResults.total,
            passed: testResults.passed,
            failed: testResults.failed,
            passRate: testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0
        }
    };
    
    const reportPath = path.join(__dirname, 'probe-control-test-report.json');
    
    try {
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`📄 测试报告已保存至: ${reportPath}`);
    } catch (error) {
        console.error('保存测试报告失败:', error);
    }
}

// 运行测试
if (require.main === module) {
    runProbeControlTests().catch(console.error);
}

module.exports = {
    runProbeControlTests,
    testResults
};