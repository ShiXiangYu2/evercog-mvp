/**
 * EventBus 事件总线
 *
 * 进程内事件通信，用于模块间解耦
 * 基于 Node.js EventEmitter，单例模式
 */
import { EventEmitter } from 'events'
import logger from '../logger'

// ==================== 事件类型定义 ====================

export type AgentEventType =
  // 知识卡事件
  | 'knowledge_card:created'
  | 'knowledge_card:reviewed'
  | 'knowledge_card:published'
  | 'knowledge_card:rejected'
  // 反馈事件
  | 'feedback:created'
  | 'feedback:negative'
  // 缺口事件
  | 'gap:detected'
  | 'gap:resolved'
  // SOP 事件
  | 'sop:submitted'
  | 'sop:reviewed'
  // Agent 事件
  | 'agent:task_completed'
  | 'agent:task_failed'
  | 'agent:decision_made'
  // Loop 事件
  | 'loop:started'
  | 'loop:completed'
  | 'loop:failed'

export interface AgentEvent {
  type: AgentEventType
  payload: unknown
  timestamp: Date
}

export type EventHandler = (payload: unknown) => void | Promise<void>

// ==================== EventBus 类 ====================

class EventBus {
  private emitter: EventEmitter
  private eventHistory: AgentEvent[]
  private readonly maxHistorySize = 100

  constructor() {
    this.emitter = new EventEmitter()
    this.eventHistory = []
    // 增加监听器上限，避免警告
    this.emitter.setMaxListeners(50)
  }

  /**
   * 发射事件
   */
  emit(type: AgentEventType, payload: unknown): void {
    const event: AgentEvent = {
      type,
      payload,
      timestamp: new Date(),
    }

    // 记录到历史
    this.eventHistory.push(event)
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }

    // 发射事件
    this.emitter.emit(type, payload)

    logger.debug('Event emitted', { type, payload })
  }

  /**
   * 监听事件
   */
  on(type: AgentEventType, handler: EventHandler): void {
    this.emitter.on(type, handler)
  }

  /**
   * 监听事件（一次性）
   */
  once(type: AgentEventType, handler: EventHandler): void {
    this.emitter.once(type, handler)
  }

  /**
   * 移除监听
   */
  off(type: AgentEventType, handler: EventHandler): void {
    this.emitter.off(type, handler)
  }

  /**
   * 获取最近的事件历史
   */
  getRecentEvents(options?: {
    type?: AgentEventType
    limit?: number
    since?: Date
  }): AgentEvent[] {
    let events = [...this.eventHistory]

    if (options?.type) {
      events = events.filter((e) => e.type === options.type)
    }

    if (options?.since) {
      events = events.filter((e) => e.timestamp >= options.since!)
    }

    if (options?.limit) {
      events = events.slice(-options.limit)
    }

    return events
  }

  /**
   * 检查是否有特定类型的最近事件
   */
  hasRecentEvent(type: AgentEventType, withinMs: number = 60 * 60 * 1000): boolean {
    const now = new Date()
    const since = new Date(now.getTime() - withinMs)
    return this.eventHistory.some((e) => e.type === type && e.timestamp >= since)
  }

  /**
   * 清空事件历史
   */
  clearHistory(): void {
    this.eventHistory = []
  }
}

// ==================== 单例导出 ====================

let _eventBus: EventBus | null = null

export function getEventBus(): EventBus {
  if (!_eventBus) {
    _eventBus = new EventBus()
  }
  return _eventBus
}

export default getEventBus()
