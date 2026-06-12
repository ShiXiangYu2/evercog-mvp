import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserPermissions, getRolePermissionMatrix } from '@/lib/permissions'
import { withAuth } from '@/lib/auth'

// GET /api/settings/permissions - 获取权限信息
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const { searchParams } = new URL(request.url)
  const targetUserId = searchParams.get('userId')

  // 返回权限矩阵（所有角色的权限说明）
  const matrix = getRolePermissionMatrix()

  // 如果指定了用户，返回该用户的权限概览
  if (targetUserId) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { department: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userPerms = getUserPermissions({
      id: targetUser.id,
      name: targetUser.name,
      role: targetUser.role,
      departmentId: targetUser.departmentId,
    })

    return NextResponse.json({
      matrix,
      userPermissions: userPerms,
    })
  }

  // 默认返回当前用户的权限
  const userPerms = getUserPermissions({
    id: user.id,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId,
  })

  return NextResponse.json({
    matrix,
    userPermissions: userPerms,
  })
})
