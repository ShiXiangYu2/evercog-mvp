/**
 * Agent 模块类型定义
 *
 * 统一的任务调度和执行接口
 */

// ==================== 任务类型 ====================

/**
 * 任务类型
 */
export type AgentTaskType =
  | 'knowledge_review'
  | 'sop_review'
  | 'brief_generation'
  | 'gap_detection'
  | 'quality_analysis'

/**
 * 任务状态
 */
export type AgentTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

/**
 * 任务优先级
 */
export type AgentTaskPriority = 'high' | 'medium' | 'low'

// ==================== 任务定义 ====================

/**
 * Agent 任务
 */
export interface AgentTask {
  id: string
  type: AgentTaskType
  status: AgentTaskStatus
  priority: AgentTaskPriority
  title: string
  description?: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
  assignedTo?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
  taskId: string
  success: boolean
  output?: Record<string, unknown>
  error?: string
  duration: number
}

// ==================== Agent 接口 ====================

/**
 * Agent 执行器接口
 *
 * 每种任务类型对应一个 Agent 实现
 */
export interface AgentExecutor {
  /** Agent 名称 */
  readonly name: string

  /** 支持的任务类型 */
  readonly supportedTaskTypes: AgentTaskType[]

  /**
   * 执行任务
   *
   * @param input 任务输入
   * @returns 任务输出
   */
  execute(input: Record<string, unknown>): Promise<Record<string, unknown>>
}

// ==================== 编排器接口 ====================

/**
 * Agent 编排器接口
 *
 * 统一管理任务创建、调度和执行
 */
export interface AgentOrchestratorInterface {
  /**
   * 创建任务
   */
  createTask(params: {
    type: AgentTaskType
    title: string
    description?: string
    input: Record<string, unknown>
    priority?: AgentTaskPriority
    createdBy: string
  }): Promise<AgentTask>

  /**
   * 执行任务
   */
  executeTask(taskId: string): Promise<TaskExecutionResult>

  /**
   * 获取任务状态
   */
  getTask(taskId: string): Promise<AgentTask | null>

  /**
   * 获取待处理任务列表
   */
  getPendingTasks(options?: {
    type?: AgentTaskType
    limit?: number
  }): Promise<AgentTask[]>

  /**
   * 取消任务
   */
  cancelTask(taskId: string): Promise<boolean>
}

// ==================== 特定任务结果 ====================

/**
 * 知识卡审核结果
 */
export interface KnowledgeReviewResult {
  score: number
  verdict: 'pass' | 'warning' | 'reject'
  formatCheck: {
    passed: boolean
    issues: string[]
  }
  completenessCheck: {
    score: number
    missingElements: string[]
  }
  riskCheck: {
    hasDisclaimer: boolean
    hasSource: boolean
    risks: string[]
  }
  duplicateCheck: {
    hasDuplicates: boolean
    similarCards: Array<{
      id: string
      title: string
      similarity: number
    }>
  }
  aiComment: string
  suggestedAction: 'approve' | 'revise' | 'reject'
}

/**
 * 知识缺口检测结果
 */
export interface GapDetectionResult {
  detectedAt: Date
  timeRange: {
    start: Date
    end: Date
  }
  gapCount: number
  gaps: Array<{
    question: string
    topic: string
    frequency: number
    priority: 'high' | 'medium' | 'low'
    suggestedAction: 'create_card' | 'update_card' | 'rewrite_card'
    queryIds: string[]
  }>
  stats: {
    totalQueries: number
    coveredQueries: number
    uncoveredQueries: number
    coverageRate: number
  }
}

/**
 * 质量分析结果
 */
export interface QualityAnalysisResult {
  analyzedAt: Date
  metrics: {
    totalCards: number
    publishedCards: number
    averageRating: number
    citationRate: number
    coverageRate: number
  }
  issues: Array<{
    type: 'outdated' | 'low_quality' | 'duplicate' | 'incomplete'
    cardId: string
    title: string
    severity: 'high' | 'medium' | 'low'
    description: string
  }>
  recommendations: string[]
}
