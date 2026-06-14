'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Bot,
  RefreshCw,
  GraduationCap,
} from 'lucide-react'

interface MentorReviewData {
  pendingReviews: Array<{
    id: string
    type: string
    typeLabel: string
    title: string
    submitter: string
    createdAt: Date
    priority: string
  }>
  reviewStats: {
    totalReviews: number
    approvalRate: number
    pendingCount: number
    thisWeekProcessed: number
    avgResponseTime: number
    rejectedThenResubmitted: number
  }
  agentPreviews: Array<{
    id: string
    title: string
    status: string
    result: string
  }>
  mentorWorkspace: {
    myPendingTasks: number
    thisWeekProcessed: number
    avgResponseTime: number
    unassignedTasks: number
    pendingGaps: number
  }
  knowledgeGaps: Array<{
    id: string
    question: string
    topic: string | null
    frequency: number
    priority: string
    status: string
    suggestedAction: string | null
    createdAt: Date
  }>
}

export default function MentorReviewPage() {
  const { user: authUser } = useAuth()
  const [data, setData] = useState<MentorReviewData | null>(null)
  const [selectedReview, setSelectedReview] = useState<string | null>(null)
  const [selectedReviewType, setSelectedReviewType] = useState<string | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isMentor = authUser?.role === 'mentor' || authUser?.role === 'admin'

  useEffect(() => {
    if (authUser && !isMentor) {
      return
    }

    fetch('/api/mentor-review', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error('API Error:', data.error)
        } else {
          setData(data)
        }
      })
      .catch((err) => {
        console.error('Fetch Error:', err)
      })
  }, [authUser, isMentor])

  const defaultPendingReviews = [
    { id: '1', type: 'knowledge', typeLabel: 'Knowledge', title: 'Cross-border refund process', submitter: 'Demo User', createdAt: new Date(), priority: 'high' },
    { id: '2', type: 'knowledge', typeLabel: 'Knowledge', title: 'Customer complaint playbook v3', submitter: 'Demo User', createdAt: new Date(), priority: 'medium' },
    { id: '3', type: 'sop', typeLabel: 'SOP', title: 'New employee onboarding process', submitter: 'Demo User', createdAt: new Date(), priority: 'medium' },
    { id: '4', type: 'brief', typeLabel: 'Brief', title: '2026 Q2 policy summary', submitter: 'Agent', createdAt: new Date(), priority: 'high' },
    { id: '5', type: 'qa', typeLabel: 'QA', title: 'Cross-department FAQ', submitter: 'Agent', createdAt: new Date(), priority: 'low' },
  ]

  const defaultAgentPreviews = [
    { id: '1', title: 'Cross-border refund process', status: 'pass', result: 'Format is clear and content is complete.' },
    { id: '2', title: 'Customer complaint playbook v3', status: 'warning', result: 'Missing supporting examples.' },
    { id: '3', title: 'New employee onboarding process', status: 'pass', result: 'Workflow is actionable.' },
    { id: '4', title: '2026 Q2 policy summary', status: 'warning', result: 'Two policy references need verification.' },
  ]

  const pendingReviews = data?.pendingReviews || defaultPendingReviews
  const reviewStats = data?.reviewStats || {
    totalReviews: 23,
    approvalRate: 74,
    pendingCount: 5,
    thisWeekProcessed: 18,
    avgResponseTime: 2.1,
    rejectedThenResubmitted: 6,
  }
  const agentPreviews = data?.agentPreviews || defaultAgentPreviews
  const knowledgeGaps = data?.knowledgeGaps || []
  const mentorWorkspace = data?.mentorWorkspace || {
    myPendingTasks: 5,
    thisWeekProcessed: 18,
    avgResponseTime: 2.1,
    unassignedTasks: 3,
    pendingGaps: knowledgeGaps.length,
  }

  // 璁＄畻绛夊緟鏃堕暱
  const getWaitTime = (createdAt: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(createdAt).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '鍒氬垰'
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  return (
    <div className="p-8">
      {/* Page title */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">导师审核</h1>
          <p className="text-sm text-gray-500 mt-1">AI 预审加导师复核，保障知识质量与专业性。</p>
        </div>
        <Link
          href="/sop"
          className="flex items-center gap-2 px-5 py-3 bg-pink-500 text-white rounded-lg
                     font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                     border-4 border-pink-600"
        >
          <GraduationCap className="w-5 h-5" strokeWidth={2} />
          SOP
        </Link>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Pending reviews */}
        <div className="col-span-2 bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">1</span>
              待审核队列
            </h2>
            <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">{pendingReviews.length} 条待处理</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">类型</th>
                <th className="pb-3 font-medium">标题</th>
                <th className="pb-3 font-medium">提交人</th>
                <th className="pb-3 font-medium">等待时长</th>
                <th className="pb-3 font-medium">优先级</th>
                <th className="pb-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {pendingReviews.map((review) => (
                <tr key={review.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      review.type === 'knowledge' ? 'bg-blue-100 text-blue-700' :
                      review.type === 'sop' ? 'bg-purple-100 text-purple-700' :
                      review.type === 'brief' ? 'bg-green-100 text-green-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {review.typeLabel}
                    </span>
                  </td>
                  <td className="py-4 text-sm font-medium text-gray-900">{review.title}</td>
                  <td className="py-4 text-sm text-gray-600">{review.submitter}</td>
                  <td className="py-4 text-sm text-gray-600">{getWaitTime(review.createdAt)}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      review.priority === 'high' ? 'bg-red-100 text-red-700' :
                      review.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {review.priority === 'high' ? '高' : review.priority === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedReview(review.id)
                          setSelectedReviewType(review.type)
                          setShowReviewModal(true)
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors"
                      >
                        瀹℃牳
                      </button>
                      <Link
                        href={review.type === 'knowledge' ? `/knowledge-cards/${review.id}` :
                              review.type === 'sop' ? `/sop/${review.id}` :
                              review.type === 'brief' ? `/policy-briefs/${review.id}` : '#'}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        路路路
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link href="/knowledge-cards" className="block text-center text-sm text-[#10B981] font-medium mt-4 hover:underline">
            查看全部待审核 ({pendingReviews.length}) →
          </Link>
        </div>

        {/* Review stats */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">2</span>
              审核统计
            </h2>
            <span className="text-sm text-gray-500">本周</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">已审核</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reviewStats.totalReviews} <span className="text-sm font-medium text-gray-500">条</span></div>
              <p className="text-xs text-green-600 mt-1">较上周增加 8 条</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">平均审核时长</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reviewStats.avgResponseTime} <span className="text-sm font-medium text-gray-500">小时</span></div>
              <p className="text-xs text-green-600 mt-1">较上周减少 0.6 小时</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-[#10B981]" />
                <span className="text-sm text-gray-600">通过率</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reviewStats.approvalRate} <span className="text-sm font-medium text-gray-500">%</span></div>
              <p className="text-xs text-green-600 mt-1">较上周增加 6%</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-gray-600">驳回后再提交</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reviewStats.rejectedThenResubmitted} <span className="text-sm font-medium text-gray-500">条</span></div>
              <p className="text-xs text-green-600 mt-1">较上周减少 2 条</p>
            </div>
          </div>
          <div className="p-4 bg-[#10B981]/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-[#10B981]" />
              <span className="text-sm font-medium text-gray-900">Agent 自动预审通过</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">11 <span className="text-sm font-medium text-gray-500">条</span></div>
            <p className="text-xs text-green-600 mt-1">较上周增加 3 条</p>
          </div>
        </div>
      </div>

      {/* Agent review results */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">3</span>
            Agent 预审结果
          </h2>
          <Link href="/audit-logs" className="text-sm text-[#10B981] font-medium hover:underline">查看全部预审记录 →</Link>
        </div>
        <div className="space-y-3">
          {agentPreviews.map((preview) => (
            <div key={preview.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{preview.title}</p>
                <p className="text-xs text-gray-500 mt-1">Agent 预审</p>
              </div>
              <div className="flex items-center gap-2">
                {preview.status === 'pass' ? (
                  <CheckCircle className="w-5 h-5 text-[#10B981]" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
                <span className={`text-sm font-medium ${
                  preview.status === 'pass' ? 'text-[#10B981]' : 'text-amber-600'
                }`}>
                  {preview.result}
                </span>
              </div>
              <Link href={`/knowledge-cards/${preview.id}`} className="text-sm text-[#10B981] font-medium hover:underline">
                {preview.status === 'pass' ? '查看' : '查看建议'}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge gaps */}
      {knowledgeGaps.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-red-500 rounded-md flex items-center justify-center text-white text-xs font-bold">4</span>
              知识缺口
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">{knowledgeGaps.length} 个待处理</span>
            </h2>
            <Link href="/knowledge-gaps" className="text-sm text-[#10B981] font-medium hover:underline">查看全部 →</Link>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Agent 自动处理：</span>
                高优先级缺口已生成知识卡草稿，等待导师审核。
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {knowledgeGaps.slice(0, 3).map((gap) => (
              <div key={gap.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  gap.priority === 'high' ? 'bg-red-500' :
                  gap.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                }`} />
                <span className="text-sm text-gray-700 flex-1 truncate">{gap.question}</span>
                <span className="text-xs text-gray-400">被问 {gap.frequency} 次</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  gap.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  gap.status === 'resolved' ? 'bg-green-100 text-green-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {gap.status === 'in_progress' ? 'Agent 处理中' :
                   gap.status === 'resolved' ? '已解决' : '待处理'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mentor workspace */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">5</span>
            导师工作台
          </h2>
          <Link href="/agent-workspace" className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors">
            进入工作台 →
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">我的审核任务</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{mentorWorkspace.myPendingTasks}</span>
              <span className="text-sm text-gray-500">条待处理</span>
            </div>
            <p className="text-xs text-green-600 mt-1">较上周减少 1 条</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">本周已处理</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{mentorWorkspace.thisWeekProcessed}</span>
              <span className="text-sm text-gray-500">条</span>
            </div>
            <p className="text-xs text-green-600 mt-1">较上周增加 6 条</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">平均响应时间</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{mentorWorkspace.avgResponseTime}</span>
              <span className="text-sm text-gray-500">小时</span>
            </div>
            <p className="text-xs text-green-600 mt-1">较上周减少 0.7 小时</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">待分配</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{mentorWorkspace.unassignedTasks}</span>
              <span className="text-sm text-gray-500">条</span>
            </div>
            <p className="text-xs text-green-600 mt-1">较上周减少 1 条</p>
          </div>
        </div>
      </div>

      {/* AI review note */}
      <div className="mt-6 bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-[#10B981]" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold">AI 预审说明：</span>
            Agent 会从格式规范、内容完整性、引用有效性和政策时效性等维度提供审核建议。
          </p>
        </div>
      </div>

      {/* Review modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">审核确认</h3>
            <p className="text-sm text-gray-600 mb-4">请选择审核操作。</p>

            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setReviewAction('approve')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  reviewAction === 'approve'
                    ? 'border-[#10B981] bg-[#10B981]/5 text-[#10B981]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium">通过</span>
                </div>
              </button>
              <button
                onClick={() => setReviewAction('reject')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  reviewAction === 'reject'
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium">驳回</span>
                </div>
              </button>
            </div>

            {reviewAction === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  驳回原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="请输入驳回原因..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                  rows={3}
                />
              </div>
            )}

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReviewModal(false)
                  setSelectedReview(null)
                  setSelectedReviewType(null)
                  setReviewAction(null)
                  setReviewComment('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                disabled={!reviewAction || submitting || (reviewAction === 'reject' && !reviewComment)}
                onClick={async () => {
                  if (!selectedReview || !reviewAction) return

                  setSubmitting(true)
                  try {
                    let apiUrl = ''
                    let body = {}

                    if (selectedReviewType === 'knowledge') {
                      apiUrl = `/api/knowledge-cards/${selectedReview}/status`
                      body = {
                        action: reviewAction === 'approve' ? 'approve' : 'reject',
                        comment: reviewComment || undefined,
                      }
                    } else if (selectedReviewType === 'sop') {
                      apiUrl = `/api/sop/tasks/${selectedReview}/review`
                      body = {
                        submissionId: selectedReview,
                        action: reviewAction === 'approve' ? 'approve' : 'reject',
                        comment: reviewComment || undefined,
                      }
                    } else if (selectedReviewType === 'brief') {
                      apiUrl = `/api/policy-briefs/${selectedReview}`
                      body = {
                        action: reviewAction === 'approve' ? 'approve' : 'reject',
                        comment: reviewComment || undefined,
                      }
                    }

                    const res = await fetch(apiUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                      credentials: 'same-origin',
                    })

                    if (res.ok) {
                      alert(reviewAction === 'approve' ? '审核通过' : '已驳回')
                      window.location.reload()
                    } else {
                      const error = await res.json()
                      alert(error.error || '审核失败')
                    }
                  } catch (error) {
                    console.error('Review failed:', error)
                    alert('审核失败，请重试')
                  } finally {
                    setSubmitting(false)
                    setShowReviewModal(false)
                    setSelectedReview(null)
                    setSelectedReviewType(null)
                    setReviewAction(null)
                    setReviewComment('')
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '提交中...' : '确认提交'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
