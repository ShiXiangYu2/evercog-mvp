'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  BookOpen,
  Plus,
  X,
  Tag,
} from 'lucide-react'

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

export default function NewKnowledgeCardPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)

  const [form, setForm] = useState({
    title: '',
    category: 'data_checklist',
    content: '',
    departmentId: '',
    customerType: '',
    source: '',
    riskNotes: '',
    visibilityScope: 'department',
    tags: [] as string[],
  })

  useEffect(() => {
    const userId = localStorage.getItem('currentUserId') || '4' // default to finance user
    setCurrentUser({ id: userId, name: '' })

    // 支持从知识缺口跳转过来时预填问题
    const params = new URLSearchParams(window.location.search)
    const question = params.get('question')
    if (question) {
      setForm((prev) => ({
        ...prev,
        title: question,
        content: `## ${question}\n\n### 解决方案\n\n（请补充具体内容）\n\n### 相关案例\n\n（请补充实际案例）\n\n### 注意事项\n\n（请补充注意事项）`,
        category: 'faq',
      }))
    }
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    if (!form.title.trim() || !form.content.trim()) {
      alert('请填写标题和内容')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/knowledge-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          creatorId: currentUser.id,
        }),
      })

      if (res.ok) {
        const card = await res.json()
        router.push(`/knowledge-cards/${card.id}`)
      } else {
        const error = await res.json()
        alert(error.error || '创建失败')
      }
    } catch (error) {
      console.error('Failed to create knowledge card:', error)
      alert('创建失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!currentUser) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/knowledge-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          creatorId: currentUser.id,
        }),
      })
      if (res.ok) {
        const card = await res.json()
        router.push(`/knowledge-cards/${card.id}`)
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
    } finally {
      setSubmitting(false)
    }
  }

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
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                新建知识卡
              </h1>
            </div>
          </div>
        </header>

        {/* Form */}
        <main className="flex-1 overflow-y-auto p-8">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {/* Title */}
              <div className="bg-white rounded-lg p-6">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                  标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="输入知识卡标题..."
                  className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                             border-4 border-transparent focus:border-purple-500 focus:bg-white
                             outline-none transition-all duration-200"
                  required
                />
              </div>

              {/* Category and Customer Type */}
              <div className="bg-white rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      分类 <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                                 border-4 border-transparent focus:border-purple-500 focus:bg-white
                                 outline-none transition-all duration-200"
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      客户类型
                    </label>
                    <select
                      name="customerType"
                      value={form.customerType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                                 border-4 border-transparent focus:border-purple-500 focus:bg-white
                                 outline-none transition-all duration-200"
                    >
                      <option value="">不指定</option>
                      {customerTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white rounded-lg p-6">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                  标签
                </label>
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
                                 border-4 border-transparent focus:border-purple-500 focus:bg-white
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
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100
                                   text-purple-700 rounded-md text-sm font-semibold"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-purple-900 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="bg-white rounded-lg p-6">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                  知识内容 (Markdown) <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  placeholder="## 标题&#10;&#10;支持 Markdown 格式...&#10;&#10;### 子标题&#10;1. 列表项&#10;2. 列表项"
                  rows={16}
                  className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-mono leading-relaxed
                             border-4 border-transparent focus:border-purple-500 focus:bg-white
                             outline-none transition-all duration-200 resize-y"
                  required
                />
              </div>

              {/* Source and Risk Notes */}
              <div className="bg-white rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      来源
                    </label>
                    <input
                      type="text"
                      name="source"
                      value={form.source}
                      onChange={handleChange}
                      placeholder="知识来源..."
                      className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                                 border-4 border-transparent focus:border-purple-500 focus:bg-white
                                 outline-none transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      可见范围
                    </label>
                    <select
                      name="visibilityScope"
                      value={form.visibilityScope}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                                 border-4 border-transparent focus:border-purple-500 focus:bg-white
                                 outline-none transition-all duration-200"
                    >
                      {visibilityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Risk Notes */}
              <div className="bg-white rounded-lg p-6">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                  风险提示
                </label>
                <textarea
                  name="riskNotes"
                  value={form.riskNotes}
                  onChange={handleChange}
                  placeholder="使用此知识时的注意事项和风险提示..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium leading-relaxed
                             border-4 border-transparent focus:border-purple-500 focus:bg-white
                             outline-none transition-all duration-200 resize-y"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 mt-8">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg
                           font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                           border-4 border-gray-300 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                保存草稿
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-purple-500 text-white rounded-lg
                           font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                           border-4 border-purple-600 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                创建知识卡
              </button>
            </div>
          </form>
        </main>
      </div>
  )
}
