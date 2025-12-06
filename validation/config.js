/**
 * 放射化学纯度检测仪验证配置文件
 * 
 * 配置验证模块的参数和行为
 */

module.exports = {
    // 验证器配置
    validator: {
        // 最大重试次数
        maxRetries: 3,
        
        // 验证超时时间（毫秒）
        timeout: 60000,
        
        // 是否启用自动修复
        autoFixEnabled: true,
        
        // 是否启用并行执行
        parallelExecution: true,
        
        // 是否启用健康检查
        healthCheckEnabled: true,
        
        // 报告格式
        reportFormat: 'json'
    },

    // 验证模块配置
    modules: {
        // 数据库架构验证
        database_schema: {
            enabled: true,
            critical: true,
            autoFixable: true,
            timeout: 30000,
            checks: {
                // 检查必要表的存在
                requiredTables: [
                    'users', 'audit_trail', 'measurements', 'devices',
                    'electronic_signatures', 'device_logs', 'device_calibrations',
                    'project_files', 'measurement_files', 'analysis_results', 'reports'
                ],
                
                // 检查索引
                checkIndexes: true,
                requiredIndexes: [
                    { table: 'users', columns: ['username'] },
                    { table: 'audit_trail', columns: ['user_id', 'timestamp'] },
                    { table: 'measurements', columns: ['device_id', 'timestamp'] }
                ],
                
                // 检查外键约束
                checkForeignKeys: true,
                
                // 检查数据完整性
                checkDataIntegrity: true
            }
        },

        // 权限系统验证
        permission_system: {
            enabled: true,
            critical: true,
            autoFixable: true,
            timeout: 30000,
            checks: {
                // 检查管理员用户
                requireAdminUser: true,
                
                // 检查用户角色
                requiredRoles: ['OPERATOR', 'SUPERVISOR', 'ADMIN'],
                
                // 检查电子签名功能
                validateSignatures: true,
                
                // 检查CFR 21 Part 11合规性
                checkCFR21Compliance: true,
                
                // 检查权限配置
                validatePermissions: true
            }
        },

        // 性能指标验证
        performance_metrics: {
            enabled: true,
            critical: false,
            autoFixable: true,
            timeout: 20000,
            thresholds: {
                // 响应时间阈值（毫秒）
                maxResponseTime: 1000,
                
                // 内存使用率阈值（百分比）
                maxMemoryUsage: 80,
                
                // CPU使用率阈值
                maxCpuUsage: 70,
                
                // 数据库连接池大小
                minConnectionPoolSize: 5,
                maxConnectionPoolSize: 50
            },
            checks: {
                checkResponseTime: true,
                checkMemoryUsage: true,
                checkCpuUsage: true,
                checkDatabaseConnections: true,
                checkCachePerformance: true
            }
        },

        // 缓存系统验证
        cache_system: {
            enabled: true,
            critical: false,
            autoFixable: true,
            timeout: 20000,
            thresholds: {
                // 缓存命中率阈值（百分比）
                minHitRate: 70,
                
                // 最大缓存大小（MB）
                maxCacheSize: 100,
                
                // 缓存过期时间（秒）
                defaultTTL: 3600
            },
            checks: {
                checkCacheStatus: true,
                checkHitRate: true,
                checkCacheSize: true,
                checkCacheConfig: true,
                validateCacheData: true
            }
        },

        // 日志系统验证
        logging_system: {
            enabled: true,
            critical: true,
            autoFixable: true,
            timeout: 30000,
            checks: {
                // 检查日志启用状态
                checkLoggingEnabled: true,
                
                // 检查审计跟踪
                checkAuditTrail: true,
                
                // 检查日志完整性
                checkLogIntegrity: true,
                
                // 检查日志轮转
                checkLogRotation: true,
                
                // 检查日志级别配置
                checkLogLevels: true
            },
            requirements: {
                minAuditRecords: 1,
                retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000 // 7年
            }
        },

        // 监控系统验证
        monitoring_system: {
            enabled: true,
            critical: false,
            autoFixable: true,
            timeout: 20000,
            checks: {
                // 检查监控启用状态
                checkMonitoringEnabled: true,
                
                // 检查数据收集
                checkDataCollection: true,
                
                // 检查告警配置
                checkAlertConfigs: true,
                
                // 检查指标收集
                checkMetricsCollection: true,
                
                // 检查监控存储
                checkMonitoringStorage: true
            },
            requiredMetrics: [
                'response_time',
                'memory_usage',
                'cpu_usage',
                'disk_usage',
                'database_connections'
            ],
            requiredAlerts: [
                'high_memory_usage',
                'slow_response_time',
                'database_connection_failure'
            ]
        },

        // CFR 21合规性验证
        cfr21_compliance: {
            enabled: true,
            critical: true,
            autoFixable: false,
            timeout: 45000,
            requirements: {
                // 访问控制
                accessControl: {
                    required: true,
                    enforcePasswordPolicy: true,
                    sessionTimeout: 30 * 60 * 1000 // 30分钟
                },
                
                // 审计跟踪
                auditTrails: {
                    required: true,
                    immutable: true,
                    retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000 // 7年
                },
                
                // 电子签名
                electronicSignatures: {
                    required: true,
                    algorithm: 'SHA256withRSA',
                    keyLength: 2048,
                    dualAuthentication: true,
                    nonRepudiation: true
                },
                
                // 数据完整性
                dataIntegrity: {
                    required: true,
                    checksums: true,
                    versionControl: true
                },
                
                // 记录保持
                recordKeeping: {
                    required: true,
                    backup: true,
                    recovery: true
                },
                
                // 系统验证
                systemValidation: {
                    required: true,
                    periodicTesting: true,
                    documentation: true
                }
            }
        },

        // 系统健康检查
        system_health: {
            enabled: true,
            critical: true,
            autoFixable: true,
            timeout: 30000,
            thresholds: {
                // 磁盘空间阈值（百分比）
                minDiskSpace: 10,
                
                // 内存使用阈值（MB）
                maxMemoryUsage: 1000,
                
                // CPU负载阈值
                maxCpuLoad: 0.8,
                
                // 网络连接阈值
                maxNetworkConnections: 1000
            },
            checks: {
                checkSystemResources: true,
                checkServiceStatus: true,
                checkNetworkConnectivity: true,
                checkFileSystem: true,
                checkProcessHealth: true
            }
        }
    },

    // 自动修复配置
    autoFix: {
        enabled: true,
        
        // 最大自动修复次数
        maxAutoFixAttempts: 3,
        
        // 修复间隔（毫秒）
        fixInterval: 5000,
        
        // 修复策略配置
        strategies: {
            // 数据库相关修复
            database: {
                retryFailedQueries: true,
                optimizeSlowQueries: true,
                cleanupCorruptedData: true,
                recreateMissingIndexes: true,
                repairForeignKeyConstraints: true
            },
            
            // 权限相关修复
            permissions: {
                recreateMissingAdmin: true,
                fixPermissionConfig: true,
                cleanupExpiredSessions: true,
                revalidateSignatures: true
            },
            
            // 性能相关修复
            performance: {
                garbageCollection: true,
                clearMemoryCache: true,
                restartSlowServices: true,
                optimizeConnectionPool: true
            },
            
            // 缓存相关修复
            cache: {
                preWarmCache: true,
                reloadCacheConfig: true,
                clearCorruptedCache: true,
                expandCacheSize: true
            },
            
            // 日志相关修复
            logging: {
                recreateLogFiles: true,
                repairAuditTrail: true,
                fixLogRotation: true,
                validateLogIntegrity: true
            },
            
            // 监控相关修复
            monitoring: {
                restartDataCollection: true,
                fixAlertConfigs: true,
                recreateMissingMonitors: true,
                repairMonitoringStorage: true
            },
            
            // 系统健康相关修复
            system: {
                restartFailedServices: true,
                cleanupTempFiles: true,
                expandDiskSpace: true,
                killMemoryLeakProcesses: true
            }
        }
    },

    // 调度配置
    scheduling: {
        enabled: true,
        
        // 默认验证间隔（毫秒）
        defaultInterval: 3600000, // 1小时
        
        // 验证时间窗口
        validationWindow: {
            start: '02:00', // 凌晨2点开始
            end: '06:00'    // 凌晨6点结束
        },
        
        // 计划任务
        jobs: {
            // 每小时验证
            hourly: {
                enabled: true,
                interval: 3600000,
                modules: ['system_health', 'performance_metrics']
            },
            
            // 每日完整验证
            daily: {
                enabled: true,
                time: '03:00',
                modules: null, // 所有模块
                fullReport: true
            },
            
            // 每周深度验证
            weekly: {
                enabled: true,
                day: 'sunday',
                time: '04:00',
                modules: null,
                generateDetailedReport: true,
                sendNotifications: true
            }
        }
    },

    // 报告配置
    reporting: {
        // 报告格式
        formats: ['json', 'html', 'csv'],
        
        // 默认格式
        defaultFormat: 'json',
        
        // 报告保留数量
        retention: 100,
        
        // 报告目录
        outputDir: './reports',
        
        // 报告配置
        templates: {
            summary: true,
            details: true,
            recommendations: true,
            statistics: true,
            complianceStatus: true
        },
        
        // 自动报告发送
        autoSend: {
            enabled: false,
            email: {
                enabled: false,
                recipients: [],
                smtpConfig: {}
            },
            webhook: {
                enabled: false,
                url: '',
                headers: {}
            }
        }
    },

    // 通知配置
    notifications: {
        enabled: true,
        
        // 通知渠道
        channels: {
            // 控制台通知
            console: {
                enabled: true,
                level: 'info'
            },
            
            // 文件日志通知
            file: {
                enabled: true,
                path: './logs/validation.log',
                level: 'info'
            },
            
            // 邮件通知
            email: {
                enabled: false,
                smtp: {
                    host: '',
                    port: 587,
                    secure: false,
                    auth: {
                        user: '',
                        pass: ''
                    }
                },
                from: '',
                to: [],
                subject: '放射化学纯度检测仪验证报告'
            },
            
            // Webhook通知
            webhook: {
                enabled: false,
                url: '',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        },
        
        // 通知规则
        rules: {
            // 验证成功通知
            onSuccess: {
                enabled: false,
                channels: ['console']
            },
            
            // 验证失败通知
            onFailure: {
                enabled: true,
                channels: ['console', 'file']
            },
            
            // 自动修复通知
            onAutoFix: {
                enabled: true,
                channels: ['console']
            },
            
            // 定时报告通知
            onScheduledReport: {
                enabled: false,
                channels: ['email']
            }
        }
    },

    // 安全配置
    security: {
        // API访问控制
        api: {
            enabled: true,
            rateLimit: {
                windowMs: 15 * 60 * 1000, // 15分钟
                max: 100 // 最大请求数
            },
            authentication: {
                required: true,
                tokenExpiry: 24 * 60 * 60 * 1000 // 24小时
            }
        },
        
        // 数据加密
        encryption: {
            enabled: true,
            algorithm: 'aes-256-gcm',
            keyRotationInterval: 30 * 24 * 60 * 60 * 1000 // 30天
        },
        
        // 审计日志
        audit: {
            enabled: true,
            logAllActions: true,
            includeRequestData: false,
            retentionPeriod: 1 * 365 * 24 * 60 * 60 * 1000 // 1年
        }
    },

    // 性能配置
    performance: {
        // 并行执行配置
        parallel: {
            enabled: true,
            maxConcurrency: 5,
            queueSize: 10
        },
        
        // 缓存配置
        cache: {
            enabled: true,
            ttl: 300000, // 5分钟
            maxSize: 100
        },
        
        // 资源限制
        limits: {
            maxExecutionTime: 300000, // 5分钟
            maxMemoryUsage: 512 * 1024 * 1024, // 512MB
            maxConcurrentValidations: 2
        }
    },

    // 调试配置
    debug: {
        enabled: process.env.NODE_ENV === 'development',
        
        // 日志级别
        logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        
        // 详细错误信息
        verboseErrors: process.env.NODE_ENV === 'development',
        
        // 性能分析
        profiling: {
            enabled: false,
            outputDir: './profiles'
        }
    }
};