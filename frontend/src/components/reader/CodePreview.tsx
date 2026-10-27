import { useEffect, useMemo, useRef } from 'react'

type Props = {
  sourceText: string
  title?: string
  /** 1-based line from resources/preview locator */
  focusLine?: number
  truncated?: boolean
}

/** Design CodePreview: line numbers + line focus (Q-A5). Never executes. */
export function CodePreview({ sourceText, title, focusLine, truncated }: Props) {
  const lines = useMemo(() => sourceText.replace(/\n$/, '').split('\n'), [sourceText])
  const focusRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (focusLine && focusRef.current) {
      focusRef.current.scrollIntoView({ block: 'center' })
    }
  }, [focusLine, lines.length])

  return (
    <div className="mq-code-preview flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--qd-muted)]">
        <span className="font-medium text-[var(--qd-text)]">{title || '代码'}</span>
        <span>{lines.length} 行</span>
        {focusLine ? <span>定位 L{focusLine}</span> : null}
      </div>
      {truncated && (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          预览已截断；完整文件请下载或提高读取范围（resources/read）。
        </p>
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
