/**
 * Decision Engine 类型定义
 */

// ==================== 系统状态 ====================

export interface SystemHealthMetrics {
  pendingTaskCount: number
  failedTaskCount24h: number
  knowledgeGapCount: number
  unresolvedFeedbackCount: number
  averageCardQualityScore: number
  knowledgeCoverageRate: number
  lastLoopExecutionTime: Date | null
}

export interface DecisionContext {
  systemHealth: SystemHealthMetrics
  pendingTasks: Array<{
    id: string
    type: string
    priority: string
    createdAt: Date
  }>
  recentEvents: Array<{
    type: string
    timestamp: Date
  }>
  timeContext: {
    hour: number
    dayOfWeek: number
    isWorkHour: boolean
  }
}

// ==================== 决策 ====================

export type DecisionType = 'create_task' | 'trigger_loop' | 'adjust_priority' | 'escalate' | 'no_action'
export type RiskLevel = 'safe' | 'caution' | 'dangerous'
export type DecisionOutcome = 'success' | 'failed' | 'pending_approval'

export interface DecisionAction {
  type:
    | 'scan'
    | 'analyze'
    | 'generate_draft'
    | 'create_agent_task'
    | 'trigger_loop'
    | 'update_priority'
    | 'send_notification'
    | 'publish_knowledge_card'
    | 'reject_knowledge_card'
    | 'push_to_users'
    | 'modify_sop'
    | 'delete_user'
    | 'modify_permissions'
    | 'execute_database_migration'
    | 'modify_security_config'
    | 'access_unauthorized_external_api'
  params: Record<string, unknown>
}

export interface Decision {
  id: string
  decisionType: DecisionType
  reasoning: string
  confidence: number
  riskLevel: RiskLevel
  actions: DecisionAction[]
  requiresApproval: boolean
  context?: DecisionContext
}

export interface DecisionResult {
  decision: Decision
  outcome: DecisionOutcome
  error?: string
}

// ==================== 规则 ====================

export interface DecisionRule {
  id: string
  name: string
  condition: (context: DecisionContext) => boolean
  action: DecisionType
  params: Record<string, unknown>
  riskLevel: RiskLevel
  requiresApproval: boolean
}

// ==================== 安全边界 ====================

export interface SafetyBoundary {
  autonomous: string[]
  requiresApproval: string[]
  forbidden: string[]
}
