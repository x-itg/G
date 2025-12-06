/**
 * 日志查询引擎演示文件
 * 展示如何使用日志查询和分析功能
 */

const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');
const { createLogQueryIntegration } = require('./logQueryIntegration');

/**
 * 日志查询系统演示
 */
class LogQueryDemo {
    constructor() {
        this.db = new SimplifiedDatabaseManager();
        this.logQueryEngine = null;
    }

    /**
     * 初始化演示环境
     */
    async initialize() {
        console.log('🚀 启动日志查询系统演示...\n');
        
        // 初始化数据库
        this.db.initialize();
        
        // 创建并初始化日志查询系统
        const integration = await createLogQueryIntegration(this.db);
        this.logQueryEngine = integration.getLogQueryEngine();
        
        // 创建演示数据
        await this.createDemoData();
        
        return this.logQueryEngine;
    }

    /**
     * 创建演示数据
     */
    async createDemoData() {
        console.log('📊 创建演示数据...');
        
        const demoLogs = [
            {
                table: 'audit_logs',
                data: [
                    {
                        user_id: 'user001',
                        username: 'admin',
                        action: 'login',
                        resource: 'system',
                        result: 'SUCCESS',
                        ip_address: '192.168.1.100',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        details: '用户登录成功'
                    },
                    {
                        user_id: 'user002',
                        username: 'operator1',
                        action: 'measurement_start',
                        resource: 'detector',
                        result: 'SUCCESS',
                        ip_address: '192.168.1.101',
                        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                        details: '开始放射化学检测'
                    },
                    {
                        user_id: 'user003',
                        username: 'analyst1',
                        action: 'data_export',
                        resource: 'results',
                        result: 'FAILURE',
                        ip_address: '192.168.1.102',
                        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                        details: '数据导出失败：文件权限不足'
                    },
                    {
                        user_id: 'user001',
                        username: 'admin',
                        action: 'system_config',
                        resource: 'settings',
                        result: 'SUCCESS',
                        ip_address: '192.168.1.100',
                        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                        details: '系统配置更新'
                    },
                    {
                        user_id: 'user004',
                        username: 'visitor1',
                        action: 'login',
                        resource: 'system',
                        result: 'FAILURE',
                        ip_address: '192.168.1.103',
                        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                        details: '登录失败：密码错误'
                    }
                ]
            },
            {
                table: 'performance_metrics',
                data: [
                    {
                        metric_type: 'performance',
                        metric_name: 'cpu_usage',
                        value: 45.2,
                        unit: '%',
                        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                        alert_level: 'NORMAL'
                    },
                    {
                        metric_type: 'performance',
                        metric_name: 'memory_usage',
                        value: 68.7,
                        unit: '%',
                        timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
                        alert_level: 'NORMAL'
                    },
                    {
                        metric_type: 'performance',
                        metric_name: 'api_response_time',
                        value: 125.3,
                        unit: 'ms',
                        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                        alert_level: 'WARNING'
                    },
                    {
                        metric_type: 'performance',
                        metric_name: 'cpu_usage',
                        value: 85.1,
                        unit: '%',
                        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
                        alert_level: 'CRITICAL'
                    }
                ]
            }
        ];

        // 插入演示数据
        for (const tableData of demoLogs) {
            for (const record of tableData.data) {
                await this.db.addRecord(tableData.table, record);
            }
        }
        
        console.log('✅ 演示数据创建完成\n');
    }

    /**
     * 演示基本日志搜索
     */
    async demoBasicSearch() {
        console.log('🔍 演示1: 基本日志搜索');
        console.log('=' * 50);
        
        const searchQuery = {
            logTypes: ['audit_logs'],
            filters: {
                result: 'SUCCESS'
            },
            sortBy: 'timestamp',
            sortOrder: 'desc',
            limit: 10
        };
        
        const result = await this.logQueryEngine.searchLogs(searchQuery);
        
        console.log('查询结果:');
        console.log(`- 找到 ${result.data.length} 条成功日志`);
        console.log(`- 执行时间: ${result.query.executionTime.toFixed(2)}ms`);
        
        if (result.data.length > 0) {
            console.log('\n最新成功操作:');
            result.data.slice(0, 3).forEach((log, index) => {
                console.log(`${index + 1}. ${log.username} - ${log.action} (${log.timestamp})`);
            });
        }
        
        console.log('\n');
    }

    /**
     * 演示多条件搜索
     */
    async demoMultiConditionSearch() {
        console.log('🎯 演示2: 多条件搜索');
        console.log('=' * 50);
        
        const searchQuery = {
            logTypes: ['audit_logs'],
            timeRange: {
                start: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
            },
            keywords: ['失败', 'error', 'FAILURE'],
            filters: {
                action: 'login'
            },
            limit: 20
        };
        
        const result = await this.logQueryEngine.searchLogs(searchQuery);
        
        console.log('搜索条件:');
        console.log('- 时间范围: 过去3小时');
        console.log('- 关键词: 失败/error/FAILURE');
        console.log('- 操作类型: login');
        console.log(`\n搜索结果: 找到 ${result.data.length} 条相关日志`);
        
        if (result.data.length > 0) {
            result.data.forEach((log, index) => {
                console.log(`${index + 1}. ${log.username} - ${log.action} - ${log.result} (${log.details})`);
            });
        }
        
        console.log('\n');
    }

    /**
     * 演示聚合查询
     */
    async demoAggregation() {
        console.log('📈 演示3: 聚合查询');
        console.log('=' * 50);
        
        const query = {
            logTypes: ['audit_logs'],
            timeRange: {
                start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            },
            aggregations: {
                user_activity: {
                    type: 'groupBy',
                    field: 'username',
                    limit: 5
                },
                action_count: {
                    type: 'count'
                },
                success_rate: {
                    type: 'groupBy',
                    field: 'result'
                }
            }
        };
        
        const result = await this.logQueryEngine.aggregateLogs(query);
        
        console.log('聚合结果:');
        
        if (result.data.user_activity) {
            console.log('\n用户活动统计:');
            result.data.user_activity.forEach(item => {
                console.log(`- ${item.key}: ${item.count} 次操作`);
            });
        }
        
        if (result.data.success_rate) {
            console.log('\n操作结果分布:');
            result.data.success_rate.forEach(item => {
                console.log(`- ${item.key}: ${item.count} 次`);
            });
        }
        
        console.log('\n');
    }

    /**
     * 演示用户行为分析
     */
    async demoUserBehaviorAnalysis() {
        console.log('👤 演示4: 用户行为分析');
        console.log('=' * 50);
        
        const timeRange = {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        };
        
        const result = await this.logQueryEngine.analyzeUserBehavior(timeRange);
        
        if (result.success) {
            const data = result.data;
            
            console.log('用户行为分析结果:');
            
            if (data.userActivity) {
                console.log('\n用户活动统计:');
                Object.entries(data.userActivity).forEach(([userId, stats]) => {
                    console.log(`- ${userId}:`);
                    console.log(`  - 总操作数: ${stats.totalActions}`);
                    console.log(`  - 操作类型: ${stats.uniqueActions.join(', ')}`);
                    console.log(`  - 成功率: ${stats.successRate}`);
                });
            }
            
            if (data.actionDistribution) {
                console.log('\n操作类型分布:');
                data.actionDistribution.slice(0, 5).forEach(item => {
                    console.log(`- ${item.action}: ${item.count} 次`);
                });
            }
            
            if (data.anomalies && data.anomalies.length > 0) {
                console.log('\n⚠️ 检测到的异常:');
                data.anomalies.forEach(anomaly => {
                    console.log(`- ${anomaly.type}: ${anomaly.description}`);
                });
            }
        }
        
        console.log('\n');
    }

    /**
     * 演示系统健康分析
     */
    async demoSystemHealthAnalysis() {
        console.log('🏥 演示5: 系统健康分析');
        console.log('=' * 50);
        
        const timeRange = {
            start: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        };
        
        const result = await this.logQueryEngine.analyzeSystemHealth(timeRange);
        
        if (result.success) {
            const data = result.data;
            
            console.log('系统健康分析结果:');
            
            if (data.healthScore !== undefined) {
                console.log(`\n健康评分: ${data.healthScore}/100`);
                const level = data.healthScore >= 80 ? '良好' : 
                             data.healthScore >= 60 ? '一般' : '需要关注';
                console.log(`健康等级: ${level}`);
            }
            
            if (data.performanceTrends) {
                console.log('\n性能趋势:');
                Object.entries(data.performanceTrends).forEach(([metric, trend]) => {
                    if (trend.avg !== undefined) {
                        console.log(`- ${metric}: 平均 ${trend.avg.toFixed(2)}, 峰值 ${trend.max.toFixed(2)}`);
                    }
                });
            }
            
            if (data.errorPatterns) {
                console.log(`\n错误统计: 总计 ${data.errorPatterns.totalErrors} 个错误`);
                if (data.errorPatterns.topErrors && data.errorPatterns.topErrors.length > 0) {
                    console.log('主要错误类型:');
                    data.errorPatterns.topErrors.slice(0, 3).forEach(error => {
                        console.log(`- ${error.type}: ${error.count} 次`);
                    });
                }
            }
        }
        
        console.log('\n');
    }

    /**
     * 演示安全事件分析
     */
    async demoSecurityAnalysis() {
        console.log('🔒 演示6: 安全事件分析');
        console.log('=' * 50);
        
        const timeRange = {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        };
        
        const result = await this.logQueryEngine.analyzeSecurityEvents(timeRange);
        
        if (result.success) {
            const data = result.data;
            
            console.log('安全事件分析结果:');
            
            if (data.threats && data.threats.length > 0) {
                console.log('\n⚠️ 检测到的安全威胁:');
                data.threats.forEach(threat => {
                    console.log(`- ${threat.severity.toUpperCase()}: ${threat.description}`);
                });
            } else {
                console.log('\n✅ 未检测到明显的安全威胁');
            }
            
            if (data.suspiciousIPs && data.suspiciousIPs.length > 0) {
                console.log('\n可疑IP活动:');
                data.suspiciousIPs.forEach(ip => {
                    console.log(`- ${ip.ip}: ${ip.attempts} 次尝试 (${ip.failureRate} 失败率)`);
                });
            }
            
            if (data.securityReport) {
                console.log(`\n风险等级: ${data.securityReport.riskLevel.toUpperCase()}`);
                if (data.securityReport.recommendations.length > 0) {
                    console.log('安全建议:');
                    data.securityReport.recommendations.forEach((rec, index) => {
                        console.log(`${index + 1}. ${rec}`);
                    });
                }
            }
        }
        
        console.log('\n');
    }

    /**
     * 演示导出功能
     */
    async demoExport() {
        console.log('📤 演示7: 导出功能');
        console.log('=' * 50);
        
        const query = {
            logTypes: ['audit_logs'],
            timeRange: {
                start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            },
            limit: 100
        };
        
        // 导出为JSON格式
        const jsonResult = await this.logQueryEngine.exportResults(query, 'json');
        console.log('JSON导出结果:');
        console.log(`- 文件名: ${jsonResult.filename}`);
        console.log(`- 记录数: ${jsonResult.recordCount}`);
        
        // 导出为CSV格式
        const csvResult = await this.logQueryEngine.exportResults(query, 'csv');
        console.log('\nCSV导出结果:');
        console.log(`- 文件名: ${csvResult.filename}`);
        console.log(`- 记录数: ${csvResult.recordCount}`);
        console.log('- 数据预览:');
        console.log(csvResult.data.split('\n').slice(0, 5).join('\n'));
        
        console.log('\n');
    }

    /**
     * 运行所有演示
     */
    async runAllDemos() {
        try {
            await this.initialize();
            
            await this.demoBasicSearch();
            await this.demoMultiConditionSearch();
            await this.demoAggregation();
            await this.demoUserBehaviorAnalysis();
            await this.demoSystemHealthAnalysis();
            await this.demoSecurityAnalysis();
            await this.demoExport();
            
            console.log('🎉 所有演示完成！');
            console.log('\n查询统计信息:');
            const stats = this.logQueryEngine.getQueryStats();
            console.log(JSON.stringify(stats, null, 2));
            
        } catch (error) {
            console.error('❌ 演示过程中出现错误:', error);
        } finally {
            if (this.db) {
                this.db.close();
            }
        }
    }
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
    const demo = new LogQueryDemo();
    demo.runAllDemos();
}

module.exports = LogQueryDemo;