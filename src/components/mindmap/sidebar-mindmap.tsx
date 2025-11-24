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
  Square,
  Info
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [tooltipContent, setTooltipContent] = useState<string>('')
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const aiSummaryCache = useRef<Map<string, string[]>>(new Map()) // 缓存AI生成的总结

  // 清理定时器
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])

  // 将消息转换为思维导图树结构 - 异步版本支持AI总结
  useEffect(() => {
    if (messages.length === 0) {
      setMindmapData(null)
      return
    }

    const generateMindmapAsync = async () => {
      // 生成总体对话总结
      const overallSummary = await generateOverallSummary(messages)

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
              const aiSteps = await extractSubtopics(nextMessage.content)
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

  // 生成总体对话总结
  const generateOverallSummary = async (messages: Message[]): Promise<{ title: string; content: string }> => {
    // 收集所有AI回复内容
    const aiResponses = messages
      .filter(msg => msg.senderType === 'ai')
      .map(msg => msg.content)
      .join('\n\n')

    // 生成内容哈希作为缓存键
    const contentHash = btoa(aiResponses.substring(0, 100)).substring(0, 16)
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
    const firstUserMessage = messages.find(msg => msg.senderType === 'user')
    if (firstUserMessage) {
      const topic = extractTopic(firstUserMessage.content)
      return topic.length > 20 ? topic.substring(0, 20) + '...' : topic
    }
    return '对话总结'
  }

  // 生成备用总结
  const generateFallbackSummary = (messages: Message[]): { title: string; content: string } => {
    const userQuestions = messages
      .filter(msg => msg.senderType === 'user')
      .map(msg => extractTopic(msg.content))
      .slice(0, 3)

    const aiTopics = messages
      .filter(msg => msg.senderType === 'ai')
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
  const generateAISummary = async (content: string): Promise<string[]> => {
    // 生成内容哈希作为缓存键
    const contentHash = btoa(content.substring(0, 100)).substring(0, 16)

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
        body: JSON.stringify({ content }),
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
  const extractSubtopics = async (content: string): Promise<string[]> => {
    // 优先调用AI生成简洁步骤
    try {
      const aiSteps = await generateAISummary(content)
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

  // 格式化长文本内容
  const formatTooltipContent = (content: string): string => {
    // 清理内容，移除过多的Markdown符号
    let formatted = content.replace(/#{1,6}\s+/g, '') // 移除标题标记
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '$1') // 移除加粗标记
    formatted = formatted.replace(/\*([^*]+)\*/g, '$1') // 移除斜体标记
    formatted = formatted.replace(/`([^`]+)`/g, '$1') // 移除代码标记
    formatted = formatted.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本

    // 限制最大长度
    if (formatted.length > 500) {
      formatted = formatted.substring(0, 500) + '...'
    }

    // 处理换行符
    formatted = formatted.replace(/\n{3,}/g, '\n\n') // 减少连续换行
    formatted = formatted.trim()

    return formatted
  }

  // 处理鼠标悬停事件
  const handleMouseEnter = (node: MindmapNode, event: React.MouseEvent) => {
    // 清除之前的定时器
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
    }

    // 检查内容是否被截断
    const isContentTruncated = node.fullContent.length > 50 ||
                               node.fullContent !== node.content

    if (isContentTruncated) {
      // 添加延迟显示
      tooltipTimeoutRef.current = setTimeout(() => {
        setHoveredNode(node.id)
        const formattedContent = formatTooltipContent(node.fullContent)
        setTooltipContent(formattedContent)

        // 计算悬浮提示位置
        const rect = event.currentTarget.getBoundingClientRect()
        const tooltipWidth = 320 // 预估悬浮提示宽度
        const tooltipHeight = 250 // 预估悬浮提示高度

        let x = rect.right + 8 // 默认显示在右侧
        let y = rect.top

        // 检查是否会超出屏幕边界
        if (x + tooltipWidth > window.innerWidth - 20) {
          x = rect.left - tooltipWidth - 8 // 显示在左侧
        }

        // 确保不超出屏幕顶部和底部
        if (y < 10) {
          y = 10
        }
        if (y + tooltipHeight > window.innerHeight - 10) {
          y = window.innerHeight - tooltipHeight - 10
        }

        setTooltipPosition({ x, y })
      }, 500) // 500ms 延迟
    }
  }

  const handleMouseLeave = () => {
    // 清除定时器
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
      tooltipTimeoutRef.current = null
    }

    // 添加延迟隐藏，避免快速切换时的闪烁
    setTimeout(() => {
      setHoveredNode(null)
    }, 100)
  }

  // 渲染思维导图节点
  const renderNode = (node: MindmapNode): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children.length > 0
    const isHovered = hoveredNode === node.id
    const Icon = node.type === 'user' ? User : Bot

    // 检查内容是否被截断
    const isContentTruncated = node.fullContent.length > 50 ||
                               node.fullContent !== node.content

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center space-x-2 py-1 px-2 rounded cursor-pointer transition-colors relative group ${
            isHovered ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          onClick={() => hasChildren && toggleNode(node.id)}
          onMouseEnter={(e) => handleMouseEnter(node, e)}
          onMouseLeave={handleMouseLeave}
          style={{ marginLeft: `${node.level * 16}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-500 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-500 flex-shrink-0" />
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

          {/* 内容截断指示器 */}
          {isContentTruncated && (
            <Info className="h-2.5 w-2.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          )}

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

      {/* 悬浮提示 */}
      {hoveredNode && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] p-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-xl shadow-2xl border border-gray-700 dark:border-gray-300 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            maxWidth: '320px',
            maxHeight: '280px',
            overflow: 'auto',
            wordBreak: 'break-word'
          }}
        >
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700 dark:border-gray-300">
            <div className="flex items-center space-x-2">
              <Info className="h-3.5 w-3.5 text-blue-400 dark:text-blue-600" />
              <span className="font-semibold text-blue-300 dark:text-blue-600">
                完整内容
              </span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {tooltipContent.length} 字符
            </div>
          </div>

          <div className="whitespace-pre-wrap leading-relaxed text-gray-100 dark:text-gray-800">
            {tooltipContent}
          </div>

          {tooltipContent.length >= 500 && (
            <div className="mt-2 pt-2 border-t border-gray-700 dark:border-gray-300 text-xs text-gray-400 dark:text-gray-500">
              内容已截断显示前500字符
            </div>
          )}
        </div>
      )}
    </>
  )
}