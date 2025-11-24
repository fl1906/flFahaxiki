import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

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

    // 获取统计数据
    const userId = payload.userId

    // 1. 获取总对话数
    const totalConversations = await db.conversation.count({
      where: { userId }
    })

    // 2. 获取思维导图数量
    const totalMindmaps = await db.mindmap.count({
      where: {
        conversation: {
          userId: userId
        }
      }
    })

    // 3. 获取AI模型数量
    const totalModels = await db.aIModelConfig.count({
      where: { userId }
    })

    // 4. 获取本周活跃天数
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const weekStartUTC = new Date(weekStart.toISOString().split('T')[0] + 'T00:00:00.000Z')

    const conversationsThisWeek = await db.conversation.findMany({
      where: {
        userId: userId,
        startTime: {
          gte: weekStartUTC
        }
      },
      select: {
        startTime: true
      }
    })

    // 计算活跃天数（按日期分组）
    const activeDays = new Set(
      conversationsThisWeek.map(conv =>
        new Date(conv.startTime).toISOString().split('T')[0]
      )
    ).size

    // 5. 获取最近活动
    const recentActivities = await db.conversation.findMany({
      where: {
        userId: userId
      },
      include: {
        aiModel: {
          select: {
            modelName: true
          }
        },
        mindmap: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            chatMessages: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 5
    })

    const formattedActivities = recentActivities.map(conv => ({
      id: conv.id,
      type: conv.mindmap ? '思维导图' : '对话',
      name: conv.title,
      time: formatRelativeTime(conv.startTime),
      model: conv.aiModel.modelName,
      messageCount: conv._count.chatMessages
    }))

    // 6. 计算与上周的对比变化
    const lastWeekStart = new Date(weekStartUTC.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekEnd = weekStartUTC

    const conversationsLastWeek = await db.conversation.count({
      where: {
        userId: userId,
        startTime: {
          gte: lastWeekStart,
          lt: lastWeekEnd
        }
      }
    })

    const conversationsThisWeekCount = conversationsThisWeek.length
    const conversationChange = conversationsLastWeek > 0
      ? Math.round(((conversationsThisWeekCount - conversationsLastWeek) / conversationsLastWeek) * 100)
      : conversationsThisWeekCount > 0 ? 100 : 0

    const stats = {
      totalConversations,
      totalMindmaps,
      totalModels,
      activeDays,
      conversationChange: conversationChange > 0 ? `+${conversationChange}%` : `${conversationChange}%`,
      mindmapsChange: '0%', // 暂时固定，后续可以计算
      modelsChange: '0%', // 暂时固定，后续可以计算
      activeDaysChange: `+${activeDays}天`, // 相对于上周的变化
    }

    return NextResponse.json({
      stats,
      recentActivities: formattedActivities
    })

  } catch (error) {
    console.error('获取统计数据错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 格式化相对时间
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }
}