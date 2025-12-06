#!/bin/bash

echo "============================================="
echo "  放射检测仪 CFR 21 Part 11 合规系统"
echo "  版本 1.0.0"
echo "============================================="
echo

# 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js"
    echo "请先安装 Node.js 16 或更高版本"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

echo "Node.js 版本: $(node --version)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到 npm"
    exit 1
fi

echo "npm 版本: $(npm --version)"

# 检查项目依赖
if [ ! -d "node_modules" ]; then
    echo "正在安装项目依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "错误: 依赖安装失败"
        exit 1
    fi
fi

# 检查配置文件
if [ ! -f ".env" ]; then
    echo "创建环境配置文件..."
    cp .env.example .env
    echo "注意: 请编辑 .env 文件配置必要参数"
fi

echo
echo "启动应用程序..."
echo "提示:"
echo "  - 默认管理员账户: admin"
echo "  - 默认密码: Admin123!"
echo "  - 首次登录需要修改密码"
echo

npm start