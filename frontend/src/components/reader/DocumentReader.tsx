import { useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { useContextPanelStore } from '@/stores/context-panel-store'
import { ArrowLeft, X, Loader2 } from 'lucide-react'
import { applyResourceOrDocumentView } from './resourcePreview'

/** Read-only DocumentView / ResourceView embed. Never triggers execution. */
export function DocumentReader() {
  const {
    open, width, loading, error, activeTarget, fragmentHtml, completeness, diagnostics,
    close, back, backStack, setLoading, setError, setView, requestGen, rememberScroll, targetKey,
  } = useContextPanelStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const kindBadge = (() => {
    const path =
      activeTarget?.kind === 'file'
        ? activeTarget.path
        : activeTarget?.kind === 'document'
          ? activeTarget.documentId
          : ''
    if (!path) return ''
    const lower = path.toLowerCase()
    if (lower.endsWith('.json')) return 'json'
    if (lower.endsWith('.csv')) return 'csv'
    if (lower.endsWith('.mq.md')) return 'mq'
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md'
    return ''
  })()

  useEffect(() => {
    if (!open || !activeTarget) return
    if (
      activeTarget.kind !== 'document' &&
      activeTarget.kind !== 'citation' &&
      activeTarget.kind !== 'file' &&
      activeTarget.kind !== 'note'
    ) return
    const gen = requestGen
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        if (activeTarget.kind === 'note') {
          // Q-A2: static note body preview — never execute the workbook.
          const run = await api.getRun({ slug: activeTarget.slug })
          if (cancelled) return
          const raw = typeof run.content === 'string' ? run.content : ''
          const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
          const escaped = body
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          setView({
            fragmentHtml: `<article class="mq-resource"><pre class="mq-resource-body">${escaped}</pre></article>`,
            outline: [],
            diagnostics: [],
            completeness: 'complete',
          }, gen)
          setLoading(false)
          return
        }
        if (activeTarget.kind === 'citation') {
          const res = await api.appCitationsResolve({
            workspace_id: activeTarget.workspaceId,
            citation_id: activeTarget.citationId,
            locator: activeTarget.locator,
            revision: activeTarget.revision,
            generation: activeTarget.generation,
            document_id: activeTarget.documentId,
            node_id: activeTarget.nodeId,
          })
          if (cancelled) return
          const data = (res as { data?: { resolution?: string; target?: { document_id?: string; revision?: string; generation?: string; node_id?: string }; document_id?: string; label?: string } }).data
            ?? res
          const resolution = (data as { resolution?: string }).resolution
          if (resolution && resolution !== 'resolved') {
            setError(`引用${resolution === 'stale' ? '已过期' : resolution === 'version_unavailable' ? '版本不可用（历史版本未记录或已回收）' : resolution === 'ambiguous' ? '存在歧义' : '未解析'}`, gen)
            return
          }
          const target = (data as { target?: { document_id?: string; revision?: string; generation?: string; node_id?: string } }).target
          const docId = target?.document_id
            ?? (data as { document_id?: string }).document_id
            ?? activeTarget.documentId
          if (docId) {
            const view = await api.appDocumentsRead({
              workspace_id: activeTarget.workspaceId,
              document: docId,
              revision: target?.revision ?? activeTarget.revision,
              generation: target?.generation ?? activeTarget.generation,
              node_id: target?.node_id ?? activeTarget.nodeId,
            })
            if (cancelled) return
            applyPreview(view, (v) => setView(v, gen), (e) => setError(e, gen))
            return
          }
          setError('引用未能定位到文档', gen)
          return
        }
        // Q-A5: documents_read routes .mq.md → view.document, else → resource.view
        // (json/csv/md/code). Same client API for both.
        const documentId = activeTarget.kind === 'file' ? activeTarget.path : activeTarget.documentId
        const workspaceId = activeTarget.workspaceId
        const revision = activeTarget.kind === 'document' ? activeTarget.revision : undefined
        const generation = activeTarget.kind === 'document' ? activeTarget.generation : undefined
        const nodeId = activeTarget.kind === 'document' ? activeTarget.nodeId : undefined
        const view = await api.appDocumentsRead({
          workspace_id: workspaceId,
          document: documentId,
          revision,
          generation,
          node_id: nodeId,
        })
        if (cancelled) return
        applyPreview(view, (v) => setView(v, gen), (e) => setError(e, gen))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e), gen)
      }
    })()
    return () => { cancelled = true }
  }, [open, activeTarget, requestGen, setLoading, setError, setView])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !activeTarget) return
    const key = targetKey(activeTarget)
    const y = useContextPanelStore.getState().scrollByTarget[key]
    if (typeof y === 'number') el.scrollTop = y
    return () => {
      if (el && key) rememberScroll(key, el.scrollTop)
    }
  }, [activeTarget, targetKey, rememberScroll])

  if (!open) return null

  const title =
    activeTarget && 'title' in activeTarget && activeTarget.title
      ? activeTarget.title
      : activeTarget?.kind === 'document'
        ? activeTarget.documentId
        : activeTarget?.kind === 'file'
          ? activeTarget.path
          : activeTarget?.kind === 'note'
            ? activeTarget.slug
            : '阅读器'

  return (
    <aside
      className="qd-reader flex h-full flex-col border-l border-[var(--qd-border)] bg-[var(--qd-surface)]"
      style={{ width }}
      aria-label="上下文阅读器"
    >
      <header className="flex items-center gap-2 border-b border-[var(--qd-border)] px-3 py-2">
        <button
          type="button"
          className="rounded p-1 hover:bg-black/5 disabled:opacity-40"
          disabled={!backStack.length}
          onClick={back}
          aria-label="返回"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1 truncate text-sm font-medium">{title}</div>
        {kindBadge && (
          <span className="rounded bg-black/5 px-1.5 text-xs uppercase tracking-wide text-[var(--qd-muted)]">
            {kindBadge}
          </span>
        )}
        {completeness === 'partial' && (
          <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">部分</span>
        )}
        <button type="button" className="rounded p-1 hover:bg-black/5" onClick={close} aria-label="关闭">
          <X size={16} />
        </button>
      </header>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-3">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-[var(--qd-muted)]">
            <Loader2 className="animate-spin" size={16} /> 加载中…
          </div>
        )}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}
        {!loading && !error && fragmentHtml && (
          <div
            className="mq-document mq-resource-preview prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: fragmentHtml }}
          />
        )}
        {!loading && !error && !fragmentHtml && (
          <p className="text-sm text-[var(--qd-muted)]">选择一条引用或文档以阅读（只读，不执行）。</p>
        )}
        {!!diagnostics?.length && (
          <details className="mt-4 text-xs text-[var(--qd-muted)]">
            <summary>诊断</summary>
            <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(diagnostics, null, 2)}</pre>
          </details>
        )}
      </div>
    </aside>
  )
}

function applyPreview(
  view: unknown,
  setView: (v: { fragmentHtml?: string; outline?: unknown[]; diagnostics?: unknown[]; completeness?: string }) => void,
  setError: (e: string) => void,
) {
  const result = applyResourceOrDocumentView(view)
  if (!result.ok) {
    setError(result.error)
    return
  }
  setView(result.view)
}
