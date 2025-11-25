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
import { useLanguage } from '@/contexts/LanguageContext'

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
  const { t } = useLanguage()
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
    alert(t('history.exportFeatureInDevelopment'))
  }

  // 批量删除对话
  const handleDelete = async () => {
    if (selectedConversations.length === 0) {
      alert(t('history.pleaseSelectConversationsToDelete'))
      return
    }

    const confirmed = confirm(t('history.confirmDelete').replace('${count}', selectedConversations.length.toString()))
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
        alert(t('history.deleteFailed').replace('${error}', error.error))
      }
    } catch (error) {
      console.error('删除对话错误:', error)
      alert(t('history.deleteError'))
    } finally {
      setDeleting(false)
    }
  }

  // 单个删除对话
  const handleSingleDelete = async (id: string, title: string) => {
    const confirmed = confirm(t('history.confirmDeleteSingle').replace('${title}', title))
    if (!confirmed) return

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert(t('history.conversationDeleteSuccess'))
        // 重新获取对话列表
        fetchConversations()
      } else {
        const error = await response.json()
        alert(t('history.deleteFailed').replace('${error}', error.error))
      }
    } catch (error) {
      console.error('删除对话错误:', error)
      alert(t('history.deleteError'))
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
    
    if (days === 0) return t('history.today')
    if (days === 1) return t('history.yesterday')
    if (days < 7) return t('history.xDaysAgo').replace('${days}', days.toString())
    return formatDate(date)
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* 页面头部 */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('history.title')}</h1>
            <p className="text-gray-600">{t('history.subtitle')}</p>
          </div>

          <Button onClick={() => window.location.href = '/chat'}>
            <Plus className="h-4 w-4 mr-2" />
            {t('history.newConversation')}
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('history.searchConversation')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>

            {/* 模型筛选 */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('history.selectModel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allModels')}</SelectItem>
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
                <SelectItem value="time">{t('history.sortByTime')}</SelectItem>
                <SelectItem value="title">{t('history.sortByTitle')}</SelectItem>
                <SelectItem value="messages">{t('history.sortByMessages')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 批量操作 */}
          {selectedConversations.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {t('history.selectedItems').replace('${count}', selectedConversations.length.toString())}
              </span>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                {t('history.export')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {t('history.delete')}
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
                    <TableHead>{t('history.conversationTitle')}</TableHead>
                    <TableHead>{t('history.usedModel')}</TableHead>
                    <TableHead>{t('history.startTime')}</TableHead>
                    <TableHead>{t('history.messageCount')}</TableHead>
                    <TableHead>{t('history.mindmap')}</TableHead>
                    <TableHead className="w-20">{t('history.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mr-3" />
                          {t('history.loadingConversations')}
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
                            <span className="text-sm">{t('history.has')}</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">{t('history.none')}</span>
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
                              {t('history.viewConversation')}
                            </DropdownMenuItem>
                            {conversation.hasMindmap && (
                              <DropdownMenuItem onClick={() => handleViewMindmap(conversation.id)}>
                                <Brain className="h-4 w-4 mr-2" />
                                {t('history.viewMindmap')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              {t('history.exportConversation')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="h-4 w-4 mr-2" />
                              {t('history.shareConversation')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleSingleDelete(conversation.id, conversation.title)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('history.deleteConversation')}
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('history.noConversationRecords')}</h3>
                  <p className="text-gray-500 mb-4">{t('history.startFirstConversation')}</p>
                  <Button onClick={() => window.location.href = '/chat'}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('history.startConversation')}
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