# =============================================
#   辐射检测器软件 - 智能启动器
#   CFR 21 Part 11 合规
# =============================================

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  辐射检测器软件 - 智能启动器" -ForegroundColor Yellow
Write-Host "  CFR 21 Part 11 合规" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "检查环境..." -ForegroundColor Green

Write-Host "Node.js版本：" -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未检测到Node.js" -ForegroundColor Red
    Write-Host "请先安装Node.js 16或更高版本" -ForegroundColor Yellow
    Write-Host "下载地址：https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
    exit 1
}

Write-Host ""
Write-Host "检查依赖包..." -ForegroundColor Green

# 检查关键依赖
try {
    node -e "try { require('express'); require('better-sqlite3'); require('bcryptjs'); console.log('✅ 核心依赖包已安装'); } catch(e) { console.log('⚠️  缺少部分依赖包'); process.exit(1); }" 2>$null
    Write-Host "✅ 核心依赖检查通过" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Yellow
    Write-Host "  检测到依赖问题，尝试自动修复..." -ForegroundColor Yellow
    Write-Host "===========================================" -ForegroundColor Yellow
    
    Write-Host "运行最小化安装..." -ForegroundColor Green
    & "./install-minimal.ps1"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 自动修复失败" -ForegroundColor Red
        Write-Host "请手动运行：install-minimal.ps1" -ForegroundColor Yellow
        Read-Host "按Enter键退出"
        exit 1
    }
}

Write-Host ""
Write-Host "检查Electron..." -ForegroundColor Green

# 检查Electron是否可用
if (Test-Path "node_modules\electron") {
    Write-Host "✅ 检测到Electron" -ForegroundColor Green
    Write-Host ""
    Write-Host "尝试启动Electron桌面版..." -ForegroundColor Green
    
    try {
        electron .
        Write-Host "✅ Electron启动成功" -ForegroundColor Green
        exit 0
    } catch {
        Write-Host "❌ Electron启动失败" -ForegroundColor Red
        Write-Host ""
        Write-Host "可能原因：" -ForegroundColor Yellow
        Write-Host "1. Electron下载不完整" -ForegroundColor Yellow
        Write-Host "2. 网络连接问题" -ForegroundColor Yellow
        Write-Host "3. 权限问题" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "尝试Web版本..." -ForegroundColor Yellow
        $useWebVersion = $true
    }
} else {
    Write-Host "⚠️  未检测到Electron" -ForegroundColor Yellow
    $useWebVersion = $true
}

if ($useWebVersion) {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "  启动Web版本..." -ForegroundColor Yellow
    Write-Host "===========================================" -ForegroundColor Cyan
    
    Write-Host "启动Web服务器 (端口 3000)..." -ForegroundColor Green
    Write-Host ""
    Write-Host "功能说明：" -ForegroundColor Green
    Write-Host "  ✅ CFR 21 Part 11 合规认证" -ForegroundColor Green
    Write-Host "  ✅ 模拟串口通信 (COM2/COM3)" -ForegroundColor Green
    Write-Host "  ✅ 实时数据可视化" -ForegroundColor Green
    Write-Host "  ✅ 审计日志记录" -ForegroundColor Green
    Write-Host "  ✅ 设备管理功能" -ForegroundColor Green
    Write-Host "  ✅ 电子签名支持" -ForegroundColor Green
    Write-Host ""
    Write-Host "访问地址：http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "登录信息：" -ForegroundColor Yellow
    Write-Host "  用户名：admin" -ForegroundColor Yellow
    Write-Host "  密码：Admin123!" -ForegroundColor Yellow
    Write-Host "  角色：管理员" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  Web版本说明：" -ForegroundColor Yellow
    Write-Host "  - 串口功能为模拟实现" -ForegroundColor Yellow
    Write-Host "  - 数据保存在内存中" -ForegroundColor Yellow
    Write-Host "  - 适合演示和界面测试" -ForegroundColor Yellow
    Write-Host "  - 完整展示CFR 21 Part 11功能" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Cyan
    Write-Host "===========================================" -ForegroundColor Cyan
    
    try {
        node web-server.js
    } catch {
        Write-Host ""
        Write-Host "❌ Web服务器启动失败" -ForegroundColor Red
        Write-Host ""
        Write-Host "可能的解决方案：" -ForegroundColor Yellow
        Write-Host "1. 检查端口3000是否被占用" -ForegroundColor Yellow
        Write-Host "2. 确认Node.js版本 >= 16" -ForegroundColor Yellow
        Write-Host "3. 运行 install-minimal.ps1 重新安装依赖" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "详细说明请查看：ELECTRON-FAQ.md" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "按Enter键退出"
        exit 1
    }
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  程序已退出" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "如需技术支持，请查看：" -ForegroundColor Green
Write-Host "  - ELECTRON-FAQ.md    # 常见问题解答" -ForegroundColor Yellow
Write-Host "  - README.md          # 详细使用说明" -ForegroundColor Yellow
Write-Host "  - install-minimal.ps1 # 依赖安装脚本" -ForegroundColor Yellow
Write-Host ""

Read-Host "按Enter键退出"
