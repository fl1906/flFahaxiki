import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

interface MindmapNode {
  id: string
  text: string
  x: number
  y: number
  children: MindmapNode[]
  color?: string
  associatedMessageId?: string
}

interface GenerateMindmapRequest {
  conversationId: string
  title?: string
}

// AI关键词提取服务
async function extractKeywordsFromConversation(conversationId: string): Promise<MindmapNode> {
  try {
    // 获取对话消息
    const messages = await db.chatMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' }
    })

    if (messages.length === 0) {
      return {
        id: 'root',
        text: '空对话',
        x: 400,
        y: 300,
        children: []
      }
    }

    // 使用AI服务提取关键词和结构
    const conversationText = messages
      .map(msg => `${msg.senderType === 'user' ? '用户' : 'AI'}: ${msg.content}`)
      .join('\n\n')

    // 获取对话关联的AI模型配置
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        aiModel: true
      }
    })

    if (!conversation || !conversation.aiModel) {
      throw new Error('未找到对话关联的AI模型配置')
    }

    const model = conversation.aiModel

    // 验证API密钥配置
    if (!model.apiKey || model.apiKey.trim() === '' || model.apiKey === 'sk-demo-key-replace-with-real-key') {
      return NextResponse.json(
        {
          error: '该AI模型未配置有效的API密钥，无法生成思维导图。',
          code: 'MISSING_API_KEY'
        },
        { status: 400 }
      )
    }

    // 调用AI服务生成思维导图结构
    const prompt = `
请分析以下对话内容，生成一个结构化的思维导图JSON。

对话内容：
${conversationText}

请生成思维导图结构，格式如下：
{
  "root": {
    "text": "主题",
    "children": [
      {
        "text": "子主题1",
        "children": [
          {"text": "具体要点1", "children": []},
          {"text": "具体要点2", "children": []}
        ]
      },
      {
        "text": "子主题2",
        "children": [
          {"text": "具体要点3", "children": []}
        ]
      }
    ]
  }
}

要求：
1. 提取主要主题和子主题
2. 每个节点不超过10个字
3. 最多3层结构
4. 重点关注关键概念和决策点
5. 使用简洁、准确的语言

只返回JSON格式，不要包含其他解释。
`

    const apiModel = model.model || model.modelName
    const response = await fetch(model.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`
      },
      body: JSON.stringify({
        model: apiModel,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的思维导图生成助手，擅长从对话内容中提取关键信息并生成结构化的思维导图。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('思维导图API调用失败:', response.status, errorText)

      // 根据不同的HTTP状态码返回具体的错误信息
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: 'API密钥无效或已过期，请检查API密钥配置。',
            code: 'INVALID_API_KEY'
          },
          { status: 401 }
        )
      } else if (response.status === 403) {
        return NextResponse.json(
          {
            error: 'API访问被拒绝，请检查API密钥权限或账户余额。',
            code: 'API_ACCESS_DENIED'
          },
          { status: 403 }
        )
      } else if (response.status === 429) {
        return NextResponse.json(
          {
            error: 'API调用频率超限，请稍后再试。',
            code: 'RATE_LIMIT_EXCEEDED'
          },
          { status: 429 }
        )
      } else {
        return NextResponse.json(
          {
            error: `思维导图生成失败: ${response.status} ${response.statusText}`,
            code: 'API_CALL_FAILED'
          },
          { status: 502 }
        )
      }
    }

    const completion = await response.json()
    const aiResponse = completion.choices?.[0]?.message?.content

    if (!aiResponse) {
      return NextResponse.json(
        {
          error: 'AI返回了无效的思维导图响应格式。',
          code: 'INVALID_RESPONSE'
        },
        { status: 502 }
      )
    }

    try {
      const mindmapData = JSON.parse(aiResponse)
      return convertToMindmapNode(mindmapData.root, messages)
    } catch (parseError) {
      console.error('AI响应解析失败:', parseError)
      return NextResponse.json(
        {
          error: 'AI返回的思维导图格式无效，无法解析。',
          code: 'PARSE_ERROR',
          details: aiResponse.substring(0, 200) // 包含部分响应以便调试
        },
        { status: 502 }
      )
    }

  } catch (error) {
    console.error('关键词提取失败:', error)
    return NextResponse.json(
      {
        error: '思维导图生成过程中发生错误。',
        code: 'GENERATION_ERROR',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 转换AI响应为思维导图节点
function convertToMindmapNode(data: any, messages: any[]): MindmapNode {
  if (!data) {
    return {
      id: 'root',
      text: '思维导图',
      x: 400,
      y: 300,
      children: []
    }
  }

  const processNode = (node: any, depth = 0, parentX = 400, parentY = 300): MindmapNode => {
    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 根据深度计算位置
    const angleStep = (2 * Math.PI) / (node.children?.length || 1)
    const radius = 150

    const children = node.children?.map((child: any, index: number) => {
      const angle = angleStep * index
      const childX = parentX + Math.cos(angle) * radius
      const childY = parentY + Math.sin(angle) * radius

      return processNode(child, depth + 1, childX, childY)
    }) || []

    return {
      id: nodeId,
      text: node.text || '未命名节点',
      x: parentX,
      y: parentY,
      children,
      color: getNodeColor(depth)
    }
  }

  return processNode(data)
}

// 获取节点颜色
function getNodeColor(depth: number): string {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#a855f7']
  return colors[depth % colors.length]
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: '无效的token' },
        { status: 401 }
      )
    }

    const { conversationId, title }: GenerateMindmapRequest = await request.json()

    if (!conversationId) {
      return NextResponse.json(
        { error: '缺少对话ID' },
        { status: 400 }
      )
    }

    // 验证对话是否属于当前用户
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        userId: payload.userId
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: '对话不存在或无权限' },
        { status: 404 }
      )
    }

    // 生成思维导图
    const mindmapRoot = await extractKeywordsFromConversation(conversationId)

    // 保存或更新思维导图
    const structureData = JSON.stringify(mindmapRoot)
    
    const mindmap = await db.mindmap.upsert({
      where: { conversationId },
      update: {
        title: title || `${conversation.title}的思维导图`,
        structureData,
        updatedAt: new Date()
      },
      create: {
        conversationId,
        title: title || `${conversation.title}的思维导图`,
        structureData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: '思维导图生成成功',
      mindmap: {
        id: mindmap.id,
        title: mindmap.title,
        structureData: mindmapRoot
      }
    })

  } catch (error) {
    console.error('生成思维导图错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}