#!/bin/bash

# IT工具安装脚本

echo "正在安装IT工具依赖..."

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查版本
NODE_VERSION=$(node --version | cut -d'v' -f2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$NODE_MAJOR_VERSION" -lt 14 ]; then
    echo "错误: Node.js 版本过低，需要 14.x 或更高版本"
    exit 1
fi

echo "检测到 Node.js 版本: $NODE_VERSION"

# 安装依赖
npm install --registry=http://registry.npmmirror.com

# 检查是否成功
if [ $? -eq 0 ]; then
    echo "✅ 依赖安装成功！"
else
    echo "❌ 安装失败，请检查错误信息"
    exit 1
fi

# 检查是否存在 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  未检测到 .env 配置文件"
    echo "正在复制示例配置文件..."
    cp .env.example .env
    echo "请编辑 .env 文件并填入您的阿里云配置信息"
fi

echo "🎉 安装完成！"
echo ""
echo "运行方式:"
echo "  npm start     # 启动服务"
echo "  npm run dev   # 开发模式启动（使用nodemon）"
echo ""
echo "如需配置，请编辑 .env 文件"