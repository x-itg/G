#!/usr/bin/env node

/**
 * 放射化学纯度检测仪验证服务器
 * 专门用于启动验证页面，提供纯度检测功能演示
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class VerificationServer {
    constructor() {
        this.PORT = 3001;
        this.rendererDir = path.join(__dirname, 'renderer');
        this.startTime = Date.now();
    }

    /**
     * 处理HTTP请求
     */
    handleRequest(req, res) {
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
        
        // CORS设置
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            // 路由处理
            if (req.url === '/' || req.url === '/index.html') {
                this.serveIndexPage(req, res);
            } else if (req.url === '/api/health') {
                this.serveHealthCheck(req, res);
            } else if (req.url === '/api/verify') {
                this.runVerification(req, res);
            } else if (req.url === '/api/demo') {
                this.serveDemoData(req, res);
            } else if (req.url.startsWith('/assets/')) {
                this.serveStaticFile(req, res);
            } else {
                this.serveNotFound(req, res);
            }
        } catch (error) {
            console.error('服务器错误:', error);
            this.serveError(req, res, error.message);
        }
    }

    /**
     * 提供验证页面（不需要登录）
     */
    serveIndexPage(req, res) {
        const indexPath = path.join(this.rendererDir, 'index.html');
        
        if (!fs.existsSync(indexPath)) {
            this.serveNotFound(req, res);
            return;
        }

        const content = fs.readFileSync(indexPath, 'utf8');
        
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
        });
        
        res.end(content);
    }

    /**
     * 健康检查API
     */
    serveHealthCheck(req, res) {
        const uptime = ((Date.now() - this.startTime) / 1000).toFixed(2);
        
        const healthData = {
            status: 'ok',
            service: '放射化学纯度检测仪验证服务',
            version: '1.0.0',
            port: this.PORT,
            uptime: `${uptime}秒`,
            timestamp: new Date().toISOString(),
            features: {
                '硅胶板色谱扫描': true,
                '碘化钠探头检测': true,
                '放射化学纯度计算': true,
                'Rf值分析': true,
                '实时数据监控': true,
                '美观界面设计': true
            },
            endpoints: {
                '验证页面': `http://localhost:${this.PORT}`,
                '健康检查': `http://localhost:${this.PORT}/api/health`,
                '运行验证': `http://localhost:${this.PORT}/api/verify`,
                '演示数据': `http://localhost:${this.PORT}/api/demo`
            }
        };

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(healthData, null, 2));
    }

    /**
     * 运行验证检查
     */
    runVerification(req, res) {
        console.log('🔍 开始运行验证检查...');
        
        const verifyScript = path.join(__dirname, 'verify-detector-homepage.js');
        
        exec(`node "${verifyScript}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('验证执行错误:', error);
                this.sendApiResponse(res, {
                    success: false,
                    error: error.message,
                    data: null
                }, 500);
                return;
            }

            const result = {
                success: true,
                timestamp: new Date().toISOString(),
                data: {
                    output: stdout,
                    errors: stderr,
                    script_path: verifyScript
                }
            };

            console.log('✅ 验证完成');
            this.sendApiResponse(res, result, 200);
        });
    }

    /**
     * 提供演示数据API
     */
    serveDemoData(req, res) {
        const demoData = {
            timestamp: new Date().toISOString(),
            detector_status: 'ready',
            scanning_parameters: {
                position_range: [0, 50],
                count_rate_range: [0, 5000],
                scan_speed: 2.0,
                resolution: 0.5
            },
            sample_info: {
                sample_type: '99mTc-MIBI',
                spot_position: 5.0,
                front_position: 45.0,
                expected_purity: 95.2
            },
            latest_reading: {
                position: 25.3,
                count_rate: 3420,
                timestamp: new Date().toISOString(),
                quality: 'good'
            }
        };

        this.sendApiResponse(res, demoData, 200);
    }

    /**
     * 提供静态文件服务
     */
    serveStaticFile(req, res) {
        const filePath = path.join(this.rendererDir, req.url);
        
        if (!fs.existsSync(filePath)) {
            this.serveNotFound(req, res);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.txt': 'text/plain; charset=utf-8'
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';
        
        try {
            const content = fs.readFileSync(filePath);
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            });
            res.end(content);
        } catch (error) {
            this.serveError(req, res, error.message);
        }
    }

    /**
     * 404处理
     */
    serveNotFound(req, res) {
        const notFoundHtml = `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <title>页面未找到 - 放射化学纯度检测仪验证服务</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin: 50px; background: #f5f7fa; }
                    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                    h1 { color: #667eea; }
                    .back-link { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
                    .back-link:hover { background: #5a67d8; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>404 - 页面未找到</h1>
                    <p>请求的资源 ${req.url} 不存在。</p>
                    <a href="/" class="back-link">返回验证页面</a>
                    <hr style="margin: 30px 0;">
                    <h3>可用的API端点:</h<ul style="text3>
                    -align: left;">
                        <li><a href="/api/health">/api/health</a> - 健康检查</li>
                        <li><a href="/api/verify">/api/verify</a> - 运行验证</li>
                        <li><a href="/api/demo">/api/demo</a> - 演示数据</li>
                    </ul>
                </div>
            </body>
            </html>
        `;

        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(notFoundHtml);
    }

    /**
     * 错误处理
     */
    serveError(req, res, errorMessage) {
        const errorHtml = `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <title>服务器错误 - 放射化学纯度检测仪验证服务</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin: 50px; background: #f5f7fa; }
                    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                    h1 { color: #dc3545; }
                    .error-details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; font-family: monospace; }
                    .back-link { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>500 - 服务器内部错误</h1>
                    <div class="error-details">${errorMessage}</div>
                    <a href="/" class="back-link">返回验证页面</a>
                </div>
            </body>
            </html>
        `;

        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(errorHtml);
    }

    /**
     * 发送API响应
     */
    sendApiResponse(res, data, statusCode = 200) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data, null, 2));
    }

    /**
     * 启动服务器
     */
    start() {
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        server.listen(this.PORT, () => {
            console.log('='.repeat(60));
            console.log('   放射化学纯度检测仪验证服务');
            console.log('='.repeat(60));
            console.log(`🚀 验证服务运行在端口: ${this.PORT}`);
            console.log(`🌐 验证页面: http://localhost:${this.PORT}`);
            console.log(`📡 健康检查: http://localhost:${this.PORT}/api/health`);
            console.log(`🔍 运行验证: http://localhost:${this.PORT}/api/verify`);
            console.log(`📊 演示数据: http://localhost:${this.PORT}/api/demo`);
            console.log('='.repeat(60));
            console.log('✅ 放射化学纯度检测功能演示已就绪');
            console.log('💡 无需登录，直接体验检测功能');
            console.log('='.repeat(60));
            console.log('按 Ctrl+C 停止服务器\n');
        });

        // 优雅关闭处理
        process.on('SIGINT', () => {
            console.log('\n🛑 正在关闭验证服务器...');
            server.close(() => {
                console.log('✅ 验证服务器已关闭');
                process.exit(0);
            });
        });

        return server;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const verificationServer = new VerificationServer();
    verificationServer.start();
}

module.exports = VerificationServer;