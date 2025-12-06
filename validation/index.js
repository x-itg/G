/**
 * 放射化学纯度检测仪验证管理器主入口
 * 
 * 提供统一的验证管理界面，整合所有验证功能
 * 支持100%通过率保障机制
 */

const ComprehensiveValidator = require('./comprehensiveValidator');

// 条件性加载validationRoutes，只有在需要时才加载
let validationRoutes = null;
try {
    validationRoutes = require('./validationRoutes');
} catch (error) {
    console.warn('无法加载validationRoutes，express可能未安装:', error.message);
}

/**
 * 验证管理器类
 */
class ValidationManager {
    constructor(options = {}) {
        this.options = {
            autoStart: options.autoStart !== false,
            interval: options.interval || 3600000, // 1小时
            enableScheduling: options.enableScheduling !== false,
            reportRetention: options.reportRetention || 100,
            ...options
        };
        
        this.validator = new ComprehensiveValidator(options.validatorOptions || {});
        this.scheduledJobs = new Map();
        this.isInitialized = false;
    }

    /**
     * 初始化验证管理器
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('初始化验证管理器...');
            
            // 初始化验证器
            await this.validator.initialize?.();
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 设置定时验证
            if (this.options.enableScheduling) {
                await this.setupScheduledValidation();
            }
            
            // 执行初始验证
            if (this.options.autoStart) {
                await this.runInitialValidation();
            }
            
            this.isInitialized = true;
            console.log('验证管理器初始化完成');
            
        } catch (error) {
            console.error('验证管理器初始化失败:', error);
            throw error;
        }
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        this.validator.on('validation:started', (data) => {
            console.log(`开始验证: ${data.id}`);
        });

        this.validator.on('validation:completed', (data) => {
            console.log(`验证完成: ${data.id}, 状态: ${data.result.overall_status}`);
            
            // 检查是否达到100%通过率
            if (data.result.overall_status !== 'PASSED') {
                this.handleValidationFailure(data);
            } else {
                console.log('✅ 验证通过率达到100%');
            }
        });

        this.validator.on('validation:failed', (data) => {
            console.error(`验证失败: ${data.id}, 错误: ${data.error}`);
            this.handleValidationFailure(data);
        });

        this.validator.on('validation:auto-fixed', (data) => {
            console.log(`自动修复成功: ${data.moduleType}`);
        });
    }

    /**
     * 设置定时验证
     */
    async setupScheduledValidation() {
        // 这里可以集成定时任务调度器，如node-cron
        // 简化实现，每小时执行一次验证
        
        if (this.scheduledJobs.has('hourly-validation')) {
            return;
        }

        console.log('设置定时验证任务...');
        
        // 在实际生产环境中，这里应该使用node-cron或其他调度器
        // setInterval(() => {
        //     this.runScheduledValidation();
        // }, this.options.interval);
        
        this.scheduledJobs.set('hourly-validation', {
            interval: this.options.interval,
            nextRun: new Date(Date.now() + this.options.interval)
        });
    }

    /**
     * 执行初始验证
     */
    async runInitialValidation() {
        try {
            console.log('执行初始验证...');
            const report = await this.validator.runComprehensiveValidation({
                modules: null, // 所有模块
                autoFixEnabled: true,
                parallelExecution: true
            });
            
            console.log('初始验证完成:', report.overall_status);
            return report;
            
        } catch (error) {
            console.error('初始验证失败:', error);
            // 不抛出错误，允许系统继续启动
        }
    }

    /**
     * 处理验证失败
     */
    async handleValidationFailure(validationData) {
        try {
            console.log('处理验证失败...');
            
            // 记录失败信息
            await this.logValidationFailure(validationData);
            
            // 发送告警通知
            await this.sendAlert(validationData);
            
            // 如果启用了自动修复，尝试修复
            if (this.validator.config.autoFixEnabled) {
                await this.attemptAutoRecovery(validationData);
            }
            
        } catch (error) {
            console.error('处理验证失败时出错:', error);
        }
    }

    /**
     * 记录验证失败
     */
    async logValidationFailure(validationData) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            validationId: validationData.id,
            error: validationData.error,
            type: 'validation_failure'
        };
        
        // 这里可以集成日志系统
        console.log('验证失败日志:', logEntry);
    }

    /**
     * 发送告警
     */
    async sendAlert(validationData) {
        const alert = {
            level: 'error',
            title: '验证失败告警',
            message: `验证 ${validationData.id} 失败: ${validationData.error}`,
            timestamp: new Date().toISOString(),
            validationId: validationData.id
        };
        
        // 这里可以集成邮件、短信、钉钉等通知方式
        console.log('发送告警:', alert);
    }

    /**
     * 尝试自动恢复
     */
    async attemptAutoRecovery(validationData) {
        try {
            console.log('尝试自动恢复...');
            
            // 等待一段时间后重新验证
            setTimeout(async () => {
                try {
                    const recoveryReport = await this.validator.runComprehensiveValidation({
                        modules: null,
                        autoFixEnabled: true,
                        parallelExecution: true
                    });
                    
                    if (recoveryReport.overall_status === 'PASSED') {
                        console.log('✅ 自动恢复成功');
                        await this.sendRecoveryNotification(recoveryReport);
                    } else {
                        console.log('❌ 自动恢复失败，需要手动干预');
                    }
                    
                } catch (error) {
                    console.error('自动恢复验证失败:', error);
                }
            }, 30000); // 30秒后重试
            
        } catch (error) {
            console.error('自动恢复过程出错:', error);
        }
    }

    /**
     * 发送恢复通知
     */
    async sendRecoveryNotification(report) {
        const notification = {
            level: 'success',
            title: '验证恢复成功',
            message: `验证已恢复正常，通过率: ${report.pass_rate}`,
            timestamp: new Date().toISOString()
        };
        
        console.log('发送恢复通知:', notification);
    }

    /**
     * 执行计划验证
     */
    async runScheduledValidation() {
        try {
            console.log('执行计划验证...');
            const report = await this.validator.runComprehensiveValidation();
            
            // 更新下次运行时间
            const job = this.scheduledJobs.get('hourly-validation');
            if (job) {
                job.nextRun = new Date(Date.now() + job.interval);
            }
            
            return report;
            
        } catch (error) {
            console.error('计划验证失败:', error);
            throw error;
        }
    }

    /**
     * 执行按需验证
     */
    async runOnDemandValidation(options = {}) {
        try {
            console.log('执行按需验证...');
            return await this.validator.runComprehensiveValidation(options);
        } catch (error) {
            console.error('按需验证失败:', error);
            throw error;
        }
    }

    /**
     * 获取验证状态
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isRunning: this.validator.isRunning,
            currentValidation: this.validator.currentValidation,
            scheduledJobs: Array.from(this.scheduledJobs.entries()),
            options: this.options
        };
    }

    /**
     * 获取验证历史
     */
    getHistory(limit = 50) {
        return this.validator.getValidationHistory(limit);
    }

    /**
     * 获取最新验证报告
     */
    getLatestReport() {
        return this.validator.getValidationReport();
    }

    /**
     * 手动触发验证
     */
    async triggerValidation(options = {}) {
        if (this.validator.isRunning) {
            throw new Error('验证正在进行中，请等待完成');
        }

        return await this.validator.runComprehensiveValidation(options);
    }

    /**
     * 停止验证管理器
     */
    async shutdown() {
        try {
            console.log('关闭验证管理器...');
            
            // 清除定时任务
            this.scheduledJobs.clear();
            
            // 等待当前验证完成
            if (this.validator.isRunning) {
                console.log('等待当前验证完成...');
                // 这里可以添加超时机制
            }
            
            // 清理资源
            this.validator.removeAllListeners();
            
            this.isInitialized = false;
            console.log('验证管理器已关闭');
            
        } catch (error) {
            console.error('关闭验证管理器时出错:', error);
        }
    }

    /**
     * 获取验证统计信息
     */
    getStatistics() {
        const history = this.getHistory(100);
        
        if (history.length === 0) {
            return {
                totalValidations: 0,
                passedValidations: 0,
                failedValidations: 0,
                autoFixedCount: 0,
                averageExecutionTime: 0,
                passRate: 0,
                uptime: 0
            };
        }

        const totalValidations = history.length;
        const passedValidations = history.filter(h => h.overall_status === 'PASSED').length;
        const failedValidations = history.filter(h => h.overall_status === 'FAILED').length;
        
        const totalExecutionTime = history.reduce((sum, h) => {
            const time = parseInt(h.execution_time) || 0;
            return sum + time;
        }, 0);
        
        const averageExecutionTime = totalExecutionTime / totalValidations;
        const passRate = (passedValidations / totalValidations * 100).toFixed(2);

        return {
            totalValidations,
            passedValidations,
            failedValidations,
            autoFixedCount: history.filter(h => h.auto_fixed_modules > 0).length,
            averageExecutionTime: Math.round(averageExecutionTime),
            passRate: `${passRate}%`,
            uptime: this.isInitialized ? Date.now() - (this.startTime || Date.now()) : 0
        };
    }
}

/**
 * 创建验证管理器实例
 */
function createValidationManager(options = {}) {
    return new ValidationManager(options);
}

/**
 * 验证管理器工厂
 */
class ValidationManagerFactory {
    constructor() {
        this.instances = new Map();
    }

    /**
     * 创建或获取验证管理器实例
     */
    getInstance(name = 'default', options = {}) {
        if (!this.instances.has(name)) {
            const manager = new ValidationManager(options);
            this.instances.set(name, manager);
        }
        return this.instances.get(name);
    }

    /**
     * 获取所有实例
     */
    getAllInstances() {
        return this.instances;
    }

    /**
     * 关闭所有实例
     */
    async shutdownAll() {
        const shutdownPromises = Array.from(this.instances.values()).map(manager => manager.shutdown());
        await Promise.all(shutdownPromises);
        this.instances.clear();
    }
}

// 全局工厂实例
const validationManagerFactory = new ValidationManagerFactory();

module.exports = {
    ValidationManager,
    ComprehensiveValidator,
    validationRoutes: validationRoutes || null,
    createValidationManager,
    validationManagerFactory,
    VALIDATION_STATUS: require('./comprehensiveValidator').VALIDATION_STATUS,
    VALIDATION_TYPES: require('./comprehensiveValidator').VALIDATION_TYPES
};

// 如果直接运行此文件，执行示例验证
if (require.main === module) {
    async function runExample() {
        try {
            console.log('启动验证管理器示例...');
            
            const manager = createValidationManager({
                autoStart: true,
                enableScheduling: false, // 示例中禁用定时任务
                validatorOptions: {
                    autoFixEnabled: true,
                    parallelExecution: true,
                    timeout: 30000
                }
            });
            
            await manager.initialize();
            
            // 运行示例验证
            console.log('\n执行示例验证...');
            const report = await manager.runOnDemandValidation({
                modules: ['system_health', 'database_schema', 'permission_system']
            });
            
            console.log('\n验证报告:');
            console.log(JSON.stringify(report, null, 2));
            
            console.log('\n统计信息:');
            console.log(manager.getStatistics());
            
            // 关闭管理器
            await manager.shutdown();
            
        } catch (error) {
            console.error('示例运行失败:', error);
        }
    }
    
    runExample();
}