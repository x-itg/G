/**
 * 数据采集系统配置文件
 * 定义数据采集、存储、质量检查等各项配置参数
 */
module.exports = {
    // 数据采集配置
    collection: {
        // 采集间隔（毫秒）
        interval: 5000,
        
        // 最大重试次数
        maxRetries: 3,
        
        // 采集超时时间（毫秒）
        timeout: 10000,
        
        // 批处理大小
        batchSize: 100,
        
        // 并发采集数量
        maxConcurrentSources: 5
    },
    
    // 数据存储配置
    storage: {
        // 最大记录数
        maxRecords: 100000,
        
        // 数据保留天数
        retentionDays: 30,
        
        // 是否启用压缩
        compressionEnabled: true,
        
        // 分区大小
        partitionSize: 10000,
        
        // 备份配置
        backup: {
            enabled: true,
            interval: 24 * 60 * 60 * 1000, // 24小时
            maxBackups: 7,
            compression: true
        }
    },
    
    // 数据质量配置
    quality: {
        // 启用数据验证
        validationEnabled: true,
        
        // 启用异常检测
        anomalyDetectionEnabled: true,
        
        // 启用一致性检查
        consistencyCheckEnabled: true,
        
        // 数据验证严格程度 (strict, normal, relaxed)
        strictness: 'normal',
        
        // 异常检测阈值
        anomalyThreshold: 2.0, // 标准差倍数
        
        // 数据完整性检查间隔
        integrityCheckInterval: 60 * 60 * 1000 // 1小时
    },
    
    // 监控配置
    monitoring: {
        // 系统指标
        systemMetrics: {
            enabled: true,
            interval: 5000,
            metrics: [
                'cpu_usage',
                'memory_usage',
                'memory_used',
                'system_memory_free',
                'load_average',
                'event_loop_delay',
                'disk_usage',
                'network_io'
            ]
        },
        
        // 数据库指标
        databaseMetrics: {
            enabled: true,
            interval: 10000,
            metrics: [
                'total_records',
                'table_records',
                'performance_metrics_count',
                'avg_cpu_usage',
                'avg_memory_usage',
                'active_alerts',
                'query_performance',
                'connection_pool'
            ]
        },
        
        // API指标
        apiMetrics: {
            enabled: true,
            interval: 8000,
            metrics: [
                'total_requests',
                'avg_response_time',
                'error_rate',
                'active_connections',
                'throughput',
                'api_latency',
                'http_status_codes'
            ]
        },
        
        // 自定义指标
        customMetrics: {
            enabled: true,
            interval: 6000,
            metrics: [
                'detector_temperature',
                'detector_voltage',
                'background_radiation',
                'detector_status',
                'calibration_status',
                'measurement_count'
            ]
        }
    },
    
    // 警报配置
    alerting: {
        enabled: true,
        channels: {
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
                recipients: []
            },
            webhook: {
                enabled: false,
                url: '',
                headers: {}
            }
        },
        
        // 警报阈值
        thresholds: {
            cpu_usage: {
                warning: 70,
                critical: 85
            },
            memory_usage: {
                warning: 75,
                critical: 90
            },
            disk_usage: {
                warning: 80,
                critical: 95
            },
            api_response_time: {
                warning: 1000,
                critical: 3000
            },
            error_rate: {
                warning: 5,
                critical: 15
            },
            detector_temperature: {
                warning: 30,
                critical: 40
            }
        }
    },
    
    // 日志配置
    logging: {
        level: 'info', // debug, info, warn, error
        maxLogFiles: 5,
        maxLogSize: '10MB',
        format: 'json', // json, text
        includeTimestamp: true,
        includeSource: true
    },
    
    // 聚合配置
    aggregation: {
        // 启用数据聚合
        enabled: true,
        
        // 聚合间隔
        intervals: {
            '1m': 60 * 1000,     // 1分钟
            '5m': 5 * 60 * 1000, // 5分钟
            '15m': 15 * 60 * 1000, // 15分钟
            '1h': 60 * 60 * 1000  // 1小时
        },
        
        // 聚合方法
        methods: {
            avg: true,   // 平均值
            min: true,   // 最小值
            max: true,   // 最大值
            sum: true,   // 总和
            count: true, // 计数
            stddev: true // 标准差
        },
        
        // 聚合缓存配置
        cache: {
            enabled: true,
            maxSize: 1000,
            ttl: 5 * 60 * 1000 // 5分钟
        }
    },
    
    // API配置
    api: {
        port: process.env.DATA_COLLECTOR_PORT || 3001,
        host: process.env.DATA_COLLECTOR_HOST || 'localhost',
        
        // CORS配置
        cors: {
            enabled: true,
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        },
        
        // 限流配置
        rateLimit: {
            enabled: true,
            windowMs: 15 * 60 * 1000, // 15分钟
            max: 1000, // 每个IP最多1000个请求
            message: '请求过于频繁，请稍后再试'
        },
        
        // 认证配置
        auth: {
            enabled: false,
            type: 'jwt', // basic, jwt, oauth
            secret: process.env.JWT_SECRET || 'default-secret',
            expiresIn: '24h'
        }
    },
    
    // 性能优化配置
    performance: {
        // 启用缓存
        cache: {
            enabled: true,
            type: 'memory', // memory, redis
            ttl: 300, // 5分钟
            maxSize: 1000
        },
        
        // 批处理配置
        batchProcessing: {
            enabled: true,
            batchSize: 100,
            flushInterval: 10000 // 10秒
        },
        
        // 内存管理
        memoryManagement: {
            gcThreshold: 100 * 1024 * 1024, // 100MB
            gcInterval: 5 * 60 * 1000 // 5分钟
        }
    },
    
    // 环境配置
    environment: {
        // 运行环境 (development, testing, production)
        env: process.env.NODE_ENV || 'development',
        
        // 调试模式
        debug: process.env.DEBUG === 'true',
        
        // 静默模式
        silent: process.env.SILENT === 'true',
        
        // 测试模式
        testing: process.env.NODE_ENV === 'testing'
    },
    
    // 扩展配置
    extensions: {
        // 数据源扩展
        sources: {
            // 自定义数据源配置
        },
        
        // 存储扩展
        storage: {
            // 自定义存储适配器
        },
        
        // 处理器扩展
        processors: {
            // 数据处理器配置
        }
    }
};