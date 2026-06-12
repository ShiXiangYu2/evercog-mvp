import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { getLLMProvider } from '@/lib/llm-provider'
import { withAuth } from '@/lib/auth'

// POST /api/policy-links/[id]/generate-brief - Generate a brief for a policy link
export const POST = withAuth(async (request, { user, params }) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing policy link ID' }, { status: 400 })
    }

    // Fetch the policy link
    const policyLink = await prisma.policyLink.findUnique({
      where: { id },
    })

    if (!policyLink) {
      return NextResponse.json(
        { error: 'Policy link not found' },
        { status: 404 }
      )
    }

    // Check if brief already exists
    if (policyLink.status === 'brief_generated' || policyLink.status === 'reviewed') {
      const existingBrief = await prisma.policyBrief.findUnique({
        where: { policyLinkId: id },
      })
      if (existingBrief) {
        return NextResponse.json(
          { error: 'Brief already exists for this policy link' },
          { status: 409 }
        )
      }
    }

    // Generate the brief using LLM provider
    const llm = getLLMProvider()
    const briefData = await llm.generateBrief({
      title: policyLink.title || '未命名政策',
      source: policyLink.source || '未知来源',
      customerType: policyLink.customerType || 'general',
      url: policyLink.url,
    })

    // Create the brief in database
    const brief = await prisma.policyBrief.create({
      data: {
        policyLinkId: id,
        title: briefData.title,
        summary: briefData.summary,
        applicableTo: briefData.applicableTo,
        keyClauses: briefData.keyClauses,
        actionSuggestions: briefData.actionSuggestions,
        riskReminders: briefData.riskReminders,
        sourceUrl: briefData.sourceUrl,
        generatorId: user.id,
        reviewStatus: 'draft',
      },
      include: {
        generator: {
          select: { id: true, name: true, role: true },
        },
        policyLink: true,
      },
    })

    // Update policy link status
    await prisma.policyLink.update({
      where: { id },
      data: { status: 'brief_generated' },
    })

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'generate',
      entityType: 'policy_brief',
      entityId: brief.id,
      details: { policyLinkId: id, title: brief.title },
    })

    return NextResponse.json(brief, { status: 201 })
  } catch (error) {
    console.error('Failed to generate brief:', error)
    return NextResponse.json(
      { error: 'Failed to generate brief' },
      { status: 500 }
    )
  }
})
