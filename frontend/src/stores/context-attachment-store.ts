import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

/** Frozen ContextAttachment (design §10.1 / §11.2) — pin ≠ preview. */
export type ContextAttachment = {
  id: string
  resource_id: string
  workspace_id: string
  title: string
  revision: string
  digest?: string
  kind?: string
  media_type?: string
  source_ref?: string
  /** Optional page/line/cell range frozen at pin time. */
  range?: { page?: number; line?: number; line_end?: number; cell?: string }
  origin: 'user' | 'auto'
  /** Optional bounded excerpt from resources/read — never claims full file. */
  excerpt?: string
  excerpt_truncated?: boolean
  pinned_at: string
  /** Live workspace digest differs from pinned — user may refresh (design §10.1). */
  stale?: boolean
  live_revision?: string
}

interface State {
  pending: ContextAttachment[]
}

interface Actions {
  pin: (a: Omit<ContextAttachment, 'id' | 'pinned_at' | 'origin'> & { origin?: 'user' | 'auto' }) => void
  unpin: (id: string) => void
  clear: () => void
  markStale: (id: string, liveRevision: string) => void
  /** Replace pin with a freshly resolved ResourceRef (explicit user refresh). */
  refresh: (id: string, next: Omit<ContextAttachment, 'id' | 'pinned_at' | 'origin' | 'stale' | 'live_revision'> & { origin?: 'user' | 'auto' }) => void
  /** Snapshot + clear for send (freeze into the outgoing turn). */
  takeFrozen: () => ContextAttachment[]
}

function uid(): string {
  return 'att-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
}

export const useContextAttachmentStore = create<State & Actions>()(
  immer((set, get) => ({
    pending: [],

    pin: (a) => set((s) => {
      const dup = s.pending.find(
        (p) => p.resource_id === a.resource_id && p.revision === a.revision
          && JSON.stringify(p.range || {}) === JSON.stringify(a.range || {}),
      )
      if (dup) return
      s.pending.push({
        ...a,
        id: uid(),
        origin: a.origin || 'user',
        pinned_at: new Date().toISOString(),
      })
    }),

    unpin: (id) => set((s) => {
      s.pending = s.pending.filter((p) => p.id !== id)
    }),

    clear: () => set((s) => { s.pending = [] }),

    markStale: (id, liveRevision) => set((s) => {
      const item = s.pending.find((p) => p.id === id)
      if (!item) return
      item.stale = true
      item.live_revision = liveRevision
    }),

    refresh: (id, next) => set((s) => {
      const idx = s.pending.findIndex((p) => p.id === id)
      if (idx < 0) return
      s.pending[idx] = {
        ...next,
        id,
        origin: next.origin || s.pending[idx].origin || 'user',
        pinned_at: new Date().toISOString(),
        stale: false,
        live_revision: undefined,
      }
    }),

    takeFrozen: () => {
      const snap = [...get().pending]
      set((s) => { s.pending = [] })
      return snap
    },
  })),
)

/** Build a freeze block injected into the model-facing messages (QA-16). */
export function formatAttachmentFreeze(atts: ContextAttachment[]): string {
  if (!atts.length) return ''
  const blocks = atts.map((a) => {
    const range = a.range
      ? `range=${JSON.stringify(a.range)}`
      : 'range=null'
    const body = a.excerpt
      ? `${a.excerpt_truncated ? '[excerpt truncated — not full file]\n' : ''}${a.excerpt}`
      : '[no excerpt inlined; use resources/read for ranges]'
    return [
      `### context_attachment`,
      `resource_id: ${a.resource_id}`,
      `workspace_id: ${a.workspace_id}`,
      `title: ${a.title}`,
      `revision: ${a.revision}`,
      `kind: ${a.kind || ''}`,
      `origin: ${a.origin}`,
      range,
      '',
      body,
    ].join('\n')
  })
  return [
    '## Frozen ContextAttachments (user pin; preview alone never adds these)',
    ...blocks,
  ].join('\n\n')
}
