# 思维导图悬浮提示功能

## 功能概述

为思维导图侧边栏添加了悬浮提示功能，解决AI回复内容显示不完整的问题，用户可以通过鼠标悬浮查看完整的对话内容。

## 主要特性

### 🎯 核心功能
- ✅ **智能检测**：自动检测内容是否被截断（超过50字符或与显示内容不同）
- ✅ **延迟显示**：500ms延迟显示，避免快速移动时的误触
- ✅ **格式化内容**：清理Markdown符号，优化长文本显示
- ✅ **智能定位**：自动调整悬浮提示位置，避免超出屏幕边界

### 🎨 视觉设计
- **信息图标**：内容被截断时显示蓝色Info图标
- **优雅动画**：淡入淡出效果，平滑过渡
- **响应式设计**：支持暗色/亮色主题
- **高对比度**：良好的可读性和视觉层次

### ⚡ 交互体验
- **延迟触发**：鼠标悬停500ms后显示，避免误触
- **快速消失**：鼠标移开后100ms内消失
- **防止闪烁**：智能定时器管理，避免快速切换时的闪烁
- **边界检测**：自动调整位置确保提示框完全可见

## 技术实现

### 数据结构增强
```typescript
interface MindmapNode {
  id: string
  type: 'user' | 'ai'
  content: string        // 截断后的显示内容
  fullContent: string    // 完整的原始内容
  children: MindmapNode[]
  level: number
  messageId: string
}
```

### 悬浮事件处理
```typescript
const handleMouseEnter = (node: MindmapNode, event: React.MouseEvent) => {
  // 检测内容是否被截断
  const isContentTruncated = node.fullContent.length > 50 ||
                             node.fullContent !== node.content

  if (isContentTruncated) {
    // 延迟显示悬浮提示
    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredNode(node.id)
      setTooltipContent(formatTooltipContent(node.fullContent))
      calculateTooltipPosition(event)
    }, 500)
  }
}
```

### 内容格式化算法
```typescript
const formatTooltipContent = (content: string): string => {
  // 清理Markdown符号
  let formatted = content
    .replace(/#{1,6}\s+/g, '')                    // 移除标题
    .replace(/\*\*([^*]+)\*\*/g, '$1')            // 移除加粗
    .replace(/\*([^*]+)\*/g, '$1')               // 移除斜体
    .replace(/`([^`]+)`/g, '$1')                 // 移除代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')     // 移除链接

  // 限制长度和处理换行
  if (formatted.length > 500) {
    formatted = formatted.substring(0, 500) + '...'
  }

  return formatted.replace(/\n{3,}/g, '\n\n').trim()
}
```

### 智能定位算法
```typescript
const calculateTooltipPosition = (event: React.MouseEvent) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const tooltipWidth = 320
  const tooltipHeight = 250

  let x = rect.right + 8   // 默认右侧
  let y = rect.top

  // 检查屏幕边界
  if (x + tooltipWidth > window.innerWidth - 20) {
    x = rect.left - tooltipWidth - 8  // 切换到左侧
  }

  if (y < 10) y = 10
  if (y + tooltipHeight > window.innerHeight - 10) {
    y = window.innerHeight - tooltipHeight - 10
  }

  setTooltipPosition({ x, y })
}
```

## 悬浮提示设计

### 样式特性
- **圆角设计**：12px圆角，现代感十足
- **阴影效果**：双重阴影，立体层次感
- **边框装饰**：1px边框，与主题色彩协调
- **内边距**：16px内边距，内容呼吸感

### 内容布局
```
┌─────────────────────────────────────┐
│ [图标] 完整内容           [字符数]   │  ← 标题栏
├─────────────────────────────────────┤
│                                     │
│  格式化后的完整内容                   │  ← 内容区域
│  支持换行和自动换行                   │
│  保留段落结构                        │
│                                     │
├─────────────────────────────────────┤
│  内容已截断显示前500字符             │  ← 底部提示（仅在超长内容时显示）
└─────────────────────────────────────┘
```

### 响应式适配
- **暗色主题**：深灰背景，浅色文字
- **亮色主题**：浅色背景，深色文字
- **动画效果**：200ms缓动过渡
- **滚动支持**：内容超长时自动滚动

## 用户体验优化

### 性能优化
- **延迟渲染**：仅在需要时创建悬浮提示
- **内存管理**：自动清理定时器，避免内存泄漏
- **事件节流**：防止重复触发和性能问题
- **内容缓存**：避免重复格式化相同内容

### 可访问性
- **键盘导航**：支持键盘操作时的显示
- **屏幕阅读器**：适当的ARIA标签
- **高对比度**：确保在各种主题下的可读性
- **焦点管理**：不影响正常焦点流

### 交互细节
- **渐进显示**：悬浮500ms后显示，避免误触
- **平滑隐藏**：移开后100ms隐藏，减少闪烁
- **边界处理**：智能调整位置，确保完全可见
- **视觉反馈**：悬停时节点背景色变化

## 使用场景

### 1. 长AI回复
- AI回复超过50字符时自动截断显示
- 悬浮查看完整回复内容
- 保留格式化和结构

### 2. 复杂问题
- 用户问题包含多个子问题时
- 悬浮查看完整问题描述
- 帮助理解对话上下文

### 3. 代码回复
- AI回复包含代码块时
- 悬浮查看完整代码
- 便于复制和学习

## 配置选项

### 可调参数
```typescript
// 显示延迟（毫秒）
const TOOLTIP_DELAY = 500

// 隐藏延迟（毫秒）
const HIDE_DELAY = 100

// 截断阈值（字符数）
const TRUNCATE_THRESHOLD = 50

// 最大显示长度（字符数）
const MAX_DISPLAY_LENGTH = 500

// 悬浮提示尺寸
const TOOLTIP_WIDTH = 320
const TOOLTIP_HEIGHT = 280
```

## 浏览器兼容性
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ 移动端浏览器

## 开发服务器状态
- ✅ 编译成功，无错误或警告
- ✅ 功能完全集成到聊天界面
- ✅ 服务器正常运行：http://localhost:3004

这个悬浮提示功能大大提升了用户体验，让思维导图能够完整展示对话内容，同时保持了界面的简洁性！