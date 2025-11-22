import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

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

    const { conversationId, senderType, content } = await request.json()

    if (!conversationId || !senderType || !content) {
      return NextResponse.json(
        { error: '缺少必要参数' },
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

    // 保存消息
    const message = await db.chatMessage.create({
      data: {
        conversationId,
        senderType,
        content,
        timestamp: new Date(),
      }
    })

    // 如果是用户消息，更新对话的最后活动时间
    if (senderType === 'user') {
      await db.conversation.update({
        where: { id: conversationId },
        data: { endTime: new Date() }
      })
    }

    return NextResponse.json({
      message: '消息保存成功',
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderType: message.senderType,
        content: message.content,
        timestamp: message.timestamp
      }
    })

  } catch (error) {
    console.error('保存消息错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}