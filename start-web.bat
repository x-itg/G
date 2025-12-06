@echo off
chcp 65001 >nul
echo =============================================
echo   辐射检测器软件 - Web版本启动器
echo   CFR 21 Part 11 合规
echo =============================================
echo.

echo 检查依赖包...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到Node.js
    echo 请先安装Node.js 16或更高版本
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到npm
    pause
    exit /b 1
)

echo ✅ Node.js环境检测通过
echo Node.js版本：
node --version
echo npm版本：
npm --version
echo.

echo 检查核心依赖包...
node -e "try { require('express'); require('better-sqlite3'); require('bcryptjs'); console.log('✅ 核心依赖包已安装'); } catch(e) { console.log('❌ 缺少依赖包'); process.exit(1); }"

if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo   自动安装核心依赖包...
    echo ============================================
    
    echo 安装基础依赖...
    npm install express better-sqlite3 bcryptjs uuid moment lodash dotenv --no-optional
    
    if %errorlevel% neq 0 (
        echo ❌ 依赖包安装失败
        echo 请运行：install-fix.bat
        pause
        exit /b 1
    )
    
    echo ✅ 依赖包安装完成
)

echo.
echo ============================================
echo   启动辐射检测器软件...
echo ============================================

echo.
echo 🌐 启动Web服务器 (端口 3000)...
echo 📊 模拟串口通信功能
echo 🔐 CFR 21 Part 11 合规认证
echo 📝 实时审计日志
echo.
echo 访问地址：http://localhost:3000
echo.
echo 默认登录信息：
echo   用户名：admin
echo   密码：Admin123!
echo   角色：管理员
echo.
echo ⚠️  注意：这是Web模拟版本
echo   - 串口功能为模拟实现
echo   - 数据保存在内存中（服务器关闭后丢失）
echo   - 仅用于界面测试和演示
echo.
echo 按 Ctrl+C 停止服务器
echo ============================================
echo.

node web-server.js