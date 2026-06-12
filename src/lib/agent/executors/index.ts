/**
 * Agent 执行器统一导出
 */
export { KnowledgeReviewExecutor } from './knowledge-review-executor'
export { GapDetectionExecutor } from './gap-detection-executor'

// ==================== 执行器工厂 ====================

import type { AgentExecutor, AgentTaskType } from '../types'
import { KnowledgeReviewExecutor } from './knowledge-review-executor'
import { GapDetectionExecutor } from './gap-detection-executor'

/**
 * 创建所有默认执行器
 */
export function createDefaultExecutors(): AgentExecutor[] {
  return [
    new KnowledgeReviewExecutor(),
    new GapDetectionExecutor(),
  ]
}

/**
 * 根据任务类型获取执行器
 */
export function getExecutorByTaskType(taskType: AgentTaskType): AgentExecutor | null {
  const executors = createDefaultExecutors()
  return executors.find(e => e.supportedTaskTypes.includes(taskType)) || null
}
