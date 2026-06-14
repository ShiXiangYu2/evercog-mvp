'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  FileText,
} from 'lucide-react'

interface TaskData {
  id: string
  title: string
  description: string | null
  template: string | null
  requirements: string | null
  status: string
  mentor: { id: string; name: string; role: string }
  trainee: { id: string; name: string; role: string }
}

export default function SOPSubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [task, setTask] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [content, setContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/sop/tasks/${id}`)
      if (res.ok) {
        const data: TaskData = await res.json()
        setTask(data)
        // Pre-fill with template if available
        if (data.template) {
          setContent(data.template)
        }
      } else {
        router.push('/sop')
      }
    } catch (error) {
      console.error('Failed to fetch task:', error)
      router.push('/sop')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchTask()
    const userId = localStorage.getItem('currentUserId') || '6'
    const roleMap: Record<string, string> = {
      '1': 'sales', '2': 'customer_service', '3': 'operations',
      '4': 'finance', '5': 'mentor', '6': 'trainee', '7': 'admin', '8': 'ai_info',
    }
    setCurrentUser({ id: userId, name: '', role: roleMap[userId] || 'trainee' })
  }, [fetchTask])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !task) return

    if (!content.trim()) {
      alert('请输入 SOP 内容')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/sop/tasks/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          submitterId: currentUser.id,
        }),
      })

      if (res.ok) {
        router.push(`/sop/${id}`)
      } else {
        const error = await res.json()
        alert(error.error || '提交失败')
      }
    } catch (error) {
      console.error('Failed to submit:', error)
      alert('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!task) return null

  return (
    <div className="min-h-screen flex flex-col">

        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/sop/${id}`}
              className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center
                         transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02]"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                提交 SOP
              </h1>
              <p className="text-sm text-gray-500 mt-1 ml-13">
                任务：{task.title}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Task Info */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{task.title}</h2>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-indigo-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{task.mentor.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-gray-500">导师: {task.mentor.name}</span>
                </div>
              </div>
              {task.requirements && (
                <div className="mt-4 bg-amber-50 rounded-lg p-4 border-4 border-amber-200">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">训练要求</p>
                  <p className="text-sm text-amber-800">{task.requirements}</p>
                </div>
              )}
            </div>

            {/* Editor */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  SOP 内容
                </label>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                             border-4 ${showPreview
                               ? 'bg-pink-100 text-pink-700 border-pink-300'
                               : 'bg-gray-100 text-gray-700 border-gray-300'
                             }`}
                >
                  {showPreview ? '编辑' : '预览'}
                </button>
              </div>

              {showPreview ? (
                <div className="bg-gray-50 rounded-lg p-6 text-sm font-mono text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[400px]">
                  {content || <span className="text-gray-400">暂无内容</span>}
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`在此编写你的 SOP 内容...\n\n## 步骤一：准备工作\n...\n\n## 步骤二：执行操作\n...\n\n## 步骤三：确认结果\n...\n\n## 注意事项\n...`}
                  rows={20}
                  className="w-full px-4 py-3 bg-gray-100 rounded-lg text-sm font-mono leading-relaxed
                             border-4 border-transparent focus:border-pink-500 focus:bg-white
                             outline-none transition-all duration-200 resize-y"
                  required
                />
              )}

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-400">
                  {content.length} 字符 | 提交后 AI 将自动生成检查报告
                </p>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/sop/${id}`}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg
                               font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                               border-4 border-gray-300"
                  >
                    取消
                  </Link>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !content.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-pink-500 text-white rounded-lg
                               font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                               border-4 border-pink-600 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    提交 SOP
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
  )
}
