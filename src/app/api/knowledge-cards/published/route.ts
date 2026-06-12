import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { filterKnowledgeCards } from '@/lib/permissions'

// GET /api/knowledge-cards/published - Get published knowledge cards for experience query
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const tags = searchParams.get('tags') || ''
  const departmentId = searchParams.get('departmentId') || ''
  const customerType = searchParams.get('customerType') || ''

  const where: Record<string, unknown> = {
    status: 'published',
  }

  // Search in title, content, and tags
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
      { tags: { contains: search } },
    ]
  }

  if (tags) {
    where.tags = { contains: tags }
  }

  if (departmentId) {
    where.departmentId = departmentId
  }

  if (customerType) {
    where.customerType = customerType
  }

  let items = await prisma.knowledgeCard.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, role: true, departmentId: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // 按权限过滤
  items = filterKnowledgeCards(
    { id: user.id, name: user.name, role: user.role, departmentId: user.departmentId },
    items
  ) as typeof items

  return NextResponse.json({ items })
})
