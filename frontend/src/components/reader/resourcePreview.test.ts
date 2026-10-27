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

  it('maps PDF blob_ref for client visual preview without claiming extract', () => {
    const r = applyResourceOrDocumentView({
      data: {
        schema: 'ResourceViewV1',
        completeness: 'partial',
        resource: { kind: 'pdf', title: 'a.pdf' },
        capabilities: { visual_preview: 'client', extract: false, ocr: false, kind: 'pdf' },
        render: {
          format: 'blob_ref',
          blob_ref: { path: 'a.pdf', digest: 'sha256:x', media_type: 'application/pdf', title: 'a.pdf' },
        },
        diagnostics: [{ code: 'ocr.unavailable' }, { code: 'extract.unavailable' }],
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.view.kind).toBe('pdf')
    expect(r.view.visualPreview).toBe('client')
    expect(r.view.blobRef?.path).toBe('a.pdf')
    expect(r.view.fragmentHtml).toBe('')
    expect(JSON.stringify(r.view.diagnostics)).toContain('ocr.unavailable')
  })

  it('exposes sourceText for JsonPreview tree/source toggle', () => {
    const r = applyResourceOrDocumentView({
      data: {
        schema: 'ResourceViewV1',
        resource: { kind: 'json' },
        capabilities: { kind: 'json' },
        outline: [{ id: 'a', label: 'a: number', locator: { path: 'a' } }],
        render: { format: 'sanitized_html', fragment: '<pre>{}</pre>', text: '{\n  "a": 1\n}' },
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.view.kind).toBe('json')
    expect(r.view.sourceText).toContain('"a"')
    expect(r.view.outline).toHaveLength(1)
  })

  it('exposes focus line for CodePreview', () => {
    const r = applyResourceOrDocumentView({
      data: {
        schema: 'ResourceViewV1',
        resource: { kind: 'code' },
        focus_line: 3,
        focus_locator: { line: 3 },
        render: { format: 'sanitized_html', fragment: '<pre>x</pre>', text: 'a\nb\nc\n' },
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.view.focusLocator?.line).toBe(3)
    expect(r.view.sourceText).toContain('c')
  })

  it('carries focus_locator.page for PDF page navigation', () => {
    const r = applyResourceOrDocumentView({
      data: {
        schema: 'ResourceViewV1',
        resource: { kind: 'pdf' },
        capabilities: { visual_preview: 'client', extract: false, ocr: false },
        focus_locator: { page: 4 },
        render: {
          format: 'blob_ref',
          blob_ref: { path: 'x.pdf', media_type: 'application/pdf' },
        },
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.view.focusLocator?.page).toBe(4)
  })

  it('marks office conversion.unavailable without claiming preview', () => {
    const r = applyResourceOrDocumentView({
      data: {
        schema: 'ResourceViewV1',
        resource: {
          kind: 'docx',
          resource_id: 'memo.docx',
          title: 'memo.docx',
          media_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 12,
        },
        capabilities: { kind: 'docx', conversion: false, extract: false },
        diagnostics: [
          { code: 'conversion.unavailable', message: 'office conversion plugin not installed' },
        ],
        render: {
          format: 'sanitized_html',
          fragment: '<pre>should not be used as fake preview</pre>',
        },
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.view.conversionUnavailable).toBe(true)
    expect(r.view.kind).toBe('docx')
    expect(r.view.fragmentHtml).toBe('')
    expect(r.view.resourceId).toBe('memo.docx')
  })
})
