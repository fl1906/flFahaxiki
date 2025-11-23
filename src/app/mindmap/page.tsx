'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  Loader2
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

  const loadMindmapData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/mindmap/${conversationId}`)

      if (response.ok) {
        const data = await response.json()
        setMindmapData(data.structureData)
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
        setMindmapData(data.mindmap.structureData)
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

  const handleNodeDoubleClick = (nodeId: string) => {
    // 可以打开节点编辑对话框
    alert(`编辑节点: ${nodeId}`)
  }

  const renderNode = (node: MindmapNode, level: number = 0) => {
    const isSelected = selectedNode === node.id
    const nodeSize = level === 0 ? 'w-32 h-16' : level === 1 ? 'w-28 h-14' : 'w-24 h-12'
    const fontSize = level === 0 ? 'text-sm font-semibold' : level === 1 ? 'text-xs' : 'text-xs'

    // 确保 children 是一个数组
    const children = node.children || []

    return (
      <div key={node.id}>
        {/* 连接线 */}
        {children.map((child) => (
          <svg
            key={`line-${node.id}-${child.id}`}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
          >
            <line
              x1={node.x * zoom}
              y1={node.y * zoom}
              x2={child.x * zoom}
              y2={child.y * zoom}
              stroke="#d1d5db"
              strokeWidth="2"
            />
          </svg>
        ))}

        {/* 节点 */}
        <div
          className={`absolute ${nodeSize} ${node.color || 'bg-gray-100'} rounded-lg shadow-md border-2 cursor-pointer transition-all duration-200 flex items-center justify-center text-center p-2 ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'} hover:shadow-lg`}
          style={{
            left: `${node.x * zoom - (level === 0 ? 64 : level === 1 ? 56 : 48)}px`,
            top: `${node.y * zoom - (level === 0 ? 32 : level === 1 ? 28 : 24)}px`,
            zIndex: isSelected ? 10 : 1,
            backgroundColor: node.color ? `${node.color}20` : undefined,
            borderColor: node.color || undefined,
          }}
          onClick={() => handleNodeClick(node.id)}
          onDoubleClick={() => handleNodeDoubleClick(node.id)}
        >
          <span className={`${fontSize} text-gray-800 truncate`}>
            {node.text}
          </span>
        </div>

        {/* 子节点 */}
        {children.map((child) => renderNode(child, level + 1))}
      </div>
    )
  }

  const exportMindmap = () => {
    // 导出功能
    alert('导出功能正在开发中...')
  }

  const shareMindmap = () => {
    // 分享功能
    alert('分享功能正在开发中...')
  }

  const goToChat = () => {
    // 返回对话界面，带上下文参数
    if (conversationId) {
      window.location.href = `/chat?conversation=${conversationId}`
    } else {
      window.location.href = '/chat'
    }
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

            <Button variant="outline" size="sm" onClick={exportMindmap}>
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
            
            <Button variant="outline" size="sm" onClick={shareMindmap}>
              <Share2 className="h-4 w-4 mr-2" />
              分享
            </Button>
            
            <Button variant="outline" size="sm">
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              添加节点
            </Button>
            <Button variant="outline" size="sm" disabled={!selectedNode}>
              删除节点
            </Button>
            <Button variant="outline" size="sm" disabled={!selectedNode}>
              编辑节点
            </Button>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            {selectedNode && (
              <span>已选择节点: {selectedNode}</span>
            )}
          </div>
        </div>

        {/* 思维导图画布 */}
        <div className="flex-1 overflow-hidden bg-gray-50 relative">
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
              {mindmapData && renderNode(mindmapData)}
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
        {selectedNode && (
          <div className="w-80 border-l bg-white p-4">
            <h3 className="font-semibold mb-4">节点信息</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">节点ID</label>
                <p className="text-sm text-gray-600">{selectedNode}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">关联对话</label>
                <p className="text-sm text-gray-600">查看相关对话内容</p>
                <Button variant="outline" size="sm" className="mt-2">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  查看对话
                </Button>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-gray-700">节点操作</label>
                <div className="space-y-2 mt-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    基于此节点延伸对话
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    回溯到此节点
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