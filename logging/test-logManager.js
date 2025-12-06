/**
 * 日志管理器测试脚本
 * 验证日志轮转、归档、清理和分析功能
 */

const { createLogManager } = require('./logManager');
const { LogTaskScheduler } = require('./taskScheduler');
const path = require('path');
const fs = require('fs').promises;

/**
 * 测试配置
 */
const TEST_CONFIG = {
    testLogDir: path.join(__dirname, 'test-logs'),
    testData: {
        logEntries: [
            { level: 'info', message: '系统启动', timestamp: new Date() },
            { level: 'debug', message: '调试信息', timestamp: new Date() },
            { level: 'warn', message: '警告信息', timestamp: new Date() },
            { level: 'error', message: '错误信息', timestamp: new Date() },
            { level: 'fatal', message: '严重错误', timestamp: new Date() }
        ],
        largeLogData: 'x'.repeat(1024 * 1024) // 1MB测试数据
    }
};

/**
 * 日志管理器测试类
 */
class LogManagerTester {
    constructor() {
        this.logManager = null;
        this.taskScheduler = null;
        this.testResults = [];
        this.startTime = Date.now();
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🚀 开始日志管理器测试...\n');

        try {
            // 初始化
            await this.initialize();

            // 执行测试
            await this.testInitialization();
            await this.testLogRotation();
            await this.testLogCleanup();
            await this.testLogSearch();
            await this.testLogBackup();
            await this.testLogRestore();
            await this.testLogStats();
            await this.testHealthCheck();
            await this.testStorageManagement();
            await this.testTaskScheduler();
            await this.testPerformance();

            // 生成报告
            await this.generateTestReport();

            console.log('\n✅ 所有测试完成!');
            
        } catch (error) {
            console.error('\n❌ 测试失败:', error);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * 初始化测试环境
     */
    async initialize() {
        console.log('📋 初始化测试环境...');
        
        try {
            // 创建测试目录
            await fs.mkdir(TEST_CONFIG.testLogDir, { recursive: true });
            
            // 创建日志管理器实例
            this.logManager = createLogManager({
                storage: {
                    basePath: TEST_CONFIG.testLogDir,
                    archivePath: path.join(TEST_CONFIG.testLogDir, 'archive'),
                    tempPath: path.join(TEST_CONFIG.testLogDir, 'temp'),
                    backupPath: path.join(TEST_CONFIG.testLogDir, 'backup')
                }
            });

            // 等待初始化完成
            await new Promise(resolve => {
                if (this.logManager.isInitialized) {
                    resolve();
                } else {
                    this.logManager.once('initialized', resolve);
                }
            });

            console.log('✅ 测试环境初始化完成\n');
            this.recordResult('initialization', true, '测试环境初始化成功');
            
        } catch (error) {
            console.error('❌ 测试环境初始化失败:', error);
            this.recordResult('initialization', false, error.message);
            throw error;
        }
    }

    /**
     * 测试初始化功能
     */
    async testInitialization() {
        console.log('📝 测试初始化功能...');
        
        try {
            const status = await this.logManager.getStatus();
            
            // 验证状态
            if (!status.initialized) {
                throw new Error('日志管理器未正确初始化');
            }

            if (status.activeLogs.length === 0) {
                throw new Error('未创建任何日志实例');
            }

            console.log('✅ 初始化功能测试通过\n');
            this.recordResult('initialization', true, '初始化功能正常');
            
        } catch (error) {
            console.error('❌ 初始化功能测试失败:', error);
            this.recordResult('initialization', false, error.message);
        }
    }

    /**
     * 测试日志轮转功能
     */
    async testLogRotation() {
        console.log('🔄 测试日志轮转功能...');
        
        try {
            // 创建测试日志文件
            await this.createTestLogFiles();
            
            // 执行轮转
            const result = await this.logManager.rotateLog('info');
            
            if (!result.success) {
                throw new Error('日志轮转失败');
            }

            // 验证轮转结果
            const files = await this.logManager.getLogFiles('info');
            const rotatedFiles = files.filter(file => file.name.includes('.rotated'));
            
            if (rotatedFiles.length === 0) {
                throw new Error('未生成轮转文件');
            }

            console.log(`✅ 日志轮转测试通过，轮转了 ${rotatedFiles.length} 个文件\n`);
            this.recordResult('logRotation', true, `轮转了 ${rotatedFiles.length} 个文件`);
            
        } catch (error) {
            console.error('❌ 日志轮转测试失败:', error);
            this.recordResult('logRotation', false, error.message);
        }
    }

    /**
     * 测试日志清理功能
     */
    async testLogCleanup() {
        console.log('🧹 测试日志清理功能...');
        
        try {
            // 创建一些测试数据
            await this.createTestArchiveFiles();
            
            // 执行清理
            const result = await this.logManager.cleanupLogs('all');
            
            if (!result.success) {
                throw new Error('日志清理失败');
            }

            console.log('✅ 日志清理测试通过\n');
            this.recordResult('logCleanup', true, '日志清理功能正常');
            
        } catch (error) {
            console.error('❌ 日志清理测试失败:', error);
            this.recordResult('logCleanup', false, error.message);
        }
    }

    /**
     * 测试日志搜索功能
     */
    async testLogSearch() {
        console.log('🔍 测试日志搜索功能...');
        
        try {
            // 创建测试数据
            await this.createTestLogData();
            
            // 执行搜索
            const results = await this.logManager.searchLogs('错误', {
                logType: 'error',
                maxResults: 10
            });
            
            if (results.length === 0) {
                console.warn('⚠️ 未找到匹配的搜索结果');
            }

            console.log(`✅ 日志搜索测试通过，找到 ${results.length} 条结果\n`);
            this.recordResult('logSearch', true, `搜索到 ${results.length} 条结果`);
            
        } catch (error) {
            console.error('❌ 日志搜索测试失败:', error);
            this.recordResult('logSearch', false, error.message);
        }
    }

    /**
     * 测试日志备份功能
     */
    async testLogBackup() {
        console.log('💾 测试日志备份功能...');
        
        try {
            // 创建测试数据
            await this.createTestLogFiles();
            
            // 执行备份
            const result = await this.logManager.backupLogs({
                logType: 'info',
                includeCompressed: false
            });
            
            if (!result.success) {
                throw new Error('日志备份失败');
            }

            // 验证备份文件
            const backupPath = result.backupPath;
            const manifestExists = await this.fileExists(path.join(backupPath, 'manifest.json'));
            
            if (!manifestExists) {
                throw new Error('备份清单文件不存在');
            }

            console.log('✅ 日志备份测试通过\n');
            this.recordResult('logBackup', true, `备份路径: ${backupPath}`);
            
        } catch (error) {
            console.error('❌ 日志备份测试失败:', error);
            this.recordResult('logBackup', false, error.message);
        }
    }

    /**
     * 测试日志恢复功能
     */
    async testLogRestore() {
        console.log('🔄 测试日志恢复功能...');
        
        try {
            // 先执行备份
            const backupResult = await this.logManager.backupLogs({
                logType: 'info',
                includeCompressed: false
            });
            
            // 删除原始文件（模拟恢复场景）
            await this.deleteTestFiles();
            
            // 执行恢复
            const result = await this.logManager.restoreLogs(backupResult.backupPath);
            
            if (!result.success) {
                throw new Error('日志恢复失败');
            }

            console.log('✅ 日志恢复测试通过\n');
            this.recordResult('logRestore', true, `恢复了 ${result.restoreInfo.restoredFiles} 个文件`);
            
        } catch (error) {
            console.error('❌ 日志恢复测试失败:', error);
            this.recordResult('logRestore', false, error.message);
        }
    }

    /**
     * 测试日志统计功能
     */
    async testLogStats() {
        console.log('📊 测试日志统计功能...');
        
        try {
            // 创建测试数据
            await this.createTestLogFiles();
            
            // 获取统计信息
            const stats = await this.logManager.getLogStats();
            
            // 验证统计信息结构
            if (!stats.storage) {
                throw new Error('缺少存储统计信息');
            }
            
            if (!stats.logs) {
                throw new Error('缺少日志统计信息');
            }

            console.log(`✅ 日志统计测试通过，存储使用率: ${stats.storage.percentage.toFixed(2)}%\n`);
            this.recordResult('logStats', true, '日志统计功能正常');
            
        } catch (error) {
            console.error('❌ 日志统计测试失败:', error);
            this.recordResult('logStats', false, error.message);
        }
    }

    /**
     * 测试健康检查功能
     */
    async testHealthCheck() {
        console.log('🏥 测试健康检查功能...');
        
        try {
            const health = await this.logManager.healthCheck();
            
            // 验证健康检查结果
            if (!health.status) {
                throw new Error('健康检查结果缺少状态');
            }
            
            if (!health.checks) {
                throw new Error('健康检查结果缺少检查项');
            }

            console.log(`✅ 健康检查测试通过，状态: ${health.status}\n`);
            this.recordResult('healthCheck', true, `健康状态: ${health.status}`);
            
        } catch (error) {
            console.error('❌ 健康检查测试失败:', error);
            this.recordResult('healthCheck', false, error.message);
        }
    }

    /**
     * 测试存储管理功能
     */
    async testStorageManagement() {
        console.log('💽 测试存储管理功能...');
        
        try {
            // 创建大量测试数据
            await this.createLargeTestData();
            
            const stats = await this.logManager.getLogStats();
            
            // 验证存储统计
            if (stats.storage.used > 0) {
                console.log(`✅ 存储管理测试通过，已使用存储: ${(stats.storage.used / 1024 / 1024).toFixed(2)} MB\n`);
                this.recordResult('storageManagement', true, `使用存储: ${(stats.storage.used / 1024 / 1024).toFixed(2)} MB`);
            } else {
                throw new Error('未检测到存储使用');
            }
            
        } catch (error) {
            console.error('❌ 存储管理测试失败:', error);
            this.recordResult('storageManagement', false, error.message);
        }
    }

    /**
     * 测试任务调度器
     */
    async testTaskScheduler() {
        console.log('⏰ 测试任务调度器...');
        
        try {
            // 创建任务调度器
            this.taskScheduler = new LogTaskScheduler();
            
            // 启动调度器
            await this.taskScheduler.start();
            
            if (!this.taskScheduler.isRunning) {
                throw new Error('任务调度器未正确启动');
            }

            // 手动执行一个任务
            await this.taskScheduler.runTask('stats');
            
            // 获取任务状态
            const status = this.taskScheduler.getTaskStatus();
            
            console.log(`✅ 任务调度器测试通过，运行任务数: ${Object.keys(status.tasks).length}\n`);
            this.recordResult('taskScheduler', true, `任务调度器运行正常`);
            
        } catch (error) {
            console.error('❌ 任务调度器测试失败:', error);
            this.recordResult('taskScheduler', false, error.message);
        }
    }

    /**
     * 测试性能
     */
    async testPerformance() {
        console.log('⚡ 测试性能...');
        
        try {
            const startTime = Date.now();
            
            // 执行多个操作测试性能
            await this.createTestLogFiles();
            await this.logManager.getStats();
            await this.logManager.healthCheck();
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log(`✅ 性能测试完成，耗时: ${duration}ms\n`);
            this.recordResult('performance', true, `性能测试通过，耗时: ${duration}ms`);
            
        } catch (error) {
            console.error('❌ 性能测试失败:', error);
            this.recordResult('performance', false, error.message);
        }
    }

    /**
     * 创建测试日志文件
     */
    async createTestLogFiles() {
        const logDir = path.join(TEST_CONFIG.testLogDir, 'info');
        await fs.mkdir(logDir, { recursive: true });
        
        const logFile = path.join(logDir, 'test.log');
        const logData = TEST_CONFIG.testData.logEntries
            .map(entry => `[${entry.timestamp.toISOString()}] [${entry.level}] [test] ${entry.message}`)
            .join('\n');
        
        await fs.writeFile(logFile, logData);
    }

    /**
     * 创建测试归档文件
     */
    async createTestArchiveFiles() {
        const archiveDir = path.join(TEST_CONFIG.testLogDir, 'archive', 'error');
        await fs.mkdir(archiveDir, { recursive: true });
        
        // 创建一些过期的测试文件
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 400); // 400天前
        
        const testFile = path.join(archiveDir, `old-error-${Date.now()}.log`);
        await fs.writeFile(testFile, '测试过期日志数据');
        
        // 模拟文件修改时间为过去
        await fs.utimes(testFile, oldDate, oldDate);
    }

    /**
     * 创建测试日志数据
     */
    async createTestLogData() {
        const logDir = path.join(TEST_CONFIG.testLogDir, 'error');
        await fs.mkdir(logDir, { recursive: true });
        
        const logFile = path.join(logDir, 'test-errors.log');
        const errorData = [
            '[2025-01-01T10:00:00.000Z] [error] [test] 这是一个错误信息',
            '[2025-01-01T10:01:00.000Z] [error] [test] 另一个错误信息',
            '[2025-01-01T10:02:00.000Z] [error] [test] 第三个错误信息'
        ].join('\n');
        
        await fs.writeFile(logFile, errorData);
    }

    /**
     * 创建大量测试数据
     */
    async createLargeTestData() {
        const logDir = path.join(TEST_CONFIG.testLogDir, 'system');
        await fs.mkdir(logDir, { recursive: true });
        
        const largeFile = path.join(logDir, 'large-test.log');
        const largeData = TEST_CONFIG.testData.largeLogData.repeat(10); // 10MB
        
        await fs.writeFile(largeFile, largeData);
    }

    /**
     * 删除测试文件
     */
    async deleteTestFiles() {
        try {
            await fs.rm(TEST_CONFIG.testLogDir, { recursive: true, force: true });
        } catch (error) {
            console.warn('删除测试文件时出现警告:', error.message);
        }
    }

    /**
     * 检查文件是否存在
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 记录测试结果
     */
    recordResult(testName, success, message) {
        this.testResults.push({
            testName,
            success,
            message,
            timestamp: new Date()
        });
    }

    /**
     * 生成测试报告
     */
    async generateTestReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        const passed = this.testResults.filter(r => r.success).length;
        const failed = this.testResults.filter(r => !r.success).length;
        const total = this.testResults.length;
        
        console.log('\n📋 测试报告');
        console.log('='.repeat(50));
        console.log(`总测试数: ${total}`);
        console.log(`通过: ${passed} ✅`);
        console.log(`失败: ${failed} ❌`);
        console.log(`成功率: ${((passed / total) * 100).toFixed(2)}%`);
        console.log(`总耗时: ${duration}ms`);
        console.log('='.repeat(50));
        
        if (failed > 0) {
            console.log('\n失败的测试:');
            this.testResults.filter(r => !r.success).forEach(result => {
                console.log(`❌ ${result.testName}: ${result.message}`);
            });
        }
        
        // 保存详细报告到文件
        await this.saveTestReport(duration, passed, failed, total);
    }

    /**
     * 保存测试报告到文件
     */
    async saveTestReport(duration, passed, failed, total) {
        const report = {
            summary: {
                total,
                passed,
                failed,
                successRate: ((passed / total) * 100).toFixed(2) + '%',
                duration,
                timestamp: new Date()
            },
            results: this.testResults
        };
        
        const reportPath = path.join(TEST_CONFIG.testLogDir, 'test-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n📄 详细测试报告已保存到: ${reportPath}`);
    }

    /**
     * 清理测试环境
     */
    async cleanup() {
        console.log('\n🧹 清理测试环境...');
        
        try {
            // 停止任务调度器
            if (this.taskScheduler) {
                await this.taskScheduler.cleanup();
            }
            
            // 清理日志管理器
            if (this.logManager) {
                await this.logManager.cleanup();
            }
            
            // 删除测试目录
            await this.deleteTestFiles();
            
            console.log('✅ 测试环境清理完成');
            
        } catch (error) {
            console.error('❌ 清理测试环境时出错:', error);
        }
    }
}

// 运行测试
if (require.main === module) {
    const tester = new LogManagerTester();
    tester.runAllTests().catch(error => {
        console.error('测试运行失败:', error);
        process.exit(1);
    });
}

module.exports = LogManagerTester;