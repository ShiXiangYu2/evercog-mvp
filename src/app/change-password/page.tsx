'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    if (password.length < 8) errors.push('密码长度至少 8 位')
    if (password.length > 128) errors.push('密码长度不能超过 128 位')
    if (!/[a-zA-Z]/.test(password)) errors.push('密码必须包含字母')
    if (!/[0-9]/.test(password)) errors.push('密码必须包含数字')
    return errors
  }

  const handleSubmit = async () => {
    setError('')

    // 验证密码
    const validationErrors = validatePassword(newPassword)
    if (validationErrors.length > 0) {
      setError(validationErrors.join('；'))
      return
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
        credentials: 'same-origin',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '修改密码失败')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-[#10B981] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">密码修改成功</h2>
          <p className="text-gray-500">正在跳转到工作台...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">修改密码</h1>
          <p className="text-sm text-gray-500 mt-2">首次登录请修改默认密码</p>
        </div>

        <div className="space-y-4">
          {/* 新密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少 8 位）"
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 确认密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
              />
            </div>
          </div>

          {/* 密码要求 */}
          <div className="text-xs text-gray-500">
            <p>密码要求：</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li className={newPassword.length >= 8 ? 'text-[#10B981]' : ''}>至少 8 位</li>
              <li className={/[a-zA-Z]/.test(newPassword) ? 'text-[#10B981]' : ''}>包含字母</li>
              <li className={/[0-9]/.test(newPassword) ? 'text-[#10B981]' : ''}>包含数字</li>
            </ul>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={!newPassword || !confirmPassword || loading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              newPassword && confirmPassword && !loading
                ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                提交中...
              </>
            ) : (
              '确认修改'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
