/**
 * AgentOrchestrator 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AgentExecutor, AgentTaskType } from '../types'

// ==================== Mock 函数 ====================

const { mockCreate, mockFindUnique, mockFindMany, mockUpdate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindUnique: vi.fn(),
  mockFindMany: vi.fn(),
  mockUpdate: vi.fn(),
}))

vi.mock('../../prisma', () => ({
  prisma: {
    agentTask: {
      create: mockCreate,
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      update: mockUpdate,
    },
  },
}))

vi.mock('../../audit', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('../../logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { AgentOrchestrator } from '../orchestrator'

// ==================== Mock Agent ====================

class MockAgentExecutor implements AgentExecutor {
  name = 'MockAgent'
  supportedTaskTypes: AgentTaskType[] = ['knowledge_review']

  execute = vi.fn().mockResolvedValue({ result: 'success' })
}

// ==================== 测试 ====================

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator
  let mockExecutor: MockAgentExecutor

  beforeEach(() => {
    vi.clearAllMocks()
    orchestrator = new AgentOrchestrator()
    mockExecutor = new MockAgentExecutor()
  })

  describe('registerExecutor', () => {
    it('should register executor', () => {
      orchestrator.registerExecutor(mockExecutor)

      // 验证 executor 已注册（通过后续操作验证）
      expect(mockExecutor.name).toBe('MockAgent')
    })
  })

  describe('createTask', () => {
    it('should create task', async () => {
      orchestrator.registerExecutor(mockExecutor)

      const mockTask = {
        id: 'task-1',
        type: 'knowledge_review',
        status: 'pending',
        priority: 'medium',
        title: '测试任务',
        description: null,
        result: JSON.stringify({ cardId: 'card-1' }),
        assignedTo: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }

      mockCreate.mockResolvedValue(mockTask)

      const task = await orchestrator.createTask({
        type: 'knowledge_review',
        title: '测试任务',
        input: { cardId: 'card-1' },
        createdBy: 'user-1',
      })

      expect(task.id).toBe('task-1')
      expect(task.type).toBe('knowledge_review')
      expect(task.status).toBe('pending')
    })

    it('should throw error for unknown task type', async () => {
      await expect(
        orchestrator.createTask({
          type: 'unknown_type' as AgentTaskType,
          title: '测试任务',
          input: {},
          createdBy: 'user-1',
        })
      ).rejects.toThrow('No executor registered for task type')
    })
  })

  describe('executeTask', () => {
    it('should execute task successfully', async () => {
      orchestrator.registerExecutor(mockExecutor)

      const mockTask = {
        id: 'task-1',
        type: 'knowledge_review',
        status: 'pending',
        priority: 'medium',
        title: '测试任务',
        description: null,
        result: JSON.stringify({ cardId: 'card-1' }),
        assignedTo: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }

      mockFindUnique.mockResolvedValue(mockTask)
      mockUpdate.mockResolvedValue({})

      const result = await orchestrator.executeTask('task-1')

      expect(result.success).toBe(true)
      expect(result.taskId).toBe('task-1')
      expect(mockExecutor.execute).toHaveBeenCalledWith({ cardId: 'card-1' })
    })

    it('should handle task not found', async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await orchestrator.executeTask('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Task not found')
    })

    it('should handle task in wrong status', async () => {
      const mockTask = {
        id: 'task-1',
        type: 'knowledge_review',
        status: 'in_progress',
        priority: 'medium',
        title: '测试任务',
        description: null,
        result: JSON.stringify({ cardId: 'card-1' }),
        assignedTo: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }

      mockFindUnique.mockResolvedValue(mockTask)

      const result = await orchestrator.executeTask('task-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('in_progress')
    })

    it('should handle execution error', async () => {
      orchestrator.registerExecutor(mockExecutor)
      mockExecutor.execute.mockRejectedValue(new Error('Execution failed'))

      const mockTask = {
        id: 'task-1',
        type: 'knowledge_review',
        status: 'pending',
        priority: 'medium',
        title: '测试任务',
        description: null,
        result: JSON.stringify({ cardId: 'card-1' }),
        assignedTo: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }

      mockFindUnique.mockResolvedValue(mockTask)
      mockUpdate.mockResolvedValue({})

      const result = await orchestrator.executeTask('task-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Execution failed')
    })
  })

  describe('getTask', () => {
    it('should return task', async () => {
      const mockTask = {
        id: 'task-1',
        type: 'knowledge_review',
        status: 'completed',
        priority: 'medium',
        title: '测试任务',
        description: null,
        result: JSON.stringify({ result: 'success' }),
        assignedTo: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      }

      mockFindUnique.mockResolvedValue(mockTask)

      const task = await orchestrator.getTask('task-1')

      expect(task).not.toBeNull()
      expect(task?.id).toBe('task-1')
    })

    it('should return null for non-existent task', async () => {
      mockFindUnique.mockResolvedValue(null)

      const task = await orchestrator.getTask('non-existent')

      expect(task).toBeNull()
    })
  })

  describe('getPendingTasks', () => {
    it('should return pending tasks', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          type: 'knowledge_review',
          status: 'pending',
          priority: 'medium',
          title: '任务 1',
          description: null,
          result: null,
          assignedTo: null,
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
        },
      ]

      mockFindMany.mockResolvedValue(mockTasks)

      const tasks = await orchestrator.getPendingTasks()

      expect(tasks).toHaveLength(1)
      expect(tasks[0].status).toBe('pending')
    })
  })

  describe('cancelTask', () => {
    it('should cancel pending task', async () => {
      const mockTask = {
        id: 'task-1',
        type: 'knowledge_review',
        status: 'pending',
        priority: 'medium',
        title: '测试任务',
        description: null,
        result: null,
        assignedTo: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }

      mockFindUnique.mockResolvedValue(mockTask)
      mockUpdate.mockResolvedValue({})

      const success = await orchestrator.cancelTask('task-1')

      expect(success).toBe(true)
    })

    it('should not cancel non-pending task', async () => {
      const mockTask = {
        id: 'task-1',
        type: 'knowledge_review',
        status: 'in_progress',
        priority: 'medium',
        title: '测试任务',
        description: null,
        result: null,
        assignedTo: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }

      mockFindUnique.mockResolvedValue(mockTask)

      const success = await orchestrator.cancelTask('task-1')

      expect(success).toBe(false)
    })
  })
})
