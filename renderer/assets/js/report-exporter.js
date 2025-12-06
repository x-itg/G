/**
 * 报告导出模块
 * 提供检测报告的生成和导出功能
 */

window.ReportExporter = {
    templates: [],
    currentReport: null,

    /**
     * 初始化模块
     */
    init() {
        console.log('📄 初始化报告导出模块...');
        this.loadTemplates();
        this.bindEvents();
        console.log('✅ 报告导出模块初始化完成');
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 生成报告按钮
        const generateBtn = document.getElementById('generate-report-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.showGenerateDialog());
        }

        // 查看报告历史
        const historyBtn = document.getElementById('report-history-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.showReportHistory());
        }
    },

    /**
     * 加载报告模板
     */
    async loadTemplates() {
        try {
            const response = await fetch('/api/reports/templates', {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                }
            });

            const result = await response.json();

            if (result.success) {
                this.templates = result.data;
                console.log(`✅ 加载了 ${this.templates.length} 个报告模板`);
            } else {
                console.error('❌ 加载报告模板失败:', result.message);
            }
        } catch (error) {
            console.error('❌ 加载报告模板异常:', error);
        }
    },

    /**
     * 显示生成报告对话框
     */
    showGenerateDialog() {
        const now = new Date();
        const endDate = now.toISOString().split('T')[0];
        const startDate = new Date(now.getTime() - 7 * 24 * 3600000).toISOString().split('T')[0];

        const modal = `
            <div class="modal-overlay" id="generate-report-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>生成检测报告</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="report-generate-form">
                            <div class="form-group">
                                <label for="report-template">报告模板：</label>
                                <select id="report-template" required>
                                    <option value="">请选择模板</option>
                                    ${this.templates.map(t => `
                                        <option value="${t.type}">${t.name} - ${t.description}</option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="report-format">导出格式：</label>
                                <select id="report-format" required>
                                    <option value="pdf">PDF</option>
                                    <option value="xlsx">Excel</option>
                                    <option value="json">JSON</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="report-start-date">开始日期：</label>
                                <input type="date" id="report-start-date" value="${startDate}" required>
                            </div>

                            <div class="form-group">
                                <label for="report-end-date">结束日期：</label>
                                <input type="date" id="report-end-date" value="${endDate}" required>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="report-include-charts" checked>
                                    包含图表
                                </label>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="report-include-raw-data">
                                    包含原始数据
                                </label>
                            </div>

                            <div class="form-group">
                                <label for="report-title">报告标题：</label>
                                <input type="text" id="report-title" value="放射化学纯度检测报告">
                            </div>

                            <div class="form-group">
                                <label for="report-notes">备注：</label>
                                <textarea id="report-notes" rows="3" placeholder="输入报告备注..."></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary close-modal">取消</button>
                        <button class="btn-primary" id="confirm-generate-report">生成报告</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);

        // 绑定事件
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('generate-report-modal').remove();
            });
        });

        document.getElementById('confirm-generate-report').addEventListener('click', () => {
            this.generateReport();
        });
    },

    /**
     * 生成报告
     */
    async generateReport() {
        const form = document.getElementById('report-generate-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const reportData = {
            reportType: document.getElementById('report-template').value,
            format: document.getElementById('report-format').value,
            startDate: document.getElementById('report-start-date').value,
            endDate: document.getElementById('report-end-date').value,
            includeCharts: document.getElementById('report-include-charts').checked,
            includeRawData: document.getElementById('report-include-raw-data').checked,
            title: document.getElementById('report-title').value,
            notes: document.getElementById('report-notes').value
        };

        try {
            this.showNotification('正在生成报告...', 'info');

            const response = await fetch('/api/reports/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('sessionId') || ''
                },
                body: JSON.stringify(reportData)
            });

            const result = await response.json();

            if (result.success) {
                this.currentReport = result.data;
                document.getElementById('generate-report-modal').remove();
                this.showReportResult(result.data);
            } else {
                this.showNotification('生成报告失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('生成报告异常:', error);
            this.showNotification('生成报告异常: ' + error.message, 'error');
        }
    },

    /**
     * 显示报告结果
     */
    showReportResult(report) {
        const generatedAt = new Date(report.generatedAt).toLocaleString('zh-CN');

        const modal = `
            <div class="modal-overlay" id="report-result-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>报告生成成功</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="success-message">
                            <div class="success-icon">✓</div>
                            <p>报告已成功生成！</p>
                        </div>

                        <div class="report-info">
                            <h4>报告信息</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>报告ID：</label>
                                    <span>${report.id}</span>
                                </div>
                                <div class="info-item">
                                    <label>类型：</label>
                                    <span>${this.formatReportType(report.type)}</span>
                                </div>
                                <div class="info-item">
                                    <label>格式：</label>
                                    <span>${report.format.toUpperCase()}</span>
                                </div>
                                <div class="info-item">
                                    <label>生成时间：</label>
                                    <span>${generatedAt}</span>
                                </div>
                                <div class="info-item">
                                    <label>生成者：</label>
                                    <span>${report.generatedBy}</span>
                                </div>
                                <div class="info-item">
                                    <label>日期范围：</label>
                                    <span>${new Date(report.dateRange.start).toLocaleDateString('zh-CN')} - ${new Date(report.dateRange.end).toLocaleDateString('zh-CN')}</span>
                                </div>
                            </div>
                        </div>

                        ${report.summary ? `
                            <div class="report-summary">
                                <h4>统计摘要</h4>
                                <div class="summary-grid">
                                    <div class="summary-item">
                                        <div class="summary-value">${report.summary.totalScans}</div>
                                        <div class="summary-label">总扫描次数</div>
                                    </div>
                                    <div class="summary-item">
                                        <div class="summary-value">${report.summary.successfulScans}</div>
                                        <div class="summary-label">成功</div>
                                    </div>
                                    <div class="summary-item">
                                        <div class="summary-value">${report.summary.failedScans}</div>
                                        <div class="summary-label">失败</div>
                                    </div>
                                    <div class="summary-item">
                                        <div class="summary-value">${report.summary.averageDuration}s</div>
                                        <div class="summary-label">平均时长</div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary close-modal">关闭</button>
                        <button class="btn-primary" id="download-report-btn">下载报告</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);

        // 绑定事件
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('report-result-modal').remove();
            });
        });

        document.getElementById('download-report-btn').addEventListener('click', () => {
            this.downloadReport(report.id);
        });

        this.showNotification('报告生成成功', 'success');
    },

    /**
     * 下载报告
     */
    async downloadReport(reportId) {
        try {
            const response = await fetch(`/api/reports/download/${reportId}`, {
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
                a.download = `report-${reportId}-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showNotification('报告已下载', 'success');
            } else {
                this.showNotification('下载失败', 'error');
            }
        } catch (error) {
            console.error('下载报告异常:', error);
            this.showNotification('下载异常', 'error');
        }
    },

    /**
     * 显示报告历史
     */
    showReportHistory() {
        this.showNotification('报告历史功能开发中...', 'info');
    },

    /**
     * 格式化报告类型
     */
    formatReportType(type) {
        const types = {
            'detection': '检测报告',
            'standard': '标准报告',
            'summary': '摘要报告',
            'data': '数据报告'
        };
        return types[type] || type;
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
console.log('报告导出模块已加载');
