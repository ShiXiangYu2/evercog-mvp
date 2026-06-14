'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Search,
  Send,
  FileText,
  Megaphone,
  AlertTriangle,
  BookOpen,
  History,
  Loader2,
  ArrowRight,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Plus,
  ArrowLeft,
  Copy,
} from 'lucide-react'

// Copy Button Component
function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
        copied
          ? 'bg-white/30 text-white'
          : 'bg-white/20 text-white/80 hover:bg-white/30 hover:text-white'
      } ${className}`}
    >
      {copied ? (
        <>
          <CheckCircle className="w-3 h-3" />
          已复制
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          复制
        </>
      )}
    </button>
  )
}

// Feedback Section Component
function FeedbackSection({ queryId }: { queryId: string | null }) {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleFeedback = async (helpful: boolean) => {
    if (!queryId) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'experience_query',
          targetId: queryId,
          helpful,
          comment: comment || undefined,
        }),
      })

      if (response.ok) {
        setFeedback(helpful ? 'helpful' : 'not_helpful')
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">感谢您的反馈！</p>
            <p className="text-xs text-green-600 mt-1">
              {feedback === 'helpful' ? '很高兴这个回答对您有帮助' : '我们会努力改进回答质量'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
          <HelpCircle className="w-4 h-4 text-gray-600" strokeWidth={2} />
        </div>
        <h3 className="text-sm font-bold text-gray-900">这个回答有帮助吗？</h3>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => handleFeedback(true)}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg
                     font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                     border-4 border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ThumbsUp className="w-4 h-4" strokeWidth={2} />
          有帮助
        </button>
        <button
          onClick={() => handleFeedback(false)}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg
                     font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                     border-4 border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ThumbsDown className="w-4 h-4" strokeWidth={2} />
          无帮助
        </button>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="可选：告诉我们如何改进..."
        rows={2}
        className="w-full px-4 py-3 bg-white rounded-lg text-sm resize-none
                   border-2 border-gray-200 focus:border-indigo-500 outline-none
                   transition-all duration-200 placeholder:text-gray-400"
      />
    </div>
  )
}

interface CitedSource {
  cardId: string
  title: string
  category: string
  source: string
  reviewerName?: string
  updatedAt?: string
  status?: string
}

interface QueryResult {
  policyExplanation: string
  serviceOpportunity: string
  salesScript: string
  riskReminder: string
  citedSources: CitedSource[]
}

const categoryLabels: Record<string, string> = {
  data_checklist: '资料清单',
  tax_process: '报税流程',
  risk_reminder: '风险提醒',
  service_boundary: '服务边界',
  faq: '常见问题',
  experience: '经验分享',
}

const categoryColors: Record<string, string> = {
  data_checklist: 'bg-blue-500',
  tax_process: 'bg-emerald-500',
  risk_reminder: 'bg-red-500',
  service_boundary: 'bg-purple-500',
  faq: 'bg-amber-500',
  experience: 'bg-indigo-500',
}

const exampleQuestions = [
  '餐饮客户问：我们店刚开业，代账需要准备什么材料？',
  '客户想了解小微企业税收优惠政策',
  '零售客户问代账服务包含哪些内容',
  '客户担心税务风险，怎么回应？',
]

export default function ExperiencePage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [noResultMsg, setNoResultMsg] = useState('')
  const [queryId, setQueryId] = useState<string | null>(null)
  const [knowledgeGap, setKnowledgeGap] = useState<{ id: string; question: string } | null>(null)

  // Get current user from localStorage (matching UserSwitcher pattern)
  const getCurrentUserId = (): string => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentUserId') || '1'
    }
    return '1'
  }

  const handleSubmit = async (q?: string) => {
    const queryText = q || question
    if (!queryText.trim()) return

    setLoading(true)
    setResult(null)
    setNoResultMsg('')
    setQueryId(null)

    const callerId = getCurrentUserId()

    try {
      const res = await fetch('/api/experience/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText, callerId }),
      })

      const data = await res.json()

      if (data.reply) {
        setResult(data.reply)
        setQueryId(data.query?.id || null)
        setKnowledgeGap(null)
      } else if (data.message) {
        setNoResultMsg(data.message)
        if (data.gap) {
          setKnowledgeGap(data.gap)
        }
      }
    } catch (error) {
      console.error('Failed to submit query:', error)
      setNoResultMsg('提交失败，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen flex flex-col">

        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/employee-qa"
              className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg
                         text-gray-600 hover:bg-gray-200 hover:text-gray-900
                         transition-all duration-200"
              title="返回员工问答"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                经验问答
              </h1>
              <p className="text-sm text-gray-500 mt-1 ml-15">
                输入客户问题，调用已审核知识生成回复建议
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/experience/history"
              className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-lg
                         font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                         border-4 border-gray-200"
            >
              <History className="w-4 h-4" strokeWidth={2} />
              调用历史
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Question Input Area */}
          <div className="bg-white rounded-lg p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-indigo-500" strokeWidth={2} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">输入客户问题</h2>
            </div>

            <div className="relative mb-4">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例如：餐饮客户问：我们店刚开业，代账需要准备什么材料？"
                rows={3}
                className="w-full px-5 py-4 bg-gray-100 rounded-lg text-sm resize-none
                           border-2 border-transparent focus:border-indigo-500 focus:bg-white
                           outline-none transition-all duration-200 placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">按 Enter 发送，Shift+Enter 换行</p>
              <button
                onClick={() => handleSubmit()}
                disabled={!question.trim() || loading}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-500 text-white rounded-lg
                           font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                           border-4 border-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed
                           disabled:hover:scale-100"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
                ) : (
                  <Send className="w-5 h-5" strokeWidth={2} />
                )}
                {loading ? '生成中...' : '生成回复建议'}
              </button>
            </div>

            {/* Example Questions */}
            {!result && !loading && !noResultMsg && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                  试试这些问题
                </p>
                <div className="flex flex-wrap gap-2">
                  {exampleQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuestion(q)
                        handleSubmit(q)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600
                                 rounded-lg text-xs font-medium transition-all duration-200
                                 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-[1.02]
                                 border-2 border-transparent hover:border-indigo-200"
                    >
                      <ArrowRight className="w-3 h-3" />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* No Result Message */}
          {noResultMsg && (
            <div className="bg-amber-50 rounded-lg p-8 mb-6 border-4 border-amber-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800">未找到相关知识</p>
                  <p className="text-sm text-amber-600 mt-1">{noResultMsg}</p>
                </div>
              </div>
              {knowledgeGap && (
                <div className="mt-4 p-4 bg-white rounded-lg border-2 border-amber-300">
                  <p className="text-sm font-bold text-gray-900 mb-2">💡 AI 识别到知识缺口</p>
                  <p className="text-xs text-gray-600 mb-3">系统已记录此问题，建议导师补充相关经验。</p>
                  <Link
                    href={`/knowledge-cards/new?gap=${knowledgeGap.id}&question=${encodeURIComponent(knowledgeGap.question)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg
                               font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                               border-4 border-indigo-600"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2} />
                    创建知识卡
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Generated Result */}
          {result && (
            <div className="space-y-4">
              {/* Four-section result grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Policy Explanation */}
                <div className="bg-blue-500 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <h3 className="text-lg font-bold">政策解释</h3>
                    </div>
                    <CopyButton text={result.policyExplanation || ''} />
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-blue-50">
                    {result.policyExplanation || '暂无相关政策解释'}
                  </div>
                </div>

                {/* Service Opportunity */}
                <div className="bg-emerald-500 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <h3 className="text-lg font-bold">服务机会</h3>
                    </div>
                    <CopyButton text={result.serviceOpportunity || ''} />
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-emerald-50">
                    {result.serviceOpportunity || '暂无服务机会建议'}
                  </div>
                </div>

                {/* Sales Script */}
                <div className="bg-amber-500 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <h3 className="text-lg font-bold">销售话术</h3>
                    </div>
                    <CopyButton text={result.salesScript || ''} />
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-amber-50">
                    {result.salesScript || '暂无销售话术建议'}
                  </div>
                </div>

                {/* Risk Reminder */}
                <div className="bg-red-500 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <h3 className="text-lg font-bold">风险提醒</h3>
                    </div>
                    <CopyButton text={result.riskReminder || ''} />
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-red-50">
                    {result.riskReminder || '暂无风险提醒'}
                  </div>
                </div>
              </div>

              {/* Cited Sources */}
              <div className="bg-white rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-gray-500" strokeWidth={2} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">引用来源</h3>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-semibold">
                    {result.citedSources.length} 个来源
                  </span>
                </div>
                <div className="space-y-3">
                  {result.citedSources.map((source, i) => (
                    <Link
                      key={i}
                      href={`/knowledge-cards/${source.cardId}`}
                      className="block p-4 bg-gray-50 rounded-lg border-2 border-gray-200
                                 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${categoryColors[source.category] || 'bg-gray-400'}`} />
                          <span className="text-sm font-bold text-gray-900">{source.title}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          已发布
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        {source.reviewerName && (
                          <span>审核人：{source.reviewerName}</span>
                        )}
                        {source.updatedAt && (
                          <span>更新时间：{new Date(source.updatedAt).toLocaleDateString('zh-CN')}</span>
                        )}
                        <span>分类：{categoryLabels[source.category] || source.category}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                {result.citedSources.length === 0 && (
                  <p className="text-xs text-gray-400 italic">无引用来源</p>
                )}
              </div>

              {/* User Feedback */}
              <FeedbackSection queryId={queryId} />
            </div>
          )}
        </main>
    </div>
  )
}
