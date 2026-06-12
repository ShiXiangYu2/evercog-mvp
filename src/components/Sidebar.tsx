/**
 * Sidebar 组件 - 精致版
 *
 * 左下角用户信息与登出区域优化：
 * - 紧凑的头像 + 用户名布局
 * - 登出按钮使用图标按钮，节省空间
 * - 悬浮显示详细信息
 */
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileSearch,
  Database,
  ClipboardCheck,
  MessageSquare,
  Bot,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  LogIn,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { logout } from '@/lib/auth-client'
import BrandLogo from '@/components/BrandLogo'

const menuItems = [
  { name: '工作台', path: '/', icon: LayoutDashboard },
  { name: '政策情报', path: '/policy-intelligence', icon: FileSearch },
  { name: '知识中台', path: '/knowledge-hub', icon: Database },
  { name: '导师审核', path: '/mentor-review', icon: ClipboardCheck },
  { name: '员工问答', path: '/employee-qa', icon: MessageSquare },
  { name: 'Agent 工作台', path: '/agent-workspace', icon: Bot },
  { name: '企业微信集成', path: '/wecom-integration', icon: Plug },
  { name: '系统设置', path: '/settings', icon: Settings },
]

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  mentor: '导师',
  finance: '财务',
  sales: '销售',
  customer_service: '客服',
  operations: '运营',
  trainee: '新人',
  ai_info: 'AI 工程师',
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [showUserInfo, setShowUserInfo] = useState(false)

  // 同步 CSS 变量，让 main 区域自适应宽度
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '80px' : '260px'
    )
  }, [collapsed])

  const handleLogout = async () => {
    if (!window.confirm('确定要登出吗？')) {
      return
    }

    setLoggingOut(true)
    try {
      await logout()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      setLoggingOut(false)
    }
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-20' : 'w-[260px]'
      }`}
    >
      {/* Logo 区域 */}
      <div className="p-6 border-b border-gray-100">
        <BrandLogo size={40} showText={!collapsed} collapsed={collapsed} />
      </div>

      {/* 菜单 */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path
          const Icon = item.icon

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#10B981] text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#10B981]'
                }`}
                strokeWidth={2}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* 底部区域 */}
      <div className="border-t border-gray-100 p-3 space-y-2">
        {user ? (
          <>
            {/* 用户头像 + 信息（紧凑布局） */}
            <div className="relative">
              <div
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onMouseEnter={() => setShowUserInfo(true)}
                onMouseLeave={() => setShowUserInfo(false)}
              >
                {/* 头像 */}
                <div className="w-8 h-8 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-xs font-bold text-white">
                    {user.name.charAt(0)}
                  </span>
                </div>

                {/* 用户名（展开时显示） */}
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate leading-tight">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate leading-tight">
                      {ROLE_LABELS[user.role] || user.role}
                    </p>
                  </div>
                )}

                {/* 登出图标按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLogout()
                  }}
                  disabled={loggingOut}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  title="登出"
                >
                  {loggingOut ? (
                    <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* 悬浮提示卡片（展开时显示） */}
              {!collapsed && showUserInfo && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-white rounded-xl border border-gray-200 shadow-lg z-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-white">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.departmentName}</p>
                      <p className="text-xs text-gray-400">{user.email || '未设置邮箱'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* 未登录状态 */
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#10B981] hover:bg-[#10B981]/10 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {!collapsed && <span>登录</span>}
          </Link>
        )}

        {/* 折叠按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>收起</span>
            </>
          )}
        </button>

        {/* 版本号 */}
        {!collapsed && (
          <p className="text-center text-[10px] text-gray-300">v2.0.0</p>
        )}
      </div>
    </aside>
  )
}
