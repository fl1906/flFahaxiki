'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ExportDialog from '@/components/mindmap/export-dialog'
import KeyboardShortcuts from '@/components/mindmap/keyboard-shortcuts'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { MindmapLayout } from '@/lib/mindmap-layout'
import MarkdownRenderer from '@/components/ui/markdown-renderer'
import {
  Brain,
  Save,
  Download,
  Share2,
  MessageSquare,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  Keyboard,
  User,
  Bot,
  Plus,
  Trash2,
  Edit3,
  Move3d,
  RefreshCw,
  GitBranch
} from 'lucide-react'

interface MindmapNode {
  id: string
  text: string
  x: number
  y: number
  children: MindmapNode[]
  color?: string
  associatedMessageId?: string
  hiddenAnswer?: {
    id: string
    content: string
    truncatedContent: string
  }
}


function MindmapPageContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('conversation')

  const [mindmapTitle, setMindmapTitle] = useState('思维导图')
  const [selectedAnswer, setSelectedAnswer] = useState<{ id: string; content: string; truncatedContent: string } | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>('')
  const [zoom, setZoom] = useState(1)
  const [mindmapData, setMindmapData] = useState<MindmapNode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal')
  const [branches, setBranches] = useState<any[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)

  // 重新生成回复相关状态
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  const [selectedRegenerateModel, setSelectedRegenerateModel] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenerationError, setRegenerationError] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)

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

  // 查找包含指定回答的问题节点
  const findQuestionNodeByAnswerId = (answerId: string): any => {
    if (!mindmapData) return null

    const findNodeWithAnswer = (node: any): any => {
      if (node.hiddenAnswer && node.hiddenAnswer.id === answerId) {
        return node
      }
      if (node.children) {
        for (const child of node.children) {
          const found = findNodeWithAnswer(child)
          if (found) return found
        }
      }
      return null
    }

    return findNodeWithAnswer(mindmapData)
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
      // Escape: 取消选择对话详情
      else if (e.key === 'Escape' && selectedAnswer) {
        setSelectedAnswer(null)
      }
      // 方向键：微调画布位置
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // 只有在没有聚焦输入框时才响应方向键
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          const step = e.shiftKey ? 50 : 20 // Shift + 方向键快速移动

          setCanvasOffset(prev => {
            switch (e.key) {
              case 'ArrowUp':
                return { ...prev, y: prev.y + step }
              case 'ArrowDown':
                return { ...prev, y: prev.y - step }
              case 'ArrowLeft':
                return { ...prev, x: prev.x + step }
              case 'ArrowRight':
                return { ...prev, x: prev.x - step }
              default:
                return prev
            }
          })
        }
      }
      // 空格键 + Ctrl/Cmd: 重置画布
      else if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
        e.preventDefault()
        handleResetCanvas()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAnswer, mindmapData, conversationId, mindmapTitle])

  // 获取可用模型
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setModelsLoading(true)
        const response = await fetch('/api/models')
        if (response.ok) {
          const data = await response.json()
          setAvailableModels(data.models || [])

          // 如果有模型且未选择，自动选择第一个
          if (data.models && data.models.length > 0 && !selectedRegenerateModel) {
            setSelectedRegenerateModel(data.models[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch AI models:', error)
        toast.error('获取模型列表失败')
      } finally {
        setModelsLoading(false)
      }
    }

    fetchModels()
  }, [selectedRegenerateModel])

  // 重新生成回复处理函数
  const handleRegenerateResponse = async () => {
    if (!selectedRegenerateModel || !selectedAnswer || !conversationId) {
      toast.error('缺少必要信息，无法重新生成')
      return
    }

    setIsRegenerating(true)
    setRegenerationError(null)

    try {
      // 获取问题节点
      const questionNode = findQuestionNodeByAnswerId(selectedAnswer.id)
      if (!questionNode) {
        throw new Error('未找到对应的问题内容')
      }

      const questionText = questionNode.text.replace(/^问题\d+: /, '')

      // 获取选中的模型信息
      const selectedModelData = availableModels.find(model => model.id === selectedRegenerateModel)
      if (!selectedModelData) {
        throw new Error('所选模型不存在')
      }

      // 调用AI API重新生成回复
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': document.cookie // 发送身份验证cookie
        },
        credentials: 'include', // 包含credentials以发送cookie
        body: JSON.stringify({
          message: questionText,
          modelId: selectedRegenerateModel,
          modelEndpoint: selectedModelData.endpoint,
          modelName: selectedModelData.model,
          conversationId,
          isRegeneration: true,
          messageIdToUpdate: selectedAnswer.id
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '重新生成失败')
      }

      const data = await response.json()
      const newAnswer = data.response
      const newMessageId = data.newMessageId

      if (!newAnswer) {
        throw new Error('AI返回了无效的回复')
      }

      // 更新思维导图数据
      const updatedMindmapData = updateNodeAnswer(selectedAnswer.id, newAnswer, newMessageId)
      setMindmapData(updatedMindmapData)

      // 更新选中的回答
      setSelectedAnswer({
        id: newMessageId || selectedAnswer.id,
        content: newAnswer,
        truncatedContent: newAnswer.substring(0, 200) + (newAnswer.length > 200 ? '...' : '')
      })

      setRegenerateDialogOpen(false)
      toast.success('回复已重新生成')

    } catch (error) {
      console.error('重新生成失败:', error)
      const errorMessage = error instanceof Error ? error.message : '重新生成失败，请稍后重试'
      setRegenerationError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsRegenerating(false)
    }
  }

  // 更新节点回答内容
  const updateNodeAnswer = (answerId: string, newAnswer: string, newMessageId?: string): MindmapNode => {
    const updateNode = (node: MindmapNode): MindmapNode => {
      if (node.hiddenAnswer && node.hiddenAnswer.id === answerId) {
        return {
          ...node,
          hiddenAnswer: {
            ...node.hiddenAnswer,
            id: newMessageId || node.hiddenAnswer.id,
            content: newAnswer,
            truncatedContent: newAnswer.substring(0, 200) + (newAnswer.length > 200 ? '...' : '')
          }
        }
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNode)
        }
      }
      return node
    }
    return updateNode(mindmapData || defaultMindmapData)
  }

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

  const handleResetCanvas = () => {
    setCanvasOffset({ x: 0, y: 0 })
    setZoom(1)
    toast.success('画布位置已重置')
  }

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId)

    // 如果点击的是问题节点且有隐藏的回答，显示回答
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

    const clickedNode = mindmapData ? findNode(mindmapData) : null
    if (clickedNode && clickedNode.hiddenAnswer) {
      setSelectedAnswer(clickedNode.hiddenAnswer)
    } else {
      setSelectedAnswer(null)
    }
  }

  const handleNodeEditCancel = () => {
    setEditingNode(null)
    setEditingText('')
  }

  const deleteNode = (node: MindmapNode, nodeIdToDelete: string): MindmapNode => {
    if (node.id === nodeIdToDelete) {
      // Don't delete root node
      if (node.id === 'root') {
        toast.error(t('mindmap.cannotDeleteRootNode'))
        return node
      }
      // Return null to indicate node should be removed
      return null as any
    }

    if (node.children) {
      const filteredChildren = node.children
        .map(child => deleteNode(child, nodeIdToDelete))
        .filter(child => child !== null) as MindmapNode[]

      return { ...node, children: filteredChildren }
    }

    return node
  }

  const handleDeleteNode = () => {
    if (!selectedNode || !mindmapData) {
      toast.error(t('mindmap.pleaseSelectNodeToDelete'))
      return
    }

    const clickedNode = mindmapData ? findNode(mindmapData) : null
    if (selectedNode === 'root') {
      toast.error(t('mindmap.cannotDeleteRootNode'))
      return
    }

    // 如果点击的是问题节点且有隐藏的回答，显示回答
    if (clickedNode && clickedNode.hiddenAnswer) {
      setSelectedAnswer(clickedNode.hiddenAnswer)
    } else {
      setSelectedAnswer(null)
    }

    const updatedMindmapData = deleteNode(mindmapData, selectedNode)
    setMindmapData(updatedMindmapData)
    setSelectedNode(null)
    toast.success(t('mindmap.nodeDeleteSuccess'))
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

  const handleMouseUp = () => {
    setIsDraggingCanvas(false)
    // 恢复鼠标样式
    document.body.style.cursor = 'default'
  }

  const handleCreateBranch = async () => {
    if (!selectedNode || !mindmapData || !conversationId) {
      toast.error('请选择一个节点来创建分支')
      return
    }

    if (selectedNode === 'root') {
      toast.error('不能从根节点创建分支')
      return
    }

    // 找到选中的节点
    const findSelectedNode = (node: MindmapNode): MindmapNode | null => {
      if (node.id === selectedNode) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findSelectedNode(child)
          if (found) return found
        }
      }
      return null
    }

    const selectedNodeData = findSelectedNode(mindmapData)
    if (!selectedNodeData) {
      toast.error('找不到选中的节点')
      return
    }

    try {
      const response = await fetch('/api/conversations/branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          parentMessageId: selectedNode,
          branchTitle: `分支: ${selectedNodeData.text.substring(0, 20)}...`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '创建分支失败')
      }

      const data = await response.json()
      toast.success('分支创建成功')

      // 跳转到新分支的对话页面
      window.location.href = `/chat?conversation=${data.branchConversation.id}`

    } catch (error) {
      console.error('创建分支失败:', error)
      toast.error(error instanceof Error ? error.message : '创建分支失败')
    }
  }

  // 背景拖拽处理函数
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // 只有当点击在空白区域时才触发背景拖拽
    const target = e.target as HTMLElement
    if (target === e.currentTarget ||
        target.classList.contains('canvas-container') ||
        target.closest('.canvas-container') === e.currentTarget) {
      setIsDraggingCanvas(true)
      setDragStartCanvas({
        x: e.clientX,
        y: e.clientY,
        offsetX: canvasOffset.x,
        offsetY: canvasOffset.y
      })
      // 改变鼠标样式为抓取状态
      document.body.style.cursor = 'grabbing'
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
      e.preventDefault()
    }
  }

  const toggleLayoutMode = () => {
    if (!mindmapData) return

    const newMode = layoutMode === 'horizontal' ? 'vertical' : 'horizontal'
    const updatedData = newMode === 'horizontal'
      ? MindmapLayout.applyTreeLayout(mindmapData)
      : MindmapLayout.applyVerticalTreeLayout(mindmapData)

    setMindmapData(updatedData)
    setLayoutMode(newMode)
    toast.success(`切换到${newMode === 'horizontal' ? '水平' : '垂直'}布局`)
  }

  const updateNodeText = (nodeId: string, newText: string): MindmapNode => {
    const updateNode = (node: MindmapNode): MindmapNode => {
      if (node.id === nodeId) {
        return { ...node, text: newText }
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNode)
        }
      }
      return node
    }
    return updateNode(mindmapData || defaultMindmapData)
  }

  const renderConnectionLines = (node: MindmapNode): JSX.Element[] => {
    const lines: JSX.Element[] = []
    const children = node.children || []

    // 为每个子节点绘制连接线
    children.forEach((child) => {
      const startX = node.x * zoom
      const startY = node.y * zoom
      const endX = child.x * zoom
      const endY = child.y * zoom

      lines.push(
        <line
          key={`line-${node.id}-${child.id}`}
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#3b82f6"
          strokeWidth="3"
          className="transition-all hover:stroke-blue-600"
        />
      )

      // 递归处理子节点的连接线
      lines.push(...renderConnectionLines(child))
    })

    return lines
  }

  const renderNode = (node: MindmapNode, level: number = 0) => {
    const children = node.children || []

    return (
      <div key={node.id}>
        <div
          className={`absolute rounded-xl shadow-lg border-2 flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
            selectedNode === node.id ? 'ring-3 ring-blue-400 ring-opacity-50' : ''
          }`}
          style={{
            left: `${node.x * zoom - 100}px`,
            top: `${node.y * zoom - 45}px`,
            width: '200px',
            height: '90px',
            zIndex: 10 - level,
            backgroundColor: level === 0 ? '#dbeafe' : '#dcfce7',
            borderColor: level === 0 ? '#3b82f6' : '#10b981',
            boxShadow: level === 0 ? '0 4px 20px rgba(59, 130, 246, 0.3)' : '0 4px 15px rgba(16, 185, 129, 0.2)',
          }}
          onClick={() => handleNodeClick(node.id)}
        >
          <div className="flex flex-col items-center gap-2 h-full justify-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${
              level === 0 ? 'bg-blue-500' : 'bg-green-500'
            }`}>
              {level === 0 ? '根' : 'Q'}
            </div>
            <span className="text-sm font-semibold leading-tight text-center break-words max-w-full text-gray-800 line-clamp-2">
              {node.text}
            </span>
            {node.hiddenAnswer && level > 0 && (
              <div className="text-xs text-blue-500 font-medium">💬 点击查看回答</div>
            )}
          </div>
        </div>
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

  // 定位到聊天页面的消息
  const locateToMessage = (messageId: string, forceRefresh: boolean = false) => {
    // 跳转到聊天页面并定位到指定消息
    if (conversationId) {
      const refreshParam = forceRefresh ? '&refresh=true' : ''
      window.location.href = `/chat?conversation=${conversationId}&highlight=${messageId}${refreshParam}`
    } else {
      window.location.href = '/chat'
    }
  }

  const getNodeAssociatedMessage = (node: any): string | null => {
    if (!mindmapData || !node.associatedMessageId) return null

    const findNodeById = (nodeId: string, node: MindmapNode): MindmapNode | null => {
      if (!node) return null
      if (node.id === nodeId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNodeById(nodeId, child)
          if (found) return found
        }
      }
      return null
    }
    return findNodeById(node.associatedMessageId, mindmapData)
  }

  const handleContinueConversation = () => {
    const messageId = getNodeAssociatedMessage(selectedNode)
    const url = messageId
      ? `/chat?conversation=${conversationId}&continueFrom=${messageId}`
      : `/chat?conversation=${conversationId}&continueFrom=${selectedNode}`

    window.location.href = url
    toast.success(t('mindmap.extendingConversation'))
  }

  // 主组件返回语句
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
              <Button variant="ghost" size="sm" onClick={handleResetZoom} title="重置缩放">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResetCanvas} title="重置画布位置">
                <Move3d className="h-4 w-4" />
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

            <Separator orientation="vertical" className="h-6" />

            {/* <Button variant="outline" size="sm" onClick={handleCreateBranch} disabled={!selectedNode || selectedNode === 'root' || !selectedNode.startsWith('cm')}>
              <GitBranch className="h-4 w-4 mr-2" />
              创建分支
            </Button> */}

            <Separator orientation="vertical" className="h-6" />

            <Button variant="outline" size="sm" onClick={handleCreateBranch} disabled={!selectedNode || selectedNode === 'root' || !selectedNode.startsWith('cm')}>
              <GitBranch className="h-4 w-4 mr-2" />
              创建分支
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button variant="outline" size="sm" onClick={toggleLayoutMode}>
              <Brain className="h-4 w-4 mr-2" />
              {layoutMode === 'horizontal' ? '水平树形' : '垂直树形'}
            </Button>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="flex items-center">
              <Move3d className="h-4 w-4 mr-1" />
              思维导图浏览模式 (拖动空白区域移动画布)
            </span>
            {selectedNode && (
              <span>{t('mindmap.nodeSelected')}: {selectedNode}</span>
            )}
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 flex overflow-hidden">
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
              backgroundColor: '#ffffff',
              userSelect: isDraggingCanvas ? 'none' : 'auto'
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
                {/* SVG层用于绘制连接线 */}
                <svg
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 1 }}
                >
                  {mindmapData && renderConnectionLines(mindmapData)}
                </svg>

                {/* 节点层 */}
                <div id="mindmap-canvas" className="min-w-[1200px] min-h-[800px]" style={{ position: 'relative', zIndex: 2 }}>
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

          {/* 右侧对话详情面板 */}
          {selectedAnswer && (
            <div className="w-[450px] border-l bg-white flex flex-col">
              {/* 头部 */}
              <div className="flex items-center justify-between p-6 pb-4 border-b flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">对话详情</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAnswer(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>

              {/* 对话内容区域 - 可滚动 */}
              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  const questionNode = findQuestionNodeByAnswerId(selectedAnswer.id)
                  if (!questionNode) {
                    return (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500">未找到对应的问题内容</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-6">
                      {/* 用户问题 */}
                      <div className="flex items-start space-x-4 justify-end">
                        <div className="max-w-sm lg:max-w-md">
                          <div
                            className="rounded-2xl bg-blue-500 text-white px-5 py-3 shadow-sm"
                          >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {questionNode.text.replace(/^问题\d+: /, '')}
                            </p>
                            <p className="text-xs mt-2 text-blue-100 opacity-80">
                              用户提问
                            </p>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>

                      {/* AI回答 */}
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Bot className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 px-5 py-4 shadow-sm">
                            <div className="ai-answer-content prose prose-sm max-w-none">
                              <MarkdownRenderer
                                content={selectedAnswer.content}
                                className="text-gray-900 dark:text-gray-100"
                              />
                            </div>
                            <p className="text-xs mt-3 text-gray-500">
                              AI 回答
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 操作区域 */}
                <div className="space-y-4 mt-8">
                  <Separator />

                  {/* 快捷操作 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3">快捷操作</label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start h-10"
                        onClick={() => {
                          if (selectedAnswer?.id) {
                            locateToMessage(selectedAnswer.id, true)
                          }
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        定位到聊天位置
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start h-10"
                        onClick={() => {
                          const questionNode = findQuestionNodeByAnswerId(selectedAnswer.id)
                          if (questionNode) {
                            const questionText = questionNode.text.replace(/^问题\d+: /, '')
                            const fullConversation = `问题：${questionText}\n\n回答：${selectedAnswer.content}`
                            navigator.clipboard.writeText(fullConversation).then(() => {
                              toast.success('对话内容已复制到剪贴板')
                            }).catch(() => {
                              toast.error('复制失败')
                            })
                          }
                        }}
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2m-6-6v.01V4m0 14v.01M0 4h.01" />
                        </svg>
                        复制对话内容
                      </Button>
                    </div>

                    {/* 重新生成回复按钮 */}
                    <div className="mt-3">
                      <Button
                        variant="default"
                        size="sm"
                        className="justify-start h-10 w-full"
                        onClick={() => setRegenerateDialogOpen(true)}
                        disabled={isRegenerating}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                        {isRegenerating ? '正在重新生成...' : '重新生成回复'}
                      </Button>
                    </div>
                  </div>

                  {/* 统计信息 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3">对话统计</label>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {(() => {
                            const questionNode = findQuestionNodeByAnswerId(selectedAnswer.id)
                            return questionNode ? questionNode.text.replace(/^问题\d+: /, '').length : 0
                          })()}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">问题字符</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedAnswer.content.length}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">回答字符</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {(() => {
                            const questionNode = findQuestionNodeByAnswerId(selectedAnswer.id)
                            const questionLength = questionNode ? questionNode.text.replace(/^问题\d+: /, '').length : 0
                            return questionLength + selectedAnswer.content.length
                          })()}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">总字符</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 重新生成回复对话框 */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>选择模型重新生成回复</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">问题内容</label>
              <div className="p-3 bg-gray-50 rounded-md text-sm">
                {(() => {
                  const questionNode = findQuestionNodeByAnswerId(selectedAnswer?.id || '')
                  return questionNode ? questionNode.text.replace(/^问题\d+: /, '') : '未找到问题'
                })()}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">选择AI模型</label>
              <Select value={selectedRegenerateModel} onValueChange={setSelectedRegenerateModel}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择AI模型" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {regenerationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {regenerationError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRegenerateDialogOpen(false)
                setRegenerationError(null)
              }}
              disabled={isRegenerating}
            >
              取消
            </Button>
            <Button
              onClick={handleRegenerateResponse}
              disabled={!selectedRegenerateModel || isRegenerating}
            >
              {isRegenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认重新生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

export default function MindmapPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <MindmapPageContent />
    </Suspense>
  )
}
