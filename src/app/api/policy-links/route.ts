/**
 * PolicyLink API 路由
 *
 * 迁移到使用 Service 层
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { validateBody, createPolicyLinkSchema } from '@/lib/validation'
import { getPolicyLinkService } from '@/lib/services/policy-link'
import { handleServiceError } from '@/lib/service-error'

// GET /api/policy-links - 列表查询
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)

    const service = getPolicyLinkService()
    const result = await service.list(
      {
        search: searchParams.get('search') || undefined,
        status: searchParams.get('status') || undefined,
        source: searchParams.get('source') || undefined,
        customerType: searchParams.get('customerType') || undefined,
        submitterId: searchParams.get('submitterId') || undefined,
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

// POST /api/policy-links - 创建政策链接
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { data, error } = await validateBody(request, createPolicyLinkSchema)
    if (error) return error

    const service = getPolicyLinkService()
    const link = await service.create(
      {
        url: data.url,
        title: data.title,
        source: data.source,
        departmentId: data.departmentId,
        customerType: data.customerType,
      },
      user
    )

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    return handleServiceError(error)
  }
})
