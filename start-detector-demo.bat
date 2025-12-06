@echo off
echo ==============================================
echo    放射化学纯度检测仪演示系统启动
echo ==============================================
echo.

echo 正在启动演示服务器...
echo.

cd /d "%~dp0"

REM 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [信息] 检测到Node.js环境

REM 检查package.json是否存在
if not exist package.json (
    echo [警告] 未找到package.json，正在创建...
    echo {
    echo   "name": "radiation-detector-demo",
    echo   "version": "1.0.0",
    echo   "description": "放射化学纯度检测仪演示系统",
    echo   "main": "api-server.js",
    echo   "scripts": {
    echo     "start": "node api-server.js"
    echo   },
    echo   "dependencies": {
    echo     "express": "^4.18.2",
    echo     "cors": "^2.8.5",
    echo     "better-sqlite3": "^9.2.2"
    echo   }
    echo } > package.json
)

echo [信息] 正在安装依赖包...
npm install

if errorlevel 1 (
    echo [错误] 依赖包安装失败
    pause
    exit /b 1
)

echo.
echo [成功] 依赖包安装完成
echo.
echo ==============================================
echo  放射化学纯度检测仪演示系统
echo ==============================================
echo.
echo 系统功能:
echo   - 硅胶板色谱扫描分析
echo   - 碘化钠探头辐射检测
echo   - 放射化学纯度计算
echo   - Rf值分析
echo   - 实时数据可视化
echo   - 专业检测报告
echo.
echo 登录信息:
echo   用户名: admin
echo   密码: Admin123!
echo.
echo 快捷键:
echo   Ctrl+S - 开始扫描
echo   Ctrl+T - 停止扫描  
echo   Ctrl+H - 探头归零
echo   Ctrl+R - 重置数据
echo   Ctrl+A - 分析曲线
echo   Ctrl+L - 退出登录
echo.
echo ==============================================
echo.

REM 启动验证服务器 (无需登录)
node verification-server.js

pause
