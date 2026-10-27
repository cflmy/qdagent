import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { createPortal } from 'react-dom'
import {
  Mic, Plug, Database,
  Save, RotateCcw, Loader2, X,
  User, Cpu, Palette,
} from 'lucide-react'
import { ProviderModelPanes } from './ProviderModelPanes'

type Tab = 'general' | 'models' | 'plugins' | 'voice' | 'memory' | 'account'

const tabs: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'general', label: '通用', icon: Palette },
  { id: 'models', label: '模型', icon: Cpu },
  { id: 'plugins', label: '插件', icon: Plug },
  { id: 'voice', label: '语音', icon: Mic },
  { id: 'memory', label: '记忆', icon: Database },
  { id: 'account', label: '账户', icon: User },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    tts_base_url: '',
    asr_base_url: '',
    dictation_lang: 'zh-CN',
  })
  const [prefDetail, setPrefDetail] = useState<'concise' | 'standard' | 'detailed'>('concise')
  const [prefRevision, setPrefRevision] = useState('sha256:0')
  const [tokenBudget, setTokenBudget] = useState(0)
  const [timeBudgetS, setTimeBudgetS] = useState(0)
  const [prefSaving, setPrefSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      api.getSettings(),
      api.appResponsePreferencesGet().catch(() => null),
    ]).then(([s, pref]) => {
      setForm({
        tts_base_url: s.tts_base_url || '',
        asr_base_url: s.asr_base_url || '',
        dictation_lang: s.dictation_lang || 'zh-CN',
      })
      const data = (pref as {
        data?: { detail?: string; revision?: string; token_budget?: number; time_budget_s?: number }
      } | null)?.data
        ?? (pref as {
          detail?: string
          revision?: string
          token_budget?: number
          time_budget_s?: number
        } | null)
      if (data?.detail === 'standard' || data?.detail === 'detailed' || data?.detail === 'concise') {
        setPrefDetail(data.detail)
      }
      if (data?.revision) setPrefRevision(data.revision)
      if (typeof data?.token_budget === 'number') setTokenBudget(data.token_budget)
      if (typeof data?.time_budget_s === 'number') setTimeBudgetS(data.time_budget_s)
    }).catch((err) => {
      setLoadError(err instanceof Error ? err.message : String(err))
    }).finally(() => setLoading(false))
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/')
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [navigate])

  const handleClose = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleSaveVoice = async () => {
    setSaving(true)
    try {
      await api.updateSettings({
        tts_base_url: form.tts_base_url,
        asr_base_url: form.asr_base_url,
        dictation_lang: form.dictation_lang,
      })
    } catch (err) {
      console.error('Save failed:', err)
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleResetVoice = async () => {
    try {
      const s = await api.getSettings()
      setForm({
        tts_base_url: s.tts_base_url || '',
        asr_base_url: s.asr_base_url || '',
        dictation_lang: s.dictation_lang || 'zh-CN',
      })
    } catch (err) { console.error('Reset failed:', err) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '40px',
    padding: '0 14px',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    border: '0.5px solid var(--dsw-alias-border-l4)',
    backgroundColor: 'var(--dsw-alias-bg-layer-3)',
    fontSize: '13px',
    color: 'var(--dsw-alias-label-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 150ms',
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--dsw-alias-state-business-primary)'
    e.currentTarget.style.boxShadow = 'inset 0 0 0 0.5px var(--dsw-alias-state-business-primary)'
  }
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--dsw-alias-border-l4)'
    e.currentTarget.style.boxShadow = 'none'
  }

  // Render as DSH modal panel (800x800, centered overlay)
  return createPortal((
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} role="presentation">
      {/* Mask */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'var(--dsw-alias-bg-mask-1)',
          backdropFilter: 'var(--dsw-mask-blur, blur(20px))',
        }}
        aria-hidden="true"
        onClick={handleClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative', zIndex: 1,
          display: 'flex',
          width: '800px',
          height: 'min(800px, calc(100vh - 48px))',
          maxWidth: 'calc(100vw - 48px)',
          borderRadius: 'var(--dsw-radius-panel, 16px)',
          overflow: 'hidden',
          background: 'var(--dsw-alias-bg-layer-2)',
          boxShadow: 'var(--dsw-elevation-prominent)',
          '--dsh-scrollbar-thumb': 'var(--dsw-alias-scrollbar-bg-l2)',
          '--dsh-scrollbar-thumb-hover': 'var(--dsw-alias-scrollbar-hover-l2)',
          outline: 'none',
        } as React.CSSProperties}
      >
        {/* ═══ Nav Rail — DSH 188px ═══ */}
        <nav style={{
          flex: 'none',
          display: 'flex', flexDirection: 'column',
          gap: '18px',
          width: '188px',
          padding: '22px 12px 0',
          boxSizing: 'border-box',
        }}>
          <div style={{
            padding: '0 12px',
            fontSize: '16px', lineHeight: '24px',
            fontWeight: 500,
            color: 'var(--dsw-alias-label-primary)',
          }}>设置</div>
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: '4px', overflowY: 'auto',
          }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    height: '40px',
                    padding: '9px 16px 9px 12px',
                    boxSizing: 'border-box',
                    border: 'none',
                    borderRadius: 'var(--dsw-radius-md, 8px)',
                    background: isActive ? 'var(--dsw-specific-sidebar-nav-item-active, var(--dsw-alias-interactive-bg-hover))' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '14px', lineHeight: '22px',
                    fontWeight: isActive ? 500 : 400,
                    color: 'var(--dsw-alias-label-primary)',
                    textAlign: 'left',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--dsw-specific-sidebar-nav-item-hover, var(--dsw-alias-interactive-bg-hover))' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--dsw-specific-sidebar-nav-item-active, var(--dsw-alias-interactive-bg-hover))' : 'transparent' }}
                >
                  <tab.icon size={16} style={{ flex: 'none' }} />
                  <span style={{
                    flex: 1, minWidth: 0,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* ═══ Content Column ═══ */}
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            flex: 'none',
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
            height: '54px',
            padding: '20px 14px 8px 10px',
            boxSizing: 'border-box',
          }}>
            <div style={{
              fontSize: '14px', fontWeight: 500,
              color: 'var(--dsw-alias-label-primary)',
              lineHeight: '26px',
            }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </div>
            <button
              onClick={handleClose}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px',
                border: 'none',
                borderRadius: 'var(--dsw-radius-sm, 6px)',
                padding: 0, background: 'transparent',
                cursor: 'pointer',
                color: 'var(--dsw-alias-label-primary)',
                transition: 'background 100ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="关闭"
            >
              <X size={14} />
            </button>
          </div>

          {/* Options area */}
          <div style={{
            flex: 1, minHeight: 0,
            padding: '0 24px 24px',
            overflowY: 'auto',
          }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <Loader2 style={{ width: '24px', height: '24px', color: 'var(--dsw-alias-label-tertiary)' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {activeTab === 'general' && (
                  <>
                    <SectionTitle>回答偏好</SectionTitle>
                    <p style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)', margin: 0 }}>
                      本轮明确要求优先于偏好；偏好优先于默认 concise。保存使用 revision CAS。
                    </p>
                    <SettingRow label="详细程度">
                      <select
                        value={prefDetail}
                        onChange={(e) => setPrefDetail(e.target.value as typeof prefDetail)}
                        style={{ ...inputStyle, cursor: 'pointer', height: '36px' }}
                      >
                        <option value="concise">简洁 (concise)</option>
                        <option value="standard">标准 (standard)</option>
                        <option value="detailed">详细 (detailed)</option>
                      </select>
                    </SettingRow>
                    <SectionTitle>任务预算</SectionTitle>
                    <p style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)', margin: 0 }}>
                      0 表示不限制。超预算应产出部分结果，而不是长篇失败解释。
                    </p>
                    <SettingRow label="Token 预算">
                      <input
                        type="number"
                        min={0}
                        value={tokenBudget}
                        onChange={(e) => setTokenBudget(Number(e.target.value) || 0)}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                    </SettingRow>
                    <SettingRow label="时间预算 (秒)">
                      <input
                        type="number"
                        min={0}
                        value={timeBudgetS}
                        onChange={(e) => setTimeBudgetS(Number(e.target.value) || 0)}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                    </SettingRow>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={prefSaving}
                        onClick={async () => {
                          setPrefSaving(true)
                          setLoadError('')
                          try {
                            const res = await api.appResponsePreferencesPut({
                              detail: prefDetail,
                              token_budget: tokenBudget,
                              time_budget_s: timeBudgetS,
                              expected_revision: prefRevision,
                            })
                            const data = (res as {
                              data?: {
                                revision?: string
                                detail?: string
                                token_budget?: number
                                time_budget_s?: number
                              }
                            })?.data
                              ?? (res as {
                                revision?: string
                                detail?: string
                                token_budget?: number
                                time_budget_s?: number
                              })
                            if (data?.revision) setPrefRevision(data.revision)
                            if (data?.detail === 'standard' || data?.detail === 'detailed' || data?.detail === 'concise') {
                              setPrefDetail(data.detail)
                            }
                            if (typeof data?.token_budget === 'number') setTokenBudget(data.token_budget)
                            if (typeof data?.time_budget_s === 'number') setTimeBudgetS(data.time_budget_s)
                          } catch (err) {
                            setLoadError(err instanceof Error ? err.message : String(err))
                          } finally {
                            setPrefSaving(false)
                          }
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          height: 32, padding: '0 12px', border: 'none',
                          borderRadius: 'var(--dsw-radius-sm, 6px)',
                          background: 'var(--dsw-alias-state-business-primary)',
                          color: 'var(--dsw-alias-label-on-color, #fff)',
                          cursor: prefSaving ? 'wait' : 'pointer',
                          fontSize: 13,
                        }}
                      >
                        {prefSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        保存回答偏好
                      </button>
                      <span style={{ fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' }}>
                        rev {prefRevision.slice(0, 18)}…
                      </span>
                    </div>
                    <SectionTitle>外观</SectionTitle>
                    <SettingRow label="主题">
                      <select style={{ ...inputStyle, cursor: 'pointer', height: '36px' }}>
                        <option value="dark">深色</option>
                        <option value="light">浅色</option>
                        <option value="system">跟随系统</option>
                      </select>
                    </SettingRow>
                    <SettingRow label="字体大小">
                      <select style={{ ...inputStyle, cursor: 'pointer', height: '36px' }}>
                        <option value="13">小 (13px)</option>
                        <option value="14">默认 (14px)</option>
                        <option value="15">大 (15px)</option>
                        <option value="16">特大 (16px)</option>
                      </select>
                    </SettingRow>
                    <SectionTitle>快捷键</SectionTitle>
                    <SettingRow label="新建对话">
                      <KbdLabel>⌘ N</KbdLabel>
                    </SettingRow>
                    <SettingRow label="设置">
                      <KbdLabel>⌘ ,</KbdLabel>
                    </SettingRow>
                  </>
                )}

                {activeTab === 'models' && <ProviderModelPanes />}

                {activeTab === 'plugins' && (
                  <>
                    <SectionTitle>插件管理</SectionTitle>
                    <div style={{
                      padding: '24px', textAlign: 'center',
                      borderRadius: 'var(--dsw-radius-lg, 10px)',
                      border: '0.5px solid var(--dsw-alias-border-l3)',
                      color: 'var(--dsw-alias-label-tertiary)',
                      fontSize: '13px',
                    }}>
                      <Plug size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      <div>前往插件管理页面查看和管理已安装的插件</div>
                    </div>
                  </>
                )}

                {activeTab === 'voice' && (
                  <>
                    <SectionTitle>语音配置</SectionTitle>
                    <p style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)', margin: 0 }}>
                      语音（ASR/TTS）可选，可不启用；留空不影响聊天与工程预检。
                    </p>
                    <SettingRow label="TTS Base URL">
                      <input
                        type="text"
                        value={form.tts_base_url}
                        onChange={(e) => setForm({ ...form, tts_base_url: e.target.value })}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="留空 = 不启用语音合成"
                      />
                    </SettingRow>
                    <SettingRow label="ASR Base URL">
                      <input
                        type="text"
                        value={form.asr_base_url}
                        onChange={(e) => setForm({ ...form, asr_base_url: e.target.value })}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="留空 = 不启用语音识别"
                      />
                    </SettingRow>
                    <SettingRow label="语音识别语言">
                      <select
                        value={form.dictation_lang}
                        onChange={(e) => setForm({ ...form, dictation_lang: e.target.value })}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="zh-CN">中文（普通话）</option>
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="auto">跟随浏览器</option>
                      </select>
                    </SettingRow>
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                      <PrimaryButton onClick={handleSaveVoice} disabled={saving}>
                        {saving ? <Loader2 size={14} /> : <Save size={14} />}
                        保存语音设置
                      </PrimaryButton>
                      <SecondaryButton onClick={handleResetVoice}>
                        <RotateCcw size={14} />
                        重置
                      </SecondaryButton>
                    </div>
                    {loadError && <p style={{ fontSize: 12, color: '#f87171' }}>{loadError}</p>}
                  </>
                )}

                {activeTab === 'memory' && <ProfileItemsTab />}

                {activeTab === 'account' && (
                  <>
                    <SectionTitle>账户信息</SectionTitle>
                    <div style={{
                      padding: '24px', textAlign: 'center',
                      borderRadius: 'var(--dsw-radius-lg, 10px)',
                      border: '0.5px solid var(--dsw-alias-border-l3)',
                      color: 'var(--dsw-alias-label-tertiary)',
                      fontSize: '13px',
                    }}>
                      <User size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      <div>账户管理功能 [开发中]</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ), document.body)
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '14px', fontWeight: 500,
      lineHeight: '20px',
      color: 'var(--dsw-alias-label-primary)',
      paddingTop: '4px',
    }}>{children}</div>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontSize: '13px', lineHeight: '20px',
        color: 'var(--dsw-alias-label-secondary)',
      }}>{label}</label>
      {children}
    </div>
  )
}

function KbdLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 'var(--dsw-radius-sm, 6px)',
      background: 'var(--dsw-alias-bg-layer-3)',
      fontSize: '12px',
      fontFamily: 'var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
      color: 'var(--dsw-alias-label-secondary)',
    }}>{children}</span>
  )
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        height: '32px', padding: '0 12px',
        border: 'none',
        borderRadius: 'var(--dsw-radius-md, 8px)',
        background: 'var(--dsw-alias-button-primary-fill, var(--dsw-alias-state-business-primary))',
        color: '#fff', fontSize: '13px', fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 100ms',
      }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        height: '32px', padding: '0 12px',
        border: '0.5px solid var(--dsw-alias-border-l3)',
        borderRadius: 'var(--dsw-radius-md, 8px)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: '13px', cursor: 'pointer',
        transition: 'background 100ms',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </button>
  )
}

function ProfileItemsTab() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([])
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [busyId, setBusyId] = useState('')

  const refresh = () => {
    // status=all so proposed / forgotten remain auditable (design §10.2).
    api.appProfileItems({ status: 'all' }).then((res) => {
      const data = (res as { data?: unknown[] }).data ?? (Array.isArray(res) ? res : [])
      setItems(data as Array<Record<string, unknown>>)
    }).catch((e) => setMsg(String(e)))
  }
  useEffect(() => { refresh() }, [])

  const propose = async () => {
    if (!text.trim()) return
    try {
      await api.appProfilePropose({ text: text.trim(), scope: 'user', category: 'preference' })
      setText('')
      setMsg('已提出待确认条目（未确认不会注入上下文）')
      refresh()
    } catch (e) {
      setMsg(String(e))
    }
  }

  const setStatus = async (id: string, status: 'confirmed' | 'rejected' | 'forgotten' | 'proposed') => {
    setBusyId(id)
    try {
      await api.appProfileSetStatus({ id, status })
      setMsg(
        status === 'forgotten'
          ? '已忘记该记忆（保留审计；不会再注入上下文）'
          : status === 'confirmed'
            ? '已确认，将可注入下一轮上下文'
            : `状态已更新为 ${status}`,
      )
      refresh()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusyId('')
    }
  }

  return (
    <>
      <SectionTitle>用户画像条目</SectionTitle>
      <p style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}>
        仅 status=confirmed 且作用域匹配的条目会进入下一轮上下文。来源可审阅；忘记后仍保留记录。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {items.map((it) => {
          const id = String(it.id || '')
          const status = String(it.status || '')
          const source = it.source_refs ? String(it.source_refs) : ''
          return (
            <div key={id} style={{ border: '0.5px solid var(--dsw-alias-border-l3)', borderRadius: 8, padding: 10, fontSize: 13 }}>
              <div>
                <strong>{status}</strong> · {String(it.scope)} · {String(it.category)}
                {it.revision != null ? ` · rev ${String(it.revision)}` : ''}
              </div>
              <div style={{ marginTop: 4 }}>{String(it.text)}</div>
              {source && source !== '[]' && (
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' }}>
                  来源：{source}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {status === 'proposed' && (
                  <>
                    <button type="button" disabled={busyId === id} onClick={() => void setStatus(id, 'confirmed')} style={{ fontSize: 12 }}>确认</button>
                    <button type="button" disabled={busyId === id} onClick={() => void setStatus(id, 'rejected')} style={{ fontSize: 12 }}>拒绝</button>
                  </>
                )}
                {status !== 'forgotten' && (
                  <button type="button" disabled={busyId === id} onClick={() => void setStatus(id, 'forgotten')} style={{ fontSize: 12 }}>
                    忘记
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {!items.length && <div style={{ fontSize: 13, color: 'var(--dsw-alias-label-tertiary)' }}>暂无画像条目</div>}
      </div>
      <SettingRow label="提出新偏好（待确认）">
        <input value={text} onChange={(e) => setText(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '0.5px solid var(--dsw-alias-border-l3)' }} />
      </SettingRow>
      <PrimaryButton onClick={propose}><Save size={14} /> 提出</PrimaryButton>
      {msg && <p style={{ fontSize: 12 }}>{msg}</p>}
    </>
  )
}
