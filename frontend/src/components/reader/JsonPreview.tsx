import { useMemo, useState } from 'react'

export type OutlineNode = {
  id?: string
  label?: string
  kind?: string
  locator?: { path?: string }
  children?: OutlineNode[]
}

type Props = {
  outline: OutlineNode[]
  sourceText: string
  title?: string
  diagnostics?: unknown[]
}

/** Design JsonPreview: fold tree + source toggle (Q-A5). Never executes. */
export function JsonPreview({ outline, sourceText, title, diagnostics }: Props) {
  const [mode, setMode] = useState<'tree' | 'source'>('tree')
  const [copied, setCopied] = useState('')
  const parseError = useMemo(
    () => (diagnostics || []).some((d) => {
      const code = typeof d === 'object' && d && 'code' in d ? String((d as { code?: string }).code) : ''
      return code === 'json.parse_error'
    }),
    [diagnostics],
  )

  const copyPath = async (path?: string) => {
    if (!path) return
    try {
      await navigator.clipboard.writeText(path)
      setCopied(path)
      setTimeout(() => setCopied(''), 1200)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mq-json-preview flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-[var(--qd-text)]">{title || 'JSON'}</span>
        <button
          type="button"
          className={`rounded border px-2 py-0.5 ${mode === 'tree' ? 'border-[var(--qd-accent)]' : 'border-[var(--qd-border)]'}`}
          onClick={() => setMode('tree')}
        >
          折叠树
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-0.5 ${mode === 'source' ? 'border-[var(--qd-accent)]' : 'border-[var(--qd-border)]'}`}
          onClick={() => setMode('source')}
        >
          源码
        </button>
        {copied && <span className="text-[var(--qd-muted)]">已复制 {copied}</span>}
      </div>
      {parseError && (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          JSON 解析有误；仍可查看源码，不假装结构完整。
        </p>
      )}
      {mode === 'tree' ? (
        outline.length ? (
          <ul className="mq-json-tree m-0 list-none space-y-0.5 p-0 text-sm font-mono">
            {outline.map((n, i) => (
              <JsonNode key={n.id || n.label || `n-${i}`} node={n} depth={0} onCopy={copyPath} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--qd-muted)]">无 outline；切换到源码查看原文。</p>
        )
      ) : (
        <pre className="overflow-auto rounded border border-[var(--qd-border)] bg-[var(--qd-surface)] p-2 text-xs leading-5">
          {sourceText}
        </pre>
      )}
    </div>
  )
}

function JsonNode({
  node,
  depth,
  onCopy,
}: {
  node: OutlineNode
  depth: number
  onCopy: (path?: string) => void
}) {
  const kids = node.children || []
  const [open, setOpen] = useState(depth < 1)
  const path = node.locator?.path
  return (
    <li style={{ paddingLeft: depth * 12 }}>
      <div className="flex items-start gap-1">
        {kids.length > 0 ? (
          <button
            type="button"
            className="mt-0.5 w-4 shrink-0 text-[var(--qd-muted)]"
            aria-label={open ? '折叠' : '展开'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="inline-block w-4 shrink-0" />
        )}
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left hover:underline"
          title={path || node.label}
          onClick={() => onCopy(path)}
        >
          {node.label || node.id || path || '(node)'}
        </button>
      </div>
      {open && kids.length > 0 && (
        <ul className="m-0 list-none p-0">
          {kids.map((c, i) => (
            <JsonNode key={c.id || c.label || `c-${depth}-${i}`} node={c} depth={depth + 1} onCopy={onCopy} />
          ))}
        </ul>
      )}
    </li>
  )
}
