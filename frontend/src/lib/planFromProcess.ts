import type { ProcessStep } from '@/stores/session-store'

/** Plan row derived only from durable/stream process events (design §10.3). */
export type PlanItemStatus = 'pending' | 'running' | 'done' | 'blocked'

export type PlanItem = {
  id: string
  title: string
  status: PlanItemStatus
  detail?: string
}

/**
 * Build a collapsible plan from real process steps.
 * Never invents milestones — empty process → empty plan (hide panel).
 */
export function planFromProcess(steps: ProcessStep[] | undefined | null): PlanItem[] {
  if (!steps?.length) return []
  const items: PlanItem[] = []
  const byTitle = new Map<string, PlanItem>()

  const upsert = (title: string, status: PlanItemStatus, detail?: string, id?: string) => {
    const key = title.trim() || '步骤'
    const existing = byTitle.get(key)
    if (existing) {
      // Monotonic: pending→running→done; blocked sticks until done.
      const order = { pending: 0, running: 1, blocked: 1, done: 2 }
      if (order[status] >= order[existing.status] || status === 'blocked') {
        existing.status = status
      }
      if (detail) existing.detail = detail
      return existing
    }
    const item: PlanItem = {
      id: id || `plan-${items.length + 1}`,
      title: key,
      status,
      detail,
    }
    byTitle.set(key, item)
    items.push(item)
    return item
  }

  for (const step of steps) {
    const kind = step.kind || ''
    const label = (step.label || kind || '步骤').trim()
    if (kind === 'plan' || kind === 'plan_act') {
      // Plan text may list lines; keep one row per emission, running until later done signals.
      const title = step.detail?.split('\n').find((l) => l.trim())?.trim() || label
      upsert(title.slice(0, 80), 'running', step.detail, step.id)
      continue
    }
    if (kind === 'preflight') {
      upsert('工程预检', 'done', step.detail, step.id)
      continue
    }
    if (kind === 'tool_start') {
      const title = label.replace(/^调用工具\s*/, '工具 ') || label
      upsert(title, 'running', step.detail, step.id)
      continue
    }
    if (kind === 'tool_end') {
      const blocked = /fail|error|denied|blocked/i.test(step.detail || '')
      const title = label.replace(/^工具结束\s*/, '工具 ') || label
      upsert(title, blocked ? 'blocked' : 'done', step.detail, step.id)
      continue
    }
    if (kind === 'progress') {
      upsert(label, 'running', step.detail, step.id)
      continue
    }
    if (kind === 'completed' || kind === 'done') {
      // Close any still-running items as done when turn completes.
      for (const it of items) {
        if (it.status === 'running' || it.status === 'pending') it.status = 'done'
      }
      continue
    }
    if (kind === 'diagnostic') {
      // Do not create fake milestones from diagnostics.
      continue
    }
    if (kind === 'model' || kind === 'run' || kind === 'turn') {
      continue
    }
    // Other real steps become visible milestones (decision/round/await…).
    if (label) {
      const runningish = kind === 'await' || kind === 'decompose'
      upsert(label, runningish ? 'running' : 'done', step.detail, step.id)
    }
  }

  return items
}

export function planStatusLabel(status: PlanItemStatus): string {
  if (status === 'pending') return '待做'
  if (status === 'running') return '进行中'
  if (status === 'done') return '完成'
  return '受阻'
}
