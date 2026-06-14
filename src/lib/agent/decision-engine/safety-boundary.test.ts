import { describe, expect, it } from 'vitest'
import { SafetyBoundaryChecker } from './safety-boundary'

describe('SafetyBoundaryChecker', () => {
  const checker = new SafetyBoundaryChecker()

  it('allows autonomous scan/analyze/draft/task actions', () => {
    for (const type of ['scan', 'analyze', 'generate_draft', 'create_agent_task']) {
      expect(checker.checkAction(type)).toMatchObject({
        allowed: true,
        requiresApproval: false,
        forbidden: false,
      })
    }
  })

  it('requires approval for publishing, rejecting, pushing, and SOP changes', () => {
    for (const type of ['publish_knowledge_card', 'reject_knowledge_card', 'push_to_users', 'modify_sop']) {
      expect(checker.checkAction(type)).toMatchObject({
        allowed: true,
        requiresApproval: true,
        forbidden: false,
      })
    }
  })

  it('blocks forbidden production and security actions', () => {
    for (const type of [
      'delete_user',
      'modify_permissions',
      'execute_database_migration',
      'modify_security_config',
      'access_unauthorized_external_api',
    ]) {
      expect(checker.checkAction(type)).toMatchObject({
        allowed: false,
        requiresApproval: false,
        forbidden: true,
      })
    }
  })

  it('marks mixed decisions with approval and blocks forbidden actions', () => {
    const approvalOnly = checker.checkDecision([
      { type: 'scan', params: {} },
      { type: 'publish_knowledge_card', params: {} },
    ])

    expect(approvalOnly.allowed).toBe(true)
    expect(approvalOnly.requiresApproval).toBe(true)

    const blocked = checker.checkDecision([
      { type: 'scan', params: {} },
      { type: 'execute_database_migration', params: {} },
    ])

    expect(blocked.allowed).toBe(false)
    expect(blocked.blockedActions[0].action).toBe('execute_database_migration')
  })
})
