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

  // 同步 CSS 变量，让 main 区域自适应宽度
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '80px' : '260px'
    )
  }, [collapsed])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
    router.refresh()
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

      {/* 当前用户信息 */}
      {user && !collapsed && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {user.departmentName} · {ROLE_LABELS[user.role] || user.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 折叠 + 登出按钮 */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        {/* 登出按钮 */}
        {user && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            title={collapsed ? '登出' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>登出</span>}
          </button>
        )}

        {/* 折叠按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>收起</span>
            </>
          )}
        </button>
      </div>

      {/* 版本信息 */}
      {!collapsed && (
        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium">v2.0.0 MVP</p>
        </div>
      )}
    </aside>
  )
}
