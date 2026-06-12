/**
 * Mock LLM Provider
 *
 * 组合所有 Mock 生成器
 */
import type { LLMProvider, BriefGenerationInput, BriefGenerationOutput } from './types'
import type { ExperienceReplyInput, ExperienceReplyOutput } from './types'
import type { SOPInspectionInput, SOPInspectionOutput } from './types'
import { MockBriefGenerator } from './mock-brief-generator'
import { MockReplyGenerator } from './mock-reply-generator'
import { MockInspectionGenerator } from './mock-inspection-generator'

export class MockLLMProvider implements LLMProvider {
  name = 'mock'

  private briefGenerator = new MockBriefGenerator()
  private replyGenerator = new MockReplyGenerator()
  private inspectionGenerator = new MockInspectionGenerator()

  async generateBrief(input: BriefGenerationInput): Promise<BriefGenerationOutput> {
    return this.briefGenerator.generateBrief(input)
  }

  async generateExperienceReply(input: ExperienceReplyInput): Promise<ExperienceReplyOutput> {
    return this.replyGenerator.generateExperienceReply(input)
  }

  async generateSOPInspection(input: SOPInspectionInput): Promise<SOPInspectionOutput> {
    return this.inspectionGenerator.generateSOPInspection(input)
  }
}
