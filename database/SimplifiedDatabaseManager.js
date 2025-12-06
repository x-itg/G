const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {promisify} = require('util');

/**
 * 简化数据库管理器 - 使用JSON文件存储
 * CFR 21 Part 11 兼容的审计追踪和权限管理系统
 */
class SimplifiedDatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, 'database');
        this.dataPath = path.join(this.dbPath, 'data');
        this.lockDir = path.join(this.dbPath, '.locks');
        this.ensureDirectories();
        this.writeLocks = new Map(); // 存储文件锁
        this.lockQueue = new Map(); // 锁等待队列
    }
    
    /**
     * 初始化错误处理系统
     */
    async initializeErrorHandling() {
        try {
            this.errorSystem = ErrorLoggingSystem.getInstance({
                dbManager: this,
                logPath: path.join(__dirname, '../logging/data')
            });
            await this.errorSystem.initialize();
            
            // 记录数据库管理器启动
            await this.logError({
                level: 'info',
                message: '数据库管理器初始化完成',
                source: 'database',
                code: 'DB_MANAGER_INITIALIZED',
                context: {
                    dbPath: this.dbPath,
                    dataPath: this.dataPath
                }
            });
        } catch (error) {
            console.error('❌ 数据库错误处理系统初始化失败:', error);
        }
    }
    
    /**
     * 记录错误日志
     */
    async logError(errorData) {
        if (this.errorSystem) {
            return await this.errorSystem.logError(errorData);
        }
        console.error('错误日志记录:', errorData);
        return null;
    }

    ensureDirectories() {
        if (!fs.existsSync(this.dbPath)) {
            fs.mkdirSync(this.dbPath, { recursive: true });
        }
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
        if (!fs.existsSync(this.lockDir)) {
            fs.mkdirSync(this.lockDir, { recursive: true });
        }
    }

    // 获取文件锁
    async acquireLock(tableName, timeout = 5000) {
        const lockFile = path.join(this.lockDir, `${tableName}.lock`);
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                // 尝试创建锁文件
                await promisify(fs.open)(lockFile, 'wx');
                
                // 获取锁成功
                this.writeLocks.set(tableName, {
                    lockFile,
                    acquiredAt: Date.now()
                });
                return true;
            } catch (error) {
                if (error.code === 'EEXIST') {
                    // 锁文件已存在，等待
                    await new Promise(resolve => setTimeout(resolve, 50));
                } else {
                    // 记录锁获取错误
                    await this.logError({
                        level: 'error',
                        message: `获取表 ${tableName} 的锁时发生错误: ${error.message}`,
                        stack: error.stack,
                        source: 'database',
                        code: 'LOCK_ACQUIRE_ERROR',
                        context: {
                            tableName,
                            timeout,
                            errorCode: error.code
                        }
                    });
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
        }
        
        // 超时
        const timeoutError = `获取表 ${tableName} 的锁超时`;
        console.warn(timeoutError);
        await this.logError({
            level: 'warning',
            message: timeoutError,
            source: 'database',
            code: 'LOCK_TIMEOUT',
            context: {
                tableName,
                timeout,
                elapsedTime: Date.now() - startTime
            }
        });
        return false;
    }

    // 释放文件锁
    async releaseLock(tableName) {
        const lockInfo = this.writeLocks.get(tableName);
        if (lockInfo) {
            try {
                await promisify(fs.unlink)(lockInfo.lockFile);
                this.writeLocks.delete(tableName);
                return true;
            } catch (error) {
                const errorMsg = `释放表 ${tableName} 的锁失败: ${error.message}`;
                console.error(errorMsg);
                await this.logError({
                    level: 'error',
                    message: errorMsg,
                    stack: error.stack,
                    source: 'database',
                    code: 'LOCK_RELEASE_FAILED',
                    context: {
                        tableName,
                        lockFile: lockInfo.lockFile,
                        errorCode: error.code
                    }
                });
                return false;
            }
        }
        return true;
    }

    // 原子性写入文件
    async atomicWrite(filePath, data) {
        const tempPath = `${filePath}.tmp`;
        const content = JSON.stringify(data, null, 2);
        
        try {
            // 先写入临时文件
            await promisify(fs.writeFile)(tempPath, content, 'utf8');
            
            // 原子性地重命名文件
            await promisify(fs.rename)(tempPath, filePath);
            
            return true;
        } catch (error) {
            // 清理临时文件
            try {
                await promisify(fs.unlink)(tempPath);
            } catch (cleanupError) {
                console.warn('清理临时文件失败:', cleanupError.message);
            }
            
            console.error('原子写入失败:', error);
            return false;
        }
    }

    initialize() {
        try {
            console.log('🔄 初始化简化数据库...');
            
            // 创建默认数据结构
            this.createDefaultData();
            
            console.log('✅ 简化数据库初始化完成');
        } catch (error) {
            console.error('❌ 数据库初始化失败:', error);
            throw error;
        }
    }

    createDefaultData() {
        // 初始化各个表的数据文件
        const tables = ['users', 'user_permissions', 'audit_logs', 'performance_metrics', 'electronic_signatures'];
        
        tables.forEach(table => {
            const tablePath = path.join(this.dataPath, `${table}.json`);
            if (!fs.existsSync(tablePath)) {
                fs.writeFileSync(tablePath, JSON.stringify([], null, 2));
            }
        });
    }

    // 通用数据操作方法 - 同步版本防止并发问题
    readTable(tableName) {
        const tablePath = path.join(this.dataPath, `${tableName}.json`);
        const maxRetries = 3;
        let lastError = null;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                if (fs.existsSync(tablePath)) {
                    // 等待文件写入完成
                    const data = fs.readFileSync(tablePath, 'utf8');
                    if (!data || data.trim() === '') {
                        return [];
                    }
                    return JSON.parse(data);
                }
                return [];
            } catch (error) {
                lastError = error;
                if (error.message.includes('Unexpected end of JSON input') || 
                    error.message.includes('Unexpected token')) {
                    // JSON文件损坏，尝试从备份恢复
                    console.warn(`JSON文件损坏，尝试恢复表 ${tableName}`);
                    this.recoverCorruptedTableSync(tableName);
                    if (i === maxRetries - 1) break;
                } else {
                    break;
                }
            }
        }
        
        const errorMsg = `读取表 ${tableName} 失败: ${lastError?.message || 'Unknown error'}`;
        console.error(errorMsg);
        this.logError({
            level: 'error',
            message: errorMsg,
            stack: lastError?.stack,
            source: 'database',
            code: 'READ_TABLE_FAILED',
            context: {
                tableName,
                tablePath,
                retryCount: maxRetries
            }
        });
        return [];
    }

    // 同步版本的数据恢复
    recoverCorruptedTableSync(tableName) {
        const tablePath = path.join(this.dataPath, `${tableName}.json`);
        const backupPath = path.join(this.dataPath, `${tableName}.backup.json`);
        
        try {
            if (fs.existsSync(backupPath)) {
                const backupData = fs.readFileSync(backupPath, 'utf8');
                const validData = JSON.parse(backupData);
                fs.writeFileSync(tablePath, JSON.stringify(validData, null, 2));
                console.log(`从备份恢复表 ${tableName} 成功`);
                return true;
            }
        } catch (error) {
            console.error(`从备份恢复表 ${tableName} 失败:`, error);
        }
        
        // 如果备份恢复失败，创建空表
        try {
            fs.writeFileSync(tablePath, JSON.stringify([], null, 2));
            console.log(`重新创建表 ${tableName}`);
            return true;
        } catch (error) {
            console.error(`重新创建表 ${tableName} 失败:`, error);
            return false;
        }
    }

    // 恢复损坏的表
    async recoverCorruptedTable(tableName) {
        const tablePath = path.join(this.dataPath, `${tableName}.json`);
        const backupPath = path.join(this.dataPath, `${tableName}.backup.json`);
        
        try {
            if (fs.existsSync(backupPath)) {
                const backupData = fs.readFileSync(backupPath, 'utf8');
                const validData = JSON.parse(backupData);
                fs.writeFileSync(tablePath, JSON.stringify(validData, null, 2));
                console.log(`从备份恢复表 ${tableName} 成功`);
                return true;
            }
        } catch (error) {
            console.error(`从备份恢复表 ${tableName} 失败:`, error);
        }
        
        // 如果备份恢复失败，创建空表
        try {
            fs.writeFileSync(tablePath, JSON.stringify([], null, 2));
            console.log(`重新创建表 ${tableName}`);
            return true;
        } catch (error) {
            console.error(`重新创建表 ${tableName} 失败:`, error);
            return false;
        }
    }

    async writeTable(tableName, data) {
        const tablePath = path.join(this.dataPath, `${tableName}.json`);
        
        try {
            // 获取写锁
            const lockAcquired = await this.acquireLock(tableName);
            if (!lockAcquired) {
                const errorMsg = `无法获取表 ${tableName} 的写锁`;
                const lockError = new Error(errorMsg);
                await this.logError({
                    level: 'error',
                    message: errorMsg,
                    stack: lockError.stack,
                    source: 'database',
                    code: 'LOCK_ACQUIRE_FAILED',
                    context: {
                        tableName,
                        tablePath,
                        dataSize: data?.length || 0
                    }
                });
                throw lockError;
            }
            
            try {
                // 创建备份
                if (fs.existsSync(tablePath)) {
                    const backupPath = path.join(this.dataPath, `${tableName}.backup.json`);
                    await this.atomicWrite(backupPath, data);
                }
                
                // 原子性写入
                const success = await this.atomicWrite(tablePath, data);
                if (!success) {
                    throw new Error(`原子性写入失败: ${tablePath}`);
                }
                return success;
            } finally {
                // 释放锁
                await this.releaseLock(tableName);
            }
        } catch (error) {
            const errorMsg = `写入表 ${tableName} 失败: ${error.message}`;
            console.error(errorMsg);
            await this.logError({
                level: 'error',
                message: errorMsg,
                stack: error.stack,
                source: 'database',
                code: 'WRITE_TABLE_FAILED',
                context: {
                    tableName,
                    tablePath,
                    dataSize: data?.length || 0
                }
            });
            return false;
        }
    }

    async addRecord(tableName, record) {
        const data = await this.readTable(tableName);
        const id = record.id || crypto.randomUUID();
        const newRecord = { ...record, id, created_at: new Date().toISOString() };
        data.push(newRecord);
        await this.writeTable(tableName, data);
        return id;
    }

    async updateRecord(tableName, id, updates) {
        const data = await this.readTable(tableName);
        const index = data.findIndex(record => record.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updates, updated_at: new Date().toISOString() };
            await this.writeTable(tableName, data);
            return true;
        }
        return false;
    }

    getRecord(tableName, id) {
        const data = this.readTable(tableName);
        return data.find(record => record.id === id);
    }

    getRecords(tableName, filter = {}) {
        const data = this.readTable(tableName);
        return data.filter(record => {
            return Object.keys(filter).every(key => {
                return record[key] === filter[key];
            });
        });
    }

    // 用户管理方法
    createUser(userData) {
        const id = crypto.randomUUID();
        const salt = crypto.randomBytes(32).toString('hex');
        const hash = crypto.pbkdf2Sync(
            userData.password,
            salt,
            10000,
            512,
            'sha512'
        ).toString('hex');
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);

        const user = {
            id,
            username: userData.username,
            password_hash: hash,
            password_salt: salt,
            password_expiry: expiryDate.toISOString(),
            full_name: userData.fullName,
            title: userData.title,
            department: userData.department,
            role: userData.role,
            is_active: true,
            is_locked: false,
            must_change_password: userData.mustChangePassword || false,
            created_at: new Date().toISOString()
        };

        this.addRecord('users', user);
        return user;
    }

    getUserByUsername(username) {
        const users = this.readTable('users');
        return users.find(user => user.username === username);
    }

    getUserById(id) {
        const users = this.readTable('users');
        return users.find(user => user.id === id);
    }

    // 审计日志管理方法（CFR 21 Part 11）
    logAuditEvent(auditData) {
        return this.addRecord('audit_logs', {
            user_id: auditData.userId,
            username: auditData.username,
            action: auditData.action,
            resource: auditData.resource,
            resource_id: auditData.resourceId,
            old_values: auditData.oldValues ? JSON.stringify(auditData.oldValues) : null,
            new_values: auditData.newValues ? JSON.stringify(auditData.newValues) : null,
            result: auditData.result || 'SUCCESS',
            ip_address: auditData.ipAddress,
            user_agent: auditData.userAgent,
            session_id: auditData.sessionId,
            timestamp: new Date().toISOString(),
            signature_required: auditData.signatureRequired || false,
            electronic_signature_id: auditData.electronicSignatureId,
            compliance_code: auditData.complianceCode,
            reason: auditData.reason,
            details: auditData.details
        });
    }

    getAuditEvents(filters = {}) {
        let events = this.readTable('audit_logs');

        // 应用过滤器
        if (filters.userId) {
            events = events.filter(event => event.user_id === filters.userId);
        }
        if (filters.action) {
            events = events.filter(event => event.action === filters.action);
        }
        if (filters.resource) {
            events = events.filter(event => event.resource === filters.resource);
        }
        if (filters.result) {
            events = events.filter(event => event.result === filters.result);
        }
        if (filters.startDate) {
            events = events.filter(event => event.timestamp >= filters.startDate);
        }
        if (filters.endDate) {
            events = events.filter(event => event.timestamp <= filters.endDate);
        }

        // 排序和限制
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (filters.limit) {
            events = events.slice(0, filters.limit);
        }

        return events;
    }

    // 性能指标管理方法
    recordPerformanceMetric(metricData) {
        return this.addRecord('performance_metrics', {
            metric_type: metricData.metricType,
            metric_name: metricData.metricName,
            value: metricData.value,
            unit: metricData.unit,
            tags: metricData.tags,
            source: metricData.source,
            timestamp: metricData.timestamp || new Date().toISOString(),
            alert_level: metricData.alertLevel || 'NORMAL',
            threshold_warning: metricData.thresholdWarning,
            threshold_critical: metricData.thresholdCritical,
            metadata: metricData.metadata
        });
    }

    getPerformanceMetrics(filters = {}) {
        let metrics = this.readTable('performance_metrics');

        if (filters.metricType) {
            metrics = metrics.filter(metric => metric.metric_type === filters.metricType);
        }
        if (filters.metricName) {
            metrics = metrics.filter(metric => metric.metric_name === filters.metricName);
        }
        if (filters.alertLevel) {
            metrics = metrics.filter(metric => metric.alert_level === filters.alertLevel);
        }
        if (filters.startDate) {
            metrics = metrics.filter(metric => metric.timestamp >= filters.startDate);
        }
        if (filters.endDate) {
            metrics = metrics.filter(metric => metric.timestamp <= filters.endDate);
        }

        metrics.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (filters.limit) {
            metrics = metrics.slice(0, filters.limit);
        }

        return metrics;
    }

    getSystemPerformanceSummary() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recentMetrics = this.getPerformanceMetrics({ startDate: oneHourAgo });

        return {
            cpu_usage: this.calculateAverage(recentMetrics, 'cpu_usage'),
            memory_usage: this.calculateAverage(recentMetrics, 'memory_usage'),
            api_response_time: this.calculateAverage(recentMetrics, 'api_response_time'),
            active_alerts: recentMetrics.filter(m => m.alert_level === 'WARNING' || m.alert_level === 'CRITICAL').length
        };
    }

    calculateAverage(metrics, metricName) {
        const relevantMetrics = metrics.filter(m => m.metric_name === metricName);
        if (relevantMetrics.length === 0) return 0;
        const sum = relevantMetrics.reduce((acc, m) => acc + parseFloat(m.value), 0);
        return sum / relevantMetrics.length;
    }

    // 用户权限管理方法（三级权限）
    grantUserPermission(permissionData) {
        return this.addRecord('user_permissions', {
            user_id: permissionData.userId,
            permission_level: permissionData.permissionLevel,
            permission_name: permissionData.permissionName,
            resource: permissionData.resource,
            action: permissionData.action,
            granted_by: permissionData.grantedBy,
            granted_at: new Date().toISOString(),
            expires_at: permissionData.expiresAt,
            conditions: permissionData.conditions ? JSON.stringify(permissionData.conditions) : null,
            is_active: true
        });
    }

    checkUserPermission(userId, resource, action) {
        const permissions = this.readTable('user_permissions');
        return permissions.find(permission => 
            permission.user_id === userId && 
            permission.resource === resource && 
            permission.action === action && 
            permission.is_active &&
            (!permission.expires_at || new Date(permission.expires_at) > new Date())
        );
    }

    getUserPermissions(userId) {
        const permissions = this.readTable('user_permissions');
        return permissions
            .filter(permission => permission.user_id === userId && permission.is_active)
            .sort((a, b) => b.permission_level - a.permission_level);
    }

    getUserPermissionLevel(userId, resource) {
        const permissions = this.readTable('user_permissions');
        const relevantPermissions = permissions.filter(permission => 
            permission.user_id === userId && 
            permission.resource === resource && 
            permission.is_active &&
            (!permission.expires_at || new Date(permission.expires_at) > new Date())
        );
        
        if (relevantPermissions.length === 0) return 0;
        return Math.max(...relevantPermissions.map(p => p.permission_level));
    }

    // 电子签名管理方法（CFR 21 Part 11兼容）
    createElectronicSignature(signatureData) {
        // 生成数字签名哈希
        const signatureContent = JSON.stringify({
            userId: signatureData.userId,
            entityType: signatureData.entityType,
            entityId: signatureData.entityId,
            action: signatureData.action,
            reason: signatureData.reason,
            timestamp: new Date().toISOString()
        });
        const digitalSignature = crypto.createHash('sha256').update(signatureContent).digest('hex');

        return this.addRecord('electronic_signatures', {
            user_id: signatureData.userId,
            entity_type: signatureData.entityType,
            entity_id: signatureData.entityId,
            action: signatureData.action,
            reason: signatureData.reason,
            comment: signatureData.comment,
            user_full_name: signatureData.userFullName,
            user_title: signatureData.userTitle,
            user_department: signatureData.userDepartment,
            signed_at: new Date().toISOString(),
            digital_signature: digitalSignature,
            ip_address: signatureData.ipAddress,
            user_agent: signatureData.userAgent,
            second_factor_verified: signatureData.secondFactorVerified || false
        });
    }

    verifyElectronicSignature(signatureId) {
        const signature = this.getRecord('electronic_signatures', signatureId);

        if (!signature) {
            return { valid: false, reason: '签名不存在' };
        }

        // 验证签名哈希
        const expectedSignature = crypto.createHash('sha256').update(JSON.stringify({
            userId: signature.user_id,
            entityType: signature.entity_type,
            entityId: signature.entity_id,
            action: signature.action,
            reason: signature.reason,
            timestamp: signature.signed_at
        })).digest('hex');

        const isValid = signature.digital_signature === expectedSignature;
        
        return {
            valid: isValid,
            signature: signature,
            reason: isValid ? '签名验证成功' : '签名验证失败'
        };
    }

    // 数据库统计信息
    getDatabaseStats() {
        const tables = ['users', 'user_permissions', 'audit_logs', 'performance_metrics', 'electronic_signatures'];
        const stats = { tables: {}, total_records: 0 };

        tables.forEach(table => {
            const data = this.readTable(table);
            stats.tables[table] = data.length;
            stats.total_records += data.length;
        });

        return stats;
    }

    /**
     * 获取错误日志
     */
    getErrorLogs(filters = {}) {
        if (this.errorSystem) {
            return this.errorSystem.getErrorLogs(filters);
        }
        return [];
    }
    
    /**
     * 获取错误统计
     */
    getErrorStatistics(filters = {}) {
        if (this.errorSystem) {
            return this.errorSystem.getErrorStatistics(filters);
        }
        return {
            total: 0,
            by_level: {},
            by_source: {},
            resolved: 0,
            unresolved: 0
        };
    }
    
    /**
     * 标记错误为已解决
     */
    async resolveError(errorId, resolvedBy, resolution = '') {
        if (this.errorSystem) {
            return await this.errorSystem.resolveError(errorId, resolvedBy, resolution);
        }
        return false;
    }
    
    /**
     * 创建测试错误
     */
    async createTestError(type = 'error') {
        if (this.errorSystem) {
            return await this.errorSystem.createTestError(type);
        }
        return null;
    }
    
    /**
     * 运行数据库诊断
     */
    async runDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            database: {
                path: this.dbPath,
                dataPath: this.dataPath,
                lockDir: this.lockDir,
                activeLocks: Array.from(this.writeLocks.keys()),
                tables: []
            },
            errorSystem: {
                available: !!this.errorSystem,
                initialized: this.errorSystem?.isInitialized || false
            }
        };
        
        // 检查数据表
        try {
            const files = fs.readdirSync(this.dataPath);
            diagnostics.database.tables = files
                .filter(file => file.endsWith('.json'))
                .map(file => {
                    const filePath = path.join(this.dataPath, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file.replace('.json', ''),
                        size: stats.size,
                        modified: stats.mtime.toISOString()
                    };
                });
        } catch (error) {
            diagnostics.database.error = error.message;
        }
        
        // 如果错误系统可用，添加错误统计
        if (this.errorSystem) {
            diagnostics.errorStatistics = this.getErrorStatistics();
        }
        
        return diagnostics;
    }
    
    /**
     * 关闭连接
     */
    async close() {
        try {
            // 记录关闭事件
            await this.logError({
                level: 'info',
                message: '数据库管理器关闭',
                source: 'database',
                code: 'DB_MANAGER_SHUTDOWN',
                context: {
                    activeLocks: Array.from(this.writeLocks.keys())
                }
            });
            
            // 关闭错误系统
            if (this.errorSystem) {
                await this.errorSystem.shutdown();
            }
            
            console.log('简化数据库连接已关闭');
        } catch (error) {
            console.error('关闭数据库时发生错误:', error);
        }
    }
}

module.exports = SimplifiedDatabaseManager;