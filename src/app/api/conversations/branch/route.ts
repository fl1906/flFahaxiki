import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

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

    const body = await request.json()
    const { conversationId, parentMessageId, branchTitle } = body

    if (!conversationId || !parentMessageId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 验证原对话是否属于当前用户
    const originalConversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        userId: payload.userId
      },
      include: {
        aiModel: true
      }
    })

    if (!originalConversation) {
      return NextResponse.json(
        { error: '对话不存在或无权限' },
        { status: 404 }
      )
    }

    // 获取原对话中到指定消息为止的所有消息
    const messagesToBranch = await db.chatMessage.findMany({
      where: {
        conversationId: conversationId
      },
      orderBy: {
        timestamp: 'asc'
      }
    })

    // 找到要分支的消息索引
    const branchMessageIndex = messagesToBranch.findIndex(msg => msg.id === parentMessageId)
    if (branchMessageIndex === -1) {
      return NextResponse.json(
        { error: '分支消息不存在' },
        { status: 404 }
      )
    }

    // 只复制到分支消息为止的消息（包括分支消息）
    const messagesToCopy = messagesToBranch.slice(0, branchMessageIndex + 1)

    // 创建新对话分支
    const branchConversationId = uuidv4()
    const now = new Date()

    const branchConversation = await db.conversation.create({
      data: {
        id: branchConversationId,
        userId: payload.userId,
        modelId: originalConversation.modelId,
        title: branchTitle || `${originalConversation.title} - 分支`,
        startTime: now,
        isActive: true,
        parentConversationId: conversationId,
        parentMindmapNodeId: parentMessageId
      }
    })

    // 复制消息到新对话
    const createdMessages = await Promise.all(
      messagesToCopy.map(msg =>
        db.chatMessage.create({
          data: {
            id: uuidv4(),
            conversationId: branchConversationId,
            senderType: msg.senderType,
            content: msg.content,
            timestamp: msg.timestamp,
            createdAt: now
          }
        })
      )
    )

    return NextResponse.json({
      message: '对话分支创建成功',
      branchConversation: {
        id: branchConversation.id,
        title: branchConversation.title,
        parentConversationId: branchConversation.parentConversationId,
        parentMindmapNodeId: branchConversation.parentMindmapNodeId,
        createdAt: branchConversation.createdAt
      },
      copiedMessages: createdMessages.length
    })

  } catch (error) {
    console.error('创建对话分支错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}