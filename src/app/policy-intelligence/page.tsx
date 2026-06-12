'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  Link2,
  AlertTriangle,
  Clock,
  CheckCircle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Bot,
} from 'lucide-react'

interface PolicyIntelligenceData {
  stats: {
    totalPolicyLinks: number
    pendingCollectionCount: number
    totalBriefs: number
    pendingBriefsCount: number
    publishedBriefsCount: number
    totalKnowledgeCards: number
    pendingKnowledgeCardsCount: number
    failedAgentTasks: number
    pendingAgentTasks: number
    outdatedBriefsCount: number
  }
  dataOverview: Array<{
    label: string
    value: number
    type: string
  }>
  agentQueue: Array<{
    id: string
    type: string
    title: string
    count: number
    action: string
  }>
  latestPolicies: Array<{
    id: string
    title: string
    tags: string[]
    summary: string
    time: string
    status: string
  }>
  knowledgeReminders: Array<{
    id: string
    title: string
    priority: string
    frequency: number
    action: string
  }>
}

export default function PolicyIntelligencePage() {
  const [data, setData] = useState<PolicyIntelligenceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/policy-intelligence', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // 模拟数据 - 最新政策动态（当 API 数据为空时使用）
  const defaultLatestPolicies = [
    {
      id: '1',
      title: '关于申报 2026 年度中小企业数字化转型补贴的通知',
      tags: ['补贴', '数字化'],
      summary: '符合条件的中小企业可申请最高 50 万元数字化转型补贴，申报截止日期为 2026 年 7 月 31 日。',
      time: '2 小时前',
      status: 'new',
    },
    {
      id: '2',
      title: '江苏省促进个体工商户发展条例实施细则',
      tags: ['个体工商户', '扶持'],
      summary: '明确个体工商户在税费减免、融资支持、社保补贴等方面的具体政策。',
      time: '5 小时前',
      status: 'new',
    },
    {
      id: '3',
      title: '南京市科技创新企业税收优惠政策汇编',
      tags: ['税收', '科技'],
      summary: '汇编 2026 年度南京市科技创新企业可享受的各项税收优惠政策。',
      time: '1 天前',
      status: 'normal',
    },
  ]

  // 模拟数据 - 数据概览
  const defaultDataOverview = [
    { label: '待采集链接', value: 5, type: 'link' },
    { label: '新增知识卡', value: 8, type: 'knowledge' },
    { label: '新增简报', value: 3, type: 'brief' },
    { label: '待发布简报', value: 2, type: 'pending' },
    { label: '待更新简报', value: 1, type: 'outdated' },
  ]

  // 模拟数据 - Agent 处理队列
  const defaultAgentQueue = [
    { id: '1', type: 'error', title: '采集失败', count: 2, action: '查看详情' },
    { id: '2', type: 'warning', title: '简报生成失败', count: 1, action: '重新生成' },
    { id: '3', type: 'pending', title: '待审核', count: 4, action: '去审核' },
  ]

  // 模拟数据 - 知识库提醒
  const defaultKnowledgeReminders = [
    { id: '1', title: '跨部门协作 FAQ', priority: 'high', frequency: 18, action: '去处理' },
    { id: '2', title: '客户分级标准', priority: 'medium', frequency: 15, action: '去处理' },
    { id: '3', title: '价格异议回复话术', priority: 'medium', frequency: 12, action: '去处理' },
    { id: '4', title: '服务边界说明', priority: 'low', frequency: 8, action: '去处理' },
  ]

  const latestPolicies = data?.latestPolicies || defaultLatestPolicies
  const dataOverview = data?.dataOverview || defaultDataOverview
  const agentQueue = data?.agentQueue || defaultAgentQueue
  const knowledgeReminders = data?.knowledgeReminders || defaultKnowledgeReminders

  // 获取数据概览图标和颜色
  const getOverviewIcon = (type: string) => {
    switch (type) {
      case 'link':
        return { icon: Link2, color: 'text-blue-600', bgColor: 'bg-blue-100' }
      case 'knowledge':
        return { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-100' }
      case 'brief':
        return { icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-100' }
      case 'pending':
        return { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100' }
      case 'outdated':
        return { icon: RefreshCw, color: 'text-red-600', bgColor: 'bg-red-100' }
      default:
        return { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100' }
    }
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">政策情报</h1>
        <p className="text-sm text-gray-500 mt-1">实时追踪政策动态，AI 智能分析，助您抓住政策机遇。</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Link2 className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">政策链接总数</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{data?.stats.totalPolicyLinks || 8} <span className="text-sm font-medium text-gray-500">条</span></div>
          <p className="text-xs text-gray-500 mt-1">待采集 {data?.stats.pendingCollectionCount || 1} 条</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">政策简报</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{data?.stats.totalBriefs || 6} <span className="text-sm font-medium text-gray-500">份</span></div>
          <p className="text-xs text-amber-600 mt-1">待审核 {data?.stats.pendingBriefsCount || 2} 份</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">已发布简报</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{data?.stats.publishedBriefsCount || 4} <span className="text-sm font-medium text-gray-500">份</span></div>
          <p className="text-xs text-green-600 mt-1">较上周 ↑ 2 份</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Agent 任务</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{data?.stats.pendingAgentTasks || 3} <span className="text-sm font-medium text-gray-500">个</span></div>
          <p className="text-xs text-red-600 mt-1">失败 {data?.stats.failedAgentTasks || 1} 个</p>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* 最新政策动态 */}
        <div className="col-span-2 bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">①</span>
              最新政策动态
            </h2>
            <Link href="/policy-links" className="text-sm text-[#10B981] font-medium hover:underline">查看全部 →</Link>
          </div>
          <div className="space-y-4">
            {latestPolicies.map((policy) => (
              <Link
                key={policy.id}
                href={`/policy-links/${policy.id}`}
                className="block p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">{policy.title}</h3>
                      {policy.status === 'new' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-[#10B981] text-white rounded">新</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {policy.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">{policy.summary}</p>
                  </div>
                  <span className="text-xs text-gray-400">{policy.time}</span>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/policy-links" className="block text-center text-sm text-[#10B981] font-medium mt-4 hover:underline">
            查看全部政策链接 →
          </Link>
        </div>

        {/* 右侧面板 */}
        <div className="space-y-6">
          {/* 数据概览分析 */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">②</span>
              数据概览分析
            </h2>
            <div className="space-y-3">
              {dataOverview.map((item) => {
                const { icon: Icon, color, bgColor } = getOverviewIcon(item.type)
                const href = item.type === 'link' ? '/policy-links' :
                            item.type === 'knowledge' ? '/knowledge-cards' :
                            item.type === 'brief' || item.type === 'pending' ? '/policy-briefs' :
                            '/policy-briefs'
                return (
                  <Link
                    key={item.label}
                    href={href}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{item.value}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Agent 处理队列 */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">③</span>
              Agent 处理队列
            </h2>
            <div className="space-y-3">
              {agentQueue.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.type === 'error' ? 'bg-red-100' :
                      item.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      {item.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      ) : item.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.count} 条</p>
                    </div>
                  </div>
                  <Link href="/mentor-review" className="text-sm text-[#10B981] font-medium hover:underline">
                    {item.action}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* 知识库提醒 */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">④</span>
              知识库提醒
            </h2>
            <div className="space-y-3">
              {knowledgeReminders.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      item.priority === 'high' ? 'bg-red-500' :
                      item.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <span className="text-sm text-gray-900">{item.title}</span>
                      <p className="text-xs text-gray-500">被问 {item.frequency} 次</p>
                    </div>
                  </div>
                  <Link href="/employee-qa" className="text-sm text-[#10B981] font-medium hover:underline">
                    {item.action}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agent 说明 */}
      <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-[#10B981]" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Agent 智能处理：</span>
            Agent 会自动采集政策链接、生成简报、检查知识库更新，助您高效管理政策情报。
          </p>
        </div>
      </div>
    </div>
  )
}
