/**
 * 性能验证API接口测试
 */

const http = require('http');

const API_BASE = 'http://localhost:3002';

// 辅助函数：发起HTTP请求
function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(body);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (error) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// 测试所有API端点
async function testAPIEndpoints() {
    console.log('开始测试性能验证API端点...\n');

    const tests = [
        {
            name: '健康检查',
            path: '/api/health',
            method: 'GET'
        },
        {
            name: '获取验证结果',
            path: '/api/validation/performance',
            method: 'GET'
        },
        {
            name: '执行基准测试',
            path: '/api/validation/performance/benchmark',
            method: 'POST'
        },
        {
            name: '获取验证报告',
            path: '/api/validation/performance/report',
            method: 'GET'
        },
        {
            name: '执行完整验证',
            path: '/api/validation/performance/run',
            method: 'POST'
        },
        {
            name: '系统状态',
            path: '/api/system/status',
            method: 'GET'
        }
    ];

    for (const test of tests) {
        try {
            console.log(`测试: ${test.name}`);
            console.log(`路径: ${test.method} ${test.path}`);
            
            const response = await makeRequest(test.path, test.method);
            
            if (response.status === 200) {
                console.log('✅ 成功');
                if (response.data.success !== undefined) {
                    console.log(`   成功状态: ${response.data.success}`);
                }
                if (response.data.data) {
                    console.log(`   数据大小: ${JSON.stringify(response.data.data).length} 字符`);
                }
            } else {
                console.log(`❌ 失败 - 状态码: ${response.status}`);
            }
            
        } catch (error) {
            console.log(`❌ 错误: ${error.message}`);
        }
        
        console.log('');
    }
}

// 检查服务器是否运行
async function checkServer() {
    try {
        console.log('检查服务器状态...');
        const response = await makeRequest('/api/health');
        
        if (response.status === 200) {
            console.log('✅ 服务器运行正常');
            console.log(`服务器信息: ${JSON.stringify(response.data, null, 2)}`);
            return true;
        } else {
            console.log(`❌ 服务器响应异常，状态码: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ 无法连接到服务器: ${error.message}`);
        console.log('请先运行: node validationServer.js');
        return false;
    }
}

// 主测试函数
async function main() {
    const serverRunning = await checkServer();
    
    if (serverRunning) {
        await testAPIEndpoints();
        console.log('所有API测试完成！');
    } else {
        console.log('请先启动服务器后再运行测试');
    }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testAPIEndpoints,
    checkServer,
    makeRequest
};