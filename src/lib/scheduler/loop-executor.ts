/**
 * Loop Executor 执行引擎
 *
 * 将 .loop-config.yaml 中的 pipeline skill 映射到现有系统
 * 负责编排和执行 Loop 的各个步骤
 */
import { prisma } from '../prisma'
import { reviewKnowledgeCard } from '../agent/review-service'
import { detectKnowledgeGaps } from '../agent/gap-detector'
import logger from '../logger'

// ==================== 类型定义 ====================

export interface PipelineStep {
  skill: string
  params: Record<string, unknown>
}

export interface LoopConfig {
  name: string
  description: string
  trigger: {
    type: 'schedule' | 'event' | 'condition'
    schedule?: string
    eventType?: string
    condition?: {
      metric: string
      operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
      threshold: number
    }
  }
  pipeline: PipelineStep[]
  termination: {
    max_items_per_loop: number
    timeout_minutes: number
    confidence_threshold: number
  }
}

export interface LoopExecutionResult {
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
  details: Array<{
    skill: string
    status: 'success' | 'failed' | 'skipped'
    itemsProcessed?: number
    error?: string
  }>
}

// ==================== Loop Executor ====================

/**
 * 执行 Loop Pipeline
 */
export async function executeLoopPipeline(config: LoopConfig): Promise<LoopExecutionResult> {
  logger.info('Executing loop pipeline', { loopName: config.name })

  const result: LoopExecutionResult = {
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    details: [],
  }

  for (const step of config.pipeline) {
    try {
      const stepResult = await executeStep(step, config)
      result.details.push({
        skill: step.skill,
        status: 'success',
        itemsProcessed: stepResult.itemsProcessed,
      })
      result.itemsProcessed += stepResult.itemsProcessed
      result.itemsSucceeded += stepResult.itemsSucceeded
      result.itemsFailed += stepResult.itemsFailed
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Step failed', error as Error, { skill: step.skill })
      result.details.push({
        skill: step.skill,
        status: 'failed',
        error: errorMessage,
      })
      result.itemsFailed++
    }
  }

  logger.info('Pipeline completed', { loopName: config.name, ...result })
  return result
}

/**
 * 执行单个 Step
 */
async function executeStep(
  step: PipelineStep,
  config: LoopConfig
): Promise<{ itemsProcessed: number; itemsSucceeded: number; itemsFailed: number }> {
  logger.info('Executing step', { skill: step.skill })

  switch (step.skill) {
    case 'scan-knowledge-cards':
      return scanKnowledgeCards(step.params)
    case 'knowledge-review':
      return knowledgeReview(step.params, config.termination.confidence_threshold)
    case 'scan-experience-records':
      return scanExperienceRecords(step.params)
    case 'analyze-question-patterns':
      return analyzeQuestionPatterns(step.params)
    case 'scan-sop-tasks':
      return scanSOPTasks(step.params)
    case 'check-sop-quality':
      return checkSOPQuality(step.params)
    default:
      logger.warn('Unknown skill, skipping', { skill: step.skill })
      return { itemsProcessed: 0, itemsSucceeded: 0, itemsFailed: 0 }
  }
}

// ==================== Skill 实现 ====================

/**
 * 扫描知识卡
 */
async function scanKnowledgeCards(params: Record<string, unknown>): Promise<{
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
}> {
  const status = (params.status as string[]) || ['pending_review']
  const maxItems = (params.max_items as number) || 50

  const cards = await prisma.knowledgeCard.findMany({
    where: { status: { in: status } },
    take: maxItems,
  })

  logger.info('Scanned knowledge cards', { count: cards.length })
  return { itemsProcessed: cards.length, itemsSucceeded: cards.length, itemsFailed: 0 }
}

/**
 * 知识卡审核
 */
async function knowledgeReview(
  params: Record<string, unknown>,
  confidenceThreshold: number
): Promise<{ itemsProcessed: number; itemsSucceeded: number; itemsFailed: number }> {
  const threshold = (params.quality_threshold as number) || confidenceThreshold

  // 获取待审核的知识卡
  const cards = await prisma.knowledgeCard.findMany({
    where: { status: 'pending_review' },
    take: 50,
  })

  let succeeded = 0
  let failed = 0

  for (const card of cards) {
    try {
      const reviewResult = await reviewKnowledgeCard(card.id)

      // 根据质量分更新状态
      if (reviewResult.score >= threshold) {
        await prisma.knowledgeCard.update({
          where: { id: card.id },
          data: { status: 'published' },
        })
        succeeded++
      } else if (reviewResult.score >= 0.6) {
        // 保持 pending_review，等待人工复核
        succeeded++
      } else {
        await prisma.knowledgeCard.update({
          where: { id: card.id },
          data: { status: 'rejected' },
        })
        failed++
      }
    } catch (error) {
      logger.error('Failed to review card', error as Error, { cardId: card.id })
      failed++
    }
  }

  return { itemsProcessed: cards.length, itemsSucceeded: succeeded, itemsFailed: failed }
}

/**
 * 扫描经验记录
 */
async function scanExperienceRecords(params: Record<string, unknown>): Promise<{
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
}> {
  const maxItems = (params.max_items as number) || 100

  const queries = await prisma.experienceQuery.findMany({
    take: maxItems,
    orderBy: { createdAt: 'desc' },
  })

  logger.info('Scanned experience records', { count: queries.length })
  return { itemsProcessed: queries.length, itemsSucceeded: queries.length, itemsFailed: 0 }
}

/**
 * 分析问题模式
 */
async function analyzeQuestionPatterns(params: Record<string, unknown>): Promise<{
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
}> {
  const identifyGaps = params.identify_gaps !== false

  if (identifyGaps) {
    const result = await detectKnowledgeGaps({ days: 7, minFrequency: 3 })
    return {
      itemsProcessed: result.stats.totalQueries,
      itemsSucceeded: result.gapCount,
      itemsFailed: 0,
    }
  }

  return { itemsProcessed: 0, itemsSucceeded: 0, itemsFailed: 0 }
}

/**
 * 扫描 SOP 任务
 */
async function scanSOPTasks(params: Record<string, unknown>): Promise<{
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
}> {
  const status = (params.status as string[]) || ['in_progress', 'submitted']
  const maxItems = (params.max_items as number) || 30

  const tasks = await prisma.sOPTask.findMany({
    where: { status: { in: status } },
    take: maxItems,
  })

  logger.info('Scanned SOP tasks', { count: tasks.length })
  return { itemsProcessed: tasks.length, itemsSucceeded: tasks.length, itemsFailed: 0 }
}

/**
 * 检查 SOP 质量
 */
async function checkSOPQuality(_params: Record<string, unknown>): Promise<{
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
}> {
  // 获取待审核的 SOP 提交
  const submissions = await prisma.sOPSubmission.findMany({
    where: { status: 'submitted' },
    take: 30,
  })

  let succeeded = 0
  let failed = 0

  for (const submission of submissions) {
    try {
      const content = submission.content || ''
      const hasSteps = content.includes('步骤') || content.includes('Step')
      const hasDetails = content.length > 100

      if (hasSteps && hasDetails) {
        succeeded++
      } else {
        failed++
      }
    } catch (error) {
      logger.error('Failed to check SOP quality', error as Error, {
        submissionId: submission.id,
      })
      failed++
    }
  }

  return { itemsProcessed: submissions.length, itemsSucceeded: succeeded, itemsFailed: failed }
}
