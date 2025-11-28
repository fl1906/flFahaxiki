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
  hiddenAnswer?: {
    id: string
    content: string
    truncatedContent: string
  }
}

interface GenerateMindmapRequest {
  conversationId: string
  title?: string
}

// 基于对话消息生成简化思维导图（根节点→问题1→问题2，点击问题显示回答）
function generateMindmapFromMessages(conversationId: string, conversationTitle: string): Promise<MindmapNode> {
  return new Promise(async (resolve, reject) => {
    try {
      // 获取对话消息
      const messages = await db.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' }
      })

      if (messages.length === 0) {
        resolve({
          id: 'root',
          text: conversationTitle || '思维导图',
          x: 100,
          y: 100,
          children: []
        })
        return
      }

      // 创建根节点
      const rootNode: MindmapNode = {
        id: 'root',
        text: conversationTitle || '思维导图',
        x: 100,
        y: 100,
        children: [],
        color: '#3b82f6'
      }

      // 创建线性链式结构：根节点→问题1→问题2→问题3...
      let lastNode: MindmapNode = rootNode
      let questionIndex = 1
      let usedAiAnswers = new Set() // 跟踪已使用的AI回答

      for (const message of messages) {
        if (message.senderType === 'user') {
          const nodeText = truncateText(message.content, 50)

          // 查找对应的AI回答 - 查找当前用户消息之后的第一个未使用的AI回答
          const aiAnswer = messages.find(m =>
            m.senderType === 'ai' &&
            m.timestamp > message.timestamp &&
            !usedAiAnswers.has(m.id)
          )

          // 如果找到AI回答，标记为已使用
          if (aiAnswer) {
            usedAiAnswers.add(aiAnswer.id)
          }

          // 用户提问节点 - 包含隐藏的回答数据
          const userNode: MindmapNode = {
            id: `question_${message.id}`,
            text: `问题${questionIndex}: ${nodeText}`,
            x: 0, // 位置由布局算法决定
            y: 0, // 位置由布局算法决定
            children: [],
            color: '#10b981',
            associatedMessageId: message.id,
            // 存储隐藏的回答数据
            hiddenAnswer: aiAnswer ? {
              id: aiAnswer.id,
              content: aiAnswer.content,
              truncatedContent: truncateText(aiAnswer.content, 200)
            } : null
          }

          // 将用户问题添加到前一个节点的子节点中，形成线性链
          lastNode.children.push(userNode)
          lastNode = userNode
          questionIndex++
        }
      }

      resolve(rootNode)

    } catch (error) {
      console.error('生成思维导图失败:', error)
      reject(error)
    }
  })
}

// 文本截断函数
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
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
    const mindmapRoot = await generateMindmapFromMessages(conversationId, conversation.title)

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
