import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { ChevronDown, ChevronRight, Loader2, Plus, RefreshCw, Wifi } from 'lucide-react'

type ModelRow = {
  id: string
  display_name: string
  upstream_model_id: string
  enabled?: number | boolean
  revision?: number
}

type ProviderRow = {
  id: string
  display_name: string
  adapter: string
  base_url?: string
  auth_mode?: string
  enabled?: number | boolean
  revision?: number
  credential_configured?: boolean
  models?: ModelRow[]
}

type LinkStatus = 'idle' | 'probing' | 'ok' | 'auth_failed' | 'unreachable' | 'unavailable' | 'error'

type Draft = {
  display_name: string
  base_url: string
  api_key: string
  enabled: boolean
}

type Candidate = {
  upstream_model_id: string
  display_name?: string
  already_registered?: boolean
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '36px',
  padding: '0 12px',
  borderRadius: 'var(--dsw-radius-md, 8px)',
  border: '0.5px solid var(--dsw-alias-border-l4)',
  backgroundColor: 'var(--dsw-alias-bg-layer-3)',
  fontSize: '13px',
  color: 'var(--dsw-alias-label-primary)',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

function statusLabel(s: LinkStatus, note?: string): string {
  switch (s) {
    case 'idle': return '未测试'
    case 'probing': return '探测中…'
    case 'ok': return '已连通'
    case 'auth_failed': return '鉴权失败'
    case 'unreachable': return '不可达'
    case 'unavailable': return '适配器不可用'
    default: return note || '错误'
  }
}

function statusColor(s: LinkStatus): string {
  if (s === 'ok') return '#34d399'
  if (s === 'probing') return 'var(--dsw-alias-label-tertiary)'
  if (s === 'idle') return 'var(--dsw-alias-label-tertiary)'
  return '#f87171'
}

export function ProviderModelPanes() {
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [link, setLink] = useState<Record<string, { status: LinkStatus; note?: string; latency_ms?: number }>>({})
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({})
  const [manualModel, setManualModel] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  const providersRef = useRef(providers)
  providersRef.current = providers

  const refresh = useCallback(async () => {
    try {
      const res = await api.appProviders()
      const list = (res as { providers?: ProviderRow[] }).providers
        ?? (res as { data?: ProviderRow[] }).data
        ?? []
      const rows = Array.isArray(list) ? list : []
      setProviders(rows)
      setDrafts((prev) => {
        const next = { ...prev }
        for (const p of rows) {
          if (!next[p.id]) {
            next[p.id] = {
              display_name: p.display_name || '',
              base_url: p.base_url || '',
              api_key: '',
              enabled: p.enabled !== 0 && p.enabled !== false,
            }
          }
        }
        return next
      })
    } catch (e) {
      // 503 / busy: keep existing provider list (do not clear settings UI).
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const persist = async (id: string) => {
    const latest = draftsRef.current[id]
    const prov = providersRef.current.find((p) => p.id === id)
    if (!latest || !prov) return
    setSaving((s) => ({ ...s, [id]: true }))
    setMsg('')
    try {
      const body: Record<string, unknown> = {
        id,
        display_name: latest.display_name,
        base_url: latest.base_url,
        adapter: prov.adapter || 'openai-compatible',
        auth_mode: (latest.api_key || prov.credential_configured) ? 'api_key' : (prov.auth_mode || 'api_key'),
        enabled: latest.enabled ? 1 : 0,
        expected_revision: prov.revision,
        credential_action: latest.api_key ? 'replace' : 'keep',
      }
      if (latest.api_key) body.credential = latest.api_key
      await api.appProvidersSave(body)
      setDrafts((d) => ({ ...d, [id]: { ...d[id], api_key: '' } }))
      await refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
      await refresh()
    } finally {
      setSaving((s) => ({ ...s, [id]: false }))
    }
  }

  const scheduleSave = (id: string, patch: Partial<Draft>) => {
    setDrafts((d) => {
      const next = { ...d, [id]: { ...d[id], ...patch } }
      draftsRef.current = next
      return next
    })
    if (timers.current[id]) clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(() => { void persist(id) }, 500)
  }

  const persistNow = async (id: string) => {
    if (timers.current[id]) clearTimeout(timers.current[id])
    await persist(id)
  }

  const probe = async (id: string) => {
    setLink((l) => ({ ...l, [id]: { status: 'probing' } }))
    try {
      await persistNow(id)
      const res = await api.appProvidersProbe({ provider_id: id }) as {
        status?: string
        note?: string
        latency_ms?: number
        ok?: boolean
      }
      const st = (res.status || (res.ok ? 'ok' : 'error')) as LinkStatus
      setLink((l) => ({
        ...l,
        [id]: { status: st, note: res.note, latency_ms: res.latency_ms },
      }))
    } catch (e) {
      setLink((l) => ({
        ...l,
        [id]: { status: 'error', note: e instanceof Error ? e.message : String(e) },
      }))
    }
  }

  const discover = async (id: string) => {
    setMsg('')
    try {
      await persistNow(id)
      const res = await api.appProvidersDiscover({ provider_id: id }) as {
        candidates?: Candidate[]
        status?: string
        error?: string
        ok?: boolean
      }
      if (res.status && res.status !== 'ok' && !res.candidates?.length) {
        setMsg(res.error || res.status)
        setCandidates((c) => ({ ...c, [id]: [] }))
        return
      }
      setCandidates((c) => ({ ...c, [id]: res.candidates || [] }))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  const enableCandidate = async (providerId: string, upstream: string) => {
    try {
      await api.appModelsSave({
        provider_id: providerId,
        upstream_model_id: upstream,
        display_name: upstream,
        enabled: 1,
      })
      setCandidates((c) => ({
        ...c,
        [providerId]: (c[providerId] || []).map((x) =>
          x.upstream_model_id === upstream ? { ...x, already_registered: true } : x),
      }))
      await refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  const addManualModel = async (providerId: string) => {
    const uid = (manualModel[providerId] || '').trim()
    if (!uid) return
    try {
      await api.appModelsSave({
        provider_id: providerId,
        upstream_model_id: uid,
        display_name: uid,
        enabled: 1,
      })
      setManualModel((m) => ({ ...m, [providerId]: '' }))
      await refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  const toggleModel = async (m: ModelRow, enabled: boolean) => {
    try {
      await api.appModelsSave({
        id: m.id,
        expected_revision: m.revision,
        enabled: enabled ? 1 : 0,
      })
      await refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  const addProvider = async () => {
    setMsg('')
    try {
      const saved = await api.appProvidersSave({
        display_name: '新提供商',
        adapter: 'openai-compatible',
        base_url: 'https://api.openai.com/v1',
        auth_mode: 'api_key',
        credential_action: 'keep',
        enabled: 1,
      }) as { id?: string }
      const pid = saved.id
      if (pid) {
        setExpanded((e) => ({ ...e, [pid]: true }))
        await refresh()
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' }}>提供商与模型</div>
      <p style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)', margin: '0 0 8px' }}>
        配置在设置中自动保存到服务端提供商凭证；不使用环境变量。输入后失焦或稍候即保存。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {providers.map((p) => {
          const open = !!expanded[p.id]
          const d = drafts[p.id] || {
            display_name: p.display_name,
            base_url: p.base_url || '',
            api_key: '',
            enabled: true,
          }
          const ls = link[p.id]?.status || 'idle'
          const modelCount = p.models?.length ?? 0
          return (
            <div
              key={p.id}
              style={{
                border: '0.5px solid var(--dsw-alias-border-l3)',
                borderRadius: 10,
                overflow: 'hidden',
                background: 'var(--dsw-alias-bg-layer-3)',
              }}
            >
              <button
                type="button"
                onClick={() => setExpanded((e) => ({ ...e, [p.id]: !open }))}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--dsw-alias-label-primary)',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{p.display_name}</div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--dsw-alias-label-tertiary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>{p.base_url}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--dsw-alias-label-secondary)' }}>
                  {p.credential_configured ? '凭证✓' : '无凭证'} · {modelCount} 模型
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: statusColor(ls),
                }}>
                  <Wifi size={12} />
                  {statusLabel(ls, link[p.id]?.note)}
                  {link[p.id]?.latency_ms != null && ls === 'ok' ? ` ${link[p.id]!.latency_ms}s` : ''}
                  {saving[p.id] ? <Loader2 size={12} className="animate-spin" /> : null}
                </span>
              </button>
              {open && (
                <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}>
                    名称
                    <input
                      style={{ ...inputStyle, marginTop: 4 }}
                      value={d.display_name}
                      onChange={(e) => scheduleSave(p.id, { display_name: e.target.value })}
                      onBlur={() => void persistNow(p.id)}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}>
                    Base URL
                    <input
                      style={{ ...inputStyle, marginTop: 4 }}
                      value={d.base_url}
                      onChange={(e) => scheduleSave(p.id, { base_url: e.target.value })}
                      onBlur={() => void persistNow(p.id)}
                      placeholder="https://api.openai.com/v1"
                    />
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}>
                    API Key
                    <input
                      type="password"
                      style={{ ...inputStyle, marginTop: 4 }}
                      value={d.api_key}
                      onChange={(e) => scheduleSave(p.id, { api_key: e.target.value })}
                      onBlur={() => void persistNow(p.id)}
                      placeholder={p.credential_configured ? '已配置（留空则保持不变）' : '填写密钥后自动保存'}
                    />
                  </label>
                  <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={(e) => {
                        scheduleSave(p.id, { enabled: e.target.checked })
                        void persistNow(p.id)
                      }}
                    />
                    启用
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <SmallBtn onClick={() => void probe(p.id)}><Wifi size={12} /> 测试连接</SmallBtn>
                    <SmallBtn onClick={() => void discover(p.id)}><RefreshCw size={12} /> 发现模型</SmallBtn>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>已注册模型</div>
                  {(p.models || []).map((m) => (
                    <div key={m.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      padding: '6px 8px',
                      borderRadius: 6,
                      background: 'var(--dsw-alias-bg-layer-2)',
                    }}>
                      <span>{m.display_name} <span style={{ color: 'var(--dsw-alias-label-tertiary)' }}>({m.upstream_model_id})</span></span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="checkbox"
                          checked={m.enabled !== 0 && m.enabled !== false}
                          onChange={(e) => void toggleModel(m, e.target.checked)}
                        />
                        启用
                      </label>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="手动添加上游模型 id"
                      value={manualModel[p.id] || ''}
                      onChange={(e) => setManualModel((m) => ({ ...m, [p.id]: e.target.value }))}
                    />
                    <SmallBtn onClick={() => void addManualModel(p.id)}><Plus size={12} /> 添加</SmallBtn>
                  </div>
                  {(candidates[p.id] || []).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>发现候选（确认后启用）</div>
                      {candidates[p.id].map((c) => (
                        <div key={c.upstream_model_id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12,
                          padding: '4px 8px',
                        }}>
                          <span>{c.upstream_model_id}</span>
                          {c.already_registered ? (
                            <span style={{ color: 'var(--dsw-alias-label-tertiary)' }}>已注册</span>
                          ) : (
                            <SmallBtn onClick={() => void enableCandidate(p.id, c.upstream_model_id)}>启用</SmallBtn>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {!providers.length && (
          <div style={{ fontSize: 13, color: 'var(--dsw-alias-label-tertiary)', padding: 12 }}>
            尚无提供商。点击下方添加，或等待历史 settings 一次性迁移。
          </div>
        )}
      </div>
      <div style={{ paddingTop: 8 }}>
        <SmallBtn onClick={() => void addProvider}><Plus size={12} /> 添加提供商</SmallBtn>
      </div>
      {msg && <p style={{ fontSize: 12, color: '#f87171' }}>{msg}</p>}
    </>
  )
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 28,
        padding: '0 10px',
        border: '0.5px solid var(--dsw-alias-border-l3)',
        borderRadius: 8,
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: 12,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}
