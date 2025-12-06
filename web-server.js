const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// 新增：串口服务、验证服务、系统设置服务和硬件通讯服务
const SerialCommunicationService = require('./services/SerialCommunicationService');
const ValidationService = require('./services/ValidationService');
const SystemSettingsService = require('./services/SystemSettingsService');
const HardwareCommunicationService = require('./services/HardwareCommunicationService');
const ProbeControlService = require('./services/ProbeControlService');
const DataProcessingService = require('./services/DataProcessingService');

const app = express();
const PORT = 3000;

// 中间件
app.use(express.json());
app.use(express.static(__dirname));

// 数据库初始化
class SimpleDatabase {
    constructor() {
        this.db = new Database(':memory:'); // 使用内存数据库
        this.init();
    }

    init() {
        // 使用事务来确保所有表创建的原子性
        const initTransaction = this.db.transaction(() => {
            // 创建用户表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT DEFAULT 'operator',
                    is_active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME,
                    password_expires DATETIME,
                    failed_attempts INTEGER DEFAULT 0,
                    locked_until DATETIME
                )
            `).run();

            // 创建审计日志表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS audit_trail (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    username TEXT,
                    action TEXT NOT NULL,
                    details TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    ip_address TEXT,
                    user_agent TEXT,
                    hash TEXT,
                    previous_hash TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `).run();

            // 创建测量数据表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS measurements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    position REAL NOT NULL,
                    count_rate REAL NOT NULL,
                    device_status TEXT DEFAULT 'active',
                    notes TEXT
                )
            `).run();

            // 创建设备表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS devices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    port TEXT NOT NULL,
                    baud_rate INTEGER DEFAULT 9600,
                    is_connected INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'offline',
                    last_connection DATETIME,
                    calibration_date DATETIME,
                    metadata TEXT
                )
            `).run();

            // 创建电子签名表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS electronic_signatures (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    username TEXT NOT NULL,
                    document_type TEXT NOT NULL,
                    document_id TEXT,
                    action TEXT NOT NULL,
                    signature_data TEXT NOT NULL,
                    signature_hash TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `).run();

            // 创建设备日志表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS device_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id INTEGER NOT NULL,
                    log_type TEXT NOT NULL,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    details TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    user_id INTEGER,
                    session_id TEXT,
                    FOREIGN KEY (device_id) REFERENCES devices (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `).run();

            // 创建设备校准记录表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS device_calibrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id INTEGER NOT NULL,
                    calibration_type TEXT NOT NULL,
                    parameters TEXT NOT NULL,
                    results TEXT,
                    status TEXT DEFAULT 'pending',
                    performed_by INTEGER NOT NULL,
                    performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    certificate_number TEXT,
                    next_due_date DATETIME,
                    notes TEXT,
                    FOREIGN KEY (device_id) REFERENCES devices (id),
                    FOREIGN KEY (performed_by) REFERENCES users (id)
                )
            `).run();

            // 创建项目文件表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS project_files (
                    id TEXT PRIMARY KEY,
                    project_name TEXT NOT NULL,
                    description TEXT,
                    file_type TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER,
                    checksum TEXT,
                    user_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    deleted_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `).run();

            // 创建测量文件表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS measurement_files (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    file_type TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER,
                    mime_type TEXT,
                    user_id INTEGER NOT NULL,
                    username TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    deleted_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `).run();

            // 创建分析结果表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS analysis_results (
                    id TEXT PRIMARY KEY,
                    measurement_file_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    analysis_type TEXT NOT NULL,
                    data TEXT NOT NULL,
                    parameters TEXT,
                    status TEXT DEFAULT 'completed',
                    user_id INTEGER NOT NULL,
                    username TEXT NOT NULL,
                    signature_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (measurement_file_id) REFERENCES measurement_files (id),
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (signature_id) REFERENCES electronic_signatures (id)
                )
            `).run();

            // 创建报告表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS reports (
                    id TEXT PRIMARY KEY,
                    analysis_result_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    report_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    template_id TEXT,
                    parameters TEXT,
                    status TEXT DEFAULT 'draft',
                    user_id INTEGER NOT NULL,
                    username TEXT NOT NULL,
                    signature_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    approved_at DATETIME,
                    approved_by INTEGER,
                    FOREIGN KEY (analysis_result_id) REFERENCES analysis_results (id),
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (signature_id) REFERENCES electronic_signatures (id),
                    FOREIGN KEY (approved_by) REFERENCES users (id)
                )
            `).run();

            // 创建报告模板表
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS report_templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    template_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    parameters TEXT,
                    is_default INTEGER DEFAULT 0,
                    user_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `).run();

            // 创建默认管理员用户
            this.createDefaultAdmin();
        });

        // 执行初始化事务
        try {
            initTransaction();
            console.log('数据库初始化成功');
        } catch (error) {
            console.error('数据库初始化失败:', error);
            throw error;
        }
    }

    createDefaultAdmin() {
        const password = 'Admin123!';
        const passwordHash = bcrypt.hashSync(password, 10);
        const expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + 90);

        try {
            // 使用预编译语句创建默认管理员用户
            const stmt = this.db.prepare(`
                INSERT OR IGNORE INTO users 
                (username, password_hash, role, password_expires) 
                VALUES (?, ?, 'admin', ?)
            `);
            
            const result = stmt.run('admin', passwordHash, expiresDate.toISOString());
            
            if (result.changes > 0) {
                console.log('默认管理员用户创建成功');
            } else {
                console.log('默认管理员用户已存在');
            }
        } catch (error) {
            console.error('创建默认管理员用户失败:', error);
        }
    }
}

// 认证服务
class AuthService {
    constructor(db) {
        this.db = db;
    }

    async login(username, password) {
        try {
            const row = this.db.get(
                'SELECT * FROM users WHERE username = ? AND is_active = 1',
                [username]
            );

            if (!row) {
                return { success: false, message: '用户名或密码错误' };
            }

            // 检查账户锁定
            if (row.locked_until && new Date(row.locked_until) > new Date()) {
                return { success: false, message: '账户已被锁定，请稍后再试' };
            }

            const isValid = await bcrypt.compare(password, row.password_hash);
            
            if (isValid) {
                // 重置失败尝试次数
                this.db.run(
                    'UPDATE users SET failed_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE id = ?',
                    [row.id]
                );

                // 记录审计日志
                this.auditLog(row.id, row.username, 'LOGIN', '用户登录成功');

                return {
                    success: true,
                    user: {
                        id: row.id,
                        username: row.username,
                        role: row.role
                    }
                };
            } else {
                // 增加失败尝试次数
                const attempts = row.failed_attempts + 1;
                let lockedUntil = null;
                
                if (attempts >= 5) {
                    const lockDate = new Date();
                    lockDate.setMinutes(lockDate.getMinutes() + 15);
                    lockedUntil = lockDate.toISOString();
                }

                this.db.run(
                    'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?',
                    [attempts, lockedUntil, row.id]
                );

                this.auditLog(row.id, row.username, 'LOGIN_FAILED', `登录失败，尝试次数: ${attempts}`);

                return { success: false, message: '用户名或密码错误' };
            }
        } catch (error) {
            console.error('登录过程中发生错误:', error);
            return { success: false, message: '服务器错误' };
        }
    }

    auditLog(userId, username, action, details) {
        try {
            const timestamp = new Date().toISOString();
            const hash = require('crypto')
                .createHash('sha256')
                .update(`${userId}${username}${action}${details}${timestamp}`)
                .digest('hex');
            
            // 使用预编译语句记录审计日志
            const stmt = this.db.prepare(`
                INSERT INTO audit_trail (user_id, username, action, details, timestamp, hash)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(userId, username, action, details, timestamp, hash);
            return result.lastInsertRowid;
        } catch (error) {
            console.error('记录审计日志失败:', error);
            return null;
        }
    }
}

// 模拟串口服务
class SerialService {
    constructor() {
        this.isConnected = false;
        this.dataCallback = null;
    }

    async connect(port, baudRate = 9600) {
        // 模拟连接过程
        console.log(`模拟连接端口 ${port}，波特率 ${baudRate}`);
        this.isConnected = true;
        return true;
    }

    async disconnect() {
        this.isConnected = false;
        return true;
    }

    async sendCommand(command) {
        if (!this.isConnected) {
            throw new Error('串口未连接');
        }
        
        console.log(`发送命令: ${command}`);
        return { success: true };
    }

    async startDataCollection() {
        if (!this.isConnected) {
            throw new Error('串口未连接');
        }

        // 模拟实时数据收集
        this.dataInterval = setInterval(() => {
            if (this.dataCallback) {
                const mockData = {
                    timestamp: new Date().toISOString(),
                    position: Math.random() * 100,
                    countRate: Math.random() * 1000 + 500,
                    deviceStatus: 'active'
                };
                this.dataCallback(mockData);
            }
        }, 1000);
    }

    stopDataCollection() {
        if (this.dataInterval) {
            clearInterval(this.dataInterval);
        }
    }

    onData(callback) {
        this.dataCallback = callback;
    }
}

// 初始化服务
const db = new SimpleDatabase();
const authService = new AuthService(db.db);
const serialService = new SerialService();
const systemSettingsService = new SystemSettingsService(db.db);
const hardwareCommunicationService = new HardwareCommunicationService(db.db);
const probeControlService = new ProbeControlService(db.db);
const dataProcessingService = new DataProcessingService(db.db, hardwareCommunicationService);

// 存储会话和活动会话
const sessions = new Map();
const activeMeasurements = new Map();

// API 路由

// 用户认证
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await authService.login(username, password);
        
        if (result.success) {
            const sessionId = uuidv4();
            sessions.set(sessionId, {
                user: result.user,
                created: new Date()
            });
            res.json({ ...result, sessionId });
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取用户信息
app.get('/api/user/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (session) {
        res.json({ success: true, user: session.user });
    } else {
        res.status(401).json({ success: false, message: '会话无效' });
    }
});

// ==================== 用户管理API ====================

// 获取所有用户列表
app.get('/api/users', (req, res) => {
    try {
        // 检查管理员权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session || session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        const rows = db.db.all(
            'SELECT id, username, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
        );
        
        res.json({ success: true, users: rows });
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({ success: false, message: '数据库错误' });
    }
});

// 创建新用户
app.post('/api/users', async (req, res) => {
    try {
        // 检查管理员权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session || session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        const { username, password, role = 'operator' } = req.body;
        
        // 验证输入
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
        }
        
        if (!['admin', 'supervisor', 'operator'].includes(role)) {
            return res.status(400).json({ success: false, message: '无效的角色' });
        }
        
        // 检查用户名是否已存在
        const existingUser = db.db.get(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (existingUser) {
            return res.status(400).json({ success: false, message: '用户名已存在' });
        }
        
        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // 创建用户
        const result = db.db.run(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );
        
        // 记录审计日志
        db.auditLog(session.user.id, session.user.username, 'USER_CREATE', `创建用户: ${username}`);
        
        res.json({ 
            success: true, 
            userId: result.lastInsertRowid,
            message: '用户创建成功' 
        });
    } catch (error) {
        console.error('创建用户失败:', error);
        res.status(500).json({ success: false, message: '创建用户失败' });
    }
});

// 更新用户信息
app.put('/api/users/:userId', async (req, res) => {
    try {
        // 检查管理员权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session || session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        const { userId } = req.params;
        const { password, role, is_active } = req.body;
        
        // 构建更新语句
        const updates = [];
        const values = [];
        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 12);
            updates.push('password_hash = ?');
            values.push(hashedPassword);
        }
        
        if (role && ['admin', 'supervisor', 'operator'].includes(role)) {
            updates.push('role = ?');
            values.push(role);
        }
        
        if (typeof is_active === 'boolean') {
            updates.push('is_active = ?');
            values.push(is_active ? 1 : 0);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: '没有要更新的字段' });
        }
        
        values.push(userId);
        
        const result = db.db.run(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        
        // 记录审计日志
        db.auditLog(session.user.id, session.user.username, 'USER_UPDATE', `更新用户ID: ${userId}`);
        
        res.json({ 
            success: true, 
            message: '用户更新成功' 
        });
    } catch (error) {
        console.error('更新用户失败:', error);
        res.status(500).json({ success: false, message: '更新用户失败' });
    }
});

// 删除用户
app.delete('/api/users/:userId', (req, res) => {
    try {
        // 检查管理员权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session || session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        const { userId } = req.params;
        
        // 防止删除自己
        if (parseInt(userId) === session.user.id) {
            return res.status(400).json({ success: false, message: '不能删除自己的账户' });
        }
        
        const result = db.db.run(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        
        // 记录审计日志
        db.auditLog(session.user.id, session.user.username, 'USER_DELETE', `删除用户ID: ${userId}`);
        
        res.json({ 
            success: true, 
            message: '用户删除成功' 
        });
    } catch (error) {
        console.error('删除用户失败:', error);
        res.status(500).json({ success: false, message: '删除用户失败' });
    }
});

// ==================== 电子签名API ====================

// 创建电子签名
app.post('/api/signatures', (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { document_type, document_id, action, signature_data } = req.body;
        
        // 验证输入
        if (!document_type || !action || !signature_data) {
            return res.status(400).json({ success: false, message: '缺少必要参数' });
        }
        
        // 生成签名ID
        const signatureId = uuidv4();
        const timestamp = new Date().toISOString();
        
        // 计算签名哈希
        const crypto = require('crypto');
        const signatureHash = crypto
            .createHash('sha256')
            .update(`${document_type}${document_id || ''}${action}${signature_data}${timestamp}${session.user.id}`)
            .digest('hex');
        
        // 保存签名记录
        try {
            db.db.run(
                `INSERT INTO electronic_signatures 
                 (id, user_id, username, document_type, document_id, action, signature_data, signature_hash, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [signatureId, session.user.id, session.user.username, document_type, document_id || null, 
                 action, signature_data, signatureHash, timestamp]
            );
            
            // 记录审计日志
            db.auditLog(session.user.id, session.user.username, 'ELECTRONIC_SIGNATURE', 
                       `${action} 文档: ${document_type}${document_id ? ' (' + document_id + ')' : ''}`);
            
            res.json({ 
                success: true, 
                signature_id: signatureId,
                timestamp,
                message: '电子签名创建成功' 
            });
        } catch (error) {
            console.error('保存签名失败:', error);
            res.status(500).json({ success: false, message: '保存签名失败' });
        }
    } catch (error) {
        console.error('电子签名API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 验证电子签名
app.get('/api/signatures/:signatureId/verify', (req, res) => {
    try {
        const { signatureId } = req.params;
        
        // 查找签名记录
        try {
            const row = db.db.get(
                'SELECT * FROM electronic_signatures WHERE id = ?',
                [signatureId]
            );
            
            if (!row) {
                res.status(404).json({ success: false, message: '签名不存在' });
                return;
            }
            
            // 重新计算签名哈希进行验证
            const crypto = require('crypto');
            const expectedHash = crypto
                .createHash('sha256')
                .update(`${row.document_type}${row.document_id || ''}${row.action}${row.signature_data}${row.timestamp}${row.user_id}`)
                .digest('hex');
            
            const isValid = expectedHash === row.signature_hash;
            
            res.json({ 
                success: true, 
                is_valid: isValid,
                signature: {
                    id: row.id,
                    username: row.username,
                    document_type: row.document_type,
                    document_id: row.document_id,
                    action: row.action,
                    timestamp: row.timestamp
                }
            });
        } catch (error) {
            console.error('查询签名失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
    } catch (error) {
        console.error('验证签名API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取电子签名列表
app.get('/api/signatures', (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { document_type, document_id, action } = req.query;
        
        // 构建查询条件
        let query = 'SELECT * FROM electronic_signatures WHERE 1=1';
        const params = [];
        
        if (document_type) {
            query += ' AND document_type = ?';
            params.push(document_type);
        }
        
        if (document_id) {
            query += ' AND document_id = ?';
            params.push(document_id);
        }
        
        if (action) {
            query += ' AND action = ?';
            params.push(action);
        }
        
        query += ' ORDER BY timestamp DESC LIMIT 100';
        
        try {
            const rows = db.db.all(query, params);
            
            res.json({ success: true, signatures: rows });
        } catch (error) {
            console.error('查询签名列表失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
    } catch (error) {
        console.error('签名列表API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// ==================== 文件管理API ====================

// 获取文件列表
app.get('/api/files', (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { file_type, status, limit = 50, offset = 0 } = req.query;
        
        // 构建查询条件
        let query = 'SELECT * FROM measurement_files WHERE deleted_at IS NULL';
        const params = [];
        
        if (file_type) {
            query += ' AND file_type = ?';
            params.push(file_type);
        }
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        // 根据权限过滤
        if (session.user.role === 'operator') {
            query += ' AND user_id = ?';
            params.push(session.user.id);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        try {
            const rows = db.db.all(query, params);
            
            res.json({ success: true, files: rows });
        } catch (error) {
            console.error('获取文件列表失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
    } catch (error) {
        console.error('文件列表API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 创建新文件
app.post('/api/files', (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { name, description, file_type, file_path, file_size, mime_type, metadata } = req.body;
        
        // 验证输入
        if (!name || !file_type || !file_path) {
            return res.status(400).json({ success: false, message: '缺少必要参数' });
        }
        
        // 生成文件ID
        const fileId = uuidv4();
        const now = new Date().toISOString();
        
        try {
            db.db.run(
                `INSERT INTO measurement_files 
                 (id, name, description, file_type, file_path, file_size, mime_type, user_id, username, metadata, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [fileId, name, description || null, file_type, file_path, file_size || 0, 
                 mime_type || 'application/octet-stream', session.user.id, session.user.username, 
                 metadata ? JSON.stringify(metadata) : null, now, now]
            );
            
            // 记录审计日志
            db.auditLog(session.user.id, session.user.username, 'FILE_CREATE', `创建文件: ${name}`);
            
            res.json({ 
                success: true, 
                file_id: fileId,
                message: '文件记录创建成功' 
            });
        } catch (error) {
            console.error('创建文件记录失败:', error);
            res.status(500).json({ success: false, message: '创建文件记录失败' });
        }
    } catch (error) {
        console.error('创建文件API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 更新文件信息
app.put('/api/files/:fileId', (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { fileId } = req.params;
        const { name, description, status, metadata } = req.body;
        
        try {
            // 检查文件是否存在
            const row = db.db.get(
                'SELECT * FROM measurement_files WHERE id = ? AND deleted_at IS NULL',
                [fileId]
            );
            
            if (!row) {
                res.status(404).json({ success: false, message: '文件不存在' });
                return;
            }
            
            // 检查权限（操作员只能编辑自己的文件）
            if (session.user.role === 'operator' && row.user_id !== session.user.id) {
                return res.status(403).json({ success: false, message: '权限不足' });
            }
            
            // 构建更新语句
            const updates = [];
            const values = [];
            
            if (name) {
                updates.push('name = ?');
                values.push(name);
            }
            
            if (description !== undefined) {
                updates.push('description = ?');
                values.push(description);
            }
            
            if (status) {
                updates.push('status = ?');
                values.push(status);
            }
            
            if (metadata) {
                updates.push('metadata = ?');
                values.push(JSON.stringify(metadata));
            }
            
            updates.push('updated_at = ?');
            values.push(new Date().toISOString());
            
            values.push(fileId);
            
            db.db.run(
                `UPDATE measurement_files SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
            
            // 记录审计日志
            db.auditLog(session.user.id, session.user.username, 'FILE_UPDATE', `更新文件: ${fileId}`);
            
            res.json({ 
                success: true, 
                message: '文件更新成功' 
            });
        } catch (error) {
            console.error('更新文件失败:', error);
            res.status(500).json({ success: false, message: '更新文件失败' });
        }
    } catch (error) {
        console.error('更新文件API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 删除文件
app.delete('/api/files/:fileId', (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { fileId } = req.params;
        
        try {
            // 检查文件是否存在
            const row = db.db.get(
                'SELECT * FROM measurement_files WHERE id = ? AND deleted_at IS NULL',
                [fileId]
            );
            
            if (!row) {
                res.status(404).json({ success: false, message: '文件不存在' });
                return;
            }
            
            // 检查权限
            if (session.user.role === 'operator' && row.user_id !== session.user.id) {
                return res.status(403).json({ success: false, message: '权限不足' });
            }
            
            // 软删除
            db.db.run(
                'UPDATE measurement_files SET deleted_at = ? WHERE id = ?',
                [new Date().toISOString(), fileId]
            );
            
            // 记录审计日志
            db.auditLog(session.user.id, session.user.username, 'FILE_DELETE', `删除文件: ${fileId}`);
            
            res.json({ 
                success: true, 
                message: '文件删除成功' 
            });
        } catch (error) {
            console.error('删除文件失败:', error);
            res.status(500).json({ success: false, message: '删除文件失败' });
        }
    } catch (error) {
        console.error('删除文件API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// ==================== 分析结果API ====================

// 获取分析结果列表
app.get('/api/analysis', (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { measurement_file_id, analysis_type, status, limit = 50, offset = 0 } = req.query;
        
        // 构建查询条件
        let query = 'SELECT * FROM analysis_results';
        const params = [];
        
        if (measurement_file_id) {
            query += ' WHERE measurement_file_id = ?';
            params.push(measurement_file_id);
        } else {
            query += ' WHERE 1=1';
        }
        
        if (analysis_type) {
            query += ' AND analysis_type = ?';
            params.push(analysis_type);
        }
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        // 根据权限过滤
        if (session.user.role === 'operator') {
            query += ' AND user_id = ?';
            params.push(session.user.id);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        try {
            const rows = db.db.all(query, params);
            
            // 解析JSON字段
            const results = rows.map(row => ({
                ...row,
                data: JSON.parse(row.data),
                parameters: row.parameters ? JSON.parse(row.parameters) : null
            }));
            
            res.json({ success: true, analysis: results });
        } catch (error) {
            console.error('获取分析结果失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
    } catch (error) {
        console.error('分析结果列表API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 创建分析结果
app.post('/api/analysis', (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { 
            measurement_file_id, name, description, analysis_type, 
            data, parameters, signature_id 
        } = req.body;
        
        // 验证输入
        if (!measurement_file_id || !name || !analysis_type || !data) {
            return res.status(400).json({ success: false, message: '缺少必要参数' });
        }
        
        // 生成分析ID
        const analysisId = uuidv4();
        const now = new Date().toISOString();
        
        try {
            db.db.run(
                `INSERT INTO analysis_results 
                 (id, measurement_file_id, name, description, analysis_type, data, parameters, user_id, username, signature_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [analysisId, measurement_file_id, name, description || null, analysis_type, 
                 JSON.stringify(data), parameters ? JSON.stringify(parameters) : null, 
                 session.user.id, session.user.username, signature_id || null, now, now]
            );
            
            // 记录审计日志
            db.auditLog(session.user.id, session.user.username, 'ANALYSIS_CREATE', 
                       `创建分析结果: ${name}`);
            
            res.json({ 
                success: true, 
                analysis_id: analysisId,
                message: '分析结果创建成功' 
            });
        } catch (error) {
            console.error('创建分析结果失败:', error);
            res.status(500).json({ success: false, message: '创建分析结果失败' });
        }
    } catch (error) {
        console.error('创建分析结果API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// ==================== 报告生成API ====================

// 获取报告列表
app.get('/api/reports', (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { analysis_result_id, report_type, status, limit = 50, offset = 0 } = req.query;
        
        // 构建查询条件
        let query = 'SELECT * FROM reports';
        const params = [];
        
        if (analysis_result_id) {
            query += ' WHERE analysis_result_id = ?';
            params.push(analysis_result_id);
        } else {
            query += ' WHERE 1=1';
        }
        
        if (report_type) {
            query += ' AND report_type = ?';
            params.push(report_type);
        }
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        // 根据权限过滤
        if (session.user.role === 'operator') {
            query += ' AND user_id = ?';
            params.push(session.user.id);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        try {
            const rows = db.db.all(query, params);
            
            // 解析JSON字段
            const reports = rows.map(row => ({
                ...row,
                content: JSON.parse(row.content),
                parameters: row.parameters ? JSON.parse(row.parameters) : null
            }));
            
            res.json({ success: true, reports });
        } catch (error) {
            console.error('获取报告列表失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
    } catch (error) {
        console.error('报告列表API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 生成报告
app.post('/api/reports/generate', (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { analysis_result_id, template_id, parameters } = req.body;
        
        // 验证输入
        if (!analysis_result_id) {
            return res.status(400).json({ success: false, message: '缺少分析结果ID' });
        }
        
        // 获取分析结果
        try {
            const analysis = db.db.get(
                'SELECT * FROM analysis_results WHERE id = ?',
                [analysis_result_id]
            );
            
            if (!analysis) {
                res.status(404).json({ success: false, message: '分析结果不存在' });
                return;
            }
            
            // 生成报告内容
            const reportContent = generateReportContent(analysis, parameters);
            
            // 创建报告记录
            const reportId = uuidv4();
            const now = new Date().toISOString();
            
            db.db.run(
                `INSERT INTO reports 
                 (id, analysis_result_id, name, description, report_type, content, template_id, parameters, user_id, username, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [reportId, analysis_result_id, 
                 `报告 - ${analysis.name}`, `基于分析结果 ${analysis.name} 生成`,
                 'analysis_report', JSON.stringify(reportContent), template_id || null,
                 parameters ? JSON.stringify(parameters) : null, session.user.id, 
                 session.user.username, now, now]
            );
            
            // 记录审计日志
            db.auditLog(session.user.id, session.user.username, 'REPORT_GENERATE', 
                       `生成报告: ${reportId}`);
            
            res.json({ 
                success: true, 
                report_id: reportId,
                content: reportContent,
                message: '报告生成成功' 
            });
        } catch (error) {
            console.error('生成报告失败:', error);
            res.status(500).json({ success: false, message: '生成报告失败' });
        }
    } catch (error) {
        console.error('生成报告API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 导出报告
app.get('/api/reports/:reportId/export', (req, res) => {
    try {
        const { reportId } = req.params;
        const { format = 'pdf' } = req.query;
        
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        // 获取报告
        try {
            const report = db.db.get('SELECT * FROM reports WHERE id = ?', [reportId]);
            
            if (!report) {
                res.status(404).json({ success: false, message: '报告不存在' });
                return;
            }
            
            // 检查权限
            if (session.user.role === 'operator' && report.user_id !== session.user.id) {
                return res.status(403).json({ success: false, message: '权限不足' });
            }
            
            // 解析报告内容
            const content = JSON.parse(report.content);
            
            // 根据格式导出
            if (format === 'pdf') {
                // 这里可以实现PDF生成逻辑
                res.json({ 
                    success: true, 
                    message: 'PDF导出功能待实现',
                    content: content 
                });
            } else if (format === 'html') {
                res.json({ 
                    success: true, 
                    content: content,
                    format: 'html' 
                });
            } else {
                res.json({ 
                    success: true, 
                    content: content,
                    format: 'json' 
                });
            }
            
            // 记录审计日志
            db.auditLog(session.user.id, session.user.username, 'REPORT_EXPORT', 
                       `导出报告: ${reportId} (${format})`);
        } catch (error) {
            console.error('查询报告失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
    } catch (error) {
        console.error('导出报告API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// ==================== 报告生成辅助函数 ====================

function generateReportContent(analysis, parameters = {}) {
    const analysisData = JSON.parse(analysis.data);
    const reportData = {
        title: `辐射分析报告 - ${analysis.name}`,
        subtitle: `分析类型: ${analysis.analysis_type}`,
        timestamp: new Date().toISOString(),
        analyst: analysis.username,
        analysis_info: {
            name: analysis.name,
            description: analysis.description,
            type: analysis.analysis_type,
            status: analysis.status
        },
        data_summary: {
            total_points: analysisData.dataPoints ? analysisData.dataPoints.length : 0,
            peak_count: analysisData.peaks ? analysisData.peaks.length : 0,
            integration_regions: analysisData.integrationRegions ? analysisData.integrationRegions.length : 0,
            analysis_parameters: analysis.parameters ? JSON.parse(analysis.parameters) : {}
        },
        results: {
            peaks: analysisData.peaks || [],
            integration_regions: analysisData.integrationRegions || [],
            quantitative_results: analysisData.quantitativeResults || {},
            calibration_info: analysisData.calibration || {}
        },
        charts: {
            spectrum_chart: analysisData.chartConfig || {},
            data_points: analysisData.dataPoints || []
        },
        conclusions: generateConclusions(analysisData),
        recommendations: generateRecommendations(analysisData)
    };
    
    return reportData;
}

function generateConclusions(data) {
    const conclusions = [];
    
    if (data.peaks && data.peaks.length > 0) {
        conclusions.push(`检测到 ${data.peaks.length} 个明显峰位。`);
    }
    
    if (data.quantitativeResults) {
        conclusions.push('定量分析已完成，结果可靠。');
    }
    
    if (conclusions.length === 0) {
        conclusions.push('分析结果显示数据质量良好，可用于进一步研究。');
    }
    
    return conclusions;
}

function generateRecommendations(data) {
    const recommendations = [];
    
    if (data.peaks && data.peaks.length > 5) {
        recommendations.push('建议增加测量时间以提高统计精度。');
    }
    
    if (data.integrationRegions && data.integrationRegions.length > 3) {
        recommendations.push('考虑优化积分区域以减少背景干扰。');
    }
    
    recommendations.push('建议定期进行系统校准以确保数据准确性。');
    
    return recommendations;
}

// ==================== 串口设备控制API ====================

// 设置模拟器模式
app.post('/api/serial/simulator-mode', (req, res) => {
    try {
        const { enabled } = req.body;
        const result = serialService.setSimulatorMode(enabled);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 配置串口
app.post('/api/serial/configure', async (req, res) => {
    try {
        const { portName, baudRate, dataBits, parity, stopBits } = req.body;
        const result = await serialService.configure({
            portName, baudRate, dataBits, parity, stopBits
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 连接设备
app.post('/api/serial/connect', async (req, res) => {
    try {
        const result = await serialService.connect();
        res.json(result);
    } catch (error) {
        console.error('串口连接错误:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 断开连接
app.post('/api/serial/disconnect', async (req, res) => {
    try {
        const result = await serialService.disconnect();
        res.json(result);
    } catch (error) {
        console.error('串口断开错误:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 发送数据
app.post('/api/serial/send', async (req, res) => {
    try {
        const { portName, data, timeout } = req.body;
        const result = await serialService.send(portName, data, timeout);
        res.json(result);
    } catch (error) {
        console.error('串口发送错误:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取连接状态
app.get('/api/serial/status', (req, res) => {
    try {
        const status = serialService.getConnectionStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取可用端口
app.get('/api/serial/ports', async (req, res) => {
    try {
        const ports = await serialService.getAvailablePorts();
        res.json({ success: true, ports });
    } catch (error) {
        console.error('获取端口列表错误:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 探头控制命令
app.post('/api/serial/probe/move-to', async (req, res) => {
    try {
        const { x, y, z, speed } = req.body;
        
        if (serialService.simulator && serialService.simulator.isConnected) {
            // 使用模拟器
            const frame = generateMoveCommand(x, y, z, speed);
            const response = serialService.simulator.processCommand(frame);
            res.json({ success: true, response: response ? response.toString('hex') : null });
        } else {
            res.json({ success: false, message: '设备未连接' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/serial/probe/home', async (req, res) => {
    try {
        if (serialService.simulator && serialService.simulator.isConnected) {
            const frame = generateHomeCommand();
            const response = serialService.simulator.processCommand(frame);
            res.json({ success: true, response: response ? response.toString('hex') : null });
        } else {
            res.json({ success: false, message: '设备未连接' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/serial/probe/emergency-stop', async (req, res) => {
    try {
        if (serialService.simulator && serialService.simulator.isConnected) {
            const frame = generateEmergencyStopCommand();
            const response = serialService.simulator.processCommand(frame);
            res.json({ success: true, response: response ? response.toString('hex') : null });
        } else {
            res.json({ success: false, message: '设备未连接' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 测量控制命令
app.post('/api/serial/measurement/start', async (req, res) => {
    try {
        if (serialService.simulator && serialService.simulator.isConnected) {
            const frame = generateMeasurementStartCommand();
            const response = serialService.simulator.processCommand(frame);
            res.json({ success: true, response: response ? response.toString('hex') : null });
        } else {
            res.json({ success: false, message: '设备未连接' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/serial/measurement/stop', async (req, res) => {
    try {
        if (serialService.simulator && serialService.simulator.isConnected) {
            const frame = generateMeasurementStopCommand();
            const response = serialService.simulator.processCommand(frame);
            res.json({ success: true, response: response ? response.toString('hex') : null });
        } else {
            res.json({ success: false, message: '设备未连接' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 测量数据
app.post('/api/measurement/start', (req, res) => {
    const sessionId = uuidv4();
    activeMeasurements.set(sessionId, {
        id: sessionId,
        startTime: new Date(),
        data: []
    });

    // 开始模拟数据收集
    serialService.startDataCollection();
    serialService.onData((data) => {
        const measurement = activeMeasurements.get(sessionId);
        if (measurement) {
            measurement.data.push(data);
        }
    });

    res.json({ success: true, sessionId });
});

app.post('/api/measurement/stop/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const measurement = activeMeasurements.get(sessionId);
    
    if (measurement) {
        serialService.stopDataCollection();
        activeMeasurements.delete(sessionId);
        
        res.json({ 
            success: true, 
            data: measurement.data,
            duration: Date.now() - measurement.startTime.getTime()
        });
    } else {
        res.status(404).json({ success: false, message: '测量会话不存在' });
    }
});

app.get('/api/measurement/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const measurement = activeMeasurements.get(sessionId);
    
    if (measurement) {
        res.json({ success: true, data: measurement.data });
    } else {
        res.status(404).json({ success: false, message: '测量会话不存在' });
    }
});

// 获取审计日志
app.get('/api/audit', (req, res) => {
    try {
        const rows = db.db.all('SELECT * FROM audit_trail ORDER BY timestamp DESC LIMIT 100', []);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('获取审计日志失败:', error);
        res.status(500).json({ success: false, message: '数据库错误' });
    }
});

// 获取设备状态
app.get('/api/devices', (req, res) => {
        try {
            const rows = db.db.all('SELECT * FROM devices', []);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('获取设备列表失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
});

// 添加设备
app.post('/api/devices', (req, res) => {
    const { name, type, port, baudRate } = req.body;
    try {
        const result = db.db.run(
            'INSERT INTO devices (name, type, port, baud_rate) VALUES (?, ?, ?, ?)',
            [name, type, port, baudRate]
        );
        
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
        console.error('添加设备失败:', error);
        res.status(500).json({ success: false, message: '数据库错误' });
    }
});

// 更新设备
app.put('/api/devices/:deviceId', (req, res) => {
    try {
        const { deviceId } = req.params;
        const { name, type, port, baud_rate, status, metadata } = req.body;
        
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session || session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        const updates = [];
        const values = [];
        
        if (name) { updates.push('name = ?'); values.push(name); }
        if (type) { updates.push('type = ?'); values.push(type); }
        if (port) { updates.push('port = ?'); values.push(port); }
        if (baud_rate) { updates.push('baud_rate = ?'); values.push(baud_rate); }
        if (status) { updates.push('status = ?'); values.push(status); }
        if (metadata) { updates.push('metadata = ?'); values.push(JSON.stringify(metadata)); }
        
        updates.push('last_connection = ?');
        values.push(new Date().toISOString());
        
        values.push(deviceId);
        
        try {
            const result = db.db.run(
                `UPDATE devices SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
            
            if (result.changes === 0) {
                res.status(404).json({ success: false, message: '设备不存在' });
                return;
            }
            
            // 记录审计日志
            db.auditLog(session.user.id, session.user.username, 'DEVICE_UPDATE', `更新设备: ${deviceId}`);
            
            res.json({ success: true, message: '设备更新成功' });
        } catch (error) {
            console.error('更新设备失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
    } catch (error) {
        console.error('更新设备API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 删除设备
app.delete('/api/devices/:deviceId', (req, res) => {
    try {
        const { deviceId } = req.params;
        
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session || session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        try {
            const result = db.db.run(
                'DELETE FROM devices WHERE id = ?',
                [deviceId]
            );
            
            if (result.changes === 0) {
                res.status(404).json({ success: false, message: '设备不存在' });
                return;
            }
            
            // 记录审计日志
            db.auditLog(session.user.id, session.user.username, 'DEVICE_DELETE', `删除设备: ${deviceId}`);
            
            res.json({ success: true, message: '设备删除成功' });
        } catch (error) {
            console.error('删除设备失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
    } catch (error) {
        console.error('删除设备API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 设备校准
app.post('/api/devices/:deviceId/calibrate', (req, res) => {
    try {
        const { deviceId } = req.params;
        const { calibration_type, parameters, notes } = req.body;
        
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session || !['admin', 'supervisor'].includes(session.user.role)) {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        const calibrationId = Date.now().toString();
        const nextDueDate = new Date();
        nextDueDate.setMonth(nextDueDate.getMonth() + 6); // 6个月后到期
        
        try {
            db.db.run(
                `INSERT INTO device_calibrations 
                 (id, device_id, calibration_type, parameters, performed_by, next_due_date, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [calibrationId, deviceId, calibration_type, JSON.stringify(parameters), 
                 session.user.id, nextDueDate.toISOString(), notes]
            );
            
            // 更新设备的校准日期
            db.db.run(
                'UPDATE devices SET calibration_date = ?, last_connection = ? WHERE id = ?',
                [new Date().toISOString(), new Date().toISOString(), deviceId]
            );
            
            // 记录审计日志
            db.auditLog(session.user.id, session.user.username, 'DEVICE_CALIBRATE', 
                       `设备校准: ${deviceId} (${calibration_type})`);
            
            res.json({ 
                success: true, 
                calibration_id: calibrationId,
                message: '设备校准成功' 
            });
        } catch (error) {
            console.error('创建设备校准记录失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
    } catch (error) {
        console.error('设备校准API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取设备校准记录
app.get('/api/devices/:deviceId/calibrations', (req, res) => {
    try {
        const { deviceId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        try {
            const rows = db.db.all(
                `SELECT dc.*, u.username as performed_by_name 
                 FROM device_calibrations dc 
                 LEFT JOIN users u ON dc.performed_by = u.id 
                 WHERE dc.device_id = ? 
                 ORDER BY dc.performed_at DESC LIMIT ? OFFSET ?`,
                [deviceId, parseInt(limit), parseInt(offset)]
            );
            
            // 解析JSON字段
            const calibrations = rows.map(row => ({
                ...row,
                parameters: JSON.parse(row.parameters || '{}'),
                results: row.results ? JSON.parse(row.results) : null
            }));
            
            res.json({ success: true, calibrations });
        } catch (error) {
            console.error('获取设备校准记录失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
    } catch (error) {
        console.error('获取设备校准记录API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 设备连接/断开
app.post('/api/devices/:deviceId/connect', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { action } = req.body; // 'connect' or 'disconnect'
        
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session || !['admin', 'supervisor', 'operator'].includes(session.user.role)) {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        // 获取设备信息
        const device = db.db.get('SELECT * FROM devices WHERE id = ?', [deviceId]);
        
        if (!device) {
            res.status(404).json({ success: false, message: '设备不存在' });
            return;
        }
        
        let result;
        if (action === 'connect') {
            result = await serialService.connect();
            
            // 更新设备状态
            db.db.run(
                'UPDATE devices SET is_connected = 1, status = ?, last_connection = ? WHERE id = ?',
                ['online', new Date().toISOString(), deviceId]
            );
            
            // 记录设备日志
            db.db.run(
                'INSERT INTO device_logs (device_id, log_type, level, message, user_id, session_id) VALUES (?, ?, ?, ?, ?, ?)',
                [deviceId, 'connection', 'info', `设备连接 - ${session.user.username}`, session.user.id, sessionId]
            );
            
        } else {
            result = await serialService.disconnect();
            
            // 更新设备状态
            db.db.run(
                'UPDATE devices SET is_connected = 0, status = ?, last_connection = ? WHERE id = ?',
                ['offline', new Date().toISOString(), deviceId]
            );
            
            // 记录设备日志
            db.db.run(
                'INSERT INTO device_logs (device_id, log_type, level, message, user_id, session_id) VALUES (?, ?, ?, ?, ?, ?)',
                [deviceId, 'connection', 'info', `设备断开 - ${session.user.username}`, session.user.id, sessionId]
            );
        }
        
        // 记录审计日志
        db.auditLog(session.user.id, session.user.username, 'DEVICE_CONNECTION', 
                   `${action === 'connect' ? '连接' : '断开'}设备: ${deviceId}`);
        
        res.json({
            success: true,
            device_id: deviceId,
            action: action,
            status: action === 'connect' ? 'connected' : 'disconnected',
            message: `设备${action === 'connect' ? '连接' : '断开'}成功`
        });
    } catch (error) {
        console.error('设备连接API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取设备日志
app.get('/api/devices/:deviceId/logs', (req, res) => {
    try {
        const { deviceId } = req.params;
        const { level, log_type, limit = 100, offset = 0 } = req.query;
        
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        let query = 'SELECT dl.*, u.username as user_name FROM device_logs dl LEFT JOIN users u ON dl.user_id = u.id WHERE device_id = ?';
        const params = [deviceId];
        
        if (level) {
            query += ' AND dl.level = ?';
            params.push(level);
        }
        
        if (log_type) {
            query += ' AND dl.log_type = ?';
            params.push(log_type);
        }
        
        query += ' ORDER BY dl.timestamp DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        try {
            const rows = db.db.all(query, params);
            
            // 解析JSON字段
            const logs = rows.map(row => ({
                ...row,
                details: row.details ? JSON.parse(row.details) : null
            }));
            
            res.json({ success: true, logs });
        } catch (error) {
            console.error('获取设备日志失败:', error);
            res.status(500).json({ success: false, message: '数据库错误' });
        }
    } catch (error) {
        console.error('获取设备日志API错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 设置串口服务事件监听
serialService.on('connected', (data) => {
    console.log('串口连接事件:', data);
});

serialService.on('disconnected', (data) => {
    console.log('串口断开事件:', data);
});

serialService.on('data', (data) => {
    console.log('串口数据事件:', data);
});

serialService.on('frame', (data) => {
    console.log('协议帧事件:', data);
});

// 默认页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'renderer', 'index.html'));
});

// ==================== 验证服务 API 端点 ====================

// 初始化验证服务
const validationService = new ValidationService({
    getDatabase: () => db
});

// 数据完整性验证
app.post('/api/validation/data-integrity', async (req, res) => {
    try {
        const { data, expectedHash, algorithm = 'sha256' } = req.body;
        const result = validationService.validateDataIntegrity(data, expectedHash, algorithm);
        
        // 记录审计日志
        await validationService.recordAuditLog(null, 'system', '数据完整性验证', 
            `验证数据完整性: ${result.valid ? '通过' : '失败'}`, result.timestamp);
        
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 生成电子签名
app.post('/api/validation/generate-signature', async (req, res) => {
    try {
        const { document, signer, action } = req.body;
        const signature = await validationService.generateElectronicSignature(document, signer, action);
        
        res.json({ success: true, signature });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 验证电子签名
app.post('/api/validation/verify-signature', async (req, res) => {
    try {
        const { signatureId } = req.body;
        const result = await validationService.validateElectronicSignature(signatureId);
        
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 文件完整性验证
app.post('/api/validation/file-integrity', async (req, res) => {
    try {
        const { filePath, expectedChecksum } = req.body;
        const result = await validationService.validateFileIntegrity(filePath, expectedChecksum);
        
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 数据库完整性检查
app.get('/api/validation/database-integrity', async (req, res) => {
    try {
        const result = await validationService.performDatabaseIntegrityCheck();
        
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 生成验证报告
app.post('/api/validation/generate-report', async (req, res) => {
    try {
        const { title, period, scope } = req.body;
        const report = await validationService.generateValidationReport({ title, period, scope });
        
        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// CFR 21 Part 11 合规性评估
app.get('/api/validation/cfr21-compliance', async (req, res) => {
    try {
        const compliance = await validationService.assessCFR21Compliance();
        
        res.json({ success: true, compliance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取验证历史
app.get('/api/validation/history', (req, res) => {
    try {
        const { type } = req.query;
        const history = validationService.getValidationHistory(type);
        
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 清空验证历史
app.delete('/api/validation/history', (req, res) => {
    try {
        validationService.clearValidationHistory();
        
        res.json({ success: true, message: '验证历史已清空' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 系统设置相关API ====================

// 获取系统设置
app.get('/api/settings', async (req, res) => {
    try {
        const result = await systemSettingsService.getSystemSettings();
        res.json(result);
    } catch (error) {
        console.error('获取系统设置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 更新系统设置
app.put('/api/settings', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        if (!['admin', 'supervisor'].includes(session.user.role)) {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        const result = await systemSettingsService.updateSystemSettings(req.body);
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'SETTINGS_UPDATE', '系统设置已更新');
        }
        
        res.json(result);
    } catch (error) {
        console.error('更新系统设置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 重置系统设置为默认值
app.post('/api/settings/reset', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        if (session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '仅管理员可以重置设置' });
        }
        
        const result = await systemSettingsService.resetToDefaults();
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'SETTINGS_RESET', '系统设置已重置为默认值');
        }
        
        res.json(result);
    } catch (error) {
        console.error('重置系统设置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取硬件配置
app.get('/api/settings/hardware', async (req, res) => {
    try {
        const result = await systemSettingsService.getHardwareConfig();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('获取硬件配置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 更新硬件配置
app.put('/api/settings/hardware', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        if (!['admin', 'supervisor'].includes(session.user.role)) {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        // 验证请求数据
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ 
                success: false, 
                error: '请求数据必须是有效的对象' 
            });
        }
        
        const result = await systemSettingsService.updateHardwareConfig(req.body);
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'HARDWARE_CONFIG_UPDATE', '硬件配置已更新');
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('更新硬件配置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 切换硬件通讯模式
app.post('/api/hardware/mode', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        if (!['admin', 'supervisor'].includes(session.user.role)) {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        const { mode } = req.body;
        const result = await systemSettingsService.switchHardwareMode(mode);
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'HARDWARE_MODE_SWITCH', `切换到${mode === 'simulated' ? '模拟' : '真实硬件'}模式`);
        }
        
        res.json(result);
    } catch (error) {
        console.error('切换硬件模式失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取用户偏好设置
app.get('/api/settings/preferences', async (req, res) => {
    try {
        const { userId = 'default' } = req.query;
        const result = await systemSettingsService.getUserPreferences(userId);
        res.json(result);
    } catch (error) {
        console.error('获取用户偏好失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 更新用户偏好设置
app.put('/api/settings/preferences', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { userId = session.user.username, preferences } = req.body;
        const result = await systemSettingsService.updateUserPreferences(preferences, userId);
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'USER_PREFERENCES_UPDATE', '用户偏好设置已更新');
        }
        
        res.json(result);
    } catch (error) {
        console.error('更新用户偏好失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 导出系统配置
app.get('/api/settings/export', async (req, res) => {
    try {
        const { format = 'json' } = req.query;
        const result = await systemSettingsService.exportConfiguration(format);
        
        if (result.success) {
            // 检查权限
            const sessionId = req.headers['x-session-id'];
            const session = sessions.get(sessionId);
            
            if (session) {
                db.auditLog(session.user.id, session.user.username, 'SETTINGS_EXPORT', `导出系统配置: ${format}格式`);
            }
            
            res.setHeader('Content-Type', result.data.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.data.fileName}"`);
            
            const fileContent = require('fs').readFileSync(result.data.path);
            res.send(fileContent);
            
            // 删除临时文件
            require('fs').unlinkSync(result.data.path);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('导出系统配置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 导入系统配置
app.post('/api/settings/import', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        if (session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '仅管理员可以导入配置' });
        }
        
        const { fileData, format = 'json' } = req.body;
        const result = await systemSettingsService.importConfiguration(fileData, format);
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'SETTINGS_IMPORT', `导入系统配置: ${format}格式`);
        }
        
        res.json(result);
    } catch (error) {
        console.error('导入系统配置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== 硬件通讯相关API ====================

// 初始化硬件通讯
app.post('/api/hardware/initialize', async (req, res) => {
    try {
        const { mode } = req.body;
        const result = await hardwareCommunicationService.initialize(mode);
        res.json(result);
    } catch (error) {
        console.error('硬件通讯初始化失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取硬件状态
app.get('/api/hardware/status', async (req, res) => {
    try {
        const result = hardwareCommunicationService.getHardwareStatus();
        res.json(result);
    } catch (error) {
        console.error('获取硬件状态失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 开始数据采集
app.post('/api/hardware/acquisition/start', async (req, res) => {
    try {
        const { options = {} } = req.body;
        const result = await hardwareCommunicationService.startAcquisition(options);
        res.json(result);
    } catch (error) {
        console.error('开始数据采集失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 停止数据采集
app.post('/api/hardware/acquisition/stop', async (req, res) => {
    try {
        const result = await hardwareCommunicationService.stopAcquisition();
        
        // 确保所有响应都有统一的格式
        if (!result || typeof result !== 'object') {
            return res.status(500).json({
                success: false,
                error: '服务返回无效结果',
                timestamp: new Date().toISOString()
            });
        }
        
        // 添加时间戳到响应中（如果不存在）
        if (!result.timestamp) {
            result.timestamp = new Date().toISOString();
        }
        
        res.json(result);
    } catch (error) {
        console.error('停止数据采集失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取当前谱线数据
app.get('/api/hardware/spectrum/current', async (req, res) => {
    try {
        const result = hardwareCommunicationService.getCurrentSpectrum();
        res.json(result);
    } catch (error) {
        console.error('获取当前谱线失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取历史数据
app.get('/api/hardware/spectrum/history', async (req, res) => {
    try {
        const { startTime, endTime, limit = 100, offset = 0 } = req.query;
        const options = {
            startTime,
            endTime,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
        
        const result = hardwareCommunicationService.getHistoricalData(options);
        res.json(result);
    } catch (error) {
        console.error('获取历史数据失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取可用串口列表
app.get('/api/hardware/ports', async (req, res) => {
    try {
        const result = await hardwareCommunicationService.getAvailablePorts();
        res.json(result);
    } catch (error) {
        console.error('获取串口列表失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 测试串口连接
app.post('/api/hardware/ports/test', async (req, res) => {
    try {
        const { portPath, config = {} } = req.body;
        const result = await hardwareCommunicationService.testPortConnection(portPath, config);
        res.json(result);
    } catch (error) {
        console.error('测试串口连接失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取模拟设备配置
app.get('/api/hardware/simulated-devices', async (req, res) => {
    try {
        const result = hardwareCommunicationService.getSimulatedDevices();
        res.json(result);
    } catch (error) {
        console.error('获取模拟设备配置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 配置模拟设备
app.put('/api/hardware/simulated-devices', async (req, res) => {
    try {
        const { deviceType, options = {} } = req.body;
        const result = hardwareCommunicationService.configureSimulatedDevice(deviceType, options);
        res.json(result);
    } catch (error) {
        console.error('配置模拟设备失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 断开硬件连接
app.post('/api/hardware/disconnect', async (req, res) => {
    try {
        const result = await hardwareCommunicationService.disconnect();
        res.json(result);
    } catch (error) {
        console.error('断开硬件连接失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== 探头控制相关API ====================

// 初始化探头控制系统
app.post('/api/probe/initialize', async (req, res) => {
    try {
        const result = await probeControlService.initialize();
        
        // 记录审计日志
        if (result.success) {
            const sessionId = req.headers['x-session-id'];
            const session = sessions.get(sessionId);
            if (session) {
                db.auditLog(session.user.id, session.user.username, 'PROBE_INIT', '探头控制系统已初始化');
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('初始化探头控制系统失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取当前位置
app.get('/api/probe/position', async (req, res) => {
    try {
        const result = probeControlService.getCurrentPosition();
        res.json(result);
    } catch (error) {
        console.error('获取当前位置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 移动到指定位置
app.post('/api/probe/move-to', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { position, options = {} } = req.body;
        
        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
            return res.status(400).json({ 
                success: false, 
                error: '请提供有效的位置坐标 (x, y, z)' 
            });
        }
        
        const result = await probeControlService.moveToPosition(position, options);
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'PROBE_MOVE', 
                `移动到位置: x=${position.x}, y=${position.y}, z=${position.z}`);
        }
        
        res.json(result);
    } catch (error) {
        console.error('移动到位置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 暂停运动
app.post('/api/probe/pause', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const result = await probeControlService.pauseMovement();
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'PROBE_PAUSE', '探头运动已暂停');
        }
        
        res.json(result);
    } catch (error) {
        console.error('暂停运动失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 恢复运动
app.post('/api/probe/resume', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const result = await probeControlService.resumeMovement();
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'PROBE_RESUME', '探头运动已恢复');
        }
        
        res.json(result);
    } catch (error) {
        console.error('恢复运动失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 取消运动
app.post('/api/probe/cancel', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const result = await probeControlService.cancelMovement();
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'PROBE_CANCEL', '探头运动已取消');
        }
        
        res.json(result);
    } catch (error) {
        console.error('取消运动失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 紧急停止
app.post('/api/probe/emergency-stop', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { reason = 'manual' } = req.body;
        
        const result = await probeControlService.emergencyStop(reason);
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'PROBE_EMERGENCY_STOP', 
                `紧急停止已触发，原因: ${reason}`);
        }
        
        res.json(result);
    } catch (error) {
        console.error('紧急停止失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取运动状态
app.get('/api/probe/status', async (req, res) => {
    try {
        const result = probeControlService.getMotionStatus();
        res.json(result);
    } catch (error) {
        console.error('获取运动状态失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取系统配置
app.get('/api/probe/config', async (req, res) => {
    try {
        const result = probeControlService.getConfiguration();
        res.json(result);
    } catch (error) {
        console.error('获取系统配置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 预验证位置
app.post('/api/probe/validate-position', async (req, res) => {
    try {
        const { position } = req.body;
        
        if (!position || typeof position !== 'object') {
            return res.status(400).json({
                success: false,
                error: '请提供有效的位置对象'
            });
        }
        
        // 检查位置格式
        if (typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
            return res.status(400).json({
                success: false,
                error: '位置坐标必须是数字'
            });
        }
        
        // 边界检查
        const boundaryCheck = probeControlService.checkBoundary(position);
        if (!boundaryCheck.valid) {
            return res.json({
                success: true,
                data: {
                    valid: false,
                    errors: boundaryCheck.errors,
                    warnings: []
                }
            });
        }
        
        // 获取配置验证警告
        const configResult = probeControlService.getConfiguration();
        let warnings = [];
        if (configResult.success) {
            const config = configResult.data.config;
            
            // 检查速度警告
            if (config.speed && config.speed.max > 200) {
                warnings.push('当前最大速度设置较高，建议测试设备响应性');
            }
            
            // 检查工作区域警告
            if (config.workArea) {
                const area = (config.workArea.x.max - config.workArea.x.min) * 
                           (config.workArea.y.max - config.workArea.y.min) * 
                           (config.workArea.z.max - config.workArea.z.min);
                if (area > 1000000) {
                    warnings.push('工作区域体积较大，请确保设备物理空间充足');
                }
            }
            
            // 检查精度警告
            if (config.accuracy && config.accuracy.positional < 0.01) {
                warnings.push('位置精度要求很高，请确认设备能达到此精度');
            }
        }
        
        res.json({
            success: true,
            data: {
                valid: true,
                errors: [],
                warnings: warnings
            }
        });
        
    } catch (error) {
        console.error('验证位置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 预验证配置
app.post('/api/probe/pre-validate-config', async (req, res) => {
    try {
        const { config } = req.body;
        
        if (!config || typeof config !== 'object') {
            return res.status(400).json({
                success: false,
                error: '请提供有效的配置对象'
            });
        }
        
        // 使用服务的预验证功能
        const validationResult = probeControlService.preValidateConfiguration(config);
        
        res.json({
            success: true,
            data: validationResult
        });
        
    } catch (error) {
        console.error('预验证配置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 更新系统配置
app.put('/api/probe/config', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        if (session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '仅管理员可以更新配置' });
        }
        
        const { config } = req.body;
        
        if (!config || typeof config !== 'object') {
            return res.status(400).json({ 
                success: false, 
                error: '请提供有效的配置对象' 
            });
        }
        
        const result = await probeControlService.updateConfiguration(config);
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'PROBE_CONFIG_UPDATE', '探头系统配置已更新');
        }
        
        res.json(result);
    } catch (error) {
        console.error('更新系统配置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 重置位置
app.post('/api/probe/reset', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { homePosition = { x: 0, y: 0, z: 0 }, options = {} } = req.body;
        
        const result = await probeControlService.resetPosition({ homePosition, ...options });
        
        // 记录审计日志
        if (result.success) {
            db.auditLog(session.user.id, session.user.username, 'PROBE_RESET', '探头位置已重置');
        }
        
        res.json(result);
    } catch (error) {
        console.error('重置位置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取操作历史
app.get('/api/probe/operations', async (req, res) => {
    try {
        const { 
            limit = 100, 
            offset = 0, 
            operationType = null, 
            startTime = null, 
            endTime = null 
        } = req.query;
        
        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset),
            operationType,
            startTime,
            endTime
        };
        
        const result = await probeControlService.getOperationHistory(options);
        res.json(result);
    } catch (error) {
        console.error('获取操作历史失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 断开探头控制系统连接
app.post('/api/probe/disconnect', async (req, res) => {
    try {
        const result = await probeControlService.disconnect();
        
        // 记录审计日志
        if (result.success) {
            const sessionId = req.headers['x-session-id'];
            const session = sessions.get(sessionId);
            if (session) {
                db.auditLog(session.user.id, session.user.username, 'PROBE_DISCONNECT', '探头控制系统已断开');
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('断开探头控制系统失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== 数据采集和处理相关API ====================

// 开始数据分析
app.post('/api/data-processing/start', async (req, res) => {
    try {
        const { detectorType = 'hpge_detector' } = req.body;
        const result = await dataProcessingService.startAnalysis(detectorType);
        
        // 记录审计日志
        if (result.success) {
            const sessionId = req.headers['x-session-id'];
            const session = sessions.get(sessionId);
            if (session) {
                db.auditLog(session.user.id, session.user.username, 'DATA_ANALYSIS_START', 
                    `开始数据分析，探测器类型: ${detectorType}`);
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('开始数据分析失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 停止数据分析
app.post('/api/data-processing/stop', async (req, res) => {
    try {
        const result = await dataProcessingService.stopAnalysis();
        
        // 记录审计日志
        if (result.success) {
            const sessionId = req.headers['x-session-id'];
            const session = sessions.get(sessionId);
            if (session) {
                db.auditLog(session.user.id, session.user.username, 'DATA_ANALYSIS_STOP', '停止数据分析');
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('停止数据分析失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取当前谱线
app.get('/api/data-processing/spectrum/current', async (req, res) => {
    try {
        const result = dataProcessingService.getCurrentSpectrum();
        res.json(result);
    } catch (error) {
        console.error('获取当前谱线失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取分析状态
app.get('/api/data-processing/status', async (req, res) => {
    try {
        const result = dataProcessingService.getAnalysisState();
        res.json(result);
    } catch (error) {
        console.error('获取分析状态失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取处理统计
app.get('/api/data-processing/stats', async (req, res) => {
    try {
        const result = dataProcessingService.getProcessingStats();
        res.json(result);
    } catch (error) {
        console.error('获取处理统计失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 手动处理谱线数据
app.post('/api/data-processing/process', async (req, res) => {
    try {
        const { spectrum, totalCounts = 0, liveTime = 0, realTime = 0, detectorType = 'hpge_detector' } = req.body;
        
        if (!spectrum || !Array.isArray(spectrum)) {
            return res.status(400).json({
                success: false,
                error: '请提供有效的谱线数据数组'
            });
        }
        
        // 模拟处理流程
        const data = {
            spectrum: spectrum,
            totalCounts: totalCounts,
            liveTime: liveTime,
            realTime: realTime,
            timestamp: new Date().toISOString(),
            device: { type: detectorType }
        };
        
        await dataProcessingService.processSpectrumData(data);
        
        const result = dataProcessingService.getCurrentSpectrum();
        
        res.json(result);
    } catch (error) {
        console.error('处理谱线数据失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取历史谱线数据
app.get('/api/data-processing/spectrum/history', async (req, res) => {
    try {
        const { limit = 100, offset = 0, detectorType = null } = req.query;
        
        let query = `
            SELECT id, timestamp, detector_type, channel_count, total_counts, live_time, real_time
            FROM spectrum_data
            WHERE 1=1
        `;
        
        const params = [];
        
        if (detectorType) {
            query += ' AND detector_type = ?';
            params.push(detectorType);
        }
        
        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const spectra = db.db.all(query, params);
        
        res.json({
            success: true,
            data: {
                spectra: spectra,
                pagination: {
                    total: await getSpectrumCount(detectorType),
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            }
        });
    } catch (error) {
        console.error('获取历史谱线失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取谱线详情
app.get('/api/data-processing/spectrum/:id', async (req, res) => {
    try {
        const spectrumId = req.params.id;
        
        const query = 'SELECT * FROM spectrum_data WHERE id = ?';
        const spectrum = db.db.get(query, [spectrumId]);
        
        if (!spectrum) {
            return res.status(404).json({
                success: false,
                error: '谱线数据未找到'
            });
        }
        
        // 解析谱线数据
        spectrum.spectrum_data = JSON.parse(spectrum.spectrum_data);
        
        res.json({
            success: true,
            data: spectrum
        });
    } catch (error) {
        console.error('获取谱线详情失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取峰分析结果
app.get('/api/data-processing/peaks/:spectrumId', async (req, res) => {
    try {
        const spectrumId = req.params.spectrumId;
        
        const query = `
            SELECT * FROM peak_analysis 
            WHERE spectrum_id = ? 
            ORDER BY peak_energy ASC
        `;
        
        const peaks = db.db.all(query, [spectrumId]);
        
        res.json({
            success: true,
            data: peaks
        });
    } catch (error) {
        console.error('获取峰分析结果失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取定量分析结果
app.get('/api/data-processing/quantitative/:spectrumId', async (req, res) => {
    try {
        const spectrumId = req.params.spectrumId;
        
        const query = `
            SELECT * FROM quantitative_analysis 
            WHERE spectrum_id = ? 
            ORDER BY activity_bq DESC
        `;
        
        const results = db.db.all(query, [spectrumId]);
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('获取定量分析结果失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取处理日志
app.get('/api/data-processing/logs', async (req, res) => {
    try {
        const { limit = 100, offset = 0, operationType = null } = req.query;
        
        let query = `
            SELECT * FROM data_processing_log
            WHERE 1=1
        `;
        
        const params = [];
        
        if (operationType) {
            query += ' AND operation_type = ?';
            params.push(operationType);
        }
        
        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const logs = db.db.all(query, params);
        
        res.json({
            success: true,
            data: {
                logs: logs.map(log => ({
                    ...log,
                    operation_data: log.operation_data ? JSON.parse(log.operation_data) : null
                })),
                pagination: {
                    total: await getProcessingLogCount(operationType),
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            }
        });
    } catch (error) {
        console.error('获取处理日志失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 更新数据处理配置
app.put('/api/data-processing/config', async (req, res) => {
    try {
        // 检查权限
        const sessionId = req.headers['x-session-id'];
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        if (session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '仅管理员可以更新配置' });
        }
        
        const { config } = req.body;
        
        if (!config || typeof config !== 'object') {
            return res.status(400).json({
                success: false,
                error: '请提供有效的配置对象'
            });
        }
        
        // 更新配置
        dataProcessingService.config = { ...dataProcessingService.config, ...config };
        
        // 保存到数据库
        await saveDataProcessingConfig(config);
        
        // 记录审计日志
        db.auditLog(session.user.id, session.user.username, 'DATA_PROCESSING_CONFIG_UPDATE', '数据处理配置已更新');
        
        res.json({
            success: true,
            message: '数据处理配置已更新',
            config: dataProcessingService.config,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('更新数据处理配置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 获取数据处理配置
app.get('/api/data-processing/config', async (req, res) => {
    try {
        const result = {
            success: true,
            data: {
                config: dataProcessingService.config,
                detectorTypes: Object.keys(dataProcessingService.config.detectorTypes),
                nuclideDatabase: Object.keys(dataProcessingService.config.nuclideDatabase),
                timestamp: new Date().toISOString()
            }
        };
        
        res.json(result);
    } catch (error) {
        console.error('获取数据处理配置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 清理数据处理资源
app.post('/api/data-processing/cleanup', async (req, res) => {
    try {
        await dataProcessingService.cleanup();
        
        res.json({
            success: true,
            message: '数据处理资源已清理',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('清理数据处理资源失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 辅助函数
async function getSpectrumCount(detectorType) {
    try {
        let query = 'SELECT COUNT(*) as count FROM spectrum_data WHERE 1=1';
        const params = [];
        
        if (detectorType) {
            query += ' AND detector_type = ?';
            params.push(detectorType);
        }
        
        const result = db.db.get(query, params);
        return result.count;
    } catch (error) {
        return 0;
    }
}

async function getProcessingLogCount(operationType) {
    try {
        let query = 'SELECT COUNT(*) as count FROM data_processing_log WHERE 1=1';
        const params = [];
        
        if (operationType) {
            query += ' AND operation_type = ?';
            params.push(operationType);
        }
        
        const result = db.db.get(query, params);
        return result.count;
    } catch (error) {
        return 0;
    }
}

async function saveDataProcessingConfig(config) {
    try {
        for (const [category, settings] of Object.entries(config)) {
            for (const [key, value] of Object.entries(settings)) {
                const fullKey = `${category}_${key}`;
                const query = `
                    INSERT OR REPLACE INTO system_settings 
                    (category, key, value) 
                    VALUES ('data_processing', ?, ?)
                `;
                db.db.run(query, [fullKey, JSON.stringify(value)]);
            }
        }
    } catch (error) {
        console.error('保存数据处理配置失败:', error);
        throw error;
    }
}

// ==================== 协议命令生成函数 ====================

function generateMoveCommand(x, y, z, speed = 10) {
    const { ProtocolUtils, PROTOCOL } = require('./protocol/DeviceProtocol');
    const positionData = { x, y, z, speed };
    const data = ProtocolUtils.encodePositionData(positionData);
    return ProtocolUtils.generateFrame(PROTOCOL.COMMANDS.PROBE_MOVE_TO, data);
}

function generateHomeCommand() {
    const { ProtocolUtils, PROTOCOL } = require('./protocol/DeviceProtocol');
    return ProtocolUtils.generateFrame(PROTOCOL.COMMANDS.PROBE_HOME);
}

function generateEmergencyStopCommand() {
    const { ProtocolUtils, PROTOCOL } = require('./protocol/DeviceProtocol');
    return ProtocolUtils.generateFrame(PROTOCOL.COMMANDS.PROBE_EMERGENCY_STOP);
}

function generateMeasurementStartCommand() {
    const { ProtocolUtils, PROTOCOL } = require('./protocol/DeviceProtocol');
    return ProtocolUtils.generateFrame(PROTOCOL.COMMANDS.MEASUREMENT_START);
}

function generateMeasurementStopCommand() {
    const { ProtocolUtils, PROTOCOL } = require('./protocol/DeviceProtocol');
    return ProtocolUtils.generateFrame(PROTOCOL.COMMANDS.MEASUREMENT_STOP);
}

// 启动服务器
app.listen(PORT, () => {
    console.log('\n===================================================');
    console.log('  辐射检测器软件 - Web版本');
    console.log('  CFR 21 Part 11 合规');
    console.log('===================================================');
    console.log(`✅ 服务器运行在: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 功能说明:');
    console.log('   - 用户认证 (默认: admin / Admin123!)');
    console.log('   - 串口通信模拟 (COM2/COM3)');
    console.log('   - 实时数据收集');
    console.log('   - 审计日志记录');
    console.log('   - 设备管理');
    console.log('');
    console.log('⚠️  注意: 这是Web模拟版本');
    console.log('   - 串口功能为模拟实现');
    console.log('   - 数据保存在内存中');
    console.log('   - 仅用于演示和界面测试');
    console.log('');
    console.log('🔒 默认登录信息:');
    console.log('   用户名: admin');
    console.log('   密码: Admin123!');
    console.log('   角色: 管理员');
    console.log('');
    console.log('===================================================\n');
    
    // 自动创建默认设备
    try {
        db.db.run(
            'INSERT OR IGNORE INTO devices (name, type, port, baud_rate, status) VALUES (?, ?, ?, ?, ?)',
            ['碘化钠探头', 'probe', 'COM2', 9600, 'offline']
        );
        
        db.db.run(
            'INSERT OR IGNORE INTO devices (name, type, port, baud_rate, status) VALUES (?, ?, ?, ?, ?)',
            ['计数器', 'detector', 'COM3', 9600, 'offline']
        );
    } catch (error) {
        console.error('创建默认设备失败:', error);
    }
});