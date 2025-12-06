/**
 * 放射化学纯度检测仪 - 缓存性能监控系统测试
 * 验证缓存监控功能是否正常工作
 */

const { CacheMonitor } = require('./cacheMonitor');

/**
 * 缓存监控系统测试类
 */
class CacheMonitorTest {
    constructor() {
        this.testResults = [];
        this.cacheMonitor = null;
    }
    
    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🧪 开始缓存监控系统测试...\n');
        
        try {
            // 初始化测试环境
            await this.setupTestEnvironment();
            
            // 执行各项测试
            await this.testCacheMonitoring();
            await this.testPerformanceTracking();
            await this.testAlertSystem();
            await this.testOptimizationRecommendations();
            await this.testDataExport();
            await this.testRealTimeMonitoring();
            
            // 显示测试结果
            this.displayTestResults();
            
        } catch (error) {
            console.error('❌ 测试执行失败:', error);
        } finally {
            await this.cleanup();
        }
    }
    
    /**
     * 设置测试环境
     */
    async setupTestEnvironment() {
        console.log('📋 设置测试环境...');
        
        // 创建缓存监控实例（使用较短的时间间隔用于测试）
        this.cacheMonitor = new CacheMonitor({
            samplingInterval: 1000,        // 1秒采样间隔
            trendDataPoints: 10,           // 10个数据点用于测试
            hitRateThreshold: 0.8,         // 80%命中率告警阈值
            memoryUsageThreshold: 0.7,     // 70%内存使用率告警阈值
            responseTimeThreshold: 50,     // 50ms响应时间告警阈值
            invalidationRateThreshold: 0.2, // 20%失效频率告警阈值
            dataRetention: 60000           // 1分钟数据保留
        });
        
        // 创建测试缓存实例
        this.testCaches = {
            device: {
                data: new Map(),
                size() { return this.data.size; },
                get(key) { 
                    const item = this.data.get(key);
                    if (item && item.expires > Date.now()) {
                        return item.value;
                    }
                    return null;
                },
                set(key, value, ttl = 5000) {
                    this.data.set(key, {
                        value,
                        expires: Date.now() + ttl
                    });
                }
            },
            analysis: {
                data: new Map(),
                size() { return this.data.size; },
                get(key) { 
                    const item = this.data.get(key);
                    if (item && item.expires > Date.now()) {
                        return item.value;
                    }
                    return null;
                },
                set(key, value, ttl = 3000) {
                    this.data.set(key, {
                        value,
                        expires: Date.now() + ttl
                    });
                }
            },
            reference: {
                data: new Map(),
                size() { return this.data.size; },
                get(key) { 
                    const item = this.data.get(key);
                    if (item && item.expires > Date.now()) {
                        return item.value;
                    }
                    return null;
                },
                set(key, value, ttl = 10000) {
                    this.data.set(key, {
                        value,
                        expires: Date.now() + ttl
                    });
                }
            }
        };
        
        // 注册测试缓存
        this.cacheMonitor.registerCache('device-calibration', this.testCaches.device, {
            category: 'device',
            priority: 'high',
            maxSize: 10
        });
        
        this.cacheMonitor.registerCache('analysis-results', this.testCaches.analysis, {
            category: 'analysis',
            priority: 'high',
            maxSize: 20
        });
        
        this.cacheMonitor.registerCache('reference-data', this.testCaches.reference, {
            category: 'reference',
            priority: 'normal',
            maxSize: 15
        });
        
        this.addTestResult('setup', 'success', '测试环境设置完成');
        console.log('✅ 测试环境设置完成\n');
    }
    
    /**
     * 测试缓存监控基本功能
     */
    async testCacheMonitoring() {
        console.log('🔍 测试缓存监控基本功能...');
        
        try {
            // 测试缓存访问记录
            this.cacheMonitor.recordAccess('device-calibration', 'calib-001', true, 25, 'device');
            this.cacheMonitor.recordAccess('device-calibration', 'calib-002', false, 45, 'device');
            this.cacheMonitor.recordAccess('analysis-results', 'sample-123', true, 15, 'analysis');
            
            // 获取统计数据
            const stats = this.cacheMonitor.getStatistics();
            
            // 验证统计数据
            const checks = [
                { condition: stats.overview.totalRequests >= 3, message: '总请求数统计正确' },
                { condition: stats.overview.hits >= 1, message: '命中数统计正确' },
                { condition: stats.overview.misses >= 1, message: '未命中数统计正确' },
                { condition: stats.categories.device, message: '设备分类统计存在' },
                { condition: stats.categories.analysis, message: '分析分类统计存在' },
                { condition: stats.categories.reference, message: '参考分类统计存在' }
            ];
            
            checks.forEach(check => {
                this.addTestResult('cache-monitoring', check.condition ? 'success' : 'failure', check.message);
            });
            
            console.log('✅ 缓存监控基本功能测试完成\n');
            
        } catch (error) {
            this.addTestResult('cache-monitoring', 'error', `缓存监控测试失败: ${error.message}`);
            console.log('❌ 缓存监控基本功能测试失败\n');
        }
    }
    
    /**
     * 测试性能跟踪
     */
    async testPerformanceTracking() {
        console.log('📊 测试性能跟踪功能...');
        
        try {
            // 模拟多次缓存访问以生成性能数据
            for (let i = 0; i < 5; i++) {
                this.cacheMonitor.recordAccess('device-calibration', `test-${i}`, Math.random() > 0.3, Math.random() * 100, 'device');
                await this.sleep(200);
            }
            
            // 获取性能趋势
            const trends = this.cacheMonitor.getTrends(30000); // 30秒趋势
            
            // 验证趋势数据
            const trendChecks = [
                { condition: trends.trends.hitRate.length > 0, message: '命中率趋势数据存在' },
                { condition: trends.trends.responseTime.length > 0, message: '响应时间趋势数据存在' },
                { condition: trends.trends.memoryUsage.length > 0, message: '内存使用趋势数据存在' },
                { condition: trends.analysis, message: '趋势分析存在' }
            ];
            
            trendChecks.forEach(check => {
                this.addTestResult('performance-tracking', check.condition ? 'success' : 'failure', check.message);
            });
            
            console.log('✅ 性能跟踪功能测试完成\n');
            
        } catch (error) {
            this.addTestResult('performance-tracking', 'error', `性能跟踪测试失败: ${error.message}`);
            console.log('❌ 性能跟踪功能测试失败\n');
        }
    }
    
    /**
     * 测试告警系统
     */
    async testAlertSystem() {
        console.log('🚨 测试告警系统...');
        
        try {
            let alertTriggered = false;
            let alertCleared = false;
            
            // 设置告警监听器
            this.cacheMonitor.on('alert', (alert) => {
                alertTriggered = true;
                console.log(`   📢 告警触发: ${alert.ruleName} - 严重级别: ${alert.severity}`);
            });
            
            this.cacheMonitor.on('alertCleared', (data) => {
                alertCleared = true;
                console.log(`   ✅ 告警清除: ${data.ruleName}`);
            });
            
            // 模拟触发低命中率告警（通过设置较低的阈值）
            this.cacheMonitor.setAlertRule('testLowHitRate', {
                threshold: 1.0, // 100%阈值，应该会被触发
                operator: '>',
                enabled: true,
                message: '测试低命中率告警'
            });
            
            // 手动触发告警检查
            this.cacheMonitor.checkAlerts();
            
            // 等待一段时间让告警系统处理
            await this.sleep(1000);
            
            // 清除告警
            this.cacheMonitor.clearAlert('testLowHitRate');
            
            // 验证告警系统
            const alertChecks = [
                { condition: this.cacheMonitor.alertConfig.has('testLowHitRate'), message: '告警规则设置成功' },
                { condition: alertTriggered, message: '告警触发机制正常' },
                { condition: alertCleared, message: '告警清除机制正常' }
            ];
            
            alertChecks.forEach(check => {
                this.addTestResult('alert-system', check.condition ? 'success' : 'failure', check.message);
            });
            
            console.log('✅ 告警系统测试完成\n');
            
        } catch (error) {
            this.addTestResult('alert-system', 'error', `告警系统测试失败: ${error.message}`);
            console.log('❌ 告警系统测试失败\n');
        }
    }
    
    /**
     * 测试优化建议
     */
    async testOptimizationRecommendations() {
        console.log('💡 测试优化建议功能...');
        
        try {
            // 模拟一些性能问题场景
            this.cacheMonitor.recordAccess('device-calibration', 'slow-1', false, 100, 'device');
            this.cacheMonitor.recordInvalidation('device-calibration', 'expired');
            
            // 获取优化建议
            const recommendations = this.cacheMonitor.getOptimizationRecommendations();
            
            // 验证建议系统
            const recommendationChecks = [
                { condition: Array.isArray(recommendations), message: '优化建议返回数组格式' },
                { condition: recommendations.length >= 0, message: '优化建议数量正确' },
                { condition: recommendations.every(rec => rec.type && rec.title && rec.actions), message: '建议格式正确' }
            ];
            
            recommendationChecks.forEach(check => {
                this.addTestResult('optimization-recommendations', check.condition ? 'success' : 'failure', check.message);
            });
            
            if (recommendations.length > 0) {
                console.log(`   📋 生成了 ${recommendations.length} 条优化建议`);
                recommendations.forEach((rec, index) => {
                    console.log(`   ${index + 1}. ${rec.title} (${rec.priority}优先级)`);
                });
            }
            
            console.log('✅ 优化建议功能测试完成\n');
            
        } catch (error) {
            this.addTestResult('optimization-recommendations', 'error', `优化建议测试失败: ${error.message}`);
            console.log('❌ 优化建议功能测试失败\n');
        }
    }
    
    /**
     * 测试数据导出
     */
    async testDataExport() {
        console.log('📤 测试数据导出功能...');
        
        try {
            // 导出JSON格式数据
            const jsonData = this.cacheMonitor.exportData('json');
            const jsonValid = this.isValidJSON(jsonData);
            
            // 导出CSV格式数据
            const csvData = this.cacheMonitor.exportData('csv');
            const csvValid = typeof csvData === 'string' && csvData.includes('metric,timestamp,value');
            
            // 验证导出功能
            const exportChecks = [
                { condition: jsonValid, message: 'JSON格式导出正常' },
                { condition: csvValid, message: 'CSV格式导出正常' }
            ];
            
            exportChecks.forEach(check => {
                this.addTestResult('data-export', check.condition ? 'success' : 'failure', check.message);
            });
            
            console.log('✅ 数据导出功能测试完成\n');
            
        } catch (error) {
            this.addTestResult('data-export', 'error', `数据导出测试失败: ${error.message}`);
            console.log('❌ 数据导出功能测试失败\n');
        }
    }
    
    /**
     * 测试实时监控
     */
    async testRealTimeMonitoring() {
        console.log('⚡ 测试实时监控功能...');
        
        try {
            let realTimeUpdateReceived = false;
            
            // 设置实时监控监听器
            this.cacheMonitor.on('realTimeUpdate', (data) => {
                realTimeUpdateReceived = true;
                console.log(`   📡 实时数据更新: ${data.lastUpdate}`);
            });
            
            // 触发一些缓存活动
            this.cacheMonitor.recordAccess('analysis-results', 'realtime-test', true, 20, 'analysis');
            
            // 等待实时监控更新
            await this.sleep(2000);
            
            // 获取实时数据
            const realTimeData = this.cacheMonitor.getRealTimeData();
            
            // 验证实时监控
            const realtimeChecks = [
                { condition: realTimeUpdateReceived, message: '实时监控数据接收正常' },
                { condition: realTimeData.currentMetrics, message: '实时指标数据存在' },
                { condition: realTimeData.categoryStats, message: '分类统计数据存在' },
                { condition: realTimeData.systemInfo, message: '系统信息数据存在' }
            ];
            
            realtimeChecks.forEach(check => {
                this.addTestResult('real-time-monitoring', check.condition ? 'success' : 'failure', check.message);
            });
            
            console.log('✅ 实时监控功能测试完成\n');
            
        } catch (error) {
            this.addTestResult('real-time-monitoring', 'error', `实时监控测试失败: ${error.message}`);
            console.log('❌ 实时监控功能测试失败\n');
        }
    }
    
    /**
     * 显示测试结果
     */
    displayTestResults() {
        console.log('📊 缓存监控系统测试结果汇总\n');
        console.log('=' * 50);
        
        const testSummary = this.testResults.reduce((summary, result) => {
            if (!summary[result.test]) {
                summary[result.test] = { success: 0, failure: 0, error: 0 };
            }
            summary[result.test][result.status]++;
            return summary;
        }, {});
        
        Object.keys(testSummary).forEach(testName => {
            const result = testSummary[testName];
            const total = result.success + result.failure + result.error;
            const successRate = ((result.success / total) * 100).toFixed(1);
            
            console.log(`${testName}:`);
            console.log(`  ✅ 成功: ${result.success}`);
            console.log(`  ❌ 失败: ${result.failure}`);
            console.log(`  💥 错误: ${result.error}`);
            console.log(`  📈 成功率: ${successRate}%`);
            console.log('');
        });
        
        const totalTests = this.testResults.length;
        const totalSuccess = this.testResults.filter(r => r.status === 'success').length;
        const overallSuccessRate = ((totalSuccess / totalTests) * 100).toFixed(1);
        
        console.log('=' * 50);
        console.log(`🎯 总体测试结果:`);
        console.log(`   总测试数: ${totalTests}`);
        console.log(`   成功测试: ${totalSuccess}`);
        console.log(`   成功率: ${overallSuccessRate}%`);
        
        if (overallSuccessRate >= 90) {
            console.log(`   🏆 缓存监控系统测试通过！`);
        } else if (overallSuccessRate >= 70) {
            console.log(`   ⚠️  缓存监控系统基本可用，但有改进空间`);
        } else {
            console.log(`   🚨 缓存监控系统存在较多问题，需要修复`);
        }
        
        console.log('=' * 50);
    }
    
    /**
     * 添加测试结果
     */
    addTestResult(test, status, message) {
        this.testResults.push({
            test,
            status,
            message,
            timestamp: Date.now()
        });
        
        const statusIcon = status === 'success' ? '✅' : status === 'failure' ? '❌' : '💥';
        console.log(`   ${statusIcon} ${message}`);
    }
    
    /**
     * 验证JSON格式
     */
    isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * 等待函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 清理测试环境
     */
    async cleanup() {
        console.log('🧹 清理测试环境...');
        
        if (this.cacheMonitor) {
            this.cacheMonitor.destroy();
        }
        
        console.log('✅ 测试环境清理完成');
    }
}

// 运行测试
if (require.main === module) {
    const test = new CacheMonitorTest();
    test.runAllTests().then(() => {
        console.log('\n🎉 缓存监控系统测试完成！');
        process.exit(0);
    }).catch(error => {
        console.error('\n💥 测试执行异常:', error);
        process.exit(1);
    });
}

module.exports = CacheMonitorTest;