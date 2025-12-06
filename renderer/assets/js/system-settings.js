/**
 * 系统设置管理器
 * System Settings Manager
 * 
 * 功能特点:
 * - 系统设置界面管理
 * - 硬件通讯模式切换
 * - 用户偏好设置
 * - 配置导入导出
 */

class SystemSettingsManager {
    constructor() {
        this.currentSettings = null;
        this.currentHardwareConfig = null;
        this.currentUserPreferences = null;
        this.currentHardwareMode = 'simulated';
        this.isInitialized = false;
        
        this.initializeEventListeners();
    }

    /**
     * 初始化事件监听器
     */
    initializeEventListeners() {
        // 系统设置按钮
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.openSystemSettingsModal();
        });

        // 硬件模式按钮
        document.getElementById('hardware-mode-btn')?.addEventListener('click', () => {
            this.openHardwareModeModal();
        });

        // 用户偏好按钮
        document.getElementById('user-preferences-btn')?.addEventListener('click', () => {
            this.openUserPreferencesModal();
        });

        // 导出配置按钮
        document.getElementById('export-config-btn')?.addEventListener('click', () => {
            this.exportConfiguration();
        });
    }

    /**
     * 初始化系统设置管理器
     */
    async initialize() {
        try {
            console.log('初始化系统设置管理器...');
            
            await this.loadCurrentSettings();
            await this.loadHardwareConfig();
            await this.loadUserPreferences();
            await this.loadHardwareStatus();
            
            this.isInitialized = true;
            console.log('✅ 系统设置管理器初始化完成');
        } catch (error) {
            console.error('❌ 系统设置管理器初始化失败:', error);
            // 非关键模块，不抛出错误
        }
    }

    /**
     * init方法别名，与main.js兼容
     */
    async init() {
        return await this.initialize();
    }

    /**
     * 加载当前系统设置
     */
    async loadCurrentSettings() {
        try {
            const response = await fetch('/api/settings', {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentSettings = result.data;
                this.updateSettingsDisplay();
            } else {
                console.error('加载系统设置失败:', result.error);
            }
        } catch (error) {
            console.error('加载系统设置异常:', error);
        }
    }

    /**
     * 加载硬件配置
     */
    async loadHardwareConfig() {
        try {
            const response = await fetch('/api/settings/hardware', {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentHardwareConfig = result.data;
                this.currentHardwareMode = result.data.mode;
            } else {
                console.error('加载硬件配置失败:', result.error);
            }
        } catch (error) {
            console.error('加载硬件配置异常:', error);
        }
    }

    /**
     * 加载用户偏好设置
     */
    async loadUserPreferences() {
        try {
            const response = await fetch('/api/settings/preferences', {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentUserPreferences = result.data;
            } else {
                console.error('加载用户偏好失败:', result.error);
            }
        } catch (error) {
            console.error('加载用户偏好异常:', error);
        }
    }

    /**
     * 加载硬件状态
     */
    async loadHardwareStatus() {
        try {
            const response = await fetch('/api/hardware/status', {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.updateHardwareStatusDisplay(result.data);
            } else {
                console.error('加载硬件状态失败:', result.error);
            }
        } catch (error) {
            console.error('加载硬件状态异常:', error);
        }
    }

    /**
     * 更新设置显示
     */
    updateSettingsDisplay() {
        if (!this.currentSettings) return;

        // 更新硬件模式状态
        const modeStatus = document.getElementById('hardware-mode-status');
        if (modeStatus) {
            modeStatus.textContent = this.currentHardwareMode === 'simulated' ? '模拟模式' : '真实硬件模式';
            modeStatus.className = `status-badge ${this.currentHardwareMode === 'simulated' ? 'success' : 'info'}`;
        }
    }

    /**
     * 更新硬件状态显示
     */
    updateHardwareStatusDisplay(status) {
        // 更新设备连接状态
        const connectionStatus = document.getElementById('hardware-connection-status');
        if (connectionStatus) {
            connectionStatus.textContent = status.connected ? '已连接' : '未连接';
            connectionStatus.className = `status-badge ${status.connected ? 'success' : 'disconnected'}`;
        }

        // 更新数据采集状态
        const acquisitionStatus = document.getElementById('acquisition-status');
        if (acquisitionStatus) {
            acquisitionStatus.textContent = status.acquiring ? '采集中' : '待机';
            acquisitionStatus.className = `status-badge ${status.acquiring ? 'warning' : 'info'}`;
        }

        // 更新设备类型
        const deviceTypeStatus = document.getElementById('device-type-status');
        if (deviceTypeStatus && status.device) {
            deviceTypeStatus.textContent = status.device.name || '未知设备';
        }
    }

    /**
     * 打开系统设置模态框
     */
    openSystemSettingsModal() {
        const modal = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const content = document.getElementById('modal-content');
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');

        if (!modal || !title || !content) return;

        title.textContent = '系统设置';
        content.innerHTML = this.generateSystemSettingsContent();
        
        cancelBtn.style.display = 'inline-block';
        confirmBtn.style.display = 'inline-block';
        confirmBtn.textContent = '保存设置';

        // 绑定事件
        cancelBtn.onclick = () => this.closeModal();
        confirmBtn.onclick = () => this.saveSystemSettings();

        modal.style.display = 'flex';
    }

    /**
     * 生成系统设置内容
     */
    generateSystemSettingsContent() {
        const settings = this.currentSettings || {};
        const system = settings.system || {};
        const communication = settings.communication || {};
        const display = settings.display || {};
        const exportSettings = settings.export || {};
        const security = settings.security || {};

        return `
            <div class="settings-container">
                <!-- 系统基本信息 -->
                <div class="settings-section">
                    <h4>📋 系统信息</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="system-language">系统语言</label>
                            <select id="system-language" class="form-control">
                                <option value="zh-CN" ${system.language === 'zh-CN' ? 'selected' : ''}>简体中文</option>
                                <option value="en-US" ${system.language === 'en-US' ? 'selected' : ''}>English</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="system-timezone">时区</label>
                            <input type="text" id="system-timezone" class="form-control" 
                                   value="${system.timezone || 'Asia/Shanghai'}">
                        </div>
                        <div class="form-group">
                            <label for="system-date-format">日期格式</label>
                            <input type="text" id="system-date-format" class="form-control" 
                                   value="${system.dateFormat || 'YYYY-MM-DD HH:mm:ss'}">
                        </div>
                    </div>
                </div>

                <!-- 自动保存设置 -->
                <div class="settings-section">
                    <h4>💾 自动保存</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="auto-save">启用自动保存</label>
                            <select id="auto-save" class="form-control">
                                <option value="true" ${system.autoSave ? 'selected' : ''}>启用</option>
                                <option value="false" ${!system.autoSave ? 'selected' : ''}>禁用</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="save-interval">保存间隔 (毫秒)</label>
                            <input type="number" id="save-interval" class="form-control" 
                                   value="${system.saveInterval || 300000}" min="60000" max="3600000">
                        </div>
                        <div class="form-group">
                            <label for="debug-mode">调试模式</label>
                            <select id="debug-mode" class="form-control">
                                <option value="true" ${system.debugMode ? 'selected' : ''}>启用</option>
                                <option value="false" ${!system.debugMode ? 'selected' : ''}>禁用</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- 显示设置 -->
                <div class="settings-section">
                    <h4>🎨 显示设置</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="display-theme">主题</label>
                            <select id="display-theme" class="form-control">
                                <option value="light" ${display.theme === 'light' ? 'selected' : ''}>浅色主题</option>
                                <option value="dark" ${display.theme === 'dark' ? 'selected' : ''}>深色主题</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="chart-theme">图表主题</label>
                            <select id="chart-theme" class="form-control">
                                <option value="modern" ${display.chartTheme === 'modern' ? 'selected' : ''}>现代风格</option>
                                <option value="classic" ${display.chartTheme === 'classic' ? 'selected' : ''}>经典风格</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="update-interval">界面更新间隔 (毫秒)</label>
                            <input type="number" id="update-interval" class="form-control" 
                                   value="${display.updateInterval || 100}" min="50" max="1000">
                        </div>
                    </div>
                </div>

                <!-- 导出设置 -->
                <div class="settings-section">
                    <h4>📤 导出设置</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="default-export-format">默认导出格式</label>
                            <select id="default-export-format" class="form-control">
                                <option value="csv" ${exportSettings.defaultFormat === 'csv' ? 'selected' : ''}>CSV</option>
                                <option value="json" ${exportSettings.defaultFormat === 'json' ? 'selected' : ''}>JSON</option>
                                <option value="pdf" ${exportSettings.defaultFormat === 'pdf' ? 'selected' : ''}>PDF</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="include-metadata">包含元数据</label>
                            <select id="include-metadata" class="form-control">
                                <option value="true" ${exportSettings.includeMetadata ? 'selected' : ''}>是</option>
                                <option value="false" ${!exportSettings.includeMetadata ? 'selected' : ''}>否</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="signature-required">导出需要签名</label>
                            <select id="signature-required" class="form-control">
                                <option value="true" ${exportSettings.signatureRequired ? 'selected' : ''}>是</option>
                                <option value="false" ${!exportSettings.signatureRequired ? 'selected' : ''}>否</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- 安全设置 -->
                <div class="settings-section">
                    <h4>🔒 安全设置</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="session-timeout">会话超时 (毫秒)</label>
                            <input type="number" id="session-timeout" class="form-control" 
                                   value="${security.sessionTimeout || 3600000}" min="300000" max="86400000">
                        </div>
                        <div class="form-group">
                            <label for="max-login-attempts">最大登录尝试次数</label>
                            <input type="number" id="max-login-attempts" class="form-control" 
                                   value="${security.maxLoginAttempts || 5}" min="3" max="10">
                        </div>
                        <div class="form-group">
                            <label for="lockout-duration">锁定持续时间 (毫秒)</label>
                            <input type="number" id="lockout-duration" class="form-control" 
                                   value="${security.lockoutDuration || 300000}" min="60000" max="3600000">
                        </div>
                    </div>
                </div>

                <!-- 系统信息显示 -->
                <div class="settings-section">
                    <h4>ℹ️ 系统信息</h4>
                    <div class="system-info">
                        <div class="info-item">
                            <label>版本:</label>
                            <span>${system.version || '1.0.0'}</span>
                        </div>
                        <div class="info-item">
                            <label>构建号:</label>
                            <span>${system.buildNumber || '2025.01.001'}</span>
                        </div>
                        <div class="info-item">
                            <label>安装日期:</label>
                            <span>${system.installDate ? new Date(system.installDate).toLocaleDateString() : '未知'}</span>
                        </div>
                        <div class="info-item">
                            <label>最后更新:</label>
                            <span>${system.lastUpdate ? new Date(system.lastUpdate).toLocaleDateString() : '未知'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 保存系统设置
     */
    async saveSystemSettings() {
        try {
            const formData = this.getFormData();
            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('系统设置已保存', 'success');
                this.closeModal();
                await this.loadCurrentSettings();
            } else {
                this.showNotification('保存失败: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('保存系统设置异常:', error);
            this.showNotification('保存异常: ' + error.message, 'error');
        }
    }

    /**
     * 获取表单数据
     */
    getFormData() {
        const settings = {};

        // 系统信息
        settings.system = {
            language: document.getElementById('system-language')?.value,
            timezone: document.getElementById('system-timezone')?.value,
            dateFormat: document.getElementById('system-date-format')?.value,
            autoSave: document.getElementById('auto-save')?.value === 'true',
            saveInterval: parseInt(document.getElementById('save-interval')?.value),
            debugMode: document.getElementById('debug-mode')?.value === 'true'
        };

        // 显示设置
        settings.display = {
            theme: document.getElementById('display-theme')?.value,
            chartTheme: document.getElementById('chart-theme')?.value,
            updateInterval: parseInt(document.getElementById('update-interval')?.value)
        };

        // 导出设置
        settings.export = {
            defaultFormat: document.getElementById('default-export-format')?.value,
            includeMetadata: document.getElementById('include-metadata')?.value === 'true',
            signatureRequired: document.getElementById('signature-required')?.value === 'true'
        };

        // 安全设置
        settings.security = {
            sessionTimeout: parseInt(document.getElementById('session-timeout')?.value),
            maxLoginAttempts: parseInt(document.getElementById('max-login-attempts')?.value),
            lockoutDuration: parseInt(document.getElementById('lockout-duration')?.value)
        };

        return settings;
    }

    /**
     * 打开硬件模式模态框
     */
    openHardwareModeModal() {
        const modal = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const content = document.getElementById('modal-content');
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');

        if (!modal || !title || !content) return;

        title.textContent = '硬件通讯模式';
        content.innerHTML = this.generateHardwareModeContent();
        
        cancelBtn.style.display = 'inline-block';
        confirmBtn.style.display = 'inline-block';
        confirmBtn.textContent = '切换模式';

        // 绑定事件
        cancelBtn.onclick = () => this.closeModal();
        confirmBtn.onclick = () => this.switchHardwareMode();

        modal.style.display = 'flex';
    }

    /**
     * 生成硬件模式内容
     */
    generateHardwareModeContent() {
        return `
            <div class="hardware-mode-container">
                <div class="mode-selection">
                    <h4>选择硬件通讯模式</h4>
                    
                    <!-- 模拟模式 -->
                    <div class="mode-option ${this.currentHardwareMode === 'simulated' ? 'active' : ''}" data-mode="simulated">
                        <div class="mode-header">
                            <input type="radio" id="mode-simulated" name="hardware-mode" value="simulated" 
                                   ${this.currentHardwareMode === 'simulated' ? 'checked' : ''}>
                            <label for="mode-simulated">
                                <strong>🧪 模拟模式</strong>
                                <span class="mode-description">使用软件模拟硬件通讯和数据生成</span>
                            </label>
                        </div>
                        <div class="mode-details">
                            <ul>
                                <li>✅ 无需真实硬件设备</li>
                                <li>✅ 快速测试和演示</li>
                                <li>✅ 可配置模拟参数</li>
                                <li>✅ 多种探测器类型支持</li>
                                <li>⚠️ 仅用于测试和演示</li>
                            </ul>
                        </div>
                    </div>

                    <!-- 真实硬件模式 -->
                    <div class="mode-option ${this.currentHardwareMode === 'real' ? 'active' : ''}" data-mode="real">
                        <div class="mode-header">
                            <input type="radio" id="mode-real" name="hardware-mode" value="real" 
                                   ${this.currentHardwareMode === 'real' ? 'checked' : ''}>
                            <label for="mode-real">
                                <strong>🔌 真实硬件模式</strong>
                                <span class="mode-description">通过COM口与真实硬件设备通讯</span>
                            </label>
                        </div>
                        <div class="mode-details">
                            <ul>
                                <li>✅ 连接真实探测器</li>
                                <li>✅ 获取实际测量数据</li>
                                <li>✅ 完整的硬件控制</li>
                                <li>✅ 生产环境使用</li>
                                <li>⚠️ 需要硬件设备支持</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- 当前状态 -->
                <div class="current-status">
                    <h4>当前状态</h4>
                    <div class="status-info">
                        <div class="status-item">
                            <label>当前模式:</label>
                            <span class="status-badge ${this.currentHardwareMode === 'simulated' ? 'success' : 'info'}">
                                ${this.currentHardwareMode === 'simulated' ? '模拟模式' : '真实硬件模式'}
                            </span>
                        </div>
                        <div class="status-item">
                            <label>连接状态:</label>
                            <span id="modal-connection-status" class="status-badge">检查中...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 切换硬件模式
     */
    async switchHardwareMode() {
        try {
            const selectedMode = document.querySelector('input[name="hardware-mode"]:checked')?.value;
            
            if (!selectedMode) {
                this.showNotification('请选择一个硬件模式', 'warning');
                return;
            }

            if (selectedMode === this.currentHardwareMode) {
                this.showNotification('当前已经是所选模式', 'info');
                return;
            }

            // 切换模式
            const response = await fetch('/api/hardware/mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                },
                body: JSON.stringify({ mode: selectedMode })
            });

            const result = await response.json();

            if (result.success) {
                this.currentHardwareMode = selectedMode;
                this.showNotification(result.message, 'success');
                this.closeModal();
                await this.loadCurrentSettings();
                await this.loadHardwareStatus();
            } else {
                this.showNotification('切换失败: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('切换硬件模式异常:', error);
            this.showNotification('切换异常: ' + error.message, 'error');
        }
    }

    /**
     * 打开用户偏好模态框
     */
    openUserPreferencesModal() {
        const modal = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const content = document.getElementById('modal-content');
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');

        if (!modal || !title || !content) return;

        title.textContent = '用户偏好设置';
        content.innerHTML = this.generateUserPreferencesContent();
        
        cancelBtn.style.display = 'inline-block';
        confirmBtn.style.display = 'inline-block';
        confirmBtn.textContent = '保存偏好';

        // 绑定事件
        cancelBtn.onclick = () => this.closeModal();
        confirmBtn.onclick = () => this.saveUserPreferences();

        modal.style.display = 'flex';
    }

    /**
     * 生成用户偏好内容
     */
    generateUserPreferencesContent() {
        const preferences = this.currentUserPreferences || {};
        const display = preferences.display || {};

        return `
            <div class="preferences-container">
                <div class="preferences-section">
                    <h4>🎨 界面偏好</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="pref-theme">主题</label>
                            <select id="pref-theme" class="form-control">
                                <option value="light" ${display.theme === 'light' ? 'selected' : ''}>浅色</option>
                                <option value="dark" ${display.theme === 'dark' ? 'selected' : ''}>深色</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="pref-notifications">启用通知</label>
                            <select id="pref-notifications" class="form-control">
                                <option value="true" ${display.notifications?.enabled ? 'selected' : 'selected'}>是</option>
                                <option value="false" ${!display.notifications?.enabled ? 'selected' : ''}>否</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="pref-sound">启用声音</label>
                            <select id="pref-sound" class="form-control">
                                <option value="true" ${display.notifications?.sound ? 'selected' : 'selected'}>是</option>
                                <option value="false" ${!display.notifications?.sound ? 'selected' : ''}>否</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="preferences-section">
                    <h4>📊 图表偏好</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="pref-chart-points">图表点数</label>
                            <input type="number" id="pref-chart-points" class="form-control" 
                                   value="${display.chartPoints || 1000}" min="100" max="10000">
                        </div>
                        <div class="form-group">
                            <label for="pref-grid-lines">显示网格</label>
                            <select id="pref-grid-lines" class="form-control">
                                <option value="true" ${display.gridLines !== false ? 'selected' : ''}>是</option>
                                <option value="false" ${display.gridLines === false ? 'selected' : ''}>否</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="pref-legend">显示图例</label>
                            <select id="pref-legend" class="form-control">
                                <option value="true" ${display.legend !== false ? 'selected' : ''}>是</option>
                                <option value="false" ${display.legend === false ? 'selected' : ''}>否</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 保存用户偏好
     */
    async saveUserPreferences() {
        try {
            const preferences = this.getUserPreferencesData();
            
            const response = await fetch('/api/settings/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                },
                body: JSON.stringify({
                    preferences: preferences
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('用户偏好已保存', 'success');
                this.closeModal();
                await this.loadUserPreferences();
            } else {
                this.showNotification('保存失败: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('保存用户偏好异常:', error);
            this.showNotification('保存异常: ' + error.message, 'error');
        }
    }

    /**
     * 获取用户偏好数据
     */
    getUserPreferencesData() {
        const preferences = {};

        // 界面偏好
        preferences.display = {
            theme: document.getElementById('pref-theme')?.value,
            chartPoints: parseInt(document.getElementById('pref-chart-points')?.value),
            gridLines: document.getElementById('pref-grid-lines')?.value === 'true',
            legend: document.getElementById('pref-legend')?.value === 'true',
            notifications: {
                enabled: document.getElementById('pref-notifications')?.value === 'true',
                sound: document.getElementById('pref-sound')?.value === 'true'
            }
        };

        return preferences;
    }

    /**
     * 导出配置
     */
    async exportConfiguration() {
        try {
            const format = prompt('请选择导出格式 (json/xml/csv):', 'json');
            
            if (!format) return;

            const response = await fetch(`/api/settings/export?format=${format}`, {
                headers: {
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `system-config-${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                this.showNotification('配置导出成功', 'success');
            } else {
                const result = await response.json();
                this.showNotification('导出失败: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('导出配置异常:', error);
            this.showNotification('导出异常: ' + error.message, 'error');
        }
    }

    /**
     * 关闭模态框
     */
    closeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 尝试使用全局通知系统
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }

        // 简单的alert作为fallback
        alert(message);
    }
}

// 创建全局实例
window.systemSettingsManager = new SystemSettingsManager();

// 系统设置管理器已加载完成