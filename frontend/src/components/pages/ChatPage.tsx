import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/session-store'
import { Send, Square, Trash2 } from 'lucide-react'

export function ChatPage() {
  const {
    sessions, currentId, streaming,
    selectSession, createSession, deleteSession,
    addMessage, streamChat, loadFromStorage,
  } = useSessionStore()

  const [input, setInput] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentSession = sessions.find((s) => s.id === currentId)

  // Load sessions on mount
  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    let sessionId = currentId
    if (!sessionId) {
      sessionId = createSession()
    }

    addMessage(sessionId, { role: 'user', content: text })
    setInput('')

    const controller = new AbortController()
    abortRef.current = controller
    await streamChat(sessionId, controller.signal)
    abortRef.current = null
  }, [input, streaming, currentId, createSession, addMessage, streamChat])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <h1 className="text-sm font-medium text-muted-foreground">
          {currentSession?.title || '求道 · 对话'}
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-6">
        {!currentSession || currentSession.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">求道</p>
              <p className="mt-2 text-sm text-muted-foreground">
                输入消息开始对话
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {currentSession.messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  <pre className="whitespace-pre-wrap break-words font-sans">
                    {msg.content || (streaming && i === currentSession.messages.length - 1 ? '…' : '')}
                  </pre>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息… (Enter 发送, Shift+Enter 换行)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-background"
          />
          {streaming ? (
            <button
              onClick={handleStop}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
