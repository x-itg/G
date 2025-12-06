/**
 * 加载状态指示系统使用示例
 * Loading Indicator System Usage Examples
 * 
 * 演示如何在各种场景中使用加载状态指示系统
 */

// 示例1：基本用法
function basicUsageExample() {
    // 显示简单的加载指示器
    window.LoadingIndicator.showSimple();
    
    // 模拟耗时操作
    setTimeout(() => {
        window.LoadingIndicator.hide();
    }, 2000);
}

// 示例2：带进度的加载指示器
function progressUsageExample() {
    const loaderId = window.LoadingIndicator.show({
        message: '正在处理数据...',
        showProgress: true,
        enableCancel: true
    });

    // 模拟进度更新
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        window.LoadingIndicator.updateProgress(loaderId, progress);
        
        if (progress >= 100) {
            clearInterval(interval);
            window.LoadingIndicator.removeLoader(loaderId);
        }
    }, 200);
}

// 示例3：操作特定的加载器
function operationSpecificExample() {
    const loaderId = window.LoadingIndicator.showOperation({
        title: '设备连接',
        message: '正在连接到检测设备...',
        enableCancel: true
    });

    // 模拟设备连接过程
    setTimeout(() => {
        window.LoadingIndicator.updateMessage(loaderId, '正在验证设备...');
    }, 1000);

    setTimeout(() => {
        window.LoadingIndicator.updateMessage(loaderId, '正在初始化设备...');
    }, 2000);

    setTimeout(() => {
        window.LoadingIndicator.removeLoader(loaderId);
        window.Auth.log('设备连接成功', 'success');
    }, 3000);
}

// 示例4：包装异步操作
function wrapAsyncExample() {
    const asyncOperation = async () => {
        // 模拟多个步骤
        window.LoadingIndicator.updateMessage(this.currentLoaderId, '步骤1: 加载配置...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        window.LoadingIndicator.updateMessage(this.currentLoaderId, '步骤2: 处理数据...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        window.LoadingIndicator.updateMessage(this.currentLoaderId, '步骤3: 生成报告...');
        await new Promise(resolve => setTimeout(resolve, 800));

        return '操作完成';
    };

    const wrappedOperation = window.LoadingIndicator.wrap(asyncOperation, {
        message: '执行复杂操作',
        showProgress: true,
        enableCancel: true
    });

    wrappedOperation().then(result => {
        console.log('操作结果:', result);
    }).catch(error => {
        console.error('操作失败:', error);
    });
}

// 示例5：HTTP请求包装
function wrapHttpRequestExample() {
    const fetchWithLoading = window.LoadingIndicator.wrapFetch({
        message: '正在请求数据...',
        showProgress: false,
        enableCancel: false
    });

    fetchWithLoading.fetch('/api/data', {
        method: 'GET'
    }).then(response => {
        return response.json();
    }).then(data => {
        console.log('数据加载成功:', data);
    }).catch(error => {
        console.error('数据加载失败:', error);
    });
}

// 示例6：分析模块集成示例
function analysisIntegrationExample() {
    if (window.AnalysisModule) {
        // 使用现有的分析模块，它已经集成了加载指示器
        window.AnalysisModule.performAnalysis();
    }
}

// 示例7：设备管理集成示例
function deviceIntegrationExample() {
    if (window.DeviceManager) {
        // 使用现有的设备管理，它已经集成了加载指示器
        window.DeviceManager.connectDevice('device-id-123');
    }
}

// 示例8：文件管理集成示例
function fileManagerIntegrationExample() {
    if (window.FileManager) {
        // 使用现有的文件管理，它已经集成了加载指示器
        window.FileManager.generateReport('analysis-id-456');
    }
}

// 示例9：数据处理集成示例
function dataProcessingIntegrationExample() {
    if (window.DataProcessing) {
        // 使用现有的数据处理，它已经集成了加载指示器
        window.DataProcessing.processManualData();
    }
}

// 示例10：高级用法 - 自定义取消处理
function advancedCancellationExample() {
    const loaderId = window.LoadingIndicator.show({
        message: '执行长时间操作...',
        showProgress: true,
        enableCancel: true,
        onCancel: () => {
            // 自定义取消逻辑
            window.Auth.log('用户取消了长时间操作', 'warning');
            
            // 清理资源
            this.cleanupResources();
        }
    });

    // 模拟长时间操作
    let operationCancelled = false;
    
    const longOperation = async () => {
        try {
            for (let i = 0; i <= 100; i += 5) {
                if (operationCancelled) break;
                
                window.LoadingIndicator.updateProgress(loaderId, i, `正在执行步骤 ${i/5}...`);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            if (!operationCancelled) {
                window.LoadingIndicator.removeLoader(loaderId);
                window.Auth.log('长时间操作完成', 'success');
            }
        } catch (error) {
            window.LoadingIndicator.removeLoader(loaderId);
            window.Auth.log(`操作失败: ${error.message}`, 'error');
        }
    };

    // 启动操作
    longOperation();

    // 返回取消函数
    return () => {
        operationCancelled = true;
        window.LoadingIndicator.cancelOperation(loaderId);
    };
}

// 示例11：组合使用多个加载器
function multipleLoadersExample() {
    // 同时显示全局加载器和操作特定加载器
    const globalLoaderId = window.LoadingIndicator.show({
        message: '系统初始化中...',
        showProgress: false,
        enableCancel: false
    });

    const operationLoaderId = window.LoadingIndicator.showOperation({
        title: '数据处理',
        message: '正在处理大量数据...',
        showProgress: true,
        enableCancel: true
    });

    // 模拟操作
    setTimeout(() => {
        window.LoadingIndicator.updateMessage(operationLoaderId, '即将完成...');
    }, 2000);

    setTimeout(() => {
        window.LoadingIndicator.removeLoader(operationLoaderId);
        window.LoadingIndicator.removeLoader(globalLoaderId);
    }, 3000);
}

// 示例12：检测和处理活动加载器
function monitorActiveLoadersExample() {
    // 检查是否有活动的加载器
    if (window.LoadingIndicator.hasActiveLoaders()) {
        console.log('有活动的加载器:', window.LoadingIndicator.getActiveLoaders());
        
        // 获取加载器信息
        window.LoadingIndicator.getActiveLoaders().forEach(loader => {
            console.log(`加载器 ${loader.id}: ${loader.message}, 进度: ${loader.progress}%`);
        });
    } else {
        console.log('当前没有活动的加载器');
    }
}

// 示例13：全局错误处理集成
function errorHandlingIntegrationExample() {
    const wrappedErrorProneOperation = window.LoadingIndicator.wrap(async () => {
        // 模拟可能失败的操作
        const random = Math.random();
        if (random < 0.3) {
            throw new Error('随机错误：操作失败');
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        return '操作成功';
    }, {
        message: '执行可能失败的操作',
        showProgress: true,
        enableCancel: true
    });

    wrappedErrorProneOperation()
        .then(result => {
            console.log('成功:', result);
        })
        .catch(error => {
            console.error('捕获错误:', error.message);
            // 这里可以显示用户友好的错误消息
            if (window.UI) {
                window.UI.showAlert('操作失败', error.message, 'error');
            }
        });
}

// 示例14：性能监控和统计
function performanceMonitoringExample() {
    const startTime = performance.now();
    
    const operation = window.LoadingIndicator.wrap(async () => {
        // 模拟耗时操作
        await new Promise(resolve => setTimeout(resolve, 2000));
        return '操作完成';
    }, {
        message: '性能测试操作',
        showProgress: true
    });

    operation().then(result => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`操作完成，耗时: ${duration.toFixed(2)}ms`);
        console.log('结果:', result);
        
        // 记录性能统计
        if (window.Auth) {
            Auth.log(`性能统计: 操作耗时 ${duration.toFixed(2)}ms`, 'info');
        }
    });
}

// 导出所有示例函数
window.LoadingIndicatorExamples = {
    basicUsage: basicUsageExample,
    progressUsage: progressUsageExample,
    operationSpecific: operationSpecificExample,
    wrapAsync: wrapAsyncExample,
    wrapHttpRequest: wrapHttpRequestExample,
    analysisIntegration: analysisIntegrationExample,
    deviceIntegration: deviceIntegrationExample,
    fileManagerIntegration: fileManagerIntegrationExample,
    dataProcessingIntegration: dataProcessingIntegrationExample,
    advancedCancellation: advancedCancellationExample,
    multipleLoaders: multipleLoadersExample,
    monitorActive: monitorActiveLoadersExample,
    errorHandling: errorHandlingIntegrationExample,
    performanceMonitoring: performanceMonitoringExample
};

// 添加到调试控制台
if (typeof window !== 'undefined') {
    window.debugLoadingExamples = window.LoadingIndicatorExamples;
    console.log('📋 加载指示器使用示例已可用');
    console.log('使用 window.debugLoadingExamples.函数名() 调用示例');
    console.log('例如: window.debugLoadingExamples.basicUsage()');
}