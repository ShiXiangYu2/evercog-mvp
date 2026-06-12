/**
 * KnowledgeSearch 单元测试
 */
import { describe, it, expect, vi } from 'vitest'
import { extractKeywords, searchKnowledgeCards } from '../knowledge-search'
import type { AuthUser } from '../permission-guard'

// ==================== Mock 函数 ====================

const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}))

vi.mock('../prisma', () => ({
  prisma: {
    knowledgeCard: {
      findMany: mockFindMany,
    },
  },
}))

vi.mock('../logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// ==================== 测试用户 ====================

const testUser: AuthUser = {
  id: 'user-1',
  name: 'Test User',
  role: 'sales',
  departmentId: 'dept-1',
  email: 'test@example.com',
}

// ==================== 测试 ====================

describe('extractKeywords', () => {
  it('should extract domain keywords', () => {
    const keywords = extractKeywords('餐饮客户代账需要什么材料？')

    expect(keywords).toContain('餐饮')
    expect(keywords).toContain('代账')
    expect(keywords).toContain('材料')
  })

  it('should extract general keywords', () => {
    const keywords = extractKeywords('如何 办理 营业执照？')

    // "如何" 是停用词，"办理" 是单字被过滤，"营业执照" 会被提取
    expect(keywords).toContain('营业执照')
  })

  it('should filter stop words', () => {
    const keywords = extractKeywords('请问这个是什么？')

    expect(keywords).not.toContain('请问')
    expect(keywords).not.toContain('这个')
    expect(keywords).not.toContain('是什么')
  })

  it('should return original question if no keywords found', () => {
    const keywords = extractKeywords('你好')

    expect(keywords).toEqual(['你好'])
  })

  it('should handle empty input', () => {
    const keywords = extractKeywords('')

    expect(keywords).toEqual([''])
  })

  it('should disable domain boost when option is false', () => {
    const keywords = extractKeywords('餐饮客户代账', { enableDomainBoost: false })

    expect(keywords).not.toContain('餐饮')
    expect(keywords).not.toContain('代账')
  })
})

describe('searchKnowledgeCards', () => {
  const mockCards = [
    {
      id: 'card-1',
      title: '餐饮门店代账资料清单',
      category: 'data_checklist',
      tags: '["餐饮","资料"]',
      content: '餐饮客户需要准备的资料包括营业执照、法人身份证等',
      departmentId: 'dept-1',
      customerType: 'restaurant',
      source: '财务部',
      riskNotes: null,
      visibilityScope: 'public',
      status: 'published',
      version: 1,
      creatorId: 'creator-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: 'creator-1', name: 'Creator', role: 'finance', departmentId: 'dept-1' },
    },
    {
      id: 'card-2',
      title: '常见税务风险提醒',
      category: 'risk_reminder',
      tags: '["税务","风险"]',
      content: '税务风险包括未按时申报、发票违规等',
      departmentId: 'dept-1',
      customerType: null,
      source: '税务部',
      riskNotes: '注意合规',
      visibilityScope: 'public',
      status: 'published',
      version: 1,
      creatorId: 'creator-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: 'creator-2', name: 'Creator2', role: 'finance', departmentId: 'dept-1' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should search and return scored results', async () => {
    mockFindMany.mockResolvedValue(mockCards)

    const results = await searchKnowledgeCards('餐饮代账', testUser)

    expect(results.length).toBeGreaterThan(0)
    // 餐饮+代账匹配，card-1 应该排第一
    expect(results[0].card.id).toBe('card-1')
    expect(results[0].score).toBeGreaterThan(0)
  })

  it('should filter by permission', async () => {
    mockFindMany.mockResolvedValue([
      { ...mockCards[0], visibilityScope: 'department', departmentId: 'dept-2' },
    ])

    const results = await searchKnowledgeCards('餐饮', testUser)

    expect(results).toHaveLength(0) // 不同部门，不可见
  })

  it('should respect maxResults option', async () => {
    mockFindMany.mockResolvedValue(mockCards)

    const results = await searchKnowledgeCards('资料', testUser, { maxResults: 1 })

    expect(results).toHaveLength(1)
  })

  it('should return empty array when no matches', async () => {
    mockFindMany.mockResolvedValue([])

    const results = await searchKnowledgeCards('完全无关的问题xyz', testUser)

    expect(results).toHaveLength(0)
  })

  it('should handle cards with null tags', async () => {
    mockFindMany.mockResolvedValue([
      { ...mockCards[1], tags: null },
    ])

    const results = await searchKnowledgeCards('税务', testUser)

    expect(results).toHaveLength(1)
  })
})
