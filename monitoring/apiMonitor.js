/**
 * API响应时间统计和监控模块
 * 为放射化学纯度检测仪实现API性能监控功能
 * 
 * 功能特性:
 * - API响应时间统计（平均、最小、最大、95分位）
 * - API请求频率统计  
 * - 错误率监控（4xx、5xx错误）
 * - API可用性监控
 * - 请求追踪功能（请求ID、请求日志、请求链路）
 * - Express中间件自动监控
 * - 实时性能数据采集
 * 
 * @author 放射化学纯度检测仪开发团队
 * @version 1.0.0
 */

const crypto = require('crypto');
const os = require('os');

/**
 * API监控器类
 */
class APIMonitor {
    constructor(dbManager = null) {
        this.dbManager = dbManager;
        this.requestMetrics = new Map();
        this.errorMetrics = new Map();
        this.availabilityMetrics = new Map();
        this.performanceData = new Map();
        this.activeRequests = new Map();
        
        // 配置参数
        this.config = {
            responseTimeThresholds: {
                warning: 1000,   // 1秒
                critical: 3000   // 3秒
            },
            errorRateThresholds: {
                warning: 5,      // 5%
                critical: 10     // 10%
            },
            availabilityThresholds: {
                warning: 99,     // 99%
                critical: 95     // 95%
            },
            samplingRate: 0.1,   // 10%采样率用于详细追踪
            metricsRetention: 24 * 60 * 60 * 1000, // 24小时
            cleanupInterval: 5 * 60 * 1000        // 5分钟清理一次
        };
        
        // 初始化指标
        this.initializeMetrics();
        
        // 启动定时清理任务
        this.startCleanupTask();
        
        console.log('✅ API监控器初始化完成');
    }

    /**
     * 初始化性能指标
     */
    initializeMetrics() {
        const currentHour = new Date().getHours();
        
        // 初始化各小时的请求统计
        for (let hour = 0; hour < 24; hour++) {
            this.performanceData.set(`hour_${hour}`, {
                requests: 0,
                responseTimes: [],
                errors: 0,
                statusCodes: {},
                endpoints: new Map(),
                hourlyStats: {
                    avgResponseTime: 0,
                    minResponseTime: Infinity,
                    maxResponseTime: 0,
                    percentile95: 0,
                    errorRate: 0,
                    totalRequests: 0
                }
            });
        }
    }

    /**
     * 生成请求ID
     */
    generateRequestId() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Express中间件 - 请求跟踪
     */
    requestTracking(req, res, next) {
        const requestId = this.generateRequestId();
        const startTime = process.hrtime.bigint();
        
        // 添加请求信息到request对象
        req.requestId = requestId;
        req.startTime = startTime;
        // 修复: req.ip是只读属性，不能赋值
        const clientIp = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
        req.userAgent = req.get('User-Agent') || '';
        req.referrer = req.get('Referrer') || '';
        
        // 记录活跃请求
        this.activeRequests.set(requestId, {
            id: requestId,
            method: req.method,
            url: req.url,
            startTime: new Date(),
            ip: clientIp,
            userAgent: req.userAgent,
            status: 'active',
            userId: req.user?.id || null,
            username: req.user?.username || null
        });

        // 获取或创建端点指标
        const endpoint = this.getOrCreateEndpointMetrics(req.method, req.route?.path || req.path);
        
        // 监听响应结束
        const originalEnd = res.end;
        res.end = (...args) => {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒
            
            // 更新活跃请求状态
            const requestInfo = this.activeRequests.get(requestId);
            if (requestInfo) {
                requestInfo.status = 'completed';
                requestInfo.duration = duration;
                requestInfo.statusCode = res.statusCode;
                requestInfo.endTime = new Date();
            }
            
            // 记录性能指标
            this.recordRequestMetrics(req, res, duration, endpoint);
            
            // 数据库记录（异步）
            if (this.dbManager) {
                this.recordToDatabase(req, res, duration, requestId).catch(console.error);
            }
            
            // 计算百分位数
            this.updatePercentiles(endpoint);
            
            originalEnd.apply(res, args);
        };

        // 监听错误
        res.on('error', (error) => {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000;
            
            const requestInfo = this.activeRequests.get(requestId);
            if (requestInfo) {
                requestInfo.status = 'error';
                requestInfo.error = error.message;
                requestInfo.duration = duration;
                requestInfo.endTime = new Date();
            }
            
            this.recordErrorMetrics(req, res, error);
            
            if (this.dbManager) {
                this.recordErrorToDatabase(req, res, error, requestId).catch(console.error);
            }
        });

        next();
    }

    /**
     * 获取或创建端点指标
     */
    getOrCreateEndpointMetrics(method, path) {
        const endpointKey = `${method}:${path}`;
        
        if (!this.requestMetrics.has(endpointKey)) {
            this.requestMetrics.set(endpointKey, {
                method,
                path,
                totalRequests: 0,
                totalResponseTime: 0,
                responseTimes: [],
                errors: 0,
                statusCodes: {
                    '2xx': 0,
                    '3xx': 0,
                    '4xx': 0,
                    '5xx': 0
                },
                hourlyRequests: new Array(24).fill(0),
                lastRequestTime: null,
                availability: {
                    totalRequests: 0,
                    successfulRequests: 0,
                    availability: 100
                }
            });
        }
        
        return this.requestMetrics.get(endpointKey);
    }

    /**
     * 记录请求指标
     */
    recordRequestMetrics(req, res, duration, endpoint) {
        const hour = new Date().getHours();
        
        // 更新端点指标
        endpoint.totalRequests++;
        endpoint.totalResponseTime += duration;
        endpoint.responseTimes.push(duration);
        endpoint.lastRequestTime = new Date();
        
        // 限制数组大小以节省内存
        if (endpoint.responseTimes.length > 1000) {
            endpoint.responseTimes = endpoint.responseTimes.slice(-500);
        }
        
        // 统计状态码
        const statusGroup = Math.floor(res.statusCode / 100) + 'xx';
        if (endpoint.statusCodes[statusGroup] !== undefined) {
            endpoint.statusCodes[statusGroup]++;
        }
        
        // 更新小时统计
        const currentHourData = this.performanceData.get(`hour_${hour}`);
        currentHourData.requests++;
        currentHourData.responseTimes.push(duration);
        
        if (res.statusCode >= 400) {
            currentHourData.errors++;
            endpoint.errors++;
        }
        
        // 更新端点小时统计
        endpoint.hourlyRequests[hour]++;
        
        // 更新可用性指标
        endpoint.availability.totalRequests++;
        if (res.statusCode < 400) {
            endpoint.availability.successfulRequests++;
        }
        endpoint.availability.availability = (endpoint.availability.successfulRequests / endpoint.availability.totalRequests) * 100;
        
        // 记录到端点详细统计
        const endpointDetailKey = `${req.method}:${req.path}`;
        if (!currentHourData.endpoints.has(endpointDetailKey)) {
            currentHourData.endpoints.set(endpointDetailKey, {
                method: req.method,
                path: req.path,
                requests: 0,
                errors: 0,
                avgResponseTime: 0,
                totalResponseTime: 0
            });
        }
        
        const endpointDetail = currentHourData.endpoints.get(endpointDetailKey);
        endpointDetail.requests++;
        endpointDetail.totalResponseTime += duration;
        
        if (res.statusCode >= 400) {
            endpointDetail.errors++;
        }
        
        endpointDetail.avgResponseTime = endpointDetail.totalResponseTime / endpointDetail.requests;
    }

    /**
     * 记录错误指标
     */
    recordErrorMetrics(req, res, error) {
        const errorKey = `${req.method}:${req.path}`;
        const errorType = res.statusCode >= 500 ? 'server_error' : 
                         res.statusCode >= 400 ? 'client_error' : 'other_error';
        
        if (!this.errorMetrics.has(errorKey)) {
            this.errorMetrics.set(errorKey, {
                method: req.method,
                path: req.path,
                totalErrors: 0,
                errors: {
                    server_error: 0,
                    client_error: 0,
                    other_error: 0
                },
                errorMessages: new Map(),
                lastErrorTime: null,
                hourlyErrors: new Array(24).fill(0)
            });
        }
        
        const errorMetrics = this.errorMetrics.get(errorKey);
        errorMetrics.totalErrors++;
        errorMetrics.errors[errorType]++;
        errorMetrics.lastErrorTime = new Date();
        
        const hour = new Date().getHours();
        errorMetrics.hourlyErrors[hour]++;
        
        // 记录错误消息
        const message = error.message || 'Unknown error';
        if (!errorMetrics.errorMessages.has(message)) {
            errorMetrics.errorMessages.set(message, 0);
        }
        errorMetrics.errorMessages.set(message, errorMetrics.errorMessages.get(message) + 1);
        
        // 限制错误消息数量
        if (errorMetrics.errorMessages.size > 50) {
            const firstKey = errorMetrics.errorMessages.keys().next().value;
            errorMetrics.errorMessages.delete(firstKey);
        }
    }

    /**
     * 更新百分位数
     */
    updatePercentiles(endpoint) {
        if (endpoint.responseTimes.length === 0) return;
        
        const sortedTimes = [...endpoint.responseTimes].sort((a, b) => a - b);
        const count = sortedTimes.length;
        
        endpoint.minResponseTime = sortedTimes[0];
        endpoint.maxResponseTime = sortedTimes[count - 1];
        endpoint.avgResponseTime = endpoint.totalResponseTime / endpoint.totalRequests;
        
        // 计算95百分位数
        const percentile95Index = Math.ceil(count * 0.95) - 1;
        endpoint.percentile95 = sortedTimes[Math.max(0, percentile95Index)];
    }

    /**
     * 记录到数据库
     */
    async recordToDatabase(req, res, duration, requestId) {
        try {
            const metricData = {
                metricType: 'api_performance',
                metricName: 'api_response_time',
                value: duration,
                unit: 'ms',
                tags: JSON.stringify({
                    method: req.method,
                    endpoint: req.path,
                    status_code: res.statusCode,
                    request_id: requestId,
                    user_id: req.user?.id || null,
                    user_agent: req.userAgent,
                    ip_address: req.ip
                }),
                source: 'api_monitor',
                alertLevel: duration > this.config.responseTimeThresholds.critical ? 'CRITICAL' :
                           duration > this.config.responseTimeThresholds.warning ? 'WARNING' : 'NORMAL',
                thresholdWarning: this.config.responseTimeThresholds.warning,
                thresholdCritical: this.config.responseTimeThresholds.critical,
                metadata: JSON.stringify({
                    request_id: requestId,
                    user_id: req.user?.id || null,
                    username: req.user?.username || null,
                    referrer: req.referrer,
                    start_time: new Date(Number(process.hrtime.bigint() - BigInt(duration * 1000000))).toISOString()
                })
            };
            
            await this.dbManager.recordPerformanceMetric(metricData);
        } catch (error) {
            console.error('记录API性能指标失败:', error);
        }
    }

    /**
     * 记录错误到数据库
     */
    async recordErrorToDatabase(req, res, error, requestId) {
        try {
            const errorData = {
                metricType: 'api_error',
                metricName: 'api_error_rate',
                value: 1,
                unit: 'count',
                tags: JSON.stringify({
                    method: req.method,
                    endpoint: req.path,
                    status_code: res.statusCode,
                    error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
                    request_id: requestId
                }),
                source: 'api_monitor',
                alertLevel: 'ERROR',
                metadata: JSON.stringify({
                    request_id: requestId,
                    error_message: error.message,
                    stack_trace: error.stack
                })
            };
            
            await this.dbManager.recordPerformanceMetric(errorData);
        } catch (dbError) {
            console.error('记录API错误指标失败:', dbError);
        }
    }

    /**
     * 获取API统计信息
     */
    getApiStatistics(timeRange = '1h') {
        const now = new Date();
        const currentHour = now.getHours();
        
        let timeRangeHours = 1;
        switch (timeRange) {
            case '15m': timeRangeHours = 0.25; break;
            case '1h': timeRangeHours = 1; break;
            case '6h': timeRangeHours = 6; break;
            case '24h': timeRangeHours = 24; break;
            case '7d': timeRangeHours = 168; break;
            default: timeRangeHours = 1;
        }
        
        // 计算统计数据
        let totalRequests = 0;
        let totalResponseTime = 0;
        let totalErrors = 0;
        const responseTimes = [];
        
        this.requestMetrics.forEach(endpoint => {
            totalRequests += endpoint.totalRequests;
            totalResponseTime += endpoint.totalResponseTime;
            totalErrors += endpoint.errors;
            responseTimes.push(...endpoint.responseTimes);
        });
        
        // 计算指标
        const avgResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
        const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
        const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
        
        // 计算95百分位数
        let percentile95 = 0;
        if (responseTimes.length > 0) {
            const sortedTimes = responseTimes.sort((a, b) => a - b);
            const percentile95Index = Math.ceil(sortedTimes.length * 0.95) - 1;
            percentile95 = sortedTimes[Math.max(0, percentile95Index)];
        }
        
        const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
        
        return {
            time_range: timeRange,
            timestamp: now.toISOString(),
            metrics: {
                total_requests: totalRequests,
                total_response_time: totalResponseTime,
                average_response_time: avgResponseTime,
                min_response_time: minResponseTime,
                max_response_time: maxResponseTime,
                percentile_95: percentile95,
                total_errors: totalErrors,
                error_rate: errorRate,
                success_rate: 100 - errorRate
            },
            status_code_distribution: this.getStatusCodeDistribution(),
            top_endpoints: this.getTopEndpoints(10)
        };
    }

    /**
     * 获取状态码分布
     */
    getStatusCodeDistribution() {
        const distribution = {
            '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0
        };
        
        this.requestMetrics.forEach(endpoint => {
            Object.keys(distribution).forEach(code => {
                distribution[code] += endpoint.statusCodes[code] || 0;
            });
        });
        
        return distribution;
    }

    /**
     * 获取热门端点
     */
    getTopEndpoints(limit = 10) {
        const endpoints = [];
        
        this.requestMetrics.forEach((metrics, key) => {
            endpoints.push({
                endpoint: key,
                method: metrics.method,
                path: metrics.path,
                total_requests: metrics.totalRequests,
                avg_response_time: metrics.avgResponseTime,
                error_rate: metrics.totalRequests > 0 ? (metrics.errors / metrics.totalRequests) * 100 : 0,
                availability: metrics.availability.availability
            });
        });
        
        return endpoints.sort((a, b) => b.total_requests - a.total_requests).slice(0, limit);
    }

    /**
     * 获取API性能详情
     */
    getApiPerformance(timeRange = '1h') {
        const statistics = this.getApiStatistics(timeRange);
        const hourlyData = this.getHourlyPerformanceData(timeRange);
        
        return {
            time_range: timeRange,
            timestamp: new Date().toISOString(),
            ...statistics,
            hourly_data: hourlyData,
            endpoints: this.getEndpointPerformance(),
            trends: this.calculateTrends()
        };
    }

    /**
     * 获取每小时性能数据
     */
    getHourlyPerformanceData(timeRange = '1h') {
        const now = new Date();
        const currentHour = now.getHours();
        
        const hours = [];
        const timeRangeHours = Math.min(parseInt(timeRange), 24);
        
        for (let i = timeRangeHours - 1; i >= 0; i--) {
            const hour = (currentHour - i + 24) % 24;
            const hourData = this.performanceData.get(`hour_${hour}`);
            
            if (hourData) {
                hours.push({
                    hour: hour,
                    requests: hourData.requests,
                    errors: hourData.errors,
                    error_rate: hourData.requests > 0 ? (hourData.errors / hourData.requests) * 100 : 0,
                    avg_response_time: hourData.requests > 0 ? 
                        hourData.responseTimes.reduce((a, b) => a + b, 0) / hourData.requests : 0,
                    max_response_time: hourData.responseTimes.length > 0 ? 
                        Math.max(...hourData.responseTimes) : 0,
                    percentile_95: this.calculatePercentile(hourData.responseTimes, 95)
                });
            }
        }
        
        return hours;
    }

    /**
     * 计算百分位数
     */
    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * percentile / 100) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * 获取端点性能详情
     */
    getEndpointPerformance() {
        const endpoints = [];
        
        this.requestMetrics.forEach((metrics, key) => {
            endpoints.push({
                endpoint: key,
                method: metrics.method,
                path: metrics.path,
                total_requests: metrics.totalRequests,
                avg_response_time: metrics.avgResponseTime || 0,
                min_response_time: metrics.minResponseTime || 0,
                max_response_time: metrics.maxResponseTime || 0,
                percentile_95: metrics.percentile95 || 0,
                errors: metrics.errors,
                error_rate: metrics.totalRequests > 0 ? (metrics.errors / metrics.totalRequests) * 100 : 0,
                status_codes: metrics.statusCodes,
                availability: metrics.availability.availability,
                last_request: metrics.lastRequestTime ? metrics.lastRequestTime.toISOString() : null,
                hourly_requests: metrics.hourlyRequests
            });
        });
        
        return endpoints.sort((a, b) => b.total_requests - a.total_requests);
    }

    /**
     * 计算趋势
     */
    calculateTrends() {
        // 简化的趋势计算
        const now = new Date();
        const currentHour = now.getHours();
        
        const currentHourData = this.performanceData.get(`hour_${currentHour}`);
        const previousHourData = this.performanceData.get(`hour_${(currentHour - 1 + 24) % 24}`);
        
        if (!currentHourData || !previousHourData) {
            return {
                request_trend: 'stable',
                response_time_trend: 'stable',
                error_rate_trend: 'stable'
            };
        }
        
        const currentAvgResponseTime = currentHourData.requests > 0 ? 
            currentHourData.responseTimes.reduce((a, b) => a + b, 0) / currentHourData.requests : 0;
        const previousAvgResponseTime = previousHourData.requests > 0 ? 
            previousHourData.responseTimes.reduce((a, b) => a + b, 0) / previousHourData.requests : 0;
        
        const currentErrorRate = currentHourData.requests > 0 ? 
            (currentHourData.errors / currentHourData.requests) * 100 : 0;
        const previousErrorRate = previousHourData.requests > 0 ? 
            (previousHourData.errors / previousHourData.requests) * 100 : 0;
        
        return {
            request_trend: currentHourData.requests > previousHourData.requests ? 'increasing' : 'decreasing',
            response_time_trend: currentAvgResponseTime > previousAvgResponseTime ? 'increasing' : 'decreasing',
            error_rate_trend: currentErrorRate > previousErrorRate ? 'increasing' : 'decreasing',
            request_change_percent: previousHourData.requests > 0 ? 
                ((currentHourData.requests - previousHourData.requests) / previousHourData.requests) * 100 : 0,
            response_time_change_percent: previousAvgResponseTime > 0 ? 
                ((currentAvgResponseTime - previousAvgResponseTime) / previousAvgResponseTime) * 100 : 0,
            error_rate_change_percent: previousErrorRate > 0 ? 
                ((currentErrorRate - previousErrorRate) / previousErrorRate) * 100 : 0
        };
    }

    /**
     * 获取错误统计
     */
    getErrorStatistics(timeRange = '1h') {
        const now = new Date();
        const totalErrors = Array.from(this.errorMetrics.values())
            .reduce((sum, metrics) => sum + metrics.totalErrors, 0);
        
        const errorTypes = {
            server_error: 0,
            client_error: 0,
            other_error: 0
        };
        
        const errorMessages = new Map();
        
        this.errorMetrics.forEach(metrics => {
            Object.keys(errorTypes).forEach(type => {
                errorTypes[type] += metrics.errors[type] || 0;
            });
            
            metrics.errorMessages.forEach((count, message) => {
                errorMessages.set(message, (errorMessages.get(message) || 0) + count);
            });
        });
        
        // 获取最常见的错误
        const topErrors = Array.from(errorMessages.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([message, count]) => ({ message, count }));
        
        return {
            time_range: timeRange,
            timestamp: now.toISOString(),
            total_errors: totalErrors,
            error_types: errorTypes,
            top_errors: topErrors,
            error_distribution: this.getErrorDistribution(),
            hourly_errors: this.getHourlyErrorData(timeRange)
        };
    }

    /**
     * 获取错误分布
     */
    getErrorDistribution() {
        const distribution = {
            by_status_code: {},
            by_endpoint: {}
        };
        
        this.requestMetrics.forEach((metrics, endpoint) => {
            Object.keys(metrics.statusCodes).forEach(code => {
                if (code >= '4xx') {
                    distribution.by_status_code[code] = (distribution.by_status_code[code] || 0) + metrics.statusCodes[code];
                }
            });
            
            if (metrics.errors > 0) {
                distribution.by_endpoint[endpoint] = metrics.errors;
            }
        });
        
        return distribution;
    }

    /**
     * 获取每小时错误数据
     */
    getHourlyErrorData(timeRange = '1h') {
        const now = new Date();
        const currentHour = now.getHours();
        
        const hours = [];
        const timeRangeHours = Math.min(parseInt(timeRange), 24);
        
        for (let i = timeRangeHours - 1; i >= 0; i--) {
            const hour = (currentHour - i + 24) % 24;
            let hourErrors = 0;
            
            this.errorMetrics.forEach(metrics => {
                hourErrors += metrics.hourlyErrors[hour] || 0;
            });
            
            hours.push({
                hour: hour,
                errors: hourErrors
            });
        }
        
        return hours;
    }

    /**
     * 获取可用性统计
     */
    getAvailabilityStatistics(timeRange = '1h') {
        const now = new Date();
        const endpoints = [];
        
        this.requestMetrics.forEach((metrics, endpoint) => {
            const availability = metrics.availability.availability;
            const status = availability >= this.config.availabilityThresholds.critical ? 'CRITICAL' :
                          availability >= this.config.availabilityThresholds.warning ? 'WARNING' : 'GOOD';
            
            endpoints.push({
                endpoint: endpoint,
                method: metrics.method,
                path: metrics.path,
                availability: availability,
                status: status,
                total_requests: metrics.availability.totalRequests,
                successful_requests: metrics.availability.successfulRequests,
                failed_requests: metrics.availability.totalRequests - metrics.availability.successfulRequests
            });
        });
        
        // 计算总体可用性
        const totalRequests = endpoints.reduce((sum, ep) => sum + ep.total_requests, 0);
        const totalSuccessful = endpoints.reduce((sum, ep) => sum + ep.successful_requests, 0);
        const overallAvailability = totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 100;
        
        return {
            time_range: timeRange,
            timestamp: now.toISOString(),
            overall_availability: overallAvailability,
            endpoint_count: endpoints.length,
            good_endpoints: endpoints.filter(ep => ep.status === 'GOOD').length,
            warning_endpoints: endpoints.filter(ep => ep.status === 'WARNING').length,
            critical_endpoints: endpoints.filter(ep => ep.status === 'CRITICAL').length,
            endpoints: endpoints.sort((a, b) => a.availability - b.availability),
            availability_trends: this.getAvailabilityTrends()
        };
    }

    /**
     * 获取可用性趋势
     */
    getAvailabilityTrends() {
        // 简化的可用性趋势计算
        return {
            trend: 'stable',
            average_availability: this.calculateAverageAvailability(),
            availability_change: 0
        };
    }

    /**
     * 计算平均可用性
     */
    calculateAverageAvailability() {
        const availabilities = Array.from(this.requestMetrics.values())
            .map(metrics => metrics.availability.availability);
        
        return availabilities.length > 0 ? 
            availabilities.reduce((sum, availability) => sum + availability, 0) / availabilities.length : 100;
    }

    /**
     * 获取实时监控数据
     */
    getRealTimeData() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentHourData = this.performanceData.get(`hour_${currentHour}`);
        
        return {
            timestamp: now.toISOString(),
            current_metrics: {
                requests_this_hour: currentHourData ? currentHourData.requests : 0,
                errors_this_hour: currentHourData ? currentHourData.errors : 0,
                avg_response_time_this_hour: currentHourData && currentHourData.requests > 0 ? 
                    currentHourData.responseTimes.reduce((a, b) => a + b, 0) / currentHourData.requests : 0,
                error_rate_this_hour: currentHourData && currentHourData.requests > 0 ? 
                    (currentHourData.errors / currentHourData.requests) * 100 : 0
            },
            active_requests: this.getActiveRequests(),
            recent_errors: this.getRecentErrors(),
            performance_alerts: this.getPerformanceAlerts()
        };
    }

    /**
     * 获取活跃请求
     */
    getActiveRequests(limit = 10) {
        const active = Array.from(this.activeRequests.values())
            .filter(req => req.status === 'active')
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, limit);
        
        return active.map(req => ({
            request_id: req.id,
            method: req.method,
            url: req.url,
            start_time: req.startTime.toISOString(),
            duration: req.duration || 0,
            ip: req.ip,
            user_agent: req.userAgent
        }));
    }

    /**
     * 获取最近错误
     */
    getRecentErrors(limit = 10) {
        const errors = [];
        
        this.errorMetrics.forEach(metrics => {
            if (metrics.errorMessages.size > 0) {
                metrics.errorMessages.forEach((count, message) => {
                    errors.push({
                        endpoint: `${metrics.method}:${metrics.path}`,
                        error_message: message,
                        count: count,
                        last_error: metrics.lastErrorTime ? metrics.lastErrorTime.toISOString() : null
                    });
                });
            }
        });
        
        return errors.sort((a, b) => new Date(b.last_error) - new Date(a.last_error)).slice(0, limit);
    }

    /**
     * 获取性能告警
     */
    getPerformanceAlerts() {
        const alerts = [];
        
        this.requestMetrics.forEach((metrics, endpoint) => {
            // 响应时间告警
            if (metrics.avgResponseTime > this.config.responseTimeThresholds.critical) {
                alerts.push({
                    type: 'CRITICAL',
                    category: 'response_time',
                    endpoint: endpoint,
                    message: `API响应时间严重超标: ${metrics.avgResponseTime.toFixed(2)}ms`,
                    value: metrics.avgResponseTime,
                    threshold: this.config.responseTimeThresholds.critical
                });
            } else if (metrics.avgResponseTime > this.config.responseTimeThresholds.warning) {
                alerts.push({
                    type: 'WARNING',
                    category: 'response_time',
                    endpoint: endpoint,
                    message: `API响应时间超过警告阈值: ${metrics.avgResponseTime.toFixed(2)}ms`,
                    value: metrics.avgResponseTime,
                    threshold: this.config.responseTimeThresholds.warning
                });
            }
            
            // 错误率告警
            const errorRate = metrics.totalRequests > 0 ? (metrics.errors / metrics.totalRequests) * 100 : 0;
            if (errorRate > this.config.errorRateThresholds.critical) {
                alerts.push({
                    type: 'CRITICAL',
                    category: 'error_rate',
                    endpoint: endpoint,
                    message: `API错误率严重超标: ${errorRate.toFixed(2)}%`,
                    value: errorRate,
                    threshold: this.config.errorRateThresholds.critical
                });
            } else if (errorRate > this.config.errorRateThresholds.warning) {
                alerts.push({
                    type: 'WARNING',
                    category: 'error_rate',
                    endpoint: endpoint,
                    message: `API错误率超过警告阈值: ${errorRate.toFixed(2)}%`,
                    value: errorRate,
                    threshold: this.config.errorRateThresholds.warning
                });
            }
            
            // 可用性告警
            if (metrics.availability.availability < this.config.availabilityThresholds.critical) {
                alerts.push({
                    type: 'CRITICAL',
                    category: 'availability',
                    endpoint: endpoint,
                    message: `API可用性严重不达标: ${metrics.availability.availability.toFixed(2)}%`,
                    value: metrics.availability.availability,
                    threshold: this.config.availabilityThresholds.critical
                });
            } else if (metrics.availability.availability < this.config.availabilityThresholds.warning) {
                alerts.push({
                    type: 'WARNING',
                    category: 'availability',
                    endpoint: endpoint,
                    message: `API可用性低于警告阈值: ${metrics.availability.availability.toFixed(2)}%`,
                    value: metrics.availability.availability,
                    threshold: this.config.availabilityThresholds.warning
                });
            }
        });
        
        return alerts.sort((a, b) => {
            const typeOrder = { CRITICAL: 0, WARNING: 1 };
            return typeOrder[a.type] - typeOrder[b.type];
        });
    }

    /**
     * 获取性能趋势图表数据
     */
    getPerformanceChartData(period = '24h') {
        const now = new Date();
        const hourlyData = this.getHourlyPerformanceData(period);
        
        return {
            period: period,
            timestamp: now.toISOString(),
            chart_data: {
                response_time_trend: {
                    labels: hourlyData.map(d => `${d.hour}:00`),
                    datasets: [{
                        label: '平均响应时间 (ms)',
                        data: hourlyData.map(d => d.avg_response_time),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.4
                    }]
                },
                request_frequency_trend: {
                    labels: hourlyData.map(d => `${d.hour}:00`),
                    datasets: [{
                        label: '请求数量',
                        data: hourlyData.map(d => d.requests),
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        tension: 0.4
                    }]
                },
                error_rate_trend: {
                    labels: hourlyData.map(d => `${d.hour}:00`),
                    datasets: [{
                        label: '错误率 (%)',
                        data: hourlyData.map(d => d.error_rate),
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.4
                    }]
                }
            },
            heatmap_data: this.getHeatmapData(period)
        };
    }

    /**
     * 获取API调用热力图数据
     */
    getHeatmapData(period = '24h') {
        const heatmapData = [];
        
        // 按小时和星期分组
        const now = new Date();
        const dayOfWeek = now.getDay();
        
        for (let hour = 0; hour < 24; hour++) {
            const hourData = this.performanceData.get(`hour_${hour}`);
            if (hourData) {
                heatmapData.push({
                    day: dayOfWeek,
                    hour: hour,
                    value: hourData.requests,
                    intensity: this.getHeatmapIntensity(hourData.requests)
                });
            }
        }
        
        return heatmapData;
    }

    /**
     * 获取热力图强度
     */
    getHeatmapIntensity(value) {
        const maxValue = Math.max(...Array.from(this.performanceData.values())
            .map(d => d.requests));
        
        if (maxValue === 0) return 0;
        
        const intensity = value / maxValue;
        
        if (intensity > 0.8) return 'very_high';
        if (intensity > 0.6) return 'high';
        if (intensity > 0.4) return 'medium';
        if (intensity > 0.2) return 'low';
        return 'very_low';
    }

    /**
     * 启动定时清理任务
     */
    startCleanupTask() {
        setInterval(() => {
            this.cleanupMetrics();
        }, this.config.cleanupInterval);
    }

    /**
     * 清理过期指标
     */
    cleanupMetrics() {
        const now = Date.now();
        const retentionTime = now - this.config.metricsRetention;
        
        // 清理活跃请求中的超时请求
        this.activeRequests.forEach((request, requestId) => {
            const requestTime = new Date(request.startTime).getTime();
            if (requestTime < retentionTime) {
                this.activeRequests.delete(requestId);
            }
        });
        
        console.log(`🔄 API监控指标清理完成 - 活跃请求: ${this.activeRequests.size}`);
    }

    /**
     * 重置统计
     */
    resetStatistics() {
        this.requestMetrics.clear();
        this.errorMetrics.clear();
        this.availabilityMetrics.clear();
        this.performanceData.clear();
        this.activeRequests.clear();
        
        this.initializeMetrics();
        
        console.log('✅ API监控统计已重置');
    }

    /**
     * 获取监控配置
     */
    getConfig() {
        return {
            ...this.config,
            request_count: this.requestMetrics.size,
            error_count: this.errorMetrics.size,
            active_requests: this.activeRequests.size,
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            cpu_usage: os.loadavg()
        };
    }
}

/**
 * 创建Express中间件
 */
function createApiMonitorMiddleware(dbManager = null) {
    const monitor = new APIMonitor(dbManager);
    
    return {
        monitor,
        middleware: monitor.requestTracking.bind(monitor),
        
        // API路由处理函数
        getStats: (req, res) => {
            try {
                const timeRange = req.query.timeRange || '1h';
                const stats = monitor.getApiStatistics(timeRange);
                
                res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                console.error('获取API统计失败:', error);
                res.status(500).json({
                    success: false,
                    message: '获取API统计失败',
                    error: error.message
                });
            }
        },
        
        getPerformance: (req, res) => {
            try {
                const timeRange = req.query.timeRange || '1h';
                const performance = monitor.getApiPerformance(timeRange);
                
                res.json({
                    success: true,
                    data: performance
                });
            } catch (error) {
                console.error('获取API性能详情失败:', error);
                res.status(500).json({
                    success: false,
                    message: '获取API性能详情失败',
                    error: error.message
                });
            }
        },
        
        getErrors: (req, res) => {
            try {
                const timeRange = req.query.timeRange || '1h';
                const errors = monitor.getErrorStatistics(timeRange);
                
                res.json({
                    success: true,
                    data: errors
                });
            } catch (error) {
                console.error('获取错误统计失败:', error);
                res.status(500).json({
                    success: false,
                    message: '获取错误统计失败',
                    error: error.message
                });
            }
        },
        
        getAvailability: (req, res) => {
            try {
                const timeRange = req.query.timeRange || '1h';
                const availability = monitor.getAvailabilityStatistics(timeRange);
                
                res.json({
                    success: true,
                    data: availability
                });
            } catch (error) {
                console.error('获取可用性统计失败:', error);
                res.status(500).json({
                    success: false,
                    message: '获取可用性统计失败',
                    error: error.message
                });
            }
        },
        
        getRealTime: (req, res) => {
            try {
                const realTimeData = monitor.getRealTimeData();
                
                res.json({
                    success: true,
                    data: realTimeData
                });
            } catch (error) {
                console.error('获取实时数据失败:', error);
                res.status(500).json({
                    success: false,
                    message: '获取实时数据失败',
                    error: error.message
                });
            }
        },
        
        getChartData: (req, res) => {
            try {
                const period = req.query.period || '24h';
                const chartData = monitor.getPerformanceChartData(period);
                
                res.json({
                    success: true,
                    data: chartData
                });
            } catch (error) {
                console.error('获取图表数据失败:', error);
                res.status(500).json({
                    success: false,
                    message: '获取图表数据失败',
                    error: error.message
                });
            }
        },
        
        reset: (req, res) => {
            try {
                monitor.resetStatistics();
                
                res.json({
                    success: true,
                    message: 'API监控统计已重置'
                });
            } catch (error) {
                console.error('重置统计失败:', error);
                res.status(500).json({
                    success: false,
                    message: '重置统计失败',
                    error: error.message
                });
            }
        },
        
        getConfig: (req, res) => {
            try {
                const config = monitor.getConfig();
                
                res.json({
                    success: true,
                    data: config
                });
            } catch (error) {
                console.error('获取监控配置失败:', error);
                res.status(500).json({
                    success: false,
                    message: '获取监控配置失败',
                    error: error.message
                });
            }
        }
    };
}

module.exports = {
    APIMonitor,
    createApiMonitorMiddleware
};