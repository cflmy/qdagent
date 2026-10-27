import { useMemo, useState } from 'react'

type Props = {
  sourceText: string
  title?: string
  /** Restricted live preview is a separate capability; default false = source only. */
  restrictedPreviewAvailable?: boolean
}

/**
 * Design HTML/SVG preview: default safe source; live preview only when an
 * explicit restricted capability is available (never silent iframe of untrusted HTML).
 */
export function HtmlPreview({
  sourceText,
  title,
  restrictedPreviewAvailable = false,
}: Props) {
  const [mode, setMode] = useState<'source' | 'preview'>('source')
  const isSvg = useMemo(
    () => /\.svg$/i.test(title || '') || /^\s*<svg[\s>]/i.test(sourceText),
    [title, sourceText],
  )

  return (
    <div className="mq-html-preview flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-[var(--qd-text)]">{title || (isSvg ? 'SVG' : 'HTML')}</span>
        <button
          type="button"
          className={`rounded border px-2 py-0.5 ${mode === 'source' ? 'border-[var(--qd-accent)]' : 'border-[var(--qd-border)]'}`}
          onClick={() => setMode('source')}
        >
          安全源码
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-0.5 ${mode === 'preview' ? 'border-[var(--qd-accent)]' : 'border-[var(--qd-border)]'}`}
          onClick={() => setMode('preview')}
          disabled={!restrictedPreviewAvailable}
          title={
            restrictedPreviewAvailable
              ? '受限预览'
              : '受限预览未开放：不把未清洗 HTML 注入主应用'
          }
        >
          受限预览
        </button>
      </div>
      {!restrictedPreviewAvailable && (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          默认只显示源码。受限 DOM 预览是独立能力；未开放时不假装已安全渲染，也不插入任意 iframe。
        </p>
      )}
      {mode === 'source' || !restrictedPreviewAvailable ? (
        <pre className="overflow-auto rounded border border-[var(--qd-border)] bg-[var(--qd-surface)] p-2 text-xs leading-5">
          {sourceText}
        </pre>
      ) : (
        <p className="text-sm text-[var(--qd-muted)]">
          受限预览通道已声明可用，但本构建尚未接线沙箱渲染器——仍显示源码，避免静默降级为危险 HTML。
        </p>
      )}
    </div>
  )
}
