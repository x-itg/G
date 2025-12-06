/**
 * 性能指标验证模块API演示
 * 展示如何集成到Express.js应用中
 */

const express = require('express');
const { PerformanceMetricsValidation, createValidationRoutes } = require('./performanceMetricsValidation');

const app = express();
app.use(express.json());

// 创建验证实例
const validation = new PerformanceMetricsValidation();

// 集成验证路由
createValidationRoutes(app, validation);

// 基本健康检查端点
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'radiation-detector-performance-validation',
        timestamp: new Date().toISOString()
    });
});

// 模拟其他API端点
app.get('/api/system/status', (req, res) => {
    res.json({
        status: 'operational',
        components: {
            monitoring: 'active',
            api: 'active',
            database: 'active',
            cache: 'active'
        }
    });
});

// 启动服务器
const PORT = process.env.PORT || 3002;
const server = app.listen(PORT, () => {
    console.log(`性能验证API服务器运行在端口 ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/api/health`);
    console.log(`验证结果: http://localhost:${PORT}/api/validation/performance`);
    console.log(`性能报告: http://localhost:${PORT}/api/validation/performance/report`);
    console.log(`基准测试: http://localhost:${PORT}/api/validation/performance/benchmark`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

module.exports = app;

// 如果直接运行此文件，启动服务器
if (require.main === module) {
    console.log('启动性能指标验证API服务器...');
}