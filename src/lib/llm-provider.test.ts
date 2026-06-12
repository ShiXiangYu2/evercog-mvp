/**
 * LLM Provider 单元测试
 * 验证 Mock Provider 的输出结构和业务逻辑
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { getLLMProvider, resetLLMProvider } from './llm-provider'

beforeEach(() => {
  resetLLMProvider()
})

describe('MockLLMProvider', () => {
  const provider = getLLMProvider()

  it('should return mock provider', () => {
    expect(provider.name).toBe('mock')
  })

  describe('generateBrief', () => {
    it('should generate brief with all required fields', async () => {
      const result = await provider.generateBrief({
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
      const result = await provider.generateBrief({
        title: '测试政策',
        source: '测试来源',
        customerType: 'unknown_type',
        url: 'https://example.com',
      })

      expect(result.summary).toContain('中小微企业')
    })
  })

  describe('generateExperienceReply', () => {
    it('should generate reply with all four sections', async () => {
      const result = await provider.generateExperienceReply({
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
      const result = await provider.generateExperienceReply({
        question: '随机问题',
        retrievedCards: [],
      })

      expect(result.policyExplanation).toBe('')
      expect(result.serviceOpportunity).toBeTruthy()
      expect(result.citedSources).toHaveLength(0)
    })

    it('should include risk card content in risk reminder', async () => {
      const result = await provider.generateExperienceReply({
        question: '税务风险',
        retrievedCards: [
          {
            id: '1',
            title: '常见税务风险',
            content: '税务风险内容',
            category: 'risk_reminder',
            tags: null,
            source: null,
            riskNotes: '具体风险提示',
          },
        ],
      })

      expect(result.riskReminder).toContain('具体风险提示')
    })
  })

  describe('generateSOPInspection', () => {
    it('should generate inspection report with scores', async () => {
      const result = await provider.generateSOPInspection({
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

    it('should detect missing elements in short content', async () => {
      const result = await provider.generateSOPInspection({
        content: '简单的步骤描述',
      })

      expect(result.completeness).toBeLessThan(80)
      expect(result.missingSteps.length).toBeGreaterThan(0)
    })

    it('should give higher scores to well-structured content', async () => {
      const goodContent = `## 完整的 SOP 文档

### 第一步：准备阶段
- 检查资料完整性
- 确认时间安排

### 第二步：执行阶段
- 按照流程操作
- 记录关键信息

### 第三步：收尾阶段
- 检查完成情况
- 确认无遗漏

### 注意事项
- 确保资料真实

### 异常处理
- 遇到问题时联系负责人

### 负责人
- 张三负责全程跟进

### 时间要求
- 3天内完成`

      const badContent = '简单描述'

      const goodResult = await provider.generateSOPInspection({ content: goodContent })
      const badResult = await provider.generateSOPInspection({ content: badContent })

      expect(goodResult.completeness).toBeGreaterThan(badResult.completeness)
      expect(goodResult.executability).toBeGreaterThan(badResult.executability)
    })
  })
})
