/**
 * 放射化学纯度检测仪 - 日志管理器
 * 提供日志轮转、归档、清理和分析功能
 */

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { spawn } = require('child_process');
const EventEmitter = require('events');

/**
 * 日志管理配置
 */
const LOG_MANAGER_CONFIG = {
    // 轮转配置
    rotation: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxRecordCount: 100000, // 10万条记录
        dailyRotation: true,
        timeBasedRotation: '00:00:00', // 每天凌晨轮转
        timeZone: 'Asia/Shanghai'
    },
    
    // 归档配置
    archive: {
        compressionEnabled: true,
        compressionDelay: 7, // 7天后压缩
        encryptionEnabled: false,
        encryptionKey: null,
        archiveRetention: {
            audit: 730, // 2年
            error: 365, // 1年
            access: 180, // 6个月
            system: 90  // 3个月
        }
    },
    
    // 存储配置
    storage: {
        basePath: path.join(__dirname, 'logs'),
        archivePath: path.join(__dirname, 'logs', 'archive'),
        tempPath: path.join(__dirname, 'logs', 'temp'),
        backupPath: path.join(__dirname, 'logs', 'backup'),
        maxStorageSize: 10 * 1024 * 1024 * 1024, // 10GB
        cleanupThreshold: 0.85 // 85%时开始清理
    },
    
    // 日志级别
    levels: ['debug', 'info', 'warn', 'error', 'fatal'],
    
    // 定时任务配置
    scheduler: {
        rotationInterval: '0 0 * * *', // 每天凌晨
        cleanupInterval: '0 2 * * *',  // 每天凌晨2点
        archiveInterval: '0 3 * * 0',  // 每周日凌晨3点
        statsInterval: '0 */6 * * *'   // 每6小时
    }
};

class LogManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.config = { ...LOG_MANAGER_CONFIG, ...options };
        this.isInitialized = false;
        this.activeLogs = new Map();
        this.logStats = new Map();
        this.scheduledJobs = [];
        this.storageUsage = {
            total: 0,
            used: 0,
            available: 0,
            percentage: 0
        };
        
        this._initialize();
    }

    /**
     * 初始化日志管理器
     */
    async _initialize() {
        try {
            await this._createDirectories();
            await this._loadLogStats();
            await this._startScheduledTasks();
            this.isInitialized = true;
            
            console.log('日志管理器初始化完成');
            this.emit('initialized');
        } catch (error) {
            console.error('日志管理器初始化失败:', error);
            this.emit('error', error);
        }
    }

    /**
     * 创建必要的目录
     */
    async _createDirectories() {
        const dirs = [
            this.config.storage.basePath,
            this.config.storage.archivePath,
            this.config.storage.tempPath,
            this.config.storage.backupPath,
            path.join(this.config.storage.basePath, 'daily'),
            path.join(this.config.storage.basePath, 'audit'),
            path.join(this.config.storage.basePath, 'error'),
            path.join(this.config.storage.basePath, 'access'),
            path.join(this.config.storage.basePath, 'system')
        ];

        for (const dir of dirs) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
            }
        }
    }

    /**
     * 获取或创建日志实例
     */
    getLogInstance(logType, options = {}) {
        if (!this.activeLogs.has(logType)) {
            this.activeLogs.set(logType, new LogInstance(logType, {
                ...this.config,
                ...options
            }));
        }
        return this.activeLogs.get(logType);
    }

    /**
     * 手动轮转日志
     */
    async rotateLog(logType = 'all') {
        try {
            const results = [];
            
            if (logType === 'all') {
                // 轮转所有日志类型
                for (const type of this.config.levels) {
                    const result = await this._rotateLogByType(type);
                    results.push(result);
                }
            } else {
                const result = await this._rotateLogByType(logType);
                results.push(result);
            }

            await this._updateStorageStats();
            
            this.emit('logRotated', { logType, results, timestamp: new Date() });
            
            return {
                success: true,
                message: `日志轮转完成: ${logType}`,
                results,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('日志轮转失败:', error);
            this.emit('rotationError', error);
            throw error;
        }
    }

    /**
     * 按类型轮转日志
     */
    async _rotateLogByType(logType) {
        const logInstance = this.getLogInstance(logType);
        const rotatedFiles = await logInstance.rotate();
        
        // 移动到归档目录
        for (const file of rotatedFiles) {
            await this._archiveLogFile(file, logType);
        }

        return {
            logType,
            rotatedFiles,
            timestamp: new Date()
        };
    }

    /**
     * 归档日志文件
     */
    async _archiveLogFile(filePath, logType) {
        try {
            const fileName = path.basename(filePath);
            const archiveFileName = `${Date.now()}_${fileName}`;
            const archivePath = path.join(this.config.storage.archivePath, logType, archiveFileName);
            
            // 复制到归档目录
            await fs.copyFile(filePath, archivePath);
            
            // 压缩文件
            if (this.config.archive.compressionEnabled) {
                await this._compressFile(archivePath, archivePath + '.gz');
                await fs.unlink(archivePath);
            }

            // 加密文件（如果启用）
            if (this.config.archive.encryptionEnabled) {
                await this._encryptFile(archivePath + '.gz', archivePath + '.gz.enc');
            }

            console.log(`日志文件已归档: ${archivePath}`);
            
        } catch (error) {
            console.error('归档日志文件失败:', error);
        }
    }

    /**
     * 压缩文件
     */
    async _compressFile(sourcePath, targetPath) {
        return new Promise((resolve, reject) => {
            const gzip = zlib.createGzip({ level: 9 });
            const input = fs.createReadStream(sourcePath);
            const output = fs.createWriteStream(targetPath);
            
            input.pipe(gzip).pipe(output);
            
            output.on('finish', () => resolve(targetPath));
            output.on('error', reject);
            input.on('error', reject);
        });
    }

    /**
     * 加密文件
     */
    async _encryptFile(sourcePath, targetPath) {
        return new Promise((resolve, reject) => {
            const cipher = crypto.createCipher('aes-256-cbc', this.config.archive.encryptionKey);
            const input = fs.createReadStream(sourcePath);
            const output = fs.createWriteStream(targetPath);
            
            input.pipe(cipher).pipe(output);
            
            output.on('finish', () => resolve(targetPath));
            output.on('error', reject);
            input.on('error', reject);
        });
    }

    /**
     * 清理过期日志
     */
    async cleanupLogs(logType = 'all') {
        try {
            const results = [];
            
            if (logType === 'all') {
                for (const type of Object.keys(this.config.archive.archiveRetention)) {
                    const result = await this._cleanupLogsByType(type);
                    results.push(result);
                }
            } else {
                const result = await this._cleanupLogsByType(logType);
                results.push(result);
            }

            await this._updateStorageStats();
            
            this.emit('logsCleaned', { logType, results, timestamp: new Date() });
            
            return {
                success: true,
                message: `日志清理完成: ${logType}`,
                results,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('日志清理失败:', error);
            this.emit('cleanupError', error);
            throw error;
        }
    }

    /**
     * 按类型清理日志
     */
    async _cleanupLogsByType(logType) {
        const retentionDays = this.config.archive.archiveRetention[logType];
        if (!retentionDays) {
            throw new Error(`未知的日志类型: ${logType}`);
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const archiveDir = path.join(this.config.storage.archivePath, logType);
        
        try {
            const files = await fs.readdir(archiveDir);
            const deletedFiles = [];
            let freedSpace = 0;

            for (const file of files) {
                const filePath = path.join(archiveDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime < cutoffDate) {
                    const fileSize = stats.size;
                    await fs.unlink(filePath);
                    deletedFiles.push(file);
                    freedSpace += fileSize;
                }
            }

            console.log(`清理了 ${deletedFiles.length} 个过期文件，释放空间: ${freedSpace} 字节`);

            return {
                logType,
                deletedFiles,
                freedSpace,
                timestamp: new Date()
            };
        } catch (error) {
            console.error(`清理 ${logType} 日志失败:`, error);
            throw error;
        }
    }

    /**
     * 搜索日志
     */
    async searchLogs(query, options = {}) {
        const {
            logType = 'all',
            startDate,
            endDate,
            level = 'all',
            maxResults = 1000
        } = options;

        try {
            const results = [];
            
            if (logType === 'all') {
                for (const type of Object.keys(this.config.archive.archiveRetention)) {
                    const typeResults = await this._searchLogsByType(type, query, options);
                    results.push(...typeResults);
                }
            } else {
                const typeResults = await this._searchLogsByType(logType, query, options);
                results.push(...typeResults);
            }

            // 排序和限制结果
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return results.slice(0, maxResults);
        } catch (error) {
            console.error('日志搜索失败:', error);
            throw error;
        }
    }

    /**
     * 按类型搜索日志
     */
    async _searchLogsByType(logType, query, options) {
        const results = [];
        const logDir = path.join(this.config.storage.basePath, logType);
        
        try {
            const files = await fs.readdir(logDir);
            
            for (const file of files) {
                if (file.endsWith('.log') || file.endsWith('.gz')) {
                    const filePath = path.join(logDir, file);
                    const fileResults = await this._searchInFile(filePath, query, options);
                    results.push(...fileResults);
                }
            }
        } catch (error) {
            console.error(`搜索 ${logType} 日志失败:`, error);
        }

        return results;
    }

    /**
     * 在文件中搜索
     */
    async _searchInFile(filePath, query, options) {
        const results = [];
        const { startDate, endDate, level } = options;
        
        try {
            let content;
            
            if (filePath.endsWith('.gz')) {
                // 解压缩文件
                content = await this._decompressFile(filePath);
            } else {
                content = await fs.readFile(filePath, 'utf-8');
            }

            const lines = content.split('\n');
            
            for (const line of lines) {
                if (line.includes(query)) {
                    const logEntry = this._parseLogLine(line);
                    
                    // 日期过滤
                    if (startDate && new Date(logEntry.timestamp) < new Date(startDate)) {
                        continue;
                    }
                    if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) {
                        continue;
                    }
                    
                    // 级别过滤
                    if (level !== 'all' && logEntry.level !== level) {
                        continue;
                    }

                    results.push({
                        ...logEntry,
                        file: path.basename(filePath),
                        matchedLine: line
                    });
                }
            }
        } catch (error) {
            console.error(`搜索文件 ${filePath} 失败:`, error);
        }

        return results;
    }

    /**
     * 解压缩文件
     */
    async _decompressFile(filePath) {
        return new Promise((resolve, reject) => {
            const gunzip = zlib.createGunzip();
            const chunks = [];
            
            fs.createReadStream(filePath)
                .pipe(gunzip)
                .on('data', chunk => chunks.push(chunk))
                .on('finish', () => resolve(Buffer.concat(chunks).toString('utf-8')))
                .on('error', reject);
        });
    }

    /**
     * 解析日志行
     */
    _parseLogLine(line) {
        try {
            // 假设日志格式为: [时间] [级别] [文件] 消息
            const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.+)/);
            
            if (match) {
                return {
                    timestamp: match[1],
                    level: match[2],
                    source: match[3],
                    message: match[4]
                };
            }
            
            return {
                timestamp: new Date().toISOString(),
                level: 'info',
                source: 'unknown',
                message: line
            };
        } catch (error) {
            return {
                timestamp: new Date().toISOString(),
                level: 'info',
                source: 'unknown',
                message: line
            };
        }
    }

    /**
     * 获取日志统计
     */
    async getLogStats() {
        try {
            await this._updateStorageStats();
            
            const stats = {
                storage: this.storageUsage,
                logs: {},
                performance: {},
                timestamp: new Date()
            };

            for (const logType of Object.keys(this.config.archive.archiveRetention)) {
                const typeStats = await this._getLogTypeStats(logType);
                stats.logs[logType] = typeStats;
            }

            return stats;
        } catch (error) {
            console.error('获取日志统计失败:', error);
            throw error;
        }
    }

    /**
     * 获取特定日志类型的统计
     */
    async _getLogTypeStats(logType) {
        const stats = {
            fileCount: 0,
            totalSize: 0,
            newestFile: null,
            oldestFile: null,
            recordCount: 0
        };

        const directories = [
            this.config.storage.basePath,
            this.config.storage.archivePath
        ];

        for (const dir of directories) {
            try {
                const logDir = path.join(dir, logType);
                const files = await fs.readdir(logDir);

                for (const file of files) {
                    const filePath = path.join(logDir, file);
                    const fileStats = await fs.stat(filePath);

                    stats.fileCount++;
                    stats.totalSize += fileStats.size;

                    if (!stats.newestFile || fileStats.mtime > stats.newestFile.mtime) {
                        stats.newestFile = {
                            name: file,
                            mtime: fileStats.mtime,
                            size: fileStats.size
                        };
                    }

                    if (!stats.oldestFile || fileStats.mtime < stats.oldestFile.mtime) {
                        stats.oldestFile = {
                            name: file,
                            mtime: fileStats.mtime,
                            size: fileStats.size
                        };
                    }
                }
            } catch (error) {
                // 忽略不存在的目录
            }
        }

        return stats;
    }

    /**
     * 更新存储统计
     */
    async _updateStorageStats() {
        try {
            const stats = await fs.stat(this.config.storage.basePath);
            
            let totalSize = 0;
            const files = await this._getAllFiles(this.config.storage.basePath);
            
            for (const file of files) {
                try {
                    const fileStats = await fs.stat(file);
                    totalSize += fileStats.size;
                } catch {
                    // 忽略访问错误的文件
                }
            }

            this.storageUsage = {
                total: this.config.storage.maxStorageSize,
                used: totalSize,
                available: this.config.storage.maxStorageSize - totalSize,
                percentage: (totalSize / this.config.storage.maxStorageSize) * 100
            };
        } catch (error) {
            console.error('更新存储统计失败:', error);
        }
    }

    /**
     * 获取所有文件
     */
    async _getAllFiles(dir) {
        const files = [];
        
        try {
            const items = await fs.readdir(dir);
            
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = await fs.stat(itemPath);
                
                if (stats.isDirectory()) {
                    const subFiles = await this._getAllFiles(itemPath);
                    files.push(...subFiles);
                } else {
                    files.push(itemPath);
                }
            }
        } catch (error) {
            // 忽略访问错误的目录
        }

        return files;
    }

    /**
     * 备份日志
     */
    async backupLogs(options = {}) {
        const {
            logType = 'all',
            includeCompressed = true,
            destination = this.config.storage.backupPath
        } = options;

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(destination, `backup-${timestamp}`);
            
            await fs.mkdir(backupDir, { recursive: true });

            const backupInfo = {
                timestamp,
                version: '1.0.0',
                logTypes: [],
                totalFiles: 0,
                totalSize: 0
            };

            if (logType === 'all') {
                for (const type of Object.keys(this.config.archive.archiveRetention)) {
                    const typeInfo = await this._backupLogType(type, backupDir, includeCompressed);
                    backupInfo.logTypes.push(typeInfo);
                    backupInfo.totalFiles += typeInfo.files.length;
                    backupInfo.totalSize += typeInfo.totalSize;
                }
            } else {
                const typeInfo = await this._backupLogType(logType, backupDir, includeCompressed);
                backupInfo.logTypes.push(typeInfo);
                backupInfo.totalFiles += typeInfo.files.length;
                backupInfo.totalSize += typeInfo.totalSize;
            }

            // 创建备份清单
            const manifestPath = path.join(backupDir, 'manifest.json');
            await fs.writeFile(manifestPath, JSON.stringify(backupInfo, null, 2));

            this.emit('logsBackedUp', { backupInfo, timestamp: new Date() });

            return {
                success: true,
                message: '日志备份完成',
                backupInfo,
                backupPath: backupDir
            };
        } catch (error) {
            console.error('日志备份失败:', error);
            throw error;
        }
    }

    /**
     * 备份特定类型的日志
     */
    async _backupLogType(logType, backupDir, includeCompressed) {
        const typeBackupDir = path.join(backupDir, logType);
        await fs.mkdir(typeBackupDir, { recursive: true });

        const backupInfo = {
            logType,
            files: [],
            totalSize: 0
        };

        const sourceDirs = [
            this.config.storage.basePath,
            this.config.storage.archivePath
        ];

        for (const sourceDir of sourceDirs) {
            try {
                const sourcePath = path.join(sourceDir, logType);
                const files = await fs.readdir(sourcePath);

                for (const file of files) {
                    if (!includeCompressed && file.endsWith('.gz')) {
                        continue;
                    }

                    const sourceFile = path.join(sourcePath, file);
                    const destFile = path.join(typeBackupDir, file);
                    
                    await fs.copyFile(sourceFile, destFile);
                    
                    const stats = await fs.stat(sourceFile);
                    backupInfo.files.push({
                        name: file,
                        size: stats.size,
                        mtime: stats.mtime
                    });
                    backupInfo.totalSize += stats.size;
                }
            } catch (error) {
                // 忽略不存在的目录
            }
        }

        return backupInfo;
    }

    /**
     * 恢复日志
     */
    async restoreLogs(backupPath) {
        try {
            const manifestPath = path.join(backupPath, 'manifest.json');
            const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

            const restoreInfo = {
                timestamp: new Date(),
                restoredFiles: 0,
                restoredSize: 0,
                errors: []
            };

            for (const logTypeInfo of manifest.logTypes) {
                try {
                    const sourceDir = path.join(backupPath, logTypeInfo.logType);
                    
                    for (const fileInfo of logTypeInfo.files) {
                        const sourceFile = path.join(sourceDir, fileInfo.name);
                        const destDir = path.join(this.config.storage.basePath, logTypeInfo.logType);
                        const destFile = path.join(destDir, fileInfo.name);

                        await fs.mkdir(destDir, { recursive: true });
                        await fs.copyFile(sourceFile, destFile);

                        restoreInfo.restoredFiles++;
                        restoreInfo.restoredSize += fileInfo.size;
                    }
                } catch (error) {
                    restoreInfo.errors.push({
                        logType: logTypeInfo.logType,
                        error: error.message
                    });
                }
            }

            this.emit('logsRestored', { restoreInfo, timestamp: new Date() });

            return {
                success: true,
                message: '日志恢复完成',
                restoreInfo
            };
        } catch (error) {
            console.error('日志恢复失败:', error);
            throw error;
        }
    }

    /**
     * 启动定时任务
     */
    async _startScheduledTasks() {
        // 这里可以实现cron调度器，目前简化处理
        console.log('定时任务已启动');
    }

    /**
     * 停止定时任务
     */
    async stopScheduledTasks() {
        for (const job of this.scheduledJobs) {
            if (job && typeof job.stop === 'function') {
                job.stop();
            }
        }
        this.scheduledJobs = [];
        console.log('定时任务已停止');
    }

    /**
     * 获取日志管理状态
     */
    async getStatus() {
        await this._updateStorageStats();

        return {
            initialized: this.isInitialized,
            activeLogs: Array.from(this.activeLogs.keys()),
            storage: this.storageUsage,
            config: {
                rotation: this.config.rotation,
                archive: this.config.archive,
                storage: this.config.storage
            },
            timestamp: new Date()
        };
    }

    /**
     * 获取日志文件列表
     */
    async getLogFiles(logType = 'all') {
        try {
            const files = [];

            if (logType === 'all') {
                for (const type of Object.keys(this.config.archive.archiveRetention)) {
                    const typeFiles = await this._getLogFilesByType(type);
                    files.push(...typeFiles);
                }
            } else {
                const typeFiles = await this._getLogFilesByType(logType);
                files.push(...typeFiles);
            }

            return files.sort((a, b) => b.mtime - a.mtime);
        } catch (error) {
            console.error('获取日志文件列表失败:', error);
            throw error;
        }
    }

    /**
     * 获取特定类型的日志文件
     */
    async _getLogFilesByType(logType) {
        const files = [];
        const directories = [
            this.config.storage.basePath,
            this.config.storage.archivePath
        ];

        for (const dir of directories) {
            try {
                const logDir = path.join(dir, logType);
                const dirFiles = await fs.readdir(logDir);

                for (const file of dirFiles) {
                    const filePath = path.join(logDir, file);
                    const stats = await fs.stat(filePath);

                    files.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        mtime: stats.mtime,
                        type: logType,
                        location: dir.includes('archive') ? 'archive' : 'active',
                        compressed: file.endsWith('.gz'),
                        encrypted: file.endsWith('.enc')
                    });
                }
            } catch (error) {
                // 忽略不存在的目录
            }
        }

        return files;
    }

    /**
     * 健康检查
     */
    async healthCheck() {
        const health = {
            status: 'healthy',
            checks: {
                directories: false,
                storage: false,
                permissions: false,
                performance: false
            },
            issues: [],
            timestamp: new Date()
        };

        // 检查目录
        try {
            await this._createDirectories();
            health.checks.directories = true;
        } catch (error) {
            health.issues.push('目录检查失败');
            health.status = 'warning';
        }

        // 检查存储空间
        await this._updateStorageStats();
        if (this.storageUsage.percentage > 90) {
            health.issues.push('存储空间不足');
            health.status = 'warning';
        } else {
            health.checks.storage = true;
        }

        // 检查权限
        try {
            const testFile = path.join(this.config.storage.tempPath, 'health-check.tmp');
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
            health.checks.permissions = true;
        } catch (error) {
            health.issues.push('文件权限问题');
            health.status = 'critical';
        }

        // 性能检查
        try {
            const startTime = Date.now();
            await this._updateStorageStats();
            const endTime = Date.now();
            
            if (endTime - startTime < 5000) { // 5秒内完成
                health.checks.performance = true;
            } else {
                health.issues.push('性能检查超时');
                health.status = 'warning';
            }
        } catch (error) {
            health.issues.push('性能检查失败');
            health.status = 'warning';
        }

        return health;
    }

    /**
     * 加载日志统计
     */
    async _loadLogStats() {
        try {
            const statsFile = path.join(this.config.storage.basePath, 'stats.json');
            const data = JSON.parse(await fs.readFile(statsFile, 'utf-8'));
            this.logStats = new Map(Object.entries(data));
        } catch (error) {
            // 忽略统计文件不存在的情况
            this.logStats = new Map();
        }
    }

    /**
     * 保存日志统计
     */
    async _saveLogStats() {
        try {
            const statsFile = path.join(this.config.storage.basePath, 'stats.json');
            const data = Object.fromEntries(this.logStats);
            await fs.writeFile(statsFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('保存日志统计失败:', error);
        }
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            await this.stopScheduledTasks();
            await this._saveLogStats();
            
            // 关闭所有日志实例
            for (const [type, instance] of this.activeLogs) {
                if (instance && typeof instance.close === 'function') {
                    await instance.close();
                }
            }
            
            this.activeLogs.clear();
            this.isInitialized = false;
            
            console.log('日志管理器已清理');
            this.emit('cleanup');
        } catch (error) {
            console.error('日志管理器清理失败:', error);
        }
    }
}

/**
 * 日志实例类
 */
class LogInstance {
    constructor(logType, config) {
        this.logType = logType;
        this.config = config;
        this.currentFile = null;
        this.fileSize = 0;
        this.recordCount = 0;
        this.lastRotation = null;
    }

    /**
     * 轮转日志文件
     */
    async rotate() {
        const rotatedFiles = [];
        
        try {
            if (this.currentFile) {
                const rotatedFile = this.currentFile + `.${Date.now()}.rotated`;
                await fs.rename(this.currentFile, rotatedFile);
                rotatedFiles.push(rotatedFile);
            }

            // 创建新的日志文件
            const date = new Date().toISOString().split('T')[0];
            this.currentFile = path.join(this.config.storage.basePath, this.logType, `${date}.log`);
            
            await fs.mkdir(path.dirname(this.currentFile), { recursive: true });
            await fs.writeFile(this.currentFile, '');

            this.fileSize = 0;
            this.recordCount = 0;
            this.lastRotation = new Date();

            console.log(`${this.logType} 日志文件已轮转`);
            return rotatedFiles;
        } catch (error) {
            console.error(`${this.logType} 日志轮转失败:`, error);
            throw error;
        }
    }

    /**
     * 关闭日志实例
     */
    async close() {
        if (this.currentFile) {
            await this.rotate();
        }
    }
}

/**
 * 创建日志管理器实例
 */
function createLogManager(options = {}) {
    return new LogManager(options);
}

module.exports = {
    LogManager,
    createLogManager,
    LOG_MANAGER_CONFIG
};