/**
 * 定时任务管理器
 * 自动化日志轮转、归档和清理任务
 */

const cron = require('node-cron');
const { createLogManager } = require('./logManager');

/**
 * 日志任务调度器配置
 */
const SCHEDULER_CONFIG = {
    // 任务配置
    tasks: {
        // 日志轮转任务 - 每天凌晨执行
        rotation: {
            schedule: '0 0 * * *', // 每天午夜12点
            description: '日志文件轮转',
            enabled: true,
            timezone: 'Asia/Shanghai'
        },
        
        // 日志清理任务 - 每天凌晨2点执行
        cleanup: {
            schedule: '0 2 * * *', // 每天凌晨2点
            description: '过期日志清理',
            enabled: true,
            timezone: 'Asia/Shanghai'
        },
        
        // 归档压缩任务 - 每周日凌晨3点执行
        archive: {
            schedule: '0 3 * * 0', // 每周日凌晨3点
            description: '日志归档压缩',
            enabled: true,
            timezone: 'Asia/Shanghai'
        },
        
        // 性能统计任务 - 每6小时执行一次
        stats: {
            schedule: '0 */6 * * *', // 每6小时
            description: '性能统计更新',
            enabled: true,
            timezone: 'Asia/Shanghai'
        },
        
        // 健康检查任务 - 每小时执行一次
        health: {
            schedule: '0 * * * *', // 每小时
            description: '系统健康检查',
            enabled: true,
            timezone: 'Asia/Shanghai'
        },
        
        // 备份任务 - 每天凌晨4点执行
        backup: {
            schedule: '0 4 * * *', // 每天凌晨4点
            description: '日志备份',
            enabled: true,
            timezone: 'Asia/Shanghai'
        }
    },
    
    // 任务执行配置
    execution: {
        maxConcurrent: 3,        // 最大并发任务数
        retryAttempts: 3,        // 重试次数
        retryDelay: 5000,        // 重试延迟(毫秒)
        timeout: 300000,         // 任务超时(毫秒)
        allowOverlap: false      // 是否允许任务重叠执行
    },
    
    // 通知配置
    notifications: {
        onSuccess: true,         // 成功时通知
        onFailure: true,         // 失败时通知
        onWarning: true,         // 警告时通知
        notificationMethods: ['console', 'log'], // 通知方式
        alertThreshold: 3        // 连续失败阈值
    }
};

class LogTaskScheduler {
    constructor(options = {}) {
        this.config = { ...SCHEDULER_CONFIG, ...options };
        this.logManager = createLogManager();
        this.runningTasks = new Map();
        this.taskHistory = new Map();
        this.executionStats = {
            total: 0,
            success: 0,
            failure: 0,
            lastRun: null,
            nextRun: null
        };
        this.failureCount = new Map();
        this.isRunning = false;
        
        this._initializeTasks();
    }

    /**
     * 初始化所有任务
     */
    _initializeTasks() {
        this.tasks = new Map();
        
        for (const [taskName, taskConfig] of Object.entries(this.config.tasks)) {
            if (taskConfig.enabled) {
                const task = this._createTask(taskName, taskConfig);
                this.tasks.set(taskName, task);
            }
        }
        
        console.log(`已初始化 ${this.tasks.size} 个日志管理任务`);
    }

    /**
     * 创建单个任务
     */
    _createTask(taskName, taskConfig) {
        const task = {
            name: taskName,
            schedule: taskConfig.schedule,
            description: taskConfig.description,
            enabled: taskConfig.enabled,
            timezone: taskConfig.timezone,
            lastRun: null,
            nextRun: null,
            status: 'idle', // idle, running, success, failure
            errorCount: 0,
            totalRuns: 0,
            successfulRuns: 0,
            lastError: null,
            averageDuration: 0
        };

        return task;
    }

    /**
     * 启动所有任务
     */
    async start() {
        if (this.isRunning) {
            console.warn('任务调度器已在运行中');
            return;
        }

        try {
            this.isRunning = true;
            console.log('启动日志任务调度器...');

            for (const [taskName, task] of this.tasks) {
                await this._startTask(taskName, task);
            }

            console.log(`已启动 ${this.tasks.size} 个任务`);
            this._updateExecutionStats();
        } catch (error) {
            console.error('启动任务调度器失败:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * 启动单个任务
     */
    async _startTask(taskName, task) {
        try {
            const scheduledTask = cron.schedule(
                task.schedule,
                async () => {
                    await this._executeTask(taskName, task);
                },
                {
                    timezone: task.timezone
                }
            );

            this.runningTasks.set(taskName, scheduledTask);
            console.log(`任务 "${taskName}" 已启动: ${task.schedule}`);
            
        } catch (error) {
            console.error(`启动任务 "${taskName}" 失败:`, error);
        }
    }

    /**
     * 执行任务
     */
    async _executeTask(taskName, task) {
        // 检查是否允许重叠执行
        if (!this.config.execution.allowOverlap && task.status === 'running') {
            console.warn(`任务 "${taskName}" 正在运行，跳过本次执行`);
            return;
        }

        const startTime = Date.now();
        const taskHistory = {
            taskName,
            startTime: new Date(),
            endTime: null,
            duration: null,
            status: 'running',
            result: null,
            error: null
        };

        try {
            console.log(`开始执行任务: ${taskName}`);
            task.status = 'running';
            task.lastRun = new Date();

            // 根据任务名称执行相应操作
            let result;
            switch (taskName) {
                case 'rotation':
                    result = await this.logManager.rotateLog('all');
                    break;
                case 'cleanup':
                    result = await this.logManager.cleanupLogs('all');
                    break;
                case 'archive':
                    // 归档逻辑已在轮转中集成
                    result = await this.logManager.getLogStats();
                    break;
                case 'stats':
                    result = await this.logManager.getLogStats();
                    break;
                case 'health':
                    result = await this.logManager.healthCheck();
                    break;
                case 'backup':
                    result = await this.logManager.backupLogs();
                    break;
                default:
                    throw new Error(`未知任务类型: ${taskName}`);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            taskHistory.endTime = new Date();
            taskHistory.duration = duration;
            taskHistory.status = 'success';
            taskHistory.result = result;

            // 更新任务状态
            task.status = 'success';
            task.errorCount = 0;
            task.successfulRuns++;
            task.lastError = null;
            
            // 更新平均执行时间
            task.averageDuration = (task.averageDuration * task.totalRuns + duration) / (task.totalRuns + 1);

            // 更新执行统计
            this.executionStats.success++;
            this.failureCount.delete(taskName);

            // 成功通知
            if (this.config.notifications.onSuccess) {
                this._notifySuccess(taskName, result, duration);
            }

        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            taskHistory.endTime = new Date();
            taskHistory.duration = duration;
            taskHistory.status = 'failure';
            taskHistory.error = error;

            // 更新任务状态
            task.status = 'failure';
            task.errorCount++;
            task.lastError = error.message;
            
            // 更新失败计数
            const currentFailureCount = this.failureCount.get(taskName) || 0;
            this.failureCount.set(taskName, currentFailureCount + 1);

            // 更新执行统计
            this.executionStats.failure++;

            // 失败通知
            if (this.config.notifications.onFailure) {
                this._notifyFailure(taskName, error, duration);
            }

            // 检查是否需要告警
            if (this.failureCount.get(taskName) >= this.config.notifications.alertThreshold) {
                this._notifyAlert(taskName, error);
            }
        }

        // 记录任务历史
        this._recordTaskHistory(taskHistory);
        
        // 更新总执行次数
        task.totalRuns++;
        this.executionStats.total++;
        this.executionStats.lastRun = new Date();

        console.log(`任务 "${taskName}" 执行完成: ${taskHistory.status}, 耗时: ${taskHistory.duration}ms`);
        
        // 更新下次执行时间
        this._updateNextRunTime(task);
    }

    /**
     * 记录任务历史
     */
    _recordTaskHistory(history) {
        if (!this.taskHistory.has(history.taskName)) {
            this.taskHistory.set(history.taskName, []);
        }

        const taskHistory = this.taskHistory.get(history.taskName);
        taskHistory.push(history);

        // 只保留最近100次执行记录
        if (taskHistory.length > 100) {
            taskHistory.shift();
        }
    }

    /**
     * 通知成功
     */
    _notifySuccess(taskName, result, duration) {
        const message = `任务 "${taskName}" 执行成功，耗时: ${duration}ms`;
        
        for (const method of this.config.notifications.notificationMethods) {
            switch (method) {
                case 'console':
                    console.log(`[SUCCESS] ${message}`);
                    break;
                case 'log':
                    // 可以写入到特定的日志文件
                    break;
            }
        }
    }

    /**
     * 通知失败
     */
    _notifyFailure(taskName, error, duration) {
        const message = `任务 "${taskName}" 执行失败，耗时: ${duration}ms，错误: ${error.message}`;
        
        for (const method of this.config.notifications.notificationMethods) {
            switch (method) {
                case 'console':
                    console.error(`[FAILURE] ${message}`);
                    break;
                case 'log':
                    // 可以写入到特定的错误日志文件
                    break;
            }
        }
    }

    /**
     * 通知告警
     */
    _notifyAlert(taskName, error) {
        const message = `任务 "${taskName}" 连续失败 ${this.config.notifications.alertThreshold} 次，需要关注！`;
        
        for (const method of this.config.notifications.notificationMethods) {
            switch (method) {
                case 'console':
                    console.warn(`[ALERT] ${message}`);
                    break;
                case 'log':
                    // 可以写入到告警日志文件
                    break;
            }
        }
    }

    /**
     * 更新下次执行时间
     */
    _updateNextRunTime(task) {
        try {
            // 简单的下次执行时间计算
            const now = new Date();
            const [hour, minute] = task.schedule.split(' ')[1].split(':').map(Number);
            const nextRun = new Date(now);
            nextRun.setHours(hour, minute, 0, 0);
            
            if (nextRun <= now) {
                nextRun.setDate(nextRun.getDate() + 1);
            }
            
            task.nextRun = nextRun;
        } catch (error) {
            console.error(`计算任务 "${task.name}" 下次执行时间失败:`, error);
        }
    }

    /**
     * 手动执行任务
     */
    async runTask(taskName) {
        if (!this.tasks.has(taskName)) {
            throw new Error(`任务不存在: ${taskName}`);
        }

        const task = this.tasks.get(taskName);
        console.log(`手动执行任务: ${taskName}`);
        
        await this._executeTask(taskName, task);
    }

    /**
     * 停止所有任务
     */
    async stop() {
        if (!this.isRunning) {
            console.warn('任务调度器未在运行');
            return;
        }

        try {
            console.log('停止日志任务调度器...');
            
            for (const [taskName, scheduledTask] of this.runningTasks) {
                scheduledTask.stop();
                console.log(`任务 "${taskName}" 已停止`);
            }

            this.runningTasks.clear();
            this.isRunning = false;
            
            console.log('任务调度器已停止');
        } catch (error) {
            console.error('停止任务调度器失败:', error);
            throw error;
        }
    }

    /**
     * 获取任务状态
     */
    getTaskStatus(taskName) {
        if (taskName) {
            const task = this.tasks.get(taskName);
            if (!task) {
                throw new Error(`任务不存在: ${taskName}`);
            }
            
            return {
                name: task.name,
                schedule: task.schedule,
                description: task.description,
                enabled: task.enabled,
                status: task.status,
                lastRun: task.lastRun,
                nextRun: task.nextRun,
                errorCount: task.errorCount,
                totalRuns: task.totalRuns,
                successfulRuns: task.successfulRuns,
                successRate: task.totalRuns > 0 ? 
                    ((task.successfulRuns / task.totalRuns) * 100).toFixed(2) + '%' : '0%',
                lastError: task.lastError,
                averageDuration: task.averageDuration
            };
        }

        // 返回所有任务状态
        const allTasks = {};
        for (const [name, task] of this.tasks) {
            allTasks[name] = this.getTaskStatus(name);
        }

        return {
            isRunning: this.isRunning,
            tasks: allTasks,
            executionStats: this.executionStats,
            nextExecution: this._getNextExecution()
        };
    }

    /**
     * 获取下次执行时间
     */
    _getNextExecution() {
        let nextExecution = null;
        
        for (const task of this.tasks.values()) {
            if (task.nextRun && (!nextExecution || task.nextRun < nextExecution)) {
                nextExecution = task.nextRun;
            }
        }
        
        return nextExecution;
    }

    /**
     * 更新执行统计
     */
    _updateExecutionStats() {
        this.executionStats.nextRun = this._getNextExecution();
    }

    /**
     * 获取任务历史
     */
    getTaskHistory(taskName, limit = 50) {
        if (taskName) {
            if (!this.taskHistory.has(taskName)) {
                return [];
            }
            
            const history = this.taskHistory.get(taskName);
            return history.slice(-limit);
        }

        // 返回所有任务历史
        const allHistory = {};
        for (const [name, history] of this.taskHistory) {
            allHistory[name] = history.slice(-limit);
        }

        return allHistory;
    }

    /**
     * 重置任务状态
     */
    resetTask(taskName) {
        const task = this.tasks.get(taskName);
        if (!task) {
            throw new Error(`任务不存在: ${taskName}`);
        }

        task.status = 'idle';
        task.errorCount = 0;
        task.lastError = null;
        this.failureCount.delete(taskName);
        
        console.log(`任务 "${taskName}" 状态已重置`);
    }

    /**
     * 启用/禁用任务
     */
    toggleTask(taskName, enabled) {
        const task = this.tasks.get(taskName);
        if (!task) {
            throw new Error(`任务不存在: ${taskName}`);
        }

        task.enabled = enabled;
        
        if (enabled && !this.runningTasks.has(taskName)) {
            // 启用任务
            this._startTask(taskName, task);
        } else if (!enabled && this.runningTasks.has(taskName)) {
            // 禁用任务
            const scheduledTask = this.runningTasks.get(taskName);
            scheduledTask.stop();
            this.runningTasks.delete(taskName);
        }
        
        console.log(`任务 "${taskName}" 已${enabled ? '启用' : '禁用'}`);
    }

    /**
     * 获取调度器配置
     */
    getConfig() {
        return {
            tasks: this.config.tasks,
            execution: this.config.execution,
            notifications: this.config.notifications,
            currentStatus: {
                isRunning: this.isRunning,
                taskCount: this.tasks.size,
                runningTasks: this.runningTasks.size
            }
        };
    }

    /**
     * 清理资源
     */
    async cleanup() {
        await this.stop();
        await this.logManager.cleanup();
        console.log('任务调度器资源已清理');
    }
}

module.exports = {
    LogTaskScheduler,
    SCHEDULER_CONFIG
};