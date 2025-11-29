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

    const { message, modelId, modelEndpoint, modelName, conversationId, isRegeneration, messageIdToUpdate } = await request.json()

    if (!message || !modelId || !modelEndpoint) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 读取对话历史作为上下文
    let conversationHistory: any[] = []
    if (conversationId) {
      try {
        const messages = await db.chatMessage.findMany({
          where: {
            conversationId: conversationId
          },
          orderBy: {
            timestamp: 'asc'
          },
          take: 20, // 限制历史记录数量，避免prompt过长
          select: {
            content: true,
            senderType: true
          }
        })

        // 转换为AI API需要的格式
        conversationHistory = messages.map(msg => ({
          role: msg.senderType === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      } catch (error) {
        console.error('读取对话历史失败:', error)
        // 如果读取历史失败，继续使用无历史记录的模式
      }
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

    // 检测是否是Ollama服务器
    // 如果端点包含 /v1/chat/completions，则使用OpenAI兼容格式
    // 否则使用原生Ollama API格式
    const isOpenAICompatible = model.apiEndpoint.includes('/v1/chat/completions')
    const isOllamaNative = model.apiEndpoint.includes('ollama') ||
                           (model.apiEndpoint.includes('localhost:11434') && !isOpenAICompatible)

    // 调用AI服务
    // 优先使用前端发送的modelName，否则使用数据库中的model字段
    const apiModel = modelName || model.model || model.modelName

    let response: Response
    let requestBody: any

    if (isOllamaNative) {
      // 原生Ollama API格式 - 包含历史对话上下文
      let promptWithContext = '你是一个专业的AI助手，请用简洁、准确的方式回答用户的问题。请记住之前的对话内容，保持对话的连贯性和上下文理解。\n\n'

      // 添加历史对话记录
      if (conversationHistory.length > 0) {
        promptWithContext += '以下是之前的对话记录：\n'
        conversationHistory.forEach((msg, index) => {
          const roleText = msg.role === 'user' ? '用户' : '助手'
          promptWithContext += `${roleText}：${msg.content}\n`
        })
        promptWithContext += '\n'
      }

      promptWithContext += `现在请回答新的问题：\n用户：${message}\n助手：`

      requestBody = {
        model: apiModel,
        prompt: promptWithContext,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2000
        }
      }

      response = await fetch(`${model.apiEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
    } else {
      // OpenAI兼容格式（包括Ollama的OpenAI兼容端点）

      // 验证API密钥（除非是本地Ollama服务，否则都需要API密钥）
      const isLocalOllama = model.apiEndpoint.includes('localhost:11434')
      if (!isLocalOllama && (!model.apiKey || model.apiKey.trim() === '' || model.apiKey === 'sk-demo-key-replace-with-real-key')) {
        return NextResponse.json(
          {
            error: '该AI模型未配置有效的API密钥，请在设置中添加有效的API密钥后重试。',
            code: 'MISSING_API_KEY'
          },
          { status: 400 }
        )
      }

      // 构建包含历史对话的messages数组
      const messagesWithHistory: any[] = [
        {
          role: 'system',
          content: '你是一个专业的AI助手，请用简洁、准确的方式回答用户的问题。请记住之前的对话内容，保持对话的连贯性和上下文理解。'
        }
      ]

      // 添加历史对话记录
      if (conversationHistory.length > 0) {
        messagesWithHistory.push(...conversationHistory)
      }

      // 添加当前用户消息
      messagesWithHistory.push({
        role: 'user',
        content: message
      })

      requestBody = {
        model: apiModel,
        messages: messagesWithHistory,
        max_tokens: 2000,
        temperature: 0.7
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // 对于OpenAI兼容的端点，如果有API密钥则发送
      // 注意：本地的Ollama OpenAI兼容端点不需要API密钥
      if (isOpenAICompatible && model.apiKey && !model.apiEndpoint.includes('localhost:11434')) {
        headers['Authorization'] = `Bearer ${model.apiKey}`
      } else if (!isOpenAICompatible && model.apiKey) {
        // 非OpenAI兼容的端点如果需要API密钥也要发送
        headers['Authorization'] = `Bearer ${model.apiKey}`
      }

      response = await fetch(model.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })
    }

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
    let aiResponse: string

    if (isOllamaNative) {
      // 原生Ollama响应格式
      aiResponse = completion.response
    } else {
      // OpenAI兼容格式
      aiResponse = completion.choices?.[0]?.message?.content
     console.log('fahaxiki', aiResponse)
    }

    if (!aiResponse) {
      return NextResponse.json(
        {
          error: 'API返回了无效的响应格式。',
          code: 'INVALID_RESPONSE'
        },
        { status: 502 }
      )
    }
      let newAiMessage: any = null
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
          if (isRegeneration && messageIdToUpdate) {
            // 重新生成模式：删除旧的AI回复消息，插入新的回复
            await db.chatMessage.delete({
              where: {
                id: messageIdToUpdate,
                conversationId: conversationId,
                senderType: 'ai'
              }
            })

            // 插入新的AI回复消息
            newAiMessage = await db.chatMessage.create({
              data: {
                conversationId,
                senderType: 'ai',
                content: aiResponse,
                timestamp: new Date(),
                createdAt: new Date()
              }
            })
          } else {
            // 新对话模式：保存用户消息和AI回复
            await db.chatMessage.create({
              data: {
                conversationId,
                senderType: 'user',
                content: message,
                timestamp: new Date(),
                createdAt: new Date()
              }
            })

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
        }
      } catch (dbError) {
        console.error('保存对话记录失败:', dbError)
        // 不影响主流程，继续返回AI回复
      }
    }

    return NextResponse.json({
      response: aiResponse,
      modelId: modelId,
      timestamp: new Date().toISOString(),
      newMessageId: isRegeneration && newAiMessage ? newAiMessage.id : null
    })

  } catch (error) {
    console.error('聊天API错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
