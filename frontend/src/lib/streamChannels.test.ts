import { describe, expect, it } from 'vitest'
import { routeChannelDelta, shouldCollapseAnswer } from './streamChannels'

describe('routeChannelDelta', () => {
  it('treats missing channel as answer (compat)', () => {
    expect(routeChannelDelta({ delta: 'hi' })).toEqual({ kind: 'answer', text: 'hi' })
  })

  it('keeps preflight out of answer bubble even without channel', () => {
    expect(routeChannelDelta({ type: 'preflight', delta: 'x' })).toEqual({ kind: 'ignore' })
  })

  it('routes artifact away from chat', () => {
    expect(routeChannelDelta({ channel: 'artifact', delta: 'draft', resource_id: 'r1' })).toEqual({
      kind: 'artifact',
      text: 'draft',
      resourceId: 'r1',
    })
  })

  it('routes progress and diagnostic', () => {
    expect(routeChannelDelta({ channel: 'progress', delta: 'step' }).kind).toBe('progress')
    expect(routeChannelDelta({ channel: 'diagnostic', delta: 'warn' }).kind).toBe('diagnostic')
  })

  it('never dumps unknown channel into answer', () => {
    const r = routeChannelDelta({ channel: 'secret', delta: 'nope' })
    expect(r.kind).not.toBe('answer')
  })
})

describe('shouldCollapseAnswer', () => {
  it('collapses only over limit', () => {
    expect(shouldCollapseAnswer('short')).toBe(false)
    expect(shouldCollapseAnswer('x'.repeat(1201))).toBe(true)
  })
})
