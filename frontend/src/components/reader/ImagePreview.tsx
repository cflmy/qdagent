import { useEffect, useMemo, useState } from 'react'

type Props = {
  bytes: Uint8Array
  mediaType: string
  title?: string
  extractUnavailable?: boolean
}

export function ImagePreview({ bytes, mediaType, title, extractUnavailable = true }: Props) {
  const [scale, setScale] = useState(1)
  const url = useMemo(() => {
    const copy = new Uint8Array(bytes)
    const blob = new Blob([copy], { type: mediaType || 'application/octet-stream' })
    return URL.createObjectURL(blob)
  }, [bytes, mediaType])

  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return (
    <div className="mq-image-preview flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--qd-muted)]">
        <span className="truncate font-medium text-[var(--qd-text)]">{title || '图片'}</span>
        <button
          type="button"
          className="rounded border border-[var(--qd-border)] px-2 py-0.5"
          onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.2).toFixed(2))))}
        >
          −
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button
          type="button"
          className="rounded border border-[var(--qd-border)] px-2 py-0.5"
          onClick={() => setScale((s) => Math.min(3, Number((s + 0.2).toFixed(2))))}
        >
          +
        </button>
      </div>
      {extractUnavailable && (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          图片可预览；vision / OCR 提取未宣称可用。
        </p>
      )}
      <div className="overflow-auto rounded border border-[var(--qd-border)] bg-[var(--qd-surface)] p-2">
        <img
          src={url}
          alt={title || 'workspace image'}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          className="max-w-full"
        />
      </div>
    </div>
  )
}
