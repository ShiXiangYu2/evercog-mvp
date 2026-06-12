'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Bot,
  FileText,
  ClipboardCheck,
  Bell,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Target,
  Calendar,
} from 'lucide-react'

interface AgentWorkspaceData {
  todayTasks: Array<{
    id: string
    type: string
    title: string
    priority: string
    status: string
  }>
  notifications: Array<{
    id: string
    type: string
    title: string
    count: number
    icon: string
    color: string
    bgColor: string
  }>
  growthPlan: Array<{
    id: string
    title: string
    progress: number
    status: string
  }>
  growthLogs: Array<{
    time: string
    event: string
    score: string
  }>
  stats: {
    pendingTasks: number
    completedTasks: number
    totalTasks: number
  }
}

export default function AgentWorkspacePage() {
  const [data, setData] = useState<AgentWorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agent-workspace', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error('API Error:', data.error)
          setLoading(false)
        } else {
          setData(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Fetch Error:', err)
        setLoading(false)
      })
  }, [])

  // 模拟数据 - 今日待办任务
  const defaultTodayTasks = [
    { id: '1', type: 'knowledge', title: '补充 3 张高频客户问题知识卡', priority: 'high', status: 'pending' },
    { id: '2', type: 'sop', title: '审核 2 条待审核 SOP', priority: 'medium', status: 'pending' },
    { id: '3', type: 'brief', title: '更新最新税收优惠政策简报', priority: 'low', status: 'pending' },
  ]

  // 模拟数据 - 通知入口
  const defaultNotifications = [
    { id: '1', type: 'review', title: '新资料待审核', count: 5, icon: 'clipboard', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    { id: '2', type: 'policy', title: '政策更新', count: 3, icon: 'file', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { id: '3', type: 'permission', title: '部门权限变更', count: 1, icon: 'bell', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ]

  // 模拟数据 - 成长计划
  const defaultGrowthPlan = [
    { id: '1', title: '本周完成 10 张知识卡审核', progress: 70, status: 'in_progress' },
    { id: '2', title: '优化 5 条高频问题回复', progress: 40, status: 'in_progress' },
    { id: '3', title: '学习新的财税政策解读', progress: 100, status: 'completed' },
  ]

  // 模拟数据 - 成长日志
  const defaultGrowthLogs = [
    { time: '10:32', event: '学习《南京市中小企业数字化转型补贴政策》，能力提升', score: '+2' },
    { time: '09:45', event: '已完成 12 条客户问答，准确率 92%', score: '+5' },
    { time: '09:10', event: '审核通过 3 张知识卡，审核能力提升', score: '+3' },
  ]

  const todayTasks = data?.todayTasks || defaultTodayTasks
  const notifications = data?.notifications || defaultNotifications
  const growthPlan = data?.growthPlan || defaultGrowthPlan
  const growthLogs = data?.growthLogs || defaultGrowthLogs

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review':
        return ClipboardCheck
      case 'policy':
        return FileText
      case 'permission':
        return Bell
      default:
        return Bell
    }
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">GenericAgent 工作台</h1>
          <p className="text-sm text-gray-500 mt-1">您的智能助手，帮助您处理日常任务、生成报告、回答问题，让工作更高效、更有价值。</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString('zh-CN')}</span>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* 今日待办任务 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">①</span>
            今日待办任务
          </h2>
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#10B981] focus:ring-[#10B981]" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                  task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                </span>
              </div>
            ))}
          </div>
          <Link href="/mentor-review" className="block text-center text-sm text-[#10B981] font-medium mt-4 hover:underline">
            查看全部待办任务 →
          </Link>
        </div>

        {/* 通知入口 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">②</span>
            通知入口
          </h2>
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type)
              const href = notification.type === 'review' ? '/mentor-review' :
                          notification.type === 'policy' ? '/policy-intelligence' :
                          '/settings/permissions'
              return (
                <Link
                  key={notification.id}
                  href={href}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className={`w-10 h-10 ${notification.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${notification.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{notification.count}</span>
                  <span className="text-xs text-gray-500">条</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* 成长计划 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">③</span>
            成长计划
          </h2>
          <Link href="/agent-workspace" className="text-sm text-[#10B981] font-medium hover:underline">查看全部成长计划 →</Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {growthPlan.map((plan) => (
            <div key={plan.id} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-900">{plan.title}</p>
                {plan.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-[#10B981]" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    plan.status === 'completed' ? 'bg-[#10B981]' : 'bg-amber-500'
                  }`}
                  style={{ width: `${plan.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {plan.status === 'completed' ? '已完成' : `进度 ${plan.progress}%`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 成长日志 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">④</span>
            成长日志
          </h2>
          <Link href="/audit-logs" className="text-sm text-[#10B981] font-medium hover:underline">查看全部成长记录 →</Link>
        </div>
        <div className="space-y-4">
          {growthLogs.map((log, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
                {index < growthLogs.length - 1 && (
                  <div className="w-0.5 h-8 bg-gray-200 mt-1"></div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">{log.time}</span>
                  <span className="text-sm font-medium text-gray-900">{log.event}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-[#10B981]" />
                  <span className="text-xs text-[#10B981] font-medium">{log.score}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent 说明 */}
      <div className="mt-6 bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-[#10B981]" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold">GenericAgent：</span>
            您的智能助手，帮助您处理日常任务、生成报告、回答问题，让工作更高效、更有价值。
          </p>
        </div>
      </div>
    </div>
  )
}
