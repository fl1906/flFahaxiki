# PowerShell快速部署脚本
Write-Host "思导聊项目 - 快速部署脚本" -ForegroundColor Green

# 检查Docker
try {
    docker --version | Out-Null
    Write-Host "✅ Docker已安装" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker未安装，请先安装Docker Desktop" -ForegroundColor Red
    exit 1
}

# 检查项目文件
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ 找不到docker-compose.yml文件" -ForegroundColor Red
    exit 1
}

# 创建数据目录
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Name "data" | Out-Null
    Write-Host "✅ 创建数据目录" -ForegroundColor Green
}

# 停止旧容器
Write-Host "🛑 停止旧容器..." -ForegroundColor Yellow
docker-compose down

# 构建并启动
Write-Host "🔨 构建并启动应用..." -ForegroundColor Yellow
docker-compose up -d --build

# 等待启动
Write-Host "⏳ 等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 检查状态
Write-Host "📊 检查容器状态..." -ForegroundColor Green
docker-compose ps

# 获取访问地址
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*").IPAddress | Select-Object -First 1
if ($ip) {
    Write-Host "✅ 部署完成！访问地址: http://$($ip):3000" -ForegroundColor Green
} else {
    Write-Host "✅ 部署完成！访问地址: http://localhost:3000" -ForegroundColor Green
}

# 询问是否查看日志
$answer = Read-Host "是否查看应用日志? (y/n)"
if ($answer -eq 'y') {
    docker-compose logs -f
}