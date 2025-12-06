/**
 * 系统设置Node.js测试
 * System Settings Node.js Tests
 * 
 * 独立于Web服务器运行的测试
 * 测试SystemSettingsService和HardwareCommunicationService的核心功能
 */

const path = require('path');
const fs = require('fs');

// 模拟数据库
class MockDatabase {
    constructor() {
        this.data = new Map();
    }
    
    run(sql, params = []) {
        return { changes: 1, lastID: 1 };
    }
    
    get(sql, params = []) {
        return {};
    }
    
    all(sql, params = []) {
        return [];
    }
}

// 测试结果收集
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// 导入服务类（在文件作用域）
const SystemSettingsService = require('../services/SystemSettingsService');
const HardwareCommunicationService = require('../services/HardwareCommunicationService');

/**
 * 运行所有Node.js测试
 */
async function runNodeTests() {
    console.log('\n🧪 开始系统设置Node.js功能测试...\n');
    
    try {
        // 初始化模拟数据库
        const mockDb = new MockDatabase();
        
        // 1. 测试系统设置服务
        await testSystemSettingsService(mockDb);
        
        // 2. 测试硬件通讯服务
        await testHardwareCommunicationService(mockDb);
        
        // 3. 测试服务集成
        await testServiceIntegration(mockDb);
        
        // 打印测试结果
        printTestResults();
        
    } catch (error) {
        console.error('❌ Node.js测试执行失败:', error);
    }
}

/**
 * 测试系统设置服务
 */
async function testSystemSettingsService(db) {
    console.log('⚙️ 测试SystemSettingsService...');
    
    const systemSettingsService = new SystemSettingsService(db);
    
    // 1. 测试获取系统设置
    try {
        const result = await systemSettingsService.getSystemSettings();
        
        if (result.success && result.data) {
            addTestResult('SystemSettingsService - 获取设置', true, '成功获取系统设置');
        } else {
            addTestResult('SystemSettingsService - 获取设置', false, '获取失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('SystemSettingsService - 获取设置', false, '获取异常: ' + error.message);
    }
    
    // 2. 测试更新系统设置
    try {
        const testSettings = {
            system: {
                language: 'en-US',
                debugMode: true
            },
            display: {
                theme: 'dark'
            }
        };
        
        const result = await systemSettingsService.updateSystemSettings(testSettings);
        
        if (result.success) {
            addTestResult('SystemSettingsService - 更新设置', true, '成功更新系统设置');
        } else {
            addTestResult('SystemSettingsService - 更新设置', false, '更新失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('SystemSettingsService - 更新设置', false, '更新异常: ' + error.message);
    }
    
    // 3. 测试硬件配置获取
    try {
        const result = await systemSettingsService.getHardwareConfig();
        
        if (result.success && result.data) {
            addTestResult('SystemSettingsService - 获取硬件配置', true, '成功获取硬件配置');
        } else {
            addTestResult('SystemSettingsService - 获取硬件配置', false, '获取失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('SystemSettingsService - 获取硬件配置', false, '获取异常: ' + error.message);
    }
    
    // 4. 测试硬件模式切换
    try {
        const result = await systemSettingsService.switchHardwareMode('simulated');
        
        if (result.success && result.mode === 'simulated') {
            addTestResult('SystemSettingsService - 切换硬件模式', true, '成功切换到模拟模式');
        } else {
            addTestResult('SystemSettingsService - 切换硬件模式', false, '切换失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('SystemSettingsService - 切换硬件模式', false, '切换异常: ' + error.message);
    }
    
    // 5. 测试用户偏好获取
    try {
        const result = await systemSettingsService.getUserPreferences('test-user');
        
        if (result.success) {
            addTestResult('SystemSettingsService - 获取用户偏好', true, '成功获取用户偏好');
        } else {
            addTestResult('SystemSettingsService - 获取用户偏好', false, '获取失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('SystemSettingsService - 获取用户偏好', false, '获取异常: ' + error.message);
    }
    
    // 6. 测试用户偏好更新
    try {
        const testPreferences = {
            display: {
                theme: 'light'
            }
        };
        
        const result = await systemSettingsService.updateUserPreferences(testPreferences, 'test-user');
        
        if (result.success) {
            addTestResult('SystemSettingsService - 更新用户偏好', true, '成功更新用户偏好');
        } else {
            addTestResult('SystemSettingsService - 更新用户偏好', false, '更新失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('SystemSettingsService - 更新用户偏好', false, '更新异常: ' + error.message);
    }
    
    // 7. 测试配置导出
    try {
        const result = await systemSettingsService.exportConfiguration('json');
        
        if (result.success && result.data && result.data.fileName) {
            // 清理临时文件
            if (fs.existsSync(result.data.path)) {
                fs.unlinkSync(result.data.path);
            }
            addTestResult('SystemSettingsService - 导出配置', true, '成功导出配置');
        } else {
            addTestResult('SystemSettingsService - 导出配置', false, '导出失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('SystemSettingsService - 导出配置', false, '导出异常: ' + error.message);
    }
    
    // 8. 测试设置重置
    try {
        const result = await systemSettingsService.resetToDefaults();
        
        if (result.success) {
            // 清理备份文件
            if (result.backupPath && fs.existsSync(result.backupPath)) {
                fs.unlinkSync(result.backupPath);
            }
            addTestResult('SystemSettingsService - 重置设置', true, '成功重置设置');
        } else {
            addTestResult('SystemSettingsService - 重置设置', false, '重置失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('SystemSettingsService - 重置设置', false, '重置异常: ' + error.message);
    }
}

/**
 * 测试硬件通讯服务
 */
async function testHardwareCommunicationService(db) {
    console.log('📡 测试HardwareCommunicationService...');
    
    const hardwareService = new HardwareCommunicationService(db);
    
    // 1. 测试加载设置
    try {
        const settings = await hardwareService.loadSettings();
        
        if (settings !== null) {
            addTestResult('HardwareService - 加载设置', true, '成功加载硬件设置');
        } else {
            addTestResult('HardwareService - 加载设置', false, '设置加载失败');
        }
    } catch (error) {
        addTestResult('HardwareService - 加载设置', false, '设置加载异常: ' + error.message);
    }
    
    // 2. 测试初始化模拟设备
    try {
        const result = await hardwareService.initialize('simulated');
        
        if (result.success && result.mode === 'simulated') {
            addTestResult('HardwareService - 初始化模拟设备', true, '成功初始化模拟设备');
        } else {
            addTestResult('HardwareService - 初始化模拟设备', false, '初始化失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('HardwareService - 初始化模拟设备', false, '初始化异常: ' + error.message);
    }
    
    // 3. 测试硬件状态获取
    try {
        const result = hardwareService.getHardwareStatus();
        
        if (result.success && result.data) {
            addTestResult('HardwareService - 获取硬件状态', true, '成功获取硬件状态');
        } else {
            addTestResult('HardwareService - 获取硬件状态', false, '获取失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('HardwareService - 获取硬件状态', false, '获取异常: ' + error.message);
    }
    
    // 4. 测试模拟数据生成
    try {
        const spectrum = hardwareService.generateSimulatedSpectrum(true, 0.01);
        
        if (spectrum && Array.isArray(spectrum) && spectrum.length > 0) {
            addTestResult('HardwareService - 生成模拟数据', true, '成功生成模拟谱线数据');
        } else {
            addTestResult('HardwareService - 生成模拟数据', false, '模拟数据生成失败');
        }
    } catch (error) {
        addTestResult('HardwareService - 生成模拟数据', false, '数据生成异常: ' + error.message);
    }
    
    // 5. 测试获取当前谱线
    try {
        // 先生成一些数据
        hardwareService.addToBuffer({
            timestamp: new Date().toISOString(),
            spectrum: new Array(1024).fill(0).map((_, i) => Math.random() * 100),
            totalCounts: 10000,
            device: { name: 'test-device' },
            mode: 'simulated'
        });
        
        const result = hardwareService.getCurrentSpectrum();
        
        if (result.success && result.data && result.data.spectrum) {
            addTestResult('HardwareService - 获取当前谱线', true, '成功获取当前谱线数据');
        } else {
            addTestResult('HardwareService - 获取当前谱线', false, '获取失败: ' + result.message);
        }
    } catch (error) {
        addTestResult('HardwareService - 获取当前谱线', false, '获取异常: ' + error.message);
    }
    
    // 6. 测试获取历史数据
    try {
        const result = hardwareService.getHistoricalData({ limit: 10 });
        
        if (result.success && result.data) {
            addTestResult('HardwareService - 获取历史数据', true, '成功获取历史数据');
        } else {
            addTestResult('HardwareService - 获取历史数据', false, '获取失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('HardwareService - 获取历史数据', false, '获取异常: ' + error.message);
    }
    
    // 7. 测试模拟设备列表
    try {
        const result = hardwareService.getSimulatedDevices();
        
        if (result.success && result.data && Object.keys(result.data).length > 0) {
            addTestResult('HardwareService - 获取模拟设备', true, '成功获取模拟设备列表');
        } else {
            addTestResult('HardwareService - 获取模拟设备', false, '获取失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('HardwareService - 获取模拟设备', false, '获取异常: ' + error.message);
    }
    
    // 8. 测试模拟设备配置
    try {
        const result = hardwareService.configureSimulatedDevice('hpge_detector', {
            countRate: 2000,
            noiseLevel: 0.02
        });
        
        if (result.success) {
            addTestResult('HardwareService - 配置模拟设备', true, '成功配置模拟设备');
        } else {
            addTestResult('HardwareService - 配置模拟设备', false, '配置失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('HardwareService - 配置模拟设备', false, '配置异常: ' + error.message);
    }
    
    // 9. 测试数据采集控制
    try {
        // 手动设置采集状态（模拟正在进行采集）
        hardwareService.isAcquiring = true;
        
        // 测试停止采集
        const result = await hardwareService.stopAcquisition();
        
        if (result.success) {
            addTestResult('HardwareService - 停止采集', true, '停止采集操作成功');
        } else {
            addTestResult('HardwareService - 停止采集', false, '停止失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('HardwareService - 停止采集', false, '停止异常: ' + error.message);
    }
    
    // 10. 测试断开连接
    try {
        const result = await hardwareService.disconnect();
        
        if (result.success) {
            addTestResult('HardwareService - 断开连接', true, '成功断开硬件连接');
        } else {
            addTestResult('HardwareService - 断开连接', false, '断开失败: ' + result.error);
        }
    } catch (error) {
        addTestResult('HardwareService - 断开连接', false, '断开异常: ' + error.message);
    }
}

/**
 * 测试服务集成
 */
async function testServiceIntegration(db) {
    console.log('🔗 测试服务集成...');
    
    const systemSettingsService = new SystemSettingsService(db);
    const hardwareService = new HardwareCommunicationService(db);
    
    // 1. 测试硬件模式切换与设备初始化的集成
    try {
        // 切换到模拟模式
        const switchResult = await systemSettingsService.switchHardwareMode('simulated');
        
        if (switchResult.success) {
            // 初始化硬件通讯
            const initResult = await hardwareService.initialize('simulated');
            
            if (initResult.success && initResult.mode === 'simulated') {
                addTestResult('集成测试 - 模式切换+设备初始化', true, '模式切换和设备初始化集成成功');
            } else {
                addTestResult('集成测试 - 模式切换+设备初始化', false, '设备初始化失败: ' + initResult.error);
            }
        } else {
            addTestResult('集成测试 - 模式切换+设备初始化', false, '模式切换失败: ' + switchResult.error);
        }
    } catch (error) {
        addTestResult('集成测试 - 模式切换+设备初始化', false, '集成异常: ' + error.message);
    }
    
    // 2. 测试设置更新与硬件配置的集成
    try {
        // 更新硬件配置
        const configResult = await systemSettingsService.updateHardwareConfig({
            timeout: 10000,
            retryAttempts: 5
        });
        
        if (configResult.success) {
            // 重新加载设置
            const loadResult = await hardwareService.loadSettings();
            
            if (loadResult && loadResult.timeout === 10000) {
                addTestResult('集成测试 - 设置更新+配置加载', true, '设置更新和配置加载集成成功');
            } else {
                addTestResult('集成测试 - 设置更新+配置加载', false, '配置加载失败');
            }
        } else {
            addTestResult('集成测试 - 设置更新+配置加载', false, '设置更新失败: ' + configResult.error);
        }
    } catch (error) {
        addTestResult('集成测试 - 设置更新+配置加载', false, '集成异常: ' + error.message);
    }
    
    // 3. 测试模拟数据生成与谱线获取的集成
    try {
        // 生成模拟数据
        hardwareService.addToBuffer({
            timestamp: new Date().toISOString(),
            spectrum: new Array(2048).fill(0).map((_, i) => Math.sin(i * 0.1) * 500 + Math.random() * 100),
            totalCounts: 50000,
            device: { name: 'HPGe Detector' },
            mode: 'simulated'
        });
        
        // 获取当前谱线
        const spectrumResult = hardwareService.getCurrentSpectrum();
        
        if (spectrumResult.success && 
            spectrumResult.data && 
            spectrumResult.data.spectrum && 
            spectrumResult.data.spectrum.length === 2048) {
            addTestResult('集成测试 - 模拟数据+谱线获取', true, '模拟数据生成和谱线获取集成成功');
        } else {
            addTestResult('集成测试 - 模拟数据+谱线获取', false, '谱线获取验证失败');
        }
    } catch (error) {
        addTestResult('集成测试 - 模拟数据+谱线获取', false, '集成异常: ' + error.message);
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
        name: testName,
        passed: passed,
        details: details,
        timestamp: new Date().toISOString()
    });
}

/**
 * 打印测试结果
 */
function printTestResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 系统设置Node.js功能测试结果');
    console.log('='.repeat(60));
    console.log(`📊 总计测试: ${testResults.total}`);
    console.log(`✅ 通过: ${testResults.passed}`);
    console.log(`❌ 失败: ${testResults.failed}`);
    console.log(`📈 通过率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ 失败的测试:');
        testResults.details
            .filter(test => !test.passed)
            .forEach(test => {
                console.log(`   • ${test.name}: ${test.details}`);
            });
    }
    
    console.log('='.repeat(60));
    
    // 保存测试报告
    const reportPath = path.join(__dirname, 'system-settings-node-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    
    console.log(`📄 测试报告已保存至: ${reportPath}`);
    
    return testResults.failed === 0;
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    runNodeTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = {
    runNodeTests,
    testSystemSettingsService,
    testHardwareCommunicationService,
    testServiceIntegration
};