const express = require('express');
const router = express.Router();

/**
 * 系统监控API路由
 * 为放射化学纯度检测仪提供系统资源监控接口
 */
class MonitoringRoutes {
    constructor(systemMonitor, databaseManager) {
        this.monitor = systemMonitor;
        this.db = databaseManager;
        this.setupRoutes();
    }

    setupRoutes() {
        // 获取当前系统状态
        router.get('/system/current', async (req, res) => {
            try {
                const status = await this.monitor.getCurrentSystemStatus();
                res.json({
                    success: true,
                    data: status
                });
            } catch (error) {
                console.error('获取当前系统状态失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取系统状态失败',
                    message: error.message
                });
            }
        });

        // 获取历史监控数据
        router.get('/system/history', async (req, res) => {
            try {
                const {
                    metricName,
                    startDate,
                    endDate,
                    limit,
                    alertLevel
                } = req.query;

                const filters = {
                    metricType: 'SYSTEM',
                    metricName,
                    startDate,
                    endDate,
                    limit: limit ? parseInt(limit) : 100,
                    alertLevel
                };

                const history = await this.monitor.getHistoryData(filters);
                res.json({
                    success: true,
                    data: history
                });
            } catch (error) {
                console.error('获取历史数据失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取历史数据失败',
                    message: error.message
                });
            }
        });

        // 启动系统监控
        router.post('/system/start', async (req, res) => {
            try {
                const { interval } = req.body;
                const intervalMs = interval ? parseInt(interval) : 5000;
                
                if (intervalMs < 1000 || intervalMs > 60000) {
                    return res.status(400).json({
                        success: false,
                        error: '无效的采集间隔',
                        message: '采集间隔应在1000-60000毫秒之间'
                    });
                }

                const result = await this.monitor.startMonitoring(intervalMs);
                res.json({
                    success: result.success,
                    data: result,
                    message: result.message
                });
            } catch (error) {
                console.error('启动监控失败:', error);
                res.status(500).json({
                    success: false,
                    error: '启动监控失败',
                    message: error.message
                });
            }
        });

        // 停止系统监控
        router.post('/system/stop', async (req, res) => {
            try {
                const result = await this.monitor.stopMonitoring();
                res.json({
                    success: result.success,
                    data: result,
                    message: result.message
                });
            } catch (error) {
                console.error('停止监控失败:', error);
                res.status(500).json({
                    success: false,
                    error: '停止监控失败',
                    message: error.message
                });
            }
        });

        // 获取监控统计信息
        router.get('/system/stats', (req, res) => {
            try {
                const stats = this.monitor.getMonitoringStats();
                res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                console.error('获取监控统计失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取监控统计失败',
                    message: error.message
                });
            }
        });

        // 获取特定指标的历史数据
        router.get('/system/metrics/:metricName', async (req, res) => {
            try {
                const { metricName } = req.params;
                const { startDate, endDate, limit } = req.query;

                const filters = {
                    metricType: 'SYSTEM',
                    metricName,
                    startDate,
                    endDate,
                    limit: limit ? parseInt(limit) : 50
                };

                const history = await this.monitor.getHistoryData(filters);
                res.json({
                    success: true,
                    data: history
                });
            } catch (error) {
                console.error(`获取指标 ${req.params.metricName} 历史数据失败:`, error);
                res.status(500).json({
                    success: false,
                    error: '获取指标历史数据失败',
                    message: error.message
                });
            }
        });

        // 清理历史数据
        router.post('/system/clean-history', async (req, res) => {
            try {
                const { retentionDays } = req.body;
                const days = retentionDays ? parseInt(retentionDays) : 30;
                
                if (days < 1 || days > 365) {
                    return res.status(400).json({
                        success: false,
                        error: '无效的保留天数',
                        message: '保留天数应在1-365天之间'
                    });
                }

                const result = await this.monitor.cleanOldData(days);
                res.json({
                    success: true,
                    data: result,
                    message: `已清理${days}天前的历史数据`
                });
            } catch (error) {
                console.error('清理历史数据失败:', error);
                res.status(500).json({
                    success: false,
                    error: '清理历史数据失败',
                    message: error.message
                });
            }
        });

        // 更新监控阈值
        router.put('/system/thresholds', (req, res) => {
            try {
                const { thresholds } = req.body;
                
                if (!thresholds || typeof thresholds !== 'object') {
                    return res.status(400).json({
                        success: false,
                        error: '无效的阈值配置',
                        message: '需要提供有效的阈值对象'
                    });
                }

                this.monitor.updateThresholds(thresholds);
                
                res.json({
                    success: true,
                    data: {
                        new_thresholds: this.monitor.thresholds
                    },
                    message: '监控阈值已更新'
                });
            } catch (error) {
                console.error('更新监控阈值失败:', error);
                res.status(500).json({
                    success: false,
                    error: '更新监控阈值失败',
                    message: error.message
                });
            }
        });

        // 获取系统性能摘要
        router.get('/system/summary', async (req, res) => {
            try {
                const summary = this.db.getSystemPerformanceSummary();
                const currentStatus = await this.monitor.getCurrentSystemStatus();
                
                res.json({
                    success: true,
                    data: {
                        performance_summary: summary,
                        current_status: currentStatus,
                        monitoring_stats: this.monitor.getMonitoringStats()
                    }
                });
            } catch (error) {
                console.error('获取系统性能摘要失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取系统性能摘要失败',
                    message: error.message
                });
            }
        });

        // 获取实时监控数据（用于WebSocket或SSE）
        router.get('/system/realtime', async (req, res) => {
            try {
                const currentMetrics = await this.monitor.getCurrentSystemStatus();
                const realtimeData = {
                    timestamp: new Date().toISOString(),
                    cpu_usage: currentMetrics.metrics?.cpu?.usage_percent || 0,
                    memory_usage: currentMetrics.metrics?.memory?.usage_percent || 0,
                    disk_usage: currentMetrics.metrics?.disk?.total_usage_percent || 0,
                    load_average: currentMetrics.metrics?.cpu ? [
                        currentMetrics.metrics.cpu.load_1min,
                        currentMetrics.metrics.cpu.load_5min,
                        currentMetrics.metrics.cpu.load_15min
                    ] : [0, 0, 0],
                    alerts: currentMetrics.alerts || [],
                    is_monitoring: currentMetrics.is_monitoring
                };
                
                res.json({
                    success: true,
                    data: realtimeData
                });
            } catch (error) {
                console.error('获取实时数据失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取实时数据失败',
                    message: error.message
                });
            }
        });

        // 获取系统详细信息
        router.get('/system/info', async (req, res) => {
            try {
                const systemInfo = await this.monitor.getSystemInfo();
                res.json({
                    success: true,
                    data: systemInfo
                });
            } catch (error) {
                console.error('获取系统信息失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取系统信息失败',
                    message: error.message
                });
            }
        });

        // 监控健康检查
        router.get('/health', (req, res) => {
            const health = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                monitor_status: {
                    is_monitoring: this.monitor.isMonitoring,
                    uptime: process.uptime(),
                    memory_usage: process.memoryUsage()
                }
            };
            
            res.json({
                success: true,
                data: health
            });
        });
    }

    getRouter() {
        return router;
    }
}

module.exports = MonitoringRoutes;