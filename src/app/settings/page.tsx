'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Settings,
  Users,
  Building2,
  Shield,
  ScrollText,
  ChevronRight,
  Plus,
  Search,
  Filter,
} from 'lucide-react'

interface SettingsData {
  users: Array<{
    id: string
    name: string
    email: string
    department: string
    role: string
    status: string
  }>
  departments: Array<{
    id: string
    name: string
    members: number
    permissions: string
  }>
  permissionMatrix: Array<{
    role: string
    knowledge: string
    review: string
    settings: string
    audit: string
  }>
  auditLogs: Array<{
    id: string
    time: string
    user: string
    action: string
    target: string
    details: string
    status: string
  }>
  stats: {
    totalUsers: number
    activeUsers: number
    totalDepartments: number
    totalAuditLogs: number
  }
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')

  useEffect(() => {
    fetch('/api/settings', { credentials: 'same-origin' })
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

  // 模拟数据 - 用户列表
  const defaultUsers = [
    { id: '1', name: '张三', email: 'zhangsan@example.com', department: '销售部', role: '销售', status: 'active' },
    { id: '2', name: '李四', email: 'lisi@example.com', department: '财务部', role: '财务', status: 'active' },
    { id: '3', name: '王五', email: 'wangwu@example.com', department: '客服部', role: '客服', status: 'active' },
    { id: '4', name: '赵六', email: 'zhaoliu@example.com', department: '运营部', role: '运营', status: 'active' },
    { id: '5', name: 'Admin', email: 'admin@example.com', department: 'AI 信息部', role: '管理员', status: 'active' },
  ]

  // 模拟数据 - 部门列表
  const defaultDepartments = [
    { id: '1', name: '销售部', members: 42, permissions: '全量' },
    { id: '2', name: '客服部', members: 28, permissions: '客服相关' },
    { id: '3', name: '运营部', members: 18, permissions: '运营相关' },
    { id: '4', name: '财务部', members: 15, permissions: '财务相关' },
    { id: '5', name: 'AI 信息部', members: 8, permissions: '全量' },
  ]

  // 模拟数据 - 权限矩阵
  const defaultPermissionMatrix = [
    { role: '管理员', knowledge: '✓', review: '✓', settings: '✓', audit: '✓' },
    { role: '导师', knowledge: '✓', review: '✓', settings: '✗', audit: '✓' },
    { role: '销售', knowledge: '✓', review: '✗', settings: '✗', audit: '✗' },
    { role: '客服', knowledge: '✓', review: '✗', settings: '✗', audit: '✗' },
    { role: '运营', knowledge: '✓', review: '✓', settings: '✗', audit: '✗' },
    { role: '财务', knowledge: '✓', review: '✓', settings: '✗', audit: '✗' },
  ]

  // 模拟数据 - 审计日志
  const defaultAuditLogs = [
    { id: '1', time: '10:32', user: '运营部-张三', action: '新增', target: '政策卡', details: '新增《南京市中小企业数字化转型补贴政策》知识卡', status: 'success' },
    { id: '2', time: '09:45', user: '财务部-李四', action: '更新', target: '财税卡', details: '更新《企业代账服务所需资料清单（2026 版）》', status: 'success' },
    { id: '3', time: '09:10', user: '客服部-王五', action: '确认', target: 'SOP', details: '确认《客户服务边界与免责说明》v1.2 版本', status: 'success' },
    { id: '4', time: '08:30', user: 'Admin', action: '登录', target: '系统', details: '管理员登录系统', status: 'success' },
  ]

  const users = data?.users || defaultUsers
  const departments = data?.departments || defaultDepartments
  const permissionMatrix = data?.permissionMatrix || defaultPermissionMatrix
  const auditLogs = data?.auditLogs || defaultAuditLogs

  // 获取角色标签颜色
  const getRoleColor = (role: string) => {
    switch (role) {
      case '管理员':
        return 'bg-red-100 text-red-700'
      case '导师':
        return 'bg-purple-100 text-purple-700'
      case '销售':
        return 'bg-blue-100 text-blue-700'
      case '客服':
        return 'bg-green-100 text-green-700'
      case '运营':
        return 'bg-amber-100 text-amber-700'
      case '财务':
        return 'bg-indigo-100 text-indigo-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">系统设置</h1>
        <p className="text-sm text-gray-500 mt-1">管理用户、部门、权限和审计日志，确保系统安全运行。</p>
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-4 gap-6">
        {/* 左侧菜单 */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 h-fit">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'users' ? 'bg-[#10B981] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-5 h-5" />
              用户管理
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'departments' ? 'bg-[#10B981] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Building2 className="w-5 h-5" />
              部门管理
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'permissions' ? 'bg-[#10B981] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Shield className="w-5 h-5" />
              权限管理
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'audit' ? 'bg-[#10B981] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ScrollText className="w-5 h-5" />
              审计日志
            </button>
          </nav>
        </div>

        {/* 右侧内容 */}
        <div className="col-span-3 space-y-6">
          {/* 用户管理 */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">用户管理</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索用户"
                      className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                    />
                  </div>
                  <button className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    添加用户
                  </button>
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-medium">用户</th>
                    <th className="pb-3 font-medium">邮箱</th>
                    <th className="pb-3 font-medium">部门</th>
                    <th className="pb-3 font-medium">角色</th>
                    <th className="pb-3 font-medium">状态</th>
                    <th className="pb-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#10B981] rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {user.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="py-4 text-sm text-gray-600">{user.department}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="flex items-center gap-1 text-xs font-medium text-[#10B981]">
                          <span className="w-2 h-2 bg-[#10B981] rounded-full"></span>
                          {user.status === 'active' ? '活跃' : '禁用'}
                        </span>
                      </td>
                      <td className="py-4">
                        <button className="text-sm text-gray-500 hover:text-gray-700">编辑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 部门管理 */}
          {activeTab === 'departments' && (
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">部门管理</h2>
                <button className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  添加部门
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-[#10B981]" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">{dept.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{dept.members} 人</p>
                    <p className="text-xs text-gray-500">权限：{dept.permissions}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 权限管理 */}
          {activeTab === 'permissions' && (
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">权限管理</h2>
                <button className="px-4 py-2 text-sm font-medium text-[#10B981] bg-[#10B981]/10 rounded-lg hover:bg-[#10B981]/20 transition-colors">
                  编辑权限矩阵
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-medium">角色</th>
                    <th className="pb-3 font-medium">知识库</th>
                    <th className="pb-3 font-medium">审核</th>
                    <th className="pb-3 font-medium">系统设置</th>
                    <th className="pb-3 font-medium">审计日志</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionMatrix.map((row) => (
                    <tr key={row.role} className="border-b border-gray-50">
                      <td className="py-3 text-sm font-medium text-gray-900">{row.role}</td>
                      <td className="py-3 text-center">
                        {row.knowledge === '✓' ? (
                          <span className="text-[#10B981] font-bold">✓</span>
                        ) : (
                          <span className="text-gray-300">✗</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {row.review === '✓' ? (
                          <span className="text-[#10B981] font-bold">✓</span>
                        ) : (
                          <span className="text-gray-300">✗</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {row.settings === '✓' ? (
                          <span className="text-[#10B981] font-bold">✓</span>
                        ) : (
                          <span className="text-gray-300">✗</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {row.audit === '✓' ? (
                          <span className="text-[#10B981] font-bold">✓</span>
                        ) : (
                          <span className="text-gray-300">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 审计日志 */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">审计日志</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => alert('筛选功能开发中')}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    筛选
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/export/audit-logs/csv', {
                          credentials: 'same-origin',
                        })
                        if (res.ok) {
                          const blob = await res.blob()
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
                          document.body.appendChild(a)
                          a.click()
                          window.URL.revokeObjectURL(url)
                          document.body.removeChild(a)
                        } else {
                          alert('导出失败')
                        }
                      } catch (error) {
                        console.error('Export failed:', error)
                        alert('导出失败，请重试')
                      }
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    导出
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-[#10B981]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ScrollText className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">{log.time}</span>
                        <span className="text-sm font-medium text-gray-900">{log.user}</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-[#10B981]/10 text-[#10B981] rounded">
                          {log.action}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                          {log.target}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{log.details}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-[#10B981]">
                      <span className="w-2 h-2 bg-[#10B981] rounded-full"></span>
                      成功
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/audit-logs" className="block text-center text-sm text-[#10B981] font-medium mt-4 hover:underline">
                查看全部日志 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
