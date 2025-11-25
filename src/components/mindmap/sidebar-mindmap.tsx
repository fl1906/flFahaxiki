'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Brain,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Bot,
  User,
  ArrowRight,
  Circle,
  Square
} from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface MindmapNode {
  id: string
  type: 'user' | 'ai'
  content: string
  fullContent: string
  children: MindmapNode[]
  level: number
  messageId: string
}

interface SidebarMindmapProps {
  messages: Message[]
  conversationId: string
  className?: string
}

export default function SidebarMindmap({ messages, conversationId, className = '' }: SidebarMindmapProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [mindmapData, setMindmapData] = useState<MindmapNode | null>(null)
  const aiSummaryCache = useRef<Map<string, string[]>>(new Map()) // 缓存AI生成的总结

  
  // 将消息转换为思维导图树结构 - 异步版本支持AI总结
  useEffect(() => {
    console.log('[Mindmap] useEffect触发，消息数组:', messages)
    console.log('[Mindmap] 消息详情:', messages.map(m => ({ id: m.id, type: m.type, contentLength: m.content.length, contentPreview: m.content.substring(0, 50) })))

    if (messages.length === 0) {
      setMindmapData(null)
      return
    }

    const generateMindmapAsync = async () => {
      // 生成总体对话总结
      const overallSummary = await generateOverallSummary(messages, conversationId)

      const rootNode: MindmapNode = {
        id: 'root',
        type: 'ai',
        content: overallSummary.title,
        fullContent: overallSummary.content,
        children: [],
        level: 0,
        messageId: 'root'
      }

      // 为每个用户问题创建分支
      for (let index = 0; index < messages.length; index++) {
        const message = messages[index]

        if (message.type === 'user') {
          const userNode: MindmapNode = {
            id: `user-${message.id}`,
            type: 'user',
            content: extractTopic(message.content),
            fullContent: message.content,
            children: [],
            level: 1,
            messageId: message.id
          }

          // 查找AI回复
          const nextMessage = messages[index + 1]
          if (nextMessage && nextMessage.type === 'ai') {
            const aiNode: MindmapNode = {
              id: `ai-${nextMessage.id}`,
              type: 'ai',
              content: extractTopic(nextMessage.content),
              fullContent: nextMessage.content,
              children: [],
              level: 2,
              messageId: nextMessage.id
            }

            try {
              // 调用AI生成简洁分步骤总结
              const aiSteps = await extractSubtopics(nextMessage.content, conversationId)
              aiSteps.forEach((step, stepIndex) => {
                const subtopicNode: MindmapNode = {
                  id: `subtopic-${nextMessage.id}-${stepIndex}`,
                  type: 'ai',
                  content: step,
                  fullContent: step,
                  children: [],
                  level: 3,
                  messageId: nextMessage.id
                }
                aiNode.children.push(subtopicNode)
              })
            } catch (error) {
              console.warn('AI步骤生成失败，跳过该AI回复:', error)
              // 即使AI生成失败，也保留AI节点，只是没有子步骤
            }

            userNode.children.push(aiNode)
          }

          rootNode.children.push(userNode)
        }
      }

      return rootNode
    }

    // 异步生成思维导图
    generateMindmapAsync().then(mindmapData => {
      setMindmapData(mindmapData)

      // 默认展开所有节点
      const allNodeIds = new Set<string>()
      const collectNodeIds = (node: MindmapNode) => {
        allNodeIds.add(node.id)
        node.children.forEach(collectNodeIds)
      }
      collectNodeIds(mindmapData)
      setExpandedNodes(allNodeIds)
    }).catch(error => {
      console.error('思维导图生成失败:', error)
      // 设置基础思维导图结构作为备用
      setMindmapData({
        id: 'root',
        type: 'ai',
        content: '对话主题',
        fullContent: '当前对话的完整主题结构',
        children: [],
        level: 0,
        messageId: 'root'
      })
    })
  }, [messages])

  // 提取话题主题
  const extractTopic = (content: string): string => {
    // 清理内容，移除Markdown符号
    const cleanContent = content.replace(/[#*`\[\]()]/g, '').trim()

    // 尝试提取第一句话作为主题
    const firstSentence = cleanContent.split(/[。！？.!?]/)[0]?.trim()

    // 如果第一句话太短，则返回前40个字符
    if (firstSentence && firstSentence.length > 5) {
      return firstSentence.length > 40
        ? firstSentence.substring(0, 40) + '...'
        : firstSentence
    }

    // 否则返回前40个字符
    return cleanContent.length > 40
      ? cleanContent.substring(0, 40) + '...'
      : cleanContent
  }

  // 生成简单的哈希值（支持UTF-8编码）
  const generateSimpleHash = (str: string): string => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(16) // 转换为16进制字符串
  }

  // 生成总体对话总结
  const generateOverallSummary = async (messages: Message[], conversationId: string): Promise<{ title: string; content: string }> => {
    // 收集所有AI回复内容
    const aiResponses = messages
      .filter(msg => msg.type === 'ai')
      .map(msg => msg.content)
      .join('\n\n')

    console.log('[Mindmap Frontend] 消息总数:', messages.length)
    console.log('[Mindmap Frontend] AI回复数量:', messages.filter(msg => msg.type === 'ai').length)
    console.log('[Mindmap Frontend] AI内容长度:', aiResponses.length)
    console.log('[Mindmap Frontend] AI内容预览:', aiResponses.substring(0, 100))

    // 如果没有AI回复内容，直接返回默认总结
    if (!aiResponses.trim()) {
      console.log('[Mindmap Frontend] 没有AI回复，使用默认总结')
      return generateFallbackSummary(messages)
    }

    // 使用安全的哈希函数生成缓存键（支持UTF-8）
    const contentHash = generateSimpleHash(aiResponses.substring(0, 100))
    const cacheKey = `overall-${contentHash}`

    // 检查缓存
    if (aiSummaryCache.current.has(cacheKey)) {
      const cached = aiSummaryCache.current.get(cacheKey) as { title: string; content: string }
      return cached
    }

    try {
      const response = await fetch('/api/mindmap/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: aiResponses,
          type: 'overall', // 标识这是总体总结
          conversationId, // 传递对话ID以获取对应的AI模型
        }),
      })

      if (!response.ok) {
        throw new Error('总体总结生成失败')
      }

      const data = await response.json()
      const summary = {
        title: data.title || generateFallbackTitle(messages),
        content: data.content || aiResponses.substring(0, 100) + '...'
      }

      // 缓存结果
      aiSummaryCache.current.set(cacheKey, summary)
      return summary

    } catch (error) {
      console.error('总体总结生成失败:', error)
      // 返回备用总结
      return generateFallbackSummary(messages)
    }
  }

  // 生成备用标题
  const generateFallbackTitle = (messages: Message[]): string => {
    const firstUserMessage = messages.find(msg => msg.type === 'user')
    if (firstUserMessage) {
      const topic = extractTopic(firstUserMessage.content)
      return topic.length > 20 ? topic.substring(0, 20) + '...' : topic
    }
    return '对话总结'
  }

  // 生成备用总结
  const generateFallbackSummary = (messages: Message[]): { title: string; content: string } => {
    const userQuestions = messages
      .filter(msg => msg.type === 'user')
      .map(msg => extractTopic(msg.content))
      .slice(0, 3)

    const aiTopics = messages
      .filter(msg => msg.type === 'ai')
      .flatMap(msg => {
        const topics = []
        // 提取加粗内容
        const boldMatches = msg.content.match(/\*\*([^*\n]+?)\*\*/g)
        if (boldMatches) {
          topics.push(...boldMatches.map(m => m.replace(/\*\*([^*]+?)\*\*/, '$1').trim()))
        }
        // 提取数字编号
        const numberedMatches = msg.content.match(/^\d+\.\s*([^\n]{5,30})/gm)
        if (numberedMatches) {
          topics.push(...numberedMatches.map(m => m.replace(/^\d+\.\s*/, '').trim()))
        }
        return topics
      })
      .slice(0, 4)

    const title = generateFallbackTitle(messages)
    const content = `主要话题: ${userQuestions.join('、')}。关键要点: ${aiTopics.join('、')}。`

    return { title, content }
  }

  // 调用AI API生成简洁分步骤总结
  const generateAISummary = async (content: string, conversationId: string): Promise<string[]> => {
    // 如果内容为空，直接返回默认步骤
    if (!content || !content.trim()) {
      return ['暂无明确步骤']
    }

    // 使用安全的哈希函数生成缓存键（支持UTF-8）
    const contentHash = generateSimpleHash(content.substring(0, 100))

    // 检查缓存
    if (aiSummaryCache.current.has(contentHash)) {
      return aiSummaryCache.current.get(contentHash)!
    }

    try {
      const response = await fetch('/api/mindmap/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          type: 'steps', // 标识这是分步骤总结
          conversationId // 传递对话ID以获取对应的AI模型
        }),
      })

      if (!response.ok) {
        throw new Error('AI总结生成失败')
      }

      const data = await response.json()
      const steps = data.steps || []

      // 缓存结果
      aiSummaryCache.current.set(contentHash, steps)
      return steps

    } catch (error) {
      console.error('AI总结生成失败:', error)
      // 返回备用解析结果
      return generateFallbackSteps(content)
    }
  }

  // 备用步骤生成方法 - 改进版本
  const generateFallbackSteps = (content: string): string[] => {
    const steps: string[] = []

    // 1. 尝试匹配数字编号的步骤
    const numberedMatches = content.match(/^\d+\.\s*([^\n]{5,30})/gm)
    if (numberedMatches && numberedMatches.length > 0) {
      const numberedSteps = numberedMatches
        .slice(0, 6)
        .map(match => match.replace(/^\d+\.\s*/, '').trim())
        .filter(step => step.length >= 5)
      steps.push(...numberedSteps)
    }

    // 2. 尝试匹配列表项
    const listMatches = content.match(/^[-*+•·]\s*([^\n]{5,30})/gm)
    if (listMatches && listMatches.length > 0) {
      const listSteps = listMatches
        .slice(0, 6)
        .map(match => match.replace(/^[-*+•·]\s*/, '').trim())
        .filter(step => step.length >= 5)
      steps.push(...listSteps)
    }

    // 3. 尝试匹配加粗的关键词 - 改进版本
    const boldMatches = content.match(/\*\*([^*\n]+?)\*\*/g)
    if (boldMatches && boldMatches.length > 0) {
      const boldSteps = boldMatches
        .map(match => match.replace(/\*\*([^*]+?)\*\*/, '$1').trim())
        .filter(step => step.length >= 4 && step.length <= 25)
      steps.push(...boldSteps)
    }

    // 4. 提取包含动作词汇的句子
    if (steps.length < 4) {
      const actionSentences = content.split(/[。！？;；.!?]/)
        .map(s => s.trim())
        .filter(s => {
          // 过滤包含动作词汇的句子
          const actionWords = ['学习', '掌握', '使用', '创建', '设置', '配置', '安装', '实现', '操作', '进行', '需要', '应该', '可以', '建议', '首先', '然后', '最后']
          return s.length >= 8 && s.length <= 25 && actionWords.some(word => s.includes(word))
        })
        .slice(0, 6)
      steps.push(...actionSentences)
    }

    // 5. 智能短句提取
    if (steps.length < 3) {
      const sentences = content.split(/[。！？;；.!?]/)
        .map(s => s.trim())
        .filter(s => {
          // 过滤有意义的句子
          return s.length >= 8 && s.length <= 25 &&
                 !s.match(/^[a-zA-Z0-9\s]+$/) && // 过滤纯英文
                 !s.includes('http') && // 过滤URL
                 !s.includes('www.') && // 过滤网址
                 s.match(/[\u4e00-\u9fa5]/) // 包含中文
        })
        .slice(0, 6)
      steps.push(...sentences)
    }

    // 去重并清理，保证质量和可读性
    const uniqueSteps = [...new Set(steps)]
      .filter(step => step.length >= 3 && step.length <= 30) // 降低最小长度要求
      .filter(step => !step.match(/^[a-zA-Z0-9\s\.,!?]+$/)) // 过滤纯英文标点
      .slice(0, 6)

    return uniqueSteps.length > 0 ? uniqueSteps : ['暂无明确步骤']
  }

  // 提取子话题 - 优化版本，优先使用AI总结
  const extractSubtopics = async (content: string, conversationId: string): Promise<string[]> => {
    // 优先调用AI生成简洁步骤
    try {
      const aiSteps = await generateAISummary(content, conversationId)
      if (aiSteps.length > 0) {
        return aiSteps
      }
    } catch (error) {
      console.warn('AI总结生成失败，使用备用方法:', error)
    }

    // 备用方法：基于格式的解析
    const topics: string[] = []

    // 匹配标题（支持多级标题）
    const headings = content.match(/^#{1,4}\s+(.+)$/gm) || []
    topics.push(...headings.map(h => h.replace(/^#{1,4}\s+/, '').trim()))

    // 匹配列表项
    const listItems = content.match(/^[-*+]\s+(.+)$/gm) || []
    const numberedItems = content.match(/^\d+[.)]\s+(.+)$/gm) || []

    topics.push(...listItems.map(l => l.replace(/^[-*+]\s+/, '').trim()))
    topics.push(...numberedItems.map(n => n.replace(/^\d+[.)]\s+/, '').trim()))

    // 匹配关键词定义（例如：**重要性：**）
    const keywords = content.match(/\*\*([^*]+)\*\*[：:]\s*(.+?)(?=\n|$)/g) || []
    topics.push(...keywords.map(k => k.replace(/\*\*([^*]+)\*\*[：:]\s*/, '$1：').trim()))

    // 匹配加粗的要点
    const boldPoints = content.match(/\*\*([^*\n]{5,50})\*\*/g) || []
    topics.push(...boldPoints.map(b => b.replace(/\*\*([^*]+)\*\*/, '$1').trim()))

    // 过滤和清理话题 - 改进版本
    const filteredTopics = topics
      .filter(topic => topic.length >= 3 && topic.length <= 30) // 优化长度范围
      .map(topic => topic.replace(/[`[\]()]/g, '').trim()) // 清理符号
      .filter(topic => !topic.match(/^[a-zA-Z0-9\s\.,!?]+$/)) // 过滤纯英文标点
      .filter((topic, index, arr) => arr.indexOf(topic) === index) // 去重

    // 如果仍然没有子话题，则智能分割文本
    if (filteredTopics.length === 0 && content.length > 50) {
      const sentences = content.split(/[。！？;；.!?]/)
        .map(s => s.trim())
        .filter(s => s.length >= 3 && s.length <= 25) // 更合理的长度
        .filter(s => s.match(/[\u4e00-\u9fa5]/)) // 包含中文
        .slice(0, 6)
      filteredTopics.push(...sentences)
    }

    // 确保至少有一个有效结果
    return filteredTopics.length > 0 ? filteredTopics.slice(0, 6) : ['暂无明确步骤']
  }

  // 切换节点展开状态
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  // 点击节点定位到对话位置
  const handleNodeClick = (node: MindmapNode, event: React.MouseEvent) => {
    // 如果点击的是Chevron图标，不触发定位功能
    const target = event.target as HTMLElement
    if (target.closest('svg')) {
      return
    }

    // 只有用户消息和AI回复节点才能定位
    if (node.messageId && node.messageId !== 'root') {
      // 寻找对应的对话消息元素
      const messageElement = document.querySelector(`[data-message-id="${node.messageId}"]`)
      if (messageElement) {
        // 滚动到对应位置
        messageElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })

        // 添加高亮效果
        messageElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50', 'bg-blue-50', 'dark:bg-blue-900/20')
        setTimeout(() => {
          messageElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50', 'bg-blue-50', 'dark:bg-blue-900/20')
        }, 2000) // 2秒后移除高亮
      }
    }
  }

  
  // 渲染思维导图节点
  const renderNode = (node: MindmapNode): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children.length > 0
    const Icon = node.type === 'user' ? User : Bot

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center space-x-2 py-1 px-2 rounded cursor-pointer transition-colors group hover:bg-gray-100 dark:hover:bg-gray-800`}
          onClick={(e) => handleNodeClick(node, e)}
          style={{ marginLeft: `${node.level * 16}px` }}
          title={`点击定位到对话内容${node.type === 'user' ? '（用户提问）' : '（AI回复）'}`}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown
                className="h-3 w-3 text-gray-500 flex-shrink-0 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleNode(node.id)
                }}
              />
            ) : (
              <ChevronRight
                className="h-3 w-3 text-gray-500 flex-shrink-0 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleNode(node.id)
                }}
              />
            )
          ) : (
            <div className="w-3 h-3 flex-shrink-0" />
          )}

          <Icon className="h-3 w-3 flex-shrink-0" style={{
            color: node.type === 'user' ? '#3B82F6' : '#10B981'
          }} />

          <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0">
            {node.content}
          </span>

          {node.level === 0 && (
            <Brain className="h-3 w-3 text-purple-500 flex-shrink-0" />
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-gray-200 dark:border-gray-700 ml-4">
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    )
  }

  if (!mindmapData) {
    return (
      <Card className={`h-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Brain className="h-4 w-4 mr-2" />
            思维导图
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center text-xs text-gray-500">
          开始对话后将显示思维导图
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={`h-full flex flex-col ${className}`}>
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center">
              <Brain className="h-4 w-4 mr-2 text-purple-500" />
              思维导图
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {messages.length} 话题
            </Badge>
          </div>
        </CardHeader>

        <Separator className="mx-3" />

        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {renderNode(mindmapData)}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  )
}