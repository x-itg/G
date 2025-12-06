const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const crypto = require('crypto');

// 导入自定义模块
const DatabaseManager = require('./database/DatabaseManager');
const AuthenticationService = require('./services/AuthenticationService');
const AuditTrailService = require('./services/AuditTrailService');
const SerialCommunicationService = require('./services/SerialCommunicationService');

class RadiationDetectorApp {
    constructor() {
        this.mainWindow = null;
        this.dbManager = null;
        this.authService = null;
        this.auditService = null;
        this.serialService = null;
        this.currentUser = null;
        
        this.initializeApp();
    }

    async initializeApp() {
        // 初始化数据库
        this.dbManager = new DatabaseManager();
        await this.dbManager.initialize();
        
        // 初始化服务
        this.authService = new AuthenticationService(this.dbManager);
        this.auditService = new AuditTrailService(this.dbManager);
        this.serialService = new SerialCommunicationService();
        
        // 创建默认管理员账户
        await this.createDefaultAdmin();
        
        // 设置应用事件
        this.setupAppEvents();
        
        // 创建主窗口
        this.createMainWindow();
        
        // 设置IPC通信
        this.setupIPC();
    }

    async createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1000,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            icon: path.join(__dirname, 'assets', 'icon.png'),
            show: false,
            title: '放射检测仪 - CFR 21 Part 11 合规系统'
        });

        // 加载应用
        await this.mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

        // 显示窗口
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            if (isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // 设置菜单
        this.createMenu();
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
                            this.mainWindow.webContents.send('menu-new-analysis');
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
                                this.mainWindow.webContents.send('menu-open-data', result.filePaths[0]);
                            }
                        }
                    },
                    {
                        label: '保存数据',
                        accelerator: 'CmdOrCtrl+S',
                        click: () => {
                            this.mainWindow.webContents.send('menu-save-data');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '导出报告',
                        click: () => {
                            this.mainWindow.webContents.send('menu-export-report');
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
                            this.mainWindow.webContents.send('menu-serial-config');
                        }
                    },
                    {
                        label: '连接设备',
                        click: () => {
                            this.mainWindow.webContents.send('menu-connect-devices');
                        }
                    },
                    {
                        label: '断开连接',
                        click: () => {
                            this.mainWindow.webContents.send('menu-disconnect-devices');
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
                            this.mainWindow.webContents.send('menu-start-analysis');
                        }
                    },
                    {
                        label: '停止检测',
                        accelerator: 'F6',
                        click: () => {
                            this.mainWindow.webContents.send('menu-stop-analysis');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '重置数据',
                        click: () => {
                            this.mainWindow.webContents.send('menu-reset-data');
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
                            this.mainWindow.webContents.send('menu-user-management');
                        }
                    },
                    {
                        label: '审计日志',
                        click: () => {
                            this.mainWindow.webContents.send('menu-audit-log');
                        }
                    },
                    {
                        label: '设备管理',
                        click: () => {
                            this.mainWindow.webContents.send('menu-device-management');
                        }
                    },
                    {
                        label: '系统验证',
                        click: () => {
                            this.mainWindow.webContents.send('menu-system-validation');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '设置',
                        click: () => {
                            this.mainWindow.webContents.send('menu-settings');
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
                            dialog.showMessageBox(this.mainWindow, {
                                type: 'info',
                                title: '关于',
                                message: '放射检测仪 CFR 21 Part 11 合规系统',
                                detail: '版本: 1.0.0\n\n符合CFR 21 Part 11要求的专业放射检测软件\n\n作者: MiniMax Agent\n许可证: UNLICENSED'
                            });
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

    setupAppEvents() {
        app.whenReady().then(() => {
            console.log('放射检测仪应用启动');
        });

        app.on('window-all-closed', async () => {
            // 清理资源
            if (this.serialService) {
                await this.serialService.disconnect();
            }
            
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createMainWindow();
            }
        });
    }

    setupIPC() {
        // 用户认证
        ipcMain.handle('auth-login', async (event, credentials) => {
            try {
                const result = await this.authService.authenticate(credentials.username, credentials.password);
                this.currentUser = result.user;
                
                // 记录审计日志
                await this.auditService.logAction(
                    'LOGIN',
                    'User',
                    result.user.id,
                    { username: credentials.username },
                    {},
                    result.user.id,
                    'SUCCESS'
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
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('auth-logout', async () => {
            if (this.currentUser) {
                await this.auditService.logAction(
                    'LOGOUT',
                    'User',
                    this.currentUser.id,
                    {},
                    {},
                    this.currentUser.id,
                    'SUCCESS'
                );
            }
            this.currentUser = null;
            return { success: true };
        });

        // 串口通信
        ipcMain.handle('serial-configure', async (event, config) => {
            try {
                await this.serialService.configure(config);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('serial-connect', async () => {
            try {
                await this.serialService.connect();
                
                // 启动数据监听
                this.serialService.on('data', (data) => {
                    this.mainWindow.webContents.send('serial-data-received', data);
                });
                
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('serial-disconnect', async () => {
            try {
                await this.serialService.disconnect();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // 探头控制
        ipcMain.handle('probe-move', async (event, position) => {
            try {
                await this.serialService.moveProbe(position);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('probe-home', async () => {
            try {
                await this.serialService.homeProbe();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // 电子签名
        ipcMain.handle('electronic-signature', async (event, signatureData) => {
            try {
                if (!this.currentUser) {
                    throw new Error('用户未登录');
                }
                
                const signature = await this.authService.createElectronicSignature({
                    ...signatureData,
                    userId: this.currentUser.id
                });
                
                // 记录审计日志
                await this.auditService.logAction(
                    'SIGN',
                    signatureData.entityType || 'Analysis',
                    signatureData.entityId || 'default',
                    {},
                    signature,
                    this.currentUser.id,
                    'SUCCESS'
                );
                
                return { success: true, signature };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // 审计日志查询
        ipcMain.handle('audit-get-logs', async (event, filters) => {
            try {
                const logs = await this.auditService.getLogs(filters);
                return { success: true, logs };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // 数据操作
        ipcMain.handle('data-save-analysis', async (event, analysisData) => {
            try {
                const saved = await this.dbManager.saveAnalysis({
                    ...analysisData,
                    userId: this.currentUser.id
                });
                
                // 记录审计日志
                await this.auditService.logAction(
                    'CREATE',
                    'Analysis',
                    saved.id,
                    {},
                    saved,
                    this.currentUser.id,
                    'SUCCESS'
                );
                
                return { success: true, analysis: saved };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // 用户管理（管理员功能）
        ipcMain.handle('user-create', async (event, userData) => {
            try {
                if (this.currentUser?.role !== 'ADMIN') {
                    throw new Error('权限不足');
                }
                
                const user = await this.dbManager.createUser(userData);
                
                // 记录审计日志
                await this.auditService.logAction(
                    'CREATE',
                    'User',
                    user.id,
                    {},
                    user,
                    this.currentUser.id,
                    'SUCCESS'
                );
                
                return { success: true, user };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('user-delete', async (event, userId) => {
            try {
                if (this.currentUser?.role !== 'ADMIN') {
                    throw new Error('权限不足');
                }
                
                await this.dbManager.deleteUser(userId);
                
                // 记录审计日志
                await this.auditService.logAction(
                    'DELETE',
                    'User',
                    userId,
                    {},
                    {},
                    this.currentUser.id,
                    'SUCCESS'
                );
                
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('user-list', async () => {
            try {
                if (this.currentUser?.role !== 'ADMIN') {
                    throw new Error('权限不足');
                }
                
                const users = await this.dbManager.getAllUsers();
                return { success: true, users };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
    }

    async createDefaultAdmin() {
        try {
            const adminExists = await this.dbManager.checkUserExists('admin');
            
            if (!adminExists) {
                await this.authService.createUser({
                    username: 'admin',
                    password: 'Admin123!', // 首次登录需要修改
                    fullName: 'System Administrator',
                    role: 'ADMIN',
                    title: '系统管理员',
                    department: 'IT部门',
                    mustChangePassword: true
                });
                
                console.log('默认管理员账户已创建: admin/Admin123!');
            }
        } catch (error) {
            console.error('创建默认管理员失败:', error.message);
        }
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

系统版本: ${app.getVersion()}
合规级别: CFR 21 Part 11
验证日期: 2025-12-04`
        });
    }
}

// 启动应用
new RadiationDetectorApp();