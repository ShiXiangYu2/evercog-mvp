/**
 * AuthProvider - 客户端认证状态管理（改进版）
 *
 * 改进点：
 * 1. 登出后正确清理状态
 * 2. 避免页面消失问题
 * 3. 增加错误处理
 */
'use client'

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getCurrentUser, type CurrentUser } from '@/lib/auth-client'

// ==================== Context ====================

interface AuthContextType {
  user: CurrentUser | null
  loading: boolean
  refresh: () => Promise<CurrentUser | null>
  clearUser: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: async () => null,
  clearUser: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

// ==================== 不需要登录的页面 ====================

const PUBLIC_PATHS = ['/login']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))
}

// ==================== Provider 组件 ====================

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }

  const clearUser = () => {
    setUser(null)
  }

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (loading || isRedirecting) return

    // 公开页面不需要登录
    if (isPublicPath(pathname)) return

    // 未登录 → 重定向到登录页
    if (!user) {
      setIsRedirecting(true)
      router.push('/login')
    }
  }, [user, loading, pathname, router, isRedirecting])

  // 登录页面不需要认证检查
  if (isPublicPath(pathname)) {
    return <>{children}</>
  }

  // 加载中显示 loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">加载中...</span>
        </div>
      </div>
    )
  }

  // 未登录（正在重定向）- 显示 loading 而不是返回 null
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">跳转到登录页...</span>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading, refresh: checkAuth, clearUser }}>
      {children}
    </AuthContext.Provider>
  )
}
