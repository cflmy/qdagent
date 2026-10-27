import { describe, expect, it } from 'vitest'
import { applyResourceOrDocumentView, sanitizeHtmlFragment } from './resourcePreview'

describe('applyResourceOrDocumentView', () => {
  it('renders JSON ResourceView sanitized_html', () => {
    const r = applyResourceOrDocumentView({
      ok: true,
      data: {
        schema: 'ResourceViewV1',
        completeness: 'complete',
        resource: { kind: 'json', title: 'a.json' },
        capabilities: { read_only: true, executed: false, kind: 'json' },
        render: {
          format: 'sanitized_html',
          fragment: '<pre class="mq-resource">{&quot;a&quot;:1}</pre>',
        },
        outline: [{ id: 'a', label: 'a: number' }],
        diagnostics: [],
        no_exec: true,
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.view.kind).toBe('json')
    expect(r.view.schema).toBe('ResourceViewV1')
    expect(r.view.fragmentHtml).toContain('mq-resource')
    expect(r.view.outline).toHaveLength(1)
  })

  it('renders CSV table fragment', () => {
    const r = applyResourceOrDocumentView({
      data: {
        schema: 'ResourceViewV1',
        completeness: 'complete',
        resource: { kind: 'csv' },
        render: {
          format: 'sanitized_html',
          fragment: '<article class="mq-resource"><table class="mq-csv"><tr><th>a</th></tr></table></article>',
        },
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.view.kind).toBe('csv')
    expect(r.view.fragmentHtml).toContain('mq-csv')
  })

  it('falls back to render.text for plain ResourceView', () => {
    const r = applyResourceOrDocumentView({
      data: {
        schema: 'ResourceViewV1',
        render: { format: 'text', fragment: null, text: 'hello <b>' },
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.view.fragmentHtml).toContain('hello &lt;b&gt;')
  })

  it('errors when resource.view capability is false', () => {
    const r = applyResourceOrDocumentView({
      data: {
        schema: 'ResourceViewV1',
        capabilities: { 'resource.view': false, read_only: true },
        render: { format: 'plain_text', fragment: '' },
      },
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('resource.view')
  })

  it('strips script tags in sanitize', () => {
    expect(sanitizeHtmlFragment('<p>x</p><script>alert(1)</script>')).toBe('<p>x</p>')
  })
})
