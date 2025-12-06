#!/usr/bin/env node

/**
 * 系统监控快速演示
 */

const { SystemMonitor } = require('./systemMonitor');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');

async function quickDemo() {
    console.log('🚀 放射化学纯度检测仪 - 系统监控快速演示\n');
    
    const db = new SimplifiedDatabaseManager();
    db.initialize();
    const monitor = new SystemMonitor(db);
    
    try {
        // 获取当前系统状态
        console.log('📊 获取当前系统状态...');
        const status = await monitor.getCurrentSystemStatus();
        console.log('系统状态:', status.status);
        console.log('监控状态:', status.is_monitoring ? '运行中' : '未运行');
        console.log('CPU使用率:', status.metrics?.cpu?.usage_percent?.toFixed(2) + '%');
        console.log('内存使用率:', status.metrics?.memory?.usage_percent?.toFixed(2) + '%');
        console.log('磁盘使用率:', status.metrics?.disk?.total_usage_percent?.toFixed(2) + '%');
        
        // 手动采集数据
        console.log('\n🔄 执行数据采集...');
        await monitor.collectMetrics();
        
        // 记录测试指标
        console.log('\n📝 记录测试指标...');
        await monitor.recordMetric('SYSTEM', 'demo_test', Math.random() * 100, 'percent', {
            demo: true
        });
        
        // 获取历史数据
        console.log('\n📈 获取历史数据...');
        const history = await monitor.getHistoryData({ limit: 3 });
        console.log('最近3条记录:');
        history.data.forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.metric_name}: ${m.value}% (${m.alert_level})`);
        });
        
        console.log('\n✅ 演示完成！系统监控模块工作正常。');
        
    } catch (error) {
        console.error('❌ 演示失败:', error);
    } finally {
        db.close();
    }
}

if (require.main === module) {
    quickDemo();
}