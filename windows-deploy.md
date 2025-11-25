
⏺ 🚀 最快的Windows服务器部署方案

方法一：Docker部署 (推荐) ⭐

📋 部署准备

1. 在Windows服务器上安装Docker Desktop
   - 下载：https://www.docker.com/products/docker-desktop
   - 安装后重启服务器
2. 准备项目代码
# 将项目代码复制到服务器，使用以下任一方法：
git clone https://github.com/your-repo/sidao-chat.git
# 或者直接ZIP压缩上传并解压

⚡ 一键部署

选项A：PowerShell脚本 (推荐)
# 在项目目录下运行
.\deploy-quick.ps1

选项B：批处理脚本
# 在项目目录下运行
deploy-windows.bat

选项C：手动命令
# 1. 配置环境变量
copy production.env.example .env
# 编辑 .env 文件设置生产配置

# 2. 创建数据目录
mkdir data

# 3. 一键部署
docker-compose -f docker-compose.prod.yml up -d --build

🔧 配置环境变量

编辑 .env 文件：
NODE_ENV=production
DATABASE_URL="file:./data/production.db"
JWT_SECRET="your-super-secret-jwt-key-change-this"

🌐 访问应用

部署完成后访问：http://服务器IP:3000

  ---
方法二：IIS部署 (传统方案) 🏢

安装必要组件

1. 安装Node.js
# 使用Chocolatey安装
choco install nodejs

2. 安装IIS
# 启用IIS功能
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole

3. 安装URL Rewrite模块
- 下载：https://www.iis.net/downloads/microsoft/url-rewrite

部署步骤

# 1. 构建项目
npm install
npm run build

# 2. 安装PM2进程管理器
npm install -g pm2

# 3. 启动应用
pm2 start npm --name "sidao-chat" -- start

# 4. 配置IIS反向代理
# 在IIS中创建网站并配置URL Rewrite规则

  ---
方法三：直接Node.js部署 (简单快速) 🏃‍♂️

快速部署命令

# 1. 安装依赖
npm install --production

# 2. 构建项目
npm run build

# 3. 启动应用
npm start

# 4. 后台运行（使用PM2）
npm install -g pm2
pm2 start ecosystem.config.js

  ---
📁 创建的部署文件

我已为你创建了以下部署文件：

1. deploy-quick.ps1 - PowerShell自动部署脚本
2. deploy-windows.bat - 批处理部署脚本
3. production.env.example - 生产环境配置模板
4. docker-compose.prod.yml - 生产环境Docker配置

🔍 推荐的部署流程

最快部署步骤：

1. 准备服务器：安装Docker Desktop
2. 复制代码：将项目上传到服务器
3. 配置环境：复制并编辑 .env 文件
4. 运行部署：执行 .\deploy-quick.ps1
5. 访问应用：浏览器打开 http://服务器IP:3000

监控和维护：

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

更新部署：

# 拉取最新代码
git pull

# 重新构建部署
docker-compose up -d --build

选择Docker部署是最稳定和快速的方式，只需要一个命令就能完成整个部署过程！
