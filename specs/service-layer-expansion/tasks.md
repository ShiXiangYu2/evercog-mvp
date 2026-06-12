# 任务列表: Service Layer 扩展 — 核心实体迁移

## 任务概览

| 任务 | 优先级 | 工时 | 类型 | 状态 |
|------|--------|------|------|------|
| TASK-021: 基础设施 - ServiceError + PermissionGuard | P0 | 3h | AFK | 待开始 |
| TASK-022: KnowledgeCardService - 读取操作 | P0 | 3h | AFK | 待开始 |
| TASK-023: KnowledgeCardService - 创建/更新/删除 | P0 | 3h | AFK | 待开始 |
| TASK-024: KnowledgeCardService - 状态流转 | P0 | 3h | AFK | 待开始 |
| TASK-025: KnowledgeCard 路由迁移 | P0 | 2h | AFK | 待开始 |
| TASK-026: PolicyLinkService | P1 | 3h | AFK | 待开始 |
| TASK-027: PolicyLink 路由迁移 | P1 | 2h | AFK | 待开始 |
| TASK-028: PolicyBriefService | P1 | 3h | AFK | 待开始 |
| TASK-029: PolicyBrief 路由迁移 + 推送集成 | P1 | 3h | AFK | 待开始 |
| TASK-030: 集成测试 | P1 | 4h | AFK | 待开始 |

---

## TASK-021: 基础设施 - ServiceError + PermissionGuard

### 垂直切片描述
创建 Service 层的基础设施：统一错误处理和权限检查模块。

### 验收标准
- [ ] 创建 `src/lib/service-error.ts`，包含 ServiceError 类和 ErrorCodes
- [ ] 创建 `src/lib/permission-guard.ts`，包含 canAccess, canViewDepartment, canReview 函数
- [ ] ServiceError 能正确转换为 HTTP 状态码
- [ ] PermissionGuard 能正确检查角色和部门权限
- [ ] 编写单元测试覆盖所有错误码和权限场景

### 技术实现
1. 创建 `src/lib/service-error.ts`
2. 创建 `src/lib/permission-guard.ts`
3. 创建 `src/lib/__tests__/service-error.test.ts`
4. 创建 `src/lib/__tests__/permission-guard.test.ts`

### 依赖
- 无

---

## TASK-022: KnowledgeCardService - 读取操作

### 垂直切片描述
实现 KnowledgeCard 的读取操作：列表查询、详情获取、权限过滤。

### 验收标准
- [ ] `list()` 支持搜索、分类、状态、客户类型过滤
- [ ] `list()` 按用户权限过滤知识卡
- [ ] `list()` 支持分页
- [ ] `getById()` 检查查看权限
- [ ] 未发布的卡片只有创建者和审核者可见
- [ ] 编写单元测试

### 技术实现
1. 创建 `src/lib/services/knowledge-card.ts`
2. 实现 `list()` 和 `getById()` 方法
3. 集成 PermissionGuard 进行权限检查
4. 创建 `src/lib/services/__tests__/knowledge-card.test.ts`

### 依赖
- TASK-021

---

## TASK-023: KnowledgeCardService - 创建/更新/删除

### 垂直切片描述
实现 KnowledgeCard 的写入操作：创建、更新、删除。

### 验收标准
- [ ] `create()` 创建草稿状态的知识卡
- [ ] `create()` 记录审计日志
- [ ] `update()` 仅允许创建者或管理员
- [ ] `update()` 支持乐观锁（检查 version）
- [ ] `delete()` 仅允许管理员
- [ ] `delete()` 记录审计日志
- [ ] 编写单元测试

### 技术实现
1. 在 `src/lib/services/knowledge-card.ts` 中添加 `create()`, `update()`, `delete()` 方法
2. 集成审计日志
3. 实现乐观锁检查
4. 添加测试用例

### 依赖
- TASK-022

---

## TASK-024: KnowledgeCardService - 状态流转

### 垂直切片描述
实现 KnowledgeCard 的状态机：submitForReview, approve, reject, archive。

### 验收标准
- [ ] `submitForReview()` 仅允许 draft 状态
- [ ] `approve()` 仅允许有审核权限的角色
- [ ] `approve()` 自动增加 version
- [ ] `reject()` 需要提供原因
- [ ] 状态流转记录审计日志
- [ ] 编写单元测试覆盖所有状态转换

### 技术实现
1. 在 `src/lib/services/knowledge-card.ts` 中添加状态流转方法
2. 实现状态机验证
3. 添加测试用例覆盖：
   - draft → pending_review
   - pending_review → published
   - pending_review → rejected
   - rejected → draft
   - published → archived
   - 非法状态转换

### 依赖
- TASK-023

---

## TASK-025: KnowledgeCard 路由迁移

### 垂直切片描述
将 KnowledgeCard 的 API 路由迁移到使用 Service 层。

### 验收标准
- [ ] GET /api/knowledge-cards 使用 KnowledgeCardService.list()
- [ ] GET /api/knowledge-cards/:id 使用 KnowledgeCardService.getById()
- [ ] POST /api/knowledge-cards 使用 KnowledgeCardService.create()
- [ ] PUT /api/knowledge-cards/:id 使用 KnowledgeCardService.update()
- [ ] DELETE /api/knowledge-cards/:id 使用 KnowledgeCardService.delete()
- [ ] POST /api/knowledge-cards/:id/status 使用状态流转方法
- [ ] API 响应格式保持不变
- [ ] 错误响应使用统一格式
- [ ] 编写集成测试

### 技术实现
1. 修改 `src/app/api/knowledge-cards/route.ts`
2. 修改 `src/app/api/knowledge-cards/[id]/route.ts`
3. 修改 `src/app/api/knowledge-cards/[id]/status/route.ts`
4. 添加 `handleServiceError()` 函数
5. 创建集成测试

### 依赖
- TASK-024

---

## TASK-026: PolicyLinkService

### 垂直切片描述
实现 PolicyLink 的 Service 层：CRUD 操作。

### 验收标准
- [ ] `list()` 支持状态、来源、客户类型过滤
- [ ] `getById()` 检查查看权限
- [ ] `create()` 创建提交状态的政策链接
- [ ] `update()` 仅允许提交者或管理员
- [ ] `delete()` 仅允许管理员
- [ ] 所有操作记录审计日志
- [ ] 编写单元测试

### 技术实现
1. 创建 `src/lib/services/policy-link.ts`
2. 实现 CRUD 方法
3. 集成权限检查和审计日志
4. 创建测试文件

### 依赖
- TASK-021

---

## TASK-027: PolicyLink 路由迁移

### 垂直切片描述
将 PolicyLink 的 API 路由迁移到使用 Service 层。

### 验收标准
- [ ] GET /api/policy-links 使用 PolicyLinkService.list()
- [ ] GET /api/policy-links/:id 使用 PolicyLinkService.getById()
- [ ] POST /api/policy-links 使用 PolicyLinkService.create()
- [ ] PUT /api/policy-links/:id 使用 PolicyLinkService.update()
- [ ] DELETE /api/policy-links/:id 使用 PolicyLinkService.delete()
- [ ] API 响应格式保持不变
- [ ] 编写集成测试

### 技术实现
1. 修改 `src/app/api/policy-links/route.ts`
2. 修改 `src/app/api/policy-links/[id]/route.ts`
3. 添加错误处理
4. 创建集成测试

### 依赖
- TASK-026

---

## TASK-028: PolicyBriefService

### 垂直切片描述
实现 PolicyBrief 的 Service 层：CRUD 操作和状态管理。

### 验收标准
- [ ] `list()` 支持审核状态过滤
- [ ] `getById()` 检查查看权限
- [ ] `create()` 关联政策链接
- [ ] `update()` 仅允许生成者或管理员
- [ ] `submitForReview()` 提交审核
- [ ] `approve()` 审核通过，可选触发推送
- [ ] `reject()` 审核驳回
- [ ] 所有操作记录审计日志
- [ ] 编写单元测试

### 技术实现
1. 创建 `src/lib/services/policy-brief.ts`
2. 实现 CRUD 和状态流转方法
3. 集成 PushService（可选）
4. 创建测试文件

### 依赖
- TASK-021

---

## TASK-029: PolicyBrief 路由迁移 + 推送集成

### 垂直切片描述
将 PolicyBrief 的 API 路由迁移到使用 Service 层，并集成推送服务。

### 验收标准
- [ ] GET /api/policy-briefs 使用 PolicyBriefService.list()
- [ ] GET /api/policy-briefs/:id 使用 PolicyBriefService.getById()
- [ ] POST /api/policy-briefs 使用 PolicyBriefService.create()
- [ ] PUT /api/policy-briefs/:id 使用 PolicyBriefService.update()
- [ ] POST /api/policy-briefs/:id/approve 支持可选推送
- [ ] POST /api/policy-briefs/:id/reject 使用 PolicyBriefService.reject()
- [ ] POST /api/policy-briefs/:id/push 使用 PushService
- [ ] API 响应格式保持不变
- [ ] 编写集成测试

### 技术实现
1. 修改 `src/app/api/policy-briefs/route.ts`
2. 修改 `src/app/api/policy-briefs/[id]/route.ts`
3. 修改 `src/app/api/policy-briefs/[id]/push/route.ts`
4. 集成 PushService
5. 创建集成测试

### 依赖
- TASK-028

---

## TASK-030: 集成测试

### 垂直切片描述
为核心功能编写端到端集成测试。

### 验收标准
- [ ] KnowledgeCard 完整状态流转测试
- [ ] PolicyLink 完整生命周期测试
- [ ] PolicyBrief 审核 + 推送测试
- [ ] 权限拒绝场景测试
- [ ] 乐观锁冲突测试
- [ ] 所有测试通过

### 技术实现
1. 创建 `src/__tests__/integration/knowledge-card-flow.test.ts`
2. 创建 `src/__tests__/integration/policy-link-flow.test.ts`
3. 创建 `src/__tests__/integration/policy-brief-flow.test.ts`
4. 运行完整测试套件

### 依赖
- TASK-025, TASK-027, TASK-029

---

## 执行顺序

```
Phase 3A: 基础设施 + KnowledgeCard (8h)
├── TASK-021: 基础设施 - ServiceError + PermissionGuard (3h)
├── TASK-022: KnowledgeCardService - 读取操作 (3h)
├── TASK-023: KnowledgeCardService - 创建/更新/删除 (3h)
├── TASK-024: KnowledgeCardService - 状态流转 (3h)
└── TASK-025: KnowledgeCard 路由迁移 (2h)

Phase 3B: PolicyLink + PolicyBrief (10h)
├── TASK-026: PolicyLinkService (3h)
├── TASK-027: PolicyLink 路由迁移 (2h)
├── TASK-028: PolicyBriefService (3h)
└── TASK-029: PolicyBrief 路由迁移 + 推送集成 (3h)

Phase 3C: 集成测试 (4h)
└── TASK-030: 集成测试 (4h)
```

---

## 垂直切片验证

每个任务都是一个完整的垂直切片：
- **TASK-021**: 基础设施 → 可独立测试
- **TASK-022-024**: Service 层 → 可独立测试（使用内存数据库）
- **TASK-025**: 路由迁移 → 可独立测试（端到端）
- **TASK-026-029**: 其他实体 → 遵循相同模式
- **TASK-030**: 集成测试 → 验证完整流程
