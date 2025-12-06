/**
 * 数据采集系统使用示例
 * 展示如何初始化、配置和使用数据采集系统
 */
const DataCollector = require('./dataCollector');
const { createDataCollectorAPI } = require('./dataCollectorAPI');
const config = require('./config');
const path = require('path');

/**
 * 创建数据采集系统实例
 */
function createDataCollectorInstance(options = {}) {
    // 合并配置
    const collectorOptions = {
        ...config.collection,
        ...config.storage,
        ...config.quality,
        ...options
    };
    
    // 创建数据采集系统实例
    const dataCollector = new DataCollector(collectorOptions);
    
    // 设置事件监听器
    setupEventListeners(dataCollector);
    
    return dataCollector;
}

/**
 * 设置事件监听器
 */
function setupEventListeners(dataCollector) {
    // 系统启动事件
    dataCollector.on('started', () => {
        console.log('🚀 数据采集系统已启动');
        console.log(`📊 当前活跃数据源: ${dataCollector.state.activeSources.size}个`);
    });
    
    // 系统停止事件
    dataCollector.on('stopped', () => {
        console.log('🛑 数据采集系统已停止');
    });
    
    // 数据采集完成事件
    dataCollector.on('collectionCompleted', (result) => {
        console.log(`✅ 采集完成: ${result.successful}/${result.total} 成功`);
        
        // 可在这里发送通知或触发其他处理
        if (result.failed > 0) {
            console.warn(`⚠️ 有 ${result.failed} 个数据源采集失败`);
        }
    });
    
    // 数据存储事件
    dataCollector.on('dataStored', (result) => {
        console.log(`💾 已存储 ${result.count} 条数据`);
    });
    
    // 数据不一致事件
    dataCollector.on('dataInconsistency', (inconsistencies) => {
        console.warn(`⚠️ 发现 ${inconsistencies.length} 个数据不一致问题`);
        
        // 可在这里触发告警
        inconsistencies.forEach(issue => {
            console.warn(`  - ${issue.type}: ${JSON.stringify(issue)}`);
        });
    });
    
    // 错误事件
    dataCollector.on('error', (error) => {
        console.error('❌ 数据采集系统错误:', error);
    });
    
    // 警告事件
    dataCollector.on('warning', (warning) => {
        console.warn('⚠️ 数据采集系统警告:', warning);
    });
}

/**
 * 启动数据采集系统示例
 */
async function startDataCollectorExample() {
    try {
        console.log('🎯 启动数据采集系统示例...');
        
        // 创建数据采集系统实例
        const dataCollector = createDataCollectorInstance({
            // 自定义配置选项
            interval: 3000, // 3秒采集一次
            maxRecords: 50000,
            validationEnabled: true
        });
        
        // 启动系统
        await dataCollector.start();
        
        console.log('⏰ 等待5秒后检查采集状态...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 获取采集状态
        const status = dataCollector.getCollectionStatus();
        console.log('📊 采集状态:', JSON.stringify(status, null, 2));
        
        // 获取聚合指标
        const metrics = dataCollector.getAggregatedMetrics({
            startDate: new Date(Date.now() - 60000).toISOString() // 最近1分钟
        });
        console.log('📈 聚合指标:', JSON.stringify(metrics, null, 2));
        
        // 等待更长时间收集数据
        console.log('⏰ 等待10秒继续收集数据...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 执行数据备份
        console.log('💾 执行数据备份...');
        const backupResult = await dataCollector.backupData({
            includeMetrics: true,
            includeAuditLogs: false,
            includeUsers: false
        });
        console.log('✅ 备份完成:', backupResult);
        
        // 停止系统
        console.log('🛑 停止数据采集系统...');
        await dataCollector.stop();
        
        console.log('✅ 示例运行完成');
        
    } catch (error) {
        console.error('❌ 示例运行失败:', error);
    }
}

/**
 * API接口示例
 */
function setupAPIExample() {
    console.log('🌐 设置API接口示例...');
    
    const express = require('express');
    const app = express();
    app.use(express.json());
    
    // 创建数据采集系统实例
    const dataCollector = createDataCollectorInstance();
    
    // 挂载数据采集API
    const apiRouter = createDataCollectorAPI(dataCollector);
    app.use('/api/monitoring/collection', apiRouter);
    
    // 添加一些示例路由
    app.get('/', (req, res) => {
        res.json({
            message: '数据采集系统API',
            version: '1.0.0',
            endpoints: {
                health: '/api/monitoring/collection/health',
                status: '/api/monitoring/collection/status',
                config: '/api/monitoring/collection/config',
                metrics: '/api/monitoring/collection/metrics',
                sources: '/api/monitoring/collection/sources',
                backup: '/api/monitoring/collection/backup',
                rawMetrics: '/api/monitoring/collection/raw-metrics',
                qualityReport: '/api/monitoring/collection/quality-report',
                summary: '/api/monitoring/collection/summary'
            }
        });
    });
    
    // 启动服务器
    const PORT = config.api.port || 3001;
    app.listen(PORT, () => {
        console.log(`🚀 API服务器启动在端口 ${PORT}`);
        console.log(`📖 API文档: http://localhost:${PORT}/`);
    });
    
    // 定期启动/停止数据采集系统进行演示
    setTimeout(async () => {
        console.log('🚀 自动启动数据采集系统...');
        await dataCollector.start();
    }, 2000);
    
    setTimeout(async () => {
        console.log('🛑 自动停止数据采集系统...');
        await dataCollector.stop();
    }, 30000); // 30秒后停止
    
    return app;
}

/**
 * 自定义数据源示例
 */
function customDataSourceExample() {
    console.log('🔧 创建自定义数据源示例...');
    
    // 创建数据采集系统实例
    const dataCollector = createDataCollectorInstance();
    
    // 注册自定义数据源
    dataCollector.registerDataSource('environmental', {
        name: 'environmentalMonitor',
        type: 'custom',
        enabled: true,
        interval: 10000, // 10秒采集一次
        collector: async () => {
            // 环境监测指标
            return [
                {
                    metricType: 'environmental',
                    metricName: 'room_temperature',
                    value: 20 + Math.random() * 10, // 20-30°C
                    unit: 'celsius',
                    timestamp: new Date().toISOString(),
                    alertLevel: 'NORMAL'
                },
                {
                    metricType: 'environmental',
                    metricName: 'humidity',
                    value: 40 + Math.random() * 20, // 40-60%
                    unit: 'percent',
                    timestamp: new Date().toISOString(),
                    alertLevel: 'NORMAL'
                },
                {
                    metricType: 'environmental',
                    metricName: 'air_quality',
                    value: Math.random() * 100, // 0-100
                    unit: 'index',
                    timestamp: new Date().toISOString(),
                    alertLevel: Math.random() > 0.8 ? 'WARNING' : 'NORMAL'
                }
            ];
        },
        validator: (metric) => {
            // 自定义验证规则
            if (metric.metricName === 'room_temperature' && 
                (metric.value < -10 || metric.value > 50)) {
                return false;
            }
            if (metric.metricName === 'humidity' && 
                (metric.value < 0 || metric.value > 100)) {
                return false;
            }
            return true;
        }
    });
    
    return dataCollector;
}

/**
 * 压力测试示例
 */
async function stressTestExample() {
    console.log('🔥 开始压力测试...');
    
    const dataCollector = createDataCollectorInstance({
        interval: 1000, // 1秒采集一次
        maxConcurrentSources: 10
    });
    
    // 启动系统
    await dataCollector.start();
    
    // 添加多个自定义数据源
    for (let i = 1; i <= 5; i++) {
        dataCollector.registerDataSource(`sensor-${i}`, {
            name: `sensorMonitor${i}`,
            type: 'custom',
            enabled: true,
            interval: 1000 + Math.random() * 2000,
            collector: async () => {
                return [{
                    metricType: 'sensor',
                    metricName: `sensor_${i}_reading`,
                    value: Math.random() * 1000,
                    unit: 'units',
                    timestamp: new Date().toISOString(),
                    tags: { sensor_id: i, location: `location_${i % 3}` }
                }];
            }
        });
    }
    
    console.log('⏱️ 运行压力测试30秒...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 检查采集结果
    const status = dataCollector.getCollectionStatus();
    console.log('📊 压力测试结果:', {
        总采集次数: status.totalCollected,
        错误次数: status.totalErrors,
        活跃数据源: status.activeSources.length,
        平均成功率: `${((status.totalCollected / (status.totalCollected + status.totalErrors)) * 100).toFixed(2)}%`
    });
    
    // 停止系统
    await dataCollector.stop();
    
    console.log('✅ 压力测试完成');
}

/**
 * 数据质量管理示例
 */
async function dataQualityExample() {
    console.log('🔍 数据质量管理示例...');
    
    const dataCollector = createDataCollectorInstance({
        validationEnabled: true,
        anomalyDetectionEnabled: true,
        consistencyCheckEnabled: true
    });
    
    // 启动系统
    await dataCollector.start();
    
    // 添加一些可能导致质量问题的数据源
    dataCollector.registerDataSource('problematic', {
        name: 'problematicSource',
        type: 'custom',
        enabled: true,
        interval: 2000,
        collector: async () => {
            const shouldHaveProblems = Math.random() > 0.7;
            
            if (shouldHaveProblems) {
                // 返回一些有问题的数据
                return [
                    {
                        metricType: 'test',
                        metricName: 'invalid_number',
                        value: 'not_a_number', // 无效数值
                        timestamp: new Date().toISOString()
                    },
                    {
                        metricType: 'test',
                        metricName: 'missing_fields',
                        // 缺少必需字段
                        value: 100
                        // 没有timestamp等
                    },
                    {
                        metricType: 'test',
                        metricName: 'extreme_value',
                        value: 9999999999, // 极端值
                        timestamp: new Date().toISOString()
                    }
                ];
            } else {
                // 返回正常数据
                return [{
                    metricType: 'test',
                    metricName: 'normal_reading',
                    value: Math.random() * 100,
                    unit: 'units',
                    timestamp: new Date().toISOString()
                }];
            }
        }
    });
    
    // 运行测试
    console.log('⏱️ 运行数据质量测试60秒...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // 手动触发质量检查
    console.log('🔍 手动执行数据质量检查...');
    const apiRouter = createDataCollectorAPI(dataCollector);
    
    // 这里可以调用质量检查相关的API
    // await fetch quality report
    
    // 停止系统
    await dataCollector.stop();
    
    console.log('✅ 数据质量管理示例完成');
}

/**
 * 命令行使用示例
 */
function commandLineExample() {
    console.log('💻 命令行使用示例...');
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'start':
            startDataCollectorExample();
            break;
        case 'api':
            setupAPIExample();
            break;
        case 'custom':
            (async () => {
                const collector = customDataSourceExample();
                await collector.start();
                await new Promise(resolve => setTimeout(resolve, 30000));
                await collector.stop();
            })();
            break;
        case 'stress':
            stressTestExample();
            break;
        case 'quality':
            dataQualityExample();
            break;
        default:
            console.log(`
数据采集系统使用示例:

使用方法:
  node dataCollectorExample.js <命令>

命令:
  start    - 基本启动示例
  api      - API接口示例
  custom   - 自定义数据源示例
  stress   - 压力测试示例
  quality  - 数据质量管理示例

示例:
  node dataCollectorExample.js start
  node dataCollectorExample.js api
  node dataCollectorExample.js stress
            `);
    }
}

// 如果直接运行此文件，则执行命令行示例
if (require.main === module) {
    commandLineExample();
}

module.exports = {
    createDataCollectorInstance,
    startDataCollectorExample,
    setupAPIExample,
    customDataSourceExample,
    stressTestExample,
    dataQualityExample
};