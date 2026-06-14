/**
 * KnowledgeCard API 路由
 *
 * 迁移到使用 Service 层
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { validateBody, createKnowledgeCardSchema } from '@/lib/validation'
import { getKnowledgeCardService, type KnowledgeCardListFilters } from '@/lib/services/knowledge-card'
import { handleServiceError } from '@/lib/service-error'

// GET /api/knowledge-cards - 列表查询
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)

    const service = getKnowledgeCardService()
    const result = await service.list(
      {
        search: searchParams.get('search') || undefined,
        category: searchParams.get('category') || undefined,
        status: searchParams.get('status') || undefined,
        customerType: searchParams.get('customerType') || undefined,
        tags: searchParams.get('tags') || undefined,
        page: parseInt(searchParams.get('page') || '1'),
        pageSize: parseInt(searchParams.get('pageSize') || '20'),
      } as KnowledgeCardListFilters,
      user
    )

    return NextResponse.json(result)
  } catch (error) {
    return handleServiceError(error)
  }
})

// POST /api/knowledge-cards - 创建知识卡
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { data, error } = await validateBody(request, createKnowledgeCardSchema)
    if (error) return error

    const service = getKnowledgeCardService()
    const card = await service.create(
      {
        title: data.title,
        category: data.category,
        tags: data.tags,
        content: data.content,
        departmentId: data.departmentId,
        customerType: data.customerType,
        source: data.source,
        riskNotes: data.riskNotes,
        visibilityScope: data.visibilityScope,
      },
      user
    )

    return NextResponse.json(card, { status: 201 })
  } catch (error) {
    return handleServiceError(error)
  }
})
