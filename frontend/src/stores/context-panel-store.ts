import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type ReaderTarget =
  | { kind: 'document'; workspaceId: string; documentId: string; revision?: string; nodeId?: string; title?: string }
  | { kind: 'citation'; workspaceId: string; citationId: string; messageId?: string; locator?: Record<string, unknown> }
  | { kind: 'profile_item'; id: string; title?: string }
  | { kind: 'file'; workspaceId: string; path: string; title?: string }

interface ContextPanelState {
  open: boolean
  width: number
  loading: boolean
  error: string
  activeTarget: ReaderTarget | null
  backStack: ReaderTarget[]
  forwardStack: ReaderTarget[]
  fragmentHtml: string
  outline: unknown[]
  diagnostics: unknown[]
  completeness: string
}

interface ContextPanelActions {
  openTarget: (t: ReaderTarget) => void
  close: () => void
  back: () => void
  setWidth: (w: number) => void
  setLoading: (v: boolean) => void
  setError: (e: string) => void
  setView: (v: { fragmentHtml?: string; outline?: unknown[]; diagnostics?: unknown[]; completeness?: string }) => void
}

const WIDTH_DEFAULT = 440

export const useContextPanelStore = create<ContextPanelState & ContextPanelActions>()(
  immer((set, get) => ({
    open: false,
    width: WIDTH_DEFAULT,
    loading: false,
    error: '',
    activeTarget: null,
    backStack: [],
    forwardStack: [],
    fragmentHtml: '',
    outline: [],
    diagnostics: [],
    completeness: '',

    openTarget: (t) => {
      set((s) => {
        if (s.activeTarget) s.backStack.push(s.activeTarget)
        s.forwardStack = []
        s.activeTarget = t
        s.open = true
        s.error = ''
        s.fragmentHtml = ''
        s.outline = []
        s.diagnostics = []
        s.completeness = ''
      })
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
      })
    },

    setWidth: (w) => set((s) => { s.width = Math.min(720, Math.max(360, w)) }),
    setLoading: (v) => set((s) => { s.loading = v }),
    setError: (e) => set((s) => { s.error = e; s.loading = false }),
    setView: (v) => set((s) => {
      if (v.fragmentHtml !== undefined) s.fragmentHtml = v.fragmentHtml
      if (v.outline) s.outline = v.outline
      if (v.diagnostics) s.diagnostics = v.diagnostics
      if (v.completeness) s.completeness = v.completeness
      s.loading = false
    }),
  })),
)
