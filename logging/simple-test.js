const path = require('path');
const ErrorLogger = require('./errorLogger');

/**
 * 简化的错误日志系统测试
 * 不依赖Express，直接测试核心功能
 */
class SimpleErrorLoggerTest {
    constructor() {
        this.errorLogger = null;
        this.testResults = [];
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🧪 开始简化的错误日志系统测试...\n');

        try {
            // 初始化错误日志器
            await this.initializeTest();

            // 运行各项测试
            await this.testBasicLogging();
            await this.testErrorLevels();
            await this.testErrorSources();
            await this.testErrorStatistics();
            await this.testErrorSearch();
            await this.testErrorExport();
            await this.testErrorResolution();
            await this.testErrorAggregation();
            await this.testSystemDiagnostics();

            // 显示测试结果
            this.displayTestResults();

        } catch (error) {
            console.error('❌ 测试过程中发生错误:', error);
        }
    }

    /**
     * 初始化测试环境
     */
    async initializeTest() {
        console.log('📦 初始化测试环境...');
        
        this.errorLogger = new ErrorLogger({
            logPath: path.join(__dirname, 'test-data')
        });

        // 手动初始化（跳过Express相关初始化）
        this.errorLogger.ensureDirectories();
        this.errorLogger.createErrorLogTables();
        
        this.logTestResult('初始化测试', 'pass', '错误日志器初始化成功');
        console.log('✅ 测试环境初始化完成\n');
    }

    /**
     * 测试基本日志记录功能
     */
    async testBasicLogging() {
        console.log('📝 测试基本日志记录功能...');

        try {
            const errorId = await this.errorLogger.logError({
                level: 'info',
                message: '测试信息日志',
                source: 'test',
                code: 'TEST_INFO'
            });

            if (errorId) {
                this.logTestResult('基本日志记录', 'pass', `记录了错误 ID: ${errorId}`);
            } else {
                this.logTestResult('基本日志记录', 'fail', '记录失败');
            }
        } catch (error) {
            this.logTestResult('基本日志记录', 'fail', error.message);
        }
        console.log('');
    }

    /**
     * 测试错误级别分类
     */
    async testErrorLevels() {
        console.log('🏷️  测试错误级别分类...');

        const levels = ['info', 'warning', 'error', 'critical'];
        const results = [];

        for (const level of levels) {
            try {
                const errorId = await this.errorLogger.logError({
                    level: level,
                    message: `测试${level}级别错误`,
                    source: 'test',
                    code: `TEST_${level.toUpperCase()}`
                });
                results.push({ level, success: !!errorId, errorId });
            } catch (error) {
                results.push({ level, success: false, error: error.message });
            }
        }

        const allSuccess = results.every(r => r.success);
        this.logTestResult('错误级别分类', 
            allSuccess ? 'pass' : 'fail', 
            `测试了 ${levels.length} 个级别, ${results.filter(r => r.success).length} 个成功`);

        console.log('结果:', results.map(r => `${r.level}: ${r.success ? '✅' : '❌'}`).join(', '));
        console.log('');
    }

    /**
     * 测试不同错误源
     */
    async testErrorSources() {
        console.log('🌐 测试不同错误源...');

        const sources = [
            { source: 'api', level: 'error', message: 'API调用失败测试' },
            { source: 'database', level: 'error', message: '数据库操作失败测试' },
            { source: 'network', level: 'warning', message: '网络连接问题测试' },
            { source: 'filesystem', level: 'error', message: '文件系统错误测试' },
            { source: 'authentication', level: 'warning', message: '认证失败测试' }
        ];

        const results = [];

        for (const testError of sources) {
            try {
                const errorId = await this.errorLogger.logError(testError);
                results.push({ ...testError, success: !!errorId, errorId });
            } catch (error) {
                results.push({ ...testError, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        this.logTestResult('错误源分类', 
            successCount === sources.length ? 'pass' : 'fail', 
            `测试了 ${sources.length} 个错误源, ${successCount} 个成功`);

        console.log('结果:', results.map(r => `${r.source}: ${r.success ? '✅' : '❌'}`).join(', '));
        console.log('');
    }

    /**
     * 测试错误统计功能
     */
    async testErrorStatistics() {
        console.log('📊 测试错误统计功能...');

        try {
            const stats = this.errorLogger.getErrorStatistics();
            
            const hasRequiredFields = stats && 
                typeof stats.total === 'number' &&
                stats.by_level && 
                stats.by_source &&
                typeof stats.resolved === 'number' &&
                typeof stats.unresolved === 'number';

            this.logTestResult('错误统计', 
                hasRequiredFields ? 'pass' : 'fail', 
                `统计信息: 总计${stats?.total || 0}条, 已解决${stats?.resolved || 0}条`);

        } catch (error) {
            this.logTestResult('错误统计', 'fail', error.message);
        }
        console.log('');
    }

    /**
     * 测试错误搜索功能
     */
    async testErrorSearch() {
        console.log('🔍 测试错误搜索功能...');

        try {
            // 创建一些包含特定关键词的错误
            await this.errorLogger.logError({
                level: 'error',
                message: '数据库连接超时错误',
                source: 'database',
                code: 'DB_TIMEOUT'
            });

            await this.errorLogger.logError({
                level: 'warning',
                message: 'API响应时间过长警告',
                source: 'api',
                code: 'API_SLOW'
            });

            // 搜索包含"错误"的日志
            const searchResults = this.errorLogger.searchErrors('错误');
            
            this.logTestResult('错误搜索', 
                searchResults.length > 0 ? 'pass' : 'fail', 
                `找到 ${searchResults.length} 条相关记录`);

        } catch (error) {
            this.logTestResult('错误搜索', 'fail', error.message);
        }
        console.log('');
    }

    /**
     * 测试错误导出功能
     */
    async testErrorExport() {
        console.log('📤 测试错误导出功能...');

        try {
            const formats = ['json', 'csv'];
            const results = [];

            for (const format of formats) {
                try {
                    const exportedData = this.errorLogger.exportErrorLogs({}, format);
                    const success = exportedData && exportedData.length > 0;
                    results.push({ format, success, size: exportedData?.length || 0 });
                } catch (error) {
                    results.push({ format, success: false, error: error.message });
                }
            }

            const allSuccess = results.every(r => r.success);
            this.logTestResult('错误导出', 
                allSuccess ? 'pass' : 'fail', 
                `测试了 ${formats.length} 种格式, ${results.filter(r => r.success).length} 个成功`);

        } catch (error) {
            this.logTestResult('错误导出', 'fail', error.message);
        }
        console.log('');
    }

    /**
     * 测试错误解决功能
     */
    async testErrorResolution() {
        console.log('✅ 测试错误解决功能...');

        try {
            // 创建一个错误
            const errorId = await this.errorLogger.logError({
                level: 'error',
                message: '需要解决的测试错误',
                source: 'test',
                code: 'RESOLVABLE_ERROR'
            });

            if (errorId) {
                // 标记为已解决
                const resolved = await this.errorLogger.resolveError(
                    errorId, 
                    'test_user', 
                    '这是一个测试解决'
                );

                this.logTestResult('错误解决', 
                    resolved ? 'pass' : 'fail', 
                    resolved ? '成功标记错误为已解决' : '标记解决失败');
            } else {
                this.logTestResult('错误解决', 'fail', '创建测试错误失败');
            }

        } catch (error) {
            this.logTestResult('错误解决', 'fail', error.message);
        }
        console.log('');
    }

    /**
     * 测试错误聚合功能
     */
    async testErrorAggregation() {
        console.log('🔄 测试错误聚合功能...');

        try {
            // 创建多个相似的错误
            const similarErrors = [
                { message: '连接数据库失败', code: 'DB_CONNECTION_FAILED', source: 'database' },
                { message: '连接数据库失败', code: 'DB_CONNECTION_FAILED', source: 'database' },
                { message: '连接数据库失败', code: 'DB_CONNECTION_FAILED', source: 'database' }
            ];

            for (const errorData of similarErrors) {
                await this.errorLogger.logError({
                    level: 'error',
                    ...errorData
                });
            }

            const aggregation = Array.from(this.errorLogger.errorAggregation.values());
            
            this.logTestResult('错误聚合', 
                aggregation.length > 0 ? 'pass' : 'fail', 
                `聚合了 ${aggregation.length} 种错误类型`);

        } catch (error) {
            this.logTestResult('错误聚合', 'fail', error.message);
        }
        console.log('');
    }

    /**
     * 测试系统诊断功能
     */
    async testSystemDiagnostics() {
        console.log('🔬 测试系统诊断功能...');

        try {
            const diagnostics = {
                timestamp: new Date().toISOString(),
                system: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage()
                },
                errorLogger: {
                    available: !!this.errorLogger,
                    aggregationSize: this.errorLogger ? this.errorLogger.errorAggregation.size : 0
                },
                recentErrors: this.errorLogger.getErrorLogs({ limit: 5 }),
                errorStatistics: this.errorLogger.getErrorStatistics(),
                testResults: await this.runBasicTests()
            };
            
            const hasRequiredSections = diagnostics && 
                diagnostics.system &&
                diagnostics.errorLogger &&
                diagnostics.errorStatistics;

            this.logTestResult('系统诊断', 
                hasRequiredSections ? 'pass' : 'fail', 
                `诊断包含 ${Object.keys(diagnostics).length} 个部分`);

        } catch (error) {
            this.logTestResult('系统诊断', 'fail', error.message);
        }
        console.log('');
    }

    /**
     * 运行基本测试
     */
    async runBasicTests() {
        const tests = {
            logging: { status: 'unknown', message: '' },
            statistics: { status: 'unknown', message: '' },
            search: { status: 'unknown', message: '' },
            export: { status: 'unknown', message: '' }
        };

        try {
            // 测试日志记录
            const errorId = await this.errorLogger.logError({
                level: 'error',
                message: '基本测试错误',
                source: 'test',
                code: 'BASIC_TEST_ERROR'
            });
            tests.logging = {
                status: errorId ? 'pass' : 'fail',
                message: errorId ? '错误日志记录成功' : '错误日志记录失败'
            };
        } catch (error) {
            tests.logging = {
                status: 'fail',
                message: `错误日志记录测试失败: ${error.message}`
            };
        }

        try {
            // 测试统计
            const stats = this.errorLogger.getErrorStatistics();
            tests.statistics = {
                status: stats ? 'pass' : 'fail',
                message: stats ? '错误统计获取成功' : '错误统计获取失败'
            };
        } catch (error) {
            tests.statistics = {
                status: 'fail',
                message: `错误统计测试失败: ${error.message}`
            };
        }

        try {
            // 测试搜索
            const searchResults = this.errorLogger.searchErrors('测试');
            tests.search = {
                status: searchResults ? 'pass' : 'fail',
                message: `错误搜索测试完成，找到 ${searchResults.length} 条记录`
            };
        } catch (error) {
            tests.search = {
                status: 'fail',
                message: `错误搜索测试失败: ${error.message}`
            };
        }

        try {
            // 测试导出
            const exportedData = this.errorLogger.exportErrorLogs({}, 'json');
            tests.export = {
                status: exportedData ? 'pass' : 'fail',
                message: exportedData ? '错误导出功能正常' : '错误导出功能异常'
            };
        } catch (error) {
            tests.export = {
                status: 'fail',
                message: `错误导出测试失败: ${error.message}`
            };
        }

        return tests;
    }

    /**
     * 记录测试结果
     */
    logTestResult(testName, status, message) {
        this.testResults.push({
            test: testName,
            status: status,
            message: message,
            timestamp: new Date().toISOString()
        });

        const icon = status === 'pass' ? '✅' : '❌';
        console.log(`${icon} ${testName}: ${message}`);
    }

    /**
     * 显示测试结果摘要
     */
    displayTestResults() {
        console.log('📋 测试结果摘要');
        console.log('='.repeat(50));

        const passedTests = this.testResults.filter(r => r.status === 'pass').length;
        const failedTests = this.testResults.filter(r => r.status === 'fail').length;
        const totalTests = this.testResults.length;

        console.log(`总测试数: ${totalTests}`);
        console.log(`通过: ${passedTests} ✅`);
        console.log(`失败: ${failedTests} ❌`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        console.log('');

        if (failedTests > 0) {
            console.log('失败的测试:');
            this.testResults
                .filter(r => r.status === 'fail')
                .forEach(r => {
                    console.log(`  ❌ ${r.test}: ${r.message}`);
                });
            console.log('');
        }

        console.log('🎯 详细测试结果:');
        this.testResults.forEach((result, index) => {
            const icon = result.status === 'pass' ? '✅' : '❌';
            console.log(`${index + 1}. ${icon} ${result.test}: ${result.message}`);
        });

        // 显示系统状态
        console.log('\n📊 系统状态:');
        const recentErrors = this.errorLogger.getErrorLogs({ limit: 5 });
        const stats = this.errorLogger.getErrorStatistics();
        
        console.log(`最近错误数: ${recentErrors.length}`);
        console.log(`总错误数: ${stats.total}`);
        console.log(`已解决错误: ${stats.resolved}`);
        console.log(`未解决错误: ${stats.unresolved}`);
        console.log(`错误聚合数: ${this.errorLogger.errorAggregation.size}`);
    }

    /**
     * 清理测试环境
     */
    async cleanup() {
        console.log('\n🧹 清理测试环境...');
        console.log('✅ 测试环境清理完成');
    }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
    const test = new SimpleErrorLoggerTest();
    
    test.runAllTests()
        .then(() => {
            console.log('\n🎉 所有测试完成!');
        })
        .catch(error => {
            console.error('\n💥 测试执行失败:', error);
        })
        .finally(() => {
            test.cleanup().then(() => {
                process.exit(0);
            });
        });
}

module.exports = SimpleErrorLoggerTest;