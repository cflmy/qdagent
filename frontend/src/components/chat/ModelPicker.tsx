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
  credential_configured?: boolean
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
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
  }, [])

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
  const currentUnavailable = current && current.credential_configured === false

  return (
    <div className="relative min-w-[12rem]">
      <button
        type="button"
        disabled={disabled}
        className="flex w-full items-center justify-between gap-2 rounded border border-[var(--qd-border)] bg-[var(--qd-surface)] px-2 py-1.5 text-left text-sm text-[var(--qd-fg,var(--dsw-alias-label-primary,#e8e8e8))]"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">
          {current
            ? `${current.provider_name || current.provider_id} / ${current.display_name}${currentUnavailable ? '（缺凭证）' : ''}`
            : models.length ? '选择模型' : (err || '未配置模型 — 打开设置')}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute bottom-full z-20 mb-1 max-h-64 w-72 overflow-auto rounded border border-[var(--qd-border,#333)] bg-[var(--qd-surface,#1a1a1a)] text-[var(--qd-fg,#e8e8e8)] shadow-lg"
          role="listbox"
          style={{
            background: 'var(--dsw-alias-bg-layer-2, #1e1e1e)',
            color: 'var(--dsw-alias-label-primary, #f3f3f3)',
            borderColor: 'var(--dsw-alias-border-l3, #444)',
          }}
        >
          <input
            className="sticky top-0 w-full border-b px-2 py-1.5 text-sm outline-none"
            style={{
              background: 'var(--dsw-alias-bg-layer-3, #252525)',
              color: 'var(--dsw-alias-label-primary, #f3f3f3)',
              borderColor: 'var(--dsw-alias-border-l3, #444)',
            }}
            placeholder="搜索模型…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {filtered.map((m) => {
            const unavailable = m.credential_configured === false
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={m.id === value}
                disabled={unavailable}
                className="block w-full px-3 py-2 text-left text-sm"
                style={{
                  color: 'var(--dsw-alias-label-primary, #f3f3f3)',
                  background: m.id === value ? 'var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.08))' : 'transparent',
                  opacity: unavailable ? 0.5 : 1,
                  cursor: unavailable ? 'not-allowed' : 'pointer',
                  fontWeight: m.id === value ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!unavailable) e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.08))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = m.id === value
                    ? 'var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.08))'
                    : 'transparent'
                }}
                onClick={() => {
                  if (unavailable) return
                  onChange(m.id)
                  setOpen(false)
                }}
              >
                <div>{m.provider_name || m.provider_id} / {m.display_name}</div>
                <div style={{ fontSize: 12, color: 'var(--dsw-alias-label-tertiary, #999)' }}>
                  {m.upstream_model_id}
                  {unavailable ? ' · 缺凭证，请在设置中配置' : ''}
                </div>
              </button>
            )
          })}
          {!filtered.length && (
            <div className="px-3 py-2 text-sm" style={{ color: 'var(--dsw-alias-label-tertiary, #999)' }}>
              无匹配模型
            </div>
          )}
        </div>
      )}
    </div>
  )
}
