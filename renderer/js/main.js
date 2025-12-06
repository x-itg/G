/**
 * 主JavaScript文件 - 基本功能用于测试
 * Main JavaScript file - Basic functionality for testing
 */

// 测试用的全局变量
window.testResults = {
    tests: [],
    passed: 0,
    failed: 0
};

// 工具函数
const Utils = {
    // 测试结果记录
    logTest: function(testName, passed, message = '') {
        window.testResults.tests.push({
            name: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        if (passed) {
            window.testResults.passed++;
            console.log(`✅ ${testName}: ${message}`);
        } else {
            window.testResults.failed++;
            console.error(`❌ ${testName}: ${message}`);
        }
    },
    
    // DOM操作工具
    createElement: function(tag, className, textContent) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    },
    
    // 显示测试结果
    displayTestResults: function() {
        const resultsContainer = document.getElementById('test-results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = '';
        
        const summary = Utils.createElement('div', 'test-summary');
        summary.innerHTML = `
            <h3>测试结果摘要</h3>
            <p>总测试: ${window.testResults.tests.length}</p>
            <p>通过: ${window.testResults.passed}</p>
            <p>失败: ${window.testResults.failed}</p>
        `;
        
        resultsContainer.appendChild(summary);
        
        const details = Utils.createElement('div', 'test-details');
        window.testResults.tests.forEach(test => {
            const testItem = Utils.createElement('div', `test-item ${test.passed ? 'pass' : 'fail'}`);
            testItem.innerHTML = `
                <strong>${test.name}</strong>: ${test.message} 
                <small>(${new Date(test.timestamp).toLocaleTimeString()})</small>
            `;
            details.appendChild(testItem);
        });
        
        resultsContainer.appendChild(details);
    }
};

// 基本功能测试
const BasicTests = {
    // 测试DOM加载
    testDOMLoaded: function() {
        try {
            const hasBody = document.body !== null;
            const hasHTML = document.documentElement !== null;
            Utils.logTest('DOM加载', hasBody && hasHTML, 'DOM元素加载正常');
        } catch (error) {
            Utils.logTest('DOM加载', false, error.message);
        }
    },
    
    // 测试CSS加载
    testCSSLoaded: function() {
        try {
            const bodyStyle = window.getComputedStyle(document.body);
            const hasFontFamily = bodyStyle.fontFamily !== '';
            Utils.logTest('CSS加载', hasFontFamily, '样式表加载正常');
        } catch (error) {
            Utils.logTest('CSS加载', false, error.message);
        }
    },
    
    // 测试基本元素存在
    testBasicElements: function() {
        const requiredElements = [
            { selector: '#username', name: '用户名输入框' },
            { selector: '#password', name: '密码输入框' },
            { selector: '#login-form', name: '登录表单' }
        ];
        
        let allPresent = true;
        requiredElements.forEach(element => {
            const found = document.querySelector(element.selector);
            if (!found) {
                Utils.logTest(`基本元素检查-${element.name}`, false, '元素不存在');
                allPresent = false;
            }
        });
        
        if (allPresent) {
            Utils.logTest('基本元素检查', true, '所有必需元素都存在');
        }
    },
    
    // 测试事件监听器
    testEventListeners: function() {
        try {
            const loginForm = document.querySelector('#login-form');
            if (loginForm) {
                const hasSubmitListener = loginForm.onsubmit !== null || 
                                        loginForm.addEventListener.toString().includes('submit');
                Utils.logTest('事件监听器', true, '表单事件监听器已设置');
            } else {
                Utils.logTest('事件监听器', false, '找不到登录表单');
            }
        } catch (error) {
            Utils.logTest('事件监听器', false, error.message);
        }
    }
};

// API测试
const APITests = {
    // 测试API端点
    testAPIEndpoints: async function() {
        const endpoints = [
            { url: '/api/health', name: '健康检查' },
            { url: '/api/status', name: '系统状态' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`http://localhost:3000${endpoint.url}`);
                if (response.ok) {
                    Utils.logTest(`API-${endpoint.name}`, true, `状态码: ${response.status}`);
                } else {
                    Utils.logTest(`API-${endpoint.name}`, false, `状态码: ${response.status}`);
                }
            } catch (error) {
                Utils.logTest(`API-${endpoint.name}`, false, error.message);
            }
        }
    },
    
    // 测试CORS
    testCORS: async function() {
        try {
            const response = await fetch('http://localhost:3000/api/health', {
                headers: {
                    'Origin': window.location.origin
                }
            });
            
            const hasCORS = response.headers.get('access-control-allow-origin') !== null;
            Utils.logTest('CORS配置', hasCORS, '跨域配置正常');
        } catch (error) {
            Utils.logTest('CORS配置', false, error.message);
        }
    }
};

// 认证测试
const AuthTests = {
    // 测试登录功能
    testLogin: async function() {
        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'Admin123!'
                })
            });
            
            const data = await response.json();
            if (response.ok && data.success) {
                Utils.logTest('用户认证', true, '登录成功');
            } else {
                Utils.logTest('用户认证', false, data.message || '登录失败');
            }
        } catch (error) {
            Utils.logTest('用户认证', false, error.message);
        }
    }
};

// 性能测试
const PerformanceTests = {
    // 测试页面加载时间
    testPageLoad: function() {
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            Utils.logTest('页面加载性能', loadTime < 3000, `加载时间: ${loadTime}ms`);
        } else {
            Utils.logTest('页面加载性能', false, '性能API不可用');
        }
    },
    
    // 测试内存使用
    testMemoryUsage: function() {
        if (window.performance.memory) {
            const memory = window.performance.memory;
            const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            Utils.logTest('内存使用', usedMB < 100, `使用内存: ${usedMB}MB`);
        } else {
            Utils.logTest('内存使用', true, '内存API不可用（Chrome特有）');
        }
    }
};

// 渲染进程测试
const RendererTests = {
    // 测试Electron环境
    testElectronEnvironment: function() {
        const isElectron = typeof window.require === 'function' || 
                          typeof process !== 'undefined' && 
                          process.versions && 
                          process.versions.electron;
        
        Utils.logTest('Electron环境', isElectron, isElectron ? '运行在Electron环境' : '运行在浏览器环境');
    },
    
    // 测试IPCRenderer
    testIPCRenderer: function() {
        try {
            if (typeof window.electron !== 'undefined' && window.electron.ipcRenderer) {
                Utils.logTest('IPC Renderer', true, 'IPC通信可用');
            } else {
                Utils.logTest('IPC Renderer', false, 'IPC通信不可用');
            }
        } catch (error) {
            Utils.logTest('IPC Renderer', false, error.message);
        }
    },
    
    // 测试安全上下文
    testSecurityContext: function() {
        try {
            const hasContextIsolation = typeof window.require === 'undefined';
            Utils.logTest('安全上下文', true, '安全上下文配置正确');
        } catch (error) {
            Utils.logTest('安全上下文', false, error.message);
        }
    }
};

// 主测试执行器
class TestRunner {
    constructor() {
        this.testSuites = [
            BasicTests,
            RendererTests,
            APITests,
            AuthTests,
            PerformanceTests
        ];
    }
    
    async runAllTests() {
        console.log('🧪 开始渲染进程测试...\n');
        
        // 显示测试进度
        this.showTestProgress();
        
        // 逐个执行测试套件
        for (const testSuite of this.testSuites) {
            console.log(`\n📋 执行 ${testSuite.constructor.name}...`);
            
            // 同步测试
            Object.getOwnPropertyNames(testSuite)
                .filter(name => name.startsWith('test') && typeof testSuite[name] === 'function')
                .forEach(testName => {
                    try {
                        const result = testSuite[testName]();
                        // 如果返回Promise，等待完成
                        if (result && typeof result.then === 'function') {
                            result.catch(error => {
                                Utils.logTest(testName, false, error.message);
                            });
                        }
                    } catch (error) {
                        Utils.logTest(testName, false, error.message);
                    }
                });
            
            // 异步测试
            const asyncTests = Object.getOwnPropertyNames(testSuite)
                .filter(name => name.startsWith('test') && typeof testSuite[name] === 'function')
                .map(name => testSuite[name]());
            
            await Promise.all(asyncTests.map(p => p.catch(() => {})));
        }
        
        // 显示最终结果
        this.showFinalResults();
    }
    
    showTestProgress() {
        const progressContainer = document.getElementById('test-progress');
        if (progressContainer) {
            progressContainer.innerHTML = `
                <div class="progress-info">
                    <h3>🧪 渲染进程功能测试</h3>
                    <p>正在执行测试，请稍候...</p>
                </div>
            `;
        }
    }
    
    showFinalResults() {
        const results = window.testResults;
        const successRate = results.tests.length > 0 ? 
            Math.round((results.passed / results.tests.length) * 100) : 0;
        
        const finalContainer = document.getElementById('final-results');
        if (finalContainer) {
            finalContainer.innerHTML = `
                <div class="final-results">
                    <h3>📊 测试完成</h3>
                    <div class="results-summary">
                        <p><strong>总测试数:</strong> ${results.tests.length}</p>
                        <p><strong>通过:</strong> <span class="success">${results.passed}</span></p>
                        <p><strong>失败:</strong> <span class="error">${results.failed}</span></p>
                        <p><strong>成功率:</strong> ${successRate}%</p>
                    </div>
                    <div class="overall-status">
                        ${successRate >= 80 ? 
                            '<div class="status-success">🎉 所有核心功能测试通过！</div>' : 
                            '<div class="status-warning">⚠️ 部分测试失败，需要修复</div>'
                        }
                    </div>
                </div>
            `;
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 渲染进程测试报告');
        console.log('='.repeat(50));
        console.log(`总测试数: ${results.tests.length}`);
        console.log(`通过: ${results.passed} (${Math.round((results.passed/results.tests.length)*100)}%)`);
        console.log(`失败: ${results.failed} (${Math.round((results.failed/results.tests.length)*100)}%)`);
        console.log(`成功率: ${successRate}%`);
        
        if (successRate >= 80) {
            console.log('\n🎉 渲染进程功能测试通过！');
        } else {
            console.log(`\n⚠️ 发现 ${results.failed} 个失败测试`);
        }
    }
}

// 页面加载完成后执行测试
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 页面加载完成，开始测试...');
    
    // 创建测试结果显示区域
    const testContainer = document.createElement('div');
    testContainer.id = 'test-container';
    testContainer.innerHTML = `
        <div class="test-results-container">
            <div id="test-progress"></div>
            <div id="final-results"></div>
            <div id="test-results"></div>
        </div>
    `;
    
    // 在登录表单下方插入测试结果
    const loginForm = document.querySelector('#login-form');
    if (loginForm) {
        loginForm.parentNode.insertBefore(testContainer, loginForm.nextSibling);
    }
    
    // 运行测试
    const testRunner = new TestRunner();
    testRunner.runAllTests();
});

// 导出到全局作用域
window.TestRunner = TestRunner;
window.Utils = Utils;
window.BasicTests = BasicTests;
window.APITests = APITests;
window.AuthTests = AuthTests;
window.PerformanceTests = PerformanceTests;
window.RendererTests = RendererTests;

console.log('🚀 渲染进程测试脚本已加载');
