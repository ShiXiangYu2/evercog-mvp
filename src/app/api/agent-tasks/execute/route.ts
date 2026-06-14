/**
 * POST /api/agent-tasks/execute - 执行 Agent 任务
 *
 * 手动触发执行待处理的 Agent 任务
 * 通常由管理员或定时任务调用
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { executeAgentTask, getTaskExecutor } from '@/lib/agent/task-executor'
import logger from '@/lib/logger'

export const POST = withAuth(
  async (request, { user }) => {
    try {
      // 检查权限：只有管理员可以手动触发任务执行
      if (user.role !== 'admin' && user.role !== 'ai_info') {
        return NextResponse.json(
          { error: 'Only admin or AI info role can execute tasks' },
          { status: 403 }
        )
      }

      const body = await request.json().catch(() => ({}))
      const { taskId, executeAll } = body

      // 执行单个任务
      if (taskId) {
        logger.info('Executing single agent task', { taskId, userId: user.id })

        const result = await executeAgentTask(taskId)

        return NextResponse.json({
          success: result.success,
          result,
        })
      }

      // 批量执行待处理任务
      if (executeAll) {
        logger.info('Executing all pending tasks', { userId: user.id })

        const executor = getTaskExecutor()
        const results = await executor.executePendingTasks(10)

        return NextResponse.json({
          success: true,
          executed: results.length,
          results,
        })
      }

      // 获取任务统计
      const executor = getTaskExecutor()
      const stats = await executor.getTaskStats()

      return NextResponse.json({
        stats,
        message: 'Provide taskId to execute a single task, or executeAll=true to execute pending tasks',
      })
    } catch (error) {
      logger.error('Failed to execute agent task', error as Error)
      return NextResponse.json(
        { error: 'Failed to execute agent task' },
        { status: 500 }
      )
    }
  },
  { requiredRoles: ['admin', 'ai_info'] }
)
