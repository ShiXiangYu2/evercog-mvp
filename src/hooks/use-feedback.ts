/**
 * useFeedback Hook
 *
 * 封装反馈提交逻辑，包括状态管理和错误处理
 * 可被 FeedbackButton 和其他组件复用
 */
import { useState, useCallback } from 'react'

// ==================== 类型定义 ====================

export type FeedbackTargetType = 'knowledge_card' | 'experience_query'

export interface FeedbackData {
  targetType: FeedbackTargetType
  targetId: string
  helpful?: boolean
  rating?: number
  comment?: string
}

export interface FeedbackState {
  /** 是否正在提交 */
  submitting: boolean
  /** 是否已提交 */
  submitted: boolean
  /** 提交的反馈类型 */
  feedbackType: 'helpful' | 'not_helpful' | null
  /** 错误信息 */
  error: string | null
}

export interface UseFeedbackReturn extends FeedbackState {
  /** 提交反馈 */
  submitFeedback: (data: FeedbackData) => Promise<boolean>
  /** 重置状态 */
  reset: () => void
}

// ==================== Hook ====================

/**
 * 反馈提交 Hook
 *
 * @example
 * ```tsx
 * const { submitting, submitted, feedbackType, submitFeedback, reset } = useFeedback()
 *
 * const handleHelpful = async () => {
 *   const success = await submitFeedback({
 *     targetType: 'knowledge_card',
 *     targetId: 'card-1',
 *     helpful: true,
 *   })
 *   if (success) {
 *     // 提交成功
 *   }
 * }
 * ```
 */
export function useFeedback(): UseFeedbackReturn {
  const [state, setState] = useState<FeedbackState>({
    submitting: false,
    submitted: false,
    feedbackType: null,
    error: null,
  })

  const submitFeedback = useCallback(async (data: FeedbackData): Promise<boolean> => {
    setState((prev) => ({ ...prev, submitting: true, error: null }))

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '提交反馈失败')
      }

      setState({
        submitting: false,
        submitted: true,
        feedbackType: data.helpful !== undefined
          ? (data.helpful ? 'helpful' : 'not_helpful')
          : null,
        error: null,
      })

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : '提交反馈失败'
      setState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }))
      return false
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      submitting: false,
      submitted: false,
      feedbackType: null,
      error: null,
    })
  }, [])

  return {
    ...state,
    submitFeedback,
    reset,
  }
}
