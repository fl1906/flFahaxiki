import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { verifyJWT } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const payload = verifyJWT(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: '无效的令牌' }, { status: 401 })
    }

    const requestData = await request.json()
    console.log('[Mindmap API] 接收到的完整请求数据:', requestData)

    const { content, type, conversationId } = requestData

    console.log(`[Mindmap API] 解析后 - 请求类型: ${type}, 内容长度: ${content?.length || 0}`)
    console.log(`[Mindmap API] type的类型: ${typeof type}, type的值: ${JSON.stringify(type)}`)
    console.log(`[Mindmap API] conversationId: ${conversationId}`)

    if (!content || typeof content !== 'string') {
      console.log('[Mindmap API] 内容验证失败')
      return NextResponse.json({ error: '缺少内容参数' }, { status: 400 })
    }

    if (content.trim().length === 0) {
      console.log('[Mindmap API] 内容为空，返回默认结果')
      const isOverallSummary = type === 'overall'
      if (isOverallSummary) {
        return NextResponse.json({
          title: '对话总结',
          content: '暂无AI回复内容',
          aiGenerated: false
        })
      } else {
        return NextResponse.json({
          steps: ['暂无明确步骤'],
          aiGenerated: false
        })
      }
    }

    const isOverallSummary = type === 'overall'
    console.log('[Mindmap API] 请求类型详情:', { type, isOverallSummary })

    // 优先使用AI总结接口
    console.log('[Mindmap API] 尝试使用AI总结生成，类型:', type)

    try {
      let aiModel = null

      // 优先通过conversationId获取对话使用的AI模型
      if (conversationId) {
        console.log('[Mindmap API] 尝试通过对话ID获取AI模型:', conversationId)

        const conversation = await db.conversation.findFirst({
          where: {
            id: conversationId,
            userId: payload.userId
          },
          include: {
            aiModel: true // 包含关联的AI模型信息
          }
        })

        if (conversation && conversation.aiModel) {
          aiModel = conversation.aiModel
          console.log('[Mindmap API] 通过对话ID找到AI模型配置:', aiModel.modelName || aiModel.model)
        } else {
          console.log('[Mindmap API] 通过对话ID未找到AI模型配置')
        }
      }

      // 如果通过conversationId没有找到，则获取用户的第一个可用AI模型配置
      if (!aiModel) {
        console.log('[Mindmap API] 尝试获取用户第一个可用AI模型配置')
        aiModel = await db.aIModelConfig.findFirst({
          where: {
            userId: payload.userId
          },
          orderBy: {
            createdAt: 'asc'
          }
        })
      }

      if (aiModel && aiModel.apiEndpoint && aiModel.model) {
        console.log('[Mindmap API] 最终使用的AI模型配置:', aiModel.modelName || aiModel.model)

        // 调用AI生成总结
        const aiSummaryResult = await callAISummarize(content, isOverallSummary, aiModel)

        if (aiSummaryResult) {
          console.log('[Mindmap API] AI总结生成成功')

          if (isOverallSummary) {
            return NextResponse.json({
              title: aiSummaryResult.title,
              content: aiSummaryResult.content,
              aiGenerated: true
            })
          } else {
            return NextResponse.json({
              steps: aiSummaryResult.steps,
              aiGenerated: true
            })
          }
        } else {
          console.log('[Mindmap API] AI总结生成失败，使用备用方法')
        }
      } else {
        console.log('[Mindmap API] 未找到可用AI模型配置，使用备用方法')
      }
    } catch (aiError) {
      console.error('[Mindmap API] AI总结生成出错，使用备用方法:', aiError)
    }

    // 备用方法：如果AI总结失败，使用原有的备用逻辑
    console.log('[Mindmap API] 使用备用总结方法，类型:', type)

    if (isOverallSummary) {
      // 处理总体总结 - 使用备用方法
      const title = generateFallbackOverallTitle(content)
      const summary = content.length > 100 ? content.substring(0, 100) + '...' : content

      console.log('[Mindmap API] 生成总体总结:', { title, summaryLength: summary.length })

      return NextResponse.json({
        title: title,
        content: summary,
        aiGenerated: false
      })
    } else {
      // 处理分步骤总结 - 使用备用方法
      const fallbackSteps = generateFallbackSteps(content)
      console.log('[Mindmap API] 生成分步骤总结，步骤数量:', fallbackSteps.length)

      return NextResponse.json({
        steps: fallbackSteps,
        aiGenerated: false
      })
    }

  } catch (error) {
    console.error('思维导图总结生成失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 备用步骤生成方法 - 改进版本
function generateFallbackSteps(content: string): string[] {
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

// 生成备用总体标题
function generateFallbackOverallTitle(content: string): string {
  // 尝试从内容中提取标题
  const titleMatches = content.match(/^[#\s]*([^\n]{5,30})/m) || []
  if (titleMatches.length > 0) {
    return titleMatches[0].replace(/^[#\s]*/, '').trim()
  }

  // 提取第一句话作为标题
  const firstSentence = content.split(/[。！？;；.!?]/)[0]?.trim()
  if (firstSentence && firstSentence.length >= 5 && firstSentence.length <= 25) {
    return firstSentence
  }

  // 默认标题
  return '对话总结'
}

// 生成备用总体总结
function generateFallbackOverallSummary(content: string): string {
  // 提取加粗内容
  const boldMatches = content.match(/\*\*([^*\n]+?)\*\*/g) || []
  const boldTopics = boldMatches.slice(0, 4).map(m => m.replace(/\*\*([^*]+?)\*\*/, '$1').trim())

  // 提取数字编号
  const numberedMatches = content.match(/^\d+\.\s*([^\n]{5,30})/gm) || []
  const numberedTopics = numberedMatches.slice(0, 3).map(m => m.replace(/^\d+\.\s*/, '').trim())

  const allTopics = [...boldTopics, ...numberedTopics].slice(0, 5)

  if (allTopics.length > 0) {
    return `关键要点包括：${allTopics.join('、')}等。`
  }

  return content.length > 100 ? content.substring(0, 100) + '...' : content
}

// 调用AI生成总结的核心函数
async function callAISummarize(content: string, isOverallSummary: boolean, aiModel: any): Promise<any> {
  try {
    // 检测是否是Ollama服务器
    const isOpenAICompatible = aiModel.apiEndpoint.includes('/v1/chat/completions')
    const isOllamaNative = aiModel.apiEndpoint.includes('ollama') ||
                           (aiModel.apiEndpoint.includes('localhost:11434') && !isOpenAICompatible)

    let aiPrompt: string
    let requestBody: any
    let response: Response

    if (isOverallSummary) {
      // 总体总结提示词
      aiPrompt = `你是一个专业的思维导图总结助手。请对以下AI对话内容生成一个简洁的总结，要求如下：

1. 生成一个简明扼要的标题（不超过20个字符）
2. 生成一段总结性描述（50-150个字符）
3. 标题应该概括整个对话的核心主题
4. 总结应该提炼对话的关键要点

请直接返回JSON格式：
{
  "title": "生成的标题",
  "content": "生成的总结描述"
}

对话内容：
${content.substring(0, 2000)}`
    } else {
      // 分步骤总结提示词
      aiPrompt = `你是一个专业的思维导图步骤提取助手。请对以下AI回复内容提取关键步骤或要点，要求如下：

1. 提取3-6个关键步骤或要点
2. 每个步骤应该简洁明了（15-30个字符）
3. 步骤应该按照逻辑顺序排列
4. 突出重要的操作和建议

请直接返回JSON格式：
{
  "steps": ["步骤1", "步骤2", "步骤3", ...]
}

AI回复内容：
${content.substring(0, 2000)}`
    }

    if (isOllamaNative) {
      // 原生Ollama API格式
      requestBody = {
        model: aiModel.model || aiModel.modelName,
        prompt: aiPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 1000
        }
      }

      response = await fetch(`${aiModel.apiEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
    } else {
      // OpenAI兼容格式
      requestBody = {
        model: aiModel.model || aiModel.modelName,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的思维导图总结助手，擅长提取和总结内容的关键信息。请严格按照用户要求的JSON格式返回结果。'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // 根据配置决定是否发送API密钥
      const isLocalOllama = aiModel.apiEndpoint.includes('localhost:11434')
      if (!isLocalOllama && aiModel.apiKey && aiModel.apiKey.trim() && aiModel.apiKey !== 'sk-demo-key-replace-with-real-key') {
        headers['Authorization'] = `Bearer ${aiModel.apiKey}`
      }

      response = await fetch(aiModel.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })
    }

    if (!response.ok) {
      console.error('[Mindmap AI] API调用失败:', response.status, await response.text())
      return null
    }

    const completion = await response.json()
    let aiResponse: string

    if (isOllamaNative) {
      // 原生Ollama响应格式
      aiResponse = completion.response
    } else {
      // OpenAI兼容格式
      aiResponse = completion.choices?.[0]?.message?.content
    }

    if (!aiResponse) {
      console.error('[Mindmap AI] AI返回了无效的响应格式')
      return null
    }

    console.log('[Mindmap AI] AI响应内容:', aiResponse.substring(0, 200))

    // 解析AI返回的JSON结果
    try {
      // 预处理AI响应，移除可能的代码块标记
      let cleanResponse = aiResponse.trim()

      // 移除 ```json 和 ``` 标记
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      // 尝试查找JSON对象
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsedResult = JSON.parse(jsonMatch[0])
        return parsedResult
      }

      // 如果没有找到JSON对象，尝试解析整个响应
      const parsedResult = JSON.parse(cleanResponse)
      return parsedResult
    } catch (parseError) {
      console.error('[Mindmap AI] JSON解析失败，尝试提取内容:', parseError)

      // 如果JSON解析失败，尝试简单的文本处理作为备用
      if (isOverallSummary) {
        const lines = aiResponse.split('\n').filter(line => line.trim())
        return {
          title: lines[0]?.replace(/["']/g, '').trim().substring(0, 20) || '对话总结',
          content: lines.slice(1).join(' ').replace(/["']/g, '').trim().substring(0, 150) || aiResponse.substring(0, 100)
        }
      } else {
        const lines = aiResponse.split('\n').filter(line => line.trim())
        const steps = lines.map(line => line.replace(/^[-*+•]\s*/, '').replace(/^\d+\.\s*/, '').replace(/["']/g, '').trim())
          .filter(step => step.length >= 3 && step.length <= 30)
          .slice(0, 6)
        return { steps: steps.length > 0 ? steps : ['暂无明确步骤'] }
      }
    }

  } catch (error) {
    console.error('[Mindmap AI] AI总结生成异常:', error)
    return null
  }
}