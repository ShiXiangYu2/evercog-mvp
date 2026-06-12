'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import UserSwitcher from '@/components/UserSwitcher'
import {
  MessageSquare,
  Search,
  Send,
  FileText,
  Shield,
  Megaphone,
  AlertTriangle,
  Tag,
  BookOpen,
  History,
  Loader2,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'

interface CitedSource {
  cardId: string
  title: string
  category: string
  source: string
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
  const [currentCallerId, setCurrentCallerId] = useState<string>('')

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

    const callerId = getCurrentUserId()
    setCurrentCallerId(callerId)

    try {
      const res = await fetch('/api/experience/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText, callerId }),
      })

      const data = await res.json()

      if (data.reply) {
        setResult(data.reply)
      } else if (data.message) {
        setNoResultMsg(data.message)
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
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
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
            <UserSwitcher />
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800">未找到相关知识</p>
                  <p className="text-sm text-amber-600 mt-1">{noResultMsg}</p>
                </div>
              </div>
            </div>
          )}

          {/* Generated Result */}
          {result && (
            <div className="space-y-4">
              {/* Four-section result grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Policy Explanation */}
                <div className="bg-blue-500 rounded-lg p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-lg font-bold">政策解释</h3>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-blue-50">
                    {result.policyExplanation || '暂无相关政策解释'}
                  </div>
                </div>

                {/* Service Opportunity */}
                <div className="bg-emerald-500 rounded-lg p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-lg font-bold">服务机会</h3>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-emerald-50">
                    {result.serviceOpportunity || '暂无服务机会建议'}
                  </div>
                </div>

                {/* Sales Script */}
                <div className="bg-amber-500 rounded-lg p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-lg font-bold">销售话术</h3>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-amber-50">
                    {result.salesScript || '暂无销售话术建议'}
                  </div>
                </div>

                {/* Risk Reminder */}
                <div className="bg-red-500 rounded-lg p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-lg font-bold">风险提醒</h3>
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
                <div className="flex flex-wrap gap-2">
                  {result.citedSources.map((source, i) => (
                    <Link
                      key={i}
                      href={`/knowledge-cards/${source.cardId}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg
                                 text-xs font-medium text-gray-700 transition-all duration-200
                                 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-[1.02]
                                 border-2 border-transparent hover:border-indigo-200"
                    >
                      <Tag className="w-3 h-3" />
                      <span className={`w-2 h-2 rounded-full ${categoryColors[source.category] || 'bg-gray-400'}`} />
                      {source.title}
                    </Link>
                  ))}
                </div>
                {result.citedSources.length === 0 && (
                  <p className="text-xs text-gray-400 italic">无引用来源</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
