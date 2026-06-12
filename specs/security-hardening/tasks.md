# 任务列表: 安全加固与生产化

## 任务概览

| 任务 | 优先级 | 工时 | 状态 |
|------|--------|------|------|
| TASK-001: Rate Limiting 中间件 | P0 | 2h | 待开始 |
| TASK-002: CORS 配置 | P0 | 1h | 待开始 |
| TASK-003: LLM 超时处理 | P0 | 2h | 待开始 |
| TASK-004: 密码登录 - 数据模型 | P0 | 1h | 待开始 |
| TASK-005: 密码登录 - API 实现 | P0 | 2h | 待开始 |
| TASK-006: 密码登录 - 前端集成 | P0 | 1h | 待开始 |
| TASK-007: 集成测试 | P1 | 2h | 待开始 |

---

## TASK-001: Rate Limiting 中间件

### 垂直切片描述
实现 API 请求速率限制中间件，防止恶意攻击和资源滥用。

### 验收标准
- [ ] 匿名用户超过 60 次/分钟返回 429
- [ ] 认证用户超过 120 次/分钟返回 429
- [ ] 响应头包含 Retry-After
- [ ] 登录接口限制 10 次/分钟

### 技术实现
1. 创建 `src/lib/rate-limit.ts`
2. 实现滑动窗口算法
3. 创建 Next.js 中间件集成

### 依赖
- 无

---

## TASK-002: CORS 配置

### 垂直切片描述
配置 CORS 策略，允许前端应用正常调用 API。

### 验收标准
- [ ] 支持环境变量配置允许的源
- [ ] 支持 Cookie 凭证
- [ ] 允许常用 HTTP 方法
- [ ] 预检请求正确响应

### 技术实现
1. 更新 `src/middleware.ts`
2. 添加 CORS 头配置
3. 更新 `.env.example`

### 依赖
- 无

---

## TASK-003: LLM 超时处理

### 垂直切片描述
为 LLM API 调用添加超时控制和降级机制。

### 验收标准
- [ ] 超过 30 秒返回超时错误
- [ ] 支持降级到 Mock 模式
- [ ] 超时事件记录到日志

### 技术实现
1. 更新 `src/lib/llm-provider.ts`
2. 添加 AbortController 超时控制
3. 添加降级逻辑

### 依赖
- 无

---

## TASK-004: 密码登录 - 数据模型

### 垂直切片描述
扩展用户模型，添加密码哈希字段。

### 验收标准
- [ ] User 模型添加 passwordHash 字段
- [ ] 创建数据库迁移
- [ ] 更新 seed 数据

### 技术实现
1. 更新 `prisma/schema.prisma`
2. 创建迁移文件
3. 更新 `prisma/seed.ts`

### 依赖
- 无

---

## TASK-005: 密码登录 - API 实现

### 垂直切片描述
实现密码登录 API，支持 userId + password 认证。

### 验收标准
- [ ] 密码正确能登录成功
- [ ] 密码错误返回 401
- [ ] 连续 5 次失败锁定 15 分钟
- [ ] 密码使用 bcrypt 哈希存储

### 技术实现
1. 创建 `src/lib/password.ts`
2. 更新 `src/app/api/auth/login/route.ts`
3. 添加登录失败锁定逻辑

### 依赖
- TASK-004

---

## TASK-006: 密码登录 - 前端集成

### 垂直切片描述
更新登录页面，支持密码输入。

### 验收标准
- [ ] 登录页面显示密码输入框
- [ ] 支持 userId + password 登录
- [ ] 保留用户选择功能（MVP 演示模式）

### 技术实现
1. 更新 `src/app/login/page.tsx`
2. 更新 `src/lib/auth-client.ts`

### 依赖
- TASK-005

---

## TASK-007: 集成测试

### 垂直切片描述
为核心安全功能编写集成测试。

### 验收标准
- [ ] Rate Limiting 测试用例
- [ ] CORS 测试用例
- [ ] LLM 超时测试用例
- [ ] 密码登录测试用例

### 技术实现
1. 创建 `src/__tests__/api/rate-limit.test.ts`
2. 创建 `src/__tests__/api/cors.test.ts`
3. 创建 `src/__tests__/api/auth-password.test.ts`

### 依赖
- TASK-001, TASK-002, TASK-003, TASK-005

---

## 执行顺序

```
Week 1, Day 1:
├── TASK-001: Rate Limiting (2h)
├── TASK-002: CORS 配置 (1h)
└── TASK-003: LLM 超时处理 (2h)

Week 1, Day 2:
├── TASK-004: 密码登录 - 数据模型 (1h)
├── TASK-005: 密码登录 - API 实现 (2h)
└── TASK-006: 密码登录 - 前端集成 (1h)

Week 1, Day 3:
└── TASK-007: 集成测试 (2h)
```
