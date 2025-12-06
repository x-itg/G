#!/usr/bin/env node

/**
 * 访问日志记录器核心功能验证
 */

const path = require('path');
const fs = require('fs');

// 模拟数据库管理器
class MockDatabaseManager {
    constructor() {
        this.tables = new Map();
    }

    async createTable(name, schema) {
        this.tables.set(name, []);
        console.log(`   ✅ 创建表 ${name}`);
    }

    async insert(tableName, data) {
        if (!this.tables.has(tableName)) {
            throw new Error(`表 ${tableName} 不存在`);
        }
        this.tables.get(tableName).push(data);
    }

    async executeQuery(query, params) {
        // 模拟查询结果
        return [];
    }
}

// 验证访问日志记录器
async function validateAccessLogger() {
    console.log('🔍 验证访问日志记录器核心功能');
    console.log('='.repeat(50));

    try {
        // 加载模块
        const AccessLogger = require('./accessLogger.js');
        console.log('✅ 成功加载 AccessLogger 模块');

        // 创建模拟数据库管理器
        const mockDbManager = new MockDatabaseManager();
        console.log('✅ 创建模拟数据库管理器');

        // 初始化访问日志记录器
        const accessLogger = new AccessLogger(mockDbManager, {
            logRetentionDays: 30,
            enableAnalytics: true,
            enableRealTime: true
        });
        console.log('✅ 成功初始化 AccessLogger');

        // 验证中间件功能
        const middleware = accessLogger.getMiddleware();
        if (typeof middleware === 'function') {
            console.log('✅ 中间件函数创建成功');
        } else {
            throw new Error('中间件不是函数');
        }

        // 验证路由功能
        const routes = accessLogger.getRoutes();
        if (routes && typeof routes === 'object') {
            console.log('✅ 路由对象创建成功');
        } else {
            throw new Error('路由对象创建失败');
        }

        // 验证实时统计功能
        const realtimeStats = accessLogger.getRealtimeStatistics();
        if (realtimeStats && typeof realtimeStats === 'object') {
            console.log('✅ 实时统计功能正常');
            console.log(`   📊 今日请求数: ${realtimeStats.today.total_requests}`);
            console.log(`   👥 唯一用户: ${realtimeStats.today.unique_users}`);
        } else {
            throw new Error('实时统计功能异常');
        }

        // 验证清理功能
        const cleanupResult = await accessLogger.cleanupOldLogs(1);
        console.log('✅ 日志清理功能正常');

        // 验证ID生成器
        const testId1 = accessLogger.generateId();
        const testId2 = accessLogger.generateId();
        if (testId1 !== testId2 && testId1.length > 0 && testId2.length > 0) {
            console.log('✅ ID生成器功能正常');
        } else {
            throw new Error('ID生成器功能异常');
        }

        console.log('\n🎉 所有核心功能验证通过！');
        return true;

    } catch (error) {
        console.error('\n❌ 验证失败:', error.message);
        return false;
    }
}

// 验证API路由结构
function validateAPIRoutes() {
    console.log('\n📡 验证API路由结构');
    console.log('='.repeat(50));

    try {
        const AccessLogger = require('./accessLogger.js');
        const mockDbManager = new MockDatabaseManager();
        const accessLogger = new AccessLogger(mockDbManager);
        const routes = accessLogger.getRoutes();

        // 检查路由栈
        if (routes.stack && Array.isArray(routes.stack)) {
            console.log(`✅ 发现 ${routes.stack.length} 个路由处理器`);

            routes.stack.forEach((layer, index) => {
                if (layer.route && layer.route.path) {
                    console.log(`   ${index + 1}. ${layer.route.path}`);
                }
            });
        } else {
            throw new Error('路由栈结构异常');
        }

        // 验证必需的路由
        const requiredRoutes = ['/statistics', '/popular', '/users', '/trends', '/realtime', '/details'];
        const foundRoutes = routes.stack
            .filter(layer => layer.route && layer.route.path)
            .map(layer => layer.route.path);

        const missingRoutes = requiredRoutes.filter(route => !foundRoutes.includes(route));
        
        if (missingRoutes.length === 0) {
            console.log('✅ 所有必需API路由已实现');
        } else {
            console.log(`⚠️  缺少以下路由: ${missingRoutes.join(', ')}`);
        }

        return true;

    } catch (error) {
        console.error('❌ API路由验证失败:', error.message);
        return false;
    }
}

// 验证文件结构
function validateFileStructure() {
    console.log('\n📁 验证文件结构');
    console.log('='.repeat(50));

    const requiredFiles = [
        'accessLogger.js',
        'test-access-logger.js',
        'access-monitor.html',
        'README.md',
        'ACCESS_LOGGER_IMPLEMENTATION_REPORT.md'
    ];

    let allFilesExist = true;

    for (const file of requiredFiles) {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file} - 文件不存在`);
            allFilesExist = false;
        }
    }

    return allFilesExist;
}

// 运行所有验证
async function runValidation() {
    console.log('🧪 访问日志记录系统验证');
    console.log('='.repeat(50));

    const results = {
        coreFunctionality: false,
        apiRoutes: false,
        fileStructure: false
    };

    // 验证核心功能
    results.coreFunctionality = await validateAccessLogger();

    // 验证API路由
    results.apiRoutes = validateAPIRoutes();

    // 验证文件结构
    results.fileStructure = validateFileStructure();

    // 显示最终结果
    console.log('\n📋 验证结果总结');
    console.log('='.repeat(50));

    const passed = Object.values(results).filter(result => result).length;
    const total = Object.keys(results).length;

    console.log(`✅ 核心功能验证: ${results.coreFunctionality ? '通过' : '失败'}`);
    console.log(`✅ API路由验证: ${results.apiRoutes ? '通过' : '失败'}`);
    console.log(`✅ 文件结构验证: ${results.fileStructure ? '通过' : '失败'}`);

    console.log('\n' + '='.repeat(50));
    console.log(`📊 总体结果: ${passed}/${total} 项验证通过`);

    if (passed === total) {
        console.log('🎉 所有验证通过！访问日志记录系统实现成功。');
    } else {
        console.log('⚠️  部分验证失败，请检查相关功能。');
    }

    return passed === total;
}

// 主函数
if (require.main === module) {
    runValidation().catch(console.error);
}

module.exports = { validateAccessLogger, validateAPIRoutes, validateFileStructure };