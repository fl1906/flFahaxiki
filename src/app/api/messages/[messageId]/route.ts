import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
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

    const { messageId } = await params

    if (!messageId) {
      return NextResponse.json(
        { error: '缺少消息ID' },
        { status: 400 }
      )
    }

    // 查找要删除的消息并验证权限
    const targetMessage = await db.chatMessage.findFirst({
      where: {
        id: messageId,
      },
      include: {
        conversation: {
          select: {
            userId: true,
          }
        }
      }
    })

    if (!targetMessage) {
      return NextResponse.json(
        { error: '消息不存在' },
        { status: 404 }
      )
    }

    if (targetMessage.conversation.userId !== payload.userId) {
      return NextResponse.json(
        { error: '无权限删除此消息' },
        { status: 403 }
      )
    }

    // 获取对话中的所有消息，按时间顺序排列
    const allMessages = await db.chatMessage.findMany({
      where: {
        conversationId: targetMessage.conversationId
      },
      orderBy: {
        timestamp: 'asc'
      }
    })

    // 找到要删除的消息在序列中的位置
    const targetIndex = allMessages.findIndex(msg => msg.id === messageId)
    if (targetIndex === -1) {
      return NextResponse.json(
        { error: '消息不存在' },
        { status: 404 }
      )
    }

    let messagesToDelete: string[] = []
    let questionMessageId: string | null = null

    if (targetMessage.senderType === 'ai') {
      // 如果删除的是AI回复，找到对应的用户问题
      // 从当前位置向前查找最近的用户问题
      for (let i = targetIndex - 1; i >= 0; i--) {
        if (allMessages[i].senderType === 'user') {
          // 检查这个问题是否已经被删除过或已经被其他AI回复关联
          const isAlreadyPaired = allMessages.slice(i + 1, targetIndex).some(
            msg => msg.senderType === 'ai'
          )

          if (!isAlreadyPaired) {
            questionMessageId = allMessages[i].id
            messagesToDelete.push(allMessages[i].id) // 添加用户问题到删除列表
          }
          break
        }
      }
      messagesToDelete.push(messageId) // 添加AI回复到删除列表
    } else {
      // 如果删除的是用户问题，找到对应的AI回复
      // 从当前位置向后查找第一个AI回复
      for (let i = targetIndex + 1; i < allMessages.length; i++) {
        if (allMessages[i].senderType === 'ai') {
          // 检查这个AI回复是否已经被其他用户问题关联
          const isAlreadyPaired = allMessages.slice(targetIndex + 1, i).some(
            msg => msg.senderType === 'user'
          )

          if (!isAlreadyPaired) {
            messagesToDelete.push(allMessages[i].id) // 添加AI回复到删除列表
          }
          break
        }
      }
      questionMessageId = messageId
      messagesToDelete.push(messageId) // 添加用户问题到删除列表
    }

    // 执行批量删除
    await db.chatMessage.deleteMany({
      where: {
        id: {
          in: messagesToDelete
        }
      }
    })

    // 更新思维导图：删除对应的节点
    if (questionMessageId) {
      const mindmap = await db.mindmap.findFirst({
        where: {
          conversationId: targetMessage.conversationId
        }
      })

      if (mindmap) {
        try {
          const structureData = JSON.parse(mindmap.structureData)
          const updatedStructure = removeNodeByMessageId(structureData, questionMessageId, messageId)

          await db.mindmap.update({
            where: {
              id: mindmap.id
            },
            data: {
              structureData: JSON.stringify(updatedStructure),
              updatedAt: new Date()
            }
          })
        } catch (error) {
          console.error('更新思维导图失败:', error)
          // 不影响删除操作的结果
        }
      }
    }

    return NextResponse.json({
      message: '对话删除成功',
      deletedMessageIds: messagesToDelete,
      deletedQuestionId: questionMessageId
    })

  } catch (error) {
    console.error('删除消息错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 递归删除思维导图节点
function removeNodeByMessageId(node: any, questionMessageId: string, aiMessageId: string): any {
  // 如果节点关联的消息ID匹配用户问题ID，或者隐藏的回答ID匹配AI消息ID，则删除此节点
  if (node.associatedMessageId === questionMessageId ||
      (node.hiddenAnswer && (node.hiddenAnswer.id === aiMessageId || node.hiddenAnswer.id === questionMessageId))) {
    return null // 删除此节点
  }

  // 递归处理子节点
  if (node.children && node.children.length > 0) {
    const filteredChildren = node.children
      .map((child: any) => removeNodeByMessageId(child, questionMessageId, aiMessageId))
      .filter((child: any) => child !== null)

    return {
      ...node,
      children: filteredChildren
    }
  }

  return node
}