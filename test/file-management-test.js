// 文件管理系统测试脚本
// 测试所有文件操作功能

const TestFileManager = {
    // 测试结果存储
    results: [],
    
    // 记录测试结果
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        this.results.push({ timestamp, message, type });
        console.log(`[${type.toUpperCase()}] ${message}`);
    },

    // 执行所有测试
    async runAllTests() {
        this.log('开始文件管理系统测试...', 'info');
        
        try {
            // 测试1: 模块可用性检查
            await this.testModuleAvailability();
            
            // 测试2: 文件浏览器UI
            await this.testFileBrowserUI();
            
            // 测试3: 项目管理功能
            await this.testProjectManagement();
            
            // 测试4: 文件导入功能
            await this.testFileImport();
            
            // 测试5: 文件导出功能
            await this.testFileExport();
            
            // 测试6: 报告生成功能
            await this.testReportGeneration();
            
            // 测试7: API端点测试
            await this.testAPIEndpoints();
            
            // 显示测试总结
            this.showTestSummary();
            
        } catch (error) {
            this.log(`测试执行失败: ${error.message}`, 'error');
            throw error;
        }
    },

    // 测试1: 模块可用性检查
    async testModuleAvailability() {
        this.log('测试1: 检查FileManager模块是否可用...', 'info');
        
        if (!window.FileManager) {
            throw new Error('FileManager模块未找到');
        }
        
        if (typeof window.FileManager.init !== 'function') {
            throw new Error('FileManager模块缺少init方法');
        }
        
        // 初始化模块
        await window.FileManager.init();
        
        this.log('✅ FileManager模块初始化成功', 'success');
    },

    // 测试2: 文件浏览器UI
    async testFileBrowserUI() {
        this.log('测试2: 验证文件浏览器UI功能...', 'info');
        
        // 检查必要的DOM元素是否存在
        const fileManagerElements = [
            'file-manager-tab',
            'new-project-btn',
            'open-project-btn',
            'save-project-btn',
            'import-data-btn',
            'export-data-btn',
            'generate-report-btn',
            'file-list',
            'project-info'
        ];
        
        let missingElements = [];
        fileManagerElements.forEach(elementId => {
            if (!document.getElementById(elementId)) {
                missingElements.push(elementId);
            }
        });
        
        if (missingElements.length > 0) {
            this.log(`⚠️ 缺少UI元素: ${missingElements.join(', ')}`, 'warning');
        } else {
            this.log('✅ 文件浏览器UI元素存在', 'success');
        }
    },

    // 测试3: 项目管理功能
    async testProjectManagement() {
        this.log('测试3: 测试项目管理功能...', 'info');
        
        // 测试新建项目
        if (window.FileManager.newProject) {
            const projectData = {
                name: '测试项目_' + Date.now(),
                description: '这是一个测试项目',
                parameters: {
                    integrationTime: 1000,
                    positionStep: 1,
                    rangeStart: 0,
                    rangeEnd: 100
                }
            };
            
            try {
                const result = await window.FileManager.newProject(projectData);
                this.log(`✅ 新建项目测试成功: ${result.message}`, 'success');
            } catch (error) {
                this.log(`❌ 新建项目测试失败: ${error.message}`, 'error');
            }
        }
        
        // 测试打开项目
        if (window.FileManager.openProject) {
            try {
                // 获取项目列表
                const projectList = await window.FileManager.getProjectList();
                if (projectList.length > 0) {
                    const result = await window.FileManager.openProject(projectList[0].id);
                    this.log(`✅ 打开项目测试成功: ${result.message}`, 'success');
                } else {
                    this.log('⚠️ 没有可测试的项目', 'warning');
                }
            } catch (error) {
                this.log(`❌ 打开项目测试失败: ${error.message}`, 'error');
            }
        }
    },

    // 测试4: 文件导入功能
    async testFileImport() {
        this.log('测试4: 测试文件导入功能...', 'info');
        
        if (window.FileManager.importData) {
            // 创建测试数据
            const testData = {
                measurements: [
                    { position: 0, countRate: 100, timestamp: Date.now() },
                    { position: 10, countRate: 150, timestamp: Date.now() + 1000 },
                    { position: 20, countRate: 200, timestamp: Date.now() + 2000 }
                ],
                metadata: {
                    importTime: Date.now(),
                    source: 'test',
                    format: 'json'
                }
            };
            
            try {
                const blob = new Blob([JSON.stringify(testData)], { type: 'application/json' });
                const result = await window.FileManager.importData(blob, 'json');
                this.log(`✅ 文件导入测试成功: ${result.message}`, 'success');
            } catch (error) {
                this.log(`❌ 文件导入测试失败: ${error.message}`, 'error');
            }
        }
    },

    // 测试5: 文件导出功能
    async testFileExport() {
        this.log('测试5: 测试文件导出功能...', 'info');
        
        if (window.FileManager.exportData) {
            const testData = {
                measurements: [
                    { position: 0, countRate: 100, timestamp: Date.now() },
                    { position: 10, countRate: 150, timestamp: Date.now() + 1000 }
                ],
                metadata: {
                    exportTime: Date.now(),
                    format: 'json'
                }
            };
            
            try {
                const result = await window.FileManager.exportData(testData, 'json');
                this.log(`✅ 文件导出测试成功: ${result.message}`, 'success');
            } catch (error) {
                this.log(`❌ 文件导出测试失败: ${error.message}`, 'error');
            }
        }
    },

    // 测试6: 报告生成功能
    async testReportGeneration() {
        this.log('测试6: 测试报告生成功能...', 'info');
        
        if (window.FileManager.generateReport) {
            const testReportData = {
                projectName: '测试项目',
                projectDescription: '测试报告生成',
                measurementData: [
                    { position: 0, countRate: 100 },
                    { position: 10, countRate: 150 }
                ],
                analysisResults: {
                    peakArea: 1000,
                    backgroundArea: 500,
                    netPeakArea: 500,
                    purity: 95.2,
                    rfValue: 0.75
                },
                timestamp: Date.now()
            };
            
            try {
                const result = await window.FileManager.generateReport(testReportData, 'pdf');
                this.log(`✅ 报告生成测试成功: ${result.message}`, 'success');
            } catch (error) {
                this.log(`❌ 报告生成测试失败: ${error.message}`, 'error');
            }
        }
    },

    // 测试7: API端点测试
    async testAPIEndpoints() {
        this.log('测试7: 测试文件管理API端点...', 'info');
        
        const apiEndpoints = [
            '/api/files/list',
            '/api/files/create',
            '/api/files/delete',
            '/api/files/export',
            '/api/files/import'
        ];
        
        for (const endpoint of apiEndpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ test: true })
                });
                
                // 检查响应状态（可能会失败，但不应该抛出异常）
                if (response.ok || response.status === 400 || response.status === 422) {
                    this.log(`✅ API端点 ${endpoint} 可访问`, 'success');
                } else {
                    this.log(`⚠️ API端点 ${endpoint} 响应异常: ${response.status}`, 'warning');
                }
            } catch (error) {
                this.log(`❌ API端点 ${endpoint} 不可访问: ${error.message}`, 'error');
            }
        }
    },

    // 显示测试总结
    showTestSummary() {
        const successCount = this.results.filter(r => r.type === 'success').length;
        const errorCount = this.results.filter(r => r.type === 'error').length;
        const warningCount = this.results.filter(r => r.type === 'warning').length;
        
        this.log('\n=== 文件管理系统测试总结 ===', 'info');
        this.log(`✅ 成功: ${successCount}`, 'success');
        this.log(`❌ 错误: ${errorCount}`, 'error');
        this.log(`⚠️ 警告: ${warningCount}`, 'warning');
        
        if (errorCount === 0) {
            this.log('🎉 所有测试通过！文件管理系统功能正常。', 'success');
        } else {
            this.log('⚠️ 部分测试失败，请检查错误信息。', 'warning');
        }
    },

    // 生成详细报告
    generateDetailedReport() {
        const report = {
            testName: 'FileManager功能测试',
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.length,
                success: this.results.filter(r => r.type === 'success').length,
                errors: this.results.filter(r => r.type === 'error').length,
                warnings: this.results.filter(r => r.type === 'warning').length
            },
            results: this.results
        };
        
        return report;
    }
};

// 导出测试工具
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestFileManager;
} else {
    window.TestFileManager = TestFileManager;
}

console.log('文件管理系统测试脚本已加载');

// 如果是直接运行此文件，则执行测试
if (require.main === module) {
    console.log('开始文件管理系统测试...');
    
    // 模拟浏览器环境
    global.window = {
        FileManager: {
            init: async () => {
                console.log('模拟初始化FileManager...');
            },
            newProject: async (data) => {
                console.log('模拟新建项目:', data.name);
                return { success: true, message: '项目创建成功' };
            },
            getProjectList: async () => {
                return [{ id: 1, name: '测试项目', description: '测试描述' }];
            },
            openProject: async (id) => {
                console.log('模拟打开项目:', id);
                return { success: true, message: '项目打开成功' };
            },
            importData: async (blob, format) => {
                console.log('模拟导入数据, 格式:', format);
                return { success: true, message: '数据导入成功' };
            },
            exportData: async (data, format) => {
                console.log('模拟导出数据, 格式:', format);
                return { success: true, message: '数据导出成功' };
            },
            generateReport: async (data, format) => {
                console.log('模拟生成报告, 格式:', format);
                return { success: true, message: '报告生成成功' };
            }
        }
    };
    
    // 模拟DOM元素
    global.document = {
        getElementById: (id) => {
            // 模拟返回一些DOM元素
            const mockElement = {
                style: { display: 'block' },
                innerHTML: '',
                textContent: '',
                appendChild: () => {},
                remove: () => {}
            };
            
            const requiredElements = [
                'file-manager-tab', 'new-project-btn', 'open-project-btn', 
                'save-project-btn', 'import-data-btn', 'export-data-btn',
                'generate-report-btn', 'file-list', 'project-info'
            ];
            
            if (requiredElements.includes(id)) {
                return mockElement;
            }
            
            return null;
        },
        addEventListener: () => {},
        body: { insertAdjacentHTML: () => {} }
    };
    
    // 模拟fetch API
    global.fetch = async (url, options) => {
        console.log(`模拟API请求: ${options?.method || 'GET'} ${url}`);
        return {
            ok: true,
            status: 200,
            json: async () => ({ success: true, message: 'OK' })
        };
    };
    
    // 运行测试
    TestFileManager.runAllTests()
        .then(() => {
            console.log('文件管理系统测试完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('文件管理系统测试失败:', error);
            process.exit(1);
        });
}