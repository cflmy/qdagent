import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type ReaderTarget =
  | { kind: 'document'; workspaceId: string; documentId: string; revision?: string; generation?: string; nodeId?: string; title?: string }
  | { kind: 'citation'; workspaceId: string; citationId: string; messageId?: string; locator?: Record<string, unknown>; revision?: string; generation?: string; documentId?: string; nodeId?: string }
  | { kind: 'profile_item'; id: string; title?: string }
  | { kind: 'file'; workspaceId: string; path: string; title?: string }

interface ContextPanelState {
  open: boolean
  width: number
  loading: boolean
  error: string
  activeTarget: ReaderTarget | null
  /** Monotonic generation — late responses must not overwrite newer targets. */
  requestGen: number
  backStack: ReaderTarget[]
  forwardStack: ReaderTarget[]
  scrollByTarget: Record<string, number>
  fragmentHtml: string
  outline: unknown[]
  diagnostics: unknown[]
  completeness: string
}

interface ContextPanelActions {
  openTarget: (t: ReaderTarget) => number
  close: () => void
  back: () => void
  forward: () => void
  setWidth: (w: number) => void
  setLoading: (v: boolean) => void
  setError: (e: string, gen?: number) => void
  setView: (v: { fragmentHtml?: string; outline?: unknown[]; diagnostics?: unknown[]; completeness?: string }, gen?: number) => void
  rememberScroll: (key: string, y: number) => void
  targetKey: (t: ReaderTarget | null) => string
}

const WIDTH_DEFAULT = 440

function keyOf(t: ReaderTarget | null): string {
  if (!t) return ''
  if (t.kind === 'document') return `doc:${t.workspaceId}:${t.documentId}:${t.revision || ''}:${t.generation || ''}:${t.nodeId || ''}`
  if (t.kind === 'citation') return `cite:${t.workspaceId}:${t.citationId}:${t.revision || ''}:${t.generation || ''}`
  if (t.kind === 'file') return `file:${t.workspaceId}:${t.path}`
  return `profile:${t.id}`
}

export const useContextPanelStore = create<ContextPanelState & ContextPanelActions>()(
  immer((set, get) => ({
    open: false,
    width: WIDTH_DEFAULT,
    loading: false,
    error: '',
    activeTarget: null,
    requestGen: 0,
    backStack: [],
    forwardStack: [],
    scrollByTarget: {},
    fragmentHtml: '',
    outline: [],
    diagnostics: [],
    completeness: '',

    targetKey: (t) => keyOf(t),

    openTarget: (t) => {
      let gen = 0
      set((s) => {
        if (s.activeTarget) {
          s.backStack.push(s.activeTarget)
        }
        s.forwardStack = []
        s.activeTarget = t
        s.open = true
        s.error = ''
        s.fragmentHtml = ''
        s.outline = []
        s.diagnostics = []
        s.completeness = ''
        s.requestGen += 1
        gen = s.requestGen
      })
      return gen
    },

    close: () => set((s) => { s.open = false }),

    back: () => {
      const { backStack, activeTarget } = get()
      if (!backStack.length) return
      set((s) => {
        const prev = s.backStack.pop()!
        if (activeTarget) s.forwardStack.push(activeTarget)
        s.activeTarget = prev
        s.fragmentHtml = ''
        s.error = ''
        s.requestGen += 1
      })
    },

    forward: () => {
      const { forwardStack, activeTarget } = get()
      if (!forwardStack.length) return
      set((s) => {
        const next = s.forwardStack.pop()!
        if (activeTarget) s.backStack.push(activeTarget)
        s.activeTarget = next
        s.fragmentHtml = ''
        s.error = ''
        s.requestGen += 1
      })
    },

    setWidth: (w) => set((s) => { s.width = Math.min(720, Math.max(360, w)) }),
    setLoading: (v) => set((s) => { s.loading = v }),
    setError: (e, gen) => set((s) => {
      if (gen !== undefined && gen !== s.requestGen) return
      s.error = e
      s.loading = false
    }),
    setView: (v, gen) => set((s) => {
      if (gen !== undefined && gen !== s.requestGen) return
      if (v.fragmentHtml !== undefined) s.fragmentHtml = v.fragmentHtml
      if (v.outline) s.outline = v.outline
      if (v.diagnostics) s.diagnostics = v.diagnostics
      if (v.completeness) s.completeness = v.completeness
      s.loading = false
    }),
    rememberScroll: (key, y) => set((s) => {
      if (key) s.scrollByTarget[key] = y
    }),
  })),
)
