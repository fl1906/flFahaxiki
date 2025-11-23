# 💬 思导聊 - AI对话与思维导图一体化生产力工具 

一款面向职场办公人士的Web端AI对话与思维导图一体化生产力工具。通过将AI对话与思维导图深度融合，帮助用户结构化记录、梳理和回溯对话内容，提升信息整理与知识管理效率。

## ✨ 核心功能

### 🤖 AI对话功能
- **多模型支持**: 支持GPT-4、Claude等多种AI模型
- **自定义API**: 允许用户配置自定义AI模型和API地址
- **对话历史**: 自动保存所有对话记录，支持搜索和筛选
- **实时交互**: 流畅的对话体验，支持快速回复

### 🧠 思维导图功能
- **自动生成**: AI对话内容自动转化为思维导图
- **可视化展示**: 直观的节点式展示，支持缩放和拖拽
- **手动编辑**: 支持节点的添加、删除、编辑和移动
- **关联对话**: 点击节点可快速跳转到对应的对话内容

### 🔗 对话与思维导图关联
- **节点跳转**: 点击思维导图节点直接定位到相关对话
- **对话回溯**: 基于节点回溯历史对话状态
- **分支延伸**: 从任意节点延伸出新的对话分支
- **双向同步**: 对话内容更新实时反映到思维导图

### 👤 用户管理
- **安全认证**: 用户注册、登录、密码找回
- **个人资料**: 管理个人信息和偏好设置
- **数据同步**: 支持本地存储和云端同步

## 🛠️ 技术栈

### 🎯 核心框架
- **⚡ Next.js 15** - React框架，使用App Router
- **📘 TypeScript 5** - 类型安全的JavaScript
- **🎨 Tailwind CSS 4** - 实用优先的CSS框架
- **🧩 shadcn/ui** - 高质量、可访问的UI组件库

### 🗄️ 数据库与后端
- **🗄️ Prisma** - 现代化的Node.js和TypeScript ORM
- **🔐 bcryptjs** - 密码加密
- **🔑 JWT** - 用户认证和授权
- **🤖 z-ai-web-dev-sdk** - AI模型集成

### 🎨 UI/UX
- **🎯 Lucide React** - 美观一致的图标库
- **🌈 Framer Motion** - React动画库
- **📊 响应式设计** - 移动端优先的设计理念

## 🚀 快速开始

### 环境要求
- Node.js 18+ 
- npm 或 yarn
- Docker 和 Docker Compose（可选，用于容器化部署）

### 安装和运行

#### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd sidao-chat

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息

# 初始化数据库
npm run db:push

# 启动开发服务器
npm run dev
```

#### Docker部署（推荐）

```bash
# 使用Docker Compose一键部署
npm run docker:compose

# 或者手动构建和运行
npm run docker:build
npm run docker:run
```

#### 生产环境部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 或者一键构建并启动
npm run start:prod
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 账户注册

系统支持用户注册和登录：

1. 访问 `/login` 页面
2. 点击"注册新账户"
3. 填写邮箱和密码完成注册
4. 登录后在设置页面配置AI模型和API密钥

### AI模型配置

要使用AI对话功能，需要配置AI模型：

1. 登录后访问"设置"页面
2. 点击"添加新模型"
3. 填写模型名称、API地址和API密钥
4. 支持OpenAI、Claude等多种AI服务提供商

> ⚠️ **安全提示**: 生产环境部署前请设置强JWT密钥！

### 生产部署

详细的部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 文档。

#### 快速部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 或者一键构建并启动
npm run start:prod
```

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router页面
│   ├── api/               # API路由
│   │   └── auth/         # 认证相关API
│   ├── chat/             # 对话界面
│   ├── history/          # 历史对话
│   ├── login/            # 登录注册
│   ├── mindmap/          # 思维导图
│   ├── settings/         # 设置页面
│   └── layout.tsx        # 根布局
├── components/            # React组件
│   ├── layout/           # 布局组件
│   └── ui/               # shadcn/ui组件
├── hooks/                # 自定义React hooks
├── lib/                  # 工具函数和配置
├── prisma/               # 数据库schema
└── public/               # 静态资源
```

## 🎯 核心页面

### 🏠 首页/仪表盘 (`/`)
- 统计数据展示
- 快捷入口
- 最近活动概览

### 💬 对话界面 (`/chat`)
- AI模型选择
- 实时对话
- 消息历史
- 思维导图入口

### 🧠 思维导图 (`/mindmap`)
- 可视化思维导图
- 节点编辑
- 缩放控制
- 对话关联

### 📚 历史对话 (`/history`)
- 对话列表
- 搜索筛选
- 批量操作
- 导出功能

### ⚙️ 设置 (`/settings`)
- AI模型管理
- 个人信息
- 外观设置
- 快捷键配置

### 🔐 登录注册 (`/login`)
- 用户注册
- 安全登录
- 密码找回

## 🎨 设计特色

### 📱 响应式设计
- 移动端优先的设计理念
- 支持桌面、平板、手机等多种设备
- 自适应布局和交互

### 🌙 主题支持
- 浅色/深色主题切换
- 系统主题跟随
- 一致的设计语言

### ⚡ 性能优化
- 组件懒加载
- 图片优化
- 代码分割
- 缓存策略

## 🔒 安全特性

- **密码加密**: 使用bcryptjs进行密码哈希
- **JWT认证**: 安全的用户认证机制
- **HTTPS**: 所有数据传输加密
- **输入验证**: 前后端双重验证

## 🤖 AI集成

### 支持的AI模型
- OpenAI GPT系列
- Anthropic Claude
- 自定义API端点
- 本地部署模型

### 核心AI功能
- 智能对话回复
- 关键词提取
- 思维导图生成
- 内容结构化

## 📊 数据模型

### 核心实体
- **User**: 用户信息
- **AIModelConfig**: AI模型配置
- **Conversation**: 对话记录
- **ChatMessage**: 对话消息
- **Mindmap**: 思维导图

### 关系设计
- 用户-对话：一对多
- 对话-消息：一对多
- 对话-思维导图：一对一
- 支持对话分支和回溯

## 🚀 部署指南

### 环境变量配置
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
NODE_ENV="production"
```

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户。

---

Built with ❤️ for 提升职场办公效率 🚀