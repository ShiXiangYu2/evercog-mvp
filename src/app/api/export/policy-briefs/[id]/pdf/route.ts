/**
 * GET /api/export/policy-briefs/[id]/pdf - 导出政策简报为 PDF
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { getPDFGenerator } from '@/lib/export/pdf-generator'
import logger from '@/lib/logger'

export const GET = withAuth(async (request, { params }) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing policy brief ID' }, { status: 400 })
    }

    // 获取政策简报
    const brief = await prisma.policyBrief.findUnique({
      where: { id },
      include: {
        generator: { select: { name: true } },
      },
    })

    if (!brief) {
      return NextResponse.json({ error: 'Policy brief not found' }, { status: 404 })
    }

    // 生成 PDF
    const pdfGenerator = getPDFGenerator()
    const pdfBytes = await pdfGenerator.generatePolicyBriefPDF({
      title: brief.title,
      summary: brief.summary,
      applicableTo: brief.applicableTo || '',
      keyClauses: brief.keyClauses || '',
      actionSuggestions: brief.actionSuggestions || '',
      riskReminders: brief.riskReminders || '',
      sourceUrl: brief.sourceUrl || '',
      generatorName: brief.generator.name,
      generatedAt: brief.createdAt,
    })

    // 返回 PDF 文件
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="policy-brief-${brief.title.slice(0, 50)}.pdf"`,
      },
    })
  } catch (error) {
    logger.error('Failed to generate PDF', error as Error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
})
