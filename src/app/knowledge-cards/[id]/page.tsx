'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  Tag,
  Send,
  CheckCircle2,
  XCircle,
  Archive,
  Clock,
  Eye,
  Trash2,
  AlertTriangle,
  FileText,
  HelpCircle,
  Shield,
  Briefcase,
  FolderOpen,
  User as UserIcon,
} from 'lucide-react'

interface KnowledgeCardData {
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

const categoryOptions = [
  { value: 'data_checklist', label: '资料清单' },
  { value: 'tax_process', label: '报税流程' },
  { value: 'risk_reminder', label: '风险提醒' },
  { value: 'service_boundary', label: '服务边界' },
  { value: 'faq', label: '常见问题' },
  { value: 'experience', label: '经验分享' },
]

const customerTypeOptions = [
  { value: 'restaurant', label: '餐饮' },
  { value: 'retail', label: '零售' },
  { value: 'store', label: '门店' },
  { value: 'advertising', label: '广告公司' },
  { value: 'startup', label: '初创公司' },
  { value: 'individual', label: '个体工商户' },
]

const visibilityOptions = [
  { value: 'department', label: '部门内可见' },
  { value: 'role', label: '角色可见' },
  { value: 'public', label: '全员可见' },
]

export default function KnowledgeCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [card, setCard] = useState<KnowledgeCardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null)

  const [form, setForm] = useState({
    title: '',
    category: '',
    content: '',
    departmentId: '',
    customerType: '',
    source: '',
    riskNotes: '',
    visibilityScope: 'department',
    tags: [] as string[],
  })

  const fetchCard = useCallback(async () => {
    try {
      const res = await fetch(`/api/knowledge-cards/${id}`)
      if (res.ok) {
        const data: KnowledgeCardData = await res.json()
        setCard(data)
        setForm({
          title: data.title,
          category: data.category,
          content: data.content,
          departmentId: data.departmentId || '',
          customerType: data.customerType || '',
          source: data.source || '',
          riskNotes: data.riskNotes || '',
          visibilityScope: data.visibilityScope,
          tags: data.tags ? JSON.parse(data.tags) : [],
        })
      } else {
        router.push('/knowledge-cards')
      }
    } catch (error) {
      console.error('Failed to fetch knowledge card:', error)
      router.push('/knowledge-cards')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchCard()
    const userId = localStorage.getItem('currentUserId') || '4'
    // Map userId to role for demo
    const roleMap: Record<string, string> = {
      '1': 'sales',
      '2': 'customer_service',
      '3': 'operations',
      '4': 'finance',
      '5': 'mentor',
      '6': 'trainee',
      '7': 'admin',
      '8': 'ai_info',
    }
    setCurrentUser({ id: userId, name: '', role: roleMap[userId] || 'finance' })
  }, [fetchCard])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const handleSave = async () => {
    if (!currentUser) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/knowledge-cards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          userId: currentUser.id,
        }),
      })
      if (res.ok) {
        await fetchCard()
        setEditing(false)
      } else {
        const error = await res.json()
        alert(error.error || '保存失败')
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (action: string) => {
    if (!currentUser) return
    if (!confirm(action === 'reject' ? '确定驳回此知识卡？' : action === 'approve' ? '确定审核通过？' : action === 'archive' ? '确定归档？' : '确定提交审核？')) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/knowledge-cards/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: currentUser.id }),
      })
      if (res.ok) {
        await fetchCard()
      } else {
        const error = await res.json()
        alert(error.error || '操作失败')
      }
    } catch (error) {
      console.error('Failed to change status:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定删除此知识卡？此操作不可恢复。')) return
    try {
      const res = await fetch(`/api/knowledge-cards/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/knowledge-cards')
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const parseTags = (tagsStr: string | null): string[] => {
    if (!tagsStr) return []
    try { return JSON.parse(tagsStr) } catch { return [] }
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!card) return null

  const CatIcon = categoryIcons[card.category] || FileText
  const StatusIcon = statusIcons[card.status] || Edit3
  const tags = parseTags(card.tags)
  const canEdit = currentUser && (currentUser.id === card.creatorId || currentUser.role === 'admin')
  const canReview = currentUser && (currentUser.role === 'admin' || currentUser.role === 'mentor')

  return (
    <div className="min-h-screen flex flex-col">

        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/knowledge-cards"
              className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center
                         transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02]"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
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
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                {editing ? (
                  <h2 className="text-lg font-bold text-gray-900">编辑知识卡</h2>
                ) : (
                  <h2 className="text-lg font-bold text-gray-900">知识卡详情</h2>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!editing && canEdit && card.status !== 'archived' && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg
                               font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                               border-4 border-blue-600"
                  >
                    <Edit3 className="w-4 h-4" />
                    编辑
                  </button>
                )}
                {editing && (
                  <>
                    <button
                      onClick={() => { setEditing(false); fetchCard() }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg
                                 font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                                 border-4 border-gray-300"
                    >
                      <X className="w-4 h-4" />
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={submitting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg
                                 font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                                 border-4 border-blue-600 disabled:opacity-50"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      保存
                    </button>
                  </>
                )}
                {!editing && card.status === 'draft' && canEdit && (
                  <button
                    onClick={() => handleStatusChange('submit')}
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg
                               font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                               border-4 border-amber-600 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    提交审核
                  </button>
                )}
                {!editing && card.status === 'pending_review' && canReview && (
                  <>
                    <button
                      onClick={() => handleStatusChange('approve')}
                      disabled={submitting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg
                                 font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                                 border-4 border-emerald-600 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      审核通过
                    </button>
                    <button
                      onClick={() => handleStatusChange('reject')}
                      disabled={submitting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-lg
                                 font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                                 border-4 border-red-600 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      驳回
                    </button>
                  </>
                )}
                {!editing && card.status === 'published' && canEdit && (
                  <button
                    onClick={() => handleStatusChange('archive')}
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white rounded-lg
                               font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                               border-4 border-gray-700 disabled:opacity-50"
                  >
                    <Archive className="w-4 h-4" />
                    归档
                  </button>
                )}
                {!editing && canEdit && card.status !== 'published' && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-100 text-red-600 rounded-lg
                               font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                               border-4 border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div className="bg-white rounded-lg p-6">
                {editing ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      标题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                                 border-4 border-transparent focus:border-blue-500 focus:bg-white
                                 outline-none transition-all duration-200"
                    />
                  </div>
                ) : (
                  <h1 className="text-2xl font-extrabold text-gray-900">{card.title}</h1>
                )}
              </div>

              {/* Category and Customer Type */}
              <div className="bg-white rounded-lg p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">分类</label>
                    {editing ? (
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                                   border-4 border-transparent focus:border-blue-500 focus:bg-white
                                   outline-none transition-all duration-200"
                      >
                        {categoryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                                        text-sm font-bold text-white ${categoryColors[card.category]}`}>
                        <CatIcon className="w-4 h-4" />
                        {categoryLabels[card.category]}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">客户类型</label>
                    {editing ? (
                      <select
                        name="customerType"
                        value={form.customerType}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                                   border-4 border-transparent focus:border-blue-500 focus:bg-white
                                   outline-none transition-all duration-200"
                      >
                        <option value="">不指定</option>
                        {customerTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-700 font-medium">
                        {card.customerType ? customerTypeLabels[card.customerType] || card.customerType : '不指定'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white rounded-lg p-6">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">标签</label>
                {editing ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          placeholder="输入标签后按回车添加..."
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg text-sm
                                     border-4 border-transparent focus:border-blue-500 focus:bg-white
                                     outline-none transition-all duration-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addTag}
                        className="px-4 py-2.5 bg-gray-100 rounded-lg text-sm font-semibold text-gray-700
                                   transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02]
                                   border-4 border-gray-200"
                      >
                        添加
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100
                                     text-blue-700 rounded-md text-sm font-semibold"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-blue-900 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.length > 0 ? tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100
                                   text-gray-700 rounded-md text-sm font-semibold"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {tag}
                      </span>
                    )) : (
                      <span className="text-sm text-gray-400">无标签</span>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="bg-white rounded-lg p-6">
                <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
                  知识内容
                </label>
                {editing ? (
                  <textarea
                    name="content"
                    value={form.content}
                    onChange={handleChange}
                    rows={18}
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-mono leading-relaxed
                               border-4 border-transparent focus:border-blue-500 focus:bg-white
                               outline-none transition-all duration-200 resize-y"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <div className="bg-gray-50 rounded-lg p-6 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap font-mono">
                      {card.content}
                    </div>
                  </div>
                )}
              </div>

              {/* Source and Risk Notes */}
              <div className="bg-white rounded-lg p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">来源</label>
                    {editing ? (
                      <input
                        type="text"
                        name="source"
                        value={form.source}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                                   border-4 border-transparent focus:border-blue-500 focus:bg-white
                                   outline-none transition-all duration-200"
                      />
                    ) : (
                      <span className="text-sm text-gray-700">{card.source || '未填写'}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">可见范围</label>
                    {editing ? (
                      <select
                        name="visibilityScope"
                        value={form.visibilityScope}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                                   border-4 border-transparent focus:border-blue-500 focus:bg-white
                                   outline-none transition-all duration-200"
                      >
                        {visibilityOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-700">
                        {visibilityOptions.find(v => v.value === card.visibilityScope)?.label || card.visibilityScope}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Risk Notes */}
              <div className="bg-white rounded-lg p-6">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">风险提示</label>
                {editing ? (
                  <textarea
                    name="riskNotes"
                    value={form.riskNotes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium leading-relaxed
                               border-4 border-transparent focus:border-blue-500 focus:bg-white
                               outline-none transition-all duration-200 resize-y"
                  />
                ) : (
                  <div className="bg-red-50 rounded-lg p-4 border-4 border-red-200">
                    <p className="text-sm text-red-700">{card.riskNotes || '暂无风险提示'}</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="bg-white rounded-lg p-6">
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">创建者</label>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-purple-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{card.creator.name.charAt(0)}</span>
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{card.creator.name}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">版本</label>
                    <span className="text-sm text-gray-700 font-bold">v{card.version}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">创建时间</label>
                    <span className="text-sm text-gray-700">{formatDate(card.createdAt)}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">更新时间</label>
                    <span className="text-sm text-gray-700">{formatDate(card.updatedAt)}</span>
                  </div>
                </div>
                {card.reviewer && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">审核者</label>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{card.reviewer.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{card.reviewer.name}</span>
                      </div>
                    </div>
                    {card.reviewedAt && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">审核时间</label>
                        <span className="text-sm text-gray-700">{formatDate(card.reviewedAt)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
  )
}
