import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

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