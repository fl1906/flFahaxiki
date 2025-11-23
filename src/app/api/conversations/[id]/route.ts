import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

// 获取单个对话详情及其消息历史
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: conversationId } = await params

    // 查询对话详情
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        userId: payload.userId
      },
      include: {
        aiModel: {
          select: {
            id: true,
            modelName: true,
            model: true
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: '对话不存在或无权限' },
        { status: 404 }
      )
    }

    // 查询对话消息
    const messages = await db.chatMessage.findMany({
      where: {
        conversationId: conversationId
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        modelId: conversation.modelId,
        startTime: conversation.startTime,
        endTime: conversation.endTime,
        isActive: conversation.isActive,
        aiModel: conversation.aiModel
      },
      messages: messages.map(msg => ({
        id: msg.id,
        senderType: msg.senderType,
        content: msg.content,
        timestamp: msg.timestamp,
        createdAt: msg.createdAt
      }))
    })

  } catch (error) {
    console.error('获取对话详情错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 删除单个对话
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: conversationId } = await params

    // 验证对话是否属于当前用户
    const existingConversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        userId: payload.userId
      }
    })

    if (!existingConversation) {
      return NextResponse.json(
        { error: '对话不存在或无权限' },
        { status: 404 }
      )
    }

    // 删除对话（由于设置了Cascade，相关的消息和思维导图会自动删除）
    await db.conversation.delete({
      where: { id: conversationId }
    })

    return NextResponse.json({
      message: '对话删除成功'
    })

  } catch (error) {
    console.error('删除对话错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}