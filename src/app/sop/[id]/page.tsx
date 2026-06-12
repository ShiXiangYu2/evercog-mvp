'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import UserSwitcher from '@/components/UserSwitcher'
import {
  ArrowLeft,
  GraduationCap,
  Clock,
  CheckCircle2,
  Send,
  FileText,
  AlertTriangle,
  Eye,
  MessageSquare,
  BookOpen,
  Target,
  Zap,
  XCircle,
  RotateCcw,
} from 'lucide-react'

interface TaskData {
  id: string
  title: string
  description: string | null
  template: string | null
  requirements: string | null
  status: string
  dueDate: string | null
  createdAt: string
  mentor: { id: string; name: string; role: string; department: { name: string } }
  trainee: { id: string; name: string; role: string; department: { name: string } }
  submissions: SubmissionData[]
}

interface SubmissionData {
  id: string
  content: string
  status: string
  completeness: number | null
  missingSteps: string | null
  riskPoints: string | null
  executability: number | null
  reviewComment: string | null
  approvedAt: string | null
  createdAt: string
  submitter: { id: string; name: string; role: string }
  reviewer: { id: string; name: string } | null
}

const taskStatusLabels: Record<string, string> = {
  assigned: '已分配',
  in_progress: '进行中',
  submitted: '已提交',
  reviewed: '已审核',
  completed: '已完成',
}

const taskStatusColors: Record<string, string> = {
  assigned: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  submitted: 'bg-amber-500',
  reviewed: 'bg-purple-500',
  completed: 'bg-emerald-500',
}

const submissionStatusLabels: Record<string, string> = {
  submitted: '已提交',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '已驳回',
  revision_required: '需修改',
}

const submissionStatusColors: Record<string, string> = {
  submitted: 'bg-amber-500',
  reviewing: 'bg-blue-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  revision_required: 'bg-yellow-500',
}

const statusSteps = ['assigned', 'in_progress', 'submitted', 'reviewed', 'completed']

function parseJsonArray(str: string | null): string[] {
  if (!str) return []
  try { return JSON.parse(str) } catch { return [] }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-50'
  if (score >= 60) return 'bg-amber-50'
  return 'bg-red-50'
}

export default function SOPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [task, setTask] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionData | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false)

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/sop/tasks/${id}`)
      if (res.ok) {
        const data: TaskData = await res.json()
        setTask(data)
        // Auto-select latest submission
        if (data.submissions.length > 0 && !selectedSubmission) {
          setSelectedSubmission(data.submissions[0])
        }
      } else {
        router.push('/sop')
      }
    } catch (error) {
      console.error('Failed to fetch task:', error)
      router.push('/sop')
    } finally {
      setLoading(false)
    }
  }, [id, router, selectedSubmission])

  useEffect(() => {
    fetchTask()
    const userId = localStorage.getItem('currentUserId') || '5'
    const roleMap: Record<string, string> = {
      '1': 'sales', '2': 'customer_service', '3': 'operations',
      '4': 'finance', '5': 'mentor', '6': 'trainee', '7': 'admin', '8': 'ai_info',
    }
    setCurrentUser({ id: userId, name: '', role: roleMap[userId] || 'mentor' })
  }, [fetchTask])

  const handleReview = async (action: 'approve' | 'reject' | 'revision_required') => {
    if (!currentUser || !selectedSubmission) return

    const actionLabels = {
      approve: '通过',
      reject: '驳回',
      revision_required: '要求修改',
    }

    if (!confirm(`确定${actionLabels[action]}此提交？`)) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/sop/tasks/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedSubmission.id,
          reviewerId: currentUser.id,
          action,
          comment: reviewComment || null,
        }),
      })

      if (res.ok) {
        await fetchTask()
        setReviewComment('')
      } else {
        const error = await res.json()
        alert(error.error || '操作失败')
      }
    } catch (error) {
      console.error('Failed to review:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveAsKnowledge = async () => {
    if (!selectedSubmission || !task) return
    alert('已沉淀为知识卡草稿！（Demo 模拟）')
    setShowKnowledgeModal(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!task) return null

  const isMentor = currentUser?.role === 'mentor' || currentUser?.role === 'admin'
  const isTrainee = currentUser?.role === 'trainee'
  const currentStepIndex = statusSteps.indexOf(task.status)
  const canSubmit = isTrainee && ['assigned', 'in_progress', 'revision_required'].includes(task.status)
  const canReview = isMentor && selectedSubmission && ['submitted', 'reviewing'].includes(selectedSubmission.status)

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/sop"
              className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center
                         transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02]"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                                  text-xs font-bold text-white ${taskStatusColors[task.status]}`}>
                  {taskStatusLabels[task.status]}
                </span>
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  {task.title}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canSubmit && (
              <Link
                href={`/sop/${id}/submit`}
                className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-lg
                           font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                           border-4 border-pink-600"
              >
                <Send className="w-4 h-4" />
                提交 SOP
              </Link>
            )}
            <UserSwitcher />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* Status Progress */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                {statusSteps.map((step, index) => {
                  const StepIcon = [FileText, Clock, Send, AlertTriangle, CheckCircle2][index]
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                                        ${index <= currentStepIndex
                                          ? taskStatusColors[step]
                                          : 'bg-gray-200'
                                        } transition-colors duration-300`}>
                          <StepIcon className="w-5 h-5 text-white" strokeWidth={2} />
                        </div>
                        <span className={`text-xs font-semibold mt-1.5 ${
                          index <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {taskStatusLabels[step]}
                        </span>
                      </div>
                      {index < statusSteps.length - 1 && (
                        <div className={`flex-1 h-1 mx-2 rounded-full transition-colors duration-300 ${
                          index < currentStepIndex ? taskStatusColors[step] : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* Left: Task Info */}
              <div className="col-span-4 space-y-4">
                {/* Task Info Card */}
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">任务信息</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 font-semibold">导师</label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-7 h-7 bg-indigo-500 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{task.mentor.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{task.mentor.name}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-semibold">新人</label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-7 h-7 bg-pink-500 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{task.trainee.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{task.trainee.name}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-semibold">截止日期</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(task.dueDate)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-semibold">提交次数</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{task.submissions.length} 次</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <div className="bg-white rounded-lg p-6">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">任务描述</h3>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                  </div>
                )}

                {/* Requirements */}
                {task.requirements && (
                  <div className="bg-white rounded-lg p-6">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">训练要求</h3>
                    <div className="bg-amber-50 rounded-lg p-4 border-4 border-amber-200">
                      <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">{task.requirements}</p>
                    </div>
                  </div>
                )}

                {/* Template */}
                {task.template && (
                  <div className="bg-white rounded-lg p-6">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">SOP 模板</h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {task.template}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Submissions */}
              <div className="col-span-8 space-y-4">
                {/* Submission List */}
                {task.submissions.length > 0 && (
                  <div className="bg-white rounded-lg p-6">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                      提交记录 ({task.submissions.length})
                    </h3>
                    <div className="space-y-2">
                      {task.submissions.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubmission(sub)}
                          className={`w-full flex items-center justify-between p-4 rounded-lg
                                     transition-all duration-200 text-left border-4
                                     ${selectedSubmission?.id === sub.id
                                       ? 'bg-pink-50 border-pink-300'
                                       : 'bg-gray-50 border-transparent hover:bg-gray-100'
                                     }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold text-white
                                              ${submissionStatusColors[sub.status]}`}>
                              {submissionStatusLabels[sub.status]}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {sub.submitter.name} 的提交
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {sub.completeness !== null && (
                              <span>完整性 {sub.completeness}%</span>
                            )}
                            <span>{formatDate(sub.createdAt)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Submission Detail */}
                {selectedSubmission && (
                  <>
                    {/* AI Inspection Report - Four Color Blocks */}
                    {(selectedSubmission.completeness !== null || selectedSubmission.executability !== null) && (
                      <div className="bg-white rounded-lg p-6">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          AI 检查报告
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Completeness */}
                          <div className={`rounded-lg p-5 ${getScoreBg(selectedSubmission.completeness || 0)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-gray-700" />
                                <span className="text-sm font-bold text-gray-700">完整性</span>
                              </div>
                              <span className="text-2xl font-extrabold text-gray-900">
                                {selectedSubmission.completeness ?? 0}%
                              </span>
                            </div>
                            <div className="w-full bg-white/50 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getScoreColor(selectedSubmission.completeness || 0)}`}
                                style={{ width: `${selectedSubmission.completeness || 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Executability */}
                          <div className={`rounded-lg p-5 ${getScoreBg(selectedSubmission.executability || 0)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-gray-700" />
                                <span className="text-sm font-bold text-gray-700">可执行性</span>
                              </div>
                              <span className="text-2xl font-extrabold text-gray-900">
                                {selectedSubmission.executability ?? 0}%
                              </span>
                            </div>
                            <div className="w-full bg-white/50 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getScoreColor(selectedSubmission.executability || 0)}`}
                                style={{ width: `${selectedSubmission.executability || 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Missing Steps */}
                          <div className="bg-red-50 rounded-lg p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                              <span className="text-sm font-bold text-red-700">遗漏步骤</span>
                              <span className="text-xs font-semibold text-red-500 bg-red-100 px-2 py-0.5 rounded">
                                {parseJsonArray(selectedSubmission.missingSteps).length} 项
                              </span>
                            </div>
                            <ul className="space-y-1.5">
                              {parseJsonArray(selectedSubmission.missingSteps).map((step, i) => (
                                <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                                  <span className="text-red-400 mt-0.5">-</span>
                                  {step}
                                </li>
                              ))}
                              {parseJsonArray(selectedSubmission.missingSteps).length === 0 && (
                                <li className="text-xs text-red-400">无遗漏</li>
                              )}
                            </ul>
                          </div>

                          {/* Risk Points */}
                          <div className="bg-amber-50 rounded-lg p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="w-5 h-5 text-amber-600" />
                              <span className="text-sm font-bold text-amber-700">风险点</span>
                              <span className="text-xs font-semibold text-amber-500 bg-amber-100 px-2 py-0.5 rounded">
                                {parseJsonArray(selectedSubmission.riskPoints).length} 项
                              </span>
                            </div>
                            <ul className="space-y-1.5">
                              {parseJsonArray(selectedSubmission.riskPoints).map((point, i) => (
                                <li key={i} className="text-xs text-amber-600 flex items-start gap-1.5">
                                  <span className="text-amber-400 mt-0.5">-</span>
                                  {point}
                                </li>
                              ))}
                              {parseJsonArray(selectedSubmission.riskPoints).length === 0 && (
                                <li className="text-xs text-amber-400">无风险点</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submission Content */}
                    <div className="bg-white rounded-lg p-6">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        提交内容
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-6 text-sm font-mono text-gray-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                        {selectedSubmission.content}
                      </div>
                    </div>

                    {/* Review Comment */}
                    {selectedSubmission.reviewComment && (
                      <div className="bg-white rounded-lg p-6">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-purple-500" />
                          导师评审意见
                        </h3>
                        <div className="bg-purple-50 rounded-lg p-4 border-4 border-purple-200">
                          <p className="text-sm text-purple-800">{selectedSubmission.reviewComment}</p>
                        </div>
                      </div>
                    )}

                    {/* Mentor Review Actions */}
                    {canReview && (
                      <div className="bg-white rounded-lg p-6">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                          导师评审
                        </h3>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="输入评审意见（可选）..."
                          rows={3}
                          className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium leading-relaxed
                                     border-4 border-transparent focus:border-pink-500 focus:bg-white
                                     outline-none transition-all duration-200 resize-y mb-4"
                        />
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleReview('approve')}
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg
                                       font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                                       border-4 border-emerald-600 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            通过
                          </button>
                          <button
                            onClick={() => handleReview('revision_required')}
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg
                                       font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                                       border-4 border-amber-600 disabled:opacity-50"
                          >
                            <RotateCcw className="w-4 h-4" />
                            要求修改
                          </button>
                          <button
                            onClick={() => handleReview('reject')}
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg
                                       font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                                       border-4 border-red-600 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            驳回
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Knowledge沉淀 - only show for approved submissions */}
                    {selectedSubmission.status === 'approved' && isMentor && (
                      <div className="bg-white rounded-lg p-6">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                          知识沉淀
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          将此通过的 SOP 提交沉淀为知识卡，供团队学习参考。
                        </p>
                        <button
                          onClick={() => setShowKnowledgeModal(true)}
                          className="flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-lg
                                     font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                                     border-4 border-indigo-600"
                        >
                          <BookOpen className="w-4 h-4" />
                          沉淀为知识卡
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* No submissions yet */}
                {task.submissions.length === 0 && (
                  <div className="bg-white rounded-lg p-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Send className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-2">暂无提交</p>
                    <p className="text-sm text-gray-500">
                      {isTrainee ? '点击「提交 SOP」开始你的第一次提交' : '等待新人提交 SOP 内容'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Knowledge Modal */}
      {showKnowledgeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">沉淀为知识卡</h3>
            <p className="text-sm text-gray-500 mb-6">
              将此 SOP 提交的内容和检查报告沉淀为知识卡，分类为「经验分享」，供团队其他成员学习参考。
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowKnowledgeModal(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm
                           transition-all duration-200 hover:scale-[1.02] border-4 border-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleSaveAsKnowledge}
                className="px-5 py-2.5 bg-indigo-500 text-white rounded-lg font-semibold text-sm
                           transition-all duration-200 hover:scale-[1.02] border-4 border-indigo-600"
              >
                确认沉淀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
