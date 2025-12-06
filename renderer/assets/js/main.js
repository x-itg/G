// 主入口文件 - 应用程序启动和协调
window.MainApp = {
    isInitialized: false,
    modules: {},
    startupTime: null,

    // 应用程序初始化
    async init() {
        try {
            this.startupTime = Date.now();
            console.log('🚀 放射检测仪 CFR 21 Part 11 合规系统启动中...');

            // 显示启动加载界面
            this.showStartupScreen();

            // 按顺序初始化模块
            await this.initializeModules();

            // 设置模块间通信
            this.setupModuleCommunication();

            // 初始化界面状态
            this.initializeUIState();

            // 设置全局事件处理
            this.setupGlobalEventHandlers();

            // 隐藏启动界面，显示登录界面
            this.hideStartupScreen();

            this.isInitialized = true;
            const initTime = Date.now() - this.startupTime;
            
            console.log(`✅ 系统初始化完成，耗时 ${initTime}ms`);
            Auth.log('系统启动完成', 'success');

        } catch (error) {
            console.error('❌ 系统初始化失败:', error);
            this.showInitializationError(error);
        }
    },

    // 显示启动屏幕
    showStartupScreen() {
        const startupHTML = `
            <div id="startup-screen" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                color: white;
            ">
                <div style="text-align: center;">
                    <h1 style="font-size: 2.5em; margin-bottom: 20px; font-weight: 300;">放射检测仪</h1>
                    <p style="font-size: 1.2em; margin-bottom: 10px; opacity: 0.9;">CFR 21 Part 11 合规系统</p>
                    <p style="font-size: 1em; margin-bottom: 30px; opacity: 0.7;">版本 1.0.0</p>
                    <div class="spinner" style="
                        width: 50px;
                        height: 50px;
                        border: 4px solid rgba(255,255,255,0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <p id="startup-status" style="font-size: 0.9em; opacity: 0.8;">正在初始化系统...</p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', startupHTML);
    },

    // 更新启动状态
    updateStartupStatus(message) {
        const statusElement = document.getElementById('startup-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    },

    // 隐藏启动屏幕
    hideStartupScreen() {
        const startupScreen = document.getElementById('startup-screen');
        if (startupScreen) {
            startupScreen.style.opacity = '0';
            startupScreen.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => {
                startupScreen.remove();
            }, 500);
        }
    },

    // 显示初始化错误
    showInitializationError(error) {
        const errorHTML = `
            <div id="error-screen" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #dc3545;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                color: white;
            ">
                <div style="text-align: center; max-width: 500px; padding: 20px;">
                    <h2 style="margin-bottom: 20px;">❌ 系统初始化失败</h2>
                    <p style="margin-bottom: 20px; opacity: 0.9;">${error.message}</p>
                    <button onclick="location.reload()" style="
                        padding: 10px 20px;
                        background: white;
                        color: #dc3545;
                        border: none;
                        border-radius: 5px;
                        font-weight: bold;
                        cursor: pointer;
                    ">重新启动</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorHTML);
    },

    // 初始化所有模块
    async initializeModules() {
        const moduleOrder = [
            { name: 'Utils', module: window.Utils, critical: true },
            { name: 'UI', module: window.UI, critical: true },
            { name: 'LoadingIndicator', module: window.LoadingIndicator, critical: true },
            { name: 'FileManager', module: window.FileManager, critical: false },
            { name: 'DeviceManager', module: window.DeviceManager, critical: false },
            { name: 'Auth', module: window.Auth, critical: true },
            { name: 'SerialModule', module: window.SerialModule, critical: true },
            { name: 'ChartModule', module: window.ChartModule, critical: false },
            { name: 'AnalysisModule', module: window.AnalysisModule, critical: true },
            { name: 'SystemSettingsManager', module: window.systemSettingsManager, critical: false },
            { name: 'DetectionLogs', module: window.DetectionLogs, critical: false },
            { name: 'ReportExporter', module: window.ReportExporter, critical: false },
            { name: 'ProbeControl', module: window.ProbeControl, critical: false },
            { name: 'DataProcessing', module: window.DataProcessing, critical: false }
        ];

        for (const { name, module, critical } of moduleOrder) {
            try {
                this.updateStartupStatus(`初始化 ${name} 模块...`);
                
                // 详细检查模块状态
                console.log(`检查 ${name} 模块:`, {
                    moduleExists: !!module,
                    moduleType: typeof module,
                    hasInit: module && typeof module.init,
                    isFunction: module && typeof module.init === 'function'
                });
                
                if (module && typeof module.init === 'function') {
                    await module.init();
                    this.modules[name] = module;
                    console.log(`✅ ${name} 模块初始化完成`);
                } else {
                    const errorMsg = `${name} 模块未找到或缺少 init 方法`;
                    console.error(`❌ ${errorMsg}:`, {
                        module: module,
                        hasInit: module && typeof module.init,
                        windowKeys: Object.keys(window).filter(key => key.toLowerCase().includes(name.toLowerCase()))
                    });
                    throw new Error(errorMsg);
                }
            } catch (error) {
                console.error(`❌ ${name} 模块初始化失败:`, error);
                console.error(`详细错误信息:`, {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    module: module
                });
                if (critical) {
                    throw new Error(`关键模块 ${name} 初始化失败: ${error.message}`);
                }
            }
        }
    },

    // 设置模块间通信
    setupModuleCommunication() {
        // 数据流: 串口 -> 分析 -> 图表
        document.addEventListener('serialDataReceived', (event) => {
            if (this.modules.AnalysisModule) {
                this.modules.AnalysisModule.handleSerialData(event.detail);
            }
        });

        document.addEventListener('dataPointAdded', (event) => {
            if (this.modules.ChartModule) {
                const data = event.detail;
                this.modules.ChartModule.addDataPoint(data.position, data.countRate);
            }
        });

        // 分析完成事件
        document.addEventListener('analysisCompleted', (event) => {
            if (this.modules.Auth) {
                this.modules.Auth.log('分析完成事件触发', 'info');
            }
        });

        // 认证状态变化
        document.addEventListener('loginSuccess', (event) => {
            this.updateUIForAuthenticatedUser(event.detail);
        });

        document.addEventListener('logout', () => {
            this.updateUIForLoggedOutUser();
        });

        console.log('✅ 模块间通信已建立');
    },

    // 初始化UI状态
    initializeUIState() {
        // 设置默认界面状态
        this.updateConnectionStatus();
        this.updateAnalysisButtons();
        this.loadSavedPreferences();

        // 应用保存的主题
        if (this.modules.UI) {
            this.modules.UI.applySavedTheme();
        }

        console.log('✅ UI状态已初始化');
    },

    // 设置全局事件处理器
    setupGlobalEventHandlers() {
        // 全局错误处理
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            if (this.modules.Auth) {
                this.modules.Auth.log(`系统错误: ${event.error.message}`, 'error');
            }
        });

        // 未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            if (this.modules.Auth) {
                this.modules.Auth.log(`异步错误: ${event.reason}`, 'error');
            }
        });

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('页面隐藏');
                this.handlePageHidden();
            } else {
                console.log('页面显示');
                this.handlePageVisible();
            }
        });

        // 窗口大小变化
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleWindowResize();
        }, 250));

        console.log('✅ 全局事件处理器已设置');
    },

    // 更新连接状态显示
    updateConnectionStatus() {
        if (this.modules.SerialModule && typeof this.modules.SerialModule.getConnectionStatus === 'function') {
            try {
                const status = this.modules.SerialModule.getConnectionStatus();
                const statusElement = document.getElementById('connection-status');
                
                if (statusElement) {
                    if (status && status.isConnected) {
                        statusElement.textContent = '已连接';
                        statusElement.className = 'connection-status connected';
                    } else {
                        statusElement.textContent = '未连接';
                        statusElement.className = 'connection-status disconnected';
                    }
                }
            } catch (error) {
                console.warn('⚠️ 获取连接状态失败:', error);
            }
        }
    },

    // 更新分析按钮状态
    updateAnalysisButtons() {
        if (this.modules.AnalysisModule) {
            const analyzeBtn = document.getElementById('analyze-btn');
            if (analyzeBtn) {
                analyzeBtn.disabled = true; // 初始状态禁用，需要数据后才能分析
            }
        }
    },

    // 加载保存的首选项
    loadSavedPreferences() {
        try {
            const preferences = localStorage.getItem('appPreferences');
            if (preferences) {
                const prefs = JSON.parse(preferences);
                
                // 应用主题
                if (prefs.theme) {
                    document.body.className = prefs.theme;
                }
                
                // 应用串口配置
                if (prefs.serialConfig && this.modules.SerialModule) {
                    this.modules.SerialModule.loadSavedConfiguration();
                }
            }
        } catch (error) {
            console.error('加载首选项失败:', error);
        }
    },

    // 保存首选项
    savePreferences() {
        try {
            const preferences = {
                theme: this.modules.UI?.getCurrentTheme() || 'light-theme',
                serialConfig: this.modules.SerialModule?.currentConfig || null,
                timestamp: Date.now()
            };
            
            localStorage.setItem('appPreferences', JSON.stringify(preferences));
        } catch (error) {
            console.error('保存首选项失败:', error);
        }
    },

    // 更新已认证用户的UI
    updateUIForAuthenticatedUser(user) {
        // 更新用户信息显示
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.textContent = `${user.fullName} (${user.role})`;
        }

        // 根据权限更新UI
        this.updateUIBasedOnPermissions(user.role);

        // 启用分析相关功能
        this.updateAnalysisButtons();
    },

    // 更新已登出用户的UI
    updateUIForLoggedOutUser() {
        // 清除用户信息
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.textContent = '';
        }

        // 重置UI到初始状态
        this.updateAnalysisButtons();
        this.updateConnectionStatus();
    },

    // 根据权限更新UI
    updateUIBasedOnPermissions(role) {
        const permissions = this.modules.Auth?.getPermissions(role) || {};
        
        // 控制菜单项可见性
        const restrictedMenus = {
            'user-management': permissions.users?.includes('read'),
            'audit-log': permissions.audit?.includes('read'),
            'device-management': permissions.devices?.includes('read'),
            'system-validation': permissions.system?.includes('validate')
        };

        Object.entries(restrictedMenus).forEach(([menuId, hasAccess]) => {
            const menuElement = document.getElementById(menuId);
            if (menuElement) {
                menuElement.style.display = hasAccess ? 'block' : 'none';
            }
        });
    },

    // 处理页面隐藏
    handlePageHidden() {
        // 暂停数据采集
        if (this.modules.SerialModule?.measurementActive) {
            this.modules.SerialModule.stopMeasurement();
        }

        // 保存状态
        this.savePreferences();
    },

    // 处理页面显示
    handlePageVisible() {
        // 恢复数据采集
        // 注意：这里不自动恢复，需要用户手动操作
        
        // 刷新状态
        this.updateConnectionStatus();
        this.updateAnalysisButtons();
    },

    // 处理窗口大小变化
    handleWindowResize() {
        // 重新计算图表尺寸
        if (this.modules.ChartModule?.chart) {
            this.modules.ChartModule.chart.resize();
        }
    },

    // 获取系统信息
    getSystemInfo() {
        return {
            version: '1.0.0',
            compliance: 'CFR 21 Part 11',
            modules: Object.keys(this.modules),
            uptime: this.startupTime ? Date.now() - this.startupTime : 0,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookiesEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine
        };
    },

    // 执行系统验证
    async performSystemValidation() {
        try {
            console.log('开始系统验证...');
            
            const validationResults = {
                timestamp: new Date().toISOString(),
                modules: {},
                database: null,
                serial: null,
                permissions: null,
                overall: 'PASS'
            };

            // 验证模块状态
            for (const [name, module] of Object.entries(this.modules)) {
                try {
                    if (typeof module.getSystemInfo === 'function') {
                        validationResults.modules[name] = await module.getSystemInfo();
                    } else {
                        validationResults.modules[name] = { status: 'OK', hasInit: true };
                    }
                } catch (error) {
                    validationResults.modules[name] = { status: 'ERROR', error: error.message };
                    validationResults.overall = 'FAIL';
                }
            }

            // 验证串口连接
            if (this.modules.SerialModule) {
                const serialStatus = this.modules.SerialModule.getConnectionStatus();
                validationResults.serial = {
                    status: serialStatus.isConnected ? 'CONNECTED' : 'DISCONNECTED',
                    config: serialStatus.config
                };
            }

            // 验证权限系统
            if (this.modules.Auth && this.modules.Auth.isAuthenticated()) {
                const user = this.modules.Auth.getCurrentUser();
                validationResults.permissions = {
                    status: 'AUTHENTICATED',
                    user: {
                        id: user.id,
                        role: user.role,
                        username: user.username
                    },
                    permissions: this.modules.Auth.getPermissions(user.role)
                };
            } else {
                validationResults.permissions = { status: 'NOT_AUTHENTICATED' };
            }

            console.log('系统验证完成:', validationResults);
            return validationResults;

        } catch (error) {
            console.error('系统验证失败:', error);
            throw error;
        }
    },

    // 显示系统信息
    showSystemInfo() {
        const info = this.getSystemInfo();
        const validation = this.performSystemValidation();
        
        UI.showModal({
            title: '系统信息',
            content: `
                <div class="system-info">
                    <h4>系统信息</h4>
                    <p><strong>版本:</strong> ${info.version}</p>
                    <p><strong>合规标准:</strong> ${info.compliance}</p>
                    <p><strong>运行时间:</strong> ${Utils.formatDuration(info.uptime / 1000)}</p>
                    <p><strong>平台:</strong> ${info.platform}</p>
                    <p><strong>语言:</strong> ${info.language}</p>
                    
                    <h4>已加载模块</h4>
                    <ul>
                        ${info.modules.map(module => `<li>${module}</li>`).join('')}
                    </ul>
                </div>
            `,
            showConfirmButton: false,
            size: 'large'
        });
    },

    // 导出系统配置
    exportSystemConfig() {
        const config = {
            systemInfo: this.getSystemInfo(),
            preferences: JSON.parse(localStorage.getItem('appPreferences') || '{}'),
            timestamp: new Date().toISOString()
        };

        const filename = `system_config_${Utils.formatDate(new Date(), 'YYYYMMDD_HHmmss')}`;
        Utils.file.downloadJSON(config, `${filename}.json`);
        
        if (this.modules.Auth) {
            this.modules.Auth.log('系统配置已导出', 'success');
        }
    },

    // 应用程序关闭处理
    async shutdown() {
        console.log('正在关闭应用程序...');
        
        try {
            // 停止数据采集
            if (this.modules.SerialModule?.measurementActive) {
                await this.modules.SerialModule.stopMeasurement();
            }

            // 断开串口连接
            if (this.modules.SerialModule?.isConnected) {
                await this.modules.SerialModule.disconnect();
            }

            // 保存首选项
            this.savePreferences();

            // 记录关闭事件
            if (this.modules.Auth) {
                this.modules.Auth.log('应用程序正常关闭', 'info');
            }

            console.log('✅ 应用程序已关闭');
        } catch (error) {
            console.error('关闭应用程序时出错:', error);
        }
    }
};

// 全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
});

// 未处理的Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
});

// 页面加载完成后启动应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM已加载，开始启动应用程序...');
    
    // 延迟一点时间确保所有脚本都已加载
    setTimeout(() => {
        MainApp.init();
    }, 100);
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', (event) => {
    MainApp.shutdown();
});

// 导出到全局作用域
window.MainApp = MainApp;

console.log('主应用程序模块已加载');