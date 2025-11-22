import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json()

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码为必填项' },
        { status: 400 }
      )
    }

    // 检查用户是否已存在
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email },
          ...(username ? [{ username }] : [])
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '用户已存在' },
        { status: 400 }
      )
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await db.user.create({
      data: {
        username,
        email,
        passwordHash,
        nickname: username || email.split('@')[0], // 默认昵称为用户名或邮箱前缀
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        createdAt: true,
      }
    })

    return NextResponse.json({
      message: '注册成功',
      user
    })

  } catch (error) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}