import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIX = resolve(dirname(fileURLToPath(import.meta.url)), '../../../contracts/fixtures/workbench')

function load(name: string) {
  return JSON.parse(readFileSync(resolve(FIX, name), 'utf-8'))
}

describe('Q00 workbench contracts', () => {
  it('model selection modes', () => {
    const data = load('model-selection.json')
    expect(data.schema_version).toBe(1)
    for (const ex of data.examples) {
      expect(['manual', 'policy']).toContain(ex.mode)
      expect(ex.model_id).toBeTruthy()
    }
  })

  it('unknown usage never displays as zero', () => {
    const data = load('usage-unknown.json')
    const unknown = data.examples.find((e: { usage_state: string }) => e.usage_state === 'unknown')
    expect(unknown).toBeTruthy()
    expect(unknown.display.forbid_zero).toBe(true)
    expect(unknown.total_tokens).toBeNull()
    expect(String(unknown.display.summary)).not.toMatch(/^0(\s|$)/)
  })

  it('citation resolution enum covers unresolved states', () => {
    const data = load('citation.json')
    expect(data.resolution_enum).toContain('resolved')
    expect(data.resolution_enum).toContain('version_unavailable')
    expect(data.example.locator.kind).toBeTruthy()
  })

  it('document view has honest unavailable capability', () => {
    const data = load('document-view.json')
    expect(data.success.data.no_exec).toBe(true)
    expect(data.capability_unavailable.data.capability).toBe('unavailable')
    expect(data.capability_unavailable.data.honest_reason).toBeTruthy()
  })

  it('error code matrix includes auth and revision conflicts', () => {
    const data = load('error-codes.json')
    const codes = new Set(data.matrix.map((r: { code: string }) => r.code))
    expect(codes.has('auth.required')).toBe(true)
    expect(codes.has('revision.conflict')).toBe(true)
    expect(codes.has('request_id.conflict')).toBe(true)
    expect(codes.has('provider.unavailable')).toBe(true)
    expect(data.envelope_error.ok).toBe(false)
  })

  it('model snapshot omits secrets and freezes turn identity', () => {
    const data = load('model-snapshot.json')
    expect(data.example.model_id).toBeTruthy()
    expect(data.example.upstream_model_id).toBeTruthy()
    expect(data.example.adapter).toBe('openai-compatible')
    for (const k of data.public_forbidden_keys) {
      expect(data.example).not.toHaveProperty(k)
    }
  })

  it('capabilities probe requires Marqdo 2.1.3 floor and honest native adapters', () => {
    const data = load('capabilities-probe.json')
    expect(data.required_min_version).toBe('2.1.3')
    expect(data.features['view.document']).toBe(true)
    expect(data.features['llm.explicit_selection']).toBe(true)
    const native = data.adapters.find((a: { id: string }) => a.id === 'anthropic-native')
    expect(native?.available).toBe(false)
  })

  it('citation relation enum forbids minting executed from prose alone', () => {
    const data = load('citation.json')
    expect(data.relation_enum).toContain('executed')
    expect(data.invariants.some((s: string) => s.includes('LLM markdown'))).toBe(true)
  })
})
