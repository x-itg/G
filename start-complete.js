#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('\n===================================================');
console.log('  辐射检测器 - 完整功能版本');
console.log('  CFR 21 Part 11 合规系统');
console.log('===================================================\n');

// 颜色输出函数
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(color + message + colors.reset);
}

function runCommand(command, description) {
    return new Promise((resolve, reject) => {
        log(`\n🔄 ${description}...`, colors.cyan);
        
        const child = exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                log(`❌ ${description} 失败: ${error.message}`, colors.red);
                reject(error);
            } else {
                log(`✅ ${description} 完成`, colors.green);
                resolve({ stdout, stderr });
            }
        });
        
        child.stdout?.on('data', (data) => {
            process.stdout.write(data);
        });
        
        child.stderr?.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}

async function main() {
    try {
        log('开始系统初始化...', colors.blue);
        
        // 检查Node.js版本
        const nodeVersion = process.version;
        log(`Node.js版本: ${nodeVersion}`, colors.yellow);
        
        // 检查是否安装了依赖
        const packagePath = path.join(__dirname, 'package.json');
        const fs = require('fs');
        
        if (!fs.existsSync(packagePath)) {
            log('❌ package.json 不存在', colors.red);
            return;
        }
        
        // 安装依赖
        log('\n📦 检查并安装依赖包...', colors.blue);
        await runCommand('npm install', '依赖包安装');
        
        // 运行协议测试
        log('\n🔬 运行设备通讯协议测试...', colors.blue);
        await runCommand('node test/protocol-test.js', '协议测试');
        
        // 运行用户管理测试
        log('\n🔬 运行用户管理系统测试...', colors.blue);
        await runCommand('node test/user-management-test.js', '用户管理测试');
        
        // 运行文件管理测试
        log('\n🔬 运行文件管理系统测试...', colors.blue);
        await runCommand('node test/file-management-test.js', '文件管理测试');
        
        // 运行设备管理测试
        log('\n🔬 运行设备管理系统测试...', colors.blue);
        await runCommand('node test/device-management-test.js', '设备管理测试');
        
        // 启动Web服务器
        log('\n🚀 启动Web服务器...', colors.blue);
        log('\n===================================================');
        log('  服务器启动信息', colors.bright);
        log('===================================================');
        log('📊 访问地址: http://localhost:3000', colors.green);
        log('🔐 默认登录: admin / Admin123!', colors.green);
        log('');
        log('🎛️  功能特性:', colors.cyan);
        log('   • 设备模拟器 (支持COM2/COM3)');
        log('   • 探头位移控制');
        log('   • 实时数据采集');
        log('   • CFR 21 Part 11 合规');
        log('   • 完整的用户管理');
        log('   • 审计日志记录');
        log('   • 文件管理系统');
        log('');
        log('⚠️  启动模式说明:', colors.yellow);
        log('   • 默认启用设备模拟器');
        log('   • 所有功能均为真实实现');
        log('   • 适用于开发和演示');
        log('');
        log('💡 使用提示:', colors.cyan);
        log('   • 连接按钮旁边有模拟器切换');
        log('   • URL参数 ?simulator=true 启用模拟器');
        log('   • 按 Ctrl+C 停止服务器');
        log('===================================================\n');
        
        // 启动服务器
        const serverProcess = exec('node web-server.js', { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                log(`\n❌ 服务器启动失败: ${error.message}`, colors.red);
            } else {
                log('\n🛑 服务器已停止', colors.yellow);
            }
        });
        
        serverProcess.stdout?.on('data', (data) => {
            console.log(data);
        });
        
        serverProcess.stderr?.on('data', (data) => {
            console.error(data);
        });
        
        // 处理退出信号
        process.on('SIGINT', () => {
            log('\n\n🛑 正在关闭服务器...', colors.yellow);
            serverProcess.kill('SIGINT');
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            log('\n\n🛑 正在关闭服务器...', colors.yellow);
            serverProcess.kill('SIGTERM');
            process.exit(0);
        });
        
    } catch (error) {
        log(`\n❌ 系统启动失败: ${error.message}`, colors.red);
        console.error(error);
        process.exit(1);
    }
}

// 检查是否直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };