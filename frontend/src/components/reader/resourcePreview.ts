/** Shared ResourceView / DocumentView → panel fragment (Q-R4 / Q-A5). Never executes. */
import createDOMPurify from 'dompurify'

export type BlobRefPayload = {
  path: string
  digest?: string
  media_type?: string
  byte_length?: number
  title?: string
}

export type PreviewView = {
  fragmentHtml?: string
  outline?: unknown[]
  diagnostics?: unknown[]
  completeness?: string
  kind?: string
  schema?: string
  /** Workspace-relative path / resource_id for resources/read continuation. */
  resourceId?: string
  digest?: string
  mediaType?: string
  byteLength?: number
  title?: string
  /** Plain source for JsonPreview / CodePreview (alongside sanitized fragment). */
  sourceText?: string
  /** Markdown body for client GFM render (notes / kb / chat-adjacent reader). */
  markdownSource?: string
  /** Client visual preview (PDF.js / ImagePreview); extract/OCR stay independent. */
  blobRef?: BlobRefPayload
  visualPreview?: 'client' | false | string
  /** Office: conversion plugin missing — show honest card, never spin. */
  conversionUnavailable?: boolean
  focusLocator?: { page?: number; line?: number; [k: string]: unknown }
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

  const render = data.render as {
    fragment?: string | null
    format?: string
    text?: string | null
    blob_ref?: BlobRefPayload
  } | undefined
  const resource = data.resource as {
    kind?: string
    title?: string
    resource_id?: string
    digest?: string
    media_type?: string
    size?: number
    path?: string
    source_ref?: string
  } | undefined
  const format = String(render?.format || data.format || '').toLowerCase()
  const kind = String(resource?.kind || caps.kind || '')
  const schema = String(data.schema || '')
  const resourceId = resource?.resource_id || resource?.path || resource?.source_ref
  const digest = resource?.digest
  const sourceText = typeof render?.text === 'string' ? render.text : undefined
  const diagnostics = (data.diagnostics as unknown[]) || []
  const conversionUnavailable = diagnostics.some((d) => {
    const code = typeof d === 'object' && d && 'code' in d ? String((d as { code?: string }).code) : ''
    return code === 'conversion.unavailable'
  }) || caps.conversion === false
  const focusFromData = data.focus_locator && typeof data.focus_locator === 'object'
    ? data.focus_locator as { page?: number; line?: number; [k: string]: unknown }
    : undefined
  const focusLine = typeof data.focus_line === 'number'
    ? data.focus_line
    : typeof focusFromData?.line === 'number'
      ? focusFromData.line
      : undefined

  if (format === 'blob_ref') {
    const blob = render?.blob_ref
    if (!blob?.path) {
      return { ok: false, error: 'ResourceView blob_ref 缺少 path' }
    }
    return {
      ok: true,
      view: {
        fragmentHtml: '',
        outline: (data.outline as unknown[]) || [],
        diagnostics: (data.diagnostics as unknown[]) || [],
        completeness: String(data.completeness || 'partial'),
        kind: kind || undefined,
        schema: schema || undefined,
        blobRef: {
          path: blob.path,
          digest: blob.digest,
          media_type: blob.media_type,
          byte_length: blob.byte_length,
          title: blob.title || resource?.title,
        },
        visualPreview: (caps.visual_preview as string | false | undefined) ?? 'client',
        focusLocator: focusFromData && focusFromData.page != null ? focusFromData : undefined,
      },
    }
  }

  const raw = String(
    data.html_fragment
    || render?.fragment
    || render?.text
    || data.text
    || '',
  )

  const pathHint = String(
    resource?.path
    || resource?.resource_id
    || resource?.source_ref
    || resource?.title
    || '',
  ).toLowerCase()
  const isMarkdown =
    format === 'markdown'
    || format === 'md'
    || format === 'gfm'
    || kind === 'markdown'
    || kind === 'md'
    || kind === 'mq'
    || /\.(mq\.)?md$/.test(pathHint)
    || pathHint.endsWith('.markdown')

  let fragmentHtml = ''
  let markdownSource: string | undefined
  if (raw) {
    if (isMarkdown && !(format.includes('html') || data.html_fragment)) {
      // Prefer client Markdown render over escaped <pre> (notes / kb / .mq.md).
      markdownSource = typeof sourceText === 'string' && sourceText ? sourceText : raw
      fragmentHtml = ''
    } else if (format === 'plain' || format === 'plain_text' || format === 'text') {
      fragmentHtml = `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(raw)}</pre>`
    } else if (format === 'html' || format === 'sanitized_html') {
      fragmentHtml = sanitizeHtmlFragment(raw)
    } else if (data.html_fragment || (render?.fragment && format)) {
      // Strict enum only — unknown format must not guess HTML from '<' (R13 / design §7.1).
      if (format.includes('html')) {
        fragmentHtml = sanitizeHtmlFragment(raw)
      } else {
        fragmentHtml = `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(raw)}</pre>`
      }
    } else {
      fragmentHtml = `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(raw)}</pre>`
    }
  }

  return {
    ok: true,
    view: {
      fragmentHtml: conversionUnavailable ? '' : fragmentHtml,
      outline: (data.outline as unknown[]) || [],
      diagnostics,
      completeness: String(data.completeness || ''),
      kind: kind || (markdownSource ? 'markdown' : undefined),
      schema: schema || undefined,
      resourceId,
      digest,
      mediaType: resource?.media_type,
      byteLength: typeof resource?.size === 'number' ? resource.size : undefined,
      title: resource?.title,
      sourceText: markdownSource || sourceText,
      markdownSource: conversionUnavailable ? undefined : markdownSource,
      conversionUnavailable: conversionUnavailable || undefined,
      focusLocator: focusLine != null
        ? { ...(focusFromData || {}), line: focusLine }
        : focusFromData,
    },
  }
}

let purify: ReturnType<typeof createDOMPurify> | null = null

function getPurify(): ReturnType<typeof createDOMPurify> {
  if (purify) return purify
  let win: Window
  if (typeof window !== 'undefined' && window.document) {
    win = window
  } else {
    // Node / vitest: jsdom window for DOMPurify (browser uses real window).
    // Dynamic import avoided — createDOMPurify needs a sync window at call time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = require('jsdom') as typeof import('jsdom')
    win = new JSDOM('').window as unknown as Window
  }
  purify = createDOMPurify(win)
  if (!purify.isSupported) {
    throw new Error('DOMPurify isSupported=false — need a real DOM (browser or jsdom)')
  }
  return purify
}

/** DOM allowlist sanitize — design §8.3; replaces regex strip (R13). */
export function sanitizeHtmlFragment(html: string): string {
  return getPurify().sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'svg', 'math'],
    FORBID_ATTR: ['style', 'srcdoc'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: false,
  })
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function decodeBase64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
