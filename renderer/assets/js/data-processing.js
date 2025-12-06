/**
 * 数据采集和处理前端模块
 * Data Acquisition and Processing Frontend Module
 */

class DataProcessing {
    constructor() {
        this.isProcessing = false;
        this.currentSpectrum = null;
        this.analysisState = {};
        this.processingStats = {};
        this.updateInterval = null;
        this.chart = null;
        
        this.init();
    }

    /**
     * 初始化
     */
    init() {
        console.log('初始化数据采集和处理系统...');
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
            // 初始化图表
            this.initializeChart();
            
            // 开始定期更新
            this.startStatusUpdate();
            
            console.log('数据采集和处理系统加载完成');
        } catch (error) {
            console.error('数据采集和处理系统加载失败:', error);
            this.showError('系统加载失败: ' + error.message);
        }
    }

    /**
     * 创建UI
     */
    createUI() {
        // 创建数据处理面板
        const panel = this.createProcessingPanel();
        
        // 添加到主界面
        const targetContainer = this.findTargetContainer();
        if (targetContainer) {
            targetContainer.appendChild(panel);
        }
    }

    /**
     * 创建数据处理面板
     */
    createProcessingPanel() {
        const panel = document.createElement('div');
        panel.className = 'data-processing-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>📊 数据采集和处理</h3>
                <div class="status-controls">
                    <button id="startAnalysisBtn" class="btn btn-primary">开始分析</button>
                    <button id="stopAnalysisBtn" class="btn btn-danger" disabled>停止分析</button>
                </div>
            </div>
            
            <div class="panel-content">
                <!-- 分析状态 -->
                <div class="section">
                    <h4>分析状态</h4>
                    <div class="status-grid">
                        <div class="status-item">
                            <label>状态:</label>
                            <span id="analysisStatus">未运行</span>
                        </div>
                        <div class="status-item">
                            <label>探测器:</label>
                            <select id="detectorType">
                                <option value="hpge_detector">高纯锗探测器</option>
                                <option value="nai_detector">碘化钠探测器</option>
                                <option value="plastic_scintillator">塑料闪烁探测器</option>
                            </select>
                        </div>
                        <div class="status-item">
                            <label>总计数:</label>
                            <span id="totalCounts">0</span>
                        </div>
                        <div class="status-item">
                            <label>活时间:</label>
                            <span id="liveTime">0.0s</span>
                        </div>
                        <div class="status-item">
                            <label>实时:</label>
                            <span id="realTime">0.0s</span>
                        </div>
                        <div class="status-item">
                            <label>检测到峰:</label>
                            <span id="peaksCount">0</span>
                        </div>
                    </div>
                </div>
                
                <!-- 谱线显示 -->
                <div class="section">
                    <h4>谱线显示</h4>
                    <div class="chart-container">
                        <canvas id="spectrumChart" width="800" height="400"></canvas>
                    </div>
                    <div class="chart-controls">
                        <button id="clearChartBtn" class="btn btn-outline">清空图表</button>
                        <button id="saveChartBtn" class="btn btn-outline">保存图表</button>
                        <label class="checkbox-label">
                            <input type="checkbox" id="showProcessed" checked> 显示处理后数据
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="showPeaks" checked> 显示峰标记
                        </label>
                    </div>
                </div>
                
                <!-- 峰分析结果 -->
                <div class="section">
                    <h4>峰分析结果</h4>
                    <div class="table-container">
                        <table id="peaksTable" class="data-table">
                            <thead>
                                <tr>
                                    <th>通道</th>
                                    <th>能量 (keV)</th>
                                    <th>峰面积</th>
                                    <th>峰高度</th>
                                    <th>FWHM</th>
                                    <th>置信度</th>
                                    <th>可能核素</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="7" class="text-center">暂无数据</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- 定量分析结果 -->
                <div class="section">
                    <h4>定量分析结果</h4>
                    <div class="table-container">
                        <table id="quantitativeTable" class="data-table">
                            <thead>
                                <tr>
                                    <th>核素</th>
                                    <th>能量 (keV)</th>
                                    <th>活度 (Bq)</th>
                                    <th>不确定度</th>
                                    <th>浓度 (ppm)</th>
                                    <th>方法</th>
                                    <th>置信度</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="7" class="text-center">暂无数据</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- 手动数据输入 -->
                <div class="section">
                    <h4>手动数据输入</h4>
                    <div class="manual-input">
                        <div class="input-group">
                            <textarea id="spectrumInput" placeholder="请输入谱线数据（用逗号分隔的数字）&#10;例如：100,120,150,180,200,180,150,120,100"></textarea>
                        </div>
                        <div class="input-row">
                            <input type="number" id="totalCountsInput" placeholder="总计数" value="1000">
                            <input type="number" id="liveTimeInput" placeholder="活时间 (秒)" value="60">
                            <button id="processManualBtn" class="btn btn-secondary">处理数据</button>
                        </div>
                    </div>
                </div>
                
                <!-- 处理统计 -->
                <div class="section">
                    <h4>处理统计</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <label>已处理数据:</label>
                            <span id="totalProcessed">0</span>
                        </div>
                        <div class="stat-item">
                            <label>检测到峰:</label>
                            <span id="totalPeaks">0</span>
                        </div>
                        <div class="stat-item">
                            <label>平均处理时间:</label>
                            <span id="avgProcessingTime">0ms</span>
                        </div>
                        <div class="stat-item">
                            <label>错误次数:</label>
                            <span id="errorCount">0</span>
                        </div>
                    </div>
                </div>
                
                <!-- 配置管理 -->
                <div class="section">
                    <h4>处理配置</h4>
                    <div class="config-controls">
                        <button id="configBtn" class="btn btn-info">查看配置</button>
                        <button id="logsBtn" class="btn btn-outline">查看日志</button>
                        <button id="cleanupBtn" class="btn btn-outline">清理资源</button>
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
        if (document.getElementById('dataProcessingStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'dataProcessingStyles';
        style.textContent = `
            .data-processing-panel {
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin: 20px 0;
                overflow: hidden;
            }
            
            .panel-header {
                background: #34495e;
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
            
            .status-controls {
                display: flex;
                gap: 10px;
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
            
            .status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .status-item {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .status-item label {
                font-weight: 600;
                color: #2c3e50;
                min-width: 80px;
            }
            
            .status-item span {
                font-family: 'Courier New', monospace;
                font-weight: bold;
                color: #e74c3c;
            }
            
            .chart-container {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 15px;
            }
            
            .chart-controls {
                display: flex;
                align-items: center;
                gap: 15px;
                flex-wrap: wrap;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 14px;
                color: #495057;
            }
            
            .table-container {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #dee2e6;
                border-radius: 4px;
            }
            
            .data-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
            }
            
            .data-table th,
            .data-table td {
                padding: 8px 12px;
                text-align: left;
                border-bottom: 1px solid #dee2e6;
            }
            
            .data-table th {
                background: #f8f9fa;
                font-weight: 600;
                color: #495057;
                position: sticky;
                top: 0;
            }
            
            .data-table tbody tr:hover {
                background: #f8f9fa;
            }
            
            .text-center {
                text-align: center;
                color: #6c757d;
                font-style: italic;
            }
            
            .manual-input {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .input-group textarea {
                width: 100%;
                min-height: 100px;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                resize: vertical;
            }
            
            .input-row {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .input-row input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .stat-item {
                display: flex;
                justify-content: space-between;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 4px;
            }
            
            .stat-item label {
                font-weight: 600;
                color: #2c3e50;
            }
            
            .stat-item span {
                font-family: 'Courier New', monospace;
                color: #e74c3c;
            }
            
            .config-controls {
                display: flex;
                gap: 10px;
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
            
            .btn-danger {
                background: #e74c3c;
                color: white;
            }
            
            .btn-danger:hover:not(:disabled) {
                background: #c0392b;
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
            
            @media (max-width: 768px) {
                .panel-header {
                    flex-direction: column;
                    gap: 10px;
                    align-items: stretch;
                }
                
                .status-controls {
                    justify-content: center;
                }
                
                .status-grid {
                    grid-template-columns: 1fr;
                }
                
                .chart-controls {
                    justify-content: center;
                }
                
                .input-row {
                    flex-direction: column;
                }
                
                .config-controls {
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
        // 分析控制按钮
        panel.querySelector('#startAnalysisBtn').addEventListener('click', () => this.startAnalysis());
        panel.querySelector('#stopAnalysisBtn').addEventListener('click', () => this.stopAnalysis());
        
        // 图表控制按钮
        panel.querySelector('#clearChartBtn').addEventListener('click', () => this.clearChart());
        panel.querySelector('#saveChartBtn').addEventListener('click', () => this.saveChart());
        
        // 复选框
        panel.querySelector('#showProcessed').addEventListener('change', () => this.updateChart());
        panel.querySelector('#showPeaks').addEventListener('change', () => this.updateChart());
        
        // 手动数据处理
        panel.querySelector('#processManualBtn').addEventListener('click', () => this.processManualData());
        
        // 配置和日志
        panel.querySelector('#configBtn').addEventListener('click', () => this.showConfig());
        panel.querySelector('#logsBtn').addEventListener('click', () => this.showLogs());
        panel.querySelector('#cleanupBtn').addEventListener('click', () => this.cleanup());
    }

    /**
     * 初始化图表
     */
    initializeChart() {
        const canvas = document.getElementById('spectrumChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // 创建简单的图表对象
        this.chart = {
            canvas: canvas,
            ctx: ctx,
            data: [],
            peaks: [],
            processed: [],
            showProcessed: true,
            showPeaks: true
        };
        
        this.drawChart();
    }

    /**
     * 绘制图表
     */
    drawChart() {
        if (!this.chart) return;
        
        const { canvas, ctx } = this.chart;
        const width = canvas.width;
        const height = canvas.height;
        
        // 清空画布
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // 绘制网格
        this.drawGrid(ctx, width, height);
        
        // 绘制数据
        this.drawData(ctx, width, height);
        
        // 绘制峰标记
        if (this.chart.showPeaks) {
            this.drawPeaks(ctx, width, height);
        }
        
        // 绘制坐标轴
        this.drawAxes(ctx, width, height);
    }

    /**
     * 绘制网格
     */
    drawGrid(ctx, width, height) {
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        
        // 垂直网格线
        for (let x = 0; x <= width; x += width / 10) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // 水平网格线
        for (let y = 0; y <= height; y += height / 10) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    /**
     * 绘制数据
     */
    drawData(ctx, width, height) {
        if (!this.currentSpectrum) return;
        
        const spectrumData = this.chart.showProcessed && this.currentSpectrum.processed 
            ? this.currentSpectrum.processed 
            : this.currentSpectrum.raw;
        
        if (!spectrumData || spectrumData.length === 0) return;
        
        const maxValue = Math.max(...spectrumData);
        const minValue = Math.min(...spectrumData);
        const range = maxValue - minValue;
        
        if (range === 0) return;
        
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < spectrumData.length; i++) {
            const x = (i / (spectrumData.length - 1)) * (width - 40) + 40;
            const y = height - 20 - ((spectrumData[i] - minValue) / range) * (height - 60);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }

    /**
     * 绘制峰标记
     */
    drawPeaks(ctx, width, height) {
        if (!this.currentSpectrum || !this.currentSpectrum.peaks) return;
        
        const peaks = this.currentSpectrum.peaks;
        const spectrumData = this.currentSpectrum.raw;
        const maxValue = Math.max(...spectrumData);
        const minValue = Math.min(...spectrumData);
        const range = maxValue - minValue;
        
        ctx.strokeStyle = '#e74c3c';
        ctx.fillStyle = '#e74c3c';
        ctx.lineWidth = 1;
        
        peaks.forEach(peak => {
            const x = (peak.channel / (spectrumData.length - 1)) * (width - 40) + 40;
            const y = height - 20 - ((peak.height - minValue) / range) * (height - 60);
            
            // 绘制垂直线
            ctx.beginPath();
            ctx.moveTo(x, height - 20);
            ctx.lineTo(x, 20);
            ctx.stroke();
            
            // 绘制标记点
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    /**
     * 绘制坐标轴
     */
    drawAxes(ctx, width, height) {
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        
        // Y轴
        ctx.beginPath();
        ctx.moveTo(40, 20);
        ctx.lineTo(40, height - 20);
        ctx.stroke();
        
        // X轴
        ctx.beginPath();
        ctx.moveTo(40, height - 20);
        ctx.lineTo(width - 20, height - 20);
        ctx.stroke();
        
        // 标签
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('计数', 0, 0);
        ctx.restore();
        
        ctx.textAlign = 'center';
        ctx.fillText('通道', width / 2, height - 5);
    }

    /**
     * 开始分析
     */
    async startAnalysis() {
        const detectorType = document.getElementById('detectorType').value;

        const startAnalysisWithLoader = window.LoadingIndicator.wrap(async () => {
            window.LoadingIndicator.updateMessage(this.currentLoaderId, '正在启动数据采集...');
            
            const response = await fetch('/api/data-processing/start', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ detectorType })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isProcessing = true;
                this.updateUI();
                window.LoadingIndicator.updateMessage(this.currentLoaderId, '数据采集已启动');
                setTimeout(() => {
                    this.showSuccess('数据分析已开始');
                }, 500);
            } else {
                throw new Error(result.error);
            }
        }, {
            title: `启动分析 - ${detectorType}`,
            message: '准备启动分析...',
            showProgress: true,
            enableCancel: true,
            onCancel: async () => {
                try {
                    await this.stopAnalysis();
                } catch (error) {
                    console.error('取消分析时发生错误:', error);
                }
            }
        });

        try {
            await startAnalysisWithLoader();
        } catch (error) {
            console.error('开始分析失败:', error);
            this.showError('开始分析失败: ' + error.message);
        }
    }

    /**
     * 停止分析
     */
    async stopAnalysis() {
        const stopAnalysisWithLoader = window.LoadingIndicator.wrap(async () => {
            window.LoadingIndicator.updateMessage(this.currentLoaderId, '正在停止数据采集...');
            
            const response = await fetch('/api/data-processing/stop', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isProcessing = false;
                this.updateUI();
                window.LoadingIndicator.updateMessage(this.currentLoaderId, '数据采集已停止');
                setTimeout(() => {
                    this.showSuccess('数据分析已停止');
                }, 500);
            } else {
                throw new Error(result.error);
            }
        }, {
            title: '停止数据分析',
            message: '准备停止分析...',
            showProgress: true,
            enableCancel: false
        });

        try {
            await stopAnalysisWithLoader();
        } catch (error) {
            console.error('停止分析失败:', error);
            this.showError('停止分析失败: ' + error.message);
        }
    }

    /**
     * 处理手动数据
     */
    async processManualData() {
        const spectrumInput = document.getElementById('spectrumInput').value.trim();
        const totalCounts = parseInt(document.getElementById('totalCountsInput').value) || 0;
        const liveTime = parseFloat(document.getElementById('liveTimeInput').value) || 0;
        
        if (!spectrumInput) {
            this.showError('请输入谱线数据');
            return;
        }
        
        const spectrum = spectrumInput.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
        
        if (spectrum.length === 0) {
            this.showError('无效的谱线数据格式');
            return;
        }

        const processDataWithLoader = window.LoadingIndicator.wrap(async () => {
            window.LoadingIndicator.updateMessage(this.currentLoaderId, '正在验证数据格式...');
            await this.delay(200); // 模拟验证时间

            window.LoadingIndicator.updateMessage(this.currentLoaderId, '正在处理谱线数据...');
            
            const response = await fetch('/api/data-processing/process', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    spectrum: spectrum,
                    totalCounts: totalCounts,
                    liveTime: liveTime,
                    realTime: liveTime,
                    detectorType: 'hpge_detector'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                window.LoadingIndicator.updateMessage(this.currentLoaderId, '正在更新显示...');
                this.currentSpectrum = result.data;
                this.updateChart();
                this.updateTables();
                window.LoadingIndicator.updateMessage(this.currentLoaderId, '数据处理完成');
                setTimeout(() => {
                    this.showSuccess('数据处理完成');
                }, 500);
            } else {
                throw new Error(result.error);
            }
        }, {
            title: '处理手动数据',
            message: '准备处理数据...',
            showProgress: true,
            enableCancel: true,
            onCancel: () => {
                Auth.log('用户取消了手动数据处理操作', 'warning');
            }
        });

        try {
            await processDataWithLoader();
        } catch (error) {
            console.error('处理手动数据失败:', error);
            this.showError('处理数据失败: ' + error.message);
        }
    }

    /**
     * 延迟执行
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 更新图表
     */
    updateChart() {
        if (!this.chart) return;
        
        this.chart.showProcessed = document.getElementById('showProcessed').checked;
        this.chart.showPeaks = document.getElementById('showPeaks').checked;
        
        this.drawChart();
    }

    /**
     * 清空图表
     */
    clearChart() {
        this.currentSpectrum = null;
        this.chart.data = [];
        this.chart.peaks = [];
        this.updateChart();
        this.updateTables();
        this.showSuccess('图表已清空');
    }

    /**
     * 保存图表
     */
    saveChart() {
        if (!this.chart) return;
        
        const canvas = this.chart.canvas;
        const link = document.createElement('a');
        link.download = `spectrum_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        this.showSuccess('图表已保存');
    }

    /**
     * 更新表格
     */
    updateTables() {
        this.updatePeaksTable();
        this.updateQuantitativeTable();
    }

    /**
     * 更新峰分析表格
     */
    updatePeaksTable() {
        const table = document.getElementById('peaksTable').querySelector('tbody');
        table.innerHTML = '';
        
        if (!this.currentSpectrum || !this.currentSpectrum.peaks || this.currentSpectrum.peaks.length === 0) {
            table.innerHTML = '<tr><td colspan="7" class="text-center">暂无数据</td></tr>';
            return;
        }
        
        this.currentSpectrum.peaks.forEach(peak => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${peak.channel}</td>
                <td>${peak.energy.toFixed(2)}</td>
                <td>${Math.round(peak.area)}</td>
                <td>${Math.round(peak.height)}</td>
                <td>${peak.fwhm ? peak.fwhm.toFixed(2) : 'N/A'}</td>
                <td>${(peak.confidence * 100).toFixed(1)}%</td>
                <td>${this.identifyNuclides(peak.energy).join(', ')}</td>
            `;
            table.appendChild(row);
        });
    }

    /**
     * 更新定量分析表格
     */
    updateQuantitativeTable() {
        const table = document.getElementById('quantitativeTable').querySelector('tbody');
        table.innerHTML = '';
        
        if (!this.currentSpectrum || !this.currentSpectrum.quantitative || this.currentSpectrum.quantitative.length === 0) {
            table.innerHTML = '<tr><td colspan="7" class="text-center">暂无数据</td></tr>';
            return;
        }
        
        this.currentSpectrum.quantitative.forEach(result => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result.nuclide}</td>
                <td>${result.energy.toFixed(2)}</td>
                <td>${result.activity_bq.toFixed(2)}</td>
                <td>${result.activity_uncertainty ? result.activity_uncertainty.toFixed(2) : 'N/A'}</td>
                <td>${result.concentration_ppm ? result.concentration_ppm.toFixed(3) : 'N/A'}</td>
                <td>${result.method}</td>
                <td>${(result.confidence * 100).toFixed(1)}%</td>
            `;
            table.appendChild(row);
        });
    }

    /**
     * 识别核素（简化版）
     */
    identifyNuclides(energy) {
        const tolerance = 2.0;
        const nuclides = [];
        
        // 常见核素能量 (keV)
        const knownNuclides = {
            'Co-60': [1173.2, 1332.5],
            'Cs-137': [661.7],
            'Ba-133': [80.9, 276.4, 302.8, 356.0, 383.8],
            'Eu-152': [121.8, 244.7, 344.3, 411.1, 444.0, 778.9, 964.0, 1085.9, 1112.1, 1408.0]
        };
        
        for (const [nuclide, energies] of Object.entries(knownNuclides)) {
            for (const nuclideEnergy of energies) {
                if (Math.abs(energy - nuclideEnergy) <= tolerance) {
                    nuclides.push(nuclide);
                    break;
                }
            }
        }
        
        return nuclides;
    }

    /**
     * 开始状态更新
     */
    startStatusUpdate() {
        this.updateInterval = setInterval(() => {
            this.updateStatus();
        }, 2000);
    }

    /**
     * 更新状态
     */
    async updateStatus() {
        try {
            // 获取分析状态
            const statusResponse = await fetch('/api/data-processing/status', {
                headers: this.getAuthHeaders()
            });
            const statusResult = await statusResponse.json();
            
            if (statusResult.success) {
                this.analysisState = statusResult.data;
            }
            
            // 获取当前谱线
            const spectrumResponse = await fetch('/api/data-processing/spectrum/current', {
                headers: this.getAuthHeaders()
            });
            const spectrumResult = await spectrumResponse.json();
            
            if (spectrumResult.success && spectrumResult.data) {
                this.currentSpectrum = spectrumResult.data;
                this.updateChart();
                this.updateTables();
            }
            
            // 获取处理统计
            const statsResponse = await fetch('/api/data-processing/stats', {
                headers: this.getAuthHeaders()
            });
            const statsResult = await statsResponse.json();
            
            if (statsResult.success) {
                this.processingStats = statsResult.data;
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
        // 更新分析状态
        const statusElement = document.getElementById('analysisStatus');
        const startBtn = document.getElementById('startAnalysisBtn');
        const stopBtn = document.getElementById('stopAnalysisBtn');
        
        if (this.analysisState.isRunning) {
            statusElement.textContent = '运行中';
            startBtn.disabled = true;
            stopBtn.disabled = false;
        } else {
            statusElement.textContent = '已停止';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
        
        // 更新数值显示
        if (this.currentSpectrum) {
            document.getElementById('totalCounts').textContent = this.currentSpectrum.totalCounts || 0;
            document.getElementById('peaksCount').textContent = this.currentSpectrum.peaks ? this.currentSpectrum.peaks.length : 0;
        }
        
        if (this.analysisState) {
            document.getElementById('liveTime').textContent = `${(this.analysisState.liveTime || 0).toFixed(1)}s`;
            document.getElementById('realTime').textContent = `${(this.analysisState.realTime || 0).toFixed(1)}s`;
        }
        
        if (this.processingStats) {
            document.getElementById('totalProcessed').textContent = this.processingStats.totalProcessed || 0;
            document.getElementById('totalPeaks').textContent = this.processingStats.peaksDetected || 0;
            document.getElementById('avgProcessingTime').textContent = `${this.processingStats.averageProcessingTime || 0}ms`;
            document.getElementById('errorCount').textContent = this.processingStats.errors || 0;
        }
    }

    /**
     * 显示配置
     */
    async showConfig() {
        try {
            const response = await fetch('/api/data-processing/config', {
                headers: this.getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('配置信息: ' + JSON.stringify(result.data, null, 2));
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('获取配置失败:', error);
            this.showError('获取配置失败: ' + error.message);
        }
    }

    /**
     * 显示日志
     */
    async showLogs() {
        try {
            const response = await fetch('/api/data-processing/logs?limit=50', {
                headers: this.getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('处理日志: ' + JSON.stringify(result.data, null, 2));
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('获取日志失败:', error);
            this.showError('获取日志失败: ' + error.message);
        }
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            const response = await fetch('/api/data-processing/cleanup', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('资源清理完成');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('清理资源失败:', error);
            this.showError('清理资源失败: ' + error.message);
        }
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
    module.exports = DataProcessing;
} else {
    window.DataProcessing = DataProcessing;
}