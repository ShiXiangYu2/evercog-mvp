/**
 * API 杈撳叆鏍￠獙 Schema
 * 浣跨敤 Zod 瀹氫箟鎵€鏈?API 鐨勮姹備綋鏍￠獙瑙勫垯
 */
import { z } from 'zod'

// ==================== 閫氱敤 ====================

/** 鍒嗛〉鍙傛暟 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

// ==================== 鏀跨瓥閾炬帴 ====================

export const createPolicyLinkSchema = z.object({
  url: z.string().url('璇疯緭鍏ユ湁鏁堢殑 URL').max(2000),
  title: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
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

// ==================== 鏀跨瓥绠€鎶?====================

export const generateBriefSchema = z.object({
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

// ==================== 鐭ヨ瘑鍗?====================

export const createKnowledgeCardSchema = z.object({
  title: z.string().min(1, '鏍囬涓嶈兘涓虹┖').max(200),
  category: z.enum(['data_checklist', 'tax_process', 'risk_reminder', 'service_boundary', 'faq', 'experience']),
  tags: z.string().max(1000).optional(),
  content: z.string().min(1, '鍐呭涓嶈兘涓虹┖').max(50000),
  departmentId: z.string().optional(),
  customerType: z.enum(['restaurant', 'retail', 'store', 'advertising', 'startup', 'individual']).optional(),
  source: z.string().max(200).optional(),
  riskNotes: z.string().max(2000).optional(),
  visibilityScope: z.enum(['department', 'role', 'public']).default('department'),
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
  comment: z.string().max(2000).optional(),
})

// ==================== 缁忛獙璋冪敤 ====================

export const experienceQuerySchema = z.object({
  question: z.string().min(1, '闂涓嶈兘涓虹┖').max(2000, '闂鏈€闀?2000 瀛楃'),
})

// ==================== SOP 璁粌 ====================

export const createSOPTaskSchema = z.object({
  title: z.string().min(1, '鏍囬涓嶈兘涓虹┖').max(200),
  description: z.string().max(2000).optional(),
  template: z.string().max(20000).optional(),
  requirements: z.string().max(2000).optional(),
  mentorId: z.string().min(1, '瀵煎笀涓嶈兘涓虹┖'),
  traineeId: z.string().min(1, '鏂颁汉涓嶈兘涓虹┖'),
  dueDate: z.string().datetime().optional(),
})

export const submitSOPSchema = z.object({
  content: z.string().min(1, '鎻愪氦鍐呭涓嶈兘涓虹┖').max(50000),
})

export const reviewSOPSchema = z.object({
  submissionId: z.string().min(1, '鎻愪氦 ID 涓嶈兘涓虹┖'),
  action: z.enum(['approve', 'reject', 'revision_required']),
  comment: z.string().max(2000).nullable().optional(),
})

// ==================== 鎺ㄩ€佽褰?====================

export const createPushRecordSchema = z.object({
  policyBriefId: z.string().min(1, 'Policy brief is required'),
  channel: z.enum(['wecom', 'email', 'sms']).default('wecom'),
  targetType: z.enum(['department', 'role', 'user']),
  targets: z.array(z.object({
    id: z.string().optional(),
    name: z.string().max(100).optional(),
  })).min(1, 'At least one push target is required'),
})

// ==================== 瀹¤鏃ュ織 ====================

export const auditLogQuerySchema = paginationSchema.extend({
  entityType: z.string().optional(),
  action: z.string().optional(),
})

// ==================== 鏍￠獙宸ュ叿 ====================

import { NextRequest, NextResponse } from 'next/server'

/**
 * 鏍￠獙璇锋眰浣撳苟杩斿洖瑙ｆ瀽鍚庣殑鏁版嵁
 * 鏍￠獙澶辫触鏃惰嚜鍔ㄨ繑鍥?400 閿欒
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
          { error: '杈撳叆鏍￠獙澶辫触', details: errors },
          { status: 400 }
        ),
      }
    }

    return { data: result.data }
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      ),
    }
  }
}

/**
 * 鏍￠獙鏌ヨ鍙傛暟
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
        { error: '鏌ヨ鍙傛暟鏍￠獙澶辫触', details: errors },
        { status: 400 }
      ),
    }
  }

  return { data: result.data }
}
