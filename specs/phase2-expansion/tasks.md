# 任务列表: Phase 2 功能扩展

## 任务概览

| 任务 | 优先级 | 工时 | 状态 |
|------|--------|------|------|
| TASK-008: 用户反馈 - 数据模型 | P0 | 2h | 待开始 |
| TASK-009: 用户反馈 - API 实现 | P0 | 3h | 待开始 |
| TASK-010: 用户反馈 - 前端集成 | P0 | 3h | 待开始 |
| TASK-011: 数据导出 - PDF 导出 | P0 | 3h | 待开始 |
| TASK-012: 数据导出 - Excel 导出 | P1 | 2h | 待开始 |
| TASK-013: 数据导出 - CSV 导出 | P1 | 1h | 待开始 |
| TASK-014: 热度分析 - 统计服务 | P1 | 3h | 待开始 |
| TASK-015: 热度分析 - API 实现 | P1 | 1h | 待开始 |
| TASK-016: 热度分析 - Dashboard 集成 | P1 | 2h | 待开始 |
| TASK-017: 企微推送 - API 客户端 | P1 | 4h | 待开始 |
| TASK-018: 企微推送 - 推送服务集成 | P1 | 2h | 待开始 |
| TASK-019: 企微推送 - 前端配置 | P2 | 2h | 待开始 |
| TASK-020: 集成测试 | P1 | 4h | 待开始 |

---

## TASK-008: 用户反馈 - 数据模型

### 垂直切片描述
扩展数据模型，支持用户对知识卡和问答结果的反馈。

### 验收标准
- [ ] 新增 Feedback 模型
- [ ] 支持知识卡评分
- [ ] 支持问答结果反馈
- [ ] 创建数据库迁移

### 技术实现
1. 更新 `prisma/schema.prisma`
2. 创建迁移文件

### 依赖
- 无

---

## TASK-009: 用户反馈 - API 实现

### 垂直切片描述
实现用户反馈的 CRUD API。

### 验收标准
- [ ] POST /api/feedback - 创建反馈
- [ ] GET /api/feedback/knowledge-cards/:id - 获取知识卡反馈
- [ ] GET /api/feedback/stats - 获取反馈统计

### 技术实现
1. 创建 `src/app/api/feedback/route.ts`
2. 创建 `src/app/api/feedback/stats/route.ts`
3. 创建 `src/lib/feedback-service.ts`

### 依赖
- TASK-008

---

## TASK-010: 用户反馈 - 前端集成

### 垂直切片描述
在前端添加反馈组件。

### 验收标准
- [ ] 知识卡详情页显示评分组件
- [ ] 问答结果页显示反馈按钮
- [ ] 管理员页面显示反馈统计

### 技术实现
1. 创建 `src/components/StarRating.tsx`
2. 创建 `src/components/FeedbackButton.tsx`
3. 更新相关页面

### 依赖
- TASK-009

---

## TASK-011: 数据导出 - PDF 导出

### 垂直切片描述
实现政策简报导出为 PDF。

### 验收标准
- [ ] GET /api/export/policy-briefs/:id/pdf - 导出单个简报
- [ ] PDF 包含完整内容
- [ ] PDF 格式美观

### 技术实现
1. 安装 `pdf-lib`
2. 创建 `src/lib/export/pdf-generator.ts`
3. 创建 API 路由

### 依赖
- 无

---

## TASK-012: 数据导出 - Excel 导出

### 垂直切片描述
实现知识卡导出为 Excel。

### 验收标准
- [ ] GET /api/export/knowledge-cards/excel - 导出知识卡
- [ ] Excel 包含所有字段
- [ ] 支持筛选条件

### 技术实现
1. 安装 `exceljs`
2. 创建 `src/lib/export/excel-generator.ts`
3. 创建 API 路由

### 依赖
- 无

---

## TASK-013: 数据导出 - CSV 导出

### 垂直切片描述
实现审计日志导出为 CSV。

### 验收标准
- [ ] GET /api/export/audit-logs/csv - 导出审计日志
- [ ] CSV 格式正确
- [ ] 支持时间范围筛选

### 技术实现
1. 安装 `csv-writer`
2. 创建 `src/lib/export/csv-generator.ts`
3. 创建 API 路由

### 依赖
- 无

---

## TASK-014: 热度分析 - 统计服务

### 垂直切片描述
实现知识卡热度统计服务。

### 验收标准
- [ ] 统计知识卡访问量
- [ ] 统计知识卡引用量
- [ ] 计算热度分数

### 技术实现
1. 创建 `src/lib/analytics/popularity.ts`
2. 更新数据库模型添加统计字段

### 依赖
- 无

---

## TASK-015: 热度分析 - API 实现

### 垂直切片描述
实现热度分析 API。

### 验收标准
- [ ] GET /api/analytics/popularity - 获取热度排名
- [ ] GET /api/analytics/department-comparison - 获取部门对比

### 技术实现
1. 创建 `src/app/api/analytics/popularity/route.ts`
2. 创建 `src/app/api/analytics/department-comparison/route.ts`

### 依赖
- TASK-014

---

## TASK-016: 热度分析 - Dashboard 集成

### 垂直切片描述
将热度分析集成到 Dashboard。

### 验收标准
- [ ] Dashboard 显示热门知识卡
- [ ] Dashboard 显示部门使用对比

### 技术实现
1. 更新 `src/app/page.tsx`
2. 添加热度图表组件

### 依赖
- TASK-015

---

## TASK-017: 企微推送 - API 客户端

### 垂直切片描述
实现企微应用消息 API 客户端。

### 验收标准
- [ ] 支持发送文本消息
- [ ] 支持发送到个人
- [ ] 支持发送到群组

### 技术实现
1. 创建 `src/lib/wecom/client.ts`
2. 实现消息发送逻辑

### 依赖
- 无

---

## TASK-018: 企微推送 - 推送服务集成

### 垂直切片描述
将企微 API 集成到推送服务。

### 验收标准
- [ ] 推送服务支持企微渠道
- [ ] 支持降级到站内通知

### 技术实现
1. 更新 `src/lib/agent/push-service.ts`
2. 添加企微推送逻辑

### 依赖
- TASK-017

---

## TASK-019: 企微推送 - 前端配置

### 垂直切片描述
实现企微推送配置页面。

### 验收标准
- [ ] 管理员能配置企微 CorpID 和 Secret
- [ ] 管理员能测试推送

### 技术实现
1. 更新设置页面
2. 添加企微配置表单

### 依赖
- TASK-018

---

## TASK-020: 集成测试

### 垂直切片描述
为核心功能编写集成测试。

### 验收标准
- [ ] 用户反馈测试用例
- [ ] 数据导出测试用例
- [ ] 热度分析测试用例
- [ ] 企微推送测试用例

### 技术实现
1. 创建测试文件
2. 运行完整测试套件

### 依赖
- 所有任务

---

## 执行顺序

```
Week 1:
├── TASK-008: 用户反馈 - 数据模型 (2h)
├── TASK-009: 用户反馈 - API 实现 (3h)
├── TASK-010: 用户反馈 - 前端集成 (3h)
├── TASK-011: 数据导出 - PDF 导出 (3h)
├── TASK-012: 数据导出 - Excel 导出 (2h)
└── TASK-013: 数据导出 - CSV 导出 (1h)

Week 2:
├── TASK-014: 热度分析 - 统计服务 (3h)
├── TASK-015: 热度分析 - API 实现 (1h)
├── TASK-016: 热度分析 - Dashboard 集成 (2h)
├── TASK-017: 企微推送 - API 客户端 (4h)
├── TASK-018: 企微推送 - 推送服务集成 (2h)
├── TASK-019: 企微推送 - 前端配置 (2h)
└── TASK-020: 集成测试 (4h)
```
