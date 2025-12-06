#!/usr/bin/env node

/**
 * 辐射检测器注册功能测试服务器
 * 启动一个简单的HTTP服务器来测试注册功能
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// 简单的路由处理
function handleRequest(req, res) {
    let filePath = '.' + req.url;
    
    // 默认首页
    if (filePath === './') {
        filePath = './renderer/index.html';
    }
    
    // 移除查询参数
    const urlParts = filePath.split('?');
    filePath = urlParts[0];
    
    // 处理路径安全
    filePath = path.normalize(filePath);
    
    // 确保文件在项目目录内，允许访问所有相关目录
    const allowedDirs = ['./renderer', './assets', './database', './services', './protocol'];
    const isAllowed = allowedDirs.some(dir => filePath.startsWith(dir));
    
    if (!isAllowed) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

// 创建服务器
const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    handleRequest(req, res);
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║               辐射检测器注册功能测试服务器                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🌐 服务器地址: http://localhost:${PORT}                        ║
║                                                              ║
║  📋 测试说明:                                                ║
║     1. 打开浏览器访问上述地址                                 ║
║     2. 在登录界面点击"立即注册"链接                           ║
║     3. 填写注册表单并测试各项验证功能                          ║
║     4. 查看控制台了解详细日志                                 ║
║                                                              ║
║  🔍 开发者工具:                                              ║
║     - 按F12打开开发者工具                                     ║
║     - 查看Console标签页的测试结果                            ║
║     - 运行: test-registration.js 进行自动化测试               ║
║                                                              ║
║  📝 主要功能:                                                ║
║     ✓ 用户注册表单                                           ║
║     ✓ 实时表单验证                                           ║
║     ✓ 密码强度指示器                                         ║
║     ✓ 密码显示/隐藏功能                                      ║
║     ✓ 忘记密码功能                                           ║
║     ✓ 错误处理和用户反馈                                     ║
║     ✓ 无障碍支持                                            ║
║     ✓ 响应式设计                                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

🚀 服务器已启动! 按 Ctrl+C 停止服务器
    `);
});

// 处理优雅关闭
process.on('SIGINT', () => {
    console.log('\n\n🛑 正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的Promise拒绝:', reason);
});

console.log('📦 注册功能测试服务器准备就绪');