/**
 * 日志管理API路由
 * 提供日志轮转、归档、清理和分析的HTTP接口
 */

const express = require('express');
const router = express.Router();
const { createLogManager } = require('./logManager');

// 创建日志管理器实例
const logManager = createLogManager();

/**
 * POST /api/logging/manage/rotate - 手动轮转日志
 * Body: { logType?: string }
 */
router.post('/manage/rotate', async (req, res) => {
    try {
        const { logType = 'all' } = req.body;
        
        // 验证日志类型
        const validTypes = ['all', 'debug', 'info', 'warn', 'error', 'fatal'];
        if (!validTypes.includes(logType)) {
            return res.status(400).json({
                success: false,
                error: `无效的日志类型: ${logType}`
            });
        }

        const result = await logManager.rotateLog(logType);
        
        res.json({
            success: true,
            message: '日志轮转成功',
            data: result
        });
    } catch (error) {
        console.error('日志轮转API错误:', error);
        res.status(500).json({
            success: false,
            error: '日志轮转失败',
            details: error.message
        });
    }
});

/**
 * POST /api/logging/manage/cleanup - 手动清理日志
 * Body: { logType?: string }
 */
router.post('/manage/cleanup', async (req, res) => {
    try {
        const { logType = 'all' } = req.body;
        
        // 验证日志类型
        const validTypes = ['all', 'audit', 'error', 'access', 'system'];
        if (!validTypes.includes(logType)) {
            return res.status(400).json({
                success: false,
                error: `无效的日志类型: ${logType}`
            });
        }

        const result = await logManager.cleanupLogs(logType);
        
        res.json({
            success: true,
            message: '日志清理成功',
            data: result
        });
    } catch (error) {
        console.error('日志清理API错误:', error);
        res.status(500).json({
            success: false,
            error: '日志清理失败',
            details: error.message
        });
    }
});

/**
 * GET /api/logging/manage/status - 获取日志管理状态
 */
router.get('/manage/status', async (req, res) => {
    try {
        const status = await logManager.getStatus();
        
        res.json({
            success: true,
            message: '状态获取成功',
            data: status
        });
    } catch (error) {
        console.error('获取状态API错误:', error);
        res.status(500).json({
            success: false,
            error: '获取状态失败',
            details: error.message
        });
    }
});

/**
 * POST /api/logging/manage/backup - 备份日志
 * Body: { logType?: string, includeCompressed?: boolean, destination?: string }
 */
router.post('/manage/backup', async (req, res) => {
    try {
        const {
            logType = 'all',
            includeCompressed = true,
            destination
        } = req.body;

        // 验证日志类型
        const validTypes = ['all', 'audit', 'error', 'access', 'system'];
        if (!validTypes.includes(logType)) {
            return res.status(400).json({
                success: false,
                error: `无效的日志类型: ${logType}`
            });
        }

        const options = {
            logType,
            includeCompressed,
            destination
        };

        const result = await logManager.backupLogs(options);
        
        res.json({
            success: true,
            message: '日志备份成功',
            data: result
        });
    } catch (error) {
        console.error('日志备份API错误:', error);
        res.status(500).json({
            success: false,
            error: '日志备份失败',
            details: error.message
        });
    }
});

/**
 * GET /api/logging/manage/files - 获取日志文件列表
 * Query: { logType?: string }
 */
router.get('/manage/files', async (req, res) => {
    try {
        const { logType = 'all' } = req.query;
        
        // 验证日志类型
        const validTypes = ['all', 'debug', 'info', 'warn', 'error', 'fatal', 'audit', 'access', 'system'];
        if (!validTypes.includes(logType)) {
            return res.status(400).json({
                success: false,
                error: `无效的日志类型: ${logType}`
            });
        }

        const files = await logManager.getLogFiles(logType);
        
        res.json({
            success: true,
            message: '文件列表获取成功',
            data: {
                files,
                count: files.length,
                totalSize: files.reduce((sum, file) => sum + file.size, 0)
            }
        });
    } catch (error) {
        console.error('获取文件列表API错误:', error);
        res.status(500).json({
            success: false,
            error: '获取文件列表失败',
            details: error.message
        });
    }
});

/**
 * GET /api/logging/manage/stats - 获取日志统计
 */
router.get('/manage/stats', async (req, res) => {
    try {
        const stats = await logManager.getLogStats();
        
        res.json({
            success: true,
            message: '统计信息获取成功',
            data: stats
        });
    } catch (error) {
        console.error错误:', error);
('获取统计API        res.status(500).json({
            success: false,
            error: '获取统计信息失败',
            details: error.message
        });
    }
});

/**
 * POST /api/logging/manage/search - 搜索日志
 * Body: { query: string, options?: object }
 */
router.post('/manage/search', async (req, res) => {
    try {
        const { query, options = {} } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: '搜索查询不能为空'
            });
        }

        const results = await logManager.searchLogs(query, options);
        
        res.json({
            success: true,
            message: '搜索完成',
            data: {
                results,
                count: results.length,
                query,
                options
            }
        });
    } catch (error) {
        console.error('日志搜索API错误:', error);
        res.status(500).json({
            success: false,
            error: '日志搜索失败',
            details: error.message
        });
    }
});

/**
 * POST /api/logging/manage/restore - 恢复日志
 * Body: { backupPath: string }
 */
router.post('/manage/restore', async (req, res) => {
    try {
        const { backupPath } = req.body;
        
        if (!backupPath || typeof backupPath !== 'string') {
            return res.status(400).json({
                success: false,
                error: '备份路径不能为空'
            });
        }

        const result = await logManager.restoreLogs(backupPath);
        
        res.json({
            success: true,
            message: '日志恢复成功',
            data: result
        });
    } catch (error) {
        console.error('日志恢复API错误:', error);
        res.status(500).json({
            success: false,
            error: '日志恢复失败',
            details: error.message
        });
    }
});

/**
 * GET /api/logging/manage/health - 健康检查
 */
router.get('/manage/health', async (req, res) => {
    try {
        const health = await logManager.healthCheck();
        
        res.json({
            success: true,
            message: '健康检查完成',
            data: health
        });
    } catch (error) {
        console.error('健康检查API错误:', error);
        res.status(500).json({
            success: false,
            error: '健康检查失败',
            details: error.message
        });
    }
});

/**
 * GET /api/logging/manage/config - 获取配置信息
 */
router.get('/manage/config', (req, res) => {
    try {
        const config = logManager.config;
        
        // 过滤敏感信息
        const safeConfig = {
            rotation: config.rotation,
            archive: {
                ...config.archive,
                encryptionKey: config.archive.encryptionKey ? '***' : null
            },
            storage: {
                ...config.storage,
                // 移除实际路径，只显示结构
                basePath: 'configured',
                archivePath: 'configured',
                tempPath: 'configured',
                backupPath: 'configured'
            },
            levels: config.levels,
            scheduler: config.scheduler
        };
        
        res.json({
            success: true,
            message: '配置信息获取成功',
            data: safeConfig
        });
    } catch (error) {
        console.error('获取配置API错误:', error);
        res.status(500).json({
            success: false,
            error: '获取配置信息失败',
            details: error.message
        });
    }
});

/**
 * POST /api/logging/manage/archive - 压缩归档日志
 * Body: { logType?: string }
 */
router.post('/manage/archive', async (req, res) => {
    try {
        const { logType = 'all' } = req.body;
        
        // 这里可以添加特定的压缩归档逻辑
        // 当前版本中，压缩在轮转过程中自动进行
        
        res.json({
            success: true,
            message: '归档功能已集成到轮转流程中',
            data: {
                logType,
                timestamp: new Date(),
                note: '日志文件在轮转后会自动进行压缩归档'
            }
        });
    } catch (error) {
        console.error('日志归档API错误:', error);
        res.status(500).json({
            success: false,
            error: '日志归档失败',
            details: error.message
        });
    }
});

/**
 * GET /api/logging/manage/performance - 获取性能统计
 */
router.get('/manage/performance', async (req, res) => {
    try {
        const stats = await logManager.getLogStats();
        
        // 计算性能指标
        const performance = {
            storageEfficiency: {
                usage: stats.storage.percentage,
                status: stats.storage.percentage > 90 ? 'critical' : 
                       stats.storage.percentage > 80 ? 'warning' : 'healthy'
            },
            logDistribution: {},
            recommendation: []
        };

        // 日志分布分析
        for (const [type, typeStats] of Object.entries(stats.logs)) {
            performance.logDistribution[type] = {
                fileCount: typeStats.fileCount,
                totalSize: typeStats.totalSize,
                percentage: (typeStats.totalSize / stats.storage.used * 100).toFixed(2)
            };
        }

        // 生成建议
        if (stats.storage.percentage > 85) {
            performance.recommendation.push('建议立即清理过期日志');
        }
        
        if (stats.storage.percentage > 70) {
            performance.recommendation.push('建议增加归档频率');
        }

        res.json({
            success: true,
            message: '性能统计获取成功',
            data: {
                ...performance,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('获取性能统计API错误:', error);
        res.status(500).json({
            success: false,
            error: '获取性能统计失败',
            details: error.message
        });
    }
});

/**
 * 错误处理中间件
 */
router.use((error, req, res, next) => {
    console.error('日志管理路由错误:', error);
    res.status(500).json({
        success: false,
        error: '内部服务器错误',
        details: error.message
    });
});

module.exports = router;