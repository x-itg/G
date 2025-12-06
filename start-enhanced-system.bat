@echo off
chcp 65001
title 放射化学纯度检测仪增强系统启动器

echo.
echo ================================================================
echo             放射化学纯度检测仪增强系统
echo ================================================================
echo.
echo 启动模式: 增强版本 (CFR 21 Part 11 兼容)
echo 版本: v1.1.0
echo.
echo 功能特性:
echo   ✓ 三级权限电子签名系统
echo   ✓ 审计追踪完整记录
echo   ✓ 实时性能监控
echo   ✓ 日志系统完善
echo   ✓ 缓存机制优化
echo   ✓ Better-SQLite3 数据库
echo.
echo ================================================================
echo.

echo 🔍 检查必要文件...
if not exist "api-server.js" (
    echo ❌ api-server.js 不存在
    pause
    exit /b 1
)

if not exist "database\initEnhancedDatabase.js" (
    echo ❌ 数据库初始化脚本不存在
    pause
    exit /b 1
)

echo ✅ 文件检查完成

echo.
echo 🗄️ 正在初始化增强数据库架构...
echo 请稍候，这可能需要几分钟时间...

node database\initEnhancedDatabase.js

if errorlevel 1 (
    echo.
    echo ❌ 数据库初始化失败
    echo 请检查错误信息并重试
    pause
    exit /b 1
)

echo.
echo ✅ 数据库初始化完成

echo.
echo 🚀 正在启动API服务器...
echo.
echo 端口配置:
echo   - API服务器: 端口 3000
echo   - 验证网页: 端口 3001 (npm run web)
echo.
echo 访问地址:
echo   - API健康检查: http://localhost:3000/api/health
echo   - 系统状态: http://localhost:3000/api/status
echo   - 增强状态: http://localhost:3000/api/enhanced/status
echo   - 验证网页: http://localhost:3001
echo.
echo 按 Ctrl+C 停止服务器
echo ================================================================
echo.

node api-server.js

echo.
echo 服务器已停止
pause