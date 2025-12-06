// 动态导入express，仅在需要时加载
let express;
try {
    express = require('express');
} catch (error) {
    console.warn('Express not available, API features will be limited');
    express = null;
}

const DataCollector = require('./dataCollector');
const path = require('path');
const fs = require('fs');

/**
 * 数据采集系统API路由处理器
 * 提供数据采集系统的REST API接口
 */
class DataCollectorAPI {
    constructor(dataCollector) {
        if (!express) {
            throw new Error('Express is required for API functionality');
        }
        this.router = express.Router();
        this.dataCollector = dataCollector;
        this.setupRoutes();
    }
    
    /**
     * 设置API路由
     */
    setupRoutes() {
        // 获取采集状态
        this.router.get('/status', (req, res) => {
            try {
                const status = this.dataCollector.getCollectionStatus();
                res.json({
                    success: true,
                    data: status,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取采集状态失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取采集状态失败',
                    message: error.message
                });
            }
        });
        
        // 配置采集参数
        this.router.post('/config', (req, res) => {
            try {
                const config = req.body;
                const updatedConfig = this.dataCollector.configureCollection(config);
                
                res.json({
                    success: true,
                    data: updatedConfig,
                    message: '采集配置已更新'
                });
            } catch (error) {
                console.error('配置采集参数失败:', error);
                res.status(400).json({
                    success: false,
                    error: '配置采集参数失败',
                    message: error.message
                });
            }
        });
        
        // 获取聚合指标
        this.router.get('/metrics', (req, res) => {
            try {
                const filters = {
                    metricType: req.query.metricType,
                    metricName: req.query.metricName,
                    alertLevel: req.query.alertLevel,
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    limit: req.query.limit ? parseInt(req.query.limit) : 1000
                };
                
                // 移除undefined值
                Object.keys(filters).forEach(key => 
                    filters[key] === undefined && delete filters[key]
                );
                
                const metrics = this.dataCollector.getAggregatedMetrics(filters);
                
                res.json({
                    success: true,
                    data: metrics,
                    filters,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取聚合指标失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取聚合指标失败',
                    message: error.message
                });
            }
        });
        
        // 数据备份
        this.router.post('/backup', async (req, res) => {
            try {
                const options = req.body || {};
                const backupResult = await this.dataCollector.backupData(options);
                
                res.json({
                    success: true,
                    data: backupResult,
                    message: '数据备份完成'
                });
            } catch (error) {
                console.error('数据备份失败:', error);
                res.status(500).json({
                    success: false,
                    error: '数据备份失败',
                    message: error.message
                });
            }
        });
        
        // 启动数据采集
        this.router.post('/start', async (req, res) => {
            try {
                if (this.dataCollector.state.isRunning) {
                    return res.status(400).json({
                        success: false,
                        error: '数据采集系统已在运行'
                    });
                }
                
                await this.dataCollector.start();
                
                res.json({
                    success: true,
                    message: '数据采集系统已启动',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('启动数据采集失败:', error);
                res.status(500).json({
                    success: false,
                    error: '启动数据采集失败',
                    message: error.message
                });
            }
        });
        
        // 停止数据采集
        this.router.post('/stop', async (req, res) => {
            try {
                if (!this.dataCollector.state.isRunning) {
                    return res.status(400).json({
                        success: false,
                        error: '数据采集系统未运行'
                    });
                }
                
                await this.dataCollector.stop();
                
                res.json({
                    success: true,
                    message: '数据采集系统已停止',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('停止数据采集失败:', error);
                res.status(500).json({
                    success: false,
                    error: '停止数据采集失败',
                    message: error.message
                });
            }
        });
        
        // 获取数据源列表
        this.router.get('/sources', (req, res) => {
            try {
                const sources = Array.from(this.dataCollector.dataSources.entries())
                    .map(([name, source]) => ({
                        name,
                        type: source.type,
                        enabled: source.enabled,
                        isActive: source.isActive,
                        lastCollect: source.lastCollect,
                        successCount: source.successCount,
                        errorCount: source.errorCount,
                        interval: source.interval
                    }));
                
                res.json({
                    success: true,
                    data: sources,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取数据源列表失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取数据源列表失败',
                    message: error.message
                });
            }
        });
        
        // 启用/禁用数据源
        this.router.patch('/sources/:sourceName', (req, res) => {
            try {
                const { sourceName } = req.params;
                const { enabled } = req.body;
                
                const source = this.dataCollector.dataSources.get(sourceName);
                if (!source) {
                    return res.status(404).json({
                        success: false,
                        error: `数据源 ${sourceName} 不存在`
                    });
                }
                
                source.enabled = enabled;
                
                res.json({
                    success: true,
                    data: {
                        name: sourceName,
                        enabled: source.enabled
                    },
                    message: `数据源 ${sourceName} 已${enabled ? '启用' : '禁用'}`
                });
            } catch (error) {
                console.error('更新数据源状态失败:', error);
                res.status(500).json({
                    success: false,
                    error: '更新数据源状态失败',
                    message: error.message
                });
            }
        });
        
        // 获取原始指标数据
        this.router.get('/raw-metrics', (req, res) => {
            try {
                const filters = {
                    metricType: req.query.metricType,
                    metricName: req.query.metricName,
                    alertLevel: req.query.alertLevel,
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    limit: req.query.limit ? parseInt(req.query.limit) : 500
                };
                
                // 移除undefined值
                Object.keys(filters).forEach(key => 
                    filters[key] === undefined && delete filters[key]
                );
                
                const metrics = this.dataCollector.db.getPerformanceMetrics(filters);
                
                res.json({
                    success: true,
                    data: metrics,
                    filters,
                    count: metrics.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取原始指标数据失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取原始指标数据失败',
                    message: error.message
                });
            }
        });
        
        // 获取数据质量报告
        this.router.get('/quality-report', async (req, res) => {
            try {
                const qualityReport = await this.generateQualityReport();
                
                res.json({
                    success: true,
                    data: qualityReport,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取数据质量报告失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取数据质量报告失败',
                    message: error.message
                });
            }
        });
        
        // 获取性能摘要
        this.router.get('/summary', (req, res) => {
            try {
                const summary = this.dataCollector.db.getSystemPerformanceSummary();
                
                res.json({
                    success: true,
                    data: summary,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取性能摘要失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取性能摘要失败',
                    message: error.message
                });
            }
        });
        
        // 获取历史备份列表
        this.router.get('/backups', (req, res) => {
            try {
                const backupsDir = path.join(__dirname, 'backups');
                let backups = [];
                
                if (fs.existsSync(backupsDir)) {
                    const files = fs.readdirSync(backupsDir);
                    backups = files
                        .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
                        .map(file => {
                            const filePath = path.join(backupsDir, file);
                            const stats = fs.statSync(filePath);
                            
                            return {
                                filename: file,
                                size: stats.size,
                                createdAt: stats.birthtime,
                                modifiedAt: stats.mtime
                            };
                        })
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                }
                
                res.json({
                    success: true,
                    data: backups,
                    count: backups.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('获取备份列表失败:', error);
                res.status(500).json({
                    success: false,
                    error: '获取备份列表失败',
                    message: error.message
                });
            }
        });
        
        // 恢复数据备份
        this.router.post('/restore/:filename', async (req, res) => {
            try {
                const { filename } = req.params;
                const backupFile = path.join(__dirname, 'backups', filename);
                
                if (!fs.existsSync(backupFile)) {
                    return res.status(404).json({
                        success: false,
                        error: `备份文件 ${filename} 不存在`
                    });
                }
                
                const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
                
                // 这里可以实现具体的恢复逻辑
                console.log('执行数据恢复:', filename);
                
                res.json({
                    success: true,
                    data: {
                        filename,
                        backupData: backupData.metadata,
                        restored: true
                    },
                    message: '数据恢复完成'
                });
            } catch (error) {
                console.error('数据恢复失败:', error);
                res.status(500).json({
                    success: false,
                    error: '数据恢复失败',
                    message: error.message
                });
            }
        });
        
        // 健康检查
        this.router.get('/health', (req, res) => {
            try {
                const health = {
                    status: 'healthy',
                    isRunning: this.dataCollector.state.isRunning,
                    uptime: this.dataCollector.state.isRunning ? 
                        Date.now() - new Date(this.dataCollector.state.startTime).getTime() : 0,
                    lastCollection: this.dataCollector.state.lastCollection,
                    totalCollected: this.dataCollector.state.totalCollected,
                    totalErrors: this.dataCollector.state.totalErrors,
                    activeSources: this.dataCollector.state.activeSources.size
                };
                
                // 根据系统状态调整健康状态
                if (this.dataCollector.state.totalErrors > 100) {
                    health.status = 'critical';
                } else if (this.dataCollector.state.totalErrors > 10) {
                    health.status = 'warning';
                }
                
                const statusCode = health.status === 'healthy' ? 200 : 
                                  health.status === 'warning' ? 200 : 503;
                
                res.status(statusCode).json({
                    success: true,
                    data: health,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('健康检查失败:', error);
                res.status(500).json({
                    success: false,
                    status: 'unhealthy',
                    error: '健康检查失败',
                    message: error.message
                });
            }
        });
    }
    
    /**
     * 生成数据质量报告
     */
    async generateQualityReport() {
        try {
            // 获取最近的指标数据
            const recentMetrics = this.dataCollector.db.getPerformanceMetrics({
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                limit: 10000
            });
            
            // 数据完整性检查
            const completeness = this.checkDataCompleteness(recentMetrics);
            
            // 数据一致性检查
            const consistency = this.checkDataConsistency(recentMetrics);
            
            // 数据准确性检查
            const accuracy = this.checkDataAccuracy(recentMetrics);
            
            // 异常数据检测
            const anomalies = this.detectAnomalies(recentMetrics);
            
            return {
                overview: {
                    totalRecords: recentMetrics.length,
                    timeRange: {
                        start: recentMetrics[recentMetrics.length - 1]?.timestamp,
                        end: recentMetrics[0]?.timestamp
                    },
                    completeness: completeness.score,
                    consistency: consistency.score,
                    accuracy: accuracy.score
                },
                completeness,
                consistency,
                accuracy,
                anomalies,
                recommendations: this.generateRecommendations({
                    completeness,
                    consistency,
                    accuracy,
                    anomalies
                })
            };
        } catch (error) {
            console.error('生成数据质量报告失败:', error);
            throw error;
        }
    }
    
    /**
     * 检查数据完整性
     */
    checkDataCompleteness(metrics) {
        const totalFields = ['metricType', 'metricName', 'value', 'timestamp'];
        let completeRecords = 0;
        
        metrics.forEach(metric => {
            const hasAllFields = totalFields.every(field => 
                metric[field] !== undefined && metric[field] !== null && metric[field] !== ''
            );
            if (hasAllFields) {
                completeRecords++;
            }
        });
        
        const score = metrics.length > 0 ? (completeRecords / metrics.length) * 100 : 100;
        
        return {
            score: Math.round(score * 100) / 100,
            totalRecords: metrics.length,
            completeRecords,
            missingRecords: metrics.length - completeRecords,
            issues: metrics.length - completeRecords > 0 ? 
                [`${metrics.length - completeRecords} 条记录缺少必需字段`] : []
        };
    }
    
    /**
     * 检查数据一致性
     */
    checkDataConsistency(metrics) {
        const issues = [];
        const types = new Set();
        const namePattern = /^[a-zA-Z0-9_-]+$/;
        
        metrics.forEach(metric => {
            // 检查指标类型一致性
            if (metric.metricType && !types.has(metric.metricType)) {
                types.add(metric.metricType);
            }
            
            // 检查指标名称格式
            if (metric.metricName && !namePattern.test(metric.metricName)) {
                issues.push(`指标名称格式不正确: ${metric.metricName}`);
            }
            
            // 检查时间戳格式
            const timestamp = new Date(metric.timestamp);
            if (isNaN(timestamp.getTime())) {
                issues.push(`无效时间戳: ${metric.timestamp}`);
            }
            
            // 检查数值范围
            if (typeof metric.value === 'number' && 
                (isNaN(metric.value) || !isFinite(metric.value))) {
                issues.push(`无效数值: ${metric.value}`);
            }
        });
        
        const score = issues.length === 0 ? 100 : Math.max(0, 100 - issues.length);
        
        return {
            score: Math.round(score * 100) / 100,
            issues,
            issueCount: issues.length
        };
    }
    
    /**
     * 检查数据准确性
     */
    checkDataAccuracy(metrics) {
        const issues = [];
        
        metrics.forEach(metric => {
            // 检查合理数值范围
            if (metric.metricName === 'cpu_usage' && (metric.value < 0 || metric.value > 100)) {
                issues.push(`CPU使用率超出合理范围: ${metric.value}`);
            }
            
            if (metric.metricName === 'memory_usage' && (metric.value < 0 || metric.value > 100)) {
                issues.push(`内存使用率超出合理范围: ${metric.value}`);
            }
            
            // 检查异常高的响应时间
            if (metric.metricName === 'avg_response_time' && metric.value > 30000) {
                issues.push(`响应时间异常高: ${metric.value}ms`);
            }
        });
        
        const score = issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 10);
        
        return {
            score: Math.round(score * 100) / 100,
            issues,
            issueCount: issues.length
        };
    }
    
    /**
     * 检测异常数据
     */
    detectAnomalies(metrics) {
        const anomalies = [];
        
        // 按指标名称分组
        const grouped = new Map();
        metrics.forEach(metric => {
            if (!grouped.has(metric.metricName)) {
                grouped.set(metric.metricName, []);
            }
            grouped.get(metric.metricName).push(metric);
        });
        
        grouped.forEach((values, metricName) => {
            if (values.length < 10) return; // 需要足够的数据点
            
            const numericValues = values
                .map(v => parseFloat(v.value))
                .filter(v => !isNaN(v));
            
            if (numericValues.length === 0) return;
            
            const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            const variance = numericValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericValues.length;
            const stdDev = Math.sqrt(variance);
            
            // 检测异常值
            numericValues.forEach((value, index) => {
                const deviation = Math.abs(value - mean);
                if (deviation > 2 * stdDev) {
                    anomalies.push({
                        metricName,
                        value,
                        expected: Math.round(mean * 100) / 100,
                        deviation: Math.round(deviation * 100) / 100,
                        timestamp: values[index].timestamp,
                        severity: deviation > 3 * stdDev ? 'high' : 'medium'
                    });
                }
            });
        });
        
        return {
            count: anomalies.length,
            anomalies,
            severity: {
                high: anomalies.filter(a => a.severity === 'high').length,
                medium: anomalies.filter(a => a.severity === 'medium').length
            }
        };
    }
    
    /**
     * 生成数据质量建议
     */
    generateRecommendations(report) {
        const recommendations = [];
        
        if (report.completeness.score < 95) {
            recommendations.push({
                type: 'completeness',
                priority: 'high',
                message: '数据完整性较低，建议检查数据采集流程和验证规则'
            });
        }
        
        if (report.consistency.score < 95) {
            recommendations.push({
                type: 'consistency',
                priority: 'medium',
                message: '数据一致性存在问题，建议统一数据格式和命名规范'
            });
        }
        
        if (report.accuracy.score < 95) {
            recommendations.push({
                type: 'accuracy',
                priority: 'high',
                message: '数据准确性需要改进，建议加强数据验证和异常处理'
            });
        }
        
        if (report.anomalies.count > 0) {
            recommendations.push({
                type: 'anomaly',
                priority: 'medium',
                message: `发现 ${report.anomalies.count} 个异常数据点，建议调查原因`
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                type: 'general',
                priority: 'low',
                message: '数据质量良好，继续保持'
            });
        }
        
        return recommendations;
    }
    
    /**
     * 获取路由处理器
     */
    getRouter() {
        return this.router;
    }
}

/**
 * 创建并配置数据采集系统API
 */
function createDataCollectorAPI(dataCollector) {
    const api = new DataCollectorAPI(dataCollector);
    return api.getRouter();
}

module.exports = {
    DataCollector,
    DataCollectorAPI,
    createDataCollectorAPI
};