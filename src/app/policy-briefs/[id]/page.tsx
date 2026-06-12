'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import UserSwitcher from '@/components/UserSwitcher'
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  PenLine,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Target,
  Shield,
  Building,
  Users,
  Link2,
  Send,
} from 'lucide-react'

interface PolicyBriefDetail {
  id: string
  title: string
  summary: string
  applicableTo: string | null
  keyClauses: string | null
  actionSuggestions: string | null
  riskReminders: string | null
  sourceUrl: string | null
  reviewStatus: string
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  generator: { id: string; name: string; role: string }
  policyLink: {
    id: string
    title: string | null
    url: string
    source: string | null
    customerType: string | null
    submitter: { id: string; name: string; role: string }
    department: { id: string; name: string } | null
  }
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

export default function PolicyBriefDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [brief, setBrief] = useState<PolicyBriefDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Editable fields
  const [editForm, setEditForm] = useState({
    title: '',
    summary: '',
    applicableTo: '',
    keyClauses: '',
    actionSuggestions: '',
    riskReminders: '',
  })

  const fetchBrief = useCallback(async () => {
    try {
      const res = await fetch(`/api/policy-briefs/${id}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setBrief(data)
      setEditForm({
        title: data.title || '',
        summary: data.summary || '',
        applicableTo: data.applicableTo ? (tryParseJsonArray(data.applicableTo) || data.applicableTo) : '',
        keyClauses: data.keyClauses || '',
        actionSuggestions: data.actionSuggestions || '',
        riskReminders: data.riskReminders || '',
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchBrief()
  }, [fetchBrief])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      const res = await fetch(`/api/policy-briefs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          summary: editForm.summary,
          applicableTo: editForm.applicableTo,
          keyClauses: editForm.keyClauses,
          actionSuggestions: editForm.actionSuggestions,
          riskReminders: editForm.riskReminders,
        }),
      })

      if (!res.ok) throw new Error('保存失败')
      await fetchBrief()
      setEditing(false)
      setSuccess('简报已保存')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleReview = async (status: 'reviewed' | 'rejected') => {
    try {
      setSaving(true)
      setError('')
      const currentUserId = localStorage.getItem('currentUserId') || '1'
      const res = await fetch(`/api/policy-briefs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus: status,
          reviewerId: currentUserId,
        }),
      })

      if (!res.ok) throw new Error('审核操作失败')
      await fetchBrief()
      setSuccess(status === 'reviewed' ? '简报已审核通过' : '简报已驳回')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '审核操作失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitForReview = async () => {
    try {
      setSaving(true)
      setError('')
      const res = await fetch(`/api/policy-briefs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: 'pending_review' }),
      })

      if (!res.ok) throw new Error('提交审核失败')
      await fetchBrief()
      setSuccess('已提交审核')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交审核失败')
    } finally {
      setSaving(false)
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

  if (!brief) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg font-medium">简报不存在</p>
            <Link href="/policy-briefs" className="text-blue-500 text-sm font-semibold mt-2 inline-block hover:underline">
              返回列表
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const rs = reviewStatusConfig[brief.reviewStatus] || reviewStatusConfig.draft
  const StatusIcon = rs.icon

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/policy-briefs"
                className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回列表
              </Link>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight max-w-lg truncate">
              {brief.title}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${rs.bg} ${rs.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {rs.label}
              </span>
              <span className="text-sm text-gray-500 font-medium">
                由 {brief.generator.name} 生成
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Action buttons */}
            {brief.reviewStatus === 'draft' && (
              <button
                onClick={() => setEditing(!editing)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-md
                           text-sm transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02]"
              >
                <PenLine className="w-4 h-4" />
                编辑简报
              </button>
            )}
            {brief.reviewStatus === 'draft' && (
              <button
                onClick={handleSubmitForReview}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white font-bold rounded-md
                           text-sm transition-all duration-200 hover:bg-amber-600 hover:scale-[1.02] border-4 border-amber-500
                           disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                提交审核
              </button>
            )}
            {brief.reviewStatus === 'pending_review' && (
              <>
                <button
                  onClick={() => handleReview('reviewed')}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white font-bold rounded-md
                             text-sm transition-all duration-200 hover:bg-emerald-600 hover:scale-[1.02] border-4 border-emerald-500
                             disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  审核通过
                </button>
                <button
                  onClick={() => handleReview('rejected')}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white font-bold rounded-md
                             text-sm transition-all duration-200 hover:bg-red-600 hover:scale-[1.02] border-4 border-red-500
                             disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  驳回
                </button>
              </>
            )}
            {brief.reviewStatus === 'reviewed' && (
              <Link
                href={`/push-records/new?briefId=${brief.id}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white font-bold rounded-md
                           text-sm transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02] border-4 border-blue-500"
              >
                <Send className="w-4 h-4" />
                推送此简报
              </Link>
            )}
            <UserSwitcher />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-emerald-700">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Summary */}
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  摘要
                </h2>
                {editing ? (
                  <textarea
                    value={editForm.summary}
                    onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md text-sm font-medium
                               focus:outline-none focus:border-blue-500 transition-colors resize-y"
                  />
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed">{brief.summary}</p>
                )}
              </div>

              {/* Applicable To */}
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  适用对象
                </h2>
                {editing ? (
                  <input
                    type="text"
                    value={editForm.applicableTo}
                    onChange={(e) => setEditForm({ ...editForm, applicableTo: e.target.value })}
                    placeholder="例如：个体工商户、小微企业"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md text-sm font-medium
                               focus:outline-none focus:border-blue-500 transition-colors"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const items = tryParseJsonArray(brief.applicableTo || '[]')
                      if (items) {
                        return items.map((item: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md text-sm font-semibold">
                            {item}
                          </span>
                        ))
                      }
                      return <span className="text-sm text-gray-500">{brief.applicableTo || '未指定'}</span>
                    })()}
                  </div>
                )}
              </div>

              {/* Key Clauses */}
              <SectionCard
                title="关键条款"
                icon={<Target className="w-5 h-5 text-amber-500" />}
                editing={editing}
                value={editForm.keyClauses}
                rawValue={brief.keyClauses}
                onChange={(v) => setEditForm({ ...editForm, keyClauses: v })}
                bgColor="bg-amber-50"
              />

              {/* Action Suggestions */}
              <SectionCard
                title="行动建议"
                icon={<Lightbulb className="w-5 h-5 text-emerald-500" />}
                editing={editing}
                value={editForm.actionSuggestions}
                rawValue={brief.actionSuggestions}
                onChange={(v) => setEditForm({ ...editForm, actionSuggestions: v })}
                bgColor="bg-emerald-50"
              />

              {/* Risk Reminders */}
              <SectionCard
                title="风险提醒"
                icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                editing={editing}
                value={editForm.riskReminders}
                rawValue={brief.riskReminders}
                onChange={(v) => setEditForm({ ...editForm, riskReminders: v })}
                bgColor="bg-red-50"
              />

              {/* Edit Actions */}
              {editing && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white font-bold rounded-md
                               transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02] border-4 border-blue-500
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" strokeWidth={2.5} />
                    )}
                    {saving ? '保存中...' : '保存修改'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); fetchBrief() }}
                    className="px-6 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-md
                               transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02]"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Source Traceability */}
              <div className="bg-white rounded-lg p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-500" />
                  来源追溯
                </h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">政策来源</p>
                    <Link
                      href={`/policy-links/${brief.policyLink.id}`}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors flex items-center gap-1"
                    >
                      <span className="truncate">{brief.policyLink.title || '政策链接'}</span>
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    </Link>
                    {brief.policyLink.source && (
                      <p className="text-xs text-gray-500 mt-1">{brief.policyLink.source}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">原始链接</p>
                    <a
                      href={brief.policyLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 break-all hover:underline"
                    >
                      {brief.policyLink.url}
                    </a>
                  </div>
                  {brief.policyLink.customerType && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">适用客户</p>
                      <p className="text-sm font-medium text-gray-700">
                        {customerTypeLabels[brief.policyLink.customerType] || brief.policyLink.customerType}
                      </p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">提交者</p>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        {brief.policyLink.submitter.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{brief.policyLink.submitter.name}</span>
                    </div>
                  </div>
                  {brief.policyLink.department && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">部门</p>
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-gray-400" />
                        {brief.policyLink.department.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-white rounded-lg p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">简报信息</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-gray-500">生成者</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        {brief.generator.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-700">{brief.generator.name}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500">创建时间</p>
                    <p className="font-medium text-gray-700 mt-1">{new Date(brief.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500">更新时间</p>
                    <p className="font-medium text-gray-700 mt-1">{new Date(brief.updatedAt).toLocaleString('zh-CN')}</p>
                  </div>
                  {brief.reviewedAt && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500">审核时间</p>
                      <p className="font-medium text-gray-700 mt-1">{new Date(brief.reviewedAt).toLocaleString('zh-CN')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// Helper: parse JSON array string safely
function tryParseJsonArray(str: string): string[] | null {
  try {
    const parsed = JSON.parse(str)
    if (Array.isArray(parsed)) return parsed
    return null
  } catch {
    return null
  }
}

// Reusable section card for editing/displaying text content
function SectionCard({
  title,
  icon,
  editing,
  value,
  rawValue,
  onChange,
  bgColor,
}: {
  title: string
  icon: React.ReactNode
  editing: boolean
  value: string
  rawValue: string | null
  onChange: (v: string) => void
  bgColor: string
}) {
  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-md text-sm font-medium
                     focus:outline-none focus:border-blue-500 transition-colors resize-y"
        />
      ) : (
        <div className={`${bgColor} rounded-lg p-4`}>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-[family-name:var(--font-outfit)] leading-relaxed">
            {rawValue || '暂无内容'}
          </pre>
        </div>
      )}
    </div>
  )
}
