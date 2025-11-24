# Markdown 渲染功能说明

## 功能概述

AI 回复内容现在支持完整的 Markdown 格式化显示，包括代码语法高亮、主题切换和复制功能。

## 主要功能

### 1. 完整的 Markdown 支持
- ✅ 标题（H1-H6）
- ✅ 文本格式化（粗体、斜体、删除线）
- ✅ 内联代码
- ✅ 代码块（带语法高亮）
- ✅ 有序和无序列表
- ✅ 引用块
- ✅ 表格
- ✅ 链接
- ✅ 分割线
- ✅ 任务列表

### 2. 代码高亮功能
- ✅ 支持多种编程语言的语法高亮
- ✅ 自动语言检测
- ✅ 代码块复制功能（修复版本）
- ✅ 语言标签显示

### 3. 多主题系统
提供 5 种精美的代码高亮主题：
- **GitHub** - 经典的 GitHub 风格
- **Monokai** - 流行的深色主题
- **Atom One** - 清新的 Atom 风格
- **Dracula** - 优雅的紫色主题
- **VS Code** - 现代的 VS Code 风格

### 4. 主题切换方式
- **全局切换**：聊天页面头部的"代码主题"按钮
- **单代码块切换**：每个代码块右上角的调色板图标
- **持久化设置**：主题选择会保存到 localStorage

### 5. 复制功能优化
- ✅ 修复了复制功能的兼容性问题
- ✅ 支持多种浏览器的复制 API
- ✅ 降级处理确保在所有环境中可用
- ✅ 复制成功反馈（2 秒后自动消失）

## 技术实现

### 核心组件
1. **MarkdownRenderer** (`/src/components/ui/markdown-renderer.tsx`)
   - 基于 `react-markdown`、`remark-gfm`、`rehype-highlight`
   - 自定义代码块渲染
   - 支持主题切换和复制功能

2. **MarkdownThemeSelector** (`/src/components/ui/markdown-theme-selector.tsx`)
   - 全局主题选择器组件
   - 触发自定义事件进行主题同步
   - localStorage 持久化

### 事件系统
- 使用 `CustomEvent` 进行组件间通信
- 主题变化会实时同步到所有 MarkdownRenderer 实例

### 复制功能实现
- 优先使用 `document.execCommand('copy')`（兼容性更好）
- 降级到 `navigator.clipboard.writeText()`（现代 API）
- 创建隐藏的 textarea 元素进行复制操作

## 使用方法

### 1. 在聊天界面
- AI 回复自动以 Markdown 格式显示
- 点击页面头部"代码主题"按钮切换全局主题
- 每个代码块右上角有复制按钮和主题切换按钮

### 2. 在其他组件
```tsx
import MarkdownRenderer from '@/components/ui/markdown-renderer'

<MarkdownRenderer
  content={markdownContent}
  className="optional-custom-class"
/>
```

### 3. 主题选择器
```tsx
import MarkdownThemeSelector from '@/components/ui/markdown-theme-selector'

<MarkdownThemeSelector />
```

## 样式定制

### CSS 类名
- `.ai-message-content` - AI 消息内容的默认样式类
- 代码块使用 Tailwind CSS 的 utility classes
- 支持暗色模式自动切换

### 主题配置
在 `/src/components/ui/markdown-theme-selector.tsx` 中可以添加新主题：

```typescript
const codeThemes = {
  newTheme: {
    name: '主题名称',
    description: '主题描述',
    bg: 'bg-gray-900',           // 背景色
    text: 'text-gray-100',       // 文字颜色
    header: 'bg-gray-800...',    // 头部样式
    button: 'text-gray-400...'   // 按钮样式
  }
}
```

## 演示页面
访问 `/components/ui/markdown-demo.tsx` 查看完整的 Markdown 功能演示。

## 兼容性
- ✅ Chrome/Edge (现代版本)
- ✅ Firefox (现代版本)
- ✅ Safari (现代版本)
- ✅ 移动端浏览器

## 注意事项
1. 代码主题设置会自动保存，下次访问时保持用户偏好
2. 复制功能使用降级策略，确保在各种环境下都能正常工作
3. 主题切换是实时的，不需要刷新页面
4. 支持键盘导航和无障碍访问