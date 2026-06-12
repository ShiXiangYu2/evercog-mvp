# PRD: Service Layer 扩展 — 核心实体迁移

## 1. Problem Statement

Phase 2 引入了深度服务模块（FeedbackService, PopularityService, PushService），但核心实体（KnowledgeCard, PolicyLink, PolicyBrief）的 CRUD 路由仍包含内联业务逻辑。这种不一致性导致：

- 测试困难：核心业务逻辑需要完整 HTTP mock
- 代码重复：权限检查、审计日志在多个路由中重复
- 模式混乱：新开发者不确定遵循哪种模式

## 2. Solution

将核心实体的业务逻辑迁移到 Service 层，遵循 Phase 2 已验证的服务模式：

- Service 层包含业务逻辑、权限检查、审计日志
- 路由层变为薄适配器，仅处理 HTTP 解析和响应
- 权限检查通过统一的 PermissionGuard 模块

## 3. User Stories

1. 作为开发者，我希望 KnowledgeCard 的 CRUD 操作通过 Service 层，以便我可以单元测试业务逻辑
2. 作为开发者，我希望状态流转（draft → pending_review → published）封装在 Service 中，以便我可以独立测试状态机
3. 作为开发者，我希望 PolicyLink 的创建和更新通过 Service 层，以便我可以统一处理验证和审计
4. 作为开发者，我希望 PolicyBrief 的审核通过后可选触发推送，以便我可以灵活控制推送时机
5. 作为开发者，我希望所有 Service 使用统一的错误处理模式，以便我可以一致地处理错误
6. 作为开发者，我希望权限检查通过 PermissionGuard 模块，以便我可以添加新实体时复用权限逻辑
7. 作为开发者，我希望 Service 测试使用 SQLite in-memory 数据库，以便我可以快速运行测试
8. 作为用户，我希望重构后 API 响应格式保持不变，以便前端不需要修改
9. 作为管理员，我希望状态流转使用乐观锁，以便我可以并发编辑而不丢失更新
10. 作为运维人员，我希望推送失败不回滚状态，以便我可以重试而不影响业务流程

## 4. Implementation Decisions

### 4.1 模块结构

```
src/lib/
├── services/
│   ├── knowledge-card.ts    # 新增
│   ├── policy-link.ts       # 新增
│   ├── policy-brief.ts      # 新增
│   └── index.ts             # 统一导出
├── permission-guard.ts      # 新增
└── service-error.ts         # 新增
```

### 4.2 ServiceError 类

```typescript
export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

// 错误码
export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  OPTIMISTIC_LOCK: 'OPTIMISTIC_LOCK',
} as const
```

### 4.3 PermissionGuard 模块

```typescript
export interface PermissionContext {
  user: AuthUser
  entityType: string
  entityId?: string
}

export function canAccess(ctx: PermissionContext, action: 'read' | 'write' | 'delete' | 'review'): boolean
export function canViewDepartment(ctx: PermissionContext, departmentId: string): boolean
export function canReview(ctx: PermissionContext, entityType: string): boolean
```

### 4.4 KnowledgeCardService 接口

```typescript
export class KnowledgeCardService {
  async list(filters: ListFilters, user: AuthUser): Promise<PaginatedResult<KnowledgeCard>>
  async getById(id: string, user: AuthUser): Promise<KnowledgeCard>
  async create(data: CreateKnowledgeCardInput, user: AuthUser): Promise<KnowledgeCard>
  async update(id: string, data: UpdateKnowledgeCardInput, user: AuthUser): Promise<KnowledgeCard>
  async delete(id: string, user: AuthUser): Promise<void>
  async submitForReview(id: string, user: AuthUser): Promise<KnowledgeCard>
  async approve(id: string, user: AuthUser, comment?: string): Promise<KnowledgeCard>
  async reject(id: string, user: AuthUser, comment: string): Promise<KnowledgeCard>
}
```

### 4.5 状态流转规则

```
draft → pending_review (submitForReview)
pending_review → published (approve)
pending_review → rejected (reject)
rejected → draft (重新编辑)
published → archived (archive)
```

### 4.6 乐观锁

更新时检查 `version` 字段：
```typescript
const existing = await prisma.knowledgeCard.findUnique({ where: { id } })
if (existing.version !== expectedVersion) {
  throw new ServiceError(ErrorCodes.OPTIMISTIC_LOCK, 'Card was modified by another user')
}
```

### 4.7 错误处理

路由层统一处理：
```typescript
function handleServiceError(error: unknown): NextResponse {
  if (error instanceof ServiceError) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      FORBIDDEN: 403,
      VALIDATION_ERROR: 400,
      CONFLICT: 409,
      OPTIMISTIC_LOCK: 409,
    }
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: statusMap[error.code] || 500 }
    )
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

## 5. Testing Decisions

### 5.1 测试策略

- **单元测试**: Service 层使用 SQLite in-memory 数据库
- **集成测试**: 覆盖完整状态流转
- **不 Mock Prisma**: 使用真实数据库测试

### 5.2 测试工具

```typescript
// src/lib/test-utils.ts
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

export async function createTestDb(): Promise<PrismaClient> {
  // 使用 SQLite in-memory
  const client = new PrismaClient({
    datasources: { db: { url: 'file::memory:' } }
  })
  await client.$executeRawUnsafe('CREATE TABLE ...')
  return client
}
```

### 5.3 覆盖率目标

- Service 层: 80%
- PermissionGuard: 90%
- 路由层: 60%（主要测试错误处理）

### 5.4 测试用例

每个 Service 至少包含：
- 成功创建/读取/更新/删除
- 权限拒绝场景
- 不存在场景
- 状态流转测试
- 乐观锁冲突测试

## 6. Out of Scope

- API 版本控制（/api/v2/...）
- 全局错误处理中间件
- 权限配置持久化（V1 保持硬编码）
- PolicyLink 自动触发简报生成
- 推送失败回滚机制

## 7. Further Notes

- 遵循 Phase 2 已验证的服务模式
- 保持 API 响应格式不变，前端无需修改
- 先迁移 KnowledgeCard 作为试点，验证模式后再迁移其他
- 所有新代码必须有对应的测试
