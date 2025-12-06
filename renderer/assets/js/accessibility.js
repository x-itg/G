/**
 * 可访问性增强模块
 * 提供键盘导航、焦点管理、屏幕阅读器支持和无障碍功能
 */

window.AccessibilityManager = {
    // 状态管理
    currentFontSize: 'normal',
    isHighContrast: false,
    focusTrapStack: [],
    lastFocusedElement: null,
    
    // 新增可访问性状态
    isReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isKeyboardUser: false,
    announcementQueue: [],
    liveRegions: {
        assertive: null,
        polite: null,
        announcement: null
    },

    // 初始化可访问性管理器
    init() {
        console.log('初始化可访问性管理器...');
        this.setupSystemPreferences();
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.setupAccessibilityControls();
        this.setupScreenReaderSupport();
        this.setupLiveRegions();
        this.setupReducedMotion();
        this.setupEnhancedNavigation();
        this.setupFormAccessibility();
        this.enhanceDynamicContent();
        this.announcePageLoad();
        this.saveUserPreferences();
        console.log('可访问性管理器已初始化');
    },

    // 设置键盘导航
    setupKeyboardNavigation() {
        // 全局键盘快捷键
        document.addEventListener('keydown', (e) => {
            // 组合键处理
            if (e.ctrlKey && e.altKey) {
                switch (e.key) {
                    case 'H':
                        e.preventDefault();
                        this.toggleHighContrast();
                        break;
                    case '-':
                        e.preventDefault();
                        this.decreaseFontSize();
                        break;
                    case '=':
                        e.preventDefault();
                        this.increaseFontSize();
                        break;
                }
            } else if (e.ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 'l':
                        e.preventDefault();
                        this.clearLoginForm();
                        break;
                    case 'm':
                        e.preventDefault();
                        this.toggleMobileMenu();
                        break;
                    case 's':
                        e.preventDefault();
                        this.triggerAction('start-btn');
                        break;
                    case 't':
                        e.preventDefault();
                        this.triggerAction('stop-btn');
                        break;
                    case 'h':
                        e.preventDefault();
                        this.triggerAction('home-btn');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.triggerAction('reset-btn');
                        break;
                    case 'e':
                        e.preventDefault();
                        this.triggerAction('export-data');
                        break;
                    case 'p':
                        e.preventDefault();
                        this.triggerAction('print-report');
                        break;
                }
            }

            // ESC键处理
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }

            // Enter键处理
            if (e.key === 'Enter' && e.ctrlKey) {
                this.handleCtrlEnter();
            }
        });

        // 为图表标记添加键盘支持
        this.setupChartMarkerNavigation();
        
        // 为移动端元素添加键盘支持
        this.setupMobileKeyboardSupport();
        
        // 键盘用户检测
        this.detectKeyboardUser();
    },

    // 设置焦点管理
    setupFocusManagement() {
        // 模态框焦点陷阱
        this.setupModalFocusTrap();
        
        // 焦点指示器增强
        this.setupFocusIndicators();
        
        // 跳过链接支持
        this.setupSkipLinks();
        
        // 焦点恢复
        this.setupFocusRestoration();
    },

    // 设置可访问性控制
    setupAccessibilityControls() {
        // 高对比度切换
        const contrastBtn = document.getElementById('high-contrast-toggle');
        if (contrastBtn) {
            contrastBtn.addEventListener('click', () => this.toggleHighContrast());
        }

        // 字体大小控制
        const decreaseBtn = document.getElementById('font-size-decrease');
        const increaseBtn = document.getElementById('font-size-increase');
        const resetBtn = document.getElementById('reset-accessibility');

        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', () => this.decreaseFontSize());
        }
        if (increaseBtn) {
            increaseBtn.addEventListener('click', () => this.increaseFontSize());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetAccessibilitySettings());
        }

        // 从localStorage恢复设置
        this.restoreAccessibilitySettings();
    },

    // 设置屏幕阅读器支持
    setupScreenReaderSupport() {
        // 为动态内容添加ARIA标签
        this.enhanceDynamicContent();
        
        // 设置表格可访问性
        this.setupTableAccessibility();
        
        // 设置图表可访问性
        this.setupChartAccessibility();
    },

    // 设置实时区域
    setupLiveRegions() {
        // 创建实时区域用于状态更新
        const statusRegion = document.getElementById('sr-status');
        const alertsRegion = document.getElementById('sr-alerts');
        const announcementsRegion = document.getElementById('sr-announcements');

        if (statusRegion) {
            this.statusLiveRegion = statusRegion;
        }
        if (alertsRegion) {
            this.alertsLiveRegion = alertsRegion;
        }
        if (announcementsRegion) {
            this.announcementsLiveRegion = announcementsRegion;
        }
        
        // 设置增强的实时区域
        this.setupEnhancedLiveRegions();
        
        // 恢复用户偏好
        this.restoreUserPreferences();
    },

    // 设置减少动画支持
    setupReducedMotion() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        if (mediaQuery.matches) {
            document.body.classList.add('reduced-motion');
        }

        mediaQuery.addEventListener('change', (e) => {
            if (e.matches) {
                document.body.classList.add('reduced-motion');
            } else {
                document.body.classList.remove('reduced-motion');
            }
        });
    },

    // 切换高对比度模式
    toggleHighContrast() {
        this.isHighContrast = !this.isHighContrast;
        const body = document.body;
        const button = document.getElementById('high-contrast-toggle');

        if (this.isHighContrast) {
            body.classList.add('high-contrast');
            if (button) {
                button.setAttribute('aria-pressed', 'true');
            }
            this.announce('已启用高对比度模式');
        } else {
            body.classList.remove('high-contrast');
            if (button) {
                button.setAttribute('aria-pressed', 'false');
            }
            this.announce('已禁用高对比度模式');
        }

        this.saveAccessibilitySettings();
    },

    // 减小字体大小
    decreaseFontSize() {
        const sizes = ['normal', 'large-text', 'extra-large-text'];
        const currentIndex = sizes.indexOf(this.currentFontSize);
        
        if (currentIndex > 0) {
            this.setFontSize(sizes[currentIndex - 1]);
        }
    },

    // 增大字体大小
    increaseFontSize() {
        const sizes = ['normal', 'large-text', 'extra-large-text'];
        const currentIndex = sizes.indexOf(this.currentFontSize);
        
        if (currentIndex < sizes.length - 1) {
            this.setFontSize(sizes[currentIndex + 1]);
        }
    },

    // 设置字体大小
    setFontSize(size) {
        const body = document.body;
        body.classList.remove('large-text', 'extra-large-text');
        
        if (size !== 'normal') {
            body.classList.add(size);
        }
        
        this.currentFontSize = size;
        this.announce(`字体大小已设置为${this.getFontSizeDescription(size)}`);
        this.saveAccessibilitySettings();
    },

    // 获取字体大小描述
    getFontSizeDescription(size) {
        const descriptions = {
            'normal': '正常',
            'large-text': '大',
            'extra-large-text': '特大'
        };
        return descriptions[size] || '正常';
    },

    // 重置可访问性设置
    resetAccessibilitySettings() {
        // 移除高对比度
        document.body.classList.remove('high-contrast');
        this.isHighContrast = false;
        
        // 恢复正常字体大小
        this.setFontSize('normal');
        
        // 重置按钮状态
        const button = document.getElementById('high-contrast-toggle');
        if (button) {
            button.setAttribute('aria-pressed', 'false');
        }

        this.announce('已重置所有可访问性设置');
        this.saveAccessibilitySettings();
    },

    // 保存可访问性设置
    saveAccessibilitySettings() {
        const settings = {
            highContrast: this.isHighContrast,
            fontSize: this.currentFontSize
        };
        localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
    },

    // 恢复可访问性设置
    restoreAccessibilitySettings() {
        try {
            const saved = localStorage.getItem('accessibilitySettings');
            if (saved) {
                const settings = JSON.parse(saved);
                
                if (settings.highContrast) {
                    this.toggleHighContrast();
                }
                if (settings.fontSize) {
                    this.setFontSize(settings.fontSize);
                }
            }
        } catch (error) {
            console.warn('无法恢复可访问性设置:', error);
        }
        
        // 恢复用户偏好
        this.restoreUserPreferences();
    },

    // 公告消息（用于屏幕阅读器）
    announce(message, priority = 'polite') {
        const region = priority === 'assertive' ? 
            this.alertsLiveRegion : this.statusLiveRegion;
            
        if (region) {
            region.textContent = message;
            // 清除消息以允许重复公告
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        }
    },

    // 公告页面加载完成
    announcePageLoad() {
        setTimeout(() => {
            this.announce('放射检测系统已加载完成');
        }, 1000);
    },

    // 处理ESC键
    handleEscapeKey() {
        // 关闭模态框
        if (this.isModalOpen()) {
            this.closeModal();
            return;
        }

        // 关闭移动端菜单
        if (this.isMobileMenuOpen()) {
            this.closeMobileMenu();
            return;
        }

        // 关闭工具提示
        this.hideTooltips();
    },

    // 处理Ctrl+Enter键
    handleCtrlEnter() {
        // 在登录表单中触发登录
        const loginForm = document.getElementById('login-form');
        if (loginForm && !loginForm.style.display || loginForm.style.display !== 'none') {
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        }
    },

    // 触发按钮动作
    triggerAction(buttonId) {
        const button = document.getElementById(buttonId);
        if (button && !button.disabled) {
            button.click();
        }
    },

    // 设置模态框焦点陷阱
    setupModalFocusTrap() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && this.isModalOpen()) {
                this.trapFocus(e);
            }
        });
    },

    // 焦点陷阱
    trapFocus(e) {
        const modal = document.getElementById('modal-overlay');
        if (!modal || modal.style.display === 'none') return;

        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    },

    // 检查模态框是否打开
    isModalOpen() {
        const modal = document.getElementById('modal-overlay');
        return modal && modal.style.display !== 'none';
    },

    // 关闭模态框
    closeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.style.display = 'none';
            this.restoreFocus();
        }
    },

    // 设置焦点指示器
    setupFocusIndicators() {
        // 为所有可聚焦元素添加焦点可见性
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        focusableElements.forEach(element => {
            element.addEventListener('focus', (e) => {
                e.target.classList.add('focus-visible');
            });

            element.addEventListener('blur', (e) => {
                e.target.classList.remove('focus-visible');
            });
        });
    },

    // 设置跳过链接
    setupSkipLinks() {
        const skipLinks = document.querySelectorAll('.skip-link');
        
        skipLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                
                if (target) {
                    target.focus();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    },

    // 保存焦点
    saveFocus() {
        this.lastFocusedElement = document.activeElement;
    },

    // 恢复焦点
    restoreFocus() {
        if (this.lastFocusedElement) {
            this.lastFocusedElement.focus();
            this.lastFocusedElement = null;
        }
    },

    // 设置焦点恢复
    setupFocusRestoration() {
        // 在模态框打开前保存焦点
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'style' &&
                    mutation.target.id === 'modal-overlay') {
                    
                    if (mutation.target.style.display !== 'none') {
                        this.saveFocus();
                    }
                }
            });
        });

        const modal = document.getElementById('modal-overlay');
        if (modal) {
            observer.observe(modal, { attributes: true });
        }
    },

    // 设置图表标记导航
    setupChartMarkerNavigation() {
        const markers = document.querySelectorAll('.chart-marker');
        
        markers.forEach(marker => {
            marker.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    marker.click();
                }
            });
        });
    },

    // 设置移动端键盘支持
    setupMobileKeyboardSupport() {
        // 移动端菜单按钮
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    mobileMenuBtn.click();
                }
            });
        }

        // 移动端结果面板切换
        const resultsToggle = document.getElementById('mobile-results-toggle');
        if (resultsToggle) {
            resultsToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    resultsToggle.click();
                }
            });
        }
    },

    // 检查移动端菜单是否打开
    isMobileMenuOpen() {
        const sidebar = document.getElementById('mobile-sidebar');
        return sidebar && sidebar.classList.contains('open');
    },

    // 切换移动端菜单
    toggleMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        if (menuBtn) {
            menuBtn.click();
        }
    },

    // 关闭移动端菜单
    closeMobileMenu() {
        const closeBtn = document.getElementById('mobile-sidebar-close');
        if (closeBtn) {
            closeBtn.click();
        }
    },

    // 隐藏工具提示
    hideTooltips() {
        if (window.UI && window.UI.hideTooltip) {
            window.UI.hideTooltip();
        }
    },

    // 增强动态内容
    enhanceDynamicContent() {
        // 为数据更新添加ARIA支持
        this.observeDataChanges();
        
        // 为状态变化添加支持
        this.observeStatusChanges();
    },

    // 观察数据变化
    observeDataChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // 检查是否有新的数据项添加
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.enhanceElement(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    // 增强元素
    enhanceElement(element) {
        // 为结果项添加角色
        if (element.classList.contains('result-item')) {
            element.setAttribute('role', 'row');
        }

        // 为状态指示器添加角色
        if (element.classList.contains('status-item')) {
            element.setAttribute('role', 'status');
        }
    },

    // 观察状态变化
    observeStatusChanges() {
        const statusElements = [
            'connection-status',
            'device-status',
            'device-connection',
            'current-position',
            'current-counts',
            'total-points',
            'measurement-time'
        ];

        statusElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' || 
                            (mutation.type === 'attributes' && 
                             mutation.attributeName === 'textContent')) {
                            
                            const value = element.textContent;
                            const label = element.getAttribute('aria-label') || 
                                        element.previousElementSibling?.textContent || 
                                        elementId;
                            
                            this.announce(`${label}: ${value}`, 'polite');
                        }
                    });
                });

                observer.observe(element, {
                    childList: true,
                    characterData: true,
                    subtree: true
                });
            }
        });
    },

    // 设置表格可访问性
    setupTableAccessibility() {
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
            // 为表格添加描述
            if (!table.getAttribute('aria-label') && !table.getAttribute('aria-describedby')) {
                const caption = table.querySelector('caption');
                if (caption) {
                    table.setAttribute('aria-describedby', 'table-caption-' + table.id);
                    caption.id = 'table-caption-' + table.id;
                }
            }
        });
    },

    // 设置图表可访问性
    setupChartAccessibility() {
        const chartCanvas = document.getElementById('main-chart');
        if (chartCanvas) {
            // 为图表添加详细的ARIA标签
            const updateChartAccessibility = () => {
                // 这里可以添加图表数据更新逻辑
                const dataTable = document.getElementById('chart-data-table');
                if (dataTable) {
                    // 同步图表数据到数据表
                    this.updateChartDataTable(dataTable);
                }
            };

            // 初始更新
            updateChartAccessibility();
            
            // 监听图表数据更新
            document.addEventListener('dataPointAdded', updateChartAccessibility);
            document.addEventListener('chartUpdated', updateChartAccessibility);
        }
    },

    // 更新图表数据表
    updateChartDataTable(dataTable) {
        // 这里应该根据实际的图表数据来更新数据表
        // 这是一个示例实现
        const tbody = dataTable.querySelector('[role="rowgroup"]');
        if (tbody && window.ChartModule) {
            // 清除现有数据
            const existingRows = tbody.querySelectorAll('[role="row"]:not(:first-child)');
            existingRows.forEach(row => row.remove());

            // 添加新数据行（这里需要实际的图表数据）
            // 示例数据结构
            const chartData = window.ChartModule.getDataPoints() || [];
            chartData.slice(0, 10).forEach(point => { // 限制显示前10个点
                const row = document.createElement('div');
                row.setAttribute('role', 'row');
                row.innerHTML = `
                    <div role="cell">${point.x}</div>
                    <div role="cell">${point.y}</div>
                `;
                tbody.appendChild(row);
            });
        }
    },

    // 清除登录表单
    clearLoginForm() {
        const form = document.getElementById('login-form');
        if (form) {
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                input.value = '';
                input.setAttribute('aria-invalid', 'false');
            });

            const errors = form.querySelectorAll('.error-message');
            errors.forEach(error => {
                error.textContent = '';
                error.classList.add('sr-only');
            });

            this.announce('已清除登录表单');
        }
    },

    // ==================== 新增可访问性功能 ====================

    // 设置系统偏好检测
    setupSystemPreferences() {
        // 检测减少动画偏好
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.isReducedMotion = reducedMotionQuery.matches;
        
        reducedMotionQuery.addListener((e) => {
            this.isReducedMotion = e.matches;
            if (e.matches) {
                document.body.classList.add('reduced-motion');
                this.announce('已检测到系统偏好减少动画', 'announcement');
            } else {
                document.body.classList.remove('reduced-motion');
                this.announce('系统动画偏好已恢复', 'announcement');
            }
        });

        // 检测高对比度偏好
        const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
        if (highContrastQuery.matches) {
            this.toggleHighContrast();
            this.announce('已根据系统偏好启用高对比度模式', 'announcement');
        }
    },

    // 检测键盘用户
    detectKeyboardUser() {
        let mouseUsers = false;
        
        document.addEventListener('mousedown', () => {
            mouseUsers = true;
            document.body.classList.add('mouse-user');
            document.body.classList.remove('keyboard-user');
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (!mouseUsers && !this.isKeyboardUser) {
                    this.isKeyboardUser = true;
                    document.body.classList.add('keyboard-user');
                    document.body.classList.remove('mouse-user');
                    this.announce('已启用键盘导航模式', 'announcement');
                }
                mouseUsers = false;
            }
        });

        // 初始检查是否已有键盘活动
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                setTimeout(() => {
                    if (!this.isKeyboardUser) {
                        this.isKeyboardUser = true;
                        document.body.classList.add('keyboard-user');
                    }
                }, 100);
            }
        }, { once: true });
    },

    // 增强导航支持
    setupEnhancedNavigation() {
        // 为所有导航元素添加角色和属性
        this.enhanceNavigationElements();
        
        // 设置面包屑导航
        this.setupBreadcrumbNavigation();
        
        // 设置页面内锚点导航
        this.setupAnchorNavigation();
    },

    // 增强导航元素
    enhanceNavigationElements() {
        const navElements = document.querySelectorAll('nav, [role="navigation"]');
        navElements.forEach((nav, index) => {
            if (!nav.getAttribute('aria-label') && !nav.getAttribute('aria-labelledby')) {
                nav.setAttribute('aria-label', `导航菜单 ${index + 1}`);
            }
        });

        const navLinks = document.querySelectorAll('nav a, [role="navigation"] a');
        navLinks.forEach(link => {
            if (!link.getAttribute('aria-describedby')) {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const target = document.querySelector(href);
                    if (target) {
                        const heading = target.querySelector('h1, h2, h3, h4, h5, h6');
                        if (heading) {
                            link.setAttribute('aria-describedby', `link-${target.id || 'section'}`);
                            if (!target.id) {
                                target.id = `section-${Math.random().toString(36).substr(2, 9)}`;
                            }
                            const descId = `link-${target.id}`;
                            const desc = document.createElement('span');
                            desc.id = descId;
                            desc.className = 'sr-only';
                            desc.textContent = `跳转到 ${heading.textContent}`;
                            document.body.appendChild(desc);
                        }
                    }
                }
            }
        });
    },

    // 设置面包屑导航
    setupBreadcrumbNavigation() {
        const breadcrumbs = document.querySelectorAll('.breadcrumb, [role="navigation"][aria-label*="面包屑"], [aria-label*="breadcrumb"]');
        breadcrumbs.forEach(breadcrumb => {
            const list = breadcrumb.querySelector('ol, ul, [role="list"]');
            if (list) {
                list.setAttribute('role', 'list');
                const items = list.querySelectorAll('li');
                items.forEach((item, index) => {
                    item.setAttribute('role', 'listitem');
                    const link = item.querySelector('a');
                    if (link) {
                        link.setAttribute('aria-current', index === items.length - 1 ? 'page' : null);
                    }
                });
            }
        });
    },

    // 设置锚点导航
    setupAnchorNavigation() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach((heading, index) => {
            if (!heading.id) {
                const text = heading.textContent.trim().toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-');
                heading.id = `heading-${text || index}`;
            }

            // 添加锚点图标
            const anchor = document.createElement('a');
            anchor.href = `#${heading.id}`;
            anchor.className = 'heading-anchor';
            anchor.setAttribute('aria-label', `链接到标题: ${heading.textContent}`);
            anchor.innerHTML = '🔗';
            anchor.style.marginLeft = '8px';
            anchor.style.textDecoration = 'none';
            anchor.style.opacity = '0';
            anchor.style.transition = 'opacity 0.3s';
            
            heading.appendChild(anchor);
            
            heading.addEventListener('mouseenter', () => {
                anchor.style.opacity = '1';
            });
            
            heading.addEventListener('mouseleave', () => {
                anchor.style.opacity = '0';
            });
        });
    },

    // 增强表单可访问性
    setupFormAccessibility() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            this.enhanceForm(form);
        });

        // 监听动态添加的表单
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'FORM') {
                            this.enhanceForm(node);
                        } else {
                            const forms = node.querySelectorAll?.('form');
                            forms?.forEach(form => this.enhanceForm(form));
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    // 增强单个表单
    enhanceForm(form) {
        if (form.getAttribute('aria-enhanced') === 'true') return;
        
        form.setAttribute('aria-enhanced', 'true');
        
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach((input, index) => {
            this.enhanceInput(input, index, inputs.length);
        });

        const buttons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
        buttons.forEach(button => {
            this.enhanceSubmitButton(button, form);
        });

        // 表单验证增强
        this.setupFormValidation(form);
    },

    // 增强输入元素
    enhanceInput(input, index, total) {
        // 生成唯一ID
        if (!input.id) {
            input.id = `input-${Math.random().toString(36).substr(2, 9)}`;
        }

        // 关联标签
        this.associateLabel(input);

        // 设置描述
        this.setupInputDescription(input);

        // 设置验证
        this.setupInputValidation(input);

        // 设置键盘导航
        this.setupInputKeyboardNavigation(input, index, total);
    },

    // 关联标签
    associateLabel(input) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (!label) {
            const newLabel = document.createElement('label');
            newLabel.setAttribute('for', input.id);
            newLabel.textContent = input.getAttribute('aria-label') || 
                                  input.placeholder || 
                                  '输入字段';
            input.parentNode.insertBefore(newLabel, input);
        }
    },

    // 设置输入描述
    setupInputDescription(input) {
        const helpId = `${input.id}-help`;
        const errorId = `${input.id}-error`;
        
        let helpElement = document.getElementById(helpId);
        let errorElement = document.getElementById(errorId);

        if (input.getAttribute('aria-describedby')) {
            const describedBy = input.getAttribute('aria-describedby').split(' ');
            describedBy.push(helpId);
            if (errorElement) describedBy.push(errorId);
            input.setAttribute('aria-describedby', describedBy.join(' '));
        } else {
            const descriptions = [helpId];
            if (errorElement) descriptions.push(errorId);
            input.setAttribute('aria-describedby', descriptions.join(' '));
        }
    },

    // 设置输入验证
    setupInputValidation(input) {
        const validateInput = () => {
            const isValid = input.checkValidity();
            const errorElement = document.getElementById(`${input.id}-error`);
            
            if (isValid) {
                input.setAttribute('aria-invalid', 'false');
                if (errorElement) {
                    errorElement.textContent = '';
                    errorElement.classList.add('sr-only');
                }
            } else {
                input.setAttribute('aria-invalid', 'true');
                if (errorElement) {
                    errorElement.textContent = input.validationMessage;
                    errorElement.classList.remove('sr-only');
                }
            }
        };

        input.addEventListener('blur', validateInput);
        input.addEventListener('input', validateInput);
        input.addEventListener('change', validateInput);
    },

    // 设置输入键盘导航
    setupInputKeyboardNavigation(input, index, total) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' && input.tagName === 'SELECT') {
                // 选择框下箭头处理
                return;
            }
            
            if (e.key === 'Enter') {
                // Enter键提交表单
                const form = input.closest('form');
                if (form && !e.shiftKey) {
                    e.preventDefault();
                    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                    if (submitButton && !submitButton.disabled) {
                        submitButton.click();
                    }
                }
            }

            if (e.key === 'Escape') {
                // ESC键清除输入
                if (input.type === 'text' || input.type === 'email') {
                    input.value = '';
                    this.announce('输入已清除', 'polite');
                }
            }
        });
    },

    // 增强提交按钮
    enhanceSubmitButton(button, form) {
        if (!button.id) {
            button.id = `submit-${Math.random().toString(36).substr(2, 9)}`;
        }

        if (!button.getAttribute('aria-describedby')) {
            const helpText = '按回车键或点击按钮提交表单';
            const helpId = `${button.id}-help`;
            const helpElement = document.createElement('div');
            helpElement.id = helpId;
            helpElement.className = 'keyboard-hint';
            helpElement.textContent = helpText;
            button.parentNode.insertBefore(helpElement, button.nextSibling);
            button.setAttribute('aria-describedby', helpId);
        }
    },

    // 设置表单验证
    setupFormValidation(form) {
        form.addEventListener('submit', (e) => {
            const isValid = form.checkValidity();
            
            if (!isValid) {
                e.preventDefault();
                this.announce('表单验证失败，请检查输入', 'assertive');
                
                // 聚焦到第一个无效字段
                const firstInvalid = form.querySelector('[aria-invalid="true"]');
                if (firstInvalid) {
                    firstInvalid.focus();
                }
            } else {
                this.announce('表单提交成功', 'polite');
            }
        });
    },

    // 改进的公告系统
    improvedAnnounce(message, priority = 'polite', atomic = true) {
        const region = this.liveRegions[priority];
        if (region) {
            // 清除当前内容以允许重复公告
            region.textContent = '';
            
            setTimeout(() => {
                region.textContent = message;
                region.setAttribute('aria-atomic', atomic.toString());
            }, 100);
            
            // 自动清除消息
            setTimeout(() => {
                region.textContent = '';
            }, 3000);
        }
    },

    // 设置增强的实时区域
    setupEnhancedLiveRegions() {
        // 创建或获取实时区域
        this.liveRegions.assertive = document.getElementById('sr-alerts') || this.createLiveRegion('assertive');
        this.liveRegions.polite = document.getElementById('sr-status') || this.createLiveRegion('polite');
        this.liveRegions.announcement = document.getElementById('sr-announcements') || this.createLiveRegion('announcement');
    },

    // 创建实时区域
    createLiveRegion(priority) {
        const region = document.createElement('div');
        region.id = `sr-${priority}`;
        region.className = 'sr-only';
        region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
        region.setAttribute('aria-live', priority);
        region.setAttribute('aria-atomic', 'true');
        document.body.appendChild(region);
        return region;
    },

    // 保存用户偏好
    saveUserPreferences() {
        const preferences = {
            fontSize: this.currentFontSize,
            highContrast: this.isHighContrast,
            isKeyboardUser: this.isKeyboardUser,
            timestamp: Date.now()
        };
        localStorage.setItem('accessibilityPreferences', JSON.stringify(preferences));
    },

    // 恢复用户偏好
    restoreUserPreferences() {
        try {
            const saved = localStorage.getItem('accessibilityPreferences');
            if (saved) {
                const preferences = JSON.parse(saved);
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                
                if (Date.now() - preferences.timestamp < sevenDays) {
                    if (preferences.fontSize && preferences.fontSize !== 'normal') {
                        this.setFontSize(preferences.fontSize);
                    }
                    if (preferences.highContrast) {
                        this.toggleHighContrast();
                    }
                }
            }
        } catch (error) {
            console.warn('无法恢复可访问性偏好:', error);
        }
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.AccessibilityManager.init();
});

// 导出到全局作用域
window.AccessibilityManager = window.AccessibilityManager;

console.log('可访问性管理器已加载');