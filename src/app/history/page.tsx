'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Filter,
  Plus,
  Download,
  Share2,
  Trash2,
  Eye,
  MessageSquare,
  Brain,
  Calendar,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Conversation {
  id: string
  title: string
  model: string
  startTime: Date
  messageCount: number
  hasMindmap: boolean
}

interface AIModel {
  id: string
  modelName: string
}

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModel, setSelectedModel] = useState('all')
  const [selectedConversations, setSelectedConversations] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('time')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // 获取对话列表
  useEffect(() => {
    fetchConversations()
    fetchModels()
  }, [searchTerm, selectedModel, sortBy])

  const fetchConversations = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedModel !== 'all') params.append('modelId', selectedModel)
      if (sortBy) params.append('sortBy', sortBy)

      const response = await fetch(`/api/conversations?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        // 转换字符串日期为Date对象
        const formattedConversations = data.conversations.map((conv: any) => ({
          ...conv,
          startTime: new Date(conv.startTime)
        }))
        setConversations(formattedConversations)
      }
    } catch (error) {
      console.error('获取对话列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models')
      if (response.ok) {
        const data = await response.json()
        setAvailableModels(data.models || [])
      }
    } catch (error) {
      console.error('获取模型列表失败:', error)
    }
  }

  // 过滤逻辑现在在API端处理，这里直接使用conversations

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedConversations(conversations.map(conv => conv.id))
    } else {
      setSelectedConversations([])
    }
  }

  const handleSelectConversation = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedConversations(prev => [...prev, id])
    } else {
      setSelectedConversations(prev => prev.filter(convId => convId !== id))
    }
  }

  const handleViewConversation = (id: string) => {
    // 跳转到对话页面
    window.location.href = `/chat?conversation=${id}`
  }

  const handleViewMindmap = (id: string) => {
    // 跳转到思维导图页面
    window.location.href = `/mindmap?conversation=${id}`
  }

  const handleExport = () => {
    alert(`导出功能开发中...`)
  }

  // 批量删除对话
  const handleDelete = async () => {
    if (selectedConversations.length === 0) {
      alert('请先选择要删除的对话')
      return
    }

    const confirmed = confirm(`确定要删除选中的 ${selectedConversations.length} 个对话吗？此操作无法撤销，对话内容和相关思维导图将被永久删除。`)
    if (!confirmed) return

    setDeleting(true)
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          conversationIds: selectedConversations
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        setSelectedConversations([])
        // 重新获取对话列表
        fetchConversations()
      } else {
        const error = await response.json()
        alert(`删除失败: ${error.error}`)
      }
    } catch (error) {
      console.error('删除对话错误:', error)
      alert('删除失败，请稍后重试')
    } finally {
      setDeleting(false)
    }
  }

  // 单个删除对话
  const handleSingleDelete = async (id: string, title: string) => {
    const confirmed = confirm(`确定要删除对话"${title}"吗？此操作无法撤销，对话内容和相关思维导图将被永久删除。`)
    if (!confirmed) return

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('对话删除成功')
        // 重新获取对话列表
        fetchConversations()
      } else {
        const error = await response.json()
        alert(`删除失败: ${error.error}`)
      }
    } catch (error) {
      console.error('删除对话错误:', error)
      alert('删除失败，请稍后重试')
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return formatDate(date)
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* 页面头部 */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">历史对话</h1>
            <p className="text-gray-600">管理和查看您的所有对话记录</p>
          </div>
          
          <Button onClick={() => window.location.href = '/chat'}>
            <Plus className="h-4 w-4 mr-2" />
            新建对话
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索对话..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>

            {/* 模型筛选 */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模型</SelectItem>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.modelName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 排序 */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">按时间</SelectItem>
                <SelectItem value="title">按标题</SelectItem>
                <SelectItem value="messages">按消息数</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 批量操作 */}
          {selectedConversations.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                已选择 {selectedConversations.length} 项
              </span>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                删除
              </Button>
            </div>
          )}
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-auto">
          <Card className="m-4">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={conversations.length > 0 && selectedConversations.length === conversations.length}
                        onCheckedChange={handleSelectAll}
                        disabled={conversations.length === 0}
                      />
                    </TableHead>
                    <TableHead>对话标题</TableHead>
                    <TableHead>使用模型</TableHead>
                    <TableHead>开始时间</TableHead>
                    <TableHead>消息数量</TableHead>
                    <TableHead>思维导图</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mr-3" />
                          正在加载对话列表...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : conversations.map((conversation) => (
                    <TableRow key={conversation.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedConversations.includes(conversation.id)}
                          onCheckedChange={(checked) => 
                            handleSelectConversation(conversation.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                          <button
                            onClick={() => handleViewConversation(conversation.id)}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {conversation.title}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{conversation.model}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{getRelativeTime(conversation.startTime)}</div>
                          <div className="text-gray-500">{formatDate(conversation.startTime)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{conversation.messageCount}</span>
                      </TableCell>
                      <TableCell>
                        {conversation.hasMindmap ? (
                          <button
                            onClick={() => handleViewMindmap(conversation.id)}
                            className="flex items-center space-x-1 text-green-600 hover:text-green-800"
                          >
                            <Brain className="h-4 w-4" />
                            <span className="text-sm">有</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">无</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewConversation(conversation.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看对话
                            </DropdownMenuItem>
                            {conversation.hasMindmap && (
                              <DropdownMenuItem onClick={() => handleViewMindmap(conversation.id)}>
                                <Brain className="h-4 w-4 mr-2" />
                                查看思维导图
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              导出对话
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="h-4 w-4 mr-2" />
                              分享对话
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleSingleDelete(conversation.id, conversation.title)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除对话
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 空状态 */}
              {!loading && conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无对话记录</h3>
                  <p className="text-gray-500 mb-4">开始您的第一个AI对话吧</p>
                  <Button onClick={() => window.location.href = '/chat'}>
                    <Plus className="h-4 w-4 mr-2" />
                    开始对话
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}