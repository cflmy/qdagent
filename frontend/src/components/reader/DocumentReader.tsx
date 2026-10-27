import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useContextPanelStore } from '@/stores/context-panel-store'
import { ArrowLeft, X, Loader2 } from 'lucide-react'
import {
  applyResourceOrDocumentView,
  decodeBase64ToBytes,
  type BlobRefPayload,
  type PreviewView,
} from './resourcePreview'
import { PdfPreview } from './PdfPreview'
import { ImagePreview } from './ImagePreview'
import { JsonPreview, type OutlineNode } from './JsonPreview'
import { CodePreview } from './CodePreview'

type BlobState = {
  kind: 'pdf' | 'image'
  bytes: Uint8Array
  mediaType: string
  title?: string
  initialPage?: number
}

type StructuredState =
  | { kind: 'json'; sourceText: string; outline: unknown[]; diagnostics?: unknown[] }
  | {
      kind: 'code'
      sourceText: string
      focusLine?: number
      truncated?: boolean
      path?: string
      workspaceId?: string
      digest?: string
      nextCursor?: string | null
    }

/** Read-only DocumentView / ResourceView embed. Never triggers execution. */
export function DocumentReader() {
  const {
    open, width, loading, error, activeTarget, fragmentHtml, completeness, diagnostics,
    close, back, backStack, setLoading, setError, setView, requestGen, rememberScroll, targetKey,
  } = useContextPanelStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [blob, setBlob] = useState<BlobState | null>(null)
  const [structured, setStructured] = useState<StructuredState | null>(null)
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
    if (lower.endsWith('.pdf')) return 'pdf'
    if (/\.(png|jpe?g|webp|gif)$/.test(lower)) return 'image'
    if (/\.(docx|xlsx|pptx)$/.test(lower)) return 'office'
    if (lower.endsWith('.mq.md')) return 'mq'
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md'
    if (/\.(rs|ts|tsx|js|jsx|py|go|toml|ya?ml|css|html|sh|txt|log)$/.test(lower)) return 'code'
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
    setBlob(null)
    setStructured(null)
    ;(async () => {
      setLoading(true)
      try {
        if (activeTarget.kind === 'note') {
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
          const data = (res as { data?: { resolution?: string; target?: { document_id?: string; revision?: string; generation?: string; node_id?: string }; document_id?: string } }).data
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
            const locator = {
              ...(activeTarget.locator || {}),
              ...(target?.node_id || activeTarget.nodeId
                ? { nodeId: target?.node_id ?? activeTarget.nodeId }
                : {}),
            }
            const view = await api.appResourcesPreview({
              workspace_id: activeTarget.workspaceId,
              document: docId,
              revision: target?.revision ?? activeTarget.revision,
              generation: target?.generation ?? activeTarget.generation,
              node_id: target?.node_id ?? activeTarget.nodeId,
              locator: Object.keys(locator).length ? locator : undefined,
            })
            if (cancelled) return
            await settlePreview({
              view,
              workspaceId: activeTarget.workspaceId,
              fallbackPage: typeof locator.page === 'number' ? locator.page : undefined,
              fallbackLine: typeof locator.line === 'number' ? locator.line : undefined,
              gen,
              cancelled: () => cancelled,
              setView,
              setError,
              setBlob,
              setStructured,
              setLoading,
            })
            return
          }
          setError('引用未能定位到文档', gen)
          return
        }
        // Q-A5: unified resources/preview (documents/read still compatible).
        // .mq.md → DocumentView; json/csv/md/code → ResourceView HTML;
        // pdf/image → blob_ref → PdfPreview / ImagePreview (extract/OCR independent).
        const documentId = activeTarget.kind === 'file' ? activeTarget.path : activeTarget.documentId
        const workspaceId = activeTarget.workspaceId
        const revision = activeTarget.kind === 'document' ? activeTarget.revision : undefined
        const generation = activeTarget.kind === 'document' ? activeTarget.generation : undefined
        const nodeId = activeTarget.kind === 'document' ? activeTarget.nodeId : undefined
        const locator = activeTarget.kind === 'file' || activeTarget.kind === 'document'
          ? activeTarget.locator
          : undefined
        const view = await api.appResourcesPreview({
          workspace_id: workspaceId,
          document: documentId,
          path: documentId,
          revision,
          generation,
          node_id: nodeId,
          locator,
        })
        if (cancelled) return
        await settlePreview({
          view,
          workspaceId,
          fallbackPage: typeof locator?.page === 'number' ? locator.page : undefined,
          fallbackLine: typeof locator?.line === 'number' ? locator.line : undefined,
          gen,
          cancelled: () => cancelled,
          setView,
          setError,
          setBlob,
          setStructured,
          setLoading,
        })
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
        {!loading && !error && blob?.kind === 'pdf' && (
          <PdfPreview
            bytes={blob.bytes}
            title={blob.title || title}
            initialPage={blob.initialPage || 1}
          />
        )}
        {!loading && !error && blob?.kind === 'image' && (
          <ImagePreview
            bytes={blob.bytes}
            mediaType={blob.mediaType}
            title={blob.title || title}
          />
        )}
        {!loading && !error && !blob && structured?.kind === 'json' && (
          <JsonPreview
            outline={(structured.outline || []) as OutlineNode[]}
            sourceText={structured.sourceText}
            title={title}
            diagnostics={structured.diagnostics}
          />
        )}
        {!loading && !error && !blob && structured?.kind === 'code' && (
          <CodePreview
            sourceText={structured.sourceText}
            title={title}
            focusLine={structured.focusLine}
            truncated={structured.truncated}
            onLoadMore={
              structured.path && structured.workspaceId
                ? async () => {
                    const res = await api.appResourcesRead({
                      workspace_id: structured.workspaceId,
                      path: structured.path,
                      digest: structured.digest,
                      cursor: structured.nextCursor || undefined,
                      line_start: structured.nextCursor ? undefined : (structured.sourceText.split('\n').length + 1),
                      max_bytes: 65536,
                    })
                    const envelope = res as { ok?: boolean; data?: Record<string, unknown>; error?: { message?: string } }
                    if (envelope.ok === false) {
                      throw new Error(envelope.error?.message || 'resources/read failed')
                    }
                    const data = (envelope.data ?? res) as Record<string, unknown>
                    const text = String(data.text || '')
                    const next = (data.next_cursor as string | null | undefined) ?? null
                    setStructured({
                      ...structured,
                      nextCursor: next,
                      truncated: !!next,
                    })
                    return { text, nextCursor: next, truncated: !!next }
                  }
                : undefined
            }
          />
        )}
        {!loading && !error && !blob && !structured && fragmentHtml && (
          <div
            className="mq-document mq-resource-preview prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: fragmentHtml }}
          />
        )}
        {!loading && !error && !blob && !structured && !fragmentHtml && (
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

async function settlePreview(opts: {
  view: unknown
  workspaceId: string
  fallbackPage?: number
  fallbackLine?: number
  gen: number
  cancelled: () => boolean
  setView: (v: { fragmentHtml?: string; outline?: unknown[]; diagnostics?: unknown[]; completeness?: string }, gen?: number) => void
  setError: (e: string, gen?: number) => void
  setBlob: (b: BlobState | null) => void
  setStructured: (s: StructuredState | null) => void
  setLoading: (v: boolean) => void
}) {
  const result = applyResourceOrDocumentView(opts.view)
  if (!result.ok) {
    opts.setError(result.error, opts.gen)
    return
  }
  const preview = result.view
  opts.setView({
    fragmentHtml: preview.fragmentHtml || '',
    outline: preview.outline,
    diagnostics: preview.diagnostics,
    completeness: preview.completeness,
  }, opts.gen)

  if (preview.blobRef && preview.visualPreview === 'client') {
    const page = preview.focusLocator?.page ?? opts.fallbackPage
    opts.setStructured(null)
    await loadBlobPreview(preview.blobRef, preview.kind, page, opts)
    return
  }

  opts.setBlob(null)
  const line = preview.focusLocator?.line ?? opts.fallbackLine
  if (preview.kind === 'json' && typeof preview.sourceText === 'string') {
    opts.setStructured({
      kind: 'json',
      sourceText: preview.sourceText,
      outline: preview.outline || [],
      diagnostics: preview.diagnostics,
    })
    opts.setLoading(false)
    return
  }
  if ((preview.kind === 'code' || preview.kind === 'text') && typeof preview.sourceText === 'string') {
    const lineCount = preview.sourceText.replace(/\n$/, '').split('\n').length
    opts.setStructured({
      kind: 'code',
      sourceText: preview.sourceText,
      focusLine: typeof line === 'number' ? line : undefined,
      truncated: preview.completeness === 'partial',
      path: preview.resourceId,
      workspaceId: opts.workspaceId,
      digest: preview.digest,
      nextCursor: preview.completeness === 'partial' ? `line:${lineCount + 1}` : null,
    })
    opts.setLoading(false)
    return
  }
  opts.setStructured(null)
  opts.setLoading(false)
}

async function loadBlobPreview(
  blobRef: BlobRefPayload,
  kind: string | undefined,
  initialPage: number | undefined,
  opts: {
    workspaceId: string
    gen: number
    cancelled: () => boolean
    setError: (e: string, gen?: number) => void
    setBlob: (b: BlobState | null) => void
    setLoading: (v: boolean) => void
  },
) {
  try {
    const res = await api.appResourcesBlob({
      workspace_id: opts.workspaceId,
      path: blobRef.path,
      digest: blobRef.digest,
    })
    if (opts.cancelled()) return
    const envelope = res as { ok?: boolean; data?: Record<string, unknown>; error?: { message?: string } }
    if (envelope.ok === false) {
      opts.setError(envelope.error?.message || 'blob 读取失败', opts.gen)
      return
    }
    const data = (envelope.data ?? res) as Record<string, unknown>
    const b64 = String(data.content_base64 || '')
    if (!b64) {
      opts.setError('blob 响应缺少 content_base64', opts.gen)
      return
    }
    const bytes = decodeBase64ToBytes(b64)
    const mediaType = String(data.media_type || blobRef.media_type || 'application/octet-stream')
    const resolvedKind = (kind === 'pdf' || kind === 'image')
      ? kind
      : mediaType === 'application/pdf'
        ? 'pdf'
        : mediaType.startsWith('image/')
          ? 'image'
          : null
    if (!resolvedKind) {
      opts.setError(`不支持的 blob 类型: ${mediaType}`, opts.gen)
      return
    }
    opts.setBlob({
      kind: resolvedKind,
      bytes,
      mediaType,
      title: blobRef.title,
      initialPage: typeof initialPage === 'number' && initialPage >= 1 ? initialPage : 1,
    })
    opts.setLoading(false)
  } catch (e) {
    if (!opts.cancelled()) {
      opts.setError(e instanceof Error ? e.message : String(e), opts.gen)
    }
  }
}

// Keep PreviewView export reachable for tests / future panel store fields.
export type { PreviewView }
