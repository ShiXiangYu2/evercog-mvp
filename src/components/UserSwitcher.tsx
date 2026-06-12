'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'
import { login, type CurrentUser } from '@/lib/auth-client'
import { useAuth } from '@/components/AuthProvider'

interface User {
  id: string
  name: string
  role: string
  department: {
    id: string
    name: string
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

const roleColors: Record<string, string> = {
  sales: 'bg-blue-500 text-white',
  customer_service: 'bg-emerald-500 text-white',
  operations: 'bg-purple-500 text-white',
  finance: 'bg-amber-500 text-white',
  mentor: 'bg-indigo-500 text-white',
  trainee: 'bg-pink-500 text-white',
  admin: 'bg-red-500 text-white',
  ai_info: 'bg-cyan-500 text-white',
}

export default function UserSwitcher() {
  const router = useRouter()
  const { user: currentUser, refresh } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || [])
      })
      .catch(() => {})
  }, [])

  const handleUserChange = async (user: User) => {
    if (user.id === currentUser?.id) {
      setIsOpen(false)
      return
    }

    setSwitching(true)
    try {
      await login(user.id)
      await refresh()
      setIsOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Switch user failed:', error)
    } finally {
      setSwitching(false)
    }
  }

  if (!currentUser) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2.5 bg-white rounded-md
                   transition-all duration-200 hover:scale-[1.02] hover:bg-gray-50
                   focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <div className="w-10 h-10 bg-blue-500 rounded-md flex items-center justify-center text-white font-bold text-lg">
          {currentUser.name.charAt(0)}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-900">{currentUser.name}</p>
          <p className="text-xs text-gray-500">{currentUser.departmentName}</p>
        </div>
        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${roleColors[currentUser.role]}`}>
          {roleLabels[currentUser.role]}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md z-50
                        border-2 border-gray-200">
          <div className="p-3 bg-gray-100 rounded-t-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              切换角色（演示模式）
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserChange(user)}
                disabled={switching}
                className={`w-full flex items-center space-x-3 px-4 py-3
                           transition-all duration-200 hover:bg-gray-50 hover:scale-[1.01]
                           ${currentUser.id === user.id ? 'bg-blue-50' : ''}
                           ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-10 h-10 rounded-md flex items-center justify-center text-white font-bold ${
                  currentUser.id === user.id ? 'bg-blue-500' : 'bg-gray-400'
                }`}>
                  {user.name.charAt(0)}
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.department.name}</p>
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${roleColors[user.role]}`}>
                  {roleLabels[user.role]}
                </span>
                {currentUser.id === user.id && (
                  <Check className="w-5 h-5 text-blue-500" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
