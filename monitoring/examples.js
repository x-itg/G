/**
 * 系统监控器使用示例
 * 演示如何在放射化学纯度检测仪应用中使用系统监控功能
 */

const { createMonitoringService, SystemMonitor, SimplifiedDatabaseManager } = require('./monitoringService');

/**
 * 示例1: 基本监控功能演示
 */
async function basicMonitoringExample() {
    console.log('=== 基本监控功能演示 ===');
    
    try {
        // 创建数据库管理器
        const db = new SimplifiedDatabaseManager();
        db.initialize();
        
        // 创建系统监控器
        const monitor = new SystemMonitor(db);
        
        // 获取当前系统状态
        console.log('📊 获取当前系统状态...');
        const status = await monitor.getCurrentSystemStatus();
        console.log('系统状态:', status);
        
        // 获取系统信息
        console.log('\n📊 获取系统信息...');
        const systemInfo = await monitor.getSystemInfo();
        console.log('系统信息:', JSON.stringify(systemInfo, null, 2));
        
        // 手动采集一次数据
        console.log('\n🔄 执行手动数据采集...');
        await monitor.collectMetrics();
        
        // 获取采集结果
        console.log('✅ 数据采集完成');
        
        // 获取历史数据
        console.log('\n📈 获取历史数据...');
        const history = await monitor.getHistoryData({
            metricName: 'cpu_usage',
            limit: 10
        });
        console.log('历史数据:', history);
        
        db.close();
        
    } catch (error) {
        console.error('基本监控演示失败:', error);
    }
}

/**
 * 示例2: 监控服务初始化和API路由演示
 */
async function monitoringServiceExample() {
    console.log('=== 监控服务初始化演示 ===');
    
    try {
        // 创建并初始化监控服务
        const service = await createMonitoringService({
            defaultInterval: 3000, // 3秒采集间隔
            thresholds: {
                cpu_warning: 60,
                cpu_critical: 85,
                memory_warning: 75,
                memory_critical: 90
            },
            autoStart: true
        });
        
        console.log('监控服务已启动');
        console.log('监控统计:', service.getMonitor().getMonitoringStats());
        
        // 等待一段时间观察监控效果
        console.log('\n⏳ 等待10秒以观察监控数据...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 获取实时监控数据
        const currentStatus = await service.getMonitor().getCurrentSystemStatus();
        console.log('当前监控状态:', JSON.stringify(currentStatus, null, 2));
        
        // 停止监控
        await service.getMonitor().stopMonitoring();
        
        // 关闭服务
        await service.shutdown();
        
    } catch (error) {
        console.error('监控服务演示失败:', error);
    }
}

/**
 * 示例3: Express应用集成演示
 */
async function expressIntegrationExample() {
    console.log('=== Express应用集成演示 ===');
    
    try {
        const express = require('express');
        const app = express();
        
        // 解析JSON请求体
        app.use(express.json());
        
        // 设置监控服务
        const service = await setupMonitoring(app, {
            defaultInterval: 2000,
            autoStart: true
        });
        
        // 添加一些示例路由
        app.get('/', (req, res) => {
            res.json({
                message: '放射化学纯度检测仪监控API',
                endpoints: {
                    current_status: '/api/monitoring/system/current',
                    history: '/api/monitoring/system/history?metricName=cpu_usage&limit=10',
                    start_monitoring: 'POST /api/monitoring/system/start',
                    stop_monitoring: 'POST /api/monitoring/system/stop',
                    stats: '/api/monitoring/system/stats',
                    health: '/api/monitoring/health'
                }
            });
        });
        
        // 健康检查端点
        app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
        
        const PORT = 3000;
        const server = app.listen(PORT, () => {
            console.log(`🚀 监控API服务器已启动，端口: ${PORT}`);
            console.log('📍 访问地址:');
            console.log(`   - 主页: http://localhost:${PORT}/`);
            console.log(`   - 健康检查: http://localhost:${PORT}/health`);
            console.log(`   - 当前状态: http://localhost:${PORT}/api/monitoring/system/current`);
            console.log(`   - 监控统计: http://localhost:${PORT}/api/monitoring/system/stats`);
        });
        
        // 运行10秒后关闭
        setTimeout(() => {
            console.log('\n⏰ 关闭演示服务器...');
            server.close();
            service.shutdown();
        }, 10000);
        
    } catch (error) {
        console.error('Express集成演示失败:', error);
    }
}

/**
 * 示例4: 阈值配置和警报测试
 */
async function thresholdAlertExample() {
    console.log('=== 阈值配置和警报演示 ===');
    
    try {
        const db = new SimplifiedDatabaseManager();
        db.initialize();
        
        const monitor = new SystemMonitor(db);
        
        // 配置更严格的阈值用于测试
        monitor.updateThresholds({
            cpu_warning: 10,    // 10% CPU使用率就警告
            cpu_critical: 20,   // 20% CPU使用率就严重
            memory_warning: 10, // 10% 内存使用率就警告
            memory_critical: 20 // 20% 内存使用率就严重
        });
        
        console.log('已配置严格阈值用于测试');
        
        // 启动监控
        await monitor.startMonitoring(1000); // 1秒间隔
        
        // 运行15秒观察警报
        console.log('⏳ 运行15秒观察阈值警报...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // 获取系统状态和警报
        const status = await monitor.getCurrentSystemStatus();
        console.log('\n🚨 当前系统状态和警报:');
        console.log('系统健康:', status.status);
        console.log('活跃警报:', status.alerts);
        
        // 获取最近的性能指标
        const recentMetrics = await monitor.getHistoryData({
            metricName: 'cpu_usage',
            limit: 5
        });
        console.log('\n📈 最近5次CPU使用率记录:');
        recentMetrics.data.forEach(metric => {
            console.log(`  ${metric.timestamp}: ${metric.value}% (${metric.alert_level})`);
        });
        
        await monitor.stopMonitoring();
        db.close();
        
    } catch (error) {
        console.error('阈值警报演示失败:', error);
    }
}

/**
 * 示例5: 历史数据管理和清理演示
 */
async function dataManagementExample() {
    console.log('=== 历史数据管理演示 ===');
    
    try {
        const db = new SimplifiedDatabaseManager();
        db.initialize();
        
        const monitor = new SystemMonitor(db);
        
        // 生成一些测试数据
        console.log('📝 生成测试监控数据...');
        for (let i = 0; i < 50; i++) {
            await monitor.recordMetric('SYSTEM', 'cpu_usage', Math.random() * 100, 'percent', {
                test_data: true,
                iteration: i
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 查询不同类型的历史数据
        console.log('\n📊 查询不同类型的历史数据:');
        
        const cpuHistory = await monitor.getHistoryData({
            metricName: 'cpu_usage',
            limit: 10
        });
        console.log(`CPU历史记录: ${cpuHistory.count} 条`);
        
        const allHistory = await monitor.getHistoryData({
            limit: 20
        });
        console.log(`所有历史记录: ${allHistory.count} 条`);
        
        // 执行数据清理（模拟）
        console.log('\n🧹 执行数据清理...');
        const cleanResult = await monitor.cleanOldData(1); // 保留1天数据（模拟）
        console.log('清理结果:', cleanResult);
        
        // 获取清理后的数据统计
        const dbStats = db.getDatabaseStats();
        console.log('\n📈 清理后的数据库统计:');
        console.log(`性能指标表记录数: ${dbStats.tables.performance_metrics}`);
        console.log(`总记录数: ${dbStats.total_records}`);
        
        db.close();
        
    } catch (error) {
        console.error('历史数据管理演示失败:', error);
    }
}

/**
 * 主函数 - 运行所有示例
 */
async function runAllExamples() {
    console.log('🚀 开始运行系统监控器示例...\n');
    
    try {
        await basicMonitoringExample();
        console.log('\n' + '='.repeat(50) + '\n');
        
        await monitoringServiceExample();
        console.log('\n' + '='.repeat(50) + '\n');
        
        // 注意: Express示例会启动服务器，这里暂时跳过
        // await expressIntegrationExample();
        
        await thresholdAlertExample();
        console.log('\n' + '='.repeat(50) + '\n');
        
        await dataManagementExample();
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log('✅ 所有示例演示完成!');
        
    } catch (error) {
        console.error('❌ 示例运行失败:', error);
    }
}

// 如果直接运行此文件，则执行示例
if (require.main === module) {
    runAllExamples().catch(console.error);
}

module.exports = {
    basicMonitoringExample,
    monitoringServiceExample,
    expressIntegrationExample,
    thresholdAlertExample,
    dataManagementExample,
    runAllExamples
};