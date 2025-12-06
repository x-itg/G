/**
 * 放射化学纯度检测仪 - 缓存性能监控集成示例
 * 展示如何在系统中集成和使用缓存监控功能
 */

const { CacheMonitor, integrateCacheMonitoringRoutes } = require('./cacheMonitor');
const express = require('express');

/**
 * 示例：集成缓存监控到放射化学纯度检测仪
 */
class RadiationDetectorCacheIntegration {
    constructor() {
        this.app = express();
        this.cacheMonitor = null;
        this.initializeIntegration();
    }
    
    /**
     * 初始化缓存监控集成
     */
    initializeIntegration() {
        // 创建缓存监控实例
        this.cacheMonitor = new CacheMonitor({
            samplingInterval: 5000,        // 5秒采样间隔
            trendDataPoints: 100,          // 存储100个数据点
            hitRateThreshold: 0.7,         // 命中率告警阈值70%
            memoryUsageThreshold: 0.8,     // 内存使用率告警阈值80%
            responseTimeThreshold: 100,    // 响应时间告警阈值100ms
            invalidationRateThreshold: 0.3, // 失效频率告警阈值30%
            dataRetention: 24 * 60 * 60 * 1000 // 24小时数据保留
        });
        
        console.log('缓存监控集成初始化完成');
    }
    
    /**
     * 模拟放射化学检测缓存系统
     */
    setupRadiationDetectionCaches() {
        // 1. 设备校准数据缓存
        const calibrationCache = {
            data: new Map(),
            size() { return this.data.size; },
            get(key) { 
                const item = this.data.get(key);
                if (item && item.expires > Date.now()) {
                    return item.value;
                }
                return null;
            },
            set(key, value, ttl = 3600000) { // 1小时TTL
                this.data.set(key, {
                    value,
                    expires: Date.now() + ttl
                });
            }
        };
        
        // 2. 检测结果缓存
        const detectionResultsCache = {
            data: new Map(),
            size() { return this.data.size; },
            get(key) { 
                const item = this.data.get(key);
                if (item && item.expires > Date.now()) {
                    return item.value;
                }
                return null;
            },
            set(key, value, ttl = 1800000) { // 30分钟TTL
                this.data.set(key, {
                    value,
                    expires: Date.now() + ttl
                });
            }
        };
        
        // 3. 参考标准数据缓存
        const referenceStandardsCache = {
            data: new Map(),
            size() { return this.data.size; },
            get(key) { 
                const item = this.data.get(key);
                if (item && item.expires > Date.now()) {
                    return item.value;
                }
                return null;
            },
            set(key, value, ttl = 7200000) { // 2小时TTL
                this.data.set(key, {
                    value,
                    expires: Date.now() + ttl
                });
            }
        };
        
        // 4. 用户配置缓存
        const userConfigCache = {
            data: new Map(),
            size() { return this.data.size; },
            get(key) { 
                const item = this.data.get(key);
                if (item && item.expires > Date.now()) {
                    return item.value;
                }
                return null;
            },
            set(key, value, ttl = 86400000) { // 24小时TTL
                this.data.set(key, {
                    value,
                    expires: Date.now() + ttl
                });
            }
        };
        
        // 注册缓存实例到监控系统
        this.cacheMonitor.registerCache('calibration', calibrationCache, {
            category: 'device',
            priority: 'high',
            maxSize: 50
        });
        
        this.cacheMonitor.registerCache('detection-results', detectionResultsCache, {
            category: 'analysis',
            priority: 'high',
            maxSize: 1000
        });
        
        this.cacheMonitor.registerCache('reference-standards', referenceStandardsCache, {
            category: 'reference',
            priority: 'normal',
            maxSize: 100
        });
        
        this.cacheMonitor.registerCache('user-config', userConfigCache, {
            category: 'user',
            priority: 'low',
            maxSize: 200
        });
        
        console.log('放射检测缓存系统已注册到监控');
    }
    
    /**
     * 模拟缓存访问场景
     */
    simulateCacheAccess() {
        const scenarios = [
            { cache: 'calibration', key: 'device-001-calibration', category: 'device' },
            { cache: 'detection-results', key: 'sample-123-analysis', category: 'analysis' },
            { cache: 'reference-standards', key: 'isotope-standards', category: 'reference' },
            { cache: 'user-config', key: 'user-456-settings', category: 'user' }
        ];
        
        // 模拟定期访问
        setInterval(() => {
            const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
            const startTime = Date.now();
            
            // 模拟缓存访问（80%命中率）
            const hit = Math.random() > 0.2;
            const responseTime = Math.random() * 50 + 10; // 10-60ms
            
            this.cacheMonitor.recordAccess(
                scenario.cache,
                scenario.key,
                hit,
                responseTime,
                scenario.category
            );
            
            // 随机模拟缓存失效
            if (Math.random() < 0.05) { // 5%概率失效
                this.cacheMonitor.recordInvalidation(scenario.cache, 'expired');
            }
            
        }, 1000); // 每秒访问一次
        
        console.log('缓存访问模拟已启动');
    }
    
    /**
     * 设置告警监听
     */
    setupAlertListeners() {
        this.cacheMonitor.on('alert', (alert) => {
            console.warn(`🚨 缓存告警: ${alert.ruleName} - 严重级别: ${alert.severity}`);
            
            // 这里可以集成实际的告警通知系统
            // 例如：发送邮件、短信、钉钉消息等
            
            if (alert.severity === 'critical') {
                this.handleCriticalAlert(alert);
            }
        });
        
        this.cacheMonitor.on('alertCleared', (data) => {
            console.info(`✅ 告警已清除: ${data.ruleName}`);
        });
        
        console.log('告警监听器已设置');
    }
    
    /**
     * 处理严重告警
     */
    handleCriticalAlert(alert) {
        console.error('🚨 处理严重缓存告警...');
        
        // 立即执行优化
        this.cacheMonitor.performAutoOptimization().then(results => {
            console.log('自动优化完成:', results);
        });
    }
    
    /**
     * 设置Web监控界面
     */
    setupMonitoringDashboard() {
        // 集成缓存监控API路由
        integrateCacheMonitoringRoutes(this.app, this.cacheMonitor);
        
        // 添加静态监控页面
        this.app.get('/cache-monitor', (req, res) => {
            res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>缓存性能监控 - 放射化学纯度检测仪</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 5px; min-width: 120px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 12px; color: #666; }
        .alert { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .alert-warning { background: #fff3cd; color: #856404; }
        .alert-danger { background: #f8d7da; color: #721c24; }
        .chart { height: 200px; background: #f8f9fa; border: 1px solid #dee2e6; margin: 10px 0; }
        .status-indicator { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 5px; }
        .status-good { background: #28a745; }
        .status-warning { background: #ffc107; }
        .status-danger { background: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔬 放射化学纯度检测仪 - 缓存性能监控</h1>
        
        <div class="card">
            <h2>📊 实时性能指标</h2>
            <div id="realtime-metrics">
                <div class="metric">
                    <div class="metric-value" id="hitRate">--</div>
                    <div class="metric-label">缓存命中率</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="responseTime">--</div>
                    <div class="metric-label">响应时间(ms)</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="memoryUsage">--</div>
                    <div class="metric-label">内存使用(MB)</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="cacheSize">--</div>
                    <div class="metric-label">缓存项数</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h2>⚠️ 当前告警</h2>
            <div id="alerts-container">
                <p>暂无告警</p>
            </div>
        </div>
        
        <div class="card">
            <h2>📈 性能趋势</h2>
            <div class="chart" id="trend-chart">
                <canvas id="trendCanvas" width="800" height="200"></canvas>
            </div>
        </div>
        
        <div class="card">
            <h2>💡 优化建议</h2>
            <div id="recommendations">
                <p>正在生成优化建议...</p>
            </div>
        </div>
        
        <div class="card">
            <h2>🎮 控制面板</h2>
            <button onclick="performOptimization()">执行自动优化</button>
            <button onclick="exportData()">导出数据</button>
            <button onclick="refreshData()">刷新数据</button>
        </div>
    </div>

    <script>
        let updateInterval;
        
        function refreshData() {
            fetch('/api/cache/monitor/real-time')
                .then(response => response.json())
                .then(data => {
                    updateDashboard(data.data);
                });
                
            fetch('/api/cache/monitor/recommendations')
                .then(response => response.json())
                .then(data => {
                    updateRecommendations(data.data);
                });
        }
        
        function updateDashboard(realTimeData) {
            const metrics = realTimeData.currentMetrics;
            
            document.getElementById('hitRate').textContent = (metrics.hitRate * 100).toFixed(1) + '%';
            document.getElementById('responseTime').textContent = metrics.responseTime.toFixed(1);
            document.getElementById('memoryUsage').textContent = (metrics.memoryUsage / 1024 / 1024).toFixed(1);
            document.getElementById('cacheSize').textContent = metrics.cacheSize;
            
            // 更新告警
            const alertsContainer = document.getElementById('alerts-container');
            if (realTimeData.alerts.length > 0) {
                alertsContainer.innerHTML = realTimeData.alerts.map(alert => 
                    \`<div class="alert alert-\${alert.severity === 'critical' ? 'danger' : 'warning'}">
                        <span class="status-indicator status-\${alert.severity}"></span>
                        \${alert.ruleName}: \${alert.value} (阈值: \${alert.threshold})
                    </div>\`
                ).join('');
            } else {
                alertsContainer.innerHTML = '<p>✅ 暂无告警</p>';
            }
        }
        
        function updateRecommendations(recommendations) {
            const container = document.getElementById('recommendations');
            
            if (recommendations.length === 0) {
                container.innerHTML = '<p>✅ 系统运行良好，暂无优化建议</p>';
                return;
            }
            
            container.innerHTML = recommendations.map(rec => 
                \`<div class="alert alert-warning">
                    <h4>\${rec.title} (\${rec.priority}优先级)</h4>
                    <p>\${rec.description}</p>
                    <ul>\${rec.actions.map(action => \`<li>\${action}</li>\`).join('')}</ul>
                    <small>预期效果: \${rec.estimatedImpact}</small>
                </div>\`
            ).join('');
        }
        
        function performOptimization() {
            fetch('/api/cache/monitor/optimize', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    alert('自动优化已完成');
                    refreshData();
                });
        }
        
        function exportData() {
            window.open('/api/cache/monitor/export?format=json', '_blank');
        }
        
        // 启动定时更新
        updateInterval = setInterval(refreshData, 5000);
        refreshData(); // 初始加载
    </script>
</body>
</html>
            `);
        });
        
        console.log('Web监控界面已设置');
    }
    
    /**
     * 启动集成系统
     */
    start() {
        this.setupRadiationDetectionCaches();
        this.setupAlertListeners();
        this.setupMonitoringDashboard();
        this.simulateCacheAccess();
        
        const port = 3002;
        this.app.listen(port, () => {
            console.log(`🚀 放射化学纯度检测仪缓存监控系统已启动`);
            console.log(`📊 监控面板: http://localhost:${port}/cache-monitor`);
            console.log(`🔧 API文档:`);
            console.log(`   - 性能统计: http://localhost:${port}/api/cache/monitor/stats`);
            console.log(`   - 实时数据: http://localhost:${port}/api/cache/monitor/real-time`);
            console.log(`   - 优化建议: http://localhost:${port}/api/cache/monitor/recommendations`);
            console.log(`   - 性能趋势: http://localhost:${port}/api/cache/monitor/trends`);
        });
    }
    
    /**
     * 停止系统
     */
    stop() {
        if (this.cacheMonitor) {
            this.cacheMonitor.destroy();
        }
        console.log('缓存监控集成系统已停止');
    }
}

// 使用示例
if (require.main === module) {
    const integration = new RadiationDetectorCacheIntegration();
    
    // 启动系统
    integration.start();
    
    // 优雅关闭
    process.on('SIGINT', () => {
        console.log('正在关闭系统...');
        integration.stop();
        process.exit(0);
    });
}

module.exports = RadiationDetectorCacheIntegration;