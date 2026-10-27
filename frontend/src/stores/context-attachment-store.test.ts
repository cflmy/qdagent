import { describe, expect, it } from 'vitest'
import { formatAttachmentFreeze } from './context-attachment-store'

describe('formatAttachmentFreeze', () => {
  it('labels truncated excerpts and never claims full file', () => {
    const text = formatAttachmentFreeze([
      {
        id: 'a1',
        resource_id: 'rf.abc',
        workspace_id: 'ws1',
        title: 'a.ts',
        revision: 'sha256:dead',
        origin: 'user',
        pinned_at: '2026-01-01T00:00:00Z',
        excerpt: 'line1\n',
        excerpt_truncated: true,
        range: { line: 1 },
      },
    ])
    expect(text).toContain('Frozen ContextAttachments')
    expect(text).toContain('resource_id: rf.abc')
    expect(text).toContain('revision: sha256:dead')
    expect(text).toContain('excerpt truncated')
    expect(text).not.toContain('full file loaded')
  })

  it('returns empty for no pins', () => {
    expect(formatAttachmentFreeze([])).toBe('')
  })
})
