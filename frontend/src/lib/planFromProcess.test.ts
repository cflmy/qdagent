import { describe, expect, it } from 'vitest'
import { planFromProcess } from './planFromProcess'

describe('planFromProcess', () => {
  it('returns empty when no process (do not invent plan)', () => {
    expect(planFromProcess([])).toEqual([])
    expect(planFromProcess(undefined)).toEqual([])
  })

  it('maps preflight/tool events to statuses', () => {
    const plan = planFromProcess([
      { id: '1', kind: 'preflight', label: '工程预检' },
      { id: '2', kind: 'tool_start', label: '调用工具 workspace_search', detail: 'q=x' },
      { id: '3', kind: 'tool_end', label: '工具结束 workspace_search', detail: 'ok' },
      { id: '4', kind: 'completed', label: '完成' },
    ])
    expect(plan.some((p) => p.title.includes('预检') && p.status === 'done')).toBe(true)
    expect(plan.some((p) => p.title.includes('workspace_search') && p.status === 'done')).toBe(true)
  })

  it('marks tool failure as blocked', () => {
    const plan = planFromProcess([
      { id: '1', kind: 'tool_start', label: '调用工具 web_fetch' },
      { id: '2', kind: 'tool_end', label: '工具结束 web_fetch', detail: 'error: ssrf_blocked' },
    ])
    const row = plan.find((p) => p.title.includes('web_fetch'))
    expect(row?.status).toBe('blocked')
  })
})
