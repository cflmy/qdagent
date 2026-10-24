import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { ChevronDown } from 'lucide-react'

export interface ModelOption {
  id: string
  provider_id: string
  provider_name?: string
  display_name: string
  upstream_model_id: string
  adapter?: string
}

interface Props {
  value: string
  onChange: (modelId: string) => void
  disabled?: boolean
}

export function ModelPicker({ value, onChange, disabled }: Props) {
  const [models, setModels] = useState<ModelOption[]>([])
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    api.appModels()
      .then((res) => {
        const data = (res as { models?: ModelOption[]; data?: ModelOption[] }).models
          ?? (res as { data?: ModelOption[] }).data
          ?? (Array.isArray(res) ? res : [])
        setModels(data as ModelOption[])
        if (!value && data.length) onChange((data[0] as ModelOption).id)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return models
    return models.filter((m) =>
      [m.display_name, m.upstream_model_id, m.provider_name, m.provider_id]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(s)),
    )
  }, [models, q])

  const current = models.find((m) => m.id === value)

  return (
    <div className="relative min-w-[12rem]">
      <button
        type="button"
        disabled={disabled}
        className="flex w-full items-center justify-between gap-2 rounded border border-[var(--qd-border)] bg-[var(--qd-surface)] px-2 py-1.5 text-left text-sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">
          {current
            ? `${current.provider_name || current.provider_id} / ${current.display_name}`
            : models.length ? '选择模型' : (err || '未配置模型')}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute bottom-full z-20 mb-1 max-h-64 w-72 overflow-auto rounded border border-[var(--qd-border)] bg-white shadow-lg"
          role="listbox"
        >
          <input
            className="sticky top-0 w-full border-b border-[var(--qd-border)] px-2 py-1.5 text-sm outline-none"
            placeholder="搜索模型…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={m.id === value}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-black/5 ${m.id === value ? 'bg-black/5 font-medium' : ''}`}
              onClick={() => { onChange(m.id); setOpen(false) }}
            >
              <div>{m.provider_name || m.provider_id} / {m.display_name}</div>
              <div className="text-xs text-[var(--qd-muted)]">{m.upstream_model_id}</div>
            </button>
          ))}
          {!filtered.length && (
            <div className="px-3 py-2 text-sm text-[var(--qd-muted)]">无匹配模型</div>
          )}
        </div>
      )}
    </div>
  )
}
