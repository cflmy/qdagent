import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { api, newRequestId, type ChatMessage, type ChatCompletionChunk } from '@/lib/api'
import type { UsageInfo } from '@/components/chat/UsageFooter'
import { formatAttachmentFreeze } from '@/stores/context-attachment-store'
import { routeChannelDelta } from '@/lib/streamChannels'

/** Live execution trail — every agent step visible as it happens. */
export interface ProcessStep {
  id: string
  kind: string
  label: string
  detail?: string
}

export type FrozenContextAttachment = {
  id: string
  resource_id: string
  workspace_id: string
  title: string
  revision: string
  kind?: string
  range?: { page?: number; line?: number; line_end?: number; cell?: string }
  origin: 'user' | 'auto'
}

export interface SessionMessage extends ChatMessage {
  usage?: UsageInfo | null
  citations?: Array<{ id: string; label?: string; document_id?: string; node_id?: string }>
  /** Streaming process / plan / tool / reasoning — never hidden. */
  process?: ProcessStep[]
  /** Frozen at send (QA-16); preview alone never populates this. */
  context_attachments?: FrozenContextAttachment[]
}

export interface Session {
  id: string
  title: string
  messages: SessionMessage[]
  createdAt: string
  updatedAt: string
  /** Session default model — next turn freezes this selection (Q02). */
  modelId?: string
  lastTurnId?: string
  /** Last durable event_id for Last-Event-ID resume. */
  lastEventId?: string
  /** Client-generated idempotency key for the in-flight turn (Q-R3). */
  lastRequestId?: string
  /** UI: stopping until server confirms cancelled. */
  stopping?: boolean
  /** Non-terminal turn interrupted (≠ cancelled). */
  interrupted?: boolean
  /** From turns.get recovery_options (server authority). */
  recoveryOptions?: Array<{ action?: string; label?: string; effect?: string }>
  /** Turn revision for recover CAS. */
  turnRevision?: number
  /** Connection lost while turn still running — distinct from interrupted. */
  connectionLost?: boolean
  /** Transient recover failure — not part of durable chat content. */
  recoveryError?: string
}

interface SessionState {
  sessions: Session[]
  currentId: string | null
  streamingBySession: Record<string, boolean>
}

interface SessionActions {
  createSession: () => string
  selectSession: (id: string) => void
  deleteSession: (id: string) => void
  setSessionModel: (sessionId: string, modelId: string) => void
  addMessage: (sessionId: string, msg: SessionMessage) => void
  updateLastAssistant: (sessionId: string, delta: string) => void
  appendProcess: (
    sessionId: string,
    step: { kind: string; label: string; detail?: string; appendDetail?: boolean },
  ) => void
  setLastUsage: (sessionId: string, usage: UsageInfo) => void
  finalizeAssistant: (sessionId: string) => void
  streamChat: (sessionId: string, signal?: AbortSignal) => Promise<void>
  resumeTurn: (sessionId: string, signal?: AbortSignal) => Promise<void>
  /** Explicit recover: reconnect (events) vs continue (new attempt). */
  recoverTurn: (
    sessionId: string,
    action: 'reconnect' | 'continue',
    signal?: AbortSignal,
  ) => Promise<void>
  cancelTurn: (sessionId: string, controller?: AbortController | null) => Promise<void>
  loadFromStorage: () => void
  saveToStorage: () => void
  isStreaming: (sessionId?: string | null) => boolean
}

const STORE_KEY = 'qdagent.sessions.v2'

/** Recover failures used to be appended into assistant text; strip leftovers. */
function hasRecoverFailMarkers(content: string | undefined): boolean {
  return Boolean(content && content.includes('[恢复失败:'))
}

function stripRecoverFailMarkers(content: string | undefined): string {
  if (!content) return ''
  return content.replace(/(?:\n\n)?\[恢复失败:[^\]]*\]/g, '').trimEnd()
}

function uid(): string {
  return 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

function titleFromMessages(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user' && m.content)
  if (!first) return '新会话'
  const t = first.content.replace(/\s+/g, ' ').trim()
  return t.length > 28 ? t.slice(0, 28) + '…' : t
}

export const useSessionStore = create<SessionState & SessionActions>()(
  immer((set, get) => ({
    sessions: [],
    currentId: null,
    streamingBySession: {},

    isStreaming: (sessionId) => {
      const id = sessionId ?? get().currentId
      if (!id) return false
      return Boolean(get().streamingBySession[id])
    },

    createSession: () => {
      const id = uid()
      const now = new Date().toISOString()
      set((state) => {
        state.sessions.unshift({
          id,
          title: '新会话',
          messages: [],
          createdAt: now,
          updatedAt: now,
        })
        state.currentId = id
      })
      get().saveToStorage()
      return id
    },

    selectSession: (id) => {
      set((state) => {
        state.currentId = id
      })
      // Resume non-terminal turn via events (no model re-run).
      void get().resumeTurn(id)
    },

    deleteSession: (id) => {
      set((state) => {
        state.sessions = state.sessions.filter((s) => s.id !== id)
        delete state.streamingBySession[id]
        if (state.currentId === id) {
          state.currentId = state.sessions[0]?.id ?? null
        }
      })
      get().saveToStorage()
    },

    setSessionModel: (sessionId, modelId) => {
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId)
        if (session) session.modelId = modelId
      })
      get().saveToStorage()
    },

    addMessage: (sessionId, msg) => {
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId)
        if (!session) return
        session.messages.push(msg)
        session.updatedAt = new Date().toISOString()
        session.title = titleFromMessages(session.messages)
      })
      get().saveToStorage()
    },

    updateLastAssistant: (sessionId, delta) => {
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId)
        if (!session) return
        const last = session.messages[session.messages.length - 1]
        if (last && last.role === 'assistant') {
          last.content += delta
        }
      })
    },

    appendProcess: (sessionId, step) => {
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId)
        if (!session) return
        const last = session.messages[session.messages.length - 1]
        if (!last || last.role !== 'assistant') return
        if (!last.process) last.process = []
        if (step.appendDetail && last.process.length > 0) {
          const prev = last.process[last.process.length - 1]
          if (prev.kind === step.kind) {
            prev.detail = (prev.detail || '') + (step.detail || '')
            return
          }
        }
        last.process.push({
          id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          kind: step.kind,
          label: step.label,
          detail: step.detail,
        })
      })
    },

    setLastUsage: (sessionId, usage) => {
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId)
        if (!session) return
        const last = session.messages[session.messages.length - 1]
        if (last && last.role === 'assistant') {
          last.usage = usage
        }
      })
    },

    finalizeAssistant: (sessionId) => {
      set((state) => {
        state.streamingBySession[sessionId] = false
        const session = state.sessions.find((s) => s.id === sessionId)
        if (session) {
          session.updatedAt = new Date().toISOString()
        }
      })
      get().saveToStorage()
    },

    cancelTurn: async (sessionId, controller) => {
      // Stop = cancel API. Abort alone only closes the observer (≠ cancel).
      set((s) => {
        const sess = s.sessions.find((x) => x.id === sessionId)
        if (sess) sess.stopping = true
      })
      const session = get().sessions.find((s) => s.id === sessionId)
      let confirmed = false
      if (session?.lastTurnId) {
        try {
          await api.appTurnsCancel({ turn_id: session.lastTurnId })
        } catch {
          /* cancel may race terminal */
        }
        // Wait briefly for server terminal before UI 「已停止」.
        for (let i = 0; i < 40; i++) {
          try {
            const got = await api.appTurnsGet(session.lastTurnId) as {
              data?: { turn?: { state?: string } }
              turn?: { state?: string }
            }
            const st = got?.data?.turn?.state || got?.turn?.state || ''
            if (st === 'cancelled' || st === 'cancelling' || st === 'interrupted' || st === 'completed' || st === 'failed') {
              confirmed = st === 'cancelled' || st === 'cancelling' || st === 'interrupted'
              break
            }
          } catch { /* keep waiting */ }
          await new Promise((r) => setTimeout(r, 150))
        }
      }
      // Close observer only — task cancel already requested on server.
      controller?.abort()
      set((s) => {
        const sess = s.sessions.find((x) => x.id === sessionId)
        if (!sess) return
        sess.stopping = false
        if (confirmed) {
          const last = sess.messages[sess.messages.length - 1]
          if (last?.role === 'assistant' && !(last.content || '').trim()) {
            last.content = '[已停止]'
          }
        }
      })
      get().finalizeAssistant(sessionId)
    },

    resumeTurn: async (sessionId, signal) => {
      const session = get().sessions.find((s) => s.id === sessionId)
      if (!session?.lastTurnId) return
      let state = ''
      let messageSnapshot = ''
      let recoveryOptions: Array<{ action?: string; label?: string; effect?: string }> = []
      let turnRevision = 0
      try {
        const got = await api.appTurnsGet(session.lastTurnId) as {
          data?: {
            turn?: { state?: string; revision?: number }
            state?: string
            message_snapshot?: string
            answer_revision?: number
            recovery_options?: Array<{ action?: string; label?: string; effect?: string }>
            last_seq?: number
          }
          turn?: { state?: string; revision?: number }
        }
        const data = got?.data
        state = data?.state || data?.turn?.state || got?.turn?.state || ''
        messageSnapshot = typeof data?.message_snapshot === 'string' ? data.message_snapshot : ''
        recoveryOptions = Array.isArray(data?.recovery_options) ? data!.recovery_options! : []
        turnRevision = Number(data?.turn?.revision ?? got?.turn?.revision ?? 0) || 0
        // Terminal completed/cancelled must not keep stale "查看已完成步骤" chips.
        // Keep continue (and reconnect only while interrupted / mid-flight).
        if (state === 'completed' || state === 'cancelled') {
          recoveryOptions = []
        } else if (state === 'failed') {
          recoveryOptions = recoveryOptions.filter((o) => o.action === 'continue')
        }
        set((s) => {
          const sess = s.sessions.find((x) => x.id === sessionId)
          if (!sess) return
          sess.recoveryOptions = recoveryOptions
          sess.turnRevision = turnRevision
          sess.connectionLost = false
          if (state === 'completed' || state === 'cancelled' || state === 'failed') {
            sess.interrupted = false
          }
        })
      } catch {
        set((s) => {
          const sess = s.sessions.find((x) => x.id === sessionId)
          if (sess) sess.connectionLost = true
        })
        return
      }
      if (['completed', 'cancelled', 'failed', 'interrupted'].includes(state)) {
        // Q-A3: terminal snapshot fill — prefer message_snapshot; events replay never re-exec tools.
        if (state === 'interrupted') {
          set((s) => {
            const sess = s.sessions.find((x) => x.id === sessionId)
            if (sess) sess.interrupted = true
          })
        }
        const last = session.messages[session.messages.length - 1]
        const needsFill =
          !last ||
          last.role !== 'assistant' ||
          !(last.content || '').trim() ||
          (messageSnapshot && last.role === 'assistant' && (last.content || '').length < messageSnapshot.length)
        // Failed/cancelled with empty snap + empty bubble: don't replay stale events into a
        // newer user turn's placeholder (common after mid-answer refresh before turnId persist).
        if (needsFill && !messageSnapshot && (state === 'failed' || state === 'cancelled')) {
          set((s) => {
            const sess = s.sessions.find((x) => x.id === sessionId)
            if (!sess) return
            const m = sess.messages[sess.messages.length - 1]
            if (m?.role === 'assistant' && !(m.content || '').trim()) {
              m.content = state === 'cancelled' ? '[已停止]' : '[回合失败]'
            }
          })
          get().finalizeAssistant(sessionId)
          return
        }
        if (needsFill) {
          if (!last || last.role !== 'assistant') {
            get().addMessage(sessionId, { role: 'assistant', content: '' })
          }
          if (messageSnapshot) {
            set((s) => {
              const sess = s.sessions.find((x) => x.id === sessionId)
              if (!sess) return
              const m = sess.messages[sess.messages.length - 1]
              if (m?.role === 'assistant') {
                // Replace stub / short local text with durable projection (F08).
                if (!(m.content || '').trim() || (m.content || '').length < messageSnapshot.length) {
                  m.content = messageSnapshot
                }
              }
            })
          } else {
            try {
              const stream = api.appTurnsEvents(session.lastTurnId, {
                afterSeq: 0,
                signal,
              })
              for await (const chunk of stream) {
                const c = chunk as {
                  event_id?: string
                  type?: string
                  payload?: Record<string, unknown>
                }
                if (c?.event_id) {
                  set((s) => {
                    const sess = s.sessions.find((x) => x.id === sessionId)
                    if (sess) sess.lastEventId = c.event_id
                  })
                }
                if (c?.type === 'message.delta') {
                  const p = c.payload as
                    | { delta?: string; text?: string; kind?: string; type?: string }
                    | undefined
                  if (p?.type === 'preflight' || p?.kind === 'plan' || p?.kind === 'reasoning') {
                    continue
                  }
                  const token = p?.delta || p?.text || ''
                  if (token) get().updateLastAssistant(sessionId, token)
                }
                if (c?.type === 'turn.cancelled' || c?.type === 'turn.interrupted') {
                  set((s) => {
                    const sess = s.sessions.find((x) => x.id === sessionId)
                    if (!sess) return
                    const m = sess.messages[sess.messages.length - 1]
                    if (m?.role === 'assistant' && !(m.content || '').trim()) {
                      m.content =
                        c.type === 'turn.interrupted'
                          ? '[已中断，可继续恢复]'
                          : '[已停止]'
                    }
                  })
                }
                if (c?.type === 'turn.failed') {
                  set((s) => {
                    const sess = s.sessions.find((x) => x.id === sessionId)
                    if (!sess) return
                    const m = sess.messages[sess.messages.length - 1]
                    if (m?.role === 'assistant' && !(m.content || '').trim()) {
                      m.content = '[回合失败]'
                    }
                  })
                }
              }
            } catch (e) {
              if (signal?.aborted) return
              if (e instanceof Error && /abort/i.test(e.message)) return
            }
          }
        }
        get().finalizeAssistant(sessionId)
        return
      }
      set((s) => {
        s.streamingBySession[sessionId] = true
        const sess = s.sessions.find((x) => x.id === sessionId)
        if (sess) {
          sess.interrupted = false
          sess.stopping = false
          sess.connectionLost = false
        }
      })
      const last = session.messages[session.messages.length - 1]
      if (!last || last.role !== 'assistant') {
        get().addMessage(sessionId, { role: 'assistant', content: '' })
      }
      try {
        const stream = api.appTurnsEvents(session.lastTurnId, {
          lastEventId: session.lastEventId,
          signal,
        })
        for await (const chunk of stream) {
          const c = chunk as { event_id?: string; type?: string; turn_id?: string; payload?: Record<string, unknown> }
          if (c?.event_id) {
            set((s) => {
              const sess = s.sessions.find((x) => x.id === sessionId)
              if (sess) sess.lastEventId = c.event_id
            })
          }
          if (c?.type === 'message.delta') {
            const p = c.payload as {
              delta?: string
              text?: string
              kind?: string
              type?: string
              channel?: string
              append_to_chat?: boolean
              resource_id?: string
            } | undefined
            if (p?.type === 'preflight' || p?.kind === 'plan' || p?.kind === 'reasoning') {
              get().appendProcess(sessionId, {
                kind: String(p.type || p.kind),
                label: p.type === 'preflight' ? '工程预检' : String(p.kind),
                detail: String(p.delta || p.text || '').slice(0, 240) || undefined,
                appendDetail: p.kind === 'plan' || p.kind === 'reasoning',
              })
              continue
            }
            const routed = routeChannelDelta(p)
            if (routed.kind === 'answer' && routed.text) {
              get().updateLastAssistant(sessionId, routed.text)
            } else if (routed.kind === 'progress' || routed.kind === 'diagnostic') {
              get().appendProcess(sessionId, {
                kind: routed.kind,
                label: routed.kind === 'progress' ? '进度' : '诊断',
                detail: routed.text.slice(0, 240) || undefined,
                appendDetail: true,
              })
            } else if (routed.kind === 'artifact') {
              get().appendProcess(sessionId, {
                kind: 'artifact',
                label: '产物草稿',
                detail: (routed.resourceId || routed.text || '').slice(0, 240) || undefined,
              })
            }
            continue
          }
          if (c?.type === 'turn.cancelled' || c?.type === 'turn.interrupted') {
            set((s) => {
              const sess = s.sessions.find((x) => x.id === sessionId)
              if (!sess) return
              if (c.type === 'turn.interrupted') sess.interrupted = true
              const m = sess.messages[sess.messages.length - 1]
              if (m?.role === 'assistant' && !(m.content || '').trim()) {
                m.content = c.type === 'turn.interrupted' ? '[已中断，可继续恢复]' : '[已停止]'
              }
            })
          }
        }
      } catch (e) {
        if (signal?.aborted) return
        if (e instanceof Error && /abort/i.test(e.message)) return
        set((s) => {
          const sess = s.sessions.find((x) => x.id === sessionId)
          if (sess) sess.connectionLost = true
        })
      } finally {
        get().finalizeAssistant(sessionId)
      }
    },

    recoverTurn: async (sessionId, action, signal) => {
      const session = get().sessions.find((s) => s.id === sessionId)
      if (!session?.lastTurnId) return
      const key = newRequestId(`recover-${action}`)
      try {
        const res = await api.appTurnsRecover({
          turn_id: session.lastTurnId,
          action,
          expected_revision: session.turnRevision,
          idempotency_key: key,
        }) as {
          ok?: boolean
          data?: {
            ok?: boolean
            turn_id?: string
            resumed_from?: string
            allow_run?: boolean
            events_url?: string
            revision?: number
            note?: string
            error?: string
            code?: string
          }
          error?: { message?: string; code?: string }
        }
        const data = res.data
        if (res.ok === false || data?.ok === false) {
          throw new Error(data?.error || res.error?.message || '恢复被拒绝')
        }
        if (action === 'reconnect') {
          set((s) => {
            const sess = s.sessions.find((x) => x.id === sessionId)
            if (sess) {
              sess.connectionLost = false
              sess.recoveryError = undefined
              if (typeof data?.revision === 'number') sess.turnRevision = data.revision
              // Clear stale recover-fail lines baked into content before the server fix.
              for (const m of sess.messages) {
                if (m.role === 'assistant' && hasRecoverFailMarkers(m.content)) {
                  m.content = stripRecoverFailMarkers(m.content)
                }
              }
            }
          })
          get().saveToStorage()
          await get().resumeTurn(sessionId, signal)
          return
        }
        // continue: switch to child turn; user must send next message — no silent tool replay.
        if (data?.turn_id) {
          set((s) => {
            const sess = s.sessions.find((x) => x.id === sessionId)
            if (!sess) return
            sess.lastTurnId = data.turn_id
            sess.interrupted = false
            sess.connectionLost = false
            sess.turnRevision = typeof data.revision === 'number' ? data.revision : 1
            sess.recoveryOptions = []
            const m = sess.messages[sess.messages.length - 1]
            if (m?.role === 'assistant') {
              const note = data.note || '已获继续许可；原回合不可变。请发送下一条消息开启新 attempt（不会静默重放工具）。'
              if (!(m.content || '').trim() || /已中断/.test(m.content || '')) {
                m.content = (m.content ? m.content + '\n\n' : '') + note
              } else {
                m.content = m.content + '\n\n' + note
              }
            }
          })
        }
      } catch (e) {
        set((s) => {
          const sess = s.sessions.find((x) => x.id === sessionId)
          if (!sess) return
          // Keep durable chat clean — surface recover errors as session UI state only.
          sess.recoveryError = e instanceof Error ? e.message : String(e)
        })
      } finally {
        get().finalizeAssistant(sessionId)
      }
    },

    streamChat: async (sessionId, signal) => {
      const session = get().sessions.find((s) => s.id === sessionId)
      if (!session) return

      // Snapshot history BEFORE adding the empty assistant placeholder.
      // Using a stale snapshot + slice(0,-1) previously dropped the latest user message (A04).
      // Drop empty / cancelled / prior dry-run stubs so they don't poison EFI task text.
      const history = session.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
        .filter((m) => {
          const t = (m.content || '').trim()
          if (m.role === 'assistant') {
            if (!t) return false
            if (/^\[已停止\]$/.test(t)) return false
            if (/^\[错误:/.test(t)) return false
            if (/^\[恢复失败:/.test(t)) return false
            if (/^（未在设置中配置提供商凭证）/.test(t)) return false
            if (/^（无 API Key）/.test(t)) return false
          }
          return Boolean(t) || m.role === 'user'
        })
        .map(({ role, content }) => ({
          role,
          content: role === 'assistant' ? stripRecoverFailMarkers(content) : content,
        }))

      // Latest user message may carry frozen ContextAttachments (pin ≠ preview).
      const lastUser = [...session.messages].reverse().find((m) => m.role === 'user')
      const frozenAtts = lastUser?.context_attachments || []
      if (frozenAtts.length) {
        const freeze = formatAttachmentFreeze(frozenAtts as Parameters<typeof formatAttachmentFreeze>[0])
        if (freeze) {
          history.splice(Math.max(0, history.length - 1), 0, {
            role: 'system',
            content: freeze,
          })
        }
      }

      const frozenModelId = session.modelId
      const requestId = newRequestId('chat')
      set((s) => {
        s.streamingBySession[sessionId] = true
        const sess = s.sessions.find((x) => x.id === sessionId)
        if (sess) {
          sess.lastRequestId = requestId
          sess.stopping = false
        }
      })

      get().addMessage(sessionId, { role: 'assistant', content: '' })

      try {
        const attWs = frozenAtts.find((a) => a.workspace_id)?.workspace_id || ''
        const stream = api.v1ChatCompletions(
          {
            messages: history,
            stream: true,
            model_id: frozenModelId,
            selection: frozenModelId
              ? { mode: 'manual', model_id: frozenModelId }
              : undefined,
            session_id: sessionId,
            request_id: requestId,
            workspace_id: attWs || undefined,
            context_attachments: frozenAtts,
          },
          signal,
        )

        for await (const chunk of stream) {
          const c = chunk as ChatCompletionChunk & {
            error?: string
            ok?: boolean
            type?: string
            turn_id?: string
            payload?: {
              delta?: string
              usage_state?: string
              total_tokens?: number | null
              input_tokens?: number | null
              output_tokens?: number | null
              display_name?: string
              provider_id?: string
              model_id?: string
            }
          }

          const turnId = c?.turn_id || (c?.payload as { turn_id?: string } | undefined)?.turn_id
          if ((c?.type === 'turn.started' || c?.type === 'run.started') && turnId) {
            set((s) => {
              const sess = s.sessions.find((x) => x.id === sessionId)
              if (sess) sess.lastTurnId = turnId
            })
            // Persist immediately: refresh mid-stream otherwise resumes the *previous* turn.
            get().saveToStorage()
          }
          const eid = (c as { event_id?: string }).event_id
          if (eid) {
            set((s) => {
              const sess = s.sessions.find((x) => x.id === sessionId)
              if (sess) sess.lastEventId = eid
            })
            // Persist cursor so mid-answer refresh resumes after the last seen event.
            get().saveToStorage()
          }
          if (c?.type === 'run.started') {
            get().appendProcess(sessionId, { kind: 'run', label: '请求开始' })
          }
          if (c?.type === 'turn.started') {
            get().appendProcess(sessionId, { kind: 'turn', label: '回合开始' })
          }

          if (c?.type === 'message.delta') {
            const p = c.payload as {
              delta?: string
              text?: string
              kind?: string
              type?: string
              channel?: string
              append_to_chat?: boolean
              resource_id?: string
              result?: string
              decision?: string
              summary?: string
              name?: string
              workbook?: string
              round?: number | string
              exit_code?: number | string
            } | undefined
            const evType = p?.type || ''
            // Execution trail — every agent step visible immediately (never drop).
            if (
              evType === 'preflight' ||
              evType === 'decompose' ||
              evType === 'decision' ||
              evType === 'await' ||
              evType === 'round' ||
              evType === 'done' ||
              evType === 'tool_start' ||
              evType === 'tool_end' ||
              evType === 'plan_act'
            ) {
              const label =
                evType === 'preflight' ? '工程预检' :
                evType === 'decompose' ? '分解工作簿' :
                evType === 'decision' ? `决策 ${p?.decision || ''}`.trim() :
                evType === 'await' ? '等待子任务' :
                evType === 'round' ? `子任务完成 #${p?.round ?? ''}`.trim() :
                evType === 'done' ? '回合收尾' :
                evType === 'plan_act' ? `计划动作 ${p?.kind || ''} ${p?.name || ''}`.trim() :
                evType === 'tool_start' ? `调用工具 ${p?.name || ''}`.trim() :
                `工具结束 ${p?.name || ''}`.trim()
              const detail = String(
                p?.summary || p?.result || p?.workbook || '',
              ).slice(0, 240)
              get().appendProcess(sessionId, {
                kind: evType,
                label,
                detail: detail || undefined,
              })
              continue
            }
            // Design §5.3: only answer channel appends to chat; others → process / preview.
            const routed = routeChannelDelta(p)
            if (routed.kind === 'answer') {
              const token = routed.text
              const sess = get().sessions.find((s) => s.id === sessionId)
              const last = sess?.messages[sess.messages.length - 1]
              const cur = last?.content || ''
              if (cur && (token === cur || (cur.endsWith(token) && token.length > 24))) continue
              get().updateLastAssistant(sessionId, token)
              continue
            }
            if (routed.kind === 'progress') {
              if (routed.text) {
                get().appendProcess(sessionId, {
                  kind: 'progress',
                  label: routed.label,
                  detail: routed.text.slice(0, 240),
                  appendDetail: true,
                })
              }
              continue
            }
            if (routed.kind === 'diagnostic') {
              if (routed.text) {
                get().appendProcess(sessionId, {
                  kind: 'diagnostic',
                  label: '诊断',
                  detail: routed.text.slice(0, 240),
                  appendDetail: true,
                })
              }
              continue
            }
            if (routed.kind === 'artifact') {
              get().appendProcess(sessionId, {
                kind: 'artifact',
                label: '产物草稿',
                detail: (routed.resourceId || routed.text || '').slice(0, 240) || undefined,
              })
              continue
            }
            continue
          }

          if (c?.type === 'usage.updated' && c.payload) {
            get().setLastUsage(sessionId, {
              usage_state: c.payload.usage_state || 'unknown',
              measurement_source: (c.payload as { measurement_source?: string }).measurement_source,
              total_tokens: c.payload.total_tokens ?? null,
              input_tokens: c.payload.input_tokens ?? null,
              output_tokens: c.payload.output_tokens ?? null,
              model: c.payload.display_name || c.payload.model_id,
              provider: c.payload.provider_id,
            })
            continue
          }

          if (c?.type === 'model.resolved') {
            const p = (c.payload || c) as {
              display_name?: string
              model_id?: string
              provider_id?: string
            }
            get().setLastUsage(sessionId, {
              model: p.display_name || p.model_id,
              provider: p.provider_id,
              usage_state: 'unknown',
            })
            get().appendProcess(sessionId, {
              kind: 'model',
              label: '模型',
              detail: [p.provider_id, p.display_name || p.model_id].filter(Boolean).join(' / '),
            })
            continue
          }

          if (c?.type === 'run.completed') {
            get().appendProcess(sessionId, { kind: 'completed', label: '完成' })
            const payload = c.payload as {
              result?: string | {
                content?: string
                result?: string
                choices?: Array<{ message?: { content?: string } }>
              }
            } | undefined
            const result = payload?.result
            let text = ''
            if (typeof result === 'string') {
              text = result
            } else if (result && typeof result === 'object') {
              text = result.content
                || result.result
                || result.choices?.[0]?.message?.content
                || ''
            }
            if (text) {
              // Final envelope: fill if empty/stub; replace if final differs
              // (never append — streaming already concatenated deltas).
              // Process trail is kept — only the answer bubble is updated.
              const sess = get().sessions.find((s) => s.id === sessionId)
              const last = sess?.messages[sess.messages.length - 1]
              const cur = (last?.content || '').trim()
              const stub = !cur || /^\[错误:/.test(cur) || /^\[已停止\]$/.test(cur)
              if (last?.role === 'assistant' && (stub || cur !== text.trim())) {
                set((s) => {
                  const sess2 = s.sessions.find((x) => x.id === sessionId)
                  if (!sess2) return
                  const m = sess2.messages[sess2.messages.length - 1]
                  if (m?.role === 'assistant') m.content = text
                })
                get().saveToStorage()
              }
            }
            continue
          }

          if (c?.type === 'run.failed' || c?.type === 'run.interrupted') {
            const err = (c.payload as { error?: string; reason?: string } | undefined)?.error
              || (c.payload as { reason?: string } | undefined)?.reason
              || '流式中断'
            get().appendProcess(sessionId, { kind: 'failed', label: '失败', detail: err })
            get().updateLastAssistant(sessionId, `\n\n[错误: ${err}]`)
            continue
          }

          // Legacy OpenAI chunk shape / non-SSE JSON completion (compat)
          const anyChunk = c as unknown as {
            content?: string
            error?: string
            ok?: boolean
            mode?: string
            outcome?: string
            status?: string
            recovery_options?: Array<{ action?: string; label?: string }>
            choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }>
          }
          if (c?.ok === false || (c?.error && !c?.choices && anyChunk.content == null)) {
            const detail = c.error || ''
            const outcome = anyChunk.outcome || ''
            const mode = anyChunk.mode || ''
            const recovery = (anyChunk.recovery_options || [])
              .map((r) => r.label || r.action)
              .filter(Boolean)
              .join('；')
            // Q-A3: product failure card — outcome ≠ transport; keep draft text if present.
            const draft = anyChunk.content
              || anyChunk.choices?.[0]?.message?.content
              || ''
            if (draft.trim()) {
              const banner = [
                mode === 'gated_error' ? '文档门禁未通过' : '回合未成功',
                outcome ? `outcome=${outcome}` : '',
                detail ? String(detail) : '',
                recovery ? `可恢复：${recovery}` : '写操作不会自动重试',
              ].filter(Boolean).join(' · ')
              set((s) => {
                const sess = s.sessions.find((x) => x.id === sessionId)
                if (!sess) return
                const m = sess.messages[sess.messages.length - 1]
                if (m?.role === 'assistant') {
                  m.content = `[${banner}]\n\n${draft}`
                }
              })
              get().appendProcess(sessionId, {
                kind: 'failed',
                label: mode === 'gated_error' ? '门禁失败' : '失败',
                detail: String(detail || outcome || mode || 'failed'),
              })
              get().saveToStorage()
              continue
            }
            const hint = /unauthor|invalid.*key|401/i.test(String(detail))
              ? '模型鉴权失败：请检查「设置 → 模型」中的 API Key 与地址。'
              : String(detail) || '上游模型调用失败'
            throw new Error(hint)
          }
          const delta = c.choices?.[0]?.delta?.content
          if (delta) {
            get().updateLastAssistant(sessionId, delta)
          }
          const full = anyChunk.choices?.[0]?.message?.content || anyChunk.content || ''
          if (full) {
            const sess = get().sessions.find((s) => s.id === sessionId)
            const last = sess?.messages[sess.messages.length - 1]
            if (last?.role === 'assistant' && !last.content) {
              get().updateLastAssistant(sessionId, full)
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError' && !signal?.aborted) {
          get().updateLastAssistant(sessionId, `\n\n[错误: ${(err as Error).message}]`)
        }
        // Abort = observer closed only; cancelTurn owns 「已停止」 after server confirm.
      } finally {
        // Hydrate usage from server ledger when stream omitted totals (never invent 0).
        const sess = get().sessions.find((s) => s.id === sessionId)
        const last = sess?.messages[sess.messages.length - 1]
        const needUsageHydrate =
          last?.role === 'assistant' &&
          (!last.usage ||
            last.usage.usage_state === 'unknown' ||
            last.usage.total_tokens == null)
        if (needUsageHydrate) {
          try {
            const q = await api.appUsageQuery({ session_id: sessionId, limit: 5 }) as {
              data?: { rows?: Array<Record<string, unknown>>; calls?: Array<Record<string, unknown>> }
              calls?: Array<Record<string, unknown>>
              summary?: { coverage?: string }
            }
            const rows = q.data?.rows || q.data?.calls || q.calls || []
            const row = rows[0]
            if (row) {
              const us = String(row.usage_state || 'unknown')
              const ms = String(row.measurement_source || '')
              get().setLastUsage(sessionId, {
                usage_state: us,
                measurement_source: ms,
                total_tokens: (row.total_tokens as number | null | undefined) ?? null,
                input_tokens: (row.input_tokens as number | null | undefined) ?? null,
                output_tokens: (row.output_tokens as number | null | undefined) ?? null,
                model: String(row.model_id || last.usage?.model || ''),
                provider: last.usage?.provider,
                status: String(row.status || '完成'),
                call_count: us === 'zero_calls' ? 0 : (us === 'unknown' && ms !== 'runtime_confirmed_no_llm' ? 1 : undefined),
              })
            } else if (!last.usage) {
              get().setLastUsage(sessionId, { usage_state: 'unknown', status: '完成' })
            }
          } catch {
            if (!last.usage) {
              get().setLastUsage(sessionId, { usage_state: 'unknown', status: '完成' })
            }
          }
        }
        get().finalizeAssistant(sessionId)
      }
    },

    loadFromStorage: () => {
      try {
        const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem('qdagent.sessions.v1')
        if (!raw) return
        const data = JSON.parse(raw)
        const sessions = (data.sessions || []) as Session[]
        let dirty = false
        for (const sess of sessions) {
          if (!Array.isArray(sess.messages)) continue
          for (const m of sess.messages) {
            if (m.role === 'assistant' && hasRecoverFailMarkers(m.content)) {
              m.content = stripRecoverFailMarkers(m.content)
              dirty = true
            }
          }
          // Drop empty assistant stubs *except* the trailing placeholder for an
          // in-flight turn (mid-answer refresh must keep the bubble to resume into).
          const before = sess.messages.length
          sess.messages = sess.messages.filter((m, i, arr) => {
            if (m.role !== 'assistant') return true
            if ((m.content || '').trim()) return true
            const isLast = i === arr.length - 1
            if (isLast && sess.lastTurnId) return true
            return false
          })
          if (sess.messages.length !== before) dirty = true
        }
        for (const sess of sessions) {
          // Drop persisted recover chips from terminal chats (pre-fix localStorage).
          if (!sess.interrupted && !sess.connectionLost) {
            const kept = (sess.recoveryOptions || []).filter((o) => o.action === 'continue')
            if ((sess.recoveryOptions?.length ?? 0) !== kept.length) dirty = true
            sess.recoveryOptions = kept
          }
        }
        set((state) => {
          state.sessions = sessions
          state.currentId = data.currentId || state.sessions[0]?.id || null
          state.streamingBySession = {}
        })
        if (dirty) get().saveToStorage()
      } catch {
        // ignore corrupt data
      }
    },

    saveToStorage: () => {
      const { sessions, currentId } = get()
      localStorage.setItem(STORE_KEY, JSON.stringify({ sessions, currentId }))
    },
  })),
)
