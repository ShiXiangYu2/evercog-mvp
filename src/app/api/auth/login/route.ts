/**
 * POST /api/auth/login - 用户登录
 *
 * 支持两种登录方式：
 * 1. MVP 演示模式：仅需 userId 即可登录
 * 2. 生产模式：userId + password 登录
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, createCookieHeader } from '@/lib/jwt'
import { verifyPassword, checkLoginLock, recordLoginFailure, resetLoginAttempts } from '@/lib/password'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, password } = body

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
        passwordHash: true,
        loginAttempts: true,
        lockedUntil: true,
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

    // 检查账户是否被锁定
    const lockStatus = checkLoginLock(user.loginAttempts, user.lockedUntil)
    if (lockStatus.locked) {
      const remainingMinutes = Math.ceil(lockStatus.remainingMs / 60000)
      return NextResponse.json(
        {
          error: `Account is locked. Please try again in ${remainingMinutes} minutes.`,
          lockedUntil: user.lockedUntil?.toISOString(),
        },
        { status: 423 }
      )
    }

    // 如果提供了密码，进行密码验证
    if (password) {
      // 生产模式：需要密码验证
      if (!user.passwordHash) {
        // 用户没有设置密码，使用演示模式
        console.warn(`User ${userId} has no password hash, using demo mode`)
      } else {
        // 验证密码
        const passwordValid = await verifyPassword(password, user.passwordHash)

        if (!passwordValid) {
          // 记录登录失败
          const failureResult = recordLoginFailure(user.loginAttempts)

          await prisma.user.update({
            where: { id: userId },
            data: {
              loginAttempts: failureResult.attempts,
              lockedUntil: failureResult.lockedUntil,
            },
          })

          const remainingAttempts = 5 - failureResult.attempts
          const message = failureResult.lockedUntil
            ? 'Account locked due to too many failed attempts'
            : `Invalid password. ${remainingAttempts} attempts remaining`

          return NextResponse.json(
            { error: message },
            { status: 401 }
          )
        }

        // 登录成功，重置失败次数
        await prisma.user.update({
          where: { id: userId },
          data: resetLoginAttempts(),
        })
      }
    } else {
      // MVP 演示模式：不验证密码
      // 如果用户有密码哈希，发出警告
      if (user.passwordHash) {
        console.warn(`User ${userId} has password but no password provided, using demo mode`)
      }
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
