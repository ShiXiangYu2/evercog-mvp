/**
 * POST /api/auth/logout - 用户登出
 *
 * 清除认证 Cookie。
 */
import { NextResponse } from 'next/server'
import { createClearCookieHeader } from '@/lib/jwt'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.headers.set('Set-Cookie', createClearCookieHeader())
  return response
}
