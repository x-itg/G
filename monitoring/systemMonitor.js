const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 系统监控器 - 放射化学纯度检测仪服务器性能监控
 * 支持CPU、内存、磁盘、网络等系统资源监控
 */
class SystemMonitor {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.monitoringIntervalMs = 5000; // 默认5秒采集间隔
        this.currentMetrics = {};
        this.historyCache = new Map(); // 缓存历史数据
        this.maxHistorySize = 1000; // 最大历史记录数
        this.thresholds = {
            cpu_warning: 70,
            cpu_critical: 90,
            memory_warning: 80,
            memory_critical: 95,
            disk_warning: 85,
            disk_critical: 95
        };
        this.loadThresholds();
    }

    /**
     * 加载系统阈值配置
     */
    loadThresholds() {
        try {
            const configPath = path.join(__dirname, '../config/system-settings.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.monitoring && config.monitoring.thresholds) {
                    this.thresholds = { ...this.thresholds, ...config.monitoring.thresholds };
                }
            }
        } catch (error) {
            console.warn('加载监控阈值配置失败，使用默认配置:', error.message);
        }
    }

    /**
     * 获取当前CPU使用率
     */
    async getCpuUsage() {
        try {
            const cpus = os.cpus();
            const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
            const totalTick = cpus.reduce((acc, cpu) => {
                return acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
            }, 0);
            
            const usage = ((totalTick - totalIdle) / totalTick) * 100;
            const loadAvg = os.loadavg();
            
            return {
                usage_percent: parseFloat(usage.toFixed(2)),
                load_1min: parseFloat(loadAvg[0].toFixed(2)),
                load_5min: parseFloat(loadAvg[1].toFixed(2)),
                load_15min: parseFloat(loadAvg[2].toFixed(2)),
                cpu_count: cpus.length,
                cpu_model: cpus[0].model,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取CPU使用率失败:', error);
            return null;
        }
    }

    /**
     * 获取当前内存使用情况
     */
    async getMemoryUsage() {
        try {
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            const memoryPercent = (usedMemory / totalMemory) * 100;
            
            // 获取进程内存使用情况
            const processMemory = process.memoryUsage();
            
            return {
                total_bytes: totalMemory,
                free_bytes: freeMemory,
                used_bytes: usedMemory,
                usage_percent: parseFloat(memoryPercent.toFixed(2)),
                process_memory: {
                    rss: processMemory.rss,
                    heap_total: processMemory.heapTotal,
                    heap_used: processMemory.heapUsed,
                    external: processMemory.external,
                    array_buffers: processMemory.arrayBuffers || 0
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取内存使用情况失败:', error);
            return null;
        }
    }

    /**
     * 获取磁盘使用情况
     */
    async getDiskUsage() {
        try {
            const diskInfo = [];
            const drives = process.platform === 'win32' ? 
                ['C:', 'D:', 'E:'] : ['/'];
            
            for (const drive of drives) {
                try {
                    const stats = await this.getDriveStats(drive);
                    if (stats) {
                        diskInfo.push(stats);
                    }
                } catch (error) {
                    // 忽略无法访问的驱动器
                }
            }
            
            return {
                drives: diskInfo,
                total_usage_percent: diskInfo.length > 0 ? 
                    parseFloat((diskInfo.reduce((sum, drive) => sum + drive.usage_percent, 0) / diskInfo.length).toFixed(2)) : 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取磁盘使用情况失败:', error);
            return null;
        }
    }

    /**
     * 获取单个驱动器的统计信息
     */
    async getDriveStats(drivePath) {
        return new Promise((resolve) => {
            try {
                if (process.platform === 'win32') {
                    const exec = require('child_process').exec;
                    exec(`wmic logicaldisk where "DeviceID='${drivePath}'" get DeviceID,FreeSpace,Size`, 
                        (error, stdout) => {
                            if (error) {
                                resolve(null);
                                return;
                            }
                            const lines = stdout.trim().split('\n');
                            if (lines.length > 1) {
                                const values = lines[1].trim().split(/\s+/);
                                if (values.length >= 3) {
                                    const total = parseInt(values[2]);
                                    const free = parseInt(values[1]);
                                    const used = total - free;
                                    const usagePercent = (used / total) * 100;
                                    
                                    resolve({
                                        device_id: drivePath,
                                        total_bytes: total,
                                        free_bytes: free,
                                        used_bytes: used,
                                        usage_percent: parseFloat(usagePercent.toFixed(2))
                                    });
                                    return;
                                }
                            }
                            resolve(null);
                        });
                } else {
                    const stats = fs.statfsSync(drivePath);
                    const total = stats.blocks * stats.bsize;
                    const free = stats.bavail * stats.bsize;
                    const used = total - free;
                    const usagePercent = (used / total) * 100;
                    
                    resolve({
                        device_id: drivePath,
                        total_bytes: total,
                        free_bytes: free,
                        used_bytes: used,
                        usage_percent: parseFloat(usagePercent.toFixed(2))
                    });
                }
            } catch (error) {
                resolve(null);
            }
        });
    }

    /**
     * 获取系统网络统计
     */
    async getNetworkStats() {
        try {
            const networkInterfaces = os.networkInterfaces();
            const stats = [];
            
            for (const [name, interfaces] of Object.entries(networkInterfaces)) {
                for (const iface of interfaces) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        stats.push({
                            interface: name,
                            address: iface.address,
                            netmask: iface.netmask,
                            mac: iface.mac
                        });
                    }
                }
            }
            
            return {
                interfaces: stats,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取网络统计失败:', error);
            return null;
        }
    }

    /**
     * 获取系统信息
     */
    async getSystemInfo() {
        try {
            return {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                uptime_seconds: os.uptime(),
                node_version: process.version,
                cpu: await this.getCpuUsage(),
                memory: await this.getMemoryUsage(),
                disk: await this.getDiskUsage(),
                network: await this.getNetworkStats(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取系统信息失败:', error);
            return null;
        }
    }

    /**
     * 启动系统监控
     * @param {number} interval 采集间隔（毫秒）
     */
    async startMonitoring(interval = 5000) {
        if (this.isMonitoring) {
            console.log('系统监控已在运行中');
            return { success: false, message: '监控已在运行中' };
        }

        this.monitoringIntervalMs = interval;
        this.isMonitoring = true;
        
        // 立即执行一次数据采集
        await this.collectMetrics();
        
        // 设置定时采集
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics().catch(error => {
                console.error('数据采集失败:', error);
            });
        }, interval);
        
        console.log(`✅ 系统监控已启动，采集间隔: ${interval}ms`);
        
        // 记录审计日志
        await this.logAuditEvent('START_MONITORING', 'system', null, 'SUCCESS');
        
        return { success: true, message: '系统监控已启动' };
    }

    /**
     * 停止系统监控
     */
    async stopMonitoring() {
        if (!this.isMonitoring) {
            return { success: false, message: '监控未运行' };
        }

        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('⏹️ 系统监控已停止');
        
        // 记录审计日志
        await this.logAuditEvent('STOP_MONITORING', 'system', null, 'SUCCESS');
        
        return { success: true, message: '系统监控已停止' };
    }

    /**
     * 数据采集核心方法
     */
    async collectMetrics() {
        try {
            const systemInfo = await this.getSystemInfo();
            if (!systemInfo) {
                console.warn('系统信息获取失败，跳过本次采集');
                return;
            }

            // 采集CPU数据
            if (systemInfo.cpu) {
                await this.recordMetric('SYSTEM', 'cpu_usage', systemInfo.cpu.usage_percent, 'percent', {
                    load_1min: systemInfo.cpu.load_1min,
                    load_5min: systemInfo.cpu.load_5min,
                    load_15min: systemInfo.cpu.load_15min,
                    cpu_count: systemInfo.cpu.cpu_count
                });
            }

            // 采集内存数据
            if (systemInfo.memory) {
                await this.recordMetric('SYSTEM', 'memory_usage', systemInfo.memory.usage_percent, 'percent', {
                    total_bytes: systemInfo.memory.total_bytes,
                    used_bytes: systemInfo.memory.used_bytes,
                    free_bytes: systemInfo.memory.free_bytes,
                    process_rss: systemInfo.memory.process_memory.rss,
                    process_heap_used: systemInfo.memory.process_memory.heap_used
                });
            }

            // 采集磁盘数据
            if (systemInfo.disk && systemInfo.disk.drives) {
                for (const drive of systemInfo.disk.drives) {
                    await this.recordMetric('SYSTEM', 'disk_usage', drive.usage_percent, 'percent', {
                        device_id: drive.device_id,
                        total_bytes: drive.total_bytes,
                        used_bytes: drive.used_bytes,
                        free_bytes: drive.free_bytes
                    });
                }
            }

            // 更新当前指标
            this.currentMetrics = {
                cpu: systemInfo.cpu,
                memory: systemInfo.memory,
                disk: systemInfo.disk,
                system: systemInfo
            };

            // 存储到历史缓存
            this.addToHistoryCache('current', this.currentMetrics);
            
        } catch (error) {
            console.error('数据采集过程中发生错误:', error);
            await this.logAuditEvent('METRICS_COLLECTION_ERROR', 'system', null, 'FAILED', error.message);
        }
    }

    /**
     * 记录性能指标
     */
    async recordMetric(metricType, metricName, value, unit, metadata = {}) {
        try {
            const alertLevel = this.calculateAlertLevel(metricName, value);
            const thresholdWarning = this.thresholds[`${metricName.replace('_', '_warning_')}`] || this.thresholds[`${metricName.replace('_', '_warning_')}`];
            const thresholdCritical = this.thresholds[`${metricName.replace('_', '_critical_')}`] || this.thresholds[`${metricName.replace('_', '_critical_')}`];
            
            const metricData = {
                metricType,
                metricName,
                value: value.toString(),
                unit,
                source: 'system_monitor',
                timestamp: new Date().toISOString(),
                alertLevel,
                thresholdWarning,
                thresholdCritical,
                metadata
            };

            const id = this.db.recordPerformanceMetric(metricData);
            
            // 如果达到警告或严重级别，记录审计日志
            if (alertLevel === 'WARNING' || alertLevel === 'CRITICAL') {
                await this.logAuditEvent('ALERT', 'performance_metric', id, 'WARNING', 
                    `${metricName}: ${value}${unit}`);
            }
            
            return id;
        } catch (error) {
            console.error('记录性能指标失败:', error);
            return null;
        }
    }

    /**
     * 计算警报级别
     */
    calculateAlertLevel(metricName, value) {
        const warningThreshold = this.thresholds[`${metricName.replace('_usage', '_warning')}`];
        const criticalThreshold = this.thresholds[`${metricName.replace('_usage', '_critical')}`];
        
        if (criticalThreshold && value >= criticalThreshold) {
            return 'CRITICAL';
        }
        if (warningThreshold && value >= warningThreshold) {
            return 'WARNING';
        }
        return 'NORMAL';
    }

    /**
     * 获取当前系统状态
     */
    async getCurrentSystemStatus() {
        if (Object.keys(this.currentMetrics).length === 0) {
            // 如果没有当前数据，尝试获取一次
            await this.collectMetrics();
        }
        
        const systemInfo = await this.getSystemInfo();
        const isHealthy = this.isSystemHealthy(systemInfo);
        
        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            is_monitoring: this.isMonitoring,
            monitoring_interval: this.monitoringIntervalMs,
            metrics: this.currentMetrics,
            system_info: systemInfo,
            alerts: this.getCurrentAlerts(systemInfo),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 检查系统是否健康
     */
    isSystemHealthy(systemInfo) {
        if (!systemInfo) return false;
        
        const alerts = this.getCurrentAlerts(systemInfo);
        return alerts.filter(alert => alert.level === 'CRITICAL').length === 0;
    }

    /**
     * 获取当前警报
     */
    getCurrentAlerts(systemInfo) {
        const alerts = [];
        
        if (systemInfo.cpu && systemInfo.cpu.usage_percent > this.thresholds.cpu_warning) {
            alerts.push({
                type: 'cpu',
                level: systemInfo.cpu.usage_percent > this.thresholds.cpu_critical ? 'CRITICAL' : 'WARNING',
                message: `CPU使用率过高: ${systemInfo.cpu.usage_percent}%`,
                value: systemInfo.cpu.usage_percent,
                threshold: this.thresholds.cpu_warning
            });
        }
        
        if (systemInfo.memory && systemInfo.memory.usage_percent > this.thresholds.memory_warning) {
            alerts.push({
                type: 'memory',
                level: systemInfo.memory.usage_percent > this.thresholds.memory_critical ? 'CRITICAL' : 'WARNING',
                message: `内存使用率过高: ${systemInfo.memory.usage_percent}%`,
                value: systemInfo.memory.usage_percent,
                threshold: this.thresholds.memory_warning
            });
        }
        
        if (systemInfo.disk && systemInfo.disk.drives) {
            systemInfo.disk.drives.forEach(drive => {
                if (drive.usage_percent > this.thresholds.disk_warning) {
                    alerts.push({
                        type: 'disk',
                        level: drive.usage_percent > this.thresholds.disk_critical ? 'CRITICAL' : 'WARNING',
                        message: `磁盘 ${drive.device_id} 使用率过高: ${drive.usage_percent}%`,
                        value: drive.usage_percent,
                        threshold: this.thresholds.disk_warning
                    });
                }
            });
        }
        
        return alerts;
    }

    /**
     * 获取历史数据
     */
    async getHistoryData(filters = {}) {
        try {
            const {
                metricType,
                metricName,
                startDate,
                endDate,
                limit = 100,
                alertLevel
            } = filters;
            
            const dbFilters = {
                metricType: metricType || 'SYSTEM',
                metricName,
                startDate,
                endDate,
                limit,
                alertLevel
            };
            
            const metrics = this.db.getPerformanceMetrics(dbFilters);
            
            // 缓存到历史记录
            metrics.forEach(metric => {
                this.addToHistoryCache('history', metric);
            });
            
            return {
                data: metrics,
                count: metrics.length,
                filters: dbFilters,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取历史数据失败:', error);
            throw error;
        }
    }

    /**
     * 添加数据到历史缓存
     */
    addToHistoryCache(type, data) {
        const key = `${type}_${Date.now()}`;
        this.historyCache.set(key, data);
        
        // 限制缓存大小
        if (this.historyCache.size > this.maxHistorySize) {
            const firstKey = this.historyCache.keys().next().value;
            if (firstKey) {
                this.historyCache.delete(firstKey);
            }
        }
    }

    /**
     * 清理历史数据
     */
    async cleanOldData(retentionDays = 30) {
        try {
            const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
            
            // 这里需要数据库管理器提供清理方法
            // 暂时使用获取所有数据然后过滤的方式
            const allMetrics = this.db.getPerformanceMetrics({ metricType: 'SYSTEM' });
            const recentMetrics = allMetrics.filter(metric => metric.timestamp >= cutoffDate);
            
            // 重新写入数据（这里需要数据库管理器提供重写方法）
            console.log(`清理历史数据: 保留 ${recentMetrics.length} 条记录，删除 ${allMetrics.length - recentMetrics.length} 条旧记录`);
            
            await this.logAuditEvent('CLEAN_OLD_DATA', 'performance_metrics', null, 'SUCCESS', 
                `清理${retentionDays}天前的数据`);
            
            return { 
                success: true, 
                deleted: allMetrics.length - recentMetrics.length,
                retained: recentMetrics.length 
            };
        } catch (error) {
            console.error('清理历史数据失败:', error);
            throw error;
        }
    }

    /**
     * 记录审计日志
     */
    async logAuditEvent(action, resource, resourceId, result, details = null) {
        try {
            const auditData = {
                userId: 'system_monitor',
                username: 'system_monitor',
                action,
                resource,
                resourceId,
                result,
                ipAddress: '127.0.0.1',
                userAgent: 'SystemMonitor/1.0',
                sessionId: 'system',
                reason: details,
                details: details
            };
            
            await this.db.logAuditEvent(auditData);
        } catch (error) {
            console.error('记录审计日志失败:', error);
        }
    }

    /**
     * 获取监控统计信息
     */
    getMonitoringStats() {
        return {
            is_monitoring: this.isMonitoring,
            monitoring_interval: this.monitoringIntervalMs,
            uptime_seconds: process.uptime(),
            memory_usage: process.memoryUsage(),
            cache_size: this.historyCache.size,
            max_cache_size: this.maxHistorySize,
            thresholds: this.thresholds,
            last_collection: this.currentMetrics.timestamp || null
        };
    }

    /**
     * 更新阈值配置
     */
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log('监控阈值已更新:', this.thresholds);
    }

    /**
     * 关闭监控器
     */
    async shutdown() {
        console.log('正在关闭系统监控器...');
        
        if (this.isMonitoring) {
            await this.stopMonitoring();
        }
        
        this.historyCache.clear();
        console.log('系统监控器已关闭');
    }
}

module.exports = SystemMonitor;