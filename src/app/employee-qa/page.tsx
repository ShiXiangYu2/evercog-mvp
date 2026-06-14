'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  RefreshCw,
  ArrowRight,
  HelpCircle,
  ArrowLeft,
  Loader2,
  GraduationCap,
  FileText,
} from 'lucide-react'

interface EmployeeQAData {
  questionHeatMap: Array<{
    department: string
    high: string[]
    medium: string[]
    low: string[]
  }>
  todayQA: Array<{
    id: string
    time: string
    user: string
    question: string
    status: string
    citation: string
  }>
  knowledgeGapTracking: Array<{
    id: string
    title: string
    frequency: number
    priority: string
    suggestedAction: string
    action: string
  }>
  qualityMetrics: Array<{
    label: string
    value: number
    unit: string
    trend: string
    trendValue: string
  }>
  knowledgeGapsCount: number
  totalQuestions: number
  answeredQuestions: number
}

export default function EmployeeQAPage() {
  const [data, setData] = useState<EmployeeQAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/employee-qa', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error('API Error:', data.error)
          setError(data.error)
          setLoading(false)
        } else {
          setData(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Fetch Error:', err)
        setError('加载数据失败，请稍后重试')
        setLoading(false)
      })
  }, [])

  // 模拟数据 - 问答热力图
  const defaultQuestionHeatMap = [
    {
      department: '销售部',
      high: ['价格异议处理'],
      medium: ['产品功能对比'],
      low: ['竞品分析'],
    },
    {
      department: '客服部',
      high: ['退款流程'],
      medium: ['服务边界'],
      low: ['投诉升级'],
    },
    {
      department: '运营部',
      high: ['活动执行SOP'],
      medium: ['数据报表解读'],
      low: [],
    },
    {
      department: '新员工',
      high: ['入职流程'],
      medium: ['系统权限申请'],
      low: ['汇报关系'],
    },
  ]

  // 模拟数据 - 今日问答摘要
  const defaultTodayQA = [
    { id: '1', time: '09:15', user: '销售部 张三', question: '客户问补贴申报截止日期？', status: 'answered', citation: '引用知识卡 #127' },
    { id: '2', time: '10:30', user: '客服部 李四', question: '退款需要哪些材料？', status: 'answered', citation: '引用知识卡 #89' },
    { id: '3', time: '11:45', user: '运营部 王五', question: '本月活动执行 SOP 在哪？', status: 'answered', citation: '引用 SOP #201' },
    { id: '4', time: '13:20', user: '新员工 赵六', question: '怎么申请系统权限？', status: 'answered', citation: '引用 SOP #15' },
    { id: '5', time: '14:00', user: '销售部 钱七', question: '竞品 XX 的价格是多少？', status: 'no_match', citation: '未找到匹配知识卡，已标记为知识缺口' },
  ]

  // 模拟数据 - 知识缺口追踪
  const defaultKnowledgeGapTracking = [
    { id: '1', title: '竞品价格对比', frequency: 23, priority: 'high', suggestedAction: 'create_card', action: '去处理' },
    { id: '2', title: '跨部门协作流程', frequency: 18, priority: 'medium', suggestedAction: 'update_card', action: '去处理' },
    { id: '3', title: '客户分级标准', frequency: 15, priority: 'medium', suggestedAction: 'rewrite_card', action: '去处理' },
  ]

  // 模拟数据 - 问答质量指标
  const defaultQualityMetrics = [
    { label: '今日总问答', value: 47, unit: '次', trend: 'up', trendValue: '↑ 6 次' },
    { label: 'Agent 直接回答', value: 39, unit: '次 (83%)', trend: 'up', trendValue: '↑ 5 次' },
    { label: '需转人工导师', value: 6, unit: '次 (13%)', trend: 'down', trendValue: '↓ 1 次' },
    { label: '未找到答案', value: 2, unit: '次 (4%)', trend: 'down', trendValue: '↓ 1 次' },
  ]

  const questionHeatMap = data?.questionHeatMap || defaultQuestionHeatMap
  const todayQA = data?.todayQA || defaultTodayQA
  const knowledgeGapTracking = data?.knowledgeGapTracking || defaultKnowledgeGapTracking
  const qualityMetrics = data?.qualityMetrics || defaultQualityMetrics

  // 获取质量指标图标和颜色
  const getMetricIcon = (label: string) => {
    switch (label) {
      case '今日总问答':
        return { icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100' }
      case 'Agent 直接回答':
        return { icon: CheckCircle, color: 'text-[#10B981]', bgColor: 'bg-[#10B981]/10' }
      case '需转人工导师':
        return { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-100' }
      case '未找到答案':
        return { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-100' }
      default:
        return { icon: MessageSquare, color: 'text-gray-600', bgColor: 'bg-gray-100' }
    }
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg
                       text-gray-600 hover:bg-gray-200 hover:text-gray-900
                       transition-all duration-200"
            title="返回首页"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">员工问答</h1>
            <p className="text-sm text-gray-500 mt-1">员工自助提问，Agent 智能回答，持续发现知识盲区，驱动知识库迭代。</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString('zh-CN')}</span>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Loading 状态 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {/* Error 状态 */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <p className="text-sm font-bold text-red-800">加载失败</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
          >
            重试
          </button>
        </div>
      )}

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* 经验问答入口 */}
        <Link href="/experience" className="block">
          <div className="bg-gradient-to-r from-[#10B981] to-[#059669] rounded-xl p-6 text-white hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <HelpCircle className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-bold">经验问答</h2>
                <p className="text-sm text-white/80 mt-1">输入客户问题，AI 基于已审核知识生成回复建议</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/70">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                引用已审核知识
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                展示来源与审核人
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg w-fit">
              <span className="text-sm font-medium">立即提问</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* SOP 训练入口 */}
        <Link href="/sop" className="block">
          <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl p-6 text-white hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-bold">SOP 训练</h2>
                <p className="text-sm text-white/80 mt-1">完成导师布置的 SOP 训练任务</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/70">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                完成训练任务
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                提交 SOP 内容
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg w-fit">
              <span className="text-sm font-medium">查看任务</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* 问答热力图 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">①</span>
            问答热力图（按部门 / 主题）
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">部门</th>
                  <th className="pb-3 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      高频
                    </span>
                  </th>
                  <th className="pb-3 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      中频
                    </span>
                  </th>
                  <th className="pb-3 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      低频
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {questionHeatMap.map((row) => (
                  <tr key={row.department} className="border-b border-gray-50">
                    <td className="py-3 text-sm font-medium text-gray-900">{row.department}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.high.map((topic) => (
                          <span key={topic} className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.medium.map((topic) => (
                          <span key={topic} className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.low.map((topic) => (
                          <span key={topic} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/experience" className="block text-center text-sm text-[#10B981] font-medium mt-4 hover:underline">
            去经验问答 →
          </Link>
        </div>

        {/* 今日问答摘要 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">②</span>
              今日问答摘要（时间线）
            </h2>
            <Link href="/experience/history" className="text-sm text-[#10B981] font-medium hover:underline">查看全部 →</Link>
          </div>
          <div className="space-y-4">
            {todayQA.map((qa, index) => (
              <div key={qa.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${
                    qa.status === 'answered' ? 'bg-[#10B981]' : 'bg-amber-500'
                  }`}></div>
                  {index < todayQA.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-200 mt-1"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">{qa.time}</span>
                    <span className="text-sm font-medium text-gray-900">{qa.user}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">"{qa.question}"</p>
                  <div className="flex items-center gap-2">
                    {qa.status === 'answered' ? (
                      <span className="flex items-center gap-1 text-xs text-[#10B981] font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Agent 已回答
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        未找到匹配知识卡
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{qa.citation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/experience/history" className="block text-center text-sm text-[#10B981] font-medium mt-4 hover:underline">
            查看全部问答记录 →
          </Link>
        </div>
      </div>

      {/* 知识缺口追踪 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">③</span>
            知识缺口追踪（Agent 自动发现）
          </h2>
          <Link href="/knowledge-hub" className="text-sm text-[#10B981] font-medium hover:underline">查看知识库 →</Link>
        </div>
        <div className="space-y-3">
          {knowledgeGapTracking.map((gap) => (
            <div key={gap.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">「{gap.title}」</p>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    gap.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {gap.priority === 'high' ? '高优先级' : '中优先级'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">被问 {gap.frequency} 次，{gap.suggestedAction === 'create_card' ? '建议创建知识卡' : gap.suggestedAction === 'update_card' ? '建议更新知识卡' : '建议重写知识卡'}</p>
              </div>
              <Link href={`/knowledge-cards/new?title=${encodeURIComponent(gap.title)}&gapId=${gap.id}`} className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors">
                {gap.action}
              </Link>
            </div>
          ))}
        </div>
        <Link href="/knowledge-hub" className="block text-center text-sm text-[#10B981] font-medium mt-4 hover:underline">
          查看全部知识缺口 →
        </Link>
      </div>

      {/* 问答质量指标 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">④</span>
            问答质量指标
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">较昨日</span>
            <Link href="/knowledge-hub" className="text-sm text-[#10B981] font-medium hover:underline">查看知识库 →</Link>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {qualityMetrics.map((metric) => {
            const { icon: Icon, color, bgColor } = getMetricIcon(metric.label)
            return (
              <div key={metric.label} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <span className="text-sm text-gray-600">{metric.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
                  <span className="text-sm text-gray-500">{metric.unit}</span>
                </div>
                <p className={`text-xs mt-1 ${metric.trend === 'up' ? 'text-green-600' : 'text-green-600'}`}>
                  较昨日 {metric.trendValue}
                </p>
              </div>
            )
          })}
        </div>
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">员工满意度评分</p>
              <p className="text-xs text-gray-500 mt-1">目标 4.5 / 5.0</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">4.3</span>
              <span className="text-sm text-gray-500">/ 5.0</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Agent 说明 */}
      <div className="mt-6 bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-[#10B981]" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Agent 问答规则：</span>
            Agent 会持续分析高频问题与低质量回答，自动发现知识缺口并推动知识库优化，提升回答准确率与员工满意度。
          </p>
        </div>
      </div>
    </div>
  )
}
