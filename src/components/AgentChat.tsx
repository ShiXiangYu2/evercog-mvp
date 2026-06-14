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
  ArrowLeft,
  Plus,
  Folder,
  Paperclip,
} from 'lucide-react'
import { sanitizeMarkdownHtml } from '@/lib/sanitize'

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
  { command: '/审核', label: '待审核', icon: ClipboardCheck },
  { command: '/缺口', label: '知识缺口', icon: AlertTriangle },
  { command: '/统计', label: '系统统计', icon: BarChart3 },
  { command: '/帮助', label: '帮助', icon: HelpCircle },
]

interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
}

interface AgentChatProps {
  onModeChange?: (mode: 'welcome' | 'chat') => void
  initialMessages?: ChatMessage[]
  conversationId?: string
}

export default function AgentChat({ onModeChange, initialMessages, conversationId }: AgentChatProps) {
  const [mode, setMode] = useState<'welcome' | 'chat'>('welcome')
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // 加载历史对话
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages)
      setMode('chat')
    }
  }, [conversationId])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 暴露加载对话方法
  const loadConversation = (convMessages: ChatMessage[]) => {
    setMessages(convMessages)
    setMode('chat')
  }

  // 保存对话到 localStorage
  const saveConversation = () => {
    if (messages.length === 0) return
    const history: Conversation[] = JSON.parse(localStorage.getItem('agent-chat-history') || '[]')
    const firstUserMsg = messages.find(m => m.role === 'user')
    const title = firstUserMsg ? firstUserMsg.content.substring(0, 30) : '新对话'
    const newConv: Conversation = {
      id: Date.now().toString(),
      title,
      messages,
      createdAt: new Date().toISOString(),
    }
    // 避免重复保存
    const exists = history.some(h => h.messages.length === messages.length && h.messages[0]?.content === messages[0]?.content)
    if (!exists) {
      history.unshift(newConv)
      if (history.length > 20) history.pop()
      localStorage.setItem('agent-chat-history', JSON.stringify(history))
    }
  }

  // 对话变化时自动保存
  useEffect(() => {
    if (mode === 'chat' && messages.length > 0) {
      saveConversation()
    }
  }, [messages])

  // 通知父组件模式变化
  useEffect(() => {
    onModeChange?.(mode)
  }, [mode, onModeChange])

  // 自动滚动到底部
  useEffect(() => {
    if (mode === 'chat' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, mode])

  // 初始状态自动聚焦 textarea
  useEffect(() => {
    if (mode === 'welcome' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [mode])

  const switchToChat = () => {
    setMode('chat')
  }

  const switchToWelcome = () => {
    setMode('welcome')
    setMessages([])
    setInput('')
  }

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    // 如果是初始状态，先切换到会话状态
    if (mode === 'welcome') {
      switchToChat()
    }

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

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Markdown 渲染（使用 DOMPurify 过滤 XSS）
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      processed = processed.replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">$1</code>')
      processed = processed.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-[#10B981] hover:underline">$1</a>')

      // 净化 HTML，过滤 XSS 攻击向量
      const safeHtml = sanitizeMarkdownHtml(processed)

      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: sanitizeMarkdownHtml(safeHtml.substring(2)) }} />
      }
      if (line.match(/^\d+\./)) {
        return <li key={i} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: sanitizeMarkdownHtml(safeHtml.replace(/^\d+\.\s*/, '')) }} />
      }
      return <p key={i} className={line.trim() === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: safeHtml }} />
    })
  }

  // ==================== 初始状态 ====================
  if (mode === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        {/* 品牌图标 */}
        <div className="w-20 h-20 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-[#10B981]/20">
          <Bot className="w-10 h-10 text-white" />
        </div>

        {/* 标题 */}
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">你好，有什么可以帮你？</h2>
        <p className="text-sm text-gray-500 mb-8">我可以帮你查询知识库、审核经验、回答业务问题</p>

        {/* 输入框 */}
        <div className="w-full max-w-2xl">
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="有什么好想法？"
              rows={2}
              className="w-full px-5 pt-4 pb-12 bg-transparent rounded-2xl text-sm font-medium resize-none
                         outline-none placeholder:text-gray-400"
            />
            {/* 底部工具栏 */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end px-4 pb-3">
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="w-9 h-9 bg-[#10B981] text-white rounded-xl flex items-center justify-center
                           transition-all duration-200 hover:scale-[1.05] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 快捷标签 */}
        <div className="flex items-center gap-2 mt-5">
          {quickCommands.map((cmd) => {
            const Icon = cmd.icon
            return (
              <button
                key={cmd.command}
                onClick={() => sendMessage(cmd.command)}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 rounded-full text-xs font-medium
                           text-gray-600 hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
              >
                <Icon className="w-3.5 h-3.5" />
                {cmd.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ==================== 会话状态 ====================
  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px] bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={switchToWelcome}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">GenericAgent 对话</h3>
        </div>
        <button
          onClick={switchToWelcome}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新建对话
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
      >
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
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
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

      {/* Input - fixed at bottom */}
      <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
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
