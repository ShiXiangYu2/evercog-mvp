@echo off
echo ========================================
echo 测试 Agent - 自动化测试工具
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 检查依赖...
if not exist "node_modules" (
    echo 安装依赖中...
    npm install
)

echo [2/3] 检查 Playwright...
npx playwright install chromium 2>nul

echo [3/3] 运行测试...
echo.
echo 正在启动测试 Agent...
echo 请确保项目服务已启动在 http://localhost:3000
echo.

npx tsx run-tests.ts

echo.
echo ========================================
echo 测试完成！
echo ========================================
echo.
echo 报告位置: reports\%date:~0,4%-%date:~5,2%-%date:~8,2%\test-report.md
echo.
pause
