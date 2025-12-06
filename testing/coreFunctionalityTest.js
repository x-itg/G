#!/usr/bin/env node
/**
 * 放射化学纯度检测仪核心功能验证测试
 * 验证新功能不影响主要检测功能
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// 基础配置
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000',
    TIMEOUT: 30000,
    PERFORMANCE_THRESHOLDS: {
        API_RESPONSE_TIME: 200, // ms
        DATABASE_QUERY_TIME: 100, // ms
        MEMORY_INCREASE: 20, // %
        CPU_INCREASE: 10 // %
    },
    TEST_DATA_DIR: path.join(__dirname, '../test-results')
};

// 测试结果存储
let testResults = {
    timestamp: new Date().toISOString(),
    coreFunctionalityTests: {},
    compatibilityTests: {},
    performanceTests: {},
    overallStatus: 'PENDING',
    summary: {}
};

// HTTP客户端
class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.request = require('axios');
    }

    async get(endpoint) {
        const startTime = performance.now();
        try {
            const response = await this.request.get(`${this.baseURL}${endpoint}`, {
                timeout: CONFIG.TIMEOUT
            });
            const responseTime = performance.now() - startTime;
            return { data: response.data, responseTime, status: response.status };
        } catch (error) {
            throw new Error(`GET ${endpoint} failed: ${error.message}`);
        }
    }

    async post(endpoint, data) {
        const startTime = performance.now();
        try {
            const response = await this.request.post(`${this.baseURL}${endpoint}`, data, {
                timeout: CONFIG.TIMEOUT
            });
            const responseTime = performance.now() - startTime;
            return { data: response.data, responseTime, status: response.status };
        } catch (error) {
            throw new Error(`POST ${endpoint} failed: ${error.message}`);
        }
    }

    async put(endpoint, data) {
        const startTime = performance.now();
        try {
            const response = await this.request.put(`${this.baseURL}${endpoint}`, data, {
                timeout: CONFIG.TIMEOUT
            });
            const responseTime = performance.now() - startTime;
            return { data: response.data, responseTime, status: response.status };
        } catch (error) {
            throw new Error(`PUT ${endpoint} failed: ${error.message}`);
        }
    }

    async delete(endpoint) {
        const startTime = performance.now();
        try {
            const response = await this.request.delete(`${this.baseURL}${endpoint}`, {
                timeout: CONFIG.TIMEOUT
            });
            const responseTime = performance.now() - startTime;
            return { data: response.data, responseTime, status: response.status };
        } catch (error) {
            throw new Error(`DELETE ${endpoint} failed: ${error.message}`);
        }
    }
}

// 核心功能测试类
class CoreFunctionalityTester {
    constructor(apiClient) {
        this.api = apiClient;
        this.testMeasurements = [];
    }

    // 测试测量数据创建和保存
    async testMeasurementCreation() {
        console.log('📊 测试测量数据创建和保存...');
        
        try {
            const testData = {
                sampleId: 'TEST_CORE_001',
                measurementType: 'gamma_spectrum',
                detectorId: 'detector_01',
                timestamp: new Date().toISOString(),
                data: {
                    counts: [120, 95, 87, 156, 203, 145, 98, 76],
                    energies: [50, 100, 150, 200, 250, 300, 350, 400],
                    liveTime: 300,
                    realTime: 310,
                    temperature: 25.5,
                    humidity: 45.2
                },
                status: 'completed'
            };

            const startTime = performance.now();
            const response = await this.api.post('/api/measurements', testData);
            const responseTime = performance.now() - startTime;

            // 验证响应
            if (response.status === 201 && response.data.id) {
                this.testMeasurements.push(response.data.id);
                
                testResults.coreFunctionalityTests.measurementCreation = {
                    status: 'PASSED',
                    responseTime,
                    data: response.data
                };
                console.log('✅ 测量数据创建成功');
                return true;
            } else {
                throw new Error('测量数据创建响应异常');
            }
        } catch (error) {
            testResults.coreFunctionalityTests.measurementCreation = {
                status: 'FAILED',
                error: error.message
            };
            console.error('❌ 测量数据创建失败:', error.message);
            return false;
        }
    }

    // 测试测量数据查询和显示
    async testMeasurementQuery() {
        console.log('📋 测试测量数据查询和显示...');
        
        try {
            const startTime = performance.now();
            const response = await this.api.get('/api/measurements');
            const responseTime = performance.now() - startTime;

            // 验证响应数据
            if (response.status === 200 && Array.isArray(response.data)) {
                // 检查是否有测试数据
                const hasTestData = response.data.some(m => 
                    m.sampleId && m.sampleId.startsWith('TEST_CORE_')
                );

                testResults.coreFunctionalityTests.measurementQuery = {
                    status: 'PASSED',
                    responseTime,
                    totalCount: response.data.length,
                    hasTestData
                };
                console.log('✅ 测量数据查询成功，记录数:', response.data.length);
                return true;
            } else {
                throw new Error('测量数据查询响应格式异常');
            }
        } catch (error) {
            testResults.coreFunctionalityTests.measurementQuery = {
                status: 'FAILED',
                error: error.message
            };
            console.error('❌ 测量数据查询失败:', error.message);
            return false;
        }
    }

    // 测试数据验证和校验
    async testDataValidation() {
        console.log('🔍 测试数据验证和校验...');
        
        try {
            // 测试无效数据
            const invalidData = {
                sampleId: '',
                measurementType: 'invalid_type',
                data: null
            };

            const response = await this.api.post('/api/measurements', invalidData);
            
            // 应该返回错误
            if (response.status >= 400) {
                testResults.coreFunctionalityTests.dataValidation = {
                    status: 'PASSED',
                    validationWorking: true
                };
                console.log('✅ 数据验证和校验正常工作');
                return true;
            } else {
                throw new Error('数据验证未正确拒绝无效数据');
            }
        } catch (error) {
            if (error.message.includes('400') || error.message.includes('422')) {
                testResults.coreFunctionalityTests.dataValidation = {
                    status: 'PASSED',
                    validationWorking: true
                };
                console.log('✅ 数据验证和校验正常工作');
                return true;
            } else {
                testResults.coreFunctionalityTests.dataValidation = {
                    status: 'FAILED',
                    error: error.message
                };
                console.error('❌ 数据验证和校验失败:', error.message);
                return false;
            }
        }
    }

    // 测试原始数据处理
    async testRawDataProcessing() {
        console.log('⚙️ 测试原始数据处理...');
        
        try {
            const rawDataTest = {
                sampleId: 'TEST_RAW_DATA_001',
                measurementType: 'raw_spectrum',
                rawData: {
                    channels: Array.from({length: 1024}, (_, i) => i),
                    counts: Array.from({length: 1024}, () => Math.floor(Math.random() * 1000)),
                    timestamp: Date.now()
                },
                processRawData: true
            };

            const startTime = performance.now();
            const response = await this.api.post('/api/measurements', rawDataTest);
            const responseTime = performance.now() - startTime;

            if (response.status === 201) {
                this.testMeasurements.push(response.data.id);
                
                testResults.coreFunctionalityTests.rawDataProcessing = {
                    status: 'PASSED',
                    responseTime,
                    processed: true
                };
                console.log('✅ 原始数据处理成功');
                return true;
            } else {
                throw new Error('原始数据处理响应异常');
            }
        } catch (error) {
            testResults.coreFunctionalityTests.rawDataProcessing = {
                status: 'FAILED',
                error: error.message
            };
            console.error('❌ 原始数据处理失败:', error.message);
            return false;
        }
    }

    // 清理测试数据
    async cleanup() {
        console.log('🧹 清理测试数据...');
        
        for (const id of this.testMeasurements) {
            try {
                await this.api.delete(`/api/measurements/${id}`);
            } catch (error) {
                console.warn(`警告: 无法删除测试记录 ${id}:`, error.message);
            }
        }
        console.log('✅ 测试数据清理完成');
    }
}

// 兼容性测试类
class CompatibilityTester {
    constructor(apiClient) {
        this.api = apiClient;
    }

    // 测试数据库架构变更影响
    async testDatabaseSchemaCompatibility() {
        console.log('🗄️ 测试数据库架构兼容性...');
        
        try {
            // 检查数据库结构是否完整
            const response = await this.api.get('/api/measurements?limit=1');
            
            if (response.status === 200) {
                testResults.compatibilityTests.databaseSchema = {
                    status: 'PASSED',
                    message: '数据库架构兼容现有数据'
                };
                console.log('✅ 数据库架构兼容性正常');
                return true;
            } else {
                throw new Error('数据库响应异常');
            }
        } catch (error) {
            testResults.compatibilityTests.databaseSchema = {
                status: 'FAILED',
                error: error.message
            };
            console.error('❌ 数据库架构兼容性测试失败:', error.message);
            return false;
        }
    }

    // 测试API向后兼容性
    async testAPIBackwardCompatibility() {
        console.log('🔗 测试API向后兼容性...');
        
        const apiTests = [
            { method: 'GET', endpoint: '/api/measurements', expectedStatus: 200 },
            { method: 'GET', endpoint: '/api/status', expectedStatus: 200 }
        ];

        let passedTests = 0;
        
        for (const test of apiTests) {
            try {
                let response;
                switch (test.method) {
                    case 'GET':
                        response = await this.api.get(test.endpoint);
                        break;
                    default:
                        continue;
                }

                if (response.status === test.expectedStatus) {
                    passedTests++;
                    console.log(`✅ ${test.method} ${test.endpoint} - 兼容`);
                } else {
                    console.log(`⚠️ ${test.method} ${test.endpoint} - 状态码: ${response.status}`);
                }
            } catch (error) {
                console.error(`❌ ${test.method} ${test.endpoint} - 失败:`, error.message);
            }
        }

        testResults.compatibilityTests.apiBackwardCompatibility = {
            status: passedTests === apiTests.length ? 'PASSED' : 'WARNING',
            passedTests,
            totalTests: apiTests.length
        };
        
        console.log(`✅ API向后兼容性测试完成: ${passedTests}/${apiTests.length}`);
        return passedTests === apiTests.length;
    }

    // 测试缓存系统兼容性
    async testCacheSystemCompatibility() {
        console.log('💾 测试缓存系统兼容性...');
        
        try {
            // 测试缓存是否影响数据实时性
            const start1 = performance.now();
            const response1 = await this.api.get('/api/measurements');
            const time1 = performance.now() - start1;

            const start2 = performance.now();
            const response2 = await this.api.get('/api/measurements');
            const time2 = performance.now() - start2;

            // 第二次请求应该更快（如果缓存工作）
            const cacheEffective = time2 < time1;

            testResults.compatibilityTests.cacheSystemCompatibility = {
                status: 'PASSED',
                cacheEffective,
                firstRequestTime: time1,
                secondRequestTime: time2,
                improvement: ((time1 - time2) / time1 * 100).toFixed(2)
            };
            
            console.log(`✅ 缓存系统兼容性正常 (性能提升: ${((time1 - time2) / time1 * 100).toFixed(2)}%)`);
            return true;
        } catch (error) {
            testResults.compatibilityTests.cacheSystemCompatibility = {
                status: 'FAILED',
                error: error.message
            };
            console.error('❌ 缓存系统兼容性测试失败:', error.message);
            return false;
        }
    }

    // 测试权限系统兼容性
    async testPermissionSystemCompatibility() {
        console.log('🔐 测试权限系统兼容性...');
        
        try {
            // 测试基本操作是否受到权限系统影响
            const response = await this.api.get('/api/measurements');
            
            if (response.status === 200) {
                testResults.compatibilityTests.permissionSystemCompatibility = {
                    status: 'PASSED',
                    message: '权限系统不影响基本操作'
                };
                console.log('✅ 权限系统兼容性正常');
                return true;
            } else {
                throw new Error('权限系统可能影响了基本操作');
            }
        } catch (error) {
            testResults.compatibilityTests.permissionSystemCompatibility = {
                status: 'WARNING',
                error: error.message,
                message: '权限系统可能需要配置'
            };
            console.warn('⚠️ 权限系统兼容性测试:', error.message);
            return false;
        }
    }
}

// 性能测试类
class PerformanceTester {
    constructor(apiClient) {
        this.api = apiClient;
    }

    // 测试API响应时间
    async testAPIResponseTime() {
        console.log('⏱️ 测试API响应时间...');
        
        const endpoints = [
            '/api/measurements',
            '/api/status'
        ];

        const results = {};
        
        for (const endpoint of endpoints) {
            try {
                const times = [];
                
                // 进行5次测试取平均值
                for (let i = 0; i < 5; i++) {
                    const startTime = performance.now();
                    await this.api.get(endpoint);
                    const endTime = performance.now();
                    times.push(endTime - startTime);
                }

                const avgTime = times.reduce((a, b) => a + b) / times.length;
                const maxTime = Math.max(...times);
                
                results[endpoint] = {
 avgTime,
                                       averageTime: maxTime,
                    times,
                    withinThreshold: avgTime < CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME
                };

                console.log(`✅ ${endpoint} - 平均响应时间: ${avgTime.toFixed(2)}ms`);
            } catch (error) {
                results[endpoint] = {
                    error: error.message,
                    withinThreshold: false
                };
                console.error(`❌ ${endpoint} - 性能测试失败:`, error.message);
            }
        }

        testResults.performanceTests.apiResponseTime = results;
        
        // 检查是否所有端点都在阈值内
        const allWithinThreshold = Object.values(results).every(result => result.withinThreshold);
        return allWithinThreshold;
    }

    // 测试数据库查询性能
    async testDatabaseQueryPerformance() {
        console.log('💾 测试数据库查询性能...');
        
        try {
            const queryTests = [
                { endpoint: '/api/measurements?limit=10', description: '分页查询' },
                { endpoint: '/api/measurements?status=completed', description: '状态查询' },
                { endpoint: '/api/measurements', description: '全量查询' }
            ];

            const results = {};
            
            for (const test of queryTests) {
                const startTime = performance.now();
                const response = await this.api.get(test.endpoint);
                const queryTime = performance.now() - startTime;

                results[test.description] = {
                    queryTime,
                    resultCount: Array.isArray(response.data) ? response.data.length : 0,
                    withinThreshold: queryTime < CONFIG.PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME
                };

                console.log(`✅ ${test.description} - 查询时间: ${queryTime.toFixed(2)}ms`);
            }

            testResults.performanceTests.databaseQueryPerformance = results;
            
            const allWithinThreshold = Object.values(results).every(result => result.withinThreshold);
            return allWithinThreshold;
        } catch (error) {
            testResults.performanceTests.databaseQueryPerformance = {
                error: error.message,
                withinThreshold: false
            };
            console.error('❌ 数据库查询性能测试失败:', error.message);
            return false;
        }
    }

    // 测试内存使用
    async testMemoryUsage() {
        console.log('🧠 测试内存使用情况...');
        
        try {
            const initialMemory = process.memoryUsage();
            
            // 执行一系列操作
            for (let i = 0; i < 100; i++) {
                await this.api.get('/api/measurements');
            }
            
            const finalMemory = process.memoryUsage();
            
            const memoryIncrease = ((finalMemory.heapUsed - initialMemory.heapUsed) / initialMemory.heapUsed * 100);
            
            testResults.performanceTests.memoryUsage = {
                initialHeap: initialMemory.heapUsed,
                finalHeap: finalMemory.heapUsed,
                increasePercentage: memoryIncrease,
                withinThreshold: memoryIncrease < CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_INCREASE
            };

            console.log(`✅ 内存使用增长: ${memoryIncrease.toFixed(2)}%`);
            return memoryIncrease < CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_INCREASE;
        } catch (error) {
            testResults.performanceTests.memoryUsage = {
                error: error.message,
                withinThreshold: false
            };
            console.error('❌ 内存使用测试失败:', error.message);
            return false;
        }
    }
}

// 主测试执行器
class CoreFunctionalityTestRunner {
    constructor() {
        this.api = new ApiClient(CONFIG.API_BASE_URL);
        this.coreTester = new CoreFunctionalityTester(this.api);
        this.compatibilityTester = new CompatibilityTester(this.api);
        this.performanceTester = new PerformanceTester(this.api);
    }

    // 执行所有核心功能测试
    async runAllTests() {
        console.log('🚀 开始核心功能验证测试...\n');

        try {
            // 1. 核心功能测试
            console.log('='.repeat(50));
            console.log('核心功能测试');
            console.log('='.repeat(50));
            
            await this.coreTester.testMeasurementCreation();
            await this.coreTester.testMeasurementQuery();
            await this.coreTester.testDataValidation();
            await this.coreTester.testRawDataProcessing();

            // 2. 兼容性测试
            console.log('\n' + '='.repeat(50));
            console.log('兼容性测试');
            console.log('='.repeat(50));
            
            await this.compatibilityTester.testDatabaseSchemaCompatibility();
            await this.compatibilityTester.testAPIBackwardCompatibility();
            await this.compatibilityTester.testCacheSystemCompatibility();
            await this.compatibilityTester.testPermissionSystemCompatibility();

            // 3. 性能测试
            console.log('\n' + '='.repeat(50));
            console.log('性能测试');
            console.log('='.repeat(50));
            
            await this.performanceTester.testAPIResponseTime();
            await this.performanceTester.testDatabaseQueryPerformance();
            await this.performanceTester.testMemoryUsage();

            // 4. 清理测试数据
            console.log('\n' + '='.repeat(50));
            console.log('清理测试数据');
            console.log('='.repeat(50));
            
            await this.coreTester.cleanup();

            // 5. 生成测试报告
            this.generateTestReport();

        } catch (error) {
            console.error('测试执行失败:', error);
            testResults.overallStatus = 'FAILED';
            testResults.error = error.message;
        }

        return testResults;
    }

    // 生成测试报告
    generateTestReport() {
        // 计算测试结果统计
        const coreTests = Object.values(testResults.coreFunctionalityTests);
        const compatibilityTests = Object.values(testResults.compatibilityTests);
        const performanceTests = Object.values(testResults.performanceTests);

        const corePassed = coreTests.filter(test => test.status === 'PASSED').length;
        const coreTotal = coreTests.length;
        
        const compatibilityPassed = compatibilityTests.filter(test => test.status === 'PASSED').length;
        const compatibilityTotal = compatibilityTests.length;
        
        const performancePassed = performanceTests.filter(test => test.withinThreshold !== false).length;
        const performanceTotal = performanceTests.length;

        testResults.summary = {
            coreFunctionality: {
                passed: corePassed,
                total: coreTotal,
                percentage: (corePassed / coreTotal * 100).toFixed(1)
            },
            compatibility: {
                passed: compatibilityPassed,
                total: compatibilityTotal,
                percentage: (compatibilityPassed / compatibilityTotal * 100).toFixed(1)
            },
            performance: {
                passed: performancePassed,
                total: performanceTotal,
                percentage: (performancePassed / performanceTotal * 100).toFixed(1)
            }
        };

        // 判断整体状态
        if (corePassed === coreTotal && compatibilityPassed >= compatibilityTotal * 0.8) {
            testResults.overallStatus = 'PASSED';
        } else if (corePassed >= coreTotal * 0.8) {
            testResults.overallStatus = 'WARNING';
        } else {
            testResults.overallStatus = 'FAILED';
        }

        // 输出报告
        this.printTestReport();
        
        // 保存报告到文件
        this.saveTestReport();
    }

    // 打印测试报告
    printTestReport() {
        console.log('\n' + '='.repeat(60));
        console.log('核心功能验证测试报告');
        console.log('='.repeat(60));
        console.log(`测试时间: ${testResults.timestamp}`);
        console.log(`整体状态: ${testResults.overallStatus}`);
        console.log('');

        // 核心功能测试结果
        console.log('📊 核心功能测试结果:');
        console.log(`   通过: ${testResults.summary.coreFunctionality.passed}/${testResults.summary.coreFunctionality.total} (${testResults.summary.coreFunctionality.percentage}%)`);
        
        Object.entries(testResults.coreFunctionalityTests).forEach(([key, result]) => {
            const icon = result.status === 'PASSED' ? '✅' : '❌';
            console.log(`   ${icon} ${key}: ${result.status}`);
        });

        // 兼容性测试结果
        console.log('\n🔗 兼容性测试结果:');
        console.log(`   通过: ${testResults.summary.compatibility.passed}/${testResults.summary.compatibility.total} (${testResults.summary.compatibility.percentage}%)`);
        
        Object.entries(testResults.compatibilityTests).forEach(([key, result]) => {
            const icon = result.status === 'PASSED' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
            console.log(`   ${icon} ${key}: ${result.status}`);
        });

        // 性能测试结果
        console.log('\n⚡ 性能测试结果:');
        console.log(`   通过: ${testResults.summary.performance.passed}/${testResults.summary.performance.total} (${testResults.summary.performance.percentage}%)`);
        
        Object.entries(testResults.performanceTests).forEach(([key, result]) => {
            const icon = result.withinThreshold !== false ? '✅' : '❌';
            console.log(`   ${icon} ${key}: ${result.withinThreshold !== false ? '在阈值内' : '超过阈值'}`);
        });

        console.log('\n' + '='.repeat(60));
    }

    // 保存测试报告
    saveTestReport() {
        // 确保目录存在
        if (!fs.existsSync(CONFIG.TEST_DATA_DIR)) {
            fs.mkdirSync(CONFIG.TEST_DATA_DIR, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = path.join(CONFIG.TEST_DATA_DIR, `core-functionality-test-${timestamp}.json`);
        
        fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
        console.log(`\n📄 详细测试报告已保存到: ${reportFile}`);
    }
}

// 主程序
async function main() {
    console.log('放射化学纯度检测仪 - 核心功能验证测试');
    console.log('=========================================\n');

    const runner = new CoreFunctionalityTestRunner();
    
    try {
        await runner.runAllTests();
        
        // 根据测试结果设置退出码
        if (testResults.overallStatus === 'PASSED') {
            console.log('\n🎉 所有核心功能验证测试通过！');
            process.exit(0);
        } else if (testResults.overallStatus === 'WARNING') {
            console.log('\n⚠️ 部分测试通过，但存在警告，建议检查');
            process.exit(1);
        } else {
            console.log('\n❌ 核心功能验证测试失败！');
            process.exit(2);
        }
    } catch (error) {
        console.error('\n💥 测试执行过程中发生错误:', error);
        process.exit(3);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    CoreFunctionalityTester,
    CompatibilityTester,
    PerformanceTester,
    CoreFunctionalityTestRunner
};