/**
 * Decision Engine 决策引擎
 *
 * Agent 自主性的核心：感知 → 评估 → 决策 → 执行 → 反馈
 */
import { prisma } from '../../prisma'
import { getSystemStateAnalyzer } from './analyzers/system-state-analyzer'
import { getRuleEngine } from './rules/rule-engine'
import { getSafetyBoundaryChecker } from './safety-boundary'
import { getScheduler } from '../../scheduler'
import { getEventBus } from '../../scheduler/event-bus'
import type { Decision, DecisionContext, DecisionResult, SystemHealthMetrics } from './types'
import logger from '../../logger'

export class DecisionEngine {
  private systemStateAnalyzer = getSystemStateAnalyzer()
  private ruleEngine = getRuleEngine()
  private safetyChecker = getSafetyBoundaryChecker()

  /**
   * 执行单次决策循环
   */
  async makeDecision(context?: Partial<DecisionContext>): Promise<DecisionResult> {
    logger.info('Starting decision cycle')

    try {
      // 1. 感知当前状态
      let fullContext: DecisionContext
      if (context && context.systemHealth) {
        fullContext = context as DecisionContext
      } else {
        fullContext = await this.systemStateAnalyzer.getDecisionContext()
      }

      // 2. 匹配规则
      const matchedRules = this.ruleEngine.matchRules(fullContext)

      // 3. 生成决策
      const decision = this.ruleEngine.generateDecision(matchedRules, fullContext)

      if (!decision) {
        logger.info('No rules matched, no action needed')
        return {
          decision: {
            id: `decision_${Date.now()}_no_action`,
            decisionType: 'no_action',
            reasoning: '没有匹配的规则，无需行动',
            confidence: 1,
            riskLevel: 'safe',
            actions: [],
            requiresApproval: false,
          },
          outcome: 'success',
        }
      }

      // 4. 安全边界检查
      const safetyCheck = this.safetyChecker.checkDecision(decision.actions)

      if (!safetyCheck.allowed) {
        logger.warn('Decision blocked by safety boundary', {
          decisionId: decision.id,
          blockedActions: safetyCheck.blockedActions,
        })

        // 记录被阻止的决策
        await this.logDecision(decision, 'failed', '安全边界阻止')

        return {
          decision,
          outcome: 'failed',
          error: `操作被安全边界阻止: ${safetyCheck.blockedActions.map((a) => a.reason).join(', ')}`,
        }
      }

      // 如果需要审批，返回待审批状态
      if (safetyCheck.requiresApproval || decision.requiresApproval) {
        logger.info('Decision requires approval', { decisionId: decision.id })
        await this.logDecision(decision, 'pending_approval')
        return { decision, outcome: 'pending_approval' }
      }

      // 5. 执行决策
      const executionResult = await this.executeDecision(decision)

      // 6. 记录决策
      await this.logDecision(decision, executionResult.outcome)

      // 7. 发射事件
      getEventBus().emit('agent:decision_made', {
        decisionId: decision.id,
        decisionType: decision.decisionType,
        outcome: executionResult.outcome,
      })

      return {
        decision,
        outcome: executionResult.outcome,
        error: executionResult.error,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Decision cycle failed', error as Error)

      return {
        decision: {
          id: `decision_${Date.now()}_error`,
          decisionType: 'no_action',
          reasoning: `决策过程出错: ${errorMessage}`,
          confidence: 0,
          riskLevel: 'safe',
          actions: [],
          requiresApproval: false,
        },
        outcome: 'failed',
        error: errorMessage,
      }
    }
  }

  /**
   * 获取系统健康度
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    return this.systemStateAnalyzer.getSystemHealth()
  }

  /**
   * 获取决策历史
   */
  async getDecisionHistory(options?: {
    limit?: number
    since?: Date
  }): Promise<Array<{
    id: string
    decisionType: string
    reasoning: string
    confidence: number
    riskLevel: string
    outcome: string | null
    createdAt: Date
  }>> {
    const limit = options?.limit || 20
    const where = options?.since ? { createdAt: { gte: options.since } } : {}

    const logs = await prisma.agentDecisionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return logs.map((log) => ({
      id: log.id,
      decisionType: log.decisionType,
      reasoning: log.reasoning,
      confidence: log.confidence,
      riskLevel: log.riskLevel,
      outcome: log.outcome,
      createdAt: log.createdAt,
    }))
  }

  /**
   * 审批决策
   */
  async approveDecision(decisionId: string, approvedBy: string): Promise<boolean> {
    const log = await prisma.agentDecisionLog.findUnique({
      where: { id: decisionId },
    })

    if (!log || log.outcome !== 'pending_approval') {
      return false
    }

    // 更新决策记录
    await prisma.agentDecisionLog.update({
      where: { id: decisionId },
      data: {
        outcome: 'success',
        approvedBy,
        approvedAt: new Date(),
      },
    })

    // 执行决策
    const actions = JSON.parse(log.actions) as Array<{ type: string; params: Record<string, unknown> }>
    for (const action of actions) {
      await this.executeAction(action.type, action.params)
    }

    logger.info('Decision approved and executed', { decisionId, approvedBy })
    return true
  }

  // ==================== 私有方法 ====================

  /**
   * 执行决策
   */
  private async executeDecision(
    decision: Decision
  ): Promise<{ outcome: 'success' | 'failed'; error?: string }> {
    try {
      for (const action of decision.actions) {
        await this.executeAction(action.type, action.params)
      }
      return { outcome: 'success' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Decision execution failed', error as Error, { decisionId: decision.id })
      return { outcome: 'failed', error: errorMessage }
    }
  }

  /**
   * 执行单个行动
   */
  private async executeAction(type: string, params: Record<string, unknown>): Promise<void> {
    switch (type) {
      case 'create_agent_task':
        await this.executeCreateTask(params)
        break
      case 'trigger_loop':
        await this.executeTriggerLoop(params)
        break
      case 'update_priority':
        await this.executeUpdatePriority(params)
        break
      case 'send_notification':
        await this.executeSendNotification(params)
        break
      default:
        logger.warn('Unknown action type', { type })
    }
  }

  /**
   * 创建任务
   */
  private async executeCreateTask(params: Record<string, unknown>): Promise<void> {
    const { taskType, priority, titleTemplate } = params

    // 获取待处理的缺口
    const gaps = await prisma.knowledgeGap.findMany({
      where: { status: 'pending' },
      take: 5,
    })

    for (const gap of gaps) {
      const title = (titleTemplate as string)
        ?.replace('{question}', gap.question.substring(0, 30))
        || `任务: ${gap.question.substring(0, 30)}`

      await prisma.agentTask.create({
        data: {
          type: (taskType as string) || 'gap_fill',
          title,
          description: `gap_id: ${gap.id} | question: ${gap.question} | topic: ${gap.topic || '未分类'}`,
          priority: (priority as string) || 'medium',
          status: 'pending',
          createdBy: 'system',
        },
      })

      logger.info('Task created by decision engine', { gapId: gap.id, title })
    }
  }

  /**
   * 触发 Loop
   */
  private async executeTriggerLoop(params: Record<string, unknown>): Promise<void> {
    const { loopName, reason } = params

    const scheduler = getScheduler()
    await scheduler.triggerLoop(loopName as string, (reason as string) || 'decision_engine')

    logger.info('Loop triggered by decision engine', { loopName, reason })
  }

  /**
   * 调整优先级
   */
  private async executeUpdatePriority(params: Record<string, unknown>): Promise<void> {
    const { strategy = 'oldest_first' } = params

    // 获取待处理任务
    const tasks = await prisma.agentTask.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    // 为最旧的任务提升优先级
    logger.info('Updating task priority', { strategy, taskCount: tasks.length })
    for (const task of tasks.slice(0, 3)) {
      if (task.priority !== 'high') {
        await prisma.agentTask.update({
          where: { id: task.id },
          data: { priority: 'high' },
        })
        logger.info('Task priority updated', { taskId: task.id, newPriority: 'high' })
      }
    }
  }

  /**
   * 发送通知
   */
  private async executeSendNotification(params: Record<string, unknown>): Promise<void> {
    const { reason, notifyRoles } = params

    // 记录审计日志（简化实现）
    logger.info('Notification sent', { reason, notifyRoles })

    // TODO: 实际的通知逻辑（邮件、企微等）
  }

  /**
   * 记录决策日志
   */
  private async logDecision(
    decision: Decision,
    outcome: string,
    error?: string
  ): Promise<void> {
    try {
      await prisma.agentDecisionLog.create({
        data: {
          decisionType: decision.decisionType,
          reasoning: decision.reasoning,
          confidence: decision.confidence,
          riskLevel: decision.riskLevel,
          actions: JSON.stringify(decision.actions),
          context: JSON.stringify({
            ...(decision.context || {}),
            ...(error ? { error } : {}),
          }),
          outcome,
        },
      })
    } catch (logError) {
      logger.error('Failed to log decision', logError as Error, { decisionId: decision.id })
    }
  }
}

// 单例导出
let _decisionEngine: DecisionEngine | null = null

export function getDecisionEngine(): DecisionEngine {
  if (!_decisionEngine) {
    _decisionEngine = new DecisionEngine()
  }
  return _decisionEngine
}
