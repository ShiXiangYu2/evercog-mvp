# PRD：政策上下文信息增强

> 版本：v1.0
> 日期：2026-06-13
> 优先级：P1（锦上添花）

---

## 一、Problem Statement

### 当前问题

经验问答功能在生成回复时，只展示政策内容摘要，缺少关键上下文信息：
- 政策有效期（是否过期）
- 适用地区（是否适用于当前客户）
- 适用主体（企业类型是否符合）
- 条款编号（便于追溯和引用）

### 用户痛点

一线员工在回答客户咨询时，需要手动判断政策是否适用，容易出错。

---

## 二、Solution

### 核心方案

在 AI 回答中增加"政策上下文"卡片，自动展示：
1. **有效期**：政策生效时间、截止时间、状态（有效/即将过期/已过期）
2. **适用地区**：政策适用的地区范围
3. **适用主体**：政策适用的企业类型
4. **条款编号**：便于追溯的条款引用

### 智能研判

AI 自动判断政策对当前客户的适用性：
- ✅ 完全适用
- ⚠️ 部分适用（需补充条件）
- ❌ 不适用（说明原因）

---

## 三、User Stories

### US-1：查看政策有效期

**作为** 一线员工
**我希望** 在 AI 回答中看到政策的有效期信息
**以便** 快速判断政策是否仍然有效

**验收标准：**
- [ ] 显示政策生效日期
- [ ] 显示政策截止日期
- [ ] 显示政策状态（有效/即将过期/已过期）
- [ ] 即将过期（30 天内）时显示警告

### US-2：查看适用地区

**作为** 一线员工
**我希望** 在 AI 回答中看到政策的适用地区
**以便** 确认政策是否适用于当前客户所在地区

**验收标准：**
- [ ] 显示政策适用的省/市
- [ ] 如适用于全国，显示"全国通用"
- [ ] 如仅限特定地区，高亮显示

### US-3：查看适用主体

**作为** 一线员工
**我希望** 在 AI 回答中看到政策的适用企业类型
**以便** 确认客户是否符合申报条件

**验收标准：**
- [ ] 显示适用的企业类型（如：小微企业、个体工商户）
- [ ] 显示限制条件（如：年营收上限）
- [ ] AI 可根据客户信息自动判断适用性

### US-4：查看条款编号

**作为** 一线员工
**我希望** 在 AI 回答中看到条款编号
**以便** 追溯政策原文

**验收标准：**
- [ ] 显示条款编号（如：第一条、第二款）
- [ ] 点击可查看条款原文（如已录入）
- [ ] 便于在回复中引用

### US-5：政策适用性研判

**作为** 一线员工
**我希望** AI 自动判断政策是否适用于当前客户
**以便** 快速给出准确建议

**验收标准：**
- [ ] 显示适用性判断结果（适用/部分适用/不适用）
- [ ] 说明判断依据
- [ ] 如部分适用，列出需要补充的条件

---

## 四、Technical Design

### 数据模型扩展

```typescript
// 政策上下文信息
interface PolicyContext {
  validFrom: Date        // 生效日期
  validTo: Date          // 截止日期
  status: 'active' | 'expiring' | 'expired'  // 状态
  applicableRegions: string[]  // 适用地区
  applicableEntities: string[] // 适用主体
  clauseNumbers: string[]      // 条款编号
  restrictions?: string[]      // 限制条件
}

// 适用性判断
interface ApplicabilityResult {
  status: 'applicable' | 'partial' | 'not_applicable'
  reason: string
  missingConditions?: string[]
}
```

### API 扩展

```typescript
// 修改 ExperienceReplyOutput
interface ExperienceReplyOutput {
  // ... 现有字段
  policyContext?: PolicyContext  // 新增：政策上下文
  applicability?: ApplicabilityResult  // 新增：适用性判断
}
```

### UI 组件

```tsx
// 新增：政策上下文卡片
function PolicyContextCard({ context, applicability }: Props) {
  return (
    <div className="bg-white rounded-lg p-4 border">
      <h4>政策上下文</h4>
      <div>有效期：{context.validFrom} - {context.validTo}</div>
      <div>适用地区：{context.applicableRegions.join(', ')}</div>
      <div>适用主体：{context.applicableEntities.join(', ')}</div>
      <div>条款编号：{context.clauseNumbers.join(', ')}</div>
      <ApplicabilityBadge status={applicability.status} />
    </div>
  )
}
```

---

## 五、Out of Scope

- [ ] 政策原文全文展示（当前只展示摘要）
- [ ] 政策对比功能
- [ ] 政策更新通知
- [ ] 政策申报流程引导

---

## 六、Further Notes

### 依赖项

- 需要在知识卡中增加政策上下文字段
- 需要修改 LLM Provider 生成政策上下文

### 风险

- 政策信息可能不完整（知识卡缺少字段）
- AI 判断可能不准确（需要人工复核）

### 时间估算

- 数据模型扩展：1 天
- API 修改：1 天
- UI 组件开发：1 天
- 测试和调优：1 天
- **总计：4 天**
