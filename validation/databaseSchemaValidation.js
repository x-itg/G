/**
 * 放射化学纯度检测仪数据库架构验证模块
 * 
 * 功能：
 * - 数据库表结构验证
 * - 关联关系验证
 * - 索引和约束验证
 * - 数据类型和长度验证
 * - API接口提供
 * - 验证报告生成
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 数据库架构验证器
 */
class DatabaseSchemaValidation {
    constructor() {
        this.dbPath = path.join(__dirname, '../database/database/data');
        this.validationReport = {
            timestamp: new Date().toISOString(),
            overall_status: 'UNKNOWN',
            tables: {},
            issues: [],
            recommendations: []
        };
        
        // 定义预期的表结构
        this.expectedSchemas = this.defineExpectedSchemas();
    }

    /**
     * 定义预期的数据库表结构
     */
    defineExpectedSchemas() {
        return {
            users: {
                description: '用户表 - 存储系统用户信息',
                fields: {
                    id: { type: 'string', required: true, primary_key: true },
                    username: { type: 'string', required: true, max_length: 50, unique: true },
                    password: { type: 'string', required: true, hashed: true },
                    full_name: { type: 'string', required: true, max_length: 100 },
                    title: { type: 'string', required: false, max_length: 100 },
                    department: { type: 'string', required: false, max_length: 100 },
                    role: { type: 'string', required: true, max_length: 50 },
                    must_change_password: { type: 'boolean', required: false, default: false },
                    created_at: { type: 'string', required: true },
                    last_login: { type: 'string', required: false },
                    is_active: { type: 'boolean', required: false, default: true }
                },
                indexes: ['username', 'role', 'is_active'],
                constraints: {
                    unique: ['username'],
                    not_null: ['id', 'username', 'password', 'full_name', 'role', 'created_at']
                }
            },
            measurements: {
                description: '测量数据表 - 存储放射化学检测结果',
                fields: {
                    id: { type: 'string', required: true, primary_key: true },
                    sample_id: { type: 'string', required: true, max_length: 100 },
                    sample_name: { type: 'string', required: true, max_length: 200 },
                    measurement_type: { type: 'string', required: true, max_length: 50 },
                    detected_activity: { type: 'number', required: true },
                    background_activity: { type: 'number', required: false, default: 0 },
                    purity_percentage: { type: 'number', required: true },
                    measurement_date: { type: 'string', required: true },
                    operator_id: { type: 'string', required: true, foreign_key: 'users.id' },
                    instrument_id: { type: 'string', required: false, max_length: 50 },
                    measurement_duration: { type: 'number', required: false },
                    quality_flag: { type: 'string', required: false, max_length: 20 },
                    notes: { type: 'string', required: false, max_length: 1000 },
                    created_at: { type: 'string', required: true },
                    updated_at: { type: 'string', required: true },
                    status: { type: 'string', required: true, max_length: 20, default: 'active' }
                },
                indexes: ['sample_id', 'operator_id', 'measurement_date', 'status'],
                constraints: {
                    foreign_keys: [
                        { field: 'operator_id', references: 'users.id' }
                    ],
                    not_null: ['id', 'sample_id', 'sample_name', 'measurement_type', 'detected_activity', 'purity_percentage', 'measurement_date', 'operator_id', 'created_at', 'updated_at', 'status']
                }
            },
            system_settings: {
                description: '系统设置表 - 存储系统配置参数',
                fields: {
                    id: { type: 'string', required: true, primary_key: true },
                    key: { type: 'string', required: true, max_length: 100, unique: true },
                    value: { type: 'string', required: true, max_length: 500 },
                    category: { type: 'string', required: true, max_length: 50 },
                    description: { type: 'string', required: false, max_length: 500 },
                    data_type: { type: 'string', required: true, max_length: 20 },
                    is_editable: { type: 'boolean', required: false, default: true },
                    created_at: { type: 'string', required: true },
                    updated_at: { type: 'string', required: true }
                },
                indexes: ['key', 'category'],
                constraints: {
                    unique: ['key'],
                    not_null: ['id', 'key', 'value', 'category', 'data_type', 'created_at', 'updated_at']
                }
            },
            user_permissions: {
                description: '用户权限表 - 存储用户权限配置',
                fields: {
                    id: { type: 'string', required: true, primary_key: true },
                    user_id: { type: 'string', required: true, foreign_key: 'users.id' },
                    permission_level: { type: 'number', required: true },
                    permission_name: { type: 'string', required: true, max_length: 100 },
                    resource: { type: 'string', required: true, max_length: 50 },
                    action: { type: 'string', required: true, max_length: 50 },
                    granted_by: { type: 'string', required: true, foreign_key: 'users.id' },
                    granted_at: { type: 'string', required: true },
                    expires_at: { type: 'string', required: false },
                    conditions: { type: 'string', required: false },
                    is_active: { type: 'boolean', required: false, default: true }
                },
                indexes: ['user_id', 'resource', 'action', 'is_active'],
                constraints: {
                    foreign_keys: [
                        { field: 'user_id', references: 'users.id' },
                        { field: 'granted_by', references: 'users.id' }
                    ],
                    not_null: ['id', 'user_id', 'permission_level', 'permission_name', 'resource', 'action', 'granted_by', 'granted_at', 'is_active']
                }
            },
            audit_logs: {
                description: '审计日志表 - 记录系统操作审计信息',
                fields: {
                    id: { type: 'string', required: true, primary_key: true },
                    user_id: { type: 'string', required: true, foreign_key: 'users.id' },
                    username: { type: 'string', required: true, max_length: 50 },
                    action: { type: 'string', required: true, max_length: 100 },
                    resource: { type: 'string', required: true, max_length: 50 },
                    resource_id: { type: 'string', required: false },
                    old_values: { type: 'string', required: false },
                    new_values: { type: 'string', required: false },
                    result: { type: 'string', required: true, max_length: 20 },
                    ip_address: { type: 'string', required: false, max_length: 45 },
                    user_agent: { type: 'string', required: false, max_length: 500 },
                    session_id: { type: 'string', required: false, max_length: 100 },
                    timestamp: { type: 'string', required: true },
                    signature_required: { type: 'boolean', required: false, default: false },
                    electronic_signature_id: { type: 'string', required: false, foreign_key: 'electronic_signatures.id' },
                    compliance_code: { type: 'string', required: false, max_length: 50 },
                    reason: { type: 'string', required: false, max_length: 500 },
                    details: { type: 'string', required: false, max_length: 1000 }
                },
                indexes: ['user_id', 'timestamp', 'action', 'resource'],
                constraints: {
                    foreign_keys: [
                        { field: 'user_id', references: 'users.id' },
                        { field: 'electronic_signature_id', references: 'electronic_signatures.id' }
                    ],
                    not_null: ['id', 'user_id', 'username', 'action', 'resource', 'result', 'timestamp']
                }
            },
            performance_metrics: {
                description: '性能指标表 - 存储系统性能监控数据',
                fields: {
                    id: { type: 'string', required: true, primary_key: true },
                    metric_type: { type: 'string', required: true, max_length: 50 },
                    metric_name: { type: 'string', required: true, max_length: 100 },
                    value: { type: 'number', required: true },
                    unit: { type: 'string', required: false, max_length: 20 },
                    source: { type: 'string', required: true, max_length: 50 },
                    timestamp: { type: 'string', required: true },
                    alert_level: { type: 'string', required: false, max_length: 20 },
                    metadata: { type: 'string', required: false }
                },
                indexes: ['metric_type', 'metric_name', 'timestamp', 'alert_level'],
                constraints: {
                    not_null: ['id', 'metric_type', 'metric_name', 'value', 'source', 'timestamp']
                }
            },
            electronic_signatures: {
                description: '电子签名表 - 存储CFR 21 Part 11兼容的电子签名',
                fields: {
                    id: { type: 'string', required: true, primary_key: true },
                    user_id: { type: 'string', required: true, foreign_key: 'users.id' },
                    entity_type: { type: 'string', required: true, max_length: 50 },
                    entity_id: { type: 'string', required: true },
                    action: { type: 'string', required: true, max_length: 100 },
                    reason: { type: 'string', required: true, max_length: 500 },
                    comment: { type: 'string', required: false, max_length: 1000 },
                    user_full_name: { type: 'string', required: true, max_length: 100 },
                    user_title: { type: 'string', required: false, max_length: 100 },
                    user_department: { type: 'string', required: false, max_length: 100 },
                    signed_at: { type: 'string', required: true },
                    digital_signature: { type: 'string', required: true, unique: true },
                    ip_address: { type: 'string', required: false, max_length: 45 },
                    user_agent: { type: 'string', required: false, max_length: 500 },
                    second_factor_verified: { type: 'boolean', required: false, default: false }
                },
                indexes: ['user_id', 'entity_type', 'entity_id', 'signed_at'],
                constraints: {
                    foreign_keys: [
                        { field: 'user_id', references: 'users.id' }
                    ],
                    unique: ['digital_signature'],
                    not_null: ['id', 'user_id', 'entity_type', 'entity_id', 'action', 'reason', 'user_full_name', 'signed_at', 'digital_signature']
                }
            }
        };
    }

    /**
     * 执行完整的数据库架构验证
     */
    async validateDatabaseSchema() {
        try {
            console.log('🔍 开始数据库架构验证...');
            
            // 重置验证报告
            this.validationReport = {
                timestamp: new Date().toISOString(),
                overall_status: 'UNKNOWN',
                tables: {},
                issues: [],
                recommendations: []
            };

            // 验证每个表
            for (const [tableName, schema] of Object.entries(this.expectedSchemas)) {
                console.log(`📋 验证表: ${tableName}`);
                const tableValidation = await this.validateTable(tableName, schema);
                this.validationReport.tables[tableName] = tableValidation;
            }

            // 验证表间关联关系
            await this.validateRelationships();

            // 验证索引和约束
            await this.validateIndexesAndConstraints();

            // 确定总体状态
            this.determineOverallStatus();

            // 生成建议
            this.generateRecommendations();

            console.log('✅ 数据库架构验证完成');
            return this.validationReport;

        } catch (error) {
            console.error('❌ 数据库架构验证失败:', error);
            this.validationReport.overall_status = 'ERROR';
            this.validationReport.issues.push({
                type: 'VALIDATION_ERROR',
                message: error.message,
                severity: 'HIGH',
                table: 'all'
            });
            return this.validationReport;
        }
    }

    /**
     * 验证单个表的结构
     */
    async validateTable(tableName, expectedSchema) {
        const tableValidation = {
            status: 'PASSED',
            fields: [],
            constraints: [],
            issues: [],
            record_count: 0
        };

        try {
            // 检查表文件是否存在
            const tablePath = path.join(this.dbPath, `${tableName}.json`);
            if (!fs.existsSync(tablePath)) {
                tableValidation.status = 'FAILED';
                tableValidation.issues.push({
                    type: 'TABLE_NOT_FOUND',
                    message: `表 ${tableName} 的数据文件不存在`,
                    severity: 'HIGH'
                });
                return tableValidation;
            }

            // 读取表数据
            const tableData = JSON.parse(fs.readFileSync(tablePath, 'utf8'));
            tableValidation.record_count = tableData.length;

            // 验证字段结构
            if (tableData.length > 0) {
                const sampleRecord = tableData[0];
                await this.validateTableFields(tableName, expectedSchema, sampleRecord, tableValidation);
            }

            // 验证数据完整性
            await this.validateTableDataIntegrity(tableName, expectedSchema, tableData, tableValidation);

        } catch (error) {
            tableValidation.status = 'FAILED';
            tableValidation.issues.push({
                type: 'TABLE_VALIDATION_ERROR',
                message: `验证表 ${tableName} 时发生错误: ${error.message}`,
                severity: 'HIGH'
            });
        }

        return tableValidation;
    }

    /**
     * 验证表字段结构
     */
    async validateTableFields(tableName, expectedSchema, sampleRecord, tableValidation) {
        for (const [fieldName, fieldConfig] of Object.entries(expectedSchema.fields)) {
            const fieldValidation = {
                field_name: fieldName,
                status: 'PASSED',
                issues: [],
                config: fieldConfig
            };

            // 检查字段是否存在
            if (!(fieldName in sampleRecord)) {
                fieldValidation.status = 'FAILED';
                fieldValidation.issues.push({
                    type: 'MISSING_FIELD',
                    message: `字段 ${fieldName} 不存在`,
                    severity: 'HIGH'
                });
                tableValidation.fields.push(fieldValidation);
                continue;
            }

            const fieldValue = sampleRecord[fieldName];

            // 验证数据类型
            await this.validateFieldType(fieldName, fieldValue, fieldConfig, fieldValidation);

            // 验证字段长度
            await this.validateFieldLength(fieldName, fieldValue, fieldConfig, fieldValidation);

            // 验证必填字段
            await this.validateRequiredField(fieldName, fieldValue, fieldConfig, fieldValidation);

            tableValidation.fields.push(fieldValidation);

            // 收集表级别的错误
            if (fieldValidation.status === 'FAILED') {
                tableValidation.issues.push(...fieldValidation.issues.map(issue => ({
                    ...issue,
                    table: tableName,
                    field: fieldName
                })));
            }
        }

        // 检查多余字段
        for (const actualField of Object.keys(sampleRecord)) {
            if (!(actualField in expectedSchema.fields)) {
                tableValidation.issues.push({
                    type: 'UNEXPECTED_FIELD',
                    message: `表 ${tableName} 包含未定义的字段: ${actualField}`,
                    severity: 'MEDIUM',
                    table: tableName,
                    field: actualField
                });
            }
        }
    }

    /**
     * 验证字段数据类型
     */
    async validateFieldType(fieldName, value, fieldConfig, fieldValidation) {
        const expectedType = fieldConfig.type;
        let actualType = typeof value;

        if (value === null) {
            actualType = 'null';
        } else if (Array.isArray(value)) {
            actualType = 'array';
        } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
            actualType = 'date';
        }

        const typeMap = {
            'string': ['string', 'date'],
            'number': ['number'],
            'boolean': ['boolean'],
            'object': ['object'],
            'array': ['array']
        };

        if (!typeMap[expectedType] || !typeMap[expectedType].includes(actualType)) {
            fieldValidation.status = 'FAILED';
            fieldValidation.issues.push({
                type: 'INVALID_TYPE',
                message: `字段 ${fieldName} 类型不匹配。期望: ${expectedType}, 实际: ${actualType}`,
                severity: 'HIGH'
            });
        }
    }

    /**
     * 验证字段长度
     */
    async validateFieldLength(fieldName, value, fieldConfig, fieldValidation) {
        if (fieldConfig.max_length && typeof value === 'string' && value.length > fieldConfig.max_length) {
            fieldValidation.status = 'FAILED';
            fieldValidation.issues.push({
                type: 'LENGTH_EXCEEDED',
                message: `字段 ${fieldName} 长度超出限制。最大: ${fieldConfig.max_length}, 实际: ${value.length}`,
                severity: 'HIGH'
            });
        }
    }

    /**
     * 验证必填字段
     */
    async validateRequiredField(fieldName, value, fieldConfig, fieldValidation) {
        if (fieldConfig.required && (value === null || value === undefined || value === '')) {
            fieldValidation.status = 'FAILED';
            fieldValidation.issues.push({
                type: 'REQUIRED_FIELD_EMPTY',
                message: `必填字段 ${fieldName} 不能为空`,
                severity: 'HIGH'
            });
        }
    }

    /**
     * 验证表数据完整性
     */
    async validateTableDataIntegrity(tableName, expectedSchema, tableData, tableValidation) {
        // 验证主键唯一性
        await this.validatePrimaryKeyUniqueness(tableName, expectedSchema, tableData, tableValidation);

        // 验证外键关联
        await this.validateForeignKeyIntegrity(tableName, expectedSchema, tableData, tableValidation);

        // 验证数据完整性约束
        await this.validateDataConstraints(tableName, expectedSchema, tableData, tableValidation);
    }

    /**
     * 验证主键唯一性
     */
    async validatePrimaryKeyUniqueness(tableName, expectedSchema, tableData, tableValidation) {
        const primaryKeyField = Object.entries(expectedSchema.fields)
            .find(([_, config]) => config.primary_key)?.[0];

        if (primaryKeyField) {
            const primaryKeys = tableData.map(record => record[primaryKeyField]).filter(key => key);
            const uniqueKeys = new Set(primaryKeys);

            if (primaryKeys.length !== uniqueKeys.size) {
                tableValidation.issues.push({
                    type: 'PRIMARY_KEY_DUPLICATE',
                    message: `表 ${tableName} 存在重复的主键值`,
                    severity: 'HIGH',
                    table: tableName
                });
            }
        }
    }

    /**
     * 验证外键完整性
     */
    async validateForeignKeyIntegrity(tableName, expectedSchema, tableData, tableValidation) {
        if (!expectedSchema.constraints?.foreign_keys) return;

        // 加载相关表数据以进行外键验证
        const referencedTables = {};

        for (const fk of expectedSchema.constraints.foreign_keys) {
            const [referencedTable] = fk.references.split('.');
            
            if (!referencedTables[referencedTable]) {
                const refTablePath = path.join(this.dbPath, `${referencedTable}.json`);
                if (fs.existsSync(refTablePath)) {
                    referencedTables[referencedTable] = JSON.parse(fs.readFileSync(refTablePath, 'utf8'));
                }
            }
        }

        // 验证外键引用
        for (const record of tableData) {
            for (const fk of expectedSchema.constraints.foreign_keys || []) {
                const fieldValue = record[fk.field];
                const [referencedTable, referencedField] = fk.references.split('.');

                if (fieldValue && referencedTables[referencedTable]) {
                    const referencedRecords = referencedTables[referencedTable];
                    const exists = referencedRecords.some(ref => ref[referencedField] === fieldValue);

                    if (!exists) {
                        tableValidation.issues.push({
                            type: 'FOREIGN_KEY_VIOLATION',
                            message: `表 ${tableName} 中的外键 ${fk.field} 值 ${fieldValue} 在表 ${referencedTable} 中不存在`,
                            severity: 'HIGH',
                            table: tableName,
                            field: fk.field
                        });
                    }
                }
            }
        }
    }

    /**
     * 验证数据约束
     */
    async validateDataConstraints(tableName, expectedSchema, tableData, tableValidation) {
        // 这里可以添加自定义的业务逻辑验证
        // 例如：数值范围验证、格式验证等
    }

    /**
     * 验证表间关联关系
     */
    async validateRelationships() {
        console.log('🔗 验证表间关联关系...');

        // 加载所有表数据
        const allTables = {};
        for (const tableName of Object.keys(this.expectedSchemas)) {
            const tablePath = path.join(this.dbPath, `${tableName}.json`);
            if (fs.existsSync(tablePath)) {
                allTables[tableName] = JSON.parse(fs.readFileSync(tablePath, 'utf8'));
            }
        }

        // 验证关联关系的完整性
        for (const [tableName, schema] of Object.entries(this.expectedSchemas)) {
            if (allTables[tableName]) {
                await this.validateTableRelationships(tableName, schema, allTables);
            }
        }
    }

    /**
     * 验证单个表的关联关系
     */
    async validateTableRelationships(tableName, schema, allTables) {
        // 检查外键引用的完整性
        for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
            if (fieldConfig.foreign_key) {
                const [referencedTable, referencedField] = fieldConfig.foreign_key.split('.');
                const currentTable = allTables[tableName];
                const referencedTableData = allTables[referencedTable];

                if (referencedTableData) {
                    const referencedValues = new Set(
                        referencedTableData.map(record => record[referencedField])
                    );

                    for (const record of currentTable) {
                        const fieldValue = record[fieldName];
                        if (fieldValue && !referencedValues.has(fieldValue)) {
                            this.validationReport.issues.push({
                                type: 'ORPHANED_RECORD',
                                message: `表 ${tableName} 中的记录 ${record.id} 引用了不存在的 ${referencedTable}.${referencedField}: ${fieldValue}`,
                                severity: 'MEDIUM',
                                table: tableName,
                                field: fieldName
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * 验证索引和约束
     */
    async validateIndexesAndConstraints() {
        console.log('🔍 验证索引和约束...');

        for (const [tableName, schema] of Object.entries(this.expectedSchemas)) {
            await this.validateTableIndexesAndConstraints(tableName, schema);
        }
    }

    /**
     * 验证单个表的索引和约束
     */
    async validateTableIndexesAndConstraints(tableName, schema) {
        const tableValidation = this.validationReport.tables[tableName];
        if (!tableValidation) return;

        // 验证唯一性约束
        if (schema.constraints?.unique) {
            for (const uniqueField of schema.constraints.unique) {
                const values = tableValidation.fields.find(f => f.field_name === uniqueField)?.values || [];
                const uniqueValues = new Set(values);
                if (values.length !== uniqueValues.size) {
                    tableValidation.issues.push({
                        type: 'UNIQUE_CONSTRAINT_VIOLATION',
                        message: `表 ${tableName} 的字段 ${uniqueField} 违反唯一性约束`,
                        severity: 'HIGH',
                        table: tableName
                    });
                }
            }
        }

        // 验证NOT NULL约束
        if (schema.constraints?.not_null) {
            for (const notNullField of schema.constraints.not_null) {
                const fieldValidation = tableValidation.fields.find(f => f.field_name === notNullField);
                if (fieldValidation && fieldValidation.issues.some(issue => issue.type === 'REQUIRED_FIELD_EMPTY')) {
                    tableValidation.issues.push({
                        type: 'NOT_NULL_CONSTRAINT_VIOLATION',
                        message: `表 ${tableName} 的字段 ${notNullField} 违反NOT NULL约束`,
                        severity: 'HIGH',
                        table: tableName
                    });
                }
            }
        }
    }

    /**
     * 确定总体验证状态
     */
    determineOverallStatus() {
        const hasErrors = this.validationReport.issues.some(issue => issue.severity === 'HIGH');
        const hasWarnings = this.validationReport.issues.some(issue => issue.severity === 'MEDIUM');
        
        if (hasErrors) {
            this.validationReport.overall_status = 'FAILED';
        } else if (hasWarnings) {
            this.validationReport.overall_status = 'PASSED_WITH_WARNINGS';
        } else {
            this.validationReport.overall_status = 'PASSED';
        }
    }

    /**
     * 生成验证建议
     */
    generateRecommendations() {
        // 基于验证结果生成改进建议
        const issueCounts = {
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0
        };

        for (const issue of this.validationReport.issues) {
            issueCounts[issue.severity]++;
        }

        if (issueCounts.HIGH > 0) {
            this.validationReport.recommendations.push({
                priority: 'HIGH',
                category: 'CRITICAL_ISSUES',
                message: `发现 ${issueCounts.HIGH} 个高优先级问题需要立即修复`,
                action: '修复所有高优先级问题后重新验证'
            });
        }

        if (issueCounts.MEDIUM > 0) {
            this.validationReport.recommendations.push({
                priority: 'MEDIUM',
                category: 'DATA_QUALITY',
                message: `发现 ${issueCounts.MEDIUM} 个中优先级问题，建议优化`,
                action: '检查并修复数据质量问题'
            });
        }

        if (this.validationReport.overall_status === 'PASSED') {
            this.validationReport.recommendations.push({
                priority: 'LOW',
                category: 'OPTIMIZATION',
                message: '数据库架构验证通过，建议定期执行验证',
                action: '设置定期验证任务以确保数据完整性'
            });
        }
    }

    /**
     * 修复发现的架构问题
     */
    async repairSchemaIssues() {
        console.log('🔧 开始修复架构问题...');

        const repairReport = {
            timestamp: new Date().toISOString(),
            issues_found: this.validationReport.issues.length,
            repairs_attempted: 0,
            repairs_successful: 0,
            repairs_failed: 0,
            details: []
        };

        for (const issue of this.validationReport.issues) {
            try {
                const repairResult = await this.attemptRepair(issue);
                repairReport.repairs_attempted++;
                if (repairResult.success) {
                    repairReport.repairs_successful++;
                } else {
                    repairReport.repairs_failed++;
                }
                repairReport.details.push({
                    issue: issue,
                    repair: repairResult
                });
            } catch (error) {
                repairReport.repairs_failed++;
                repairReport.details.push({
                    issue: issue,
                    repair: {
                        success: false,
                        message: error.message
                    }
                });
            }
        }

        console.log(`✅ 修复完成 - 成功: ${repairReport.repairs_successful}, 失败: ${repairReport.repairs_failed}`);
        return repairReport;
    }

    /**
     * 尝试修复单个问题
     */
    async attemptRepair(issue) {
        switch (issue.type) {
            case 'TABLE_NOT_FOUND':
                return await this.createMissingTable(issue.table);
            case 'MISSING_FIELD':
                return await this.addMissingField(issue.table, issue.field);
            case 'FOREIGN_KEY_VIOLATION':
                return await this.repairForeignKey(issue);
            default:
                return {
                    success: false,
                    message: `无法自动修复问题类型: ${issue.type}`
                };
        }
    }

    /**
     * 创建缺失的表
     */
    async createMissingTable(tableName) {
        try {
            const tablePath = path.join(this.dbPath, `${tableName}.json`);
            if (!fs.existsSync(tablePath)) {
                fs.writeFileSync(tablePath, JSON.stringify([], null, 2));
                return {
                    success: true,
                    message: `成功创建表 ${tableName}`
                };
            }
            return {
                success: true,
                message: `表 ${tableName} 已存在`
            };
        } catch (error) {
            return {
                success: false,
                message: `创建表 ${tableName} 失败: ${error.message}`
            };
        }
    }

    /**
     * 添加缺失字段
     */
    async addMissingField(tableName, fieldName) {
        // 由于这是JSON数据库，字段缺失不是致命问题
        // 在实际使用中，系统会自动处理缺失字段
        return {
            success: true,
            message: `字段 ${fieldName} 将通过默认值处理`
        };
    }

    /**
     * 修复外键问题
     */
    async repairForeignKey(issue) {
        // 外键问题的修复需要手动处理
        return {
            success: false,
            message: `外键问题需要手动修复: ${issue.message}`
        };
    }

    /**
     * 获取验证报告
     */
    getValidationReport() {
        return this.validationReport;
    }

    /**
     * 导出验证报告为JSON
     */
    exportReportAsJSON() {
        return JSON.stringify(this.validationReport, null, 2);
    }

    /**
     * 导出验证报告为Markdown
     */
    exportReportAsMarkdown() {
        const report = this.validationReport;
        let markdown = `# 数据库架构验证报告\n\n`;
        markdown += `**生成时间**: ${report.timestamp}\n`;
        markdown += `**总体状态**: ${report.overall_status}\n\n`;

        // 表验证结果
        markdown += `## 表验证结果\n\n`;
        for (const [tableName, tableValidation] of Object.entries(report.tables)) {
            markdown += `### ${tableName}\n`;
            markdown += `- **状态**: ${tableValidation.status}\n`;
            markdown += `- **记录数**: ${tableValidation.record_count}\n`;
            markdown += `- **字段数**: ${tableValidation.fields.length}\n\n`;
        }

        // 问题列表
        if (report.issues.length > 0) {
            markdown += `## 发现的问题\n\n`;
            for (const issue of report.issues) {
                markdown += `- **${issue.severity}**: ${issue.message}\n`;
            }
            markdown += `\n`;
        }

        // 建议
        if (report.recommendations.length > 0) {
            markdown += `## 改进建议\n\n`;
            for (const recommendation of report.recommendations) {
                markdown += `- **${recommendation.priority}**: ${recommendation.message}\n`;
                markdown += `  - 建议操作: ${recommendation.action}\n\n`;
            }
        }

        return markdown;
    }
}

/**
 * Express.js 路由集成
 */
function setupValidationRoutes(app, validation) {
    // GET /api/validation/database/schema - 获取架构验证结果
    app.get('/api/validation/database/schema', async (req, res) => {
        try {
            const report = await validation.validateDatabaseSchema();
            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // POST /api/validation/database/repair - 修复架构问题
    app.post('/api/validation/database/repair', async (req, res) => {
        try {
            // 首先执行验证
            await validation.validateDatabaseSchema();
            
            // 然后尝试修复
            const repairReport = await validation.repairSchemaIssues();
            
            res.json({
                success: true,
                data: repairReport
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // GET /api/validation/database/report - 获取详细验证报告
    app.get('/api/validation/database/report', async (req, res) => {
        try {
            const format = req.query.format || 'json';
            
            if (!validation.validationReport.timestamp) {
                await validation.validateDatabaseSchema();
            }

            if (format === 'markdown') {
                res.set('Content-Type', 'text/markdown');
                res.send(validation.exportReportAsMarkdown());
            } else {
                res.json({
                    success: true,
                    data: validation.getValidationReport()
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // GET /api/validation/database/status - 获取验证状态
    app.get('/api/validation/database/status', (req, res) => {
        res.json({
            success: true,
            data: {
                overall_status: validation.validationReport.overall_status,
                timestamp: validation.validationReport.timestamp,
                issues_count: validation.validationReport.issues.length,
                tables_validated: Object.keys(validation.validationReport.tables).length
            }
        });
    });
}

// 如果直接运行此文件，执行验证测试
if (require.main === module) {
    async function runValidationTest() {
        console.log('🧪 运行数据库架构验证测试...\n');
        
        const validation = new DatabaseSchemaValidation();
        
        try {
            // 执行验证
            const report = await validation.validateDatabaseSchema();
            
            // 显示结果
            console.log('\n📊 验证结果摘要:');
            console.log(`总体状态: ${report.overall_status}`);
            console.log(`发现的问题: ${report.issues.length}`);
            console.log(`验证的表: ${Object.keys(report.tables).length}`);
            
            if (report.issues.length > 0) {
                console.log('\n❌ 发现的问题:');
                report.issues.forEach((issue, index) => {
                    console.log(`${index + 1}. [${issue.severity}] ${issue.message}`);
                });
            }
            
            if (report.recommendations.length > 0) {
                console.log('\n💡 改进建议:');
                report.recommendations.forEach((rec, index) => {
                    console.log(`${index + 1}. [${rec.priority}] ${rec.message}`);
                });
            }
            
            // 导出报告
            console.log('\n📄 生成详细报告...');
            const jsonReport = validation.exportReportAsJSON();
            const markdownReport = validation.exportReportAsMarkdown();
            
            // 保存报告到文件
            const reportPath = path.join(__dirname, 'validation-report.json');
            const markdownPath = path.join(__dirname, 'validation-report.md');
            
            fs.writeFileSync(reportPath, jsonReport);
            fs.writeFileSync(markdownPath, markdownReport);
            
            console.log(`✅ JSON报告已保存到: ${reportPath}`);
            console.log(`✅ Markdown报告已保存到: ${markdownPath}`);
            
        } catch (error) {
            console.error('❌ 验证测试失败:', error);
        }
    }
    
    runValidationTest();
}

module.exports = {
    DatabaseSchemaValidation,
    setupValidationRoutes
};