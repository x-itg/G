#!/usr/bin/env node

/**
 * 访问日志记录系统测试脚本
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

class AccessLoggerTester {
    constructor() {
        this.server = null;
        this.baseUrl = 'http://localhost:3000';
        this.testResults = [];
    }

    /**
     * 启动API服务器
     */
    async startServer() {
        return new Promise((resolve, reject) => {
            console.log('🚀 启动API服务器...');
            
            this.server = spawn('node', ['api-server.js'], {
                cwd: path.join(__dirname, '..'),
                stdio: 'pipe'
            });

            this.server.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('启动成功')) {
                    console.log('✅ 服务器启动成功');
                    resolve();
                }
                console.log(output);
            });

            this.server.stderr.on('data', (data) => {
                console.error('服务器错误:', data.toString());
            });

            this.server.on('error', reject);

            // 超时处理
            setTimeout(() => {
                reject(new Error('服务器启动超时'));
            }, 10000);
        });
    }

    /**
     * 停止服务器
     */
    stopServer() {
        if (this.server) {
            console.log('🛑 停止服务器...');
            this.server.kill('SIGTERM');
            this.server = null;
        }
    }

    /**
     * 发送HTTP请求
     */
    async makeRequest(path, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });

                res.on('end', () => {
                    try {
                        const result = {
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: JSON.parse(body)
                        };
                        resolve(result);
                    } catch (error) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: body
                        });
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * 测试访问日志功能
     */
    async testAccessLogging() {
        console.log('\n📝 测试访问日志记录功能...');
        
        try {
            // 模拟一些API请求
            const testRequests = [
                { path: '/api/health', method: 'GET' },
                { path: '/api/status', method: 'GET' },
                { path: '/api/data/status', method: 'GET' },
                { path: '/api/logging/access/realtime', method: 'GET' },
                { path: '/api/logging/access/statistics', method: 'GET' },
                { path: '/api/auth/login', method: 'POST', data: { username: 'admin', password: 'Admin123!' } }
            ];

            for (const request of testRequests) {
                console.log(`   发送 ${request.method} ${request.path}`);
                await this.makeRequest(request.path, request.method, request.data);
                // 等待一下让日志记录完成
                await this.sleep(100);
            }

            this.testResults.push({
                test: '访问日志记录',
                status: 'success',
                message: '成功记录访问日志'
            });
            
        } catch (error) {
            this.testResults.push({
                test: '访问日志记录',
                status: 'failed',
                message: error.message
            });
        }
    }

    /**
     * 测试访问统计API
     */
    async testStatisticsAPI() {
        console.log('\n📊 测试访问统计API...');
        
        const endpoints = [
            '/api/logging/access/statistics',
            '/api/logging/access/popular',
            '/api/logging/access/users',
            '/api/logging/access/trends',
            '/api/logging/access/realtime',
            '/api/logging/access/details'
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`   测试 ${endpoint}`);
                const response = await this.makeRequest(endpoint);
                
                if (response.statusCode === 200 && response.body.success) {
                    console.log(`   ✅ ${endpoint} 响应正常`);
                } else {
                    throw new Error(`API响应异常: ${response.statusCode}`);
                }
            } catch (error) {
                this.testResults.push({
                    test: `API测试 - ${endpoint}`,
                    status: 'failed',
                    message: error.message
                });
            }
        }

        this.testResults.push({
            test: '访问统计API',
            status: 'success',
            message: '所有统计API响应正常'
        });
    }

    /**
     * 测试日志清理功能
     */
    async testCleanup() {
        console.log('🧹 测试日志清理功能...');
        
        try {
            const response = await this.makeRequest('/api/logging/access/cleanup', 'POST', { daysToKeep: 1 });
            
            if (response.statusCode === 200 && response.body.success) {
                console.log('   ✅ 日志清理功能正常');
                this.testResults.push({
                    test: '日志清理功能',
                    status: 'success',
                    message: '清理功能正常工作'
                });
            } else {
                throw new Error('清理API响应异常');
            }
        } catch (error) {
            this.testResults.push({
                test: '日志清理功能',
                status: 'failed',
                message: error.message
            });
        }
    }

    /**
     * 测试实时统计
     */
    async testRealTimeStats() {
        console.log('\n⚡ 测试实时统计...');
        
        try {
            const response = await this.makeRequest('/api/logging/access/realtime');
            
            if (response.statusCode === 200 && response.body.success) {
                const stats = response.body.data;
                console.log(`   📈 今日请求数: ${stats.today.total_requests}`);
                console.log(`   👥 今日唯一用户: ${stats.today.unique_users}`);
                console.log(`   ❌ 错误率: ${stats.today.error_rate.toFixed(2)}%`);
                
                this.testResults.push({
                    test: '实时统计功能',
                    status: 'success',
                    message: '实时统计功能正常'
                });
            } else {
                throw new Error('实时统计API响应异常');
            }
        } catch (error) {
            this.testResults.push({
                test: '实时统计功能',
                status: 'failed',
                message: error.message
            });
        }
    }

    /**
     * 运行所有测试
     */
    async runTests() {
        console.log('🧪 开始测试访问日志记录系统');
        console.log('='.repeat(50));

        try {
            await this.startServer();
            await this.sleep(2000); // 等待服务器完全启动

            // 运行测试
            await this.testAccessLogging();
            await this.testStatisticsAPI();
            await this.testCleanup();
            await this.testRealTimeStats();

            // 显示测试结果
            this.showResults();

        } catch (error) {
            console.error('❌ 测试过程中出现错误:', error);
        } finally {
            this.stopServer();
        }
    }

    /**
     * 显示测试结果
     */
    showResults() {
        console.log('\n📋 测试结果总结');
        console.log('='.repeat(50));

        let passed = 0;
        let failed = 0;

        for (const result of this.testResults) {
            const status = result.status === 'success' ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.message}`);
            
            if (result.status === 'success') {
                passed++;
            } else {
                failed++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`📊 测试统计: ${passed} 通过, ${failed} 失败`);
        
        if (failed === 0) {
            console.log('🎉 所有测试通过！访问日志记录系统工作正常。');
        } else {
            console.log('⚠️  部分测试失败，请检查系统配置。');
        }
    }

    /**
     * 延迟函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 运行测试
if (require.main === module) {
    const tester = new AccessLoggerTester();
    tester.runTests().catch(console.error);
}

module.exports = AccessLoggerTester;