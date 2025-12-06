# =============================================
#   辐射检测器软件 - Web版本启动器
#   CFR 21 Part 11 合规
# =============================================

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  辐射检测器软件 - Web版本启动器" -ForegroundColor Yellow
Write-Host "  CFR 21 Part 11 合规" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "检查依赖包..." -ForegroundColor Green
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js环境检测通过" -ForegroundColor Green
    Write-Host "Node.js版本：$nodeVersion" -ForegroundColor Yellow
} catch {
    Write-Host "❌ 错误：未检测到Node.js" -ForegroundColor Red
    Write-Host "请先安装Node.js 16或更高版本" -ForegroundColor Yellow
    Write-Host "下载地址：https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Host "npm版本：$npmVersion" -ForegroundColor Yellow
} catch {
    Write-Host "❌ 错误：未检测到npm" -ForegroundColor Red
    Read-Host "按Enter键退出"
    exit 1
}

Write-Host ""
Write-Host "检查核心依赖包..." -ForegroundColor Green
try {
    node -e "try { require('express'); require('better-sqlite3'); require('bcryptjs'); console.log('✅ 核心依赖包已安装'); } catch(e) { console.log('❌ 缺少依赖包'); process.exit(1); }" 2>$null
} catch {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Yellow
    Write-Host "  自动安装核心依赖包..." -ForegroundColor Yellow
    Write-Host "===========================================" -ForegroundColor Yellow
    
    Write-Host "安装基础依赖..." -ForegroundColor Green
    npm install express better-sqlite3 bcryptjs uuid moment lodash dotenv --no-optional
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 依赖包安装失败" -ForegroundColor Red
        Write-Host "请运行：install-fix.ps1" -ForegroundColor Yellow
        Read-Host "按Enter键退出"
        exit 1
    }
    
    Write-Host "✅ 依赖包安装完成" -ForegroundColor Green
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  启动辐射检测器软件..." -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "🌐 启动Web服务器 (端口 3000)..." -ForegroundColor Cyan
Write-Host "📊 模拟串口通信功能" -ForegroundColor Green
Write-Host "🔐 CFR 21 Part 11 合规认证" -ForegroundColor Green
Write-Host "📝 实时审计日志" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址：http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "默认登录信息：" -ForegroundColor Yellow
Write-Host "  用户名：admin" -ForegroundColor Yellow
Write-Host "  密码：Admin123!" -ForegroundColor Yellow
Write-Host "  角色：管理员" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  注意：这是Web模拟版本" -ForegroundColor Yellow
Write-Host "  - 串口功能为模拟实现" -ForegroundColor Yellow
Write-Host "  - 数据保存在内存中（服务器关闭后丢失）" -ForegroundColor Yellow
Write-Host "  - 仅用于界面测试和演示" -ForegroundColor Yellow
Write-Host ""
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

try {
    node web-server.js
} catch {
    Write-Host ""
    Write-Host "❌ Web服务器启动失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的解决方案：" -ForegroundColor Yellow
    Write-Host "1. 检查端口3000是否被占用" -ForegroundColor Yellow
    Write-Host "2. 确认Node.js版本 >= 16" -ForegroundColor Yellow
    Write-Host "3. 运行 install-fix.ps1 重新安装依赖" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按Enter键退出"
    exit 1
}
