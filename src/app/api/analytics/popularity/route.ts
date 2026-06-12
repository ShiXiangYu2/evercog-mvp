/**
 * GET /api/analytics/popularity - 获取热度排名
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getPopularity } from '@/lib/analytics/popularity'
import logger from '@/lib/logger'

export const GET = withAuth(async () => {
  try {
    const result = await getPopularity()

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Failed to get popularity', error as Error)
    return NextResponse.json(
      { error: 'Failed to get popularity' },
      { status: 500 }
    )
  }
})
