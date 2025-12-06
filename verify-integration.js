#!/usr/bin/env node

// 快速验证文件管理系统集成状态

console.log('🔍 验证文件管理系统集成状态...\n');

// 检查HTML文件中的script标签
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'renderer', 'index.html');
const mainJsPath = path.join(__dirname, 'renderer', 'assets', 'js', 'main.js');
const fileManagerJsPath = path.join(__dirname, 'renderer', 'assets', 'js', 'file-manager.js');

let checks = {
    html_script: false,
    mainjs_init: false,
    filemanager_exists: false,
    api_endpoints: false
};

try {
    // 1. 检查HTML文件中的script标签
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    if (htmlContent.includes('assets/js/file-manager.js')) {
        console.log('✅ HTML中包含file-manager.js脚本引用');
        checks.html_script = true;
    } else {
        console.log('❌ HTML中缺少file-manager.js脚本引用');
    }
    
    // 检查script标签的顺序（在utils.js之后）
    const utilsIndex = htmlContent.indexOf('assets/js/utils.js');
    const fileManagerIndex = htmlContent.indexOf('assets/js/file-manager.js');
    const authIndex = htmlContent.indexOf('assets/js/auth.js');
    
    if (utilsIndex < fileManagerIndex && fileManagerIndex < authIndex) {
        console.log('✅ script标签顺序正确 (utils.js -> file-manager.js -> auth.js)');
    } else {
        console.log('⚠️ script标签顺序可能有问题');
    }
    
} catch (error) {
    console.log(`❌ 读取HTML文件失败: ${error.message}`);
}

// 2. 检查main.js中的模块初始化
try {
    const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
    if (mainJsContent.includes("'FileManager'")) {
        console.log('✅ main.js中包含FileManager模块初始化');
        checks.mainjs_init = true;
        
        // 检查初始化顺序
        const utilsIndex = mainJsContent.indexOf("'Utils'");
        const fileManagerIndex = mainJsContent.indexOf("'FileManager'");
        const authIndex = mainJsContent.indexOf("'Auth'");
        
        if (utilsIndex < fileManagerIndex && fileManagerIndex < authIndex) {
            console.log('✅ 模块初始化顺序正确 (Utils -> FileManager -> Auth)');
        } else {
            console.log('⚠️ 模块初始化顺序可能有问题');
        }
    } else {
        console.log('❌ main.js中缺少FileManager模块初始化');
    }
} catch (error) {
    console.log(`❌ 读取main.js文件失败: ${error.message}`);
}

// 3. 检查file-manager.js文件是否存在
try {
    const fileManagerContent = fs.readFileSync(fileManagerJsPath, 'utf8');
    console.log(`✅ file-manager.js文件存在 (${fileManagerContent.length} 字符)`);
    checks.filemanager_exists = true;
    
    // 检查关键方法
    const requiredMethods = ['init', 'newProject', 'openProject', 'saveProject', 'importData', 'exportData', 'generateReport'];
    const missingMethods = [];
    
    requiredMethods.forEach(method => {
        if (!fileManagerContent.includes(`${method}:`) && !fileManagerContent.includes(`async ${method}(`)) {
            missingMethods.push(method);
        }
    });
    
    if (missingMethods.length === 0) {
        console.log('✅ file-manager.js包含所有必需的方法');
    } else {
        console.log(`⚠️ 缺少方法: ${missingMethods.join(', ')}`);
    }
    
} catch (error) {
    console.log(`❌ file-manager.js文件不存在或读取失败: ${error.message}`);
}

// 4. 检查web-server.js中的API端点
try {
    const webServerPath = path.join(__dirname, 'web-server.js');
    const webServerContent = fs.readFileSync(webServerPath, 'utf8');
    
    const apiEndpoints = [
        'app.get(\'/api/files\'',
        'app.post(\'/api/files\'',
        'app.put(\'/api/files/',
        'app.delete(\'/api/files/'
    ];
    
    let foundEndpoints = 0;
    apiEndpoints.forEach(endpoint => {
        if (webServerContent.includes(endpoint)) {
            foundEndpoints++;
        }
    });
    
    if (foundEndpoints === apiEndpoints.length) {
        console.log('✅ web-server.js包含所有文件管理API端点');
        checks.api_endpoints = true;
    } else {
        console.log(`⚠️ 只找到 ${foundEndpoints}/${apiEndpoints.length} 个API端点`);
    }
    
} catch (error) {
    console.log(`❌ 读取web-server.js文件失败: ${error.message}`);
}

// 显示总结
console.log('\n📊 集成状态总结:');
console.log(`   HTML脚本引用: ${checks.html_script ? '✅' : '❌'}`);
console.log(`   主程序初始化: ${checks.mainjs_init ? '✅' : '❌'}`);
console.log(`   模块文件存在: ${checks.filemanager_exists ? '✅' : '❌'}`);
console.log(`   API端点完整: ${checks.api_endpoints ? '✅' : '❌'}`);

const passedChecks = Object.values(checks).filter(Boolean).length;
const totalChecks = Object.keys(checks).length;

console.log(`\n🎯 集成完成度: ${passedChecks}/${totalChecks} (${Math.round(passedChecks/totalChecks*100)}%)`);

if (passedChecks === totalChecks) {
    console.log('🎉 文件管理系统集成成功！');
    console.log('\n📋 功能特性:');
    console.log('   • 项目创建和管理');
    console.log('   • 文件导入/导出 (JSON, CSV, PDF)');
    console.log('   • 数据验证和版本控制');
    console.log('   • CFR 21 Part 11 合规报告');
    console.log('   • 完整的API端点支持');
} else {
    console.log('⚠️ 部分集成步骤未完成，请检查上面的错误信息');
}

console.log('\n' + '='.repeat(50));