import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

// 更新AI模型
export async function PUT(
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

    const { modelName, model, apiEndpoint, apiKey, description } = await request.json()
    const { id: modelId } = await params

    // 验证模型是否属于当前用户
    const existingModel = await db.aIModelConfig.findFirst({
      where: {
        id: modelId,
        userId: payload.userId
      }
    })

    if (!existingModel) {
      return NextResponse.json(
        { error: '模型不存在或无权限' },
        { status: 404 }
      )
    }

    // 验证必填字段
    if (!modelName || !apiEndpoint) {
      return NextResponse.json(
        { error: '模型名称和API地址为必填项' },
        { status: 400 }
      )
    }

    // 更新模型
    const updatedModel = await db.aIModelConfig.update({
      where: { id: modelId },
      data: {
        modelName,
        model: model || modelName, // 如果没有指定model，使用modelName作为默认值
        apiEndpoint,
        apiKey: apiKey || null,
        description: description || null,
      },
      select: {
        id: true,
        modelName: true,
        model: true,
        apiEndpoint: true,
        description: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      message: 'AI模型更新成功',
      model: {
        id: updatedModel.id,
        name: updatedModel.modelName,
        model: updatedModel.model,
        endpoint: updatedModel.apiEndpoint,
        description: updatedModel.description,
        createdAt: updatedModel.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('更新AI模型错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 删除AI模型
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

    const { id: modelId } = await params

    // 验证模型是否属于当前用户
    const existingModel = await db.aIModelConfig.findFirst({
      where: {
        id: modelId,
        userId: payload.userId
      }
    })

    if (!existingModel) {
      return NextResponse.json(
        { error: '模型不存在或无权限' },
        { status: 404 }
      )
    }

    // 检查是否有对话正在使用该模型
    const relatedConversations = await db.conversation.findMany({
      where: {
        modelId: modelId
      },
      select: {
        id: true,
        title: true
      }
    })

    if (relatedConversations.length > 0) {
      // 如果有对话正在使用该模型，先询问用户是否要解引用
      return NextResponse.json({
        error: '该模型正在被以下对话使用，无法直接删除。请先删除相关对话或更换对话使用的模型。',
        relatedConversations: relatedConversations.map(conv => ({
          id: conv.id,
          title: conv.title
        })),
        code: 'MODEL_IN_USE'
      }, { status: 409 })
    }

    // 如果没有被使用，则可以安全删除
    await db.aIModelConfig.delete({
      where: { id: modelId }
    })

    return NextResponse.json({
      message: 'AI模型删除成功'
    })

  } catch (error) {
    console.error('删除AI模型错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}