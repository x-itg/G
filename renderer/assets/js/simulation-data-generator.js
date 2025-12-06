/**
 * 模拟数据生成器
 * 用于在没有真实设备时生成模拟的检测数据
 */

window.SimulationDataGenerator = {
    /**
     * 初始化模块
     */
    init() {
        console.log('📊 模拟数据生成器已初始化');
        
        // 添加全局快捷命令
        window.runDemo = () => {
            console.log('🎯 运行完整演示...');
            const demo = this.generateDemoDataset();
            console.log('演示数据集:', demo);
            return demo;
        };
        
        window.quickScan = (purity = 95) => {
            console.log(`🔬 快速扫描 (纯度=${purity}%)...`);
            const data = this.generatePurityTestData(purity);
            const processed = this.applyDataProcessing(data.points);
            console.log('扫描数据:', data);
            console.log('处理结果:', processed);
            return { data, processed };
        };
        
        console.log('💡 快捷命令已注册:');
        console.log('  - runDemo()      : 生成完整演示数据集');
        console.log('  - quickScan(95)  : 快速扫描指定纯度');
    },

    /**
     * 生成 0-50mm 的放射性扫描曲线数据
     * @param {Object} options - 生成选项
     * @returns {Object} 包含位置和计数率的数据
     */
    generateScanData(options = {}) {
        const defaults = {
            scanLength: 50,          // 扫描长度 (mm)
            stepSize: 0.1,           // 步长 (mm)
            peakCount: 3,            // 峰的数量
            baselineNoise: 50,       // 基线噪声水平
            peakHeight: 1000,        // 峰值高度
            peakWidth: 2,            // 峰宽度 (mm)
            noiseLevel: 0.1          // 噪声级别 (0-1)
        };

        const config = { ...defaults, ...options };
        const points = [];
        const numPoints = Math.floor(config.scanLength / config.stepSize);

        // 随机生成峰的位置
        const peaks = [];
        for (let i = 0; i < config.peakCount; i++) {
            peaks.push({
                position: 5 + (i + 1) * (config.scanLength - 10) / (config.peakCount + 1),
                height: config.peakHeight * (0.5 + Math.random() * 0.5),
                width: config.peakWidth * (0.8 + Math.random() * 0.4)
            });
        }

        // 生成数据点
        for (let i = 0; i <= numPoints; i++) {
            const position = i * config.stepSize;
            let counts = config.baselineNoise;

            // 添加所有峰的贡献
            peaks.forEach(peak => {
                const distance = Math.abs(position - peak.position);
                const gaussian = peak.height * Math.exp(-Math.pow(distance / peak.width, 2));
                counts += gaussian;
            });

            // 添加随机噪声
            const noise = (Math.random() - 0.5) * 2 * config.noiseLevel * counts;
            counts = Math.max(0, counts + noise);

            points.push({
                position: parseFloat(position.toFixed(2)),
                counts: Math.round(counts),
                time: Date.now() + i * 100
            });
        }

        return {
            points,
            metadata: {
                scanLength: config.scanLength,
                totalPoints: points.length,
                peaks: peaks.map(p => ({
                    position: p.position.toFixed(2),
                    estimatedHeight: Math.round(p.height)
                })),
                generatedAt: new Date().toISOString()
            }
        };
    },

    /**
     * 生成带有特定 Rf 值的色谱数据
     * @param {Array} rfValues - Rf 值数组
     * @param {Number} solventFront - 溶剂前沿位置 (mm)
     */
    generateChromatographyData(rfValues = [0.3, 0.5, 0.8], solventFront = 50) {
        const peaks = rfValues.map((rf, index) => ({
            position: rf * solventFront,
            height: 800 + Math.random() * 400,
            width: 1.5 + Math.random() * 1
        }));

        return this.generateScanData({
            scanLength: solventFront,
            peakCount: 0,  // 不使用随机峰
            customPeaks: peaks
        });
    },

    /**
     * 生成放射化学纯度测试数据
     * @param {Number} mainPeakPurity - 主峰纯度百分比
     */
    generatePurityTestData(mainPeakPurity = 95) {
        const mainPeakHeight = 1500;
        const impurityHeight = mainPeakHeight * (100 - mainPeakPurity) / mainPeakPurity;

        const data = this.generateScanData({
            scanLength: 50,
            stepSize: 0.1,
            peakCount: 0
        });

        // 主峰在 Rf = 0.7 位置
        const mainPeakPos = 35;
        // 杂质峰在 Rf = 0.4 位置
        const impurityPos = 20;

        data.points.forEach(point => {
            // 主峰
            const mainDist = Math.abs(point.position - mainPeakPos);
            point.counts += mainPeakHeight * Math.exp(-Math.pow(mainDist / 2, 2));

            // 杂质峰
            const impDist = Math.abs(point.position - impurityPos);
            point.counts += impurityHeight * Math.exp(-Math.pow(impDist / 1.5, 2));

            point.counts = Math.round(point.counts);
        });

        data.metadata.purity = mainPeakPurity;
        data.metadata.mainPeakPosition = mainPeakPos;
        data.metadata.impurityPosition = impurityPos;

        return data;
    },

    /**
     * 应用数据处理算法演示
     * @param {Array} data - 原始数据点
     */
    applyDataProcessing(data) {
        const processed = {
            original: data,
            smoothed: null,
            baselineCorrected: null,
            peaks: null,
            purity: null
        };

        // 1. 平滑处理 (移动平均)
        processed.smoothed = this.movingAverage(data, 5);

        // 2. 基线校正
        processed.baselineCorrected = this.baselineCorrection(processed.smoothed);

        // 3. 峰值检测
        processed.peaks = this.detectPeaks(processed.baselineCorrected);

        // 4. 计算放射化学纯度
        if (processed.peaks.length > 0) {
            processed.purity = this.calculatePurity(processed.baselineCorrected, processed.peaks);
        }

        return processed;
    },

    /**
     * 移动平均平滑
     */
    movingAverage(data, windowSize) {
        const smoothed = [];
        const halfWindow = Math.floor(windowSize / 2);

        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - halfWindow);
            const end = Math.min(data.length, i + halfWindow + 1);
            const window = data.slice(start, end);
            const avg = window.reduce((sum, p) => sum + p.counts, 0) / window.length;
            
            smoothed.push({
                ...data[i],
                counts: Math.round(avg)
            });
        }

        return smoothed;
    },

    /**
     * 基线校正
     */
    baselineCorrection(data) {
        if (!data || data.length === 0) return data;

        // 使用最小值作为基线
        const baseline = Math.min(...data.map(p => p.counts));
        
        return data.map(p => ({
            ...p,
            counts: Math.max(0, p.counts - baseline)
        }));
    },

    /**
     * 峰值检测
     */
    detectPeaks(data, threshold = 0.1) {
        const peaks = [];
        const maxCount = Math.max(...data.map(p => p.counts));
        const minHeight = maxCount * threshold;

        for (let i = 1; i < data.length - 1; i++) {
            const current = data[i].counts;
            const prev = data[i - 1].counts;
            const next = data[i + 1].counts;

            if (current > prev && current > next && current > minHeight) {
                // 寻找峰的边界
                let leftIdx = i;
                let rightIdx = i;

                while (leftIdx > 0 && data[leftIdx].counts > minHeight * 0.5) {
                    leftIdx--;
                }

                while (rightIdx < data.length - 1 && data[rightIdx].counts > minHeight * 0.5) {
                    rightIdx++;
                }

                // 计算峰面积
                const area = data.slice(leftIdx, rightIdx + 1)
                    .reduce((sum, p) => sum + p.counts, 0);

                peaks.push({
                    index: i,
                    position: data[i].position,
                    height: current,
                    area: area,
                    leftBoundary: data[leftIdx].position,
                    rightBoundary: data[rightIdx].position,
                    width: data[rightIdx].position - data[leftIdx].position
                });
            }
        }

        return peaks.sort((a, b) => b.height - a.height);
    },

    /**
     * 计算放射化学纯度
     */
    calculatePurity(data, peaks) {
        if (peaks.length === 0) return { purity: 0, mainPeak: null };

        const totalArea = data.reduce((sum, p) => sum + p.counts, 0);
        const mainPeak = peaks[0];
        const purity = (mainPeak.area / totalArea * 100).toFixed(2);

        return {
            purity: parseFloat(purity),
            mainPeak: mainPeak,
            totalPeaks: peaks.length,
            totalArea: totalArea,
            peakDetails: peaks.map((p, i) => ({
                peakNumber: i + 1,
                position: p.position,
                height: p.height,
                area: p.area,
                percentage: (p.area / totalArea * 100).toFixed(2)
            }))
        };
    },

    /**
     * 计算 Rf 值
     */
    calculateRf(peakPosition, solventFront = 50) {
        return (peakPosition / solventFront).toFixed(3);
    },

    /**
     * 生成完整的演示数据集
     */
    generateDemoDataset() {
        console.log('🎯 生成演示数据集...');

        const dataset = {
            // 1. 标准扫描数据
            standardScan: this.generateScanData({
                scanLength: 50,
                stepSize: 0.1,
                peakCount: 3,
                peakHeight: 1200
            }),

            // 2. 高纯度样品 (95%)
            highPurity: this.generatePurityTestData(95),

            // 3. 中等纯度样品 (85%)
            mediumPurity: this.generatePurityTestData(85),

            // 4. 低纯度样品 (70%)
            lowPurity: this.generatePurityTestData(70),

            // 5. 色谱分析数据
            chromatography: this.generateChromatographyData([0.3, 0.5, 0.8], 50)
        };

        // 对每个数据集应用处理算法
        Object.keys(dataset).forEach(key => {
            dataset[key].processed = this.applyDataProcessing(dataset[key].points);
        });

        console.log('✅ 演示数据集生成完成:', dataset);
        return dataset;
    }
};

console.log('模拟数据生成器已加载');
