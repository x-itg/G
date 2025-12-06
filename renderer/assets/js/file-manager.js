// 文件管理系统模块
window.FileManager = {
    currentFiles: [],
    currentAnalysis: [],
    currentReports: [],
    selectedFile: null,

    // 初始化文件管理模块
    init() {
        try {
            console.log('🔄 初始化文件管理模块...');
            
            this.setupEventListeners();
            // 只在需要时加载文件列表，避免启动时API错误
            // this.loadFileList();
            
            console.log('✅ 文件管理模块初始化完成');
        } catch (error) {
            console.error('❌ 文件管理模块初始化失败:', error);
            throw error; // 重新抛出错误以便main.js可以捕获
        }
    },

    // 设置事件监听器
    setupEventListeners() {
        // 文件操作按钮
        const newFileBtn = document.getElementById('new-file-btn');
        const openFileBtn = document.getElementById('open-file-btn');
        const saveFileBtn = document.getElementById('save-file-btn');
        const exportBtn = document.getElementById('export-btn');

        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => this.showNewFileDialog());
        }

        if (openFileBtn) {
            openFileBtn.addEventListener('click', () => this.showOpenFileDialog());
        }

        if (saveFileBtn) {
            saveFileBtn.addEventListener('click', () => this.saveCurrentFile());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportDialog());
        }

        // 菜单事件 - 仅在Electron环境中可用
        if (window.electronAPI && window.electronAPI.menu && typeof window.electronAPI.menu.onFileManagement === 'function') {
            window.electronAPI.menu.onFileManagement(() => this.showFileManagement());
            window.electronAPI.menu.onNewFile(() => this.showNewFileDialog());
            window.electronAPI.menu.onOpenFile(() => this.showOpenFileDialog());
            window.electronAPI.menu.onSaveFile(() => this.saveCurrentFile());
        } else {
            console.log('FileManager: Electron API菜单不可用，跳过菜单事件绑定');
        }
    },

    // 显示文件管理界面
    showFileManagement() {
        if (!this.hasPermission('files', 'read')) {
            this.showAccessDeniedMessage();
            return;
        }

        UI.showModal({
            title: '文件管理',
            content: this.createFileManagementContent(),
            onConfirm: null,
            showConfirmButton: false,
            size: 'modal-xl'
        });

        // 加载文件列表
        this.loadFileList();
    },

    // 创建文件管理内容
    createFileManagementContent() {
        const container = Utils.dom.create('div', 'file-management-container');
        
        // 创建选项卡
        const tabContainer = Utils.dom.create('div', 'file-management-tabs');
        tabContainer.innerHTML = `
            <ul class="nav nav-tabs" id="fileManagementTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="files-tab" data-bs-toggle="tab" 
                            data-bs-target="#files-panel" type="button" role="tab">
                        <i class="fas fa-file-alt"></i> 文件列表
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="analysis-tab" data-bs-toggle="tab" 
                            data-bs-target="#analysis-panel" type="button" role="tab">
                        <i class="fas fa-chart-line"></i> 分析结果
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="reports-tab" data-bs-toggle="tab" 
                            data-bs-target="#reports-panel" type="button" role="tab">
                        <i class="fas fa-file-pdf"></i> 生成报告
                    </button>
                </li>
            </ul>
        `;
        
        // 创建选项卡内容
        const tabContent = Utils.dom.create('div', 'tab-content');
        tabContent.innerHTML = `
            <div class="tab-pane fade show active" id="files-panel" role="tabpanel">
                <div class="files-content"></div>
            </div>
            <div class="tab-pane fade" id="analysis-panel" role="tabpanel">
                <div class="analysis-content"></div>
            </div>
            <div class="tab-pane fade" id="reports-panel" role="tabpanel">
                <div class="reports-content"></div>
            </div>
        `;
        
        container.appendChild(tabContainer);
        container.appendChild(tabContent);
        
        return container;
    },

    // 加载文件列表
    async loadFileList() {
        const loadFileListWithLoader = window.LoadingIndicator.wrap(async () => {
            const response = await fetch('/api/files', {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': localStorage.getItem('sessionId')
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentFiles = result.files;
                this.renderFileList();
            } else {
                throw new Error(result.message || '获取文件列表失败');
            }
        }, {
            message: '正在加载文件列表',
            showProgress: true,
            enableCancel: false
        });

        try {
            await loadFileListWithLoader();
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'file_list_load_failed', {
                apiEndpoint: '/api/files',
                functionName: 'loadFileList'
            });
            
            console.error('加载文件列表失败:', errorInfo.message);
            UI.showError(errorInfo.userMessage);
        }
    },

    // 渲染文件列表
    renderFileList() {
        const container = document.querySelector('.files-content');
        if (!container) return;
        
        container.innerHTML = '';
        
        // 文件操作栏
        const actionBar = Utils.dom.create('div', 'file-action-bar d-flex justify-content-between mb-3');
        actionBar.innerHTML = `
            <div>
                <button class="btn btn-primary btn-sm" onclick="window.FileManager.showNewFileDialog()">
                    <i class="fas fa-plus"></i> 新建文件
                </button>
                <button class="btn btn-success btn-sm" onclick="window.FileManager.showImportDialog()">
                    <i class="fas fa-upload"></i> 导入数据
                </button>
            </div>
            <div>
                <button class="btn btn-outline-secondary btn-sm" onclick="window.FileManager.loadFileList()">
                    <i class="fas fa-sync-alt"></i> 刷新
                </button>
            </div>
        `;
        container.appendChild(actionBar);
        
        // 文件列表
        if (!this.currentFiles || this.currentFiles.length === 0) {
            container.appendChild(Utils.dom.create('div', 'text-center text-muted p-4', '暂无文件数据'));
            return;
        }
        
        const table = Utils.dom.create('table', 'table table-striped table-hover');
        table.innerHTML = `
            <thead class="table-dark">
                <tr>
                    <th>文件名</th>
                    <th>类型</th>
                    <th>大小</th>
                    <th>创建者</th>
                    <th>创建时间</th>
                    <th>状态</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        this.currentFiles.forEach(file => {
            const tr = Utils.dom.create('tr');
            tr.innerHTML = `
                <td>${file.name}</td>
                <td><span class="badge bg-info">${file.file_type}</span></td>
                <td>${Utils.formatNumber(file.file_size)} bytes</td>
                <td>${file.username}</td>
                <td>${Utils.formatDateTime(file.created_at)}</td>
                <td><span class="badge bg-${file.status === 'active' ? 'success' : 'secondary'}">${file.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="window.FileManager.openFile('${file.id}')" title="打开">
                        <i class="fas fa-folder-open"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="window.FileManager.exportFile('${file.id}')" title="导出">
                        <i class="fas fa-download"></i>
                    </button>
                    ${this.hasPermission('files', 'delete') && file.user_id !== Auth.currentUser.id ? 
                        `<button class="btn btn-sm btn-outline-danger" onclick="window.FileManager.deleteFile('${file.id}')" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>` : ''
                    }
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        container.appendChild(table);
    },

    // 显示新建文件对话框
    showNewFileDialog() {
        UI.showModal({
            title: '新建测量文件',
            content: this.createNewFileForm(),
            onConfirm: () => this.handleCreateFile(),
            confirmText: '创建文件',
            showConfirmButton: true
        });
    },

    // 创建新建文件表单
    createNewFileForm() {
        const form = Utils.dom.create('form', 'new-file-form');
        form.innerHTML = `
            <div class="form-group">
                <label for="new-file-name">文件名 <span class="text-danger">*</span></label>
                <input type="text" id="new-file-name" class="form-control" required 
                       placeholder="输入文件名" maxlength="100">
            </div>
            <div class="form-group">
                <label for="new-file-type">文件类型 <span class="text-danger">*</span></label>
                <select id="new-file-type" class="form-control" required>
                    <option value="">请选择文件类型</option>
                    <option value="measurement">测量数据</option>
                    <option value="calibration">校准数据</option>
                    <option value="background">背景测量</option>
                    <option value="reference">参考样品</option>
                    <option value="other">其他</option>
                </select>
            </div>
            <div class="form-group">
                <label for="new-file-description">描述</label>
                <textarea id="new-file-description" class="form-control" rows="3" 
                         placeholder="输入文件描述（可选）"></textarea>
            </div>
            <div class="form-group">
                <label>文件数据</label>
                <div class="border rounded p-3 text-center">
                    <i class="fas fa-file-upload fa-3x text-muted mb-2"></i>
                    <p class="text-muted">可以上传文件或手动输入数据</p>
                    <input type="file" id="new-file-upload" class="form-control" accept=".json,.csv,.txt">
                    <small class="form-text text-muted">支持 JSON、CSV、TXT 格式文件</small>
                </div>
            </div>
        `;
        return form;
    },

    // 处理创建文件
    async handleCreateFile() {
        const name = document.getElementById('new-file-name').value.trim();
        const fileType = document.getElementById('new-file-type').value;
        const description = document.getElementById('new-file-description').value.trim();
        const fileInput = document.getElementById('new-file-upload');
        
        // 验证输入
        if (!name) {
            UI.showError('请输入文件名');
            return false;
        }
        
        if (!fileType) {
            UI.showError('请选择文件类型');
            return false;
        }

        const createFileWithLoader = window.LoadingIndicator.wrap(async () => {
            let fileData = null;
            let filePath = `local://${name}`;
            let fileSize = 0;
            let mimeType = 'application/octet-stream';
            
            // 处理文件上传
            if (fileInput.files && fileInput.files[0]) {
                window.LoadingIndicator.updateMessage(this.currentLoaderId, '正在读取文件内容...');
                const file = fileInput.files[0];
                fileSize = file.size;
                mimeType = file.type;
                filePath = `upload://${file.name}`;
                
                // 读取文件内容
                const content = await this.readFileContent(file);
                fileData = content;
            }

            window.LoadingIndicator.updateMessage(this.currentLoaderId, '正在保存文件...');
            
            const response = await fetch('/api/files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': localStorage.getItem('sessionId')
                },
                body: JSON.stringify({
                    name,
                    description,
                    file_type: fileType,
                    file_path: filePath,
                    file_size: fileSize,
                    mime_type: mimeType,
                    metadata: fileData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                window.LoadingIndicator.updateMessage(this.currentLoaderId, '文件创建完成');
                setTimeout(() => {
                    UI.showSuccess('文件创建成功');
                    this.loadFileList(); // 重新加载文件列表
                }, 500);
            } else {
                throw new Error(result.message || '创建文件失败');
            }
        }, {
            title: `创建文件 - ${name}`,
            message: '准备创建文件...',
            showProgress: true,
            enableCancel: true,
            onCancel: () => {
                Auth.log(`用户取消了文件 "${name}" 的创建操作`, 'warning');
            }
        });

        try {
            await createFileWithLoader();
            return true;
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'file_create_failed', {
                fileName: name,
                fileType: fileType,
                functionName: 'handleCreateFile'
            });
            
            console.error('创建文件失败:', errorInfo.message);
            UI.showError(errorInfo.userMessage);
            return false;
        }
    },

    // 读取文件内容
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    
                    // 尝试解析为JSON
                    if (file.type === 'application/json' || file.name.endsWith('.json')) {
                        resolve(JSON.parse(content));
                    } else {
                        // 其他格式返回原始文本
                        resolve({ raw_content: content, format: 'text' });
                    }
                } catch (error) {
                    reject(new Error('文件格式解析失败'));
                }
            };
            
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    },

    // 打开文件
    async openFile(fileId) {
        const file = this.currentFiles.find(f => f.id === fileId);
        if (!file) {
            UI.showError('文件不存在');
            return;
        }

        const openFileWithLoader = window.LoadingIndicator.wrap(async () => {
            window.LoadingIndicator.updateMessage(this.currentLoaderId, '正在加载文件数据...');
            
            // 加载分析结果
            await this.loadAnalysisForFile(fileId);
            
            this.selectedFile = file;
            
            // 切换到分析选项卡
            const analysisTab = document.getElementById('analysis-tab');
            if (analysisTab) {
                analysisTab.click();
            }

            window.LoadingIndicator.updateMessage(this.currentLoaderId, '文件打开完成');
            
            setTimeout(() => {
                UI.showSuccess(`已打开文件: ${file.name}`);
            }, 500);
            
        }, {
            title: `打开文件 - ${file.name}`,
            message: '准备打开文件...',
            showProgress: true,
            enableCancel: true,
            onCancel: () => {
                Auth.log(`用户取消了文件 "${file.name}" 的打开操作`, 'warning');
            }
        });

        try {
            await openFileWithLoader();
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'file_open_failed', {
                fileId: fileId,
                fileName: file?.name,
                functionName: 'openFile'
            });
            
            console.error('打开文件失败:', errorInfo.message);
            UI.showError(errorInfo.userMessage);
        }
    },

    // 为文件加载分析结果
    async loadAnalysisForFile(fileId) {
        try {
            const response = await fetch(`/api/analysis?measurement_file_id=${fileId}`, {
                headers: {
                    'X-Session-ID': localStorage.getItem('sessionId')
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentAnalysis = result.analysis;
                this.renderAnalysisList();
            }
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'analysis_load_failed', {
                measurementFileId: fileId,
                functionName: 'loadAnalysisForFile'
            });
            
            console.error('加载分析结果失败:', errorInfo.message);
        }
    },

    // 渲染分析结果列表
    renderAnalysisList() {
        const container = document.querySelector('.analysis-content');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!this.currentAnalysis || this.currentAnalysis.length === 0) {
            container.appendChild(Utils.dom.create('div', 'text-center text-muted p-4', '暂无分析结果'));
            return;
        }
        
        const table = Utils.dom.create('table', 'table table-striped table-hover');
        table.innerHTML = `
            <thead class="table-dark">
                <tr>
                    <th>分析名称</th>
                    <th>类型</th>
                    <th>创建者</th>
                    <th>创建时间</th>
                    <th>状态</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        this.currentAnalysis.forEach(analysis => {
            const tr = Utils.dom.create('tr');
            tr.innerHTML = `
                <td>${analysis.name}</td>
                <td><span class="badge bg-info">${analysis.analysis_type}</span></td>
                <td>${analysis.username}</td>
                <td>${Utils.formatDateTime(analysis.created_at)}</td>
                <td><span class="badge bg-${analysis.status === 'completed' ? 'success' : 'warning'}">${analysis.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="window.FileManager.viewAnalysis('${analysis.id}')" title="查看">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="window.FileManager.generateReport('${analysis.id}')" title="生成报告">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="window.FileManager.exportAnalysis('${analysis.id}')" title="导出">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        container.appendChild(table);
    },

    // 生成报告
    async generateReport(analysisId) {
        const generateReportWithLoader = window.LoadingIndicator.wrap(async () => {
            window.LoadingIndicator.updateMessage(this.currentLoaderId, '正在生成报告...');
            
            const response = await fetch('/api/reports/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': localStorage.getItem('sessionId')
                },
                body: JSON.stringify({
                    analysis_result_id: analysisId,
                    parameters: {}
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                window.LoadingIndicator.updateMessage(this.currentLoaderId, '报告生成完成');
                
                // 显示报告内容
                this.showReportContent(result.content);
                
                // 重新加载报告列表
                await this.loadReportList();
            } else {
                throw new Error(result.message || '生成报告失败');
            }
        }, {
            title: '生成分析报告',
            message: '准备生成报告...',
            showProgress: true,
            enableCancel: true,
            onCancel: () => {
                Auth.log('用户取消了报告生成操作', 'warning');
            }
        });

        try {
            await generateReportWithLoader();
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'report_generate_failed', {
                analysisId: analysisId,
                functionName: 'generateReport'
            });
            
            console.error('生成报告失败:', errorInfo.message);
            UI.showError(errorInfo.userMessage);
        }
    },

    // 显示报告内容
    showReportContent(content) {
        const modal = UI.showModal({
            title: content.title || '分析报告',
            content: this.createReportContent(content),
            onConfirm: null,
            showConfirmButton: false,
            size: 'modal-xl'
        });
    },

    // 创建报告内容
    createReportContent(content) {
        const container = Utils.dom.create('div', 'report-content');
        
        // 报告头部
        const header = Utils.dom.create('div', 'report-header text-center mb-4');
        header.innerHTML = `
            <h2>${content.title}</h2>
            <p class="text-muted">${content.subtitle}</p>
            <p><strong>分析时间:</strong> ${Utils.formatDateTime(content.timestamp)}</p>
            <p><strong>分析员:</strong> ${content.analyst}</p>
        `;
        
        // 分析信息
        const analysisSection = Utils.dom.create('div', 'report-section mb-4');
        analysisSection.innerHTML = `
            <h4>分析信息</h4>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>名称:</strong> ${content.analysis_info.name}</p>
                    <p><strong>类型:</strong> ${content.analysis_info.type}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>状态:</strong> ${content.analysis_info.status}</p>
                    <p><strong>描述:</strong> ${content.analysis_info.description || '无'}</p>
                </div>
            </div>
        `;
        
        // 数据摘要
        const summarySection = Utils.dom.create('div', 'report-section mb-4');
        summarySection.innerHTML = `
            <h4>数据摘要</h4>
            <div class="row">
                <div class="col-md-3 text-center">
                    <div class="metric-card">
                        <h5>${content.data_summary.total_points}</h5>
                        <small>数据点</small>
                    </div>
                </div>
                <div class="col-md-3 text-center">
                    <div class="metric-card">
                        <h5>${content.data_summary.peak_count}</h5>
                        <small>检测峰位</small>
                    </div>
                </div>
                <div class="col-md-3 text-center">
                    <div class="metric-card">
                        <h5>${content.data_summary.integration_regions}</h5>
                        <small>积分区域</small>
                    </div>
                </div>
                <div class="col-md-3 text-center">
                    <div class="metric-card">
                        <h5>${content.results.peaks.length}</h5>
                        <small>分析结果</small>
                    </div>
                </div>
            </div>
        `;
        
        // 结论和建议
        const conclusionsSection = Utils.dom.create('div', 'report-section mb-4');
        conclusionsSection.innerHTML = `
            <h4>结论</h4>
            <ul>
                ${content.conclusions.map(conclusion => `<li>${conclusion}</li>`).join('')}
            </ul>
            <h4>建议</h4>
            <ul>
                ${content.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        `;
        
        // 操作按钮
        const actions = Utils.dom.create('div', 'report-actions text-center mt-4');
        actions.innerHTML = `
            <button class="btn btn-primary me-2" onclick="window.FileManager.exportReport('current', 'pdf')">
                <i class="fas fa-file-pdf"></i> 导出PDF
            </button>
            <button class="btn btn-success me-2" onclick="window.FileManager.exportReport('current', 'html')">
                <i class="fas fa-file-code"></i> 导出HTML
            </button>
            <button class="btn btn-info" onclick="window.FileManager.printReport()">
                <i class="fas fa-print"></i> 打印报告
            </button>
        `;
        
        container.appendChild(header);
        container.appendChild(analysisSection);
        container.appendChild(summarySection);
        container.appendChild(conclusionsSection);
        container.appendChild(actions);
        
        return container;
    },

    // 导出报告
    exportReport(reportId, format) {
        // 这里可以实现实际的导出逻辑
        UI.showSuccess(`正在导出${format.toUpperCase()}格式报告...`);
    },

    // 打印报告
    printReport() {
        window.print();
    },

    // 检查权限
    hasPermission(resource, action) {
        const userRole = Auth.currentUser?.role;
        const permissions = Auth.getRolePermissions(userRole);
        return permissions[resource]?.includes(action) || false;
    },

    // 显示权限不足消息
    showAccessDeniedMessage() {
        UI.showError('权限不足，无法执行此操作');
    }
};

// 扩展Array原型以支持文件下载
if (!Array.prototype.toCSV) {
    Array.prototype.toCSV = function(headers = []) {
        if (this.length === 0) return '';
        
        const csvRows = [];
        
        // 添加标题行
        if (headers.length > 0) {
            csvRows.push(headers.join(','));
        }
        
        // 添加数据行
        this.forEach(row => {
            const values = Array.isArray(row) ? row : Object.values(row);
            csvRows.push(values.map(val => 
                typeof val === 'string' && val.includes(',') ? `"${val}"` : val
            ).join(','));
        });
        
        return csvRows.join('\n');
    };
}