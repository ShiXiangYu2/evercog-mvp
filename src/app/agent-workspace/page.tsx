'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  FileText,
  ClipboardCheck,
  Bell,
  Clock,
  CheckCircle,
  History,
} from 'lucide-react'
import AgentChat from '@/components/AgentChat'

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

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  citations?: Array<{ cardId: string; title: string; category: string; reviewerName?: string }>
  timestamp: string
}

interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
}

export default function AgentWorkspacePage() {
  const [data, setData] = useState<AgentWorkspaceData | null>(null)
  const [chatMode, setChatMode] = useState<'welcome' | 'chat'>('welcome')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>()
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([])
  const historyRef = useRef<HTMLDivElement>(null)

  // 加载历史记录
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('agent-chat-history') || '[]')
    setHistory(saved)
  }, [chatMode])

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showHistory])

  const loadConversation = (conv: Conversation) => {
    setCurrentConversationId(conv.id)
    setCurrentMessages(conv.messages)
    setShowHistory(false)
  }

  useEffect(() => {
    fetch('/api/agent-workspace', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error('API Error:', data.error)
        } else {
          setData(data)
        }
      })
      .catch((err) => {
        console.error('Fetch Error:', err)
      })
  }, [])

  const defaultTodayTasks = [
    { id: '1', type: 'knowledge', title: '补充 3 张高频客户问题知识卡', priority: 'high', status: 'pending' },
    { id: '2', type: 'sop', title: '审核 2 条待审核 SOP', priority: 'medium', status: 'pending' },
    { id: '3', type: 'brief', title: '更新最新税收优惠政策简报', priority: 'low', status: 'pending' },
  ]

  const defaultNotifications = [
    { id: '1', type: 'review', title: '新资料待审核', count: 5, icon: 'clipboard', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    { id: '2', type: 'policy', title: '政策更新', count: 3, icon: 'file', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { id: '3', type: 'permission', title: '部门权限变更', count: 1, icon: 'bell', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ]

  const defaultGrowthPlan = [
    { id: '1', title: '本周完成 10 张知识卡审核', progress: 70, status: 'in_progress' },
    { id: '2', title: '优化 5 条高频问题回复', progress: 40, status: 'in_progress' },
    { id: '3', title: '学习新的财税政策解读', progress: 100, status: 'completed' },
  ]

  const defaultGrowthLogs = [
    { time: '10:32', event: '学习《南京市中小企业数字化转型补贴政策》，能力提升', score: '+2' },
    { time: '09:45', event: '已完成 12 条客户问答，准确率 92%', score: '+5' },
    { time: '09:10', event: '审核通过 3 张知识卡，审核能力提升', score: '+3' },
  ]

  const todayTasks = data?.todayTasks || defaultTodayTasks
  const notifications = data?.notifications || defaultNotifications
  const growthPlan = data?.growthPlan || defaultGrowthPlan
  const growthLogs = data?.growthLogs || defaultGrowthLogs

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review': return ClipboardCheck
      case 'policy': return FileText
      case 'permission': return Bell
      default: return Bell
    }
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">GenericAgent 工作台</h1>
          <p className="text-sm text-gray-500 mt-1">智能助手 · 基于企业知识库</p>
        </div>
        <div ref={historyRef} className="flex items-center gap-3 relative">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            <History className="w-4 h-4" />
            会话历史
          </button>
          {showHistory && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">会话历史</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {history.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-gray-400">暂无历史记录</p>
                  </div>
                ) : (
                  history.slice(0, 10).map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{conv.title}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(conv.createdAt).toLocaleDateString('zh-CN')} {new Date(conv.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        <span className="ml-2 text-gray-300">· {conv.messages.length} 条消息</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
              {history.length > 10 && (
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                  <button className="text-xs text-[#10B981] font-medium hover:underline">查看全部历史 →</button>
                </div>
              )}
            </div>
          )}
          <span className="text-sm text-gray-400">{new Date().toLocaleDateString('zh-CN')}</span>
        </div>
      </div>

      {/* 会话窗口 */}
      <div className="mb-6">
        <AgentChat
          onModeChange={setChatMode}
          initialMessages={currentMessages}
          conversationId={currentConversationId}
        />
      </div>

      {/* 下方卡片 - 仅在初始状态显示 */}
      {chatMode === 'welcome' && (
      <div className="grid grid-cols-4 gap-6">
        {/* 今日待办任务 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#10B981] rounded flex items-center justify-center text-white text-xs font-bold">①</span>
            今日待办
          </h2>
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-[#10B981] focus:ring-[#10B981]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{task.title}</p>
                </div>
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                  task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                </span>
              </div>
            ))}
          </div>
          <Link href="/mentor-review" className="block text-center text-xs text-[#10B981] font-medium mt-3 hover:underline">
            查看全部 →
          </Link>
        </div>

        {/* 通知入口 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#10B981] rounded flex items-center justify-center text-white text-xs font-bold">②</span>
            通知
          </h2>
          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type)
              const href = notification.type === 'review' ? '/mentor-review' :
                          notification.type === 'policy' ? '/policy-intelligence' :
                          '/settings/permissions'
              return (
                <Link
                  key={notification.id}
                  href={href}
                  className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-8 h-8 ${notification.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${notification.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">{notification.title}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{notification.count}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* 成长计划 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#10B981] rounded flex items-center justify-center text-white text-xs font-bold">③</span>
            成长计划
          </h2>
          <div className="space-y-2.5">
            {growthPlan.map((plan) => (
              <div key={plan.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-900 truncate">{plan.title}</p>
                  {plan.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      plan.status === 'completed' ? 'bg-[#10B981]' : 'bg-amber-500'
                    }`}
                    style={{ width: `${plan.progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {plan.status === 'completed' ? '已完成' : `${plan.progress}%`}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 最近动态 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#10B981] rounded flex items-center justify-center text-white text-xs font-bold">④</span>
            最近动态
          </h2>
          <div className="space-y-2.5">
            {growthLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 bg-[#10B981] rounded-full mt-1.5"></div>
                  {index < growthLogs.length - 1 && (
                    <div className="w-0.5 h-5 bg-gray-200 mt-1"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{log.time}</span>
                    <span className="text-xs font-medium text-gray-900 truncate">{log.event}</span>
                  </div>
                  <span className="text-[10px] text-[#10B981] font-medium">{log.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
