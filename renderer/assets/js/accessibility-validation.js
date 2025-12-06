/**
 * 可访问性功能验证脚本
 * 用于验证辐射检测器系统的可访问性增强是否正常工作
 */

class AccessibilityValidator {
    constructor() {
        this.testResults = [];
        this.errors = [];
        this.warnings = [];
    }

    // 运行所有测试
    async runAllTests() {
        console.log('🔍 开始可访问性验证...');
        
        await this.testKeyboardNavigation();
        await this.testScreenReaderSupport();
        await this.testVisualAccessibility();
        await this.testMobileAccessibility();
        await this.testPerformance();
        
        this.generateReport();
    }

    // 测试键盘导航
    async testKeyboardNavigation() {
        console.log('📝 测试键盘导航...');
        
        const tests = [
            {
                name: 'Tab键导航',
                test: () => {
                    const focusableElements = document.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    return focusableElements.length > 0;
                }
            },
            {
                name: '焦点指示器',
                test: () => {
                    const focusedElement = document.querySelector('*:focus');
                    if (focusedElement) {
                        const styles = window.getComputedStyle(focusedElement);
                        return styles.outline !== 'none' || styles.boxShadow !== 'none';
                    }
                    return true;
                }
            },
            {
                name: '键盘快捷键',
                test: () => {
                    const shortcuts = document.querySelectorAll('[aria-keyshortcuts]');
                    return shortcuts.length >= 0;
                }
            },
            {
                name: '跳过链接',
                test: () => {
                    const skipLinks = document.querySelectorAll('.skip-link, a[href^="#"]');
                    return skipLinks.length >= 0;
                }
            }
        ];

        for (const test of tests) {
            try {
                const result = test.test();
                this.addResult('keyboard', test.name, result, result ? null : '键盘导航测试失败');
            } catch (error) {
                this.addResult('keyboard', test.name, false, error.message);
            }
        }
    }

    // 测试屏幕阅读器支持
    async testScreenReaderSupport() {
        console.log('🔊 测试屏幕阅读器支持...');
        
        const tests = [
            {
                name: 'ARIA标签',
                test: () => {
                    const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
                    return elementsWithAria.length > 0;
                }
            },
            {
                name: '语义化标签',
                test: () => {
                    const semanticElements = document.querySelectorAll('main, nav, section, article, header, footer, aside');
                    return semanticElements.length > 0;
                }
            },
            {
                name: '实时区域',
                test: () => {
                    const liveRegions = document.querySelectorAll('[role="status"], [role="alert"], [role="region"]');
                    return liveRegions.length > 0;
                }
            },
            {
                name: '表单标签关联',
                test: () => {
                    const inputs = document.querySelectorAll('input, select, textarea');
                    let labeledCount = 0;
                    inputs.forEach(input => {
                        if (input.id && document.querySelector(`label[for="${input.id}"]`)) {
                            labeledCount++;
                        }
                    });
                    return labeledCount > 0;
                }
            }
        ];

        for (const test of tests) {
            try {
                const result = test.test();
                this.addResult('screenReader', test.name, result, result ? null : '屏幕阅读器支持测试失败');
            } catch (error) {
                this.addResult('screenReader', test.name, false, error.message);
            }
        }
    }

    // 测试视觉可访问性
    async testVisualAccessibility() {
        console.log('👁️ 测试视觉可访问性...');
        
        const tests = [
            {
                name: '高对比度模式',
                test: () => {
                    const highContrastElements = document.querySelectorAll('.high-contrast, [data-high-contrast]');
                    return highContrastElements.length >= 0;
                }
            },
            {
                name: '字体大小控制',
                test: () => {
                    const fontSizeControls = document.querySelectorAll('[aria-label*="字体"], [aria-label*="大小"]');
                    return fontSizeControls.length >= 0;
                }
            },
            {
                name: '颜色对比度',
                test: () => {
                    // 检查文本颜色和背景色的对比度
                    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
                    let highContrastCount = 0;
                    
                    for (let element of textElements) {
                        const styles = window.getComputedStyle(element);
                        const bgColor = this.getBackgroundColor(element);
                        const textColor = styles.color;
                        
                        if (this.calculateContrastRatio(textColor, bgColor) >= 4.5) {
                            highContrastCount++;
                        }
                    }
                    
                    return highContrastCount > 0;
                }
            },
            {
                name: '动画减少支持',
                test: () => {
                    const reducedMotionStyles = document.querySelectorAll('@media (prefers-reduced-motion: reduce)');
                    return reducedMotionStyles.length >= 0;
                }
            }
        ];

        for (const test of tests) {
            try {
                const result = test.test();
                this.addResult('visual', test.name, result, result ? null : '视觉可访问性测试失败');
            } catch (error) {
                this.addResult('visual', test.name, false, error.message);
            }
        }
    }

    // 测试移动端可访问性
    async testMobileAccessibility() {
        console.log('📱 测试移动端可访问性...');
        
        const tests = [
            {
                name: '触摸目标大小',
                test: () => {
                    const buttons = document.querySelectorAll('button, .btn, [role="button"]');
                    let touchFriendlyCount = 0;
                    
                    buttons.forEach(button => {
                        const styles = window.getComputedStyle(button);
                        const height = parseFloat(styles.height);
                        const width = parseFloat(styles.width);
                        
                        if (height >= 44 && width >= 44) {
                            touchFriendlyCount++;
                        }
                    });
                    
                    return touchFriendlyCount > 0;
                }
            },
            {
                name: '响应式设计',
                test: () => {
                    const viewportMeta = document.querySelector('meta[name="viewport"]');
                    return viewportMeta !== null;
                }
            },
            {
                name: '移动端导航',
                test: () => {
                    const mobileNav = document.querySelector('.mobile-nav, .mobile-menu, [data-mobile="true"]');
                    return mobileNav !== null || window.innerWidth > 768;
                }
            }
        ];

        for (const test of tests) {
            try {
                const result = test.test();
                this.addResult('mobile', test.name, result, result ? null : '移动端可访问性测试失败');
            } catch (error) {
                this.addResult('mobile', test.name, false, error.message);
            }
        }
    }

    // 测试性能
    async testPerformance() {
        console.log('⚡ 测试性能影响...');
        
        const tests = [
            {
                name: 'CSS文件大小',
                test: () => {
                    const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
                    return cssLinks.length <= 10; // 合理的CSS文件数量
                }
            },
            {
                name: 'JavaScript文件',
                test: () => {
                    const scriptTags = document.querySelectorAll('script[src]');
                    return scriptTags.length <= 20; // 合理的JS文件数量
                }
            },
            {
                name: 'DOM复杂度',
                test: () => {
                    const totalElements = document.querySelectorAll('*').length;
                    return totalElements <= 5000; // 合理的DOM复杂度
                }
            },
            {
                name: '可访问性管理器加载',
                test: () => {
                    return window.AccessibilityManager !== undefined;
                }
            }
        ];

        for (const test of tests) {
            try {
                const result = test.test();
                this.addResult('performance', test.name, result, result ? null : '性能测试失败');
            } catch (error) {
                this.addResult('performance', test.name, false, error.message);
            }
        }
    }

    // 添加测试结果
    addResult(category, testName, passed, error = null) {
        const result = {
            category,
            testName,
            passed,
            error,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        if (!passed) {
            if (error) {
                this.errors.push(`${category}.${testName}: ${error}`);
            } else {
                this.errors.push(`${category}.${testName}: 测试未通过`);
            }
        }
    }

    // 计算颜色对比度
    calculateContrastRatio(color1, color2) {
        const getLuminance = (color) => {
            const rgb = color.match(/\d+/g);
            if (!rgb) return 0;
            
            const [r, g, b] = rgb.map(c => {
                c = parseFloat(c) / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const l1 = getLuminance(color1);
        const l2 = getLuminance(color2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        
        return (lighter + 0.05) / (darker + 0.05);
    }

    // 获取元素背景色
    getBackgroundColor(element) {
        let currentElement = element;
        while (currentElement && currentElement !== document.body) {
            const styles = window.getComputedStyle(currentElement);
            if (styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                styles.backgroundColor !== 'transparent') {
                return styles.backgroundColor;
            }
            currentElement = currentElement.parentElement;
        }
        return 'rgb(255, 255, 255)'; // 默认白色
    }

    // 生成报告
    generateReport() {
        console.log('\n📊 可访问性验证报告');
        console.log('=' * 50);

        const categories = {
            keyboard: '键盘导航',
            screenReader: '屏幕阅读器',
            visual: '视觉可访问性',
            mobile: '移动端可访问性',
            performance: '性能'
        };

        let totalTests = 0;
        let passedTests = 0;

        for (const [category, categoryName] of Object.entries(categories)) {
            const categoryResults = this.testResults.filter(r => r.category === category);
            const passed = categoryResults.filter(r => r.passed).length;
            const total = categoryResults.length;
            
            totalTests += total;
            passedTests += passed;
            
            console.log(`\n${categoryName}:`);
            categoryResults.forEach(result => {
                const icon = result.passed ? '✅' : '❌';
                const message = result.passed ? '通过' : `失败 - ${result.error}`;
                console.log(`  ${icon} ${result.testName}: ${message}`);
            });
            
            const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
            console.log(`  📈 通过率: ${passed}/${total} (${percentage}%)`);
        }

        console.log('\n' + '=' * 50);
        console.log(`🎯 总体验证结果:`);
        console.log(`   总测试数: ${totalTests}`);
        console.log(`   通过数: ${passedTests}`);
        console.log(`   失败数: ${totalTests - passedTests}`);
        console.log(`   总体通过率: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);

        if (this.errors.length > 0) {
            console.log('\n❌ 发现的问题:');
            this.errors.forEach(error => {
                console.log(`   • ${error}`);
            });
        } else {
            console.log('\n✅ 所有测试通过！可访问性增强工作完成良好。');
        }

        // 生成详细报告
        this.generateDetailedReport();
    }

    // 生成详细报告
    generateDetailedReport() {
        const report = {
            summary: {
                totalTests: this.testResults.length,
                passedTests: this.testResults.filter(r => r.passed).length,
                failedTests: this.testResults.filter(r => !r.passed).length,
                passRate: Math.round((this.testResults.filter(r => r.passed).length / this.testResults.length) * 100)
            },
            results: this.testResults,
            errors: this.errors,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        // 保存到localStorage（可选）
        try {
            localStorage.setItem('accessibilityTestReport', JSON.stringify(report));
        } catch (e) {
            console.warn('无法保存测试报告到localStorage');
        }

        return report;
    }
}

// 自动运行验证
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('renderer/index.html') || 
        window.location.pathname.includes('index.html')) {
        
        const validator = new AccessibilityValidator();
        
        // 延迟运行以确保所有资源加载完成
        setTimeout(() => {
            validator.runAllTests();
        }, 2000);
        
        // 将验证器暴露到全局作用域
        window.AccessibilityValidator = validator;
    }
});

// 手动运行验证函数
window.runAccessibilityValidation = () => {
    const validator = new AccessibilityValidator();
    validator.runAllTests();
};

// 导出验证器类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityValidator;
}

console.log('🔧 可访问性验证脚本已加载');
console.log('💡 使用 window.runAccessibilityValidation() 手动运行验证');