@echo off
chcp 65001 >nul
echo =============================================
echo   辐射检测器软件 - 智能启动器
echo   CFR 21 Part 11 合规
echo =============================================
echo.

echo 检查环境...

echo Node.js版本：
node --version 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到Node.js
    echo 请先安装Node.js 16或更高版本
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo 检查依赖包...

REM 检查关键依赖
node -e "try { require('express'); require('better-sqlite3'); require('bcryptjs'); console.log('✅ 核心依赖包已安装'); } catch(e) { console.log('⚠️  缺少部分依赖包'); process.exit(1); }" 2>nul

if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo   检测到依赖问题，尝试自动修复...
    echo ============================================
    
    echo 运行最小化安装...
    call install-minimal.bat
    
    if %errorlevel% neq 0 (
        echo ❌ 自动修复失败
        echo 请手动运行：install-minimal.bat
        pause
        exit /b 1
    )
)

echo.
echo 检查Electron...

REM 检查Electron是否可用
if exist node_modules\electron (
    echo ✅ 检测到Electron
    echo.
    echo 尝试启动Electron桌面版...
    electron . 2>nul
    if %errorlevel% neq 0 (
        echo ❌ Electron启动失败
        echo.
        echo 可能原因：
        echo 1. Electron下载不完整
        echo 2. 网络连接问题
        echo 3. 权限问题
        echo.
        echo 尝试Web版本...
        goto :start_web
    ) else (
        echo ✅ Electron启动成功
        goto :end
    )
) else (
    echo ⚠️  未检测到Electron
    goto :start_web
)

:start_web
echo.
echo ============================================
echo   启动Web版本...
echo ============================================

echo 启动Web服务器 (端口 3000)...
echo.
echo 功能说明：
echo   ✅ CFR 21 Part 11 合规认证
echo   ✅ 模拟串口通信 (COM2/COM3)
echo   ✅ 实时数据可视化
echo   ✅ 审计日志记录
echo   ✅ 设备管理功能
echo   ✅ 电子签名支持
echo.
echo 访问地址：http://localhost:3000
echo.
echo 登录信息：
echo   用户名：admin
echo   密码：Admin123!
echo   角色：管理员
echo.
echo ⚠️  Web版本说明：
echo   - 串口功能为模拟实现
echo   - 数据保存在内存中
echo   - 适合演示和界面测试
echo   - 完整展示CFR 21 Part 11功能
echo.
echo 按 Ctrl+C 停止服务器
echo ============================================

node web-server.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ Web服务器启动失败
    echo.
    echo 可能的解决方案：
    echo 1. 检查端口3000是否被占用
    echo 2. 确认Node.js版本 >= 16
    echo 3. 运行 install-minimal.bat 重新安装依赖
    echo.
    echo 详细说明请查看：ELECTRON-FAQ.md
    echo.
    pause
    exit /b 1
)

:end
echo.
echo ============================================
echo   程序已退出
echo ============================================
echo.
echo 如需技术支持，请查看：
echo   - ELECTRON-FAQ.md    # 常见问题解答
echo   - README.md          # 详细使用说明
echo   - install-minimal.bat # 依赖安装脚本
echo.
pause