import { useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { useContextPanelStore } from '@/stores/context-panel-store'
import { ArrowLeft, X, Loader2 } from 'lucide-react'

/** Read-only Marqdo DocumentView embed. Never triggers execution. */
export function DocumentReader() {
  const {
    open, width, loading, error, activeTarget, fragmentHtml, completeness, diagnostics,
    close, back, backStack, setLoading, setError, setView, requestGen, rememberScroll, targetKey,
  } = useContextPanelStore()
  const scrollRef = useRef<HTMLDivElement>(null)

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
            applyView(view, (v) => setView(v, gen), (e) => setError(e, gen))
            return
          }
          setError('引用未能定位到文档', gen)
          return
        }
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
        applyView(view, (v) => setView(v, gen), (e) => setError(e, gen))
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
            className="mq-document prose prose-sm max-w-none"
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

function applyView(
  view: unknown,
  setView: (v: { fragmentHtml?: string; outline?: unknown[]; diagnostics?: unknown[]; completeness?: string }) => void,
  setError: (e: string) => void,
) {
  const envelope = view as { ok?: boolean; data?: Record<string, unknown>; error?: { message?: string } }
  const data = (envelope?.data ?? view) as Record<string, unknown>
  if (envelope?.ok === false) {
    setError(envelope.error?.message || '读取失败')
    return
  }
  const capability = data.capability as string | undefined
  if (capability === 'unavailable' || data.honest_reason) {
    const text = String(data.text || '')
    const reason = String(data.honest_reason || 'view.document_bridge_missing')
    setView({
      fragmentHtml: text
        ? `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(text)}</pre>`
        : '',
      outline: [],
      diagnostics: [reason, 'capability unavailable — 静态只读，未执行'],
      completeness: 'partial',
    })
    return
  }
  const render = data.render as { fragment?: string; format?: string } | undefined
  const caps = data.capabilities as { 'view.document'?: boolean } | undefined
  if (caps && caps['view.document'] === false) {
    setError('Marqdo view.document 不可用：请升级匹配的 CLI/ext/native 插件')
    return
  }
  // Q-R4 / R13: trust render.format — never guess HTML from '<' in plain text.
  const format = String(render?.format || data.format || '').toLowerCase()
  const raw = String(data.html_fragment || render?.fragment || data.text || '')
  let fragmentHtml = ''
  if (raw) {
    if (format === 'plain' || format === 'plain_text' || format === 'text') {
      fragmentHtml = `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(raw)}</pre>`
    } else if (format === 'html' || format === 'sanitized_html' || format.includes('html')) {
      fragmentHtml = sanitizeHtmlFragment(raw)
    } else if (data.html_fragment || (render?.fragment && format)) {
      fragmentHtml = sanitizeHtmlFragment(raw)
    } else {
      fragmentHtml = `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(raw)}</pre>`
    }
  }
  setView({
    fragmentHtml,
    outline: (data.outline as unknown[]) || [],
    diagnostics: (data.diagnostics as unknown[]) || [],
    completeness: String(data.completeness || ''),
  })
}

/** Minimal HTML allowlist — strip script/event handlers/dangerous URLs (R13). */
function sanitizeHtmlFragment(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, '$1="#"')
    .replace(/<(iframe|object|embed|svg)\b[\s\S]*?>[\s\S]*?<\/\1>/gi, '')
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
