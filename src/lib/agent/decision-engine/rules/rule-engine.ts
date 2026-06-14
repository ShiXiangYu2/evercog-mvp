/**
 * Rule Engine 规则引擎
 *
 * 根据系统状态匹配决策规则
 */
import type { DecisionContext, DecisionRule, Decision } from '../types'
import { DECISION_RULES } from './rule-definitions'
import logger from '../../../logger'

export class RuleEngine {
  private rules: DecisionRule[]

  constructor() {
    this.rules = [...DECISION_RULES]
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: DecisionRule): void {
    this.rules.push(rule)
    logger.info('Rule added', { ruleId: rule.id, name: rule.name })
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId)
    logger.info('Rule removed', { ruleId })
  }

  /**
   * 获取所有规则
   */
  getRules(): DecisionRule[] {
    return [...this.rules]
  }

  /**
   * 匹配规则
   *
   * 按优先级返回所有匹配的规则
   */
  matchRules(context: DecisionContext): DecisionRule[] {
    const matchedRules: DecisionRule[] = []

    for (const rule of this.rules) {
      try {
        if (rule.condition(context)) {
          matchedRules.push(rule)
          logger.debug('Rule matched', { ruleId: rule.id, name: rule.name })
        }
      } catch (error) {
        logger.error('Rule evaluation failed', error as Error, { ruleId: rule.id })
      }
    }

    return matchedRules
  }

  /**
   * 根据匹配的规则生成决策
   */
  generateDecision(matchedRules: DecisionRule[], context: DecisionContext): Decision | null {
    if (matchedRules.length === 0) {
      return null
    }

    // 选择最高优先级的规则（按 riskLevel 排序：dangerous > caution > safe）
    const sortedRules = matchedRules.sort((a, b) => {
      const riskOrder = { dangerous: 0, caution: 1, safe: 2 }
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
    })

    const selectedRule = sortedRules[0]

    // 计算置信度（基于匹配的规则数量和系统状态）
    const confidence = this.calculateConfidence(matchedRules, context)

    return {
      id: `decision_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      decisionType: selectedRule.action,
      reasoning: this.generateReasoning(selectedRule, matchedRules, context),
      confidence,
      riskLevel: selectedRule.riskLevel,
      actions: [
        {
          type: this.mapActionType(selectedRule.action),
          params: selectedRule.params,
        },
      ],
      requiresApproval: selectedRule.requiresApproval,
      context,
    }
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(matchedRules: DecisionRule[], context: DecisionContext): number {
    // 基础置信度
    let confidence = 0.5

    // 多个规则匹配增加置信度
    confidence += Math.min(matchedRules.length * 0.1, 0.3)

    // 工作时间内置信度更高
    if (context.timeContext.isWorkHour) {
      confidence += 0.1
    }

    // 系统健康度影响置信度
    if (context.systemHealth.knowledgeCoverageRate > 80) {
      confidence += 0.05
    }

    return Math.min(confidence, 1)
  }

  /**
   * 生成决策理由
   */
  private generateReasoning(
    primaryRule: DecisionRule,
    allMatchedRules: DecisionRule[],
    context: DecisionContext
  ): string {
    const reasons: string[] = []

    // 主要原因
    reasons.push(`匹配规则「${primaryRule.name}」`)

    // 系统状态摘要
    const { systemHealth } = context
    if (systemHealth.knowledgeGapCount > 0) {
      reasons.push(`检测到 ${systemHealth.knowledgeGapCount} 个知识缺口`)
    }
    if (systemHealth.unresolvedFeedbackCount > 0) {
      reasons.push(`${systemHealth.unresolvedFeedbackCount} 条反馈待处理`)
    }
    if (systemHealth.pendingTaskCount > 0) {
      reasons.push(`${systemHealth.pendingTaskCount} 个任务待处理`)
    }

    // 其他匹配的规则
    if (allMatchedRules.length > 1) {
      const otherRules = allMatchedRules
        .filter((r) => r.id !== primaryRule.id)
        .map((r) => r.name)
      reasons.push(`同时满足: ${otherRules.join(', ')}`)
    }

    return reasons.join('；')
  }

  /**
   * 映射行动类型
   */
  private mapActionType(
    ruleAction: string
  ): 'create_agent_task' | 'trigger_loop' | 'update_priority' | 'send_notification' {
    switch (ruleAction) {
      case 'create_task':
        return 'create_agent_task'
      case 'trigger_loop':
        return 'trigger_loop'
      case 'adjust_priority':
        return 'update_priority'
      case 'escalate':
        return 'send_notification'
      default:
        return 'send_notification'
    }
  }
}

// 单例导出
let _ruleEngine: RuleEngine | null = null

export function getRuleEngine(): RuleEngine {
  if (!_ruleEngine) {
    _ruleEngine = new RuleEngine()
  }
  return _ruleEngine
}
