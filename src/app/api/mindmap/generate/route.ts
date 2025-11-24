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

// 基于对话消息生成思维导图
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
          x: 400,
          y: 300,
          children: []
        })
        return
      }

      // 创建根节点
      const rootNode: MindmapNode = {
        id: 'root',
        text: conversationTitle || '思维导图',
        x: 400,
        y: 300,
        children: [],
        color: '#3b82f6'
      }

      // 为每条消息创建一个节点
      const angleStep = (2 * Math.PI) / messages.length
      const radius = 200

      messages.forEach((message, index) => {
        const angle = angleStep * index
        const x = rootNode.x + Math.cos(angle) * radius
        const y = rootNode.y + Math.sin(angle) * radius

        const nodeText = message.senderType === 'user'
          ? `Q: ${truncateText(message.content, 20)}`
          : `A: ${truncateText(message.content, 20)}`

        const messageNode: MindmapNode = {
          id: `msg_${message.id}`,
          text: nodeText,
          x: x,
          y: y,
          children: [],
          color: message.senderType === 'user' ? '#10b981' : '#f59e0b',
          associatedMessageId: message.id
        }

        rootNode.children.push(messageNode)
      })

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