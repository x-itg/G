/**
 * 辐射检测器移动端适配 JavaScript
 * 提供移动端专用的交互功能和手势支持
 */

class MobileOptimizer {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isLandscape = window.innerWidth > window.innerHeight;
        this.sidebarOpen = false;
        this.resultsPanelOpen = false;
        
        this.init();
    }

    /**
     * 检测是否为移动设备
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768 ||
               ('ontouchstart' in window);
    }

    /**
     * 初始化移动端优化
     */
    init() {
        if (this.isMobile) {
            this.setupTouchEvents();
            this.setupMobileUI();
            this.handleOrientationChange();
            this.preventDefaultBehaviors();
            
            console.log('Mobile optimizer initialized');
        }
    }

    /**
     * 设置触摸事件
     */
    setupTouchEvents() {
        // 防止双击缩放
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // 添加触摸反馈类
        document.addEventListener('touchstart', (e) => {
            const target = e.target.closest('.btn, .mobile-btn, .touch-area');
            if (target) {
                target.classList.add('touching');
            }
        }, false);

        document.addEventListener('touchend', (e) => {
            const target = e.target.closest('.btn, .mobile-btn, .touch-area');
            if (target) {
                setTimeout(() => {
                    target.classList.remove('touching');
                }, 150);
            }
        }, false);
    }

    /**
     * 设置移动端UI组件
     */
    setupMobileUI() {
        // 移动端菜单切换
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const mobileSidebar = document.getElementById('mobile-sidebar');
        const mobileOverlay = document.getElementById('mobile-overlay');
        const sidebarClose = document.getElementById('mobile-sidebar-close');

        if (menuToggle && mobileSidebar) {
            menuToggle.addEventListener('click', () => this.toggleSidebar());
            mobileOverlay?.addEventListener('click', () => this.closeSidebar());
            sidebarClose?.addEventListener('click', () => this.closeSidebar());
        }

        // 移动端结果面板切换
        const resultsToggle = document.getElementById('mobile-results-toggle');
        const resultsPanel = document.querySelector('.mobile-results-panel');
        
        if (resultsToggle && resultsPanel) {
            resultsToggle.addEventListener('click', () => this.toggleResultsPanel());
        }

        // 同步用户信息
        this.syncUserInfo();
    }

    /**
     * 切换侧边栏
     */
    toggleSidebar() {
        const sidebar = document.getElementById('mobile-sidebar');
        const overlay = document.getElementById('mobile-overlay');
        const menuToggle = document.getElementById('mobile-menu-toggle');

        this.sidebarOpen = !this.sidebarOpen;

        if (this.sidebarOpen) {
            sidebar?.classList.add('active');
            overlay?.classList.add('active');
            menuToggle?.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            this.closeSidebar();
        }
    }

    /**
     * 关闭侧边栏
     */
    closeSidebar() {
        const sidebar = document.getElementById('mobile-sidebar');
        const overlay = document.getElementById('mobile-overlay');
        const menuToggle = document.getElementById('mobile-menu-toggle');

        this.sidebarOpen = false;

        sidebar?.classList.remove('active');
        overlay?.classList.remove('active');
        menuToggle?.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * 切换结果面板
     */
    toggleResultsPanel() {
        const panel = document.querySelector('.mobile-results-panel');
        
        this.resultsPanelOpen = !this.resultsPanelOpen;

        if (this.resultsPanelOpen) {
            panel?.classList.add('active');
        } else {
            panel?.classList.remove('active');
        }
    }

    /**
     * 同步用户信息到移动端界面
     */
    syncUserInfo() {
        const desktopUserInfo = document.getElementById('user-info');
        const mobileUserInfo = document.getElementById('user-info-mobile');
        
        if (desktopUserInfo && mobileUserInfo) {
            const updateMobileUserInfo = () => {
                mobileUserInfo.textContent = desktopUserInfo.textContent;
            };

            // 初始同步
            updateMobileUserInfo();

            // 监听桌面端用户信息变化
            const observer = new MutationObserver(updateMobileUserInfo);
            observer.observe(desktopUserInfo, { childList: true, subtree: true });
        }
    }

    /**
     * 处理屏幕方向变化
     */
    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResize();
            }, 100);
        });

        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        const newIsLandscape = window.innerWidth > window.innerHeight;
        
        if (this.isLandscape !== newIsLandscape) {
            this.isLandscape = newIsLandscape;
            this.adjustLayoutForOrientation();
        }
    }

    /**
     * 根据屏幕方向调整布局
     */
    adjustLayoutForOrientation() {
        const sidebar = document.getElementById('mobile-sidebar');
        const resultsPanel = document.querySelector('.mobile-results-panel');
        
        if (this.isLandscape) {
            // 横屏时关闭所有面板以节省空间
            this.closeSidebar();
            if (resultsPanel) {
                resultsPanel.classList.remove('active');
                this.resultsPanelOpen = false;
            }
        }
    }

    /**
     * 阻止默认行为
     */
    preventDefaultBehaviors() {
        // 阻止双击缩放
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });

        // 阻止下拉刷新（特定浏览器）
        let lastY = 0;
        document.addEventListener('touchstart', (e) => {
            lastY = e.touches[0].clientY;
        });

        document.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const isScrollingUp = currentY > lastY;
            
            if (window.scrollY === 0 && isScrollingUp) {
                e.preventDefault();
            }
            
            lastY = currentY;
        });

        // 阻止长按选择文本
        document.addEventListener('contextmenu', (e) => {
            if (this.isMobile) {
                e.preventDefault();
            }
        });
    }

    /**
     * 显示移动端提示信息
     */
    showMobileTip(message, type = 'info') {
        const tip = document.createElement('div');
        tip.className = `mobile-tip mobile-tip-${type}`;
        tip.textContent = message;
        
        document.body.appendChild(tip);
        
        setTimeout(() => {
            tip.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            tip.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(tip);
            }, 300);
        }, 3000);
    }

    /**
     * 优化表单输入体验
     */
    optimizeFormInputs() {
        const inputs = document.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // iOS Safari缩放修复
            if (this.isIOS()) {
                input.style.fontSize = '16px';
            }
            
            // 自动聚焦优化
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    input.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }, 300);
            });
        });
    }

    /**
     * 检测是否为iOS设备
     */
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    }

    /**
     * 检测是否为Android设备
     */
    isAndroid() {
        return /Android/.test(navigator.userAgent);
    }

    /**
     * 获取设备像素密度
     */
    getDevicePixelRatio() {
        return window.devicePixelRatio || 1;
    }

    /**
     * 优化图表性能
     */
    optimizeChart() {
        const chart = document.getElementById('main-chart');
        if (!chart || !this.isMobile) return;

        // 减少动画帧数
        const observer = new ResizeObserver(() => {
            // 图表尺寸变化时的处理
            if (window.Chart && window.chart) {
                window.chart.resize();
            }
        });
        
        observer.observe(chart.parentElement);
    }

    /**
     * 设置PWA相关功能
     */
    setupPWA() {
        if ('serviceWorker' in navigator) {
            // 注册Service Worker
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        }

        // 添加到主屏幕提示
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // 显示自定义安装提示
            this.showInstallPrompt(deferredPrompt);
        });
    }

    /**
     * 显示安装提示
     */
    showInstallPrompt(deferredPrompt) {
        // 自定义安装提示UI
        const installBanner = document.createElement('div');
        installBanner.className = 'install-banner';
        installBanner.innerHTML = `
            <div class="install-content">
                <span>安装应用以获得更好的体验</span>
                <button class="install-btn">安装</button>
                <button class="dismiss-btn">×</button>
            </div>
        `;
        
        document.body.appendChild(installBanner);
        
        // 安装按钮事件
        installBanner.querySelector('.install-btn').addEventListener('click', () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                deferredPrompt = null;
                installBanner.remove();
            });
        });
        
        // 忽略按钮事件
        installBanner.querySelector('.dismiss-btn').addEventListener('click', () => {
            installBanner.remove();
        });
    }

    /**
     * 清理资源
     */
    destroy() {
        // 清理事件监听器
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchend', this.handleTouchEnd);
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        window.removeEventListener('resize', this.handleResize);
    }
}

// 触摸手势类
class TouchGesture {
    constructor(element) {
        this.element = element;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.isActive = false;
        
        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.element.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.element.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    }

    onTouchStart(e) {
        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.isActive = true;
    }

    onTouchMove(e) {
        if (!this.isActive) return;
        
        const touch = e.touches[0];
        this.currentX = touch.clientX;
        this.currentY = touch.clientY;
        
        this.onGestureMove?.(this.getDeltaX(), this.getDeltaY(), e);
    }

    onTouchEnd(e) {
        this.isActive = false;
        this.onGestureEnd?.(this.getDeltaX(), this.getDeltaY(), e);
    }

    getDeltaX() {
        return this.currentX - this.startX;
    }

    getDeltaY() {
        return this.currentY - this.startY;
    }
}

// 移动端工具函数
const MobileUtils = {
    /**
     * 检测是否支持WebGL
     */
    supportsWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                     canvas.getContext('webgl'));
        } catch (e) {
            return false;
        }
    },

    /**
     * 获取网络连接类型
     */
    getConnectionType() {
        if ('connection' in navigator) {
            return navigator.connection.effectiveType;
        }
        return 'unknown';
    },

    /**
     * 检测设备内存
     */
    getDeviceMemory() {
        if ('deviceMemory' in navigator) {
            return navigator.deviceMemory;
        }
        return null;
    },

    /**
     * 获取电池信息
     */
    getBatteryInfo() {
        if ('getBattery' in navigator) {
            return navigator.getBattery();
        }
        return null;
    },

    /**
     * 震动反馈
     */
    vibrate(pattern = 50) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    },

    /**
     * 全屏API
     */
    enterFullscreen(element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    },

    /**
     * 退出全屏
     */
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
};

// 性能监控类
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.init();
    }

    init() {
        if ('performance' in window) {
            this.measurePageLoad();
            this.measureNavigationTiming();
        }
    }

    measurePageLoad() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                this.metrics.loadTime = perfData.loadEventEnd - perfData.loadEventStart;
                this.metrics.domContentLoaded = perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart;
                
                console.log('Performance metrics:', this.metrics);
            }, 0);
        });
    }

    measureNavigationTiming() {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.entryType === 'navigation') {
                    this.metrics[entry.name] = entry.duration;
                }
            });
        });
        
        observer.observe({ entryTypes: ['navigation'] });
    }

    getMetrics() {
        return this.metrics;
    }
}

// 初始化移动端优化器
document.addEventListener('DOMContentLoaded', () => {
    window.mobileOptimizer = new MobileOptimizer();
    window.performanceMonitor = new PerformanceMonitor();
    
    // 为移动端设备添加特殊类
    if (window.mobileOptimizer.isMobile) {
        document.documentElement.classList.add('mobile-device');
    }
    
    if (window.mobileOptimizer.isIOS()) {
        document.documentElement.classList.add('ios-device');
    }
    
    if (window.mobileOptimizer.isAndroid()) {
        document.documentElement.classList.add('android-device');
    }
});

// 导出到全局作用域
window.MobileOptimizer = MobileOptimizer;
window.TouchGesture = TouchGesture;
window.MobileUtils = MobileUtils;
window.PerformanceMonitor = PerformanceMonitor;
