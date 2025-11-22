import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
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

    const { conversationId } = await params

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

    // 获取思维导图
    const mindmap = await db.mindmap.findFirst({
      where: { conversationId }
    })

    if (!mindmap) {
      return NextResponse.json(
        { error: '思维导图不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: mindmap.id,
      title: mindmap.title,
      structureData: JSON.parse(mindmap.structureData),
      createdAt: mindmap.createdAt,
      updatedAt: mindmap.updatedAt
    })

  } catch (error) {
    console.error('获取思维导图错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}