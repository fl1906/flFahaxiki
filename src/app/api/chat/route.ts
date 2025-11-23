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

    const { message, modelId, modelEndpoint, conversationId } = await request.json()

    if (!message || !modelId || !modelEndpoint) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 获取模型信息（包含API密钥）
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

    // 验证API密钥配置
    if (!model.apiKey || model.apiKey.trim() === '' || model.apiKey === 'sk-demo-key-replace-with-real-key') {
      return NextResponse.json(
        {
          error: '该AI模型未配置有效的API密钥，请在设置中添加有效的API密钥后重试。',
          code: 'MISSING_API_KEY'
        },
        { status: 400 }
      )
    }

    // 调用AI服务
    const apiModel = model.model || model.modelName
    const response = await fetch(model.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`
      },
      body: JSON.stringify({
        model: apiModel,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的AI助手，请用简洁、准确的方式回答用户的问题。'
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API调用失败:', response.status, errorText)

      let errorMessage = `API调用失败: ${response.status} ${response.statusText}`
      let errorCode = 'API_CALL_FAILED'

      // 尝试解析JSON错误响应
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message

          // 针对"暂无可用渠道"错误的特殊处理
          if (errorMessage.includes('暂无可用渠道') || errorMessage.includes('模型') && errorMessage.includes('渠道')) {
            errorMessage = `AI模型配置错误：${errorMessage}。请检查模型名称是否正确，或在设置中重新配置AI模型。`
            errorCode = 'MODEL_NOT_AVAILABLE'
          } else if (errorJson.error?.type === 'v_api_error') {
            errorMessage = `AI服务错误：${errorMessage}。请检查模型配置或联系管理员。`
            errorCode = 'AI_SERVICE_ERROR'
          }
        }
      } catch (e) {
        // JSON解析失败，使用原始错误文本
      }

      // 根据不同的HTTP状态码返回具体的错误信息
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: 'API密钥无效或已过期，请检查API密钥配置。',
            code: 'INVALID_API_KEY'
          },
          { status: 401 }
        )
      } else if (response.status === 403) {
        return NextResponse.json(
          {
            error: errorMessage,
            code: errorCode
          },
          { status: 403 }
        )
      } else if (response.status === 429) {
        return NextResponse.json(
          {
            error: 'API调用频率超限，请稍后再试。',
            code: 'RATE_LIMIT_EXCEEDED'
          },
          { status: 429 }
        )
      } else {
        return NextResponse.json(
          {
            error: errorMessage,
            code: errorCode
          },
          { status: 502 }
        )
      }
    }

    const completion = await response.json()
    const aiResponse = completion.choices?.[0]?.message?.content

    if (!aiResponse) {
      return NextResponse.json(
        {
          error: 'API返回了无效的响应格式。',
          code: 'INVALID_RESPONSE'
        },
        { status: 502 }
      )
    }

    // 保存对话记录到数据库
    if (conversationId) {
      try {
        // 验证对话是否属于当前用户
        const conversation = await db.conversation.findFirst({
          where: {
            id: conversationId,
            userId: payload.userId
          }
        })

        if (conversation) {
          // 保存用户消息
          await db.chatMessage.create({
            data: {
              conversationId,
              senderType: 'user',
              content: message,
              timestamp: new Date(),
              createdAt: new Date()
            }
          })

          // 保存AI回复
          await db.chatMessage.create({
            data: {
              conversationId,
              senderType: 'ai',
              content: aiResponse,
              timestamp: new Date(),
              createdAt: new Date()
            }
          })
        }
      } catch (dbError) {
        console.error('保存对话记录失败:', dbError)
        // 不影响主流程，继续返回AI回复
      }
    }

    return NextResponse.json({
      response: aiResponse,
      modelId: modelId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('聊天API错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}