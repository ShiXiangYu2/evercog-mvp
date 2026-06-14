/**
 * Safety Boundary 瀹夊叏杈圭晫妫€鏌? *
 * 瀹氫箟 Agent 鍙互鑷富鎵ц銆侀渶瑕佸鎵广€佺姝㈡墽琛岀殑鎿嶄綔
 */
import type { SafetyBoundary, DecisionAction, RiskLevel } from './types'
import logger from '../../logger'

// ==================== 瀹夊叏杈圭晫閰嶇疆 ====================

const SAFETY_BOUNDARIES: SafetyBoundary = {
  autonomous: [
    'scan',
    'analyze',
    'generate_draft',
    'create_agent_task',
    'trigger_loop',
    'update_priority',
    'send_notification',
    'scan_knowledge_cards',
    'analyze_patterns',
  ],

  requiresApproval: [
    'publish_knowledge_card',
    'reject_knowledge_card',
    'push_to_users',
    'push_to_employees',
    'modify_sop',
    'delete_task',
    'approve_sop_submission',
    'reject_sop_submission',
  ],

  forbidden: [
    'delete_user',
    'modify_permissions',
    'access_unauthorized_external_api',
    'modify_system_config',
    'modify_security_config',
    'execute_database_migration',
    'modify_security_policy',
  ],
}

// ==================== SafetyBoundaryChecker 绫?====================

export class SafetyBoundaryChecker {
  private boundaries: SafetyBoundary

  constructor(boundaries?: Partial<SafetyBoundary>) {
    this.boundaries = {
      ...SAFETY_BOUNDARIES,
      ...boundaries,
    }
  }

  /**
   * 妫€鏌ユ搷浣滄槸鍚﹁鍏佽
   */
  checkAction(actionType: string): {
    allowed: boolean
    requiresApproval: boolean
    forbidden: boolean
    reason?: string
  } {
    if (this.boundaries.forbidden.includes(actionType)) {
      logger.warn('Forbidden action attempted', { actionType })
      return {
        allowed: false,
        requiresApproval: false,
        forbidden: true,
        reason: `Action ${actionType} is forbidden`,
      }
    }

    if (this.boundaries.requiresApproval.includes(actionType)) {
      return {
        allowed: true,
        requiresApproval: true,
        forbidden: false,
        reason: `Action ${actionType} requires approval`,
      }
    }

    if (this.boundaries.autonomous.includes(actionType)) {
      return {
        allowed: true,
        requiresApproval: false,
        forbidden: false,
      }
    }

    logger.warn('Unknown action type, requiring approval', { actionType })
    return {
      allowed: true,
      requiresApproval: true,
      forbidden: false,
      reason: `Action ${actionType} requires approval by default`,
    }
  }

  /**
   * 妫€鏌ュ喅绛栨槸鍚﹁鍏佽
   */
  checkDecision(actions: DecisionAction[]): {
    allowed: boolean
    requiresApproval: boolean
    blockedActions: Array<{ action: string; reason: string }>
  } {
    const blockedActions: Array<{ action: string; reason: string }> = []
    let requiresApproval = false

    for (const action of actions) {
      const result = this.checkAction(action.type)

      if (result.forbidden) {
        blockedActions.push({
          action: action.type,
          reason: result.reason || 'Action is forbidden',
        })
      } else if (result.requiresApproval) {
        requiresApproval = true
      }
    }

    return {
      allowed: blockedActions.length === 0,
      requiresApproval,
      blockedActions,
    }
  }

  /**
   * 鑾峰彇椋庨櫓绛夌骇
   */
  getRiskLevel(actions: DecisionAction[]): RiskLevel {
    for (const action of actions) {
      if (this.boundaries.forbidden.includes(action.type)) {
        return 'dangerous'
      }
      if (this.boundaries.requiresApproval.includes(action.type)) {
        return 'caution'
      }
    }
    return 'safe'
  }

  /**
   * 鑾峰彇瀹夊叏杈圭晫閰嶇疆
   */
  getBoundaries(): SafetyBoundary {
    return { ...this.boundaries }
  }
}

// 鍗曚緥瀵煎嚭
let _checker: SafetyBoundaryChecker | null = null

export function getSafetyBoundaryChecker(): SafetyBoundaryChecker {
  if (!_checker) {
    _checker = new SafetyBoundaryChecker()
  }
  return _checker
}
