import { useEffect, useRef, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useSessionStore } from '@/stores/session-store'
import { useContextAttachmentStore } from '@/stores/context-attachment-store'
import { useRightbar } from '@/components/layout/DesktopFrame'
import { ModelPicker } from '@/components/chat/ModelPicker'
import { UsageFooter } from '@/components/chat/UsageFooter'
import { CitationLink } from '@/components/chat/CitationLink'
import { Send, Square, PanelRightOpen, X, RefreshCw } from 'lucide-react'
import { shouldCollapseAnswer } from '@/lib/streamChannels'
import { PlanPanel } from '@/components/chat/PlanPanel'

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
    addMessage, streamChat, cancelTurn, resumeTurn, recoverTurn, loadFromStorage,
  } = useSessionStore()
  const pendingAttachments = useContextAttachmentStore((s) => s.pending)
  const unpinAttachment = useContextAttachmentStore((s) => s.unpin)
  const markStale = useContextAttachmentStore((s) => s.markStale)
  const refreshAttachment = useContextAttachmentStore((s) => s.refresh)
  const takeFrozen = useContextAttachmentStore((s) => s.takeFrozen)
  const rightbar = useRightbar()
  const [refreshingId, setRefreshingId] = useState('')
  const [processExpanded, setProcessExpanded] = useState<Record<number, boolean>>({})
  const [answerExpanded, setAnswerExpanded] = useState<Record<number, boolean>>({})

  const [input, setInput] = useState('')
  const [composing, setComposing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentSession = sessions.find((s) => s.id === currentId)
  const streaming = isStreaming(currentId)

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  // On load / session focus: resume non-terminal turn (events only).
  useEffect(() => {
    if (!currentId) return
    const ctrl = new AbortController()
    void resumeTurn(currentId, ctrl.signal)
    return () => {
      // Unmount/切页：只关观察者，不 cancel 任务。
      ctrl.abort()
    }
  }, [currentId, resumeTurn])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages])

  // Design §10.1: after pin, if workspace bytes change, tip old revision (no silent refresh).
  useEffect(() => {
    if (!pendingAttachments.length) return
    let cancelled = false
    const tick = async () => {
      for (const a of pendingAttachments) {
        if (cancelled || a.stale) continue
        try {
          const res = await api.appResourcesResolve({
            workspace_id: a.workspace_id,
            resource_id: a.resource_id,
            path: a.source_ref,
          }) as {
            ok?: boolean
            data?: { digest?: string; revision?: string }
          }
          if (cancelled || res.ok === false) continue
          const live = res.data?.digest || res.data?.revision || ''
          const pinned = a.digest || a.revision
          if (live && pinned && live !== pinned) {
            markStale(a.id, live)
          }
        } catch {
          /* ignore transient */
        }
      }
    }
    void tick()
    const id = window.setInterval(() => { void tick() }, 15_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [pendingAttachments, markStale])

  const handleRefreshPin = useCallback(async (id: string) => {
    const a = useContextAttachmentStore.getState().pending.find((p) => p.id === id)
    if (!a || refreshingId) return
    setRefreshingId(id)
    try {
      const resolved = await api.appResourcesResolve({
        workspace_id: a.workspace_id,
        resource_id: a.resource_id,
        path: a.source_ref,
      }) as {
        ok?: boolean
        data?: {
          resource_id?: string
          revision?: string
          digest?: string
          title?: string
          kind?: string
          media_type?: string
          source_ref?: string
          workspace_id?: string
        }
        error?: { message?: string }
      }
      if (resolved.ok === false || !resolved.data?.resource_id) {
        throw new Error(resolved.error?.message || '刷新失败')
      }
      const ref = resolved.data
      let excerpt: string | undefined
      let excerptTruncated = false
      if (ref.source_ref && ref.kind !== 'pdf' && ref.kind !== 'image') {
        const read = await api.appResourcesRead({
          workspace_id: a.workspace_id,
          path: ref.source_ref,
          digest: ref.digest || ref.revision,
          line_start: a.range?.line,
          line_end: a.range?.line_end,
          max_bytes: 8000,
        }) as { ok?: boolean; data?: { text?: string | null; truncated?: boolean; next_cursor?: string | null } }
        if (read.ok !== false && typeof read.data?.text === 'string') {
          excerpt = read.data.text
          excerptTruncated = !!(read.data.truncated || read.data.next_cursor)
        }
      }
      refreshAttachment(id, {
        resource_id: ref.resource_id!,
        workspace_id: ref.workspace_id || a.workspace_id,
        title: ref.title || a.title,
        revision: ref.revision || ref.digest || '',
        digest: ref.digest,
        kind: ref.kind,
        media_type: ref.media_type,
        source_ref: ref.source_ref,
        range: a.range,
        excerpt,
        excerpt_truncated: excerptTruncated,
        origin: a.origin,
      })
    } catch {
      /* keep stale chip */
    } finally {
      setRefreshingId('')
    }
  }, [refreshAttachment, refreshingId])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const h = Math.min(textareaRef.current.scrollHeight, 336)
      textareaRef.current.style.height = Math.max(h, 36) + 'px'
    }
  }, [input])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    const hasPins = useContextAttachmentStore.getState().pending.length > 0
    if ((!text && !hasPins) || streaming || composing) return

    let sid = currentId
    if (!sid) {
      sid = createSession()
    }

    // Freeze pins at send — preview alone never reaches here (QA-16).
    const frozen = takeFrozen()
    setInput('')
    addMessage(sid, {
      role: 'user',
      content: text || (frozen.length ? '（分析已固定的上下文资源）' : ''),
      context_attachments: frozen.map((a) => ({
        id: a.id,
        resource_id: a.resource_id,
        workspace_id: a.workspace_id,
        title: a.title,
        revision: a.revision,
        kind: a.kind,
        range: a.range,
        origin: a.origin,
      })),
    })

    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      await streamChat(sid, ctrl.signal)
    } catch {
      // aborted or network error
    }
    abortRef.current = null
  }, [input, streaming, composing, currentId, createSession, addMessage, streamChat, takeFrozen])

  const handleStop = useCallback(() => {
    if (currentId) void cancelTurn(currentId, abortRef.current)
  }, [currentId, cancelTurn])

  const handleRecover = useCallback((action: 'reconnect' | 'continue') => {
    if (!currentId || streaming) return
    const ctrl = new AbortController()
    abortRef.current = ctrl
    void recoverTurn(currentId, action, ctrl.signal).finally(() => {
      abortRef.current = null
    })
  }, [currentId, streaming, recoverTurn])

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
                {msg.role === 'assistant' ? (
                  <PlanPanel
                    process={msg.process}
                    usage={msg.usage}
                    streaming={streaming && i === messages.length - 1}
                  />
                ) : null}
                {msg.role === 'assistant' && msg.process && msg.process.length > 0 ? (
                  <div style={{
                    marginBottom: msg.content ? 12 : 0,
                    padding: '8px 12px',
                    borderRadius: 'var(--dsw-radius-panel, 8px)',
                    background: 'color-mix(in srgb, var(--dsw-alias-bg-base) 88%, var(--dsw-alias-label-secondary))',
                    border: '0.5px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.06))',
                    fontSize: '12px',
                    lineHeight: '18px',
                    color: 'var(--dsw-alias-label-secondary)',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                      color: 'var(--dsw-alias-label-tertiary)',
                      fontFamily: 'inherit',
                    }}>
                      执行
                    </div>
                    {(processExpanded[i] || msg.process.length <= 3
                      ? msg.process
                      : msg.process.slice(-3)
                    ).map((step) => (
                      <div key={step.id} style={{ marginBottom: 4 }}>
                        <span style={{ color: 'var(--dsw-alias-label-primary)' }}>{step.label}</span>
                        {step.detail ? (
                          <span style={{ opacity: 0.85 }}> — {step.detail}</span>
                        ) : null}
                      </div>
                    ))}
                    {msg.process.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setProcessExpanded((s) => ({ ...s, [i]: !s[i] }))}
                        style={{
                          marginTop: 4,
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          cursor: 'pointer',
                          fontSize: 11,
                          color: 'var(--dsw-alias-label-primary)',
                          fontFamily: 'inherit',
                        }}
                      >
                        {processExpanded[i] ? '收起完整时间线' : `展开完整时间线（${msg.process.length}）`}
                      </button>
                    )}
                  </div>
                ) : null}
                {msg.role === 'assistant' ? (
                  <>
                    {renderWithCitations(
                      shouldCollapseAnswer(msg.content) && !answerExpanded[i]
                        ? msg.content.slice(0, 1200) + '…'
                        : msg.content,
                    )}
                    {shouldCollapseAnswer(msg.content) && (
                      <button
                        type="button"
                        onClick={() => setAnswerExpanded((s) => ({ ...s, [i]: !s[i] }))}
                        style={{
                          display: 'block',
                          marginTop: 8,
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          cursor: 'pointer',
                          fontSize: 12,
                          color: 'var(--dsw-alias-label-secondary)',
                        }}
                      >
                        {answerExpanded[i] ? '收起' : '展开全文'}
                      </button>
                    )}
                  </>
                ) : msg.content}
                {msg.role === 'assistant' && msg.usage ? (
                  <UsageFooter usage={msg.usage} />
                ) : null}
              </div>
            </div>
          ))}
          {streaming && (() => {
            const last = currentSession?.messages?.[currentSession.messages.length - 1]
            const waiting = last?.role === 'assistant' && !last.content
            if (!waiting) return null
            return (
            <div style={{ padding: '12px 24px' }}>
              <div style={{
                maxWidth: 'min(calc(100% - 32px), 920px)',
                margin: '0 auto',
                color: 'var(--dsw-alias-label-secondary)',
                fontSize: '13px',
                lineHeight: '22px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '16px',
                  backgroundColor: 'var(--dsw-alias-state-business-primary)',
                  borderRadius: '1px',
                  animation: 'blink 1s step-end infinite',
                  verticalAlign: 'text-bottom',
                }} />
                {last?.process?.length ? '执行中…' : '正在生成…'}
              </div>
            </div>
            )
          })()}
          <div ref={messagesEndRef} />
        </div>

        {/* Q-A3: reconnect ≠ continue — server recovery_options only */}
        {!!currentSession && !streaming && (
          (currentSession.interrupted || currentSession.connectionLost || (currentSession.recoveryOptions?.length ?? 0) > 0)
        ) && (
          <div
            style={{
              flex: 'none',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
              padding: '8px 24px',
              borderTop: '0.5px solid var(--dsw-alias-border-l3)',
              background: 'var(--dsw-alias-bg-layer-1, rgba(0,0,0,0.02))',
              fontSize: 12,
              color: 'var(--dsw-alias-label-secondary)',
            }}
            role="status"
          >
            <span>
              {currentSession.interrupted
                ? '运行已中断，已保留完成步骤。'
                : currentSession.connectionLost
                  ? '连接中断；任务状态未判定失败。'
                  : '可恢复操作：'}
            </span>
            {(currentSession.recoveryOptions?.length
              ? currentSession.recoveryOptions
              : [
                  ...(currentSession.connectionLost || currentSession.interrupted
                    ? [{ action: 'reconnect', label: '重新连接' }]
                    : []),
                  ...(currentSession.interrupted
                    ? [{ action: 'continue', label: '继续执行' }]
                    : []),
                ]
            ).map((opt) => (
              <button
                key={`${opt.action}-${opt.label}`}
                type="button"
                onClick={() => {
                  const a = opt.action === 'continue' ? 'continue' : 'reconnect'
                  handleRecover(a)
                }}
                style={{
                  border: '0.5px solid var(--dsw-alias-border-l2)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  background: 'var(--dsw-alias-bg-base)',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--dsw-alias-label-primary)',
                }}
              >
                {opt.label || opt.action}
              </button>
            ))}
          </div>
        )}

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
            {pendingAttachments.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  padding: '8px 12px 0',
                }}
                aria-label="已加入上下文"
              >
                {pendingAttachments.map((a) => (
                  <span
                    key={a.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      maxWidth: '100%',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: a.stale
                        ? 'color-mix(in srgb, #b45309 12%, var(--dsw-alias-bg-layer-2, rgba(0,0,0,0.04)))'
                        : 'var(--dsw-alias-bg-layer-2, rgba(0,0,0,0.04))',
                      border: a.stale
                        ? '0.5px solid #b45309'
                        : '0.5px solid var(--dsw-alias-border-l2)',
                      fontSize: '12px',
                      color: 'var(--dsw-alias-label-primary)',
                    }}
                    title={
                      a.stale
                        ? `引用的是旧版 ${a.revision}\n工作区现为 ${a.live_revision || ''}（可刷新）`
                        : `${a.resource_id}\n${a.revision}`
                    }
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.title}
                      {a.range?.page != null ? ` · p${a.range.page}` : ''}
                      {a.range?.line != null ? ` · L${a.range.line}` : ''}
                      {a.range?.line_end != null && a.range.line_end !== a.range.line
                        ? `–${a.range.line_end}`
                        : ''}
                      <span style={{ opacity: 0.55 }}> · {a.revision.slice(0, 14)}…</span>
                      {a.stale ? <span style={{ color: '#b45309' }}> · 旧版</span> : null}
                    </span>
                    {a.stale && (
                      <button
                        type="button"
                        aria-label={`刷新为新版 ${a.title}`}
                        disabled={refreshingId === a.id}
                        onClick={() => void handleRefreshPin(a.id)}
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          cursor: 'pointer',
                          color: '#b45309',
                        }}
                      >
                        <RefreshCw size={12} className={refreshingId === a.id ? 'animate-spin' : undefined} />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`移除 ${a.title}`}
                      onClick={() => unpinAttachment(a.id)}
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'var(--dsw-alias-label-secondary)',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Textarea */}
            <div style={{ position: 'relative', maxHeight: '336px', overflowY: 'auto', margin: '0 4px' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setComposing(true)}
                onCompositionEnd={() => setComposing(false)}
                placeholder={pendingAttachments.length ? '补充说明（可选），发送时冻结上方上下文…' : '给求道发送消息…'}
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
                    disabled={!input.trim() && pendingAttachments.length === 0}
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: '34px',
                      height: '34px',
                      border: 'none',
                      borderRadius: '999px',
                      background: 'var(--dsw-alias-button-info-fill, var(--dsw-alias-state-business-primary))',
                      color: '#fff',
                      cursor: (input.trim() || pendingAttachments.length) ? 'pointer' : 'default',
                      opacity: (input.trim() || pendingAttachments.length) ? 1 : 0.4,
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
