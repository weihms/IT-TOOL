#!/bin/bash

# IT工具启动脚本

echo "正在启动IT工具..."

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "警告: 未检测到 node_modules 目录"
    echo "正在安装依赖..."
    npm install --registry=http://registry.npmmirror.com
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

# 检查 .env 文件是否存在
if [ ! -f ".env" ]; then
    echo "错误: 未找到 .env 配置文件"
    echo "请先创建 .env 文件并配置相关信息"
    echo "可以复制 .env.example 文件进行配置: cp .env.example .env"
    exit 1
fi

echo "✅ 检测到配置文件，正在启动应用..."

# 启动应用
node index.js