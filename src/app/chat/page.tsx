'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import MarkdownRenderer from '@/components/ui/markdown-renderer'
import MarkdownThemeSelector from '@/components/ui/markdown-theme-selector'
import CollapsibleSidebar from '@/components/mindmap/collapsible-sidebar'
import {
  Send,
  Brain,
  Settings,
  Plus,
  MessageSquare,
  User,
  Bot,
  Trash2,
  Save
} from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface AIModel {
  id: string
  name: string
  model: string
  endpoint: string
  description?: string
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const conversationParamId = searchParams.get('conversation')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')
  const [conversationId, setConversationId] = useState<string>('')
  const [conversationTitle, setConversationTitle] = useState('新对话')
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [mindmapData, setMindmapData] = useState<MindmapData | null>(null)
  const [isGeneratingMindmap, setIsGeneratingMindmap] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [mindmapVisible, setMindmapVisible] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 获取用户AI模型列表
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models')
        if (response.ok) {
          const data = await response.json()
          setAvailableModels(data.models || [])
          
          // 如果有模型且未选择模型，自动选择第一个
          if (data.models && data.models.length > 0 && !selectedModel) {
            setSelectedModel(data.models[0].id)
          }
        }
      } catch (error) {
        console.error('获取AI模型失败:', error)
      } finally {
        setModelsLoading(false)
      }
    }

    fetchModels()
  }, [selectedModel])

  // 加载历史对话
  useEffect(() => {
    if (conversationParamId) {
      loadConversation(conversationParamId)
    }
  }, [conversationParamId])

  const loadConversation = async (id: string) => {
    try {
      setIsLoadingConversation(true)
      const response = await fetch(`/api/conversations/${id}`)

      if (response.ok) {
        const data = await response.json()

        // 设置对话信息
        setConversationId(data.conversation.id)
        setConversationTitle(data.conversation.title)

        // 设置选择的模型
        if (data.conversation.modelId) {
          setSelectedModel(data.conversation.modelId)
        }

        // 加载消息历史
        if (data.messages && data.messages.length > 0) {
          const loadedMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id,
            type: msg.senderType === 'user' ? 'user' : 'ai',
            content: msg.content,
            timestamp: new Date(msg.timestamp)
          }))
          setMessages(loadedMessages)
        }
      } else {
        console.error('加载对话失败')
      }
    } catch (error) {
      console.error('加载对话错误:', error)
    } finally {
      setIsLoadingConversation(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedModel) return

      // 如果没有对话ID，创建新对话
    let currentConversationId = conversationId
    if (!currentConversationId) {
      currentConversationId = await createConversation(input.substring(0, 20) + (input.length > 20 ? '...' : ''))
      setConversationId(currentConversationId)

      // 更新URL参数，确保页面刷新时能保持对话状态
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.set('conversation', currentConversationId)
      window.history.replaceState({}, '', newUrl.toString())
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // 获取选中的模型信息
      const selectedModelData = availableModels.find(model => model.id === selectedModel)

      // 调用AI API
      const aiResponse = await callAIAPI(input, selectedModelData, currentConversationId)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      // 如果是第一条消息，更新对话标题
      if (messages.length === 0) {
        const newTitle = input.substring(0, 20) + (input.length > 20 ? '...' : '')
        setConversationTitle(newTitle)

        // 保存标题到数据库
        await updateConversationTitle(currentConversationId, newTitle)
      }
    } catch (error) {
      console.error('发送消息错误:', error)

      // 添加错误消息，根据不同错误类型提供具体的解决方案
      let errorContent = '抱歉，发送消息时出现错误。请检查您的网络连接和AI模型配置。'

      if (error instanceof Error) {
        if (error.message.includes('模型配置错误')) {
          errorContent = `模型配置错误：${error.message}

请尝试以下解决方案：
1. 在设置中检查AI模型配置是否正确
2. 确认模型名称与AI服务商支持的模型一致
3. 检查API端点是否可访问
4. 验证API密钥是否有效

点击右上角的"设置"按钮前往配置页面。`
        } else if (error.message.includes('缺少有效的API密钥')) {
          errorContent = `API密钥配置错误：${error.message}

请在设置中为该模型配置有效的API密钥：
1. 点击右上角"设置"按钮
2. 在"AI模型"选项卡中编辑对应模型
3. 填入有效的API密钥
4. 保存配置后重试`
        } else if (error.message.includes('AI服务错误')) {
          errorContent = `AI服务错误：${error.message}

这可能是由于：
1. AI服务商暂时不可用
2. 模型名称配置错误
3. API端点配置错误

请稍后重试，或检查模型配置。`
        } else {
          errorContent = `错误：${error.message}

请检查网络连接并重试，如果问题持续存在，请检查AI模型配置。`
        }
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: errorContent,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const createConversation = async (title: string): Promise<string> => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          modelId: selectedModel,
        }),
      })

      if (!response.ok) {
        throw new Error('创建对话失败')
      }

      const data = await response.json()
      return data.conversation.id
    } catch (error) {
      console.error('创建对话失败:', error)
      // 如果创建失败，生成临时ID
      return `temp_${Date.now()}`
    }
  }

  const updateConversationTitle = async (conversationId: string, title: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      })

      if (!response.ok) {
        console.error('更新对话标题失败')
      }
    } catch (error) {
      console.error('更新对话标题错误:', error)
    }
  }

  const callAIAPI = async (userInput: string, modelData?: AIModel, conversationId?: string): Promise<string> => {
    if (!modelData) {
      throw new Error('未选择AI模型')
    }

    // 调用后端API来处理AI请求
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          modelId: selectedModel,
          modelEndpoint: modelData.endpoint,
          modelName: modelData.model, // 发送实际的模型名称
          conversationId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'AI服务响应错误'

        // 根据错误类型提供不同的处理
        if (errorData.code === 'MODEL_NOT_AVAILABLE' || errorData.code === 'AI_SERVICE_ERROR') {
          throw new Error(errorMessage)
        } else if (errorData.code === 'MISSING_API_KEY') {
          throw new Error('该模型缺少有效的API密钥，请在设置中配置')
        } else {
          throw new Error(errorMessage)
        }
      }

      const data = await response.json()
      return data.response || '抱歉，我无法回答这个问题。'
    } catch (error) {
      // 如果是模型配置错误，直接显示错误信息
      if (error instanceof Error && (
        error.message.includes('模型配置错误') ||
        error.message.includes('缺少有效的API密钥') ||
        error.message.includes('AI服务错误')
      )) {
        throw error
      }

      // 其他错误，返回模拟回复
      return `我理解您关于"${userInput}"的问题。让我为您详细分析一下这个话题...

首先，我们需要明确核心概念。其次，要考虑实际应用场景。最后，还要注意可能的限制和挑战。

您希望我进一步详细解释哪个方面呢？`
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearConversation = () => {
    setMessages([])
    setConversationTitle('新对话')
    setConversationId('')

    // 清理URL参数
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('conversation')
    window.history.replaceState({}, '', newUrl.toString())
  }

  const openMindmap = async () => {
    if (!conversationId) {
      alert('请先开始对话')
      return
    }

    try {
      // 生成思维导图
      const response = await fetch('/api/mindmap/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
        title: conversationTitle
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // 跳转到思维导图页面
        window.location.href = `/mindmap?conversation=${conversationId}`
      } else {
        const errorData = await response.json()
        alert(`生成思维导图失败: ${errorData.error}`)
      }
    } catch (error) {
      console.error('生成思维导图错误:', error)
      alert('生成思维导图失败，请稍后重试')
    }
  }

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* 主对话区域 */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          messages.length > 0 ? 'mr-0' : 'mr-0'
        }`}>
          {/* 对话头部 */}
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex items-center space-x-4">
              <Input
                value={conversationTitle}
                onChange={(e) => setConversationTitle(e.target.value)}
                onBlur={() => {
                  if (conversationId && conversationTitle.trim()) {
                    updateConversationTitle(conversationId, conversationTitle.trim())
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
                placeholder="对话标题"
              />
              <Badge variant="secondary">{messages.length} 条消息</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={modelsLoading}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={modelsLoading ? "加载模型中..." : "选择AI模型"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.length === 0 ? (
                    <SelectItem value="no-models" disabled>
                      暂无可用模型
                    </SelectItem>
                  ) : (
                    availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <MarkdownThemeSelector />

              <Button variant="outline" size="sm" onClick={openMindmap}>
                <Brain className="h-4 w-4 mr-2" />
                思维导图
              </Button>

              <Button variant="outline" size="sm" onClick={clearConversation}>
                <Trash2 className="h-4 w-4 mr-2" />
                清空
              </Button>
            </div>
          </div>

          {/* 消息区域 */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {isLoadingConversation ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">加载对话中...</h3>
                    <p className="text-gray-500">正在加载历史对话内容</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {conversationParamId ? '对话不存在' : '开始新对话'}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {conversationParamId
                        ? '请检查对话链接或返回历史页面'
                        : availableModels.length === 0
                          ? "请先在设置中添加AI模型"
                          : "选择AI模型并输入您的问题开始对话"
                      }
                    </p>
                    {conversationParamId && (
                      <Button onClick={() => window.location.href = '/history'}>
                        返回历史对话
                      </Button>
                    )}
                    {!conversationParamId && availableModels.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {['你好，请介绍一下自己', '帮我分析一下这个需求', '我需要一些编程建议'].map((suggestion) => (
                          <Button
                            key={suggestion}
                            variant="outline"
                            size="sm"
                            onClick={() => setInput(suggestion)}
                            disabled={!selectedModel}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                    {!conversationParamId && availableModels.length === 0 && (
                      <Button onClick={() => window.location.href = '/settings'}>
                        <Settings className="h-4 w-4 mr-2" />
                        前往设置添加模型
                      </Button>
                    )}
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-3 ${
                        message.type === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.type === 'ai' && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-blue-600" />
                        </div>
                      )}

                      <div
                        className={`max-w-3xl rounded-lg p-4 ${
                          message.type === 'user'
                            ? 'bg-blue-500 text-white ml-auto'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {message.type === 'ai' ? (
                          <MarkdownRenderer
                            content={message.content}
                            className="ai-message-content"
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                        <p className={`text-xs mt-2 ${
                          message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>

                      {message.type === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* 输入区域 */}
          <div className="border-t bg-white p-4">
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    availableModels.length === 0
                      ? "请先在设置中添加AI模型"
                      : selectedModel
                        ? "输入您的问题..."
                        : "请先选择AI模型"
                  }
                  disabled={isLoading || availableModels.length === 0}
                  className="min-h-[40px]"
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading || !selectedModel || availableModels.length === 0}
                size="icon"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 右侧思维导图侧边栏 */}
        {messages.length > 0 && (
          <div className="border-l border-gray-200 dark:border-gray-700">
            <CollapsibleSidebar
              messages={messages}
              conversationId={conversationId}
              className="h-full"
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}