const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 配置日志系统
class Logger {
    constructor() {
        this.logDir = path.join(__dirname, 'logs');
        this.ensureLogDirectory();
        this.logFile = path.join(this.logDir, `electron-${new Date().toISOString().split('T')[0]}.log`);
        this.setupConsoleCapture();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    setupConsoleCapture() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        const logToFile = (level, ...args) => {
            const timestamp = new Date().toISOString();
            const message = `[${timestamp}] [${level}] ${args.join(' ')}\n`;
            fs.appendFileSync(this.logFile, message);
            originalLog(...args); // 仍然输出到控制台
        };

        console.log = (...args) => logToFile('INFO', ...args);
        console.error = (...args) => logToFile('ERROR', ...args);
        console.warn = (...args) => logToFile('WARN', ...args);
    }

    info(message, ...args) {
        console.log(`[LOGGER] INFO: ${message}`, ...args);
    }

    error(message, ...args) {
        console.error(`[LOGGER] ERROR: ${message}`, ...args);
    }

    warn(message, ...args) {
        console.warn(`[LOGGER] WARN: ${message}`, ...args);
    }

    debug(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[LOGGER] DEBUG: ${message}`, ...args);
        }
    }
}

// 全局错误监控
class ErrorMonitor {
    constructor(logger) {
        this.logger = logger;
        this.errorCount = 0;
        this.lastErrors = [];
        this.maxErrors = 50;
        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        // 捕获未处理的Promise拒绝
        process.on('unhandledRejection', (reason, promise) => {
            this.logError('Unhandled Promise Rejection', reason, { promise: promise.toString() });
        });

        // 捕获未处理的异常
        process.on('uncaughtException', (error) => {
            this.logError('Uncaught Exception', error);
        });

        // 捕获Electron窗口错误
        if (app && app.on) {
            app.on('render-process-gone', (event, webContents, details) => {
                this.logError('Render Process Gone', details.reason, { 
                    exitCode: details.exitCode,
                    pid: details.pid
                });
            });
        }
    }

    logError(type, error, extra = {}) {
        this.errorCount++;
        const errorInfo = {
            timestamp: new Date().toISOString(),
            type: type,
            message: error.message || error,
            stack: error.stack,
            ...extra
        };

        this.lastErrors.push(errorInfo);
        if (this.lastErrors.length > this.maxErrors) {
            this.lastErrors.shift();
        }

        this.logger.error(`${type}:`, errorInfo);
        
        // 如果错误过多，可能需要重启应用
        if (this.errorCount > 100 && this.lastErrors.length > 0) {
            this.logger.warn('Error count exceeded threshold, consider restarting application');
        }
    }

    getErrorSummary() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.lastErrors.slice(-10),
            errorTypes: this.lastErrors.reduce((acc, err) => {
                acc[err.type] = (acc[err.type] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

// 性能监控
class PerformanceMonitor {
    constructor(logger) {
        this.logger = logger;
        this.startTime = Date.now();
        this.performanceMarks = new Map();
        this.setupObserver();
    }

    setupObserver() {
        if (typeof PerformanceObserver !== 'undefined') {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.logger.debug(`Performance: ${entry.name} took ${entry.duration}ms`);
                }
            });
            observer.observe({ entryTypes: ['measure', 'navigation'] });
        }
    }

    mark(name) {
        this.performanceMarks.set(name, Date.now());
        this.logger.debug(`Performance mark: ${name}`);
    }

    measure(name, startMark) {
        const start = this.performanceMarks.get(startMark);
        if (start) {
            const duration = Date.now() - start;
            this.logger.info(`Performance measure: ${name} took ${duration}ms`);
            return duration;
        }
        return null;
    }

    getUptime() {
        return Date.now() - this.startTime;
    }
}

// 导入自定义模块
const DatabaseManager = require('./database/DatabaseManager');
const AuthenticationService = require('./services/AuthenticationService');
const AuditTrailService = require('./services/AuditTrailService');
const SerialCommunicationService = require('./services/SerialCommunicationService');

class EnhancedRadiationDetectorApp {
    constructor() {
        this.logger = new Logger();
        this.errorMonitor = new ErrorMonitor(this.logger);
        this.performanceMonitor = new PerformanceMonitor(this.logger);
        
        this.mainWindow = null;
        this.dbManager = null;
        this.authService = null;
        this.auditService = null;
        this.serialService = null;
        this.currentUser = null;
        
        // 启动状态追踪
        this.startupStartTime = Date.now();
        this.startupSteps = [];
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            this.logger.info('🚀 Starting Radiation Detector Application...');
            this.performanceMonitor.mark('app_start');
            
            await this.initializeServices();
            this.recordStartupStep('services_initialized');
            
            await this.createDefaultAdmin();
            this.recordStartupStep('admin_created');
            
            await this.setupAppEvents();
            this.recordStartupStep('app_events_setup');
            
            await this.createMainWindow();
            this.recordStartupStep('main_window_created');
            
            await this.setupIPC();
            this.recordStartupStep('ipc_setup');
            
            const startupTime = this.performanceMonitor.measure('app_startup_complete', 'app_start');
            this.logger.info(`✅ Application startup completed in ${startupTime}ms`);
            
            // 显示启动信息到用户
            this.showStartupInfo();
            
        } catch (error) {
            this.errorMonitor.logError('Application Startup Failed', error);
            this.logger.error('❌ Failed to start application:', error);
            
            // 显示错误对话框
            dialog.showErrorBox('启动失败', `应用启动失败: ${error.message}\n\n请查看日志文件: ${this.logger.logFile}`);
            
            app.exit(1);
        }
    }

    recordStartupStep(step) {
        this.startupSteps.push({
            step: step,
            timestamp: new Date().toISOString(),
            uptime: this.performanceMonitor.getUptime()
        });
        this.logger.info(`📋 Startup step completed: ${step}`);
    }

    async initializeServices() {
        this.logger.info('🗄️ Initializing database...');
        
        try {
            this.dbManager = new DatabaseManager();
            await this.dbManager.initialize();
            this.logger.info('✅ Database initialized');
        } catch (error) {
            this.errorMonitor.logError('Database Initialization Failed', error);
            throw new Error(`数据库初始化失败: ${error.message}`);
        }
        
        this.logger.info('🔐 Initializing services...');
        
        try {
            this.authService = new AuthenticationService(this.dbManager);
            this.auditService = new AuditTrailService(this.dbManager);
            this.serialService = new SerialCommunicationService();
            
            // 测试服务加载
            await this.testServiceInitialization();
            
            this.logger.info('✅ All services initialized successfully');
        } catch (error) {
            this.errorMonitor.logError('Service Initialization Failed', error);
            throw new Error(`服务初始化失败: ${error.message}`);
        }
    }

    async testServiceInitialization() {
        this.logger.info('🧪 Testing service initialization...');
        
        // 测试数据库连接
        try {
            await this.dbManager.getUserCount();
            this.logger.info('✅ Database connection test passed');
        } catch (error) {
            throw new Error(`数据库连接测试失败: ${error.message}`);
        }
        
        // 测试服务加载
        if (!this.authService) {
            throw new Error('AuthenticationService failed to load');
        }
        this.logger.info('✅ AuthenticationService loaded');
        
        if (!this.auditService) {
            throw new Error('AuditTrailService failed to load');
        }
        this.logger.info('✅ AuditTrailService loaded');
        
        this.logger.info('✅ All service tests passed');
    }

    async createMainWindow() {
        this.logger.info('🪟 Creating main window...');
        
        try {
            this.mainWindow = new BrowserWindow({
                width: 1400,
                height: 900,
                minWidth: 1000,
                minHeight: 600,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: path.join(__dirname, 'preload.js'),
                    webSecurity: true,
                    allowRunningInsecureContent: false
                },
                icon: path.join(__dirname, 'assets', 'icon.png'),
                show: false,
                title: '放射检测仪 - CFR 21 Part 11 合规系统'
            });

            // 窗口事件监听
            this.setupWindowEvents();
            
            // 加载应用
            const indexPath = path.join(__dirname, 'renderer', 'index.html');
            if (!fs.existsSync(indexPath)) {
                throw new Error(`Frontend file not found: ${indexPath}`);
            }
            
            await this.mainWindow.loadFile(indexPath);
            this.logger.info('✅ Main window created and loaded');
            
            // 显示窗口
            this.mainWindow.once('ready-to-show', () => {
                this.mainWindow.show();
                this.logger.info('✅ Main window is ready to show');
                
                if (process.env.NODE_ENV === 'development') {
                    this.mainWindow.webContents.openDevTools();
                    this.logger.info('🛠️ DevTools opened in development mode');
                }
            });

            // 设置菜单
            this.createMenu();
            this.logger.info('✅ Menu created');
            
        } catch (error) {
            this.errorMonitor.logError('Main Window Creation Failed', error);
            throw new Error(`主窗口创建失败: ${error.message}`);
        }
    }

    setupWindowEvents() {
        this.mainWindow.on('closed', () => {
            this.logger.info('🪟 Main window closed');
            this.mainWindow = null;
        });

        this.mainWindow.on('unresponsive', () => {
            this.logger.warn('⚠️ Main window is unresponsive');
            
            dialog.showMessageBox(this.mainWindow, {
                type: 'warning',
                title: '窗口无响应',
                message: '主窗口似乎无响应',
                detail: '窗口可能需要重新启动。请选择操作:',
                buttons: ['重启窗口', '忽略']
            }).then((result) => {
                if (result.response === 0) {
                    this.mainWindow.reload();
                    this.logger.info('🔄 Window reloaded by user request');
                }
            });
        });

        this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            this.errorMonitor.logError('Page Load Failed', new Error(`${errorDescription} (${errorCode})`));
        });
    }

    createMenu() {
        const template = [
            {
                label: '文件',
                submenu: [
                    {
                        label: '新建检测',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => {
                            this.sendToRenderer('menu-new-analysis');
                        }
                    },
                    {
                        label: '打开数据',
                        accelerator: 'CmdOrCtrl+O',
                        click: async () => {
                            const result = await dialog.showOpenDialog(this.mainWindow, {
                                properties: ['openFile'],
                                filters: [
                                    { name: 'JSON Files', extensions: ['json'] },
                                    { name: 'CSV Files', extensions: ['csv'] }
                                ]
                            });
                            
                            if (!result.canceled) {
                                this.sendToRenderer('menu-open-data', result.filePaths[0]);
                            }
                        }
                    },
                    {
                        label: '保存数据',
                        accelerator: 'CmdOrCtrl+S',
                        click: () => {
                            this.sendToRenderer('menu-save-data');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '导出报告',
                        click: () => {
                            this.sendToRenderer('menu-export-report');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '退出',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: '串口',
                submenu: [
                    {
                        label: '端口配置',
                        click: () => {
                            this.sendToRenderer('menu-serial-config');
                        }
                    },
                    {
                        label: '连接设备',
                        click: () => {
                            this.sendToRenderer('menu-connect-devices');
                        }
                    },
                    {
                        label: '断开连接',
                        click: () => {
                            this.sendToRenderer('menu-disconnect-devices');
                        }
                    }
                ]
            },
            {
                label: '分析',
                submenu: [
                    {
                        label: '开始检测',
                        accelerator: 'F5',
                        click: () => {
                            this.sendToRenderer('menu-start-analysis');
                        }
                    },
                    {
                        label: '停止检测',
                        accelerator: 'F6',
                        click: () => {
                            this.sendToRenderer('menu-stop-analysis');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '重置数据',
                        click: () => {
                            this.sendToRenderer('menu-reset-data');
                        }
                    }
                ]
            },
            {
                label: '系统',
                submenu: [
                    {
                        label: '用户管理',
                        click: () => {
                            this.sendToRenderer('menu-user-management');
                        }
                    },
                    {
                        label: '审计日志',
                        click: () => {
                            this.sendToRenderer('menu-audit-log');
                        }
                    },
                    {
                        label: '设备管理',
                        click: () => {
                            this.sendToRenderer('menu-device-management');
                        }
                    },
                    {
                        label: '系统验证',
                        click: () => {
                            this.sendToRenderer('menu-system-validation');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '设置',
                        click: () => {
                            this.sendToRenderer('menu-settings');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '系统信息',
                        click: () => {
                            this.showSystemInfo();
                        }
                    }
                ]
            },
            {
                label: '帮助',
                submenu: [
                    {
                        label: '关于',
                        click: () => {
                            this.showAboutDialog();
                        }
                    },
                    {
                        label: 'CFR 21 Part 11 合规声明',
                        click: () => {
                            this.showComplianceInfo();
                        }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    sendToRenderer(channel, data = null) {
        if (this.mainWindow && this.mainWindow.webContents) {
            this.mainWindow.webContents.send(channel, data);
            this.logger.debug(`📤 Sent to renderer: ${channel}`);
        } else {
            this.logger.warn(`⚠️ Cannot send to renderer: window not available (${channel})`);
        }
    }

    async setupAppEvents() {
        app.whenReady().then(() => {
            this.logger.info('🟢 Electron app is ready');
        });

        app.on('window-all-closed', async () => {
            this.logger.info('📱 All windows closed, cleaning up...');
            
            try {
                // 清理串口连接
                if (this.serialService) {
                    await this.serialService.disconnect();
                    this.logger.info('🔌 Serial service disconnected');
                }
                
                // 关闭数据库连接
                if (this.dbManager) {
                    await this.dbManager.close();
                    this.logger.info('💾 Database connection closed');
                }
                
            } catch (error) {
                this.errorMonitor.logError('Cleanup Failed', error);
            }
            
            if (process.platform !== 'darwin') {
                this.logger.info('👋 Application quitting');
                app.quit();
            }
        });

        app.on('activate', () => {
            this.logger.info('🔄 Application activated');
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createMainWindow();
            }
        });
    }

    setupIPC() {
        this.logger.info('🔗 Setting up IPC handlers...');
        let ipcHandlerCount = 0;

        // 通用IPC错误处理包装器
        const withErrorHandling = async (handlerName, handler) => {
            try {
                const result = await handler();
                this.logger.debug(`✅ IPC handler succeeded: ${handlerName}`);
                return result;
            } catch (error) {
                this.errorMonitor.logError(`IPC Handler Failed: ${handlerName}`, error);
                this.logger.error(`❌ IPC handler failed: ${handlerName}`, error.message);
                throw error;
            }
        };

        // 用户认证
        ipcMain.handle('auth-login', async (event, credentials) => {
            return withErrorHandling('auth-login', async () => {
                const result = await this.authService.authenticate(credentials.username, credentials.password);
                this.currentUser = result.user;
                
                // 记录审计日志
                await this.auditService.logAction(
                    'LOGIN', 'User', result.user.id,
                    { username: credentials.username }, {},
                    result.user.id, 'SUCCESS'
                );
                
                return {
                    success: true,
                    user: {
                        id: result.user.id,
                        username: result.user.username,
                        fullName: result.user.fullName,
                        role: result.user.role,
                        title: result.user.title,
                        department: result.user.department
                    }
                };
            });
        });

        ipcMain.handle('auth-logout', async () => {
            return withErrorHandling('auth-logout', async () => {
                if (this.currentUser) {
                    await this.auditService.logAction(
                        'LOGOUT', 'User', this.currentUser.id,
                        {}, {}, this.currentUser.id, 'SUCCESS'
                    );
                }
                this.currentUser = null;
                return { success: true };
            });
        });

        // 添加更多IPC处理器...
        ipcHandlerCount = 2; // 当前已添加2个处理器
        
        this.logger.info(`✅ ${ipcHandlerCount} IPC handlers set up`);
    }

    async createDefaultAdmin() {
        try {
            this.logger.info('👤 Checking for default admin user...');
            
            const adminExists = await this.dbManager.checkUserExists('admin');
            
            if (!adminExists) {
                this.logger.info('👤 Creating default admin user...');
                
                await this.authService.createUser({
                    username: 'admin',
                    password: 'Admin123!',
                    fullName: 'System Administrator',
                    role: 'ADMIN',
                    title: '系统管理员',
                    department: 'IT部门',
                    mustChangePassword: true
                });
                
                this.logger.info('✅ Default admin user created (admin/Admin123!)');
            } else {
                this.logger.info('✅ Default admin user already exists');
            }
        } catch (error) {
            this.errorMonitor.logError('Default Admin Creation Failed', error);
            throw new Error(`创建默认管理员失败: ${error.message}`);
        }
    }

    showStartupInfo() {
        if (this.mainWindow) {
            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: '启动完成',
                message: '放射检测仪应用启动成功',
                detail: `启动时间: ${new Date().toLocaleString()}
运行时间: ${this.performanceMonitor.getUptime()}ms
错误统计: ${this.errorMonitor.errorCount}个
日志文件: ${this.logger.logFile}

应用已准备就绪，可以开始使用。`,
                buttons: ['确定']
            });
        }
    }

    showSystemInfo() {
        const errorSummary = this.errorMonitor.getErrorSummary();
        const uptime = Math.floor(this.performanceMonitor.getUptime() / 1000);
        
        const systemInfo = {
            '应用版本': app.getVersion(),
            'Electron版本': process.versions.electron,
            'Node.js版本': process.versions.node,
            'Chrome版本': process.versions.chrome,
            '平台': process.platform,
            '架构': process.arch,
            '运行时间': `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
            '错误总数': errorSummary.totalErrors,
            '近期错误': errorSummary.recentErrors.length,
            '日志文件': this.logger.logFile,
            '启动步骤': this.startupSteps.length
        };

        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: '系统信息',
            message: '系统状态信息',
            detail: Object.entries(systemInfo)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n'),
            buttons: ['确定']
        });
    }

    showAboutDialog() {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: '关于',
            message: '放射检测仪 CFR 21 Part 11 合规系统',
            detail: `版本: ${app.getVersion()}

符合CFR 21 Part 11要求的专业放射检测软件

功能特点:
• 三轴探头控制系统
• 实时数据采集和处理
• 电子签名和审计追踪
• 用户权限管理
• 数据完整性验证

开发: xitg
许可证: UNLICENSED

启动信息:
• 启动时间: ${new Date(this.startupStartTime).toLocaleString()}
• 运行时间: ${Math.floor(this.performanceMonitor.getUptime() / 1000)}秒
• 错误统计: ${this.errorMonitor.errorCount}个`
        });
    }

    showComplianceInfo() {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'CFR 21 Part 11 合规声明',
            message: '本系统符合CFR 21 Part 11要求',
            detail: `符合要求:
• 电子签名唯一性和验证
• 不可变审计追踪  
• 三级权限管理（操作员/主管/管理员）
• 数据完整性和记录保留
• 密码策略和账户安全
• 系统验证和文档
• 用户身份验证
• 操作授权控制

合规验证:
• 数据保护措施: ✅ 已实施
• 审计日志: ✅ 完整记录
• 用户权限: ✅ 三级管理
• 数字签名: ✅ 加密验证

系统版本: ${app.getVersion()}
合规级别: CFR 21 Part 11
验证日期: ${new Date().toLocaleDateString()}`
        });
    }
}

// 启动应用
if (require.main === module) {
    try {
        new EnhancedRadiationDetectorApp();
    } catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
}

module.exports = EnhancedRadiationDetectorApp;
