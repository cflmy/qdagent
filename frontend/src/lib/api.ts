/**
 * qdagent API client — maps all Marqdo backend endpoints.
 * Base URL is same-origin (empty string); Marqdo proxy handles auth via cookie.
 * Q-R3: structured ApiError, body-read timeouts, SSE event_id dedupe.
 */

/** Structured API error — never stringify as [object Object]. */
export class ApiError extends Error {
  code: string
  retryable: boolean
  requestId?: string
  status: number
  details?: unknown

  constructor(opts: {
    message: string
    code?: string
    retryable?: boolean
    requestId?: string
    status?: number
    details?: unknown
  }) {
    super(opts.message)
    this.name = 'ApiError'
    this.code = opts.code || 'error'
    this.retryable = Boolean(opts.retryable)
    this.requestId = opts.requestId
    this.status = opts.status ?? 0
    this.details = opts.details
  }
}

function errorMessageFromBody(json: unknown, fallback: string): { message: string; code?: string; retryable?: boolean; requestId?: string; details?: unknown } {
  if (!json || typeof json !== 'object') return { message: fallback }
  const o = json as Record<string, unknown>
  const err = o.error
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return {
      message: String(e.message || e.code || fallback),
      code: e.code ? String(e.code) : undefined,
      retryable: Boolean(e.retryable),
      requestId: o.request_id ? String(o.request_id) : undefined,
      details: e.details,
    }
  }
  if (typeof err === 'string') return { message: err, requestId: o.request_id ? String(o.request_id) : undefined }
  if (typeof o.message === 'string') return { message: o.message }
  return { message: fallback }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrapEnvelope<T>(json: any, path: string): T {
  if (json && typeof json === 'object' && !Array.isArray(json) && 'ok' in json) {
    if (json.ok === false) {
      const parsed = errorMessageFromBody(json, `${path} returned ok:false`)
      throw new ApiError({
        message: parsed.message,
        code: parsed.code,
        retryable: parsed.retryable,
        requestId: parsed.requestId,
        details: parsed.details,
      })
    }
  }
  return json as T
}

/** Short API calls — covers full response body read (Q-R3). */
const SHORT_FETCH_MS = 8_000
const SSE_IDLE_MS = 120_000

function busyMessage(path: string, status: number, detail: string): string {
  if (status === 429 || /slot|queue_full|no_slot|execute/i.test(detail)) {
    return detail || `执行槽已满，请稍后重试：${path}`
  }
  if (status === 503 || /interpreter busy/i.test(detail)) {
    return detail || `服务正忙（对话进行中），请稍后重试：${path}`
  }
  return detail || `请求失败 ${status}: ${path}`
}

/** GET SSE with Last-Event-ID resume (turn events replay). */
async function* GET_STREAM(
  path: string,
  signal?: AbortSignal,
  headers?: Record<string, string>,
): AsyncGenerator<unknown> {
  const res = await fetch(path, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'text/event-stream', ...headers },
    signal,
  })
  if (!res.ok) {
    let json: unknown = null
    try { json = await res.json() } catch { /* ignore */ }
    const parsed = errorMessageFromBody(json, '')
    const retryAfter = res.headers.get('Retry-After')
    throw new ApiError({
      message: busyMessage(path, res.status, parsed.message),
      code: parsed.code || 'error',
      retryable: parsed.retryable ?? (res.status === 503 || res.status === 429),
      requestId: parsed.requestId,
      status: res.status,
      details: { ...(parsed.details as object || {}), retryAfter },
    })
  }
  if (!res.body) throw new ApiError({ message: `GET ${path}: no response body` })

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const seenIds = new Set<string>()
  let lastActivity = Date.now()

  while (true) {
    if (Date.now() - lastActivity > SSE_IDLE_MS) {
      throw new ApiError({
        message: `SSE 空闲超时（${SSE_IDLE_MS}ms）：${path}`,
        code: 'deadline.exceeded',
        retryable: true,
        status: 504,
      })
    }
    const { done, value } = await reader.read()
    if (done) break
    lastActivity = Date.now()
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data) as { event_id?: string }
        if (parsed?.event_id) {
          if (seenIds.has(parsed.event_id)) continue
          seenIds.add(parsed.event_id)
        }
        yield parsed
      } catch { /* skip */ }
    }
  }
}

async function fetchWithTimeout(
  path: string,
  init: RequestInit,
  timeoutMs = SHORT_FETCH_MS,
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const parent = init.signal
  const onParentAbort = () => ctrl.abort()
  if (parent) {
    if (parent.aborted) ctrl.abort()
    else parent.addEventListener('abort', onParentAbort, { once: true })
  }
  try {
    // Keep timer through body read for non-stream JSON (headers alone ≠ done).
    const res = await fetch(path, { ...init, signal: ctrl.signal })
    return res
  } catch (e) {
    if (ctrl.signal.aborted && !(parent && parent.aborted)) {
      throw new ApiError({
        message: `请求超时（${timeoutMs}ms）：${path}`,
        code: 'deadline.exceeded',
        retryable: true,
        status: 504,
      })
    }
    throw e
  } finally {
    clearTimeout(timer)
    if (parent) parent.removeEventListener('abort', onParentAbort)
  }
}

async function GET<T = unknown>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetchWithTimeout(path, { credentials: 'same-origin', headers })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const parsed = errorMessageFromBody(json, busyMessage(path, res.status, ''))
    throw new ApiError({
      message: busyMessage(path, res.status, parsed.message),
      code: parsed.code || (res.status === 503 ? 'runtime.unavailable' : 'error'),
      retryable: parsed.retryable ?? res.status === 503,
      requestId: parsed.requestId,
      status: res.status,
      details: parsed.details,
    })
  }
  return unwrapEnvelope<T>(json, path)
}

async function POST<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  if (!res.ok) {
    const parsed = errorMessageFromBody(json, '')
    throw new ApiError({
      message: busyMessage(path, res.status, parsed.message),
      code: parsed.code || 'error',
      retryable: parsed.retryable ?? (res.status === 503 || res.status === 429),
      requestId: parsed.requestId,
      status: res.status,
      details: parsed.details,
    })
  }
  return unwrapEnvelope<T>(json, path)
}

async function POST_FORM<T = unknown>(path: string, body: FormData): Promise<T> {
  const res = await fetchWithTimeout(path, {
    method: 'POST',
    credentials: 'same-origin',
    body,
  }, 60_000)
  if (!res.ok) {
    throw new ApiError({ message: `POST ${path} failed: ${res.status}`, status: res.status })
  }
  return res.json() as Promise<T>
}

/** New client request id for idempotent writes (Q-R3). */
export function newRequestId(prefix = 'req'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** SSE streaming POST — event_id dedupe; idle timeout separate from handshake. */
async function* POST_STREAM(
  path: string,
  body: unknown,
  signal?: AbortSignal,
  headers?: Record<string, string>,
): AsyncGenerator<unknown> {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    let json: unknown = null
    try { json = await res.json() } catch { /* ignore */ }
    const parsed = errorMessageFromBody(json, '')
    throw new ApiError({
      message: busyMessage(path, res.status, parsed.message),
      code: parsed.code || 'error',
      retryable: parsed.retryable ?? res.status === 503,
      requestId: parsed.requestId,
      status: res.status,
      details: parsed.details,
    })
  }
  if (!res.body) throw new ApiError({ message: `POST ${path}: no response body` })

  const ctype = (res.headers.get('content-type') || '').toLowerCase()
  if (ctype.includes('application/json') && !ctype.includes('event-stream')) {
    const json = await res.json()
    yield json
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let sawEvent = false
  const seenIds = new Set<string>()
  let lastActivity = Date.now()

  while (true) {
    if (Date.now() - lastActivity > SSE_IDLE_MS) {
      throw new ApiError({
        message: `SSE 空闲超时（${SSE_IDLE_MS}ms）：${path}`,
        code: 'deadline.exceeded',
        retryable: true,
        status: 504,
      })
    }
    const { done, value } = await reader.read()
    if (done) break
    lastActivity = Date.now()
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data) as { event_id?: string }
        if (parsed?.event_id) {
          if (seenIds.has(parsed.event_id)) continue
          seenIds.add(parsed.event_id)
        }
        sawEvent = true
        yield parsed
      } catch {
        // incomplete or malformed frame — skip (do not treat half-line as token)
      }
    }
  }

  const leftover = buffer.trim()
  if (!sawEvent && leftover.startsWith('{')) {
    try {
      yield JSON.parse(leftover)
    } catch { /* ignore */ }
  }
}

// ─── Types ───────────────────────────────────────────────────────────

export interface Run {
  id: string
  slug?: string
  title?: string
  content?: string
  role?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export interface Profile {
  llm_base_url?: string
  tts_base_url?: string
  asr_base_url?: string
  api_key?: string
  model?: string
  dictation_lang?: string
  [key: string]: unknown
}

export interface Settings {
  llm_base_url?: string
  llm_model?: string
  llm_api_key?: string
  llm_api_key_set?: boolean
  tts_base_url?: string
  tts_model?: string
  tts_api_key?: string
  tts_api_key_set?: boolean
  asr_base_url?: string
  asr_model?: string
  asr_api_key?: string
  asr_api_key_set?: boolean
  dictation_lang?: string
  [key: string]: unknown
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatCompletionChunk {
  choices: Array<{
    delta: { content?: string; role?: string }
    finish_reason?: string | null
  }>
}

// ─── API ─────────────────────────────────────────────────────────────

export const api = {
  // Health
  health: () => GET('/api/health'),

  // Store — Run CRUD
  captureRun: (data: unknown) => POST('/api/store/run', data),
  syncRun: (data: unknown) => POST('/api/store/sync', data),
  search: (data: unknown) => POST('/api/store/search', data),
  list: (data: unknown) => POST('/api/store/list', data),
  listRuns: async (): Promise<Run[]> => {
    const json = await GET<Run[] | { ok?: boolean; runs?: Array<Run & { body?: string }> }>('/api/store/runs')
    // Backend returns {ok, runs}; tolerate a bare array too.
    const list = Array.isArray(json) ? json : Array.isArray(json?.runs) ? json.runs : []
    // The list payload carries `body`, while callers speak `content`.
    return list.map<Run>((r) => {
      const content = typeof r.content === 'string' ? r.content : r.body
      return { ...r, content: typeof content === 'string' ? content : undefined }
    })
  },
  getRun: async (data: { slug: string }): Promise<Run> => {
    const json = await POST<Partial<Run> & { ok?: boolean }>('/api/store/get', data)
    // Backend returns {ok, slug, path, body} where body is the note markdown.
    return { ...json, slug: json.slug ?? data.slug, content: json.content ?? json.body } as Run
  },
  context: (data: unknown) => POST('/api/store/context', data),

  // Profile — backend returns {ok, body, path}; callers want the profile object.
  getProfile: async (data?: unknown): Promise<Profile> => {
    const json = await POST<Partial<Profile> & { ok?: boolean; body?: string; path?: string }>(
      '/api/store/profile',
      data || {},
    )
    const merged = { ...json } as Profile
    if (typeof json.body === 'string' && json.body.length > 0) {
      merged.markdown = json.body
    }
    return merged
  },
  updateProfile: (data: unknown) => POST('/api/store/profile/update', data),
  resetProfile: (data?: unknown) => POST('/api/store/profile/reset', data || {}),

  // Settings — the model / voice config row (secrets reported as *_set flags).
  getSettings: () => GET<Settings>('/api/config'),
  updateSettings: (data: Partial<Settings>) => POST<{ saved: boolean }>('/api/config/update', data),

  // Knowledge
  organize: (data: unknown) => POST('/api/store/organize', data),
  kbList: (data?: unknown) => POST('/api/store/kb/list', data || {}),
  kbGet: (data: { path: string }) => POST('/api/store/kb/get', data),
  webSearch: (data: { query: string }) => POST('/api/store/web_search', data),
  asrTranscribe: (formData: FormData) => POST_FORM('/api/store/asr_transcribe', formData),

  // Changes
  changePropose: (data: unknown) => POST('/api/store/changes/propose', data),
  changeList: (data?: unknown) => POST('/api/store/changes/list', data || {}),
  changeGet: (data: { id: string }) => POST('/api/store/changes/get', data),
  changeApply: (data: { id: string }) => POST('/api/store/changes/apply', data),
  changeReject: (data: { id: string }) => POST('/api/store/changes/reject', data),

  // Git
  gitLog: (data?: unknown) => POST('/api/store/git/log', data || {}),
  gitShow: (data: { commit: string }) => POST('/api/store/git/show', data),
  gitRevert: (data: { commit: string }) => POST('/api/store/git/revert', data),

  // Engineering
  preflight: (data?: unknown) => POST('/api/eng/preflight', data || {}),
  engReuse: (data: unknown) => POST('/api/eng/reuse', data),
  engFind: (data: unknown) => POST('/api/eng/find', data),
  engCapability: (data?: unknown) => POST('/api/eng/capability', data || {}),
  engImpact: (data: unknown) => POST('/api/eng/impact', data),
  engConflicts: (data: unknown) => POST('/api/eng/conflicts', data),
  engStale: (data?: unknown) => POST('/api/eng/stale', data || {}),
  engDuplicate: (data: unknown) => POST('/api/eng/duplicate', data),
  engVerify: (data: unknown) => POST('/api/eng/verify', data),
  engLearn: (data: unknown) => POST('/api/eng/learn', data),
  engMetrics: () => GET('/api/eng/metrics'),
  engCandidates: (data?: unknown) => POST('/api/eng/candidates', data || {}),
  engPromote: (data: { id: string }) => POST('/api/eng/promote', data),
  engReject: (data: { id: string }) => POST('/api/eng/reject', data),
  engBuild: (data: unknown) => POST('/api/eng/build', data),
  engSession: (data: unknown) => POST('/api/eng/session', data),
  engSessions: (data?: unknown) => POST('/api/eng/sessions', data || {}),
  engKnowledge: (data?: unknown) => POST('/api/eng/knowledge', data || {}),
  engKbStatus: (data?: unknown) => POST('/api/eng/kb/status', data || {}),
  engImport: (data: { path: string; kb_root?: string; publish?: boolean; title?: string }) =>
    POST('/api/eng/import', data),
  engPolicies: (data?: unknown) => POST('/api/eng/policies', data || {}),
  engWorkbooks: (data?: unknown) => POST('/api/eng/workbooks', data || {}),
  engWorkbook: (data: { id: string }) => POST('/api/eng/workbook', data),
  engToday: () => GET('/api/eng/today'),

  // OpenAI-compatible
  v1Models: () => GET('/v1/models', { 'Authorization': 'Bearer qdagent-local' }),
  v1ChatCompletions: (data: {
    model?: string
    model_id?: string
    selection?: { mode?: string; model_id: string }
    messages: ChatMessage[]
    stream?: boolean
    [key: string]: unknown
  }, signal?: AbortSignal) => POST_STREAM(
    '/v1/chat/completions',
    data,
    signal,
    { 'Authorization': 'Bearer qdagent-local' },
  ),

  // Workbench app APIs (Q01–Q08)
  appProviders: () => GET('/api/app/providers'),
  appProvidersSave: (data: unknown) => POST('/api/app/providers/save', data),
  appProvidersProbe: (data: { provider_id: string }) => POST('/api/app/providers/probe', data),
  appProvidersDiscover: (data: { provider_id: string }) => POST('/api/app/providers/discover', data),
  appModels: () => GET('/api/app/models'),
  appModelsSave: (data: unknown) => POST('/api/app/models/save', data),
  appUsageQuery: (data?: unknown) => POST('/api/app/usage/query', data || {}),
  appWorkspaces: () => GET('/api/app/workspaces'),
  appWorkspacesSave: (data: unknown) => POST('/api/app/workspaces/save', data),
  appWorkspacesTree: (data?: { workspace_id?: string; path?: string }) =>
    POST('/api/app/workspaces/tree', data || {}),
  appDocumentsRead: (data: unknown) => POST('/api/app/documents/read', data),
  /** Designed unified preview (§11.1); documents/read remains compatible. */
  appResourcesPreview: (data: {
    workspace_id?: string
    document?: string
    path?: string
    resource_id?: string
    revision?: string
    generation?: string
    node_id?: string
    locator?: { page?: number; line?: number; cell?: string; [k: string]: unknown }
    renderer?: string
  }) => POST('/api/app/resources/preview', data),
  appResourcesBlob: (data: {
    workspace_id?: string
    path: string
    digest?: string
    max_bytes?: number
  }) => POST('/api/app/resources/blob', data),
  /** Designed range read (§11.1): line/cell + max_bytes + next_cursor. */
  appResourcesRead: (data: {
    workspace_id?: string
    path?: string
    document?: string
    resource_id?: string
    digest?: string
    revision?: string
    line_start?: number
    line_end?: number
    cell_col?: number
    max_bytes?: number
    cursor?: string
    next_cursor?: string
    locator?: { line?: number; page?: number; col?: number; [k: string]: unknown }
  }) => POST('/api/app/resources/read', data),
  appResourcesResolve: (data: {
    workspace_id?: string
    path?: string
    document?: string
    slug?: string
    resource_id?: string
    digest?: string
    revision?: string
  }) => POST('/api/app/resources/resolve', data),
  appResourcesList: (data: {
    workspace_id?: string
    path?: string
    kind?: 'file' | 'note' | 'all' | string
    cursor?: number | string
    limit?: number
  }) => POST('/api/app/resources/list', data),
  /** QA-16: verify ContextAttachment pins vs live digests (no silent refresh). */
  appResourcesVerifyAttachments: (data: {
    workspace_id?: string
    attachments?: unknown[]
    context_attachments?: unknown[]
  }) => POST('/api/app/resources/verify_attachments', data),
  appCitationsResolve: (data: unknown) => POST('/api/app/citations/resolve', data),
  appUploadsCreate: (data: unknown) => POST('/api/app/uploads/create', data),
  appImportsStart: (data: unknown) => POST('/api/app/imports/start', data),
  appImportsGet: (data: unknown) => POST('/api/app/imports/get', data),
  appImportsPublish: (data: unknown) => POST('/api/app/imports/publish', data),
  appProfileItems: (data?: unknown) => POST('/api/app/profile/items', data || {}),
  appProfilePropose: (data: unknown) => POST('/api/app/profile/propose', data),
  appProfileSetStatus: (data: { id: string; status: string }) =>
    POST('/api/app/profile/set_status', data),
  appTurnsCancel: (data: unknown) => POST('/api/app/turns/cancel', data),
  appTurnsGet: (turnId: string) =>
    GET(`/api/app/turns/${encodeURIComponent(turnId)}`),
  /** Q-A3: server recovery gate — reconnect=events only; continue=new attempt under CAS. */
  appTurnsRecover: (data: {
    turn_id: string
    action: 'reconnect' | 'continue' | string
    expected_revision?: number
    idempotency_key?: string
  }) => POST('/api/app/turns/recover', data),
  appTurnsEvents: (
    turnId: string,
    opts?: { lastEventId?: string; afterSeq?: number; signal?: AbortSignal },
  ) => {
    const q = opts?.afterSeq != null ? `?after_seq=${opts.afterSeq}` : ''
    const headers: Record<string, string> = {}
    if (opts?.lastEventId) headers['Last-Event-ID'] = opts.lastEventId
    return GET_STREAM(
      `/api/app/turns/${encodeURIComponent(turnId)}/events${q}`,
      opts?.signal,
      headers,
    )
  },
  appFeatureFlags: () => GET('/api/app/feature_flags'),
}
