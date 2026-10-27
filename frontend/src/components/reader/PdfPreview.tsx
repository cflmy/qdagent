import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

/** Locked visual renderer for Q-A5 / QA-10 — page render ≠ text extract / OCR. */
GlobalWorkerOptions.workerSrc = pdfWorker

type Props = {
  bytes: Uint8Array
  title?: string
  /** 1-based page from resources/preview locator — visual only, not extract. */
  initialPage?: number
  extractUnavailable?: boolean
}

export function PdfPreview({ bytes, title, initialPage = 1, extractUnavailable = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [page, setPage] = useState(Math.max(1, initialPage || 1))
  const [pageCount, setPageCount] = useState(0)
  const [scale, setScale] = useState(1.1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const docRef = useRef<PDFDocumentProxy | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    ;(async () => {
      try {
        const task = getDocument({ data: bytes.slice() })
        const pdf = await task.promise
        if (cancelled) {
          await pdf.destroy()
          return
        }
        docRef.current = pdf
        setPageCount(pdf.numPages)
        const want = Math.max(1, initialPage || 1)
        setPage(Math.min(want, pdf.numPages || want))
        setLoading(false)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
      const d = docRef.current
      docRef.current = null
      void d?.destroy()
    }
  }, [bytes, initialPage])

  useEffect(() => {
    const pdf = docRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas || page < 1) return
    let cancelled = false
    ;(async () => {
      try {
        const pg = await pdf.getPage(page)
        if (cancelled) return
        const viewport = pg.getViewport({ scale })
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        await pg.render({ canvasContext: ctx, viewport }).promise
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [page, scale, pageCount])

  return (
    <div className="mq-pdf-preview flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--qd-muted)]">
        <span className="truncate font-medium text-[var(--qd-text)]">{title || 'PDF'}</span>
        <button
          type="button"
          className="rounded border border-[var(--qd-border)] px-2 py-0.5 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          上一页
        </button>
        <span>
          {pageCount ? `${page} / ${pageCount}` : '—'}
        </span>
        <button
          type="button"
          className="rounded border border-[var(--qd-border)] px-2 py-0.5 disabled:opacity-40"
          disabled={!pageCount || page >= pageCount}
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
        >
          下一页
        </button>
        <button
          type="button"
          className="rounded border border-[var(--qd-border)] px-2 py-0.5"
          onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
        >
          −
        </button>
        <button
          type="button"
          className="rounded border border-[var(--qd-border)] px-2 py-0.5"
          onClick={() => setScale((s) => Math.min(2.4, Number((s + 0.15).toFixed(2))))}
        >
          +
        </button>
      </div>
      {extractUnavailable && (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          视觉预览可用；文本提取与 OCR 不可用——看到页面不代表 Agent 已读出正文（QA-10）。
        </p>
      )}
      {loading && <p className="text-sm text-[var(--qd-muted)]">正在渲染 PDF…</p>}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}
      <div className="overflow-auto rounded border border-[var(--qd-border)] bg-white">
        <canvas ref={canvasRef} className="mx-auto block max-w-full" />
      </div>
    </div>
  )
}
