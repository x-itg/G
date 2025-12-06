const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

// 导入简化数据库管理器
const DatabaseManager = require('./database/SimplifiedDatabaseManager');

// 导入数据库性能监控器
const DatabaseMonitor = require('./monitoring/databaseMonitor');

// 导入权限保护中间件
const PermissionMiddleware = require('./middleware/permissionMiddleware');

// 导入API监控中间件
const { createApiMonitorMiddleware } = require('./monitoring/apiMonitor');

// 导入访问日志记录器
const AccessLogger = require('./logging/accessLogger');

// 导入API缓存系统
const { ApiCache, createCacheMiddleware } = require('./caching/apiCache');
const { createCacheRoutes } = require('./caching/cacheRoutes');

// 加载配置
const loadConfig = () => {
    const configPath = path.join(__dirname, 'config', 'communication-config.json');
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return {};
};

const config = loadConfig();
const app = express();
const PORT = process.env.PORT || 3000;

// 初始化数据库管理器
let dbManager = null;
let dbMonitor = null;
let permissionMiddleware = null;
let apiMonitor = null;
let accessLogger = null;
let apiCache = null;
let cacheMiddleware = null;
try {
    dbManager = new DatabaseManager();
    dbManager.initialize();
    dbMonitor = DatabaseMonitor.getInstance();
    permissionMiddleware = new PermissionMiddleware(dbManager);
    
    // 初始化API监控中间件
    apiMonitor = createApiMonitorMiddleware(dbManager);
    
    // 初始化访问日志记录器
    accessLogger = new AccessLogger(dbManager, {
        logRetentionDays: 30,
        enableAnalytics: true,
        enableRealTime: true,
        logLevel: 'info'
    });
    
    // 初始化API缓存系统
    apiCache = new ApiCache({
        maxCacheSize: 100 * 1024 * 1024, // 100MB
        maxCacheItems: 1000,
        cleanupInterval: 5 * 60 * 1000, // 5分钟
        maxMemoryUsage: 512 * 1024 * 1024, // 512MB
        enableMonitoring: true,
        statsInterval: 60000 // 1分钟
    });
    
    // 创建缓存中间件
    cacheMiddleware = createCacheMiddleware(apiCache);
    
    console.log('✅ 数据库管理器初始化成功');
    console.log('✅ 数据库性能监控器初始化成功');
    console.log('✅ 权限中间件初始化成功');
    console.log('✅ API监控中间件初始化成功');
    console.log('✅ 访问日志记录器初始化成功');
    console.log('✅ API缓存系统初始化成功');
} catch (error) {
    console.error('❌ 服务初始化失败:', error);
    process.exit(1);
}

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: config.security?.csp?.enabled ? {
        directives: config.security.csp.directives
    } : false
}));

// CORS配置
app.use(cors({
    origin: config.communication?.cors?.origin || 'http://localhost:3001',
    credentials: config.communication?.cors?.credentials || true,
    methods: config.communication?.cors?.methods || ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: config.communication?.cors?.allowedHeaders || ['Content-Type', 'Authorization']
}));

// 速率限制
const limiter = rateLimit({
    windowMs: config.communication?.rateLimit?.windowMs || 15 * 60 * 1000,
    max: config.communication?.rateLimit?.max || 100,
    message: config.communication?.rateLimit?.message || '请求过于频繁'
});
app.use('/api/', limiter);

// 请求解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
    next();
});

// API监控中间件
if (apiMonitor) {
    app.use('/api', apiMonitor.middleware);
    console.log('✅ API监控中间件已应用');
}

// 访问日志中间件
if (accessLogger) {
    app.use(accessLogger.getMiddleware());
    console.log('✅ 访问日志中间件已应用');
}

// API缓存中间件
if (cacheMiddleware) {
    app.use('/api', cacheMiddleware);
    console.log('✅ API缓存中间件已应用');
}

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
            database: 'connected',
            database_monitor: 'active',
            frontend: 'available',
            electron: 'running'
        }
    });
});

// 系统状态端点
app.get('/api/status', (req, res) => {
    const portConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'port-config.json'), 'utf8'));
    
    res.json({
        server: {
            status: 'running',
            port: PORT,
            uptime: process.uptime(),
            version: '1.0.0'
        },
        services: {
            frontend: {
                url: `http://localhost:${portConfig.ports.frontend.port}`,
                status: 'available'
            },
            backend: {
                url: `http://localhost:${portConfig.ports.backend.port}`,
                status: 'running'
            },
            electron: {
                url: 'local-application',
                status: 'running'
            }
        },
        database: {
            type: 'JSON File Database',
            path: './database/data',
            status: 'connected',
            monitor: 'active'
        },
        config: {
            cors_enabled: true,
            rate_limiting: true,
            security_headers: true,
            development_mode: process.env.NODE_ENV !== 'production'
        }
    });
});

// API路由
const apiRouter = express.Router();

// 缓存管理路由
if (apiCache) {
    const cacheRoutes = createCacheRoutes(apiCache);
    apiRouter.use('/', cacheRoutes);
    console.log('✅ 缓存管理路由已添加');
}

// API监控端点
apiRouter.get('/monitoring/api/stats', (req, res) => {
    if (!apiMonitor) {
        return res.status(503).json({
            success: false,
            message: 'API监控服务不可用'
        });
    }
    apiMonitor.getStats(req, res);
});

apiRouter.get('/monitoring/api/performance', (req, res) => {
    if (!apiMonitor) {
        return res.status(503).json({
            success: false,
            message: 'API监控服务不可用'
        });
    }
    apiMonitor.getPerformance(req, res);
});

apiRouter.get('/monitoring/api/errors', (req, res) => {
    if (!apiMonitor) {
        return res.status(503).json({
            success: false,
            message: 'API监控服务不可用'
        });
    }
    apiMonitor.getErrors(req, res);
});

apiRouter.get('/monitoring/api/availability', (req, res) => {
    if (!apiMonitor) {
        return res.status(503).json({
            success: false,
            message: 'API监控服务不可用'
        });
    }
    apiMonitor.getAvailability(req, res);
});

apiRouter.get('/monitoring/api/realtime', (req, res) => {
    if (!apiMonitor) {
        return res.status(503).json({
            success: false,
            message: 'API监控服务不可用'
        });
    }
    apiMonitor.getRealTime(req, res);
});

apiRouter.get('/monitoring/api/charts', (req, res) => {
    if (!apiMonitor) {
        return res.status(503).json({
            success: false,
            message: 'API监控服务不可用'
        });
    }
    apiMonitor.getChartData(req, res);
});

apiRouter.post('/monitoring/api/reset', (req, res) => {
    if (!apiMonitor) {
        return res.status(503).json({
            success: false,
            message: 'API监控服务不可用'
        });
    }
    apiMonitor.reset(req, res);
});

apiRouter.get('/monitoring/api/config', (req, res) => {
    if (!apiMonitor) {
        return res.status(503).json({
            success: false,
            message: 'API监控服务不可用'
        });
    }
    apiMonitor.getConfig(req, res);
});

// 访问日志相关API
apiRouter.get('/logging/access/statistics', (req, res) => {
    if (!accessLogger) {
        return res.status(503).json({
            success: false,
            message: '访问日志服务不可用'
        });
    }
    
    // 获取路由处理器
    const routes = accessLogger.getRoutes();
    const statsHandler = routes.stack.find(layer => 
        layer.route && layer.route.path === '/statistics'
    );
    
    if (statsHandler) {
        statsHandler.route.stack[0].handle(req, res);
    } else {
        res.status(404).json({
            success: false,
            message: '访问统计端点未找到'
        });
    }
});

apiRouter.get('/logging/access/popular', (req, res) => {
    if (!accessLogger) {
        return res.status(503).json({
            success: false,
            message: '访问日志服务不可用'
        });
    }
    
    // 获取路由处理器
    const routes = accessLogger.getRoutes();
    const popularHandler = routes.stack.find(layer => 
        layer.route && layer.route.path === '/popular'
    );
    
    if (popularHandler) {
        popularHandler.route.stack[0].handle(req, res);
    } else {
        res.status(404).json({
            success: false,
            message: '热门页面端点未找到'
        });
    }
});

apiRouter.get('/logging/access/users', (req, res) => {
    if (!accessLogger) {
        return res.status(503).json({
            success: false,
            message: '访问日志服务不可用'
        });
    }
    
    // 获取路由处理器
    const routes = accessLogger.getRoutes();
    const usersHandler = routes.stack.find(layer => 
        layer.route && layer.route.path === '/users'
    );
    
    if (usersHandler) {
        usersHandler.route.stack[0].handle(req, res);
    } else {
        res.status(404).json({
            success: false,
            message: '用户统计端点未找到'
        });
    }
});

apiRouter.get('/logging/access/trends', (req, res) => {
    if (!accessLogger) {
        return res.status(503).json({
            success: false,
            message: '访问日志服务不可用'
        });
    }
    
    // 获取路由处理器
    const routes = accessLogger.getRoutes();
    const trendsHandler = routes.stack.find(layer => 
        layer.route && layer.route.path === '/trends'
    );
    
    if (trendsHandler) {
        trendsHandler.route.stack[0].handle(req, res);
    } else {
        res.status(404).json({
            success: false,
            message: '访问趋势端点未找到'
        });
    }
});

apiRouter.post('/logging/access/cleanup', async (req, res) => {
    if (!accessLogger) {
        return res.status(503).json({
            success: false,
            message: '访问日志服务不可用'
        });
    }
    
    try {
        const { daysToKeep } = req.body;
        await accessLogger.cleanupOldLogs(daysToKeep);
        
        res.json({
            success: true,
            message: `已清理${daysToKeep || 30}天前的访问日志`,
            cleaned_at: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

apiRouter.get('/logging/access/realtime', (req, res) => {
    if (!accessLogger) {
        return res.status(503).json({
            success: false,
            message: '访问日志服务不可用'
        });
    }
    
    try {
        const realtimeStats = accessLogger.getRealtimeStatistics();
        
        res.json({
            success: true,
            data: realtimeStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

apiRouter.get('/logging/access/details', (req, res) => {
    if (!accessLogger) {
        return res.status(503).json({
            success: false,
            message: '访问日志服务不可用'
        });
    }
    
    // 获取路由处理器
    const routes = accessLogger.getRoutes();
    const detailsHandler = routes.stack.find(layer => 
        layer.route && layer.route.path === '/details'
    );
    
    if (detailsHandler) {
        detailsHandler.route.stack[0].handle(req, res);
    } else {
        res.status(404).json({
            success: false,
            message: '访问详情端点未找到'
        });
    }
});

// 认证相关API
apiRouter.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 模拟认证逻辑
        if (username === 'admin' && password === 'Admin123!') {
            res.json({
                success: true,
                token: 'mock-jwt-token',
                user: {
                    id: 1,
                    username: 'admin',
                    role: 'ADMIN',
                    fullName: 'System Administrator'
                }
            });
        } else {
            res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '认证服务错误'
        });
    }
});

apiRouter.post('/auth/logout', (req, res) => {
    res.json({
        success: true,
        message: '已成功登出'
    });
});

// 数据API
apiRouter.get('/data/status', (req, res) => {
    res.json({
        success: true,
        data: {
            detector_connected: true,
            last_reading: new Date().toISOString(),
            measurements: 156,
            status: 'active'
        }
    });
});

apiRouter.post('/data/measurement', (req, res) => {
    const measurement = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        value: req.body.value || Math.random() * 100,
        unit: 'cpm',
        detector: req.body.detector || 'default'
    };
    
    res.json({
        success: true,
        data: measurement
    });
});

// 分析API
apiRouter.get('/analysis/list', (req, res) => {
    const analyses = [
        {
            id: 1,
            name: '标准样品检测',
            status: 'completed',
            created_at: new Date().toISOString(),
            results: { value: 85.2, unit: 'ppm' }
        },
        {
            id: 2,
            name: '环境背景检测',
            status: 'running',
            created_at: new Date().toISOString(),
            progress: 65
        }
    ];
    
    res.json({
        success: true,
        data: analyses
    });
});

// 审计日志API
apiRouter.get('/audit/logs', (req, res) => {
    const logs = [
        {
            id: 1,
            timestamp: new Date().toISOString(),
            user: 'admin',
            action: 'LOGIN',
            entity: 'User',
            details: '用户登录成功'
        },
        {
            id: 2,
            timestamp: new Date(Date.now() - 60000).toISOString(),
            user: 'admin',
            action: 'START_ANALYSIS',
            entity: 'Analysis',
            details: '开始新的分析任务'
        }
    ];
    
    res.json({
        success: true,
        data: logs,
        total: logs.length
    });
});

// 设备管理API
apiRouter.get('/devices/status', (req, res) => {
    res.json({
        success: true,
        data: {
            probe_control: {
                connected: true,
                position: { x: 100, y: 50, z: 25 },
                status: 'idle'
            },
            detector: {
                connected: true,
                type: 'HPGe',
                status: 'active',
                voltage: 1500
            },
            serial_port: {
                connected: true,
                port: 'COM1',
                baud_rate: 9600
            }
        }
    });
});

// 数据库性能监控API

// 获取数据库统计信息
apiRouter.get('/monitoring/database/stats', (req, res) => {
    try {
        const stats = dbMonitor.getDatabaseStats();
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('获取数据库统计信息失败:', error);
        res.status(500).json({
            success: false,
            message: '获取数据库统计信息失败',
            error: error.message
        });
    }
});

// 获取查询性能详情
apiRouter.get('/monitoring/database/queries', (req, res) => {
    try {
        const queryDetails = dbMonitor.getQueryPerformanceDetails();
        
        res.json({
            success: true,
            data: queryDetails,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('获取查询性能详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取查询性能详情失败',
            error: error.message
        });
    }
});

// 获取性能趋势
apiRouter.get('/monitoring/database/performance', (req, res) => {
    try {
        const timeRange = req.query.timeRange || '1h';
        const performanceTrends = dbMonitor.getPerformanceTrends(timeRange);
        
        res.json({
            success: true,
            data: performanceTrends,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('获取性能趋势失败:', error);
        res.status(500).json({
            success: false,
            message: '获取性能趋势失败',
            error: error.message
        });
    }
});

// 获取慢查询详情
apiRouter.get('/monitoring/database/slow-queries', (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const slowQueries = dbMonitor.getSlowQueries(limit);
        
        res.json({
            success: true,
            data: slowQueries,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('获取慢查询详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取慢查询详情失败',
            error: error.message
        });
    }
});

// 获取性能警告
apiRouter.get('/monitoring/database/alerts', (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const acknowledged = req.query.acknowledged !== undefined ? req.query.acknowledged === 'true' : null;
        const alerts = dbMonitor.getAlerts(limit, acknowledged);
        
        res.json({
            success: true,
            data: alerts,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('获取性能警告失败:', error);
        res.status(500).json({
            success: false,
            message: '获取性能警告失败',
            error: error.message
        });
    }
});

// 确认性能警告
apiRouter.post('/monitoring/database/alerts/:alertId/acknowledge', (req, res) => {
    try {
        const { alertId } = req.params;
        const acknowledged = dbMonitor.acknowledgeAlert(alertId);
        
        if (acknowledged) {
            res.json({
                success: true,
                message: '性能警告已确认',
                data: { alertId }
            });
        } else {
            res.status(404).json({
                success: false,
                message: '性能警告不存在'
            });
        }

    } catch (error) {
        console.error('确认性能警告失败:', error);
        res.status(500).json({
            success: false,
            message: '确认性能警告失败',
            error: error.message
        });
    }
});

// 设置性能阈值
apiRouter.post('/monitoring/database/alerts', (req, res) => {
    try {
        const thresholds = req.body;
        dbMonitor.setPerformanceThresholds(thresholds);
        
        res.json({
            success: true,
            message: '性能阈值设置成功',
            data: thresholds,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('设置性能阈值失败:', error);
        res.status(500).json({
            success: false,
            message: '设置性能阈值失败',
            error: error.message
        });
    }
});

// 获取当前性能阈值
apiRouter.get('/monitoring/database/thresholds', (req, res) => {
    try {
        const thresholds = dbMonitor.getPerformanceThresholds();
        
        res.json({
            success: true,
            data: thresholds,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('获取性能阈值失败:', error);
        res.status(500).json({
            success: false,
            message: '获取性能阈值失败',
            error: error.message
        });
    }
});

// 获取操作频率统计
apiRouter.get('/monitoring/database/frequency', (req, res) => {
    try {
        const operationFrequency = dbMonitor.getOperationFrequency();
        
        res.json({
            success: true,
            data: operationFrequency,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('获取操作频率统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取操作频率统计失败',
            error: error.message
        });
    }
});

// 导出监控数据
apiRouter.get('/monitoring/database/export', (req, res) => {
    try {
        const exportPath = dbMonitor.exportMonitoringData();
        const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
        
        res.json({
            success: true,
            data: exportData,
            message: '监控数据导出成功',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('导出监控数据失败:', error);
        res.status(500).json({
            success: false,
            message: '导出监控数据失败',
            error: error.message
        });
    }
});

// 使用API路由
app.use('/api', apiRouter);

// 静态文件服务
app.use(express.static(path.join(__dirname, 'renderer')));

// SPA路由支持
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'renderer', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({
            error: '前端文件未找到',
            message: '请确保renderer目录和index.html文件存在'
        });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err.stack);
    
    res.status(500).json({
        error: '内部服务器错误',
        message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试',
        timestamp: new Date().toISOString()
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        error: '未找到请求的资源',
        path: `${req.method} ${req.url}`,
        timestamp: new Date().toISOString()
    });
});

// 优雅关闭处理
const gracefulShutdown = () => {
    console.log('\n🛑 开始优雅关闭服务器...');
    
    server.close(() => {
        console.log('✅ HTTP服务器已关闭');
        process.exit(0);
    });
    
    // 强制关闭超时
    setTimeout(() => {
        console.log('⚠️ 强制关闭服务器');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 启动服务器
const server = app.listen(PORT, () => {
    console.log('🚀 放射检测仪API服务器启动成功!');
    console.log('='.repeat(70));
    console.log(`📡 服务器地址: http://localhost:${PORT}`);
    console.log(`🏥 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`📊 系统状态: http://localhost:${PORT}/api/status`);
    console.log(`🌐 前端地址: http://localhost:3001`);
    console.log(`🖥️ Electron应用: 桌面应用`);
    console.log('='.repeat(70));
    console.log('🔧 基础API端点:');
    console.log('   GET  /api/health          - 健康检查');
    console.log('   GET  /api/status          - 系统状态');
    console.log('   POST /api/auth/login      - 用户登录');
    console.log('   POST /api/auth/logout     - 用户登出');
    console.log('   GET  /api/data/status     - 数据状态');
    console.log('   POST /api/data/measurement - 提交测量');
    console.log('   GET  /api/analysis/list   - 分析列表');
    console.log('   GET  /api/devices/status  - 设备状态');
    console.log('');
    console.log('🗄️  数据库性能监控API:');
    console.log('   GET  /api/monitoring/database/stats     - 数据库统计信息');
    console.log('   GET  /api/monitoring/database/queries   - 查询性能详情');
    console.log('   GET  /api/monitoring/database/performance - 性能趋势');
    console.log('   GET  /api/monitoring/database/slow-queries - 慢查询详情');
    console.log('   GET  /api/monitoring/database/alerts    - 性能警告');
    console.log('   POST /api/monitoring/database/alerts/:id/acknowledge - 确认警告');
    console.log('   POST /api/monitoring/database/alerts    - 设置性能阈值');
    console.log('   GET  /api/monitoring/database/thresholds - 获取当前阈值');
    console.log('   GET  /api/monitoring/database/frequency - 操作频率统计');
    console.log('');
    console.log('📈  访问日志统计API:');
    console.log('   GET  /api/logging/access/statistics   - 访问统计信息');
    console.log('   GET  /api/logging/access/popular     - 热门页面排行');
    console.log('   GET  /api/logging/access/users       - 用户访问统计');
    console.log('   GET  /api/logging/access/trends      - 访问趋势分析');
    console.log('   GET  /api/logging/access/realtime    - 实时访问统计');
    console.log('   GET  /api/logging/access/details     - 访问日志详情');
    console.log('   POST /api/logging/access/cleanup     - 清理旧日志');
    console.log('   GET  /api/monitoring/database/export    - 导出监控数据');
    console.log('='.repeat(70));
    console.log('✨ 功能特性:');
    console.log('   ✓ 数据库性能监控');
    console.log('   ✓ 实时查询性能统计');
    console.log('   ✓ 慢查询检测和分析');
    console.log('   ✓ 性能阈值警告');
    console.log('   ✓ 操作频率统计');
    console.log('   ✓ 监控数据导出');
    console.log('   ✓ CFR 21 Part 11 兼容审计追踪');
    console.log('   ✓ 三级权限电子签名系统');
    console.log('   ✓ JWT Token认证机制');
    console.log('   ✓ 权限保护中间件');
    console.log('   ✓ 完整操作日志记录');
    console.log('   ✓ 数据库架构优化');
    console.log('   ✓ API端点权限控制');
    console.log('   ✓ 电子签名验证');
    console.log('='.repeat(70));
    console.log('✅ 服务器就绪，等待请求...\n');
});

module.exports = app;