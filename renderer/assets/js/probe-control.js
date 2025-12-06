/**
 * 探头控制系统前端模块
 * Probe Control System Frontend Module
 */

class ProbeControl {
    constructor() {
        this.isInitialized = false;
        this.isMoving = false;
        this.currentPosition = { x: 0, y: 0, z: 0 };
        this.motionStatus = {};
        this.updateInterval = null;
        
        this.init();
    }

    /**
     * 初始化
     */
    init() {
        console.log('初始化探头控制系统...');
        this.setupEventListeners();
        this.createUI();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听窗口加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.load());
        } else {
            this.load();
        }
    }

    /**
     * 加载
     */
    async load() {
        try {
            // 初始化探头控制系统
            await this.initialize();
            
            // 开始定期更新状态
            this.startStatusUpdate();
            
            console.log('探头控制系统加载完成');
        } catch (error) {
            console.error('探头控制系统加载失败:', error);
            this.showError('系统加载失败: ' + error.message);
        }
    }

    /**
     * 初始化探头控制系统
     */
    async initialize() {
        try {
            const response = await fetch('/api/probe/initialize', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isInitialized = true;
                this.updateUI();
                console.log('探头控制系统初始化成功');
            } else {
                throw new Error(result.error || '初始化失败');
            }
        } catch (error) {
            console.error('初始化失败:', error);
            throw error;
        }
    }

    /**
     * 创建UI
     */
    createUI() {
        // 创建探头控制面板
        const panel = this.createControlPanel();
        
        // 添加到主界面
        const targetContainer = this.findTargetContainer();
        if (targetContainer) {
            targetContainer.appendChild(panel);
        }
    }

    /**
     * 创建控制面板
     */
    createControlPanel() {
        const panel = document.createElement('div');
        panel.className = 'probe-control-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>🎯 探头控制系统</h3>
                <div class="status-indicator">
                    <span class="status-dot" id="probeStatusDot"></span>
                    <span id="probeStatusText">未连接</span>
                </div>
            </div>
            
            <div class="panel-content">
                <!-- 当前位置显示 -->
                <div class="section">
                    <h4>当前位置</h4>
                    <div class="position-display">
                        <div class="coordinate">
                            <label>X:</label>
                            <span id="currentX">0.0</span> mm
                        </div>
                        <div class="coordinate">
                            <label>Y:</label>
                            <span id="currentY">0.0</span> mm
                        </div>
                        <div class="coordinate">
                            <label>Z:</label>
                            <span id="currentZ">0.0</span> mm
                        </div>
                    </div>
                </div>
                
                <!-- 运动控制 -->
                <div class="section">
                    <h4>运动控制</h4>
                    <div class="move-controls">
                        <!-- 绝对位置移动 -->
                        <div class="control-group">
                            <label>绝对位置移动 (mm)</label>
                            <div class="input-group">
                                <input type="number" id="targetX" placeholder="X坐标" step="0.1" min="0" max="1000">
                                <input type="number" id="targetY" placeholder="Y坐标" step="0.1" min="0" max="800">
                                <input type="number" id="targetZ" placeholder="Z坐标" step="0.1" min="0" max="500">
                            </div>
                            <button id="moveToBtn" class="btn btn-primary">移动到位置</button>
                        </div>
                        
                        <!-- 相对移动 -->
                        <div class="control-group">
                            <label>相对移动 (mm)</label>
                            <div class="input-group">
                                <input type="number" id="deltaX" placeholder="ΔX" step="0.1" value="10">
                                <input type="number" id="deltaY" placeholder="ΔY" step="0.1" value="0">
                                <input type="number" id="deltaZ" placeholder="ΔZ" step="0.1" value="0">
                            </div>
                            <button id="moveRelativeBtn" class="btn btn-secondary">相对移动</button>
                        </div>
                        
                        <!-- 预设位置 -->
                        <div class="control-group">
                            <label>预设位置</label>
                            <div class="preset-buttons">
                                <button class="btn btn-outline preset-btn" data-pos="home">_home_</button>
                                <button class="btn btn-outline preset-btn" data-pos="center">_center_</button>
                                <button class="btn btn-outline preset-btn" data-pos="edge">_edge_</button>
                            </div>
                        </div>
                        
                        <!-- 运动控制按钮 -->
                        <div class="control-group">
                            <div class="control-buttons">
                                <button id="pauseBtn" class="btn btn-warning" disabled>暂停</button>
                                <button id="resumeBtn" class="btn btn-success" disabled>恢复</button>
                                <button id="cancelBtn" class="btn btn-danger" disabled>取消</button>
                                <button id="emergencyBtn" class="btn btn-danger emergency">紧急停止</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 运动状态 -->
                <div class="section">
                    <h4>运动状态</h4>
                    <div class="motion-status">
                        <div class="status-item">
                            <label>状态:</label>
                            <span id="motionState">空闲</span>
                        </div>
                        <div class="status-item">
                            <label>进度:</label>
                            <div class="progress-bar">
                                <div class="progress-fill" id="motionProgress"></div>
                            </div>
                            <span id="progressText">0%</span>
                        </div>
                        <div class="status-item">
                            <label>预估时间:</label>
                            <span id="estimatedTime">-</span>
                        </div>
                    </div>
                </div>
                
                <!-- 系统配置 -->
                <div class="section">
                    <h4>系统配置</h4>
                    <div class="config-controls">
                        <button id="configBtn" class="btn btn-info">查看配置</button>
                        <button id="resetBtn" class="btn btn-outline">重置位置</button>
                        <button id="historyBtn" class="btn btn-outline">操作历史</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addStyles();
        
        // 绑定事件
        this.bindEvents(panel);
        
        return panel;
    }

    /**
     * 添加样式
     */
    addStyles() {
        if (document.getElementById('probeControlStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'probeControlStyles';
        style.textContent = `
            .probe-control-panel {
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin: 20px 0;
                overflow: hidden;
            }
            
            .panel-header {
                background: #2c3e50;
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .panel-header h3 {
                margin: 0;
                font-size: 18px;
            }
            
            .status-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .status-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #e74c3c;
                display: inline-block;
            }
            
            .status-dot.connected {
                background: #27ae60;
            }
            
            .panel-content {
                padding: 20px;
            }
            
            .section {
                margin-bottom: 25px;
                border-bottom: 1px solid #eee;
                padding-bottom: 20px;
            }
            
            .section:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            
            .section h4 {
                margin: 0 0 15px 0;
                color: #2c3e50;
                font-size: 16px;
                font-weight: 600;
            }
            
            .position-display {
                display: flex;
                gap: 20px;
            }
            
            .coordinate {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 4px;
                min-width: 120px;
            }
            
            .coordinate label {
                font-weight: 600;
                color: #2c3e50;
                min-width: 20px;
            }
            
            .coordinate span {
                font-family: 'Courier New', monospace;
                font-weight: bold;
                color: #e74c3c;
            }
            
            .control-group {
                margin-bottom: 15px;
            }
            
            .control-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #2c3e50;
            }
            
            .input-group {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
            }
            
            .input-group input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .preset-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .preset-btn {
                font-size: 12px;
                padding: 6px 12px;
            }
            
            .control-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }
            
            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .btn-primary {
                background: #3498db;
                color: white;
            }
            
            .btn-primary:hover:not(:disabled) {
                background: #2980b9;
            }
            
            .btn-secondary {
                background: #95a5a6;
                color: white;
            }
            
            .btn-secondary:hover:not(:disabled) {
                background: #7f8c8d;
            }
            
            .btn-warning {
                background: #f39c12;
                color: white;
            }
            
            .btn-warning:hover:not(:disabled) {
                background: #e67e22;
            }
            
            .btn-success {
                background: #27ae60;
                color: white;
            }
            
            .btn-success:hover:not(:disabled) {
                background: #229954;
            }
            
            .btn-danger {
                background: #e74c3c;
                color: white;
            }
            
            .btn-danger:hover:not(:disabled) {
                background: #c0392b;
            }
            
            .btn-danger.emergency {
                background: #c0392b;
                font-weight: bold;
            }
            
            .btn-info {
                background: #9b59b6;
                color: white;
            }
            
            .btn-info:hover:not(:disabled) {
                background: #8e44ad;
            }
            
            .btn-outline {
                background: transparent;
                border: 1px solid #bdc3c7;
                color: #7f8c8d;
            }
            
            .btn-outline:hover:not(:disabled) {
                background: #ecf0f1;
                border-color: #95a5a6;
            }
            
            .motion-status {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .status-item {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .status-item label {
                min-width: 80px;
                font-weight: 600;
                color: #2c3e50;
            }
            
            .progress-bar {
                flex: 1;
                height: 20px;
                background: #ecf0f1;
                border-radius: 10px;
                overflow: hidden;
                position: relative;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3498db, #2980b9);
                width: 0%;
                transition: width 0.3s ease;
            }
            
            #progressText {
                min-width: 40px;
                text-align: right;
                font-weight: 600;
                color: #7f8c8d;
            }
            
            .config-controls {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            @media (max-width: 768px) {
                .position-display {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .input-group {
                    flex-direction: column;
                }
                
                .control-buttons {
                    flex-direction: column;
                }
                
                .preset-buttons {
                    justify-content: center;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 绑定事件
     */
    bindEvents(panel) {
        // 移动到位置
        panel.querySelector('#moveToBtn').addEventListener('click', () => {
            this.moveToPosition();
        });
        
        // 相对移动
        panel.querySelector('#moveRelativeBtn').addEventListener('click', () => {
            this.moveRelative();
        });
        
        // 预设位置
        panel.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.moveToPreset(e.target.dataset.pos);
            });
        });
        
        // 运动控制按钮
        panel.querySelector('#pauseBtn').addEventListener('click', () => this.pauseMotion());
        panel.querySelector('#resumeBtn').addEventListener('click', () => this.resumeMotion());
        panel.querySelector('#cancelBtn').addEventListener('click', () => this.cancelMotion());
        panel.querySelector('#emergencyBtn').addEventListener('click', () => this.emergencyStop());
        
        // 系统操作按钮
        panel.querySelector('#configBtn').addEventListener('click', () => this.showConfig());
        panel.querySelector('#resetBtn').addEventListener('click', () => this.resetPosition());
        panel.querySelector('#historyBtn').addEventListener('click', () => this.showHistory());
        
        // 回车键移动
        ['targetX', 'targetY', 'targetZ', 'deltaX', 'deltaY', 'deltaZ'].forEach(id => {
            const input = panel.querySelector(`#${id}`);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        if (id.startsWith('target')) {
                            this.moveToPosition();
                        } else {
                            this.moveRelative();
                        }
                    }
                });
            }
        });
    }

    /**
     * 移动到位置
     */
    async moveToPosition() {
        try {
            const x = parseFloat(document.getElementById('targetX').value);
            const y = parseFloat(document.getElementById('targetY').value);
            const z = parseFloat(document.getElementById('targetZ').value);
            
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                this.showError('请输入有效的坐标值');
                return;
            }
            
            const position = { x, y, z };
            
            // 在发送移动命令前验证位置配置
            const validationResult = await this.validatePositionBeforeMove(position);
            if (!validationResult.valid) {
                this.showError('位置验证失败: ' + validationResult.errors.join(', '));
                return;
            }
            
            // 如果有警告，显示但不阻止执行
            if (validationResult.warnings && validationResult.warnings.length > 0) {
                console.warn('位置警告:', validationResult.warnings);
            }
            
            const response = await fetch('/api/probe/move-to', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    position: position,
                    options: { speed: 20 }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isMoving = true;
                this.updateUI();
                this.showSuccess('运动命令已发送');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('移动到位置失败:', error);
            this.showError('移动失败: ' + error.message);
        }
    }

    /**
     * 相对移动
     */
    async moveRelative() {
        try {
            const deltaX = parseFloat(document.getElementById('deltaX').value) || 0;
            const deltaY = parseFloat(document.getElementById('deltaY').value) || 0;
            const deltaZ = parseFloat(document.getElementById('deltaZ').value) || 0;
            
            // 计算目标位置
            const targetPosition = {
                x: this.currentPosition.x + deltaX,
                y: this.currentPosition.y + deltaY,
                z: this.currentPosition.z + deltaZ
            };
            
            const response = await fetch('/api/probe/move-to', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    position: targetPosition,
                    options: { speed: 10 }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isMoving = true;
                this.updateUI();
                this.showSuccess('相对移动命令已发送');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('相对移动失败:', error);
            this.showError('相对移动失败: ' + error.message);
        }
    }

    /**
     * 移动到预设位置
     */
    async moveToPreset(preset) {
        const presets = {
            home: { x: 0, y: 0, z: 0 },
            center: { x: 500, y: 400, z: 250 },
            edge: { x: 1000, y: 800, z: 500 }
        };
        
        const position = presets[preset];
        if (!position) return;
        
        // 更新输入框
        document.getElementById('targetX').value = position.x;
        document.getElementById('targetY').value = position.y;
        document.getElementById('targetZ').value = position.z;
        
        // 执行移动
        await this.moveToPosition();
    }

    /**
     * 暂停运动
     */
    async pauseMotion() {
        try {
            const response = await fetch('/api/probe/pause', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.updateUI();
                this.showSuccess('运动已暂停');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('暂停运动失败:', error);
            this.showError('暂停失败: ' + error.message);
        }
    }

    /**
     * 恢复运动
     */
    async resumeMotion() {
        try {
            const response = await fetch('/api/probe/resume', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isMoving = true;
                this.updateUI();
                this.showSuccess('运动已恢复');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('恢复运动失败:', error);
            this.showError('恢复失败: ' + error.message);
        }
    }

    /**
     * 取消运动
     */
    async cancelMotion() {
        try {
            const response = await fetch('/api/probe/cancel', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isMoving = false;
                this.updateUI();
                this.showSuccess('运动已取消');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('取消运动失败:', error);
            this.showError('取消失败: ' + error.message);
        }
    }

    /**
     * 紧急停止
     */
    async emergencyStop() {
        if (!confirm('确认要执行紧急停止吗？这会立即停止所有运动。')) {
            return;
        }
        
        try {
            const response = await fetch('/api/probe/emergency-stop', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ reason: 'manual_emergency' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isMoving = false;
                this.updateUI();
                this.showSuccess('紧急停止已执行');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('紧急停止失败:', error);
            this.showError('紧急停止失败: ' + error.message);
        }
    }

    /**
     * 重置位置
     */
    async resetPosition() {
        try {
            const response = await fetch('/api/probe/reset', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('位置已重置');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('重置位置失败:', error);
            this.showError('重置失败: ' + error.message);
        }
    }

    /**
     * 开始状态更新
     */
    startStatusUpdate() {
        this.updateInterval = setInterval(() => {
            this.updateStatus();
        }, 1000);
    }

    /**
     * 更新状态
     */
    async updateStatus() {
        try {
            // 获取当前位置
            const positionResponse = await fetch('/api/probe/position', {
                headers: this.getAuthHeaders()
            });
            const positionResult = await positionResponse.json();
            
            if (positionResult.success) {
                this.currentPosition = positionResult.data.position;
            }
            
            // 获取运动状态
            const statusResponse = await fetch('/api/probe/status', {
                headers: this.getAuthHeaders()
            });
            const statusResult = await statusResponse.json();
            
            if (statusResult.success) {
                this.motionStatus = statusResult.data;
                this.isMoving = statusResult.data.moving;
            }
            
            this.updateUI();
            
        } catch (error) {
            console.error('更新状态失败:', error);
        }
    }

    /**
     * 更新UI
     */
    updateUI() {
        // 更新连接状态
        const statusDot = document.getElementById('probeStatusDot');
        const statusText = document.getElementById('probeStatusText');
        
        if (this.isInitialized) {
            statusDot.classList.add('connected');
            statusText.textContent = '已连接';
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = '未连接';
        }
        
        // 更新位置显示
        document.getElementById('currentX').textContent = this.currentPosition.x.toFixed(1);
        document.getElementById('currentY').textContent = this.currentPosition.y.toFixed(1);
        document.getElementById('currentZ').textContent = this.currentPosition.z.toFixed(1);
        
        // 更新运动状态
        document.getElementById('motionState').textContent = this.isMoving ? '运动中' : '空闲';
        
        // 更新进度
        const progress = this.motionStatus.progress || 0;
        document.getElementById('motionProgress').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
        
        // 更新预估时间
        const estimatedTime = this.motionStatus.estimatedTime || 0;
        document.getElementById('estimatedTime').textContent = estimatedTime > 0 ? `${estimatedTime.toFixed(1)}s` : '-';
        
        // 更新按钮状态
        const pauseBtn = document.getElementById('pauseBtn');
        const resumeBtn = document.getElementById('resumeBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        pauseBtn.disabled = !this.isMoving;
        resumeBtn.disabled = !this.motionStatus.paused;
        cancelBtn.disabled = !this.isMoving && !this.motionStatus.paused;
    }

    /**
     * 显示配置
     */
    async showConfig() {
        try {
            // 获取当前配置
            const response = await fetch('/api/probe/config', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showConfigurationDialog(result.data);
            } else {
                throw new Error(result.error || '获取配置失败');
            }
        } catch (error) {
            console.error('显示配置失败:', error);
            this.showError('获取配置失败: ' + error.message);
        }
    }

    /**
     * 显示配置对话框
     */
    showConfigurationDialog(configData) {
        const { config, stats, version } = configData;
        
        // 创建配置对话框
        const dialog = this.createConfigDialog(config, stats, version);
        
        // 添加到页面
        document.body.appendChild(dialog);
        
        // 显示对话框
        this.showDialog(dialog);
    }

    /**
     * 创建配置对话框
     */
    createConfigDialog(config, stats, version) {
        const dialog = document.createElement('div');
        dialog.className = 'config-dialog-overlay';
        
        dialog.innerHTML = `
            <div class="config-dialog">
                <div class="config-header">
                    <h2>🎯 探头控制配置管理</h2>
                    <button class="close-btn" id="configCloseBtn">&times;</button>
                </div>
                
                <div class="config-content">
                    <!-- 配置查看部分 -->
                    <div class="config-section">
                        <h3>当前配置</h3>
                        <div class="config-display">
                            <div class="config-group">
                                <h4>工作区域范围 (mm)</h4>
                                <div class="config-grid">
                                    <div class="config-item">
                                        <label>X轴:</label>
                                        <span>${config.workArea.x.min} ~ ${config.workArea.x.max}</span>
                                    </div>
                                    <div class="config-item">
                                        <label>Y轴:</label>
                                        <span>${config.workArea.y.min} ~ ${config.workArea.y.max}</span>
                                    </div>
                                    <div class="config-item">
                                        <label>Z轴:</label>
                                        <span>${config.workArea.z.min} ~ ${config.workArea.z.max}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="config-group">
                                <h4>速度配置 (mm/s)</h4>
                                <div class="config-grid">
                                    <div class="config-item">
                                        <label>最大速度:</label>
                                        <span>${config.speed.max}</span>
                                    </div>
                                    <div class="config-item">
                                        <label>正常速度:</label>
                                        <span>${config.speed.normal}</span>
                                    </div>
                                    <div class="config-item">
                                        <label>慢速:</label>
                                        <span>${config.speed.slow}</span>
                                    </div>
                                    <div class="config-item">
                                        <label>接近速度:</label>
                                        <span>${config.speed.approach}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="config-group">
                                <h4>精度要求</h4>
                                <div class="config-grid">
                                    <div class="config-item">
                                        <label>位置精度:</label>
                                        <span>±${config.accuracy.positional} mm</span>
                                    </div>
                                    <div class="config-item">
                                        <label>角度精度:</label>
                                        <span>±${config.accuracy.angular}°</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="config-group">
                                <h4>安全参数</h4>
                                <div class="config-grid">
                                    <div class="config-item">
                                        <label>紧急停止超时:</label>
                                        <span>${config.safety.emergencyStopTimeout} ms</span>
                                    </div>
                                    <div class="config-item">
                                        <label>看门狗超时:</label>
                                        <span>${config.safety.watchdogTimeout} ms</span>
                                    </div>
                                    <div class="config-item">
                                        <label>最大安全力:</label>
                                        <span>${config.safety.maxSafeForce} N</span>
                                    </div>
                                    <div class="config-item">
                                        <label>碰撞阈值:</label>
                                        <span>${config.safety.collisionThreshold} mm</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="config-group">
                                <h4>系统统计</h4>
                                <div class="config-grid">
                                    <div class="config-item">
                                        <label>总运动次数:</label>
                                        <span>${stats.totalMovements}</span>
                                    </div>
                                    <div class="config-item">
                                        <label>总距离:</label>
                                        <span>${stats.totalDistance.toFixed(2)} mm</span>
                                    </div>
                                    <div class="config-item">
                                        <label>平均速度:</label>
                                        <span>${stats.averageSpeed.toFixed(2)} mm/s</span>
                                    </div>
                                    <div class="config-item">
                                        <label>紧急停止次数:</label>
                                        <span>${stats.emergencyStops}</span>
                                    </div>
                                    <div class="config-item">
                                        <label>错误次数:</label>
                                        <span>${stats.errors}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 配置编辑部分 -->
                    <div class="config-section">
                        <h3>配置编辑</h3>
                        <div class="config-edit-form">
                            <form id="configEditForm">
                                <div class="form-group">
                                    <h4>工作区域设置</h4>
                                    <div class="form-row">
                                        <div class="form-field field-tooltip" data-tooltip="工作区域X轴的最小边界值，不能为负数">
                                            <label>X轴最小值:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="workArea_x_min" value="${config.workArea.x.min}" step="0.1" min="0">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                        <div class="form-field field-tooltip" data-tooltip="工作区域X轴的最大边界值">
                                            <label>X轴最大值:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="workArea_x_max" value="${config.workArea.x.max}" step="0.1" min="0">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-field field-tooltip" data-tooltip="工作区域Y轴的最小边界值，不能为负数">
                                            <label>Y轴最小值:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="workArea_y_min" value="${config.workArea.y.min}" step="0.1" min="0">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                        <div class="form-field field-tooltip" data-tooltip="工作区域Y轴的最大边界值">
                                            <label>Y轴最大值:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="workArea_y_max" value="${config.workArea.y.max}" step="0.1" min="0">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-field field-tooltip" data-tooltip="工作区域Z轴的最小边界值，不能为负数">
                                            <label>Z轴最小值:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="workArea_z_min" value="${config.workArea.z.min}" step="0.1" min="0">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                        <div class="form-field field-tooltip" data-tooltip="工作区域Z轴的最大边界值">
                                            <label>Z轴最大值:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="workArea_z_max" value="${config.workArea.z.max}" step="0.1" min="0">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <h4>速度设置 <small style="color: #7f8c8d; font-weight: normal;">(mm/s)</small></h4>
                                    <div class="form-row">
                                        <div class="form-field field-tooltip" data-tooltip="设备能承受的最大运动速度">
                                            <label>最大速度:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="speed_max" value="${config.speed.max}" step="0.1" min="0.1">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                        <div class="form-field field-tooltip" data-tooltip="常规操作时的运动速度">
                                            <label>正常速度:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="speed_normal" value="${config.speed.normal}" step="0.1" min="0.1">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-field field-tooltip" data-tooltip="精确定位时的慢速运动">
                                            <label>慢速:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="speed_slow" value="${config.speed.slow}" step="0.1" min="0.1">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                        <div class="form-field field-tooltip" data-tooltip="接近目标位置时的最终速度">
                                            <label>接近速度:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="speed_approach" value="${config.speed.approach}" step="0.1" min="0.1">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <h4>精度设置</h4>
                                    <div class="form-row">
                                        <div class="form-field field-tooltip" data-tooltip="位置控制的精度要求">
                                            <label>位置精度 (mm):</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="accuracy_positional" value="${config.accuracy.positional}" step="0.01" min="0.01">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                        <div class="form-field field-tooltip" data-tooltip="角度控制的精度要求">
                                            <label>角度精度 (度):</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="accuracy_angular" value="${config.accuracy.angular}" step="0.1" min="0.1">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <h4>加速度设置 <small style="color: #7f8c8d; font-weight: normal;">(mm/s²)</small></h4>
                                    <div class="form-row">
                                        <div class="form-field field-tooltip" data-tooltip="设备能承受的最大加速度">
                                            <label>最大加速度:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="acceleration_max" value="${config.acceleration.max}" step="0.1" min="0.1">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                        <div class="form-field field-tooltip" data-tooltip="常规操作的加速度">
                                            <label>正常加速度:</label>
                                            <div class="input-with-indicator">
                                                <input type="number" name="acceleration_normal" value="${config.acceleration.normal}" step="0.1" min="0.1">
                                                <span class="validation-indicator"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <div class="config-footer">
                    <div class="config-actions">
                        <button id="configCancelBtn" class="btn btn-secondary">取消</button>
                        <button id="configResetBtn" class="btn btn-outline">重置为默认值</button>
                        <button id="configSaveBtn" class="btn btn-primary">保存配置</button>
                    </div>
                    <div class="config-message" id="configMessage"></div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addConfigDialogStyles();
        
        // 绑定事件
        this.bindConfigDialogEvents(dialog);
        
        return dialog;
    }

    /**
     * 添加配置对话框样式
     */
    addConfigDialogStyles() {
        if (document.getElementById('configDialogStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'configDialogStyles';
        style.textContent = `
            .config-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .config-dialog-overlay.show {
                opacity: 1;
            }
            
            .config-dialog {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-width: 90vw;
                max-height: 90vh;
                width: 1000px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            
            .config-dialog-overlay.show .config-dialog {
                transform: scale(1);
            }
            
            .config-header {
                background: #2c3e50;
                color: white;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .config-header h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
            }
            
            .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }
            
            .close-btn:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }
            
            .config-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            
            .config-section {
                margin-bottom: 30px;
            }
            
            .config-section h3 {
                margin: 0 0 15px 0;
                color: #2c3e50;
                font-size: 18px;
                font-weight: 600;
                border-bottom: 2px solid #3498db;
                padding-bottom: 8px;
            }
            
            .config-group {
                margin-bottom: 20px;
            }
            
            .config-group h4 {
                margin: 0 0 10px 0;
                color: #34495e;
                font-size: 14px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .config-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
            }
            
            .config-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                background: #f8f9fa;
                border-radius: 6px;
                border-left: 3px solid #3498db;
            }
            
            .config-item label {
                font-weight: 600;
                color: #2c3e50;
                font-size: 13px;
            }
            
            .config-item span {
                font-family: 'Courier New', monospace;
                font-weight: bold;
                color: #e74c3c;
                font-size: 13px;
            }
            
            .form-group {
                margin-bottom: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            
            .form-group h4 {
                margin: 0 0 15px 0;
                color: #2c3e50;
                font-size: 16px;
                font-weight: 600;
            }
            
            .form-row {
                display: flex;
                gap: 15px;
                margin-bottom: 10px;
            }
            
            .form-row:last-child {
                margin-bottom: 0;
            }
            
            .form-field {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .form-field label {
                font-weight: 600;
                color: #2c3e50;
                font-size: 13px;
            }
            
            .form-field input {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                transition: border-color 0.2s;
            }
            
            .form-field input:focus {
                outline: none;
                border-color: #3498db;
                box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
            }
            
            .form-field input.error {
                border-color: #e74c3c;
                background-color: #fdf2f2;
            }
            
            .config-footer {
                background: #f8f9fa;
                padding: 20px;
                border-top: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 20px;
            }
            
            .config-actions {
                display: flex;
                gap: 10px;
            }
            
            .config-message {
                flex: 1;
                text-align: right;
                font-weight: 600;
                min-height: 20px;
            }
            
            .config-message.success {
                color: #27ae60;
            }
            
            .config-message.error {
                color: #e74c3c;
            }
            
            .config-message.warning {
                color: #f39c12;
            }
            
            .validation-error {
                color: #e74c3c;
                font-size: 12px;
                margin-top: 2px;
                display: none;
            }
            
            .form-field.error .validation-error {
                display: block;
            }
            
            .form-field.validation-warning {
                border-left: 3px solid #f39c12;
                background-color: #fefbf3;
            }
            
            .form-field.validation-success {
                border-left: 3px solid #27ae60;
                background-color: #f0fdf4;
            }
            
            .validation-warning .form-field input,
            .validation-success .form-field input {
                border-color: transparent;
            }
            
            .field-tooltip {
                position: relative;
                cursor: help;
            }
            
            .field-tooltip::after {
                content: attr(data-tooltip);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: #2c3e50;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
                z-index: 1000;
            }
            
            .field-tooltip:hover::after {
                opacity: 1;
            }
            
            .validation-indicator {
                display: inline-block;
                width: 16px;
                height: 16px;
                margin-left: 5px;
                vertical-align: middle;
                border-radius: 50%;
                font-size: 10px;
                text-align: center;
                line-height: 16px;
                font-weight: bold;
                color: white;
            }
            
            .validation-indicator.success {
                background-color: #27ae60;
                content: '✓';
            }
            
            .validation-indicator.error {
                background-color: #e74c3c;
                content: '✗';
            }
            
            .validation-indicator.warning {
                background-color: #f39c12;
                content: '!';
            }
            
            .input-with-indicator {
                position: relative;
                display: flex;
                align-items: center;
            }
            
            .input-with-indicator input {
                flex: 1;
                padding-right: 25px;
            }
            
            .validation-indicator {
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .form-field.has-content .validation-indicator {
                opacity: 1;
            }
            
            .form-field.validation-success .validation-indicator {
                background-color: #27ae60;
                color: white;
            }
            
            .form-field.validation-success .validation-indicator::before {
                content: '✓';
            }
            
            .form-field.error .validation-indicator,
            .form-field.validation-error .validation-indicator {
                background-color: #e74c3c;
                color: white;
            }
            
            .form-field.error .validation-indicator::before,
            .form-field.validation-error .validation-indicator::before {
                content: '✗';
            }
            
            .form-field.validation-warning .validation-indicator {
                background-color: #f39c12;
                color: white;
            }
            
            .form-field.validation-warning .validation-indicator::before {
                content: '!';
            }
            
            .config-validation-summary {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 10px;
                margin-top: 10px;
                font-size: 13px;
            }
            
            .config-validation-summary h5 {
                margin: 0 0 8px 0;
                color: #2c3e50;
                font-size: 14px;
            }
            
            .validation-summary-item {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
                padding: 2px 0;
            }
            
            .validation-summary-item:last-child {
                margin-bottom: 0;
            }
            
            .validation-summary-item.success {
                color: #27ae60;
            }
            
            .validation-summary-item.error {
                color: #e74c3c;
            }
            
            .validation-summary-item.warning {
                color: #f39c12;
            }
            
            .validation-summary-icon {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                color: white;
            }
            
            .validation-summary-item.success .validation-summary-icon {
                background-color: #27ae60;
            }
            
            .validation-summary-item.error .validation-summary-icon {
                background-color: #e74c3c;
            }
            
            .validation-summary-item.warning .validation-summary-icon {
                background-color: #f39c12;
            }
            
            @media (max-width: 768px) {
                .config-dialog {
                    width: 95vw;
                    margin: 10px;
                }
                
                .form-row {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .config-grid {
                    grid-template-columns: 1fr;
                }
                
                .config-footer {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .config-actions {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 绑定配置对话框事件
     */
    bindConfigDialogEvents(dialog) {
        // 关闭按钮
        dialog.querySelector('#configCloseBtn').addEventListener('click', () => {
            this.hideDialog(dialog);
        });
        
        // 取消按钮
        dialog.querySelector('#configCancelBtn').addEventListener('click', () => {
            this.hideDialog(dialog);
        });
        
        // 重置按钮
        dialog.querySelector('#configResetBtn').addEventListener('click', () => {
            this.resetConfigForm(dialog);
        });
        
        // 保存按钮
        dialog.querySelector('#configSaveBtn').addEventListener('click', () => {
            this.saveConfiguration(dialog);
        });
        
        // 表单验证
        const form = dialog.querySelector('#configEditForm');
        form.addEventListener('input', (e) => {
            this.validateConfigField(e.target, dialog);
        });
        
        // 实时配置验证
        let validationTimeout;
        form.addEventListener('input', (e) => {
            clearTimeout(validationTimeout);
            validationTimeout = setTimeout(async () => {
                if (e.target.type === 'number') {
                    await this.performRealTimeValidation(dialog);
                }
            }, 500); // 500ms延迟，避免过于频繁的验证请求
        });
        
        // 点击外部关闭
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this.hideDialog(dialog);
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dialog.classList.contains('show')) {
                this.hideDialog(dialog);
            }
        });
    }

    /**
     * 显示对话框
     */
    showDialog(dialog) {
        dialog.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    /**
     * 隐藏对话框
     */
    hideDialog(dialog) {
        dialog.classList.remove('show');
        document.body.style.overflow = '';
        
        setTimeout(() => {
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        }, 300);
    }

    /**
     * 验证配置字段
     */
    validateConfigField(field, dialog = null) {
        const formField = field.closest('.form-field');
        const value = parseFloat(field.value);
        const name = field.name;
        
        // 清除之前的错误状态
        formField.classList.remove('error', 'validation-error', 'validation-warning', 'validation-success');
        field.classList.remove('error');
        
        // 检查字段是否有内容
        if (field.value.trim() !== '') {
            formField.classList.add('has-content');
        } else {
            formField.classList.remove('has-content');
        }
        
        // 空值验证
        if (field.value.trim() === '') {
            this.setFieldError(formField, field, '此字段不能为空');
            return false;
        }
        
        // 基本数值验证
        if (isNaN(value) || !isFinite(value)) {
            this.setFieldError(formField, field, '请输入有效的数字');
            return false;
        }
        
        // 特定字段验证
        const validationRules = {
            'workArea_x_min': { min: 0, max: 999999 },
            'workArea_x_max': { min: 1, max: 1000000 },
            'workArea_y_min': { min: 0, max: 999999 },
            'workArea_y_max': { min: 1, max: 1000000 },
            'workArea_z_min': { min: 0, max: 999999 },
            'workArea_z_max': { min: 1, max: 1000000 },
            'speed_max': { min: 0.1, max: 1000 },
            'speed_normal': { min: 0.1, max: 500 },
            'speed_slow': { min: 0.1, max: 100 },
            'speed_approach': { min: 0.1, max: 50 },
            'accuracy_positional': { min: 0.01, max: 10 },
            'accuracy_angular': { min: 0.1, max: 90 },
            'acceleration_max': { min: 0.1, max: 2000 },
            'acceleration_normal': { min: 0.1, max: 1000 }
        };
        
        const rule = validationRules[name];
        if (rule) {
            if (value < rule.min) {
                this.setFieldError(formField, field, `值不能小于 ${rule.min}`);
                return false;
            }
            if (value > rule.max) {
                this.setFieldError(formField, field, `值不能大于 ${rule.max}`);
                return false;
            }
        }
        
        // 如果有dialog参数，进行工作区域边界验证
        if (dialog) {
            if (name.includes('workArea_x')) {
                this.validateWorkAreaBounds(dialog.querySelector('#configEditForm'), 'x');
            } else if (name.includes('workArea_y')) {
                this.validateWorkAreaBounds(dialog.querySelector('#configEditForm'), 'y');
            } else if (name.includes('workArea_z')) {
                this.validateWorkAreaBounds(dialog.querySelector('#configEditForm'), 'z');
            }
        }
        
        // 验证成功，显示成功状态
        formField.classList.remove('error');
        formField.classList.add('validation-success');
        
        // 清除错误消息
        const errorElement = formField.querySelector('.validation-error');
        if (errorElement) {
            errorElement.remove();
        }
        
        return true;
    }

    /**
     * 设置字段错误
     */
    setFieldError(formField, field, message) {
        formField.classList.add('error');
        field.classList.add('error');
        
        let errorElement = formField.querySelector('.validation-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'validation-error';
            formField.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }

    /**
     * 验证工作区域边界
     */
    validateWorkAreaBounds(form, axis) {
        const minField = form.querySelector(`input[name="workArea_${axis}_min"]`);
        const maxField = form.querySelector(`input[name="workArea_${axis}_max"]`);
        const minValue = parseFloat(minField.value);
        const maxValue = parseFloat(maxField.value);
        
        const minFormField = minField.closest('.form-field');
        const maxFormField = maxField.closest('.form-field');
        
        // 清除错误状态
        minFormField.classList.remove('error');
        maxFormField.classList.remove('error');
        minField.classList.remove('error');
        maxField.classList.remove('error');
        
        // 验证最小值小于最大值
        if (minValue >= maxValue) {
            this.setFieldError(minFormField, minField, '最小值必须小于最大值');
            this.setFieldError(maxFormField, maxField, '最大值必须大于最小值');
            return false;
        }
        
        return true;
    }

    /**
     * 重置配置表单为默认值
     */
    resetConfigForm(dialog) {
        if (!confirm('确定要重置为默认值吗？这将覆盖当前的所有配置。')) {
            return;
        }
        
        const form = dialog.querySelector('#configEditForm');
        const defaultValues = {
            'workArea_x_min': 0,
            'workArea_x_max': 1000,
            'workArea_y_min': 0,
            'workArea_y_max': 800,
            'workArea_z_min': 0,
            'workArea_z_max': 500,
            'speed_max': 50,
            'speed_normal': 20,
            'speed_slow': 5,
            'speed_approach': 2,
            'accuracy_positional': 0.1,
            'accuracy_angular': 1.0,
            'acceleration_max': 100,
            'acceleration_normal': 50
        };
        
        Object.entries(defaultValues).forEach(([name, value]) => {
            const field = form.querySelector(`input[name="${name}"]`);
            if (field) {
                field.value = value;
                this.validateConfigField(field);
            }
        });
        
        this.showConfigMessage(dialog, '配置已重置为默认值', 'success');
    }

    /**
     * 保存配置
     */
    async saveConfiguration(dialog) {
        const form = dialog.querySelector('#configEditForm');
        const messageElement = dialog.querySelector('#configMessage');
        
        // 清除之前的消息
        messageElement.textContent = '';
        messageElement.className = 'config-message';
        
        // 验证所有字段
        const fields = form.querySelectorAll('input[type="number"]');
        let hasErrors = false;
        
        fields.forEach(field => {
            if (!this.validateConfigField(field)) {
                hasErrors = true;
            }
        });
        
        // 验证工作区域边界
        ['x', 'y', 'z'].forEach(axis => {
            if (!this.validateWorkAreaBounds(form, axis)) {
                hasErrors = true;
            }
        });
        
        if (hasErrors) {
            this.showConfigMessage(dialog, '请修正配置中的错误', 'error');
            return;
        }
        
        // 收集配置数据
        const configData = this.collectConfigData(form);
        
        try {
            // 显示保存中状态
            const saveBtn = dialog.querySelector('#configSaveBtn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '保存中...';
            saveBtn.disabled = true;
            
            // 发送到服务器
            const response = await fetch('/api/probe/config', {
                method: 'PUT',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config: configData })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showConfigMessage(dialog, '配置保存成功！', 'success');
                
                // 2秒后自动关闭对话框
                setTimeout(() => {
                    this.hideDialog(dialog);
                }, 2000);
            } else {
                throw new Error(result.error || '保存失败');
            }
            
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showConfigMessage(dialog, '保存失败: ' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            const saveBtn = dialog.querySelector('#configSaveBtn');
            saveBtn.textContent = '保存配置';
            saveBtn.disabled = false;
        }
    }

    /**
     * 收集配置数据
     */
    collectConfigData(form) {
        const getValue = (name) => parseFloat(form.querySelector(`input[name="${name}"]`).value);
        
        return {
            workArea: {
                x: { min: getValue('workArea_x_min'), max: getValue('workArea_x_max') },
                y: { min: getValue('workArea_y_min'), max: getValue('workArea_y_max') },
                z: { min: getValue('workArea_z_min'), max: getValue('workArea_z_max') }
            },
            speed: {
                max: getValue('speed_max'),
                normal: getValue('speed_normal'),
                slow: getValue('speed_slow'),
                approach: getValue('speed_approach')
            },
            accuracy: {
                positional: getValue('accuracy_positional'),
                angular: getValue('accuracy_angular')
            },
            acceleration: {
                max: getValue('acceleration_max'),
                normal: getValue('acceleration_normal')
            }
        };
    }

    /**
     * 显示配置消息
     */
    showConfigMessage(dialog, message, type) {
        const messageElement = dialog.querySelector('#configMessage');
        messageElement.textContent = message;
        messageElement.className = `config-message ${type}`;
        
        if (type === 'error') {
            // 错误消息3秒后消失
            setTimeout(() => {
                if (messageElement.textContent === message) {
                    messageElement.textContent = '';
                    messageElement.className = 'config-message';
                }
            }, 3000);
        }
    }

    /**
     * 在移动前验证位置配置
     */
    async validatePositionBeforeMove(position) {
        try {
            const response = await fetch('/api/probe/validate-position', {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ position })
            });
            
            const result = await response.json();
            
            if (result.success) {
                return {
                    valid: true,
                    warnings: result.data.warnings || []
                };
            } else {
                return {
                    valid: false,
                    errors: [result.error],
                    warnings: []
                };
            }
        } catch (error) {
            console.error('位置验证失败:', error);
            return {
                valid: false,
                errors: ['验证请求失败: ' + error.message],
                warnings: []
            };
        }
    }
    
    /**
     * 获取配置状态
     */
    async getConfigurationStatus() {
        try {
            const response = await fetch('/api/probe/config', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                return {
                    valid: true,
                    config: result.data.config,
                    status: result.data
                };
            } else {
                throw new Error(result.error || '获取配置状态失败');
            }
        } catch (error) {
            console.error('获取配置状态失败:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }
    
    /**
     * 实时配置验证（用于表单验证）
     */
    async realTimeConfigValidation(config) {
        try {
            const response = await fetch('/api/probe/pre-validate-config', {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config })
            });
            
            const result = await response.json();
            
            if (result.success) {
                return result.data;
            } else {
                return {
                    valid: false,
                    errors: [result.error],
                    warnings: []
                };
            }
        } catch (error) {
            console.error('配置预验证失败:', error);
            return {
                valid: false,
                errors: ['验证请求失败: ' + error.message],
                warnings: []
            };
        }
    }

    /**
     * 执行实时验证
     */
    async performRealTimeValidation(dialog) {
        const form = dialog.querySelector('#configEditForm');
        const configData = this.collectConfigData(form);
        
        try {
            const validationResult = await this.realTimeConfigValidation(configData);
            
            // 更新实时验证反馈
            this.updateRealTimeValidationFeedback(dialog, validationResult);
            
        } catch (error) {
            console.error('实时验证失败:', error);
        }
    }

    /**
     * 更新实时验证反馈
     */
    updateRealTimeValidationFeedback(dialog, validationResult) {
        // 清除之前的验证状态
        const formFields = dialog.querySelectorAll('.form-field');
        formFields.forEach(field => {
            field.classList.remove('validation-warning', 'validation-success');
        });
        
        if (!validationResult.valid && validationResult.errors) {
            // 显示错误
            validationResult.errors.forEach(error => {
                // 这里可以根据错误类型更新相应的字段
                console.warn('配置验证错误:', error);
            });
            
            this.showConfigMessage(dialog, `发现 ${validationResult.errors.length} 个配置错误`, 'error');
        } else if (validationResult.warnings && validationResult.warnings.length > 0) {
            // 显示警告但不阻止保存
            this.showConfigMessage(dialog, `发现 ${validationResult.warnings.length} 个配置建议`, 'warning');
        } else if (validationResult.valid) {
            // 验证通过
            this.showConfigMessage(dialog, '配置验证通过', 'success');
            
            // 给通过的字段添加成功样式
            formFields.forEach(field => {
                const input = field.querySelector('input');
                if (input && !field.classList.contains('error')) {
                    field.classList.add('validation-success');
                }
            });
        }
    }

    /**
     * 显示历史
     */
    showHistory() {
        // 这里可以添加历史记录显示对话框
        alert('历史记录功能开发中...');
    }

    /**
     * 获取认证头
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
            headers['X-Session-Id'] = sessionId;
        }
        
        return headers;
    }

    /**
     * 显示成功消息
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * 显示消息
     */
    showMessage(message, type) {
        // 这里可以集成到主界面的消息系统
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // 简单的alert实现
        if (type === 'error') {
            alert('错误: ' + message);
        } else {
            console.log(message);
        }
    }

    /**
     * 查找目标容器
     */
    findTargetContainer() {
        // 尝试找到合适的容器
        return document.querySelector('.main-content') || 
               document.querySelector('#main') || 
               document.body;
    }

    /**
     * 销毁
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProbeControl;
} else {
    window.ProbeControl = ProbeControl;
}