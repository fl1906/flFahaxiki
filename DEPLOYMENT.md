# 🚀 思导聊部署指南

本文档提供了思导聊项目的完整部署指南。

## 📋 部署前检查清单

- [ ] Node.js 18+ 已安装
- [ ] Docker 和 Docker Compose（可选）
- [ ] 数据库访问权限（SQLite 或 PostgreSQL）
- [ ] 域名和SSL证书（生产环境）

## 🔧 环境配置

### 1. 克隆项目

```bash
git clone <repository-url>
cd sidao-chat
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**重要配置项：**
- `DATABASE_URL`: 数据库连接字符串
- `JWT_SECRET`: JWT签名密钥（生产环境必须使用强密码）
- `NODE_ENV`: 环境模式（development/production）

### 4. 初始化数据库

```bash
# 生成Prisma客户端
npm run db:generate

# 推送数据库schema
npm run db:push

# 可选：运行种子数据
npm run db:seed
```

## 🐳 Docker部署（推荐）

### 1. 构建镜像

```bash
npm run docker:build
```

### 2. 使用Docker Compose

```bash
npm run docker:compose
```

### 3. 验证部署

访问 http://localhost:3000 检查应用是否正常运行。

## 📦 传统部署

### 1. 构建应用

```bash
npm run build
```

### 2. 启动应用

```bash
npm run start
```

### 3. 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "sidao-chat" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs sidao-chat
```

## 🗄️ 数据库配置

### SQLite（默认）

```env
DATABASE_URL="file:./dev.db"
```

### PostgreSQL（推荐生产环境）

```env
DATABASE_URL="postgresql://username:password@localhost:5432/sidao_chat"
```

**PostgreSQL设置：**

```bash
# 创建数据库
createdb sidao_chat

# 创建用户
createuser --interactive

# 授权
GRANT ALL PRIVILEGES ON DATABASE sidao_chat TO your_user;
```

## 🔒 安全配置

### 1. 生产环境密钥

```bash
# 生成强密码
openssl rand -base64 32

# 设置JWT密钥
JWT_SECRET="your-generated-secret-key"
```

### 2. HTTPS配置

使用Nginx或Caddy作为反向代理：

**Nginx配置示例：**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 监控和日志

### 1. 健康检查

```bash
curl http://localhost:3000/api/health
```

### 2. 日志管理

```bash
# 查看应用日志
tail -f server.log

# 使用logrotate管理日志
sudo nano /etc/logrotate.d/sidao-chat
```

### 3. 性能监控

推荐使用以下工具：
- **PM2**: 进程管理
- **Grafana + Prometheus**: 指标监控
- **ELK Stack**: 日志聚合

## 🔄 更新部署

### 1. 备份数据

```bash
# 备份数据库
pg_dump sidao_chat > backup_$(date +%Y%m%d).sql

# 或备份SQLite文件
cp dev.db backup_$(date +%Y%m%d).db
```

### 2. 更新代码

```bash
git pull origin main
npm install
npm run build
```

### 3. 重启服务

```bash
# Docker
docker-compose down
docker-compose up -d

# PM2
pm2 restart sidao-chat
```

## 🚨 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `DATABASE_URL` 配置
   - 确认数据库服务运行状态
   - 验证用户权限

2. **构建失败**
   - 检查Node.js版本（需要18+）
   - 清理缓存：`rm -rf .next`
   - 重新安装依赖：`npm ci`

3. **内存不足**
   - 增加Node.js内存限制：`NODE_OPTIONS="--max-old-space-size=4096"`
   - 优化数据库查询
   - 使用Redis缓存

4. **端口冲突**
   - 修改端口：`PORT=3001 npm start`
   - 检查端口占用：`lsof -i :3000`

### 日志分析

```bash
# 查看错误日志
grep -i error server.log

# 查看访问模式
awk '{print $1}' access.log | sort | uniq -c | sort -nr
```

## 📱 环境变量参考

| 变量名 | 描述 | 默认值 | 必需 |
|---------|------|--------|------|
| `NODE_ENV` | 运行环境 | `development` | ✅ |
| `DATABASE_URL` | 数据库连接 | - | ✅ |
| `JWT_SECRET` | JWT密钥 | - | ✅ |
| `PORT` | 服务端口 | `3000` | ❌ |

## 🎯 性能优化

### 1. 应用层面
- 启用Gzip压缩
- 使用CDN加速静态资源
- 实现数据库连接池
- 添加Redis缓存

### 2. 数据库层面
- 创建适当索引
- 定期清理日志
- 优化查询语句
- 使用读写分离

### 3. 网络层面
- 启用HTTP/2
- 配置缓存头
- 使用负载均衡
- 压缩静态资源

## 📞 支持

如果遇到部署问题，请：

1. 查看本文档的故障排除部分
2. 检查GitHub Issues
3. 提交新的Issue并提供详细信息

---

**部署成功后，访问 https://your-domain.com 开始使用思导聊！** 🎉