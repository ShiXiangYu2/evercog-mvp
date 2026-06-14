/**
 * Rule Definitions 规则定义
 *
 * 预定义的决策规则
 */
import type { DecisionRule } from '../types'

export const DECISION_RULES: DecisionRule[] = [
  // 规则 1：高优先级缺口自动创建任务
  {
    id: 'auto_create_high_priority_gap_task',
    name: '高优先级缺口自动创建任务',
    condition: (ctx) => ctx.systemHealth.knowledgeGapCount > 0,
    action: 'create_task',
    params: {
      taskType: 'gap_fill',
      priority: 'high',
      titleTemplate: '知识缺口补充「{question}」',
    },
    riskLevel: 'safe',
    requiresApproval: false,
  },

  // 规则 2：反馈积压时触发学习 Loop
  {
    id: 'trigger_learning_on_feedback_backlog',
    name: '反馈积压触发学习',
    condition: (ctx) => ctx.systemHealth.unresolvedFeedbackCount > 5,
    action: 'trigger_loop',
    params: {
      loopName: 'experience-feedback-loop',
      reason: 'feedback_backlog',
    },
    riskLevel: 'safe',
    requiresApproval: false,
  },

  // 规则 3：知识覆盖率下降时触发巡检
  {
    id: 'trigger_patrol_on_coverage_drop',
    name: '覆盖率下降触发巡检',
    condition: (ctx) => ctx.systemHealth.knowledgeCoverageRate < 70,
    action: 'trigger_loop',
    params: {
      loopName: 'knowledge-card-patrol',
      reason: 'coverage_drop',
    },
    riskLevel: 'caution',
    requiresApproval: false,
  },

  // 规则 4：连续失败时升级告警
  {
    id: 'escalate_on_consecutive_failures',
    name: '连续失败升级告警',
    condition: (ctx) => ctx.systemHealth.failedTaskCount24h > 3,
    action: 'escalate',
    params: {
      notifyRoles: ['admin', 'ai_info'],
      reason: 'consecutive_failures',
    },
    riskLevel: 'dangerous',
    requiresApproval: true,
  },

  // 规则 5：待处理任务过多时调整优先级
  {
    id: 'adjust_priority_on_task_backlog',
    name: '任务积压调整优先级',
    condition: (ctx) => ctx.systemHealth.pendingTaskCount > 10,
    action: 'adjust_priority',
    params: {
      strategy: 'oldest_first',
      maxPriority: 'high',
    },
    riskLevel: 'safe',
    requiresApproval: false,
  },

  // 规则 6：工作时间内自动巡检
  {
    id: 'daily_patrol_during_work_hours',
    name: '工作时间自动巡检',
    condition: (ctx) => {
      const hasRecentPatrol = ctx.recentEvents.some(
        (e) => e.type === 'loop:completed' && e.timestamp.getHours() === 8
      )
      return ctx.timeContext.hour === 8 && ctx.timeContext.isWorkHour && !hasRecentPatrol
    },
    action: 'trigger_loop',
    params: {
      loopName: 'knowledge-card-patrol',
      reason: 'scheduled_daily',
    },
    riskLevel: 'safe',
    requiresApproval: false,
  },
]
