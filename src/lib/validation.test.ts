/**
 * Validation Schema 单元测试
 * 验证 Zod schema 的校验规则
 */
import { describe, it, expect } from 'vitest'
import {
  createPolicyLinkSchema,
  createKnowledgeCardSchema,
  experienceQuerySchema,
  submitSOPSchema,
  reviewSOPSchema,
  knowledgeCardStatusSchema,
  paginationSchema,
} from './validation'

describe('Pagination Schema', () => {
  it('should apply default values', () => {
    const result = paginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.pageSize).toBe(20)
    }
  })

  it('should reject pageSize > 100', () => {
    const result = paginationSchema.safeParse({ pageSize: '200' })
    expect(result.success).toBe(false)
  })
})

describe('Create Policy Link Schema', () => {
  it('should accept valid data', () => {
    const result = createPolicyLinkSchema.safeParse({
      url: 'https://example.com/policy',
      title: '测试政策',
      source: '国务院',
      submitterId: '1',
      customerType: 'restaurant',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid URL', () => {
    const result = createPolicyLinkSchema.safeParse({
      url: 'not-a-url',
      submitterId: '1',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty submitterId', () => {
    const result = createPolicyLinkSchema.safeParse({
      url: 'https://example.com',
      submitterId: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid customerType', () => {
    const result = createPolicyLinkSchema.safeParse({
      url: 'https://example.com',
      submitterId: '1',
      customerType: 'invalid_type',
    })
    expect(result.success).toBe(false)
  })
})

describe('Create Knowledge Card Schema', () => {
  it('should accept valid data', () => {
    const result = createKnowledgeCardSchema.safeParse({
      title: '餐饮代账资料',
      category: 'data_checklist',
      content: '## 资料清单内容',
      creatorId: '1',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty title', () => {
    const result = createKnowledgeCardSchema.safeParse({
      title: '',
      category: 'data_checklist',
      content: '内容',
      creatorId: '1',
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid category', () => {
    const result = createKnowledgeCardSchema.safeParse({
      title: '标题',
      category: 'invalid',
      content: '内容',
      creatorId: '1',
    })
    expect(result.success).toBe(false)
  })

  it('should default visibilityScope to department', () => {
    const result = createKnowledgeCardSchema.safeParse({
      title: '标题',
      category: 'faq',
      content: '内容',
      creatorId: '1',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.visibilityScope).toBe('department')
    }
  })
})

describe('Experience Query Schema', () => {
  it('should accept valid data', () => {
    const result = experienceQuerySchema.safeParse({
      question: '餐饮客户代账需要什么材料？',
      callerId: '1',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty question', () => {
    const result = experienceQuerySchema.safeParse({
      question: '',
      callerId: '1',
    })
    expect(result.success).toBe(false)
  })

  it('should reject question > 2000 chars', () => {
    const result = experienceQuerySchema.safeParse({
      question: 'a'.repeat(2001),
      callerId: '1',
    })
    expect(result.success).toBe(false)
  })
})

describe('Submit SOP Schema', () => {
  it('should accept valid data', () => {
    const result = submitSOPSchema.safeParse({
      content: '## SOP 内容\n\n### 第一步\n完成操作',
      submitterId: '1',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty content', () => {
    const result = submitSOPSchema.safeParse({
      content: '',
      submitterId: '1',
    })
    expect(result.success).toBe(false)
  })
})

describe('Review SOP Schema', () => {
  it('should accept approve action', () => {
    const result = reviewSOPSchema.safeParse({
      submissionId: '1',
      reviewerId: '2',
      action: 'approve',
      comment: '通过',
    })
    expect(result.success).toBe(true)
  })

  it('should accept reject action', () => {
    const result = reviewSOPSchema.safeParse({
      submissionId: '1',
      reviewerId: '2',
      action: 'reject',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid action', () => {
    const result = reviewSOPSchema.safeParse({
      submissionId: '1',
      reviewerId: '2',
      action: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('Knowledge Card Status Schema', () => {
  it('should accept submit action', () => {
    const result = knowledgeCardStatusSchema.safeParse({
      action: 'submit',
      userId: '1',
    })
    expect(result.success).toBe(true)
  })

  it('should accept approve with comment', () => {
    const result = knowledgeCardStatusSchema.safeParse({
      action: 'approve',
      userId: '1',
      comment: '内容准确',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid action', () => {
    const result = knowledgeCardStatusSchema.safeParse({
      action: 'publish',
      userId: '1',
    })
    expect(result.success).toBe(false)
  })
})
