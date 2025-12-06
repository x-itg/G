/**
 * CFR 21 Part 11 验证功能前端模块
 * 实现数据完整性验证、电子签名验证、审计跟踪等功能
 */
window.ValidationManager = {
    init: async function() {
        try {
            console.log('验证管理器初始化中...');
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 加载验证历史（不阻塞初始化）
            this.loadValidationHistory().catch(error => {
                console.warn('验证历史加载失败，但不影响初始化完成:', error);
            });
            
            console.log('验证管理器初始化完成');
        } catch (error) {
            console.error('验证管理器初始化失败:', error);
            // 即使初始化失败，也要输出完成信息以避免阻塞后续模块
            console.log('验证管理器初始化完成（出错状态）');
        }
    },

    // ==================== 数据完整性验证 ====================

    /**
     * 验证数据完整性
     * @param {Object} data - 要验证的数据
     * @param {string} expectedHash - 期望的哈希值
     * @param {string} algorithm - 哈希算法
     * @returns {Promise<Object>} 验证结果
     */
    async validateDataIntegrity(data, expectedHash, algorithm = 'sha256') {
        try {
            const response = await fetch('/api/validation/data-integrity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, expectedHash, algorithm })
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || '数据完整性验证失败');
            }
            
            return result.result;
        } catch (error) {
            console.error('数据完整性验证错误:', error);
            throw error;
        }
    },

    /**
     * 显示数据完整性验证对话框
     */
    showDataIntegrityDialog() {
        const dialog = this.createDialog('数据完整性验证', `
            <div class="form-group">
                <label for="validation-data">数据内容 (JSON):</label>
                <textarea id="validation-data" class="form-control" rows="6" 
                          placeholder='{"sample": "data", "timestamp": "2024-01-01"}'></textarea>
            </div>
            <div class="form-group">
                <label for="expected-hash">期望哈希值:</label>
                <input type="text" id="expected-hash" class="form-control" 
                       placeholder="输入SHA-256哈希值">
            </div>
            <div class="form-group">
                <label for="hash-algorithm">哈希算法:</label>
                <select id="hash-algorithm" class="form-control">
                    <option value="sha256">SHA-256</option>
                    <option value="sha512">SHA-512</option>
                    <option value="md5">MD5</option>
                </select>
            </div>
            <div id="validation-result" style="margin-top: 10px;"></div>
        `);
        
        dialog.querySelector('button[onclick="ValidationManager.validateDataIntegrityFromDialog()"]').onclick = () => {
            this.validateDataIntegrityFromDialog();
        };
    },

    /**
     * 从对话框执行数据完整性验证
     */
    async validateDataIntegrityFromDialog() {
        const data = document.getElementById('validation-data').value;
        const expectedHash = document.getElementById('expected-hash').value;
        const algorithm = document.getElementById('hash-algorithm').value;
        const resultDiv = document.getElementById('validation-result');
        
        try {
            // 解析数据
            let parsedData;
            try {
                parsedData = JSON.parse(data);
            } catch (e) {
                throw new Error('数据必须是有效的JSON格式');
            }
            
            if (!expectedHash) {
                throw new Error('请输入期望的哈希值');
            }
            
            // 执行验证
            const result = await this.validateDataIntegrity(parsedData, expectedHash, algorithm);
            
            // 显示结果
            resultDiv.innerHTML = `
                <div class="alert ${result.valid ? 'alert-success' : 'alert-danger'}">
                    <h5>验证结果:</h5>
                    <p><strong>状态:</strong> ${result.valid ? '通过' : '失败'}</p>
                    <p><strong>算法:</strong> ${result.algorithm}</p>
                    <p><strong>期望哈希:</strong> <code>${result.expectedHash}</code></p>
                    <p><strong>实际哈希:</strong> <code>${result.actualHash}</code></p>
                    <p><strong>时间戳:</strong> ${result.timestamp}</p>
                </div>
            `;
            
            // 更新验证历史
            await this.loadValidationHistory();
            
        } catch (error) {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h5>验证失败:</h5>
                    <p>${error.message}</p>
                </div>
            `;
        }
    },

    // ==================== 电子签名功能 ====================

    /**
     * 生成电子签名
     * @param {Object} document - 文档信息
     * @param {Object} signer - 签名者信息
     * @param {string} action - 签名动作
     * @returns {Promise<Object>} 签名结果
     */
    async generateElectronicSignature(document, signer, action = 'approved') {
        try {
            const response = await fetch('/api/validation/generate-signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document, signer, action })
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || '电子签名生成失败');
            }
            
            return result.signature;
        } catch (error) {
            console.error('电子签名生成错误:', error);
            throw error;
        }
    },

    /**
     * 验证电子签名
     * @param {string} signatureId - 签名ID
     * @returns {Promise<Object>} 验证结果
     */
    async validateElectronicSignature(signatureId) {
        try {
            const response = await fetch('/api/validation/verify-signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signatureId })
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || '电子签名验证失败');
            }
            
            return result.result;
        } catch (error) {
            console.error('电子签名验证错误:', error);
            throw error;
        }
    },

    /**
     * 显示电子签名对话框
     */
    showElectronicSignatureDialog() {
        const dialog = this.createDialog('电子签名', `
            <div class="form-group">
                <label for="sig-document-type">文档类型:</label>
                <input type="text" id="sig-document-type" class="form-control" 
                       placeholder="例如: analysis_report" value="analysis_report">
            </div>
            <div class="form-group">
                <label for="sig-document-id">文档ID:</label>
                <input type="text" id="sig-document-id" class="form-control" 
                       placeholder="例如: DOC-2024-001" value="DOC-2024-001">
            </div>
            <div class="form-group">
                <label for="sig-action">签名动作:</label>
                <select id="sig-action" class="form-control">
                    <option value="approved">批准</option>
                    <option value="rejected">拒绝</option>
                    <option value="modified">修改</option>
                    <option value="reviewed">审核</option>
                </select>
            </div>
            <div class="form-group">
                <label for="sig-username">签名者用户名:</label>
                <input type="text" id="sig-username" class="form-control" 
                       placeholder="当前用户" value="admin" readonly>
            </div>
            <div id="signature-result" style="margin-top: 10px;"></div>
        `);
        
        dialog.querySelector('button[onclick="ValidationManager.generateSignatureFromDialog()"]').onclick = () => {
            this.generateSignatureFromDialog();
        };
    },

    /**
     * 从对话框生成电子签名
     */
    async generateSignatureFromDialog() {
        const documentType = document.getElementById('sig-document-type').value;
        const documentId = document.getElementById('sig-document-id').value;
        const action = document.getElementById('sig-action').value;
        const username = document.getElementById('sig-username').value;
        const resultDiv = document.getElementById('signature-result');
        
        try {
            if (!documentType || !documentId) {
                throw new Error('请填写文档类型和ID');
            }
            
            // 获取当前用户信息 (这里简化处理)
            const document = { type: documentType, id: documentId };
            const signer = { userId: 1, username: username, role: 'admin' };
            
            // 生成签名
            const signature = await this.generateElectronicSignature(document, signer, action);
            
            // 显示结果
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <h5>签名生成成功:</h5>
                    <p><strong>签名ID:</strong> <code>${signature.id}</code></p>
                    <p><strong>文档类型:</strong> ${signature.document_type}</p>
                    <p><strong>文档ID:</strong> ${signature.document_id}</p>
                    <p><strong>签名动作:</strong> ${signature.action}</p>
                    <p><strong>签名者:</strong> ${signature.username}</p>
                    <p><strong>时间戳:</strong> ${signature.timestamp}</p>
                    <p><strong>签名哈希:</strong> <code>${signature.signature_hash}</code></p>
                </div>
            `;
            
            // 验证刚生成的签名
            await this.validateSignature(signature.id);
            
        } catch (error) {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h5>签名生成失败:</h5>
                    <p>${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * 验证指定签名的有效性
     * @param {string} signatureId - 签名ID
     */
    async validateSignature(signatureId) {
        try {
            const result = await this.validateElectronicSignature(signatureId);
            
            const alertClass = result.valid ? 'alert-success' : 'alert-danger';
            const status = result.valid ? '有效' : '无效';
            
            // 创建验证结果显示
            const validationDiv = document.createElement('div');
            validationDiv.className = `alert ${alertClass}`;
            validationDiv.innerHTML = `
                <h6>签名验证结果:</h6>
                <p><strong>状态:</strong> ${status}</p>
                <p><strong>消息:</strong> ${result.message}</p>
                <p><strong>时间:</strong> ${result.timestamp}</p>
            `;
            
            // 添加到结果区域
            const resultDiv = document.getElementById('signature-result');
            resultDiv.appendChild(validationDiv);
            
        } catch (error) {
            console.error('签名验证错误:', error);
        }
    },

    // ==================== 文件完整性验证 ====================

    /**
     * 验证文件完整性
     * @param {string} filePath - 文件路径
     * @param {string} expectedChecksum - 期望的校验和
     * @returns {Promise<Object>} 验证结果
     */
    async validateFileIntegrity(filePath, expectedChecksum) {
        try {
            const response = await fetch('/api/validation/file-integrity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath, expectedChecksum })
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || '文件完整性验证失败');
            }
            
            return result.result;
        } catch (error) {
            console.error('文件完整性验证错误:', error);
            throw error;
        }
    },

    /**
     * 显示文件完整性验证对话框
     */
    showFileIntegrityDialog() {
        const dialog = this.createDialog('文件完整性验证', `
            <div class="form-group">
                <label for="file-path">文件路径:</label>
                <input type="text" id="file-path" class="form-control" 
                       placeholder="例如: C:/data/measurement.csv">
            </div>
            <div class="form-group">
                <label for="expected-checksum">期望校验和 (SHA-256):</label>
                <textarea id="expected-checksum" class="form-control" rows="3" 
                          placeholder="输入文件的SHA-256校验和"></textarea>
            </div>
            <div id="file-validation-result" style="margin-top: 10px;"></div>
        `);
        
        dialog.querySelector('button[onclick="ValidationManager.validateFileIntegrityFromDialog()"]').onclick = () => {
            this.validateFileIntegrityFromDialog();
        };
    },

    /**
     * 从对话框执行文件完整性验证
     */
    async validateFileIntegrityFromDialog() {
        const filePath = document.getElementById('file-path').value;
        const expectedChecksum = document.getElementById('expected-checksum').value.trim();
        const resultDiv = document.getElementById('file-validation-result');
        
        try {
            if (!filePath || !expectedChecksum) {
                throw new Error('请输入文件路径和期望的校验和');
            }
            
            // 执行验证
            const result = await this.validateFileIntegrity(filePath, expectedChecksum);
            
            // 显示结果
            const alertClass = result.valid ? 'alert-success' : 'alert-danger';
            resultDiv.innerHTML = `
                <div class="alert ${alertClass}">
                    <h5>文件完整性验证结果:</h5>
                    <p><strong>状态:</strong> ${result.valid ? '通过' : '失败'}</p>
                    <p><strong>文件路径:</strong> ${result.filePath}</p>
                    <p><strong>文件大小:</strong> ${result.fileSize || 'N/A'} 字节</p>
                    <p><strong>期望校验和:</strong> <code>${result.expectedChecksum}</code></p>
                    <p><strong>实际校验和:</strong> <code>${result.actualChecksum || 'N/A'}</code></p>
                    <p><strong>时间:</strong> ${result.timestamp}</p>
                    ${result.message ? `<p><strong>消息:</strong> ${result.message}</p>` : ''}
                </div>
            `;
            
        } catch (error) {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h5>文件验证失败:</h5>
                    <p>${error.message}</p>
                </div>
            `;
        }
    },

    // ==================== 系统完整性检查 ====================

    /**
     * 执行数据库完整性检查
     * @returns {Promise<Object>} 检查结果
     */
    async performDatabaseIntegrityCheck() {
        try {
            const response = await fetch('/api/validation/database-integrity');
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || '数据库完整性检查失败');
            }
            
            return result.result;
        } catch (error) {
            console.error('数据库完整性检查错误:', error);
            throw error;
        }
    },

    /**
     * 显示数据库完整性检查结果
     */
    async showDatabaseIntegrityResults() {
        try {
            const results = await this.performDatabaseIntegrityCheck();
            
            const dialog = this.createDialog('数据库完整性检查结果', `
                <div class="alert alert-${results.overallStatus === 'pass' ? 'success' : 'danger'}">
                    <h5>总体状态: ${results.overallStatus.toUpperCase()}</h5>
                    <p><strong>检查时间:</strong> ${results.timestamp}</p>
                </div>
                
                <h6>检查项目:</h6>
                <div id="integrity-checks">
                    ${results.checks.map(check => `
                        <div class="card mb-2">
                            <div class="card-body">
                                <h6 class="card-title">${check.table || check.type || '检查项目'}</h6>
                                <p class="card-text">
                                    ${check.recordCount !== undefined ? `记录数: ${check.recordCount}` : ''}
                                    ${check.status ? `状态: ${check.status}` : ''}
                                    ${check.message ? `<br>消息: ${check.message}` : ''}
                                </p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                ${results.errors.length > 0 ? `
                    <div class="alert alert-danger">
                        <h6>发现的问题:</h6>
                        <ul>
                            ${results.errors.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${results.warnings.length > 0 ? `
                    <div class="alert alert-warning">
                        <h6>警告:</h6>
                        <ul>
                            ${results.warnings.map(warning => `<li>${warning}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            `);
            
        } catch (error) {
            this.showErrorDialog('数据库完整性检查失败', error.message);
        }
    },

    // ==================== CFR 21 Part 11 合规性评估 ====================

    /**
     * 获取CFR 21 Part 11合规性评估
     * @returns {Promise<Object>} 合规性评估结果
     */
    async getCFR21Compliance() {
        try {
            const response = await fetch('/api/validation/cfr21-compliance');
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || '合规性评估失败');
            }
            
            return result.compliance;
        } catch (error) {
            console.error('CFR 21 Part 11合规性评估错误:', error);
            throw error;
        }
    },

    /**
     * 显示CFR 21 Part 11合规性评估结果
     */
    async showCFR21ComplianceResults() {
        try {
            const compliance = await this.getCFR21Compliance();
            
            const dialog = this.createDialog('CFR 21 Part 11 合规性评估', `
                <div class="alert alert-${compliance.overallStatus === 'compliant' ? 'success' : 'danger'}">
                    <h5>总体合规状态: ${compliance.overallStatus === 'compliant' ? '合规' : '不合规'}</h5>
                    <p><strong>评估时间:</strong> ${compliance.timestamp}</p>
                </div>
                
                <h6>合规性检查项目:</h6>
                <div id="compliance-requirements">
                    ${Object.entries(compliance.requirements).map(([key, requirement]) => `
                        <div class="card mb-2">
                            <div class="card-body">
                                <h6 class="card-title">
                                    ${this.getRequirementDisplayName(key)}
                                    <span class="badge badge-${requirement.status === 'compliant' ? 'success' : 'danger'}">
                                        ${requirement.status === 'compliant' ? '合规' : '不合规'}
                                    </span>
                                </h6>
                                ${requirement.issue ? `<p class="text-danger"><strong>问题:</strong> ${requirement.issue}</p>` : ''}
                                ${requirement.recommendations && requirement.recommendations.length > 0 ? `
                                    <p><strong>建议:</strong></p>
                                    <ul>
                                        ${requirement.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                                    </ul>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                ${compliance.issues.length > 0 ? `
                    <div class="alert alert-danger">
                        <h6>发现的合规性问题:</h6>
                        <ul>
                            ${compliance.issues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${compliance.recommendations && compliance.recommendations.length > 0 ? `
                    <div class="alert alert-info">
                        <h6>总体建议:</h6>
                        <ul>
                            ${compliance.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            `);
            
        } catch (error) {
            this.showErrorDialog('CFR 21 Part 11 合规性评估失败', error.message);
        }
    },

    /**
     * 获取合规性要求的中文显示名称
     * @param {string} key - 要求键名
     * @returns {string} 中文名称
     */
    getRequirementDisplayName(key) {
        const names = {
            accessControl: '访问控制',
            auditTrails: '审计跟踪',
            electronicSignatures: '电子签名',
            dataIntegrity: '数据完整性',
            recordKeeping: '记录保持',
            systemValidation: '系统验证'
        };
        return names[key] || key;
    },

    // ==================== 验证报告生成 ====================

    /**
     * 生成验证报告
     * @param {Object} options - 报告选项
     * @returns {Promise<Object>} 生成的报告
     */
    async generateValidationReport(options = {}) {
        try {
            const response = await fetch('/api/validation/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options)
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || '验证报告生成失败');
            }
            
            return result.report;
        } catch (error) {
            console.error('验证报告生成错误:', error);
            throw error;
        }
    },

    /**
     * 显示验证报告生成对话框
     */
    showValidationReportDialog() {
        const dialog = this.createDialog('生成验证报告', `
            <div class="form-group">
                <label for="report-title">报告标题:</label>
                <input type="text" id="report-title" class="form-control" 
                       placeholder="CFR 21 Part 11 系统验证报告" 
                       value="CFR 21 Part 11 系统验证报告">
            </div>
            <div class="form-group">
                <label for="report-period">报告周期:</label>
                <select id="report-period" class="form-control">
                    <option value="daily">日报</option>
                    <option value="weekly">周报</option>
                    <option value="monthly">月报</option>
                    <option value="quarterly">季报</option>
                </select>
            </div>
            <div class="form-group">
                <label for="report-scope">报告范围:</label>
                <select id="report-scope" class="form-control">
                    <option value="full_system">全系统</option>
                    <option value="data_integrity">数据完整性</option>
                    <option value="signature_verification">签名验证</option>
                    <option value="database_integrity">数据库完整性</option>
                </select>
            </div>
            <div id="report-generation-result" style="margin-top: 10px;"></div>
        `);
        
        dialog.querySelector('button[onclick="ValidationManager.generateReportFromDialog()"]').onclick = () => {
            this.generateReportFromDialog();
        };
    },

    /**
     * 从对话框生成验证报告
     */
    async generateReportFromDialog() {
        const title = document.getElementById('report-title').value;
        const period = document.getElementById('report-period').value;
        const scope = document.getElementById('report-scope').value;
        const resultDiv = document.getElementById('report-generation-result');
        
        try {
            if (!title) {
                throw new Error('请输入报告标题');
            }
            
            // 生成报告
            const report = await this.generateValidationReport({ title, period, scope });
            
            // 显示报告概要
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <h5>验证报告生成成功:</h5>
                    <p><strong>报告ID:</strong> <code>${report.id}</code></p>
                    <p><strong>标题:</strong> ${report.title}</p>
                    <p><strong>生成时间:</strong> ${report.generatedAt}</p>
                    <p><strong>统计信息:</strong></p>
                    <ul>
                        <li>总验证次数: ${report.statistics.totalValidations}</li>
                        <li>成功验证: ${report.statistics.successfulValidations}</li>
                        <li>失败验证: ${report.statistics.failedValidations}</li>
                        <li>成功率: ${report.statistics.successRate}%</li>
                    </ul>
                    <p><strong>合规状态:</strong> ${report.compliance.cfr21Part11.overallStatus === 'compliant' ? '合规' : '不合规'}</p>
                </div>
            `;
            
            // 显示完整报告
            this.showFullReport(report);
            
        } catch (error) {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h5>报告生成失败:</h5>
                    <p>${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * 显示完整报告
     * @param {Object} report - 报告对象
     */
    showFullReport(report) {
        const reportDialog = this.createDialog(`验证报告 - ${report.title}`, `
            <div class="report-content">
                <h5>报告概要</h5>
                <table class="table table-bordered">
                    <tr><td>报告ID</td><td>${report.id}</td></tr>
                    <tr><td>生成时间</td><td>${report.generatedAt}</td></tr>
                    <tr><td>报告周期</td><td>${report.period}</td></tr>
                    <tr><td>报告范围</td><td>${report.scope}</td></tr>
                </table>
                
                <h5>验证统计</h5>
                <table class="table table-bordered">
                    <tr><td>总验证次数</td><td>${report.statistics.totalValidations}</td></tr>
                    <tr><td>成功验证</td><td>${report.statistics.successfulValidations}</td></tr>
                    <tr><td>失败验证</td><td>${report.statistics.failedValidations}</td></tr>
                    <tr><td>成功率</td><td>${report.statistics.successRate}%</td></tr>
                </table>
                
                <h5>CFR 21 Part 11 合规性</h5>
                <table class="table table-bordered">
                    <tr><td>总体状态</td><td>${report.compliance.cfr21Part11.overallStatus === 'compliant' ? '合规' : '不合规'}</td></tr>
                    <tr><td>最后审计</td><td>${report.compliance.lastAudit || '无'}</td></tr>
                    <tr><td>下次到期</td><td>${report.compliance.nextDueDate}</td></tr>
                </table>
                
                ${report.recommendations && report.recommendations.length > 0 ? `
                    <h5>建议</h5>
                    <ul>
                        ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `);
    },

    // ==================== 验证历史管理 ====================

    /**
     * 加载验证历史
     */
    async loadValidationHistory() {
        try {
            console.log('加载验证历史数据...');
            const response = await fetch('/api/validation/history?_=' + Date.now());
            
            // 检查响应类型
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`API返回非JSON响应 (${contentType || 'unknown'}), URL: /api/validation/history`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.validationHistory = result.history;
                this.updateValidationHistoryDisplay();
                console.log(`验证历史加载成功，共 ${this.validationHistory.length} 条记录`);
            } else {
                throw new Error(result.error || '验证历史获取失败');
            }
        } catch (error) {
            console.warn('验证历史加载失败，使用空数据:', error);
            this.validationHistory = [];
            // 不抛出错误，避免阻塞初始化
        }
    },

    /**
     * 更新验证历史显示
     */
    updateValidationHistoryDisplay() {
        const historyContainer = document.getElementById('validation-history');
        if (!historyContainer) return;
        
        const history = this.validationHistory || [];
        
        if (history.length === 0) {
            historyContainer.innerHTML = '<p class="text-muted">暂无验证历史记录</p>';
            return;
        }
        
        historyContainer.innerHTML = history.slice(-10).reverse().map(item => `
            <div class="validation-history-item">
                <div class="row">
                    <div class="col-md-3">
                        <span class="badge badge-${item.result.valid ? 'success' : 'danger'}">
                            ${item.type === 'data_integrity' ? '数据完整性' : 
                              item.type === 'signature_validation' ? '签名验证' : 
                              item.type === 'file_integrity' ? '文件完整性' : item.type}
                        </span>
                    </div>
                    <div class="col-md-3">
                        <small>${item.result.valid ? '通过' : '失败'}</small>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">${item.timestamp}</small>
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * 清空验证历史
     */
    async clearValidationHistory() {
        try {
            const response = await fetch('/api/validation/history', { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                this.validationHistory = [];
                this.updateValidationHistoryDisplay();
                alert('验证历史已清空');
            }
        } catch (error) {
            console.error('清空验证历史失败:', error);
            alert('清空验证历史失败: ' + error.message);
        }
    },

    // ==================== 工具方法 ====================

    /**
     * 创建对话框
     * @param {string} title - 对话框标题
     * @param {string} content - 对话框内容
     * @returns {HTMLElement} 对话框元素
     */
    createDialog(title, content) {
        const dialog = document.createElement('div');
        dialog.className = 'modal fade';
        dialog.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" onclick="ValidationManager.showValidationHistory()">查看历史</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        $(dialog).modal('show');
        
        dialog.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(dialog);
        });
        
        return dialog;
    },

    /**
     * 显示错误对话框
     * @param {string} title - 错误标题
     * @param {string} message - 错误消息
     */
    showErrorDialog(title, message) {
        const dialog = this.createDialog(title, `
            <div class="alert alert-danger">
                <p>${message}</p>
            </div>
        `);
    },

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 添加验证功能按钮的事件监听器
        const buttons = [
            { id: 'data-integrity-btn', handler: 'showDataIntegrityDialog' },
            { id: 'electronic-signature-btn', handler: 'showElectronicSignatureDialog' },
            { id: 'file-integrity-btn', handler: 'showFileIntegrityDialog' },
            { id: 'database-integrity-btn', handler: 'showDatabaseIntegrityResults' },
            { id: 'cfr21-compliance-btn', handler: 'showCFR21ComplianceResults' },
            { id: 'validation-report-btn', handler: 'showValidationReportDialog' }
        ];
        
        buttons.forEach(button => {
            const element = document.getElementById(button.id);
            if (element) {
                element.addEventListener('click', () => {
                    this[button.handler]();
                });
            }
        });
    },

    /**
     * 显示验证历史页面
     */
    showValidationHistory() {
        const dialog = this.createDialog('验证历史', `
            <div id="validation-history-content">
                <div class="row mb-3">
                    <div class="col-md-12">
                        <button class="btn btn-danger btn-sm" onclick="ValidationManager.clearValidationHistory()">
                            清空历史
                        </button>
                        <button class="btn btn-secondary btn-sm ml-2" onclick="ValidationManager.loadValidationHistory()">
                            刷新
                        </button>
                    </div>
                </div>
                <div id="validation-history">
                    <p class="text-muted">加载中...</p>
                </div>
            </div>
        `);
        
        this.loadValidationHistory();
    },

    // ==================== 初始化属性 ====================

    validationHistory: [],

    // ==================== 公共API ====================

    /**
     * 获取模块状态
     */
    getStatus() {
        return {
            initialized: true,
            validationHistoryCount: this.validationHistory?.length || 0,
            features: [
                'data_integrity',
                'electronic_signatures', 
                'file_integrity',
                'database_integrity',
                'cfr21_compliance',
                'validation_reports'
            ]
        };
    }
};

// DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ValidationManager.init();
    });
} else {
    ValidationManager.init();
}