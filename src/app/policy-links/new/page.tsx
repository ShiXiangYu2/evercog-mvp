'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Link2,
  Globe,
  Building,
  Users,
  Loader2,
} from 'lucide-react'

const customerTypes = [
  { value: '', label: '请选择客户类型' },
  { value: 'restaurant', label: '餐饮' },
  { value: 'retail', label: '零售' },
  { value: 'store', label: '门店' },
  { value: 'advertising', label: '广告公司' },
  { value: 'startup', label: '初创公司' },
  { value: 'individual', label: '个体工商户' },
]

const departments = [
  { value: '', label: '请选择部门（可选）' },
  { value: '1', label: '销售部' },
  { value: '2', label: '客服部' },
  { value: '3', label: '运营部' },
  { value: '4', label: '财务部' },
  { value: '5', label: 'AI 信息部' },
]

export default function NewPolicyLinkPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    url: '',
    title: '',
    source: '',
    customerType: '',
    departmentId: '',
  })

  const getCurrentUserId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentUserId') || '1'
    }
    return '1'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.url.trim()) {
      setError('请输入政策链接 URL')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/policy-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: form.url.trim(),
          title: form.title.trim() || null,
          source: form.source.trim() || null,
          submitterId: getCurrentUserId(),
          departmentId: form.departmentId || null,
          customerType: form.customerType || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '创建失败')
      }

      const link = await res.json()
      router.push(`/policy-links/${link.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
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
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">新增政策链接</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">提交一个新的政策链接到链接池</p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-semibold text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-white rounded-lg p-8">
                {/* URL Field */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <Link2 className="w-4 h-4 text-blue-500" />
                    政策链接 URL *
                  </label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://www.gov.cn/zhengce/..."
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md text-sm font-medium
                               focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-gray-400 mt-1">请输入完整的政策原文链接</p>
                </div>

                {/* Title Field */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    政策标题
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="例如：关于促进个体工商户发展的意见"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md text-sm font-medium
                               focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Source Field */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    来源网站
                  </label>
                  <input
                    type="text"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    placeholder="例如：国务院、国家税务总局"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md text-sm font-medium
                               focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Customer Type */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    适用客户类型
                  </label>
                  <select
                    value={form.customerType}
                    onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md text-sm font-medium
                               focus:outline-none focus:border-blue-500 bg-white"
                  >
                    {customerTypes.map((ct) => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div className="mb-8">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <Building className="w-4 h-4 text-purple-500" />
                    适用部门
                  </label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md text-sm font-medium
                               focus:outline-none focus:border-blue-500 bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {/* Submit */}
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white font-bold rounded-md
                               transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02] border-4 border-blue-500
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" strokeWidth={2.5} />
                    )}
                    {saving ? '提交中...' : '提交政策链接'}
                  </button>
                  <Link
                    href="/policy-links"
                    className="px-6 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-md
                               transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02]"
                  >
                    取消
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </main>
    </div>
  )
}
