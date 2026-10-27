import { useMemo, useState } from 'react'

type Props = {
  sourceText: string
  title?: string
  truncated?: boolean
  diagnostics?: unknown[]
  /** 1-based data row (header is line 1). */
  onRangeChange?: (range: { line: number; line_end?: number } | null) => void
}

/** Minimal CSV splitter (preview only; no quoted-newline). */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

/** Design TablePreview: virtual-ish table, column names, row select (Q-A5). Never executes. */
export function TablePreview({
  sourceText,
  title,
  truncated,
  diagnostics,
  onRangeChange,
}: Props) {
  const { headers, rows } = useMemo(() => {
    const lines = sourceText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
      .filter((l, i, arr) => !(i === arr.length - 1 && l === ''))
    if (!lines.length) return { headers: [] as string[], rows: [] as string[][] }
    const headers = splitCsvLine(lines[0]).map((h) => h || '(空列)')
    const rows = lines.slice(1).map(splitCsvLine)
    return { headers, rows }
  }, [sourceText])

  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const rowLimitNote = useMemo(
    () => (diagnostics || []).some((d) => {
      const code = typeof d === 'object' && d && 'code' in d ? String((d as { code?: string }).code) : ''
      return code === 'csv.row_limit' || code === 'truncated'
    }),
    [diagnostics],
  )

  const toggleRow = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      const sorted = [...next].sort((a, b) => a - b)
      if (!sorted.length) {
        onRangeChange?.(null)
      } else {
        // CSV line numbers: header=1, first data row=2
        const line = sorted[0] + 2
        const line_end = sorted[sorted.length - 1] + 2
        onRangeChange?.(line === line_end ? { line } : { line, line_end })
      }
      return next
    })
  }

  const download = () => {
    const blob = new Blob([sourceText], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (title || 'preview') + (title?.endsWith('.csv') ? '' : '.csv')
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mq-table-preview flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-[var(--qd-text)]">{title || 'CSV'}</span>
        <span className="text-[var(--qd-muted)]">
          {headers.length} 列 · {rows.length} 行
          {(truncated || rowLimitNote) ? '（有界预览）' : ''}
        </span>
        <button
          type="button"
          className="rounded border border-[var(--qd-border)] px-2 py-0.5"
          onClick={download}
        >
          下载预览片段
        </button>
        {selected.size > 0 && (
          <span className="text-[var(--qd-muted)]">已选 {selected.size} 行</span>
        )}
      </div>
      {(truncated || rowLimitNote) && (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          仅显示有界行数；完整文件请用 resources/read 分页，不假装已读全部。
        </p>
      )}
      {!headers.length ? (
        <p className="text-sm text-[var(--qd-muted)]">无表格数据。</p>
      ) : (
        <div className="overflow-auto rounded border border-[var(--qd-border)]">
          <table className="mq-csv-interactive w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[var(--qd-surface)]">
                <th className="sticky left-0 w-8 border-b border-[var(--qd-border)] px-1 py-1 font-normal text-[var(--qd-muted)]">#</th>
                {headers.map((h, i) => (
                  <th
                    key={`h-${i}`}
                    className="border-b border-[var(--qd-border)] px-2 py-1 font-medium text-[var(--qd-text)]"
                    title={h}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((cells, ri) => {
                const on = selected.has(ri)
                return (
                  <tr
                    key={`r-${ri}`}
                    className={on ? 'bg-[color-mix(in_srgb,var(--qd-accent)_12%,transparent)]' : undefined}
                    onClick={() => toggleRow(ri)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="sticky left-0 border-b border-[var(--qd-border)] px-1 py-1 text-[var(--qd-muted)]">
                      {ri + 1}
                    </td>
                    {headers.map((_, ci) => (
                      <td
                        key={`c-${ri}-${ci}`}
                        className="max-w-[16rem] truncate border-b border-[var(--qd-border)] px-2 py-1 font-mono text-[var(--qd-text)]"
                        title={cells[ci] ?? ''}
                      >
                        {cells[ci] ?? ''}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
