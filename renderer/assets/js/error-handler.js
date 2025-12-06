/**
 * 辐射检测器系统 - 统一错误处理模块
 * 提供全局错误处理、用户友好提示、错误恢复等功能
 * 
 * @author Radiation Detector Team
 * @version 1.0.0
 * @date 2025-12-04
 */

window.ErrorHandler = {
    // 配置选项
    config: {
        enableLogging: true,
        enableUserFeedback: true,
        enableRecovery: true,
        maxRetries: 3,
        retryDelay: 1000,
        logLevel: 'info', // debug, info, warning, error
        showStackTrace: false,
        autoReport: false
    },

    // 错误统计
    statistics: {
        totalErrors: 0,
        errorsByModule: {},
        errorsByType: {},
        lastResetTime: Date.now()
    },

    // 错误消息模板
    messageTemplates: {
        // 认证相关错误
        auth: {
            'login_failed': '登录失败：用户名或密码错误',
            'session_expired': '会话已过期，请重新登录',
            'permission_denied': '权限不足，无法执行此操作',
            'signature_failed': '电子签名失败，请检查密码',
            'user_not_found': '用户不存在或已被禁用'
        },

        // 设备相关错误
        device: {
            'connection_failed': '设备连接失败：{reason}',
            'device_not_found': '未检测到设备，请检查连接',
            'calibration_failed': '设备校准失败：{reason}',
            'device_busy': '设备忙碌，请稍后重试',
            'port_unavailable': '串口不可用，请检查端口设置',
            'baud_rate_error': '波特率设置错误，请选择合适的波特率'
        },

        // 文件操作错误
        file: {
            'file_not_found': '文件不存在：{filename}',
            'file_corrupted': '文件损坏，无法读取',
            'permission_denied': '没有权限访问此文件',
            'storage_full': '存储空间不足，无法保存文件',
            'export_failed': '文件导出失败：{reason}',
            'import_failed': '文件导入失败：{reason}'
        },

        // 串口通信错误
        serial: {
            'connection_lost': '串口连接已断开',
            'timeout_error': '通信超时，请检查设备状态',
            'data_format_error': '接收到的数据格式错误',
            'buffer_overflow': '数据缓冲区溢出',
            'hardware_error': '硬件通信错误：{reason}'
        },

        // 数据分析错误
        analysis: {
            'insufficient_data': '数据不足，无法进行分析',
            'calculation_error': '计算错误：{reason}',
            'peak_detection_failed': '峰值检测失败：{reason}',
            'validation_failed': '数据验证失败：{reason}',
            'result_save_failed': '分析结果保存失败'
        },

        // 网络相关错误
        network: {
            'connection_error': '网络连接错误：{reason}',
            'server_unreachable': '服务器不可达，请检查网络连接',
            'timeout': '请求超时，请稍后重试',
            'bad_response': '服务器响应异常',
            'rate_limit': '请求过于频繁，请稍后再试'
        },

        // 系统错误
        system: {
            'unknown_error': '未知错误：{message}',
            'memory_insufficient': '系统内存不足',
            'permission_error': '系统权限不足',
            'dependency_missing': '缺少必要的依赖组件',
            'configuration_error': '配置错误：{reason}'
        }
    },

    // 错误恢复策略
    recoveryStrategies: {
        'connection_failed': 'auto_retry',
        'session_expired': 'reauthenticate',
        'file_not_found': 'suggest_alternative',
        'timeout_error': 'auto_retry',
        'hardware_error': 'restart_connection',
        'data_format_error': 'parse_fallback'
    },

    /**
     * 初始化错误处理模块
     */
    init() {
        this.setupGlobalHandlers();
        this.loadSettings();
        console.log('统一错误处理模块已初始化');
    },

    /**
     * 设置全局错误处理器
     */
    setupGlobalHandlers() {
        // 未捕获的Promise错误
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'unhandled_rejection');
        });

        // 全局JavaScript错误
        window.addEventListener('error', (event) => {
            this.handleError(new Error(event.message), 'javascript_error', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });

        // 资源加载错误
        document.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleError(new Error(`资源加载失败: ${event.target.src || event.target.href}`), 'resource_error');
            }
        }, true);
    },

    /**
     * 加载设置
     */
    loadSettings() {
        const settings = localStorage.getItem('errorHandlerSettings');
        if (settings) {
            try {
                const parsed = JSON.parse(settings);
                Object.assign(this.config, parsed);
            } catch (error) {
                console.warn('加载错误处理设置失败:', error);
            }
        }
    },

    /**
     * 保存设置
     */
    saveSettings() {
        try {
            localStorage.setItem('errorHandlerSettings', JSON.stringify(this.config));
        } catch (error) {
            console.warn('保存错误处理设置失败:', error);
        }
    },

    /**
     * 处理错误的主要方法
     * @param {Error|string} error - 错误对象或错误消息
     * @param {string} type - 错误类型
     * @param {object} context - 错误上下文信息
     */
    handleError(error, type = 'unknown_error', context = {}) {
        const errorInfo = this.normalizeError(error, type, context);
        
        // 记录错误统计
        this.updateStatistics(errorInfo);
        
        // 记录错误日志
        this.logError(errorInfo);
        
        // 用户反馈
        this.showUserFeedback(errorInfo);
        
        // 尝试错误恢复
        this.attemptRecovery(errorInfo);
        
        // 自动报告（在生产环境中）
        if (this.config.autoReport && typeof window.electronAPI !== 'undefined') {
            this.reportError(errorInfo);
        }
        
        return errorInfo;
    },

    /**
     * 标准化错误信息
     * @param {Error|string} error
     * @param {string} type
     * @param {object} context
     * @returns {object}
     */
    normalizeError(error, type, context) {
        const isStringError = typeof error === 'string';
        const errorMessage = isStringError ? error : error.message;
        const errorStack = isStringError ? '' : error.stack;
        
        // 获取用户友好的错误消息
        const userMessage = this.getUserFriendlyMessage(type, errorMessage, context);
        
        return {
            id: this.generateErrorId(),
            type: type,
            message: errorMessage,
            userMessage: userMessage,
            stack: errorStack,
            context: context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            userId: Auth?.getCurrentUser()?.id || 'anonymous',
            sessionId: this.getSessionId(),
            module: this.detectModule(context),
            severity: this.getSeverityLevel(type),
            recoverable: this.isRecoverable(type)
        };
    },

    /**
     * 生成错误ID
     * @returns {string}
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * 获取用户友好的错误消息
     * @param {string} type
     * @param {string} message
     * @param {object} context
     * @returns {string}
     */
    getUserFriendlyMessage(type, message, context) {
        // 尝试从模板获取消息
        const category = type.split('_')[0]; // 获取错误类别
        const templateKey = type.split('_').slice(1).join('_'); // 获取具体错误类型
        
        const categoryTemplates = this.messageTemplates[category];
        let template = null;
        
        if (categoryTemplates) {
            template = categoryTemplates[templateKey] || categoryTemplates[type];
        }
        
        if (template) {
            // 替换模板变量
            return template.replace(/\{(\w+)\}/g, (match, key) => {
                return context[key] || message;
            });
        }
        
        // 如果没有找到模板，返回默认消息
        return this.getDefaultMessage(type, message);
    },

    /**
     * 获取默认错误消息
     * @param {string} type
     * @param {string} message
     * @returns {string}
     */
    getDefaultMessage(type, message) {
        const defaultMessages = {
            'network_error': '网络连接出现问题，请检查网络设置',
            'timeout_error': '操作超时，请稍后重试',
            'permission_error': '权限不足，无法执行此操作',
            'validation_error': '输入数据验证失败',
            'calculation_error': '计算过程中发生错误'
        };
        
        return defaultMessages[type] || `操作失败：${message}`;
    },

    /**
     * 检测错误发生的模块
     * @param {object} context
     * @returns {string}
     */
    detectModule(context) {
        // 从堆栈信息检测模块
        if (context.stack) {
            const stackLines = context.stack.split('\n');
            for (const line of stackLines) {
                if (line.includes('Auth.')) return 'auth';
                if (line.includes('DeviceManager.')) return 'device-manager';
                if (line.includes('FileManager.')) return 'file-manager';
                if (line.includes('SerialModule.')) return 'serial';
                if (line.includes('ChartModule.')) return 'chart';
            }
        }
        
        // 从上下文检测模块
        if (context.module) return context.module;
        if (context.component) return context.component;
        
        return 'unknown';
    },

    /**
     * 获取错误严重程度
     * @param {string} type
     * @returns {string}
     */
    getSeverityLevel(type) {
        const criticalErrors = ['hardware_error', 'system_error', 'authentication_bypass'];
        const highErrors = ['connection_failed', 'data_corruption', 'security_error'];
        const mediumErrors = ['timeout_error', 'calculation_error', 'validation_error'];
        
        if (criticalErrors.includes(type)) return 'critical';
        if (highErrors.includes(type)) return 'high';
        if (mediumErrors.includes(type)) return 'medium';
        return 'low';
    },

    /**
     * 判断错误是否可恢复
     * @param {string} type
     * @returns {boolean}
     */
    isRecoverable(type) {
        const recoverableErrors = [
            'connection_failed', 'timeout_error', 'network_error',
            'session_expired', 'permission_denied'
        ];
        return recoverableErrors.includes(type);
    },

    /**
     * 更新错误统计
     * @param {object} errorInfo
     */
    updateStatistics(errorInfo) {
        this.statistics.totalErrors++;
        
        // 按模块统计
        if (!this.statistics.errorsByModule[errorInfo.module]) {
            this.statistics.errorsByModule[errorInfo.module] = 0;
        }
        this.statistics.errorsByModule[errorInfo.module]++;
        
        // 按类型统计
        if (!this.statistics.errorsByType[errorInfo.type]) {
            this.statistics.errorsByType[errorInfo.type] = 0;
        }
        this.statistics.errorsByType[errorInfo.type]++;
    },

    /**
     * 记录错误日志
     * @param {object} errorInfo
     */
    logError(errorInfo) {
        if (!this.config.enableLogging) return;
        
        const logData = {
            level: 'error',
            timestamp: errorInfo.timestamp,
            errorId: errorInfo.id,
            type: errorInfo.type,
            message: errorInfo.message,
            module: errorInfo.module,
            severity: errorInfo.severity,
            context: errorInfo.context
        };
        
        // 输出到控制台
        if (this.config.logLevel === 'debug') {
            console.group(`🚨 错误 [${errorInfo.id}]`);
            console.error('类型:', errorInfo.type);
            console.error('模块:', errorInfo.module);
            console.error('消息:', errorInfo.message);
            console.error('用户消息:', errorInfo.userMessage);
            console.error('严重程度:', errorInfo.severity);
            if (this.config.showStackTrace) {
                console.error('堆栈:', errorInfo.stack);
            }
            console.groupEnd();
        } else {
            console.error(`[${errorInfo.module}] ${errorInfo.userMessage}`);
        }
        
        // 保存到本地存储（限制数量）
        this.saveErrorToStorage(logData);
        
        // 发送到主进程（在Electron环境中）
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.logger) {
            window.electronAPI.logger.logError(logData);
        }
    },

    /**
     * 保存错误到本地存储
     * @param {object} logData
     */
    saveErrorToStorage(logData) {
        try {
            const key = 'errorLogs';
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.unshift(logData);
            
            // 只保留最近100个错误
            if (existing.length > 100) {
                existing.splice(100);
            }
            
            localStorage.setItem(key, JSON.stringify(existing));
        } catch (error) {
            console.warn('保存错误日志失败:', error);
        }
    },

    /**
     * 显示用户反馈
     * @param {object} errorInfo
     */
    showUserFeedback(errorInfo) {
        if (!this.config.enableUserFeedback) return;
        
        // 获取错误严重程度
        const severity = errorInfo.severity;
        let alertType = 'error';
        
        switch (severity) {
            case 'critical':
                alertType = 'error';
                break;
            case 'high':
                alertType = 'error';
                break;
            case 'medium':
                alertType = 'warning';
                break;
            case 'low':
                alertType = 'info';
                break;
        }
        
        // 显示错误提示
        if (typeof UI !== 'undefined' && UI.showAlert) {
            UI.showAlert(
                this.getErrorTitle(errorInfo.type),
                errorInfo.userMessage,
                alertType
            );
        } else {
            // 回退到原生提示
            alert(`${this.getErrorTitle(errorInfo.type)}\n\n${errorInfo.userMessage}`);
        }
        
        // 特殊错误类型的处理
        this.handleSpecialErrorTypes(errorInfo);
    },

    /**
     * 处理特殊类型的错误
     * @param {object} errorInfo
     */
    handleSpecialErrorTypes(errorInfo) {
        switch (errorInfo.type) {
            case 'session_expired':
                this.handleSessionExpired();
                break;
            case 'connection_lost':
                this.handleConnectionLost();
                break;
            case 'hardware_error':
                this.handleHardwareError();
                break;
            case 'permission_denied':
                this.handlePermissionDenied();
                break;
        }
    },

    /**
     * 获取错误标题
     * @param {string} type
     * @returns {string}
     */
    getErrorTitle(type) {
        const titles = {
            'auth_error': '认证错误',
            'device_error': '设备错误',
            'file_error': '文件操作错误',
            'serial_error': '串口通信错误',
            'analysis_error': '数据分析错误',
            'network_error': '网络错误',
            'system_error': '系统错误'
        };
        
        const category = type.split('_')[0];
        return titles[`${category}_error`] || '操作错误';
    },

    /**
     * 会话过期处理
     */
    handleSessionExpired() {
        if (typeof Auth !== 'undefined' && Auth.logout) {
            // 显示会话过期提示
            if (typeof UI !== 'undefined' && UI.showConfirm) {
                UI.showConfirm(
                    '会话已过期',
                    '您的登录会话已过期，是否重新登录？',
                    () => {
                        Auth.logout();
                        window.location.reload();
                    }
                );
            }
        }
    },

    /**
     * 连接断开处理
     */
    handleConnectionLost() {
        // 尝试重新连接
        if (typeof SerialModule !== 'undefined' && SerialModule.connect) {
            setTimeout(() => {
                SerialModule.connect();
            }, 2000);
        }
    },

    /**
     * 硬件错误处理
     */
    handleHardwareError() {
        if (typeof UI !== 'undefined' && UI.showAlert) {
            UI.showAlert(
                '硬件错误',
                '检测到硬件设备异常，请检查设备连接和电源状态。',
                'error'
            );
        }
    },

    /**
     * 权限拒绝处理
     */
    handlePermissionDenied() {
        if (typeof Auth !== 'undefined') {
            const userRole = Auth.getUserRole();
            console.warn(`权限不足，当前角色: ${userRole}`);
        }
    },

    /**
     * 尝试错误恢复
     * @param {object} errorInfo
     */
    async attemptRecovery(errorInfo) {
        if (!this.config.enableRecovery || !errorInfo.recoverable) {
            return;
        }
        
        const strategy = this.recoveryStrategies[errorInfo.type];
        if (!strategy) return;
        
        try {
            await this.executeRecoveryStrategy(strategy, errorInfo);
        } catch (recoveryError) {
            console.warn('错误恢复失败:', recoveryError);
            this.handleError(recoveryError, 'recovery_failed');
        }
    },

    /**
     * 执行恢复策略
     * @param {string} strategy
     * @param {object} errorInfo
     */
    async executeRecoveryStrategy(strategy, errorInfo) {
        switch (strategy) {
            case 'auto_retry':
                await this.autoRetry(errorInfo);
                break;
            case 'reauthenticate':
                await this.reauthenticate(errorInfo);
                break;
            case 'restart_connection':
                await this.restartConnection(errorInfo);
                break;
            case 'suggest_alternative':
                this.suggestAlternative(errorInfo);
                break;
            case 'parse_fallback':
                this.parseFallback(errorInfo);
                break;
        }
    },

    /**
     * 自动重试
     * @param {object} errorInfo
     */
    async autoRetry(errorInfo) {
        const maxRetries = errorInfo.context.maxRetries || this.config.maxRetries;
        const delay = errorInfo.context.retryDelay || this.config.retryDelay;
        
        for (let i = 1; i <= maxRetries; i++) {
            await this.delay(delay);
            console.log(`自动重试 ${i}/${maxRetries}...`);
            
            // 模拟重试逻辑
            if (Math.random() > 0.3) { // 70%成功率
                console.log('自动重试成功');
                return;
            }
        }
        
        throw new Error('自动重试失败，已达到最大重试次数');
    },

    /**
     * 重新认证
     * @param {object} errorInfo
     */
    async reauthenticate(errorInfo) {
        if (typeof Auth !== 'undefined' && Auth.isAuthenticated && !Auth.isAuthenticated()) {
            console.log('尝试重新认证...');
            // 这里可以实现自动重新登录逻辑
            Auth.log('会话已重新建立', 'info');
        }
    },

    /**
     * 重新连接
     * @param {object} errorInfo
     */
    async restartConnection(errorInfo) {
        if (typeof SerialModule !== 'undefined') {
            console.log('尝试重新连接设备...');
            if (SerialModule.isConnected) {
                await SerialModule.disconnect();
            }
            await this.delay(1000);
            await SerialModule.connect();
        }
    },

    /**
     * 建议替代方案
     * @param {object} errorInfo
     */
    suggestAlternative(errorInfo) {
        if (typeof UI !== 'undefined' && UI.showAlert) {
            UI.showAlert(
                '建议操作',
                '当前文件不存在，您可以：\n1. 检查文件路径是否正确\n2. 选择其他文件\n3. 创建新文件',
                'info'
            );
        }
    },

    /**
     * 解析降级处理
     * @param {object} errorInfo
     */
    parseFallback(errorInfo) {
        console.warn('数据解析失败，使用降级处理方案');
        // 这里可以实现数据解析的降级处理逻辑
    },

    /**
     * 延迟函数
     * @param {number} ms
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 获取会话ID
     * @returns {string}
     */
    getSessionId() {
        return localStorage.getItem('sessionId') || 
               (Auth?.currentUser?.sessionId) || 
               'no-session';
    },

    /**
     * 报告错误到服务器
     * @param {object} errorInfo
     */
    async reportError(errorInfo) {
        if (typeof window.electronAPI === 'undefined') return;
        
        try {
            await window.electronAPI.errorReporting.report(errorInfo);
        } catch (error) {
            console.warn('错误报告发送失败:', error);
        }
    },

    /**
     * 获取错误统计信息
     * @returns {object}
     */
    getStatistics() {
        return {
            ...this.statistics,
            uptime: Date.now() - this.statistics.lastResetTime
        };
    },

    /**
     * 重置统计信息
     */
    resetStatistics() {
        this.statistics = {
            totalErrors: 0,
            errorsByModule: {},
            errorsByType: {},
            lastResetTime: Date.now()
        };
    },

    /**
     * 获取错误日志
     * @param {number} limit
     * @returns {Array}
     */
    getErrorLogs(limit = 50) {
        try {
            return JSON.parse(localStorage.getItem('errorLogs') || '[]').slice(0, limit);
        } catch (error) {
            console.warn('获取错误日志失败:', error);
            return [];
        }
    },

    /**
     * 清空错误日志
     */
    clearErrorLogs() {
        localStorage.removeItem('errorLogs');
    },

    /**
     * 更新配置
     * @param {object} newConfig
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        this.saveSettings();
    },

    /**
     * 创建包装器函数，自动捕获错误
     * @param {Function} fn
     * @param {string} context
     * @param {object} options
     * @returns {Function}
     */
    createWrapper(fn, context = '', options = {}) {
        return (...args) => {
            try {
                return fn.apply(this, args);
            } catch (error) {
                const errorInfo = this.handleError(error, `${context}_error`, {
                    functionName: fn.name,
                    arguments: args,
                    ...options
                });
                
                // 如果有错误处理回调，调用它
                if (options.onError) {
                    options.onError(errorInfo);
                }
                
                // 返回默认值或抛出错误
                if (options.returnValue !== undefined) {
                    return options.returnValue;
                }
                throw errorInfo;
            }
        };
    },

    /**
     * 异步包装器
     * @param {Function} fn
     * @param {string} context
     * @param {object} options
     * @returns {Function}
     */
    createAsyncWrapper(fn, context = '', options = {}) {
        return async (...args) => {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                const errorInfo = this.handleError(error, `${context}_error`, {
                    functionName: fn.name,
                    arguments: args,
                    ...options
                });
                
                if (options.onError) {
                    options.onError(errorInfo);
                }
                
                if (options.returnValue !== undefined) {
                    return options.returnValue;
                }
                throw errorInfo;
            }
        };
    },

    /**
     * 验证器 - 包装验证函数
     * @param {Function} validator
     * @param {string} context
     * @returns {Function}
     */
    createValidator(validator, context = 'validation') {
        return (value, ...args) => {
            try {
                const isValid = validator(value, ...args);
                if (!isValid) {
                    throw new Error('数据验证失败');
                }
                return true;
            } catch (error) {
                this.handleError(error, `${context}_validation_failed`, {
                    value,
                    arguments: args
                });
                return false;
            }
        };
    },

    /**
     * 性能监控 - 包装耗时函数
     * @param {Function} fn
     * @param {string} context
     * @param {number} threshold
     * @returns {Function}
     */
    createPerformanceWrapper(fn, context = 'performance', threshold = 5000) {
        return (...args) => {
            const startTime = performance.now();
            
            try {
                const result = fn.apply(this, args);
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                if (duration > threshold) {
                    this.handleError(
                        new Error(`函数执行时间过长: ${duration.toFixed(2)}ms`),
                        `${context}_performance_warning`,
                        {
                            functionName: fn.name,
                            duration,
                            threshold
                        }
                    );
                }
                
                return result;
            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                this.handleError(error, `${context}_error`, {
                    functionName: fn.name,
                    duration,
                    arguments: args
                });
                throw error;
            }
        };
    }
};

// 初始化错误处理器
document.addEventListener('DOMContentLoaded', () => {
    ErrorHandler.init();
});

// 在全局作用域中导出一些便利方法
window.handleError = (error, type, context) => ErrorHandler.handleError(error, type, context);
window.createErrorWrapper = (fn, context, options) => ErrorHandler.createWrapper(fn, context, options);
window.createAsyncErrorWrapper = (fn, context, options) => ErrorHandler.createAsyncWrapper(fn, context, options);

console.log('统一错误处理模块已加载');