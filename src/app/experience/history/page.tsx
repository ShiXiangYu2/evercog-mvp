'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  History,
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  FileText,
  Tag,
  ChevronDown,
  ChevronUp,
  User,
  ArrowLeft,
  BookOpen,
} from 'lucide-react'

interface Caller {
  id: string
  name: string
  role: string
  department: { name: string }
}

interface ExperienceQueryItem {
  id: string
  question: string
  callerId: string
  caller: Caller
  retrievedCards: string | null
  generatedReply: string | null
  policyExplanation: string | null
  serviceOpportunity: string | null
  salesScript: string | null
  riskReminder: string | null
  citedSources: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface PaginatedResponse {
  items: ExperienceQueryItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const statusLabels: Record<string, string> = {
  pending: '待处理',
  generated: '已生成',
  reviewed: '已审核',
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  generated: 'bg-emerald-500',
  reviewed: 'bg-blue-500',
}

const roleLabels: Record<string, string> = {
  sales: '销售',
  customer_service: '客服',
  operations: '运营',
  finance: '财务',
  mentor: '导师',
  trainee: '新人',
  admin: '管理员',
  ai_info: 'AI 工程师',
}

const roleColors: Record<string, string> = {
  sales: 'bg-blue-500 text-white',
  customer_service: 'bg-emerald-500 text-white',
  operations: 'bg-purple-500 text-white',
  finance: 'bg-amber-500 text-white',
  mentor: 'bg-indigo-500 text-white',
  trainee: 'bg-pink-500 text-white',
  admin: 'bg-red-500 text-white',
  ai_info: 'bg-cyan-500 text-white',
}

export default function ExperienceHistoryPage() {
  const [items, setItems] = useState<ExperienceQueryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', page.toString())
    params.set('pageSize', '10')

    try {
      const res = await fetch(`/api/experience/history?${params.toString()}`)
      const data: PaginatedResponse = await res.json()
      setItems(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const parseReply = (replyStr: string | null) => {
    if (!replyStr) return null
    try {
      return JSON.parse(replyStr)
    } catch {
      return null
    }
  }

  const parseCitedSources = (sourcesStr: string | null): Array<{ cardId: string; title: string; category: string; source: string }> => {
    if (!sourcesStr) return []
    try {
      return JSON.parse(sourcesStr)
    } catch {
      return []
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}`
  }

  return (
    <div className="min-h-screen flex flex-col">

        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                <History className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              调用历史
            </h1>
            <p className="text-sm text-gray-500 mt-1 ml-15">
              共 {total} 条调用记录
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/experience"
              className="flex items-center gap-2 px-5 py-3 bg-indigo-500 text-white rounded-lg
                         font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                         border-4 border-indigo-600"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2} />
              返回问答
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Search Bar */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索问题内容..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-lg text-sm
                             border-2 border-transparent focus:border-indigo-500 focus:bg-white
                             outline-none transition-all duration-200"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-indigo-500 text-white rounded-lg font-semibold text-sm
                           transition-all duration-200 hover:scale-[1.02] border-4 border-indigo-600"
              >
                搜索
              </button>
            </div>
          </div>

          {/* History List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-lg p-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-2">暂无调用记录</p>
              <p className="text-sm text-gray-500 mb-6">去经验问答页面提交您的第一个问题</p>
              <Link
                href="/experience"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-lg
                           font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                           border-4 border-indigo-600"
              >
                <MessageSquare className="w-5 h-5" />
                去提问
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const isExpanded = expandedId === item.id
                const reply = parseReply(item.generatedReply)
                const citedSources = parseCitedSources(item.citedSources)

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg overflow-hidden transition-all duration-200
                               border-4 border-transparent hover:border-indigo-100"
                  >
                    {/* Question Row */}
                    <div
                      className="p-6 cursor-pointer flex items-start gap-4"
                      onClick={() => toggleExpand(item.id)}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {item.caller.name.charAt(0)}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 mb-2 line-clamp-2">
                          {item.question}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs font-medium text-gray-600">
                            <User className="w-3 h-3" />
                            {item.caller.name}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-white ${roleColors[item.caller.role] || 'bg-gray-400 text-white'}`}>
                            {roleLabels[item.caller.role] || item.caller.role}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatDate(item.createdAt)}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-white ${statusColors[item.status] || 'bg-gray-400'}`}>
                            {item.status === 'generated' && <CheckCircle2 className="w-3 h-3" />}
                            {statusLabels[item.status] || item.status}
                          </span>
                          {citedSources.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 rounded text-xs font-medium text-indigo-600">
                              <BookOpen className="w-3 h-3" />
                              {citedSources.length} 个来源
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expand Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && reply && (
                      <div className="px-6 pb-6 border-t border-gray-100">
                        <div className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                          {/* Policy Explanation */}
                          <div className="bg-blue-500 rounded-lg p-5 text-white">
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="w-4 h-4" strokeWidth={2} />
                              <h4 className="text-sm font-bold">政策解释</h4>
                            </div>
                            <p className="text-xs leading-relaxed text-blue-50 whitespace-pre-wrap">
                              {reply.policyExplanation || '暂无'}
                            </p>
                          </div>

                          {/* Service Opportunity */}
                          <div className="bg-emerald-500 rounded-lg p-5 text-white">
                            <div className="flex items-center gap-2 mb-3">
                              <MessageSquare className="w-4 h-4" strokeWidth={2} />
                              <h4 className="text-sm font-bold">服务机会</h4>
                            </div>
                            <p className="text-xs leading-relaxed text-emerald-50 whitespace-pre-wrap">
                              {reply.serviceOpportunity || '暂无'}
                            </p>
                          </div>

                          {/* Sales Script */}
                          <div className="bg-amber-500 rounded-lg p-5 text-white">
                            <div className="flex items-center gap-2 mb-3">
                              <MessageSquare className="w-4 h-4" strokeWidth={2} />
                              <h4 className="text-sm font-bold">销售话术</h4>
                            </div>
                            <p className="text-xs leading-relaxed text-amber-50 whitespace-pre-wrap">
                              {reply.salesScript || '暂无'}
                            </p>
                          </div>

                          {/* Risk Reminder */}
                          <div className="bg-red-500 rounded-lg p-5 text-white">
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="w-4 h-4" strokeWidth={2} />
                              <h4 className="text-sm font-bold">风险提醒</h4>
                            </div>
                            <p className="text-xs leading-relaxed text-red-50 whitespace-pre-wrap">
                              {reply.riskReminder || '暂无'}
                            </p>
                          </div>
                        </div>

                        {/* Cited Sources */}
                        {citedSources.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-gray-500">引用来源：</span>
                            {citedSources.map((src, i) => (
                              <Link
                                key={i}
                                href={`/knowledge-cards/${src.cardId}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded
                                           text-xs font-medium text-gray-600 transition-all duration-200
                                           hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {src.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Pagination */}
               {totalPages > 1 && (
                 <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg text-sm font-semibold
                               transition-all duration-200 hover:scale-[1.02]
                               disabled:opacity-50 disabled:cursor-not-allowed
                               bg-white text-gray-700 border-4 border-gray-200"
                  >
                    上一页
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-lg text-sm font-bold transition-all duration-200 hover:scale-105
                                 ${p === page
                                   ? 'bg-indigo-500 text-white border-4 border-indigo-600'
                                   : 'bg-white text-gray-700 border-4 border-gray-200'
                                 }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-lg text-sm font-semibold
                               transition-all duration-200 hover:scale-[1.02]
                               disabled:opacity-50 disabled:cursor-not-allowed
                               bg-white text-gray-700 border-4 border-gray-200"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
  )
}
