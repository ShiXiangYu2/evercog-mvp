'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import UserSwitcher from '@/components/UserSwitcher'
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Tag,
  ChevronDown,
  Eye,
  Edit3,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  AlertTriangle,
  FileText,
  HelpCircle,
  Shield,
  Briefcase,
  FolderOpen,
} from 'lucide-react'

interface KnowledgeCard {
  id: string
  title: string
  category: string
  tags: string | null
  content: string
  departmentId: string | null
  customerType: string | null
  source: string | null
  riskNotes: string | null
  visibilityScope: string
  status: string
  version: number
  creatorId: string
  creator: { id: string; name: string; role: string }
  reviewer: { id: string; name: string } | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface PaginatedResponse {
  items: KnowledgeCard[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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

const categoryIcons: Record<string, React.ElementType> = {
  data_checklist: FileText,
  tax_process: Clock,
  risk_reminder: AlertTriangle,
  service_boundary: Shield,
  faq: HelpCircle,
  experience: Briefcase,
}

const statusLabels: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  published: '已发布',
  rejected: '已驳回',
  archived: '已归档',
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-400',
  pending_review: 'bg-amber-500',
  published: 'bg-emerald-500',
  rejected: 'bg-red-500',
  archived: 'bg-gray-600',
}

const statusIcons: Record<string, React.ElementType> = {
  draft: Edit3,
  pending_review: Clock,
  published: CheckCircle2,
  rejected: XCircle,
  archived: Archive,
}

const customerTypeLabels: Record<string, string> = {
  restaurant: '餐饮',
  retail: '零售',
  store: '门店',
  advertising: '广告公司',
  startup: '初创公司',
  individual: '个体工商户',
}

export default function KnowledgeCardsPage() {
  const [cards, setCards] = useState<KnowledgeCard[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCustomerType, setFilterCustomerType] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterCategory) params.set('category', filterCategory)
    if (filterStatus) params.set('status', filterStatus)
    if (filterCustomerType) params.set('customerType', filterCustomerType)
    params.set('page', page.toString())
    params.set('pageSize', '12')

    try {
      const res = await fetch(`/api/knowledge-cards?${params.toString()}`)
      const data: PaginatedResponse = await res.json()
      setCards(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Failed to fetch knowledge cards:', error)
    } finally {
      setLoading(false)
    }
  }, [search, filterCategory, filterStatus, filterCustomerType, page])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearFilters = () => {
    setSearch('')
    setSearchInput('')
    setFilterCategory('')
    setFilterStatus('')
    setFilterCustomerType('')
    setPage(1)
  }

  const hasActiveFilters = search || filterCategory || filterStatus || filterCustomerType

  const parseTags = (tagsStr: string | null): string[] => {
    if (!tagsStr) return []
    try {
      return JSON.parse(tagsStr)
    } catch {
      return []
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
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              知识卡管理
            </h1>
            <p className="text-sm text-gray-500 mt-1 ml-15">
              共 {total} 张知识卡
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/knowledge-cards/new"
              className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg
                         font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                         border-4 border-purple-600"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              新建知识卡
            </Link>
            <UserSwitcher />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Search and Filters */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索知识卡标题或内容..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-lg text-sm
                             border-2 border-transparent focus:border-purple-500 focus:bg-white
                             outline-none transition-all duration-200"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold text-sm
                           transition-all duration-200 hover:scale-[1.02] border-4 border-purple-600"
              >
                搜索
              </button>
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
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                    分类
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
                    className="w-full px-4 py-2.5 bg-gray-100 rounded-lg text-sm
                               border-2 border-transparent focus:border-purple-500 focus:bg-white
                               outline-none transition-all duration-200"
                  >
                    <option value="">全部分类</option>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
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
                    客户类型
                  </label>
                  <select
                    value={filterCustomerType}
                    onChange={(e) => { setFilterCustomerType(e.target.value); setPage(1) }}
                    className="w-full px-4 py-2.5 bg-gray-100 rounded-lg text-sm
                               border-2 border-transparent focus:border-purple-500 focus:bg-white
                               outline-none transition-all duration-200"
                  >
                    <option value="">全部类型</option>
                    {Object.entries(customerTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                {hasActiveFilters && (
                  <div className="col-span-3">
                    <button
                      onClick={clearFilters}
                      className="text-sm text-purple-600 font-semibold hover:text-purple-800
                                 transition-colors duration-200"
                    >
                      清除所有筛选
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : cards.length === 0 ? (
            <div className="bg-white rounded-lg p-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-2">暂无知识卡</p>
              <p className="text-sm text-gray-500 mb-6">点击「新建知识卡」开始创建您的第一个知识卡</p>
              <Link
                href="/knowledge-cards/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg
                           font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                           border-4 border-purple-600"
              >
                <Plus className="w-5 h-5" />
                新建知识卡
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((card) => {
                  const CatIcon = categoryIcons[card.category] || FileText
                  const StatusIcon = statusIcons[card.status] || Edit3
                  const tags = parseTags(card.tags)

                  return (
                    <Link
                      key={card.id}
                      href={`/knowledge-cards/${card.id}`}
                      className="group bg-white rounded-lg p-5 transition-all duration-200
                                 hover:scale-[1.02] border-4 border-transparent hover:border-purple-200"
                    >
                      {/* Category Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                                          text-xs font-bold text-white ${categoryColors[card.category]}`}>
                          <CatIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                          {categoryLabels[card.category]}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md
                                          text-xs font-semibold text-white ${statusColors[card.status]}`}>
                          <StatusIcon className="w-3 h-3" strokeWidth={2.5} />
                          {statusLabels[card.status]}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2
                                     group-hover:text-purple-600 transition-colors duration-200">
                        {card.title}
                      </h3>

                      {/* Content Preview */}
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {card.content.replace(/[#*\n]/g, ' ').substring(0, 100)}
                      </p>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {tags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100
                                         text-gray-600 rounded text-xs font-medium"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                          {tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {card.creator.name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{card.creator.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          v{card.version}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>

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
            </>
          )}
        </main>
      </div>
    </div>
  )
}
