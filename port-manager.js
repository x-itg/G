#!/usr/bin/env node

/**
 * 端口检查和冲突解决工具
 * Port Check and Conflict Resolution Tool
 * 
 * 检查所需端口是否可用，解决端口冲突问题
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

class PortManager {
    constructor() {
        this.config = this.loadPortConfig();
        this.portStatus = new Map();
    }

    loadPortConfig() {
        const configPath = path.join(__dirname, 'config', 'port-config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        return {
            ports: {
                frontend: { port: 3001, description: '前端服务端口' },
                backend: { port: 3000, description: '后端服务端口' }
            }
        };
    }

    async checkPort(port, host = 'localhost') {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.listen(port, host, () => {
                server.once('close', () => {
                    resolve({ port, available: true, host });
                });
                server.close();
            });
            
            server.on('error', () => {
                resolve({ port, available: false, host });
            });
        });
    }

    async checkAllPorts() {
        console.log('🔍 检查端口可用性...\n');
        
        const ports = this.config.ports;
        const results = {};
        
        for (const [service, config] of Object.entries(ports)) {
            if (config.port && config.port > 0) {
                console.log(`检查 ${service} (端口 ${config.port})...`);
                const result = await this.checkPort(config.port, this.config.host?.default || 'localhost');
                results[service] = result;
                this.portStatus.set(service, result);
                
                if (result.available) {
                    console.log(`✅ 端口 ${config.port} 可用`);
                } else {
                    console.log(`❌ 端口 ${config.port} 被占用`);
                }
            }
        }
        
        return results;
    }

    async findAvailablePort(startPort, maxAttempts = 100) {
        for (let i = 0; i < maxAttempts; i++) {
            const port = startPort + i;
            const result = await this.checkPort(port);
            if (result.available) {
                return port;
            }
        }
        throw new Error(`无法找到可用端口 (从 ${startPort} 开始搜索 ${maxAttempts} 个端口)`);
    }

    async resolveConflicts() {
        const conflicts = [];
        const resolutions = [];
        
        for (const [service, result] of this.portStatus) {
            if (!result.available) {
                conflicts.push(service);
                
                // 尝试找到替代端口
                const originalPort = this.config.ports[service].port;
                const newPort = await this.findAvailablePort(originalPort + 1000);
                
                resolutions.push({
                    service: service,
                    originalPort: originalPort,
                    newPort: newPort,
                    reason: `端口 ${originalPort} 被占用`
                });
                
                // 更新配置
                this.config.ports[service].port = newPort;
                this.config.ports[service].resolvedPort = true;
            }
        }
        
        if (conflicts.length > 0) {
            console.log('\n⚠️ 发现端口冲突，正在解决...');
            
            resolutions.forEach(resolution => {
                console.log(`📋 ${resolution.service}: ${resolution.originalPort} → ${resolution.newPort} (${resolution.reason})`);
            });
            
            // 保存更新后的配置
            this.savePortConfig();
            console.log('\n✅ 端口配置已更新');
        }
        
        return { conflicts, resolutions };
    }

    savePortConfig() {
        const configPath = path.join(__dirname, 'config', 'port-config.json');
        const backupPath = configPath + '.backup';
        
        // 备份原配置
        if (fs.existsSync(configPath)) {
            fs.copyFileSync(configPath, backupPath);
            console.log(`📦 原配置已备份到: ${backupPath}`);
        }
        
        // 添加时间戳和冲突解决信息
        this.config.updatedAt = new Date().toISOString();
        this.config.resolutionReason = '端口冲突自动解决';
        
        fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
        console.log(`💾 新配置已保存到: ${configPath}`);
    }

    getPortUrls() {
        const urls = {};
        const baseUrl = `http://${this.config.host?.default || 'localhost'}`;
        
        for (const [service, config] of Object.entries(this.config.ports)) {
            if (config.port && config.port > 0) {
                if (service === 'backend') {
                    urls[service] = `${baseUrl}:${config.port}`;
                } else if (service === 'frontend') {
                    urls[service] = `${baseUrl}:${config.port}`;
                } else if (service === 'electron') {
                    urls[service] = `electron://local`;
                }
            }
        }
        
        return urls;
    }

    async testConnections() {
        console.log('\n🌐 测试服务连接...\n');
        
        const urls = this.getPortUrls();
        const results = {};
        
        for (const [service, url] of Object.entries(urls)) {
            if (url.startsWith('http://')) {
                console.log(`测试 ${service}: ${url}`);
                
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        console.log(`✅ ${service} 连接成功 (状态: ${response.status})`);
                        results[service] = { status: 'success', code: response.status };
                    } else {
                        console.log(`⚠️ ${service} 响应异常 (状态: ${response.status})`);
                        results[service] = { status: 'warning', code: response.status };
                    }
                } catch (error) {
                    console.log(`❌ ${service} 连接失败: ${error.message}`);
                    results[service] = { status: 'error', error: error.message };
                }
            }
        }
        
        return results;
    }

    generatePortReport() {
        const urls = this.getPortUrls();
        
        console.log('\n📊 端口配置报告');
        console.log('='.repeat(50));
        
        for (const [service, config] of Object.entries(this.config.ports)) {
            const status = this.portStatus.get(service);
            const statusIcon = status?.available ? '✅' : '❌';
            const url = urls[service] || 'N/A';
            
            console.log(`${statusIcon} ${service.toUpperCase()}:`);
            console.log(`   端口: ${config.port} (${config.description || '未描述'})`);
            console.log(`   URL:  ${url}`);
            if (config.resolvedPort) {
                console.log(`   状态: 端口冲突已解决`);
            }
            console.log('');
        }
        
        console.log('🔧 可用命令:');
        console.log('   npm run check-ports    - 检查端口状态');
        console.log('   npm run start-api      - 启动API服务');
        console.log('   npm run start-frontend - 启动前端服务');
        console.log('   npm run start-dev      - 启动完整开发环境');
    }

    async run() {
        console.log('🚀 端口管理器启动\n');
        
        try {
            // 1. 检查所有端口
            await this.checkAllPorts();
            
            // 2. 解决冲突
            const { conflicts, resolutions } = await this.resolveConflicts();
            
            // 3. 显示最终配置
            this.generatePortReport();
            
            // 4. 测试连接(如果配置中有有效URL)
            try {
                await this.testConnections();
            } catch (error) {
                console.log('⚠️ 连接测试跳过:', error.message);
            }
            
            if (conflicts.length === 0) {
                console.log('\n🎉 所有端口配置正常，无需调整！');
                return true;
            } else {
                console.log(`\n✅ 已解决 ${conflicts.length} 个端口冲突`);
                return true;
            }
            
        } catch (error) {
            console.error('❌ 端口管理失败:', error.message);
            return false;
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const portManager = new PortManager();
    portManager.run().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = PortManager;
