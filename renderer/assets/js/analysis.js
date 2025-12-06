// 数据分析和管理模块
window.AnalysisModule = {
    currentAnalysis: null,
    measurementStartTime: null,
    analysisResults: null,
    dataPoints: [],
    
    // 初始化分析模块
    init() {
        this.setupEventListeners();
        
        console.log('分析模块已初始化');
    },

    // 设置事件监听器
    setupEventListeners() {
        // 分析按钮
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.performAnalysis());
        }

        // 参数变化事件
        const backgroundThreshold = document.getElementById('background-threshold');
        const peakDetection = document.getElementById('peak-detection');

        if (backgroundThreshold) {
            backgroundThreshold.addEventListener('change', () => this.updateAnalysisParameters());
        }

        if (peakDetection) {
            peakDetection.addEventListener('input', () => this.updateAnalysisParameters());
        }

        // 数据导出事件
        const exportDataBtn = document.getElementById('export-data');
        const exportReportBtn = document.getElementById('export-report');
        const printReportBtn = document.getElementById('print-report');

        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportData());
        }

        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', () => this.exportReport());
        }

        if (printReportBtn) {
            printReportBtn.addEventListener('click', () => this.printReport());
        }

        // 监听数据点添加事件
        document.addEventListener('dataPointAdded', (e) => {
            this.addDataPoint(e.detail);
        });

        // 监听串口数据事件
        document.addEventListener('serialDataReceived', (e) => {
            this.handleSerialData(e.detail);
        });
    },

    // 开始测量
    startMeasurement() {
        this.measurementStartTime = Date.now();
        this.currentAnalysis = {
            id: Utils.generateUUID(),
            name: `测量_${Utils.formatDateTime(new Date())}`,
            startTime: this.measurementStartTime,
            status: 'in_progress',
            dataPoints: []
        };

        this.updateAnalysisStatus();
        Auth.log('开始测量分析', 'info');
    },

    // 停止测量
    stopMeasurement() {
        if (this.currentAnalysis && this.measurementStartTime) {
            this.currentAnalysis.endTime = Date.now();
            this.currentAnalysis.duration = this.currentAnalysis.endTime - this.measurementStartTime;
            this.currentAnalysis.status = 'completed';
            
            this.updateAnalysisStatus();
            Auth.log('测量分析完成', 'success');
        }
    },

    // 添加数据点
    addDataPoint(dataPoint) {
        if (!this.currentAnalysis) {
            this.startMeasurement();
        }

        this.currentAnalysis.dataPoints.push(dataPoint);
        this.updateAnalysisStatus();
    },

    // 处理串口数据
    handleSerialData(data) {
        try {
            const parsedData = this.parseSerialData(data);
            if (parsedData) {
                this.addDataPoint(parsedData);
            }
        } catch (error) {
            console.error('处理串口数据失败:', error);
        }
    },

    // 解析串口数据
    parseSerialData(data) {
        // 假设数据格式: "POSITION:123.45,COUNTS:456.78,TIMESTAMP:2025-12-04T07:59:58Z"
        const parts = data.split(',');
        let position = 0;
        let countRate = 0;
        let timestamp = new Date().toISOString();

        for (const part of parts) {
            const [key, value] = part.split(':');
            switch (key.trim()) {
                case 'POSITION':
                    position = parseFloat(value.trim());
                    break;
                case 'COUNTS':
                    countRate = parseFloat(value.trim());
                    break;
                case 'TIMESTAMP':
                    timestamp = new Date(value.trim()).toISOString();
                    break;
            }
        }

        return {
            position,
            countRate,
            timestamp
        };
    },

    // 执行分析
    async performAnalysis() {
        if (!this.currentAnalysis || this.currentAnalysis.dataPoints.length === 0) {
            UI.showAlert('数据不足', '请先采集数据进行测量', 'warning');
            return;
        }

        // 使用加载指示器包装分析操作
        const performAnalysisWithLoader = window.LoadingIndicator.wrap(async () => {
            Auth.log('开始数据分析', 'info');

            // 更新进度：数据分析
            this.updateAnalysisProgress(0, '正在执行数据预处理...');
            // 执行分析算法
            this.analysisResults = await this.analyzeData();

            // 更新进度：显示结果
            this.updateAnalysisProgress(50, '正在显示分析结果...');
            // 显示分析结果
            this.displayAnalysisResults();

            // 更新进度：保存结果
            this.updateAnalysisProgress(80, '正在保存分析结果...');
            // 保存分析结果
            await this.saveAnalysisResults();

            // 更新进度：生成签名
            this.updateAnalysisProgress(95, '正在生成电子签名...');
            // 请求电子签名
            await this.requestAnalysisSignature();

            // 更新进度：完成
            this.updateAnalysisProgress(100, '分析完成');
            
            this.updateExportButtons(true);
            Auth.log('数据分析完成', 'success');
        }, {
            message: '正在进行数据分析',
            subMessage: '这可能需要几分钟时间',
            showProgress: true,
            enableCancel: true,
            onCancel: () => {
                Auth.log('用户取消了数据分析操作', 'warning');
            }
        });

        try {
            await performAnalysisWithLoader();
        } catch (error) {
            console.error('分析失败:', error);
            Auth.log(`分析失败: ${error.message}`, 'error');
            UI.showAlert('分析失败', error.message, 'error');
        }
    },

    // 分析数据
    async analyzeData() {
        const dataPoints = this.currentAnalysis.dataPoints;
        
        if (dataPoints.length < 3) {
            throw new Error('数据点不足，无法进行分析');
        }

        // 数据预处理
        const processedData = this.preprocessData(dataPoints);

        // 峰值检测
        const peaks = this.detectPeaks(processedData);

        // 背景计算
        const background = this.calculateBackground(processedData);

        // 积分计算
        const integration = this.calculateIntegration(processedData, peaks);

        // 纯度计算
        const purity = this.calculatePurity(integration);

        // Rf值计算
        const rfValue = this.calculateRfValue(peaks, processedData);

        return {
            peaks,
            background,
            integration,
            purity,
            rfValue,
            totalDataPoints: dataPoints.length,
            measurementDuration: this.currentAnalysis.duration,
            analysisTime: Date.now()
        };
    },

    // 数据预处理
    preprocessData(dataPoints) {
        // 按位置排序
        const sortedData = [...dataPoints].sort((a, b) => a.position - b.position);

        // 去噪处理
        const smoothedData = this.applySmoothing(sortedData);

        // 基线校正
        const baselineCorrectedData = this.applyBaselineCorrection(smoothedData);

        return baselineCorrectedData;
    },

    // 应用平滑处理
    applySmoothing(dataPoints, windowSize = 5) {
        if (dataPoints.length < windowSize) return dataPoints;

        const smoothed = [];
        
        for (let i = 0; i < dataPoints.length; i++) {
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(dataPoints.length, i + Math.ceil(windowSize / 2));
            const window = dataPoints.slice(start, end);
            
            const avgCountRate = window.reduce((sum, point) => sum + point.countRate, 0) / window.length;
            
            smoothed.push({
                ...dataPoints[i],
                countRate: avgCountRate
            });
        }

        return smoothed;
    },

    // 应用基线校正
    applyBaselineCorrection(dataPoints) {
        // 计算基线（使用最小值方法）
        const minCountRate = Math.min(...dataPoints.map(p => p.countRate));
        const baselineOffset = minCountRate;

        return dataPoints.map(point => ({
            ...point,
            countRate: Math.max(0, point.countRate - baselineOffset)
        }));
    },

    // 峰值检测
    detectPeaks(dataPoints) {
        const threshold = parseFloat(document.getElementById('background-threshold')?.value) || 10;
        const sensitivity = parseInt(document.getElementById('peak-detection')?.value) || 5;
        
        const peaks = [];
        
        for (let i = 1; i < dataPoints.length - 1; i++) {
            const current = dataPoints[i];
            const previous = dataPoints[i - 1];
            const next = dataPoints[i + 1];
            
            if (current.countRate > previous.countRate && 
                current.countRate > next.countRate && 
                current.countRate >= threshold) {
                
                // 验证峰值强度
                const peakStrength = current.countRate / Math.max(previous.countRate, next.countRate);
                
                if (peakStrength >= (1 + sensitivity * 0.1)) {
                    peaks.push({
                        index: i,
                        position: current.position,
                        value: current.countRate,
                        area: this.calculatePeakArea(dataPoints, i),
                        width: this.calculatePeakWidth(dataPoints, i)
                    });
                }
            }
        }

        // 按峰值强度排序
        return peaks.sort((a, b) => b.value - a.value);
    },

    // 计算峰面积
    calculatePeakArea(dataPoints, peakIndex) {
        if (peakIndex < 0 || peakIndex >= dataPoints.length) return 0;

        const peakValue = dataPoints[peakIndex].countRate;
        const threshold = peakValue * 0.1; // 10%阈值
        
        // 找到左侧基线交点
        let leftIndex = peakIndex;
        while (leftIndex > 0 && dataPoints[leftIndex].countRate > threshold) {
            leftIndex--;
        }
        
        // 找到右侧基线交点
        let rightIndex = peakIndex;
        while (rightIndex < dataPoints.length - 1 && dataPoints[rightIndex].countRate > threshold) {
            rightIndex++;
        }

        // 使用梯形法则计算面积
        let area = 0;
        for (let i = leftIndex; i < rightIndex; i++) {
            const height = (dataPoints[i].countRate + dataPoints[i + 1].countRate) / 2;
            const width = dataPoints[i + 1].position - dataPoints[i].position;
            area += height * width;
        }

        return area;
    },

    // 计算峰宽度
    calculatePeakWidth(dataPoints, peakIndex) {
        if (peakIndex < 0 || peakIndex >= dataPoints.length) return 0;

        const peakValue = dataPoints[peakIndex].countRate;
        const threshold = peakValue * 0.5; // 半峰全宽
        
        // 找到半峰位置
        let leftIndex = peakIndex;
        while (leftIndex > 0 && dataPoints[leftIndex].countRate > threshold) {
            leftIndex--;
        }
        
        let rightIndex = peakIndex;
        while (rightIndex < dataPoints.length - 1 && dataPoints[rightIndex].countRate > threshold) {
            rightIndex++;
        }

        return dataPoints[rightIndex].position - dataPoints[leftIndex].position;
    },

    // 计算背景
    calculateBackground(dataPoints) {
        // 找到最小值区域作为背景
        const sortedByRate = [...dataPoints].sort((a, b) => a.countRate - b.countRate);
        const minRate = sortedByRate[0].countRate;
        const backgroundPoints = dataPoints.filter(p => p.countRate <= minRate * 1.2);
        
        const backgroundValue = backgroundPoints.reduce((sum, p) => sum + p.countRate, 0) / backgroundPoints.length;
        
        return {
            value: backgroundValue,
            area: backgroundValue * (dataPoints[dataPoints.length - 1].position - dataPoints[0].position)
        };
    },

    // 计算积分
    calculateIntegration(dataPoints, peaks) {
        // 总面积（梯形法则）
        let totalArea = 0;
        for (let i = 0; i < dataPoints.length - 1; i++) {
            const height = (dataPoints[i].countRate + dataPoints[i + 1].countRate) / 2;
            const width = dataPoints[i + 1].position - dataPoints[i].position;
            totalArea += height * width;
        }

        const background = this.calculateBackground(dataPoints);
        const backgroundArea = background.area;
        const netArea = Math.max(0, totalArea - backgroundArea);

        return {
            totalArea,
            backgroundArea,
            netArea,
            peakAreas: peaks.map(peak => peak.area),
            peakCount: peaks.length
        };
    },

    // 计算放射化学纯度
    calculatePurity(integrationResults) {
        const totalArea = integrationResults.totalArea;
        if (totalArea === 0) return 0;

        const purity = (integrationResults.netArea / totalArea) * 100;
        return Math.max(0, Math.min(100, purity));
    },

    // 计算Rf值
    calculateRfValue(peaks, dataPoints) {
        if (peaks.length === 0) return 0;

        // 获取溶剂前沿位置
        const frontPosition = dataPoints[dataPoints.length - 1].position;
        
        // 计算主峰（最强峰）的Rf值
        const mainPeak = peaks[0];
        const rfValue = mainPeak.position / frontPosition;
        
        return Math.max(0, Math.min(1, rfValue));
    },

    // 显示分析结果
    displayAnalysisResults() {
        if (!this.analysisResults) return;

        const results = this.analysisResults;

        // 更新结果显示区域
        this.updateResultsDisplay(results);

        // 更新图表标记
        if (window.ChartModule) {
            window.ChartModule.updateChartMarkers(results);
        }

        // 创建详细报告
        this.createDetailedReport(results);
    },

    // 更新结果显示
    updateResultsDisplay(results) {
        // 更新数值显示
        const elements = {
            'peak-area': Utils.formatNumber(results.integration.totalArea, 1),
            'background-area': Utils.formatNumber(results.integration.backgroundArea, 1),
            'net-peak-area': Utils.formatNumber(results.integration.netArea, 1),
            'purity': Utils.formatPercentage(results.purity),
            'rf-value': Utils.formatNumber(results.rfValue, 3)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    },

    // 创建详细报告
    createDetailedReport(results) {
        const reportContainer = document.getElementById('analysis-report');
        if (!reportContainer) return;

        const reportHTML = `
            <div class="analysis-report">
                <h4>详细分析报告</h4>
                <div class="report-section">
                    <h5>检测结果</h5>
                    <p>检测到 ${results.peaks.length} 个峰</p>
                    <p>测量持续时间: ${Utils.formatDuration(results.measurementDuration / 1000)}</p>
                    <p>数据点数: ${results.totalDataPoints}</p>
                </div>
                
                <div class="report-section">
                    <h5>峰信息</h5>
                    ${results.peaks.map((peak, index) => `
                        <p>峰 ${index + 1}: 位置 ${Utils.formatPosition(peak.position)}mm, 
                           强度 ${Utils.formatCountRate(peak.value)}counts/s, 
                           面积 ${Utils.formatNumber(peak.area, 1)}</p>
                    `).join('')}
                </div>
                
                <div class="report-section">
                    <h5>质量控制</h5>
                    <p>放射化学纯度: ${Utils.formatPercentage(results.purity)}</p>
                    <p>Rf值: ${Utils.formatNumber(results.rfValue, 3)}</p>
                    <p>背景水平: ${Utils.formatCountRate(results.background.value)}counts/s</p>
                </div>
            </div>
        `;

        reportContainer.innerHTML = reportHTML;
    },

    // 保存分析结果
    async saveAnalysisResults() {
        if (!this.currentAnalysis || !this.analysisResults) return;

        try {
            const analysisData = {
                analysisName: this.currentAnalysis.name,
                analysisType: '放射色谱分析',
                sampleId: '未知样品',
                operatorId: Auth.getCurrentUser()?.id,
                status: 'COMPLETED',
                totalCounts: this.analysisResults.integration.totalArea,
                peakArea: this.analysisResults.integration.netArea,
                backgroundArea: this.analysisResults.integration.backgroundArea,
                purityPercentage: this.analysisResults.purity,
                rfValue: this.analysisResults.rfValue,
                comments: `检测到${this.analysisResults.peaks.length}个峰，纯度${Utils.formatPercentage(this.analysisResults.purity)}`
            };

            const result = await window.electronAPI.data.saveAnalysis(analysisData);
            
            if (result.success) {
                this.currentAnalysis.id = result.analysis.id;
                Auth.log(`分析结果已保存: ${result.analysis.id}`, 'success');
            }
        } catch (error) {
            console.error('保存分析结果失败:', error);
        }
    },

    // 请求分析签名
    async requestAnalysisSignature() {
        if (!this.analysisResults) return;

        try {
            const signatureData = {
                entityType: 'Analysis',
                entityId: this.currentAnalysis?.id || 'current',
                action: 'ANALYSIS_COMPLETE',
                reason: '数据分析完成确认',
                comment: `检测到 ${this.analysisResults.peaks.length} 个峰，纯度 ${Utils.formatPercentage(this.analysisResults.purity)}`
            };

            await Auth.createElectronicSignature(signatureData);
            Auth.log('分析完成签名已记录', 'success');
        } catch (error) {
            console.error('创建分析签名失败:', error);
        }
    },

    // 更新分析状态
    updateAnalysisStatus() {
        const statusElement = document.getElementById('analysis-status');
        const dataCountElement = document.getElementById('data-count');
        
        if (statusElement && this.currentAnalysis) {
            statusElement.textContent = this.currentAnalysis.status;
        }

        if (dataCountElement && this.currentAnalysis) {
            dataCountElement.textContent = this.currentAnalysis.dataPoints.length.toString();
        }

        // 更新分析按钮状态
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.disabled = !this.currentAnalysis || this.currentAnalysis.dataPoints.length < 3;
        }
    },

    // 更新分析参数
    updateAnalysisParameters() {
        // 重新分析（如果已有数据）
        if (this.currentAnalysis && this.currentAnalysis.dataPoints.length > 0) {
            this.performAnalysis();
        }
    },

    // 导出数据
    exportData() {
        if (!this.currentAnalysis || !this.analysisResults) {
            UI.showAlert('无数据', '请先完成分析', 'warning');
            return;
        }

        const exportData = {
            analysis: this.currentAnalysis,
            results: this.analysisResults,
            exportedAt: new Date().toISOString(),
            exportedBy: Auth.getCurrentUser()
        };

        const filename = `analysis_${Utils.formatDate(new Date(), 'YYYYMMDD_HHmmss')}`;
        Utils.file.downloadJSON(exportData, `${filename}.json`);
        
        Auth.log('分析数据已导出', 'success');
    },

    // 导出报告
    exportReport() {
        if (!this.currentAnalysis || !this.analysisResults) {
            UI.showAlert('无数据', '请先完成分析', 'warning');
            return;
        }

        // 生成PDF报告的逻辑（这里可以集成PDF生成库）
        const reportContent = this.generateReportContent();
        const filename = `report_${Utils.formatDate(new Date(), 'YYYYMMDD_HHmmss')}`;
        
        // 暂时导出为文本文件
        Utils.file.download(reportContent, `${filename}.txt`, 'text/plain');
        
        Auth.log('分析报告已导出', 'success');
    },

    // 生成报告内容
    generateReportContent() {
        const results = this.analysisResults;
        const analysis = this.currentAnalysis;
        
        return `
放射色谱分析报告
==================

分析信息:
- 分析名称: ${analysis.name}
- 分析时间: ${Utils.formatDateTime(analysis.startTime)}
- 持续时间: ${Utils.formatDuration(analysis.duration / 1000)}
- 操作员: ${Auth.getCurrentUser()?.fullName}

检测结果:
- 数据点数: ${results.totalDataPoints}
- 检测到峰数: ${results.peaks.length}

峰详细信息:
${results.peaks.map((peak, index) => 
    `峰 ${index + 1}:\n` +
    `  位置: ${Utils.formatPosition(peak.position)}mm\n` +
    `  强度: ${Utils.formatCountRate(peak.value)}counts/s\n` +
    `  面积: ${Utils.formatNumber(peak.area, 1)}\n` +
    `  宽度: ${Utils.formatPosition(peak.width, 1)}mm\n`
).join('\n')}

积分结果:
- 总面积: ${Utils.formatNumber(results.integration.totalArea, 1)}
- 背景面积: ${Utils.formatNumber(results.integration.backgroundArea, 1)}
- 净峰面积: ${Utils.formatNumber(results.integration.netArea, 1)}

质量控制:
- 放射化学纯度: ${Utils.formatPercentage(results.purity)}
- Rf值: ${Utils.formatNumber(results.rfValue, 3)}
- 背景水平: ${Utils.formatCountRate(results.background.value)}counts/s

报告生成时间: ${Utils.formatDateTime(new Date())}
电子签名: 已记录
        `;
    },

    // 打印报告
    printReport() {
        if (!this.currentAnalysis || !this.analysisResults) {
            UI.showAlert('无数据', '请先完成分析', 'warning');
            return;
        }

        // 创建打印窗口
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>放射色谱分析报告</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1, h2 { color: #333; }
                        .section { margin-bottom: 20px; }
                        .data-table { border-collapse: collapse; width: 100%; }
                        .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        .data-table th { background-color: #f2f2f2; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    ${this.generateReportContent().replace(/\n/g, '<br>')}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    },

    // 更新导出按钮状态
    updateExportButtons(enabled) {
        const exportDataBtn = document.getElementById('export-data');
        const exportReportBtn = document.getElementById('export-report');
        const printReportBtn = document.getElementById('print-report');

        [exportDataBtn, exportReportBtn, printReportBtn].forEach(btn => {
            if (btn) {
                btn.disabled = !enabled;
            }
        });
    },

    // 获取经过时间
    getElapsedTime() {
        if (!this.measurementStartTime) return 0;
        return Math.floor((Date.now() - this.measurementStartTime) / 1000);
    },

    // 重置分析
    resetAnalysis() {
        this.currentAnalysis = null;
        this.measurementStartTime = null;
        this.analysisResults = null;
        this.dataPoints = [];
        
        this.updateAnalysisStatus();
        this.updateExportButtons(false);
        
        Auth.log('分析已重置', 'info');
    },

    // 获取当前分析
    getCurrentAnalysis() {
        return this.currentAnalysis;
    },

    // 获取分析结果
    getAnalysisResults() {
        return this.analysisResults;
    },

    /**
     * 更新分析进度
     * @param {number} progress - 进度百分比 (0-100)
     * @param {string} message - 进度消息
     */
    updateAnalysisProgress(progress, message) {
        if (window.LoadingIndicator && window.LoadingIndicator.hasActiveLoaders()) {
            const loaders = window.LoadingIndicator.getActiveLoaders();
            loaders.forEach(loader => {
                if (loader.message.includes('分析')) {
                    window.LoadingIndicator.updateProgress(loader.id, progress, message);
                }
            });
        }
    }
};

console.log('分析模块已加载');