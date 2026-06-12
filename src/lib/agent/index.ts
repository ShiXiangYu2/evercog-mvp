/**
 * Agent 模块统一导出
 */

// 导出类型
export type {
  AgentTask,
  AgentTaskType,
  AgentTaskStatus,
  AgentTaskPriority,
  AgentExecutor,
  AgentOrchestratorInterface,
  TaskExecutionResult,
  KnowledgeReviewResult,
  GapDetectionResult,
  QualityAnalysisResult,
} from './types'

// 导出服务
export { ReviewService } from './review-service'
export { TaskExecutor } from './task-executor'
export { GapDetector } from './gap-detector'

// 导出编排器
export { AgentOrchestrator, getAgentOrchestrator } from './orchestrator'

// 导出执行器
export { KnowledgeReviewExecutor, GapDetectionExecutor, createDefaultExecutors } from './executors'

// ==================== 初始化函数 ====================

import { getAgentOrchestrator } from './orchestrator'
import { createDefaultExecutors } from './executors'
import logger from '../logger'

/**
 * 初始化 Agent 系统
 *
 * 注册所有默认执行器到编排器
 */
export function initializeAgentSystem(): void {
  const orchestrator = getAgentOrchestrator()
  const executors = createDefaultExecutors()

  for (const executor of executors) {
    orchestrator.registerExecutor(executor)
  }

  logger.info('Agent system initialized', {
    executorCount: executors.length,
  })
}
