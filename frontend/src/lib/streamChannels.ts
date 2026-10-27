/** Q-A1 stream channel routing (design §5.3). */

export type StreamChannel = 'answer' | 'artifact' | 'progress' | 'diagnostic' | string

export type ChannelDelta = {
  channel?: StreamChannel
  delta?: string
  text?: string
  kind?: string
  type?: string
  resource_id?: string
  append_to_chat?: boolean
  [k: string]: unknown
}

export type ChannelRoute =
  | { kind: 'answer'; text: string }
  | { kind: 'artifact'; text: string; resourceId?: string }
  | { kind: 'progress'; text: string; label: string }
  | { kind: 'diagnostic'; text: string }
  | { kind: 'ignore' }

/**
 * Route a message.delta payload. Missing channel → answer (protocol compat).
 * Only answer (or append_to_chat=true) goes to the chat bubble.
 */
export function routeChannelDelta(payload: ChannelDelta | undefined | null): ChannelRoute {
  if (!payload) return { kind: 'ignore' }
  const text = String(payload.delta || payload.text || '')
  const channel = (payload.channel || '').toLowerCase()

  // Explicit framework flag wins when present.
  if (payload.append_to_chat === false && channel && channel !== 'answer') {
    if (channel === 'artifact') {
      return { kind: 'artifact', text, resourceId: payload.resource_id ? String(payload.resource_id) : undefined }
    }
    if (channel === 'progress') {
      return { kind: 'progress', text, label: '进度' }
    }
    if (channel === 'diagnostic') {
      return { kind: 'diagnostic', text }
    }
  }

  if (!channel || channel === 'answer') {
    // Legacy process kinds stay out of the answer bubble.
    if (
      payload.type === 'preflight'
      || payload.kind === 'plan'
      || payload.kind === 'reasoning'
      || [
        'preflight', 'decompose', 'decision', 'await', 'round', 'done',
        'tool_start', 'tool_end', 'plan_act',
      ].includes(String(payload.type || ''))
    ) {
      return { kind: 'ignore' }
    }
    if (!text) return { kind: 'ignore' }
    return { kind: 'answer', text }
  }

  if (channel === 'artifact') {
    return { kind: 'artifact', text, resourceId: payload.resource_id ? String(payload.resource_id) : undefined }
  }
  if (channel === 'progress') {
    return { kind: 'progress', text, label: '进度' }
  }
  if (channel === 'diagnostic') {
    return { kind: 'diagnostic', text }
  }
  // Unknown channel: never dump into chat.
  return { kind: 'diagnostic', text: text || `[channel:${channel}]` }
}

/** Collapse long answers for reading only — does not change upstream length. */
export function shouldCollapseAnswer(text: string, limit = 1200): boolean {
  return (text || '').length > limit
}
