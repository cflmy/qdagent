import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { api, type ChatMessage, type ChatCompletionChunk } from '@/lib/api'
import type { UsageInfo } from '@/components/chat/UsageFooter'

export interface SessionMessage extends ChatMessage {
  usage?: UsageInfo | null
  citations?: Array<{ id: string; label?: string; document_id?: string; node_id?: string }>
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
  setLastUsage: (sessionId: string, usage: UsageInfo) => void
  finalizeAssistant: (sessionId: string) => void
  streamChat: (sessionId: string, signal?: AbortSignal) => Promise<void>
  cancelTurn: (sessionId: string, controller?: AbortController | null) => Promise<void>
  loadFromStorage: () => void
  saveToStorage: () => void
  isStreaming: (sessionId?: string | null) => boolean
}

const STORE_KEY = 'qdagent.sessions.v2'

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
      const session = get().sessions.find((s) => s.id === sessionId)
      controller?.abort()
      if (session?.lastTurnId) {
        try {
          await api.appTurnsCancel({ turn_id: session.lastTurnId })
        } catch {
          // best-effort; abort already cut the transport
        }
      }
    },

    streamChat: async (sessionId, signal) => {
      const session = get().sessions.find((s) => s.id === sessionId)
      if (!session) return

      // Snapshot history BEFORE adding the empty assistant placeholder.
      // Using a stale snapshot + slice(0,-1) previously dropped the latest user message (A04).
      const history = session.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
        .map(({ role, content }) => ({ role, content }))

      const frozenModelId = session.modelId
      set((s) => {
        s.streamingBySession[sessionId] = true
      })

      get().addMessage(sessionId, { role: 'assistant', content: '' })

      try {
        const stream = api.v1ChatCompletions(
          {
            messages: history,
            stream: true,
            model_id: frozenModelId,
            selection: frozenModelId
              ? { mode: 'manual', model_id: frozenModelId }
              : undefined,
            session_id: sessionId,
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

          if (c?.type === 'turn.started' && c.turn_id) {
            set((s) => {
              const sess = s.sessions.find((x) => x.id === sessionId)
              if (sess) sess.lastTurnId = c.turn_id
            })
          }

          if (c?.type === 'message.delta' && c.payload?.delta) {
            get().updateLastAssistant(sessionId, c.payload.delta)
            continue
          }

          if (c?.type === 'usage.updated' && c.payload) {
            get().setLastUsage(sessionId, {
              usage_state: c.payload.usage_state || 'unknown',
              total_tokens: c.payload.total_tokens ?? null,
              input_tokens: c.payload.input_tokens ?? null,
              output_tokens: c.payload.output_tokens ?? null,
              model: c.payload.display_name || c.payload.model_id,
              provider: c.payload.provider_id,
            })
            continue
          }

          if (c?.type === 'model.resolved' && c.payload) {
            get().setLastUsage(sessionId, {
              model: c.payload.display_name || c.payload.model_id,
              provider: c.payload.provider_id,
              usage_state: 'unknown',
            })
            continue
          }

          // Legacy OpenAI chunk shape (compat)
          if (c?.ok === false || c?.error) {
            const detail = c.error || c.choices?.[0]?.delta?.content || ''
            const hint = /unauthor|invalid.*key|401/i.test(String(detail))
              ? '模型鉴权失败：请检查「设置 → 模型」中的 API Key 与地址。'
              : String(detail) || '上游模型调用失败'
            throw new Error(hint)
          }
          const delta = c.choices?.[0]?.delta?.content
          if (delta) {
            get().updateLastAssistant(sessionId, delta)
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          get().updateLastAssistant(sessionId, `\n\n[错误: ${(err as Error).message}]`)
        } else {
          get().updateLastAssistant(sessionId, '\n\n[已停止]')
        }
      } finally {
        get().finalizeAssistant(sessionId)
      }
    },

    loadFromStorage: () => {
      try {
        const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem('qdagent.sessions.v1')
        if (!raw) return
        const data = JSON.parse(raw)
        set((state) => {
          state.sessions = data.sessions || []
          state.currentId = data.currentId || state.sessions[0]?.id || null
          state.streamingBySession = {}
        })
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
