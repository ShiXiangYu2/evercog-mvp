# Evercog MVP Loop Engineering 使用指南

> 本文档说明如何使用 Loop Engineering 方法论来完善 Evercog MVP 的可信经验闭环

---

## 快速开始

### 1. 环境准备

```bash
# 进入项目目录
cd evercog-mvp

# 安装依赖
npm install

# 初始化数据库
npm run db:push

# 填充演示数据
npm run db:seed
```

### 2. Loop 配置

项目已预配置 Loop 文件：

- `.loop-config.yaml` - Loop 主配置
- `loop-memory.md` - 人类可读记忆
- `loop-state.json` - 机器可读状态

### 3. 本地测试

```bash
# 运行 Loop Runtime（dry-run 模式）
python .agent/skills/loop-engineering/scripts/run-loop.py \
  --config .loop-config.yaml \
  --state loop-state.json \
  --dry-run

# 查看 Loop 状态
cat loop-state.json | jq '.loops'
```

### 4. 启用 GitHub Actions

Loop 触发器已配置在 `.github/workflows/loop-trigger.yml`：

- **知识卡质量巡检:** 每天 8:00 (UTC)
- **经验问答反馈:** 每周一 9:00 (UTC)
- **SOP 完成度监控:** 每天 18:00 (UTC)

推送到 GitHub 后会自动生效。

---

## Loop 模式详解

### Loop 1: 知识卡质量巡检

**目标:** 每日自动检查知识卡质量，确保内容可信。

**触发时间:** 每天 8:00 (UTC)

**执行流程:**

```text
1. 扫描 pending_review 状态的知识卡
   ↓
2. 调用知识卡审核 Agent
   ↓
3. 检查质量维度:
   - 内容完整性
   - 风险提示
   - 来源标注
   - 内容准确性
   ↓
4. 生成质量报告
   ↓
5. 更新 loop-memory.md
```

**质量阈值:**

| 质量分 | 处理方式 |
|--------|----------|
| >= 0.8 | 自动通过 |
| 0.6 - 0.8 | 人工复核 |
| < 0.6 | 自动驳回 |

**手动触发:**

```bash
# 通过 GitHub Actions 手动触发
gh workflow run loop-trigger.yml -f loop_name=knowledge-card-patrol
```

### Loop 2: 经验问答反馈

**目标:** 收集经验问答使用反馈，持续优化知识库。

**触发时间:** 每周一 9:00 (UTC)

**执行流程:**

```text
1. 扫描本周所有经验问答记录
   ↓
2. 分析高频问题和未覆盖领域
   ↓
3. 识别知识库缺口
   ↓
4. 生成知识库优化建议
   ↓
5. 创建知识卡补充任务
```

**分析维度:**

- **高频问题:** 本周被问次数最多的问题
- **未覆盖问题:** 知识库中没有相关知识的问题
- **满意度:** 用户对回复的评价

**手动触发:**

```bash
gh workflow run loop-trigger.yml -f loop_name=experience-feedback-loop
```

### Loop 3: SOP 完成度监控

**目标:** 监控 SOP 训练完成情况，确保知识传递有效。

**触发时间:** 每天 18:00 (UTC)

**执行流程:**

```text
1. 扫描进行中的 SOP 任务
   ↓
2. 检查提交质量和完成度
   ↓
3. 生成导师审核建议
   ↓
4. 发送超时提醒
   ↓
5. 更新 SOP 完成率统计
```

**检查维度:**

- **完整性:** 是否完成所有步骤
- **可执行性:** 步骤是否可操作
- **风险点:** 是否识别潜在风险

**手动触发:**

```bash
gh workflow run loop-trigger.yml -f loop_name=sop-completion-monitor
```

---

## 监控与调试

### 查看 Loop 状态

```bash
# 查看所有 Loop 状态
cat loop-state.json | jq '.loops'

# 查看特定 Loop 状态
cat loop-state.json | jq '.loops["knowledge-card-patrol"]'

# 查看指标统计
cat loop-state.json | jq '.metrics'
```

### 查看审计日志

```bash
# 查看最近的审计事件
tail -n 20 loop-audit.log

# 按 Loop 过滤
grep "knowledge-card-patrol" loop-audit.log

# 按事件类型过滤
grep "loop_completed" loop-audit.log
```

### 查看 Loop Memory

```bash
# 查看循环记忆
cat loop-memory.md

# 查看决策历史
grep -A 10 "决策历史" loop-memory.md

# 查看模式库
grep -A 20 "模式库" loop-memory.md
```

### 手动运行 Loop

```bash
# 运行特定 Loop
python .agent/skills/loop-engineering/scripts/run-loop.py \
  --config .loop-config.yaml \
  --state loop-state.json \
  --audit-log loop-audit.log \
  --loop-name knowledge-card-patrol

# 运行所有 Loop
python .agent/skills/loop-engineering/scripts/run-loop.py \
  --config .loop-config.yaml \
  --state loop-state.json \
  --audit-log loop-audit.log
```

---

## 故障排除

### Loop 执行失败

**症状:** Loop 执行后状态为 `failed`

**排查步骤:**

1. 查看审计日志中的错误信息
   ```bash
   grep "error" loop-audit.log | tail -n 10
   ```

2. 检查 Loop State 中的错误计数
   ```bash
   cat loop-state.json | jq '.loops["<loop-name>"].consecutiveFailures'
   ```

3. 检查配置文件语法
   ```bash
   python -c "import yaml; yaml.safe_load(open('.loop-config.yaml'))"
   ```

### 知识卡审核不准确

**症状:** 知识卡审核结果与预期不符

**排查步骤:**

1. 检查质量阈值设置
   ```bash
   cat .loop-config.yaml | grep quality_threshold
   ```

2. 查看审核 Agent 的输出
   ```bash
   cat loop-state.json | jq '.loops["knowledge-card-patrol"]'
   ```

3. 调整检查维度权重

### GitHub Actions 未触发

**症状:** Loop 没有按预期时间执行

**排查步骤:**

1. 检查 workflow 文件语法
   ```bash
   cat .github/workflows/loop-trigger.yml | head -n 20
   ```

2. 查看 GitHub Actions 运行历史
   ```bash
   gh run list --workflow=loop-trigger.yml
   ```

3. 检查 cron 表达式是否正确

---

## 最佳实践

### 1. 定期复盘

- **每周:** 检查 loop-memory.md 中的运行历史
- **每月:** 分析 loop-state.json 中的指标趋势
- **每季度:** 审视整体 Loop 设计

### 2. 持续优化

- 根据运行数据调整质量阈值
- 根据用户反馈优化检查维度
- 根据业务需求增加新的 Loop 模式

### 3. 安全注意

- Loop 不会自动执行高风险操作（如删除、合并）
- 所有高风险操作需要人工确认
- 审计日志保留 90 天

### 4. 性能优化

- 合理设置 `max_items_per_loop` 避免单次处理过多
- 根据服务器性能调整 `timeout_minutes`
- 定期清理过期的审计日志

---

## 扩展开发

### 添加新的 Loop 模式

1. 在 `.loop-config.yaml` 中添加新的 Loop 配置
2. 实现对应的 Skill（参考 `.agent/skills/` 下的示例）
3. 注册 Executor（参考 `src/lib/agent/orchestrator.ts`）
4. 更新 `loop-memory.md` 和 `loop-state.json`

### 自定义质量检查维度

1. 在 `.loop-config.yaml` 中定义检查维度
2. 在 Skill 中实现对应的检查逻辑
3. 在 `loop-memory.md` 中记录检查结果

### 接入外部系统

1. 实现对应的 Connector（参考 MCP 规范）
2. 在 Loop Pipeline 中配置使用
3. 更新审计日志格式

---

## 相关资源

- [AutoDev Framework README](../../../auto-dev-framework/README.md)
- [Loop Engineering 方法论](../../../auto-dev-framework/docs/workflows/loop-engineering.md)
- [Skill I/O 契约](../../../auto-dev-framework/docs/contracts/skill-io.md)
- [Worktree 隔离规范](../../../auto-dev-framework/docs/contracts/worktree-isolation.md)

---

**文档版本:** 1.0
**最后更新:** 2026-06-13
**维护人:** Evercog MVP 开发团队
