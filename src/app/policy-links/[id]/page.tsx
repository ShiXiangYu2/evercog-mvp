'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import UserSwitcher from '@/components/UserSwitcher'
import { PolicyContextCard } from '@/components/PolicyContextCard'
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle,
  Clock,
  Archive,
  ChevronRight,
  Building,
  Users,
  RefreshCw,
} from 'lucide-react'

interface PolicyLinkDetail {
  id: string
  url: string
  title: string | null
  source: string | null
  status: string
  customerType: string | null
  createdAt: string
  updatedAt: string
  submitter: { id: string; name: string; role: string }
  department: { id: string; name: string } | null
  brief: {
    id: string
    title: string
    reviewStatus: string
    summary: string
    generator: { id: string; name: string; role: string }
    createdAt: string
  } | null
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  submitted: { label: '已提交', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  collected: { label: '已采集', color: 'text-purple-700', bg: 'bg-purple-100', icon: Clock },
  brief_generated: { label: '已生成简报', color: 'text-amber-700', bg: 'bg-amber-100', icon: FileText },
  reviewed: { label: '已审核', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  pushed: { label: '已推送', color: 'text-indigo-700', bg: 'bg-indigo-100', icon: CheckCircle },
  archived: { label: '已归档', color: 'text-gray-600', bg: 'bg-gray-100', icon: Archive },
}

const customerTypeLabels: Record<string, string> = {
  restaurant: '餐饮',
  retail: '零售',
  store: '门店',
  advertising: '广告公司',
  startup: '初创公司',
  individual: '个体工商户',
}

const statusFlow = ['submitted', 'collected', 'brief_generated', 'reviewed', 'pushed', 'archived']

export default function PolicyLinkDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [link, setLink] = useState<PolicyLinkDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState('')

  const fetchLink = useCallback(async () => {
    try {
      const res = await fetch(`/api/policy-links/${id}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setLink(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchLink()
  }, [fetchLink])

  const handleGenerateBrief = async () => {
    try {
      setGenerating(true)
      setError('')
      const currentUserId = localStorage.getItem('currentUserId') || '1'
      const res = await fetch(`/api/policy-links/${id}/generate-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatorId: currentUserId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '生成简报失败')
      }

      await fetchLink()
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成简报失败')
    } finally {
      setGenerating(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdatingStatus(true)
      const res = await fetch(`/api/policy-links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('状态更新失败')
      await fetchLink()
    } catch (err) {
      setError(err instanceof Error ? err.message : '状态更新失败')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (!link) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg font-medium">政策链接不存在</p>
            <Link href="/policy-links" className="text-blue-500 text-sm font-semibold mt-2 inline-block hover:underline">
              返回列表
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const st = statusConfig[link.status] || statusConfig.submitted
  const currentStatusIndex = statusFlow.indexOf(link.status)
  const canGenerateBrief = !link.brief && ['submitted', 'collected'].includes(link.status)

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/policy-links"
                className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回列表
              </Link>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight max-w-lg truncate">
              {link.title || '未命名政策'}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${st.bg} ${st.color} flex items-center gap-1`}>
                <st.icon className="w-3.5 h-3.5" />
                {st.label}
              </span>
              {link.customerType && (
                <span className="text-sm text-gray-500 font-medium">
                  {customerTypeLabels[link.customerType] || link.customerType}
                </span>
              )}
            </div>
          </div>
          <UserSwitcher />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info Card */}
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">基本信息</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">政策链接</label>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mt-1 text-blue-600 hover:text-blue-800 font-medium text-sm
                                 transition-colors group"
                    >
                      <span className="truncate">{link.url}</span>
                      <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                  {link.source && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">来源</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">{link.source}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">提交时间</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {new Date(link.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Policy Context Card */}
              <PolicyContextCard
                context={{
                  validFrom: '2024-01-01',
                  validTo: '2027-12-31',
                  status: 'active',
                  applicableRegions: ['全国'],
                  applicableEntities: ['小微企业', '个体工商户'],
                  clauseNumbers: ['第一条', '第二款', '第三项'],
                }}
                applicability={{
                  status: 'applicable',
                  reason: '客户为小微企业，符合政策适用条件',
                }}
              />

              {/* Brief Section */}
              {link.brief ? (
                <div className="bg-white rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-500" />
                      政策简报
                    </h2>
                    <Link
                      href={`/policy-briefs/${link.brief.id}`}
                      className="flex items-center gap-1 text-sm font-semibold text-blue-500 hover:text-blue-700
                                 transition-colors group"
                    >
                      查看详情
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-2">{link.brief.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-3">{link.brief.summary}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                        link.brief.reviewStatus === 'reviewed' ? 'bg-emerald-100 text-emerald-700' :
                        link.brief.reviewStatus === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {link.brief.reviewStatus === 'reviewed' ? '已审核' :
                         link.brief.reviewStatus === 'pending_review' ? '待审核' :
                         link.brief.reviewStatus === 'rejected' ? '已驳回' : '草稿'}
                      </span>
                      <span className="text-xs text-gray-400">
                        由 {link.brief.generator.name} 生成
                      </span>
                    </div>
                  </div>
                </div>
              ) : canGenerateBrief ? (
                <div className="bg-white rounded-lg p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    生成政策简报
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    使用 AI 分析该政策链接，自动生成结构化简报，包含摘要、关键条款、行动建议和风险提醒。
                  </p>
                  <button
                    onClick={handleGenerateBrief}
                    disabled={generating}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-bold rounded-md
                               transition-all duration-200 hover:bg-amber-600 hover:scale-[1.02] border-4 border-amber-500
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        正在生成简报...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" strokeWidth={2.5} />
                        生成政策简报
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-gray-400" />
                    政策简报
                  </h2>
                  <p className="text-sm text-gray-400">该政策链接的简报状态暂不支持生成</p>
                </div>
              )}
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              {/* Submitter Info */}
              <div className="bg-white rounded-lg p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">提交信息</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-md flex items-center justify-center text-white font-bold text-sm">
                      {link.submitter.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{link.submitter.name}</p>
                      <p className="text-xs text-gray-500">{link.submitter.role === 'operations' ? '运营' : link.submitter.role}</p>
                    </div>
                  </div>
                  {link.department && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building className="w-4 h-4 text-gray-400" />
                      {link.department.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Management */}
              <div className="bg-white rounded-lg p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">状态管理</h3>
                <div className="space-y-2">
                  {statusFlow.map((status, index) => {
                    const cfg = statusConfig[status]
                    const isCurrent = link.status === status
                    const isPast = index < currentStatusIndex
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          isCurrent ? 'bg-blue-500 ring-4 ring-blue-100' :
                          isPast ? 'bg-emerald-500' : 'bg-gray-200'
                        }`} />
                        <span className={`text-sm font-medium ${
                          isCurrent ? 'text-blue-600 font-bold' :
                          isPast ? 'text-gray-500 line-through' : 'text-gray-400'
                        }`}>
                          {cfg.label}
                        </span>
                        {isCurrent && (
                          <span className="ml-auto text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                            当前
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* Quick status actions */}
                {currentStatusIndex < statusFlow.length - 1 && (
                  <button
                    onClick={() => handleStatusUpdate(statusFlow[currentStatusIndex + 1])}
                    disabled={updatingStatus}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700
                               font-semibold rounded-md text-sm transition-all duration-200
                               hover:bg-gray-200 hover:scale-[1.01] disabled:opacity-50"
                  >
                    {updatingStatus ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    推进到下一状态
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
