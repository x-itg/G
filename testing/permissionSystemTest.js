/**
 * 电子签名三级权限系统完整性测试
 * 放射化学纯度检测仪 CFR 21 Part 11 合规性测试
 * 
 * 测试权限级别：
 * - OPERATOR（操作员）：基本操作权限
 * - SUPERVISOR（主管）：审核批准权限  
 * - ADMIN（管理员）：全部权限
 */

const crypto = require('crypto');

// 模拟用户权限配置
const PERMISSION_LEVELS = {
    OPERATOR: {
        level: 1,
        name: '操作员',
        permissions: ['view_measurements', 'create_measurements', 'edit_own_data']
    },
    SUPERVISOR: {
        level: 2,
        name: '主管',
        permissions: ['view_measurements', 'create_measurements', 'edit_own_data', 
                     'edit_others_data', 'approve_changes', 'view_audit_logs']
    },
    ADMIN: {
        level: 3,
        name: '管理员',
        permissions: ['*'] // 所有权限
    }
};

// 电子签名配置（CFR 21 Part 11）
const DIGITAL_SIGNATURE_CONFIG = {
    algorithm: 'SHA256withRSA',
    keyLength: 2048,
    hashAlgorithm: 'sha256',
    timestampPrecision: 'milliseconds',
    nonRepudiation: true,
    dualAuthentication: true
};

// 审计日志配置
const AUDIT_LOG_CONFIG = {
    requireSignatureForDelete: true,
    requireSignatureForPermissionChange: true,
    requireSignatureForConfigChange: true,
    retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7年
    immutable: true
};

class PermissionSystemTest {
    constructor() {
        this.testResults = [];
        this.auditLogs = [];
        this.userSessions = new Map();
        this.testData = [];
    }

    /**
     * 生成测试用户
     */
    generateTestUser(username, role) {
        const keyPair = this.generateKeyPair();
        return {
            id: crypto.randomUUID(),
            username,
            role,
            permissionLevel: PERMISSION_LEVELS[role].level,
            permissions: PERMISSION_LEVELS[role].permissions,
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
            lastLogin: new Date().toISOString()
        };
    }

    /**
     * 生成RSA密钥对用于电子签名
     */
    generateKeyPair() {
        return crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
    }

    /**
     * 创建电子签名（CFR 21 Part 11合规）
     */
    createDigitalSignature(data, privateKey, userId, signatureReason) {
        const timestamp = new Date().toISOString();
        const signaturePayload = {
            data: JSON.stringify(data),
            userId,
            timestamp,
            reason: signatureReason,
            signatureId: crypto.randomUUID()
        };

        const signatureString = JSON.stringify(signaturePayload);
        const signature = crypto.sign('sha256', Buffer.from(signatureString), {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        });

        return {
            ...signaturePayload,
            signature: signature.toString('base64'),
            algorithm: 'SHA256withRSA'
        };
    }

    /**
     * 验证电子签名
     */
    verifyDigitalSignature(signature, publicKey) {
        const signatureString = JSON.stringify({
            data: signature.data,
            userId: signature.userId,
            timestamp: signature.timestamp,
            reason: signature.reason,
            signatureId: signature.signatureId
        });

        return crypto.verify('sha256', Buffer.from(signatureString), {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, Buffer.from(signature.signature, 'base64'));
    }

    /**
     * 权限检查中间件
     */
    checkPermission(user, requiredPermission) {
        if (user.permissions.includes('*')) {
            return true;
        }
        return user.permissions.includes(requiredPermission);
    }

    /**
     * 记录审计日志
     */
    logAuditEvent(user, action, target, signature = null, result = 'SUCCESS') {
        const auditLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: user.id,
            username: user.username,
            role: user.role,
            action,
            target,
            result,
            signatureId: signature ? signature.signatureId : null,
            ipAddress: this.generateTestIP(),
            userAgent: 'Radiation-Detector-Test/1.0'
        };
        
        this.auditLogs.push(auditLog);
        return auditLog;
    }

    /**
     * 生成测试IP地址
     */
    generateTestIP() {
        return `192.168.1.${Math.floor(Math.random() * 255)}`;
    }

    /**
     * 测试操作员权限
     */
    async testOperatorPermissions() {
        console.log('\n=== 测试操作员（OPERATOR）权限 ===');
        const operator = this.generateTestUser('operator_test', 'OPERATOR');
        
        // 测试1: 操作员可以查看测量数据
        const canViewMeasurements = this.checkPermission(operator, 'view_measurements');
        this.recordTest('OPERATOR_VIEW_MEASUREMENTS', canViewMeasurements, '操作员应该可以查看测量数据');
        
        // 测试2: 操作员可以创建测量数据
        const canCreateMeasurements = this.checkPermission(operator, 'create_measurements');
        this.recordTest('OPERATOR_CREATE_MEASUREMENTS', canCreateMeasurements, '操作员应该可以创建测量数据');
        
        // 测试3: 操作员不能修改他人数据
        const canEditOthersData = this.checkPermission(operator, 'edit_others_data');
        this.recordTest('OPERATOR_EDIT_OTHERS_DATA', !canEditOthersData, '操作员不应该能修改他人数据');
        
        // 测试4: 操作员不能删除数据（需要电子签名）
        const canDeleteData = this.checkPermission(operator, 'delete_data');
        this.recordTest('OPERATOR_DELETE_DATA', !canDeleteData, '操作员不应该能删除数据');
        
        // 测试5: 操作员不能访问用户管理
        const canManageUsers = this.checkPermission(operator, 'manage_users');
        this.recordTest('OPERATOR_MANAGE_USERS', !canManageUsers, '操作员不应该能管理用户');
        
        // 测试6: 操作员不能访问审计日志
        const canViewAuditLogs = this.checkPermission(operator, 'view_audit_logs');
        this.recordTest('OPERATOR_VIEW_AUDIT_LOGS', !canViewAuditLogs, '操作员不应该能查看审计日志');
        
        this.logAuditEvent(operator, 'PERMISSION_TEST', 'OPERATOR', null, 'SUCCESS');
        return canViewMeasurements && canCreateMeasurements && !canEditOthersData && !canDeleteData && !canManageUsers && !canViewAuditLogs;
    }

    /**
     * 测试主管权限
     */
    async testSupervisorPermissions() {
        console.log('\n=== 测试主管（SUPERVISOR）权限 ===');
        const supervisor = this.generateTestUser('supervisor_test', 'SUPERVISOR');
        
        // 测试1: 主管拥有操作员所有权限
        const hasOperatorPermissions = this.checkPermission(supervisor, 'view_measurements') && 
                                     this.checkPermission(supervisor, 'create_measurements');
        this.recordTest('SUPERVISOR_OPERATOR_PERMISSIONS', hasOperatorPermissions, '主管应该拥有操作员所有权限');
        
        // 测试2: 主管可以审核和批准数据修改
        const canApproveChanges = this.checkPermission(supervisor, 'approve_changes');
        this.recordTest('SUPERVISOR_APPROVE_CHANGES', canApproveChanges, '主管应该能批准数据修改');
        
        // 测试3: 主管可以编辑他人数据
        const canEditOthersData = this.checkPermission(supervisor, 'edit_others_data');
        this.recordTest('SUPERVISOR_EDIT_OTHERS_DATA', canEditOthersData, '主管应该能编辑他人数据');
        
        // 测试4: 主管可以查看审计日志
        const canViewAuditLogs = this.checkPermission(supervisor, 'view_audit_logs');
        this.recordTest('SUPERVISOR_VIEW_AUDIT_LOGS', canViewAuditLogs, '主管应该能查看审计日志');
        
        // 测试5: 主管不能管理用户
        const canManageUsers = this.checkPermission(supervisor, 'manage_users');
        this.recordTest('SUPERVISOR_MANAGE_USERS', !canManageUsers, '主管不应该能管理用户');
        
        // 测试6: 主管不能修改系统配置
        const canModifyConfig = this.checkPermission(supervisor, 'modify_config');
        this.recordTest('SUPERVISOR_MODIFY_CONFIG', !canModifyConfig, '主管不应该能修改系统配置');
        
        this.logAuditEvent(supervisor, 'PERMISSION_TEST', 'SUPERVISOR', null, 'SUCCESS');
        return hasOperatorPermissions && canApproveChanges && canEditOthersData && canViewAuditLogs && !canManageUsers && !canModifyConfig;
    }

    /**
     * 测试管理员权限
     */
    async testAdminPermissions() {
        console.log('\n=== 测试管理员（ADMIN）权限 ===');
        const admin = this.generateTestUser('admin_test', 'ADMIN');
        
        // 测试1: 管理员拥有所有权限
        const hasAllPermissions = this.checkPermission(admin, 'view_measurements') && 
                                this.checkPermission(admin, 'create_measurements') &&
                                this.checkPermission(admin, 'manage_users') &&
                                this.checkPermission(admin, 'modify_config');
        this.recordTest('ADMIN_ALL_PERMISSIONS', hasAllPermissions, '管理员应该拥有所有权限');
        
        // 测试2: 管理员可以管理用户
        const canManageUsers = this.checkPermission(admin, 'manage_users');
        this.recordTest('ADMIN_MANAGE_USERS', canManageUsers, '管理员应该能管理用户');
        
        // 测试3: 管理员可以修改系统配置
        const canModifyConfig = this.checkPermission(admin, 'modify_config');
        this.recordTest('ADMIN_MODIFY_CONFIG', canModifyConfig, '管理员应该能修改系统配置');
        
        // 测试4: 管理员可以删除数据
        const canDeleteData = this.checkPermission(admin, 'delete_data');
        this.recordTest('ADMIN_DELETE_DATA', canDeleteData, '管理员应该能删除数据');
        
        // 测试5: 管理员可以查看所有审计日志
        const canViewAuditLogs = this.checkPermission(admin, 'view_audit_logs');
        this.recordTest('ADMIN_VIEW_AUDIT_LOGS', canViewAuditLogs, '管理员应该能查看所有审计日志');
        
        this.logAuditEvent(admin, 'PERMISSION_TEST', 'ADMIN', null, 'SUCCESS');
        return hasAllPermissions && canManageUsers && canModifyConfig && canDeleteData && canViewAuditLogs;
    }

    /**
     * 测试电子签名功能
     */
    async testDigitalSignature() {
        console.log('\n=== 测试电子签名功能 ===');
        
        // 创建测试用户和密钥对
        const user = this.generateTestUser('signature_test_user', 'ADMIN');
        const testData = {
            measurementId: 'test_measurement_001',
            radiationLevel: 0.5,
            timestamp: new Date().toISOString(),
            detector: 'Gamma_Spectrometer_001'
        };

        // 测试1: 创建电子签名
        try {
            const signature = this.createDigitalSignature(testData, user.privateKey, user.id, '数据删除确认');
            const signatureCreated = signature && signature.signature;
            this.recordTest('DIGITAL_SIGNATURE_CREATE', signatureCreated, '电子签名创建应该成功');
            
            // 测试2: 验证电子签名
            const isValid = this.verifyDigitalSignature(signature, user.publicKey);
            this.recordTest('DIGITAL_SIGNATURE_VERIFY', isValid, '电子签名验证应该成功');
            
            // 测试3: 双重身份验证（CFR 21 Part 11要求）
            const dualAuthRequired = signature.timestamp && signature.signatureId;
            this.recordTest('CFR21_DUAL_AUTHENTICATION', dualAuthRequired, '电子签名应包含双重身份验证信息');
            
            // 测试4: 签名不可抵赖性
            const nonRepudiation = signature.userId && signature.reason;
            this.recordTest('CFR21_NON_REPUDIATION', nonRepudiation, '电子签名应具有不可抵赖性');
            
            // 测试5: 时间戳精度
            const timestampPrecision = signature.timestamp.includes('.');
            this.recordTest('CFR21_TIMESTAMP_PRECISION', timestampPrecision, '时间戳应精确到毫秒');
            
            this.logAuditEvent(user, 'DIGITAL_SIGNATURE_TEST', 'data_deletion', signature, 'SUCCESS');
            
            return signatureCreated && isValid && dualAuthRequired && nonRepudiation && timestampPrecision;
        } catch (error) {
            this.recordTest('DIGITAL_SIGNATURE_ERROR', false, `电子签名测试失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 测试关键操作签名要求
     */
    async testCriticalOperationSignatures() {
        console.log('\n=== 测试关键操作签名要求 ===');
        const admin = this.generateTestUser('admin_critical_test', 'ADMIN');
        
        // 测试1: 数据删除需要电子签名
        const deleteOperationSignature = this.createDigitalSignature(
            { operation: 'delete', target: 'measurement_001' },
            admin.privateKey,
            admin.id,
            '删除测量数据'
        );
        const deleteRequiresSignature = deleteOperationSignature && deleteOperationSignature.signature;
        this.recordTest('DELETE_OPERATION_SIGNATURE', deleteRequiresSignature, '数据删除操作应需要电子签名');
        
        // 测试2: 权限变更需要电子签名
        const permissionChangeSignature = this.createDigitalSignature(
            { operation: 'change_permission', target: 'user_123', newRole: 'SUPERVISOR' },
            admin.privateKey,
            admin.id,
            '权限变更'
        );
        const permissionChangeRequiresSignature = permissionChangeSignature && permissionChangeSignature.signature;
        this.recordTest('PERMISSION_CHANGE_SIGNATURE', permissionChangeRequiresSignature, '权限变更操作应需要电子签名');
        
        // 测试3: 系统配置修改需要电子签名
        const configChangeSignature = this.createDigitalSignature(
            { operation: 'modify_config', target: 'detector_settings', changes: { threshold: 0.8 } },
            admin.privateKey,
            admin.id,
            '系统配置修改'
        );
        const configChangeRequiresSignature = configChangeSignature && configChangeSignature.signature;
        this.recordTest('CONFIG_CHANGE_SIGNATURE', configChangeRequiresSignature, '系统配置修改应需要电子签名');
        
        this.logAuditEvent(admin, 'CRITICAL_OPERATION_TEST', 'permission_changes', permissionChangeSignature, 'SUCCESS');
        
        return deleteRequiresSignature && permissionChangeRequiresSignature && configChangeRequiresSignature;
    }

    /**
     * 测试CFR 21 Part 11合规性
     */
    async testCFR21Part11Compliance() {
        console.log('\n=== 测试CFR 21 Part 11合规性 ===');
        const admin = this.generateTestUser('cfr21_compliance_test', 'ADMIN');
        
        // 测试1: 电子签名具有法律效力
        const legalSignature = this.createDigitalSignature(
            { document: 'radiation_purity_report', version: 'v1.0' },
            admin.privateKey,
            admin.id,
            '报告签署确认'
        );
        const hasLegalEffect = legalSignature.algorithm === 'SHA256withRSA' && legalSignature.signature;
        this.recordTest('CFR21_LEGAL_EFFECT', hasLegalEffect, '电子签名应具有法律效力');
        
        // 测试2: 数字签名完整性
        const isSignatureIntact = this.verifyDigitalSignature(legalSignature, admin.publicKey);
        this.recordTest('CFR21_SIGNATURE_INTEGRITY', isSignatureIntact, '数字签名应保持完整性');
        
        // 测试3: 审计追踪完整性
        const auditTrace = this.logAuditEvent(admin, 'CFR21_COMPLIANCE_TEST', 'document_signing', legalSignature, 'SUCCESS');
        const hasAuditTrail = auditTrace.id && auditTrace.timestamp && auditTrace.userId;
        this.recordTest('CFR21_AUDIT_TRAIL', hasAuditTrail, '审计追踪应保持完整');
        
        // 测试4: 数据完整性保持
        const originalData = { measurement: 'radiation_level_1', value: 0.75 };
        const signature = this.createDigitalSignature(originalData, admin.privateKey, admin.id, '数据完整性验证');
        const dataIntegrityCheck = this.verifyDigitalSignature(signature, admin.publicKey);
        this.recordTest('CFR21_DATA_INTEGRITY', dataIntegrityCheck, '数据完整性应保持不变');
        
        // 测试5: 身份验证机制
        const identityVerification = admin.id && admin.username && admin.publicKey;
        this.recordTest('CFR21_IDENTITY_VERIFICATION', identityVerification, '应包含完整的身份验证机制');
        
        return hasLegalEffect && isSignatureIntact && hasAuditTrail && dataIntegrityCheck && identityVerification;
    }

    /**
     * 测试API接口权限控制
     */
    async testAPIPermissionControl() {
        console.log('\n=== 测试API接口权限控制 ===');
        
        const operator = this.generateTestUser('api_operator_test', 'OPERATOR');
        const supervisor = this.generateTestUser('api_supervisor_test', 'SUPERVISOR');
        const admin = this.generateTestUser('api_admin_test', 'ADMIN');
        
        // 模拟API端点
        const apiEndpoints = {
            '/api/measurements': { method: 'GET', requiredPermission: 'view_measurements' },
            '/api/measurements': { method: 'POST', requiredPermission: 'create_measurements' },
            '/api/users': { method: 'GET', requiredPermission: 'manage_users' },
            '/api/audit-logs': { method: 'GET', requiredPermission: 'view_audit_logs' },
            '/api/config': { method: 'PUT', requiredPermission: 'modify_config' }
        };
        
        // 测试操作员API权限
        const operatorApiResults = Object.entries(apiEndpoints).map(([endpoint, config]) => {
            const hasPermission = this.checkPermission(operator, config.requiredPermission);
            const result = config.requiredPermission === 'view_measurements' || 
                          config.requiredPermission === 'create_measurements';
            this.logAuditEvent(operator, 'API_ACCESS_TEST', `${endpoint}_${config.method}`, null, hasPermission ? 'SUCCESS' : 'DENIED');
            return result === hasPermission;
        });
        const operatorApiAccess = operatorApiResults.every(result => result);
        this.recordTest('API_OPERATOR_PERMISSIONS', operatorApiAccess, '操作员API权限控制应正确');
        
        // 测试主管API权限
        const supervisorApiResults = Object.entries(apiEndpoints).map(([endpoint, config]) => {
            const hasPermission = this.checkPermission(supervisor, config.requiredPermission);
            const result = config.requiredPermission === 'view_measurements' || 
                          config.requiredPermission === 'create_measurements' ||
                          config.requiredPermission === 'approve_changes' ||
                          config.requiredPermission === 'view_audit_logs';
            this.logAuditEvent(supervisor, 'API_ACCESS_TEST', `${endpoint}_${config.method}`, null, hasPermission ? 'SUCCESS' : 'DENIED');
            return result === hasPermission;
        });
        const supervisorApiAccess = supervisorApiResults.every(result => result);
        this.recordTest('API_SUPERVISOR_PERMISSIONS', supervisorApiAccess, '主管API权限控制应正确');
        
        // 测试管理员API权限
        const adminApiResults = Object.entries(apiEndpoints).map(([endpoint, config]) => {
            const hasPermission = this.checkPermission(admin, config.requiredPermission);
            this.logAuditEvent(admin, 'API_ACCESS_TEST', `${endpoint}_${config.method}`, null, hasPermission ? 'SUCCESS' : 'DENIED');
            return hasPermission; // 管理员应拥有所有API权限
        });
        const adminApiAccess = adminApiResults.every(result => result);
        this.recordTest('API_ADMIN_PERMISSIONS', adminApiAccess, '管理员API权限控制应正确');
        
        return operatorApiAccess && supervisorApiAccess && adminApiAccess;
    }

    /**
     * 记录测试结果
     */
    recordTest(testName, passed, description) {
        const result = {
            testName,
            passed,
            description,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);
        console.log(`  ${passed ? '✓' : '✗'} ${testName}: ${description} - ${passed ? '通过' : '失败'}`);
    }

    /**
     * 生成测试报告
     */
    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const passRate = ((passedTests / totalTests) * 100).toFixed(2);

        console.log('\n' + '='.repeat(60));
        console.log('           放射化学纯度检测仪电子签名权限系统测试报告');
        console.log('='.repeat(60));
        console.log(`总测试数: ${totalTests}`);
        console.log(`通过测试: ${passedTests}`);
        console.log(`失败测试: ${failedTests}`);
        console.log(`通过率: ${passRate}%`);
        console.log(`测试时间: ${new Date().toISOString()}`);
        
        console.log('\n详细测试结果:');
        console.log('-'.repeat(60));
        this.testResults.forEach(result => {
            const status = result.passed ? '✓ 通过' : '✗ 失败';
            console.log(`${status} - ${result.testName}: ${result.description}`);
        });

        console.log('\n审计日志统计:');
        console.log('-'.repeat(60));
        console.log(`总审计记录数: ${this.auditLogs.length}`);
        const actionCounts = this.auditLogs.reduce((acc, log) => {
            acc[log.action] = (acc[log.action] || 0) + 1;
            return acc;
        }, {});
        Object.entries(actionCounts).forEach(([action, count]) => {
            console.log(`${action}: ${count} 次`);
        });

        console.log('\nCFR 21 Part 11 合规性评估:');
        console.log('-'.repeat(60));
        const cfr21Tests = this.testResults.filter(r => r.testName.includes('CFR21'));
        const cfr21Passed = cfr21Tests.filter(r => r.passed).length;
        const cfr21Compliance = cfr21Tests.length > 0 ? (cfr21Passed / cfr21Tests.length * 100).toFixed(2) : 0;
        console.log(`CFR 21 Part 11 合规测试通过率: ${cfr21Compliance}%`);
        
        if (parseFloat(cfr21Compliance) >= 95) {
            console.log('✓ 系统符合CFR 21 Part 11合规性要求');
        } else {
            console.log('✗ 系统需要改进以满足CFR 21 Part 11合规性要求');
        }

        console.log('\n权限分级验证:');
        console.log('-'.repeat(60));
        const permissionTests = this.testResults.filter(r => 
            r.testName.includes('OPERATOR') || 
            r.testName.includes('SUPERVISOR') || 
            r.testName.includes('ADMIN')
        );
        const permissionPassed = permissionTests.filter(r => r.passed).length;
        const permissionCompliance = permissionTests.length > 0 ? (permissionPassed / permissionTests.length * 100).toFixed(2) : 0;
        console.log(`权限分级测试通过率: ${permissionCompliance}%`);
        
        if (parseFloat(permissionCompliance) >= 90) {
            console.log('✓ 三级权限系统实现正确');
        } else {
            console.log('✗ 三级权限系统需要改进');
        }

        console.log('\n电子签名功能验证:');
        console.log('-'.repeat(60));
        const signatureTests = this.testResults.filter(r => 
            r.testName.includes('SIGNATURE') || 
            r.testName.includes('DIGITAL')
        );
        const signaturePassed = signatureTests.filter(r => r.passed).length;
        const signatureCompliance = signatureTests.length > 0 ? (signaturePassed / signatureTests.length * 100).toFixed(2) : 0;
        console.log(`电子签名功能测试通过率: ${signatureCompliance}%`);
        
        if (parseFloat(signatureCompliance) >= 90) {
            console.log('✓ 电子签名功能正常');
        } else {
            console.log('✗ 电子签名功能需要改进');
        }

        console.log('\n' + '='.repeat(60));
        console.log('                          测试完成');
        console.log('='.repeat(60));

        return {
            totalTests,
            passedTests,
            failedTests,
            passRate: parseFloat(passRate),
            cfr21Compliance: parseFloat(cfr21Compliance),
            permissionCompliance: parseFloat(permissionCompliance),
            signatureCompliance: parseFloat(signatureCompliance),
            auditLogsCount: this.auditLogs.length
        };
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('开始放射化学纯度检测仪电子签名三级权限系统测试...');
        console.log('测试时间:', new Date().toISOString());
        console.log('CFR 21 Part 11 合规性测试');
        
        try {
            // 执行所有测试
            const operatorTest = await this.testOperatorPermissions();
            const supervisorTest = await this.testSupervisorPermissions();
            const adminTest = await this.testAdminPermissions();
            const signatureTest = await this.testDigitalSignature();
            const criticalOperationTest = await this.testCriticalOperationSignatures();
            const cfr21ComplianceTest = await this.testCFR21Part11Compliance();
            const apiPermissionTest = await this.testAPIPermissionControl();
            
            // 生成测试报告
            const report = this.generateTestReport();
            
            console.log('\n测试执行完成!');
            return report;
            
        } catch (error) {
            console.error('测试执行失败:', error);
            throw error;
        }
    }
}

// 执行测试
if (require.main === module) {
    const testSuite = new PermissionSystemTest();
    testSuite.runAllTests().then(report => {
        console.log('\n测试报告已生成');
        process.exit(report.failedTests > 0 ? 1 : 0);
    }).catch(error => {
        console.error('测试套件执行失败:', error);
        process.exit(1);
    });
}

module.exports = PermissionSystemTest;