import { describe, expect, it } from 'vitest'
import { UsageFooter, type UsageInfo } from '@/components/chat/UsageFooter'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

function render(usage: UsageInfo) {
  return renderToStaticMarkup(createElement(UsageFooter, { usage }))
}

describe('UsageFooter (T05/T07)', () => {
  it('unknown never displays as 0 tokens', () => {
    const html = render({ usage_state: 'unknown', total_tokens: null })
    expect(html).toContain('用量未知')
    expect(html).not.toMatch(/>0 tokens</)
  })

  it('zero_calls may show 0', () => {
    const html = render({ usage_state: 'zero_calls', total_tokens: 0, call_count: 0 })
    expect(html).toContain('0 tokens')
  })

  it('final shows token count', () => {
    const html = render({ usage_state: 'final', total_tokens: 42, status: '完成' })
    expect(html).toContain('42 tokens')
  })
})
