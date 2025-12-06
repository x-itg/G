// 忘记密码功能测试脚本
// 该脚本用于验证忘记密码界面的各个功能

console.log('开始测试忘记密码功能...');

// 测试1: 检查HTML元素是否存在
function testHtmlElements() {
    console.log('测试1: 检查HTML元素...');
    
    const elements = [
        'forgot-password-screen',
        'forgot-password-btn', 
        'reset-form',
        'reset-email',
        'reset-password',
        'reset-confirm-password',
        'show-login-btn-from-reset'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✓ 元素 ${id} 存在`);
        } else {
            console.error(`✗ 元素 ${id} 不存在`);
        }
    });
}

// 测试2: 检查JavaScript绑定
function testJavaScriptBindings() {
    console.log('测试2: 检查JavaScript绑定...');
    
    // 检查Auth模块是否存在
    if (window.Auth) {
        console.log('✓ Auth模块已加载');
        
        // 检查关键方法是否存在
        const methods = ['showForgotPasswordInterface', 'handlePasswordReset', 'validateEmail', 'validatePassword'];
        methods.forEach(method => {
            if (typeof window.Auth[method] === 'function') {
                console.log(`✓ 方法 ${method} 已定义`);
            } else {
                console.error(`✗ 方法 ${method} 未定义`);
            }
        });
    } else {
        console.error('✗ Auth模块未加载');
    }
}

// 测试3: 检查密码强度验证
function testPasswordValidation() {
    console.log('测试3: 检查密码验证...');
    
    if (window.Auth && window.Auth.validatePassword) {
        const testCases = [
            { password: '123456', expected: false, desc: '太简单' },
            { password: 'password123', expected: false, desc: '缺少大写字母' },
            { password: 'Password123', expected: false, desc: '缺少特殊字符' },
            { password: 'Password123!', expected: true, desc: '符合要求' }
        ];
        
        testCases.forEach(testCase => {
            const result = window.Auth.validatePassword(testCase.password);
            if (result === testCase.expected) {
                console.log(`✓ 密码验证 "${testCase.desc}" 通过`);
            } else {
                console.error(`✗ 密码验证 "${testCase.desc}" 失败`);
            }
        });
    } else {
        console.error('✗ validatePassword方法不存在');
    }
}

// 测试4: 检查邮箱验证
function testEmailValidation() {
    console.log('测试4: 检查邮箱验证...');
    
    if (window.Auth && window.Auth.validateEmail) {
        const testCases = [
            { email: 'invalid', expected: false, desc: '无效邮箱' },
            { email: 'test@', expected: false, desc: '无效邮箱格式' },
            { email: 'test@example.com', expected: true, desc: '有效邮箱' }
        ];
        
        testCases.forEach(testCase => {
            const result = window.Auth.validateEmail(testCase.email);
            if (result === testCase.expected) {
                console.log(`✓ 邮箱验证 "${testCase.desc}" 通过`);
            } else {
                console.error(`✗ 邮箱验证 "${testCase.desc}" 失败`);
            }
        });
    } else {
        console.error('✗ validateEmail方法不存在');
    }
}

// 运行所有测试
function runAllTests() {
    console.log('=== 忘记密码功能测试开始 ===\n');
    
    testHtmlElements();
    console.log('');
    
    testJavaScriptBindings();
    console.log('');
    
    testPasswordValidation();
    console.log('');
    
    testEmailValidation();
    console.log('');
    
    console.log('=== 忘记密码功能测试完成 ===');
}

// 如果在浏览器环境中运行，延迟执行以确保DOM加载完成
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAllTests);
    } else {
        runAllTests();
    }
}

// 导出测试函数供外部调用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testHtmlElements,
        testJavaScriptBindings,
        testPasswordValidation,
        testEmailValidation,
        runAllTests
    };
}