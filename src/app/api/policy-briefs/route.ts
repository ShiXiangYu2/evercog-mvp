/**
 * PolicyBrief API 路由
 *
 * 迁移到使用 Service 层
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getPolicyBriefService } from '@/lib/services/policy-brief'
import { handleServiceError } from '@/lib/service-error'

// GET /api/policy-briefs - 列表查询
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)

    const service = getPolicyBriefService()
    const result = await service.list(
      {
        search: searchParams.get('search') || undefined,
        reviewStatus: searchParams.get('reviewStatus') || undefined,
        generatorId: searchParams.get('generatorId') || undefined,
        page: parseInt(searchParams.get('page') || '1'),
        pageSize: parseInt(searchParams.get('pageSize') || '20'),
      },
      user
    )

    return NextResponse.json(result)
  } catch (error) {
    return handleServiceError(error)
  }
})
