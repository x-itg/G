/**
 * 全局加载状态指示系统
 * Global Loading Status Indicator System
 * 
 * 提供统一的加载状态管理和用户反馈
 * Provides unified loading state management and user feedback
 */

window.LoadingIndicator = {
    // 配置
    config: {
        defaultDelay: 100,          // 显示加载指示器的最小延迟时间
        hideDelay: 200,             // 隐藏加载指示器的额外延迟
        progressInterval: 100,      // 进度更新间隔
        animationDuration: 300,     // 动画持续时间
        autoHideTimeout: 30000,     // 自动隐藏超时时间（30秒）
        enableCancel: true,         // 启用操作取消功能
        enableProgress: true,       // 启用进度条显示
        showMessage: true           // 显示加载消息
    },

    // 状态
    activeLoaders: new Map(),       // 活动的加载器
    globalCounter: 0,              // 全局加载计数器
    isInitialized: false,          // 是否已初始化

    /**
     * 初始化加载指示器
     */
    init() {
        if (this.isInitialized) return;

        console.log('🔄 初始化加载状态指示系统...');
        
        try {
            this.createUI();
            this.bindEvents();
            this.setupGlobalStyles();
            
            this.isInitialized = true;
            console.log('✅ 加载状态指示系统初始化完成');
        } catch (error) {
            console.error('❌ 加载状态指示系统初始化失败:', error);
        }
    },

    /**
     * 创建UI元素
     */
    createUI() {
        // 创建主容器
        const container = document.createElement('div');
        container.id = 'global-loading-container';
        container.innerHTML = this.getContainerHTML();
        document.body.appendChild(container);

        // 创建全局加载遮罩
        const overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.className = 'global-loading-overlay';
        overlay.innerHTML = this.getOverlayHTML();
        document.body.appendChild(overlay);
    },

    /**
     * 获取容器HTML
     */
    getContainerHTML() {
        return `
            <div id="global-loading-indicator" class="global-loading-indicator hidden">
                <div class="loading-content">
                    <div class="loading-spinner">
                        <div class="spinner-ring"></div>
                        <div class="spinner-dots">
                            <span class="dot"></span>
                            <span class="dot"></span>
                            <span class="dot"></span>
                        </div>
                    </div>
                    <div class="loading-messages">
                        <div class="main-message" id="loading-main-message">加载中...</div>
                        <div class="sub-message" id="loading-sub-message"></div>
                    </div>
                    ${this.config.enableProgress ? `
                        <div class="loading-progress">
                            <div class="progress-bar-container">
                                <div class="progress-bar" id="loading-progress-bar" style="width: 0%"></div>
                            </div>
                            <div class="progress-text" id="loading-progress-text">0%</div>
                        </div>
                    ` : ''}
                    ${this.config.enableCancel ? `
                        <div class="loading-actions">
                            <button type="button" class="btn btn-sm btn-outline-light" id="loading-cancel-btn">
                                取消操作
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * 获取覆盖层HTML
     */
    getOverlayHTML() {
        return `
            <div class="loading-overlay-content">
                <div class="loading-spinner-mini">
                    <div class="spinner-ring-mini"></div>
                </div>
                <div class="loading-overlay-text">系统处理中...</div>
            </div>
        `;
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        const cancelBtn = document.getElementById('loading-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelAllOperations();
            });
        }

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });

        // 窗口焦点事件
        window.addEventListener('blur', () => {
            // 窗口失焦时不隐藏，但可以暂停动画
            this.pauseAnimations();
        });

        window.addEventListener('focus', () => {
            this.resumeAnimations();
        });
    },

    /**
     * 设置全局样式
     */
    setupGlobalStyles() {
        if (document.getElementById('loading-indicator-styles')) return;

        const style = document.createElement('style');
        style.id = 'loading-indicator-styles';
        style.textContent = this.getStyles();
        document.head.appendChild(style);
    },

    /**
     * 获取样式
     */
    getStyles() {
        return `
            /* 主加载指示器 */
            .global-loading-indicator {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(4px);
                transition: opacity ${this.config.animationDuration}ms ease;
            }

            .global-loading-indicator.hidden {
                opacity: 0;
                pointer-events: none;
            }

            .global-loading-indicator.visible {
                opacity: 1;
                pointer-events: all;
            }

            .loading-content {
                background: #ffffff;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                text-align: center;
                min-width: 300px;
                max-width: 400px;
                animation: loadingContentAppear ${this.config.animationDuration}ms ease;
            }

            @keyframes loadingContentAppear {
                from {
                    transform: scale(0.9);
                    opacity: 0;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            /* 旋转动画 */
            .spinner-ring {
                width: 60px;
                height: 60px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* 脉冲点动画 */
            .spinner-dots {
                display: flex;
                justify-content: center;
                gap: 5px;
                margin-bottom: 20px;
            }

            .spinner-dots .dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #3498db;
                animation: dotPulse 1.4s infinite ease-in-out both;
            }

            .spinner-dots .dot:nth-child(1) { animation-delay: -0.32s; }
            .spinner-dots .dot:nth-child(2) { animation-delay: -0.16s; }
            .spinner-dots .dot:nth-child(3) { animation-delay: 0s; }

            @keyframes dotPulse {
                0%, 80%, 100% {
                    transform: scale(0.8);
                    opacity: 0.5;
                }
                40% {
                    transform: scale(1.2);
                    opacity: 1;
                }
            }

            /* 消息区域 */
            .loading-messages {
                margin-bottom: 20px;
            }

            .main-message {
                font-size: 18px;
                font-weight: 600;
                color: #2c3e50;
                margin-bottom: 8px;
            }

            .sub-message {
                font-size: 14px;
                color: #7f8c8d;
                font-style: italic;
            }

            /* 进度条 */
            .loading-progress {
                margin-bottom: 20px;
            }

            .progress-bar-container {
                width: 100%;
                height: 8px;
                background: #ecf0f1;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #3498db, #2ecc71);
                border-radius: 4px;
                transition: width ${this.config.progressInterval}ms ease;
                position: relative;
                overflow: hidden;
            }

            .progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                animation: progressShine 2s infinite;
            }

            @keyframes progressShine {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            .progress-text {
                font-size: 12px;
                color: #7f8c8d;
                text-align: right;
            }

            /* 操作按钮 */
            .loading-actions {
                display: flex;
                justify-content: center;
            }

            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }

            .btn-outline-light {
                background: transparent;
                border: 1px solid #bdc3c7;
                color: #7f8c8d;
            }

            .btn-outline-light:hover {
                background: #ecf0f1;
                border-color: #95a5a6;
            }

            /* 全局覆盖层 */
            .global-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9998;
            }

            .global-loading-overlay.visible {
                display: flex;
            }

            .loading-overlay-content {
                text-align: center;
                color: white;
            }

            .spinner-ring-mini {
                width: 30px;
                height: 30px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            }

            .loading-overlay-text {
                font-size: 14px;
                opacity: 0.9;
            }

            /* 操作特定加载器 */
            .operation-loader {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 15px;
                min-width: 250px;
                z-index: 9999;
                transform: translateX(400px);
                transition: transform ${this.config.animationDuration}ms ease;
            }

            .operation-loader.visible {
                transform: translateX(0);
            }

            .operation-loader.hidden {
                transform: translateX(400px);
            }

            .operation-loader-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .operation-loader-title {
                font-weight: 600;
                color: #2c3e50;
                font-size: 14px;
            }

            .operation-loader-close {
                background: none;
                border: none;
                color: #7f8c8d;
                cursor: pointer;
                font-size: 16px;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s;
            }

            .operation-loader-close:hover {
                background: #ecf0f1;
                color: #2c3e50;
            }

            .operation-loader-progress {
                margin-bottom: 8px;
            }

            .operation-loader-message {
                font-size: 12px;
                color: #7f8c8d;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                .loading-content {
                    margin: 20px;
                    min-width: auto;
                    width: calc(100% - 40px);
                }

                .operation-loader {
                    left: 20px;
                    right: 20px;
                    transform: translateY(-100px);
                }

                .operation-loader.visible {
                    transform: translateY(0);
                }

                .operation-loader.hidden {
                    transform: translateY(-100px);
                }
            }

            /* 无障碍支持 */
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }
        `;
    },

    /**
     * 显示全局加载指示器
     * @param {Object} options - 配置选项
     */
    async show(options = {}) {
        const config = {
            message: '加载中...',
            subMessage: '',
            progress: 0,
            showProgress: true,
            enableCancel: this.config.enableCancel,
            autoHide: true,
            duration: null,
            ...options
        };

        const loaderId = ++this.globalCounter;
        this.activeLoaders.set(loaderId, config);

        // 延迟显示以避免闪烁
        await this.delay(this.config.defaultDelay);

        const indicator = document.getElementById('global-loading-indicator');
        if (!indicator) return;

        // 更新内容
        this.updateContent(config);

        // 显示指示器
        indicator.classList.remove('hidden');
        indicator.classList.add('visible');

        // 自动隐藏
        if (config.autoHide && config.duration) {
            setTimeout(() => {
                if (this.activeLoaders.has(loaderId)) {
                    this.hide();
                }
            }, config.duration);
        }

        return loaderId;
    },

    /**
     * 隐藏全局加载指示器
     */
    hide() {
        if (this.activeLoaders.size > 0) {
            this.activeLoaders.clear();
        }

        const indicator = document.getElementById('global-loading-indicator');
        if (indicator) {
            indicator.classList.remove('visible');
            indicator.classList.add('hidden');
        }

        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }
    },

    /**
     * 显示简单加载指示器
     */
    showSimple() {
        return this.show({
            message: '处理中...',
            subMessage: '',
            progress: null,
            showProgress: false
        });
    },

    /**
     * 显示带进度的加载指示器
     * @param {Object} options - 配置选项
     */
    async showWithProgress(options = {}) {
        const config = {
            message: '正在处理...',
            subMessage: '',
            progress: 0,
            showProgress: true,
            enableCancel: true,
            ...options
        };

        const loaderId = await this.show(config);

        // 启动进度更新
        this.startProgressUpdate(loaderId, config);

        return loaderId;
    },

    /**
     * 显示操作特定加载器
     * @param {Object} options - 配置选项
     */
    showOperation(options = {}) {
        const config = {
            title: '操作进行中',
            message: '请稍候...',
            progress: null,
            enableCancel: true,
            ...options
        };

        const loaderId = ++this.globalCounter;
        const loader = this.createOperationLoader(loaderId, config);
        
        this.activeLoaders.set(loaderId, config);
        document.body.appendChild(loader);

        // 显示动画
        setTimeout(() => {
            loader.classList.add('visible');
            loader.classList.remove('hidden');
        }, 10);

        return loaderId;
    },

    /**
     * 创建操作特定加载器
     */
    createOperationLoader(loaderId, config) {
        const loader = document.createElement('div');
        loader.className = `operation-loader hidden`;
        loader.setAttribute('data-loader-id', loaderId);
        
        loader.innerHTML = `
            <div class="operation-loader-header">
                <div class="operation-loader-title">${config.title}</div>
                ${config.enableCancel ? `
                    <button type="button" class="operation-loader-close" onclick="window.LoadingIndicator.cancelOperation('${loaderId}')">
                        ×
                    </button>
                ` : ''}
            </div>
            ${config.progress !== null ? `
                <div class="operation-loader-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${config.progress}%"></div>
                    </div>
                    <div class="progress-text">${config.progress}%</div>
                </div>
            ` : ''}
            <div class="operation-loader-message">${config.message}</div>
        `;

        return loader;
    },

    /**
     * 更新内容
     */
    updateContent(config) {
        const mainMessage = document.getElementById('loading-main-message');
        const subMessage = document.getElementById('loading-sub-message');
        const progressBar = document.getElementById('loading-progress-bar');
        const progressText = document.getElementById('loading-progress-text');

        if (mainMessage) {
            mainMessage.textContent = config.message;
        }

        if (subMessage) {
            subMessage.textContent = config.subMessage || '';
        }

        if (this.config.enableProgress && config.showProgress && progressBar && progressText) {
            const progress = config.progress || 0;
            progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }
    },

    /**
     * 启动进度更新
     */
    startProgressUpdate(loaderId, config) {
        if (!config.progressCallback) return;

        const interval = setInterval(() => {
            if (!this.activeLoaders.has(loaderId)) {
                clearInterval(interval);
                return;
            }

            const progress = config.progressCallback();
            config.progress = progress;
            this.updateContent(config);
        }, this.config.progressInterval);
    },

    /**
     * 更新进度
     * @param {string|number} loaderId - 加载器ID
     * @param {number} progress - 进度百分比
     * @param {string} message - 可选的更新消息
     */
    updateProgress(loaderId, progress, message = null) {
        const config = this.activeLoaders.get(loaderId);
        if (!config) return;

        config.progress = progress;
        if (message) {
            config.message = message;
        }

        this.updateContent(config);
    },

    /**
     * 更新消息
     */
    updateMessage(loaderId, message, subMessage = null) {
        const config = this.activeLoaders.get(loaderId);
        if (!config) return;

        config.message = message;
        if (subMessage !== null) {
            config.subMessage = subMessage;
        }

        this.updateContent(config);
    },

    /**
     * 取消特定操作
     */
    cancelOperation(loaderId) {
        const config = this.activeLoaders.get(loaderId);
        if (!config || !config.enableCancel) return;

        // 调用取消回调
        if (config.onCancel) {
            try {
                config.onCancel();
            } catch (error) {
                console.error('取消操作时发生错误:', error);
            }
        }

        // 移除加载器
        this.removeLoader(loaderId);
        
        Auth.log(`操作已取消: ${config.message}`, 'warning');
    },

    /**
     * 取消所有操作
     */
    cancelAllOperations() {
        console.log('取消所有加载操作...');

        for (const [loaderId, config] of this.activeLoaders.entries()) {
            if (config.onCancel) {
                try {
                    config.onCancel();
                } catch (error) {
                    console.error('取消操作时发生错误:', error);
                }
            }
        }

        this.activeLoaders.clear();
        this.hide();

        // 隐藏所有操作加载器
        const operationLoaders = document.querySelectorAll('.operation-loader');
        operationLoaders.forEach(loader => {
            loader.classList.add('hidden');
            loader.classList.remove('visible');
        });

        Auth.log('所有操作已取消', 'warning');
    },

    /**
     * 移除加载器
     */
    removeLoader(loaderId) {
        this.activeLoaders.delete(loaderId);

        // 移除DOM元素
        const loader = document.querySelector(`[data-loader-id="${loaderId}"]`);
        if (loader) {
            loader.classList.add('hidden');
            loader.classList.remove('visible');
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
            }, this.config.animationDuration);
        }

        if (this.activeLoaders.size === 0) {
            this.hide();
        }
    },

    /**
     * 显示全局覆盖层
     */
    showOverlay() {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.classList.add('visible');
        }
    },

    /**
     * 隐藏全局覆盖层
     */
    hideOverlay() {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }
    },

    /**
     * 暂停动画
     */
    pauseAnimations() {
        const style = document.getElementById('loading-indicator-styles');
        if (style) {
            style.disabled = true;
        }
    },

    /**
     * 恢复动画
     */
    resumeAnimations() {
        const style = document.getElementById('loading-indicator-styles');
        if (style) {
            style.disabled = false;
        }
    },

    /**
     * 包装异步操作的加载指示器
     * @param {Function} asyncFunction - 异步函数
     * @param {Object} options - 配置选项
     * @returns {Function} 包装后的函数
     */
    wrap(asyncFunction, options = {}) {
        const config = {
            showProgress: false,
            enableCancel: true,
            ...options
        };

        return async (...args) => {
            let loaderId;
            
            try {
                if (config.showProgress && config.progressCallback) {
                    loaderId = await this.showWithProgress(config);
                } else {
                    loaderId = await this.show(config);
                }

                const result = await asyncFunction(...args);
                
                // 渐进式隐藏
                if (config.progress !== null) {
                    this.updateProgress(loaderId, 100);
                    await this.delay(300);
                }

                this.removeLoader(loaderId);
                return result;

            } catch (error) {
                console.error('操作执行失败:', error);
                
                if (loaderId) {
                    this.removeLoader(loaderId);
                }
                
                throw error;
            }
        };
    },

    /**
     * 包装HTTP请求的加载指示器
     * @param {Object} fetchOptions - fetch配置选项
     * @param {Object} loadingOptions - 加载指示器配置
     * @returns {Object} 包装后的fetch选项
     */
    wrapFetch(fetchOptions = {}, loadingOptions = {}) {
        const config = {
            message: '正在请求数据...',
            showProgress: false,
            enableCancel: true,
            ...loadingOptions
        };

        const originalFetch = window.fetch;
        let loaderId;

        return {
            ...fetchOptions,
            fetch: async (url, options = {}) => {
                try {
                    if (config.showProgress) {
                        loaderId = await this.showWithProgress(config);
                    } else {
                        loaderId = await this.show(config);
                    }

                    const response = await originalFetch(url, options);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    this.removeLoader(loaderId);
                    return response;

                } catch (error) {
                    if (loaderId) {
                        this.removeLoader(loaderId);
                    }
                    throw error;
                }
            }
        };
    },

    /**
     * 延迟执行
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 获取活动加载器信息
     */
    getActiveLoaders() {
        return Array.from(this.activeLoaders.entries()).map(([id, config]) => ({
            id,
            message: config.message,
            progress: config.progress,
            hasCancel: config.enableCancel
        }));
    },

    /**
     * 检查是否有活动的加载器
     */
    hasActiveLoaders() {
        return this.activeLoaders.size > 0;
    },

    /**
     * 清理所有资源
     */
    cleanup() {
        // 清理活动加载器
        this.activeLoaders.clear();
        
        // 清理DOM元素
        const container = document.getElementById('global-loading-container');
        const overlay = document.getElementById('global-loading-overlay');
        const styles = document.getElementById('loading-indicator-styles');

        [container, overlay, styles].forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });

        this.isInitialized = false;
        console.log('🧹 加载状态指示系统已清理');
    },

    /**
     * 获取系统信息
     */
    getSystemInfo() {
        return {
            name: '加载状态指示系统',
            version: '1.0.0',
            status: this.isInitialized ? 'active' : 'inactive',
            activeLoaders: this.activeLoaders.size,
            features: [
                '全局加载指示器',
                '进度条显示',
                '操作取消功能',
                '多种动画效果',
                '响应式设计',
                '无障碍支持'
            ]
        };
    }
};

// 自动初始化
try {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            try {
                if (window.LoadingIndicator && typeof window.LoadingIndicator.init === 'function') {
                    window.LoadingIndicator.init();
                } else {
                    console.error('LoadingIndicator: 模块或init方法不存在');
                }
            } catch (error) {
                console.error('LoadingIndicator: 初始化失败', error);
            }
        });
    } else {
        try {
            if (window.LoadingIndicator && typeof window.LoadingIndicator.init === 'function') {
                window.LoadingIndicator.init();
            } else {
                console.error('LoadingIndicator: 模块或init方法不存在');
            }
        } catch (error) {
            console.error('LoadingIndicator: 初始化失败', error);
        }
    }
} catch (error) {
    console.error('LoadingIndicator: 自动初始化失败', error);
}

console.log('加载状态指示系统已加载');