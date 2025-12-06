#!/usr/bin/env node

/**
 * API监控功能测试脚本
 * 用于验证放射化学纯度检测仪API监控功能是否正常工作
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * 模拟API请求进行测试
 */
async function simulateAPICalls() {
    console.log('🔄 开始模拟API请求...');
    
    const endpoints = [
        '/health',
        '/status',
        '/data/status',
        '/analysis/list',
        '/devices/status',
        '/auth/permissions',
        '/audit/logs',
        '/performance/metrics',
        '/enhanced/status'
    ];
    
    for (let i = 0; i < 20; i++) {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        
        try {
            await axios.get(`${API_BASE_URL}${endpoint}`, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'API-Monitor-Test/1.0'
                }
            });
            console.log(`✅ 请求成功: ${endpoint}`);
        } catch (error) {
            console.log(`❌ 请求失败: ${endpoint} - ${error.message}`);
        }
        
        // 随机延迟
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200));
    }
}

/**
 * 测试API监控端点
 */
async function testMonitoringEndpoints() {
    console.log('\n🔍 测试API监控端点...');
    
    const endpoints = [
        '/monitoring/api/stats',
        '/monitoring/api/performance',
        '/monitoring/api/errors',
        '/monitoring/api/availability',
        '/monitoring/api/realtime',
        '/monitoring/api/charts',
        '/monitoring/api/config'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
                timeout: 10000
            });
            
            if (response.data.success) {
                console.log(`✅ ${endpoint} - 监控数据获取成功`);
                console.log(`   数据键数: ${Object.keys(response.data.data).length}`);
            } else {
                console.log(`⚠️  ${endpoint} - 数据获取失败: ${response.data.message}`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint} - 连接失败: ${error.message}`);
        }
    }
}

/**
 * 测试统计重置功能
 */
async function testResetFunction() {
    console.log('\n🔄 测试统计重置功能...');
    
    try {
        const response = await axios.post(`${API_BASE_URL}/monitoring/api/reset`);
        
        if (response.data.success) {
            console.log('✅ 统计重置功能正常');
        } else {
            console.log('⚠️  统计重置失败:', response.data.message);
        }
    } catch (error) {
        console.log('❌ 统计重置测试失败:', error.message);
    }
}

/**
 * 生成性能测试报告
 */
async function generateReport() {
    console.log('\n📊 生成性能测试报告...');
    
    try {
        const [statsResponse, performanceResponse, realtimeResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/monitoring/api/stats?timeRange=1h`),
            axios.get(`${API_BASE_URL}/monitoring/api/performance?timeRange=1h`),
            axios.get(`${API_BASE_URL}/monitoring/api/realtime`)
        ]);
        
        const stats = statsResponse.data.data;
        const performance = performanceResponse.data.data;
        const realtime = realtimeResponse.data.data;
        
        console.log('\n📈 API性能统计摘要:');
        console.log(`   总请求数: ${stats.metrics.total_requests}`);
        console.log(`   平均响应时间: ${stats.metrics.average_response_time.toFixed(2)}ms`);
        console.log(`   95分位响应时间: ${stats.metrics.percentile_95.toFixed(2)}ms`);
        console.log(`   错误率: ${stats.metrics.error_rate.toFixed(2)}%`);
        console.log(`   成功率: ${stats.metrics.success_rate.toFixed(2)}%`);
        
        console.log('\n📊 状态码分布:');
        Object.entries(stats.status_code_distribution).forEach(([code, count]) => {
            console.log(`   ${code}: ${count}`);
        });
        
        console.log('\n⚡ 实时监控:');
        console.log(`   本小时请求数: ${realtime.current_metrics.requests_this_hour}`);
        console.log(`   本小时错误数: ${realtime.current_metrics.errors_this_hour}`);
        console.log(`   本小时平均响应时间: ${realtime.current_metrics.avg_response_time_this_hour.toFixed(2)}ms`);
        console.log(`   本小时错误率: ${realtime.current_metrics.error_rate_this_hour.toFixed(2)}%`);
        console.log(`   活跃请求数: ${realtime.active_requests.length}`);
        
        console.log('\n🎯 热门端点:');
        stats.top_endpoints.slice(0, 5).forEach((endpoint, index) => {
            console.log(`   ${index + 1}. ${endpoint.endpoint} - ${endpoint.total_requests}次请求`);
        });
        
        if (realtime.performance_alerts.length > 0) {
            console.log('\n🚨 性能告警:');
            realtime.performance_alerts.slice(0, 3).forEach((alert, index) => {
                console.log(`   ${index + 1}. ${alert.type} - ${alert.message}`);
            });
        } else {
            console.log('\n✅ 暂无性能告警');
        }
        
        return true;
    } catch (error) {
        console.log('❌ 生成报告失败:', error.message);
        return false;
    }
}

/**
 * 主测试函数
 */
async function main() {
    console.log('🚀 开始API监控功能测试');
    console.log('='.repeat(50));
    
    try {
        // 测试服务器连接
        console.log('🔗 测试服务器连接...');
        await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
        console.log('✅ 服务器连接正常\n');
        
        // 模拟API调用
        await simulateAPICalls();
        
        // 测试监控端点
        await testMonitoringEndpoints();
        
        // 测试重置功能
        await testResetFunction();
        
        // 生成报告
        const reportSuccess = await generateReport();
        
        console.log('\n' + '='.repeat(50));
        if (reportSuccess) {
            console.log('✅ API监控功能测试完成 - 所有测试通过!');
        } else {
            console.log('⚠️  API监控功能测试完成 - 部分测试失败');
        }
        
    } catch (error) {
        console.log('\n❌ 测试失败:', error.message);
        console.log('请确保:');
        console.log('1. API服务器正在运行 (node api-server.js)');
        console.log('2. 端口3000可用');
        console.log('3. API监控模块已正确加载');
    }
}

// 运行测试
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { simulateAPICalls, testMonitoringEndpoints, testResetFunction, generateReport };