const http = require('http');
const url = require('url');

// 简化的验证API服务器
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

    // 验证历史API
    if (path === '/api/validation/history' && method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            history: [
                {
                    id: 'val_' + Date.now(),
                    type: 'data_integrity',
                    timestamp: new Date().toISOString(),
                    result: { valid: true },
                    details: '测试验证记录'
                }
            ]
        }));
        return;
    }

    // 清空验证历史
    if (path === '/api/validation/history' && method === 'DELETE') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            message: '验证历史已清空'
        }));
        return;
    }

    // 其他API端点返回404
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(404);
    res.end(JSON.stringify({
        success: false,
        error: "API端点未找到",
        path: path,
        method: method,
        timestamp: new Date().toISOString()
    }));
});

const PORT = 3003;
server.listen(PORT, () => {
    console.log(`验证API服务器运行在 http://localhost:${PORT}`);
    console.log('可用的API端点:');
    console.log('  GET  /api/validation/history');
    console.log('  DELETE /api/validation/history');
});

server.on('error', (err) => {
    console.error('服务器错误:', err);
});