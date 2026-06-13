# Issues：政策上下文信息增强

> 基于 PRD：docs/prd-policy-context.md
> 创建日期：2026-06-13

---

## Issue 1：扩展知识卡数据模型

**标签：** `enhancement` `database` `P1`
**预估工时：** 0.5 天

### What to build

在 Prisma Schema 中为 KnowledgeCard 添加政策上下文字段。

### Acceptance Criteria

- [ ] KnowledgeCard 模型新增字段：
  - `validFrom: DateTime?`（生效日期）
  - `validTo: DateTime?`（截止日期）
  - `applicableRegions: String?`（适用地区，JSON 数组）
  - `applicableEntities: String?`（适用主体，JSON 数组）
  - `clauseNumbers: String?`（条款编号，JSON 数组）
- [ ] 数据库迁移成功
- [ ] 现有功能不受影响

### Technical Notes

```prisma
// prisma/schema.prisma
model KnowledgeCard {
  // ... 现有字段
  validFrom          DateTime?
  validTo            DateTime?
  applicableRegions  String?    // JSON: ["北京", "上海"]
  applicableEntities String?    // JSON: ["小微企业", "个体工商户"]
  clauseNumbers      String?    // JSON: ["第一条", "第二款"]
}
```

---

## Issue 2：扩展 LLM Provider 接口

**标签：** `enhancement` `api` `P1`
**预估工时：** 0.5 天

### What to build

修改 LLM 类型定义，支持返回政策上下文信息。

### Acceptance Criteria

- [ ] `ExperienceReplyOutput` 新增字段：
  - `policyContext?: PolicyContext`
  - `applicability?: ApplicabilityResult`
- [ ] `PolicyContext` 类型定义完整
- [ ] `ApplicabilityResult` 类型定义完整

### Technical Notes

```typescript
// src/lib/llm/types.ts
export interface PolicyContext {
  validFrom?: string
  validTo?: string
  status: 'active' | 'expiring' | 'expired'
  applicableRegions: string[]
  applicableEntities: string[]
  clauseNumbers: string[]
}

export interface ApplicabilityResult {
  status: 'applicable' | 'partial' | 'not_applicable'
  reason: string
  missingConditions?: string[]
}
```

---

## Issue 3：实现 Mock 政策上下文生成

**标签：** `enhancement` `llm` `P1`
**预估工时：** 0.5 天

### What to build

修改 MockReplyGenerator，生成政策上下文和适用性判断。

### Acceptance Criteria

- [ ] MockReplyGenerator 返回完整的 PolicyContext
- [ ] MockReplyGenerator 返回适用性判断
- [ ] 根据知识卡内容智能判断适用性

### Technical Notes

```typescript
// src/lib/llm/mock-reply-generator.ts
async generateExperienceReply(input: ExperienceReplyInput) {
  // ... 现有逻辑

  const policyContext: PolicyContext = {
    validFrom: '2024-01-01',
    validTo: '2025-12-31',
    status: 'active',
    applicableRegions: ['全国'],
    applicableEntities: ['小微企业', '个体工商户'],
    clauseNumbers: ['第一条', '第二款'],
  }

  const applicability: ApplicabilityResult = {
    status: 'applicable',
    reason: '客户为小微企业，符合政策适用条件',
  }

  return { ...existing, policyContext, applicability }
}
```

---

## Issue 4：创建政策上下文 UI 组件

**标签：** `enhancement` `ui` `P1`
**预估工时：** 1 天

### What to build

创建 PolicyContextCard 组件，展示政策上下文信息。

### Acceptance Criteria

- [ ] 组件显示有效期（带状态标签）
- [ ] 组件显示适用地区
- [ ] 组件显示适用主体
- [ ] 组件显示条款编号
- [ ] 组件显示适用性判断（带颜色标签）
- [ ] 样式与现有页面一致

### Technical Notes

```tsx
// src/components/PolicyContextCard.tsx
export function PolicyContextCard({ context, applicability }: Props) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    expiring: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-800',
  }

  const applicabilityColors = {
    applicable: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    not_applicable: 'bg-red-100 text-red-800',
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <h4 className="font-bold text-gray-900 mb-3">政策上下文</h4>
      {/* 有效期 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-gray-500">有效期：</span>
        <span className="text-sm text-gray-900">
          {context.validFrom} - {context.validTo}
        </span>
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[context.status]}`}>
          {context.status === 'active' ? '有效' : context.status === 'expiring' ? '即将过期' : '已过期'}
        </span>
      </div>
      {/* 适用地区 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-gray-500">适用地区：</span>
        <span className="text-sm text-gray-900">
          {context.applicableRegions.join(', ')}
        </span>
      </div>
      {/* 适用主体 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-gray-500">适用主体：</span>
        <span className="text-sm text-gray-900">
          {context.applicableEntities.join(', ')}
        </span>
      </div>
      {/* 条款编号 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-500">条款编号：</span>
        <span className="text-sm text-gray-900">
          {context.clauseNumbers.join(', ')}
        </span>
      </div>
      {/* 适用性判断 */}
      <div className={`p-3 rounded-lg ${applicabilityColors[applicability.status]}`}>
        <span className="font-medium">
          {applicability.status === 'applicable' ? '✅ 适用' :
           applicability.status === 'partial' ? '⚠️ 部分适用' : '❌ 不适用'}
        </span>
        <span className="ml-2 text-sm">{applicability.reason}</span>
      </div>
    </div>
  )
}
```

---

## Issue 5：集成到 Experience 页面

**标签：** `enhancement` `integration` `P1`
**预估工时：** 0.5 天

### What to build

在 Experience 页面展示政策上下文卡片。

### Acceptance Criteria

- [ ] 在 AI 回答区域下方显示政策上下文卡片
- [ ] 当 policyContext 存在时显示
- [ ] 样式与现有页面一致

### Technical Notes

```tsx
// src/app/experience/page.tsx
{result.policyContext && (
  <PolicyContextCard
    context={result.policyContext}
    applicability={result.applicability}
  />
)}
```

---

## Issue 6：编写单元测试

**标签：** `testing` `P1`
**预估工时：** 0.5 天

### What to build

为新功能编写单元测试。

### Acceptance Criteria

- [ ] PolicyContextCard 组件测试
- [ ] MockReplyGenerator 政策上下文生成测试
- [ ] 所有测试通过

---

## 实现计划

| Issue | 描述 | 工时 | 依赖 |
|-------|------|------|------|
| 1 | 扩展数据模型 | 0.5 天 | 无 |
| 2 | 扩展 LLM 接口 | 0.5 天 | 无 |
| 3 | Mock 政策上下文生成 | 0.5 天 | Issue 2 |
| 4 | UI 组件开发 | 1 天 | Issue 2 |
| 5 | 集成到页面 | 0.5 天 | Issue 3, 4 |
| 6 | 单元测试 | 0.5 天 | Issue 3, 4 |
| **总计** | | **3.5 天** | |

### 执行顺序

```
Issue 1 + Issue 2 (并行)
       ↓
Issue 3 + Issue 4 (并行)
       ↓
    Issue 5
       ↓
    Issue 6
```
