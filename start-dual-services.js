#!/usr/bin/env node

/**
 * 前后端服务同时启动脚本
 * Frontend and Backend Service Launcher
 * 
 * 这个脚本同时启动Electron前端应用和后端API服务，
 * 确保它们可以正常通信。
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

class DualServiceLauncher {
    constructor() {
        this.frontendProcess = null;
        this.backendProcess = null;
        this.electronProcess = null;
        
        this.config = this.loadConfig();
        this.isShuttingDown = false;
        
        this.setupGracefulShutdown();
        this.launchServices();
    }

    loadConfig() {
        const configPath = path.join(__dirname, 'config', 'electron-config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        return {
            api: {
                backend_port: 3000,
                frontend_port: 3001
            },
            electron: {
                main: 'main-enhanced.js'
            }
        };
    }

    setupGracefulShutdown() {
        process.on('SIGINT', () => this.shutdown('SIGINT'));
        process.on('SIGTERM', () => this.shutdown('SIGTERM'));
        process.on('exit', () => this.shutdown('exit'));
        
        process.on('uncaughtException', (error) => {
            console.error('未捕获的异常:', error);
            this.shutdown('uncaughtException');
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('未处理的Promise拒绝:', reason);
            this.shutdown('unhandledRejection');
        });
    }

    async launchServices() {
        console.log('🚀 启动前后端服务...\n');
        
        try {
            // 1. 启动后端API服务
            await this.startBackendService();
            
            // 2. 启动前端Web服务
            await this.startFrontendService();
            
            // 3. 等待服务就绪
            await this.waitForServices();
            
            // 4. 启动Electron应用
            await this.startElectronApp();
            
            console.log('\n✅ 所有服务启动完成!');
            console.log(`📡 API服务: http://localhost:${this.config.api.backend_port}`);
            console.log(`🌐 前端服务: http://localhost:${this.config.api.frontend_port}`);
            console.log(`🖥️ Electron应用: 本地桌面应用`);
            console.log('\n按 Ctrl+C 停止所有服务\n');
            
        } catch (error) {
            console.error('❌ 服务启动失败:', error.message);
            this.shutdown('startup_failed');
        }
    }

    startBackendService() {
        return new Promise((resolve, reject) => {
            console.log('🔧 启动后端API服务...');
            
            const backendPath = path.join(__dirname, 'api-server.js');
            
            // 如果没有api-server.js，创建默认的
            if (!fs.existsSync(backendPath)) {
                this.createDefaultApiServer();
            }
            
            this.backendProcess = spawn('node', [backendPath], {
                env: { ...process.env, PORT: this.config.api.backend_port },
                stdio: 'pipe'
            });
            
            this.backendProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                console.log(`[API] ${output}`);
                if (output.includes('listening') || output.includes('server running')) {
                    resolve();
                }
            });
            
            this.backendProcess.stderr.on('data', (data) => {
                console.error(`[API ERROR] ${data.toString().trim()}`);
            });
            
            this.backendProcess.on('error', (error) => {
                reject(new Error(`后端服务启动失败: ${error.message}`));
            });
            
            this.backendProcess.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`[API] 进程退出，代码: ${code}`);
                }
            });
            
            // 超时检查
            setTimeout(() => {
                if (this.backendProcess && !this.backendProcess.killed) {
                    console.log('[API] 启动超时，但继续...');
                    resolve();
                }
            }, 10000);
        });
    }

    createDefaultApiServer() {
        const apiServerCode = `
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'renderer')));

// API路由
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'radiation-detector-api'
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        frontend: 'http://localhost:3001',
        electron: '桌面应用',
        database: '已连接',
        version: '1.0.0'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(\`🚀 API服务运行在端口 \${PORT}\`);
    console.log(\`📡 健康检查: http://localhost:\${PORT}/api/health\`);
});
`;
        
        fs.writeFileSync(path.join(__dirname, 'api-server.js'), apiServerCode);
        console.log('📝 已创建默认API服务器');
    }

    startFrontendService() {
        return new Promise((resolve, reject) => {
            console.log('🌐 启动前端Web服务...');
            
            // 创建简单的HTTP服务器来提供静态文件
            this.frontendProcess = spawn('node', ['-e', `
                const http = require('http');
                const fs = require('fs');
                const path = require('path');
                
                const PORT = ${this.config.api.frontend_port};
                const rendererDir = path.join(__dirname, 'renderer');
                
                const server = http.createServer((req, res) => {
                    let filePath = path.join(rendererDir, req.url === '/' ? 'index.html' : req.url);
                    
                    const ext = path.extname(filePath);
                    const contentTypes = {
                        '.html': 'text/html',
                        '.js': 'text/javascript',
                        '.css': 'text/css',
                        '.json': 'application/json',
                        '.png': 'image/png',
                        '.jpg': 'image/jpg'
                    };
                    
                    const contentType = contentTypes[ext] || 'text/plain';
                    
                    fs.readFile(filePath, (error, content) => {
                        if (error) {
                            if (error.code === 'ENOENT') {
                                res.writeHead(404);
                                res.end('文件未找到');
                            } else {
                                res.writeHead(500);
                                res.end('服务器错误: ' + error.code);
                            }
                        } else {
                            res.writeHead(200, { 'Content-Type': contentType });
                            res.end(content, 'utf-8');
                        }
                    });
                });
                
                server.listen(PORT, () => {
                    console.log(\`🌐 前端服务运行在端口 \${PORT}\`);
                    console.log(\`📄 访问地址: http://localhost:\${PORT}\`);
                });
            `], {
                stdio: 'pipe'
            });
            
            this.frontendProcess.stdout.on('data', (data) => {
                console.log(`[FRONTEND] ${data.toString().trim()}`);
                if (data.toString().includes('前端服务运行')) {
                    resolve();
                }
            });
            
            this.frontendProcess.stderr.on('data', (data) => {
                console.error(`[FRONTEND ERROR] ${data.toString().trim()}`);
            });
            
            this.frontendProcess.on('error', (error) => {
                reject(new Error(`前端服务启动失败: ${error.message}`));
            });
            
            // 超时检查
            setTimeout(() => {
                if (this.frontendProcess && !this.frontendProcess.killed) {
                    console.log('[FRONTEND] 启动超时，但继续...');
                    resolve();
                }
            }, 5000);
        });
    }

    async waitForServices() {
        console.log('⏳ 等待服务就绪...');
        
        const maxAttempts = 30;
        const delay = 1000;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const backendHealth = await this.checkService(`http://localhost:${this.config.api.backend_port}/api/health`);
                const frontendHealth = await this.checkService(`http://localhost:${this.config.api.frontend_port}/`);
                
                if (backendHealth && frontendHealth) {
                    console.log('✅ 所有服务已就绪');
                    return;
                }
            } catch (error) {
                console.log(`⏳ 等待服务就绪 (${attempt}/${maxAttempts})...`);
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.warn('⚠️ 部分服务可能未完全就绪，但继续启动Electron');
    }

    checkService(url) {
        return new Promise((resolve) => {
            const req = http.get(url, (res) => {
                resolve(res.statusCode === 200);
            });
            
            req.on('error', () => resolve(false));
            req.setTimeout(3000, () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    startElectronApp() {
        return new Promise((resolve, reject) => {
            console.log('🖥️ 启动Electron应用...');
            
            const electronPath = require('electron');
            const mainPath = path.join(__dirname, this.config.electron.main);
            
            if (!fs.existsSync(mainPath)) {
                reject(new Error(`main文件不存在: ${mainPath}`));
                return;
            }
            
            this.electronProcess = spawn(electronPath, [mainPath], {
                env: { ...process.env, NODE_ENV: 'development' },
                stdio: 'pipe'
            });
            
            this.electronProcess.stdout.on('data', (data) => {
                console.log(`[ELECTRON] ${data.toString().trim()}`);
            });
            
            this.electronProcess.stderr.on('data', (data) => {
                console.error(`[ELECTRON ERROR] ${data.toString().trim()}`);
            });
            
            this.electronProcess.on('error', (error) => {
                reject(new Error(`Electron启动失败: ${error.message}`));
            });
            
            this.electronProcess.on('exit', (code, signal) => {
                console.log(`[ELECTRON] 进程退出 (代码: ${code}, 信号: ${signal})`);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Electron异常退出: ${code}`));
                }
            });
            
            // 等待Electron启动
            setTimeout(() => {
                if (this.electronProcess && !this.electronProcess.killed) {
                    console.log('✅ Electron应用已启动');
                    resolve();
                }
            }, 5000);
        });
    }

    shutdown(reason) {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        
        console.log(`\n🛑 正在关闭服务 (原因: ${reason})...`);
        
        const processes = [
            { name: 'Electron', process: this.electronProcess },
            { name: '前端服务', process: this.frontendProcess },
            { name: '后端服务', process: this.backendProcess }
        ];
        
        let shutdownCount = 0;
        const totalProcesses = processes.length;
        
        processes.forEach(({ name, process }) => {
            if (process && !process.killed) {
                console.log(`🔄 关闭 ${name}...`);
                
                process.on('exit', () => {
                    shutdownCount++;
                    console.log(`✅ ${name} 已关闭`);
                    
                    if (shutdownCount === totalProcesses) {
                        console.log('👋 所有服务已关闭');
                        process.exit(0);
                    }
                });
                
                process.kill('SIGTERM');
                
                // 强制终止超时
                setTimeout(() => {
                    if (!process.killed) {
                        console.log(`⚠️ 强制终止 ${name}`);
                        process.kill('SIGKILL');
                    }
                }, 5000);
            } else {
                shutdownCount++;
            }
        });
        
        // 如果没有运行的进程，直接退出
        if (shutdownCount === totalProcesses) {
            process.exit(0);
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    new DualServiceLauncher();
}

module.exports = DualServiceLauncher;
