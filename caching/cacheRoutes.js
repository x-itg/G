const express = require('express');
const { ApiCache } = require('./apiCache');

/**
 * 创建缓存管理路由
 * @param {ApiCache} cache - 缓存实例
 * @returns {Object} Express路由器
 */
function createCacheRoutes(cache) {
    const router = express.Router();
    
    // 获取API缓存统计
    router.get('/cache/api/stats', (req, res) => {
        try {
            const stats = cache.getStats();
            const healthStatus = cache.getHealthStatus();
            
            res.json({
                success: true,
                data: {
                    stats,
                    health: healthStatus,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('获取缓存统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取缓存统计失败',
                error: error.message
            });
        }
    });
    
    // 清空API缓存
    router.post('/cache/api/clear', (req, res) => {
        try {
            const oldSize = cache.stats.cacheSize;
            cache.clear();
            
            res.json({
                success: true,
                message: 'API缓存已清空',
                data: {
                    clearedSize: oldSize,
                    clearedItems: cache.stats.totalItems,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('清空缓存失败:', error);
            res.status(500).json({
                success: false,
                message: '清空缓存失败',
                error: error.message
            });
        }
    });
    
    // 失效特定缓存
    router.post('/cache/api/invalidate', (req, res) => {
        try {
            const { pattern, url } = req.body;
            
            let deletedCount = 0;
            
            if (pattern) {
                deletedCount = cache.invalidate(pattern);
            } else if (url) {
                const key = cache.generateCacheKey('GET', url, 'system', {});
                cache.delete(key);
                deletedCount = 1;
            } else {
                return res.status(400).json({
                    success: false,
                    message: '请提供pattern或url参数'
                });
            }
            
            res.json({
                success: true,
                message: `已失效 ${deletedCount} 个缓存项`,
                data: {
                    deletedCount,
                    pattern: pattern || url,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('失效缓存失败:', error);
            res.status(500).json({
                success: false,
                message: '失效缓存失败',
                error: error.message
            });
        }
    });
    
    // 获取缓存配置
    router.get('/cache/api/config', (req, res) => {
        try {
            const config = cache.getConfig();
            
            res.json({
                success: true,
                data: {
                    config,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('获取缓存配置失败:', error);
            res.status(500).json({
                success: false,
                message: '获取缓存配置失败',
                error: error.message
            });
        }
    });
    
    // 更新缓存配置
    router.post('/cache/api/config', (req, res) => {
        try {
            const { strategies, maxCacheSize, maxCacheItems, cleanupInterval } = req.body;
            
            const newConfig = {};
            
            if (strategies) newConfig.strategies = strategies;
            if (maxCacheSize) newConfig.maxCacheSize = maxCacheSize;
            if (maxCacheItems) newConfig.maxCacheItems = maxCacheItems;
            if (cleanupInterval) newConfig.cleanupInterval = cleanupInterval;
            
            cache.updateConfig(newConfig);
            
            res.json({
                success: true,
                message: '缓存配置已更新',
                data: {
                    newConfig,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('更新缓存配置失败:', error);
            res.status(500).json({
                success: false,
                message: '更新缓存配置失败',
                error: error.message
            });
        }
    });
    
    // 预热缓存
    router.post('/cache/api/warmup', async (req, res) => {
        try {
            const { urls, fetchFunction } = req.body;
            
            if (!urls || !Array.isArray(urls) || urls.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请提供有效的URL数组'
                });
            }
            
            // 模拟fetchFunction
            const mockFetchFunction = async (url) => {
                // 这里应该调用实际的API端点
                // 为了演示，返回模拟数据
                return {
                    message: `缓存预热数据 for ${url}`,
                    timestamp: new Date().toISOString(),
                    url: url
                };
            };
            
            await cache.warmupCache(urls, fetchFunction || mockFetchFunction);
            
            res.json({
                success: true,
                message: '缓存预热完成',
                data: {
                    warmedUrls: urls.length,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('缓存预热失败:', error);
            res.status(500).json({
                success: false,
                message: '缓存预热失败',
                error: error.message
            });
        }
    });
    
    // 导出缓存数据
    router.get('/cache/api/export', (req, res) => {
        try {
            const exportData = cache.exportCache();
            
            res.json({
                success: true,
                data: exportData,
                message: '缓存数据导出成功'
            });
        } catch (error) {
            console.error('导出缓存数据失败:', error);
            res.status(500).json({
                success: false,
                message: '导出缓存数据失败',
                error: error.message
            });
        }
    });
    
    // 获取缓存详细信息
    router.get('/cache/api/details', (req, res) => {
        try {
            const { pattern, limit = 50 } = req.query;
            
            let cacheEntries = Array.from(cache.cache.entries());
            
            // 按模式过滤
            if (pattern) {
                cacheEntries = cacheEntries.filter(([key]) => key.includes(pattern));
            }
            
            // 限制返回数量
            cacheEntries = cacheEntries.slice(0, parseInt(limit));
            
            const details = cacheEntries.map(([key, entry]) => {
                const metadata = cache.cacheMetadata.get(key);
                return {
                    key: key,
                    size: entry.size,
                    timestamp: entry.timestamp,
                    expiry: entry.expiry,
                    age: Date.now() - entry.timestamp,
                    accessCount: metadata?.accessCount || 0,
                    lastAccessed: metadata?.lastAccessed || entry.timestamp,
                    isExpired: cache.isExpired(key, entry)
                };
            });
            
            res.json({
                success: true,
                data: {
                    entries: details,
                    totalEntries: cache.cache.size,
                    filteredEntries: cacheEntries.length,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('获取缓存详情失败:', error);
            res.status(500).json({
                success: false,
                message: '获取缓存详情失败',
                error: error.message
            });
        }
    });
    
    // 获取性能指标
    router.get('/cache/api/performance', (req, res) => {
        try {
            const stats = cache.getStats();
            const health = cache.getHealthStatus();
            const responseTimeHistory = cache.metrics.responseTimeHistory;
            
            // 计算性能趋势
            const performance = {
                hitRatio: stats.hitRatio,
                cacheSize: stats.cacheSize,
                memoryUsage: stats.memoryUsage,
                responseTimeHistory: responseTimeHistory.slice(-20), // 最近20条记录
                trends: {
                    hitRatioTrend: calculateTrend(responseTimeHistory.map(h => h.hitRatio)),
                    cacheSizeTrend: calculateTrend(responseTimeHistory.map(h => h.cacheSize)),
                    memoryTrend: calculateTrend(responseTimeHistory.map(h => h.memoryUsage))
                },
                recommendations: generateRecommendations(stats, health)
            };
            
            res.json({
                success: true,
                data: {
                    performance,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('获取性能指标失败:', error);
            res.status(500).json({
                success: false,
                message: '获取性能指标失败',
                error: error.message
            });
        }
    });
    
    // 健康检查
    router.get('/cache/api/health', (req, res) => {
        try {
            const health = cache.getHealthStatus();
            const stats = cache.getStats();
            
            res.json({
                success: true,
                data: {
                    health,
                    stats: {
                        uptime: stats.uptime,
                        totalRequests: stats.totalRequests,
                        hitRatio: stats.hitRatio
                    },
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('缓存健康检查失败:', error);
            res.status(500).json({
                success: false,
                message: '缓存健康检查失败',
                error: error.message
            });
        }
    });
    
    return router;
}

/**
 * 计算趋势
 * @param {Array} values - 数值数组
 * @returns {string} 趋势描述
 */
function calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-5);
    const older = values.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
}

/**
 * 生成优化建议
 * @param {Object} stats - 统计信息
 * @param {Object} health - 健康状态
 * @returns {Array} 建议数组
 */
function generateRecommendations(stats, health) {
    const recommendations = [];
    
    if (stats.hitRatio < 50) {
        recommendations.push({
            type: 'warning',
            message: '缓存命中率较低，建议检查缓存策略配置',
            action: 'review_cache_strategy'
        });
    }
    
    if (stats.cacheSize > stats.maxCacheSize * 0.8) {
        recommendations.push({
            type: 'warning',
            message: '缓存大小接近限制，建议清理或增加缓存大小',
            action: 'cleanup_cache'
        });
    }
    
    if (stats.totalItems > stats.maxCacheItems * 0.9) {
        recommendations.push({
            type: 'warning',
            message: '缓存项数量接近限制，建议优化缓存项',
            action: 'optimize_cache_items'
        });
    }
    
    if (health.status === 'healthy') {
        recommendations.push({
            type: 'success',
            message: '缓存系统运行良好',
            action: 'maintain'
        });
    }
    
    return recommendations;
}

module.exports = {
    createCacheRoutes
};