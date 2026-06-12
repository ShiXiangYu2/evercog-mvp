'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plug,
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Settings,
  RefreshCw,
} from 'lucide-react'

interface WeComIntegrationData {
  connectionStatus: {
    appStatus: string
    appName: string
    authStatus: string
    expireDate: string
    messageChannel: string
    todayMessages: number
    avgResponseTime: number
  }
  departmentStatus: Array<{
    name: string
    status: string
    members: number
    todayActive: number
    statusColor: string
  }>
  usageData: {
    todayActiveUsers: number
    weeklyQuestions: number
    monthlyNewUsers: number
    retentionRate: number
  }
  configItems: Array<{
    label: string
    value: string
    description: string
    icon: string
  }>
  stats: {
    totalUsers: number
    activeUsers: number
    totalPushRecords: number
    unreadPushRecords: number
  }
}

export default function WeComIntegrationPage() {
  const [data, setData] = useState<WeComIntegrationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/wecom-integration', { credentials: 'same-origin' })
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

  // 模拟数据 - 连接状态
  const defaultConnectionStatus = {
    appStatus: '已连接',
    appName: 'GenericAgent 智能助手',
    authStatus: '正常',
    expireDate: '2027-01-15',
    messageChannel: '双向同步',
    todayMessages: 1247,
    avgResponseTime: 1.8,
  }

  // 模拟数据 - 部门接入情况
  const defaultDepartmentStatus = [
    { name: '销售部', status: '已接入', members: 42, todayActive: 35, statusColor: 'text-[#10B981]' },
    { name: '客服部', status: '已接入', members: 28, todayActive: 24, statusColor: 'text-[#10B981]' },
    { name: '运营部', status: '已接入', members: 18, todayActive: 12, statusColor: 'text-[#10B981]' },
    { name: '技术部', status: '已接入', members: 15, todayActive: 6, statusColor: 'text-[#10B981]' },
    { name: '人力资源部', status: '未接入', members: 0, todayActive: 0, statusColor: 'text-amber-500' },
    { name: '财务部', status: '未接入', members: 0, todayActive: 0, statusColor: 'text-amber-500' },
  ]

  // 模拟数据 - 使用数据看板
  const defaultUsageData = {
    todayActiveUsers: 89,
    weeklyQuestions: 3421,
    monthlyNewUsers: 127,
    retentionRate: 78,
  }

  // 模拟数据 - 配置管理
  const defaultConfigItems = [
    { label: '消息模板', value: '已配置 8 套', description: '政策简报、知识卡推送、审核通知等', icon: '📋' },
    { label: '权限策略', value: '按部门分级', description: '销售部：全量 / 客服部：客服相关 / 其他：基础', icon: '🔒' },
    { label: '自动回复规则', value: '32 条生效中', description: '智能匹配员工问题，自动回复', icon: '🤖' },
    { label: '知识卡推送频率', value: '每日 2 次', description: '09:00、14:00 定时推送', icon: '⏰' },
  ]

  const connectionStatus = data?.connectionStatus || defaultConnectionStatus
  const departmentStatus = data?.departmentStatus || defaultDepartmentStatus
  const usageData = data?.usageData || defaultUsageData
  const configItems = data?.configItems || defaultConfigItems

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">企业微信集成</h1>
          <p className="text-sm text-gray-500 mt-1">连接企业微信生态，打通沟通触点，提升员工使用体验与知识触达效率。</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
            <span className="text-gray-500">?</span>
            帮助中心
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors">
            重新连接
          </button>
        </div>
      </div>

      {/* 连接状态 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">①</span>
          连接状态
        </h2>
        <div className="grid grid-cols-5 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Plug className="w-5 h-5 text-[#10B981]" />
              <span className="text-sm text-gray-600">企业微信应用</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">{connectionStatus.appStatus}</span>
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-xs text-gray-500 mt-1">应用名称：{connectionStatus.appName}</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
              <span className="text-sm text-gray-600">授权状态</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">{connectionStatus.authStatus}</span>
              <span className="w-2 h-2 bg-[#10B981] rounded-full"></span>
            </div>
            <p className="text-xs text-gray-500 mt-1">到期时间：{connectionStatus.expireDate}</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">消息通道</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">{connectionStatus.messageChannel}</span>
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">今日消息量</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{connectionStatus.todayMessages.toLocaleString()} <span className="text-sm font-medium text-gray-500">条</span></div>
            <p className="text-xs text-green-600 mt-1">较昨日 ↑ 15%</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-gray-600">平均响应时间</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{connectionStatus.avgResponseTime} <span className="text-sm font-medium text-gray-500">秒</span></div>
            <p className="text-xs text-green-600 mt-1">较昨日 ↓ 0.3 秒</p>
          </div>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* 使用数据看板 */}
        <div className="col-span-2 bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">②</span>
            使用数据看板
          </h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-600">今日活跃用户</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{usageData.todayActiveUsers} <span className="text-xs font-medium text-gray-500">人</span></div>
              <p className="text-xs text-green-600 mt-1">较昨日 ↑ 12 人</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-[#10B981]" />
                <span className="text-xs text-gray-600">本周累计问答</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{usageData.weeklyQuestions.toLocaleString()} <span className="text-xs font-medium text-gray-500">次</span></div>
              <p className="text-xs text-green-600 mt-1">较上周 ↑ 18%</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-gray-600">本月新增用户</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{usageData.monthlyNewUsers} <span className="text-xs font-medium text-gray-500">人</span></div>
              <p className="text-xs text-green-600 mt-1">较上月 ↑ 26 人</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-gray-600">用户留存率（周）</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{usageData.retentionRate} <span className="text-xs font-medium text-gray-500">%</span></div>
              <p className="text-xs text-green-600 mt-1">较上周 ↑ 5%</p>
            </div>
          </div>
          {/* 模拟图表区域 */}
          <div className="h-48 bg-gray-50 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">问答次数（次）— 活跃用户（人）</p>
              <p className="text-xs text-gray-400 mt-1">图表区域（需接入图表库）</p>
            </div>
          </div>
        </div>

        {/* 部门接入情况 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">③</span>
              部门接入情况
            </h2>
            <a href="#" className="text-sm text-[#10B981] font-medium hover:underline">查看全部部门 →</a>
          </div>
          <div className="space-y-3">
            {departmentStatus.map((dept) => (
              <div key={dept.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dept.name}</p>
                    <p className={`text-xs font-medium ${dept.statusColor}`}>{dept.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{dept.members}</p>
                  <p className="text-xs text-gray-500">今日活跃 {dept.todayActive}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 px-4 py-2 text-sm font-medium text-[#10B981] bg-[#10B981]/10 rounded-lg hover:bg-[#10B981]/20 transition-colors">
            邀请接入
          </button>
        </div>
      </div>

      {/* 配置管理 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-[#10B981] rounded-md flex items-center justify-center text-white text-xs font-bold">④</span>
          配置管理
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {configItems.map((config) => (
            <div key={config.label} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{config.icon}</span>
                <span className="text-sm font-medium text-gray-900">{config.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900 mb-1">{config.value}</p>
              <p className="text-xs text-gray-500 mb-3">{config.description}</p>
              <button className="text-sm text-[#10B981] font-medium hover:underline">
                查看详情
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 集成说明 */}
      <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-[#10B981]" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold">集成说明：</span>
            通过企业微信应用接入，员工可在聊天中直接提问、接收推送、提交反馈，数据自动回流至知识中台，形成闭环。
          </p>
          <button className="ml-auto text-sm text-[#10B981] font-medium hover:underline flex items-center gap-1">
            查看集成文档
          </button>
        </div>
      </div>

      {/* 演示模式提示 */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <p className="text-sm text-amber-700">
            <span className="font-semibold">演示模式：</span>
            当前为企业微信集成配置预览，数据为演示数据。正式版将接入真实企业微信 API。
          </p>
        </div>
      </div>
    </div>
  )
}
