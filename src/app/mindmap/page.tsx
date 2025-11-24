'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ExportDialog from '@/components/mindmap/export-dialog'
import KeyboardShortcuts from '@/components/mindmap/keyboard-shortcuts'
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
  Settings,
  Loader2,
  Edit3,
  Trash2,
  Keyboard,
  MousePointer
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
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('conversation')

  const [mindmapTitle, setMindmapTitle] = useState('思维导图')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [mindmapData, setMindmapData] = useState<MindmapNode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [layoutMode, setLayoutMode] = useState<'auto' | 'tree' | 'radial' | 'compact' | 'spacious'>('auto')

  // 默认空数据结构
  const defaultMindmapData: MindmapNode = {
    id: 'root',
    text: '暂无数据',
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
        const layoutData = MindmapLayout.applyAutoLayout(data.structureData)
        setMindmapData(layoutData)
        setMindmapTitle(data.title)
      } else {
        // 如果没有找到思维导图，尝试生成一个
        await generateMindmap()
      }
    } catch (error) {
      console.error('加载思维导图失败:', error)
      setError('加载思维导图失败，请尝试生成新的思维导图')
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
          title: '对话思维导图'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const layoutData = MindmapLayout.applyAutoLayout(data.mindmap.structureData)
        setMindmapData(layoutData)
        setMindmapTitle(data.mindmap.title)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || '生成失败')
      }
    } catch (error) {
      console.error('生成思维导图失败:', error)
      setError(error instanceof Error ? error.message : '生成思维导图失败')
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
    toast.success('节点更新成功')
  }

  const handleNodeEditCancel = () => {
    setEditingNode(null)
    setEditingText('')
  }

  const handleAddNode = () => {
    if (!selectedNode || !mindmapData) {
      toast.error('请先选择一个父节点')
      return
    }

    const addNewNode = (node: MindmapNode): MindmapNode => {
      if (node.id === selectedNode) {
        const newNode: MindmapNode = {
          id: `node_${Date.now()}`,
          text: '新节点',
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
    toast.success('节点添加成功')
  }

  const handleDeleteNode = () => {
    if (!selectedNode || !mindmapData) {
      toast.error('请先选择要删除的节点')
      return
    }

    if (selectedNode === 'root') {
      toast.error('不能删除根节点')
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
    toast.success('节点删除成功')
  }

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setDraggingNode(nodeId)
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode || !dragStart || !mindmapData) return

    const container = e.currentTarget.getBoundingClientRect()
    const newX = (e.clientX - container.left - dragStart.x) / zoom
    const newY = (e.clientY - container.top - dragStart.y) / zoom

    const updateNodePosition = (node: MindmapNode): MindmapNode => {
      if (node.id === draggingNode) {
        return { ...node, x: newX, y: newY }
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNodePosition)
        }
      }
      return node
    }

    const updatedMindmapData = updateNodePosition(mindmapData)
    setMindmapData(updatedMindmapData)
  }

  const handleMouseUp = () => {
    setDraggingNode(null)
    setDragStart(null)
  }

  const applyLayout = (mode: typeof layoutMode) => {
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
    toast.success(`已切换到${mode === 'auto' ? '智能' : mode === 'tree' ? '树形' : mode === 'radial' ? '径向' : mode === 'compact' ? '紧凑' : '宽松'}布局`)
  }

  const renderNode = (node: MindmapNode, level: number = 0) => {
    const isSelected = selectedNode === node.id
    const isEditing = editingNode === node.id
    const isDragging = draggingNode === node.id
    const nodeSize = level === 0 ? 'w-32 h-16' : level === 1 ? 'w-28 h-14' : 'w-24 h-12'
    const fontSize = level === 0 ? 'text-sm font-semibold' : level === 1 ? 'text-xs' : 'text-xs'

    // 确保 children 是一个数组
    const children = node.children || []

    return (
      <div key={node.id}>
        {/* 连接线 */}
        {children.map((child) => {
          const startX = node.x * zoom
          const startY = node.y * zoom
          const endX = child.x * zoom
          const endY = child.y * zoom

          // 计算贝塞尔曲线控制点
          const controlOffset = Math.abs(endX - startX) * 0.3
          const controlX1 = startX + controlOffset
          const controlY1 = startY
          const controlX2 = endX - controlOffset
          const controlY2 = endY

          return (
            <svg
              key={`line-${node.id}-${child.id}`}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 0 }}
            >
              <defs>
                <linearGradient id={`gradient-${node.id}-${child.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={node.color || '#3b82f6'} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={child.color || '#10b981'} stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <path
                d={`M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`}
                stroke={`url(#gradient-${node.id}-${child.id})`}
                strokeWidth="2"
                fill="none"
                className="transition-all duration-300"
              />
              {/* 添加箭头 */}
              <circle
                cx={endX}
                cy={endY}
                r="3"
                fill={child.color || '#10b981'}
                className="transition-all duration-300"
              />
            </svg>
          )
        })}

        {/* 节点 */}
        <div
          className={`absolute ${nodeSize} rounded-xl shadow-lg border-2 flex flex-col items-center justify-center text-center p-3 transition-all duration-300 ${
            isSelected
              ? 'border-blue-500 ring-4 ring-blue-200 shadow-xl scale-105'
              : 'border-transparent hover:shadow-xl hover:scale-102'
          } ${isDragging ? 'cursor-grabbing opacity-80 scale-110 shadow-2xl' : 'cursor-pointer'} ${
            node.associatedMessageId ? 'bg-gradient-to-br' : 'bg-white'
          } ${
            level === 0 ? 'font-bold' : level === 1 ? 'font-medium' : 'font-normal'
          }`}
          style={{
            left: `${node.x * zoom - (level === 0 ? 70 : level === 1 ? 60 : 50)}px`,
            top: `${node.y * zoom - (level === 0 ? 35 : level === 1 ? 30 : 25)}px`,
            zIndex: isDragging ? 30 : (isSelected ? 15 : level),
            width: level === 0 ? '140px' : level === 1 ? '120px' : '100px',
            height: level === 0 ? '70px' : level === 1 ? '60px' : '50px',
            backgroundColor: node.color ? `${node.color}15` : (level === 0 ? '#f0f9ff' : '#ffffff'),
            borderColor: node.color || (level === 0 ? '#3b82f6' : '#e5e7eb'),
            backgroundImage: node.associatedMessageId
              ? `linear-gradient(135deg, ${node.color || '#3b82f6'}15 0%, ${node.color || '#3b82f6'}05 100%)`
              : undefined,
          }}
          onClick={() => !isEditing && !isDragging && handleNodeClick(node.id)}
          onDoubleClick={() => !isEditing && !isDragging && handleNodeDoubleClick(node)}
          onMouseDown={(e) => !isEditing && handleMouseDown(e, node.id)}
        >
          {isEditing ? (
            <div className="flex flex-col gap-1 w-full">
              <Input
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                className="text-xs h-6 px-1"
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
              <div className="flex gap-1">
                <Button size="sm" className="h-4 text-xs px-1" onClick={handleNodeEditSave}>
                  ✓
                </Button>
                <Button size="sm" variant="outline" className="h-4 text-xs px-1" onClick={handleNodeEditCancel}>
                  ✕
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              {/* 节点图标 */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                node.associatedMessageId
                  ? (node.id.startsWith('msg_') && node.text.startsWith('Q:') ? 'bg-green-500' : 'bg-orange-500')
                  : (level === 0 ? 'bg-blue-500' : level === 1 ? 'bg-purple-500' : 'bg-gray-500')
              }`}>
                {node.associatedMessageId
                  ? (node.id.startsWith('msg_') && node.text.startsWith('Q:') ? 'Q' : 'A')
                  : (level === 0 ? 'R' : level === 1 ? 'B' : 'N')
                }
              </div>
              {/* 节点文本 */}
              <span className={`${fontSize} leading-tight ${
                node.associatedMessageId ? 'text-gray-700' : 'text-gray-800'
              } ${
                level === 0 ? 'font-semibold' : level === 1 ? 'font-medium' : 'font-normal'
              }`}>
                {node.text}
              </span>
              {/* 节点类型标识 */}
              {node.associatedMessageId && (
                <div className="text-xs text-gray-400">
                  {node.id.startsWith('msg_') && node.text.startsWith('Q:') ? '问题' : '回答'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 子节点 */}
        {children.map((child) => renderNode(child, level + 1))}
      </div>
    )
  }

  const saveMindmap = async () => {
    if (!conversationId) {
      toast.error('无法保存：缺少对话ID')
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
        toast.success('思维导图保存成功')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || '保存失败')
      }
    } catch (error) {
      console.error('保存思维导图失败:', error)
      toast.error(error instanceof Error ? error.message : '保存失败')
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
    toast.success('正在基于此节点延伸对话...')
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* 思维导图头部 */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={goToChat}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回对话
            </Button>
            <Input
              value={mindmapTitle}
              onChange={(e) => setMindmapTitle(e.target.value)}
              className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 w-64"
            />
            <Badge variant="secondary">思维导图</Badge>
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
                导出
                <span className="text-xs text-gray-400 ml-1">Ctrl+E</span>
              </Button>
            </ExportDialog>

            <Button variant="outline" size="sm" onClick={shareMindmap}>
              <Share2 className="h-4 w-4 mr-2" />
              分享
            </Button>

            <Button variant="outline" size="sm" onClick={saveMindmap}>
              <Save className="h-4 w-4 mr-2" />
              保存
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
              添加节点
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeleteNode} disabled={!selectedNode || selectedNode === 'root'}>
              <Trash2 className="h-4 w-4 mr-2" />
              删除节点
            </Button>
            <Button variant="outline" size="sm" disabled={!selectedNode}>
              <Edit3 className="h-4 w-4 mr-2" />
              编辑节点
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* 布局选择器 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">布局:</span>
              <Select value={layoutMode} onValueChange={(value: typeof layoutMode) => applyLayout(value)}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">智能布局</SelectItem>
                  <SelectItem value="tree">树形布局</SelectItem>
                  <SelectItem value="radial">径向布局</SelectItem>
                  <SelectItem value="compact">紧凑布局</SelectItem>
                  <SelectItem value="spacious">宽松布局</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            {selectedNode && (
              <span>已选择节点: {selectedNode}</span>
            )}
          </div>
        </div>

        {/* 思维导图画布 */}
        <div
          className="flex-1 overflow-hidden relative"
          style={{
            backgroundImage: `
              radial-gradient(circle, #e5e7eb 1px, transparent 1px),
              linear-gradient(135deg, #f8fafc 25%, #f1f5f9 25%, #f1f5f9 50%, #f8fafc 50%, #f8fafc 75%, #f1f5f9 75%, #f1f5f9)
            `,
            backgroundSize: '20px 20px, 40px 40px',
            backgroundColor: '#ffffff'
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">生成思维导图中...</h3>
              <p className="text-gray-500">正在分析对话内容并生成思维导图</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Brain className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">生成失败</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <div className="space-x-2">
                <Button onClick={generateMindmap} disabled={isLoading}>
                  <Brain className="h-4 w-4 mr-2" />
                  重新生成
                </Button>
                <Button variant="outline" onClick={goToChat}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  返回对话
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="relative w-full h-full"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              <div id="mindmap-canvas">
              {mindmapData && renderNode(mindmapData)}
            </div>
            </div>
          )}

          {/* 空状态 */}
          {!isLoading && !error && mindmapData && (!mindmapData.children || mindmapData.children.length === 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-center bg-white">
              <Brain className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无思维导图内容</h3>
              <p className="text-gray-500 mb-4">对话内容较少，无法生成有效的思维导图</p>
              <div className="space-x-2">
                <Button onClick={generateMindmap} disabled={isLoading}>
                  <Brain className="h-4 w-4 mr-2" />
                  重新生成
                </Button>
                <Button variant="outline" onClick={goToChat}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  返回对话
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