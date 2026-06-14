/**
 * GET /api/export/audit-logs/csv - 导出审计日志为 CSV
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { getCSVGenerator } from '@/lib/export/csv-generator'
import logger from '@/lib/logger'

export const GET = withAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url)
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const action = searchParams.get('action')
      const entityType = searchParams.get('entityType')

      // 构建查询条件
      const where: Record<string, unknown> = {}
      if (action) where.action = action
      if (entityType) where.entityType = entityType
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
          (where.createdAt as Record<string, Date>).gte = new Date(startDate)
        }
        if (endDate) {
          (where.createdAt as Record<string, Date>).lte = new Date(endDate)
        }
      }

      // 获取审计日志
      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000, // 限制最大导出数量
      })

      // 生成 CSV
      const csvGenerator = getCSVGenerator()
      const csvContent = csvGenerator.generateAuditLogsCSV(
        logs.map((log) => ({
          id: log.id,
          userName: log.user.name,
          userRole: log.user.role,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          details: log.details,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt,
        }))
      )

      // 返回 CSV 文件
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="audit-logs.csv"',
        },
      })
    } catch (error) {
      logger.error('Failed to generate CSV', error as Error)
      return NextResponse.json(
        { error: 'Failed to generate CSV' },
        { status: 500 }
      )
    }
  },
  { requiredRoles: ['admin', 'finance', 'mentor', 'ai_info'] }
)
