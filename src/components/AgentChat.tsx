'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Bot,
  User,
  Loader2,
  ClipboardCheck,
  AlertTriangle,
  BarChart3,
  HelpCircle,
  Sparkles,
} from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  citations?: Array<{
    cardId: string
    title: string
    category: string
    reviewerName?: string
  }>
  timestamp: string
}

const quickCommands = [
  { command: '/审核', label: '待审核', icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
  { command: '/缺口', label: '知识缺口', icon: AlertTriangle, color: 'text-red-600 bg-red-50 hover:bg-red-100' },
  { command: '/统计', label: '系统统计', icon: BarChart3, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
  { command: '/帮助', label: '帮助', icon: HelpCircle, color: 'text-gray-600 bg-gray-50 hover:bg-gray-100' },
]

export default function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 初始欢迎消息
  useEffect(() => {
    setMessages([
      {
        role: 'agent',
        content: '👋 你好！我是 GenericAgent 智能助手。\n\n你可以：\n• 直接输入问题，我会从知识库中检索回答\n• 使用快捷指令快速操作\n\n试试输入一个问题，或点击下方快捷按钮。',
        timestamp: new Date().toISOString(),
      },
    ])
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
        credentials: 'same-origin',
      })

      const data = await res.json()

      if (data.message) {
        setMessages((prev) => [...prev, data.message])
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'agent',
            content: `❌ ${data.error}`,
            timestamp: new Date().toISOString(),
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: '❌ 网络错误，请重试。',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 简单的 Markdown 转文本渲染
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      // 粗体
      let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // 行内代码
      processed = processed.replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">$1</code>')
      // 链接
      processed = processed.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-[#10B981] hover:underline">$1</a>')

      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: processed.substring(2) }} />
      }
      if (line.match(/^\d+\./)) {
        return <li key={i} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: processed.replace(/^\d+\.\s*/, '') }} />
      }
      return <p key={i} className={line.trim() === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: processed }} />
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#10B981]/5 to-transparent">
        <div className="w-10 h-10 bg-[#10B981] rounded-lg flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">GenericAgent</h3>
          <p className="text-xs text-gray-500">智能助手 · 基于企业知识库</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
          <span className="text-xs text-[#10B981] font-medium">在线</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'agent' && (
              <div className="w-8 h-8 bg-[#10B981] rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#10B981] text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}
            >
              <div className="space-y-1">{renderContent(msg.content)}</div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200/50">
                  <p className="text-xs font-semibold text-gray-500 mb-1">📎 引用来源</p>
                  {msg.citations.map((c, i) => (
                    <p key={i} className="text-xs text-gray-500">
                      《{c.title}》{c.reviewerName && ` · ${c.reviewerName}`}
                    </p>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-[#10B981] rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#10B981] animate-spin" />
                <span className="text-sm text-gray-500">思考中...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Commands */}
      <div className="px-5 py-2 border-t border-gray-50">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Sparkles className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {quickCommands.map((cmd) => {
            const Icon = cmd.icon
            return (
              <button
                key={cmd.command}
                onClick={() => sendMessage(cmd.command)}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           transition-all duration-200 flex-shrink-0 disabled:opacity-50 ${cmd.color}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cmd.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题或指令..."
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm font-medium
                       border-2 border-transparent focus:border-[#10B981] focus:bg-white
                       outline-none transition-all duration-200 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-11 h-11 bg-[#10B981] text-white rounded-xl flex items-center justify-center
                       transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed
                       border-2 border-[#059669]"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
