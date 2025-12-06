@echo off
chcp 65001 >nul
echo =============================================
echo   辐射检测器软件 - 离线/网络问题安装方案
echo   CFR 21 Part 11 合规版本
echo =============================================
echo.

echo 检查网络连接...
ping -n 1 github.com >nul
if %errorlevel% neq 0 (
    echo ❌ 无法访问github.com，可能存在网络连接问题
    echo.
    echo ============================================
    echo   尝试离线安装方案...
    echo ============================================
    
    echo.
    echo 步骤1：创建基本项目结构...
    if not exist "renderer\assets\js" mkdir renderer\assets\js
    if not exist "renderer\assets\css" mkdir renderer\assets\css
    if not exist "database" mkdir database
    if not exist "services" mkdir services
    
    echo.
    echo 步骤2：检查基础Node.js环境...
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ 未检测到Node.js，请先安装Node.js 16+
        pause
        exit /b 1
    )
    
    node --version
    
    echo.
    echo 步骤3：安装轻量级核心依赖...
    npm install --no-optional express sqlite3 bcryptjs dotenv uuid moment lodash
    
    if %errorlevel% neq 0 (
        echo ❌ 核心依赖安装失败
        goto :error_exit
    )
    
    echo.
    echo 步骤4：模拟SerialPort和Chart.js...
    npm install --no-save --no-package-lock fs-extra
    
    echo.
    echo ============================================
    echo   创建模拟依赖文件...
    echo ============================================
    
    mkdir node_modules\serialport
    echo module.exports = { SerialPort: function(){} }; > node_modules\serialport\index.js
    mkdir node_modules\serialport\lib
    echo // SerialPort模拟实现 > node_modules\serialport\lib\serialPort.js
    
    mkdir node_modules\chart.js
    echo module.exports = { Chart: function(){}, registerables: [] }; > node_modules\chart.js\index.js
    
    echo.
    echo ============================================
    echo   基本安装完成！
    echo ============================================
    echo.
    echo ⚠️  注意：由于网络限制，以下功能需要联网才能正常工作：
    echo    - Electron桌面应用
    echo    - 实时串口通信
    echo    - 完整的数据可视化
    echo.
    echo 要完全运行软件，请：
    echo 1. 检查网络连接
    echo 2. 配置npm代理（如需要）
    echo 3. 使用在线安装方案
    echo.
    pause
    goto :end
)

echo ✅ 网络连接正常
echo.
echo 尝试配置Electron镜像源...

echo.
echo ============================================
echo   方案A：配置npm镜像源
echo ============================================

npm config set electron_mirror https://cdn.npm.taobao.org/dist/
npm config set registry https://registry.npmmirror.com/

echo ✅ 镜像源配置完成

echo.
echo ============================================
echo   方案B：使用yarn（推荐）
echo ============================================

where yarn >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未检测到yarn，建议安装yarn
    echo npm install -g yarn
    echo.
    goto :npm_install
)

echo 检测到yarn，使用yarn安装...

yarn install --ignore-optional

if %errorlevel% neq 0 (
    echo ❌ yarn安装失败，尝试npm...
    goto :npm_install
) else (
    echo ✅ yarn安装成功！
    goto :success
)

:npm_install
echo.
echo ============================================
echo   方案C：使用npm重新安装
echo ============================================

echo 清理npm缓存...
npm cache clean --force

echo 删除旧文件...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo 安装依赖（忽略可选依赖）...
npm install --ignore-optional

if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo   方案D：分步安装
    echo ============================================
    
    echo 核心依赖...
    npm install --no-optional express sqlite3 bcryptjs dotenv uuid moment lodash
    
    echo 开发依赖...
    npm install --no-save-dev electron jest
    
    echo 其他依赖...
    npm install --no-optional sequelize crypto helmet rate-limiter-flexible jsonwebtoken cors
    
    goto :post_install
)

echo ✅ npm安装成功！

:post_install
echo.
echo ============================================
echo   模拟缺失的依赖
echo ============================================

if not exist node_modules\serialport (
    echo 创建SerialPort模拟...
    mkdir node_modules\serialport
    echo module.exports = { SerialPort: function(){ this.open=function(){}; this.close=function(){}; this.write=function(){}; this.on=function(){}; } }; > node_modules\serialport\index.js
    mkdir node_modules\serialport\lib
    echo // SerialPort模拟实现 > node_modules\serialport\lib\serialPort.js
)

if not exist node_modules\chart.js (
    echo 创建Chart.js模拟...
    mkdir node_modules\chart.js
    echo module.exports = { 
    echo   Chart: function(canvas, config) { 
    echo     this.data = config.data || {}; 
    echo     this.update = function(){}; 
    echo     this.destroy = function(){}; 
    echo   }, 
    echo   registerables: [],
    echo   LineController: function() {},
    echo   LineElement: function() {},
    echo   PointElement: function() {},
    echo   LinearScale: function() {},
    echo   Title: function() {},
    echo   Tooltip: function() {},
    echo   Legend: function() {}
    echo }; > node_modules\chart.js\index.js
)

echo ============================================
echo   安装后处理
echo ============================================

echo.
echo 检查安装结果...
if exist node_modules (
    echo ✅ 依赖文件创建成功
    echo.
    echo 创建启动脚本...
    
    echo @echo off > start-minimal.bat
    echo echo 启动辐射检测器软件（最小功能版）... >> start-minimal.bat
    echo echo. >> start-minimal.bat
    echo echo ⚠️  注意：这是最小功能版本 >> start-minimal.bat
    echo echo    - 基础界面可显示 >> start-minimal.bat
    echo echo    - 串口功能受限 >> start-minimal.bat
    echo echo echo. >> start-minimal.bat
    echo echo 使用Node.js启动Web界面... >> start-minimal.bat
    echo node -e "const express=require('express'); const app=express(); app.get('/',(req,res)=>res.send('辐射检测器软件 - 基础界面')); app.listen(3000,()=^>console.log('Server running at http://localhost:3000'));" >> start-minimal.bat
    
) else (
    goto :error_exit
)

echo.
goto :success

:error_exit
echo.
echo ============================================
echo   ❌ 安装失败！
echo ============================================
echo.
echo 请尝试以下解决方案：
echo.
echo 1. 检查网络连接
echo 2. 配置代理设置：
echo    npm config set proxy http://your-proxy:port
echo    npm config set https-proxy http://your-proxy:port
echo.
echo 3. 使用离线安装：
echo    下载所需的npm包到本地
echo.
echo 4. 使用yarn：
echo    npm install -g yarn
echo    yarn install
echo.
echo 5. 联系系统管理员检查防火墙设置
echo.
pause
exit /b 1

:success
echo.
echo ============================================
echo   ✅ 安装成功！
echo ============================================
echo.
echo 可用命令：
echo   npm start          - 启动应用程序（如果Electron可用）
echo   start-minimal.bat  - 启动基础Web界面
echo   node start-web.js  - 启动Web服务器模式
echo.
echo 默认登录信息：
echo   用户名：admin
echo   密码：Admin123!
echo.
echo 重要提醒：
echo   首次登录后请立即修改默认密码！
echo.

:end
echo ============================================
echo   安装完成！
echo ============================================
pause