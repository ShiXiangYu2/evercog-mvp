#!/bin/bash

echo "========================================"
echo "测试 Agent - 自动化测试工具"
echo "========================================"
echo

cd "$(dirname "$0")"

echo "[1/3] 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "安装依赖中..."
    npm install
fi

echo "[2/3] 检查 Playwright..."
npx playwright install chromium 2>/dev/null

echo "[3/3] 运行测试..."
echo
echo "正在启动测试 Agent..."
echo "请确保项目服务已启动在 http://localhost:3000"
echo

npx tsx run-tests.ts

echo
echo "========================================"
echo "测试完成！"
echo "========================================"
echo
DATE=$(date +%Y-%m-%d)
echo "报告位置: reports/$DATE/test-report.md"
echo
