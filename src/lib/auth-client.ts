/**
 * 前端认证工具
 *
 * 使用 Cookie-based JWT 认证。
 * 浏览器自动在请求中携带 Cookie，无需手动设置 header。
 */
'use client'

import { useRouter } from 'next/navigation'

// ==================== 类型定义 ====================

export interface CurrentUser {
  id: string
  name: string
  role: string
  departmentId: string
  departmentName: string
  email: string | null
}

// ==================== 登录/登出 ====================

/**
 * 登录 - 调用 API 签发 JWT Cookie
 */
export async function login(userId: string): Promise<CurrentUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
    credentials: 'same-origin', // 确保 cookie 被发送和接收
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '登录失败')
  }

  const data = await res.json()
  return data.user
}

/**
 * 登出 - 清除 Cookie
 */
export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
}

/**
 * 获取当前登录用户
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
    if (!res.ok) return null

    const data = await res.json()
    return data.user
  } catch {
    return null
  }
}

/**
 * 检查是否已登录（客户端快速检查）
 * 注意：这不验证 token 有效性，仅检查是否存在
 */
export function isLoggedIn(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('evercog_token=')
}

// ==================== 带认证的 Fetch ====================

/**
 * 带认证的 fetch 封装
 * 浏览器自动携带 Cookie，无需手动设置 header
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)

  // 对于非 GET 请求，确保 Content-Type 存在
  if (options.method && options.method !== 'GET' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // 确保 Cookie 被携带
  })

  // 如果返回 401，可能 token 过期，清除状态
  if (response.status === 401 && typeof window !== 'undefined') {
    // 可以触发全局登出逻辑
    window.location.href = '/login'
  }

  return response
}

/**
 * 带认证的 JSON 请求
 */
export async function fetchJsonWithAuth<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchWithAuth(url, options)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// ==================== Hook ====================

/**
 * React Hook: 使用当前用户
 * 在组件中使用以获取当前登录用户信息
 */
export function useCurrentUser() {
  // 这个函数需要在组件中配合 useEffect 使用
  // 返回 getCurrentUser 函数供组件调用
  return { getCurrentUser, isLoggedIn }
}
