@echo off
chcp 65001 >nul
echo =============================================
echo   辐射检测器软件 - 最小化安装
echo   仅安装Web版本所需依赖
echo =============================================
echo.

echo 检查Node.js环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到Node.js
    echo 请先安装Node.js 16或更高版本
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js版本：
node --version
echo.

echo 清理缓存...
npm cache clean --force

echo.
echo ============================================
echo   安装Web版本核心依赖
echo ============================================

echo 安装基础依赖包...
npm install express@^4.18.2 better-sqlite3@^9.2.2 bcryptjs@^2.4.3 uuid@^9.0.1 moment@^2.29.4 lodash@^4.17.21 dotenv@^16.3.1 --no-optional --no-package-lock

if %errorlevel% neq 0 (
    echo.
    echo ❌ 依赖包安装失败
    echo.
    echo 尝试其他安装方法...
    
    echo.
    echo 1. 单独安装Express...
    npm install express@^4.18.2 --no-optional
    
    echo.
    echo 2. 安装better-sqlite3...
    npm install better-sqlite3@^9.2.2 --no-optional
    
    echo.
    echo 3. 安装其他依赖...
    npm install bcryptjs uuid moment lodash dotenv --no-optional
)

echo.
echo ============================================
echo   验证安装结果
echo ============================================

echo 测试核心模块...
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

if %errorlevel% neq 0 (
    echo.
    echo ❌ 依赖验证失败
    echo 请检查网络连接或手动安装依赖包
    pause
    exit /b 1
)

echo.
echo ============================================
echo   ✅ 最小化安装完成！
echo ============================================
echo.
echo 现在可以启动Web版本：
echo.
echo   start-web.bat    - 启动Web界面
echo   或
echo   npm run web      - 命令行启动
echo.
echo 访问地址：http://localhost:3000
echo 默认登录：admin / Admin123!
echo.
echo ⚠️  Web版本说明：
echo   - 串口功能为模拟实现
echo   - 数据保存在内存中
echo   - 适合界面测试和演示
echo.
echo 如需完整功能（真实串口通信）：
echo   1. 修复网络连接问题
echo   2. 安装Electron和所有依赖
echo   3. 使用 npm start 启动桌面版
echo.
pause