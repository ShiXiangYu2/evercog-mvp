/**
 * GET /api/export/knowledge-cards/excel - 导出知识卡为 Excel
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { getExcelGenerator } from '@/lib/export/excel-generator'
import logger from '@/lib/logger'

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const departmentId = searchParams.get('departmentId')

    // 构建查询条件
    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (status) where.status = status
    if (departmentId) where.departmentId = departmentId

    // 获取知识卡
    const cards = await prisma.knowledgeCard.findMany({
      where,
      include: {
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 生成 Excel
    const excelGenerator = getExcelGenerator()
    const buffer = await excelGenerator.generateKnowledgeCardsExcel(
      cards.map((card) => ({
        id: card.id,
        title: card.title,
        category: card.category,
        content: card.content,
        tags: card.tags,
        source: card.source,
        riskNotes: card.riskNotes,
        visibilityScope: card.visibilityScope,
        status: card.status,
        creatorName: card.creator.name,
        departmentName: null, // Department name not available via relation
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
      }))
    )

    // 返回 Excel 文件
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="knowledge-cards.xlsx"',
      },
    })
  } catch (error) {
    logger.error('Failed to generate Excel', error as Error)
    return NextResponse.json(
      { error: 'Failed to generate Excel' },
      { status: 500 }
    )
  }
})
