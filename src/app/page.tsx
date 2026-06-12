'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  BookOpen,
  MessageSquare,
  ClipboardList,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle,
  Bot,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'

interface DashboardStats {
  policyLinks: number
  policyBriefs: number
  knowledgeCards: number
  pushRecords: number
  experienceQueries: number
  sopTasks: number
  pendingReview: number
  auditLogs: number
  publishedCards: number
  unreadPush: number
  pendingBriefs: number
  activeUsers: number
  pendingAgentTasks: number
  pendingKnowledgeGaps: number
  highPriorityGaps: number
  todayActivities: number
  qualityMetrics: Array<{
    id: string
    metricType: string
    value: number
    target: number
  }>
}

interface Activity {
  id: string
  time: string
  user: string
  action: string
  target: string
  status: string
  statusColor: string
}

interface PendingTask {
  id: string
  title: string
  type: 'review' | 'gap' | 'agent'
  priority: 'high' | 'medium' | 'low'
  deadline: string
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // 获取 Dashboard 数据
  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard/stats', {
        credentials: 'same-origin',
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setActivities(data.recentActivities || [])

        // 构建待处理事项
        const tasks: PendingTask[] = []

        // 待审核知识卡
        if (data.stats.pendingReview > 0) {
          tasks.push({
            id: 'pending-review',
            title: `${data.stats.pendingReview} 张知识卡待审核`,
            type: 'review',
            priority: 'high',
            deadline: '尽快处理',
          })
        }

        // 高优先级知识缺口
        if (data.stats.highPriorityGaps > 0) {
          tasks.push({
            id: 'high-gaps',
            title: `${data.stats.highPriorityGaps} 个高优先级知识缺口`,
            type: 'gap',
            priority: 'high',
            deadline: '需要补充',
          })
        }

        // 待处理 Agent 任务
        if (data.stats.pendingAgentTasks > 0) {
          tasks.push({
            id: 'agent-tasks',
            title: `${data.stats.pendingAgentTasks} 个 Agent 任务待处理`,
            type: 'agent',
            priority: 'medium',
            deadline: '自动处理中',
          })
        }

        // 待推送简报
        if (data.stats.pendingBriefs > 0) {
          tasks.push({
            id: 'pending-briefs',
            title: `${data.stats.pendingBriefs} 份简报待推送`,
            type: 'review',
            priority: 'medium',
            deadline: '尽快推送',
          })
        }

        setPendingTasks(tasks)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboard()
  }

  // 定时刷新
  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 60000) // 每分钟刷新
    return () => clearInterval(interval)
  }, [])

  // 快速入口
  const quickActions = [
    { name: '上传政策', icon: '📄', description: '提交政策链接', href: '/policy-intelligence' },
    { name: '生成简报', icon: '🤖', description: 'AI 自动生成简报', href: '/policy-intelligence' },
    { name: '导师审核', icon: '👨‍🏫', description: '审核知识卡', href: '/mentor-review' },
    { name: '员工问答', icon: '💬', description: '向知识库提问', href: '/employee-qa' },
  ]

  // 质量监控指标
  const qualityMetrics = stats?.qualityMetrics || []

  const metricLabels: Record<string, string> = {
    coverage: '知识卡覆盖率',
    citation_rate: '员工引用率',
    satisfaction: '平均满意度',
    outdated_rate: '过时率',
  }

  // 计算今日重点
  const todayHighlights = [
    {
      id: '1',
      type: 'brief' as const,
      title: `今日新增 ${stats?.todayActivities || 0} 条活动`,
      description: '系统活动记录',
      time: '实时',
    },
    {
      id: '2',
      type: 'question' as const,
      title: `${stats?.pendingKnowledgeGaps || 0} 条高频问题待补充`,
      description: '需要创建知识卡覆盖',
      time: '待处理',
    },
    {
      id: '3',
      type: 'inconsistency' as const,
      title: `${stats?.pendingReview || 0} 张知识卡待审核`,
      description: '需要导师或管理员审核',
      time: '需关注',
    },
  ]

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">企业知识运营工作台</h1>
          <p className="text-sm text-gray-500 mt-1">连接政策、知识与业务，让知识真正转化为企业服务能力。</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">政策链接</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{stats?.policyLinks || 0}</div>
          <p className="text-xs text-gray-500 mt-1">已收集政策</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">待审核</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{stats?.pendingReview || 0}</div>
          <p className="text-xs text-gray-500 mt-1">知识卡/简报</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">经验查询</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{stats?.experienceQueries || 0}</div>
          <p className="text-xs text-gray-500 mt-1">总查询次数</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">知识缺口</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{stats?.pendingKnowledgeGaps || 0}</div>
          <p className="text-xs text-red-600 mt-1">高优先级: {stats?.highPriorityGaps || 0}</p>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* 今日重点 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">①</span>
            今日重点
          </h2>
          <div className="space-y-4">
            {todayHighlights.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.type === 'brief' ? 'bg-green-100' :
                  item.type === 'question' ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  {item.type === 'brief' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : item.type === 'question' ? (
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                </div>
                <span className="text-xs text-gray-400">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 知识资产概览 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">②</span>
            知识资产概览
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">知识卡总数</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{stats?.knowledgeCards || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">已发布</span>
              </div>
              <span className="text-lg font-bold text-green-600">{stats?.publishedCards || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">政策简报</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{stats?.policyBriefs || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-gray-700">SOP 任务</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{stats?.sopTasks || 0}</span>
            </div>
          </div>
        </div>

        {/* 待处理事项 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">③</span>
            待处理事项
          </h2>
          {pendingTasks.length > 0 ? (
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'high' ? 'bg-red-500' :
                    task.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{task.deadline}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p className="text-sm">暂无待处理事项</p>
            </div>
          )}
        </div>
      </div>

      {/* 快速入口 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">快速入口</h2>
        <div className="grid grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-[#10B981]/5 hover:border-[#10B981] border border-transparent transition-all duration-200"
            >
              <span className="text-3xl">{action.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{action.name}</p>
                <p className="text-xs text-gray-500 mt-1">{action.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
            </Link>
          ))}
        </div>
      </div>

      {/* 最近活动 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">最近活动</h2>
          <Link href="/audit-logs" className="text-sm text-[#10B981] font-medium hover:underline">查看全部活动</Link>
        </div>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{activity.user}</p>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{activity.action}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">暂无活动记录</p>
          </div>
        )}
      </div>

      {/* 质量监控指标 */}
      {qualityMetrics.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
              质量监控指标
            </h2>
            <Link href="/knowledge-hub" className="text-sm text-[#10B981] font-medium hover:underline">
              查看详细报告 →
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {qualityMetrics.map((metric) => (
              <div key={metric.metricType} className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-2">{metricLabels[metric.metricType] || metric.metricType}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
                  <span className="text-sm text-gray-500">
                    {metric.metricType === 'satisfaction' ? `/ ${metric.target}` : `% / ${metric.target}%`}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      metric.metricType === 'outdated_rate'
                        ? metric.value <= metric.target ? 'bg-green-500' : 'bg-red-500'
                        : metric.value >= metric.target ? 'bg-green-500' : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${metric.metricType === 'satisfaction'
                        ? Math.min((metric.value / metric.target) * 100, 100)
                        : metric.metricType === 'outdated_rate'
                          ? Math.min((metric.target / Math.max(metric.value, 0.1)) * 100, 100)
                          : Math.min((metric.value / metric.target) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
