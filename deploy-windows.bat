@echo off
echo 正在部署思导聊项目...

REM 检查Docker是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: Docker未安装，请先安装Docker Desktop
    pause
    exit /b 1
)

REM 停止旧容器
echo 停止旧容器...
docker-compose down

REM 构建并启动新容器
echo 构建并启动应用...
docker-compose up -d --build

REM 等待服务启动
echo 等待服务启动...
timeout /t 30 /nobreak

REM 检查容器状态
docker-compose ps

REM 查看日志
echo 查看应用日志...
docker-compose logs -f

echo 部署完成！应用已启动在 http://localhost:3000
pause