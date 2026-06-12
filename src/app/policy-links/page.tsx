'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import UserSwitcher from '@/components/UserSwitcher'
import {
  Link2,
  Plus,
  Search,
  ExternalLink,
  FileText,
  Clock,
  CheckCircle,
  Archive,
  Filter,
  ChevronRight,
  Loader2,
} from 'lucide-react'

interface PolicyLink {
  id: string
  url: string
  title: string | null
  source: string | null
  status: string
  customerType: string | null
  createdAt: string
  submitter: { id: string; name: string; role: string }
  department: { id: string; name: string } | null
  brief: { id: string; title: string; reviewStatus: string } | null
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  submitted: { label: '已提交', color: 'text-blue-700', bg: 'bg-blue-100' },
  collected: { label: '已采集', color: 'text-purple-700', bg: 'bg-purple-100' },
  brief_generated: { label: '已生成简报', color: 'text-amber-700', bg: 'bg-amber-100' },
  reviewed: { label: '已审核', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  pushed: { label: '已推送', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  archived: { label: '已归档', color: 'text-gray-600', bg: 'bg-gray-100' },
}

const customerTypeLabels: Record<string, string> = {
  restaurant: '餐饮',
  retail: '零售',
  store: '门店',
  advertising: '广告公司',
  startup: '初创公司',
  individual: '个体工商户',
}

export default function PolicyLinksPage() {
  const [links, setLinks] = useState<PolicyLink[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
    })
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (customerFilter) params.set('customerType', customerFilter)

    try {
      const res = await fetch(`/api/policy-links?${params}`)
      const data = await res.json()
      setLinks(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to fetch policy links:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, customerFilter])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLinks()
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">政策链接池</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">管理所有提交的政策链接</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/policy-links/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white font-semibold rounded-md
                         transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02] border-4 border-blue-500"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              新增政策链接
            </Link>
            <UserSwitcher />
          </div>
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
                  placeholder="搜索政策标题、来源..."
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
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={customerFilter}
                onChange={(e) => { setCustomerFilter(e.target.value); setPage(1) }}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-md text-sm font-medium
                           focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">全部客户类型</option>
                {Object.entries(customerTypeLabels).map(([key, label]) => (
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
              共 <span className="text-gray-900 text-lg">{total}</span> 条政策链接
            </span>
          </div>

          {/* List */}
          {loading ? (
            <div className="bg-white rounded-lg p-16 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="ml-3 text-gray-500 font-medium">加载中...</span>
            </div>
          ) : links.length === 0 ? (
            <div className="bg-white rounded-lg p-16 text-center">
              <Link2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium text-lg">暂无政策链接</p>
              <p className="text-gray-400 text-sm mt-2">点击"新增政策链接"按钮添加</p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => {
                const st = statusConfig[link.status] || statusConfig.submitted
                return (
                  <Link
                    key={link.id}
                    href={`/policy-links/${link.id}`}
                    className="block bg-white rounded-lg p-5 transition-all duration-200
                               hover:scale-[1.01] hover:bg-gray-50 border-2 border-transparent
                               hover:border-blue-200 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {link.title || '未命名政策'}
                          </h3>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${st.bg} ${st.color}`}>
                            {st.label}
                          </span>
                          {link.customerType && (
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 whitespace-nowrap">
                              {customerTypeLabels[link.customerType] || link.customerType}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {link.source && (
                            <span className="flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5" />
                              {link.source}
                            </span>
                          )}
                          <span>{link.submitter.name}</span>
                          {link.department && <span>{link.department.name}</span>}
                          <span>{new Date(link.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                        {link.brief && (
                          <div className="mt-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-medium text-amber-600">
                              简报：{link.brief.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              link.brief.reviewStatus === 'reviewed' ? 'bg-emerald-100 text-emerald-700' :
                              link.brief.reviewStatus === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {link.brief.reviewStatus === 'reviewed' ? '已审核' :
                               link.brief.reviewStatus === 'pending_review' ? '待审核' : '草稿'}
                            </span>
                          </div>
                        )}
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
