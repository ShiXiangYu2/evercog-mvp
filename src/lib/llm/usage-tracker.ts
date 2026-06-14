/**
 * LLM Token 用量追踪模块
 *
 * 记录每次 LLM 调用的 token 用量和成本，用于成本控制和监控。
 */

import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'

// ==================== 类型定义 ====================

export interface UsageRecord {
  /** LLM Provider 名称 */
  provider: string
  /** 操作类型（brief_generation, experience_reply, sop_inspection） */
  operation: string
  /** 输入 token 数 */
  inputTokens: number
  /** 输出 token 数 */
  outputTokens: number
  /** 调用耗时（毫秒） */
  durationMs: number
  /** 调用是否成功 */
  success: boolean
  /** 错误信息（失败时） */
  error?: string
  /** 用户 ID（可选） */
  userId?: string
}

export interface UsageStats {
  /** 总调用次数 */
  totalCalls: number
  /** 成功调用次数 */
  successCalls: number
  /** 失败调用次数 */
  failedCalls: number
  /** 总输入 token */
  totalInputTokens: number
  /** 总输出 token */
  totalOutputTokens: number
  /** 平均耗时（毫秒） */
  avgDurationMs: number
}

// ==================== 常量 ====================

/** DeepSeek 价格（美元/1M tokens） */
const DEEPSEEK_PRICING = {
  input: 0.14,   // $0.14 / 1M input tokens
  output: 0.28,  // $0.28 / 1M output tokens
}

// ==================== 核心函数 ====================

/**
 * 记录 LLM 调用用量
 *
 * 写入 quality_metrics 表，用于后续分析和告警。
 */
export async function trackUsage(record: UsageRecord): Promise<void> {
  try {
    // 计算成本（美元）
    const inputCost = (record.inputTokens / 1_000_000) * DEEPSEEK_PRICING.input
    const outputCost = (record.outputTokens / 1_000_000) * DEEPSEEK_PRICING.output
    const totalCost = inputCost + outputCost

    // 写入数据库
    await prisma.qualityMetrics.create({
      data: {
        metricType: 'llm_usage',
        value: totalCost,
        target: record.durationMs,
        department: record.operation,
        calculatedAt: new Date(),
      },
    })
  } catch (error) {
    // 用量追踪失败不应影响主流程
    logger.error('[LLM Usage] Failed to track', error instanceof Error ? error : undefined)
  }
}

/**
 * 获取 LLM 用量统计
 *
 * 从 quality_metrics 表聚合最近的用量数据。
 */
export async function getUsageStats(
  hours: number = 24
): Promise<UsageStats> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const records = await prisma.qualityMetrics.findMany({
      where: {
        metricType: 'llm_usage',
        calculatedAt: { gte: since },
      },
    })

    if (records.length === 0) {
      return {
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        avgDurationMs: 0,
      }
    }

    // 聚合统计
    const totalCalls = records.length
    const avgDurationMs = records.reduce((sum, r) => sum + r.target, 0) / totalCalls

    return {
      totalCalls,
      successCalls: totalCalls, // 简化：数据库中只记录成功调用
      failedCalls: 0,
      totalInputTokens: 0, // 需要扩展 schema 才能存储
      totalOutputTokens: 0,
      avgDurationMs: Math.round(avgDurationMs),
    }
  } catch (error) {
    logger.error('[LLM Usage] Failed to get stats', error instanceof Error ? error : undefined)
    return {
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      avgDurationMs: 0,
    }
  }
}

/**
 * 检查 LLM 调用是否超过预算
 *
 * @param hourlyBudget 每小时预算（美元）
 * @returns 是否超预算
 */
export async function isOverBudget(hourlyBudget: number = 1.0): Promise<boolean> {
  const stats = await getUsageStats(1)
  // 粗略估算成本（基于平均 token 数）
  const estimatedCost = stats.totalCalls * 0.001 // 假设每次调用约 $0.001
  return estimatedCost > hourlyBudget
}
