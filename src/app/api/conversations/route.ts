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

    const { title, modelId } = await request.json()

    if (!title || !modelId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 验证模型是否属于当前用户
    const model = await db.aIModelConfig.findFirst({
      where: {
        id: modelId,
        userId: payload.userId
      }
    })

    if (!model) {
      return NextResponse.json(
        { error: '模型不存在或无权限' },
        { status: 404 }
      )
    }

    // 创建对话
    const conversation = await db.conversation.create({
      data: {
        userId: payload.userId,
        modelId,
        title,
        startTime: new Date(),
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        isActive: true,
      }
    })

    return NextResponse.json({
      message: '对话创建成功',
      conversation: {
        id: conversation.id,
        title: conversation.title,
        startTime: conversation.startTime,
        isActive: conversation.isActive,
      }
    })

  } catch (error) {
    console.error('创建对话错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}