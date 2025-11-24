'use client'

import { useState, useEffect } from 'react'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './dropdown-menu'
import { Palette, Settings } from 'lucide-react'

// 预定义的代码主题
const codeThemes = {
  github: {
    name: 'GitHub',
    description: '经典的GitHub风格',
    bg: 'bg-gray-900',
    text: 'text-gray-100',
    header: 'bg-gray-800 text-gray-200 border-gray-700',
    button: 'text-gray-400 hover:text-white'
  },
  monokai: {
    name: 'Monokai',
    description: '流行的深色主题',
    bg: 'bg-gray-950',
    text: 'text-gray-100',
    header: 'bg-gray-900 text-gray-300 border-gray-800',
    button: 'text-gray-500 hover:text-gray-100'
  },
  atomOne: {
    name: 'Atom One',
    description: '清新的Atom风格',
    bg: 'bg-slate-900',
    text: 'text-slate-100',
    header: 'bg-slate-800 text-slate-200 border-slate-700',
    button: 'text-slate-400 hover:text-slate-100'
  },
  dracula: {
    name: 'Dracula',
    description: '优雅的紫色主题',
    bg: 'bg-slate-900',
    text: 'text-slate-100',
    header: 'bg-purple-900/80 text-purple-200 border-purple-800',
    button: 'text-purple-400 hover:text-purple-100'
  },
  vscode: {
    name: 'VS Code',
    description: '现代的VS Code风格',
    bg: 'bg-blue-950/90',
    text: 'text-blue-100',
    header: 'bg-blue-900/90 text-blue-200 border-blue-800',
    button: 'text-blue-400 hover:text-blue-100'
  }
}

interface MarkdownThemeSelectorProps {
  className?: string
}

export default function MarkdownThemeSelector({ className = '' }: MarkdownThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof codeThemes>('github')

  // 从localStorage读取主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem('markdown-code-theme') as keyof typeof codeThemes
    if (savedTheme && codeThemes[savedTheme]) {
      setSelectedTheme(savedTheme)
    }
  }, [])

  // 保存主题设置到localStorage并触发事件
  const handleThemeChange = (theme: keyof typeof codeThemes) => {
    setSelectedTheme(theme)
    localStorage.setItem('markdown-code-theme', theme)

    // 触发自定义事件，通知其他组件主题已更改
    window.dispatchEvent(new CustomEvent('markdown-theme-change', {
      detail: { theme }
    }))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Palette className="h-4 w-4 mr-2" />
          代码主题
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-normal">
          选择代码高亮主题
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(codeThemes).map(([key, theme]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => handleThemeChange(key as keyof typeof codeThemes)}
            className={`flex flex-col items-start p-2 ${selectedTheme === key ? 'bg-accent' : ''}`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium">{theme.name}</span>
              {selectedTheme === key && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-1">
              {theme.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// 导出主题数据，供其他组件使用
export { codeThemes }