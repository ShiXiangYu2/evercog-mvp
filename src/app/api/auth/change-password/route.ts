/**
 * POST /api/auth/change-password - 修改密码
 *
 * 用于首次登录强制改密或用户主动改密。
 * 需要 JWT 认证。
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthUser } from '@/lib/auth'
import { hashPassword, validatePasswordStrength } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ==================== Schema ====================

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, '密码至少 8 位').max(128, '密码不能超过 128 位'),
})

// ==================== Handler ====================

export const POST = withAuth(async (request: NextRequest, { user }: { user: AuthUser }) => {
  try {
    const body = await request.json()
    const result = changePasswordSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: '输入校验失败', details: result.error.issues.map(i => i.message) },
        { status: 400 }
      )
    }

    const { newPassword } = result.data

    // 验证密码强度
    const strength = validatePasswordStrength(newPassword)
    if (!strength.valid) {
      return NextResponse.json(
        { error: '密码强度不足', details: strength.errors },
        { status: 400 }
      )
    }

    // 哈希新密码
    const passwordHash = await hashPassword(newPassword)

    // 更新数据库
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        loginAttempts: 0,
        lockedUntil: null,
      },
    })

    return NextResponse.json({ success: true, message: '密码修改成功' })
  } catch (error) {
    console.error('[Change Password] Error:', error)
    return NextResponse.json(
      { error: '修改密码失败' },
      { status: 500 }
    )
  }
})
