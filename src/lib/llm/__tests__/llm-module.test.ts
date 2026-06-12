/**
 * LLM 模块单元测试
 *
 * 测试拆分后的聚焦接口
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { MockBriefGenerator } from '../mock-brief-generator'
import { MockReplyGenerator } from '../mock-reply-generator'
import { MockInspectionGenerator } from '../mock-inspection-generator'
import { MockLLMProvider } from '../mock-provider'
import { getLLMProvider, resetLLMProvider } from '../index'

describe('MockBriefGenerator', () => {
  const generator = new MockBriefGenerator()

  it('should generate brief with all required fields', async () => {
    const result = await generator.generateBrief({
      title: '小微企业税收优惠',
      source: '国家税务总局',
      customerType: 'restaurant',
      url: 'https://example.com/policy',
    })

    expect(result.title).toContain('小微企业税收优惠')
    expect(result.title).toContain('政策简报')
    expect(result.summary).toBeTruthy()
    expect(result.applicableTo).toBeTruthy()
    expect(result.keyClauses).toBeTruthy()
    expect(result.actionSuggestions).toBeTruthy()
    expect(result.riskReminders).toBeTruthy()
    expect(result.sourceUrl).toBe('https://example.com/policy')
  })

  it('should handle unknown customer type', async () => {
    const result = await generator.generateBrief({
      title: '测试政策',
      source: '测试来源',
      customerType: 'unknown_type',
      url: 'https://example.com',
    })

    expect(result.summary).toContain('中小微企业')
  })
})

describe('MockReplyGenerator', () => {
  const generator = new MockReplyGenerator()

  it('should generate reply with all four sections', async () => {
    const result = await generator.generateExperienceReply({
      question: '餐饮客户代账需要什么材料？',
      retrievedCards: [
        {
          id: '1',
          title: '餐饮门店代账资料清单',
          content: '## 基础资料\n1. 营业执照\n2. 法人身份证',
          category: 'data_checklist',
          tags: JSON.stringify(['餐饮', '资料']),
          source: '财务部',
          riskNotes: '资料不齐全可能导致延误',
        },
      ],
    })

    expect(result.policyExplanation).toBeTruthy()
    expect(result.serviceOpportunity).toBeTruthy()
    expect(result.salesScript).toBeTruthy()
    expect(result.riskReminder).toBeTruthy()
    expect(result.citedSources).toHaveLength(1)
    expect(result.citedSources[0].cardId).toBe('1')
  })

  it('should handle empty retrieved cards', async () => {
    const result = await generator.generateExperienceReply({
      question: '随机问题',
      retrievedCards: [],
    })

    expect(result.policyExplanation).toBe('')
    expect(result.serviceOpportunity).toBeTruthy()
    expect(result.citedSources).toHaveLength(0)
  })
})

describe('MockInspectionGenerator', () => {
  const generator = new MockInspectionGenerator()

  it('should generate inspection report with scores', async () => {
    const result = await generator.generateSOPInspection({
      content: `## 餐饮客户初次接触 SOP

### 第一步：自我介绍
- 介绍公司和自己的职责

### 第二步：了解客户
- 询问门店类型
- 了解经营规模

### 注意事项
- 确保资料真实完整

### 异常处理
- 客户拒绝时的应对方案`,
    })

    expect(result.completeness).toBeGreaterThan(0)
    expect(result.completeness).toBeLessThanOrEqual(100)
    expect(result.executability).toBeGreaterThan(0)
    expect(result.executability).toBeLessThanOrEqual(100)
    expect(result.inspectionReport).toBeTruthy()
    expect(typeof result.missingSteps).toBe('object')
    expect(typeof result.riskPoints).toBe('object')
  })
})

describe('MockLLMProvider', () => {
  const provider = new MockLLMProvider()

  it('should have name', () => {
    expect(provider.name).toBe('mock')
  })

  it('should implement all interfaces', async () => {
    expect(typeof provider.generateBrief).toBe('function')
    expect(typeof provider.generateExperienceReply).toBe('function')
    expect(typeof provider.generateSOPInspection).toBe('function')
  })
})

describe('getLLMProvider', () => {
  beforeEach(() => {
    resetLLMProvider()
  })

  it('should return mock provider by default', () => {
    const provider = getLLMProvider()
    expect(provider.name).toBe('mock')
  })

  it('should return same instance on multiple calls', () => {
    const provider1 = getLLMProvider()
    const provider2 = getLLMProvider()
    expect(provider1).toBe(provider2)
  })
})
