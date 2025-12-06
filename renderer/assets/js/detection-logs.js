/**
 * 检测日志管理模块
 * 提供检测日志的查询、查看和管理功能
 */

window.DetectionLogs = {
    logs: [],
    currentPage: 1,
    pageSize: 20,
    totalLogs: 0,
    filters: {
        startDate: null,
        endDate: null,
        deviceType: 'all',
        status: 'all'
    },

    /**
     * 初始化模块
     */
    init() {
        console.log('🔍 初始化检测日志模块...');
        this.bindEvents();
        this.loadLogs();
        console.log('✅ 检测日志模块初始化完成');
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 刷新按钮
        const refreshBtn = document.getElementById('refresh-logs-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadLogs());
        }

        // 筛选按钮
        const filterBtn = document.getElementById('filter-logs-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => this.applyFilters());
        }

        // 导出按钮
        const exportBtn = document.getElementById('export-logs-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportLogs());
        }

        // 分页按钮
        const prevBtn = document.getElementById('logs-prev-page');
        const nextBtn = document.getElementById('logs-next-page');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousPage());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPage());
        }
    },

    /**
     * 加载检测日志
     */
    async loadLogs() {
        try {
            const params = new URLSearchParams({
                limit: this.pageSize,
                offset: (this.currentPage - 1) * this.pageSize
            });

            if (this.filters.startDate) {
                params.append('startDate', this.filters.startDate);
            }
            if (this.filters.endDate) {
                params.append('endDate', this.filters.endDate);
            }

            const response = await fetch(`/api/detection/logs?${params}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                }
            });

            const result = await response.json();

            if (result.success) {
                this.logs = result.data;
                this.totalLogs = result.total;
                this.renderLogs();
                this.updatePagination();
                console.log(`✅ 加载了 ${this.logs.length} 条检测日志`);
            } else {
                console.error('❌ 加载检测日志失败:', result.message);
                this.showNotification('加载日志失败', 'error');
            }
        } catch (error) {
            console.error('❌ 加载检测日志异常:', error);
            this.showNotification('加载日志异常: ' + error.message, 'error');
        }
    },

    /**
     * 渲染日志列表
     */
    renderLogs() {
        const container = document.getElementById('logs-container');
        if (!container) {
            console.warn('日志容器未找到');
            return;
        }

        if (this.logs.length === 0) {
            container.innerHTML = '<div class="no-data">暂无检测日志</div>';
            return;
        }

        const html = `
            <table class="logs-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>时间</th>
                        <th>类型</th>
                        <th>设备</th>
                        <th>状态</th>
                        <th>时长(秒)</th>
                        <th>峰值计数</th>
                        <th>平均速率</th>
                        <th>操作员</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.logs.map(log => this.renderLogRow(log)).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
        this.bindLogActions();
    },

    /**
     * 渲染单条日志行
     */
    renderLogRow(log) {
        const statusClass = log.status === 'completed' ? 'success' : 
                           log.status === 'failed' ? 'error' : 'warning';
        
        const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');

        return `
            <tr data-log-id="${log.id}">
                <td>${log.id}</td>
                <td>${timestamp}</td>
                <td>${this.formatType(log.type)}</td>
                <td>${log.device}</td>
                <td><span class="status-badge ${statusClass}">${this.formatStatus(log.status)}</span></td>
                <td>${log.duration}</td>
                <td>${log.peakCount}</td>
                <td>${log.averageRate}</td>
                <td>${log.operator}</td>
                <td>
                    <button class="btn-small view-log-detail" data-id="${log.id}">查看</button>
                    <button class="btn-small download-log" data-id="${log.id}">下载</button>
                </td>
            </tr>
        `;
    },

    /**
     * 绑定日志操作事件
     */
    bindLogActions() {
        // 查看详情
        document.querySelectorAll('.view-log-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const logId = e.target.dataset.id;
                this.viewLogDetail(logId);
            });
        });

        // 下载日志
        document.querySelectorAll('.download-log').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const logId = e.target.dataset.id;
                this.downloadLog(logId);
            });
        });
    },

    /**
     * 查看日志详情
     */
    async viewLogDetail(logId) {
        try {
            const response = await fetch(`/api/detection/logs/${logId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showLogDetailModal(result.data);
            } else {
                this.showNotification('加载日志详情失败', 'error');
            }
        } catch (error) {
            console.error('加载日志详情异常:', error);
            this.showNotification('加载日志详情异常', 'error');
        }
    },

    /**
     * 显示日志详情弹窗
     */
    showLogDetailModal(log) {
        const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
        
        const modal = `
            <div class="modal-overlay" id="log-detail-modal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>检测日志详情 #${log.id}</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>时间：</label>
                                <span>${timestamp}</span>
                            </div>
                            <div class="detail-item">
                                <label>类型：</label>
                                <span>${this.formatType(log.type)}</span>
                            </div>
                            <div class="detail-item">
                                <label>设备：</label>
                                <span>${log.device}</span>
                            </div>
                            <div class="detail-item">
                                <label>状态：</label>
                                <span>${this.formatStatus(log.status)}</span>
                            </div>
                            <div class="detail-item">
                                <label>时长：</label>
                                <span>${log.duration} 秒</span>
                            </div>
                            <div class="detail-item">
                                <label>峰值计数：</label>
                                <span>${log.peakCount}</span>
                            </div>
                            <div class="detail-item">
                                <label>平均速率：</label>
                                <span>${log.averageRate} cps</span>
                            </div>
                            <div class="detail-item">
                                <label>操作员：</label>
                                <span>${log.operator}</span>
                            </div>
                            <div class="detail-item full-width">
                                <label>备注：</label>
                                <span>${log.notes || '无'}</span>
                            </div>
                        </div>
                        ${log.rawData ? `
                            <div class="raw-data-section">
                                <h4>原始数据 (${log.rawData.length} 个数据点)</h4>
                                <div class="raw-data-preview">
                                    ${this.renderRawDataPreview(log.rawData)}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary close-modal">关闭</button>
                        <button class="btn-primary" onclick="DetectionLogs.downloadLog(${log.id})">下载数据</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);

        // 绑定关闭事件
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('log-detail-modal').remove();
            });
        });
    },

    /**
     * 渲染原始数据预览
     */
    renderRawDataPreview(rawData) {
        const preview = rawData.slice(0, 10);
        return `
            <table class="raw-data-table">
                <thead>
                    <tr>
                        <th>位置</th>
                        <th>计数</th>
                    </tr>
                </thead>
                <tbody>
                    ${preview.map(point => `
                        <tr>
                            <td>${point.position}</td>
                            <td>${point.count}</td>
                        </tr>
                    `).join('')}
                    ${rawData.length > 10 ? `
                        <tr>
                            <td colspan="2" class="text-center">...还有 ${rawData.length - 10} 个数据点</td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>
        `;
    },

    /**
     * 下载日志
     */
    async downloadLog(logId) {
        try {
            const response = await fetch(`/api/detection/logs/${logId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                }
            });

            const result = await response.json();

            if (result.success) {
                const dataStr = JSON.stringify(result.data, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `detection-log-${logId}-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showNotification('日志已下载', 'success');
            } else {
                this.showNotification('下载失败', 'error');
            }
        } catch (error) {
            console.error('下载日志异常:', error);
            this.showNotification('下载异常', 'error');
        }
    },

    /**
     * 导出日志
     */
    async exportLogs() {
        try {
            const params = new URLSearchParams({
                limit: 1000, // 导出更多
                offset: 0
            });

            const response = await fetch(`/api/detection/logs?${params}`);
            const result = await response.json();

            if (result.success) {
                const dataStr = JSON.stringify(result.data, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `detection-logs-export-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showNotification(`已导出 ${result.data.length} 条日志`, 'success');
            }
        } catch (error) {
            console.error('导出日志异常:', error);
            this.showNotification('导出失败', 'error');
        }
    },

    /**
     * 应用筛选
     */
    applyFilters() {
        const startDateInput = document.getElementById('log-start-date');
        const endDateInput = document.getElementById('log-end-date');
        const deviceSelect = document.getElementById('log-device-filter');
        const statusSelect = document.getElementById('log-status-filter');

        if (startDateInput) this.filters.startDate = startDateInput.value;
        if (endDateInput) this.filters.endDate = endDateInput.value;
        if (deviceSelect) this.filters.deviceType = deviceSelect.value;
        if (statusSelect) this.filters.status = statusSelect.value;

        this.currentPage = 1;
        this.loadLogs();
    },

    /**
     * 更新分页
     */
    updatePagination() {
        const totalPages = Math.ceil(this.totalLogs / this.pageSize);
        const pageInfo = document.getElementById('logs-page-info');
        
        if (pageInfo) {
            pageInfo.textContent = `第 ${this.currentPage} / ${totalPages} 页 (共 ${this.totalLogs} 条)`;
        }

        const prevBtn = document.getElementById('logs-prev-page');
        const nextBtn = document.getElementById('logs-next-page');

        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
    },

    /**
     * 上一页
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadLogs();
        }
    },

    /**
     * 下一页
     */
    nextPage() {
        const totalPages = Math.ceil(this.totalLogs / this.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.loadLogs();
        }
    },

    /**
     * 格式化类型
     */
    formatType(type) {
        const types = {
            'scan': '扫描检测',
            'calibration': '校准',
            'test': '测试',
            'maintenance': '维护'
        };
        return types[type] || type;
    },

    /**
     * 格式化状态
     */
    formatStatus(status) {
        const statuses = {
            'completed': '已完成',
            'failed': '失败',
            'running': '进行中',
            'cancelled': '已取消'
        };
        return statuses[status] || status;
    },

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        if (window.UI && window.UI.showNotification) {
            window.UI.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
};

// 添加到模块列表
console.log('检测日志管理模块已加载');
