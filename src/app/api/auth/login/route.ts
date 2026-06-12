/**
 * POST /api/auth/login - 用户登录
 *
 * MVP 阶段简化：仅需 userId 即可登录。
 * 生产环境应替换为密码/OAuth 认证。
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, createCookieHeader } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        departmentId: true,
        status: true,
        department: {
          select: { id: true, name: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      )
    }

    // 签发 JWT
    const { token, expiresAt } = await signToken({
      userId: user.id,
      role: user.role,
      departmentId: user.departmentId,
    })

    // 构建响应
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department.name,
      },
      expiresAt: expiresAt.toISOString(),
    })

    // 设置 HttpOnly Cookie
    response.headers.set('Set-Cookie', createCookieHeader(token, expiresAt))

    return response
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
