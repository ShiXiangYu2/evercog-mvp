/**
 * Agent 系统配置
 *
 * 集中管理所有配置常量
 */

// ==================== 学习系统配置 ====================

/** 反馈分析：最小频率阈值 */
export const FEEDBACK_MIN_FREQUENCY = 3

/** 反馈分析：分析时间范围（天） */
export const FEEDBACK_ANALYSIS_DAYS = 7

/** 模式存储：最小置信度 */
export const PATTERN_MIN_CONFIDENCE = 0.3

/** 模式老化：最大存活天数 */
export const PATTERN_MAX_AGE_DAYS = 30

/** 模式老化：置信度衰减量 */
export const PATTERN_CONFIDENCE_DECAY = 0.1

// ==================== 质量追踪配置 ====================

/** 质量指标：覆盖率目标 */
export const QUALITY_COVERAGE_TARGET = 80

/** 质量指标：引用率目标 */
export const QUALITY_CITATION_TARGET = 50

/** 质量指标：满意度目标 */
export const QUALITY_SATISFACTION_TARGET = 4

/** 质量指标：任务完成率目标 */
export const QUALITY_TASK_COMPLETION_TARGET = 90

// ==================== 决策引擎配置 ====================

/** 决策：置信度增量 */
export const DECISION_CONFIDENCE_INCREMENT = 0.05

/** 决策：工作时间开始小时 */
export const WORK_HOURS_START = 9

/** 决策：工作时间结束小时 */
export const WORK_HOURS_END = 18

// ==================== 知识积累配置 ====================

/** 知识积累：高质量阈值 */
export const KNOWLEDGE_HIGH_QUALITY_THRESHOLD = 0.8

/** 知识积累：中等质量阈值 */
export const KNOWLEDGE_MEDIUM_QUALITY_THRESHOLD = 0.6

/** 知识积累：过期卡片最大天数 */
export const OUTDATED_CARD_MAX_DAYS = 90

/** 知识积累：长期未更新天数 */
export const LONG_TIME_NO_UPDATE_DAYS = 180

/** 知识积累：高使用率阈值 */
export const HIGH_USAGE_THRESHOLD = 10

// ==================== 调度器配置 ====================

/** 调度器：最大连续失败次数 */
export const MAX_CONSECUTIVE_FAILURES = 3

/** 调度器：单次 Loop 最大处理数量 */
export const MAX_ITEMS_PER_LOOP = 50

/** 调度器：Loop 超时时间（分钟） */
export const LOOP_TIMEOUT_MINUTES = 60
