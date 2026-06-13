'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Send,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Building2,
  Users,
  User,
  MessageSquare,
  Mail,
  Smartphone,
  AlertTriangle,
  FileText,
  ChevronRight,
} from 'lucide-react'

interface PolicyBrief {
  id: string
  title: string
  summary: string
  keyClauses: string | null
  actionSuggestions: string | null
  riskReminders: string | null
  sourceUrl: string | null
  reviewStatus: string
  generator: { id: string; name: string }
}

interface Department {
  id: string
  name: string
  _count: { users: number }
}

interface RoleOption {
  value: string
  label: string
  count: number
}

interface TargetSelection {
  id: string | null
  name: string
}

const channelOptions = [
  { value: 'wecom', label: '企业微信', icon: MessageSquare, color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-500' },
  { value: 'email', label: '邮件', icon: Mail, color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-500' },
  { value: 'sms', label: '短信', icon: Smartphone, color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-500' },
]

const targetTypeOptions = [
  { value: 'department', label: '按部门推送', icon: Building2, description: '推送到整个部门的所有成员' },
  { value: 'role', label: '按角色推送', icon: Users, description: '推送到指定角色的所有用户' },
  { value: 'user', label: '按用户推送', icon: User, description: '推送到指定的个别用户' },
]

const roleLabels: Record<string, string> = {
  sales: '销售',
  customer_service: '客服',
  operations: '运营',
  finance: '财务',
  mentor: '导师',
  trainee: '新人',
  admin: '管理员',
  ai_info: 'AI 工程师',
}

const roleColors: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-700 border-blue-300',
  customer_service: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  operations: 'bg-purple-100 text-purple-700 border-purple-300',
  finance: 'bg-amber-100 text-amber-700 border-amber-300',
  mentor: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  trainee: 'bg-pink-100 text-pink-700 border-pink-300',
  admin: 'bg-red-100 text-red-700 border-red-300',
  ai_info: 'bg-cyan-100 text-cyan-700 border-cyan-300',
}

function NewPushRecordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const briefId = searchParams.get('briefId') || ''

  const [brief, setBrief] = useState<PolicyBrief | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string; department: { name: string } }>>([])

  const [channel, setChannel] = useState('wecom')
  const [targetType, setTargetType] = useState('department')
  const [selectedTargets, setSelectedTargets] = useState<TargetSelection[]>([])
  const [pusherId, setPusherId] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Load brief data
  const fetchBrief = useCallback(async () => {
    if (!briefId) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/policy-briefs/${briefId}`)
      if (res.ok) {
        const data = await res.json()
        setBrief(data)
      }
    } catch (err) {
      console.error('Failed to fetch brief:', err)
    }
  }, [briefId])

  // Load departments, roles, users
  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch('/api/push-records/targets')
      if (res.ok) {
        const data = await res.json()
        setDepartments(data.departments || [])
        setRoleOptions(data.roles || [])
        setUsers(data.users || [])
      }
    } catch {
      // Fallback: use hardcoded data from the DB we already know
      // This will be handled by the API
    }
  }, [])

  useEffect(() => {
    // Get current user from localStorage
    const savedUserId = localStorage.getItem('currentUserId')
    if (savedUserId) setPusherId(savedUserId)

    Promise.all([fetchBrief(), fetchTargets()]).finally(() => setLoading(false))
  }, [fetchBrief, fetchTargets])

  const handleTargetToggle = (target: TargetSelection) => {
    setSelectedTargets(prev => {
      const exists = prev.find(t => t.id === target.id && t.name === target.name)
      if (exists) {
        return prev.filter(t => !(t.id === target.id && t.name === target.name))
      }
      return [...prev, target]
    })
  }

  const handleSelectAll = () => {
    if (targetType === 'department') {
      const allTargets = departments.map(d => ({ id: d.id, name: d.name }))
      setSelectedTargets(allTargets)
    } else if (targetType === 'role') {
      const allTargets = roleOptions.map(r => ({ id: r.value, name: r.label }))
      setSelectedTargets(allTargets)
    } else {
      const allTargets = users.map(u => ({ id: u.id, name: u.name }))
      setSelectedTargets(allTargets)
    }
  }

  const handleClearAll = () => {
    setSelectedTargets([])
  }

  const handleSubmit = async () => {
    if (!briefId || !pusherId || selectedTargets.length === 0) {
      setError('请选择推送目标')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/push-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyBriefId: briefId,
          channel,
          targetType,
          targets: selectedTargets,
          pusherId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '推送失败')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/push-records')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '推送失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (!briefId) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
          <p className="text-gray-600 font-semibold text-lg mb-4">请先选择一份已审核的政策简报</p>
          <Link
            href="/policy-briefs"
            className="px-5 py-2.5 bg-blue-500 text-white font-semibold rounded-md
                       transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02]"
          >
            前往政策简报列表
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-white rounded-lg p-12 text-center border-4 border-emerald-200">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">推送成功</h2>
            <p className="text-gray-500 font-medium">
              已向 {selectedTargets.length} 个目标发送 {channelOptions.find(c => c.value === channel)?.label}
            </p>
            <p className="text-sm text-gray-400 mt-2">正在跳转到推送记录列表...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/push-records"
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100
                         transition-all duration-200 hover:scale-110"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">新建推送</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">从已审核简报创建推送记录</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Brief Preview */}
            {brief && (
              <div className="bg-white rounded-lg p-6 border-2 border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">推送简报</h2>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">{brief.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{brief.summary}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>生成者：{brief.generator.name}</span>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md font-semibold">
                    已审核
                  </span>
                </div>
              </div>
            )}

            {/* Channel Selection */}
            <div className="bg-white rounded-lg p-6 border-2 border-gray-100">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">选择渠道</h2>
              <div className="grid grid-cols-3 gap-3">
                {channelOptions.map(opt => {
                  const Icon = opt.icon
                  const isSelected = channel === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setChannel(opt.value)}
                      className={`p-4 rounded-lg border-4 text-center transition-all duration-200
                                 ${isSelected
                                   ? `${opt.border} ${opt.bg} scale-[1.02]`
                                   : 'border-gray-200 hover:border-gray-300 hover:scale-[1.01]'
                                 }`}
                    >
                      <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? opt.color : 'text-gray-400'}`} />
                      <p className={`text-sm font-bold ${isSelected ? opt.color : 'text-gray-600'}`}>
                        {opt.label}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Target Type Selection */}
            <div className="bg-white rounded-lg p-6 border-2 border-gray-100">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">推送对象类型</h2>
              <div className="grid grid-cols-3 gap-3">
                {targetTypeOptions.map(opt => {
                  const Icon = opt.icon
                  const isSelected = targetType === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setTargetType(opt.value); setSelectedTargets([]) }}
                      className={`p-4 rounded-lg border-4 text-left transition-all duration-200
                                 ${isSelected
                                   ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                                   : 'border-gray-200 hover:border-gray-300 hover:scale-[1.01]'
                                 }`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <p className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{opt.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Target Selection */}
            <div className="bg-white rounded-lg p-6 border-2 border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                  选择推送目标
                  {selectedTargets.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs">
                      已选 {selectedTargets.length} 个
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-md
                               border-2 border-blue-200 hover:bg-blue-100 transition-all"
                  >
                    全选
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 rounded-md
                               border-2 border-gray-200 hover:bg-gray-100 transition-all"
                  >
                    清空
                  </button>
                </div>
              </div>

              {/* Department targets */}
              {targetType === 'department' && (
                <div className="grid grid-cols-2 gap-3">
                  {departments.map(dept => {
                    const isSelected = selectedTargets.some(t => t.id === dept.id)
                    return (
                      <button
                        key={dept.id}
                        onClick={() => handleTargetToggle({ id: dept.id, name: dept.name })}
                        className={`p-4 rounded-lg border-4 text-left transition-all duration-200
                                   ${isSelected
                                     ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                                     : 'border-gray-200 hover:border-gray-300 hover:scale-[1.01]'
                                   }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Building2 className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            <div>
                              <p className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                {dept.name}
                              </p>
                              <p className="text-xs text-gray-400">{dept._count.users} 人</p>
                            </div>
                          </div>
                          {isSelected && <CheckCircle className="w-5 h-5 text-blue-500" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Role targets */}
              {targetType === 'role' && (
                <div className="grid grid-cols-2 gap-3">
                  {roleOptions.map(role => {
                    const isSelected = selectedTargets.some(t => t.id === role.value)
                    const colors = roleColors[role.value] || 'bg-gray-100 text-gray-700 border-gray-300'
                    return (
                      <button
                        key={role.value}
                        onClick={() => handleTargetToggle({ id: role.value, name: role.label })}
                        className={`p-4 rounded-lg border-4 text-left transition-all duration-200
                                   ${isSelected
                                     ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                                     : 'border-gray-200 hover:border-gray-300 hover:scale-[1.01]'
                                   }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${colors}`}>
                              {role.label}
                            </span>
                            <p className="text-xs text-gray-400">{role.count} 人</p>
                          </div>
                          {isSelected && <CheckCircle className="w-5 h-5 text-blue-500" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* User targets */}
              {targetType === 'user' && (
                <div className="grid grid-cols-2 gap-3">
                  {users.map(user => {
                    const isSelected = selectedTargets.some(t => t.id === user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleTargetToggle({ id: user.id, name: user.name })}
                        className={`p-4 rounded-lg border-4 text-left transition-all duration-200
                                   ${isSelected
                                     ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                                     : 'border-gray-200 hover:border-gray-300 hover:scale-[1.01]'
                                   }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-sm
                                           ${isSelected ? 'bg-blue-500' : 'bg-gray-400'}`}>
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-400">{user.department.name} / {roleLabels[user.role] || user.role}</p>
                            </div>
                          </div>
                          {isSelected && <CheckCircle className="w-5 h-5 text-blue-500" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border-4 border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm font-semibold text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <div className="bg-white rounded-lg p-6 border-2 border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {selectedTargets.length > 0 ? (
                  <span>
                    将向 <span className="font-bold text-gray-900">{selectedTargets.length}</span> 个目标
                    发送 <span className="font-bold text-gray-900">{channelOptions.find(c => c.value === channel)?.label}</span>
                  </span>
                ) : (
                  <span className="text-gray-400">请至少选择一个推送目标</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/push-records"
                  className="px-5 py-2.5 rounded-md text-sm font-semibold border-2 border-gray-200
                             text-gray-600 hover:bg-gray-100 transition-all duration-200"
                >
                  取消
                </Link>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selectedTargets.length === 0 || !pusherId}
                  className="px-6 py-2.5 bg-blue-500 text-white font-semibold rounded-md border-4 border-blue-600
                             transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02]
                             disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  发送推送
                </button>
              </div>
            </div>
          </div>
        </main>
    </div>
  )
}

export default function NewPushRecordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    }>
      <NewPushRecordContent />
    </Suspense>
  )
}
