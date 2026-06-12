import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { canViewKnowledgeCard, filterKnowledgeCards } from '@/lib/permissions'
import { withAuth } from '@/lib/auth'
import { validateBody, createKnowledgeCardSchema } from '@/lib/validation'

// GET /api/knowledge-cards - List knowledge cards with search, filters, and permission filtering
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const status = searchParams.get('status') || ''
  const customerType = searchParams.get('customerType') || ''
  const tags = searchParams.get('tags') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const where: Record<string, unknown> = {}

  // Search in title and content
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ]
  }

  if (category) where.category = category
  if (status) where.status = status
  if (customerType) where.customerType = customerType

  // Tags search - check if the tags JSON string contains the search term
  if (tags) {
    where.tags = { contains: tags }
  }

  let allCards = await prisma.knowledgeCard.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, role: true, departmentId: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // 按当前用户权限过滤
  allCards = filterKnowledgeCards(
    { id: user.id, name: user.name, role: user.role, departmentId: user.departmentId },
    allCards
  ) as typeof allCards

  const total = allCards.length
  const items = allCards.slice((page - 1) * pageSize, page * pageSize)

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
})

// POST /api/knowledge-cards - Create a new knowledge card
export const POST = withAuth(async (request, { user }) => {
  try {
    const { data, error } = await validateBody(request, createKnowledgeCardSchema)
    if (error) return error

    const {
      title,
      category,
      tags,
      content,
      departmentId,
      customerType,
      source,
      riskNotes,
      visibilityScope,
    } = data

    const card = await prisma.knowledgeCard.create({
      data: {
        title,
        category,
        tags: tags || null,
        content,
        departmentId: departmentId || null,
        customerType: customerType || null,
        source: source || null,
        riskNotes: riskNotes || null,
        visibilityScope,
        status: 'draft',
        creatorId: user.id,
      },
      include: {
        creator: { select: { id: true, name: true, role: true } },
      },
    })

    await createAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'knowledge_card',
      entityId: card.id,
      details: { title: card.title },
    })

    return NextResponse.json(card, { status: 201 })
  } catch (err) {
    console.error('Failed to create knowledge card:', err)
    return NextResponse.json(
      { error: 'Failed to create knowledge card' },
      { status: 500 }
    )
  }
})
