'use client'

import { useState, useEffect } from 'react'
import {
  Shield,
  Check,
  X,
  BookOpen,
  ScrollText,
  MessageSquare,
  User as UserIcon,
  ChevronRight,
  Settings,
} from 'lucide-react'

interface PermissionItem {
  name: string
  description: string
  roles: string[]
}

interface PermissionCategory {
  category: string
  items: PermissionItem[]
}

interface RoleInfo {
  key: string
  label: string
  color: string
}

interface MatrixData {
  roles: RoleInfo[]
  permissions: PermissionCategory[]
}

interface UserPermissions {
  user: {
    id: string
    name: string
    role: string
    departmentId: string
  }
  knowledge: {
    canViewPublic: boolean
    canViewDepartment: boolean
    canViewFinance: boolean
    canViewAll: boolean
  }
  review: {
    canReviewKnowledgeCard: boolean
    canReviewPolicyBrief: boolean
    canReviewSOPSubmission: boolean
  }
  audit: {
    canViewLogs: boolean
  }
}

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

const categoryIcons: Record<string, React.ElementType> = {
  '知识卡查看': BookOpen,
  '知识卡操作': BookOpen,
  '审计日志': ScrollText,
  '经验调用': MessageSquare,
}

export default function PermissionsPage() {
  const [matrix, setMatrix] = useState<MatrixData | null>(null)
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    const userId = localStorage.getItem('currentUserId') || '4'
    setCurrentUserId(userId)

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/settings/permissions?userId=${userId}`)
        const data = await res.json()
        setMatrix(data.matrix)
        setUserPermissions(data.userPermissions)
      } catch (error) {
        console.error('Failed to fetch permissions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getPermIcon = (has: boolean) =>
    has ? (
      <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
      </div>
    ) : (
      <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
        <X className="w-3.5 h-3.5 text-gray-400" strokeWidth={3} />
      </div>
    )

  return (
    <div className="min-h-screen flex flex-col">

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              权限说明
            </h1>
            <p className="text-sm text-gray-500 mt-1 ml-15">
              查看各角色的权限配置和访问范围
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-8">
              {/* 当前用户权限概览 */}
              {userPermissions && (
                <div className="bg-white rounded-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">当前用户权限</h2>
                      <p className="text-sm text-gray-500">
                        {userPermissions.user.name} · {roleLabels[userPermissions.user.role]}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {/* 知识卡查看 */}
                    <div className="bg-gray-50 rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <BookOpen className="w-4 h-4 text-blue-500" strokeWidth={2} />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">知识卡查看</span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">公开知识卡</span>
                          {getPermIcon(userPermissions.knowledge.canViewPublic)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">本部门知识卡</span>
                          {getPermIcon(userPermissions.knowledge.canViewDepartment)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">财务相关知识卡</span>
                          {getPermIcon(userPermissions.knowledge.canViewFinance)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">全部知识卡</span>
                          {getPermIcon(userPermissions.knowledge.canViewAll)}
                        </div>
                      </div>
                    </div>

                    {/* 审核权限 */}
                    <div className="bg-gray-50 rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-4 h-4 text-purple-500" strokeWidth={2} />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">审核权限</span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">审核知识卡</span>
                          {getPermIcon(userPermissions.review.canReviewKnowledgeCard)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">审核政策简报</span>
                          {getPermIcon(userPermissions.review.canReviewPolicyBrief)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">审核 SOP 提交</span>
                          {getPermIcon(userPermissions.review.canReviewSOPSubmission)}
                        </div>
                      </div>
                    </div>

                    {/* 其他权限 */}
                    <div className="bg-gray-50 rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <ScrollText className="w-4 h-4 text-gray-500" strokeWidth={2} />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">其他权限</span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">查看审计日志</span>
                          {getPermIcon(userPermissions.audit.canViewLogs)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 知识可见范围说明 */}
              <div className="bg-white rounded-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">知识卡可见范围</h2>
                    <p className="text-sm text-gray-500">不同可见范围下各角色的访问权限</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          可见范围
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          说明
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-red-500">管理员</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-amber-500">财务</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-indigo-500">导师</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-blue-500">销售</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-emerald-500">客服</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-purple-500">运营</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-cyan-500">AI 工程师</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-pink-500">新人</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-md text-sm font-bold">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            public（公开）
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">所有角色均可查看</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm font-bold">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            department（部门内）
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">仅本部门成员可查看</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md text-sm font-bold">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            role（角色可见）
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">财务角色可看所有财务相关</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(true)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(false)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(false)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(false)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(false)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(false)}</td>
                        <td className="py-4 px-4 text-center">{getPermIcon(false)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 角色权限矩阵 */}
              {matrix && (
                <div className="bg-white rounded-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Settings className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">角色权限矩阵</h2>
                      <p className="text-sm text-gray-500">各角色在不同功能模块的权限一览</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {matrix.permissions.map((permCategory) => {
                      const CatIcon = categoryIcons[permCategory.category] || Shield
                      return (
                        <div key={permCategory.category}>
                          <div className="flex items-center gap-2 mb-4">
                            <CatIcon className="w-4 h-4 text-gray-400" strokeWidth={2} />
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                              {permCategory.category}
                            </h3>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b-2 border-gray-200">
                                  <th className="text-left py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-48">
                                    权限项
                                  </th>
                                  <th className="text-left py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-64">
                                    说明
                                  </th>
                                  {matrix.roles.map((role) => (
                                    <th key={role.key} className={`text-center py-2 px-3 text-xs font-bold ${role.color.split(' ')[0].replace('bg-', 'text-')}`}>
                                      {role.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {permCategory.items.map((item, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                  >
                                    <td className="py-3 px-4">
                                      <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="text-sm text-gray-500">{item.description}</span>
                                    </td>
                                    {matrix.roles.map((role) => (
                                      <td key={role.key} className="py-3 px-3 text-center">
                                        {getPermIcon(item.roles.includes(role.key))}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 权限说明 */}
              <div className="bg-white rounded-lg p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">权限规则说明</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">知识卡可见范围</p>
                      <p className="text-sm text-gray-500 mt-1">
                        知识卡创建时设定可见范围。<strong>public</strong> 全员可见；<strong>department</strong> 仅创建者所在部门可见；
                        <strong>role</strong> 财务角色可查看所有财务相关知识卡，其他角色仅可查看本部门创建的。
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <ChevronRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">审核权限</p>
                      <p className="text-sm text-gray-500 mt-1">
                        仅 <strong>管理员</strong>、<strong>导师</strong> 和 <strong>财务</strong> 角色可审核知识卡。
                        审核通过后知识卡状态变为 published，版本号递增。
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <ChevronRight className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">审计日志</p>
                      <p className="text-sm text-gray-500 mt-1">
                        系统自动记录所有关键操作，包括创建、编辑、审核、发布、查询等。
                        <strong>管理员</strong>、<strong>财务</strong>、<strong>导师</strong> 和 <strong>AI 工程师</strong> 可查看审计日志。
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">经验调用过滤</p>
                      <p className="text-sm text-gray-500 mt-1">
                        经验查询时，系统会根据当前用户角色和部门自动过滤知识卡，仅返回用户有权限查看的内容作为检索结果。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
