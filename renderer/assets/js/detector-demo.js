/**
 * 放射化学纯度检测仪演示脚本
 * 模拟硅胶板色谱扫描和辐射检测功能
 */

class RadiationDetectorDemo {
    constructor() {
        this.isConnected = false;
        this.isScanning = false;
        this.scanData = [];
        this.chart = null;
        this.scanTimer = null;
        this.currentPosition = 0;
        this.totalPoints = 0;
        this.scanProgress = 0;
        
        this.initializeDemo();
    }
    
    initializeDemo() {
        this.initializeChart();
        this.bindEvents();
        this.updateDeviceStatus('disconnected');
        this.logMessage('系统已初始化，等待设备连接...', 'info');
    }
    
    initializeChart() {
        const ctx = document.getElementById('main-chart').getContext('2d');
        
        // 创建演示用的辐射分布曲线
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.generatePositionLabels(),
                datasets: [{
                    label: '计数率 (cps)',
                    data: this.generateDemoData(),
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6
                }, {
                    label: '拟合曲线',
                    data: this.generateSmoothCurve(),
                    borderColor: '#28a745',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }, {
                    label: '背景基线',
                    data: new Array(51).fill(50),
                    borderColor: '#dc3545',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return `位置: ${context[0].label} mm`;
                            },
                            label: function(context) {
                                return `计数率: ${Math.round(context.parsed.y)} cps`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '位置 (mm)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        min: 0,
                        max: 50,
                        ticks: {
                            stepSize: 5
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '计数率 (cps)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        min: 0,
                        max: 5000,
                        ticks: {
                            stepSize: 1000
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    generatePositionLabels() {
        const labels = [];
        for (let i = 0; i <= 50; i += 0.5) {
            labels.push(i.toFixed(1));
        }
        return labels;
    }
    
    generateDemoData() {
        // 模拟硅胶板上的辐射分布
        // 纯净物质在特定位置有高峰，其他位置较低
        const data = [];
        const peakPosition = 25; // 峰值位置
        const peakWidth = 8;     // 峰宽度
        const peakHeight = 3200; // 峰值高度
        
        for (let i = 0; i <= 50; i += 0.5) {
            let value;
            
            if (i >= peakPosition - peakWidth/2 && i <= peakPosition + peakWidth/2) {
                // 高斯峰形分布
                const x = (i - peakPosition) / (peakWidth / 4);
                value = peakHeight * Math.exp(-x * x) + Math.random() * 100;
            } else {
                // 背景噪声
                value = 50 + Math.random() * 30;
            }
            
            data.push(Math.round(value));
        }
        
        return data;
    }
    
    generateSmoothCurve() {
        // 生成平滑的拟合曲线
        return this.scanData.length > 0 ? this.scanData.map(point => point.y) : [];
    }
    
    bindEvents() {
        // 设备连接
        document.getElementById('connect-btn').addEventListener('click', () => {
            this.connectDevice();
        });
        
        // 开始扫描
        document.getElementById('start-detection-btn').addEventListener('click', () => {
            this.startScanning();
        });
        
        // 停止扫描
        document.getElementById('stop-detection-btn').addEventListener('click', () => {
            this.stopScanning();
        });
        
        // 探头归零
        document.getElementById('home-btn').addEventListener('click', () => {
            this.moveToHome();
        });
        
        // 重置数据
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetData();
        });
        
        // 分析曲线
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeData();
        });
        
        // 清空图表
        document.getElementById('clear-chart-btn').addEventListener('click', () => {
            this.clearChart();
        });
        
        // 重新扫描
        document.getElementById('start-scan-btn').addEventListener('click', () => {
            this.rescan();
        });
        
        // 扫描范围控制
        document.getElementById('scan-range').addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('range-max').textContent = value;
            this.updateChartRange(value);
        });
        
        // 退出登录
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
        
        // 自动登录演示
        this.autoLoginDemo();
    }
    
    autoLoginDemo() {
        // 模拟自动登录
        setTimeout(() => {
            document.getElementById('username').value = 'admin';
            document.getElementById('password').value = 'Admin123!';
            this.login();
        }, 1000);
    }
    
    login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (username === 'admin' && password === 'Admin123!') {
            this.showMainScreen();
            this.logMessage(`用户 ${username} 登录成功`, 'success');
        } else {
            alert('用户名或密码错误');
        }
    }
    
    showMainScreen() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-screen').style.display = 'block';
        document.getElementById('user-info').textContent = '管理员';
    }
    
    logout() {
        document.getElementById('main-screen').style.display = 'none';
        document.getElementById('login-screen').style.display = 'block';
        this.resetDemo();
    }
    
    connectDevice() {
        const btn = document.getElementById('connect-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">连接中...</span>';
        
        this.updateDeviceStatus('connecting');
        this.logMessage('正在连接碘化钠探头...', 'info');
        
        // 模拟连接过程
        setTimeout(() => {
            this.isConnected = true;
            this.updateDeviceStatus('connected');
            btn.innerHTML = '<span class="btn-icon">✅</span><span class="btn-text">已连接</span>';
            btn.style.background = '#28a745';
            
            document.getElementById('start-detection-btn').disabled = false;
            document.getElementById('home-btn').disabled = false;
            
            this.logMessage('碘化钠探头连接成功', 'success');
            this.logMessage('位置控制系统就绪', 'success');
        }, 2000);
    }
    
    updateDeviceStatus(status) {
        const probeStatus = document.getElementById('probe-status');
        const probeStatusText = document.getElementById('probe-status-text');
        const positionStatus = document.getElementById('position-status');
        const positionStatusText = document.getElementById('position-status-text');
        
        if (status === 'connected') {
            probeStatus.className = 'status-dot connected';
            probeStatusText.textContent = '已连接';
            positionStatus.className = 'status-dot connected';
            positionStatusText.textContent = '就绪';
        } else if (status === 'connecting') {
            probeStatus.className = 'status-dot connecting';
            probeStatusText.textContent = '连接中...';
            positionStatus.className = 'status-dot connecting';
            positionStatusText.textContent = '初始化...';
        } else {
            probeStatus.className = 'status-dot disconnected';
            probeStatusText.textContent = '未连接';
            positionStatus.className = 'status-dot disconnected';
            positionStatusText.textContent = '未就绪';
        }
    }
    
    startScanning() {
        if (!this.isConnected) {
            alert('请先连接设备');
            return;
        }
        
        this.isScanning = true;
        this.scanData = [];
        this.currentPosition = 0;
        this.totalPoints = 0;
        this.scanProgress = 0;
        
        document.getElementById('start-detection-btn').disabled = true;
        document.getElementById('stop-detection-btn').disabled = false;
        
        this.logMessage('开始硅胶板扫描...', 'info');
        this.updateSampleStatus('扫描中');
        
        const scanRange = parseFloat(document.getElementById('scan-range').value);
        const stepSize = parseFloat(document.getElementById('position-step').value);
        const integrationTime = parseFloat(document.getElementById('integration-time').value) * 1000;
        
        this.startScanTimer(scanRange, stepSize, integrationTime);
    }
    
    startScanTimer(range, step, delay) {
        const totalSteps = Math.ceil(range / step);
        let currentStep = 0;
        
        this.scanTimer = setInterval(() => {
            if (currentStep >= totalSteps || !this.isScanning) {
                this.stopScanning();
                return;
            }
            
            const position = currentStep * step;
            const counts = this.generateRealTimeData(position);
            
            // 更新实时数据
            this.updateRealTimeData(position, counts, currentStep + 1, totalSteps);
            
            // 添加数据点
            this.scanData.push({ x: position, y: counts });
            this.totalPoints++;
            
            // 更新图表
            this.updateChart();
            
            currentStep++;
        }, delay);
    }
    
    generateRealTimeData(position) {
        // 模拟实时检测数据
        const peakPosition = 25;
        const peakWidth = 8;
        const peakHeight = 3200;
        
        if (Math.abs(position - peakPosition) <= peakWidth / 2) {
            const x = (position - peakPosition) / (peakWidth / 4);
            const signal = peakHeight * Math.exp(-x * x);
            const noise = Math.random() * 200 - 100;
            return Math.max(0, Math.round(signal + noise));
        } else {
            return Math.round(50 + Math.random() * 100);
        }
    }
    
    updateRealTimeData(position, counts, current, total) {
        this.currentPosition = position;
        this.scanProgress = Math.round((current / total) * 100);
        
        document.getElementById('current-position').textContent = position.toFixed(1);
        document.getElementById('current-counts').textContent = counts;
        document.getElementById('total-points').textContent = current;
        document.getElementById('scan-progress').textContent = this.scanProgress;
        
        // 更新进度条
        const progressFill = document.querySelector('.progress-fill');
        progressFill.style.width = `${this.scanProgress}%`;
    }
    
    stopScanning() {
        if (this.scanTimer) {
            clearInterval(this.scanTimer);
            this.scanTimer = null;
        }
        
        this.isScanning = false;
        
        document.getElementById('start-detection-btn').disabled = false;
        document.getElementById('stop-detection-btn').disabled = true;
        
        this.logMessage('扫描完成', 'success');
        this.updateSampleStatus('扫描完成');
        
        // 自动分析数据
        setTimeout(() => {
            this.analyzeData();
        }, 1000);
    }
    
    moveToHome() {
        this.logMessage('探头移动到起始位置...', 'info');
        
        // 模拟移动过程
        let position = this.currentPosition;
        const interval = setInterval(() => {
            position -= 1;
            if (position <= 0) {
                position = 0;
                clearInterval(interval);
                this.logMessage('探头已归零', 'success');
            }
            document.getElementById('current-position').textContent = position.toFixed(1);
        }, 50);
    }
    
    resetData() {
        this.scanData = [];
        this.currentPosition = 0;
        this.totalPoints = 0;
        this.scanProgress = 0;
        
        // 重置显示
        document.getElementById('current-position').textContent = '0.0';
        document.getElementById('current-counts').textContent = '0';
        document.getElementById('total-points').textContent = '0';
        document.getElementById('scan-progress').textContent = '0';
        document.querySelector('.progress-fill').style.width = '0%';
        
        // 重置图表
        this.chart.data.datasets[0].data = this.generateDemoData();
        this.chart.update();
        
        // 重置结果
        this.resetAnalysisResults();
        
        this.logMessage('数据已重置', 'info');
    }
    
    analyzeData() {
        if (this.scanData.length === 0) {
            this.logMessage('没有可分析的数据', 'warning');
            return;
        }
        
        this.logMessage('开始分析辐射分布曲线...', 'info');
        
        // 模拟分析过程
        setTimeout(() => {
            const analysis = this.performAnalysis();
            this.displayAnalysisResults(analysis);
            this.logMessage('分析完成', 'success');
            this.updateSampleStatus('分析完成');
            
            // 启用导出功能
            this.enableExportFunctions();
        }, 1500);
    }
    
    performAnalysis() {
        // 简化的分析算法
        const data = this.chart.data.datasets[0].data;
        let maxValue = 0;
        let maxIndex = 0;
        
        // 找到峰值
        for (let i = 0; i < data.length; i++) {
            if (data[i] > maxValue) {
                maxValue = data[i];
                maxIndex = i;
            }
        }
        
        const peakPosition = maxIndex * 0.5; // 位置步长为0.5
        const rfValue = peakPosition / 50; // 假设前沿在50mm处
        
        // 计算峰面积（简化的三角形近似）
        const peakArea = maxValue * 8; // 假设峰宽为8mm
        
        // 计算总积分面积
        const totalArea = data.reduce((sum, value) => sum + value, 0) * 0.5;
        
        // 计算净峰面积
        const backgroundArea = 50 * data.length * 0.5; // 背景基线面积
        const netPeakArea = peakArea - backgroundArea / data.length;
        
        // 计算纯度
        const purity = Math.max(0, Math.min(100, (netPeakArea / totalArea) * 100));
        
        return {
            purity: purity.toFixed(2),
            netPeakArea: Math.round(netPeakArea),
            totalPeakArea: Math.round(totalArea),
            rfValue: rfValue.toFixed(3),
            peakPosition: peakPosition.toFixed(1),
            peakWidth: '8.0',
            backgroundNoise: Math.round(data.slice(0, 10).reduce((a, b) => a + b, 0) / 10),
            signalNoiseRatio: (maxValue / 50).toFixed(1),
            dataPointCount: data.length,
            peakPositionValue: `${peakPosition.toFixed(1)} mm`
        };
    }
    
    displayAnalysisResults(analysis) {
        // 更新分析结果显示
        document.getElementById('purity').textContent = `${analysis.purity}%`;
        document.getElementById('net-peak-area').textContent = analysis.netPeakArea;
        document.getElementById('total-peak-area').textContent = analysis.totalPeakArea;
        document.getElementById('rf-value').textContent = analysis.rfValue;
        document.getElementById('peak-position').textContent = analysis.peakPositionValue;
        document.getElementById('peak-width').textContent = `${analysis.peakWidth} mm`;
        document.getElementById('background-noise').textContent = `${analysis.backgroundNoise} cps`;
        document.getElementById('signal-noise-ratio').textContent = analysis.signalNoiseRatio;
        document.getElementById('data-point-count').textContent = analysis.dataPointCount;
        
        document.getElementById('analysis-time').textContent = new Date().toLocaleTimeString();
        
        // 显示峰标记
        const peakMarker = document.getElementById('peak-marker');
        peakMarker.classList.remove('hidden');
        peakMarker.style.left = `${(analysis.peakPosition / 50) * 100}%`;
        
        // 更新图表数据点统计
        document.getElementById('chart-data-points').textContent = analysis.dataPointCount;
        
        this.logMessage(`分析结果: 纯度 ${analysis.purity}%, Rf值 ${analysis.rfValue}`, 'success');
    }
    
    resetAnalysisResults() {
        document.getElementById('purity').textContent = '0.00%';
        document.getElementById('net-peak-area').textContent = '0';
        document.getElementById('total-peak-area').textContent = '0';
        document.getElementById('rf-value').textContent = '0.000';
        document.getElementById('peak-position').textContent = '0.0 mm';
        document.getElementById('peak-width').textContent = '0.0 mm';
        document.getElementById('background-noise').textContent = '0 cps';
        document.getElementById('signal-noise-ratio').textContent = '0';
        document.getElementById('data-point-count').textContent = '0';
        document.getElementById('analysis-time').textContent = '--';
        document.getElementById('sample-status').textContent = '待检测';
        
        // 隐藏峰标记
        document.getElementById('peak-marker').classList.add('hidden');
        document.getElementById('chart-data-points').textContent = '0';
        
        // 禁用导出功能
        this.disableExportFunctions();
    }
    
    enableExportFunctions() {
        document.getElementById('export-raw-data').disabled = false;
        document.getElementById('export-analysis-report').disabled = false;
        document.getElementById('export-pdf-report').disabled = false;
        document.getElementById('print-report').disabled = false;
    }
    
    disableExportFunctions() {
        document.getElementById('export-raw-data').disabled = true;
        document.getElementById('export-analysis-report').disabled = true;
        document.getElementById('export-pdf-report').disabled = true;
        document.getElementById('print-report').disabled = true;
    }
    
    updateChart() {
        if (this.chart && this.scanData.length > 0) {
            const positionLabels = this.scanData.map(point => point.x.toFixed(1));
            const countData = this.scanData.map(point => point.y);
            
            this.chart.data.labels = positionLabels;
            this.chart.data.datasets[0].data = countData;
            this.chart.data.datasets[1].data = this.generateSmoothCurve();
            this.chart.update('none'); // 不播放动画
        }
    }
    
    updateChartRange(maxRange) {
        if (this.chart) {
            this.chart.options.scales.x.max = parseFloat(maxRange);
            this.chart.update();
        }
    }
    
    clearChart() {
        this.resetData();
        this.logMessage('图表已清空', 'info');
    }
    
    rescan() {
        this.logMessage('重新开始扫描...', 'info');
        this.startScanning();
    }
    
    updateSampleStatus(status) {
        document.getElementById('sample-status').textContent = status;
    }
    
    logMessage(message, level = 'info') {
        const logContainer = document.getElementById('detection-log');
        const timestamp = new Date().toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-level ${level}">${level.toUpperCase()}</span>
            <span class="log-message">${message}</span>
        `;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // 更新日志统计
        this.updateLogStats();
    }
    
    updateLogStats() {
        const logEntries = document.querySelectorAll('.log-entry');
        const logCount = logEntries.length;
        const errorCount = document.querySelectorAll('.log-level.error').length;
        const warningCount = document.querySelectorAll('.log-level.warning').length;
        
        document.getElementById('log-count').textContent = logCount;
        document.getElementById('error-count').textContent = errorCount;
        document.getElementById('warning-count').textContent = warningCount;
    }
    
    resetDemo() {
        this.isConnected = false;
        this.isScanning = false;
        this.scanData = [];
        this.currentPosition = 0;
        this.totalPoints = 0;
        this.scanProgress = 0;
        
        if (this.scanTimer) {
            clearInterval(this.scanTimer);
            this.scanTimer = null;
        }
        
        // 重置设备状态
        this.updateDeviceStatus('disconnected');
        
        // 重置控制按钮
        const connectBtn = document.getElementById('connect-btn');
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<span class="btn-icon">🔌</span><span class="btn-text">连接设备</span>';
        connectBtn.style.background = '';
        
        document.getElementById('start-detection-btn').disabled = true;
        document.getElementById('stop-detection-btn').disabled = true;
        document.getElementById('home-btn').disabled = true;
        
        // 重置数据和分析结果
        this.resetData();
        
        // 清空日志
        document.getElementById('detection-log').innerHTML = '';
        this.updateLogStats();
    }
}

// 页面加载完成后初始化演示
document.addEventListener('DOMContentLoaded', () => {
    // 绑定登录表单
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        window.detectorDemo.login();
    });
    
    // 初始化检测器演示
    window.detectorDemo = new RadiationDetectorDemo();
    
    // 添加一些演示用的初始日志
    setTimeout(() => {
        window.detectorDemo.logMessage('放射化学纯度检测仪已启动', 'info');
        window.detectorDemo.logMessage('等待用户登录...', 'info');
    }, 500);
});

// 键盘快捷键支持
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        switch (e.key) {
            case 's':
                e.preventDefault();
                if (window.detectorDemo && !window.detectorDemo.isScanning) {
                    window.detectorDemo.startScanning();
                }
                break;
            case 't':
                e.preventDefault();
                if (window.detectorDemo && window.detectorDemo.isScanning) {
                    window.detectorDemo.stopScanning();
                }
                break;
            case 'h':
                e.preventDefault();
                if (window.detectorDemo) {
                    window.detectorDemo.moveToHome();
                }
                break;
            case 'r':
                e.preventDefault();
                if (window.detectorDemo) {
                    window.detectorDemo.resetData();
                }
                break;
            case 'a':
                e.preventDefault();
                if (window.detectorDemo) {
                    window.detectorDemo.analyzeData();
                }
                break;
            case 'l':
                e.preventDefault();
                if (window.detectorDemo) {
                    window.detectorDemo.logout();
                }
                break;
        }
    }
    
    if (e.key === 'Escape') {
        // ESC键可以停止当前操作
        if (window.detectorDemo && window.detectorDemo.isScanning) {
            window.detectorDemo.stopScanning();
        }
    }
});

console.log('放射化学纯度检测仪演示脚本已加载');
console.log('快捷键: Ctrl+S-开始扫描, Ctrl+T-停止扫描, Ctrl+H-归零, Ctrl+R-重置, Ctrl+A-分析, Ctrl+L-退出');
