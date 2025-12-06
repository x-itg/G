/**
 * 数据采集和处理系统测试
 * Data Processing System Tests
 * 
 * 测试数据处理系统的核心功能
 */

const path = require('path');
const fs = require('fs');

// 模拟数据库
class MockDatabase {
    constructor() {
        this.data = new Map();
        this.tables = new Map();
    }
    
    run(sql, params = []) {
        // 模拟SQL执行
        if (sql.includes('CREATE TABLE')) {
            const tableName = this.extractTableName(sql);
            this.tables.set(tableName, []);
        }
        return { changes: 1, lastID: 1 };
    }
    
    get(sql, params = []) {
        // 模拟SELECT查询
        return {};
    }
    
    all(sql, params = []) {
        // 模拟SELECT ALL查询
        return [];
    }
    
    extractTableName(sql) {
        const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        return match ? match[1] : 'unknown';
    }
}

// 测试结果收集
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

/**
 * 运行所有数据处理测试
 */
async function runDataProcessingTests() {
    console.log('\n📊 开始数据采集和处理系统测试...\n');
    
    try {
        // 初始化模拟数据库
        const mockDb = new MockDatabase();
        
        // 导入服务类
        const DataProcessingService = require('../services/DataProcessingService');
        const dataProcessingService = new DataProcessingService(mockDb, null);
        
        // 1. 测试服务初始化
        await testDataProcessingService(dataProcessingService);
        
        // 2. 测试数字滤波器
        await testDigitalFilters(dataProcessingService);
        
        // 3. 测试谱线分析
        await testSpectrumAnalysis(dataProcessingService);
        
        // 4. 测试峰检测
        await testPeakDetection(dataProcessingService);
        
        // 5. 测试定量分析
        await testQuantitativeAnalysis(dataProcessingService);
        
        // 打印测试结果
        printTestResults();
        
    } catch (error) {
        console.error('❌ 数据处理系统测试执行失败:', error);
    }
}

/**
 * 测试数据处理服务
 */
async function testDataProcessingService(service) {
    console.log('🔧 测试DataProcessingService...');
    
    // 1. 测试初始化
    try {
        // 模拟初始化过程
        await service.createDatabaseTables();
        await service.loadConfiguration();
        service.setupEventListeners();
        
        addTestResult('DataProcessing - 初始化', true, '服务初始化成功');
    } catch (error) {
        addTestResult('DataProcessing - 初始化', false, '初始化失败: ' + error.message);
    }
    
    // 2. 测试获取当前谱线
    try {
        const result = service.getCurrentSpectrum();
        
        if (result.success) {
            addTestResult('DataProcessing - 获取谱线', true, '成功获取当前谱线');
        } else {
            addTestResult('DataProcessing - 获取谱线', false, '获取谱线失败');
        }
    } catch (error) {
        addTestResult('DataProcessing - 获取谱线', false, '获取谱线异常: ' + error.message);
    }
    
    // 3. 测试获取分析状态
    try {
        const result = service.getAnalysisState();
        
        if (result.success) {
            addTestResult('DataProcessing - 获取状态', true, '成功获取分析状态');
        } else {
            addTestResult('DataProcessing - 获取状态', false, '获取状态失败');
        }
    } catch (error) {
        addTestResult('DataProcessing - 获取状态', false, '获取状态异常: ' + error.message);
    }
    
    // 4. 测试获取处理统计
    try {
        const result = service.getProcessingStats();
        
        if (result.success) {
            addTestResult('DataProcessing - 获取统计', true, '成功获取处理统计');
        } else {
            addTestResult('DataProcessing - 获取统计', false, '获取统计失败');
        }
    } catch (error) {
        addTestResult('DataProcessing - 获取统计', false, '获取统计异常: ' + error.message);
    }
}

/**
 * 测试数字滤波器
 */
async function testDigitalFilters(service) {
    console.log('🔍 测试数字滤波器...');
    
    // 创建测试数据
    const testSpectrum = [100, 120, 150, 180, 200, 180, 150, 120, 100, 90, 110, 130, 160, 190, 210, 190, 160, 130, 110, 90];
    
    // 1. 测试移动平均滤波器
    try {
        const filtered = service.movingAverageFilter(testSpectrum, 3);
        
        if (filtered && filtered.length === testSpectrum.length) {
            addTestResult('Filter - 移动平均', true, '移动平均滤波器工作正常');
        } else {
            addTestResult('Filter - 移动平均', false, '移动平均滤波器输出异常');
        }
    } catch (error) {
        addTestResult('Filter - 移动平均', false, '移动平均滤波器异常: ' + error.message);
    }
    
    // 2. 测试Savitzky-Golay滤波器
    try {
        const filtered = service.savitzkyGolayFilter(testSpectrum, 5, 2);
        
        if (filtered && filtered.length === testSpectrum.length) {
            addTestResult('Filter - Savitzky-Golay', true, 'Savitzky-Golay滤波器工作正常');
        } else {
            addTestResult('Filter - SavitzkyGolay', false, 'Savitzky-Golay滤波器输出异常');
        }
    } catch (error) {
        addTestResult('Filter - Savitzky-Golay', false, 'Savitzky-Golay滤波器异常: ' + error.message);
    }
    
    // 3. 测试中值滤波器
    try {
        const filtered = service.medianFilter(testSpectrum, 3);
        
        if (filtered && filtered.length === testSpectrum.length) {
            addTestResult('Filter - 中值滤波', true, '中值滤波器工作正常');
        } else {
            addTestResult('Filter - 中值滤波', false, '中值滤波器输出异常');
        }
    } catch (error) {
        addTestResult('Filter - 中值滤波', false, '中值滤波器异常: ' + error.message);
    }
    
    // 4. 测试卡尔曼滤波器
    try {
        const filtered = service.kalmanFilter(testSpectrum, {
            processNoise: 1e-4,
            measurementNoise: 1e-2
        });
        
        if (filtered && filtered.length === testSpectrum.length) {
            addTestResult('Filter - 卡尔曼滤波', true, '卡尔曼滤波器工作正常');
        } else {
            addTestResult('Filter - 卡尔曼滤波', false, '卡尔曼滤波器输出异常');
        }
    } catch (error) {
        addTestResult('Filter - 卡尔曼滤波', false, '卡尔曼滤波器异常: ' + error.message);
    }
    
    // 5. 测试基线校正
    try {
        const corrected = service.correctBaseline(testSpectrum);
        
        if (corrected && corrected.length === testSpectrum.length) {
            addTestResult('Filter - 基线校正', true, '基线校正功能正常');
        } else {
            addTestResult('Filter - 基线校正', false, '基线校正输出异常');
        }
    } catch (error) {
        addTestResult('Filter - 基线校正', false, '基线校正异常: ' + error.message);
    }
    
    // 6. 测试归一化
    try {
        const normalized = service.normalizeSpectrum(testSpectrum);
        
        if (normalized && normalized.length === testSpectrum.length) {
            const maxValue = Math.max(...normalized);
            if (Math.abs(maxValue - 1.0) < 1e-6) {
                addTestResult('Filter - 归一化', true, '归一化功能正常');
            } else {
                addTestResult('Filter - 归一化', false, '归一化结果不正确');
            }
        } else {
            addTestResult('Filter - 归一化', false, '归一化输出异常');
        }
    } catch (error) {
        addTestResult('Filter - 归一化', false, '归一化异常: ' + error.message);
    }
}

/**
 * 测试谱线分析
 */
async function testSpectrumAnalysis(service) {
    console.log('📈 测试谱线分析...');
    
    // 1. 测试导数计算
    try {
        const testSpectrum = [1, 2, 3, 4, 5, 4, 3, 2, 1];
        const derivative = service.calculateDerivative(testSpectrum);
        
        if (derivative && derivative.length === testSpectrum.length) {
            addTestResult('Analysis - 导数计算', true, '导数计算功能正常');
        } else {
            addTestResult('Analysis - 导数计算', false, '导数计算输出异常');
        }
    } catch (error) {
        addTestResult('Analysis - 导数计算', false, '导数计算异常: ' + error.message);
    }
    
    // 2. 测试噪声水平检测
    try {
        const testSpectrum = new Array(100).fill(0).map(() => Math.random() * 10 + 5);
        const noiseLevel = service.findNoiseLevel(testSpectrum);
        
        if (noiseLevel > 0) {
            addTestResult('Analysis - 噪声检测', true, '噪声水平检测功能正常');
        } else {
            addTestResult('Analysis - 噪声检测', false, '噪声水平检测结果异常');
        }
    } catch (error) {
        addTestResult('Analysis - 噪声检测', false, '噪声检测异常: ' + error.message);
    }
    
    // 3. 测试峰宽度计算
    try {
        const testSpectrum = [0, 0, 5, 10, 15, 20, 15, 10, 5, 0, 0];
        const peakWidth = service.calculatePeakWidth(testSpectrum, 5);
        
        if (peakWidth > 0) {
            addTestResult('Analysis - 峰宽度计算', true, '峰宽度计算功能正常');
        } else {
            addTestResult('Analysis - 峰宽度计算', false, '峰宽度计算结果异常');
        }
    } catch (error) {
        addTestResult('Analysis - 峰宽度计算', false, '峰宽度计算异常: ' + error.message);
    }
}

/**
 * 测试峰检测
 */
async function testPeakDetection(service) {
    console.log('🏔️ 测试峰检测...');
    
    // 创建带有峰的测试谱线
    const testSpectrum = new Array(200).fill(0);
    
    // 添加几个高斯峰（使用测试辅助函数）
    addTestGaussianPeak(testSpectrum, 50, 1000, 5);
    addTestGaussianPeak(testSpectrum, 100, 800, 8);
    addTestGaussianPeak(testSpectrum, 150, 1200, 6);
    
    // 1. 测试峰检测
    try {
        const peaks = await service.detectAndAnalyzePeaks(testSpectrum, 'hpge_detector');
        
        if (peaks && peaks.length >= 2) {
            addTestResult('Peak - 峰检测', true, `成功检测到${peaks.length}个峰`);
        } else {
            addTestResult('Peak - 峰检测', false, '峰检测结果异常');
        }
    } catch (error) {
        addTestResult('Peak - 峰检测', false, '峰检测异常: ' + error.message);
    }
    
    // 2. 测试高斯拟合
    try {
        const gaussianFit = await service.fitGaussian(testSpectrum, 50, 10);
        
        if (gaussianFit && gaussianFit.amplitude > 0) {
            addTestResult('Peak - 高斯拟合', true, '高斯拟合功能正常');
        } else {
            addTestResult('Peak - 高斯拟合', false, '高斯拟合结果异常');
        }
    } catch (error) {
        addTestResult('Peak - 高斯拟合', false, '高斯拟合异常: ' + error.message);
    }
    
    // 3. 测试峰面积计算
    try {
        const peakArea = service.calculatePeakArea(testSpectrum, 50, 10);
        
        if (peakArea > 0) {
            addTestResult('Peak - 面积计算', true, '峰面积计算功能正常');
        } else {
            addTestResult('Peak - 面积计算', false, '峰面积计算结果异常');
        }
    } catch (error) {
        addTestResult('Peak - 面积计算', false, '峰面积计算异常: ' + error.message);
    }
    
    // 4. 测试通道转能量
    try {
        const energy = service.channelToEnergy(100, 'hpge_detector');
        
        if (energy > 0) {
            addTestResult('Peak - 通道转能量', true, '通道转能量功能正常');
        } else {
            addTestResult('Peak - 通道转能量', false, '通道转能量结果异常');
        }
    } catch (error) {
        addTestResult('Peak - 通道转能量', false, '通道转能量异常: ' + error.message);
    }
}

/**
 * 测试定量分析
 */
async function testQuantitativeAnalysis(service) {
    console.log('⚗️ 测试定量分析...');
    
    // 1. 测试核素识别
    try {
        const identified = service.identifyNuclides(1173.2);
        
        if (identified && identified.length > 0) {
            addTestResult('Quantitative - 核素识别', true, `成功识别核素: ${identified.join(', ')}`);
        } else {
            addTestResult('Quantitative - 核素识别', false, '核素识别结果为空');
        }
    } catch (error) {
        addTestResult('Quantitative - 核素识别', false, '核素识别异常: ' + error.message);
    }
    
    // 2. 测试核素置信度计算
    try {
        const confidence = service.calculateNuclideConfidence(1173.2, 1173.0, 2.0);
        
        if (confidence >= 0 && confidence <= 1) {
            addTestResult('Quantitative - 置信度计算', true, '核素置信度计算功能正常');
        } else {
            addTestResult('Quantitative - 置信度计算', false, '核素置信度计算结果异常');
        }
    } catch (error) {
        addTestResult('Quantitative - 置信度计算', false, '置信度计算异常: ' + error.message);
    }
    
    // 3. 测试活度计算
    try {
        const testPeak = {
            area: 10000,
            confidence: 0.9
        };
        
        const testNuclideInfo = {
            nuclide: 'Co-60',
            energy: 1173.2,
            abundance: 99.85,
            confidence: 0.95
        };
        
        const testDetector = {
            efficiency: 0.15
        };
        
        const activity = service.calculateActivity(testPeak, testNuclideInfo, testDetector);
        
        if (activity && activity.value >= 0) {
            addTestResult('Quantitative - 活度计算', true, `活度计算正常: ${activity.value.toFixed(2)} Bq`);
        } else {
            addTestResult('Quantitative - 活度计算', false, '活度计算结果异常');
        }
    } catch (error) {
        addTestResult('Quantitative - 活度计算', false, '活度计算异常: ' + error.message);
    }
    
    // 4. 测试完整分析流程
    try {
        // 创建测试数据
        const testSpectrum = new Array(100).fill(0).map((_, i) => {
            const peak = 500 * Math.exp(-0.5 * Math.pow((i - 50) / 10, 2));
            return Math.max(0, peak + Math.random() * 20);
        });
        
        // 模拟处理
        const data = {
            spectrum: testSpectrum,
            totalCounts: testSpectrum.reduce((a, b) => a + b, 0),
            liveTime: 60,
            realTime: 60,
            timestamp: new Date().toISOString(),
            device: { type: 'hpge_detector' }
        };
        
        await service.processSpectrumData(data);
        
        const result = service.getCurrentSpectrum();
        
        if (result.success && result.data) {
            addTestResult('Quantitative - 完整分析流程', true, '完整分析流程正常');
        } else {
            addTestResult('Quantitative - 完整分析流程', false, '完整分析流程失败');
        }
    } catch (error) {
        addTestResult('Quantitative - 完整分析流程', false, '完整分析流程异常: ' + error.message);
    }
}

/**
 * 添加高斯峰（测试辅助函数）
 */
function addGaussianPeak(spectrum, center, amplitude, sigma) {
    for (let i = 0; i < spectrum.length; i++) {
        const value = amplitude * Math.exp(-0.5 * Math.pow((i - center) / sigma, 2));
        spectrum[i] += value;
    }
}

/**
 * 添加高斯峰（测试专用）
 */
function addTestGaussianPeak(spectrum, center, amplitude, sigma) {
    for (let i = 0; i < spectrum.length; i++) {
        const value = amplitude * Math.exp(-0.5 * Math.pow((i - center) / sigma, 2));
        spectrum[i] += value;
    }
}

/**
 * 添加测试结果
 */
function addTestResult(testName, passed, details) {
    testResults.total++;
    
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName}: ${details}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}: ${details}`);
    }
    
    testResults.details.push({
        test: testName,
        passed: passed,
        details: details,
        timestamp: new Date().toISOString()
    });
}

/**
 * 打印测试结果
 */
function printTestResults() {
    console.log('\n============================================================');
    console.log('📊 数据采集和处理系统测试结果');
    console.log('============================================================');
    console.log(`📊 总计测试: ${testResults.total}`);
    console.log(`✅ 通过: ${testResults.passed}`);
    console.log(`❌ 失败: ${testResults.failed}`);
    console.log(`📈 通过率: ${testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0}%`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ 失败的测试:');
        testResults.details.forEach(result => {
            if (!result.passed) {
                console.log(`   • ${result.test}: ${result.details}`);
            }
        });
    }
    
    console.log('============================================================');
    
    // 保存测试报告
    saveTestReport();
}

/**
 * 保存测试报告
 */
function saveTestReport() {
    const report = {
        testSuite: '数据采集和处理系统测试',
        timestamp: new Date().toISOString(),
        results: testResults,
        summary: {
            total: testResults.total,
            passed: testResults.passed,
            failed: testResults.failed,
            passRate: testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0
        }
    };
    
    const reportPath = path.join(__dirname, 'data-processing-test-report.json');
    
    try {
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`📄 测试报告已保存至: ${reportPath}`);
    } catch (error) {
        console.error('保存测试报告失败:', error);
    }
}

// 运行测试
if (require.main === module) {
    runDataProcessingTests().catch(console.error);
}

module.exports = {
    runDataProcessingTests,
    testResults
};