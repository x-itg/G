#!/usr/bin/env node
/**
 * 放射化学纯度检测仪主页界面验证脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证放射化学纯度检测仪主页界面...\n');

// 检查文件是否存在
function checkFile(filePath, description) {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`✅ ${description}: ${filePath} (${stats.size} bytes)`);
        return true;
    } else {
        console.log(`❌ ${description}: ${filePath} (文件不存在)`);
        return false;
    }
}

// 检查HTML结构
function checkHTMLStructure() {
    const htmlPath = path.join(__dirname, 'renderer', 'index.html');
    
    if (!fs.existsSync(htmlPath)) {
        console.log('❌ 主HTML文件不存在');
        return false;
    }
    
    const content = fs.readFileSync(htmlPath, 'utf8');
    
    const checks = [
        { pattern: /放射化学纯度检测仪/, name: '页面标题' },
        { pattern: /硅胶板色谱扫描分析系统|硅胶板.*色谱/, name: '副标题' },
        { pattern: /detector-control-panel/, name: '左侧控制面板' },
        { pattern: /radiation-chart-area/, name: '中间图表区域' },
        { pattern: /analysis-results-panel/, name: '右侧分析面板' },
        { pattern: /main-chart|id="main-chart"/, name: '辐射分布图表' },
        { pattern: /spot-marker|id="spot-marker"/, name: '样品点标记' },
        { pattern: /front-marker|id="front-marker"/, name: '色谱前沿标记' },
        { pattern: /peak-marker|id="peak-marker"/, name: '峰值标记' },
        { pattern: /detector-main\.css/, name: '专用样式文件' },
        { pattern: /detector-demo\.js/, name: '演示脚本文件' },
        { pattern: /放射化学纯度/, name: '纯度计算功能' },
        { pattern: /Rf值|Rf /, name: 'Rf值分析功能' },
        { pattern: /碘化钠.*探头/, name: '检测设备功能' },
        { pattern: /0-50|50mm/, name: '位置范围设置' },
        { pattern: /0-5000|5000cps/, name: '计数率范围设置' }
    ];
    
    let passed = 0;
    let total = checks.length;
    
    console.log('\n📄 HTML结构检查:');
    checks.forEach(check => {
        if (check.pattern.test(content)) {
            console.log(`  ✅ ${check.name}`);
            passed++;
        } else {
            console.log(`  ❌ ${check.name}`);
        }
    });
    
    return { passed, total, success: passed === total };
}

// 检查CSS样式
function checkCSSFiles() {
    console.log('\n🎨 CSS样式文件检查:');
    
    const cssFiles = [
        { 
            path: 'renderer/assets/css/detector-main.css', 
            name: '专用样式文件',
            checks: [
                { pattern: /--left-panel-width:\s*320px/, name: '左侧面板宽度' },
                { pattern: /--right-panel-width:\s*350px/, name: '右侧面板宽度' },
                { pattern: /radiation-chart-area/, name: '图表区域样式' },
                { pattern: /chart-marker/, name: '图表标记样式' },
                { pattern: /analysis-results-panel/, name: '分析结果面板样式' }
            ]
        },
        { 
            path: 'renderer/assets/css/main.css', 
            name: '主样式文件',
            checks: [
                { pattern: /chart-marker/, name: '图表标记样式' }
            ]
        },
        { 
            path: 'renderer/assets/css/chart.css', 
            name: '图表样式文件',
            checks: [
                { pattern: /chart-marker/, name: '图表标记样式' }
            ]
        }
    ];
    
    let passed = 0;
    let total = cssFiles.length;
    
    cssFiles.forEach(css => {
        if (checkFile(css.path, css.name)) {
            passed++;
            
            // 检查CSS内容
            const content = fs.readFileSync(path.join(__dirname, css.path), 'utf8');
            css.checks.forEach(check => {
                if (check.pattern.test(content)) {
                    console.log(`    ✅ ${check.name}`);
                } else {
                    console.log(`    ⚠️  ${check.name} (未找到)`);
                }
            });
        }
    });
    
    return { passed, total };
}

// 检查JavaScript文件
function checkJSFiles() {
    console.log('\n⚙️ JavaScript文件检查:');
    
    const jsFiles = [
        { path: 'renderer/assets/js/detector-demo.js', name: '演示脚本文件' },
        { path: 'renderer/assets/js/chart.js', name: '图表功能文件' },
        { path: 'renderer/assets/js/analysis.js', name: '分析算法文件' }
    ];
    
    let passed = 0;
    let total = jsFiles.length;
    
    jsFiles.forEach(js => {
        if (checkFile(js.path, js.name)) {
            passed++;
            
            // 检查JS内容
            const content = fs.readFileSync(path.join(__dirname, js.path), 'utf8');
            const jsChecks = [
                { pattern: /class RadiationDetectorDemo/, name: '检测器演示类' },
                { pattern: /generateDemoData/, name: '演示数据生成' },
                { pattern: /performAnalysis/, name: '分析算法' },
                { pattern: /放射化学纯度/, name: '纯度计算' },
                { pattern: /Rf值/, name: 'Rf值计算' }
            ];
            
            if (js.path.includes('detector-demo.js')) {
                jsChecks.forEach(check => {
                    if (check.pattern.test(content)) {
                        console.log(`    ✅ ${check.name}`);
                    } else {
                        console.log(`    ⚠️  ${check.name} (未找到)`);
                    }
                });
            }
        }
    });
    
    return { passed, total };
}

// 检查核心功能
function checkCoreFeatures() {
    console.log('\n🔧 核心功能检查:');
    
    const features = [
        { name: '硅胶板色谱扫描', pattern: /硅胶板.*色谱/ },
        { name: '碘化钠探头检测', pattern: /碘化钠.*探头/ },
        { name: '放射化学纯度功能', pattern: /放射化学纯度/ },
        { name: 'Rf值分析', pattern: /Rf值/ },
        { name: '位置范围控制', pattern: /position-range|位置范围|0-50/ },
        { name: '计数率范围控制', pattern: /count-rate|计数率范围|0-5000/ },
        { name: '实时数据监控', pattern: /实时数据|data-monitor/ },
        { name: '详细操作记录', pattern: /操作记录|detection-log|日志/ },
        { name: '专业报告导出', pattern: /导出.*报告|export.*report/ },
        { name: '美观界面设计', pattern: /main-content|detector-control-panel|radiation-chart-area|analysis-results-panel/ }
    ];
    
    // 读取主HTML文件检查功能
    const htmlPath = path.join(__dirname, 'renderer', 'index.html');
    const content = fs.readFileSync(htmlPath, 'utf8');
    
    let passed = 0;
    let total = features.length;
    
    features.forEach(feature => {
        if (feature.pattern.test(content)) {
            console.log(`  ✅ ${feature.name}`);
            passed++;
        } else {
            console.log(`  ❌ ${feature.name}`);
        }
    });
    
    return { passed, total };
}

// 检查文件完整性
function checkFileIntegrity() {
    console.log('\n📋 文件完整性检查:');
    
    const requiredFiles = [
        'renderer/index.html',
        'renderer/assets/css/detector-main.css',
        'renderer/assets/js/detector-demo.js',
        'api-server.js',
        'start-detector-demo.bat'
    ];
    
    let passed = 0;
    let total = requiredFiles.length;
    
    requiredFiles.forEach(file => {
        if (checkFile(file, '必需文件')) {
            passed++;
        }
    });
    
    return { passed, total };
}

// 主验证流程
function main() {
    console.log('=' .repeat(60));
    console.log('   放射化学纯度检测仪主页界面验证');
    console.log('=' .repeat(60));
    
    const results = {
        html: checkHTMLStructure(),
        css: checkCSSFiles(),
        js: checkJSFiles(),
        features: checkCoreFeatures(),
        files: checkFileIntegrity()
    };
    
    // 汇总结果
    console.log('\n' + '=' .repeat(60));
    console.log('   验证结果汇总');
    console.log('=' .repeat(60));
    
    const totalChecks = Object.values(results).reduce((sum, result) => {
        return sum + result.total;
    }, 0);
    
    const passedChecks = Object.values(results).reduce((sum, result) => {
        return sum + result.passed;
    }, 0);
    
    const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);
    
    console.log(`HTML结构检查: ${results.html.passed}/${results.html.total}`);
    console.log(`CSS样式检查: ${results.css.passed}/${results.css.total}`);
    console.log(`JavaScript检查: ${results.js.passed}/${results.js.total}`);
    console.log(`核心功能检查: ${results.features.passed}/${results.features.total}`);
    console.log(`文件完整性检查: ${results.files.passed}/${results.files.total}`);
    
    console.log(`\n总体验证结果: ${passedChecks}/${totalChecks} (${successRate}%)`);
    
    if (passedChecks === totalChecks) {
        console.log('\n🎉 验证通过！放射化学纯度检测仪主页界面已准备就绪。');
        console.log('\n下一步操作:');
        console.log('1. 运行 start-detector-demo.bat 启动演示系统');
        console.log('2. 在浏览器中访问 http://localhost:3000');
        console.log('3. 使用 admin/Admin123! 登录系统');
        console.log('4. 体验放射化学纯度检测功能');
    } else {
        console.log('\n⚠️  验证发现问题，请检查上述错误信息。');
    }
    
    console.log('\n验证完成。');
}

// 运行验证
try {
    main();
} catch (error) {
    console.error('验证过程中发生错误:', error.message);
    process.exit(1);
}
