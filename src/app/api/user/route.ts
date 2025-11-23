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

    // 获取用户信息
    const user = await db.user.findUnique({
      where: {
        id: payload.userId
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username || user.email.split('@')[0], // 如果没有用户名，使用邮箱前缀
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl
      }
    })

  } catch (error) {
    console.error('获取用户信息错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}