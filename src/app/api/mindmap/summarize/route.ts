import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { verifyJWT } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ error: '无效的令牌' }, { status: 401 })
    }

    const { content, type } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: '缺少内容参数' }, { status: 400 })
    }

    const isOverallSummary = type === 'overall'

    // 调用AI API生成简洁的分步骤总结
    try {
      // 根据总结类型选择不同的prompt
      const prompt = isOverallSummary
        ? `你是一个专业的内容总结助手，需要将多个AI回复内容总结为对话的总体概要。

要求：
1. 生成一个简洁的对话标题（10-25个字符）
2. 提炼整个对话的核心要点和关键信息
3. 总结内容要全面但简洁（50-150个字符）
4. 突出主要话题和重要结论
5. 使用清晰准确的语言

格式：
标题：[对话标题]
总结：[总体总结内容]

原始AI回复内容：
${content}

请按照上述格式返回：`
        : `你是一个专业的内容总结助手，需要将AI回复内容转换为简洁明了的思维导图节点。

要求：
1. 提取核心要点和关键步骤
2. 每个要点表达完整，8-25个字符
3. 保持原意的准确性
4. 使用简洁清晰的语言
5. 最多生成6个最重要的要点
6. 每行一个要点，不需要编号

示例：
原文：学习编程需要掌握基础语法、数据结构、算法，并通过项目实践提升技能。
输出：掌握编程基础语法
学习数据结构知识
通过项目实践提升

原始内容：
${content}

请直接返回要点列表，每行一个：`

      const response = await fetch(`${process.env.AI_API_BASE_URL || 'http://localhost:11434'}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen2.5:7b',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.2,  // 降低温度，提高一致性
            max_tokens: isOverallSummary ? 400 : 300,
            top_p: 0.9,
            repeat_penalty: 1.1
          }
        }),
      })

      if (!response.ok) {
        throw new Error('AI API请求失败')
      }

      const data = await response.json()
      const aiSummary = data.response?.trim() || ''

      if (isOverallSummary) {
        // 处理总体总结的返回格式
        const titleMatch = aiSummary.match(/标题[：:]\s*([^\n]+)/)
        const summaryMatch = aiSummary.match(/总结[：:]\s*([^\n]+)/)

        const title = titleMatch ? titleMatch[1].trim() : generateFallbackOverallTitle(content)
        const summary = summaryMatch ? summaryMatch[1].trim() : content.substring(0, 100) + '...'

        return NextResponse.json({
          title: title,
          content: summary,
          aiGenerated: true,
          rawSummary: aiSummary
        })
      } else {
        // 处理分步骤总结的返回格式
        const steps = aiSummary
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0) // 过滤空行
          .map(line => {
            // 清理各种格式标记
            let cleaned = line
              .replace(/^\d+\.[\s、]*/, '') // 移除数字编号
              .replace(/^[-*+•·]\s*/, '') // 移除列表符号
              .replace(/^#+\s*/, '') // 移除标题符号
              .replace(/^["'"""]/g, '') // 移除引号
              .replace(/["'"""]$/g, '') // 移除尾部引号
              .replace(/^[：:]\s*/, '') // 移除开头的冒号
              .trim()

            return cleaned
          })
          .filter(step =>
            step.length >= 3 && // 至少3个字符
            step.length <= 30 && // 最多30个字符
            !step.match(/^[a-zA-Z0-9\s.,!?]+$/) // 过滤纯英文标点
          )
          .slice(0, 6) // 限制最多6个步骤

        // 如果AI生成失败，使用备用解析方法
        if (steps.length === 0) {
          const fallbackSteps = generateFallbackSteps(content)
          return NextResponse.json({ steps: fallbackSteps, aiGenerated: false })
        }

        return NextResponse.json({
          steps: steps,
          aiGenerated: true,
          rawSummary: aiSummary
        })
      }

    } catch (aiError) {
      console.error('AI API调用失败:', aiError)
      // AI失败时使用备用方法
      const fallbackSteps = generateFallbackSteps(content)
      return NextResponse.json({ steps: fallbackSteps, aiGenerated: false })
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