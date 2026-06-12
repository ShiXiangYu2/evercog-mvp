/**
 * API 输入校验 Schema
 * 使用 Zod 定义所有 API 的请求体校验规则
 */
import { z } from 'zod'

// ==================== 通用 ====================

/** 分页参数 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

// ==================== 政策链接 ====================

export const createPolicyLinkSchema = z.object({
  url: z.string().url('请输入有效的 URL').max(2000),
  title: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  submitterId: z.string().min(1, '提交人不能为空'),
  departmentId: z.string().optional(),
  customerType: z.enum(['restaurant', 'retail', 'store', 'advertising', 'startup', 'individual']).optional(),
})

export const updatePolicyLinkSchema = z.object({
  title: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  departmentId: z.string().optional(),
  customerType: z.enum(['restaurant', 'retail', 'store', 'advertising', 'startup', 'individual']).optional(),
  status: z.enum(['submitted', 'collected', 'brief_generated', 'reviewed', 'pushed', 'archived']).optional(),
})

// ==================== 政策简报 ====================

export const generateBriefSchema = z.object({
  generatorId: z.string().min(1, '生成人不能为空'),
})

export const updateBriefSchema = z.object({
  title: z.string().max(200).optional(),
  summary: z.string().max(2000).optional(),
  applicableTo: z.string().max(1000).optional(),
  keyClauses: z.string().max(5000).optional(),
  actionSuggestions: z.string().max(5000).optional(),
  riskReminders: z.string().max(5000).optional(),
  reviewStatus: z.enum(['draft', 'pending_review', 'reviewed', 'rejected']).optional(),
})

// ==================== 知识卡 ====================

export const createKnowledgeCardSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  category: z.enum(['data_checklist', 'tax_process', 'risk_reminder', 'service_boundary', 'faq', 'experience']),
  tags: z.string().max(1000).optional(),
  content: z.string().min(1, '内容不能为空').max(50000),
  departmentId: z.string().optional(),
  customerType: z.enum(['restaurant', 'retail', 'store', 'advertising', 'startup', 'individual']).optional(),
  source: z.string().max(200).optional(),
  riskNotes: z.string().max(2000).optional(),
  visibilityScope: z.enum(['department', 'role', 'public']).default('department'),
  creatorId: z.string().min(1, '创建人不能为空'),
})

export const updateKnowledgeCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.enum(['data_checklist', 'tax_process', 'risk_reminder', 'service_boundary', 'faq', 'experience']).optional(),
  tags: z.string().max(1000).optional(),
  content: z.string().min(1).max(50000).optional(),
  departmentId: z.string().optional(),
  customerType: z.enum(['restaurant', 'retail', 'store', 'advertising', 'startup', 'individual']).optional(),
  source: z.string().max(200).optional(),
  riskNotes: z.string().max(2000).optional(),
  visibilityScope: z.enum(['department', 'role', 'public']).optional(),
})

export const knowledgeCardStatusSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'archive']),
  userId: z.string().min(1, '操作人不能为空'),
  comment: z.string().max(2000).optional(),
})

// ==================== 经验调用 ====================

export const experienceQuerySchema = z.object({
  question: z.string().min(1, '问题不能为空').max(2000, '问题最长 2000 字符'),
  callerId: z.string().min(1, '调用人不能为空'),
})

// ==================== SOP 训练 ====================

export const createSOPTaskSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  description: z.string().max(2000).optional(),
  template: z.string().max(20000).optional(),
  requirements: z.string().max(2000).optional(),
  mentorId: z.string().min(1, '导师不能为空'),
  traineeId: z.string().min(1, '新人不能为空'),
  dueDate: z.string().datetime().optional(),
})

export const submitSOPSchema = z.object({
  content: z.string().min(1, '提交内容不能为空').max(50000),
  submitterId: z.string().min(1, '提交人不能为空'),
})

export const reviewSOPSchema = z.object({
  submissionId: z.string().min(1, '提交 ID 不能为空'),
  reviewerId: z.string().min(1, '审核人不能为空'),
  action: z.enum(['approve', 'reject', 'revision_required']),
  comment: z.string().max(2000).optional(),
})

// ==================== 推送记录 ====================

export const createPushRecordSchema = z.object({
  policyBriefId: z.string().min(1, '政策简报不能为空'),
  channel: z.enum(['wecom', 'email', 'sms']).default('wecom'),
  targetType: z.enum(['department', 'role', 'user']),
  targets: z.array(z.object({
    id: z.string().optional(),
    name: z.string().max(100).optional(),
  })).min(1, '至少选择一个推送目标'),
  pusherId: z.string().min(1, '推送人不能为空'),
})

// ==================== 审计日志 ====================

export const auditLogQuerySchema = paginationSchema.extend({
  entityType: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
})

// ==================== 校验工具 ====================

import { NextRequest, NextResponse } from 'next/server'

/**
 * 校验请求体并返回解析后的数据
 * 校验失败时自动返回 400 错误
 */
export async function validateBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      return {
        error: NextResponse.json(
          { error: '输入校验失败', details: errors },
          { status: 400 }
        ),
      }
    }

    return { data: result.data }
  } catch {
    return {
      error: NextResponse.json(
        { error: '请求体格式错误' },
        { status: 400 }
      ),
    }
  }
}

/**
 * 校验查询参数
 */
export function validateQuery<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): { data: z.infer<T>; error?: never } | { data?: never; error: NextResponse } {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    return {
      error: NextResponse.json(
        { error: '查询参数校验失败', details: errors },
        { status: 400 }
      ),
    }
  }

  return { data: result.data }
}
