'use client'

import { useState, useEffect } from 'react'
import { Settings, MessageSquare, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface WeComConfig {
  corpId: string
  corpSecret: string
  agentId: string
}

export default function IntegrationsPage() {
  const [config, setConfig] = useState<WeComConfig>({
    corpId: '',
    corpSecret: '',
    agentId: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [message, setMessage] = useState('')

  // 加载配置
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.wecom) {
          setConfig({
            corpId: data.wecom.corpId || '',
            corpSecret: data.wecom.corpSecret || '',
            agentId: data.wecom.agentId || '',
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // 保存配置
  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wecom: config }),
        credentials: 'same-origin',
      })

      if (res.ok) {
        setMessage('配置已保存')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('保存失败')
      }
    } catch {
      setMessage('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 测试连接
  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/settings/wecom/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        credentials: 'same-origin',
      })

      const data = await res.json()
      setTestResult(data.success ? 'success' : 'error')
    } catch {
      setTestResult('error')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">系统集成</h1>
        <p className="text-sm text-gray-500 mt-1">配置第三方服务集成</p>
      </div>

      {/* 企业微信配置 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">企业微信</h2>
            <p className="text-sm text-gray-500">配置企微应用消息推送</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              企业 ID (CorpID)
            </label>
            <input
              type="text"
              value={config.corpId}
              onChange={(e) => setConfig({ ...config, corpId: e.target.value })}
              placeholder="请输入企业 ID"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              应用 Secret (CorpSecret)
            </label>
            <input
              type="password"
              value={config.corpSecret}
              onChange={(e) => setConfig({ ...config, corpSecret: e.target.value })}
              placeholder="请输入应用 Secret"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              应用 AgentId
            </label>
            <input
              type="text"
              value={config.agentId}
              onChange={(e) => setConfig({ ...config, agentId: e.target.value })}
              placeholder="请输入应用 AgentId"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
            />
          </div>
        </div>

        {/* 测试结果 */}
        {testResult && (
          <div className={`mt-4 p-3 rounded-lg ${testResult === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2">
              {testResult === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-sm ${testResult === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {testResult === 'success' ? '连接测试成功' : '连接测试失败，请检查配置'}
              </span>
            </div>
          </div>
        )}

        {/* 消息提示 */}
        {message && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-700">{message}</span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleTest}
            disabled={testing || !config.corpId || !config.corpSecret || !config.agentId}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <TestTube className="w-4 h-4" />
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-lg hover:bg-[#059669] disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">配置说明</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p>1. 登录 <a href="https://work.weixin.qq.com/" target="_blank" className="text-[#10B981] hover:underline">企业微信管理后台</a></p>
          <p>2. 进入「应用管理」→「自建」→ 创建或选择应用</p>
          <p>3. 获取 CorpID、CorpSecret 和 AgentId</p>
          <p>4. 在「接收消息」中配置回调 URL（可选）</p>
          <p>5. 确保应用有「消息推送」权限</p>
        </div>
      </div>
    </div>
  )
}
