'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Filter,
  ChevronDown,
  Flame,
  Zap,
} from 'lucide-react'

interface KnowledgeGap {
  id: string
  question: string
  department: string | null
  topic: string | null
  frequency: number
  priority: string
  status: string
  suggestedAction: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
}

interface GapStats {
  pending: number
  in_progress: number
  resolved: number
  ignored: number
  total: number
}

const priorityLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-gray-400',
}

const statusLabels: Record<string, string> = {
  pending: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
  ignored: '已忽略',
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  in_progress: 'bg-blue-500',
  resolved: 'bg-emerald-500',
  ignored: 'bg-gray-400',
}

const actionLabels: Record<string, string> = {
  create_card: '创建知识卡',
  update_card: '更新知识卡',
  rewrite_card: '重写知识卡',
}

export default function KnowledgeGapsPage() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([])
  const [stats, setStats] = useState<GapStats | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchGaps = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterPriority) params.set('priority', filterPriority)
    params.set('page', page.toString())
    params.set('pageSize', '20')

    try {
      const res = await fetch(`/api/knowledge-gaps?${params.toString()}`, {
        credentials: 'same-origin',
      })
      const data = await res.json()
      setGaps(data.items)
      setTotalPages(data.totalPages)
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch knowledge gaps:', error)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterPriority, page])

  useEffect(() => {
    fetchGaps()
  }, [fetchGaps])

  const handleStatusChange = async (gapId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/knowledge-gaps/${gapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'same-origin',
      })

      if (res.ok) {
        fetchGaps()
      } else {
        const error = await res.json()
        alert(error.error || '操作失败')
      }
    } catch (error) {
      console.error('Failed to update gap:', error)
    }
  }

  const clearFilters = () => {
    setFilterStatus('')
    setFilterPriority('')
    setPage(1)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/knowledge-hub"
            className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg
                       text-gray-600 hover:bg-gray-200 hover:text-gray-900
                       transition-all duration-200"
            title="返回知识中台"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              知识缺口管理
            </h1>
            <p className="text-sm text-gray-500 mt-1 ml-15">
              Agent 自动检测高频未覆盖问题，自动生成知识卡草稿，导师审核后发布
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">待处理</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900">{stats.pending}</div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">处理中</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900">{stats.in_progress}</div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">已解决</span>
              </div>
              <div className="text-3xl font-extrabold text-green-600">{stats.resolved}</div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Flame className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">高优先级</span>
              </div>
              <div className="text-3xl font-extrabold text-red-600">
                {gaps.filter((g) => g.priority === 'high').length}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm
                         transition-all duration-200 hover:scale-[1.02] border-4
                         ${showFilters
                           ? 'bg-purple-100 text-purple-700 border-purple-300'
                           : 'bg-gray-100 text-gray-700 border-gray-300'
                         }`}
            >
              <Filter className="w-4 h-4" />
              筛选
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>
            {filterStatus || filterPriority ? (
              <button
                onClick={clearFilters}
                className="text-sm text-purple-600 font-semibold hover:text-purple-800 transition-colors"
              >
                清除筛选
              </button>
            ) : null}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                  状态
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
                  className="w-full px-4 py-2.5 bg-gray-100 rounded-lg text-sm
                             border-2 border-transparent focus:border-purple-500 focus:bg-white
                             outline-none transition-all duration-200"
                >
                  <option value="">全部状态</option>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                  优先级
                </label>
                <select
                  value={filterPriority}
                  onChange={(e) => { setFilterPriority(e.target.value); setPage(1) }}
                  className="w-full px-4 py-2.5 bg-gray-100 rounded-lg text-sm
                             border-2 border-transparent focus:border-purple-500 focus:bg-white
                             outline-none transition-all duration-200"
                >
                  <option value="">全部优先级</option>
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Gaps List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : gaps.length === 0 ? (
          <div className="bg-white rounded-lg p-20 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-2">暂无知识缺口</p>
            <p className="text-sm text-gray-500">当前没有待处理的知识缺口</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gaps.map((gap) => (
              <div
                key={gap.id}
                className={`bg-white rounded-lg p-5 border-l-4 transition-all duration-200 hover:shadow-sm ${
                  gap.priority === 'high' ? 'border-l-red-500' :
                  gap.priority === 'medium' ? 'border-l-amber-500' : 'border-l-gray-400'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-white ${
                        priorityColors[gap.priority]
                      }`}>
                        {gap.priority === 'high' && <Flame className="w-3 h-3" />}
                        {priorityLabels[gap.priority]}优先级
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-white ${
                        statusColors[gap.status]
                      }`}>
                        {statusLabels[gap.status]}
                      </span>
                      {gap.topic && (
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                          {gap.topic}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        被问 {gap.frequency} 次
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">{gap.question}</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {gap.suggestedAction && (
                        <span className="flex items-center gap-1">
                          建议：{actionLabels[gap.suggestedAction] || gap.suggestedAction}
                        </span>
                      )}
                      <span>创建于 {formatDate(gap.createdAt)}</span>
                      {gap.resolvedAt && (
                        <span className="text-green-600">解决于 {formatDate(gap.resolvedAt)}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {gap.status === 'pending' && (
                      <span className="flex items-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        等待 Agent 处理
                      </span>
                    )}
                    {gap.status === 'in_progress' && (
                      <span className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                        <Zap className="w-3.5 h-3.5" />
                        Agent 已生成知识卡，待导师审核
                      </span>
                    )}
                    {gap.status === 'resolved' && (
                      <span className="flex items-center gap-1.5 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        已解决
                      </span>
                    )}
                    {gap.status === 'ignored' && (
                      <button
                        onClick={() => handleStatusChange(gap.id, 'pending')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-200 text-gray-600 rounded-lg
                                   text-xs font-semibold transition-all duration-200 hover:scale-[1.02]"
                      >
                        重新打开
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

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
                                 ? 'bg-purple-500 text-white border-4 border-purple-600'
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
