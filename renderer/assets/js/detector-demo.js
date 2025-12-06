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
        
        // 延迟加载演示数据，确保 ChartModule 已初始化
        setTimeout(() => {
            this.loadDemoData();
        }, 1500);
    }
    
    /**
     * 加载演示数据
     */
    loadDemoData() {
        if (!window.SimulationDataGenerator) {
            console.warn('⚠️ 模拟数据生成器未加载，2秒后重试...');
            setTimeout(() => this.loadDemoData(), 2000);
            return;
        }
        
        console.log('📊 生成初始演示数据...');
        const demoData = window.SimulationDataGenerator.generatePurityTestData(95);
        
        // 将数据转换为图表格式
        this.scanData = demoData.points.map(p => ({
            x: p.position,
            y: p.counts
        }));
        
        // 检查 ChartModule 是否已初始化
        if (!window.ChartModule) {
            console.warn('⚠️ ChartModule 未加载，1秒后重试...');
            setTimeout(() => this.loadDemoData(), 1000);
            return;
        }
        
        if (!window.ChartModule.chart) {
            console.warn('⚠️ ChartModule.chart 未初始化，1秒后重试...');
            setTimeout(() => this.loadDemoData(), 1000);
            return;
        }
        
        // 使用 ChartModule 更新图表
        if (typeof window.ChartModule.updateChart === 'function') {
            try {
                console.log(`🎯 准备更新图表: ${this.scanData.length} 个数据点`);
                window.ChartModule.updateChart(this.scanData);
                console.log('✅ 通过 ChartModule 更新图表数据');
                this.logMessage(`✅ 已加载 ${demoData.points.length} 个演示数据点 (0-50mm)`, 'success');
            } catch (error) {
                console.error('❌ ChartModule 更新失败:', error);
                this.updateChartDirectly(demoData);
            }
        } else {
            console.warn('⚠️ ChartModule.updateChart 方法不存在');
            this.updateChartDirectly(demoData);
        }
    }
    
    /**
     * 直接更新图表（备用方法）
     */
    updateChartDirectly(demoData) {
        console.log('🔧 使用备用方法直接更新图表...');
        
        if (!this.chart) {
            console.error('❌ this.chart 不存在');
            
            // 尝试从 ChartModule 获取图表
            if (window.ChartModule && window.ChartModule.chart) {
                console.log('📊 从 ChartModule 获取图表实例');
                this.chart = window.ChartModule.chart;
            } else {
                console.error('❌ 无法获取任何图表实例');
                return;
            }
        }
        
        try {
            console.log(`📝 更新图表数据: ${this.scanData.length} 个点`);
            this.chart.data.datasets[0].data = this.scanData;
            this.chart.data.labels = demoData.points.map(p => p.position.toFixed(1));
            this.chart.update('active');
            console.log('✅ 直接更新图表完成');
            this.logMessage(`✅ 已加载 ${demoData.points.length} 个演示数据点 (0-50mm)`, 'success');
        } catch (error) {
            console.error('❌ 直接更新图表失败:', error);
        }
    }
    
    initializeChart() {
        // 优先使用 ChartModule，不创建独立图表
        if (window.ChartModule) {
            console.log('✅ detector-demo: 使用 ChartModule 管理图表');
            this.chart = window.ChartModule.chart; // 引用现有图表
            return;
        }
        
        // 检查Chart.js是否加载
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js未加载，使用文本模式显示数据');
            this.chart = null;
            return;
        }

        const canvas = document.getElementById('main-chart');
        if (!canvas) {
            console.error('未找到图表画布元素');
            return;
        }

        // 检查是否有其他图表实例使用该 canvas
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            console.log('✅ detector-demo: 使用现有图表实例');
            this.chart = existingChart;
            return;
        }

        const ctx = canvas.getContext('2d');
        
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
        
        // 导出功能绑定
        const exportRawBtn = document.getElementById('export-raw-data');
        if (exportRawBtn) {
            exportRawBtn.addEventListener('click', () => this.exportRawData());
        }
        
        const exportAnalysisBtn = document.getElementById('export-analysis-report');
        if (exportAnalysisBtn) {
            exportAnalysisBtn.addEventListener('click', () => this.exportAnalysisReport());
        }
        
        const exportPdfBtn = document.getElementById('export-pdf-report');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportPdfReport());
        }
        
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printReport());
        }
        
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
        // 即使没有设备连接，也允许使用模拟数据演示
        if (!this.isConnected) {
            console.log('📊 设备未连接，使用模拟数据生成器...');
            this.runSimulationDemo();
            return;
        }
        
        this.isScanning = true;
        this.scanData = [];
        this.currentPosition = 0;
        this.totalPoints = 0;
        this.scanProgress = 0;
        
        const startBtn = document.getElementById('start-detection-btn');
        const stopBtn = document.getElementById('stop-detection-btn');
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        
        this.logMessage('开始硅胶板扫描...', 'info');
        this.updateSampleStatus('扫描中');
        
        const scanRange = parseFloat(document.getElementById('scan-range')?.value || 50);
        const stepSize = parseFloat(document.getElementById('position-step')?.value || 0.1);
        const integrationTime = parseFloat(document.getElementById('integration-time')?.value || 1) * 1000;
        
        this.startScanTimer(scanRange, stepSize, integrationTime);
    }
    
    /**
     * 运行模拟演示
     */
    runSimulationDemo() {
        if (!window.SimulationDataGenerator) {
            alert('模拟数据生成器未加载，请刷新页面重试');
            return;
        }

        this.logMessage('🎯 启动模拟扫描演示...', 'info');
        this.isScanning = true;

        // 生成模拟数据
        const simData = window.SimulationDataGenerator.generatePurityTestData(92);
        this.logMessage(`✅ 生成了 ${simData.points.length} 个数据点`, 'success');

        // 应用数据处理算法
        const processed = window.SimulationDataGenerator.applyDataProcessing(simData.points);
        
        // 显示处理结果
        this.displayProcessedResults(processed);

        // 逐步显示数据（模拟实时扫描）
        this.animateSimulationData(simData.points, processed);
    }

    /**
     * 动画显示模拟数据
     */
    animateSimulationData(points, processed) {
        this.scanData = [];
        let currentIndex = 0;
        const updateInterval = 50; // 50ms 更新一次

        const animate = () => {
            if (currentIndex >= points.length || !this.isScanning) {
                this.stopScanning();
                this.showFinalAnalysis(processed);
                return;
            }

            const point = points[currentIndex];
            this.scanData.push({ x: point.position, y: point.counts });
            
            // 更新实时显示
            this.updateRealTimeData(
                point.position, 
                point.counts, 
                currentIndex + 1, 
                points.length
            );

            // 更新图表
            if (this.chart) {
                this.updateChart();
            }

            currentIndex++;
            setTimeout(animate, updateInterval);
        };

        animate();
    }

    /**
     * 显示处理后的结果
     */
    displayProcessedResults(processed) {
        console.log('📊 数据处理结果:');
        console.log('  - 原始数据点:', processed.original.length);
        console.log('  - 平滑后数据点:', processed.smoothed.length);
        console.log('  - 检测到峰数:', processed.peaks.length);
        
        if (processed.peaks.length > 0) {
            console.log('  - 峰值信息:');
            processed.peaks.forEach((peak, i) => {
                console.log(`    峰 ${i + 1}: 位置=${peak.position}mm, 高度=${peak.height}, 面积=${peak.area}`);
            });
        }

        if (processed.purity) {
            console.log('  - 放射化学纯度:', processed.purity.purity + '%');
            console.log('  - 主峰位置:', processed.purity.mainPeak.position + 'mm');
        }

        this.logMessage(`检测到 ${processed.peaks.length} 个峰`, 'info');
    }

    /**
     * 显示最终分析结果
     */
    showFinalAnalysis(processed) {
        this.logMessage('✅ 扫描完成！开始分析...', 'success');

        if (processed.purity) {
            this.logMessage(
                `放射化学纯度: ${processed.purity.purity}% (主峰位置: ${processed.purity.mainPeak.position}mm)`,
                'success'
            );

            // 显示详细峰信息
            processed.purity.peakDetails.forEach((peak, i) => {
                this.logMessage(
                    `峰 ${peak.peakNumber}: ${peak.position}mm (${peak.percentage}%)`,
                    'info'
                );
            });

            // 计算 Rf 值
            const rfValue = window.SimulationDataGenerator.calculateRf(
                processed.purity.mainPeak.position,
                50
            );
            this.logMessage(`主峰 Rf 值: ${rfValue}`, 'info');
        }
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
        
        const startBtn = document.getElementById('start-detection-btn');
        const stopBtn = document.getElementById('stop-detection-btn');
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        
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
            const posElem = document.getElementById('current-position');
            if (posElem) posElem.textContent = position.toFixed(1);
        }, 50);
    }
    
    resetData() {
        this.scanData = [];
        this.currentPosition = 0;
        this.totalPoints = 0;
        this.scanProgress = 0;
        
        // 重置显示 - 添加安全检查
        const currentPosition = document.getElementById('current-position');
        const currentCounts = document.getElementById('current-counts');
        const totalPoints = document.getElementById('total-points');
        const scanProgress = document.getElementById('scan-progress');
        const progressFill = document.querySelector('.progress-fill');
        
        if (currentPosition) currentPosition.textContent = '0.0';
        if (currentCounts) currentCounts.textContent = '0';
        if (totalPoints) totalPoints.textContent = '0';
        if (scanProgress) scanProgress.textContent = '0';
        if (progressFill) progressFill.style.width = '0%';
        
        // 重置图表
        if (this.chart) {
            this.chart.data.datasets[0].data = this.generateDemoData();
            this.chart.update();
        }
        
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
        const exportRawBtn = document.getElementById('export-raw-data');
        const exportAnalysisBtn = document.getElementById('export-analysis-report');
        const exportPdfBtn = document.getElementById('export-pdf-report');
        const printBtn = document.getElementById('print-report');
        
        if (exportRawBtn) exportRawBtn.disabled = false;
        if (exportAnalysisBtn) exportAnalysisBtn.disabled = false;
        if (exportPdfBtn) exportPdfBtn.disabled = false;
        if (printBtn) printBtn.disabled = false;
    }
    
    disableExportFunctions() {
        const exportRawBtn = document.getElementById('export-raw-data');
        const exportAnalysisBtn = document.getElementById('export-analysis-report');
        const exportPdfBtn = document.getElementById('export-pdf-report');
        const printBtn = document.getElementById('print-report');
        
        if (exportRawBtn) exportRawBtn.disabled = true;
        if (exportAnalysisBtn) exportAnalysisBtn.disabled = true;
        if (exportPdfBtn) exportPdfBtn.disabled = true;
        if (printBtn) printBtn.disabled = true;
    }
    
    /**
     * 导出原始数据 (CSV格式)
     */
    exportRawData() {
        if (this.scanData.length === 0) {
            alert('没有可导出的数据');
            return;
        }
        
        let csv = '位置(mm),计数率(cps),时间戳\n';
        this.scanData.forEach((point, index) => {
            const timestamp = new Date(Date.now() - (this.scanData.length - index) * 100).toISOString();
            csv += `${point.x},${point.y},${timestamp}\n`;
        });
        
        this.downloadFile(csv, 'raw-data.csv', 'text/csv');
        this.logMessage('原始数据已导出', 'success');
    }
    
    /**
     * 导出分析报告 (JSON格式)
     */
    exportAnalysisReport() {
        if (!this.currentAnalysis) {
            alert('请先进行数据分析');
            return;
        }
        
        const report = {
            timestamp: new Date().toISOString(),
            scanData: this.scanData,
            analysis: this.currentAnalysis,
            metadata: {
                totalPoints: this.scanData.length,
                scanRange: '0-50mm',
                user: localStorage.getItem('currentUser') || 'demo'
            }
        };
        
        const json = JSON.stringify(report, null, 2);
        this.downloadFile(json, 'analysis-report.json', 'application/json');
        this.logMessage('分析报告已导出', 'success');
    }
    
    /**
     * 导出PDF报告
     */
    async exportPdfReport() {
        this.logMessage('正在生成PDF报告...', 'info');
        
        try {
            // 使用 ReportExporter 模块
            if (window.ReportExporter) {
                await window.ReportExporter.generateReport({
                    template: 'standard',
                    format: 'pdf',
                    data: {
                        scanData: this.scanData,
                        analysis: this.currentAnalysis
                    }
                });
                this.logMessage('PDF报告已生成', 'success');
            } else {
                alert('PDF导出功能需要报告导出模块');
            }
        } catch (error) {
            console.error('PDF导出失败:', error);
            alert('PDF导出失败，请查看控制台');
        }
    }
    
    /**
     * 打印报告
     */
    printReport() {
        this.logMessage('准备打印报告...', 'info');
        window.print();
    }
    
    /**
     * 下载文件助手
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
        
        if (logContainer) {
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        
        // 更新日志统计
        this.updateLogStats();
        
        // 持久化日志到数据库
        this.saveLogToDatabase(message, level);
    }
    
    /**
     * 保存日志到数据库
     */
    async saveLogToDatabase(message, level) {
        try {
            const logData = {
                timestamp: new Date().toISOString(),
                message: message,
                level: level,
                user: localStorage.getItem('currentUser') || 'demo',
                session: sessionStorage.getItem('sessionId') || Date.now().toString()
            };
            
            const response = await fetch('/api/logs/system', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
            });
            
            if (!response.ok) {
                console.warn('日志保存失败:', response.statusText);
            }
        } catch (error) {
            console.error('保存日志异常:', error);
        }
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
