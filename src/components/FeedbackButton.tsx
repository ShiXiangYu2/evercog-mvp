/**
 * FeedbackButton 组件
 *
 * 使用 useFeedback Hook 管理状态
 */
'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react'
import { useFeedback, type FeedbackTargetType } from '@/hooks/use-feedback'

interface FeedbackButtonProps {
  targetType: FeedbackTargetType
  targetId: string
  onFeedbackSubmitted?: () => void
}

export default function FeedbackButton({
  targetType,
  targetId,
  onFeedbackSubmitted,
}: FeedbackButtonProps) {
  const { submitting, submitted, feedbackType, error, submitFeedback } = useFeedback()
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')

  const handleFeedback = async (helpful: boolean) => {
    const success = await submitFeedback({
      targetType,
      targetId,
      helpful,
      comment: comment || undefined,
    })

    if (success) {
      onFeedbackSubmitted?.()
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {feedbackType === 'helpful' ? (
          <ThumbsUp className="w-4 h-4 text-green-500" />
        ) : (
          <ThumbsDown className="w-4 h-4 text-red-500" />
        )}
        <span>感谢您的反馈！</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">这个回答有帮助吗？</span>
        <button
          onClick={() => handleFeedback(true)}
          disabled={submitting}
          className="flex items-center gap-1 px-3 py-1 text-sm rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors disabled:opacity-50"
        >
          <ThumbsUp className="w-4 h-4" />
          有帮助
        </button>
        <button
          onClick={() => handleFeedback(false)}
          disabled={submitting}
          className="flex items-center gap-1 px-3 py-1 text-sm rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
        >
          <ThumbsDown className="w-4 h-4" />
          没帮助
        </button>
        <button
          onClick={() => setShowComment(!showComment)}
          className="flex items-center gap-1 px-3 py-1 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          评论
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-500">{error}</div>
      )}

      {showComment && (
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="请输入您的建议..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
          />
          <button
            onClick={() => handleFeedback(feedbackType === 'helpful')}
            disabled={submitting || !comment}
            className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-lg hover:bg-[#059669] disabled:opacity-50"
          >
            提交
          </button>
        </div>
      )}
    </div>
  )
}
