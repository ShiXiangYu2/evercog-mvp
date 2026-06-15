'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  GraduationCap,
  Save,
  Calendar,
  User as UserIcon,
} from 'lucide-react'

interface UserData {
  id: string
  name: string
  role: string
  department: { name: string }
}

export default function NewSOPTaskPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [trainees, setTrainees] = useState<UserData[]>([])

  const [form, setForm] = useState({
    title: '',
    description: '',
    template: '',
    requirements: '',
    traineeId: '',
    dueDate: '',
  })

  useEffect(() => {
    const userId = localStorage.getItem('currentUserId') || '5'
    const roleMap: Record<string, string> = {
      '1': 'sales', '2': 'customer_service', '3': 'operations',
      '4': 'finance', '5': 'mentor', '6': 'trainee', '7': 'admin', '8': 'ai_info',
    }
    setCurrentUser({ id: userId, name: '', role: roleMap[userId] || 'mentor' })

    // Mock trainee list
    setTrainees([
      { id: '6', name: '刘新人', role: 'trainee', department: { name: '销售部' } },
    ])
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    if (!form.title.trim() || !form.traineeId) {
      alert('请填写任务标题并选择新人')
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        ...form,
        mentorId: currentUser.id,
      }
      if (form.dueDate) {
        payload.dueDate = new Date(form.dueDate).toISOString()
      }

      const res = await fetch('/api/sop/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const task = await res.json()
        router.push(`/sop/${task.id}`)
      } else {
        const error = await res.json()
        alert(error.error || '创建失败')
      }
    } catch (error) {
      console.error('Failed to create SOP task:', error)
      alert('创建失败，请重试')
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
              href="/sop"
              className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center
                         transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02]"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                布置训练任务
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
                  任务标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="例如：新客户接待 SOP 流程训练"
                  className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                             border-4 border-transparent focus:border-pink-500 focus:bg-white
                             outline-none transition-all duration-200"
                  required
                />
              </div>

              {/* Description */}
              <div className="bg-white rounded-lg p-6">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                  任务描述
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="描述此训练任务的目标和背景..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium leading-relaxed
                             border-4 border-transparent focus:border-pink-500 focus:bg-white
                             outline-none transition-all duration-200 resize-y"
                />
              </div>

              {/* Trainee and Due Date */}
              <div className="bg-white rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      指派新人 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        name="traineeId"
                        value={form.traineeId}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                                   border-4 border-transparent focus:border-pink-500 focus:bg-white
                                   outline-none transition-all duration-200"
                        required
                      >
                        <option value="">选择新人...</option>
                        {trainees.map((t) => (
                          <option key={t.id} value={t.id}>{t.name} ({t.department.name})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      截止日期
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="datetime-local"
                        name="dueDate"
                        value={form.dueDate}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg text-sm font-medium
                                   border-4 border-transparent focus:border-pink-500 focus:bg-white
                                   outline-none transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SOP Template */}
              <div className="bg-white rounded-lg p-6">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                  SOP 模板（参考）
                </label>
                <textarea
                  name="template"
                  value={form.template}
                  onChange={handleChange}
                  placeholder={`## SOP 模板参考\n\n### 步骤一：准备工作\n- \n\n### 步骤二：执行操作\n- \n\n### 步骤三：确认结果\n- \n\n### 注意事项\n- `}
                  rows={10}
                  className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-mono leading-relaxed
                             border-4 border-transparent focus:border-pink-500 focus:bg-white
                             outline-none transition-all duration-200 resize-y"
                />
                <p className="text-xs text-gray-400 mt-2">提供 SOP 模板供新人参考，新人需根据模板完成实际操作流程的编写</p>
              </div>

              {/* Requirements */}
              <div className="bg-white rounded-lg p-6">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                  训练要求
                </label>
                <textarea
                  name="requirements"
                  value={form.requirements}
                  onChange={handleChange}
                  placeholder="说明对新人的具体要求，例如：需要包含完整的操作步骤、异常处理、时间节点等..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-medium leading-relaxed
                             border-4 border-transparent focus:border-pink-500 focus:bg-white
                             outline-none transition-all duration-200 resize-y"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 mt-8">
              <Link
                href="/sop"
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg
                           font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                           border-4 border-gray-300"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-pink-500 text-white rounded-lg
                           font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                           border-4 border-pink-600 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                发布任务
              </button>
            </div>
          </form>
        </main>
      </div>
  )
}
