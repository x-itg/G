/**
 * 系统设置功能测试
 * System Settings Functionality Tests
 * 
 * 测试覆盖:
 * - 系统设置API端点
 * - 硬件通讯模式切换
 * - 用户偏好设置
 * - 配置导入导出
 * - 前后端集成
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// 测试配置
const TEST_CONFIG = {
    baseURL: 'http://localhost:3000',
    timeout: 10000,
    sessionId: null
};

// 模拟用户数据
const TEST_USER = {
    username: 'admin',
    password: 'Admin123!'
};

// 测试结果收集
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

/**
 * 运行所有测试
 */
async function runAllTests() {
    console.log('\n🧪 开始系统设置功能测试...\n');
    
    try {
        // 1. 用户登录
        await testUserLogin();
        
        // 2. 系统设置API测试
        await testSystemSettingsAPI();
        
        // 3. 硬件配置API测试
        await testHardwareConfigAPI();
        
        // 4. 硬件通讯API测试
        await testHardwareCommunicationAPI();
        
        // 5. 用户偏好API测试
        await testUserPreferencesAPI();
        
        // 6. 配置导入导出测试
        await testConfigImportExport();
        
        // 7. 权限测试
        await testPermissionControls();
        
        // 打印测试结果
        printTestResults();
        
    } catch (error) {
        console.error('❌ 测试执行失败:', error);
    }
}

/**
 * 测试用户登录
 */
async function testUserLogin() {
    console.log('🔐 测试用户登录...');
    
    try {
        const response = await makeRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify(TEST_USER)
        });
        
        if (response.success && response.data && response.data.sessionId) {
            TEST_CONFIG.sessionId = response.data.sessionId;
            addTestResult('用户登录', true, '登录成功');
        } else {
            addTestResult('用户登录', false, '登录失败: ' + (response.message || '未知错误'));
        }
    } catch (error) {
        addTestResult('用户登录', false, '登录异常: ' + error.message);
    }
}

/**
 * 测试系统设置API
 */
async function testSystemSettingsAPI() {
    console.log('⚙️ 测试系统设置API...');
    
    // 1. 获取系统设置
    try {
        const response = await makeRequest('/api/settings', {
            headers: {
                'X-Session-Id': TEST_CONFIG.sessionId
            }
        });
        
        if (response.success && response.data) {
            addTestResult('获取系统设置', true, '成功获取设置数据');
        } else {
            addTestResult('获取系统设置', false, '获取失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('获取系统设置', false, '获取异常: ' + error.message);
    }
    
    // 2. 更新系统设置
    try {
        const testSettings = {
            system: {
                language: 'zh-CN',
                autoSave: true,
                debugMode: false
            },
            display: {
                theme: 'light',
                updateInterval: 100
            }
        };
        
        const response = await makeRequest('/api/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': TEST_CONFIG.sessionId
            },
            body: JSON.stringify(testSettings)
        });
        
        if (response.success) {
            addTestResult('更新系统设置', true, '设置更新成功');
        } else {
            addTestResult('更新系统设置', false, '更新失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('更新系统设置', false, '更新异常: ' + error.message);
    }
    
    // 3. 重置系统设置
    try {
        const response = await makeRequest('/api/settings/reset', {
            method: 'POST',
            headers: {
                'X-Session-Id': TEST_CONFIG.sessionId
            }
        });
        
        if (response.success) {
            addTestResult('重置系统设置', true, '设置重置成功');
        } else {
            addTestResult('重置系统设置', false, '重置失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('重置系统设置', false, '重置异常: ' + error.message);
    }
}

/**
 * 测试硬件配置API
 */
async function testHardwareConfigAPI() {
    console.log('🔧 测试硬件配置API...');
    
    // 1. 获取硬件配置
    try {
        const response = await makeRequest('/api/settings/hardware', {
            headers: {
                'X-Session-Id': TEST_CONFIG.sessionId
            }
        });
        
        if (response.success && response.data) {
            addTestResult('获取硬件配置', true, '成功获取硬件配置');
        } else {
            addTestResult('获取硬件配置', false, '获取失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('获取硬件配置', false, '获取异常: ' + error.message);
    }
    
    // 2. 更新硬件配置
    try {
        const testConfig = {
            serialPorts: {
                comPort2: 'COM2',
                baudRate: 9600
            },
            timeout: 5000
        };
        
        const response = await makeRequest('/api/settings/hardware', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': TEST_CONFIG.sessionId
            },
            body: JSON.stringify(testConfig)
        });
        
        if (response.success) {
            addTestResult('更新硬件配置', true, '配置更新成功');
        } else {
            addTestResult('更新硬件配置', false, '更新失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('更新硬件配置', false, '更新异常: ' + error.message);
    }
    
    // 3. 切换硬件模式
    try {
        const response = await makeRequest('/api/hardware/mode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': TEST_CONFIG.sessionId
            },
            body: JSON.stringify({ mode: 'simulated' })
        });
        
        if (response.success) {
            addTestResult('切换硬件模式', true, '模式切换成功');
        } else {
            addTestResult('切换硬件模式', false, '切换失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('切换硬件模式', false, '切换异常: ' + error.message);
    }
}

/**
 * 测试硬件通讯API
 */
async function testHardwareCommunicationAPI() {
    console.log('📡 测试硬件通讯API...');
    
    // 1. 初始化硬件通讯
    try {
        const response = await makeRequest('/api/hardware/initialize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': TEST_CONFIG.sessionId
            },
            body: JSON.stringify({ mode: 'simulated' })
        });
        
        if (response.success) {
            addTestResult('初始化硬件通讯', true, '硬件初始化成功');
        } else {
            addTestResult('初始化硬件通讯', false, '初始化失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('初始化硬件通讯', false, '初始化异常: ' + error.message);
    }
    
    // 2. 获取硬件状态
    try {
        const response = await makeRequest('/api/hardware/status', {
            headers: {
                'X-Session-Id': TEST_CONFIG.sessionId
            }
        });
        
        if (response.success && response.data) {
            addTestResult('获取硬件状态', true, '状态获取成功');
        } else {
            addTestResult('获取硬件状态', false, '获取失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('获取硬件状态', false, '获取异常: ' + error.message);
    }
    
    // 3. 开始数据采集
    try {
        const response = await makeRequest('/api/hardware/acquisition/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': TEST_CONFIG.sessionId
            },
            body: JSON.stringify({ 
                options: { 
                    duration: 5000, // 5秒测试采集
                    interval: 1000 
                } 
            })
        });
        
        if (response.success) {
            addTestResult('开始数据采集', true, '采集开始成功');
            
            // 等待一段时间后停止采集
            setTimeout(async () => {
                try {
                    await makeRequest('/api/hardware/acquisition/stop', {
                        method: 'POST',
                        headers: {
                            'X-Session-Id': TEST_CONFIG.sessionId
                        }
                    });
                } catch (e) {
                    console.warn('停止采集警告:', e.message);
                }
            }, 2000);
        } else {
            addTestResult('开始数据采集', false, '采集开始失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('开始数据采集', false, '采集开始异常: ' + error.message);
    }
    
    // 4. 获取当前谱线数据
    try {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 等待数据生成
        
        const response = await makeRequest('/api/hardware/spectrum/current', {
            headers: {
                'X-Session-Id': TEST_CONFIG.sessionId
            }
        });
        
        if (response.success && response.data) {
            addTestResult('获取当前谱线', true, '谱线数据获取成功');
        } else {
            addTestResult('获取当前谱线', false, '获取失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('获取当前谱线', false, '获取异常: ' + error.message);
    }
    
    // 5. 获取模拟设备列表
    try {
        const response = await makeRequest('/api/hardware/simulated-devices', {
            headers: {
                'X-Session-Id': TEST_CONFIG.sessionId
            }
        });
        
        if (response.success && response.data) {
            addTestResult('获取模拟设备', true, '模拟设备列表获取成功');
        } else {
            addTestResult('获取模拟设备', false, '获取失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('获取模拟设备', false, '获取异常: ' + error.message);
    }
}

/**
 * 测试用户偏好API
 */
async function testUserPreferencesAPI() {
    console.log('👤 测试用户偏好API...');
    
    // 1. 获取用户偏好
    try {
        const response = await makeRequest('/api/settings/preferences', {
            headers: {
                'X-Session-Id': TEST_CONFIG.sessionId
            }
        });
        
        if (response.success) {
            addTestResult('获取用户偏好', true, '偏好获取成功');
        } else {
            addTestResult('获取用户偏好', false, '获取失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('获取用户偏好', false, '获取异常: ' + error.message);
    }
    
    // 2. 更新用户偏好
    try {
        const testPreferences = {
            display: {
                theme: 'dark',
                chartPoints: 2000,
                notifications: {
                    enabled: true,
                    sound: false
                }
            }
        };
        
        const response = await makeRequest('/api/settings/preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': TEST_CONFIG.sessionId
            },
            body: JSON.stringify({ preferences: testPreferences })
        });
        
        if (response.success) {
            addTestResult('更新用户偏好', true, '偏好更新成功');
        } else {
            addTestResult('更新用户偏好', false, '更新失败: ' + response.error);
        }
    } catch (error) {
        addTestResult('更新用户偏好', false, '更新异常: ' + error.message);
    }
}

/**
 * 测试配置导入导出
 */
async function testConfigImportExport() {
    console.log('📤📥 测试配置导入导出...');
    
    // 1. 导出配置
    try {
        const response = await makeRequest('/api/settings/export?format=json', {
            headers: {
                'X-Session-Id': TEST_CONFIG.sessionId
            }
        });
        
        if (response.success || response.headers) {
            addTestResult('导出系统配置', true, '配置导出成功');
        } else {
            addTestResult('导出系统配置', false, '导出失败');
        }
    } catch (error) {
        addTestResult('导出系统配置', false, '导出异常: ' + error.message);
    }
}

/**
 * 测试权限控制
 */
async function testPermissionControls() {
    console.log('🔒 测试权限控制...');
    
    // 模拟无效会话
    try {
        const response = await makeRequest('/api/settings', {
            headers: {
                'X-Session-Id': 'invalid-session'
            }
        });
        
        if (!response.success && response.message && response.message.includes('会话无效')) {
            addTestResult('会话验证', true, '无效会话正确拒绝');
        } else {
            addTestResult('会话验证', false, '无效会话未正确处理');
        }
    } catch (error) {
        addTestResult('会话验证', false, '会话验证异常: ' + error.message);
    }
}

/**
 * 发送HTTP请求
 */
function makeRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, TEST_CONFIG.baseURL);
        const config = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: TEST_CONFIG.timeout
        };
        
        if (options.body) {
            config.headers['Content-Length'] = Buffer.byteLength(options.body);
        }
        
        const req = http.request(config, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (error) {
                    resolve(data);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('请求超时'));
        });
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
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
    console.log('🧪 系统设置功能测试结果');
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
    const reportPath = path.join(__dirname, '..', 'test', 'system-settings-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    
    console.log(`📄 测试报告已保存至: ${reportPath}`);
    
    return testResults.failed === 0;
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = {
    runAllTests,
    testUserLogin,
    testSystemSettingsAPI,
    testHardwareConfigAPI,
    testHardwareCommunicationAPI,
    testUserPreferencesAPI,
    testConfigImportExport,
    testPermissionControls
};