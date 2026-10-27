/** Shared ResourceView / DocumentView → panel fragment (Q-R4 / Q-A5). Never executes. */

export type PreviewView = {
  fragmentHtml?: string
  outline?: unknown[]
  diagnostics?: unknown[]
  completeness?: string
  kind?: string
  schema?: string
}

export type PreviewResult =
  | { ok: true; view: PreviewView }
  | { ok: false; error: string }

/** Map appDocumentsRead / resource.view envelope into a panel fragment. */
export function applyResourceOrDocumentView(view: unknown): PreviewResult {
  const envelope = view as { ok?: boolean; data?: Record<string, unknown>; error?: { message?: string } }
  const data = (envelope?.data ?? view) as Record<string, unknown>
  if (envelope?.ok === false) {
    return { ok: false, error: envelope.error?.message || '读取失败' }
  }

  const capability = data.capability as string | undefined
  if (capability === 'unavailable' || data.honest_reason) {
    const text = String(data.text || '')
    const reason = String(data.honest_reason || 'view_bridge_missing')
    return {
      ok: true,
      view: {
        fragmentHtml: text
          ? `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(text)}</pre>`
          : '',
        outline: [],
        diagnostics: [reason, 'capability unavailable — 静态只读，未执行'],
        completeness: 'partial',
      },
    }
  }

  const caps = (data.capabilities ?? {}) as Record<string, unknown>
  if (caps['view.document'] === false) {
    return { ok: false, error: 'Marqdo view.document 不可用：请升级匹配的 CLI/ext/native 插件' }
  }
  if (caps['resource.view'] === false) {
    return { ok: false, error: 'Marqdo resource.view 不可用：请升级匹配的 CLI/ext/native 插件' }
  }

  const render = data.render as { fragment?: string | null; format?: string; text?: string } | undefined
  const resource = data.resource as { kind?: string; title?: string } | undefined
  const format = String(render?.format || data.format || '').toLowerCase()
  const raw = String(
    data.html_fragment
    || render?.fragment
    || render?.text
    || data.text
    || '',
  )

  let fragmentHtml = ''
  if (raw) {
    if (format === 'plain' || format === 'plain_text' || format === 'text') {
      fragmentHtml = `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(raw)}</pre>`
    } else if (format === 'html' || format === 'sanitized_html' || format.includes('html')) {
      fragmentHtml = sanitizeHtmlFragment(raw)
    } else if (data.html_fragment || (render?.fragment && format)) {
      fragmentHtml = sanitizeHtmlFragment(raw)
    } else {
      fragmentHtml = `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(raw)}</pre>`
    }
  }

  const kind = String(resource?.kind || caps.kind || '')
  const schema = String(data.schema || '')
  return {
    ok: true,
    view: {
      fragmentHtml,
      outline: (data.outline as unknown[]) || [],
      diagnostics: (data.diagnostics as unknown[]) || [],
      completeness: String(data.completeness || ''),
      kind: kind || undefined,
      schema: schema || undefined,
    },
  }
}

/** Minimal HTML allowlist — strip script/event handlers/dangerous URLs (R13). */
export function sanitizeHtmlFragment(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, '$1="#"')
    .replace(/<(iframe|object|embed|svg)\b[\s\S]*?>[\s\S]*?<\/\1>/gi, '')
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
