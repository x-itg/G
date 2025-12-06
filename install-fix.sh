#!/bin/bash

echo "============================================="
echo "  辐射检测器软件安装修复脚本"
echo "  CFR 21 Part 11 合规版本"
echo "============================================="
echo

echo "检查Node.js版本..."
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到Node.js，请先安装Node.js 16或更高版本"
    echo "下载地址：https://nodejs.org/"
    exit 1
fi

node --version

echo
echo "清理npm缓存..."
npm cache clean --force

echo
echo "删除node_modules和package-lock.json..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
fi
if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
fi

echo
echo "安装依赖包..."
npm install

if [ $? -ne 0 ]; then
    echo
    echo "============================================"
    echo "安装失败！尝试替代方案..."
    echo "============================================"
    
    echo
    echo "使用npm ci清理安装..."
    npm ci
    
    if [ $? -ne 0 ]; then
        echo
        echo "============================================"
        echo "手动安装核心依赖..."
        echo "============================================"
        
        echo
        echo "安装核心运行时依赖..."
        npm install express sqlite3 bcryptjs serialport chart.js electron-store uuid moment lodash dotenv
        
        echo
        echo "安装开发依赖..."
        npm install --save-dev electron jest
        
        echo
        echo "安装其他可选依赖..."
        npm install sequelize crypto helmet rate-limiter-flexible jsonwebtoken cors electron-builder
    fi
fi

echo
echo "============================================"
echo "检查安装结果..."
echo "============================================"

if [ -d "node_modules" ]; then
    echo "✅ 依赖安装成功！"
    echo
    echo "启动应用程序："
    echo "npm start"
    echo "或使用："
    echo "./start.sh"
else
    echo "❌ 依赖安装失败"
    echo "请检查错误信息并手动安装"
fi

echo
echo "============================================"
echo "安装完成！"
echo "============================================"