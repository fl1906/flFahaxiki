import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

// 获取用户的AI模型列表
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

    // 获取用户的AI模型列表
    const models = await db.aIModelConfig.findMany({
      where: {
        userId: payload.userId
      },
      select: {
        id: true,
        modelName: true,
        model: true,
        apiEndpoint: true,
        description: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      models: models.map(model => ({
        id: model.id,
        name: model.modelName,
        model: model.model,
        endpoint: model.apiEndpoint,
        description: model.description,
        createdAt: model.createdAt.toISOString()
      }))
    })

  } catch (error) {
    console.error('获取AI模型列表错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 添加新的AI模型
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

    const { modelName, model, apiEndpoint, apiKey, description } = await request.json()

    // 验证必填字段
    if (!modelName || !apiEndpoint) {
      return NextResponse.json(
        { error: '模型名称和API地址为必填项' },
        { status: 400 }
      )
    }

    // 创建新的AI模型
    const newModel = await db.aIModelConfig.create({
      data: {
        userId: payload.userId,
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
      message: 'AI模型添加成功',
      model: {
        id: newModel.id,
        name: newModel.modelName,
        model: newModel.model,
        endpoint: newModel.apiEndpoint,
        description: newModel.description,
        createdAt: newModel.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('添加AI模型错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}