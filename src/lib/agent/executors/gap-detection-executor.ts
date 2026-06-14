/**
 * 知识缺口检测 Agent 执行器
 *
 * 实现 AgentExecutor 接口，用于检测知识缺口
 */
import type { AgentExecutor, AgentTaskType } from '../types'
import { GapDetector } from '../gap-detector'

// ==================== 缺口检测执行器 ====================

export class GapDetectionExecutor implements AgentExecutor {
  readonly name = 'GapDetectionExecutor'
  readonly supportedTaskTypes: AgentTaskType[] = ['gap_detection']

  private gapDetector: GapDetector

  constructor() {
    this.gapDetector = new GapDetector()
  }

  /**
   * 执行缺口检测
   *
   * @param input 输入参数 { days?: number, minFrequency?: number }
   * @returns 检测结果
   */
  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { days, minFrequency } = input

    const result = await this.gapDetector.detectGaps({
      days: days as number | undefined,
      minFrequency: minFrequency as number | undefined,
    })

    return result as unknown as Record<string, unknown>
  }
}
