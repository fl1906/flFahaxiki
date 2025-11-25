'use client'

import { useState } from 'react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import MarkdownRenderer from './markdown-renderer'
import MarkdownThemeSelector from './markdown-theme-selector'

const sampleMarkdown = `# Markdown 渲染演示

这是一个完整的Markdown渲染功能演示，展示了各种常见的Markdown语法。

## 文本格式化

**粗体文本** 和 *斜体文本*，以及 ***粗斜体***。

还有 \`内联代码\` 和 ~~删除线~~。

## 列表

### 无序列表
- 第一项
- 第二项
  - 嵌套项目1
  - 嵌套项目2
- 第三项

### 有序列表
1. 第一步
2. 第二步
3. 第三步

## 引用

> 这是一个引用块
> 可以包含多行文本
> 支持Markdown格式

## 代码块

### JavaScript 示例
\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
\`\`\`

### Python 示例
\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # 120
\`\`\`

## 表格

| 功能 | 支持状态 | 说明 |
|------|----------|------|
| 标题 | ✅ | H1-H6 |
| 列表 | ✅ | 有序和无序 |
| 代码 | ✅ | 语法高亮 |
| 链接 | ✅ | 自动链接 |
| 表格 | ✅ | 标准表格 |

## 链接

[GitHub](https://github.com) - 外部链接

## 分割线

---

## 任务列表

- [x] 已完成的任务
- [ ] 待完成的任务
- [ ] 另一个待完成任务

## Python Flask 示例

\`\`\`python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello, World!"

if __name__ == '__main__':
    app.run(port=5000, debug=True)
\`\`\`

## 数学公式（如果支持）

当 $a \\ne 0$ 时，方程 $ax^2 + bx + c = 0$ 的解为：

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

---

*这个演示展示了完整的Markdown渲染功能，包括语法高亮、表格、列表、引用等各种格式。*`

export default function MarkdownDemo() {
  const [showDemo, setShowDemo] = useState(false)

  if (!showDemo) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Markdown 渲染功能</h1>
        <p className="text-gray-600 mb-6">AI 回复现在支持完整的 Markdown 格式化显示</p>
        <Button onClick={() => setShowDemo(true)}>
          查看演示
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Markdown 渲染演示</h1>
        <div className="flex items-center space-x-2">
          <MarkdownThemeSelector />
          <Button variant="outline" onClick={() => setShowDemo(false)}>
            返回
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>渲染效果</CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownRenderer content={sampleMarkdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>原始 Markdown</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{sampleMarkdown}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}