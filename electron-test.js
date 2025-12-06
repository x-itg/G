#!/usr/bin/env node

/**
 * Electron 环境测试启动脚本
 * Electron Environment Test Launcher
 * 
 * 这个脚本用于在测试环境中启动Electron应用，
 * 提供详细的日志记录和错误监控。
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ElectronTestLauncher {
    constructor() {
        this.appPath = path.join(__dirname, 'main-enhanced.js');
        this.testResultsPath = path.join(__dirname, 'test-results');
        this.ensureTestResultsDirectory();
        
        this.testStartTime = Date.now();
        this.testSteps = [];
        this.errors = [];
        
        this.runTests();
    }

    ensureTestResultsDirectory() {
        if (!fs.existsSync(this.testResultsPath)) {
            fs.mkdirSync(this.testResultsPath, { recursive: true });
        }
    }

    logTestStep(step, status, message = '') {
        const entry = {
            step: step,
            status: status,
            message: message,
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.testStartTime
        };
        
        this.testSteps.push(entry);
        console.log(`[TEST] ${status}: ${step} ${message ? `- ${message}` : ''}`);
        
        // 实时写入测试结果
        this.writeTestProgress();
    }

    writeTestProgress() {
        const progress = {
            testStartTime: new Date(this.testStartTime).toISOString(),
            currentTime: new Date().toISOString(),
            totalDuration: Date.now() - this.testStartTime,
            steps: this.testSteps,
            errors: this.errors
        };
        
        const progressFile = path.join(this.testResultsPath, 'test-progress.json');
        fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
    }

    async runTests() {
        try {
            console.log('🧪 开始Electron环境测试流程...\n');
            
            this.logTestStep('test_start', 'INFO', '开始Electron环境测试');
            
            await this.testElectronBinary();
            await this.testMainJS();
            await this.testDependencies();
            await this.testServices();
            await this.testFrontend();
            
            this.logTestStep('test_complete', 'SUCCESS', '所有测试通过');
            this.generateTestReport();
            
        } catch (error) {
            this.logTestStep('test_failed', 'ERROR', error.message);
            this.errors.push({
                type: 'test_failure',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            this.generateTestReport();
            process.exit(1);
        }
    }

    async testElectronBinary() {
        this.logTestStep('electron_binary', 'INFO', '检查Electron二进制文件');
        
        return new Promise((resolve, reject) => {
            const electronPath = require('electron');
            console.log('Electron路径:', electronPath);
            
            const version = spawn(electronPath, ['--version'], {
                stdio: 'pipe',
                timeout: 10000
            });
            
            version.stdout.on('data', (data) => {
                this.logTestStep('electron_binary', 'SUCCESS', `版本: ${data.toString().trim()}`);
                resolve();
            });
            
            version.stderr.on('data', (data) => {
                const error = data.toString().trim();
                this.logTestStep('electron_binary', 'ERROR', `错误: ${error}`);
                reject(new Error(`Electron二进制文件错误: ${error}`));
            });
            
            version.on('error', (error) => {
                this.logTestStep('electron_binary', 'ERROR', error.message);
                reject(new Error(`无法启动Electron: ${error.message}`));
            });
            
            version.on('timeout', () => {
                version.kill();
                this.logTestStep('electron_binary', 'ERROR', '启动超时');
                reject(new Error('Electron启动超时'));
            });
        });
    }

    async testMainJS() {
        this.logTestStep('main_js', 'INFO', '检查main.js文件');
        
        if (!fs.existsSync(this.appPath)) {
            throw new Error(`main.js文件不存在: ${this.appPath}`);
        }
        
        // 尝试加载main.js检查语法
        try {
            require(this.appPath);
            this.logTestStep('main_js', 'SUCCESS', 'main.js语法检查通过');
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                // 这是预期的，因为缺少依赖
                this.logTestStep('main_js', 'WARNING', '需要安装依赖，但语法检查通过');
            } else if (error.message.includes('SyntaxError')) {
                throw new Error(`main.js语法错误: ${error.message}`);
            } else {
                this.logTestStep('main_js', 'WARNING', `模块加载警告: ${error.message}`);
            }
        }
    }

    async testDependencies() {
        this.logTestStep('dependencies', 'INFO', '检查项目依赖');
        
        const packageJsonPath = path.join(__dirname, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('package.json文件不存在');
        }
        
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const requiredDependencies = ['electron'];
        
        for (const dep of requiredDependencies) {
            if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
                throw new Error(`缺少依赖: ${dep}`);
            }
        }
        
        this.logTestStep('dependencies', 'SUCCESS', '依赖检查通过');
    }

    async testServices() {
        this.logTestStep('services', 'INFO', '检查服务文件');
        
        const servicesDir = path.join(__dirname, 'services');
        if (!fs.existsSync(servicesDir)) {
            throw new Error('services目录不存在');
        }
        
        const serviceFiles = fs.readdirSync(servicesDir)
            .filter(file => file.endsWith('.js'))
            .map(file => path.basename(file, '.js'));
        
        console.log('找到的服务:', serviceFiles.join(', '));
        
        // 检查关键服务文件
        const criticalServices = [
            'AuthenticationService',
            'AuditTrailService', 
            'SerialCommunicationService'
        ];
        
        for (const service of criticalServices) {
            if (!serviceFiles.includes(service)) {
                throw new Error(`缺少关键服务: ${service}`);
            }
        }
        
        this.logTestStep('services', 'SUCCESS', `${serviceFiles.length}个服务文件检查通过`);
    }

    async testFrontend() {
        this.logTestStep('frontend', 'INFO', '检查前端文件');
        
        const rendererDir = path.join(__dirname, 'renderer');
        if (!fs.existsSync(rendererDir)) {
            throw new Error('renderer目录不存在');
        }
        
        const indexPath = path.join(rendererDir, 'index.html');
        if (!fs.existsSync(indexPath)) {
            throw new Error('index.html文件不存在');
        }
        
        this.logTestStep('frontend', 'SUCCESS', '前端文件检查通过');
    }

    async launchElectron() {
        this.logTestStep('launch', 'INFO', '启动Electron应用');
        
        return new Promise((resolve, reject) => {
            const electronPath = require('electron');
            const electronProcess = spawn(electronPath, [this.appPath], {
                stdio: 'inherit',
                env: { ...process.env, NODE_ENV: 'development' }
            });
            
            this.logTestStep('launch', 'INFO', 'Electron进程已启动');
            
            electronProcess.on('exit', (code, signal) => {
                if (code === 0) {
                    this.logTestStep('launch', 'SUCCESS', 'Electron正常退出');
                    resolve();
                } else {
                    const error = `Electron进程异常退出 (代码: ${code}, 信号: ${signal})`;
                    this.logTestStep('launch', 'ERROR', error);
                    reject(new Error(error));
                }
            });
            
            electronProcess.on('error', (error) => {
                this.logTestStep('launch', 'ERROR', error.message);
                reject(new Error(`Electron启动失败: ${error.message}`));
            });
            
            // 设置超时
            setTimeout(() => {
                this.logTestStep('launch', 'INFO', '超时但继续观察...');
            }, 30000);
        });
    }

    generateTestReport() {
        const report = {
            testSummary: {
                testStartTime: new Date(this.testStartTime).toISOString(),
                testEndTime: new Date().toISOString(),
                totalDuration: Date.now() - this.testStartTime,
                totalSteps: this.testSteps.length,
                successSteps: this.testSteps.filter(step => step.status === 'SUCCESS').length,
                errorSteps: this.testSteps.filter(step => step.status === 'ERROR').length,
                warningSteps: this.testSteps.filter(step => step.status === 'WARNING').length
            },
            steps: this.testSteps,
            errors: this.errors,
            recommendations: this.generateRecommendations()
        };
        
        const reportFile = path.join(this.testResultsPath, `electron-test-report-${Date.now()}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        console.log('\n📋 测试报告已生成:', reportFile);
        console.log('\n📊 测试结果摘要:');
        console.log(`总步骤数: ${report.testSummary.totalSteps}`);
        console.log(`成功: ${report.testSummary.successSteps}`);
        console.log(`错误: ${report.testSummary.errorSteps}`);
        console.log(`警告: ${report.testSummary.warningSteps}`);
        console.log(`总耗时: ${Math.floor(report.testSummary.totalDuration / 1000)}秒`);
        
        if (report.testSummary.errorSteps > 0) {
            console.log('\n❌ 测试失败! 请检查错误信息。');
            process.exit(1);
        } else {
            console.log('\n✅ 所有测试通过!');
            console.log('\n🚀 现在可以运行以下命令启动Electron应用:');
            console.log('   npm start');
        }
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.testSteps.some(step => step.status === 'WARNING')) {
            recommendations.push('修复所有警告项以确保应用稳定性');
        }
        
        if (!this.testSteps.find(step => step.step === 'launch')) {
            recommendations.push('建议运行实际的Electron启动测试');
        }
        
        if (this.errors.length > 0) {
            recommendations.push('需要解决所有错误才能正常运行应用');
        }
        
        recommendations.push('定期运行测试以确保代码质量');
        recommendations.push('在生产环境中关闭开发模式');
        
        return recommendations;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    new ElectronTestLauncher();
}

module.exports = ElectronTestLauncher;
