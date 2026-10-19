/**
 * qdagent API client — maps all Marqdo backend endpoints.
 * Base URL is same-origin (empty string); Marqdo proxy handles auth via cookie.
 */

async function GET<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

async function POST<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

async function POST_FORM<T = unknown>(path: string, body: FormData): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    body,
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

/** SSE streaming POST — yields parsed JSON chunks. */
async function* POST_STREAM(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): AsyncGenerator<unknown> {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  if (!res.body) throw new Error(`POST ${path}: no response body`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return
      try {
        yield JSON.parse(data)
      } catch {
        // skip malformed chunks
      }
    }
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
  listRuns: () => GET<Run[]>('/api/store/runs'),
  getRun: (data: { slug: string }) => POST<Run>('/api/store/get', data),
  context: (data: unknown) => POST('/api/store/context', data),

  // Profile
  getProfile: (data?: unknown) => POST<Profile>('/api/store/profile', data || {}),
  updateProfile: (data: unknown) => POST('/api/store/profile/update', data),
  resetProfile: (data?: unknown) => POST('/api/store/profile/reset', data || {}),

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
  engPolicies: (data?: unknown) => POST('/api/eng/policies', data || {}),
  engWorkbooks: (data?: unknown) => POST('/api/eng/workbooks', data || {}),
  engWorkbook: (data: { id: string }) => POST('/api/eng/workbook', data),
  engToday: () => GET('/api/eng/today'),

  // OpenAI-compatible
  v1Models: () => GET('/v1/models'),
  v1ChatCompletions: (data: {
    model?: string
    messages: ChatMessage[]
    stream?: boolean
    [key: string]: unknown
  }, signal?: AbortSignal) => POST_STREAM('/v1/chat/completions', data, signal),
}
