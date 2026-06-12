'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import UserSwitcher from '@/components/UserSwitcher'
import {
  FileText,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  PenLine,
} from 'lucide-react'

interface PolicyBrief {
  id: string
  title: string
  summary: string
  reviewStatus: string
  createdAt: string
  generator: { id: string; name: string; role: string }
  policyLink: { id: string; title: string | null; url: string; source: string | null; customerType: string | null }
}

const reviewStatusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-100', icon: PenLine },
  pending_review: { label: '待审核', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  reviewed: { label: '已审核', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  rejected: { label: '已驳回', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
}

const customerTypeLabels: Record<string, string> = {
  restaurant: '餐饮',
  retail: '零售',
  store: '门店',
  advertising: '广告公司',
  startup: '初创公司',
  individual: '个体工商户',
}

export default function PolicyBriefsPage() {
  const [briefs, setBriefs] = useState<PolicyBrief[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchBriefs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
    })
    if (search) params.set('search', search)
    if (statusFilter) params.set('reviewStatus', statusFilter)

    try {
      const res = await fetch(`/api/policy-briefs?${params}`)
      const data = await res.json()
      setBriefs(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to fetch policy briefs:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchBriefs()
  }, [fetchBriefs])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchBriefs()
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">政策简报</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">查看和管理所有政策简报</p>
          </div>
          <UserSwitcher />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Filters */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <form onSubmit={handleSearch} className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索简报标题、摘要..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-md text-sm font-medium
                             focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-md text-sm font-medium
                           focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">全部状态</option>
                {Object.entries(reviewStatusConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-md
                           transition-all duration-200 hover:bg-gray-800 hover:scale-[1.02]"
              >
                搜索
              </button>
            </form>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-semibold text-gray-600">
              共 <span className="text-gray-900 text-lg">{total}</span> 份简报
            </span>
          </div>

          {/* List */}
          {loading ? (
            <div className="bg-white rounded-lg p-16 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="ml-3 text-gray-500 font-medium">加载中...</span>
            </div>
          ) : briefs.length === 0 ? (
            <div className="bg-white rounded-lg p-16 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium text-lg">暂无政策简报</p>
              <p className="text-gray-400 text-sm mt-2">请先提交政策链接，然后生成简报</p>
              <Link
                href="/policy-links"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-blue-500 text-white font-semibold rounded-md
                           transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02]"
              >
                前往政策链接池
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {briefs.map((brief) => {
                const rs = reviewStatusConfig[brief.reviewStatus] || reviewStatusConfig.draft
                const StatusIcon = rs.icon
                return (
                  <Link
                    key={brief.id}
                    href={`/policy-briefs/${brief.id}`}
                    className="block bg-white rounded-lg p-5 transition-all duration-200
                               hover:scale-[1.01] hover:bg-gray-50 border-2 border-transparent
                               hover:border-blue-200 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {brief.title}
                          </h3>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${rs.bg} ${rs.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {rs.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">{brief.summary}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <ExternalLink className="w-3.5 h-3.5" />
                            {brief.policyLink.source || '政策链接'}
                          </span>
                          {brief.policyLink.customerType && (
                            <span>{customerTypeLabels[brief.policyLink.customerType] || brief.policyLink.customerType}</span>
                          )}
                          <span>生成者：{brief.generator.name}</span>
                          <span>{new Date(brief.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all mt-1" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {total > 10 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-md text-sm font-semibold border-2 border-gray-200
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-gray-100 transition-all"
              >
                上一页
              </button>
              <span className="px-4 py-2 text-sm font-semibold text-gray-600">
                第 {page} / {Math.ceil(total / 10)} 页
              </span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(total / 10), p + 1))}
                disabled={page >= Math.ceil(total / 10)}
                className="px-4 py-2 rounded-md text-sm font-semibold border-2 border-gray-200
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-gray-100 transition-all"
              >
                下一页
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
