'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { Copy, Check, Palette } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { codeThemes } from './markdown-theme-selector'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof codeThemes>('github')

  // 从localStorage读取主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem('markdown-code-theme') as keyof typeof codeThemes
    if (savedTheme && codeThemes[savedTheme]) {
      setSelectedTheme(savedTheme)
    }
  }, [])

  // 监听全局主题变化事件
  useEffect(() => {
    const handleThemeChangeEvent = (event: CustomEvent) => {
      if (event.detail.theme && codeThemes[event.detail.theme]) {
        setSelectedTheme(event.detail.theme)
      }
    }

    window.addEventListener('markdown-theme-change', handleThemeChangeEvent as EventListener)
    return () => {
      window.removeEventListener('markdown-theme-change', handleThemeChangeEvent as EventListener)
    }
  }, [])

  // 保存主题设置到localStorage
  const handleThemeChange = (theme: keyof typeof codeThemes) => {
    setSelectedTheme(theme)
    localStorage.setItem('markdown-code-theme', theme)

    // 触发全局主题变化事件
    window.dispatchEvent(new CustomEvent('markdown-theme-change', {
      detail: { theme }
    }))
  }

  // 提取代码内容的核心函数
  const extractCodeContent = (children: any): string => {
    const extractFromObject = (obj: any): string => {
      if (!obj || typeof obj === 'string') return String(obj || '')

      // 检查React元素的各种属性
      if (obj.props?.children) return extractCodeContent(obj.props.children)
      if (obj.text) return String(obj.text)
      if (obj.value) return String(obj.value)
      if (obj.innerHTML) return obj.innerHTML
      if (obj.textContent) return obj.textContent

      // 检查是否是数组
      if (Array.isArray(obj)) {
        return obj.map(item => extractFromObject(item)).join('')
      }

      // 最后的后备方案
      return String(obj)
    }

    return extractFromObject(children)
  }

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      // 使用更可靠的复制方法
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)

      if (successful) {
        setCopiedCode(codeId)
        setTimeout(() => setCopiedCode(null), 2000)
      } else {
        // 降级到现代API
        try {
          await navigator.clipboard.writeText(text)
          setCopiedCode(codeId)
          setTimeout(() => setCopiedCode(null), 2000)
        } catch (fallbackError) {
          console.error('复制失败:', fallbackError)
        }
      }
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  const components = {
    // 自定义代码块渲染
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''

      // 使用新的代码提取函数
      let codeContent = extractCodeContent(children)

      // 移除末尾的换行符和清理空白字符
      codeContent = codeContent.replace(/\n$/, '').trim()

      const codeId = `code-${Math.random().toString(36).substr(2, 9)}`

      if (!inline && codeContent) {
        const theme = codeThemes[selectedTheme]

        return (
          <div className="relative group my-4">
            <div className={`flex items-center justify-between px-4 py-2 text-sm font-mono rounded-t-lg border ${theme.header}`}>
              <span className="text-xs">{language || 'plaintext'}</span>
              <div className="flex items-center space-x-1">
                {/* 主题选择器 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 w-6 p-0 ${theme.button} transition-colors`}
                    >
                      <Palette className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {Object.entries(codeThemes).map(([key, themeOption]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => handleThemeChange(key as keyof typeof codeThemes)}
                        className="text-xs"
                      >
                        {themeOption.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 复制按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 ${theme.button} transition-colors`}
                  onClick={() => copyToClipboard(codeContent, codeId)}
                  title={copiedCode === codeId ? "已复制!" : "复制代码"}
                >
                  {copiedCode === codeId ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            <pre className={`${theme.bg} ${theme.text} p-4 rounded-b-lg overflow-x-auto border border-t-0 ${theme.header}`}>
              <code className={`hljs ${className}`} {...props}>
                {children}
              </code>
            </pre>
          </div>
        )
      }

      // 内联代码
      return (
        <code
          className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      )
    },

    // 自定义标题渲染
    h1: ({ children, ...props }: any) => (
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 mt-6 first:mt-0" {...props}>
        {children}
      </h1>
    ),

    h2: ({ children, ...props }: any) => (
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-5 first:mt-0" {...props}>
        {children}
      </h2>
    ),

    h3: ({ children, ...props }: any) => (
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-4 first:mt-0" {...props}>
        {children}
      </h3>
    ),

    // 自定义段落渲染
    p: ({ children, ...props }: any) => (
      <p className="text-gray-700 dark:text-gray-300 mb-4 last:mb-0 leading-relaxed" {...props}>
        {children}
      </p>
    ),

    // 自定义列表渲染
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-inside mb-4 text-gray-700 dark:text-gray-300 space-y-1" {...props}>
        {children}
      </ul>
    ),

    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-inside mb-4 text-gray-700 dark:text-gray-300 space-y-1" {...props}>
        {children}
      </ol>
    ),

    li: ({ children, ...props }: any) => (
      <li className="leading-relaxed" {...props}>
        {children}
      </li>
    ),

    // 自定义引用渲染
    blockquote: ({ children, ...props }: any) => (
      <blockquote
        className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // 自定义链接渲染
    a: ({ children, href, ...props }: any) => (
      <a
        href={href}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),

    // 自定义表格渲染
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props}>
          {children}
        </table>
      </div>
    ),

    thead: ({ children, ...props }: any) => (
      <thead className="bg-gray-100 dark:bg-gray-800" {...props}>
        {children}
      </thead>
    ),

    th: ({ children, ...props }: any) => (
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100" {...props}>
        {children}
      </th>
    ),

    td: ({ children, ...props }: any) => (
      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300" {...props}>
        {children}
      </td>
    ),

    // 自定义分割线
    hr: ({ ...props }: any) => (
      <hr className="border-gray-300 dark:border-gray-600 my-6" {...props}
      />
    ),

    // 自定义强调
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
        {children}
      </strong>
    ),

    em: ({ children, ...props }: any) => (
      <em className="italic text-gray-800 dark:text-gray-200" {...props}>
        {children}
      </em>
    ),
  }

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}