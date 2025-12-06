/**
 * 实时性能数据采集系统使用演示
 * 展示基本的使用方法
 */
const DataCollector = require('./dataCollector');

/**
 * 演示数据采集系统的主要功能
 */
async function demoDataCollector() {
    console.log('🚀 实时性能数据采集系统演示\n');
    
    try {
        // 1. 创建数据采集系统实例
        console.log('1️⃣ 创建数据采集系统实例...');
        const dataCollector = new DataCollector({
            interval: 3000,        // 3秒采集一次
            maxRecords: 1000,      // 最多存储1000条记录
            validationEnabled: true,    // 启用数据验证
            anomalyDetectionEnabled: true, // 启用异常检测
            consistencyCheckEnabled: true   // 启用一致性检查
        });
        
        // 2. 注册自定义数据源
        console.log('\n2️⃣ 注册自定义数据源...');
        dataCollector.registerDataSource('radiation_detector', {
            name: 'radiationDetectorMonitor',
            type: 'custom',
            enabled: true,
            interval: 5000,
            collector: async () => {
                // 模拟辐射检测器数据
                return [
                    {
                        metricType: 'radiation',
                        metricName: 'detector_temperature',
                        value: 20 + Math.random() * 15, // 20-35°C
                        unit: 'celsius',
                        timestamp: new Date().toISOString(),
                        alertLevel: 'NORMAL',
                        tags: { detector_id: 'RD-001', location: 'lab' }
                    },
                    {
                        metricType: 'radiation',
                        metricName: 'background_radiation',
                        value: Math.random() * 100, // 0-100 cps
                        unit: 'cps',
                        timestamp: new Date().toISOString(),
                        alertLevel: Math.random() > 0.9 ? 'WARNING' : 'NORMAL',
                        tags: { detector_id: 'RD-001', location: 'lab' }
                    },
                    {
                        metricType: 'radiation',
                        metricName: 'detector_voltage',
                        value: 1200 + Math.random() * 100, // 1200-1300V
                        unit: 'volts',
                        timestamp: new Date().toISOString(),
                        alertLevel: 'NORMAL',
                        tags: { detector_id: 'RD-001', location: 'lab' }
                    }
                ];
            },
            validator: (metric) => {
                // 自定义验证规则
                if (metric.metricName === 'detector_temperature' && 
                    (metric.value < -50 || metric.value > 100)) {
                    return false;
                }
                if (metric.metricName === 'background_radiation' && 
                    (metric.value < 0 || metric.value > 1000)) {
                    return false;
                }
                if (metric.metricName === 'detector_voltage' && 
                    (metric.value < 0 || metric.value > 5000)) {
                    return false;
                }
                return true;
            }
        });
        
        // 3. 启动数据采集系统
        console.log('\n3️⃣ 启动数据采集系统...');
        await dataCollector.start();
        
        console.log('✅ 数据采集系统已启动');
        console.log(`📊 活跃数据源: ${dataCollector.state.activeSources.size}个`);
        
        // 4. 等待一些数据被采集
        console.log('\n4️⃣ 等待数据采集（15秒）...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // 5. 检查采集状态
        console.log('\n5️⃣ 检查采集状态...');
        const status = dataCollector.getCollectionStatus();
        console.log(`运行状态: ${status.isRunning ? '运行中' : '已停止'}`);
        console.log(`总采集数: ${status.totalCollected}`);
        console.log(`错误数: ${status.totalErrors}`);
        console.log(`活跃数据源: ${Array.from(status.activeSources).join(', ')}`);
        
        // 6. 获取聚合指标
        console.log('\n6️⃣ 获取聚合指标...');
        const metrics = dataCollector.getAggregatedMetrics({
            startDate: new Date(Date.now() - 60000).toISOString() // 最近1分钟
        });
        
        console.log('📈 聚合指标:');
        Object.entries(metrics).forEach(([name, data]) => {
            if (typeof data === 'object' && data.average !== undefined) {
                console.log(`  ${name}: 平均值=${data.average.toFixed(2)}, 最小值=${data.min}, 最大值=${data.max}`);
            }
        });
        
        // 7. 获取原始数据样本
        console.log('\n7️⃣ 获取原始数据样本...');
        const rawMetrics = dataCollector.db.getPerformanceMetrics({
            limit: 5
        });
        
        console.log(`📄 最近 ${rawMetrics.length} 条记录:`);
        rawMetrics.forEach((metric, index) => {
            console.log(`  ${index + 1}. ${metric.metricType}.${metric.metricName}: ${metric.value} ${metric.unit} (${metric.timestamp})`);
        });
        
        // 8. 数据备份演示
        console.log('\n8️⃣ 演示数据备份...');
        const backupResult = await dataCollector.backupData({
            includeMetrics: true,
            includeAuditLogs: false,
            includeUsers: false,
            outputPath: './demo-backups'
        });
        
        console.log(`💾 备份完成: ${backupResult.backupFile}`);
        console.log(`   文件大小: ${(backupResult.size / 1024).toFixed(2)} KB`);
        
        // 9. 数据源管理演示
        console.log('\n9️⃣ 演示数据源管理...');
        console.log('可用的数据源:');
        const sources = Array.from(dataCollector.dataSources.entries());
        sources.forEach(([name, source]) => {
            console.log(`  ${name}: ${source.enabled ? '启用' : '禁用'} | 采集次数: ${source.successCount} | 错误次数: ${source.errorCount}`);
        });
        
        // 10. 演示数据质量检查
        console.log('\n🔟 演示数据质量检查...');
        const recentMetrics = dataCollector.db.getPerformanceMetrics({
            startDate: new Date(Date.now() - 30000).toISOString(),
            limit: 100
        });
        
        console.log(`📋 最近30秒内采集了 ${recentMetrics.length} 条记录`);
        
        // 检查数据完整性
        const incompleteRecords = recentMetrics.filter(metric => 
            !metric.metricType || !metric.metricName || !metric.value || !metric.timestamp
        );
        console.log(`   完整记录: ${recentMetrics.length - incompleteRecords.length}/${recentMetrics.length}`);
        
        // 检查异常值
        const anomalousRecords = recentMetrics.filter(metric => 
            metric.alertLevel === 'WARNING' || metric.alertLevel === 'CRITICAL'
        );
        console.log(`   异常记录: ${anomalousRecords.length}`);
        
        // 11. 停止数据采集系统
        console.log('\n1️⃣1️⃣ 停止数据采集系统...');
        await dataCollector.stop();
        
        console.log('✅ 数据采集系统已停止');
        
        // 12. 演示配置更新
        console.log('\n1️⃣2️⃣ 演示配置更新...');
        const newConfig = dataCollector.configureCollection({
            interval: 1000,
            maxRetries: 5
        });
        
        console.log('⚙️ 配置已更新:');
        console.log(`   采集间隔: ${newConfig.interval}ms`);
        console.log(`   最大重试: ${newConfig.maxRetries}`);
        
        // 13. 最终状态总结
        console.log('\n📊 最终状态总结:');
        const finalStatus = dataCollector.getCollectionStatus();
        console.log(`   系统运行时间: ${Math.round((Date.now() - new Date(finalStatus.startTime).getTime()) / 1000)}秒`);
        console.log(`   总采集记录: ${finalStatus.totalCollected}`);
        console.log(`   平均采集速率: ${(finalStatus.totalCollected / 15).toFixed(1)} 记录/秒`);
        console.log(`   数据质量: ${finalStatus.totalErrors === 0 ? '完美' : `${((1 - finalStatus.totalErrors / finalStatus.totalCollected) * 100).toFixed(1)}%`}`);
        
        console.log('\n🎉 演示完成！数据采集系统功能正常。');
        
        return dataCollector;
        
    } catch (error) {
        console.error('\n❌ 演示过程中发生错误:', error);
        throw error;
    }
}

/**
 * 运行演示
 */
async function runDemo() {
    try {
        console.log('='.repeat(60));
        console.log('🧪 实时性能数据采集系统功能演示');
        console.log('='.repeat(60));
        
        await demoDataCollector();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ 演示成功完成！');
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('\n❌ 演示失败:', error.message);
        console.log('\n💡 提示:');
        console.log('1. 确保所有依赖模块可用');
        console.log('2. 检查数据库文件权限');
        console.log('3. 查看错误信息进行故障排除');
        process.exit(1);
    }
}

// 如果直接运行此文件，则执行演示
if (require.main === module) {
    runDemo();
}

module.exports = {
    demoDataCollector,
    runDemo
};