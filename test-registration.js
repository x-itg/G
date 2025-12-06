// 注册功能测试脚本
console.log('=== 辐射检测器用户注册功能测试 ===\n');

// 1. 测试HTML元素是否存在
function testHTMLElements() {
    console.log('1. 测试HTML元素...');
    
    const elements = [
        'register-screen',
        'register-form',
        'register-username',
        'register-email',
        'register-fullname',
        'register-password',
        'register-confirm-password',
        'register-role',
        'show-register-btn',
        'show-login-btn',
        'forgot-password-btn'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`   ✓ ${id}: 存在`);
        } else {
            console.log(`   ✗ ${id}: 不存在`);
        }
    });
}

// 2. 测试CSS样式是否加载
function testCSSStyles() {
    console.log('\n2. 测试CSS样式...');
    
    const styles = [
        'register-screen',
        'login-links',
        'form-row',
        'password-strength',
        'validation-feedback',
        'form-control'
    ];
    
    styles.forEach(className => {
        const element = document.querySelector(`.${className}`);
        if (element) {
            console.log(`   ✓ .${className}: 样式已加载`);
        } else {
            console.log(`   ✗ .${className}: 样式未找到`);
        }
    });
}

// 3. 测试JavaScript函数是否存在
function testJavaScriptFunctions() {
    console.log('\n3. 测试JavaScript函数...');
    
    if (window.Auth) {
        console.log('   ✓ window.Auth: 已定义');
        
        const functions = [
            'handleRegister',
            'showRegisterInterface', 
            'validateRegisterForm',
            'validateUsername',
            'checkPasswordStrength',
            'bindEvents'
        ];
        
        functions.forEach(funcName => {
            if (typeof window.Auth[funcName] === 'function') {
                console.log(`   ✓ Auth.${funcName}: 已定义`);
            } else {
                console.log(`   ✗ Auth.${funcName}: 未定义`);
            }
        });
    } else {
        console.log('   ✗ window.Auth: 未定义');
    }
}

// 4. 测试表单验证逻辑
function testFormValidation() {
    console.log('\n4. 测试表单验证逻辑...');
    
    if (window.Auth) {
        // 测试密码验证
        const testPasswords = [
            { password: 'weak', expected: false },
            { password: '123456', expected: false },
            { password: 'Password123', expected: false },
            { password: 'Password123!', expected: true }
        ];
        
        testPasswords.forEach(test => {
            const isValid = window.Auth.validatePassword(test.password);
            const result = isValid === test.expected ? '✓' : '✗';
            console.log(`   ${result} 密码 "${test.password}": ${isValid ? '有效' : '无效'}`);
        });
        
        // 测试邮箱验证
        const testEmails = [
            { email: 'invalid', expected: false },
            { email: 'test@', expected: false },
            { email: 'test@example.com', expected: true }
        ];
        
        testEmails.forEach(test => {
            const isValid = window.Auth.validateEmail(test.email);
            const result = isValid === test.expected ? '✓' : '✗';
            console.log(`   ${result} 邮箱 "${test.email}": ${isValid ? '有效' : '无效'}`);
        });
    }
}

// 5. 测试界面切换功能
function testUINavigation() {
    console.log('\n5. 测试界面切换功能...');
    
    if (window.Auth) {
        // 测试显示登录界面
        try {
            window.Auth.showLoginInterface();
            const loginScreen = document.getElementById('login-screen');
            const registerScreen = document.getElementById('register-screen');
            
            if (loginScreen && loginScreen.style.display !== 'none') {
                console.log('   ✓ showLoginInterface(): 正常工作');
            } else {
                console.log('   ✗ showLoginInterface(): 显示异常');
            }
            
            if (registerScreen && registerScreen.style.display === 'none') {
                console.log('   ✓ 界面切换: 正常隐藏注册界面');
            } else {
                console.log('   ✗ 界面切换: 注册界面未正确隐藏');
            }
        } catch (error) {
            console.log(`   ✗ showLoginInterface(): 错误 - ${error.message}`);
        }
        
        // 测试显示注册界面
        try {
            window.Auth.showRegisterInterface();
            const registerScreen = document.getElementById('register-screen');
            
            if (registerScreen && registerScreen.style.display !== 'none') {
                console.log('   ✓ showRegisterInterface(): 正常工作');
            } else {
                console.log('   ✗ showRegisterInterface(): 显示异常');
            }
        } catch (error) {
            console.log(`   ✗ showRegisterInterface(): 错误 - ${error.message}`);
        }
    }
}

// 运行所有测试
function runTests() {
    try {
        testHTMLElements();
        testCSSStyles();
        testJavaScriptFunctions();
        testFormValidation();
        testUINavigation();
        
        console.log('\n=== 测试完成 ===');
        console.log('\n使用说明:');
        console.log('1. 点击登录页面的"立即注册"链接切换到注册界面');
        console.log('2. 填写注册表单，系统会实时验证输入');
        console.log('3. 密码强度会实时显示');
        console.log('4. 用户名会实时检查是否可用');
        console.log('5. 点击"返回登录"可以切换回登录界面');
        
    } catch (error) {
        console.error('测试过程中出现错误:', error);
    }
}

// 如果在浏览器环境中运行
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runTests);
    } else {
        runTests();
    }
}

// 导出测试函数供外部调用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testHTMLElements,
        testCSSStyles,
        testJavaScriptFunctions,
        testFormValidation,
        testUINavigation,
        runTests
    };
}

console.log('注册功能测试脚本已加载');