import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  sourceText: string
  title?: string
  /** 1-based line from resources/preview locator */
  focusLine?: number
  truncated?: boolean
  /** Load next window via resources/read (design §11.1) — not a cut-down substitute. */
  onLoadMore?: () => Promise<{ text: string; nextCursor?: string | null; truncated?: boolean } | null>
}

/** Design CodePreview: line numbers + line focus + range continue (Q-A5). Never executes. */
export function CodePreview({ sourceText, title, focusLine, truncated, onLoadMore }: Props) {
  const [extra, setExtra] = useState('')
  const [moreTruncated, setMoreTruncated] = useState(!!truncated)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const combined = sourceText + (extra ? (sourceText.endsWith('\n') ? '' : '\n') + extra : '')
  const lines = useMemo(() => combined.replace(/\n$/, '').split('\n'), [combined])
  const focusRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    setExtra('')
    setMoreTruncated(!!truncated)
    setLoadError('')
  }, [sourceText, truncated])

  useEffect(() => {
    if (focusLine && focusRef.current) {
      focusRef.current.scrollIntoView({ block: 'center' })
    }
  }, [focusLine, lines.length])

  const loadMore = async () => {
    if (!onLoadMore || loadingMore) return
    setLoadingMore(true)
    setLoadError('')
    try {
      const chunk = await onLoadMore()
      if (!chunk) {
        setMoreTruncated(false)
        return
      }
      setExtra((prev) => prev + chunk.text)
      setMoreTruncated(!!chunk.truncated && !!chunk.nextCursor)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="mq-code-preview flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--qd-muted)]">
        <span className="font-medium text-[var(--qd-text)]">{title || '代码'}</span>
        <span>{lines.length} 行</span>
        {focusLine ? <span>定位 L{focusLine}</span> : null}
      </div>
      {moreTruncated && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          <span>预览窗口未覆盖全文；继续用 resources/read 按行扩展（非降级替代）。</span>
          {onLoadMore && (
            <button
              type="button"
              className="rounded border border-amber-300 bg-white px-2 py-0.5 disabled:opacity-50"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? '加载中…' : '继续读取'}
            </button>
          )}
        </div>
      )}
      {loadError && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800" role="alert">
          {loadError}
        </div>
      )}
      <pre className="overflow-auto rounded border border-[var(--qd-border)] bg-[var(--qd-surface)] p-0 text-xs leading-5">
        <code className="block min-w-full">
          {lines.map((line, i) => {
            const n = i + 1
            const focused = focusLine === n
            return (
              <span
                key={n}
                ref={focused ? focusRef : undefined}
                className={`flex ${focused ? 'bg-amber-100/80' : ''}`}
              >
                <span className="sticky left-0 w-10 shrink-0 select-none border-r border-[var(--qd-border)] bg-[var(--qd-surface)] px-2 text-right text-[var(--qd-muted)]">
                  {n}
                </span>
                <span className="whitespace-pre px-2">{line.length ? line : ' '}</span>
              </span>
            )
          })}
        </code>
      </pre>
    </div>
  )
}
