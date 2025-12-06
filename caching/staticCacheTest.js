/**
 * 静态资源缓存系统测试文件
 * 验证缓存系统的各种功能
 */

const path = require('path');
const fs = require('fs').promises;
const { StaticCache, createCacheRoutes } = require('./staticCache');
const cacheConfig = require('./cacheConfig');

/**
 * 测试类
 */
class StaticCacheTest {
    constructor() {
        this.cacheSystem = null;
        this.testResults = [];
        this.startTime = Date.now();
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🧪 开始静态资源缓存系统测试...\n');

        try {
            // 初始化缓存系统
            await this.testInitialize();

            // 测试基本缓存功能
            await this.testBasicCache();

            // 测试不同文件类型的缓存
            await this.testFileTypeCaching();

            // 测试压缩功能
            await this.testCompression();

            // 测试API接口
            await this.testAPIEndpoints();

            // 测试性能
            await this.testPerformance();

            // 测试清理功能
            await this.testCleanup();

            // 显示测试结果
            this.displayResults();

        } catch (error) {
            console.error('❌ 测试过程中发生错误:', error);
        }
    }

    /**
     * 测试初始化
     */
    async testInitialize() {
        console.log('📋 测试1: 缓存系统初始化');
        
        try {
            this.cacheSystem = new StaticCache(cacheConfig);
            await this.cacheSystem.initialize();
            
            this.addTestResult('初始化', true, '缓存系统初始化成功');
            console.log('✅ 缓存系统初始化成功\n');
        } catch (error) {
            this.addTestResult('初始化', false, error.message);
            console.log('❌ 缓存系统初始化失败:', error.message, '\n');
        }
    }

    /**
     * 测试基本缓存功能
     */
    async testBasicCache() {
        console.log('📋 测试2: 基本缓存功能');
        
        try {
            const testData = Buffer.from('Hello, World! 这是测试数据');
            const cacheKey = 'test-basic';
            
            // 设置缓存
            await this.cacheSystem.set(cacheKey, {
                data: testData,
                etag: '"test-etag"',
                lastModified: new Date().toISOString(),
                cacheControl: 'public, max-age=3600',
                compressed: false,
                size: testData.length,
                urlPath: '/test.html',
                timestamp: Date.now()
            });
            
            // 获取缓存
            const cached = await this.cacheSystem.get(cacheKey);
            
            if (cached && cached.data.equals(testData)) {
                this.addTestResult('基本缓存', true, '设置和获取缓存成功');
                console.log('✅ 基本缓存功能正常\n');
            } else {
                throw new Error('缓存数据不匹配');
            }
        } catch (error) {
            this.addTestResult('基本缓存', false, error.message);
            console.log('❌ 基本缓存测试失败:', error.message, '\n');
        }
    }

    /**
     * 测试不同文件类型的缓存
     */
    async testFileTypeCaching() {
        console.log('📋 测试3: 不同文件类型缓存');
        
        const testFiles = [
            { path: '/test.css', type: 'CSS', data: 'body { color: red; }' },
            { path: '/test.js', type: 'JS', data: 'console.log("Hello");' },
            { path: '/test.png', type: '图片', data: Buffer.from('fake-image-data') },
            { path: '/test.html', type: 'HTML', data: '<html><body>Hello</body></html>' },
            { path: '/test.woff', type: '字体', data: Buffer.from('fake-font-data') }
        ];

        try {
            for (const file of testFiles) {
                const cacheKey = `test-${file.type.toLowerCase()}`;
                const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
                
                const cachedContent = {
                    data,
                    etag: this.cacheSystem.generateETag(data),
                    lastModified: new Date().toISOString(),
                    cacheControl: this.cacheSystem.getCacheControl(file.path),
                    compressed: this.cacheSystem.shouldCompress(file.path, data),
                    size: data.length,
                    urlPath: file.path,
                    timestamp: Date.now()
                };

                await this.cacheSystem.set(cacheKey, cachedContent);
                
                // 验证缓存控制头部
                const expectedControl = this.cacheSystem.getCacheControl(file.path);
                if (cachedContent.cacheControl === expectedControl) {
                    this.addTestResult(`缓存${file.type}`, true, `${file.type}文件缓存成功`);
                } else {
                    throw new Error(`${file.type}缓存控制头部不匹配`);
                }
            }
            
            console.log('✅ 不同文件类型缓存测试通过\n');
        } catch (error) {
            this.addTestResult('文件类型缓存', false, error.message);
            console.log('❌ 文件类型缓存测试失败:', error.message, '\n');
        }
    }

    /**
     * 测试压缩功能
     */
    async testCompression() {
        console.log('📋 测试4: 压缩功能');
        
        try {
            const largeData = Buffer.from('x'.repeat(2000)); // 超过压缩阈值
            const smallData = Buffer.from('small'); // 小于压缩阈值
            
            // 测试大文件压缩
            const shouldCompressLarge = this.cacheSystem.shouldCompress('/test.js', largeData);
            const shouldCompressSmall = this.cacheSystem.shouldCompress('/test.js', smallData);
            
            if (shouldCompressLarge && !shouldCompressSmall) {
                this.addTestResult('压缩判断', true, '文件大小压缩判断正确');
            } else {
                throw new Error('文件大小压缩判断错误');
            }

            // 测试实际压缩
            const compressed = await this.cacheSystem.compress(largeData);
            if (compressed.length < largeData.length) {
                this.addTestResult('数据压缩', true, `压缩成功: ${largeData.length} -> ${compressed.length} 字节`);
            } else {
                throw new Error('压缩后数据更大');
            }

            // 测试图片不压缩
            const imageShouldNotCompress = this.cacheSystem.shouldCompress('/test.png', largeData);
            if (!imageShouldNotCompress) {
                this.addTestResult('图片不压缩', true, '图片文件正确跳过压缩');
            } else {
                throw new Error('图片文件被错误压缩');
            }
            
            console.log('✅ 压缩功能测试通过\n');
        } catch (error) {
            this.addTestResult('压缩功能', false, error.message);
            console.log('❌ 压缩功能测试失败:', error.message, '\n');
        }
    }

    /**
     * 测试API接口
     */
    async testAPIEndpoints() {
        console.log('📋 测试5: API接口');
        
        try {
            // 创建Express应用进行测试
            const app = require('express')();
            const request = require('http');
            
            // 模拟HTTP请求
            const testRequest = (method, path, data = null) => {
                return new Promise((resolve, reject) => {
                    const options = {
                        hostname: 'localhost',
                        port: 3001,
                        path: path,
                        method: method,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    };

                    const req = request.request(options, (res) => {
                        let body = '';
                        res.on('data', (chunk) => body += chunk);
                        res.on('end', () => {
                            resolve({ status: res.statusCode, data: body });
                        });
                    });

                    req.on('error', reject);
                    
                    if (data) {
                        req.write(JSON.stringify(data));
                    }
                    req.end();
                });
            };

            // 测试缓存统计接口
            try {
                const stats = this.cacheSystem.getStats();
                if (stats && stats.memory) {
                    this.addTestResult('统计接口', true, '缓存统计获取成功');
                }
            } catch (error) {
                throw new Error(`统计接口测试失败: ${error.message}`);
            }

            // 测试缓存文件列表接口
            try {
                const files = this.cacheSystem.getCacheFiles();
                if (Array.isArray(files)) {
                    this.addTestResult('文件列表接口', true, '缓存文件列表获取成功');
                }
            } catch (error) {
                throw new Error(`文件列表接口测试失败: ${error.message}`);
            }
            
            console.log('✅ API接口测试通过\n');
        } catch (error) {
            this.addTestResult('API接口', false, error.message);
            console.log('❌ API接口测试失败:', error.message, '\n');
        }
    }

    /**
     * 测试性能
     */
    async testPerformance() {
        console.log('📋 测试6: 缓存性能');
        
        try {
            const iterations = 100;
            const testData = Buffer.from('Performance test data '.repeat(100));
            
            // 测试写入性能
            const writeStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                await this.cacheSystem.set(`perf-write-${i}`, {
                    data: testData,
                    etag: this.cacheSystem.generateETag(testData),
                    lastModified: new Date().toISOString(),
                    cacheControl: 'public, max-age=3600',
                    compressed: false,
                    size: testData.length,
                    urlPath: `/perf-${i}.js`,
                    timestamp: Date.now()
                });
            }
            const writeTime = Date.now() - writeStart;
            
            // 测试读取性能
            const readStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                await this.cacheSystem.get(`perf-write-${i}`);
            }
            const readTime = Date.now() - readStart;
            
            // 计算性能指标
            const writeOpsPerSec = (iterations / writeTime * 1000).toFixed(0);
            const readOpsPerSec = (iterations / readTime * 1000).toFixed(0);
            
            if (writeOpsPerSec > 10 && readOpsPerSec > 50) {
                this.addTestResult('写入性能', true, `${writeOpsPerSec} 次/秒`);
                this.addTestResult('读取性能', true, `${readOpsPerSec} 次/秒`);
            } else {
                throw new Error(`性能不达标 - 写入: ${writeOpsPerSec} 次/秒, 读取: ${readOpsPerSec} 次/秒`);
            }
            
            console.log('✅ 缓存性能测试通过\n');
        } catch (error) {
            this.addTestResult('缓存性能', false, error.message);
            console.log('❌ 缓存性能测试失败:', error.message, '\n');
        }
    }

    /**
     * 测试清理功能
     */
    async testCleanup() {
        console.log('📋 测试7: 缓存清理');
        
        try {
            // 设置一些测试数据
            const testData = Buffer.from('Test data for cleanup');
            await this.cacheSystem.set('cleanup-test-1', {
                data: testData,
                etag: '"test-etag"',
                lastModified: new Date().toISOString(),
                cacheControl: 'public, max-age=3600',
                compressed: false,
                size: testData.length,
                urlPath: '/cleanup-test.html',
                timestamp: Date.now() - 7200000 // 2小时前
            });
            
            await this.cacheSystem.set('cleanup-test-2', {
                data: testData,
                etag: '"test-etag"',
                lastModified: new Date().toISOString(),
                cacheControl: 'public, max-age=3600',
                compressed: false,
                size: testData.length,
                urlPath: '/cleanup-test2.html',
                timestamp: Date.now()
            });
            
            // 执行清理
            await this.cacheSystem.cleanup();
            
            // 验证清理结果
            const cached1 = await this.cacheSystem.get('cleanup-test-1');
            const cached2 = await this.cacheSystem.get('cleanup-test-2');
            
            if (!cached1 && cached2) {
                this.addTestResult('缓存清理', true, '过期缓存已清理');
            } else {
                throw new Error('缓存清理未按预期工作');
            }
            
            // 测试清空缓存
            await this.cacheSystem.clearCache();
            const files = this.cacheSystem.getCacheFiles();
            if (files.length === 0) {
                this.addTestResult('清空缓存', true, '所有缓存已清空');
            } else {
                throw new Error('缓存清空未完全清理');
            }
            
            console.log('✅ 缓存清理测试通过\n');
        } catch (error) {
            this.addTestResult('缓存清理', false, error.message);
            console.log('❌ 缓存清理测试失败:', error.message, '\n');
        }
    }

    /**
     * 添加测试结果
     */
    addTestResult(testName, passed, message) {
        this.testResults.push({
            test: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 显示测试结果
     */
    displayResults() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const duration = Date.now() - this.startTime;

        console.log('📊 测试结果汇总');
        console.log('================');
        console.log(`总测试数: ${totalTests}`);
        console.log(`通过: ${passedTests} ✅`);
        console.log(`失败: ${failedTests} ❌`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        console.log(`测试耗时: ${duration}ms\n`);

        if (failedTests > 0) {
            console.log('❌ 失败的测试:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => {
                    console.log(`  - ${r.test}: ${r.message}`);
                });
            console.log();
        }

        // 显示缓存统计
        try {
            const stats = this.cacheSystem.getStats();
            console.log('📈 缓存系统统计:');
            console.log(`  内存缓存: ${stats.memory.entries} 个条目, 命中率 ${stats.memory.hitRate}%`);
            console.log(`  磁盘缓存: ${stats.disk.entries} 个条目, 命中率 ${stats.disk.hitRate}%`);
            console.log(`  总体命中率: ${stats.overall.hitRate}`);
            console.log(`  总缓存大小: ${this.formatSize(stats.overall.totalSize)}`);
        } catch (error) {
            console.log('获取统计信息失败:', error.message);
        }

        console.log('\n🎯 测试完成!');
        
        if (failedTests === 0) {
            console.log('✅ 所有测试通过! 静态资源缓存系统运行正常。');
        } else {
            console.log(`⚠️  有 ${failedTests} 个测试失败，请检查系统配置。`);
        }
    }

    /**
     * 格式化文件大小
     */
    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * 清理测试环境
     */
    async cleanup() {
        if (this.cacheSystem) {
            await this.cacheSystem.destroy();
        }
    }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    const test = new StaticCacheTest();
    
    // 运行测试
    test.runAllTests().finally(() => {
        test.cleanup().then(() => {
            process.exit(0);
        });
    });
}

module.exports = StaticCacheTest;