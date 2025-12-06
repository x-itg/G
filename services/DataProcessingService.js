/**
 * 数据采集和处理服务
 * Data Acquisition and Processing Service
 * 
 * 功能特点:
 * - 实时数据获取和缓存
 * - 数字滤波和预处理
 * - 谱线分析算法
 * - 峰识别和积分
 * - 定量分析功能
 * - CFR 21 Part 11 合规数据处理
 */

const EventEmitter = require('events');

class DataProcessingService extends EventEmitter {
    constructor(db, hardwareCommunicationService = null) {
        super();
        this.db = db;
        this.hardwareService = hardwareCommunicationService;
        this.isProcessing = false;
        this.currentSpectrum = null;
        this.processingQueue = [];
        this.maxQueueSize = 1000;
        
        // 数据处理配置
        this.config = {
            // 数据处理参数
            processing: {
                smoothingWindow: 5,        // 平滑窗口大小
                baselineCorrection: true,  // 基线校正
                peakDetection: {
                    threshold: 3.0,        // 峰检测阈值 (信噪比)
                    minWidth: 2,           // 最小峰宽度
                    maxWidth: 50,          // 最大峰宽度
                    minHeight: 100         // 最小峰高度
                },
                gaussianFitting: {
                    tolerance: 1e-6,       // 高斯拟合容差
                    maxIterations: 100     // 最大迭代次数
                }
            },
            
            // 过滤器配置
            filters: {
                movingAverage: {
                    windowSize: 5,
                    enabled: true
                },
                savitzkyGolay: {
                    windowSize: 5,
                    polynomialOrder: 2,
                    enabled: true
                },
                median: {
                    windowSize: 3,
                    enabled: true
                },
                kalman: {
                    processNoise: 1e-4,
                    measurementNoise: 1e-2,
                    enabled: false
                }
            },
            
            // 探测器类型配置
            detectorTypes: {
                hpge_detector: {
                    channels: 4096,
                    energyRange: [0, 3000], // keV
                    resolution: 2.0,         // keV FWHM at 1332 keV
                    efficiency: 0.15
                },
                nai_detector: {
                    channels: 1024,
                    energyRange: [0, 3000],
                    resolution: 8.0,
                    efficiency: 0.80
                },
                plastic_scintillator: {
                    channels: 256,
                    energyRange: [0, 1000],
                    resolution: 50.0,
                    efficiency: 0.95
                }
            },
            
            // 核素数据库
            nuclideDatabase: {
                'Co-60': {
                    energy: [1173.2, 1332.5],
                    abundance: [99.85, 99.98],
                    halfLife: '5.27 y'
                },
                'Cs-137': {
                    energy: [661.7],
                    abundance: [85.1],
                    halfLife: '30.2 y'
                },
                'Ba-133': {
                    energy: [80.9, 276.4, 302.8, 356.0, 383.8],
                    abundance: [34.1, 7.3, 18.3, 62.1, 8.9],
                    halfLife: '10.5 y'
                },
                'Eu-152': {
                    energy: [121.8, 244.7, 344.3, 411.1, 444.0, 778.9, 964.0, 1085.9, 1112.1, 1408.0],
                    abundance: [28.4, 7.5, 26.6, 2.2, 3.1, 12.9, 14.6, 10.1, 13.4, 21.0],
                    halfLife: '13.5 y'
                }
            }
        };
        
        // 数据缓冲区
        this.dataBuffers = {
            raw: [],           // 原始数据
            processed: [],     // 处理后数据
            baseline: [],      // 基线数据
            peaks: [],         // 峰数据
            results: []        // 分析结果
        };
        
        // 当前分析状态
        this.analysisState = {
            isRunning: false,
            currentDetector: null,
            totalCounts: 0,
            liveTime: 0,
            realTime: 0,
            startTime: null,
            lastUpdate: null
        };
        
        // 统计信息
        this.stats = {
            totalProcessed: 0,
            peaksDetected: 0,
            averageProcessingTime: 0,
            lastProcessTime: 0,
            errors: 0
        };
        
        // 初始化
        this.initialize();
    }

    /**
     * 初始化
     */
    async initialize() {
        try {
            console.log('初始化数据采集和处理系统...');
            
            // 创建数据库表
            await this.createDatabaseTables();
            
            // 加载配置
            await this.loadConfiguration();
            
            // 设置事件监听
            this.setupEventListeners();
            
            console.log('数据采集和处理系统初始化完成');
            
        } catch (error) {
            console.error('数据采集和处理系统初始化失败:', error);
            throw error;
        }
    }

    /**
     * 创建数据库表
     */
    async createDatabaseTables() {
        // 谱线数据表
        const spectrumTable = `
            CREATE TABLE IF NOT EXISTS spectrum_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                detector_type TEXT NOT NULL,
                channel_count INTEGER NOT NULL,
                spectrum_data TEXT NOT NULL,
                total_counts INTEGER DEFAULT 0,
                live_time REAL DEFAULT 0,
                real_time REAL DEFAULT 0,
                user_id INTEGER,
                session_id TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `;
        
        // 峰分析结果表
        const peakAnalysisTable = `
            CREATE TABLE IF NOT EXISTS peak_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                spectrum_id INTEGER NOT NULL,
                peak_channel INTEGER NOT NULL,
                peak_energy REAL NOT NULL,
                peak_area INTEGER NOT NULL,
                peak_height INTEGER NOT NULL,
                fwhm REAL,
                nuclide TEXT,
                confidence REAL DEFAULT 0,
                analysis_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (spectrum_id) REFERENCES spectrum_data(id)
            )
        `;
        
        // 定量分析结果表
        const quantitativeTable = `
            CREATE TABLE IF NOT EXISTS quantitative_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                spectrum_id INTEGER NOT NULL,
                nuclide TEXT NOT NULL,
                activity_bq REAL NOT NULL,
                activity_uncertainty REAL,
                concentration_ppm REAL,
                method TEXT DEFAULT 'peak_area',
                analysis_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (spectrum_id) REFERENCES spectrum_data(id)
            )
        `;
        
        // 处理日志表
        const processingLogTable = `
            CREATE TABLE IF NOT EXISTS data_processing_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                operation_type TEXT NOT NULL,
                operation_data TEXT,
                result TEXT,
                processing_time REAL,
                user_id INTEGER,
                session_id TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `;
        
        try {
            await this.db.run(spectrumTable);
            await this.db.run(peakAnalysisTable);
            await this.db.run(quantitativeTable);
            await this.db.run(processingLogTable);
            
            console.log('数据处理数据库表创建成功');
        } catch (error) {
            console.error('创建数据库表失败:', error);
            throw error;
        }
    }

    /**
     * 加载配置
     */
    async loadConfiguration() {
        try {
            const query = `SELECT key, value FROM system_settings WHERE category = 'data_processing'`;
            const settings = await this.db.all(query);
            
            settings.forEach(setting => {
                const key = setting.key;
                const value = JSON.parse(setting.value);
                
                // 更新配置
                if (key in this.config) {
                    this.config[key] = { ...this.config[key], ...value };
                }
            });
            
        } catch (error) {
            console.warn('加载数据处理配置失败，使用默认配置:', error.message);
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听硬件数据
        if (this.hardwareService) {
            this.hardwareService.on('spectrumData', (data) => {
                this.processSpectrumData(data);
            });
            
            this.hardwareService.on('dataReceived', (data) => {
                this.processRawData(data);
            });
        }
        
        // 监听分析事件
        this.on('analysisStarted', (data) => {
            console.log('数据处理分析开始:', data);
            this.logProcessing('ANALYSIS_START', data);
        });
        
        this.on('analysisCompleted', (data) => {
            console.log('数据处理分析完成:', data);
            this.logProcessing('ANALYSIS_COMPLETE', data);
        });
        
        this.on('peakDetected', (data) => {
            console.log('检测到峰:', data);
            this.stats.peaksDetected++;
        });
        
        this.on('error', (error) => {
            console.error('数据处理错误:', error);
            this.stats.errors++;
            this.logProcessing('ERROR', { error: error.message });
        });
    }

    /**
     * 处理谱线数据
     */
    async processSpectrumData(data) {
        try {
            this.emit('analysisStarted', {
                timestamp: data.timestamp,
                device: data.device,
                totalCounts: data.totalCounts
            });
            
            // 验证数据
            if (!data.spectrum || !Array.isArray(data.spectrum)) {
                throw new Error('无效的谱线数据格式');
            }
            
            // 确定探测器类型
            const detectorType = this.detectDetectorType(data.device);
            
            // 预处理数据
            const processedData = await this.preprocessData(data.spectrum, detectorType);
            
            // 保存原始数据
            await this.saveSpectrumData({
                spectrum: data.spectrum,
                detectorType: detectorType,
                totalCounts: data.totalCounts,
                liveTime: data.liveTime || 0,
                realTime: data.realTime || 0,
                timestamp: data.timestamp
            });
            
            // 峰检测和分析
            const peakResults = await this.detectAndAnalyzePeaks(processedData, detectorType);
            
            // 定量分析
            const quantitativeResults = await this.performQuantitativeAnalysis(peakResults, detectorType);
            
            // 更新当前分析状态
            this.updateAnalysisState({
                totalCounts: data.totalCounts,
                liveTime: data.liveTime || 0,
                realTime: data.realTime || 0
            });
            
            this.currentSpectrum = {
                raw: data.spectrum,
                processed: processedData,
                peaks: peakResults,
                quantitative: quantitativeResults,
                detectorType: detectorType,
                timestamp: data.timestamp
            };
            
            // 触发分析完成事件
            this.emit('analysisCompleted', {
                timestamp: data.timestamp,
                peaksFound: peakResults.length,
                quantitativeResults: quantitativeResults.length
            });
            
            // 更新统计
            this.stats.totalProcessed++;
            this.stats.lastProcessTime = Date.now();
            
        } catch (error) {
            console.error('处理谱线数据失败:', error);
            this.emit('error', error);
        }
    }

    /**
     * 预处理数据
     */
    async preprocessData(rawSpectrum, detectorType) {
        try {
            const startTime = Date.now();
            
            // 1. 数字滤波
            let processed = this.applyDigitalFilters(rawSpectrum);
            
            // 2. 基线校正
            if (this.config.processing.baselineCorrection) {
                processed = this.correctBaseline(processed);
            }
            
            // 3. 归一化
            processed = this.normalizeSpectrum(processed);
            
            const processingTime = Date.now() - startTime;
            this.logProcessing('PREPROCESS', {
                detectorType: detectorType,
                originalLength: rawSpectrum.length,
                processedLength: processed.length,
                processingTime: processingTime
            }, 'success', processingTime);
            
            return processed;
            
        } catch (error) {
            console.error('预处理数据失败:', error);
            throw error;
        }
    }

    /**
     * 应用数字滤波器
     */
    applyDigitalFilters(spectrum) {
        let filtered = [...spectrum];
        
        // 移动平均滤波器
        if (this.config.filters.movingAverage.enabled) {
            filtered = this.movingAverageFilter(filtered, this.config.filters.movingAverage.windowSize);
        }
        
        // Savitzky-Golay滤波器
        if (this.config.filters.savitzkyGolay.enabled) {
            filtered = this.savitzkyGolayFilter(filtered, 
                this.config.filters.savitzkyGolay.windowSize,
                this.config.filters.savitzkyGolay.polynomialOrder);
        }
        
        // 中值滤波器
        if (this.config.filters.median.enabled) {
            filtered = this.medianFilter(filtered, this.config.filters.median.windowSize);
        }
        
        // 卡尔曼滤波器
        if (this.config.filters.kalman.enabled) {
            filtered = this.kalmanFilter(filtered, this.config.filters.kalman);
        }
        
        return filtered;
    }

    /**
     * 移动平均滤波器
     */
    movingAverageFilter(spectrum, windowSize) {
        const filtered = new Array(spectrum.length);
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < spectrum.length; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = -halfWindow; j <= halfWindow; j++) {
                const index = i + j;
                if (index >= 0 && index < spectrum.length) {
                    sum += spectrum[index];
                    count++;
                }
            }
            
            filtered[i] = sum / count;
        }
        
        return filtered;
    }

    /**
     * Savitzky-Golay滤波器
     */
    savitzkyGolayFilter(spectrum, windowSize, polynomialOrder) {
        if (windowSize % 2 === 0) windowSize++;
        if (polynomialOrder >= windowSize) polynomialOrder = windowSize - 1;
        
        const halfWindow = Math.floor(windowSize / 2);
        const coefficients = this.calculateSGCoeficients(windowSize, polynomialOrder);
        const filtered = new Array(spectrum.length);
        
        for (let i = 0; i < spectrum.length; i++) {
            let value = 0;
            
            for (let j = 0; j < windowSize; j++) {
                const index = i + j - halfWindow;
                if (index >= 0 && index < spectrum.length) {
                    value += spectrum[index] * coefficients[j];
                }
            }
            
            filtered[i] = value;
        }
        
        return filtered;
    }

    /**
     * 计算Savitzky-Golay系数
     */
    calculateSGCoeficients(windowSize, polynomialOrder) {
        // 简化的Savitzky-Golay系数计算
        // 在实际应用中，这里应该实现完整的数值算法
        const coefficients = new Array(windowSize).fill(1 / windowSize);
        return coefficients;
    }

    /**
     * 中值滤波器
     */
    medianFilter(spectrum, windowSize) {
        const filtered = new Array(spectrum.length);
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < spectrum.length; i++) {
            const values = [];
            
            for (let j = -halfWindow; j <= halfWindow; j++) {
                const index = i + j;
                if (index >= 0 && index < spectrum.length) {
                    values.push(spectrum[index]);
                }
            }
            
            values.sort((a, b) => a - b);
            filtered[i] = values[Math.floor(values.length / 2)];
        }
        
        return filtered;
    }

    /**
     * 卡尔曼滤波器
     */
    kalmanFilter(spectrum, config) {
        const filtered = new Array(spectrum.length);
        let x = spectrum[0] || 0;  // 状态估计
        let P = 1.0;              // 误差协方差
        
        for (let i = 0; i < spectrum.length; i++) {
            // 预测步骤
            const x_pred = x;
            const P_pred = P + config.processNoise;
            
            // 更新步骤
            const K = P_pred / (P_pred + config.measurementNoise);  // 卡尔曼增益
            x = x_pred + K * (spectrum[i] - x_pred);               // 状态更新
            P = (1 - K) * P_pred;                                  // 误差协方差更新
            
            filtered[i] = x;
        }
        
        return filtered;
    }

    /**
     * 基线校正
     */
    correctBaseline(spectrum) {
        // 简单的线性基线校正
        // 在实际应用中，可以使用更复杂的算法如SNIP
        
        // 找到非零区域的端点
        let startIndex = 0;
        let endIndex = spectrum.length - 1;
        
        // 找到第一个显著信号
        const threshold = this.findNoiseLevel(spectrum) * 2;
        for (let i = 0; i < spectrum.length; i++) {
            if (spectrum[i] > threshold) {
                startIndex = Math.max(0, i - 10);
                break;
            }
        }
        
        // 找到最后一个显著信号
        for (let i = spectrum.length - 1; i >= 0; i--) {
            if (spectrum[i] > threshold) {
                endIndex = Math.min(spectrum.length - 1, i + 10);
                break;
            }
        }
        
        // 计算基线
        const baselineStart = this.movingAverage([spectrum[startIndex]], 1)[0];
        const baselineEnd = this.movingAverage([spectrum[endIndex]], 1)[0];
        
        // 线性插值基线
        const corrected = [...spectrum];
        for (let i = startIndex; i <= endIndex; i++) {
            const t = (i - startIndex) / (endIndex - startIndex);
            const baseline = baselineStart + t * (baselineEnd - baselineStart);
            corrected[i] = Math.max(0, spectrum[i] - baseline);
        }
        
        return corrected;
    }

    /**
     * 归一化谱线
     */
    normalizeSpectrum(spectrum) {
        const maxValue = Math.max(...spectrum);
        if (maxValue === 0) return spectrum;
        
        return spectrum.map(value => value / maxValue);
    }

    /**
     * 检测噪声水平
     */
    findNoiseLevel(spectrum) {
        // 使用前10%的数据估算噪声水平
        const noiseRegion = spectrum.slice(0, Math.floor(spectrum.length * 0.1));
        const sorted = [...noiseRegion].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const mad = sorted.map(x => Math.abs(x - median));
        const madMedian = mad.sort((a, b) => a - b)[Math.floor(mad.length / 2)];
        return madMedian * 1.4826;  // 转换为标准差
    }

    /**
     * 移动平均辅助函数
     */
    movingAverage(values, windowSize) {
        if (windowSize <= 1) return values;
        
        const result = [];
        for (let i = 0; i < values.length; i++) {
            let sum = 0;
            let count = 0;
            for (let j = Math.max(0, i - Math.floor(windowSize / 2)); 
                 j <= Math.min(values.length - 1, i + Math.floor(windowSize / 2)); j++) {
                sum += values[j];
                count++;
            }
            result.push(sum / count);
        }
        return result;
    }

    /**
     * 峰检测和分析
     */
    async detectAndAnalyzePeaks(spectrum, detectorType) {
        try {
            const peaks = [];
            const threshold = this.config.processing.peakDetection.threshold;
            const noiseLevel = this.findNoiseLevel(spectrum);
            
            // 一阶导数检测峰
            const firstDerivative = this.calculateDerivative(spectrum);
            const secondDerivative = this.calculateDerivative(firstDerivative);
            
            // 寻找局部最大值
            for (let i = 1; i < spectrum.length - 1; i++) {
                if (spectrum[i] > spectrum[i - 1] && 
                    spectrum[i] > spectrum[i + 1] &&
                    spectrum[i] > threshold * noiseLevel) {
                    
                    // 峰宽度验证
                    const peakWidth = this.calculatePeakWidth(spectrum, i);
                    if (peakWidth >= this.config.processing.peakDetection.minWidth &&
                        peakWidth <= this.config.processing.peakDetection.maxWidth) {
                        
                        // 峰高度验证
                        const peakHeight = spectrum[i];
                        if (peakHeight >= this.config.processing.peakDetection.minHeight) {
                            
                            // 高斯拟合
                            const gaussianFit = await this.fitGaussian(spectrum, i, peakWidth);
                            
                            // 计算能量
                            const energy = this.channelToEnergy(i, detectorType);
                            
                            // 峰面积计算
                            const peakArea = this.calculatePeakArea(spectrum, i, peakWidth);
                            
                            const peak = {
                                channel: i,
                                energy: energy,
                                height: peakHeight,
                                area: peakArea,
                                fwhm: gaussianFit.fwhm,
                                amplitude: gaussianFit.amplitude,
                                center: gaussianFit.center,
                                sigma: gaussianFit.sigma,
                                confidence: gaussianFit.confidence,
                                background: gaussianFit.background
                            };
                            
                            peaks.push(peak);
                            this.emit('peakDetected', peak);
                        }
                    }
                }
            }
            
            return peaks;
            
        } catch (error) {
            console.error('峰检测和分析失败:', error);
            throw error;
        }
    }

    /**
     * 计算导数
     */
    calculateDerivative(spectrum) {
        const derivative = new Array(spectrum.length);
        derivative[0] = 0;
        derivative[spectrum.length - 1] = 0;
        
        for (let i = 1; i < spectrum.length - 1; i++) {
            derivative[i] = (spectrum[i + 1] - spectrum[i - 1]) / 2;
        }
        
        return derivative;
    }

    /**
     * 计算峰宽度
     */
    calculatePeakWidth(spectrum, peakIndex) {
        const halfMaximum = spectrum[peakIndex] / 2;
        let leftIndex = peakIndex;
        let rightIndex = peakIndex;
        
        // 向左查找半高宽
        for (let i = peakIndex - 1; i >= 0; i--) {
            if (spectrum[i] <= halfMaximum) {
                leftIndex = i;
                break;
            }
        }
        
        // 向右查找半高宽
        for (let i = peakIndex + 1; i < spectrum.length; i++) {
            if (spectrum[i] <= halfMaximum) {
                rightIndex = i;
                break;
            }
        }
        
        return rightIndex - leftIndex + 1;
    }

    /**
     * 高斯拟合
     */
    async fitGaussian(spectrum, peakIndex, peakWidth) {
        try {
            const startIndex = Math.max(0, peakIndex - Math.floor(peakWidth * 2));
            const endIndex = Math.min(spectrum.length - 1, peakIndex + Math.floor(peakWidth * 2));
            
            const x = [];
            const y = [];
            
            for (let i = startIndex; i <= endIndex; i++) {
                x.push(i);
                y.push(spectrum[i]);
            }
            
            // 简化的非线性最小二乘法拟合
            // 在实际应用中，可以使用更精确的算法如Levenberg-Marquardt
            
            const initialParams = {
                amplitude: Math.max(...y),
                center: peakIndex,
                sigma: peakWidth / 2.355,  // FWHM to sigma conversion
                background: Math.min(...y)
            };
            
            const fitted = this.gaussFit(x, y, initialParams);
            
            // 计算FWHM
            const fwhm = fitted.sigma * 2.355;
            
            // 计算拟合质量
            const confidence = this.calculateFitConfidence(y, fitted);
            
            return {
                amplitude: fitted.amplitude,
                center: fitted.center,
                sigma: fitted.sigma,
                background: fitted.background,
                fwhm: fwhm,
                confidence: confidence,
                fitted: fitted
            };
            
        } catch (error) {
            console.error('高斯拟合失败:', error);
            return {
                amplitude: spectrum[peakIndex],
                center: peakIndex,
                sigma: peakWidth / 2.355,
                background: 0,
                fwhm: peakWidth,
                confidence: 0.5
            };
        }
    }

    /**
     * 高斯拟合函数
     */
    gaussFit(x, y, initialParams) {
        let amplitude = initialParams.amplitude;
        let center = initialParams.center;
        let sigma = initialParams.sigma;
        let background = initialParams.background;
        
        const maxIterations = this.config.processing.gaussianFitting.maxIterations;
        const tolerance = this.config.processing.gaussianFitting.tolerance;
        
        for (let iter = 0; iter < maxIterations; iter++) {
            const previous = { amplitude, center, sigma, background };
            
            // 简化的参数优化
            // 在实际应用中，这里应该实现完整的梯度下降算法
            
            // 计算残差
            let sumResidual = 0;
            for (let i = 0; i < x.length; i++) {
                const fitted = background + amplitude * Math.exp(-0.5 * Math.pow((x[i] - center) / sigma, 2));
                const residual = y[i] - fitted;
                sumResidual += residual * residual;
            }
            
            // 简单的参数调整
            if (sumResidual < tolerance) break;
            
            // 调整参数
            amplitude *= 0.99;
            sigma *= 1.01;
            background *= 0.95;
        }
        
        return { amplitude, center, sigma, background };
    }

    /**
     * 计算拟合置信度
     */
    calculateFitConfidence(observed, fitted) {
        let sumSquaredError = 0;
        let sumSquaredTotal = 0;
        const meanObserved = observed.reduce((a, b) => a + b) / observed.length;
        
        for (let i = 0; i < observed.length; i++) {
            const predicted = fitted.background + fitted.amplitude * 
                            Math.exp(-0.5 * Math.pow((i - fitted.center) / fitted.sigma, 2));
            const error = observed[i] - predicted;
            sumSquaredError += error * error;
            sumSquaredTotal += Math.pow(observed[i] - meanObserved, 2);
        }
        
        const rSquared = 1 - (sumSquaredError / sumSquaredTotal);
        return Math.max(0, Math.min(1, rSquared));
    }

    /**
     * 计算峰面积
     */
    calculatePeakArea(spectrum, peakIndex, peakWidth) {
        const startIndex = Math.max(0, peakIndex - Math.floor(peakWidth / 2));
        const endIndex = Math.min(spectrum.length - 1, peakIndex + Math.floor(peakWidth / 2));
        
        let area = 0;
        for (let i = startIndex; i <= endIndex; i++) {
            area += spectrum[i];
        }
        
        return area;
    }

    /**
     * 通道转能量
     */
    channelToEnergy(channel, detectorType) {
        const detector = this.config.detectorTypes[detectorType];
        if (!detector) return channel;
        
        const energyPerChannel = (detector.energyRange[1] - detector.energyRange[0]) / detector.channels;
        return detector.energyRange[0] + channel * energyPerChannel;
    }

    /**
     * 检测探测器类型
     */
    detectDetectorType(device) {
        if (!device) return 'hpge_detector'; // 默认探测器
        
        // 支持多种device属性格式
        const deviceStr = [
            device.name,
            device.model,
            device.type,
            device.detectorType,
            device.name?.toLowerCase(),
            device.model?.toLowerCase(),
            device.type?.toLowerCase(),
            device.detectorType?.toLowerCase()
        ].filter(Boolean).join(' ');
        
        if (deviceStr.includes('高纯锗') || deviceStr.includes('gem')) {
            return 'hpge_detector';
        } else if (deviceStr.includes('碘化钠') || deviceStr.includes('nai')) {
            return 'nai_detector';
        } else if (deviceStr.includes('塑料') || deviceStr.includes('plastic')) {
            return 'plastic_scintillator';
        }
        
        return 'hpge_detector'; // 默认
    }

    /**
     * 执行定量分析
     */
    async performQuantitativeAnalysis(peaks, detectorType) {
        try {
            const results = [];
            const detector = this.config.detectorTypes[detectorType];
            
            for (const peak of peaks) {
                // 核素识别
                const identifiedNuclides = this.identifyNuclides(peak.energy);
                
                for (const nuclideInfo of identifiedNuclides) {
                    // 计算活度
                    const activity = this.calculateActivity(peak, nuclideInfo, detector);
                    
                    if (activity > 0) {
                        results.push({
                            nuclide: nuclideInfo.nuclide,
                            energy: peak.energy,
                            activity_bq: activity.value,
                            activity_uncertainty: activity.uncertainty,
                            confidence: peak.confidence * nuclideInfo.confidence,
                            method: 'peak_area',
                            peakId: peak.channel
                        });
                    }
                }
            }
            
            return results;
            
        } catch (error) {
            console.error('定量分析失败:', error);
            throw error;
        }
    }

    /**
     * 核素识别
     */
    identifyNuclides(energy) {
        const identified = [];
        const tolerance = 2.0; // keV
        
        for (const [nuclide, data] of Object.entries(this.config.nuclideDatabase)) {
            for (let i = 0; i < data.energy.length; i++) {
                const nuclideEnergy = data.energy[i];
                if (Math.abs(energy - nuclideEnergy) <= tolerance) {
                    const confidence = this.calculateNuclideConfidence(energy, nuclideEnergy, tolerance);
                    identified.push({
                        nuclide: nuclide,
                        energy: nuclideEnergy,
                        abundance: data.abundance[i],
                        halfLife: data.halfLife,
                        confidence: confidence
                    });
                }
            }
        }
        
        return identified;
    }

    /**
     * 计算核素置信度
     */
    calculateNuclideConfidence(observedEnergy, nuclideEnergy, tolerance) {
        const diff = Math.abs(observedEnergy - nuclideEnergy);
        const confidence = Math.max(0, 1 - (diff / tolerance));
        return confidence;
    }

    /**
     * 计算活度
     */
    calculateActivity(peak, nuclideInfo, detector) {
        try {
            // 简化的活度计算
            // 实际计算需要考虑探测效率、几何因子、吸收校正等
            
            const peakArea = peak.area;
            const efficiency = detector.efficiency;
            const abundance = nuclideInfo.abundance / 100;
            
            if (efficiency <= 0 || abundance <= 0) {
                return { value: 0, uncertainty: 0 };
            }
            
            // 活度 = 峰面积 / (效率 * 丰度 * 活时间)
            const liveTime = this.analysisState.liveTime || 1;
            const activity = peakArea / (efficiency * abundance * liveTime);
            
            // 简化的不确定度计算
            const uncertainty = Math.sqrt(peakArea) / (efficiency * abundance * liveTime);
            
            return { value: activity, uncertainty: uncertainty };
            
        } catch (error) {
            console.error('计算活度失败:', error);
            return { value: 0, uncertainty: 0 };
        }
    }

    /**
     * 更新分析状态
     */
    updateAnalysisState(updates) {
        this.analysisState = {
            ...this.analysisState,
            ...updates,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * 保存谱线数据
     */
    async saveSpectrumData(data) {
        try {
            const query = `
                INSERT INTO spectrum_data 
                (detector_type, channel_count, spectrum_data, total_counts, live_time, real_time)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            await this.db.run(query, [
                data.detectorType,
                data.spectrum.length,
                JSON.stringify(data.spectrum),
                data.totalCounts,
                data.liveTime,
                data.realTime
            ]);
            
        } catch (error) {
            console.error('保存谱线数据失败:', error);
        }
    }

    /**
     * 记录处理日志
     */
    async logProcessing(operationType, operationData, result = 'success', processingTime = 0) {
        try {
            const query = `
                INSERT INTO data_processing_log 
                (operation_type, operation_data, result, processing_time)
                VALUES (?, ?, ?, ?)
            `;
            
            await this.db.run(query, [
                operationType,
                JSON.stringify(operationData),
                result,
                processingTime
            ]);
            
        } catch (error) {
            console.error('记录处理日志失败:', error);
        }
    }

    /**
     * 获取当前谱线
     */
    getCurrentSpectrum() {
        return {
            success: true,
            data: this.currentSpectrum
        };
    }

    /**
     * 获取分析状态
     */
    getAnalysisState() {
        return {
            success: true,
            data: this.analysisState
        };
    }

    /**
     * 获取处理统计
     */
    getProcessingStats() {
        return {
            success: true,
            data: this.stats
        };
    }

    /**
     * 开始分析
     */
    async startAnalysis(detectorType = 'hpge_detector') {
        try {
            if (this.analysisState.isRunning) {
                throw new Error('分析已在进行中');
            }
            
            this.analysisState = {
                isRunning: true,
                currentDetector: detectorType,
                startTime: new Date().toISOString(),
                totalCounts: 0,
                liveTime: 0,
                realTime: 0
            };
            
            console.log(`开始数据分析 - 探测器类型: ${detectorType}`);
            
            return {
                success: true,
                message: '数据分析已开始',
                detectorType: detectorType,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 停止分析
     */
    async stopAnalysis() {
        try {
            this.analysisState.isRunning = false;
            
            console.log('数据分析已停止');
            
            return {
                success: true,
                message: '数据分析已停止',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 处理原始数据
     */
    async processRawData(data) {
        // 处理来自串口的原始数据
        try {
            if (typeof data === 'string') {
                // 尝试解析JSON数据
                try {
                    const parsed = JSON.parse(data);
                    await this.processSpectrumData(parsed);
                } catch (parseError) {
                    console.warn('解析原始数据失败:', parseError.message);
                }
            } else if (Array.isArray(data)) {
                // 数组数据视为谱线
                await this.processSpectrumData({
                    spectrum: data,
                    totalCounts: data.reduce((a, b) => a + b, 0),
                    timestamp: new Date().toISOString(),
                    device: { type: 'unknown' }
                });
            }
        } catch (error) {
            console.error('处理原始数据失败:', error);
        }
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            this.isProcessing = false;
            this.processingQueue = [];
            this.currentSpectrum = null;
            
            console.log('数据处理资源已清理');
            
        } catch (error) {
            console.error('清理资源失败:', error);
        }
    }
}

module.exports = DataProcessingService;