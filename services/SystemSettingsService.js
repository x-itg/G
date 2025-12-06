/**
 * 系统设置和配置服务
 * System Settings and Configuration Service
 * 
 * 功能特点:
 * - 用户偏好设置管理
 * - 应用参数配置
 * - 设备配置选项
 * - 硬件通讯模式切换（模拟/真实）
 * - 数据导入导出设置
 */

const fs = require('fs');
const path = require('path');

class SystemSettingsService {
    constructor(db) {
        this.db = db;
        this.configPath = path.join(__dirname, '../config/');
        this.settingsFile = path.join(this.configPath, 'system-settings.json');
        this.userPrefsFile = path.join(this.configPath, 'user-preferences.json');
        
        this.ensureConfigDirectory();
        this.initializeDefaultSettings();
    }

    /**
     * 确保配置目录存在
     */
    ensureConfigDirectory() {
        if (!fs.existsSync(this.configPath)) {
            fs.mkdirSync(this.configPath, { recursive: true });
        }
    }

    /**
     * 验证配置文件完整性
     */
    validateConfigFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(content);
            
            // 检查必要字段
            const requiredFields = ['system', 'communication'];
            const missingFields = requiredFields.filter(field => !parsed[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`配置文件缺少必要字段: ${missingFields.join(', ')}`);
            }
            
            // 检查communication字段的子字段
            if (!parsed.communication.hardwareMode) {
                throw new Error('配置文件缺少hardwareMode字段');
            }
            
            return true;
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('配置文件JSON格式错误: ' + error.message);
            }
            throw error;
        }
    }

    /**
     * 初始化默认系统设置
     */
    initializeDefaultSettings() {
        const defaultSettings = {
            system: {
                version: "1.0.0",
                buildNumber: "2025.01.001",
                installDate: new Date().toISOString(),
                lastUpdate: new Date().toISOString(),
                language: "zh-CN",
                timezone: "Asia/Shanghai",
                dateFormat: "YYYY-MM-DD HH:mm:ss",
                debugMode: false,
                autoSave: true,
                saveInterval: 300000, // 5分钟
                maxLogSize: 10000000, // 10MB
                retentionDays: 90
            },
            communication: {
                hardwareMode: "simulated", // "simulated" | "real"
                serialPorts: {
                    comPort2: "COM2",
                    comPort3: "COM3", 
                    baudRate: 9600,
                    dataBits: 8,
                    stopBits: 1,
                    parity: "none",
                    flowControl: "none"
                },
                simulatedDevice: {
                    enabled: true,
                    deviceType: "hpge_detector",
                    samplingRate: 1000, // ms
                    dataMode: "continuous", // "continuous" | "triggered"
                    noiseLevel: 0.01,
                    backgroundLevel: 100,
                    peakChannels: [512, 1024, 2048],
                    peakIntensities: [1000, 2000, 1500],
                    spectralRange: [0, 4095],
                    countRate: 1000 // counts per second
                },
                timeout: 5000,
                retryAttempts: 3,
                bufferSize: 8192
            },
            acquisition: {
                sampleTime: 30000, // 30秒
                liveTime: true,
                realTime: true,
                autoStop: false,
                peakSearch: true,
                nuclideLibrary: "IAEAstandards",
                energyCalibration: {
                    enabled: true,
                    points: [
                        { channel: 0, energy: 0 },
                        { channel: 1024, energy: 122 },
                        { channel: 2048, energy: 662 }
                    ]
                },
                efficiencyCalibration: {
                    enabled: true,
                    geometry: "planar",
                    sourceDistance: 100 // mm
                }
            },
            analysis: {
                autoIdentify: true,
                minimumPeakArea: 100,
                peakIdentificationThreshold: 3,
                backgroundSubtraction: "Polynomial",
                smoothing: false,
                smoothingFactor: 3,
                deadTimeCorrection: true,
                pulsePileupRejection: true
            },
            display: {
                theme: "light",
                chartTheme: "modern",
                updateInterval: 100, // ms
                chartPoints: 1000,
                gridLines: true,
                axisLabels: true,
                legend: true,
                colorScheme: {
                    background: "#ffffff",
                    foreground: "#000000",
                    primary: "#007acc",
                    secondary: "#ff6b6b",
                    success: "#51cf66",
                    warning: "#ffd43b",
                    error: "#ff6b6b"
                },
                notifications: {
                    enabled: true,
                    sound: true,
                    position: "top-right"
                }
            },
            export: {
                defaultFormat: "csv",
                includeMetadata: true,
                includeCalibration: true,
                includeQualityData: true,
                compression: false,
                encryption: false,
                signatureRequired: false
            },
            security: {
                passwordPolicy: {
                    minLength: 8,
                    requireUppercase: true,
                    requireLowercase: true,
                    requireNumbers: true,
                    requireSpecialChars: true
                },
                sessionTimeout: 3600000, // 1小时
                maxLoginAttempts: 5,
                lockoutDuration: 300000, // 5分钟
                requireReauthForExport: false
            }
        };

        try {
            // 检查文件是否存在且有效
            if (!fs.existsSync(this.settingsFile)) {
                // 文件不存在，创建默认配置
                fs.writeFileSync(this.settingsFile, JSON.stringify(defaultSettings, null, 2));
                console.log('已创建默认系统配置文件');
            } else {
                // 文件存在，验证其完整性
                try {
                    this.validateConfigFile(this.settingsFile);
                } catch (validationError) {
                    console.warn('配置文件验证失败，重新创建默认配置:', validationError.message);
                    
                    // 备份损坏的配置文件
                    const backupPath = this.settingsFile + '.backup-' + Date.now();
                    fs.copyFileSync(this.settingsFile, backupPath);
                    console.log('已备份损坏的配置文件到:', backupPath);
                    
                    // 重新创建默认配置
                    fs.writeFileSync(this.settingsFile, JSON.stringify(defaultSettings, null, 2));
                    console.log('已重新创建默认系统配置文件');
                }
            }
        } catch (error) {
            console.error('初始化默认设置失败:', error);
            // 最后尝试：确保至少有一个基础配置文件
            try {
                fs.writeFileSync(this.settingsFile, JSON.stringify(defaultSettings, null, 2));
            } catch (writeError) {
                console.error('无法写入配置文件:', writeError);
                throw new Error('系统配置文件初始化失败');
            }
        }
    }

    /**
     * 获取系统设置
     */
    async getSystemSettings() {
        try {
            const settings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
            
            // 获取用户偏好设置
            let userPrefs = {};
            if (fs.existsSync(this.userPrefsFile)) {
                userPrefs = JSON.parse(fs.readFileSync(this.userPrefsFile, 'utf8'));
            }
            
            // 合并设置（用户偏好覆盖系统默认）
            const mergedSettings = { ...settings, userPreferences: userPrefs };
            
            return {
                success: true,
                data: mergedSettings,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取系统设置失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 更新系统设置
     */
    async updateSystemSettings(settingsData) {
        try {
            // 验证设置数据结构
            this.validateSettingsData(settingsData);
            
            // 分离系统设置和用户偏好
            const { systemSettings, userPreferences } = this.separateSettings(settingsData);
            
            // 更新系统设置
            const currentSettings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
            const updatedSettings = { ...currentSettings, ...systemSettings };
            updatedSettings.system.lastUpdate = new Date().toISOString();
            
            fs.writeFileSync(this.settingsFile, JSON.stringify(updatedSettings, null, 2));
            
            // 更新用户偏好设置
            if (Object.keys(userPreferences).length > 0) {
                const currentUserPrefs = fs.existsSync(this.userPrefsFile) 
                    ? JSON.parse(fs.readFileSync(this.userPrefsFile, 'utf8')) 
                    : {};
                const updatedUserPrefs = { ...currentUserPrefs, ...userPreferences };
                
                fs.writeFileSync(this.userPrefsFile, JSON.stringify(updatedUserPrefs, null, 2));
            }
            
            // 记录审计日志
            await this.recordSettingsChange(settingsData);
            
            return {
                success: true,
                message: '系统设置已成功更新',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('更新系统设置失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 重置系统设置为默认值
     */
    async resetToDefaults() {
        try {
            // 备份当前设置
            const backupPath = path.join(this.configPath, `settings-backup-${Date.now()}.json`);
            if (fs.existsSync(this.settingsFile)) {
                fs.copyFileSync(this.settingsFile, backupPath);
            }
            
            // 重新初始化默认设置
            this.initializeDefaultSettings();
            
            // 删除用户偏好文件
            if (fs.existsSync(this.userPrefsFile)) {
                fs.unlinkSync(this.userPrefsFile);
            }
            
            return {
                success: true,
                message: '系统设置已重置为默认值',
                backupPath: backupPath,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('重置系统设置失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 获取硬件通讯配置
     */
    async getHardwareConfig() {
        try {
            const settings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
            const commConfig = settings.communication;
            
            // 确保返回完整的配置结构
            const configData = {
                mode: commConfig.hardwareMode,
                serialPorts: commConfig.serialPorts,
                simulatedDevice: commConfig.simulatedDevice,
                connectionParams: {
                    timeout: commConfig.timeout,
                    retryAttempts: commConfig.retryAttempts,
                    bufferSize: commConfig.bufferSize
                }
            };
            
            return {
                success: true,
                data: configData,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取硬件配置失败:', error);
            
            // 在配置文件损坏或不存在时，提供默认配置
            if (error.code === 'ENOENT' || error.message.includes('ENOENT')) {
                // 文件不存在，重新初始化
                this.initializeDefaultSettings();
                return await this.getHardwareConfig(); // 递归调用
            }
            
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 更新硬件通讯配置
     */
    async updateHardwareConfig(configData) {
        try {
            // 验证配置数据
            if (!configData || typeof configData !== 'object') {
                throw new Error('配置数据必须是有效的对象');
            }
            
            // 读取当前设置
            let currentSettings;
            try {
                currentSettings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
            } catch (fileError) {
                if (fileError.code === 'ENOENT') {
                    // 文件不存在，重新初始化
                    this.initializeDefaultSettings();
                    currentSettings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
                } else {
                    throw fileError;
                }
            }
            
            // 确保communication部分存在
            if (!currentSettings.communication) {
                currentSettings.communication = {};
            }
            
            // 更新通讯配置
            currentSettings.communication = {
                ...currentSettings.communication,
                ...configData
            };
            
            // 更新系统时间
            if (!currentSettings.system) {
                currentSettings.system = {};
            }
            currentSettings.system.lastUpdate = new Date().toISOString();
            
            // 确保目标目录存在
            this.ensureConfigDirectory();
            
            // 原子性写入（先写入临时文件，再重命名）
            const tempFile = this.settingsFile + '.tmp';
            fs.writeFileSync(tempFile, JSON.stringify(currentSettings, null, 2));
            fs.renameSync(tempFile, this.settingsFile);
            
            return {
                success: true,
                message: '硬件通讯配置已更新',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('更新硬件配置失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 切换硬件通讯模式
     */
    async switchHardwareMode(mode) {
        try {
            if (mode !== 'simulated' && mode !== 'real') {
                throw new Error('无效的硬件模式: ' + mode);
            }
            
            const currentSettings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
            currentSettings.communication.hardwareMode = mode;
            currentSettings.system.lastUpdate = new Date().toISOString();
            
            fs.writeFileSync(this.settingsFile, JSON.stringify(currentSettings, null, 2));
            
            // 记录审计日志
            await this.recordHardwareModeChange(mode);
            
            return {
                success: true,
                message: `硬件通讯模式已切换到: ${mode === 'simulated' ? '模拟模式' : '真实硬件模式'}`,
                mode: mode,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('切换硬件模式失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 获取用户偏好设置
     */
    async getUserPreferences(userId = 'default') {
        try {
            let preferences = {};
            
            if (fs.existsSync(this.userPrefsFile)) {
                preferences = JSON.parse(fs.readFileSync(this.userPrefsFile, 'utf8'));
            }
            
            return {
                success: true,
                data: preferences[userId] || {},
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取用户偏好失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 更新用户偏好设置
     */
    async updateUserPreferences(preferences, userId = 'default') {
        try {
            let allPreferences = {};
            
            if (fs.existsSync(this.userPrefsFile)) {
                allPreferences = JSON.parse(fs.readFileSync(this.userPrefsFile, 'utf8'));
            }
            
            if (!allPreferences[userId]) {
                allPreferences[userId] = {};
            }
            
            allPreferences[userId] = {
                ...allPreferences[userId],
                ...preferences,
                lastUpdated: new Date().toISOString()
            };
            
            fs.writeFileSync(this.userPrefsFile, JSON.stringify(allPreferences, null, 2));
            
            return {
                success: true,
                message: '用户偏好设置已更新',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('更新用户偏好失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 导出系统配置
     */
    async exportConfiguration(format = 'json') {
        try {
            const settings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
            const userPrefs = fs.existsSync(this.userPrefsFile) 
                ? JSON.parse(fs.readFileSync(this.userPrefsFile, 'utf8')) 
                : {};
            
            const exportData = {
                systemInfo: {
                    exportDate: new Date().toISOString(),
                    version: settings.system.version,
                    format: format
                },
                settings: settings,
                userPreferences: userPrefs,
                exportMetadata: {
                    exportedBy: 'System',
                    purpose: 'Configuration Backup',
                    checksum: this.generateChecksum(settings)
                }
            };
            
            let fileName, mimeType, content;
            
            switch (format.toLowerCase()) {
                case 'json':
                    fileName = `system-config-${Date.now()}.json`;
                    mimeType = 'application/json';
                    content = JSON.stringify(exportData, null, 2);
                    break;
                    
                case 'xml':
                    fileName = `system-config-${Date.now()}.xml`;
                    mimeType = 'application/xml';
                    content = this.convertToXML(exportData);
                    break;
                    
                case 'csv':
                    fileName = `system-config-${Date.now()}.csv`;
                    mimeType = 'text/csv';
                    content = this.convertToCSV(exportData.settings);
                    break;
                    
                default:
                    throw new Error('不支持的导出格式: ' + format);
            }
            
            // 保存到临时文件
            const tempFile = path.join(this.configPath, fileName);
            fs.writeFileSync(tempFile, content);
            
            return {
                success: true,
                data: {
                    fileName: fileName,
                    mimeType: mimeType,
                    size: fs.statSync(tempFile).size,
                    path: tempFile
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('导出配置失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 导入系统配置
     */
    async importConfiguration(fileData, format = 'json') {
        try {
            let configData;
            
            // 解析配置文件
            switch (format.toLowerCase()) {
                case 'json':
                    configData = JSON.parse(fileData);
                    break;
                case 'xml':
                    configData = this.parseXML(fileData);
                    break;
                case 'csv':
                    configData = this.parseCSV(fileData);
                    break;
                default:
                    throw new Error('不支持的导入格式: ' + format);
            }
            
            // 验证配置文件
            this.validateImportedConfig(configData);
            
            // 备份当前配置
            const backupPath = path.join(this.configPath, `settings-backup-${Date.now()}.json`);
            if (fs.existsSync(this.settingsFile)) {
                fs.copyFileSync(this.settingsFile, backupPath);
            }
            
            // 导入新配置
            if (configData.settings) {
                fs.writeFileSync(this.settingsFile, JSON.stringify(configData.settings, null, 2));
            }
            
            if (configData.userPreferences) {
                fs.writeFileSync(this.userPrefsFile, JSON.stringify(configData.userPreferences, null, 2));
            }
            
            return {
                success: true,
                message: '系统配置已成功导入',
                backupPath: backupPath,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('导入配置失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 验证设置数据结构
     */
    validateSettingsData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('设置数据必须是有效的对象');
        }
        
        // 检查关键字段是否存在
        const allowedSections = ['system', 'communication', 'acquisition', 'analysis', 'display', 'export', 'security'];
        const foundSections = Object.keys(data).filter(key => allowedSections.includes(key));
        
        if (foundSections.length === 0) {
            throw new Error('未找到有效的设置部分');
        }
    }

    /**
     * 分离系统设置和用户偏好
     */
    separateSettings(data) {
        const systemSettings = {};
        const userPreferences = {};
        
        const systemSections = ['system', 'communication', 'acquisition', 'analysis', 'export', 'security'];
        const displaySections = ['display']; // display可能既是系统设置也是用户偏好
        
        // 分离系统设置
        systemSections.forEach(section => {
            if (data[section]) {
                systemSettings[section] = data[section];
            }
        });
        
        // display部分需要特殊处理（可以部分归类为用户偏好）
        if (data.display) {
            systemSettings.display = {
                ...systemSettings.display,
                ...data.display.system || {}
            };
            userPreferences.display = data.display.user || data.display;
        }
        
        // 其他直接归类为用户偏好
        Object.keys(data).forEach(key => {
            if (!systemSections.includes(key) && key !== 'display') {
                userPreferences[key] = data[key];
            }
        });
        
        return { systemSettings, userPreferences };
    }

    /**
     * 记录设置变更审计日志
     */
    async recordSettingsChange(settingsData) {
        try {
            // 这里可以集成到审计日志系统
            const auditLog = {
                timestamp: new Date().toISOString(),
                user: 'System',
                action: 'settings_update',
                changes: Object.keys(settingsData),
                details: settingsData
            };
            
            // 保存到审计日志文件
            const auditFile = path.join(this.configPath, 'settings-audit.log');
            fs.appendFileSync(auditFile, JSON.stringify(auditLog) + '\n');
        } catch (error) {
            console.error('记录设置变更日志失败:', error);
        }
    }

    /**
     * 记录硬件模式变更
     */
    async recordHardwareModeChange(mode) {
        try {
            const auditLog = {
                timestamp: new Date().toISOString(),
                user: 'System',
                action: 'hardware_mode_change',
                details: { newMode: mode }
            };
            
            const auditFile = path.join(this.configPath, 'hardware-audit.log');
            fs.appendFileSync(auditFile, JSON.stringify(auditLog) + '\n');
        } catch (error) {
            console.error('记录硬件模式变更失败:', error);
        }
    }

    /**
     * 生成数据校验和
     */
    generateChecksum(data) {
        const crypto = require('crypto');
        const dataString = JSON.stringify(data);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * 转换为XML格式
     */
    convertToXML(data) {
        // 简化的XML转换（实际应用可能需要更完整的XML序列化）
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<configuration>\n';
        xml += `  <exportDate>${data.systemInfo.exportDate}</exportDate>\n`;
        xml += `  <version>${data.systemInfo.version}</version>\n`;
        xml += '  <settings>\n';
        
        // 这里应该递归转换所有设置
        xml += '  </settings>\n</configuration>';
        return xml;
    }

    /**
     * 转换为CSV格式
     */
    convertToCSV(data) {
        // 简化的CSV转换（实际应用可能需要更复杂的格式）
        let csv = 'Key,Value\n';
        const flatten = (obj, prefix = '') => {
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                const csvKey = prefix ? `${prefix}.${key}` : key;
                
                if (typeof value === 'object') {
                    flatten(value, csvKey);
                } else {
                    csv += `"${csvKey}","${value}"\n`;
                }
            });
        };
        
        flatten(data);
        return csv;
    }

    /**
     * 解析XML配置
     */
    parseXML(xmlData) {
        // 简化的XML解析（实际应用可能需要XML解析器）
        throw new Error('XML解析功能尚未实现');
    }

    /**
     * 解析CSV配置
     */
    parseCSV(csvData) {
        // 简化的CSV解析（实际应用可能需要CSV解析器）
        throw new Error('CSV解析功能尚未实现');
    }

    /**
     * 验证导入的配置
     */
    validateImportedConfig(configData) {
        if (!configData || typeof configData !== 'object') {
            throw new Error('导入的配置数据无效');
        }
        
        // 检查必要字段
        if (!configData.settings && !configData.system) {
            throw new Error('配置文件中缺少必要的设置数据');
        }
        
        // 如果有校验和，验证完整性
        if (configData.exportMetadata && configData.exportMetadata.checksum && configData.settings) {
            const calculatedChecksum = this.generateChecksum(configData.settings);
            if (calculatedChecksum !== configData.exportMetadata.checksum) {
                throw new Error('配置文件校验失败，文件可能已损坏');
            }
        }
    }
}

module.exports = SystemSettingsService;