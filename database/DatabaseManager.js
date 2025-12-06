const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '..', 'database', 'radiation_detector.db');
        this.statements = new Map();
    }

    initialize() {
        try {
            // 确保数据库目录存在
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // 打开数据库连接（better-sqlite3是同步的）
            this.db = new Database(this.dbPath, { 
                verbose: console.log,
                fileMustExist: false
            });

            console.log('数据库连接成功');

            // 启用外键约束
            this.runQuery('PRAGMA foreign_keys = ON');
            
            // 启用审计模式
            this.runQuery('PRAGMA journal_mode = WAL');
            
            // 创建所有表
            this.createTables();
            
            // 创建索引
            this.createIndexes();
            
            // 预编译常用语句
            this.prepareStatements();

        } catch (error) {
            console.error('数据库初始化失败:', error);
            throw error;
        }
    }

    prepareStatements() {
        try {
            // 用户查询语句
            this.statements.getUserByUsername = this.db.prepare(
                'SELECT * FROM users WHERE username = ? AND deleted_at IS NULL'
            );
            
            this.statements.getUserById = this.db.prepare(
                'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL'
            );
            
            this.statements.insertUser = this.db.prepare(`
                INSERT INTO users (
                    id, username, password_hash, password_salt, password_expiry,
                    full_name, title, department, role, must_change_password
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            this.statements.updateUser = this.db.prepare(`
                UPDATE users SET 
                    full_name = COALESCE(?, full_name),
                    title = COALESCE(?, title),
                    department = COALESCE(?, department),
                    role = COALESCE(?, role),
                    is_active = COALESCE(?, is_active),
                    is_locked = COALESCE(?, is_locked),
                    must_change_password = COALESCE(?, must_change_password),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);

            // 分析相关语句
            this.statements.insertAnalysis = this.db.prepare(`
                INSERT INTO analyses (
                    id, analysis_name, analysis_type, sample_id, operator_id,
                    status, start_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            this.statements.insertAnalysisData = this.db.prepare(`
                INSERT INTO analysis_data (
                    id, analysis_id, position, count_rate, background_rate,
                    net_count_rate, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            this.statements.updateAnalysis = this.db.prepare(`
                UPDATE analyses SET 
                    status = COALESCE(?, status),
                    end_time = COALESCE(?, end_time),
                    total_counts = COALESCE(?, total_counts),
                    peak_area = COALESCE(?, peak_area),
                    background_area = COALESCE(?, background_area),
                    rf_value = COALESCE(?, rf_value),
                    purity_percentage = COALESCE(?, purity_percentage),
                    comments = COALESCE(?, comments),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);

            // 审计追踪语句
            this.statements.insertAuditTrail = this.db.prepare(`
                INSERT INTO audit_trail (
                    id, action, entity_type, entity_id, old_values, new_values,
                    signed_by, signature_reason, signature_comment, ip_address,
                    user_agent, timestamp, previous_hash, current_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            console.log('预编译语句准备完成');
        } catch (error) {
            console.error('预编译语句失败:', error);
            throw error;
        }
    }

    createTables() {
        // 用户表（CFR 21 Part 11兼容）
        this.runQuery(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                password_expiry DATE NOT NULL,
                full_name TEXT NOT NULL,
                title TEXT,
                department TEXT,
                role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SUPERVISOR', 'OPERATOR')),
                is_active BOOLEAN DEFAULT 1,
                is_locked BOOLEAN DEFAULT 0,
                failed_login_attempts INTEGER DEFAULT 0,
                last_login_attempt DATETIME,
                must_change_password BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME
            )
        `);

        // 电子签名表
        this.runQuery(`
            CREATE TABLE IF NOT EXISTS electronic_signatures (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                reason TEXT NOT NULL,
                comment TEXT,
                user_full_name TEXT NOT NULL,
                user_title TEXT,
                user_department TEXT,
                signed_at DATETIME NOT NULL,
                digital_signature TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                second_factor_verified BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // 审计日志表（CFR 21 Part 11兼容）
        this.runQuery(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                username TEXT NOT NULL,
                action TEXT NOT NULL,
                resource TEXT NOT NULL,
                resource_id TEXT,
                old_values TEXT,
                new_values TEXT,
                result TEXT CHECK (result IN ('SUCCESS', 'FAILURE', 'WARNING')),
                ip_address TEXT,
                user_agent TEXT,
                session_id TEXT,
                timestamp DATETIME NOT NULL,
                signature_required BOOLEAN DEFAULT 0,
                electronic_signature_id TEXT,
                compliance_code TEXT,
                reason TEXT,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (electronic_signature_id) REFERENCES electronic_signatures (id)
            )
        `);

        // 性能指标表
        this.runQuery(`
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id TEXT PRIMARY KEY,
                metric_type TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT,
                tags TEXT,
                source TEXT,
                timestamp DATETIME NOT NULL,
                alert_level TEXT CHECK (alert_level IN ('NORMAL', 'WARNING', 'CRITICAL')),
                threshold_warning REAL,
                threshold_critical REAL,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 用户权限表（三级权限体系）
        this.runQuery(`
            CREATE TABLE IF NOT EXISTS user_permissions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                permission_level INTEGER NOT NULL CHECK (permission_level IN (1, 2, 3)),
                permission_name TEXT NOT NULL,
                resource TEXT NOT NULL,
                action TEXT NOT NULL,
                granted_by TEXT NOT NULL,
                granted_at DATETIME NOT NULL,
                expires_at DATETIME,
                conditions TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (granted_by) REFERENCES users (id)
            )
        `);

        // 审计追踪表（不可变，用于哈希链验证）
        this.runQuery(`
            CREATE TABLE IF NOT EXISTS audit_trail (
                id TEXT PRIMARY KEY,
                action TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                old_values TEXT,
                new_values TEXT,
                signed_by TEXT,
                signature_reason TEXT,
                signature_comment TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp DATETIME NOT NULL,
                previous_hash TEXT,
                current_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (signed_by) REFERENCES users (id)
            )
        `);

        // 检测数据表
        this.runQuery(`
            CREATE TABLE IF NOT EXISTS analysis_data (
                id TEXT PRIMARY KEY,
                analysis_id TEXT NOT NULL,
                position REAL NOT NULL,
                count_rate REAL NOT NULL,
                background_rate REAL DEFAULT 0,
                net_count_rate REAL NOT NULL,
                timestamp DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (analysis_id) REFERENCES analyses (id)
            )
        `);

        // 分析记录表
        this.runQuery(`
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                analysis_name TEXT NOT NULL,
                analysis_type TEXT NOT NULL,
                sample_id TEXT,
                operator_id TEXT NOT NULL,
                supervisor_id TEXT,
                status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED')),
                start_time DATETIME NOT NULL,
                end_time DATETIME,
                total_counts REAL DEFAULT 0,
                peak_area REAL DEFAULT 0,
                background_area REAL DEFAULT 0,
                rf_value REAL,
                purity_percentage REAL,
                comments TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME,
                FOREIGN KEY (operator_id) REFERENCES users (id),
                FOREIGN KEY (supervisor_id) REFERENCES users (id)
            )
        `);

        // 设备配置表
        this.runQuery(`
            CREATE TABLE IF NOT EXISTS device_configs (
                id TEXT PRIMARY KEY,
                device_name TEXT NOT NULL,
                device_type TEXT NOT NULL,
                com_port TEXT NOT NULL,
                baud_rate INTEGER DEFAULT 9600,
                data_bits INTEGER DEFAULT 8,
                parity TEXT DEFAULT 'none',
                stop_bits INTEGER DEFAULT 1,
                is_active BOOLEAN DEFAULT 1,
                calibration_date DATE,
                calibration_due_date DATE,
                created_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        `);

        // 串口参数表
        this.runQuery(`
            CREATE TABLE IF NOT EXISTS serial_configs (
                id TEXT PRIMARY KEY,
                port_name TEXT NOT NULL,
                baud_rate INTEGER NOT NULL,
                data_bits INTEGER NOT NULL,
                parity TEXT NOT NULL,
                stop_bits INTEGER NOT NULL,
                flow_control TEXT DEFAULT 'none',
                is_active BOOLEAN DEFAULT 1,
                created_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        `);

        console.log('表创建完成');
    }

    createIndexes() {
        try {
            // 审计日志索引（高性能查询）
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, username)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result)');
            
            // 性能指标索引
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_performance_type ON performance_metrics(metric_type, timestamp)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_performance_name ON performance_metrics(metric_name)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON performance_metrics(timestamp)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_performance_alert ON performance_metrics(alert_level)');
            
            // 用户权限索引
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_permissions_user ON user_permissions(user_id)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_permissions_level ON user_permissions(permission_level)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_permissions_resource ON user_permissions(resource, action)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_permissions_active ON user_permissions(is_active)');
            
            // 审计追踪索引（按时间排序）
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_trail(timestamp)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_trail(entity_type, entity_id)');
            
            // 用户索引
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
            
            // 分析数据索引
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_analysis_position ON analysis_data(position)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_analysis_timestamp ON analysis_data(timestamp)');
            
            // 设备配置索引
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_device_active ON device_configs(is_active)');
            this.runQuery('CREATE INDEX IF NOT EXISTS idx_serial_active ON serial_configs(is_active)');
            
            console.log('索引创建完成');
        } catch (error) {
            console.error('索引创建失败:', error);
            throw error;
        }
    }

    runQuery(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...params);
            return result;
        } catch (error) {
            console.error('SQL查询失败:', error);
            throw error;
        }
    }

    getQuery(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            const row = stmt.get(...params);
            return row;
        } catch (error) {
            console.error('SQL查询失败:', error);
            throw error;
        }
    }

    allQuery(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            const rows = stmt.all(...params);
            return rows;
        } catch (error) {
            console.error('SQL查询失败:', error);
            throw error;
        }
    }

    // 用户管理方法
    async checkUserExists(username) {
        try {
            const user = this.getQuery(
                'SELECT id FROM users WHERE username = ? AND deleted_at IS NULL',
                [username]
            );
            return !!user;
        } catch (error) {
            console.error('检查用户是否存在失败:', error);
            throw error;
        }
    }

    async createUser(userData) {
        try {
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
            expiryDate.setDate(expiryDate.getDate() + 90); // 90天后过期

            this.statements.insertUser.run(
                id, userData.username, hash, salt, expiryDate.toISOString(),
                userData.fullName, userData.title, userData.department, userData.role,
                userData.mustChangePassword || false
            );

            return this.getUserById(id);
        } catch (error) {
            console.error('创建用户失败:', error);
            throw error;
        }
    }

    getUserById(id) {
        try {
            return this.statements.getUserById.get(id);
        } catch (error) {
            console.error('获取用户失败:', error);
            throw error;
        }
    }

    getUserByUsername(username) {
        try {
            return this.statements.getUserByUsername.get(username);
        } catch (error) {
            console.error('获取用户失败:', error);
            throw error;
        }
    }

    getAllUsers() {
        try {
            return this.allQuery(`
                SELECT id, username, full_name, title, department, role, 
                       is_active, is_locked, failed_login_attempts, created_at
                FROM users WHERE deleted_at IS NULL
                ORDER BY created_at DESC
            `);
        } catch (error) {
            console.error('获取用户列表失败:', error);
            throw error;
        }
    }

    deleteUser(userId) {
        try {
            // 软删除
            this.runQuery(
                'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
                [userId]
            );
        } catch (error) {
            console.error('删除用户失败:', error);
            throw error;
        }
    }

    updateUser(userId, updateData) {
        try {
            const allowedFields = [
                'full_name', 'title', 'department', 'role', 
                'is_active', 'is_locked', 'must_change_password'
            ];
            
            const updates = [];
            const values = [];
            
            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key)) {
                    updates.push(`?`);
                    values.push(value);
                }
            }
            
            if (updates.length === 0) return false;
            
            values.push(userId);
            const result = this.statements.updateUser.run(...values);
            
            return result.changes > 0;
        } catch (error) {
            console.error('更新用户失败:', error);
            throw error;
        }
    }

    // 分析数据管理
    saveAnalysis(analysisData) {
        try {
            const id = crypto.randomUUID();
            
            this.statements.insertAnalysis.run(
                id, analysisData.analysisName, analysisData.analysisType,
                analysisData.sampleId, analysisData.userId, 'IN_PROGRESS',
                new Date().toISOString()
            );

            return this.getAnalysisById(id);
        } catch (error) {
            console.error('保存分析失败:', error);
            throw error;
        }
    }

    saveAnalysisData(analysisId, dataPoints) {
        try {
            const insertStmt = this.db.prepare(`
                INSERT INTO analysis_data (
                    id, analysis_id, position, count_rate, background_rate,
                    net_count_rate, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const insertMany = this.db.transaction((points) => {
                for (const point of points) {
                    insertStmt.run(
                        crypto.randomUUID(), analysisId, point.position,
                        point.countRate, point.backgroundRate || 0,
                        point.netCountRate, point.timestamp
                    );
                }
            });

            insertMany(dataPoints);
        } catch (error) {
            console.error('保存分析数据失败:', error);
            throw error;
        }
    }

    getAnalysisById(id) {
        try {
            return this.getQuery(
                'SELECT * FROM analyses WHERE id = ? AND deleted_at IS NULL',
                [id]
            );
        } catch (error) {
            console.error('获取分析失败:', error);
            throw error;
        }
    }

    getAnalysisData(analysisId) {
        try {
            return this.allQuery(
                'SELECT * FROM analysis_data WHERE analysis_id = ? ORDER BY position ASC',
                [analysisId]
            );
        } catch (error) {
            console.error('获取分析数据失败:', error);
            throw error;
        }
    }

    updateAnalysis(analysisId, updateData) {
        try {
            const allowedFields = [
                'status', 'end_time', 'total_counts', 'peak_area',
                'background_area', 'rf_value', 'purity_percentage', 'comments'
            ];
            
            const values = [];
            
            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key)) {
                    values.push(value);
                }
            }
            
            if (values.length === 0) return false;
            
            values.push(analysisId);
            const result = this.statements.updateAnalysis.run(...values);
            
            return result.changes > 0;
        } catch (error) {
            console.error('更新分析失败:', error);
            throw error;
        }
    }

    // 设备配置管理
    saveDeviceConfig(configData) {
        try {
            const id = crypto.randomUUID();
            
            this.runQuery(`
                INSERT INTO device_configs (
                    id, device_name, device_type, com_port, baud_rate,
                    data_bits, parity, stop_bits, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id, configData.deviceName, configData.deviceType,
                configData.comPort, configData.baudRate,
                configData.dataBits, configData.parity, configData.stopBits,
                configData.createdBy
            ]);

            return this.getDeviceConfigById(id);
        } catch (error) {
            console.error('保存设备配置失败:', error);
            throw error;
        }
    }

    getDeviceConfigById(id) {
        try {
            return this.getQuery(
                'SELECT * FROM device_configs WHERE id = ?',
                [id]
            );
        } catch (error) {
            console.error('获取设备配置失败:', error);
            throw error;
        }
    }

    getAllDeviceConfigs() {
        try {
            return this.allQuery(
                'SELECT * FROM device_configs ORDER BY created_at DESC'
            );
        } catch (error) {
            console.error('获取设备配置列表失败:', error);
            throw error;
        }
    }

    // 串口配置管理
    saveSerialConfig(configData) {
        try {
            const id = crypto.randomUUID();
            
            this.runQuery(`
                INSERT INTO serial_configs (
                    id, port_name, baud_rate, data_bits, parity,
                    stop_bits, flow_control, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id, configData.portName, configData.baudRate,
                configData.dataBits, configData.parity, configData.stopBits,
                configData.flowControl || 'none', configData.createdBy
            ]);

            return this.getSerialConfigById(id);
        } catch (error) {
            console.error('保存串口配置失败:', error);
            throw error;
        }
    }

    getSerialConfigById(id) {
        try {
            return this.getQuery(
                'SELECT * FROM serial_configs WHERE id = ?',
                [id]
            );
        } catch (error) {
            console.error('获取串口配置失败:', error);
            throw error;
        }
    }

    getAllSerialConfigs() {
        try {
            return this.allQuery(
                'SELECT * FROM serial_configs WHERE is_active = 1 ORDER BY created_at DESC'
            );
        } catch (error) {
            console.error('获取串口配置列表失败:', error);
            throw error;
        }
    }

    // 审计追踪方法
    logAuditTrail(auditData) {
        try {
            const id = crypto.randomUUID();
            
            // 计算哈希链
            const previousHash = this.getLastAuditHash();
            const content = JSON.stringify({
                id, action: auditData.action, entityType: auditData.entityType,
                entityId: auditData.entityId, timestamp: new Date().toISOString(),
                previousHash
            });
            const currentHash = crypto.createHash('sha256').update(content).digest('hex');
            
            this.statements.insertAuditTrail.run(
                id, auditData.action, auditData.entityType, auditData.entityId,
                JSON.stringify(auditData.oldValues || {}),
                JSON.stringify(auditData.newValues || {}),
                auditData.signedBy, auditData.signatureReason,
                auditData.signatureComment, auditData.ipAddress,
                auditData.userAgent, new Date().toISOString(),
                previousHash, currentHash
            );

            return id;
        } catch (error) {
            console.error('记录审计追踪失败:', error);
            throw error;
        }
    }

    getLastAuditHash() {
        try {
            const lastAudit = this.getQuery(
                'SELECT current_hash FROM audit_trail ORDER BY timestamp DESC LIMIT 1'
            );
            return lastAudit ? lastAudit.current_hash : null;
        } catch (error) {
            console.error('获取最后审计哈希失败:', error);
            throw error;
        }
    }

    getAuditLogs(filters = {}) {
        try {
            let query = 'SELECT * FROM audit_trail WHERE 1=1';
            const params = [];

            if (filters.action) {
                query += ' AND action = ?';
                params.push(filters.action);
            }

            if (filters.entityType) {
                query += ' AND entity_type = ?';
                params.push(filters.entityType);
            }

            if (filters.startDate) {
                query += ' AND timestamp >= ?';
                params.push(filters.startDate);
            }

            if (filters.endDate) {
                query += ' AND timestamp <= ?';
                params.push(filters.endDate);
            }

            query += ' ORDER BY timestamp DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            return this.allQuery(query, params);
        } catch (error) {
            console.error('获取审计日志失败:', error);
            throw error;
        }
    }

    // 关闭数据库连接
    close() {
        try {
            if (this.db) {
                this.db.close();
                console.log('数据库连接已关闭');
            }
        } catch (error) {
            console.error('关闭数据库连接失败:', error);
            throw error;
        }
    }

    // 事务支持
    transaction(fn) {
        try {
            return this.db.transaction(fn)();
        } catch (error) {
            console.error('事务执行失败:', error);
            throw error;
        }
    }

    // 数据库统计信息
    getDatabaseStats() {
        try {
            const stats = {
                tables: {},
                total_records: 0
            };

            const tables = ['users', 'analyses', 'analysis_data', 'device_configs', 'serial_configs', 'audit_trail', 'audit_logs', 'electronic_signatures', 'performance_metrics', 'user_permissions'];
            
            tables.forEach(table => {
                try {
                    const result = this.getQuery(`SELECT COUNT(*) as count FROM ${table}`);
                    stats.tables[table] = result.count;
                    stats.total_records += result.count;
                } catch (error) {
                    stats.tables[table] = 0;
                }
            });

            return stats;
        } catch (error) {
            console.error('获取数据库统计信息失败:', error);
            throw error;
        }
    }

    // 审计日志管理方法（CFR 21 Part 11）
    logAuditEvent(auditData) {
        try {
            const id = crypto.randomUUID();
            
            this.runQuery(`
                INSERT INTO audit_logs (
                    id, user_id, username, action, resource, resource_id,
                    old_values, new_values, result, ip_address, user_agent,
                    session_id, timestamp, signature_required, electronic_signature_id,
                    compliance_code, reason, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id, auditData.userId, auditData.username, auditData.action,
                auditData.resource, auditData.resourceId, 
                auditData.oldValues ? JSON.stringify(auditData.oldValues) : null,
                auditData.newValues ? JSON.stringify(auditData.newValues) : null,
                auditData.result || 'SUCCESS', auditData.ipAddress, auditData.userAgent,
                auditData.sessionId, new Date().toISOString(),
                auditData.signatureRequired || false, auditData.electronicSignatureId,
                auditData.complianceCode, auditData.reason, auditData.details
            ]);

            return id;
        } catch (error) {
            console.error('记录审计事件失败:', error);
            throw error;
        }
    }

    getAuditEvents(filters = {}) {
        try {
            let query = 'SELECT * FROM audit_logs WHERE 1=1';
            const params = [];

            if (filters.userId) {
                query += ' AND user_id = ?';
                params.push(filters.userId);
            }

            if (filters.action) {
                query += ' AND action = ?';
                params.push(filters.action);
            }

            if (filters.resource) {
                query += ' AND resource = ?';
                params.push(filters.resource);
            }

            if (filters.result) {
                query += ' AND result = ?';
                params.push(filters.result);
            }

            if (filters.startDate) {
                query += ' AND timestamp >= ?';
                params.push(filters.startDate);
            }

            if (filters.endDate) {
                query += ' AND timestamp <= ?';
                params.push(filters.endDate);
            }

            query += ' ORDER BY timestamp DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            return this.allQuery(query, params);
        } catch (error) {
            console.error('获取审计事件失败:', error);
            throw error;
        }
    }

    // 性能指标管理方法
    recordPerformanceMetric(metricData) {
        try {
            const id = crypto.randomUUID();
            
            this.runQuery(`
                INSERT INTO performance_metrics (
                    id, metric_type, metric_name, value, unit, tags,
                    source, timestamp, alert_level, threshold_warning,
                    threshold_critical, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id, metricData.metricType, metricData.metricName,
                metricData.value, metricData.unit, metricData.tags,
                metricData.source, metricData.timestamp || new Date().toISOString(),
                metricData.alertLevel || 'NORMAL', metricData.thresholdWarning,
                metricData.thresholdCritical, metricData.metadata
            ]);

            return id;
        } catch (error) {
            console.error('记录性能指标失败:', error);
            throw error;
        }
    }

    getPerformanceMetrics(filters = {}) {
        try {
            let query = 'SELECT * FROM performance_metrics WHERE 1=1';
            const params = [];

            if (filters.metricType) {
                query += ' AND metric_type = ?';
                params.push(filters.metricType);
            }

            if (filters.metricName) {
                query += ' AND metric_name = ?';
                params.push(filters.metricName);
            }

            if (filters.alertLevel) {
                query += ' AND alert_level = ?';
                params.push(filters.alertLevel);
            }

            if (filters.startDate) {
                query += ' AND timestamp >= ?';
                params.push(filters.startDate);
            }

            if (filters.endDate) {
                query += ' AND timestamp <= ?';
                params.push(filters.endDate);
            }

            query += ' ORDER BY timestamp DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            return this.allQuery(query, params);
        } catch (error) {
            console.error('获取性能指标失败:', error);
            throw error;
        }
    }

    getSystemPerformanceSummary() {
        try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
            
            return {
                cpu_usage: this.getQuery(
                    'SELECT AVG(value) as avg_value FROM performance_metrics WHERE metric_name = ? AND timestamp >= ?',
                    ['cpu_usage', oneHourAgo]
                ),
                memory_usage: this.getQuery(
                    'SELECT AVG(value) as avg_value FROM performance_metrics WHERE metric_name = ? AND timestamp >= ?',
                    ['memory_usage', oneHourAgo]
                ),
                api_response_time: this.getQuery(
                    'SELECT AVG(value) as avg_value FROM performance_metrics WHERE metric_name = ? AND timestamp >= ?',
                    ['api_response_time', oneHourAgo]
                ),
                active_alerts: this.getQuery(
                    'SELECT COUNT(*) as count FROM performance_metrics WHERE alert_level IN (?, ?) AND timestamp >= ?',
                    ['WARNING', 'CRITICAL', oneHourAgo]
                )
            };
        } catch (error) {
            console.error('获取系统性能摘要失败:', error);
            throw error;
        }
    }

    // 用户权限管理方法（三级权限）
    grantUserPermission(permissionData) {
        try {
            const id = crypto.randomUUID();
            
            this.runQuery(`
                INSERT INTO user_permissions (
                    id, user_id, permission_level, permission_name,
                    resource, action, granted_by, granted_at, expires_at,
                    conditions, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id, permissionData.userId, permissionData.permissionLevel,
                permissionData.permissionName, permissionData.resource,
                permissionData.action, permissionData.grantedBy,
                new Date().toISOString(), permissionData.expiresAt,
                permissionData.conditions ? JSON.stringify(permissionData.conditions) : null,
                true
            ]);

            return id;
        } catch (error) {
            console.error('授予用户权限失败:', error);
            throw error;
        }
    }

    checkUserPermission(userId, resource, action) {
        try {
            return this.getQuery(`
                SELECT * FROM user_permissions 
                WHERE user_id = ? AND resource = ? AND action = ? 
                AND is_active = 1 
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            `, [userId, resource, action]);
        } catch (error) {
            console.error('检查用户权限失败:', error);
            throw error;
        }
    }

    getUserPermissions(userId) {
        try {
            return this.allQuery(`
                SELECT * FROM user_permissions 
                WHERE user_id = ? AND is_active = 1
                ORDER BY permission_level DESC
            `, [userId]);
        } catch (error) {
            console.error('获取用户权限失败:', error);
            throw error;
        }
    }

    getUserPermissionLevel(userId, resource) {
        try {
            const permission = this.getQuery(`
                SELECT MAX(permission_level) as max_level 
                FROM user_permissions 
                WHERE user_id = ? AND resource = ? AND is_active = 1
            `, [userId, resource]);
            
            return permission ? permission.max_level : 0;
        } catch (error) {
            console.error('获取用户权限级别失败:', error);
            throw error;
        }
    }

    revokeUserPermission(permissionId) {
        try {
            this.runQuery(
                'UPDATE user_permissions SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [permissionId]
            );
        } catch (error) {
            console.error('撤销用户权限失败:', error);
            throw error;
        }
    }

    // 电子签名管理方法（CFR 21 Part 11兼容）
    createElectronicSignature(signatureData) {
        try {
            const id = crypto.randomUUID();
            
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
            
            this.runQuery(`
                INSERT INTO electronic_signatures (
                    id, user_id, entity_type, entity_id, action, reason,
                    comment, user_full_name, user_title, user_department,
                    signed_at, digital_signature, ip_address, user_agent,
                    second_factor_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id, signatureData.userId, signatureData.entityType,
                signatureData.entityId, signatureData.action, signatureData.reason,
                signatureData.comment, signatureData.userFullName,
                signatureData.userTitle, signatureData.userDepartment,
                new Date().toISOString(), digitalSignature, signatureData.ipAddress,
                signatureData.userAgent, signatureData.secondFactorVerified || false
            ]);

            return id;
        } catch (error) {
            console.error('创建电子签名失败:', error);
            throw error;
        }
    }

    verifyElectronicSignature(signatureId) {
        try {
            const signature = this.getQuery(
                'SELECT * FROM electronic_signatures WHERE id = ?',
                [signatureId]
            );

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
        } catch (error) {
            console.error('验证电子签名失败:', error);
            throw error;
        }
    }
}

module.exports = DatabaseManager;