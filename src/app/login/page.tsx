'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

interface UserOption {
  id: string
  name: string
  role: string
  department: { name: string }
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  mentor: 'bg-indigo-100 text-indigo-700',
  finance: 'bg-amber-100 text-amber-700',
  sales: 'bg-blue-100 text-blue-700',
  customer_service: 'bg-emerald-100 text-emerald-700',
  operations: 'bg-purple-100 text-purple-700',
  trainee: 'bg-pink-100 text-pink-700',
  ai_info: 'bg-cyan-100 text-cyan-700',
}

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

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [usePassword, setUsePassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [logging, setLogging] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || [])
        setLoading(false)
      })
      .catch(() => {
        setError('无法加载用户列表')
        setLoading(false)
      })
  }, [])

  const handleLogin = async () => {
    if (!selectedId) {
      setError('请选择一个用户')
      return
    }

    if (usePassword && !password) {
      setError('请输入密码')
      return
    }

    setLogging(true)
    setError('')

    try {
      const body: Record<string, string> = { userId: selectedId }
      if (usePassword) {
        body.password = password
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '登录失败')
      }

      // 登录成功，检查是否需要改密
      if (data.user?.mustChangePassword) {
        window.location.href = '/change-password'
      } else {
        window.location.href = '/'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLogging(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedId) {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size={64} showText={false} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">恒识 Evercog</h1>
          <p className="text-sm text-gray-500 mt-1">AI 政策情报与业务经验中台</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-6">选择用户登录</h2>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-gray-500">加载用户列表...</span>
            </div>
          ) : (
            <>
              {/* 用户选择 */}
              <div className="space-y-2 mb-4">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedId(user.id)
                      setError('')
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                      selectedId === user.id
                        ? 'border-[#10B981] bg-[#10B981]/5'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedId === user.id ? 'bg-[#10B981]' : 'bg-gray-100'
                    }`}>
                      <User className={`w-5 h-5 ${
                        selectedId === user.id ? 'text-white' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${
                        selectedId === user.id ? 'text-[#10B981]' : 'text-gray-900'
                      }`}>
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.department.name}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-md flex-shrink-0 ${
                      ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'
                    }`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </button>
                ))}
              </div>

              {/* 密码模式切换 */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => {
                      setUsePassword(e.target.checked)
                      setPassword('')
                      setError('')
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#10B981] focus:ring-[#10B981]"
                  />
                  <span className="text-sm text-gray-600">使用密码登录</span>
                </label>
              </div>

              {/* 密码输入框 */}
              {usePassword && (
                <div className="mb-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setError('')
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder="输入密码"
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* 登录按钮 */}
              <button
                onClick={handleLogin}
                disabled={!selectedId || logging}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  selectedId && !logging
                    ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {logging ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    登录
                  </>
                )}
              </button>
            </>
          )}

          {/* 提示 */}
          <p className="text-xs text-gray-400 text-center mt-4">
            MVP 演示模式：选择任意用户即可登录（可选密码验证）
          </p>
        </div>
      </div>
    </div>
  )
}
