'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ScrollText,
  Filter,
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  Clock,
  X,
} from 'lucide-react'

interface AuditLogUser {
  id: string
  name: string
  role: string
  department: { id: string; name: string }
}

interface AuditLog {
  id: string
  userId: string
  user: AuditLogUser
  action: string
  entityType: string
  entityId: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
}

interface AuditLogDetail extends AuditLog {
  user: AuditLogUser
}

interface PaginatedResponse {
  items: AuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 操作类型配置
const actionConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  create: { label: '创建', color: 'text-emerald-700', bgColor: 'bg-emerald-500' },
  edit: { label: '编辑', color: 'text-blue-700', bgColor: 'bg-blue-500' },
  review: { label: '审核', color: 'text-purple-700', bgColor: 'bg-purple-500' },
  publish: { label: '发布', color: 'text-indigo-700', bgColor: 'bg-indigo-500' },
  reject: { label: '驳回', color: 'text-red-700', bgColor: 'bg-red-500' },
  query: { label: '查询', color: 'text-cyan-700', bgColor: 'bg-cyan-500' },
  generate: { label: '生成', color: 'text-amber-700', bgColor: 'bg-amber-500' },
  push: { label: '推送', color: 'text-pink-700', bgColor: 'bg-pink-500' },
  approve: { label: '批准', color: 'text-emerald-700', bgColor: 'bg-emerald-500' },
}

// 实体类型配置
const entityTypeConfig: Record<string, { label: string; color: string }> = {
  policy_link: { label: '政策链接', color: 'bg-blue-100 text-blue-700' },
  policy_brief: { label: '政策简报', color: 'bg-emerald-100 text-emerald-700' },
  knowledge_card: { label: '知识卡', color: 'bg-purple-100 text-purple-700' },
  experience_query: { label: '经验调用', color: 'bg-amber-100 text-amber-700' },
  sop_task: { label: 'SOP 任务', color: 'bg-indigo-100 text-indigo-700' },
  sop_submission: { label: 'SOP 提交', color: 'bg-pink-100 text-pink-700' },
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

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLogDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // 筛选状态
  const [filterAction, setFilterAction] = useState('')
  const [filterEntityType, setFilterEntityType] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  // 用户列表（用于筛选）
  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string }>>([])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterAction) params.set('action', filterAction)
    if (filterEntityType) params.set('entityType', filterEntityType)
    if (filterUserId) params.set('userId', filterUserId)
    if (filterStartDate) params.set('startDate', filterStartDate)
    if (filterEndDate) params.set('endDate', filterEndDate)
    params.set('page', page.toString())
    params.set('pageSize', '15')

    try {
      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      const data: PaginatedResponse = await res.json()
      setLogs(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }, [filterAction, filterEntityType, filterUserId, filterStartDate, filterEndDate, page])

  // 获取用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/audit-logs?pageSize=1')
        // 从审计日志中提取唯一用户
        const data = await res.json()
        const uniqueUsers = new Map<string, { id: string; name: string; role: string }>()
        for (const log of data.items) {
          if (!uniqueUsers.has(log.userId)) {
            uniqueUsers.set(log.userId, {
              id: log.userId,
              name: log.user.name,
              role: log.user.role,
            })
          }
        }
        setUsers(Array.from(uniqueUsers.values()))
      } catch {
        // 静默失败
      }
    }
    fetchUsers()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const clearFilters = () => {
    setFilterAction('')
    setFilterEntityType('')
    setFilterUserId('')
    setFilterStartDate('')
    setFilterEndDate('')
    setPage(1)
  }

  const hasActiveFilters = filterAction || filterEntityType || filterUserId || filterStartDate || filterEndDate

  const handleLogClick = async (log: AuditLog) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/audit-logs/${log.id}`)
      if (res.ok) {
        const detail: AuditLogDetail = await res.json()
        setSelectedLog(detail)
      }
    } catch (error) {
      console.error('Failed to fetch log detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const parseDetails = (detailsStr: string | null): Record<string, unknown> | null => {
    if (!detailsStr) return null
    try {
      return JSON.parse(detailsStr)
    } catch {
      return null
    }
  }

  // 按日期分组
  const groupByDate = (items: AuditLog[]) => {
    const groups: Record<string, AuditLog[]> = {}
    for (const item of items) {
      const date = new Date(item.createdAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(item)
    }
    return groups
  }

  const grouped = groupByDate(logs)

  return (
    <div className="min-h-screen flex flex-col">

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                <ScrollText className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              审计日志
            </h1>
            <p className="text-sm text-gray-500 mt-1 ml-15">
              共 {total} 条操作记录
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex gap-6">
            {/* 左侧：日志列表 */}
            <div className="flex-1 min-w-0">
              {/* 筛选栏 */}
              <div className="bg-white rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm
                                 transition-all duration-200 hover:scale-[1.02] border-4
                                 ${showFilters
                                   ? 'bg-gray-100 text-gray-700 border-gray-300'
                                   : 'bg-gray-100 text-gray-700 border-gray-300'
                                 }`}
                    >
                      <Filter className="w-4 h-4" />
                      筛选
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600
                                   rounded-md text-xs font-semibold transition-all duration-200 hover:bg-red-200"
                      >
                        <X className="w-3 h-3" />
                        清除筛选
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 font-medium">
                    {hasActiveFilters && `已筛选 · `}
                    第 {page} / {totalPages || 1} 页
                  </div>
                </div>

                {/* 筛选面板 */}
                {showFilters && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                        操作类型
                      </label>
                      <select
                        value={filterAction}
                        onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
                        className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm
                                   border-2 border-transparent focus:border-gray-500 focus:bg-white
                                   outline-none transition-all duration-200"
                      >
                        <option value="">全部</option>
                        {Object.entries(actionConfig).map(([key, cfg]) => (
                          <option key={key} value={key}>{cfg.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                        实体类型
                      </label>
                      <select
                        value={filterEntityType}
                        onChange={(e) => { setFilterEntityType(e.target.value); setPage(1) }}
                        className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm
                                   border-2 border-transparent focus:border-gray-500 focus:bg-white
                                   outline-none transition-all duration-200"
                      >
                        <option value="">全部</option>
                        {Object.entries(entityTypeConfig).map(([key, cfg]) => (
                          <option key={key} value={key}>{cfg.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                        操作人
                      </label>
                      <select
                        value={filterUserId}
                        onChange={(e) => { setFilterUserId(e.target.value); setPage(1) }}
                        className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm
                                   border-2 border-transparent focus:border-gray-500 focus:bg-white
                                   outline-none transition-all duration-200"
                      >
                        <option value="">全部</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({roleLabels[u.role]})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                        开始日期
                      </label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => { setFilterStartDate(e.target.value); setPage(1) }}
                        className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm
                                   border-2 border-transparent focus:border-gray-500 focus:bg-white
                                   outline-none transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                        结束日期
                      </label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => { setFilterEndDate(e.target.value); setPage(1) }}
                        className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm
                                   border-2 border-transparent focus:border-gray-500 focus:bg-white
                                   outline-none transition-all duration-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 时间线 */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-gray-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="bg-white rounded-lg p-20 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <ScrollText className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">暂无审计日志</p>
                  <p className="text-sm text-gray-500">系统操作将自动记录在此处</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(grouped).map(([date, items]) => (
                    <div key={date}>
                      {/* 日期标题 */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5 text-white" strokeWidth={2} />
                        </div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                          {date}
                        </h3>
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">
                          {items.length} 条记录
                        </span>
                      </div>

                      {/* 时间线条目 */}
                      <div className="ml-5 border-l-4 border-gray-200 space-y-3 pl-6">
                        {items.map((log) => {
                          const action = actionConfig[log.action] || { label: log.action, color: 'text-gray-700', bgColor: 'bg-gray-500' }
                          const entityType = entityTypeConfig[log.entityType] || { label: log.entityType, color: 'bg-gray-100 text-gray-700' }
                          const details = parseDetails(log.details)
                          const isSelected = selectedLog?.id === log.id

                          return (
                            <button
                              key={log.id}
                              onClick={() => handleLogClick(log)}
                              disabled={detailLoading}
                              className={`w-full text-left relative -ml-6 pl-8 pr-5 py-4 rounded-lg
                                         transition-all duration-200 hover:scale-[1.005]
                                         ${isSelected
                                           ? 'bg-gray-100 border-2 border-gray-400'
                                           : 'bg-white border-2 border-transparent hover:border-gray-200'
                                         }`}
                            >
                              {/* 时间线节点 */}
                              <div className={`absolute left-[-11px] top-5 w-[18px] h-[18px] rounded-full border-4 border-white
                                              ${action.bgColor}`} />

                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    {/* 操作人 */}
                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                      <div className="w-6 h-6 bg-gray-400 rounded flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                          {log.user.name.charAt(0)}
                                        </span>
                                      </div>
                                      {log.user.name}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${action.bgColor}`}>
                                      {action.label}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${entityType.color}`}>
                                      {entityType.label}
                                    </span>
                                  </div>

                                  {/* 详情摘要 */}
                                  {details && (
                                    <p className="text-sm text-gray-500 truncate">
                                      {details.title
                                        ? `"${details.title}"`
                                        : details.question
                                          ? `"${details.question}"`
                                          : details.status
                                            ? `状态变更为 ${details.status}`
                                            : ''
                                      }
                                    </p>
                                  )}
                                </div>

                                {/* 时间 */}
                                <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(log.createdAt)}
                                  <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isSelected ? 'rotate-90 text-gray-600' : ''}`} />
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {/* 分页 */}
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
                                       ? 'bg-gray-700 text-white border-4 border-gray-800'
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
            </div>

            {/* 右侧：详情面板 */}
            {selectedLog && (
              <div className="w-96 flex-shrink-0">
                <div className="bg-white rounded-lg p-6 sticky top-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-gray-900">操作详情</h3>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center
                                 transition-all duration-200 hover:bg-gray-200"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  {/* 操作人信息 */}
                  <div className="mb-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-white" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{selectedLog.user.name}</p>
                        <p className="text-xs text-gray-500">{selectedLog.user.department?.name || '未知部门'}</p>
                      </div>
                      <span className={`ml-auto px-2.5 py-1 rounded-md text-xs font-bold ${roleColors[selectedLog.user.role] || 'bg-gray-500 text-white'}`}>
                        {roleLabels[selectedLog.user.role] || selectedLog.user.role}
                      </span>
                    </div>
                  </div>

                  {/* 详情列表 */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">操作类型</label>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${actionConfig[selectedLog.action]?.bgColor || 'bg-gray-500'}`} />
                        <span className="text-sm font-semibold text-gray-900">
                          {actionConfig[selectedLog.action]?.label || selectedLog.action}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">实体类型</label>
                      <span className={`inline-flex px-2.5 py-1 rounded text-xs font-semibold ${entityTypeConfig[selectedLog.entityType]?.color || 'bg-gray-100 text-gray-700'}`}>
                        {entityTypeConfig[selectedLog.entityType]?.label || selectedLog.entityType}
                      </span>
                    </div>

                    {selectedLog.entityId && (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">实体 ID</label>
                        <p className="text-sm text-gray-700 font-mono break-all">{selectedLog.entityId}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">操作时间</label>
                      <p className="text-sm text-gray-700">{formatDate(selectedLog.createdAt)}</p>
                    </div>

                    {selectedLog.ipAddress && (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">IP 地址</label>
                        <p className="text-sm text-gray-700 font-mono">{selectedLog.ipAddress}</p>
                      </div>
                    )}

                    {selectedLog.details && (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">操作详情</label>
                        <div className="bg-gray-50 rounded-lg p-4">
                          {(() => {
                            const details = parseDetails(selectedLog.details)
                            if (!details) return <p className="text-sm text-gray-500">无详情</p>
                            return (
                              <div className="space-y-2">
                                {Object.entries(details).map(([key, value]) => (
                                  <div key={key} className="flex justify-between gap-3">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">{key}</span>
                                    <span className="text-sm text-gray-900 text-right break-all">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
