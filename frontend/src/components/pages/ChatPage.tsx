import { useEffect, useRef, useState, useCallback } from 'react'
import { useSessionStore } from '@/stores/session-store'
import { Send, Square } from 'lucide-react'

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

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages])

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat header */}
      <div style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid var(--dsw-alias-border-l2)',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dsw-alias-label-secondary)', margin: 0 }}>
          {currentSession?.title || '求道 · 对话'}
        </h1>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {!currentSession || currentSession.messages.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: '24px',
                fontWeight: 600,
                margin: 0,
                background: 'linear-gradient(135deg, var(--dsw-static-deepseek-500), var(--dsw-static-blue-500))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                求道
              </p>
              <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--dsw-alias-label-tertiary)' }}>
                输入消息开始对话
              </p>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '768px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {currentSession.messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    backgroundColor: msg.role === 'user' ? 'var(--dsw-specific-bubble)' : 'transparent',
                    color: 'var(--dsw-alias-label-primary)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--dsw-alias-border-l2)',
                  }}
                >
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'inherit',
                    margin: 0,
                  }}>
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
      <div style={{
        padding: '12px 24px',
        borderTop: '1px solid var(--dsw-alias-border-l2)',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: '768px', margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息… (Enter 发送, Shift+Enter 换行)"
            rows={1}
            className="dsh-input-major"
            style={{
              flex: 1,
              resize: 'none',
              borderRadius: '12px',
              border: '1px solid var(--dsw-alias-border-l2)',
              padding: '12px 16px',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
              color: 'var(--dsw-alias-label-primary)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-static-deepseek-500)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-alias-border-l2)' }}
          />
          {streaming ? (
            <button
              onClick={handleStop}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: 'var(--dsw-alias-state-error-primary)',
                color: 'white',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Square style={{ width: '16px', height: '16px' }} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: input.trim() ? 'var(--dsw-alias-button-primary-fill)' : 'var(--dsw-alias-border-l2)',
                color: input.trim() ? 'var(--dsw-alias-label-primary-foreground)' : 'var(--dsw-alias-label-tertiary)',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                flexShrink: 0,
              }}
            >
              <Send style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
