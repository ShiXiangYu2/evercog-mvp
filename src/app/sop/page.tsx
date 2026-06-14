'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import {
  GraduationCap,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  FileText,
  ChevronRight,
  Filter,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react'

interface SOPTaskData {
  id: string
  title: string
  description: string | null
  status: string
  dueDate: string | null
  createdAt: string
  mentor: { id: string; name: string; role: string }
  trainee: { id: string; name: string; role: string }
  submissions: { id: string; status: string; completeness: number | null; createdAt: string }[]
}

const taskStatusLabels: Record<string, string> = {
  assigned: '已分配',
  in_progress: '进行中',
  submitted: '已提交',
  reviewed: '已审核',
  completed: '已完成',
}

const taskStatusColors: Record<string, string> = {
  assigned: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  submitted: 'bg-amber-500',
  reviewed: 'bg-purple-500',
  completed: 'bg-emerald-500',
}

const taskStatusIcons: Record<string, React.ElementType> = {
  assigned: FileText,
  in_progress: Clock,
  submitted: Send,
  reviewed: AlertTriangle,
  completed: CheckCircle2,
}

// Status step definitions for the progress indicator
const statusSteps = ['assigned', 'in_progress', 'submitted', 'reviewed', 'completed']

export default function SOPPage() {
  const { user: authUser } = useAuth()
  const [tasks, setTasks] = useState<SOPTaskData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const authUserId = authUser?.id
  const authUserRole = authUser?.role

  const fetchTasks = useCallback(async () => {
    if (!authUserId || !authUserRole) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('userId', authUserId)
    params.set('role', authUserRole)
    if (filterStatus) params.set('status', filterStatus)

    try {
      const res = await fetch(`/api/sop/tasks?${params.toString()}`)
      const data = await res.json()
      setTasks(data.items || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch SOP tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [authUserId, authUserRole, filterStatus])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const isMentor = authUser?.role === 'mentor' || authUser?.role === 'admin'

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '无截止日期'
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'completed') return false
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="min-h-screen flex flex-col">

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/employee-qa"
              className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg
                         text-gray-600 hover:bg-gray-200 hover:text-gray-900
                         transition-all duration-200"
              title="返回员工问答"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-500 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                SOP 训练
              </h1>
              <p className="text-sm text-gray-500 mt-1 ml-15">
                {isMentor ? '管理导师布置的训练任务' : '查看分配给你的训练任务'} | 共 {total} 个任务
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isMentor && (
              <Link
                href="/sop/new"
                className="flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-lg
                           font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                           border-4 border-pink-600"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
                布置训练任务
              </Link>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Filters */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm
                           transition-all duration-200 hover:scale-[1.02] border-4
                           ${showFilters
                             ? 'bg-pink-100 text-pink-700 border-pink-300'
                             : 'bg-gray-100 text-gray-700 border-gray-300'
                           }`}
              >
                <Filter className="w-4 h-4" />
                筛选
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              {filterStatus && (
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white ${taskStatusColors[filterStatus]}`}>
                    {taskStatusLabels[filterStatus]}
                  </span>
                  <button
                    onClick={() => setFilterStatus('')}
                    className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
                  >
                    清除
                  </button>
                </div>
              )}
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                {statusSteps.map((step) => (
                  <button
                    key={step}
                    onClick={() => setFilterStatus(filterStatus === step ? '' : step)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold
                               transition-all duration-200 hover:scale-[1.02] border-4
                               ${filterStatus === step
                                 ? `${taskStatusColors[step]} text-white border-transparent`
                                 : 'bg-white text-gray-700 border-gray-200'
                               }`}
                  >
                    {React.createElement(taskStatusIcons[step], { className: 'w-4 h-4' })}
                    {taskStatusLabels[step]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Task List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-lg p-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-2">暂无训练任务</p>
              <p className="text-sm text-gray-500 mb-6">
                {isMentor ? '点击「布置训练任务」开始为新人创建 SOP 训练' : '等待导师为你分配训练任务'}
              </p>
              {isMentor && (
                <Link
                  href="/sop/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-lg
                             font-semibold text-sm transition-all duration-200 hover:scale-[1.02]
                             border-4 border-pink-600"
                >
                  <Plus className="w-5 h-5" />
                  布置训练任务
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const StatusIcon = taskStatusIcons[task.status] || FileText
                const latestSubmission = task.submissions[0]
                const overdue = isOverdue(task.dueDate, task.status)
                const currentStepIndex = statusSteps.indexOf(task.status)

                return (
                  <Link
                    key={task.id}
                    href={`/sop/${task.id}`}
                    className="group block bg-white rounded-lg p-6 transition-all duration-200
                               hover:scale-[1.01] border-4 border-transparent hover:border-pink-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Title and Status */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                                            text-xs font-bold text-white ${taskStatusColors[task.status]}`}>
                            <StatusIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                            {taskStatusLabels[task.status]}
                          </span>
                          {overdue && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md
                                             text-xs font-bold text-white bg-red-500">
                              <AlertTriangle className="w-3 h-3" />
                              已逾期
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-2
                                       group-hover:text-pink-600 transition-colors duration-200">
                          {task.title}
                        </h3>

                        {task.description && (
                          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Status Progress Bar */}
                        <div className="flex items-center gap-1 mb-3">
                          {statusSteps.map((step, index) => (
                            <div key={step} className="flex items-center">
                              <div
                                className={`w-8 h-1.5 rounded-full transition-colors duration-300 ${
                                  index <= currentStepIndex
                                    ? taskStatusColors[step]
                                    : 'bg-gray-200'
                                }`}
                              />
                              {index < statusSteps.length - 1 && (
                                <div className="w-1 h-1 bg-gray-300 rounded-full mx-0.5" />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center gap-6 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 bg-indigo-500 rounded flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold">{task.mentor.name.charAt(0)}</span>
                            </div>
                            <span>导师: {task.mentor.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 bg-pink-500 rounded flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold">{task.trainee.name.charAt(0)}</span>
                            </div>
                            <span>新人: {task.trainee.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDate(task.dueDate)}</span>
                          </div>
                          {latestSubmission && (
                            <div className="flex items-center gap-1.5">
                              <Send className="w-3.5 h-3.5" />
                              <span>
                                最新提交: 完整性 {latestSubmission.completeness ?? '-'}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-pink-500
                                                transition-all duration-200 group-hover:translate-x-1 mt-2" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
