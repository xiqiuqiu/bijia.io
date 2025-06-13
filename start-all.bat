@echo off
echo ============================================
echo 商品比价助手 - 完整启动和测试脚本
echo ============================================
echo.

cd /d "%~dp0"

echo [1/5] 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到Node.js
    echo 请先安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js环境正常

echo.
echo [2/5] 检查后端依赖...
cd backend
if not exist "node_modules" (
    echo 📦 正在安装后端依赖...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)
echo ✅ 后端依赖已就绪

echo.
echo [3/5] 创建必要目录...
if not exist "data" mkdir data
if not exist "logs" mkdir logs  
if not exist "cache" mkdir cache
echo ✅ 目录结构已创建

echo.
echo [4/5] 启动后端服务...
echo 🚀 正在启动API服务 (http://localhost:3000)
start /B node src/app.js

echo.
echo [5/5] 等待服务启动并进行测试...
timeout /t 3 /nobreak >nul

cd ..
echo 📋 运行API测试...
node test-api.js

echo.
echo ============================================
echo 🎯 下一步操作:
echo ============================================
echo 1. 打开Chrome浏览器
echo 2. 访问 chrome://extensions/
echo 3. 开启"开发者模式" 
echo 4. 点击"加载已解压的扩展程序"
echo 5. 选择 frontend 文件夹
echo 6. 点击扩展图标开始使用
echo.
echo 📊 服务信息:
echo - 健康检查: http://localhost:3000/api/health
echo - 搜索测试: http://localhost:3000/api/search?keyword=耳机
echo - 后端服务正在后台运行
echo.
echo 按任意键继续...
pause >nul
