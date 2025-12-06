// 设备管理模块
window.DeviceManager = {
    // 模块状态
    isInitialized: false,
    currentDevice: null,
    devices: [],
    deviceLogs: [],
    calibrations: [],
    
    // 初始化模块
    async init() {
        try {
            console.log('🔧 初始化设备管理模块...');
            
            // 绑定事件
            this.bindEvents();
            
            // 加载设备列表
            await this.loadDevices();
            
            // 设置定期状态检查
            this.setupPeriodicChecks();
            
            this.isInitialized = true;
            console.log('✅ 设备管理模块初始化完成');
            
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'device_manager_init_failed', {
                functionName: 'init',
                stack: error.stack
            });
            console.error('❌ 设备管理模块初始化失败:', errorInfo.message);
            throw errorInfo;
        }
    },
    
    // 绑定事件处理器
    bindEvents() {
        // 设备管理按钮
        const deviceBtn = document.getElementById('device-btn');
        if (deviceBtn) {
            deviceBtn.addEventListener('click', () => this.showDeviceManager());
        }
        
        // 设备相关按钮
        const connectBtn = document.getElementById('connect-device-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectCurrentDevice());
        }
        
        const disconnectBtn = document.getElementById('disconnect-device-btn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnectCurrentDevice());
        }
        
        const calibrateBtn = document.getElementById('calibrate-device-btn');
        if (calibrateBtn) {
            calibrateBtn.addEventListener('click', () => this.showCalibrationDialog());
        }
        
        const statusBtn = document.getElementById('device-status-btn');
        if (statusBtn) {
            statusBtn.addEventListener('click', () => this.showDeviceStatus());
        }
        
        // 模态对话框事件
        this.bindModalEvents();
    },
    
    // 绑定模态对话框事件
    bindModalEvents() {
        // 设备管理对话框
        const deviceModalConfirm = document.getElementById('device-modal-confirm');
        if (deviceModalConfirm) {
            deviceModalConfirm.addEventListener('click', () => this.handleDeviceModalConfirm());
        }
        
        // 校准对话框
        const calibrationModalConfirm = document.getElementById('calibration-modal-confirm');
        if (calibrationModalConfirm) {
            calibrationModalConfirm.addEventListener('click', () => this.handleCalibrationModalConfirm());
        }
        
        // 设备状态对话框
        const statusModalConfirm = document.getElementById('status-modal-confirm');
        if (statusModalConfirm) {
            statusModalConfirm.addEventListener('click', () => UI.closeModal());
        }
    },
    
    // 加载设备列表
    async loadDevices() {
        const loadDevicesWithLoader = window.LoadingIndicator.wrap(async () => {
            console.log('📱 加载设备列表...');
            
            const response = await this.apiRequest('/api/devices', {
                method: 'GET'
            });
            
            if (response.success) {
                this.devices = response.data || [];
                this.updateDeviceList();
                console.log(`✅ 加载 ${this.devices.length} 个设备`);
            } else {
                throw new Error(response.message || '加载设备列表失败');
            }
        }, {
            message: '正在加载设备列表',
            showProgress: true,
            enableCancel: false
        });

        try {
            await loadDevicesWithLoader();
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'device_list_load_failed', {
                apiEndpoint: '/api/devices',
                functionName: 'loadDevices'
            });
            
            console.error('❌ 加载设备列表失败:', errorInfo.message);
            UI.showError(errorInfo.userMessage);
        }
    },
    
    // 更新设备列表显示
    updateDeviceList() {
        const deviceList = document.getElementById('device-list');
        if (!deviceList) return;
        
        const deviceCards = this.devices.map(device => `
            <div class="device-card" data-device-id="${device.id}">
                <div class="device-header">
                    <h4>${device.name}</h4>
                    <span class="device-status status-${device.status}">${this.getStatusText(device.status)}</span>
                </div>
                <div class="device-info">
                    <p><strong>类型:</strong> ${device.type}</p>
                    <p><strong>端口:</strong> ${device.port}</p>
                    <p><strong>波特率:</strong> ${device.baud_rate}</p>
                    <p><strong>最后连接:</strong> ${device.last_connection ? new Date(device.last_connection).toLocaleString() : '从未连接'}</p>
                </div>
                <div class="device-actions">
                    <button class="btn btn-sm ${device.is_connected ? 'btn-danger' : 'btn-success'}" 
                            onclick="DeviceManager.${device.is_connected ? 'disconnect' : 'connect'}Device(${device.id})">
                        ${device.is_connected ? '断开连接' : '连接'}
                    </button>
                    <button class="btn btn-sm btn-info" onclick="DeviceManager.showDeviceDetails(${device.id})">
                        详情
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="DeviceManager.showCalibrationDialog(${device.id})">
                        校准
                    </button>
                </div>
            </div>
        `).join('');
        
        deviceList.innerHTML = deviceCards;
    },
    
    // 显示设备管理器
    showDeviceManager() {
        UI.showModal({
            title: '设备管理',
            content: this.getDeviceManagerContent(),
            showConfirmButton: false,
            showCancelButton: false,
            size: 'large'
        });
        
        // 更新设备列表
        this.loadDevices();
    },
    
    // 获取设备管理器内容
    getDeviceManagerContent() {
        return `
            <div class="device-manager">
                <div class="device-manager-header">
                    <h3>设备管理</h3>
                    <div class="device-actions">
                        <button class="btn btn-primary" onclick="DeviceManager.showAddDeviceDialog()">
                            添加设备
                        </button>
                        <button class="btn btn-info" onclick="DeviceManager.refreshDevices()">
                            刷新
                        </button>
                    </div>
                </div>
                
                <div class="device-list" id="modal-device-list">
                    <!-- 设备列表将在这里显示 -->
                </div>
                
                <div class="device-logs-section">
                    <h4>设备日志</h4>
                    <div class="device-logs-controls">
                        <select id="device-log-filter">
                            <option value="">所有级别</option>
                            <option value="info">信息</option>
                            <option value="warning">警告</option>
                            <option value="error">错误</option>
                        </select>
                        <button class="btn btn-sm" onclick="DeviceManager.loadDeviceLogs()">刷新日志</button>
                    </div>
                    <div class="device-logs" id="device-logs-container">
                        <!-- 设备日志将在这里显示 -->
                    </div>
                </div>
            </div>
        `;
    },
    
    // 显示添加设备对话框
    showAddDeviceDialog() {
        UI.showModal({
            title: '添加设备',
            content: `
                <form id="add-device-form">
                    <div class="form-group">
                        <label for="device-name">设备名称</label>
                        <input type="text" id="device-name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="device-type">设备类型</label>
                        <select id="device-type" class="form-control" required>
                            <option value="">选择类型</option>
                            <option value="probe">探头</option>
                            <option value="detector">探测器</option>
                            <option value="counter">计数器</option>
                            <option value="scanner">扫描器</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="device-port">端口</label>
                        <select id="device-port" class="form-control" required>
                            <option value="">选择端口</option>
                            <option value="COM1">COM1</option>
                            <option value="COM2">COM2</option>
                            <option value="COM3">COM3</option>
                            <option value="COM4">COM4</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="device-baud-rate">波特率</label>
                        <select id="device-baud-rate" class="form-control" required>
                            <option value="9600" selected>9600</option>
                            <option value="19200">19200</option>
                            <option value="38400">38400</option>
                            <option value="115200">115200</option>
                        </select>
                    </div>
                </form>
            `,
            confirmText: '添加',
            cancelText: '取消',
            onConfirm: () => this.handleAddDevice()
        });
    },
    
    // 处理添加设备
    async handleAddDevice() {
        const form = document.getElementById('add-device-form');
        const formData = new FormData(form);
        
        const deviceData = {
            name: document.getElementById('device-name').value,
            type: document.getElementById('device-type').value,
            port: document.getElementById('device-port').value,
            baud_rate: parseInt(document.getElementById('device-baud-rate').value)
        };
        
        try {
            if (!deviceData.name || !deviceData.type || !deviceData.port || !deviceData.baud_rate) {
                throw new Error('请填写所有必需字段');
            }
            
            const response = await this.apiRequest('/api/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deviceData)
            });
            
            if (response.success) {
                UI.showSuccess('设备添加成功');
                UI.closeModal();
                this.loadDevices();
            } else {
                throw new Error(response.message || '添加设备失败');
            }
            
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'device_add_failed', {
                deviceName: deviceData.name,
                deviceType: deviceData.type,
                functionName: 'handleAddDevice'
            });
            
            console.error('添加设备失败:', errorInfo.message);
            UI.showError(errorInfo.userMessage);
        }
    },
    
    // 连接设备
    async connectDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) {
            UI.showError('设备不存在');
            return;
        }

        const connectDeviceWithLoader = window.LoadingIndicator.wrap(async () => {
            window.LoadingIndicator.updateMessage(this.currentLoaderId, `正在连接设备 "${device.name}"...`);
            
            const response = await this.apiRequest(`/api/devices/${deviceId}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect' })
            });
            
            if (response.success) {
                window.LoadingIndicator.updateMessage(this.currentLoaderId, '设备连接成功');
                setTimeout(() => {
                    UI.showSuccess(`设备 "${device.name}" 连接成功`);
                    this.loadDevices();
                }, 500);
            } else {
                throw new Error(response.message || '连接设备失败');
            }
        }, {
            title: `连接设备 - ${device.name}`,
            message: '准备连接设备...',
            showProgress: true,
            enableCancel: true,
            onCancel: () => {
                Auth.log(`用户取消了设备 "${device.name}" 的连接操作`, 'warning');
            }
        });

        try {
            await connectDeviceWithLoader();
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'device_connect_failed', {
                deviceId: deviceId,
                deviceName: device?.name,
                functionName: 'connectDevice'
            });
            
            console.error('连接设备失败:', errorInfo.message);
            UI.showError(errorInfo.userMessage);
        }
    },
    
    // 断开设备
    async disconnectDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) {
            UI.showError('设备不存在');
            return;
        }

        const disconnectDeviceWithLoader = window.LoadingIndicator.wrap(async () => {
            window.LoadingIndicator.updateMessage(this.currentLoaderId, `正在断开设备 "${device.name}"...`);
            
            const response = await this.apiRequest(`/api/devices/${deviceId}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'disconnect' })
            });
            
            if (response.success) {
                window.LoadingIndicator.updateMessage(this.currentLoaderId, '设备已断开');
                setTimeout(() => {
                    UI.showSuccess(`设备 "${device.name}" 断开连接`);
                    this.loadDevices();
                }, 500);
            } else {
                throw new Error(response.message || '断开设备失败');
            }
        }, {
            title: `断开设备 - ${device.name}`,
            message: '准备断开设备...',
            showProgress: true,
            enableCancel: true,
            onCancel: () => {
                Auth.log(`用户取消了设备 "${device.name}" 的断开操作`, 'warning');
            }
        });

        try {
            await disconnectDeviceWithLoader();
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'device_disconnect_failed', {
                deviceId: deviceId,
                deviceName: device?.name,
                functionName: 'disconnectDevice'
            });
            
            console.error('断开设备失败:', errorInfo.message);
            UI.showError(errorInfo.userMessage);
        }
    },
    
    // 显示校准对话框
    showCalibrationDialog(deviceId = null) {
        const device = deviceId ? this.devices.find(d => d.id === deviceId) : null;
        
        UI.showModal({
            title: device ? `校准设备 - ${device.name}` : '设备校准',
            content: `
                <form id="device-calibration-form">
                    <div class="form-group">
                        <label for="calibration-type">校准类型</label>
                        <select id="calibration-type" class="form-control" required>
                            <option value="">选择校准类型</option>
                            <option value="energy">能量校准</option>
                            <option value="efficiency">效率校准</option>
                            <option value="resolution">分辨率校准</option>
                            <option value="background">背景校准</option>
                            <option value="full">完整校准</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="calibration-parameters">校准参数 (JSON)</label>
                        <textarea id="calibration-parameters" class="form-control" rows="4" placeholder='{"energy": 1332, "tolerance": 0.1}'></textarea>
                    </div>
                    <div class="form-group">
                        <label for="calibration-notes">备注</label>
                        <textarea id="calibration-notes" class="form-control" rows="2" placeholder="校准说明或注意事项..."></textarea>
                    </div>
                    <input type="hidden" id="calibration-device-id" value="${deviceId || ''}">
                </form>
            `,
            confirmText: '开始校准',
            cancelText: '取消',
            onConfirm: () => this.handleDeviceCalibration()
        });
    },
    
    // 处理设备校准
    async handleDeviceCalibration() {
        const deviceId = document.getElementById('calibration-device-id').value;
        const calibrationType = document.getElementById('calibration-type').value;
        const parametersText = document.getElementById('calibration-parameters').value;
        const notes = document.getElementById('calibration-notes').value;
        
        try {
            if (!deviceId) {
                throw new Error('请选择要校准的设备');
            }
            
            if (!calibrationType) {
                throw new Error('请选择校准类型');
            }
            
            let parameters = {};
            if (parametersText.trim()) {
                try {
                    parameters = JSON.parse(parametersText);
                } catch (error) {
                    throw new Error('校准参数格式错误，请输入有效的JSON');
                }
            }

            const device = this.devices.find(d => d.id === deviceId);
            const calibrationTypeNames = {
                'energy': '能量校准',
                'efficiency': '效率校准',
                'resolution': '分辨率校准',
                'background': '背景校准',
                'full': '完整校准'
            };
            
            const performCalibrationWithLoader = window.LoadingIndicator.wrap(async () => {
                window.LoadingIndicator.updateMessage(this.currentLoaderId, '正在执行设备校准...');
                
                const response = await this.apiRequest(`/api/devices/${deviceId}/calibrate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        calibration_type: calibrationType,
                        parameters: parameters,
                        notes: notes
                    })
                });
                
                if (response.success) {
                    window.LoadingIndicator.updateMessage(this.currentLoaderId, '校准完成');
                    setTimeout(() => {
                        UI.showSuccess('设备校准成功');
                        UI.closeModal();
                        this.loadDevices();
                    }, 500);
                } else {
                    throw new Error(response.message || '校准设备失败');
                }
            }, {
                title: `校准设备 - ${device?.name || 'Unknown'}`,
                message: `准备进行${calibrationTypeNames[calibrationType] || calibrationType}...`,
                showProgress: true,
                enableCancel: true,
                onCancel: () => {
                    Auth.log(`用户取消了设备 "${device?.name}" 的校准操作`, 'warning');
                }
            });

            await performCalibrationWithLoader();
            
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'device_calibration_failed', {
                deviceId: deviceId,
                calibrationType: calibrationType,
                functionName: 'handleDeviceCalibration'
            });
            
            console.error('校准设备失败:', errorInfo.message);
            UI.showError(errorInfo.userMessage);
        }
    },
    
    // 显示设备详情
    showDeviceDetails(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) {
            UI.showError('设备不存在');
            return;
        }
        
        const metadata = device.metadata ? JSON.parse(device.metadata) : {};
        
        UI.showModal({
            title: `设备详情 - ${device.name}`,
            content: `
                <div class="device-details">
                    <h4>基本信息</h4>
                    <table class="info-table">
                        <tr><td>ID:</td><td>${device.id}</td></tr>
                        <tr><td>名称:</td><td>${device.name}</td></tr>
                        <tr><td>类型:</td><td>${device.type}</td></tr>
                        <tr><td>端口:</td><td>${device.port}</td></tr>
                        <tr><td>波特率:</td><td>${device.baud_rate}</td></tr>
                        <tr><td>状态:</td><td><span class="status-${device.status}">${this.getStatusText(device.status)}</span></td></tr>
                        <tr><td>连接状态:</td><td>${device.is_connected ? '已连接' : '未连接'}</td></tr>
                        <tr><td>最后连接:</td><td>${device.last_connection ? new Date(device.last_connection).toLocaleString() : '从未连接'}</td></tr>
                        <tr><td>校准日期:</td><td>${device.calibration_date ? new Date(device.calibration_date).toLocaleString() : '未校准'}</td></tr>
                    </table>
                    
                    ${Object.keys(metadata).length > 0 ? `
                        <h4>设备元数据</h4>
                        <pre class="device-metadata">${JSON.stringify(metadata, null, 2)}</pre>
                    ` : ''}
                    
                    <div class="device-actions">
                        <button class="btn btn-primary" onclick="DeviceManager.showCalibrationHistory(${deviceId})">
                            校准历史
                        </button>
                        <button class="btn btn-info" onclick="DeviceManager.loadDeviceLogs(${deviceId})">
                            查看日志
                        </button>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: false,
            size: 'large'
        });
    },
    
    // 显示校准历史
    async showCalibrationHistory(deviceId) {
        try {
            const response = await this.apiRequest(`/api/devices/${deviceId}/calibrations`, {
                method: 'GET'
            });
            
            if (response.success) {
                const calibrations = response.calibrations || [];
                
                const calibrationHistory = calibrations.map(cal => `
                    <div class="calibration-record">
                        <h5>${cal.calibration_type} 校准</h5>
                        <p><strong>执行者:</strong> ${cal.performed_by_name || 'Unknown'}</p>
                        <p><strong>执行时间:</strong> ${new Date(cal.performed_at).toLocaleString()}</p>
                        <p><strong>状态:</strong> <span class="status-${cal.status}">${cal.status}</span></p>
                        ${cal.next_due_date ? `<p><strong>下次到期:</strong> ${new Date(cal.next_due_date).toLocaleString()}</p>` : ''}
                        ${cal.notes ? `<p><strong>备注:</strong> ${cal.notes}</p>` : ''}
                        <details>
                            <summary>校准参数</summary>
                            <pre>${JSON.stringify(cal.parameters, null, 2)}</pre>
                        </details>
                    </div>
                `).join('');
                
                UI.showModal({
                    title: '校准历史',
                    content: `
                        <div class="calibration-history">
                            ${calibrationHistory || '<p>暂无校准记录</p>'}
                        </div>
                    `,
                    showConfirmButton: false,
                    showCancelButton: false
                });
            } else {
                throw new Error(response.message || '获取校准历史失败');
            }
            
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'calibration_history_load_failed', {
                deviceId: deviceId,
                functionName: 'showCalibrationHistory'
            });
            
            console.error('获取校准历史失败:', errorInfo.message);
            UI.showError(errorInfo.userMessage);
        }
    },
    
    // 加载设备日志
    async loadDeviceLogs(deviceId = null) {
        try {
            const url = deviceId ? `/api/devices/${deviceId}/logs` : '/api/devices/1/logs'; // 默认加载第一个设备的日志
            const levelFilter = document.getElementById('device-log-filter')?.value || '';
            
            const params = new URLSearchParams();
            if (levelFilter) params.append('level', levelFilter);
            
            const response = await this.apiRequest(`${url}?${params}`, {
                method: 'GET'
            });
            
            if (response.success) {
                this.deviceLogs = response.logs || [];
                this.updateDeviceLogsDisplay();
            } else {
                throw new Error(response.message || '获取设备日志失败');
            }
            
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'device_logs_load_failed', {
                deviceId: deviceId,
                levelFilter: levelFilter,
                functionName: 'loadDeviceLogs'
            });
            
            console.error('获取设备日志失败:', errorInfo.message);
            if (deviceId === null) {
                UI.showError(errorInfo.userMessage);
            }
        }
    },
    
    // 更新设备日志显示
    updateDeviceLogsDisplay() {
        const logsContainer = document.getElementById('device-logs-container');
        if (!logsContainer) return;
        
        const logItems = this.deviceLogs.map(log => `
            <div class="device-log-item log-${log.level}">
                <div class="log-header">
                    <span class="log-time">${new Date(log.timestamp).toLocaleString()}</span>
                    <span class="log-level level-${log.level}">${log.level}</span>
                    <span class="log-user">${log.user_name || 'System'}</span>
                </div>
                <div class="log-message">${log.message}</div>
                ${log.details ? `<details><summary>详细信息</summary><pre>${JSON.stringify(log.details, null, 2)}</pre></details>` : ''}
            </div>
        `).join('');
        
        logsContainer.innerHTML = logItems || '<p>暂无设备日志</p>';
    },
    
    // 刷新设备列表
    async refreshDevices() {
        await this.loadDevices();
        UI.showSuccess('设备列表已刷新');
    },
    
    // 获取状态文本
    getStatusText(status) {
        const statusMap = {
            'online': '在线',
            'offline': '离线',
            'connected': '已连接',
            'disconnected': '已断开',
            'error': '错误',
            'calibrating': '校准中',
            'maintaining': '维护中'
        };
        return statusMap[status] || status;
    },
    
    // 设置定期检查
    setupPeriodicChecks() {
        // 每30秒检查一次设备状态
        setInterval(() => {
            if (this.isInitialized) {
                this.loadDevices();
            }
        }, 30000);
    },
    
    // API请求辅助方法
    async apiRequest(url, options = {}) {
        const sessionId = Auth?.getSessionId();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (sessionId) {
            headers['x-session-id'] = sessionId;
        }
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        return await response.json();
    },
    
    // 获取系统信息
    getSystemInfo() {
        return {
            name: '设备管理模块',
            version: '1.0.0',
            status: this.isInitialized ? 'active' : 'inactive',
            deviceCount: this.devices.length,
            connectedDevices: this.devices.filter(d => d.is_connected).length,
            features: [
                '设备配置管理',
                '设备连接/断开',
                '设备校准管理',
                '设备状态监控',
                '设备日志记录'
            ]
        };
    }
};

console.log('设备管理模块已加载');