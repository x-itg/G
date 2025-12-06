@echo off
echo =============================================
echo   辐射检测器软件安装修复脚本
echo   CFR 21 Part 11 合规版本
echo =============================================
echo.

echo 检查Node.js版本...
node --version
if %errorlevel% neq 0 (
    echo 错误：未检测到Node.js，请先安装Node.js 16或更高版本
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo 清理npm缓存...
npm cache clean --force

echo.
echo 删除node_modules和package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo 安装依赖包...
npm install

if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo 安装失败！尝试替代方案...
    echo ============================================
    
    echo.
    echo 使用npm ci清理安装...
    npm ci
    
    if %errorlevel% neq 0 (
        echo.
        echo ============================================
        echo 手动安装核心依赖...
        echo ============================================
        
        npm install express sqlite3 bcryptjs serialport chart.js electron-store uuid moment lodash dotenv
        npm install --save-dev electron jest
        
        echo.
        echo 手动安装其他可选依赖...
        npm install sequelize crypto helmet rate-limiter-flexible jsonwebtoken cors electron-builder
    )
)

echo.
echo ============================================
echo 检查安装结果...
echo ============================================

if exist node_modules (
    echo ✅ 依赖安装成功！
    echo.
    echo 启动应用程序：
    echo npm start
    echo 或使用：
    echo start.bat
) else (
    echo ❌ 依赖安装失败
    echo 请检查错误信息并手动安装
)

echo.
echo ============================================
echo 安装完成！
echo ============================================
pause