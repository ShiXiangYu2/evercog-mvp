'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Database,
  FileText,
  AlertTriangle,
  Clock,
  RefreshCw,
  Star,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
} from 'lucide-react'

interface KnowledgeHubData {
  stats: {
    totalKnowledgeCards: number
    pendingKnowledgeCardsCount: number
    publishedKnowledgeCardsCount: number
    thisMonthNewCards: number
    outdatedCardsCount: number
    avgQualityScore: number
  }
  categories: Array<{
    name: string
    count: number
    icon: string
    lastUpdate: string
  }>
  recentCards: Array<{
    id: string
    title: string
    category: string
    updater: string
    updateTime: string
    status: string
    quality: number | null
    citations: number
  }>
  qualityMetrics: Array<{
    id: string
    metricType: string
    value: number
    target: number
  }>
  agentSuggestions: Array<{
    id: string
    type: string
    title: string
    tag: string
    tagColor: string
    action: string
  }>
  pendingAgentTasks: number
}

export default function KnowledgeHubPage() {
  const [data, setData] = useState<KnowledgeHubData | null>(null)
  useEffect(() => {
    fetch('/api/knowledge-hub', {
      credentials: 'same-origin', // 携带 Cookie 认证
    })
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

  // 模拟数据 - 知识卡分类
  const defaultCategories = [
    { name: '财税政策', count: 87, icon: '💰', lastUpdate: '2h 前' },
    { name: '申报流程', count: 64, icon: '📋', lastUpdate: '1d 前' },
    { name: '客户服务', count: 53, icon: '🤝', lastUpdate: '3h 前' },
    { name: '产品知识', count: 48, icon: '📦', lastUpdate: '5d 前' },
    { name: '内部 SOP', count: 41, icon: '📝', lastUpdate: '1w 前' },
    { name: '行业资讯', count: 32, icon: '📰', lastUpdate: '4h 前' },
    { name: '其他', count: 17, icon: '📁', lastUpdate: '2w 前' },
  ]

  // 模拟数据 - Agent 优化建议
  const defaultAgentSuggestions = [
    {
      id: '1',
      type: 'merge',
      title: '建议合并「补贴申报流程」与「补贴政策解读」中 3 张重复知识卡',
      tag: '结构优化',
      tagColor: 'bg-blue-100 text-blue-700',
      action: '去处理',
    },
    {
      id: '2',
      type: 'move',
      title: '建议将「客户服务边界 SOP」从「内部 SOP」迁移至「客户服务」分类',
      tag: '分类优化',
      tagColor: 'bg-purple-100 text-purple-700',
      action: '去处理',
    },
    {
      id: '3',
      type: 'add',
      title: '建议为「专精特新认定」新增 2 张知识卡（当前覆盖不足）',
      tag: '内容补充',
      tagColor: 'bg-green-100 text-green-700',
      action: '去处理',
    },
    {
      id: '4',
      type: 'update',
      title: '发现 5 张知识卡引用了已过时的政策编号，需更新',
      tag: '质量问题',
      tagColor: 'bg-red-100 text-red-700',
      action: '去处理',
    },
  ]

  // 模拟数据 - 最近更新的知识卡
  const defaultRecentCards = [
    {
      id: '1',
      title: '南京市中小企业数字化转型补贴政策解读',
      category: '财税政策',
      updater: '运营部-张三',
      updateTime: '2h 前',
      status: '已发布',
      quality: 4.6,
      citations: 36,
    },
    {
      id: '2',
      title: '小微企业税收优惠适用条件说明',
      category: '财税政策',
      updater: '财务部-李四',
      updateTime: '3h 前',
      status: '已发布',
      quality: 4.3,
      citations: 28,
    },
    {
      id: '3',
      title: '客户服务边界 SOP（试行版）',
      category: '客户服务',
      updater: '客服部-王五',
      updateTime: '5h 前',
      status: '待审核',
      quality: null,
      citations: 0,
    },
    {
      id: '4',
      title: '专精特新企业认定申报流程图',
      category: '申报流程',
      updater: '运营部-张三',
      updateTime: '1d 前',
      status: '已发布',
      quality: 4.8,
      citations: 52,
    },
  ]

  // 模拟数据 - 质量监控指标
  const defaultQualityMetrics = [
    { id: '1', metricType: 'coverage', value: 78, target: 90 },
    { id: '2', metricType: 'citation_rate', value: 62, target: 80 },
    { id: '3', metricType: 'satisfaction', value: 4.1, target: 4.5 },
    { id: '4', metricType: 'outdated_rate', value: 2.6, target: 1 },
  ]

  const categories = data?.categories || defaultCategories
  const agentSuggestions = data?.agentSuggestions || defaultAgentSuggestions
  const recentCards = data?.recentCards || defaultRecentCards
  const qualityMetrics = data?.qualityMetrics || defaultQualityMetrics

  // 质量监控指标标签
  const metricLabels: Record<string, string> = {
    coverage: '知识卡覆盖率',
    citation_rate: '员工引用率',
    satisfaction: '平均引用满意度',
    outdated_rate: '过时率',
  }

  // 质量监控指标单位
  const metricUnits: Record<string, string> = {
    coverage: '%',
    citation_rate: '%',
    satisfaction: '/5.0',
    outdated_rate: '%',
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">知识中台</h1>
          <p className="text-sm text-gray-500 mt-1">统一管理知识资产，持续优化知识质量，赋能员工高效服务客户。</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            知识卡导入
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            批量操作
          </button>
          <Link
            href="/knowledge-cards/new"
            className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors"
          >
            新建知识卡
          </Link>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">知识卡总数</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{data?.stats.totalKnowledgeCards || 342} <span className="text-sm font-medium text-gray-500">张</span></div>
          <p className="text-xs text-green-600 mt-1">较上月 ↑ 36 张</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">本月新增</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{data?.stats.thisMonthNewCards || 28} <span className="text-sm font-medium text-gray-500">张</span></div>
          <p className="text-xs text-green-600 mt-1">较上月 ↑ 8 张</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">待审核</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{data?.stats.pendingKnowledgeCardsCount || 15} <span className="text-sm font-medium text-gray-500">张</span></div>
          <p className="text-xs text-green-600 mt-1">较上月 ↓ 3 张</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">已过时/需更新</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{data?.stats.outdatedCardsCount || 9} <span className="text-sm font-medium text-gray-500">张</span></div>
          <p className="text-xs text-green-600 mt-1">较上月 ↓ 4 张</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">平均质量评分</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{data?.stats.avgQualityScore || 4.2} <span className="text-sm font-medium text-gray-500">/ 5.0</span></div>
          <p className="text-xs text-green-600 mt-1">较上月 ↑ 0.3</p>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* 知识卡分类 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">②</span>
              知识卡分类
            </h2>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索分类"
                className="text-sm border-0 focus:ring-0 focus:outline-none w-24"
              />
            </div>
          </div>
          <div className="space-y-3">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={`/knowledge-cards?category=${encodeURIComponent(category.name)}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{category.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{category.name}</p>
                    <p className="text-xs text-gray-500">最近更新: {category.lastUpdate}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">{category.count} 张</span>
              </Link>
            ))}
          </div>
          <Link href="/knowledge-cards" className="block text-center text-sm text-[#10B981] font-medium mt-4 hover:underline">
            查看全部分类 →
          </Link>
        </div>

        {/* Agent 优化建议 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">③</span>
              Agent 优化建议
            </h2>
            <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">待处理：{agentSuggestions.length} 项</span>
          </div>
          <div className="space-y-3">
            {agentSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#10B981]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {suggestion.type === 'merge' ? (
                      <RefreshCw className="w-4 h-4 text-[#10B981]" />
                    ) : suggestion.type === 'move' ? (
                      <RefreshCw className="w-4 h-4 text-[#10B981]" />
                    ) : suggestion.type === 'add' ? (
                      <Plus className="w-4 h-4 text-[#10B981]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#10B981]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 mb-2">{suggestion.title}</p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${suggestion.tagColor}`}>
                        {suggestion.tag}
                      </span>
                      <Link href="/knowledge-cards" className="text-sm text-[#10B981] font-medium hover:underline">
                        {suggestion.action}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/knowledge-cards" className="block text-center text-sm text-[#10B981] font-medium mt-4 hover:underline">
            查看全部建议 →
          </Link>
        </div>

        {/* 质量监控 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">④</span>
              质量监控
            </h2>
            <span className="text-sm text-gray-500">本月</span>
          </div>
          <div className="space-y-4">
            {qualityMetrics.map((metric) => (
              <div key={metric.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{metricLabels[metric.metricType] || metric.metricType}</span>
                  <span className="text-sm text-gray-500">目标 {metric.target}{metricUnits[metric.metricType] || ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
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
                            ? Math.min((metric.target / metric.value) * 100, 100)
                            : Math.min((metric.value / metric.target) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-16 text-right">
                    {metric.value}{metricUnits[metric.metricType] || ''}
                  </span>
                  {metric.value >= metric.target ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-amber-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <Link href="/knowledge-cards" className="block text-center text-sm text-[#10B981] font-medium mt-4 hover:underline">
            查看质量报告 →
          </Link>
        </div>
      </div>

      {/* 最近更新的知识卡 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">最近更新的知识卡</h2>
          <Link href="/knowledge-cards" className="text-sm text-[#10B981] font-medium hover:underline">查看全部知识卡 →</Link>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">知识卡标题</th>
              <th className="pb-3 font-medium">分类</th>
              <th className="pb-3 font-medium">更新人</th>
              <th className="pb-3 font-medium">更新时间</th>
              <th className="pb-3 font-medium">状态</th>
              <th className="pb-3 font-medium">质量评分</th>
              <th className="pb-3 font-medium">引用次数</th>
              <th className="pb-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {recentCards.map((card) => (
              <tr key={card.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <Link href={`/knowledge-cards/${card.id}`} className="text-sm font-medium text-gray-900 hover:text-[#10B981]">
                      {card.title}
                    </Link>
                  </div>
                </td>
                <td className="py-4 text-sm text-gray-600">{card.category}</td>
                <td className="py-4 text-sm text-gray-600">{card.updater}</td>
                <td className="py-4 text-sm text-gray-600">{card.updateTime}</td>
                <td className="py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    card.status === '已发布' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {card.status}
                  </span>
                </td>
                <td className="py-4">
                  {card.quality ? (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium text-gray-900">{card.quality}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="py-4 text-sm text-gray-600">{card.citations}</td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/knowledge-cards/${card.id}`} className="text-sm text-[#10B981] font-medium hover:underline">查看</Link>
                    <Link href={`/knowledge-cards/${card.id}/edit`} className="text-sm text-[#10B981] font-medium hover:underline">编辑</Link>
                    <button className="text-sm text-gray-500 font-medium hover:underline">更多</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
