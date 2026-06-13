# 测试 Agent 工作流

> 基于 AutoDev Framework 的自动化测试解决方案

---

## 📋 概述

测试 Agent 是一个自动化测试工具，用于模拟真实用户使用项目，并生成结构化测试报告。

---

## 🎯 目标

1. 模拟真实用户操作：访问页面、点击按钮、填写表单、切换模块
2. 自动记录问题：控制台错误、网络异常、点击无响应、跳转失败
3. 生成测试报告：结构化报告，包含通过项、失败项、修复建议
4. 支持自我优化：测试 → 修复 → 复测的闭环

---

## 🛠️ 技术方案

### 技术栈

- **浏览器自动化**：Playwright
- **测试框架**：Vitest
- **报告生成**：Markdown
- **截图工具**：Playwright 内置

### 目录结构

```
test-agent/
├── README.md                    # 说明文档
├── package.json                 # 依赖配置
├── playwright.config.ts         # Playwright 配置
├── tests/                       # 测试脚本
│   ├── auth.spec.ts            # 登录/登出测试
│   ├── navigation.spec.ts      # 导航菜单测试
│   ├── dashboard.spec.ts       # 工作台测试
│   ├── policy.spec.ts          # 政策情报测试
│   ├── knowledge.spec.ts       # 知识中台测试
│   ├── experience.spec.ts      # 经验问答测试
│   ├── mentor-review.spec.ts   # 导师审核测试
│   ├── sop.spec.ts             # SOP 训练测试
│   └── settings.spec.ts        # 系统设置测试
├── utils/                       # 工具函数
│   ├── test-helpers.ts         # 测试辅助函数
│   └── report-generator.ts     # 报告生成器
├── reports/                     # 测试报告
│   └── YYYY-MM-DD/            # 按日期组织
├── screenshots/                 # 截图
│   └── YYYY-MM-DD/            # 按日期组织
└── logs/                        # 日志
    └── YYYY-MM-DD/            # 按日期组织
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd test-agent
npm install
npx playwright install
```

### 2. 确保项目运行

```bash
cd ..
npm run dev
```

### 3. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- tests/auth.spec.ts

# 带 UI 运行
npm test -- --ui
```

### 4. 查看报告

测试完成后，在 `reports/` 目录下查看 Markdown 格式的测试报告。

---

## 📊 测试范围

### 核心功能测试

| 模块 | 测试项 |
|------|--------|
| 登录认证 | 登录、登出、权限控制 |
| 工作台 | 页面加载、数据展示、快捷入口 |
| 导航菜单 | 菜单跳转、高亮状态 |
| 政策情报 | 政策列表、详情、创建 |
| 知识中台 | 知识卡列表、详情、创建、审核 |
| 经验问答 | 问题输入、AI 回复、历史记录 |
| 导师审核 | 审核队列、审核操作 |
| SOP 训练 | 任务列表、提交、审核 |
| 系统设置 | 用户管理、权限配置 |

### 交互测试

- 按钮点击响应
- 表单提交验证
- 搜索筛选功能
- 分页导航
- 弹窗交互
- 错误状态处理

---

## 📝 测试报告格式

```markdown
# 测试报告

## 基本信息
- 测试时间：YYYY-MM-DD HH:MM:SS
- 测试环境：http://localhost:3000
- 测试结果：通过 XX / 失败 XX

## 测试结果

### ✅ 通过项
- [x] 登录功能正常
- [x] 工作台数据加载正常
...

### ❌ 失败项
- [ ] 知识卡创建失败
  - 复现步骤：...
  - 错误信息：...
  - 影响等级：高/中/低
  - 修复建议：...

## 截图
- [登录页面](screenshots/login.png)
...

## 总结
...
```

---

## 🔄 自我优化闭环

1. **运行测试** → 生成测试报告
2. **分析报告** → 识别问题
3. **修复问题** → 修改代码
4. **重新测试** → 验证修复
5. **对比报告** → 确认问题关闭

---

*基于 AutoDev Framework 设计*
