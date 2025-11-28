'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import ChatSearchParamsProvider from '@/components/chat-search-params-provider'
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
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import {
  Send,
  Brain,
  Settings,
  Plus,
  MessageSquare,
  User,
  Bot,
  Trash2,
  Save,
  RefreshCw
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

function ChatPageContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const conversationParamId = searchParams.get('conversation')
  const refreshParam = searchParams.get('refresh')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')
  const [conversationId, setConversationId] = useState<string>('')
  const [conversationTitle, setConversationTitle] = useState(t('chat.newConversation'))
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [mindmapData, setMindmapData] = useState<MindmapData | null>(null)
  const [isGeneratingMindmap, setIsGeneratingMindmap] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [mindmapVisible, setMindmapVisible] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [forceRefresh, setForceRefresh] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Helper function to get token from cookies
  const getAuthToken = (): string | null => {
    const cookies = document.cookie.split(';')
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='))
    if (tokenCookie) {
      const tokenValue = tokenCookie.split('=')[1]
      return tokenValue ? decodeURIComponent(tokenValue) : null
    }
    return null
  }

  // Fetch user AI model list
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
        console.error('Failed to fetch AI models:', error)
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
  }, [conversationParamId, refreshParam])

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
        console.error('Failed to load conversation')
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
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
      console.error('Error sending message:', error)

      // 添加错误消息，根据不同错误类型提供具体的解决方案
      let errorContent = t('chat.sendingError')

      if (error instanceof Error) {
        if (error.message.includes('模型配置错误') || error.message.includes('Model configuration error')) {
          errorContent = `${t('chat.modelConfigError')}: ${error.message}

${t('chat.modelConfigErrorSolution')}`
        } else if (error.message.includes('缺少有效的API密钥') || error.message.includes('missing API key')) {
          errorContent = `${t('chat.apiKeyConfigError')}: ${error.message}

${t('chat.apiKeyConfigErrorSolution')}`
        } else if (error.message.includes('AI服务错误') || error.message.includes('AI service error')) {
          errorContent = `${t('chat.aiServiceError')}: ${error.message}

${t('chat.aiServiceErrorSolution')}`
        } else {
          errorContent = `${t('chat.genericError')}: ${error.message}

${t('chat.genericErrorSolution')}`
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
        throw new Error('Failed to create conversation')
      }

      const data = await response.json()
      return data.conversation.id
    } catch (error) {
      console.error('Failed to create conversation:', error)
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
        console.error('Failed to update conversation title')
      }
    } catch (error) {
      console.error('Error updating conversation title:', error)
    }
  }

  const callAIAPI = async (userInput: string, modelData?: AIModel, conversationId?: string): Promise<string> => {
    if (!modelData) {
      throw new Error('No AI model selected')
    }

    // 调用后端API来处理AI请求
    try {
      const token = getAuthToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
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
        const errorMessage = errorData.error || t('chat.aiServiceResponseError')

        // 根据错误类型提供不同的处理
        if (errorData.code === 'MODEL_NOT_AVAILABLE' || errorData.code === 'AI_SERVICE_ERROR') {
          throw new Error(errorMessage)
        } else if (errorData.code === 'MISSING_API_KEY') {
          throw new Error(t('chat.missingApiKey'))
        } else {
          throw new Error(errorMessage)
        }
      }

      const data = await response.json()
      return data.response || t('chat.cannotAnswer')
    } catch (error) {
      // If it's a model configuration error, display error message directly
      if (error instanceof Error && (
        error.message.includes('模型配置错误') || error.message.includes('Model configuration error') ||
        error.message.includes('缺少有效的API密钥') || error.message.includes('missing API key') ||
        error.message.includes('AI服务错误') || error.message.includes('AI service error')
      )) {
        throw error
      }

      // Other errors, return simulated reply
      return `${t('chat.defaultReplyIntro')} "${userInput}"${t('chat.defaultReplyContent')}`
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
    setConversationTitle(t('chat.newConversation'))
    setConversationId('')

    // Clear URL parameters
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('conversation')
    window.history.replaceState({}, '', newUrl.toString())
  }

  const openMindmap = async () => {
    if (!conversationId) {
      alert(t('chat.pleaseStartConversation'))
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
        alert(`${t('chat.generateMindmapError')}: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error generating mindmap:', error)
      alert(t('chat.generateMindmapRetry'))
    }
  }

  // 重新生成回复处理函数
  const handleRegenerateResponse = async (messageId: string) => {
    if (!selectedModel || !conversationId) {
      toast.error(t('chat.missingInfoRegenerate'))
      return
    }

    // 找到当前AI回复和对应的用户消息
    const currentMessageIndex = messages.findIndex(msg => msg.id === messageId)
    if (currentMessageIndex === -1 || messages[currentMessageIndex].type !== 'ai') {
      toast.error(t('chat.regenerateError'))
      return
    }

    // 找到对应用户消息
    const userMessage = messages[currentMessageIndex - 1]
    if (!userMessage || userMessage.type !== 'user') {
      toast.error(t('chat.regenerateError'))
      return
    }

    setIsRegenerating(true)
    setRegeneratingMessageId(messageId)

    try {
      // 获取选中的模型信息
      const selectedModelData = availableModels.find(model => model.id === selectedModel)
      if (!selectedModelData) {
        throw new Error('所选模型不存在')
      }

      // 调用AI API重新生成回复
      const token = getAuthToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage.content,
          modelId: selectedModel,
          modelEndpoint: selectedModelData.endpoint,
          modelName: selectedModelData.model,
          conversationId,
          isRegeneration: true,
          messageIdToUpdate: messageId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('errorData is',errorData)
        throw new Error(errorData.error || t('chat.regenerateError'))
      }

      const data = await response.json()

      // 更新消息列表中的AI回复
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              content: data.response,
              timestamp: new Date()
            }
          : msg
      ))

      toast.success(t('chat.regenerateSuccess'))
    } catch (error) {
      console.error('重新生成失败:', error)
      const errorMessage = error instanceof Error ? error.message : t('chat.regenerateError')
      toast.error(errorMessage)
    } finally {
      setIsRegenerating(false)
      setRegeneratingMessageId(null)
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
                placeholder={t('chat.conversationTitle')}
              />
              <Badge variant="secondary">{messages.length} {t('chat.messages')}</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={modelsLoading}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={modelsLoading ? t('chat.loadingModels') : t('chat.selectAIModel')} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.length === 0 ? (
                    <SelectItem value="no-models" disabled>
                      {t('chat.noAvailableModels')}
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
                {t('chat.mindmap')}
              </Button>

              <Button variant="outline" size="sm" onClick={clearConversation}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('chat.clear')}
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('chat.loadingConversation')}</h3>
                    <p className="text-gray-500">{t('chat.loadingConversationContent')}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {conversationParamId ? t('chat.conversationNotFound') : t('chat.startNewConversation')}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {conversationParamId
                        ? t('chat.checkConversationLink')
                        : availableModels.length === 0
                          ? t('chat.addAIModelFirst')
                          : t('chat.selectModelAndStart')
                      }
                    </p>
                    {conversationParamId && (
                      <Button onClick={() => window.location.href = '/history'}>
                        {t('chat.returnToHistory')}
                      </Button>
                    )}
                    {!conversationParamId && availableModels.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[t('chat.helloIntro'), t('chat.helpAnalyze'), t('chat.needAdvice')].map((suggestion) => (
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
                        {t('chat.goToSettingsAddModel')}
                      </Button>
                    )}
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      data-message-id={message.id}
                      className={`flex items-start space-x-3 transition-all duration-300 ${
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
                          <>
                            <MarkdownRenderer
                              content={message.content}
                              className="ai-message-content"
                            />
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-xs text-gray-500">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRegenerateResponse(message.id)}
                                disabled={isRegenerating && regeneratingMessageId === message.id}
                                className="h-6 px-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <RefreshCw className={`h-3 w-3 mr-1 ${isRegenerating && regeneratingMessageId === message.id ? 'animate-spin' : ''}`} />
                                {isRegenerating && regeneratingMessageId === message.id ? t('chat.regenerating') : t('chat.regenerateResponse')}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                        {message.type === 'user' && (
                          <p className="text-xs mt-2 text-blue-100">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        )}
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
                      ? t('chat.addModelFirst')
                      : selectedModel
                        ? t('chat.enterYourQuestion')
                        : t('chat.selectModelFirst')
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

export default function ChatPage() {
  return (
    <ChatSearchParamsProvider>
      <ChatPageContent />
    </ChatSearchParamsProvider>
  )
}
