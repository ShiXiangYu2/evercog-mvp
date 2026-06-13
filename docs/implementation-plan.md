# 实现计划：政策上下文信息增强

> 基于 PRD：docs/prd-policy-context.md
> 基于 Issues：docs/issues-policy-context.md
> 创建日期：2026-06-13

---

## 一、项目概览

| 项目 | 内容 |
|------|------|
| **项目名称** | 政策上下文信息增强 |
| **优先级** | P1（锦上添花） |
| **总工时** | 3.5 天 |
| **负责人** | AI 开发 Agent |

---

## 二、任务分解

### 阶段 1：基础准备（Day 1）

| 任务 | 工时 | 产出 |
|------|------|------|
| Issue 1：扩展数据模型 | 0.5 天 | Schema 更新 + 迁移 |
| Issue 2：扩展 LLM 接口 | 0.5 天 | 类型定义更新 |

### 阶段 2：核心实现（Day 2）

| 任务 | 工时 | 产出 |
|------|------|------|
| Issue 3：Mock 政策上下文生成 | 0.5 天 | MockReplyGenerator 更新 |
| Issue 4：UI 组件开发 | 1 天 | PolicyContextCard 组件 |

### 阶段 3：集成测试（Day 3）

| 任务 | 工时 | 产出 |
|------|------|------|
| Issue 5：集成到页面 | 0.5 天 | Experience 页面更新 |
| Issue 6：单元测试 | 0.5 天 | 测试用例 |

---

## 三、TDD 驱动流程

### Step 1：写测试（RED）

```typescript
// src/lib/llm/__tests__/mock-reply-generator.test.ts
describe('MockReplyGenerator - Policy Context', () => {
  it('should generate policy context', async () => {
    const generator = new MockReplyGenerator()
    const result = await generator.generateExperienceReply({
      question: '小微企业税收优惠政策',
      retrievedCards: [{
        id: '1',
        title: '小微企业税收优惠',
        content: '...',
        category: 'tax_process',
        tags: null,
        source: '国家税务总局',
        riskNotes: null,
      }],
    })

    expect(result.policyContext).toBeDefined()
    expect(result.policyContext.status).toBe('active')
    expect(result.applicability).toBeDefined()
  })
})
```

### Step 2：实现代码（GREEN）

按照 Issues 中的技术方案实现。

### Step 3：重构（REFACTOR）

优化代码结构，确保测试通过。

---

## 四、验收检查

### 功能验收

- [ ] AI 回答中显示政策上下文卡片
- [ ] 有效期信息正确显示
- [ ] 适用地区正确显示
- [ ] 适用主体正确显示
- [ ] 条款编号正确显示
- [ ] 适用性判断正确显示

### 测试验收

- [ ] 所有单元测试通过
- [ ] 构建成功
- [ ] 无 TypeScript 错误

### UI 验收

- [ ] 样式与现有页面一致
- [ ] 响应式布局正常
- [ ] 无明显视觉问题

---

## 五、风险与应对

| 风险 | 应对 |
|------|------|
| 政策信息不完整 | 使用 Mock 数据，后续完善 |
| AI 判断不准确 | 添加人工复核机制 |
| 样式不一致 | 参考现有组件样式 |

---

## 六、交付物

| 交付物 | 文件 |
|--------|------|
| PRD | docs/prd-policy-context.md |
| Issues | docs/issues-policy-context.md |
| 实现计划 | docs/implementation-plan.md |
| 代码 | src/lib/llm/*, src/components/*, src/app/experience/* |
| 测试 | src/lib/llm/__tests__/* |
