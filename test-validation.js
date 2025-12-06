#!/usr/bin/env node

/**
 * CFR 21 Part 11 验证功能测试运行脚本
 * 启动服务器并执行验证功能测试
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n===================================================');
console.log('  CFR 21 Part 11 验证功能测试');
console.log('  系统验证功能完整测试套件');
console.log('===================================================\n');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
    console.log(color + message + colors.reset);
}

async function main() {
    try {
        log('🚀 启动验证功能测试流程', colors.bright);
        
        // 1. 检查服务器是否已启动
        log('\n📋 测试准备阶段...', colors.cyan);
        
        // 2. 启动Web服务器
        log('\n🔄 启动Web服务器...', colors.yellow);
        const serverProcess = exec('node web-server.js', { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                log(`❌ 服务器启动失败: ${error.message}`, colors.red);
            }
        });
        
        // 等待服务器启动
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        log('✅ Web服务器已启动 (http://localhost:3000)', colors.green);
        
        // 3. 启动验证功能测试
        log('\n🧪 执行验证功能测试...', colors.magenta);
        
        const testProcess = exec('node test/validation-test.js', { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                log(`❌ 测试执行失败: ${error.message}`, colors.red);
            }
        });
        
        // 监听测试输出
        testProcess.stdout?.on('data', (data) => {
            console.log(data);
        });
        
        testProcess.stderr?.on('data', (data) => {
            console.error(data);
        });
        
        // 等待测试完成
        testProcess.on('close', (code) => {
            log('\n📊 测试执行完成', colors.cyan);
            
            if (code === 0) {
                log('✅ 所有验证功能测试通过!', colors.green);
            } else {
                log(`❌ 部分测试失败，退出代码: ${code}`, colors.red);
            }
            
            // 清理：停止服务器
            log('\n🛑 清理资源...', colors.yellow);
            serverProcess.kill('SIGTERM');
            
            setTimeout(() => {
                log('✅ 清理完成', colors.green);
                process.exit(code);
            }, 1000);
        });
        
    } catch (error) {
        log(`\n❌ 验证测试流程失败: ${error.message}`, colors.red);
        console.error(error);
        process.exit(1);
    }
}

// 处理中断信号
process.on('SIGINT', () => {
    log('\n\n🛑 测试被用户中断', colors.yellow);
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('\n\n🛑 测试被终止', colors.yellow);
    process.exit(0);
});

// 启动测试
if (require.main === module) {
    main().catch(error => {
        log(`❌ 启动失败: ${error.message}`, colors.red);
        console.error(error);
        process.exit(1);
    });
}

module.exports = { main };