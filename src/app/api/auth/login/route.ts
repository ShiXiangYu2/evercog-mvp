/**
 * POST /api/auth/login
 *
 * Production requires password authentication. Demo login by userId is only
 * available outside production when DEMO_LOGIN_ENABLED=true.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, createCookieHeader } from '@/lib/jwt'
import { verifyPassword, checkLoginLock, recordLoginFailure, resetLoginAttempts } from '@/lib/password'
import logger from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, password } = body
    const demoLoginEnabled =
      process.env.NODE_ENV !== 'production' &&
      process.env.DEMO_LOGIN_ENABLED === 'true'

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        departmentId: true,
        status: true,
        passwordHash: true,
        mustChangePassword: true,
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

    if (password) {
      if (!user.passwordHash) {
        if (!demoLoginEnabled) {
          return NextResponse.json(
            { error: 'Password login is not configured for this user' },
            { status: 401 }
          )
        }

        logger.warn('Demo login used for user without password hash', { userId })
      } else {
        const passwordValid = await verifyPassword(password, user.passwordHash)

        if (!passwordValid) {
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

        await prisma.user.update({
          where: { id: userId },
          data: resetLoginAttempts(),
        })
      }
    } else {
      if (!demoLoginEnabled) {
        return NextResponse.json(
          { error: 'Password is required' },
          { status: 401 }
        )
      }

      logger.warn('Demo login used without password', { userId })
    }

    const { token, expiresAt } = await signToken({
      userId: user.id,
      role: user.role,
      departmentId: user.departmentId,
    })

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department.name,
        mustChangePassword: user.mustChangePassword,
      },
      expiresAt: expiresAt.toISOString(),
    })

    response.headers.set('Set-Cookie', createCookieHeader(token, expiresAt))

    return response
  } catch (error) {
    logger.error('Login failed', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
