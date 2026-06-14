'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Send,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Mail,
  MessageSquare,
  Smartphone,
  Building2,
  Users,
  User,
  XCircle,
} from 'lucide-react'

interface PushRecord {
  id: string
  channel: string
  targetType: string
  targetId: string | null
  targetName: string | null
  status: string
  readStatus: string
  payloadSnapshot: string | null
  sentAt: string | null
  readAt: string | null
  createdAt: string
  policyBrief: {
    id: string
    title: string
    summary: string
  }
  pusher: {
    id: string
    name: string
    role: string
  }
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: '待发送', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  sent: { label: '已发送', color: 'text-blue-700', bg: 'bg-blue-100', icon: Send },
  delivered: { label: '已送达', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  failed: { label: '发送失败', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
}

const readStatusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  unread: { label: '未读', color: 'text-gray-600', bg: 'bg-gray-100', icon: EyeOff },
  read: { label: '已读', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: Eye },
}

const channelConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  wecom: { label: '企业微信', color: 'text-blue-700', bg: 'bg-blue-100', icon: MessageSquare },
  email: { label: '邮件', color: 'text-purple-700', bg: 'bg-purple-100', icon: Mail },
  sms: { label: '短信', color: 'text-amber-700', bg: 'bg-amber-100', icon: Smartphone },
}

const targetTypeConfig: Record<string, { label: string; icon: React.ElementType }> = {
  department: { label: '部门', icon: Building2 },
  role: { label: '角色', icon: Users },
  user: { label: '用户', icon: User },
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

export default function PushRecordsPage() {
  const [records, setRecords] = useState<PushRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [readStatusFilter, setReadStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [markingRead, setMarkingRead] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
    })
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (readStatusFilter) params.set('readStatus', readStatusFilter)
    if (channelFilter) params.set('channel', channelFilter)

    try {
      const res = await fetch(`/api/push-records?${params}`)
      const data = await res.json()
      setRecords(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to fetch push records:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, readStatusFilter, channelFilter])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchRecords()
  }

  const handleMarkAsRead = async (recordId: string) => {
    setMarkingRead(recordId)
    try {
      const res = await fetch(`/api/push-records/${recordId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        fetchRecords()
      }
    } catch (err) {
      console.error('Failed to mark as read:', err)
    } finally {
      setMarkingRead(null)
    }
  }

  const getPayloadSummary = (snapshot: string | null) => {
    if (!snapshot) return null
    try {
      const data = JSON.parse(snapshot)
      return data.summary?.substring(0, 80) || null
    } catch {
      return null
    }
  }

  // Stats
  const stats = {
    total,
    unread: records.filter(r => r.readStatus === 'unread').length,
    sent: records.filter(r => r.status === 'sent').length,
  }

  return (
    <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">推送记录</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">模拟企微推送记录管理</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/push-records/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white font-semibold rounded-md
                         transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02] border-4 border-blue-600"
            >
              <Plus className="w-5 h-5" />
              新建推送
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-5 border-2 border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-md flex items-center justify-center">
                  <Send className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-gray-900">{stats.total}</p>
                  <p className="text-xs font-semibold text-gray-500">总推送数</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-5 border-2 border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-md flex items-center justify-center">
                  <EyeOff className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-gray-900">{stats.unread}</p>
                  <p className="text-xs font-semibold text-gray-500">未读消息</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-5 border-2 border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-md flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-gray-900">{stats.sent}</p>
                  <p className="text-xs font-semibold text-gray-500">已发送</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <form onSubmit={handleSearch} className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索目标名称、简报标题..."
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
                value={readStatusFilter}
                onChange={(e) => { setReadStatusFilter(e.target.value); setPage(1) }}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-md text-sm font-medium
                           focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">全部阅读状态</option>
                {Object.entries(readStatusConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={channelFilter}
                onChange={(e) => { setChannelFilter(e.target.value); setPage(1) }}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-md text-sm font-medium
                           focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">全部渠道</option>
                {Object.entries(channelConfig).map(([key, { label }]) => (
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

          {/* List */}
          {loading ? (
            <div className="bg-white rounded-lg p-16 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="ml-3 text-gray-500 font-medium">加载中...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-lg p-16 text-center">
              <Send className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium text-lg">暂无推送记录</p>
              <p className="text-gray-400 text-sm mt-2">从已审核的政策简报创建推送</p>
              <Link
                href="/push-records/new"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-blue-500 text-white font-semibold rounded-md
                           transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02]"
              >
                <Plus className="w-5 h-5" />
                新建推送
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => {
                const rs = statusConfig[record.status] || statusConfig.pending
                const readRs = readStatusConfig[record.readStatus] || readStatusConfig.unread
                const ch = channelConfig[record.channel] || channelConfig.wecom
                const tt = targetTypeConfig[record.targetType] || targetTypeConfig.user
                const StatusIcon = rs.icon
                const ReadIcon = readRs.icon
                const ChannelIcon = ch.icon
                const TypeIcon = tt.icon
                const payloadSummary = getPayloadSummary(record.payloadSnapshot)

                return (
                  <div
                    key={record.id}
                    className={`bg-white rounded-lg p-5 transition-all duration-200 border-2 group
                               ${record.readStatus === 'unread'
                                 ? 'border-blue-200 bg-blue-50/30'
                                 : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                               }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Top row: badges */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${ch.bg} ${ch.color}`}>
                            <ChannelIcon className="w-3.5 h-3.5" />
                            {ch.label}
                          </span>
                          <span className="px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 bg-gray-100 text-gray-600">
                            <TypeIcon className="w-3.5 h-3.5" />
                            {tt.label}
                          </span>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${rs.bg} ${rs.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {rs.label}
                          </span>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${readRs.bg} ${readRs.color}`}>
                            <ReadIcon className="w-3.5 h-3.5" />
                            {readRs.label}
                          </span>
                        </div>

                        {/* Target and brief */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900">
                            {record.targetName || '未命名目标'}
                          </span>
                          {record.targetType === 'role' && record.targetId && (
                            <span className="text-xs text-gray-400">
                              ({roleLabels[record.targetId] || record.targetId})
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/policy-briefs/${record.policyBrief.id}`}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          {record.policyBrief.title}
                        </Link>

                        {payloadSummary && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{payloadSummary}</p>
                        )}

                        {/* Meta row */}
                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                          <span>推送者：{record.pusher.name}</span>
                          {record.sentAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(record.sentAt).toLocaleString('zh-CN')}
                            </span>
                          )}
                          {record.readAt && (
                            <span className="flex items-center gap-1 text-emerald-500">
                              <Eye className="w-3 h-3" />
                              已读于 {new Date(record.readAt).toLocaleString('zh-CN')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {record.readStatus === 'unread' && (
                          <button
                            onClick={() => handleMarkAsRead(record.id)}
                            disabled={markingRead === record.id}
                            className="px-3 py-2 rounded-md text-xs font-semibold
                                       bg-emerald-100 text-emerald-700 border-2 border-emerald-200
                                       transition-all duration-200 hover:bg-emerald-200 hover:scale-[1.02]
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       flex items-center gap-1"
                          >
                            {markingRead === record.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                            标记已读
                          </button>
                        )}
                        <Link
                          href={`/policy-briefs/${record.policyBrief.id}`}
                          className="p-2 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50
                                     transition-all duration-200 hover:scale-110"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
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
  )
}
