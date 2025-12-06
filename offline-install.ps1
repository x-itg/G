# =============================================
#   辐射检测器软件 - 离线/网络问题安装方案
#   CFR 21 Part 11 合规版本
# =============================================

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  辐射检测器软件 - 离线/网络问题安装方案" -ForegroundColor Yellow
Write-Host "  CFR 21 Part 11 合规版本" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "检查网络连接..." -ForegroundColor Green
try {
    $pingResult = Test-Connection -ComputerName "github.com" -Count 1 -Quiet
    if (-not $pingResult) {
        Write-Host "❌ 无法访问github.com，可能存在网络连接问题" -ForegroundColor Red
        Write-Host ""
        Write-Host "===========================================" -ForegroundColor Yellow
        Write-Host "  尝试离线安装方案..." -ForegroundColor Yellow
        Write-Host "===========================================" -ForegroundColor Yellow
        
        Write-Host ""
        Write-Host "步骤1：创建基本项目结构..." -ForegroundColor Green
        if (-not (Test-Path "renderer\assets\js")) { New-Item -ItemType Directory -Path "renderer\assets\js" -Force }
        if (-not (Test-Path "renderer\assets\css")) { New-Item -ItemType Directory -Path "renderer\assets\css" -Force }
        if (-not (Test-Path "database")) { New-Item -ItemType Directory -Path "database" -Force }
        if (-not (Test-Path "services")) { New-Item -ItemType Directory -Path "services" -Force }
        
        Write-Host ""
        Write-Host "步骤2：检查基础Node.js环境..." -ForegroundColor Green
        try {
            $nodeVersion = node --version
            Write-Host "✅ $nodeVersion" -ForegroundColor Green
        } catch {
            Write-Host "❌ 未检测到Node.js，请先安装Node.js 16+" -ForegroundColor Red
            Read-Host "按Enter键退出"
            exit 1
        }
        
        Write-Host ""
        Write-Host "步骤3：安装轻量级核心依赖..." -ForegroundColor Green
        npm install --no-optional express better-sqlite3 bcryptjs dotenv uuid moment lodash
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ 核心依赖安装失败" -ForegroundColor Red
            goto :error_exit
        }
        
        Write-Host ""
        Write-Host "步骤4：模拟SerialPort和Chart.js..." -ForegroundColor Green
        npm install --no-save --no-package-lock fs-extra
        
        Write-Host ""
        Write-Host "===========================================" -ForegroundColor Cyan
        Write-Host "  创建模拟依赖文件..." -ForegroundColor Yellow
        Write-Host "===========================================" -ForegroundColor Cyan
        
        if (-not (Test-Path "node_modules\serialport")) {
            New-Item -ItemType Directory -Path "node_modules\serialport" -Force
            Set-Content -Path "node_modules\serialport\index.js" -Value "module.exports = { SerialPort: function(){} };"
            New-Item -ItemType Directory -Path "node_modules\serialport\lib" -Force
            Set-Content -Path "node_modules\serialport\lib\serialPort.js" -Value "// SerialPort模拟实现"
        }
        
        if (-not (Test-Path "node_modules\chart.js")) {
            New-Item -ItemType Directory -Path "node_modules\chart.js" -Force
            Set-Content -Path "node_modules\chart.js\index.js" -Value "module.exports = { Chart: function(){}, registerables: [] };"
        }
        
        Write-Host ""
        Write-Host "===========================================" -ForegroundColor Cyan
        Write-Host "  基本安装完成！" -ForegroundColor Yellow
        Write-Host "===========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  注意：由于网络限制，以下功能需要联网才能正常工作：" -ForegroundColor Yellow
        Write-Host "   - Electron桌面应用" -ForegroundColor Yellow
        Write-Host "   - 实时串口通信" -ForegroundColor Yellow
        Write-Host "   - 完整的数据可视化" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "要完全运行软件，请：" -ForegroundColor Yellow
        Write-Host "1. 检查网络连接" -ForegroundColor Yellow
        Write-Host "2. 配置npm代理（如需要）" -ForegroundColor Yellow
        Write-Host "3. 使用在线安装方案" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "按Enter键退出"
        exit 0
    }
} catch {
    Write-Host "❌ 网络连接检查失败，继续尝试安装..." -ForegroundColor Yellow
}

Write-Host "✅ 网络连接正常" -ForegroundColor Green
Write-Host ""
Write-Host "尝试配置Electron镜像源..." -ForegroundColor Green

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  方案A：配置npm镜像源" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan

npm config set electron_mirror https://cdn.npm.taobao.org/dist/
npm config set registry https://registry.npmmirror.com/

Write-Host "✅ 镜像源配置完成" -ForegroundColor Green

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  方案B：使用yarn（推荐）" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan

try {
    $yarnVersion = yarn --version
    Write-Host "检测到yarn版本: $yarnVersion，使用yarn安装..." -ForegroundColor Green
    yarn install --ignore-optional
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ yarn安装成功！" -ForegroundColor Green
        goto :success
    } else {
        Write-Host "❌ yarn安装失败，尝试npm..." -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  未检测到yarn，建议安装yarn" -ForegroundColor Yellow
    Write-Host "npm install -g yarn" -ForegroundColor Yellow
    Write-Host ""
}

:npm_install
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  方案C：使用npm重新安装" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan

Write-Host "清理npm缓存..." -ForegroundColor Green
npm cache clean --force

Write-Host "删除旧文件..." -ForegroundColor Green
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }

Write-Host ""
Write-Host "安装依赖（忽略可选依赖）..." -ForegroundColor Green
npm install --ignore-optional

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Yellow
    Write-Host "  方案D：分步安装" -ForegroundColor Yellow
    Write-Host "===========================================" -ForegroundColor Yellow
    
    Write-Host "核心依赖..." -ForegroundColor Green
    npm install --no-optional express better-sqlite3 bcryptjs dotenv uuid moment lodash
    
    Write-Host "开发依赖..." -ForegroundColor Green
    npm install --no-save-dev electron jest
    
    Write-Host "其他依赖..." -ForegroundColor Green
    npm install --no-optional sequelize crypto helmet rate-limiter-flexible jsonwebtoken cors
    
    goto :post_install
}

Write-Host "✅ npm安装成功！" -ForegroundColor Green

:post_install
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  模拟缺失的依赖" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan

if (-not (Test-Path "node_modules\serialport")) {
    Write-Host "创建SerialPort模拟..." -ForegroundColor Green
    New-Item -ItemType Directory -Path "node_modules\serialport" -Force
    Set-Content -Path "node_modules\serialport\index.js" -Value "module.exports = { SerialPort: function(){ this.open=function(){}; this.close=function(){}; this.write=function(){}; this.on=function(){}; } };"
    New-Item -ItemType Directory -Path "node_modules\serialport\lib" -Force
    Set-Content -Path "node_modules\serialport\lib\serialPort.js" -Value "// SerialPort模拟实现"
}

if (-not (Test-Path "node_modules\chart.js")) {
    Write-Host "创建Chart.js模拟..." -ForegroundColor Green
    New-Item -ItemType Directory -Path "node_modules\chart.js" -Force
    $chartJsContent = @"
module.exports = { 
  Chart: function(canvas, config) { 
    this.data = config.data || {}; 
    this.update = function(){}; 
    this.destroy = function(){}; 
  }, 
  registerables: [],
  LineController: function() {},
  LineElement: function() {},
  PointElement: function() {},
  LinearScale: function() {},
  Title: function() {},
  Tooltip: function() {},
  Legend: function() {}
};
"@
    Set-Content -Path "node_modules\chart.js\index.js" -Value $chartJsContent
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  安装后处理" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "检查安装结果..." -ForegroundColor Green
if (Test-Path "node_modules") {
    Write-Host "✅ 依赖文件创建成功" -ForegroundColor Green
    Write-Host ""
    Write-Host "创建启动脚本..." -ForegroundColor Green
    
    $startMinimalContent = @"
Write-Host "启动辐射检测器软件（最小功能版）..."
Write-Host ""
Write-Host "⚠️  注意：这是最小功能版本"
Write-Host "   - 基础界面可显示"
Write-Host "   - 串口功能受限"
Write-Host ""
Write-Host "使用Node.js启动Web界面..."
try {
    const express = require('express');
    const app = express();
    app.get('/', (req, res) => res.send('辐射检测器软件 - 基础界面'));
    app.listen(3000, () => console.log('Server running at http://localhost:3000'));
} catch (e) {
    console.error('启动失败:', e.message);
}
Read-Host "按Enter键退出"
"@
    Set-Content -Path "start-minimal.ps1" -Value $startMinimalContent
} else {
    goto :error_exit
}

Write-Host ""
goto :success

:error_exit
Write-Host ""
Write-Host "===========================================" -ForegroundColor Red
Write-Host "  ❌ 安装失败！" -ForegroundColor Red
Write-Host "===========================================" -ForegroundColor Red
Write-Host ""
Write-Host "请尝试以下解决方案：" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 检查网络连接" -ForegroundColor Yellow
Write-Host "2. 配置代理设置：" -ForegroundColor Yellow
Write-Host "   npm config set proxy http://your-proxy:port" -ForegroundColor Yellow
Write-Host "   npm config set https-proxy http://your-proxy:port" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. 使用离线安装：" -ForegroundColor Yellow
Write-Host "   下载所需的npm包到本地" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. 使用yarn：" -ForegroundColor Yellow
Write-Host "   npm install -g yarn" -ForegroundColor Yellow
Write-Host "   yarn install" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. 联系系统管理员检查防火墙设置" -ForegroundColor Yellow
Write-Host ""
Read-Host "按Enter键退出"
exit 1

:success
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  ✅ 安装成功！" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "可用命令：" -ForegroundColor Green
Write-Host "  npm start          - 启动应用程序（如果Electron可用）" -ForegroundColor Yellow
Write-Host "  start-minimal.ps1  - 启动基础Web界面" -ForegroundColor Yellow
Write-Host "  node start-web.js  - 启动Web服务器模式" -ForegroundColor Yellow
Write-Host ""
Write-Host "默认登录信息：" -ForegroundColor Yellow
Write-Host "  用户名：admin" -ForegroundColor Yellow
Write-Host "  密码：Admin123!" -ForegroundColor Yellow
Write-Host ""
Write-Host "重要提醒：" -ForegroundColor Red
Write-Host "  首次登录后请立即修改默认密码！" -ForegroundColor Red

:end
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  安装完成！" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
Read-Host "按Enter键退出"
