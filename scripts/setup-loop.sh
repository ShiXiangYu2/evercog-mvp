#!/bin/bash

# Evercog MVP Loop Engineering 快速启动脚本

set -e

echo "=== Evercog MVP Loop Engineering 快速启动 ==="
echo ""

# 检查当前目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在 evercog-mvp 项目根目录运行此脚本"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 20+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查 Python
if ! command -v python &> /dev/null; then
    echo "⚠️ Python 未安装，Loop Runtime 需要 Python 3.11+"
    echo "   请安装 Python 后重新运行此脚本"
fi

echo ""

# 安装依赖
echo "=== 安装依赖 ==="
if [ -d "node_modules" ]; then
    echo "✅ node_modules 已存在，跳过安装"
else
    echo "📦 安装 npm 依赖..."
    npm install
fi

echo ""

# 初始化数据库
echo "=== 初始化数据库 ==="
if [ -f "prisma/dev.db" ]; then
    echo "✅ 数据库已存在"
else
    echo "🗄️ 初始化数据库..."
    npm run db:push
fi

echo ""

# 填充演示数据
echo "=== 填充演示数据 ==="
echo "🌱 填充演示数据..."
npm run db:seed

echo ""

# 检查 Loop 配置
echo "=== 检查 Loop 配置 ==="
if [ -f ".loop-config.yaml" ]; then
    echo "✅ .loop-config.yaml 已存在"
else
    echo "❌ .loop-config.yaml 不存在"
    exit 1
fi

if [ -f "loop-memory.md" ]; then
    echo "✅ loop-memory.md 已存在"
else
    echo "❌ loop-memory.md 不存在"
    exit 1
fi

if [ -f "loop-state.json" ]; then
    echo "✅ loop-state.json 已存在"
else
    echo "❌ loop-state.json 不存在"
    exit 1
fi

echo ""

# 检查 GitHub Actions
echo "=== 检查 GitHub Actions ==="
if [ -f ".github/workflows/loop-trigger.yml" ]; then
    echo "✅ loop-trigger.yml 已存在"
else
    echo "❌ loop-trigger.yml 不存在"
    exit 1
fi

if [ -f ".github/workflows/loop-health-check.yml" ]; then
    echo "✅ loop-health-check.yml 已存在"
else
    echo "❌ loop-health-check.yml 不存在"
    exit 1
fi

echo ""

# 本地测试
echo "=== 本地测试 ==="
if command -v python &> /dev/null; then
    echo "🧪 运行 Loop Runtime dry-run 测试..."
    if [ -d ".agent/skills/loop-engineering/scripts" ]; then
        python .agent/skills/loop-engineering/scripts/run-loop.py \
            --config .loop-config.yaml \
            --state loop-state.json \
            --dry-run || echo "⚠️ dry-run 测试完成（可能有一些警告）"
    else
        echo "⚠️ Loop Runtime 脚本不存在，跳过 dry-run 测试"
    fi
else
    echo "⚠️ Python 未安装，跳过 dry-run 测试"
fi

echo ""

# 启动开发服务器
echo "=== 启动开发服务器 ==="
echo "🚀 启动开发服务器..."
echo ""
echo "开发服务器将在 http://localhost:3000 启动"
echo "按 Ctrl+C 停止服务器"
echo ""

npm run dev
