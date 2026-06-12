/**
 * GET /api/auth/me - 获取当前登录用户信息
 *
 * 从 Cookie 中读取 JWT，验证后返回用户信息。
 * 未登录返回 401。
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromCookies } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    // 从 Cookie 提取 token
    const cookieHeader = request.headers.get('cookie')
    const token = extractTokenFromCookies(cookieHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // 验证 token
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // 查询最新用户信息
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        role: true,
        departmentId: true,
        status: true,
        email: true,
        department: {
          select: { id: true, name: true },
        },
      },
    })

    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Failed to get current user:', error)
    return NextResponse.json(
      { error: 'Failed to get current user' },
      { status: 500 }
    )
  }
}
