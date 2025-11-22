import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signJWT } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('登录请求:', { email, passwordLength: password?.length })

    // 验证必填字段
    if (!email || !password) {
      console.log('验证失败: 缺少必填字段')
      return NextResponse.json(
        { error: '邮箱和密码为必填项' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await db.user.findUnique({
      where: { email }
    })

    console.log('查找用户结果:', user ? { id: user.id, email: user.email } : '用户不存在')

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 400 }
      )
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    console.log('密码验证结果:', isPasswordValid)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 400 }
      )
    }

    // 生成JWT token
    const token = signJWT({
      userId: user.id, 
      email: user.email
    })

    // 设置cookie
    const response = NextResponse.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      }
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response

  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}