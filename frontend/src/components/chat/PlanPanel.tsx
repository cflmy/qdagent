import { useState } from 'react'
import { planFromProcess, planStatusLabel, type PlanItem } from '@/lib/planFromProcess'
import type { ProcessStep } from '@/stores/session-store'
import type { UsageInfo } from '@/components/chat/UsageFooter'

type Props = {
  process?: ProcessStep[]
  usage?: UsageInfo | null
  streaming?: boolean
}

/** Collapsible multi-step plan from real events only (Q-A6 / design §10.3). */
export function PlanPanel({ process, usage, streaming }: Props) {
  const items = planFromProcess(process)
  const [open, setOpen] = useState(true)
  if (items.length < 2 && !streaming) {
    // Only show for multi-step (or live streaming with ≥1 step).
    if (items.length === 0) return null
  }
  if (items.length === 0) return null

  const budget =
    usage && (usage.total_tokens != null || usage.usage_state)
      ? `用量 ${usage.usage_state || 'unknown'}${
          usage.total_tokens != null ? ` · ${usage.total_tokens} tokens` : ''
        }`
      : null

  return (
    <div
      style={{
        marginBottom: 12,
        border: '0.5px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.08))',
        borderRadius: 8,
        padding: '8px 12px',
        background: 'var(--dsw-alias-bg-layer-1, rgba(0,0,0,0.02))',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--dsw-alias-label-primary)',
        }}
      >
        <span>计划（{items.length}）{streaming ? ' · 进行中' : ''}</span>
        <span style={{ fontWeight: 400, color: 'var(--dsw-alias-label-secondary)' }}>
          {open ? '收起' : '展开'}
        </span>
      </button>
      {budget && (
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--dsw-alias-label-secondary)' }}>
          {budget}
          <span style={{ opacity: 0.75 }}> — 计划更新不是执行完成证据</span>
        </div>
      )}
      {open && (
        <ol style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, lineHeight: '18px' }}>
          {items.map((it) => (
            <PlanRow key={it.id} item={it} />
          ))}
        </ol>
      )}
    </div>
  )
}

function PlanRow({ item }: { item: PlanItem }) {
  const color =
    item.status === 'done'
      ? 'var(--dsw-alias-label-secondary)'
      : item.status === 'blocked'
        ? '#b45309'
        : 'var(--dsw-alias-label-primary)'
  return (
    <li style={{ marginBottom: 4, color }}>
      <span style={{ fontWeight: 500 }}>{item.title}</span>
      <span style={{ opacity: 0.75 }}> · {planStatusLabel(item.status)}</span>
      {item.detail ? (
        <div style={{ opacity: 0.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {item.detail.slice(0, 160)}
          {item.detail.length > 160 ? '…' : ''}
        </div>
      ) : null}
    </li>
  )
}
