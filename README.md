# 恒识 Evercog MVP

AI 政策情报与业务经验中台 — 面向中小微企业服务公司的知识治理与智能问答平台。

## 技术栈

- **前端**：Next.js 16 + React 19 + Tailwind CSS 4
- **后端**：Next.js API Routes
- **数据库**：Prisma ORM + SQLite（可切换 PostgreSQL）
- **AI 层**：LLM Provider 抽象（mock / openai 可切换）
- **校验**：Zod schema validation
- **测试**：Vitest

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma migrate dev

# 填充演示数据
npm run db:seed

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
evercog-mvp/
├── prisma/
│   ├── schema.prisma      # 数据模型定义
│   ├── seed.ts            # 演示数据种子
│   └── migrations/        # 数据库迁移
├── src/
│   ├── app/               # Next.js App Router 页面和 API
│   │   ├── api/           # REST API 路由
│   │   ├── policy-links/  # 政策链接池页面
│   │   ├── policy-briefs/ # 政策简报页面
│   │   ├── knowledge-cards/ # 知识库页面
│   │   ├── experience/    # 经验调用页面
│   │   ├── sop/           # SOP 训练页面
│   │   ├── push-records/  # 推送记录页面
│   │   ├── audit-logs/    # 审计日志页面
│   │   └── settings/      # 设置页面
│   ├── components/        # React 组件
│   ├── lib/               # 核心工具库
│   │   ├── auth.ts        # API 认证中间件
│   │   ├── auth-client.ts # 前端认证工具
│   │   ├── audit.ts       # 审计日志（唯一入口）
│   │   ├── permissions.ts # 权限控制
│   │   ├── validation.ts  # Zod 输入校验
│   │   ├── llm-provider.ts # LLM Provider 抽象层
│   │   └── prisma.ts      # Prisma 客户端
│   └── types/             # TypeScript 类型定义
├── .env                   # 环境变量
└── package.json
```

## 核心功能

| 模块 | 说明 |
|------|------|
| 政策链接池 | 提交政策链接，AI 自动生成结构化简报 |
| 政策简报 | 审核、编辑、推送政策简报 |
| 模拟企微推送 | 模拟企业微信推送记录 |
| 知识库 | 财务代账知识卡的创建、审核、检索 |
| 经验调用 | 销售/客服输入问题，AI 检索知识库生成回复建议 |
| SOP 训练 | 导师布置任务，新人提交，AI 检查，导师审核 |
| 审计日志 | 关键操作全链路追溯 |
| 权限管理 | 基于角色和部门的知识可见范围控制 |

## API 认证

MVP 阶段前端通过 `/login` 选择演示用户，后端使用 HttpOnly JWT Cookie 认证。

开发环境仍兼容 `X-User-Id` header，但必须传入数据库中的真实用户 ID。不要使用旧的数字 ID 示例；可先通过页面登录，或查询 `/api/users` 获取当前种子数据中的用户 ID。

```bash
# 开发环境示例：将 <USER_ID> 替换为真实用户 ID
curl -X POST http://localhost:3000/api/knowledge-cards \
  -H "Content-Type: application/json" \
  -H "X-User-Id: <USER_ID>" \
  -d '{"title":"测试","category":"faq","content":"内容"}'
```

## LLM 切换

通过环境变量 `LLM_PROVIDER` 切换 AI 提供者：

```bash
# 使用 mock（默认，适合演示）
LLM_PROVIDER=mock

# 使用 OpenAI（需配置 OPENAI_API_KEY）
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
```

## 测试

```bash
# 运行所有测试
npx vitest run

# 监听模式
npx vitest
```

## 数据库操作

```bash
# 重置数据库并填充演示数据
npm run db:seed

# 重置数据库（清除所有数据）
npm run db:reset
```

## 演示数据

种子数据包含：
- 6 个部门、10 个用户（覆盖销售/客服/运营/财务/导师/新人/管理员/AI 工程师）
- 8 条政策链接（覆盖餐饮/门店/个体工商户/广告公司/零售行业）
- 6 份政策简报
- 5 条模拟推送记录
- 8 张知识卡（资料清单/风险提醒/服务边界/税种说明/FAQ/经验分享）
- 4 条经验调用记录
- 3 个 SOP 训练任务
- 12 条审计日志
