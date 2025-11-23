import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

// 获取用户的对话列表
export async function GET(request: NextRequest) {
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

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const modelId = searchParams.get('modelId')
    const sortBy = searchParams.get('sortBy') || 'startTime'

    // 构建查询条件
    const whereCondition: any = {
      userId: payload.userId
    }

    if (search) {
      whereCondition.title = {
        contains: search,
        mode: 'insensitive'
      }
    }

    if (modelId && modelId !== 'all') {
      whereCondition.modelId = modelId
    }

    // 构建排序条件
    let orderBy: any = { startTime: 'desc' }
    if (sortBy === 'title') {
      orderBy = { title: 'asc' }
    }

    // 获取对话列表
    const conversations = await db.conversation.findMany({
      where: whereCondition,
      orderBy,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        isActive: true,
        aiModel: {
          select: {
            modelName: true
          }
        },
        _count: {
          select: {
            chatMessages: true
          }
        },
        mindmap: {
          select: {
            id: true
          }
        }
      }
    })

    // 格式化返回数据
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      model: conv.aiModel.modelName,
      startTime: conv.startTime,
      endTime: conv.endTime,
      isActive: conv.isActive,
      messageCount: conv._count.chatMessages,
      hasMindmap: !!conv.mindmap
    }))

    return NextResponse.json({
      conversations: formattedConversations
    })

  } catch (error) {
    console.error('获取对话列表错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
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

    const body = await request.json()

    // 检查是否是批量删除请求
    if (body.action === 'delete' && body.conversationIds) {
      return handleBatchDelete(body.conversationIds, payload.userId)
    }

    // 原有的创建对话逻辑
    const { title, modelId } = body

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
    console.error('对话操作错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 批量删除对话
async function handleBatchDelete(conversationIds: string[], userId: string) {
  try {
    if (!conversationIds || conversationIds.length === 0) {
      return NextResponse.json(
        { error: '未提供要删除的对话ID' },
        { status: 400 }
      )
    }

    // 验证所有对话都属于当前用户
    const conversations = await db.conversation.findMany({
      where: {
        id: { in: conversationIds },
        userId: userId
      },
      select: {
        id: true,
        title: true
      }
    })

    if (conversations.length !== conversationIds.length) {
      return NextResponse.json(
        { error: '部分对话不存在或无权限删除' },
        { status: 403 }
      )
    }

    // 批量删除对话（由于设置了Cascade，相关的消息和思维导图会自动删除）
    await db.conversation.deleteMany({
      where: {
        id: { in: conversationIds },
        userId: userId
      }
    })

    return NextResponse.json({
      message: `成功删除 ${conversationIds.length} 个对话`,
      deletedCount: conversationIds.length,
      deletedConversations: conversations
    })

  } catch (error) {
    console.error('批量删除对话错误:', error)
    return NextResponse.json(
      { error: '批量删除失败' },
      { status: 500 }
    )
  }
}