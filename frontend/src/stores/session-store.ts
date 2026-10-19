import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { api, type ChatMessage, type ChatCompletionChunk } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────

export interface Session {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

interface SessionState {
  sessions: Session[]
  currentId: string | null
  streaming: boolean
}

interface SessionActions {
  createSession: () => string
  selectSession: (id: string) => void
  deleteSession: (id: string) => void
  addMessage: (sessionId: string, msg: ChatMessage) => void
  updateLastAssistant: (sessionId: string, delta: string) => void
  finalizeAssistant: (sessionId: string) => void
  streamChat: (sessionId: string, signal?: AbortSignal) => Promise<void>
  loadFromStorage: () => void
  saveToStorage: () => void
}

// ─── Constants ───────────────────────────────────────────────────────

const STORE_KEY = 'qdagent.sessions.v1'

function uid(): string {
  return 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

function titleFromMessages(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user' && m.content)
  if (!first) return '新会话'
  const t = first.content.replace(/\s+/g, ' ').trim()
  return t.length > 28 ? t.slice(0, 28) + '…' : t
}

// ─── Store ───────────────────────────────────────────────────────────

export const useSessionStore = create<SessionState & SessionActions>()(
  immer((set, get) => ({
    sessions: [],
    currentId: null,
    streaming: false,

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
        if (state.currentId === id) {
          state.currentId = state.sessions[0]?.id ?? null
        }
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

    finalizeAssistant: (sessionId) => {
      set((state) => {
        state.streaming = false
        const session = state.sessions.find((s) => s.id === sessionId)
        if (session) {
          session.updatedAt = new Date().toISOString()
        }
      })
      get().saveToStorage()
    },

    streamChat: async (sessionId, signal) => {
      const state = get()
      const session = state.sessions.find((s) => s.id === sessionId)
      if (!session) return

      set((s) => { s.streaming = true })

      // Add empty assistant message
      get().addMessage(sessionId, { role: 'assistant', content: '' })

      try {
        const stream = api.v1ChatCompletions(
          {
            messages: session.messages.slice(0, -1), // exclude empty assistant
            stream: true,
          },
          signal,
        )

        for await (const chunk of stream) {
          const c = chunk as ChatCompletionChunk
          const delta = c.choices?.[0]?.delta?.content
          if (delta) {
            get().updateLastAssistant(sessionId, delta)
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          get().updateLastAssistant(sessionId, `\n\n[错误: ${(err as Error).message}]`)
        }
      } finally {
        get().finalizeAssistant(sessionId)
      }
    },

    loadFromStorage: () => {
      try {
        const raw = localStorage.getItem(STORE_KEY)
        if (!raw) return
        const data = JSON.parse(raw)
        set((state) => {
          state.sessions = data.sessions || []
          state.currentId = data.currentId || state.sessions[0]?.id || null
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
