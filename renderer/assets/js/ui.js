// UI组件和界面管理模块
window.UI = {
    currentModal: null,
    tooltips: [],
    accessibilityManager: null,
    
    // 初始化UI模块
    init() {
        this.setupGlobalEventListeners();
        this.initializeComponents();
        this.setupAccessibilitySupport();
        
        console.log('UI模块已初始化');
    },

    // 设置全局事件监听器
    setupGlobalEventListeners() {
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.hideModal();
            }
        });

        // 点击模态框背景关闭
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.hideModal();
                }
            });
        }
    },

    // 初始化组件
    initializeComponents() {
        // 初始化工具提示
        this.initializeTooltips();
        
        // 初始化下拉菜单
        this.initializeDropdowns();
        
        // 初始化选项卡
        this.initializeTabs();
    },

    // 显示模态框
    showModal(options) {
        const {
            title = '提示',
            content = '',
            onConfirm = null,
            onCancel = null,
            showConfirmButton = true,
            showCancelButton = true,
            confirmText = '确认',
            cancelText = '取消',
            size = 'normal' // small, normal, large
        } = options;

        // 创建模态框
        const modal = this.createModal({
            title,
            content,
            onConfirm,
            onCancel,
            showConfirmButton,
            showCancelButton,
            confirmText,
            cancelText,
            size
        });

        // 显示模态框
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.innerHTML = modal;
            overlay.style.display = 'flex';
            this.currentModal = overlay;

            // 绑定事件
            this.bindModalEvents(overlay, options);
        }
    },

    // 创建模态框内容
    createModal(options) {
        const { title, content, onConfirm, onCancel, showConfirmButton, showCancelButton, confirmText, cancelText, size } = options;

        return `
            <div class="modal-content modal-${size}">
                <div class="modal-header">
                    <h3 id="modal-title">${title}</h3>
                    <button id="modal-close" class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="modal-content">
                        ${typeof content === 'string' ? content : content.outerHTML || content}
                    </div>
                </div>
                <div class="modal-footer">
                    ${showCancelButton ? `<button id="modal-cancel" class="btn btn-secondary">${cancelText}</button>` : ''}
                    ${showConfirmButton ? `<button id="modal-confirm" class="btn btn-primary">${confirmText}</button>` : ''}
                </div>
            </div>
        `;
    },

    // 绑定模态框事件
    bindModalEvents(overlay, options) {
        const { onConfirm, onCancel } = options;

        // 关闭按钮
        const closeBtn = overlay.querySelector('#modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }

        // 确认按钮
        const confirmBtn = overlay.querySelector('#modal-confirm');
        if (confirmBtn && onConfirm) {
            confirmBtn.addEventListener('click', async () => {
                try {
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = '处理中...';
                    
                    const result = await onConfirm();
                    if (result !== false) {
                        this.hideModal();
                    }
                } catch (error) {
                    console.error('模态框确认操作失败:', error);
                } finally {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = '确认';
                }
            });
        }

        // 取消按钮
        const cancelBtn = overlay.querySelector('#modal-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (onCancel) {
                    onCancel();
                }
                this.hideModal();
            });
        }
    },

    // 隐藏模态框
    hideModal() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.innerHTML = '';
            this.currentModal = null;
        }
    },

    // 显示提示框
    showAlert(title, message, type = 'info', duration = 5000) {
        const alertDiv = Utils.dom.create('div', `alert alert-${type}`);
        alertDiv.innerHTML = `
            <strong>${title}</strong> ${message}
            <button type="button" class="alert-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        // 创建提示框容器
        let container = document.getElementById('alert-container');
        if (!container) {
            container = Utils.dom.create('div', 'alert-container');
            container.id = 'alert-container';
            document.body.appendChild(container);
        }

        container.appendChild(alertDiv);

        // 自动隐藏
        if (duration > 0) {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, duration);
        }

        return alertDiv;
    },

    // 显示确认对话框
    showConfirm(title, message) {
        return new Promise((resolve) => {
            this.showModal({
                title,
                content: message,
                showCancelButton: true,
                confirmText: '确认',
                cancelText: '取消',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    },

    // 显示加载指示器
    showLoading(message = '加载中...') {
        // 首先尝试使用新的加载指示器系统
        if (window.LoadingIndicator) {
            window.LoadingIndicator.showSimple();
        } else {
            // 回退到旧的加载指示器
            const indicator = document.getElementById('loading-indicator');
            if (indicator) {
                const messageElement = indicator.querySelector('p');
                if (messageElement) {
                    messageElement.textContent = message;
                }
                indicator.style.display = 'flex';
            }
        }
    },

    // 隐藏加载指示器
    hideLoading() {
        // 首先尝试使用新的加载指示器系统
        if (window.LoadingIndicator) {
            window.LoadingIndicator.hide();
        } else {
            // 回退到旧的加载指示器
            const indicator = document.getElementById('loading-indicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
    },

    // 显示工具提示
    showTooltip(element, x, y, content) {
        this.hideTooltip(); // 隐藏之前的提示

        const tooltip = Utils.dom.create('div', 'chart-tooltip');
        tooltip.innerHTML = `
            <div class="tooltip-content">${content.replace(/\n/g, '<br>')}</div>
        `;

        document.body.appendChild(tooltip);
        this.tooltips.push(tooltip);

        // 定位
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + x + 10}px`;
        tooltip.style.top = `${rect.top + y - 30}px`;
        tooltip.classList.add('show');

        // 自动隐藏
        setTimeout(() => {
            this.hideTooltip();
        }, 3000);
    },

    // 隐藏工具提示
    hideTooltip() {
        this.tooltips.forEach(tooltip => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        });
        this.tooltips = [];
    },

    // 初始化工具提示组件
    initializeTooltips() {
        // 为带有title属性的元素添加悬停提示
        const elementsWithTitle = document.querySelectorAll('[title]');
        elementsWithTitle.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const title = element.getAttribute('title');
                this.showElementTooltip(element, title);
            });
            
            element.addEventListener('mouseleave', () => {
                this.hideElementTooltip();
            });
        });
    },

    // 显示元素工具提示
    showElementTooltip(element, content) {
        this.hideElementTooltip();

        const tooltip = Utils.dom.create('div', 'tooltip-popup');
        tooltip.textContent = content;

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
    },

    // 隐藏元素工具提示
    hideElementTooltip() {
        const existingTooltip = document.querySelector('.tooltip-popup');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    },

    // 显示/隐藏元素
    show(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    },

    hide(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    },

    // 启用/禁用元素
    enable(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.disabled = false;
            element.classList.remove('disabled');
        }
    },

    disable(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.disabled = true;
            element.classList.add('disabled');
        }
    },

    // 更新元素文本
    updateText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    },

    // 更新元素HTML
    updateHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    },

    // 初始化下拉菜单
    initializeDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown');
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-trigger');
            const menu = dropdown.querySelector('.dropdown-menu');

            if (trigger && menu) {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // 关闭其他下拉菜单
                    this.closeAllDropdowns();
                    
                    // 切换当前菜单
                    menu.classList.toggle('show');
                });
            }
        });

        // 点击外部关闭下拉菜单
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });
    },

    // 关闭所有下拉菜单
    closeAllDropdowns() {
        const menus = document.querySelectorAll('.dropdown-menu.show');
        menus.forEach(menu => {
            menu.classList.remove('show');
        });
    },

    // 初始化选项卡
    initializeTabs() {
        const tabLists = document.querySelectorAll('.tab-list');
        tabLists.forEach(tabList => {
            const tabs = tabList.querySelectorAll('.tab-link');
            const contents = document.querySelectorAll('.tab-content');

            tabs.forEach((tab, index) => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();

                    // 移除所有活动状态
                    tabs.forEach(t => t.classList.remove('active'));
                    contents.forEach(c => c.classList.remove('active'));

                    // 设置当前活动状态
                    tab.classList.add('active');
                    if (contents[index]) {
                        contents[index].classList.add('active');
                    }
                });
            });
        });
    },

    // 创建进度条
    createProgress(containerId, value, max = 100) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const percentage = Math.max(0, Math.min(100, (value / max) * 100));

        container.innerHTML = `
            <div class="progress">
                <div class="progress-bar" style="width: ${percentage}%"></div>
            </div>
            <div class="progress-text">${value} / ${max} (${percentage.toFixed(1)}%)</div>
        `;
    },

    // 更新进度条
    updateProgress(containerId, value, max = 100) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const percentage = Math.max(0, Math.min(100, (value / max) * 100));
        const progressBar = container.querySelector('.progress-bar');
        const progressText = container.querySelector('.progress-text');

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }

        if (progressText) {
            progressText.textContent = `${value} / ${max} (${percentage.toFixed(1)}%)`;
        }
    },

    // 创建通知
    createNotification(message, type = 'info', duration = 3000) {
        const notification = Utils.dom.create('div', `notification notification-${type}`);
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // 创建通知容器
        let container = document.getElementById('notification-container');
        if (!container) {
            container = Utils.dom.create('div', 'notification-container');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // 绑定关闭事件
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.remove();
            });
        }

        // 自动隐藏
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }

        return notification;
    },

    // 显示成功通知
    showSuccess(message, duration = 3000) {
        return this.createNotification(message, 'success', duration);
    },

    // 显示错误通知
    showError(message, duration = 5000) {
        return this.createNotification(message, 'error', duration);
    },

    // 显示警告通知
    showWarning(message, duration = 4000) {
        return this.createNotification(message, 'warning', duration);
    },

    // 显示信息通知
    showInfo(message, duration = 3000) {
        return this.createNotification(message, 'info', duration);
    },

    // 创建表格
    createTable(containerId, columns, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let table = container.querySelector('table');
        if (!table) {
            table = Utils.dom.create('table', 'table table-striped');
            container.appendChild(table);
        }

        // 创建表头
        const thead = Utils.dom.create('thead');
        const headerRow = Utils.dom.create('tr');
        columns.forEach(column => {
            const th = Utils.dom.create('th');
            th.textContent = column.title;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // 创建表体
        const tbody = Utils.dom.create('tbody');
        data.forEach(row => {
            const tr = Utils.dom.create('tr');
            columns.forEach(column => {
                const td = Utils.dom.create('td');
                const value = row[column.key] || '';
                td.textContent = value;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.innerHTML = '';
        table.appendChild(thead);
        table.appendChild(tbody);
    },

    // 创建分页控件
    createPagination(containerId, currentPage, totalPages, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const pagination = Utils.dom.create('nav', 'pagination-nav');
        const ul = Utils.dom.create('ul', 'pagination');

        // 上一页
        const prevLi = Utils.dom.create('li', `page-item ${currentPage === 1 ? 'disabled' : ''}`);
        const prevLink = Utils.dom.create('a', 'page-link');
        prevLink.textContent = '上一页';
        prevLink.href = '#';
        prevLi.appendChild(prevLink);
        ul.appendChild(prevLi);

        // 页码
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const li = Utils.dom.create('li', `page-item ${i === currentPage ? 'active' : ''}`);
            const link = Utils.dom.create('a', 'page-link');
            link.textContent = i;
            link.href = '#';
            li.appendChild(link);
            ul.appendChild(li);
        }

        // 下一页
        const nextLi = Utils.dom.create('li', `page-item ${currentPage === totalPages ? 'disabled' : ''}`);
        const nextLink = Utils.dom.create('a', 'page-link');
        nextLink.textContent = '下一页';
        nextLink.href = '#';
        nextLi.appendChild(nextLink);
        ul.appendChild(nextLi);

        pagination.appendChild(ul);
        container.innerHTML = '';
        container.appendChild(pagination);

        // 绑定事件
        pagination.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('page-link')) {
                const pageText = e.target.textContent;
                let newPage = currentPage;
                
                if (pageText === '上一页') {
                    newPage = Math.max(1, currentPage - 1);
                } else if (pageText === '下一页') {
                    newPage = Math.min(totalPages, currentPage + 1);
                } else {
                    newPage = parseInt(pageText);
                }
                
                if (newPage !== currentPage && onPageChange) {
                    onPageChange(newPage);
                }
            }
        });
    },

    // 显示文件选择对话框
    showFileDialog(options = {}) {
        const {
            multiple = false,
            accept = '',
            onSelect = null
        } = options;

        const input = Utils.dom.create('input');
        input.type = 'file';
        input.multiple = multiple;
        if (accept) {
            input.accept = accept;
        }

        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (onSelect && files.length > 0) {
                onSelect(files);
            }
        });

        input.click();
    },

    // 导出数据对话框
    showExportDialog(data, filename) {
        this.showModal({
            title: '导出数据',
            content: `
                <p>请选择导出格式：</p>
                <div class="export-options">
                    <button class="btn btn-primary" onclick="UI.exportData('json', '${filename}')">JSON格式</button>
                    <button class="btn btn-success" onclick="UI.exportData('csv', '${filename}')">CSV格式</button>
                    <button class="btn btn-info" onclick="UI.exportData('excel', '${filename}')">Excel格式</button>
                </div>
            `,
            showConfirmButton: false,
            size: 'small'
        });
    },

    // 导出数据
    exportData(format, filename) {
        // 这里可以实现实际的导出逻辑
        this.showSuccess(`正在导出${format.toUpperCase()}格式文件...`);
        this.hideModal();
    },

    // 设置主题
    setTheme(theme) {
        document.body.className = theme;
        localStorage.setItem('theme', theme);
    },

    // 获取当前主题
    getCurrentTheme() {
        return document.body.className || localStorage.getItem('theme') || 'light-theme';
    },

    // 应用保存的主题
    applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.setTheme(savedTheme);
        }
    },

    // 动态添加CSS
    addCSS(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return style;
    },

    // 动态移除CSS
    removeCSS(styleElement) {
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
        }
    },

    // 设置可访问性支持
    setupAccessibilitySupport() {
        // 为表单控件添加无障碍标签
        const formElements = document.querySelectorAll('input, select, textarea');
        formElements.forEach(element => {
            if (!element.getAttribute('aria-label') && !element.labels.length) {
                const label = element.getAttribute('title') || element.placeholder || element.name;
                if (label) {
                    element.setAttribute('aria-label', label);
                }
            }
        });

        // 为按钮添加键盘导航支持
        const buttons = document.querySelectorAll('button, .btn');
        buttons.forEach(button => {
            if (!button.getAttribute('role')) {
                button.setAttribute('role', 'button');
            }
            if (!button.getAttribute('tabindex')) {
                button.setAttribute('tabindex', '0');
            }
        });

        // 为模态框添加焦点管理
        if (this.currentModal) {
            const firstFocusable = this.currentModal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }

        console.log('UI可访问性支持已设置');
    }
};

// CSS样式（添加到页面）
const uiStyles = `
<style>
/* 通知样式 */
.notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    max-width: 350px;
}

.notification {
    margin-bottom: 10px;
    padding: 15px;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideInRight 0.3s ease-out;
}

.notification-success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
}

.notification-error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
}

.notification-warning {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    color: #856404;
}

.notification-info {
    background: #d1ecf1;
    border: 1px solid #bee5eb;
    color: #0c5460;
}

.notification-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.notification-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    margin-left: 10px;
}

/* 进度条样式 */
.progress {
    height: 20px;
    background: #e9ecef;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 10px;
}

.progress-bar {
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 10px;
    transition: width 0.3s ease;
}

.progress-text {
    font-size: 12px;
    color: #666;
    text-align: center;
}

/* 选项卡样式 */
.tab-list {
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;
    border-bottom: 1px solid #dee2e6;
}

.tab-link {
    display: block;
    padding: 10px 16px;
    color: #495057;
    text-decoration: none;
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: 4px 4px 0 0;
    margin-right: 2px;
    transition: all 0.2s;
}

.tab-link:hover {
    background: #e9ecef;
}

.tab-link.active {
    background: white;
    color: #667eea;
    border-color: #667eea;
}

.tab-content {
    padding: 20px;
    background: white;
    border: 1px solid #dee2e6;
    border-top: none;
    border-radius: 0 4px 4px 4px;
}

/* 下拉菜单样式 */
.dropdown {
    position: relative;
    display: inline-block;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    min-width: 160px;
    display: none;
}

.dropdown-menu.show {
    display: block;
    animation: fadeIn 0.2s ease-out;
}

/* 工具提示样式 */
.tooltip-popup {
    position: absolute;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    pointer-events: none;
}

/* 模态框样式增强 */
.modal-content.modal-small {
    max-width: 400px;
}

.modal-content.modal-large {
    max-width: 800px;
}

/* 表格样式增强 */
.table {
    font-size: 14px;
}

.table th {
    background: #f8f9fa;
    font-weight: 600;
    border-bottom: 2px solid #dee2e6;
}

.table tbody tr:hover {
    background: rgba(102, 126, 234, 0.05);
}

/* 动画 */
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes slideInDown {
    from {
        transform: translateY(-100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

/* 响应式调整 */
@media (max-width: 768px) {
    .notification-container {
        left: 10px;
        right: 10px;
        max-width: none;
    }
    
    .tab-list {
        flex-wrap: wrap;
    }
    
    .tab-link {
        flex: 1;
        text-align: center;
        min-width: 80px;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', uiStyles);

console.log('UI模块已加载');