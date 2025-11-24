'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import SidebarMindmap from './sidebar-mindmap'
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Brain,
  GripVertical,
  Minimize2,
  Maximize2
} from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface CollapsibleSidebarProps {
  messages: Message[]
  conversationId: string
  className?: string
}

export default function CollapsibleSidebar({ messages, conversationId, className = '' }: CollapsibleSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(320) // 默认宽度
  const [isResizing, setIsResizing] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  const sidebarRef = useRef<HTMLDivElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const currentWidthRef = useRef(320) // 避免频繁状态更新的临时宽度

  // 从localStorage读取保存的宽度
  useEffect(() => {
    const savedWidth = localStorage.getItem('mindmap-sidebar-width')
    if (savedWidth) {
      const width = parseInt(savedWidth, 10)
      if (width >= 200 && width <= 600) {
        setSidebarWidth(width)
        currentWidthRef.current = width
        setIsMaximized(width >= 600)
      }
    }
  }, [])

  // 保存宽度到localStorage
  const saveWidth = (width: number) => {
    localStorage.setItem('mindmap-sidebar-width', width.toString())
  }

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // 获取鼠标/触摸位置
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX

    setIsResizing(true)
    startXRef.current = clientX
    startWidthRef.current = currentWidthRef.current

    // 添加全局事件监听
    document.addEventListener('mousemove', handleMouseMove as any, { passive: false })
    document.addEventListener('mouseup', handleMouseUp as any, { passive: false })
    document.addEventListener('touchmove', handleMouseMove as any, { passive: false })
    document.addEventListener('touchend', handleMouseUp as any, { passive: false })

    // 设置全局样式
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
  }

  // 处理拖拽移动 - 优化版本
  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isResizing) return

    e.preventDefault() // 防止默认滚动行为

    // 取消之前的动画帧
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // 使用requestAnimationFrame优化性能
    animationFrameRef.current = requestAnimationFrame(() => {
      // 获取鼠标/触摸位置
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX

      const deltaX = clientX - startXRef.current
      // 向左拖拽（deltaX为负）增加宽度，向右拖拽（deltaX为正）减少宽度
      let newWidth = startWidthRef.current - deltaX

      const minWidth = 200
      const maxWidth = 600

      // 应用宽度限制
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

      // 更新临时宽度引用，避免频繁状态更新
      currentWidthRef.current = newWidth

      // 使用transform直接修改DOM，避免React重新渲染
      if (sidebarRef.current) {
        sidebarRef.current.style.width = `${newWidth}px`
      }

      // 检查是否需要更新状态（减少状态更新频率）
      const shouldBeMaximized = newWidth >= maxWidth
      if (shouldBeMaximized !== isMaximized) {
        setIsMaximized(shouldBeMaximized)
      }
    })
  }

  // 处理拖拽结束 - 优化版本
  const handleMouseUp = () => {
    if (!isResizing) return

    setIsResizing(false)

    // 取消待处理的动画帧
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // 最终更新状态和保存
    const finalWidth = currentWidthRef.current
    setSidebarWidth(finalWidth)
    saveWidth(finalWidth)

    // 移除全局事件监听
    document.removeEventListener('mousemove', handleMouseMove as any)
    document.removeEventListener('mouseup', handleMouseUp as any)
    document.removeEventListener('touchmove', handleMouseMove as any)
    document.removeEventListener('touchend', handleMouseUp as any)

    // 恢复全局样式
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''
  }

  // 清理事件监听器和动画帧
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any)
      document.removeEventListener('mouseup', handleMouseUp as any)
      document.removeEventListener('touchmove', handleMouseMove as any)
      document.removeEventListener('touchend', handleMouseUp as any)

      // 清理动画帧
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
    }
  }, [])

  // 处理折叠/展开
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  // 处理最大化/恢复
  const toggleMaximize = () => {
    if (isMaximized) {
      const normalWidth = 320
      setSidebarWidth(normalWidth)
      currentWidthRef.current = normalWidth
      setIsMaximized(false)
      saveWidth(normalWidth)
    } else {
      const maxWidth = 600
      setSidebarWidth(maxWidth)
      currentWidthRef.current = maxWidth
      setIsMaximized(true)
      saveWidth(maxWidth)
    }
  }

  return (
    <div
      ref={sidebarRef}
      className={`${className} transition-all duration-300 ease-in-out relative ${
        isCollapsed ? 'w-12' : ''
      }`}
      style={{
        width: isCollapsed ? undefined : `${sidebarWidth}px`,
        minWidth: isCollapsed ? undefined : '200px',
        maxWidth: isCollapsed ? undefined : '600px'
      }}
    >
      <div className="h-full relative">
        {/* 折叠按钮 */}
        <Button
          variant="outline"
          size="sm"
          className={`absolute z-10 h-6 w-6 p-0 rounded-full shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
            isCollapsed ? '-left-3 top-6' : '-left-3 top-6'
          }`}
          onClick={toggleCollapse}
        >
          {isCollapsed ? (
            <ChevronLeftIcon className="h-3 w-3" />
          ) : (
            <ChevronRightIcon className="h-3 w-3" />
          )}
        </Button>

        {/* 最大化/恢复按钮（仅在展开状态下显示） */}
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute -right-3 top-6 z-10 h-6 w-6 p-0 rounded-full shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={toggleMaximize}
            title={isMaximized ? "恢复默认大小" : "最大化侧边栏"}
          >
            {isMaximized ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* 拖拽手柄（仅在展开状态下显示） */}
        {!isCollapsed && (
          <>
            {/* 拖拽区域 - 优化版本 */}
            <div
              ref={resizeHandleRef}
              className={`absolute -left-3 top-0 bottom-0 w-6 cursor-ew-resize z-30 flex items-center justify-center group transition-colors duration-75 ${
                isResizing ? 'bg-blue-50/50' : 'hover:bg-transparent'
              }`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              title="拖拽调整宽度"
              style={{
                touchAction: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
            />

            {/* 视觉指示器 */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 z-40">
              <div className={`w-1 h-12 bg-gray-300 dark:bg-gray-600 rounded-full transition-all duration-200 flex items-center justify-center ${
                isResizing
                  ? 'bg-blue-500 w-2 h-14'
                  : 'group-hover:bg-blue-400 group-hover:w-1.5'
              }`}>
                {/* 拖拽图标 */}
                <GripVertical className={`h-3 w-3 text-gray-400 transition-all duration-200 ${
                  isResizing ? 'text-white scale-125' : 'group-hover:text-white'
                }`} />
              </div>

              {/* 双向箭头指示器 */}
              <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <ChevronLeftIcon className="h-2 w-2 text-gray-500" />
                <ChevronRightIcon className="h-2 w-2 text-gray-500" />
              </div>

              {/* 悬停时的提示文本 */}
              <div className="absolute left-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                向左展开 · 向右缩进
              </div>
            </div>
          </>
        )}

        {/* 侧边栏内容 */}
        <Card className="h-full overflow-hidden">
          {isCollapsed ? (
            <CardContent className="h-full flex items-center justify-center p-2">
              <Brain
                className="h-5 w-5 text-purple-500 cursor-pointer hover:text-purple-600 transition-colors"
                onClick={toggleCollapse}
                title="展开思维导图"
              />
            </CardContent>
          ) : (
            <div className="h-full flex flex-col">
              {/* 宽度指示器 - 优化版本 */}
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {isResizing ? currentWidthRef.current : sidebarWidth}px
                </span>
                <div className="flex items-center space-x-1">
                  <GripVertical className={`h-3 w-3 transition-colors ${
                    isResizing ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  {isMaximized && (
                    <span className="text-xs text-blue-500 font-medium">MAX</span>
                  )}
                </div>
              </div>

              {/* 思维导图内容 */}
              <div className="flex-1 overflow-hidden">
                <SidebarMindmap
                  messages={messages}
                  conversationId={conversationId}
                  className="h-full border-0"
                />
              </div>
            </div>
          )}
        </Card>

        {/* 拖拽时的遮罩层 */}
        {isResizing && (
          <div
            className="fixed inset-0 z-30 pointer-events-none"
            style={{ cursor: 'ew-resize' }}
          />
        )}
      </div>
    </div>
  )
}