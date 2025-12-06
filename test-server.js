const http = require('http');
const url = require('url');

// 简化的API测试服务器，用于验证前端API调用
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 设置响应头
    res.setHeader('Content-Type', 'application/json');

    let response = {};
    let statusCode = 200;

    try {
        // 硬件状态查询接口
        if (path === '/api/hardware/status' && method === 'GET') {
            response = {
                success: true,
                data: {
                    isConnected: true,
                    currentMode: "simulated",
                    currentDevice: {
                        name: "碘化钠探测器",
                        manufacturer: "Saint-Gobain",
                        model: "3x3-inch",
                        deviceId: "SIM_1701754344000",
                        isSimulated: true
                    },
                    stats: {
                        totalAcquisitions: 15,
                        totalCounts: 1250000,
                        averageCountRate: 1250.5,
                        lastUpdate: new Date().toISOString()
                    }
                }
            };
        }
        // 获取可用串口列表
        else if (path === '/api/hardware/ports' && method === 'GET') {
            response = {
                success: true,
                data: [
                    {
                        path: "COM2",
                        manufacturer: "FTDI",
                        serialNumber: "123456789",
                        pnpId: "USB\\VID_0403&PID_6001"
                    },
                    {
                        path: "COM3",
                        manufacturer: "FTDI",
                        serialNumber: "987654321",
                        pnpId: "USB\\VID_0403&PID_6001"
                    }
                ]
            };
        }
        // 测试串口连接
        else if (path === '/api/hardware/ports/test' && method === 'POST') {
            response = {
                success: true,
                message: "串口连接测试成功",
                port: "COM2",
                timestamp: new Date().toISOString()
            };
        }
        // 获取当前谱线数据
        else if (path === '/api/hardware/spectrum/current' && method === 'GET') {
            const spectrumData = Array.from({length: 1024}, () => Math.floor(Math.random() * 1000));
            response = {
                success: true,
                data: {
                    timestamp: new Date().toISOString(),
                    spectrum: spectrumData,
                    totalCounts: spectrumData.reduce((a, b) => a + b, 0),
                    device: {
                        name: "碘化钠探测器",
                        manufacturer: "Saint-Gobain",
                        model: "3x3-inch",
                        channels: 1024
                    },
                    mode: "simulated",
                    bufferLength: 150
                }
            };
        }
        // 开始数据采集
        else if (path === '/api/hardware/acquisition/start' && method === 'POST') {
            response = {
                success: true,
                message: "数据采集已开始",
                timestamp: new Date().toISOString(),
                mode: "simulated",
                acquisitionId: "acq_" + Date.now()
            };
        }
        // 停止数据采集
        else if (path === '/api/hardware/acquisition/stop' && method === 'POST') {
            response = {
                success: true,
                message: "数据采集已停止",
                timestamp: new Date().toISOString()
            };
        }
        // 硬件模式切换
        else if (path === '/api/hardware/mode' && method === 'POST') {
            response = {
                success: true,
                message: "硬件模式已切换",
                newMode: "simulated",
                timestamp: new Date().toISOString()
            };
        }
        // 断开硬件连接
        else if (path === '/api/hardware/disconnect' && method === 'POST') {
            response = {
                success: true,
                message: "硬件连接已断开",
                timestamp: new Date().toISOString()
            };
        }
        // 获取历史数据
        else if (path === '/api/hardware/spectrum/history' && method === 'GET') {
            response = {
                success: true,
                data: [
                    {
                        timestamp: new Date(Date.now() - 300000).toISOString(),
                        totalCounts: 45000,
                        device: "SIM_1701754344000"
                    },
                    {
                        timestamp: new Date(Date.now() - 600000).toISOString(),
                        totalCounts: 38000,
                        device: "SIM_1701754344000"
                    }
                ]
            };
        }
        // 获取模拟设备列表
        else if (path === '/api/hardware/simulated-devices' && method === 'GET') {
            response = {
                success: true,
                data: {
                    hpge_detector: {
                        name: "高纯锗探测器",
                        spectralRange: [0, 4095],
                        channels: 4096,
                        samplingRate: 1000
                    },
                    nai_detector: {
                        name: "碘化钠探测器",
                        spectralRange: [0, 1023],
                        channels: 1024,
                        samplingRate: 500
                    },
                    plastic_scintillator: {
                        name: "塑料闪烁探测器",
                        spectralRange: [0, 255],
                        channels: 256,
                        samplingRate: 100
                    }
                }
            };
        }
        // 默认响应
        else {
            statusCode = 404;
            response = {
                success: false,
                error: "API端点未找到",
                path: path,
                method: method,
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        statusCode = 500;
        response = {
            success: false,
            error: "服务器内部错误: " + error.message,
            timestamp: new Date().toISOString()
        };
    }

    res.writeHead(statusCode);
    res.end(JSON.stringify(response));
});

const PORT = 3002;
server.listen(PORT, () => {
    console.log(`测试API服务器运行在 http://localhost:${PORT}`);
    console.log('可用的API端点:');
    console.log('  GET  /api/hardware/status');
    console.log('  GET  /api/hardware/ports');
    console.log('  POST /api/hardware/ports/test');
    console.log('  GET  /api/hardware/spectrum/current');
    console.log('  POST /api/hardware/acquisition/start');
    console.log('  POST /api/hardware/acquisition/stop');
    console.log('  POST /api/hardware/mode');
    console.log('  POST /api/hardware/disconnect');
    console.log('  GET  /api/hardware/spectrum/history');
    console.log('  GET  /api/hardware/simulated-devices');
});

server.on('error', (err) => {
    console.error('服务器错误:', err);
});