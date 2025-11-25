'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import ExportDialog from '@/components/mindmap/export-dialog'
import KeyboardShortcuts from '@/components/mindmap/keyboard-shortcuts'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { MindmapLayout } from '@/lib/mindmap-layout'
import {
  Brain,
  Plus,
  Save,
  Download,
  Share2,
  MessageSquare,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  Edit3,
  Trash2,
  Keyboard
} from 'lucide-react'

interface MindmapNode {
  id: string
  text: string
  x: number
  y: number
  children: MindmapNode[]
  color?: string
}

export default function MindmapPage() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('conversation')

  const [mindmapTitle, setMindmapTitle] = useState(t('mindmap.mindmapTitle'))
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [mindmapData, setMindmapData] = useState<MindmapNode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal')

  // 添加背景拖拽状态
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [dragStartCanvas, setDragStartCanvas] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 })

  // Default empty data structure
  const defaultMindmapData: MindmapNode = {
    id: 'root',
    text: t('mindmap.noData'),
    x: 400,
    y: 300,
    color: '#3b82f6',
    children: []
  }

  // 加载思维导图数据
  useEffect(() => {
    if (conversationId) {
      loadMindmapData()
    } else {
      // 没有对话ID，显示默认数据
      setMindmapData(defaultMindmapData)
      setIsLoading(false)
    }
  }, [conversationId])

  // 添加键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveMindmap()
      }
      // Ctrl/Cmd + E: 导出
      else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        // 触发导出对话框
        document.querySelector('button[data-export-trigger]')?.click()
      }
      // Delete: 删除选中节点
      else if (e.key === 'Delete' && selectedNode && selectedNode !== 'root') {
        handleDeleteNode()
      }
      // Escape: 取消选择
      else if (e.key === 'Escape') {
        setSelectedNode(null)
        setEditingNode(null)
        setEditingText('')
      }
      // +: 添加节点
      else if (e.key === '+' && selectedNode) {
        handleAddNode()
      }
      // 空格 + Enter: 编辑选中节点
      else if (e.key === 'Enter' && selectedNode && !editingNode) {
        const node = (() => {
          const findNode = (n: MindmapNode): MindmapNode | null => {
            if (n.id === selectedNode) return n
            if (n.children) {
              for (const child of n.children) {
                const found = findNode(child)
                if (found) return found
              }
            }
            return null
          }
          return mindmapData ? findNode(mindmapData) : null
        })()

        if (node) {
          handleNodeDoubleClick(node)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNode, editingNode, mindmapData, conversationId, mindmapTitle])

  const loadMindmapData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/mindmap/${conversationId}`)

      if (response.ok) {
        const data = await response.json()
        const layoutData = layoutMode === 'horizontal'
          ? MindmapLayout.applyTreeLayout(data.structureData)
          : MindmapLayout.applyVerticalTreeLayout(data.structureData)
        setMindmapData(layoutData)
        setMindmapTitle(data.title)
      } else {
        // 如果没有找到思维导图，尝试生成一个
        await generateMindmap()
      }
    } catch (error) {
      console.error('Failed to load mindmap:', error)
      setError(t('mindmap.generatingMindmapFailed'))
      setMindmapData(defaultMindmapData)
    } finally {
      setIsLoading(false)
    }
  }

  const generateMindmap = async () => {
    if (!conversationId) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/mindmap/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          title: t('mindmap.conversationMindmap')
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const layoutData = layoutMode === 'horizontal'
            ? MindmapLayout.applyTreeLayout(data.mindmap.structureData)
            : MindmapLayout.applyVerticalTreeLayout(data.mindmap.structureData)
        setMindmapData(layoutData)
        setMindmapTitle(data.mindmap.title)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || t('mindmap.generationFailure'))
      }
    } catch (error) {
      console.error('Failed to generate mindmap:', error)
      setError(error instanceof Error ? error.message : t('mindmap.generatingMindmapFailed'))
      setMindmapData(defaultMindmapData)
    } finally {
      setIsLoading(false)
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5))
  }

  const handleResetZoom = () => {
    setZoom(1)
  }

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId === selectedNode ? null : nodeId)
  }

  const handleNodeDoubleClick = (node: MindmapNode) => {
    setEditingNode(node.id)
    setEditingText(node.text)
  }

  const handleNodeEditSave = () => {
    if (!editingNode || !mindmapData) return

    const updateNodeText = (node: MindmapNode): MindmapNode => {
      if (node.id === editingNode) {
        return { ...node, text: editingText }
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNodeText)
        }
      }
      return node
    }

    const updatedMindmapData = updateNodeText(mindmapData)
    setMindmapData(updatedMindmapData)
    setEditingNode(null)
    setEditingText('')
    toast.success(t('mindmap.nodeUpdateSuccess'))
  }

  const handleNodeEditCancel = () => {
    setEditingNode(null)
    setEditingText('')
  }

  const handleAddNode = () => {
    if (!selectedNode || !mindmapData) {
      toast.error(t('mindmap.pleaseSelectParentNode'))
      return
    }

    const addNewNode = (node: MindmapNode): MindmapNode => {
      if (node.id === selectedNode) {
        const newNode: MindmapNode = {
          id: `node_${Date.now()}`,
          text: t('mindmap.newNode'),
          x: node.x + 150,
          y: node.y + (node.children?.length || 0) * 50,
          children: [],
          color: '#10b981'
        }
        return {
          ...node,
          children: [...(node.children || []), newNode]
        }
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(addNewNode)
        }
      }
      return node
    }

    const updatedMindmapData = addNewNode(mindmapData)
    setMindmapData(updatedMindmapData)
    toast.success(t('mindmap.nodeAddSuccess'))
  }

  const handleDeleteNode = () => {
    if (!selectedNode || !mindmapData) {
      toast.error(t('mindmap.pleaseSelectNodeToDelete'))
      return
    }

    if (selectedNode === 'root') {
      toast.error(t('mindmap.cannotDeleteRootNode'))
      return
    }

    const deleteNode = (node: MindmapNode): MindmapNode => {
      if (node.children) {
        return {
          ...node,
          children: node.children
            .filter(child => child.id !== selectedNode)
            .map(deleteNode)
        }
      }
      return node
    }

    const updatedMindmapData = deleteNode(mindmapData)
    setMindmapData(updatedMindmapData)
    setSelectedNode(null)
    toast.success(t('mindmap.nodeDeleteSuccess'))
  }

  const handleMouseUp = () => {
    setIsDraggingCanvas(false)
  }

  // 背景拖拽处理函数
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // 只有当点击在空白区域时才触发背景拖拽
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-container')) {
      setIsDraggingCanvas(true)
      setDragStartCanvas({
        x: e.clientX,
        y: e.clientY,
        offsetX: canvasOffset.x,
        offsetY: canvasOffset.y
      })
      e.preventDefault()
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      const deltaX = e.clientX - dragStartCanvas.x
      const deltaY = e.clientY - dragStartCanvas.y

      setCanvasOffset({
        x: dragStartCanvas.offsetX + deltaX,
        y: dragStartCanvas.offsetY + deltaY
      })
    }
  }

  const applyLayout = () => {
    if (!mindmapData) return

    let updatedData: MindmapNode

    switch (mode) {
      case 'auto':
        updatedData = MindmapLayout.applyAutoLayout(mindmapData)
        break
      case 'tree':
        updatedData = MindmapLayout.applyTreeLayout(mindmapData)
        break
      case 'radial':
        updatedData = MindmapLayout.applyRadialLayout(mindmapData)
        break
      case 'compact':
        updatedData = MindmapLayout.applyCompactLayout(mindmapData)
        break
      case 'spacious':
        updatedData = MindmapLayout.applySpaciousLayout(mindmapData)
        break
      default:
        updatedData = mindmapData
    }

    setMindmapData(updatedData)
    setLayoutMode(mode)
    const layoutNames = {
      auto: t('mindmap.smartLayout'),
      tree: t('mindmap.treeLayout'),
      radial: t('mindmap.radialLayout'),
      compact: t('mindmap.compactLayout'),
      spacious: t('mindmap.spaciousLayout')
    }
    toast.success(t('mindmap.switchedToLayout').replace('${layout}', layoutNames[mode]))
  }

  const renderNode = (node: MindmapNode, level: number = 0) => {
    const isSelected = selectedNode === node.id
    const isEditing = editingNode === node.id

    // 确保 children 是一个数组
    const children = node.children || []

    // 线性贪吃蛇结构节点尺寸和样式配置
    const nodeConfig = {
      0: { width: 160, height: 80, fontSize: 'text-sm font-semibold', iconSize: 'w-8 h-8', bgColor: '#dbeafe' }, // 根节点 - 蓝色
      1: { width: 140, height: 70, fontSize: 'text-sm font-medium', iconSize: 'w-7 h-7', bgColor: '#dcfce7' }, // 问题节点 - 绿色
      2: { width: 140, height: 70, fontSize: 'text-sm font-medium', iconSize: 'w-7 h-7', bgColor: '#fed7aa' }, // 回答节点 - 橙色
    }

    const config = nodeConfig[level as keyof typeof nodeConfig] || nodeConfig[2]

    return (
      <div key={node.id}>
        {/* 线性贪吃蛇连接线 - 带箭头的直线连接 */}
        {children.map((child, index) => {
          const startX = node.x * zoom
          const startY = node.y * zoom
          const endX = child.x * zoom
          const endY = child.y * zoom

          // 计算箭头方向
          const angle = Math.atan2(endY - startY, endX - startX)
          const arrowLength = 8
          const arrowAngle = Math.PI / 6

          const arrowX1 = endX - arrowLength * Math.cos(angle - arrowAngle)
          const arrowY1 = endY - arrowLength * Math.sin(angle - arrowAngle)
          const arrowX2 = endX - arrowLength * Math.cos(angle + arrowAngle)
          const arrowY2 = endY - arrowLength * Math.sin(angle + arrowAngle)

          // 根据节点类型设置颜色
          const lineColor = child.id.startsWith('user_') || child.text.startsWith('Q:') ? '#10b981' : '#f97316'

          return (
            <svg
              key={`line-${node.id}-${child.id}`}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 1 }}
            >
              {/* 主连接线 */}
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={lineColor}
                strokeWidth="3"
                strokeOpacity="0.8"
                strokeLinecap="round"
                className="transition-all duration-300"
              />

              {/* 箭头 */}
              <polygon
                points={`${endX},${endY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
                fill={lineColor}
                fillOpacity="0.8"
                className="transition-all duration-300"
              />

              {/* 连接点圆点 */}
              <circle
                cx={endX}
                cy={endY}
                r="4"
                fill={lineColor}
                stroke="white"
                strokeWidth="2"
                className="transition-all duration-300"
              />
            </svg>
          )
        })}

        {/* 线性贪吃蛇节点 */}
        <div
          className={`absolute rounded-lg shadow-md border-2 flex flex-col items-center justify-center text-center p-3 transition-all duration-300 ${
            isSelected
              ? 'ring-4 shadow-lg scale-105 z-20'
              : 'hover:shadow-lg hover:scale-102'
          } cursor-pointer ${
            level === 0 ? 'font-bold' : 'font-medium'
          }`}
          style={{
            left: `${node.x * zoom - config.width / 2}px`,
            top: `${node.y * zoom - config.height / 2}px`,
            width: `${config.width}px`,
            height: `${config.height}px`,
            zIndex: isSelected ? 20 : (10 - level),
            backgroundColor: config.bgColor,
            // 根据节点类型设置边框颜色
            borderColor: node.associatedMessageId
              ? (node.id.startsWith('user_') || node.text.startsWith('Q:') ? '#10b981' : '#f97316')
              : (level === 0 ? '#3b82f6' : '#6b7280'),
            // 选中状态的边框和ring颜色
            ...(isSelected && {
              borderColor: node.associatedMessageId
                ? (node.id.startsWith('user_') || node.text.startsWith('Q:') ? '#10b981' : '#f97316')
                : '#3b82f6',
              ringColor: node.associatedMessageId
                ? (node.id.startsWith('user_') || node.text.startsWith('Q:') ? '#10b98120' : '#f9731620')
                : '#3b82f620',
            })
          }}
          onClick={() => !isEditing && handleNodeClick(node.id)}
          onDoubleClick={() => !isEditing && handleNodeDoubleClick(node)}
        >
          {isEditing ? (
            <div className="flex flex-col gap-2 w-full">
              <Input
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                className="text-xs h-8 px-2"
                autoFocus
                onBlur={handleNodeEditSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNodeEditSave()
                  } else if (e.key === 'Escape') {
                    handleNodeEditCancel()
                  }
                }}
              />
              <div className="flex gap-1 justify-center">
                <Button size="sm" className="h-6 text-xs px-2" onClick={handleNodeEditSave}>
                  ✓
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={handleNodeEditCancel}>
                  ✕
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 h-full justify-center">
              {/* 节点图标 - 适配线性贪吃蛇结构 */}
              <div className={`${config.iconSize} rounded-full flex items-center justify-center text-white text-sm font-bold ${
                node.associatedMessageId
                  ? (node.id.startsWith('user_') || node.text.startsWith('Q:') ? 'bg-green-500' : 'bg-orange-500')
                  : (level === 0 ? 'bg-blue-500' : 'bg-gray-500')
              }`}>
                {node.associatedMessageId
                  ? (node.id.startsWith('user_') || node.text.startsWith('Q:') ? 'Q' : 'A')
                  : (level === 0 ? '根' : '叶')
                }
              </div>

              {/* 节点文本 */}
              <span className={`${config.fontSize} leading-tight text-center break-words max-w-full ${
                node.associatedMessageId ? 'text-gray-700' : 'text-gray-800'
              } ${
                level === 0 ? 'font-semibold' : level === 1 ? 'font-medium' : 'font-normal'
              }`}>
                {node.text}
              </span>

              {/* 节点类型标识 - 适配线性贪吃蛇结构 */}
              {node.associatedMessageId && level > 0 && (
                <div className="text-xs text-gray-400">
                  {node.id.startsWith('msg_') && node.text.startsWith('Q:') ? t('mindmap.question') : t('mindmap.answer')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 递归渲染子节点 */}
        {children.map((child) => renderNode(child, level + 1))}
      </div>
    )
  }

  const saveMindmap = async () => {
    if (!conversationId) {
      toast.error(t('mindmap.cannotSaveMissingConversationId'))
      return
    }

    try {
      const response = await fetch('/api/mindmap/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          title: mindmapTitle
        }),
      })

      if (response.ok) {
        toast.success(t('mindmap.mindmapSaveSuccess'))
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || t('mindmap.saveFailed'))
      }
    } catch (error) {
      console.error('Failed to save mindmap:', error)
      toast.error(error instanceof Error ? error.message : t('mindmap.saveFailed'))
    }
  }

  const shareMindmap = () => {
    if (!conversationId) {
      toast.error('无法分享：缺少对话ID')
      return
    }

    const shareUrl = `${window.location.origin}/mindmap?conversation=${conversationId}`

    if (navigator.share) {
      navigator.share({
        title: mindmapTitle,
        text: '查看我的思维导图',
        url: shareUrl,
      }).catch(() => {
        // 用户取消分享
      })
    } else {
      // 复制到剪贴板
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success('分享链接已复制到剪贴板')
      }).catch(() => {
        toast.error('复制失败')
      })
    }
  }

  const goToChat = (messageId?: string) => {
    // 返回对话界面，带上下文参数
    if (conversationId) {
      const url = messageId
        ? `/chat?conversation=${conversationId}&highlight=${messageId}`
        : `/chat?conversation=${conversationId}`
      window.location.href = url
    } else {
      window.location.href = '/chat'
    }
  }

  const getNodeAssociatedMessage = (nodeId: string): string | null => {
    if (!mindmapData) return null

    const findNode = (node: MindmapNode): MindmapNode | null => {
      if (node.id === nodeId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child)
          if (found) return found
        }
      }
      return null
    }

    const node = findNode(mindmapData)
    return node?.associatedMessageId || null
  }

  const handleNodeToConversation = () => {
    if (!selectedNode) return

    const messageId = getNodeAssociatedMessage(selectedNode)
    if (messageId) {
      goToChat(messageId)
    } else {
      toast.info('该节点未关联具体消息，将返回对话首页')
      goToChat()
    }
  }

  const handleNodeExtendConversation = () => {
    if (!selectedNode || !conversationId) {
      toast.error('无法延伸对话：缺少必要信息')
      return
    }

    const messageId = getNodeAssociatedMessage(selectedNode)
    const url = messageId
      ? `/chat?conversation=${conversationId}&continueFrom=${messageId}`
      : `/chat?conversation=${conversationId}&continueFrom=${selectedNode}`

    window.location.href = url
    toast.success(t('mindmap.extendingConversation'))
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* 思维导图头部 */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={goToChat}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('mindmap.returnToChat')}
            </Button>
            <Input
              value={mindmapTitle}
              onChange={(e) => setMindmapTitle(e.target.value)}
              className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 w-64"
            />
            <Badge variant="secondary">{t('mindmap.mindmapTitle')}</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 缩放控制 */}
            <div className="flex items-center space-x-1 border rounded-md p-1">
              <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResetZoom}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <ExportDialog
              conversationId={conversationId || undefined}
              mindmapData={mindmapData || undefined}
              title={mindmapTitle}
            >
              <Button variant="outline" size="sm" data-export-trigger>
                <Download className="h-4 w-4 mr-2" />
                {t('mindmap.export')}
                <span className="text-xs text-gray-400 ml-1">Ctrl+E</span>
              </Button>
            </ExportDialog>

            <Button variant="outline" size="sm" onClick={shareMindmap}>
              <Share2 className="h-4 w-4 mr-2" />
              {t('mindmap.share')}
            </Button>

            <Button variant="outline" size="sm" onClick={saveMindmap}>
              <Save className="h-4 w-4 mr-2" />
              {t('mindmap.save')}
              <span className="text-xs text-gray-400 ml-1">Ctrl+S</span>
            </Button>

            <KeyboardShortcuts />
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleAddNode}>
              <Plus className="h-4 w-4 mr-2" />
              {t('mindmap.addNode')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeleteNode} disabled={!selectedNode || selectedNode === 'root'}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('mindmap.deleteNode')}
            </Button>
            <Button variant="outline" size="sm" disabled={!selectedNode}>
              <Edit3 className="h-4 w-4 mr-2" />
              {t('mindmap.editNode')}
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* 布局选择器 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{t('mindmap.layout')}:</span>
              <Select value={layoutMode} onValueChange={(value: typeof layoutMode) => applyLayout(value)}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('mindmap.smartLayout')}</SelectItem>
                  <SelectItem value="tree">{t('mindmap.treeLayout')}</SelectItem>
                  <SelectItem value="radial">{t('mindmap.radialLayout')}</SelectItem>
                  <SelectItem value="compact">{t('mindmap.compactLayout')}</SelectItem>
                  <SelectItem value="spacious">{t('mindmap.spaciousLayout')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            {selectedNode && (
              <span>{t('mindmap.nodeSelected')}: {selectedNode}</span>
            )}
          </div>
        </div>

        {/* 思维导图画布 */}
        <div
          className={`flex-1 overflow-hidden relative canvas-container ${
            isDraggingCanvas ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            backgroundImage: `
              radial-gradient(circle, #e5e7eb 1px, transparent 1px),
              linear-gradient(135deg, #f8fafc 25%, #f1f5f9 25%, #f1f5f9 50%, #f8fafc 50%, #f8fafc 75%, #f1f5f9 75%, #f1f5f9)
            `,
            backgroundSize: '20px 20px, 40px 40px',
            backgroundColor: '#ffffff'
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('mindmap.loadingMindmap')}</h3>
              <p className="text-gray-500">{t('mindmap.analyzingConversation')}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Brain className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('mindmap.generationFailed')}</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <div className="space-x-2">
                <Button onClick={generateMindmap} disabled={isLoading}>
                  <Brain className="h-4 w-4 mr-2" />
                  {t('mindmap.regenerate')}
                </Button>
                <Button variant="outline" onClick={goToChat}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t('mindmap.returnToChatBtn')}
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="relative w-full h-full"
              style={{
                transform: `scale(${zoom}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
                transformOrigin: '0 0',
                transition: isDraggingCanvas ? 'none' : 'transform 0.2s ease-in-out',
                cursor: isDraggingCanvas ? 'grabbing' : 'default'
              }}
            >
              <div id="mindmap-canvas" className="min-w-[1200px] min-h-[800px]">
              {mindmapData && renderNode(mindmapData)}
            </div>
            </div>
          )}

          {/* 空状态 */}
          {!isLoading && !error && mindmapData && (!mindmapData.children || mindmapData.children.length === 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-center bg-white">
              <Brain className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('mindmap.noMindmapContent')}</h3>
              <p className="text-gray-500 mb-4">{t('mindmap.insufficientContent')}</p>
              <div className="space-x-2">
                <Button onClick={generateMindmap} disabled={isLoading}>
                  <Brain className="h-4 w-4 mr-2" />
                  {t('mindmap.regenerate')}
                </Button>
                <Button variant="outline" onClick={goToChat}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t('mindmap.returnToChatBtn')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 侧边信息面板 */}
        {selectedNode && mindmapData && (
          <div className="w-80 border-l bg-white p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">节点信息</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">节点ID</label>
                <p className="text-sm text-gray-600 font-mono">{selectedNode}</p>
              </div>

              {/* 节点内容 */}
              {(() => {
                const findNode = (node: MindmapNode): MindmapNode | null => {
                  if (node.id === selectedNode) return node
                  if (node.children) {
                    for (const child of node.children) {
                      const found = findNode(child)
                      if (found) return found
                    }
                  }
                  return null
                }

                const node = findNode(mindmapData)
                return node
              })() && (() => {
                const node = (() => {
                  const findNode = (node: MindmapNode): MindmapNode | null => {
                    if (node.id === selectedNode) return node
                    if (node.children) {
                      for (const child of node.children) {
                        const found = findNode(child)
                        if (found) return found
                      }
                    }
                    return null
                  }
                  return findNode(mindmapData)
                })()

                return (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700">节点内容</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{node?.text}</p>
                    </div>

                    {/* 关联消息 */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">关联对话</label>
                      <p className="text-sm text-gray-600 mb-2">
                        {node?.associatedMessageId
                          ? '此节点关联到具体的对话消息'
                          : '此节点未关联具体消息'}
                      </p>
                      <Button variant="outline" size="sm" className="w-full" onClick={handleNodeToConversation}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        查看对话
                      </Button>
                    </div>

                    <Separator />

                    {/* 节点操作 */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">节点操作</label>
                      <div className="space-y-2 mt-2">
                        <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleNodeExtendConversation}>
                          <Plus className="h-4 w-4 mr-2" />
                          基于此节点延伸对话
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => {
                            if (node?.associatedMessageId) {
                              goToChat(node.associatedMessageId)
                            } else {
                              toast.info('该节点未关联具体消息，无法回溯')
                            }
                          }}
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          回溯到此节点
                        </Button>
                      </div>
                    </div>

                    {/* 节点统计 */}
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-gray-700">节点统计</label>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div>子节点数量: {(node?.children || []).length}</div>
                        <div>节点颜色: {node?.color || '默认'}</div>
                        <div>节点类型: {node?.associatedMessageId ? '消息节点' : '手动创建'}</div>
                      </div>
                    </div>
                  </>
                )
              })()}

              {/* 快捷操作 */}
              <Separator />
              <div>
                <label className="text-sm font-medium text-gray-700">快捷操作</label>
                <div className="space-y-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      const node = (() => {
                        const findNode = (n: MindmapNode): MindmapNode | null => {
                          if (n.id === selectedNode) return n
                          if (n.children) {
                            for (const child of n.children) {
                              const found = findNode(child)
                              if (found) return found
                            }
                          }
                          return null
                        }
                        return findNode(mindmapData)
                      })()

                      if (node) {
                        handleNodeDoubleClick(node)
                      }
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    编辑节点内容
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleAddNode}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    添加子节点
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleDeleteNode}
                    disabled={selectedNode === 'root'}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除此节点
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}