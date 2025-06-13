@echo off
echo ========================================
echo 商品比价助手 - 后端API服务启动
echo ========================================
echo.

cd /d "%~dp0"

echo 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo 检查依赖包...
if not exist "node_modules" (
    echo 正在安装依赖包...
    npm install
    if errorlevel 1 (
        echo 错误: 依赖包安装失败
        pause
        exit /b 1
    )
)

echo 创建必要目录...
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "cache" mkdir cache

echo 启动后端服务...
echo 服务地址: http://localhost:3000
echo 健康检查: http://localhost:3000/api/health
echo 按 Ctrl+C 停止服务
echo.

node src/app.js

pause
