# Evercog MVP — 自主进化 Agent 系统开发规划

> 基于 auto-dev-framework Loop Engineering 方法论
> 版本：v1.0 | 日期：2026-06-14

---

## 一、项目现状分析

### 1.1 evercog-mvp 项目概况

| 维度 | 现状 |
|------|------|
| **定位** | AI 政策情报与业务经验中台，面向中小微企业服务公司 |
| **技术栈** | Next.js 16 + React 19 + Prisma ORM + SQLite |
| **核心价值** | 让企业服务经验从"个人记忆"变成"可追溯、可复用、可进化的组织资产" |
| **LLM 层** | Mock + DeepSeek 双 Provider，带限流和用量追踪 |
| **Agent 系统** | 已有 `AgentOrchestrator` + 2 个执行器（知识审核、缺口检测） |
| **Loop 配置** | 已定义 3 条 Loop（巡检、反馈、SOP），但依赖外部 Python 脚本 |

### 1.2 已有基础设施

```
src/lib/agent/
├── orchestrator.ts          ✅ 任务编排器（创建、调度、执行）
├── types.ts                 ✅ AgentTask、AgentExecutor 接口
├── executors/
│   ├── knowledge-review-executor.ts   ✅ 知识卡审核
│   └── gap-detection-executor.ts      ✅ 缺口检测
├── review-service.ts        ✅ 完整的知识卡审核逻辑
├── task-executor.ts         ✅ 任务执行器（含缺口填充）
└── gap-detector.ts          ✅ 基于关键词的缺口检测

src/lib/llm/
├── index.ts                 ✅ LLM Provider 工厂 + callLLMWithFallback
├── types.ts                 ✅ BriefGenerator、ReplyGenerator、InspectionGenerator
├── mock-provider.ts         ✅ Mock 实现
└── usage-tracker.ts         ✅ 用量追踪
```

### 1.3 核心差距（需要解决）

| 差距 | 说明 |
|------|------|
| **无自主决策** | `AgentOrchestrator` 只执行已创建的任务，不会自己判断"该做什么" |
| **无学习能力** | `FeedbackService` 收集反馈后创建 `OptimizationTask`，但无人消费 |
| **无闭环进化** | 审核后的改进不会反哺到搜索算法或回复策略 |
| **Loop 在外部** | GitHub Actions 调用 Python 脚本，状态不持久化到数据库 |

---

## 二、Loop Engineering 设计

> 按照 auto-dev-framework 的 Loop Engineering 五步法设计

### Step 1: 定义目标

**Loop 要解决什么问题？**
Agent 系统目前只能被动执行任务，无法自主发现知识缺口、学习用户反馈、持续优化知识库质量。

**成功的标准是什么？**
1. Agent 能自主发现知识缺口并创建填充任务
2. Agent 能从用户反馈中学习，识别低质量知识卡
3. Agent 能自主触发巡检、学习等 Loop，无需人工干预
4. 所有高风险操作保留人工审批（HITL）

**失败的代价是什么？**
- 错误的知识卡自动生成可能引入虚假信息
- 无限循环可能消耗过多资源
- 需要安全边界防止 Agent 越权操作

---

### Step 2: 选择触发器

| Loop 名称 | 触发器类型 | 配置 | 说明 |
|-----------|-----------|------|------|
| knowledge-card-patrol | 定时 | `0 8 * * *` | 每天 8:00 巡检知识卡质量 |
| experience-feedback-loop | 定时 | `0 9 * * 1` | 每周一 9:00 分析反馈 |
| sop-completion-monitor | 定时 | `0 18 * * *` | 每天 18:00 监控 SOP |
| **gap-auto-fill** | 事件驱动 | `gap:detected` | Agent 主动填充缺口 |
| **learning-analysis** | 定时 | `0 10 * * 0` | 每周日 10:00 分析学习模式 |

---

### Step 3: 编排 Skills

#### Loop 1: 知识卡质量巡检（已有，需迁移到内置调度器）

```
触发器(定时 8:00)
  → scan-knowledge-cards (扫描 pending_review 状态)
  → knowledge-review-executor (AI 审核质量)
  → triage (按质量分分类：自动通过/人工复核/自动驳回)
  → update-cards (更新知识卡状态)
  → update-loop-memory (记录运行结果)
```

#### Loop 2: 经验问答反馈分析（已有，需迁移到内置调度器）

```
触发器(每周一 9:00)
  → scan-feedback (扫描本周反馈记录)
  → feedback-analyzer (分析高频问题、未覆盖领域)
  → gap-detection-executor (识别知识库缺口)
  → create-tasks (为高优先级缺口创建填充任务)
  → update-loop-memory
```

#### Loop 3: SOP 完成度监控（已有，需迁移到内置调度器）

```
触发器(每天 18:00)
  → scan-sop-tasks (扫描进行中的 SOP 任务)
  → check-completion (检查提交质量和完成度)
  → generate-review-suggestions (生成导师审核建议)
  → notify-timeout (发送超时提醒)
  → update-loop-memory
```

#### Loop 4: 知识缺口自动填充（新增）

```
触发器(事件: gap:detected)
  → gap-detection-executor (确认缺口)
  → auto-filler (使用 LLM 生成知识卡草稿)
  → knowledge-review-executor (自动审核)
  → if score >= 0.8: auto-approve → pending_review
  → if score < 0.8: flag-for-human-review
  → update-loop-memory
```

#### Loop 5: 学习模式分析（新增）

```
触发器(每周日 10:00)
  → scan-feedback-patterns (分析反馈模式)
  → scan-review-patterns (分析审核模式)
  → scan-qa-matches (分析问答匹配)
  → pattern-store (存储学习到的模式)
  → rule-evolver (建议规则调整)
  → update-loop-memory
```

---

### Step 4: 设计终止条件

| 终止条件 | 值 | 说明 |
|----------|-----|------|
| max_items_per_loop | 10 | 单次 Loop 最多处理 10 个知识卡 |
| max_iterations | 3 | 单次循环最多 3 轮 |
| confidence_threshold | 0.7 | 低于此置信度的操作需要人工确认 |
| timeout_minutes | 30 | 单次 Loop 超时 30 分钟 |
| consecutive_failures_limit | 3 | 连续失败 3 次暂停该 Loop |

**防无限循环机制：**
- 每个 Loop 有明确的 max_items_per_loop
- 连续 3 次相同结果 → 强制终止并通知
- 所有写操作（创建/修改）记录审计日志

---

### Step 5: 配置 Memory

**双格式工作记忆：**

1. `loop-state.json` — 机器可读状态
   - 每个 Loop 的运行状态、上次运行时间、累计处理数量
   - 调度器状态（idle/running/paused/error）

2. `loop-memory.md` — 人类可读记忆
   - 运行历史记录
   - 决策历史
   - 学习到的模式库
   - 待办事项和优化建议

---

## 三、系统架构设计

### 3.1 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    内置调度器 (Built-in Scheduler)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Cron Engine   │  │ Event Engine │  │ Condition Engine │   │
│  │ (定时触发)    │  │ (事件触发)   │  │ (条件触发)       │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         └──────────────────┼────────────────────┘              │
│                            ▼                                  │
│               ┌────────────────────────┐                      │
│               │   自主决策引擎          │                      │
│               │   (Decision Engine)     │                      │
│               │  感知 → 评估 → 决策     │                      │
│               └───────────┬────────────┘                      │
│                           ▼                                   │
│               ┌────────────────────────┐                      │
│               │   AgentOrchestrator     │                      │
│               │   (现有编排器，扩展)    │                      │
│               └───────────┬────────────┘                      │
│                           │                                   │
│         ┌─────────────────┼─────────────────┐                 │
│         ▼                 ▼                  ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐     │
│  │ Knowledge    │  │ Gap         │  │ Feedback         │     │
│  │ Review       │  │ Detection   │  │ Learning         │     │
│  │ Executor     │  │ Executor    │  │ Executor (新)    │     │
│  └─────────────┘  └─────────────┘  └──────────────────┘     │
│                           │                                   │
│                           ▼                                   │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              学习系统 (Learning System)                │    │
│  │  Pattern Store │ Rule Evolver │ Quality Tracker       │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                   │
│                           ▼                                   │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         知识积累系统 (Knowledge Accumulation)          │    │
│  │  AutoFiller │ Card Optimizer │ Content Enhancer       │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌──────────────────────────┐
              │   Prisma + SQLite         │
              │   (持久化层)              │
              └──────────────────────────┘
```

### 3.2 核心设计原则

1. **渐进式自主** — Agent 的自主程度从"仅执行"到"自主决策"分阶段提升，每阶段都有人类审核点
2. **事件驱动** — 所有行动由事件触发（状态变更、定时到达、阈值突破），而非轮询
3. **安全边界** — Agent 不能直接发布知识卡、不能删除数据、不能修改用户权限
4. **可追溯** — 每个决策、每个行动都记录到 `AgentDecisionLog`，支持回溯和审计
5. **向后兼容** — 现有 `AgentOrchestrator`、`AgentExecutor` 接口不变

---

## 四、数据模型扩展

### 4.1 新增 Prisma 模型

```prisma
// ==================== Loop 执行记录 ====================
model LoopExecution {
  id              String   @id @default(cuid())
  loopName        String
  triggerType     String   // schedule, event, condition, manual
  triggerReason   String?
  status          String   @default("running") // running, completed, failed, cancelled
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  duration        Int?
  itemsProcessed  Int      @default(0)
  itemsSucceeded  Int      @default(0)
  itemsFailed     Int      @default(0)
  result          String?  // JSON
  error           String?
  pipelineSnapshot String? // JSON

  @@index([loopName])
  @@index([status])
  @@index([startedAt])
  @@map("loop_executions")
}

// ==================== 调度器状态 ====================
model SchedulerState {
  id              String   @id @default(cuid())
  loopName        String   @unique
  status          String   @default("idle") // idle, running, paused, error
  lastRunAt       DateTime?
  totalRuns       Int      @default(0)
  consecutiveFailures Int  @default(0)
  lastError       String?
  configuration   String?  // JSON
  updatedAt       DateTime @updatedAt

  @@map("scheduler_states")
}

// ==================== Agent 决策日志 ====================
model AgentDecisionLog {
  id              String   @id @default(cuid())
  decisionType    String
  reasoning       String
  confidence      Float
  riskLevel       String   // safe, caution, dangerous
  actions         String   // JSON
  context         String?  // JSON
  outcome         String?  // success, failed, pending_approval
  approvedBy      String?
  approvedAt      DateTime?
  createdAt       DateTime @default(now())

  @@index([decisionType])
  @@index([riskLevel])
  @@index([createdAt])
  @@map("agent_decision_logs")
}

// ==================== Agent 学习模式 ====================
model AgentLearningPattern {
  id               String   @id @default(cuid())
  patternType      String   // feedback_quality, review_issue, qa_miss, rule_adjustment
  category         String?
  description      String
  frequency        Int      @default(1)
  confidence       Float    @default(0.5)
  evidence         String?  // JSON
  suggestedAction  String?
  status           String   @default("active") // active, deprecated, superseded
  learnedAt        DateTime @default(now())
  lastReinforcedAt DateTime @default(now())
  supersededById   String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([patternType])
  @@index([category])
  @@index([status])
  @@map("agent_learning_patterns")
}

// ==================== 规则调整记录 ====================
model RuleAdjustment {
  id              String   @id @default(cuid())
  ruleId          String
  currentConfig   String   // JSON
  suggestedConfig String   // JSON
  reason          String
  basedOnPatterns String   // JSON
  confidence      Float
  status          String   @default("pending") // pending, approved, rejected
  approvedBy      String?
  approvedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([ruleId])
  @@index([status])
  @@map("rule_adjustments")
}
```

---

## 五、实现计划

### Phase 1: 内置调度器（1-2 周）

**目标：** 将 Loop 从外部脚本迁移到 Next.js 内置调度器

**任务清单：**

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1 | 安装 `node-cron` 依赖 | `package.json` | - |
| 2 | 新增 Prisma 模型 | `prisma/schema.prisma` | - |
| 3 | 运行 `prisma migrate dev` | 数据库 | #2 |
| 4 | 实现 EventBus | `src/lib/scheduler/event-bus.ts` | - |
| 5 | 实现 BuiltInScheduler | `src/lib/scheduler/scheduler.ts` | #1, #4 |
| 6 | 实现 LoopExecutor | `src/lib/scheduler/loop-executor.ts` | #5 |
| 7 | 实现 CronTrigger | `src/lib/scheduler/triggers/cron-trigger.ts` | #1 |
| 8 | 创建 API 路由 | `src/app/api/scheduler/*` | #5, #6 |
| 9 | 初始化调度器 | `src/lib/init.ts` | #5 |
| 10 | 更新 GitHub Actions | `.github/workflows/loop-trigger.yml` | #8 |

**验收标准：**
- 3 条 Loop 可通过内置调度器正常触发和执行
- 执行记录持久化到 `LoopExecution` 表
- `/api/scheduler/status` 返回所有 Loop 的实时状态

---

### Phase 2: 自主决策引擎（2-3 周）

**目标：** Agent 能根据系统状态自主决定下一步行动

**任务清单：**

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1 | 新增 AgentDecisionLog 模型 | `prisma/schema.prisma` | - |
| 2 | 实现 SystemStateAnalyzer | `src/lib/agent/decision-engine/analyzers/system-state-analyzer.ts` | - |
| 3 | 实现 PriorityCalculator | `src/lib/agent/decision-engine/analyzers/priority-calculator.ts` | - |
| 4 | 实现 RuleEngine | `src/lib/agent/decision-engine/rules/rule-engine.ts` | - |
| 5 | 实现 DecisionEngine | `src/lib/agent/decision-engine/decision-engine.ts` | #2, #3, #4 |
| 6 | 实现安全边界检查 | `src/lib/agent/decision-engine/safety-boundary.ts` | - |
| 7 | 创建 API 路由 | `src/app/api/agent/decide` | #5 |
| 8 | EventBus 集成 | 现有服务添加事件发射 | #4 |

**预定义规则：**

```typescript
const DECISION_RULES = [
  {
    id: 'auto_create_high_priority_gap_task',
    condition: (ctx) => ctx.systemHealth.knowledgeGapCount > 0,
    action: 'create_task',
    riskLevel: 'safe',
  },
  {
    id: 'trigger_learning_on_feedback_backlog',
    condition: (ctx) => ctx.systemHealth.unresolvedFeedbackCount > 5,
    action: 'trigger_loop',
    riskLevel: 'safe',
  },
  {
    id: 'trigger_patrol_on_coverage_drop',
    condition: (ctx) => ctx.systemHealth.knowledgeCoverageRate < 70,
    action: 'trigger_loop',
    riskLevel: 'caution',
  },
  {
    id: 'escalate_on_consecutive_failures',
    condition: (ctx) => ctx.systemHealth.failedTaskCount24h > 3,
    action: 'escalate',
    riskLevel: 'dangerous',
  },
]
```

**安全边界：**

| 操作类型 | 权限 |
|----------|------|
| 创建任务、触发 Loop、调整优先级 | Agent 自主执行 |
| 发布/驳回知识卡、修改 SOP | 需要人工审批 |
| 删除用户、修改权限、修改系统配置 | 禁止 |

**验收标准：**
- `POST /api/agent/decide` 返回合理决策
- 决策日志完整记录到 `AgentDecisionLog`
- 安全边界正确拦截高风险操作

---

### Phase 3: 学习系统（2-3 周）

**目标：** Agent 能从反馈和审核结果中提取模式，持续优化

**任务清单：**

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1 | 新增 AgentLearningPattern、RuleAdjustment 模型 | `prisma/schema.prisma` | - |
| 2 | 实现 FeedbackAnalyzer | `src/lib/agent/learning/feedback-analyzer.ts` | - |
| 3 | 实现 PatternStore | `src/lib/agent/learning/pattern-store.ts` | #1 |
| 4 | 实现 QualityTracker | `src/lib/agent/learning/quality-tracker.ts` | - |
| 5 | 实现 RuleEvolver | `src/lib/agent/learning/rule-evolver.ts` | #3 |
| 6 | 实现 LearningSystem | `src/lib/agent/learning/learning-system.ts` | #2, #3, #4, #5 |
| 7 | 新增 FeedbackLearningExecutor | `src/lib/agent/executors/feedback-learning-executor.ts` | #6 |
| 8 | 创建 API 路由 | `src/app/api/agent/patterns` | #3 |
| 9 | 新增 learning-analysis Loop | `.loop-config.yaml` | #6 |

**学习维度：**

| 维度 | 数据源 | 提取模式 |
|------|--------|----------|
| 反馈学习 | `Feedback` 表 | `card_quality_issue`, `coverage_gap` |
| 审核学习 | 审核结果 | `common_format_issue`, `duplicate_tendency` |
| 问答匹配 | `ExperienceQuery` 表 | `search_miss`, `keyword_boost` |

**验收标准：**
- 系统能自动识别低质量知识卡并生成优化建议
- 模式库中有可查询的学习记录
- 质量趋势图可展示

---

### Phase 4: 知识积累增强（1-2 周）

**目标：** Agent 能自动生成高质量知识卡，形成完整闭环

**任务清单：**

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1 | 实现 AutoFiller | `src/lib/agent/knowledge-accumulation/auto-filler.ts` | - |
| 2 | 实现 CardOptimizer | `src/lib/agent/knowledge-accumulation/card-optimizer.ts` | - |
| 3 | 实现 ContentEnhancer | `src/lib/agent/knowledge-accumulation/content-enhancer.ts` | - |
| 4 | 创建 API 路由 | `src/app/api/agent/autofill/*` | #1 |
| 5 | 集成到 DecisionEngine | `src/lib/agent/decision-engine/` | #1, #2 |

**验收标准：**
- 缺口自动填充使用 LLM 生成内容，质量分 >= 60
- 低质量卡片能被自动识别和优化
- 端到端闭环：缺口检测 → 决策 → 自动填充 → 审核 → 发布

---

## 六、Skill I/O 契约

> 遵循 auto-dev-framework 的 Skill I/O 契约规范

### 6.1 标准输入格式

```yaml
skill_input:
  loop:
    name: "knowledge-card-patrol"
    run_id: "2026-06-14T08-00-00Z"
    iteration: 1
  task:
    type: "knowledge_card"
    id: "card-123"
  context:
    repo: "evercog-mvp"
    memory_path: "loop-memory.md"
    state_path: "loop-state.json"
  constraints:
    max_items_per_loop: 10
    confidence_threshold: 0.8
    timeout_minutes: 30
  previous_output:
    status: "success"
    data: {}
```

### 6.2 标准输出格式

```yaml
skill_output:
  skill: "knowledge-review"
  status: "success"
  confidence: 0.85
  summary: "审核通过，质量分 0.85"
  data:
    score: 0.85
    verdict: "pass"
  next:
    recommended_action: "continue"
    reason: "confidence >= threshold"
  memory_updates:
    decisions:
      - decision: "approve knowledge card"
        reason: "quality score 0.85 >= 0.8"
  side_effects:
    files_changed: []
```

---

## 七、API 设计

### 7.1 调度器 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/scheduler/status` | 获取所有 Loop 状态 | admin, ai_info |
| POST | `/api/scheduler/trigger` | 手动触发 Loop | admin, ai_info |
| PUT | `/api/scheduler/loop/:name/pause` | 暂停 Loop | admin |
| GET | `/api/scheduler/health` | 调度器健康检查 | public |

### 7.2 决策引擎 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/agent/decide` | 触发一次决策循环 | admin, ai_info |
| GET | `/api/agent/decisions` | 获取决策历史 | admin, ai_info |
| GET | `/api/agent/health` | 系统健康度 | admin, ai_info |
| POST | `/api/agent/decisions/:id/approve` | 审批决策 | admin |

### 7.3 学习系统 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/agent/patterns` | 获取学习到的模式 | admin, ai_info |
| POST | `/api/agent/quality/snapshot` | 触发质量指标计算 | admin, ai_info |
| GET | `/api/agent/quality/trend` | 获取质量趋势 | admin, ai_info |
| GET | `/api/agent/rule-adjustments` | 获取规则调整建议 | admin |

---

## 八、与 auto-dev-framework 的集成

### 8.1 可复用的 Skills

| Skill | 用途 | 集成方式 |
|-------|------|----------|
| `loop-engineering` | Loop 设计和配置 | 直接复用方法论 |
| `diagnose` | Bug 诊断循环 | 集成到 Decision Engine |
| `tdd` | 测试驱动开发 | 开发新模块时使用 |
| `grill-me` | 需求追问 | 需求分析阶段使用 |
| `prototype` | 快速原型验证 | 设计新功能时使用 |

### 8.2 开发流程

```
学习 → 问题塑形（交织 Eval 推导） → AI 编程 → 原型 → Eval 验证 → 复盘
         ↓
    [产出：带 Eval 指标的三层用户故事]
         ↓
    用户故事层 / 技术规格层 / Eval 指标层
```

### 8.3 Eval 四层验证

| 层级 | 验证内容 | 测试方法 |
|------|----------|----------|
| 功能正确层 | Loop 执行、任务创建、决策生成 | 单元测试 + 集成测试 |
| 性能安全层 | 限流、超时、安全边界 | 安全测试 |
| 边界异常层 | 连续失败、无限循环、资源耗尽 | 边界测试 |
| 业务价值层 | 知识覆盖率、用户满意度 | 业务指标 |

---

## 九、关键文件清单

| 文件 | 作用 | Phase |
|------|------|-------|
| `prisma/schema.prisma` | 新增 5 个模型 | 1-3 |
| `src/lib/scheduler/scheduler.ts` | 内置调度器 | 1 |
| `src/lib/scheduler/event-bus.ts` | 事件总线 | 1 |
| `src/lib/agent/decision-engine/decision-engine.ts` | 决策引擎 | 2 |
| `src/lib/agent/learning/learning-system.ts` | 学习系统 | 3 |
| `src/lib/agent/knowledge-accumulation/auto-filler.ts` | 知识积累 | 4 |
| `.loop-config.yaml` | Loop 配置 | 1 |
| `src/lib/agent/orchestrator.ts` | 现有编排器 | 扩展 |
| `src/lib/llm/index.ts` | LLM 调用 | 复用 |

---

## 十、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 无限循环 | 资源耗尽 | 设置 MAX_ITERATIONS、consecutive_failures_limit |
| 错误知识生成 | 虚假信息 | HITL 审批、质量分阈值 |
| LLM 调用失败 | 功能不可用 | callLLMWithFallback 降级 |
| 数据库锁竞争 | 性能下降 | 乐观锁、队列化 |

---

## 十一、下一步行动

1. **立即开始 Phase 1**：安装依赖、修改 Prisma schema、实现调度器
2. **每周复盘**：检查 loop-memory.md 的运行历史
3. **Eval 验证**：每个 Phase 完成后运行四层验证
4. **模式积累**：从运行结果中提取可复用的 SOP

---

**文档版本:** 1.0
**最后更新:** 2026-06-14
**维护人:** Evercog MVP 开发团队
