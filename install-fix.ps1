# =============================================
#   辐射检测器软件安装修复脚本
#   CFR 21 Part 11 合规版本
# =============================================

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  辐射检测器软件安装修复脚本" -ForegroundColor Yellow
Write-Host "  CFR 21 Part 11 合规版本" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "检查Node.js版本..." -ForegroundColor Green
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误：未检测到Node.js，请先安装Node.js 16或更高版本" -ForegroundColor Red
    Write-Host "下载地址：https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
    exit 1
}

Write-Host ""
Write-Host "清理npm缓存..." -ForegroundColor Green
npm cache clean --force

Write-Host ""
Write-Host "删除node_modules和package-lock.json..." -ForegroundColor Green
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }

Write-Host ""
Write-Host "安装依赖包..." -ForegroundColor Green
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Red
    Write-Host "安装失败！尝试替代方案..." -ForegroundColor Red
    Write-Host "===========================================" -ForegroundColor Red
    
    Write-Host ""
    Write-Host "使用npm ci清理安装..." -ForegroundColor Green
    npm ci
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "===========================================" -ForegroundColor Red
        Write-Host "手动安装核心依赖..." -ForegroundColor Red
        Write-Host "===========================================" -ForegroundColor Red
        
        Write-Host ""
        npm install express better-sqlite3 bcryptjs serialport chart.js electron-store uuid moment lodash dotenv
        npm install --save-dev electron jest
        
        Write-Host ""
        Write-Host "手动安装其他可选依赖..." -ForegroundColor Green
        npm install sequelize crypto helmet rate-limiter-flexible jsonwebtoken cors electron-builder
    }
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "检查安装结果..." -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "✅ 依赖安装成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "启动应用程序：" -ForegroundColor Green
    Write-Host "npm start" -ForegroundColor Yellow
    Write-Host "或使用：" -ForegroundColor Green
    Write-Host "start.ps1" -ForegroundColor Yellow
} else {
    Write-Host "❌ 依赖安装失败" -ForegroundColor Red
    Write-Host "请检查错误信息并手动安装" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "安装完成！" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
Read-Host "按Enter键退出"
