import { useEffect, useRef, useState, useCallback } from 'react'
import { useSessionStore } from '@/stores/session-store'
import { useRightbar } from '@/components/layout/DesktopFrame'
import { ModelPicker } from '@/components/chat/ModelPicker'
import { UsageFooter } from '@/components/chat/UsageFooter'
import { CitationLink } from '@/components/chat/CitationLink'
import { Send, Square, PanelRightOpen } from 'lucide-react'

function renderWithCitations(text: string, workspaceId = 'ws-default') {
  const parts: Array<string | { n: number; id: string }> = []
  const re = /\[(\d+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ n: Number(m[1]), id: `cite-${m[1]}` })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.map((p, i) =>
    typeof p === 'string' ? (
      <span key={i}>{p}</span>
    ) : (
      <CitationLink key={i} index={p.n} citationId={p.id} workspaceId={workspaceId} />
    ),
  )
}

export function ChatPage() {
  const {
    sessions, currentId, isStreaming,
    createSession, setSessionModel,
    addMessage, streamChat, cancelTurn, loadFromStorage,
  } = useSessionStore()
  const rightbar = useRightbar()

  const [input, setInput] = useState('')
  const [composing, setComposing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentSession = sessions.find((s) => s.id === currentId)
  const streaming = isStreaming(currentId)

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const h = Math.min(textareaRef.current.scrollHeight, 336)
      textareaRef.current.style.height = Math.max(h, 36) + 'px'
    }
  }, [input])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming || composing) return

    let sid = currentId
    if (!sid) {
      sid = createSession()
    }

    setInput('')
    addMessage(sid, { role: 'user', content: text })

    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      await streamChat(sid, ctrl.signal)
    } catch {
      // aborted or network error
    }
    abortRef.current = null
  }, [input, streaming, composing, currentId, createSession, addMessage, streamChat])

  const handleStop = useCallback(() => {
    if (currentId) void cancelTurn(currentId, abortRef.current)
  }, [currentId, cancelTurn])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && streaming) {
      e.preventDefault()
      handleStop()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey && !composing) {
      e.preventDefault()
      handleSend()
    }
  }

  const messages = currentSession?.messages || []

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minWidth: 0,
      background: 'var(--dsw-alias-bg-base)',
    }}>
      {/* Header — DSH ConversationRoot header */}
      <div style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        minHeight: '56px',
        padding: '10px 28px 10px 20px',
        borderBottom: '0.5px solid var(--dsw-alias-border-l3)',
        boxSizing: 'border-box',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--dsw-alias-label-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {currentSession?.title || '新会话'}
          </span>
        </div>
        {/* Right sidebar toggle */}
        {!rightbar.open && (
          <button
            onClick={rightbar.toggle}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: 'none',
              borderRadius: 'var(--dsw-radius-sm, 6px)',
              padding: 0,
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--dsw-alias-label-secondary)',
              transition: 'background 100ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="展开右侧栏"
          >
            <PanelRightOpen size={16} />
          </button>
        )}
      </div>

      {/* Scroll Body — DSH ConversationRoot scrollBody */}
      <div style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        minHeight: 0,
        marginRight: '2px',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarGutter: 'stable',
      }}>
        {/* Messages */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
          padding: '16px 0',
          flex: '1 0 auto',
        }}>
          {messages.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '48px 24px',
              gap: '16px',
            }}>
              <span style={{
                fontSize: '24px',
                fontWeight: 600,
                lineHeight: '32px',
                background: 'linear-gradient(135deg, var(--dsw-alias-label-primary) 0%, var(--dsw-alias-label-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                求道
              </span>
              <span style={{
                fontSize: '14px',
                color: 'var(--dsw-alias-label-secondary)',
                textAlign: 'center',
                maxWidth: '400px',
              }}>
                新会话已创建。每轮回复结束后会自动沉淀为笔记。
              </span>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                padding: msg.role === 'user'
                  ? '12px 24px 12px 64px'
                  : '12px 24px 12px 24px',
              }}
            >
              <div style={msg.role === 'user'
                ? {
                  marginLeft: 'auto',
                  maxWidth: 'min(calc(100% - 32px), 720px)',
                  padding: '10px 16px',
                  borderRadius: 'var(--dsw-radius-panel, 12px)',
                  background: 'var(--dsw-specific-bubble)',
                  color: 'var(--dsw-alias-label-primary)',
                  fontSize: '14px',
                  lineHeight: '22px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }
                : {
                  maxWidth: 'min(calc(100% - 32px), 920px)',
                  margin: '0 auto',
                  color: 'var(--dsw-alias-label-primary)',
                  fontSize: '14px',
                  lineHeight: '22px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }
              }>
                {msg.role === 'assistant' ? renderWithCitations(msg.content) : msg.content}
                {msg.role === 'assistant' && msg.usage ? (
                  <UsageFooter usage={msg.usage} />
                ) : msg.role === 'assistant' && i === messages.length - 1 && !streaming ? (
                  <UsageFooter usage={{ usage_state: 'unknown', status: '完成' }} />
                ) : null}
              </div>
            </div>
          ))}
          {streaming && (
            <div style={{ padding: '12px 24px' }}>
              <div style={{
                maxWidth: 'min(calc(100% - 32px), 920px)',
                margin: '0 auto',
                color: 'var(--dsw-alias-label-primary)',
                fontSize: '14px',
                lineHeight: '22px',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '16px',
                  backgroundColor: 'var(--dsw-alias-state-business-primary)',
                  borderRadius: '1px',
                  animation: 'blink 1s step-end infinite',
                  verticalAlign: 'text-bottom',
                  marginLeft: '2px',
                }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer Seat — DSH sticky bottom */}
        <div style={{
          flex: 'none',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          bottom: 0,
          zIndex: 7,
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-bg-base) 0%, transparent) 0px, var(--dsw-alias-bg-base) 36px)',
          padding: '0 16px 4px',
        }}>
          {/* Input Card — DSH InputBar card */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            maxWidth: 'min(calc(100% - 32px), 952px)',
            margin: '0 auto',
            paddingTop: '8px',
            border: 0,
            borderRadius: 'var(--dsw-radius-panel, 12px)',
            background: 'var(--dsw-specific-input-major)',
            boxShadow: 'var(--dsw-elevation-soft, 0 0 0 0.5px var(--dsw-alias-border-l2), 0 4px 16px 0 rgba(0,0,0,0.03), 0 0 24px 0 rgba(0,0,0,0.03))',
            fontSize: '14px',
            lineHeight: '24px',
            boxSizing: 'border-box',
          }}>
            {/* Textarea */}
            <div style={{ position: 'relative', maxHeight: '336px', overflowY: 'auto', margin: '0 4px' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setComposing(true)}
                onCompositionEnd={() => setComposing(false)}
                placeholder="给求道发送消息…"
                disabled={streaming}
                rows={1}
                style={{
                  display: 'block',
                  width: '100%',
                  minHeight: '36px',
                  maxHeight: '336px',
                  padding: '4px 8px 0 14px',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  background: 'transparent',
                  color: 'var(--dsw-alias-label-primary)',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  caretColor: 'var(--dsw-alias-state-business-primary)',
                }}
              />
            </div>

            {/* Toolbar row */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '2px 8px 6px',
              minWidth: 0,
            }}>
              {/* Left side — model picker (Q01/Q02) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <ModelPicker
                  value={currentSession?.modelId || ''}
                  disabled={streaming}
                  onChange={(mid) => {
                    if (currentId) setSessionModel(currentId, mid)
                    else {
                      const sid = createSession()
                      setSessionModel(sid, mid)
                    }
                  }}
                />
              </div>

              {/* Right side — send button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 'none', marginLeft: 'auto' }}>
                {streaming ? (
                  <button
                    onClick={handleStop}
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: '34px',
                      height: '34px',
                      border: 'none',
                      borderRadius: '999px',
                      background: 'var(--dsw-alias-state-error-primary)',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'background 100ms ease',
                    }}
                    title="停止生成"
                  >
                    <Square size={16} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: '34px',
                      height: '34px',
                      border: 'none',
                      borderRadius: '999px',
                      background: 'var(--dsw-alias-button-info-fill, var(--dsw-alias-state-business-primary))',
                      color: '#fff',
                      cursor: input.trim() ? 'pointer' : 'default',
                      opacity: input.trim() ? 1 : 0.4,
                      transition: 'background 100ms ease, opacity 100ms ease',
                      transform: 'translateY(-2px)',
                    }}
                    title="发送"
                  >
                    <Send size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blink animation */}
      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
