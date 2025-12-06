# =============================================
#   辐射检测器软件 - 最小化安装
#   仅安装Web版本所需依赖
# =============================================

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  辐射检测器软件 - 最小化安装" -ForegroundColor Yellow
Write-Host "  仅安装Web版本所需依赖" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "检查Node.js环境..." -ForegroundColor Green
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js版本：$nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误：未检测到Node.js" -ForegroundColor Red
    Write-Host "请先安装Node.js 16或更高版本" -ForegroundColor Yellow
    Write-Host "下载地址：https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
    exit 1
}

Write-Host ""
Write-Host "Node.js版本：" -ForegroundColor Yellow
node --version
Write-Host ""

Write-Host "清理缓存..." -ForegroundColor Green
npm cache clean --force

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  安装Web版本核心依赖" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan

Write-Host "安装基础依赖包..." -ForegroundColor Green
npm install express@^4.18.2 better-sqlite3@^9.2.2 bcryptjs@^2.4.3 uuid@^9.0.1 moment@^2.29.4 lodash@^4.17.21 dotenv@^16.3.1 --no-optional --no-package-lock

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 依赖包安装失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "尝试其他安装方法..." -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "1. 单独安装Express..." -ForegroundColor Green
    npm install express@^4.18.2 --no-optional
    
    Write-Host ""
    Write-Host "2. 安装better-sqlite3..." -ForegroundColor Green
    npm install better-sqlite3@^9.2.2 --no-optional
    
    Write-Host ""
    Write-Host "3. 安装其他依赖..." -ForegroundColor Green
    npm install bcryptjs uuid moment lodash dotenv --no-optional
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  验证安装结果" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan

Write-Host "测试核心模块..." -ForegroundColor Green
node -e "
try {
    require('express');
    console.log('✅ Express 正常');
} catch(e) {
    console.log('❌ Express 缺失');
    process.exit(1);
}

try {
    require('better-sqlite3');
    console.log('✅ Better-SQLite3 正常');
} catch(e) {
    console.log('❌ Better-SQLite3 缺失');
    process.exit(1);
}

try {
    require('bcryptjs');
    console.log('✅ BcryptJS 正常');
} catch(e) {
    console.log('❌ BcryptJS 缺失');
    process.exit(1);
}

try {
    require('uuid');
    console.log('✅ UUID 正常');
} catch(e) {
    console.log('❌ UUID 缺失');
    process.exit(1);
}

console.log('✅ 所有核心依赖验证通过');
"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 依赖验证失败" -ForegroundColor Red
    Write-Host "请检查网络连接或手动安装依赖包" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
    exit 1
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  ✅ 最小化安装完成！" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "现在可以启动Web版本：" -ForegroundColor Green
Write-Host ""
Write-Host "  start-web.ps1    - 启动Web界面" -ForegroundColor Yellow
Write-Host "  或" -ForegroundColor Green
Write-Host "  npm run web      - 命令行启动" -ForegroundColor Yellow
Write-Host ""
Write-Host "访问地址：http://localhost:3000" -ForegroundColor Cyan
Write-Host "默认登录：admin / Admin123!" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Web版本说明：" -ForegroundColor Yellow
Write-Host "  - 串口功能为模拟实现" -ForegroundColor Yellow
Write-Host "  - 数据保存在内存中" -ForegroundColor Yellow
Write-Host "  - 适合界面测试和演示" -ForegroundColor Yellow
Write-Host ""
Write-Host "如需完整功能（真实串口通信）：" -ForegroundColor Yellow
Write-Host "  1. 修复网络连接问题" -ForegroundColor Yellow
Write-Host "  2. 安装Electron和所有依赖" -ForegroundColor Yellow
Write-Host "  3. 使用 npm start 启动桌面版" -ForegroundColor Yellow
Write-Host ""

Read-Host "按Enter键退出"
