'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import {
  ClipboardCheck,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Bot,
  RefreshCw,
  GraduationCap,
  Shield,
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
  const [loading, setLoading] = useState(true)

  // 权限检查：只允许导师/管理员访问
  const isMentor = authUser?.role === 'mentor' || authUser?.role === 'admin'

  if (authUser && !isMentor) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-800 mb-2">无权访问</h2>
          <p className="text-sm text-red-600 mb-4">导师审核页面仅对导师和管理员开放</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg
                       font-semibold text-sm hover:bg-red-600 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    )
  }
  const [selectedReview, setSelectedReview] = useState<string | null>(null)
  const [selectedReviewType, setSelectedReviewType] = useState<string | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/mentor-review', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error('API Error:', data.error)
          setLoading(false)
        } else {
          setData(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Fetch Error:', err)
        setLoading(false)
      })
  }, [])

  // 模拟数据 - 待审核队列
  const defaultPendingReviews = [
    { id: '1', type: 'knowledge', typeLabel: '知识卡', title: '「跨境电商退税流程」', submitter: '李明', createdAt: new Date(), priority: 'high' },
    { id: '2', type: 'knowledge', typeLabel: '知识卡', title: '「客户投诉处理话术 v3」', submitter: '王芳', createdAt: new Date(), priority: 'medium' },
    { id: '3', type: 'sop', typeLabel: 'SOP', title: '「新员工入职培训流程」', submitter: '张伟', createdAt: new Date(), priority: 'medium' },
    { id: '4', type: 'brief', typeLabel: '政策简报', title: '「2026-Q2 财税政策汇编」', submitter: 'Agent 自动生成', createdAt: new Date(), priority: 'high' },
    { id: '5', type: 'qa', typeLabel: '问答案例', title: '「跨部门协作 FAQ」', submitter: 'Agent 自动整理', createdAt: new Date(), priority: 'low' },
  ]

  // 模拟数据 - Agent 预审结果
  const defaultAgentPreviews = [
    { id: '1', title: '「跨境电商退税流程」', status: 'pass', result: '格式规范，内容完整，建议通过' },
    { id: '2', title: '「客户投诉处理话术 v3」', status: 'warning', result: '缺少案例佐证，建议补充' },
    { id: '3', title: '「新员工入职培训流程」', status: 'pass', result: '流程清晰，建议通过' },
    { id: '4', title: '「2026-Q2 财税政策汇编」', status: 'warning', result: '有 2 条政策编号待核实' },
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

  // 计算等待时长
  const getWaitTime = (createdAt: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(createdAt).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">导师审核</h1>
          <p className="text-sm text-gray-500 mt-1">AI 预审 + 导师复核，保障知识质量与专业性，让知识更可信。</p>
        </div>
        <Link
          href="/sop"
          className="flex items-center gap-2 px-5 py-3 bg-pink-500 text-white rounded-lg
                     font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                     border-4 border-pink-600"
        >
          <GraduationCap className="w-5 h-5" strokeWidth={2} />
          SOP 训练
        </Link>
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* 待审核队列 */}
        <div className="col-span-2 bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">①</span>
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
                        审核
                      </button>
                      <Link
                        href={review.type === 'knowledge' ? `/knowledge-cards/${review.id}` :
                              review.type === 'sop' ? `/sop/${review.id}` :
                              review.type === 'brief' ? `/policy-briefs/${review.id}` : '#'}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        ···
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

        {/* 审核统计 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">②</span>
              审核统计（本周）
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
              <p className="text-xs text-green-600 mt-1">较上周 ↑ 8 条</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">平均审核时长</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reviewStats.avgResponseTime} <span className="text-sm font-medium text-gray-500">小时</span></div>
              <p className="text-xs text-green-600 mt-1">较上周 ↓ 0.6 小时</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-[#10B981]" />
                <span className="text-sm text-gray-600">通过率</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reviewStats.approvalRate} <span className="text-sm font-medium text-gray-500">%</span></div>
              <p className="text-xs text-green-600 mt-1">较上周 ↑ 6%</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-gray-600">驳回后修改再提交</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reviewStats.rejectedThenResubmitted} <span className="text-sm font-medium text-gray-500">条</span></div>
              <p className="text-xs text-green-600 mt-1">较上周 ↑ 2 条</p>
            </div>
          </div>
          <div className="p-4 bg-[#10B981]/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-[#10B981]" />
              <span className="text-sm font-medium text-gray-900">Agent 自动预审通过</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">11 <span className="text-sm font-medium text-gray-500">条</span></div>
            <p className="text-xs text-green-600 mt-1">较上周 ↑ 3 条</p>
          </div>
        </div>
      </div>

      {/* Agent 预审结果 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">③</span>
            Agent 预审结果（辅助审核）
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
                <p className="text-xs text-gray-500 mt-1">Agent 预审：</p>
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

      {/* 知识缺口 - Agent 自动处理 */}
      {knowledgeGaps.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-red-500 rounded-md flex items-center justify-center text-white text-xs font-bold">④</span>
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
                高优先级缺口已由 Agent 自动生成知识卡草稿，等待您审核。您可以在上方待审核队列中查看。
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

      {/* 导师工作台 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">⑤</span>
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
            <p className="text-xs text-green-600 mt-1">较上周 ↓ 1 条</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">本周已处理</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{mentorWorkspace.thisWeekProcessed}</span>
              <span className="text-sm text-gray-500">条</span>
            </div>
            <p className="text-xs text-green-600 mt-1">较上周 ↑ 6 条</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">审核中平均响应时间</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{mentorWorkspace.avgResponseTime}</span>
              <span className="text-sm text-gray-500">小时</span>
            </div>
            <p className="text-xs text-green-600 mt-1">较上周 ↓ 0.7 小时</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">待分配（无指定导师）</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{mentorWorkspace.unassignedTasks}</span>
              <span className="text-sm text-gray-500">条</span>
            </div>
            <p className="text-xs text-green-600 mt-1">较上周 ↑ 1 条</p>
          </div>
        </div>
      </div>

      {/* AI 预审说明 */}
      <div className="mt-6 bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-[#10B981]" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold">AI 预审说明：</span>
            Agent 将从格式规范、内容完整性、引用有效性、政策时效性等维度进行预审，为导师提供审核建议与风险提示。
          </p>
        </div>
      </div>

      {/* 审核弹窗 */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">审核确认</h3>
            <p className="text-sm text-gray-600 mb-4">
              请选择审核操作：
            </p>

            {/* 审核操作选择 */}
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
                  <span className="text-lg">✓</span>
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
                  <span className="text-lg">✗</span>
                  <span className="font-medium">驳回</span>
                </div>
              </button>
            </div>

            {/* 审核意见（驳回时必填） */}
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
                    // 根据类型调用不同的 API
                    let apiUrl = ''
                    let body = {}

                    if (selectedReviewType === 'knowledge') {
                      apiUrl = `/api/knowledge-cards/${selectedReview}/status`
                      body = {
                        action: reviewAction === 'approve' ? 'approve' : 'reject',
                        userId: 'current-user', // 实际应从认证获取
                        comment: reviewComment || undefined,
                      }
                    } else if (selectedReviewType === 'sop') {
                      // SOP 审核
                      apiUrl = `/api/sop/tasks/${selectedReview}/review`
                      body = {
                        submissionId: selectedReview,
                        action: reviewAction === 'approve' ? 'approve' : 'reject',
                        comment: reviewComment || undefined,
                      }
                    } else if (selectedReviewType === 'brief') {
                      // 简报审核
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
                      alert(reviewAction === 'approve' ? '审核通过！' : '已驳回')
                      // 刷新数据
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
