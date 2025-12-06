/**
 * 测试停止采集API端点的独立测试脚本
 */

const http = require('http');

// 模拟web服务器的基本设置进行测试
console.log('🧪 测试停止采集API端点...\n');

// 测试函数：发送HTTP请求
function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = `http://localhost:3000${path}`;
        console.log(`📤 发送请求: ${options.method || 'GET'} ${url}`);
        
        const req = http.request(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`📥 响应状态: ${res.statusCode}`);
                    console.log(`📥 响应内容: ${JSON.stringify(result, null, 2)}`);
                    resolve(result);
                } catch (error) {
                    console.log(`📥 响应内容: ${data}`);
                    resolve(data);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error(`❌ 请求错误: ${error.message}`);
            reject(error);
        });
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

async function testStopAcquisitionAPI() {
    try {
        console.log('1. 测试停止采集API（当前未在进行采集）');
        
        const result = await makeRequest('/api/hardware/acquisition/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // 检查响应格式
        if (result && typeof result === 'object') {
            if (result.success === false && result.error) {
                console.log('✅ API返回正确的错误格式:', result.error);
                console.log('✅ 测试通过：API正确处理了未在进行采集的情况');
                return true;
            } else if (result.success === true) {
                console.log('✅ API返回成功:', result.message);
                console.log('✅ 测试通过：API正确处理了停止采集请求');
                return true;
            } else {
                console.log('❌ API返回格式异常:', result);
                return false;
            }
        } else {
            console.log('❌ API返回无效结果:', result);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ API测试失败: ${error.message}`);
        return false;
    }
}

// 运行测试
testStopAcquisitionAPI()
    .then(success => {
        if (success) {
            console.log('\n🎉 停止采集API测试成功通过！');
        } else {
            console.log('\n❌ 停止采集API测试失败');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('\n❌ 测试执行失败:', error);
        process.exit(1);
    });