# 恒识 Evercog MVP

AI 政策情报与业务经验中台 — 面向中小微企业服务公司的知识治理与智能问答平台。

## 📖 文档

详细使用说明请查看：[docs/使用说明.md](docs/使用说明.md)

## 技术栈

- **前端**：Next.js 16 + React 19 + Tailwind CSS 4
- **后端**：Next.js API Routes
- **数据库**：Prisma ORM + SQLite（可切换 PostgreSQL）
- **AI 层**：LLM Provider 抽象（mock / deepseek / openai 可切换）
- **校验**：Zod schema validation
- **测试**：Vitest
- **认证**：JWT + HttpOnly Cookie

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npm run db:push

# 填充演示数据
npm run db:seed

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 测试账号

运行 `npm run db:seed` 后，可使用以下测试账号登录（无需密码）：

| 角色 | 用户名 | 说明 |
|------|--------|------|
| 管理员 | 周管理员 | 拥有所有权限 |
| 导师 | 陈导师 | 可审核知识卡和 SOP |
| 财务 | 赵财务 | 可审核知识卡 |
| 销售 | 张销售 | 普通用户 |

> **注意**：用户 ID 为数据库自动生成的 UUID，登录时需使用实际 ID。可通过浏览器开发者工具或 API 查询获取。

## 核心功能

| 模块 | 说明 |
|------|------|
| 政策链接池 | 提交政策链接，AI 自动生成结构化简报 |
| 政策简报 | 审核、编辑、推送政策简报 |
| 知识库 | 财务代账知识卡的创建、审核、检索 |
| 经验调用 | 销售/客服输入问题，AI 检索知识库生成回复建议 |
| SOP 训练 | 导师布置任务，新人提交，AI 检查，导师审核 |
| 审计日志 | 关键操作全链路追溯 |
| 权限管理 | 基于角色和部门的知识可见范围控制 |

## 开发命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm test             # 运行测试
npm run db:seed      # 填充测试数据
npm run db:reset     # 重置数据库
```

## 项目结构

```
evercog-mvp/
├── prisma/           # 数据库配置
├── src/
│   ├── app/          # Next.js 页面和 API
│   ├── components/   # React 组件
│   ├── lib/          # 工具库和服务
│   ├── hooks/        # React Hooks
│   └── types/        # TypeScript 类型
├── docs/             # 项目文档
└── package.json
```

## 许可证

MIT License
