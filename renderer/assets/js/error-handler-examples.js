/**
 * 错误处理系统使用示例
 * 展示如何在各个场景下使用统一错误处理机制
 */

// ===== 示例1: 基础错误处理 =====
function exampleBasicErrorHandling() {
    try {
        // 可能失败的代码
        const result = someRiskyOperation();
        return result;
    } catch (error) {
        // 使用统一错误处理
        const errorInfo = ErrorHandler.handleError(error, 'operation_failed', {
            functionName: 'exampleBasicErrorHandling',
            operation: 'risky_operation',
            timestamp: new Date().toISOString()
        });
        
        // 显示用户友好的错误消息
        UI.showError(errorInfo.userMessage);
        
        // 记录详细错误信息
        console.log('错误详情:', {
            id: errorInfo.id,
            type: errorInfo.type,
            severity: errorInfo.severity,
            module: errorInfo.module
        });
    }
}

// ===== 示例2: 异步错误处理 =====
async function exampleAsyncErrorHandling() {
    try {
        const data = await fetchDataFromAPI();
        return data;
    } catch (error) {
        const errorInfo = ErrorHandler.handleError(error, 'api_fetch_failed', {
            apiEndpoint: '/api/data',
            functionName: 'exampleAsyncErrorHandling',
            userId: Auth?.getCurrentUser()?.id
        });
        
        UI.showError(errorInfo.userMessage);
        return null;
    }
}

// ===== 示例3: 使用包装器函数 =====
class DataManager {
    constructor() {
        // 为所有方法创建错误包装器
        this.loadData = ErrorHandler.createAsyncWrapper(
            this._loadData.bind(this), 
            'data_manager',
            {
                onError: (errorInfo) => {
                    console.log('数据加载错误已处理:', errorInfo.id);
                }
            }
        );
        
        this.saveData = ErrorHandler.createWrapper(
            this._saveData.bind(this),
            'data_manager',
            {
                returnValue: false, // 错误时返回false
                onError: (errorInfo) => {
                    Auth.log(`数据保存失败: ${errorInfo.userMessage}`, 'error');
                }
            }
        );
    }
    
    async _loadData(dataId) {
        // 实际的加载逻辑
        if (!dataId) {
            throw new Error('数据ID不能为空');
        }
        
        const response = await fetch(`/api/data/${dataId}`);
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        return await response.json();
    }
    
    _saveData(data) {
        // 实际的保存逻辑
        if (!data) {
            throw new Error('数据不能为空');
        }
        
        // 模拟保存失败
        if (Math.random() < 0.3) {
            throw new Error('保存操作意外失败');
        }
        
        return true;
    }
}

// ===== 示例4: 设备操作错误处理 =====
class DeviceController {
    async connectDevice(deviceId) {
        try {
            // 检查设备是否存在
            const device = await this.findDevice(deviceId);
            if (!device) {
                throw new Error('设备不存在');
            }
            
            // 尝试连接设备
            const result = await this.performConnection(device);
            
            UI.showSuccess(`设备 "${device.name}" 连接成功`);
            return result;
            
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'device_connection_failed', {
                deviceId: deviceId,
                functionName: 'connectDevice',
                connectionMode: this.isSimulatorMode ? '模拟器' : '硬件'
            });
            
            // 根据错误类型提供不同的用户反馈
            switch (errorInfo.type) {
                case 'device_not_found':
                    UI.showAlert('设备未找到', 
                        '请检查设备是否已正确连接并开启电源。', 
                        'warning');
                    break;
                case 'connection_timeout':
                    UI.showAlert('连接超时', 
                        '设备连接超时，请检查设备状态后重试。', 
                        'error');
                    break;
                default:
                    UI.showError(errorInfo.userMessage);
            }
            
            throw errorInfo; // 重新抛出错误供调用者处理
        }
    }
    
    async findDevice(deviceId) {
        // 模拟设备查找逻辑
        const devices = await DeviceManager.getDevices();
        return devices.find(d => d.id === deviceId);
    }
    
    async performConnection(device) {
        // 模拟设备连接
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() < 0.7) {
                    resolve({ success: true, device });
                } else {
                    reject(new Error('连接超时'));
                }
            }, 2000);
        });
    }
}

// ===== 示例5: 文件操作错误处理 =====
class FileManager {
    async uploadFile(file) {
        try {
            // 验证文件
            this.validateFile(file);
            
            // 上传文件
            const result = await this.performUpload(file);
            
            UI.showSuccess(`文件 "${file.name}" 上传成功`);
            return result;
            
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'file_upload_failed', {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                functionName: 'uploadFile'
            });
            
            // 根据文件大小提供不同建议
            if (file.size > 50 * 1024 * 1024) { // 50MB
                UI.showAlert('文件过大', 
                    '上传文件超过50MB限制，请压缩后重试。', 
                    'warning');
            } else if (errorInfo.type === 'network_error') {
                UI.showAlert('网络错误', 
                    '网络连接不稳定，请检查网络后重试。', 
                    'error');
            } else {
                UI.showError(errorInfo.userMessage);
            }
            
            throw errorInfo;
        }
    }
    
    validateFile(file) {
        if (!file) {
            throw new Error('未选择文件');
        }
        
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('不支持的文件类型');
        }
        
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            throw new Error('文件大小超过限制');
        }
    }
    
    async performUpload(file) {
        // 模拟文件上传
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // 模拟上传过程
                setTimeout(() => {
                    if (Math.random() < 0.8) {
                        resolve({ url: `/uploads/${file.name}`, size: file.size });
                    } else {
                        reject(new Error('上传服务暂时不可用'));
                    }
                }, 3000);
            };
            reader.readAsDataURL(file);
        });
    }
}

// ===== 示例6: 数据分析错误处理 =====
class DataAnalyzer {
    async analyzeData(dataPoints) {
        try {
            // 验证数据
            this.validateDataPoints(dataPoints);
            
            // 执行分析
            const results = await this.performAnalysis(dataPoints);
            
            // 保存结果
            await this.saveAnalysisResults(results);
            
            return results;
            
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'data_analysis_failed', {
                dataPointsCount: dataPoints?.length,
                analysisType: 'statistical_analysis',
                functionName: 'analyzeData'
            });
            
            // 根据数据点数量提供建议
            if (dataPoints.length < 10) {
                UI.showAlert('数据不足', 
                    `当前只有${dataPoints.length}个数据点，建议至少收集10个点进行分析。`, 
                    'warning');
            } else if (errorInfo.type === 'calculation_overflow') {
                UI.showAlert('计算溢出', 
                    '数据值过大导致计算溢出，请检查数据范围。', 
                    'error');
            } else {
                UI.showAlert('分析失败', errorInfo.userMessage, 'error');
            }
            
            throw errorInfo;
        }
    }
    
    validateDataPoints(dataPoints) {
        if (!dataPoints || !Array.isArray(dataPoints)) {
            throw new Error('数据点格式无效');
        }
        
        if (dataPoints.length === 0) {
            throw new Error('没有数据点可供分析');
        }
        
        // 检查数据点格式
        dataPoints.forEach((point, index) => {
            if (typeof point.x !== 'number' || typeof point.y !== 'number') {
                throw new Error(`数据点${index}格式错误`);
            }
        });
    }
    
    async performAnalysis(dataPoints) {
        // 模拟数据分析过程
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() < 0.9) {
                    resolve({
                        mean: this.calculateMean(dataPoints),
                        stdDev: this.calculateStdDev(dataPoints),
                        trend: this.calculateTrend(dataPoints)
                    });
                } else {
                    reject(new Error('计算过程中发生数值溢出'));
                }
            }, 2000);
        });
    }
    
    calculateMean(dataPoints) {
        return dataPoints.reduce((sum, point) => sum + point.y, 0) / dataPoints.length;
    }
    
    calculateStdDev(dataPoints) {
        const mean = this.calculateMean(dataPoints);
        const variance = dataPoints.reduce((sum, point) => sum + Math.pow(point.y - mean, 2), 0) / dataPoints.length;
        return Math.sqrt(variance);
    }
    
    calculateTrend(dataPoints) {
        // 简单的线性趋势计算
        const n = dataPoints.length;
        const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0);
        const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0);
        const sumXY = dataPoints.reduce((sum, point) => sum + point.x * point.y, 0);
        const sumXX = dataPoints.reduce((sum, point) => sum + point.x * point.x, 0);
        
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }
    
    async saveAnalysisResults(results) {
        // 模拟保存结果
        if (Math.random() < 0.95) {
            console.log('分析结果已保存:', results);
        } else {
            throw new Error('数据库连接失败');
        }
    }
}

// ===== 示例7: 用户权限验证 =====
class PermissionManager {
    checkPermission(user, action, resource) {
        try {
            // 验证用户权限
            if (!this.hasPermission(user, action, resource)) {
                throw new Error('用户权限不足');
            }
            
            return true;
            
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'permission_denied', {
                userId: user?.id,
                userRole: user?.role,
                action: action,
                resource: resource,
                functionName: 'checkPermission'
            });
            
            // 记录权限拒绝事件
            Auth.log(`权限拒绝: ${user?.username} 尝试执行 ${action} 操作`, 'warning');
            
            // 显示权限不足提示
            UI.showAlert('权限不足', 
                `您没有权限执行 "${action}" 操作，请联系管理员。`, 
                'warning');
            
            return false;
        }
    }
    
    hasPermission(user, action, resource) {
        if (!user) return false;
        
        const permissions = this.getUserPermissions(user.role);
        return permissions[resource]?.includes(action) || false;
    }
    
    getUserPermissions(role) {
        const permissionMap = {
            'ADMIN': { '*': ['*'] },
            'SUPERVISOR': { 
                'analysis': ['read', 'create', 'update'],
                'devices': ['read', 'update'],
                'reports': ['read', 'create']
            },
            'OPERATOR': {
                'analysis': ['read', 'create_own'],
                'devices': ['read'],
                'reports': ['read_own']
            }
        };
        
        return permissionMap[role] || {};
    }
}

// ===== 示例8: 性能监控 =====
class PerformanceMonitor {
    constructor() {
        this.operations = new Map();
        
        // 为关键操作创建性能监控包装器
        this.complexCalculation = ErrorHandler.createPerformanceWrapper(
            this._complexCalculation.bind(this),
            'performance',
            5000 // 5秒阈值
        );
        
        this.dataProcessing = ErrorHandler.createAsyncPerformanceWrapper(
            this._dataProcessing.bind(this),
            'performance',
            10000 // 10秒阈值
        );
    }
    
    _complexCalculation(data) {
        // 模拟复杂计算
        let result = 0;
        for (let i = 0; i < data.length; i++) {
            result += Math.sqrt(data[i]) * Math.log(data[i] + 1);
        }
        return result;
    }
    
    async _dataProcessing(dataBatch) {
        // 模拟异步数据处理
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(dataBatch.map(item => ({
                    ...item,
                    processed: true,
                    timestamp: new Date().toISOString()
                })));
            }, 2000);
        });
    }
    
    // 创建异步性能包装器
    createAsyncPerformanceWrapper(fn, context, threshold) {
        return ErrorHandler.createAsyncWrapper(async (...args) => {
            const startTime = performance.now();
            try {
                const result = await fn(...args);
                const duration = performance.now() - startTime;
                
                if (duration > threshold) {
                    ErrorHandler.handleError(
                        new Error(`异步操作执行时间过长: ${duration.toFixed(2)}ms`),
                        `${context}_performance_warning`,
                        { duration, threshold, functionName: fn.name }
                    );
                }
                
                return result;
            } catch (error) {
                const duration = performance.now() - startTime;
                ErrorHandler.handleError(error, `${context}_error`, {
                    duration,
                    functionName: fn.name,
                    arguments: args
                });
                throw error;
            }
        }, context);
    }
}

// ===== 示例9: 错误恢复策略 =====
class ErrorRecoveryManager {
    constructor() {
        this.recoveryHandlers = new Map();
        this.setupDefaultRecoveryHandlers();
    }
    
    setupDefaultRecoveryHandlers() {
        // 网络连接错误恢复
        this.recoveryHandlers.set('network_error', async (errorInfo) => {
            console.log('尝试恢复网络连接...');
            
            // 等待一段时间后重试
            await this.delay(2000);
            
            // 检查网络状态
            if (navigator.onLine) {
                console.log('网络连接已恢复');
                return true;
            } else {
                console.log('网络仍然不可用');
                return false;
            }
        });
        
        // 设备连接错误恢复
        this.recoveryHandlers.set('device_connection_failed', async (errorInfo) => {
            console.log('尝试重新连接设备...');
            
            // 断开当前连接
            await SerialModule.disconnect();
            
            // 等待设备稳定
            await this.delay(3000);
            
            // 尝试重新连接
            try {
                await SerialModule.connect();
                console.log('设备重新连接成功');
                return true;
            } catch (error) {
                console.log('设备重新连接失败');
                return false;
            }
        });
        
        // 会话过期恢复
        this.recoveryHandlers.set('session_expired', async (errorInfo) => {
            console.log('尝试重新认证...');
            
            // 检查是否还有效的刷新令牌
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                try {
                    await Auth.refreshSession(refreshToken);
                    console.log('会话刷新成功');
                    return true;
                } catch (error) {
                    console.log('会话刷新失败，需要重新登录');
                    // 显示重新登录对话框
                    UI.showConfirm('会话已过期', '是否重新登录？', () => {
                        Auth.logout();
                        window.location.reload();
                    });
                    return false;
                }
            }
            
            return false;
        });
    }
    
    async attemptRecovery(errorInfo) {
        const handler = this.recoveryHandlers.get(errorInfo.type);
        if (handler) {
            return await handler(errorInfo);
        }
        return false;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ===== 示例10: 全局错误监控 =====
class GlobalErrorMonitor {
    constructor() {
        this.errorCounts = new Map();
        this.errorPatterns = new Map();
        this.setupGlobalErrorHandling();
    }
    
    setupGlobalErrorHandling() {
        // 监听所有错误处理事件
        document.addEventListener('error-handled', (event) => {
            this.onErrorHandled(event.detail);
        });
        
        // 定期检查错误模式
        setInterval(() => {
            this.analyzeErrorPatterns();
        }, 60000); // 每分钟分析一次
    }
    
    onErrorHandled(errorInfo) {
        // 统计错误频率
        const count = this.errorCounts.get(errorInfo.type) || 0;
        this.errorCounts.set(errorInfo.type, count + 1);
        
        // 分析错误模式
        this.analyzeErrorPattern(errorInfo);
        
        // 检查是否需要警告
        if (count > 10) {
            this.checkErrorThreshold(errorInfo);
        }
    }
    
    analyzeErrorPattern(errorInfo) {
        const patterns = this.errorPatterns.get(errorInfo.type) || [];
        patterns.push({
            timestamp: errorInfo.timestamp,
            module: errorInfo.module,
            severity: errorInfo.severity
        });
        
        // 只保留最近的100个模式
        if (patterns.length > 100) {
            patterns.shift();
        }
        
        this.errorPatterns.set(errorInfo.type, patterns);
    }
    
    analyzeErrorPatterns() {
        for (const [errorType, count] of this.errorCounts) {
            if (count > 20) {
                console.warn(`高频错误警告: ${errorType} 在最近发生了 ${count} 次`);
                
                // 发送错误统计报告
                this.generateErrorReport(errorType, count);
            }
        }
    }
    
    generateErrorReport(errorType, count) {
        const report = {
            errorType,
            count,
            timestamp: new Date().toISOString(),
            affectedModules: this.getAffectedModules(errorType),
            recommendations: this.getRecommendations(errorType)
        };
        
        console.log('错误统计报告:', report);
        
        // 在生产环境中，可以发送到监控服务
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.logger.logErrorReport(report);
        }
    }
    
    getAffectedModules(errorType) {
        const patterns = this.errorPatterns.get(errorType) || [];
        const modules = new Set(patterns.map(p => p.module));
        return Array.from(modules);
    }
    
    getRecommendations(errorType) {
        const recommendations = {
            'network_error': [
                '检查网络连接状态',
                '确认API服务器可用性',
                '考虑实现离线模式'
            ],
            'device_connection_failed': [
                '检查设备电源和连接线',
                '确认设备驱动程序正常',
                '尝试重启设备'
            ],
            'permission_denied': [
                '检查用户权限配置',
                '确认用户角色分配',
                '考虑实现权限申请流程'
            ]
        };
        
        return recommendations[errorType] || ['请联系技术支持'];
    }
    
    checkErrorThreshold(errorInfo) {
        // 检查是否超过错误阈值
        if (errorInfo.severity === 'critical') {
            UI.showAlert('系统错误警告', 
                '检测到频繁的系统错误，请立即检查系统状态。', 
                'error');
        } else if (errorInfo.severity === 'high') {
            UI.showAlert('错误频率警告', 
                '检测到较高的错误频率，建议检查系统配置。', 
                'warning');
        }
    }
}

// ===== 导出示例类 =====
window.ErrorHandlerExamples = {
    DataManager,
    DeviceController,
    FileManager,
    DataAnalyzer,
    PermissionManager,
    PerformanceMonitor,
    ErrorRecoveryManager,
    GlobalErrorMonitor
};

// ===== 使用示例 =====
// 在实际应用中，你可以这样使用：

// 1. 创建数据管理器
// const dataManager = new DataManager();
// await dataManager.loadData('data-id');

// 2. 创建设备控制器
// const deviceController = new DeviceController();
// await deviceController.connectDevice('device-123');

// 3. 创建文件管理器
// const fileManager = new FileManager();
// await fileManager.uploadFile(selectedFile);

// 4. 创建数据分析器
// const analyzer = new DataAnalyzer();
// await analyzer.analyzeData(dataPoints);

// 5. 创建权限管理器
// const permissionManager = new PermissionManager();
// if (permissionManager.checkPermission(currentUser, 'delete', 'analysis')) {
//     // 执行删除操作
// }

// 6. 启动全局错误监控
// const errorMonitor = new GlobalErrorMonitor();

// 7. 配置错误恢复
// const recoveryManager = new ErrorRecoveryManager();

console.log('错误处理系统使用示例已加载');