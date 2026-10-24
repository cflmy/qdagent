/** Per-assistant usage footer — unknown must never render as 0. */

export interface UsageInfo {
  provider?: string
  model?: string
  status?: string
  usage_state?: string
  input_tokens?: number | null
  output_tokens?: number | null
  total_tokens?: number | null
  call_count?: number
}

export function UsageFooter({ usage }: { usage?: UsageInfo | null }) {
  if (!usage) return null
  const state = usage.usage_state || 'unknown'
  const label = (() => {
    if (state === 'unknown') return '用量未知'
    if (state === 'zero_calls' || (usage.call_count === 0 && usage.total_tokens === 0)) {
      return '本轮未调用模型 · 0 tokens'
    }
    if (usage.total_tokens == null) return '用量未知'
    return `${usage.total_tokens} tokens`
  })()
  const who = [usage.provider, usage.model].filter(Boolean).join(' / ')
  return (
    <div className="mt-1 text-xs text-[var(--qd-muted)]">
      {who && <span>{who} · </span>}
      <span>{usage.status || '完成'} · </span>
      <span>{label}</span>
    </div>
  )
}
