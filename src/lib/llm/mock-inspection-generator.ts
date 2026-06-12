/**
 * Mock Inspection Generator
 *
 * 生成 SOP 检查报告的 Mock 实现
 */
import type { InspectionGenerator, SOPInspectionInput, SOPInspectionOutput } from './types'

export class MockInspectionGenerator implements InspectionGenerator {
  name = 'mock-inspection'

  async generateSOPInspection(input: SOPInspectionInput): Promise<SOPInspectionOutput> {
    const { content } = input
    const lines = content.split('\n').filter((l) => l.trim())
    const hasSteps = /^\d+[\.\)、]/m.test(content) || /^[-*]\s/m.test(content)
    const hasSections = /^#{1,3}\s/m.test(content)
    const contentLength = content.length

    let completeness = 30
    if (contentLength > 100) completeness += 15
    if (contentLength > 300) completeness += 10
    if (contentLength > 600) completeness += 10
    if (hasSteps) completeness += 15
    if (hasSections) completeness += 10
    if (lines.length > 5) completeness += 10
    completeness = Math.min(completeness, 95)

    const missingSteps: string[] = []
    if (!content.includes('注意事项') && !content.includes('风险')) {
      missingSteps.push('缺少注意事项或风险提示章节')
    }
    if (!content.includes('确认') && !content.includes('检查') && !content.includes('验证')) {
      missingSteps.push('缺少确认/检查步骤')
    }
    if (!content.includes('时间') && !content.includes('期限') && !content.includes('截止')) {
      missingSteps.push('未明确时间节点要求')
    }
    if (lines.length < 3) {
      missingSteps.push('步骤描述过于简略，建议补充详细操作说明')
    }
    if (!hasSteps) {
      missingSteps.push('缺少编号步骤或列表格式的操作流程')
    }

    const riskPoints: string[] = []
    if (contentLength < 200) {
      riskPoints.push('内容过短，可能导致执行时理解偏差')
    }
    if (!hasSections) {
      riskPoints.push('缺少结构化分区，不利于快速定位关键信息')
    }
    if (!content.includes('异常') && !content.includes('错误') && !content.includes('失败')) {
      riskPoints.push('未考虑异常情况处理方案')
    }
    if (!content.includes('负责人') && !content.includes('角色') && !content.includes('谁')) {
      riskPoints.push('未明确责任人或角色分工')
    }

    let executability = 25
    if (hasSteps) executability += 20
    if (hasSections) executability += 15
    if (contentLength > 200) executability += 10
    if (contentLength > 500) executability += 10
    if (missingSteps.length <= 2) executability += 10
    executability = Math.min(executability, 92)

    return {
      completeness,
      missingSteps,
      riskPoints,
      executability,
      inspectionReport: JSON.stringify({
        summary: `AI 检查完成：内容完整性 ${completeness}%，可执行性 ${executability}%`,
        analyzedAt: new Date().toISOString(),
        contentStats: {
          totalChars: contentLength,
          totalLines: lines.length,
          hasStepFormat: hasSteps,
          hasSectionStructure: hasSections,
        },
      }),
    }
  }
}
