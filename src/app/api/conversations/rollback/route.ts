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

    const { conversationId, messageId } = await request.json()

    if (!conversationId || !messageId) {
      return NextResponse.json(
        { error: '缺少对话ID或消息ID' },
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

    // 找到要回滚到的消息
    const targetMessage = await db.chatMessage.findFirst({
      where: {
        id: messageId,
        conversationId
      }
    })

    if (!targetMessage) {
      return NextResponse.json(
        { error: '目标消息不存在' },
        { status: 404 }
      )
    }

    // 删除该消息之后的所有消息
    const deletedMessages = await db.chatMessage.deleteMany({
      where: {
        conversationId,
        timestamp: {
          gt: targetMessage.timestamp
        }
      }
    })

    // 更新对话的结束时间
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        endTime: targetMessage.timestamp,
        isActive: true
      }
    })

    // 重新生成思维导图
    const generateResponse = await fetch(`${request.nextUrl.origin}/api/mindmap/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        conversationId,
        title: conversation.title
      })
    })

    if (!generateResponse.ok) {
      console.error('重新生成思维导图失败:', generateResponse.statusText)
      // 即使思维导图生成失败，也返回成功，因为消息删除成功了
    }

    return NextResponse.json({
      success: true,
      deletedCount: deletedMessages.count,
      message: `已回滚到指定消息，删除了 ${deletedMessages.count} 条后续消息`,
      rollbackToMessage: {
        id: targetMessage.id,
        content: targetMessage.content,
        senderType: targetMessage.senderType,
        timestamp: targetMessage.timestamp
      }
    })

  } catch (error) {
    console.error('回滚对话失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}