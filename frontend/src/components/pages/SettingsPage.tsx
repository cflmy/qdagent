import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { createPortal } from 'react-dom'
import {
  Brain, Mic, Plug, Globe, Database,
  Save, RotateCcw, Loader2, X,
  User, Cpu, Palette, Keyboard,
} from 'lucide-react'

type Tab = 'general' | 'models' | 'plugins' | 'voice' | 'memory' | 'account'

const tabs: { id: Tab; label: string; icon: typeof Brain }[] = [
  { id: 'general', label: '通用', icon: Palette },
  { id: 'models', label: '模型', icon: Cpu },
  { id: 'plugins', label: '插件', icon: Plug },
  { id: 'voice', label: '语音', icon: Mic },
  { id: 'memory', label: '记忆', icon: Database },
  { id: 'account', label: '账户', icon: User },
]

type ProviderRow = {
  id: string
  display_name: string
  adapter: string
  base_url?: string
  credential_configured?: boolean
  models?: Array<{ id: string; display_name: string; upstream_model_id: string; enabled?: number }>
}

type ProfileItem = {
  id: string
  text: string
  scope: string
  status: string
  category?: string
}

export function SettingsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    llm_base_url: '',
    api_key: '',
    model: '',
    tts_base_url: '',
    asr_base_url: '',
    dictation_lang: 'zh-CN',
  })
  // Whether a key is already stored server-side (the value itself is never sent back).
  const [keySet, setKeySet] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [newModelName, setNewModelName] = useState('')
  const [profileItems, setProfileItems] = useState<ProfileItem[]>([])
  const [proposeText, setProposeText] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  const refreshProviders = () => {
    api.appProviders().then((res) => {
      const list = (res as { providers?: ProviderRow[] }).providers
        ?? (res as { data?: ProviderRow[] }).data
        ?? []
      setProviders(Array.isArray(list) ? list : [])
    }).catch(() => setProviders([]))
  }

  const refreshProfile = () => {
    api.appProfileItems({}).then((res) => {
      const data = (res as { data?: ProfileItem[]; items?: ProfileItem[] }).items
        ?? (res as { data?: ProfileItem[] }).data
        ?? []
      setProfileItems(Array.isArray(data) ? data : [])
    }).catch(() => setProfileItems([]))
  }

  useEffect(() => {
    api.getSettings().then((s) => {
      setForm({
        llm_base_url: s.llm_base_url || '',
        api_key: '',
        model: s.llm_model || '',
        tts_base_url: s.tts_base_url || '',
        asr_base_url: s.asr_base_url || '',
        dictation_lang: s.dictation_lang || 'zh-CN',
      })
      setKeySet(Boolean(s.llm_api_key_set))
    }).catch((err) => {
      setLoadError(err instanceof Error ? err.message : String(err))
    }).finally(() => setLoading(false))
    refreshProviders()
    refreshProfile()
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

  const handleSave = async () => {
    setSaving(true)
    try {
      const patch: Record<string, string> = {
        llm_base_url: form.llm_base_url,
        llm_model: form.model,
        tts_base_url: form.tts_base_url,
        asr_base_url: form.asr_base_url,
        dictation_lang: form.dictation_lang,
      }
      // Only send the key when the user actually typed a new one.
      if (form.api_key) patch.llm_api_key = form.api_key
      await api.updateSettings(patch)
      const s = await api.getSettings()
      setKeySet(Boolean(s.llm_api_key_set))
      setForm((f) => ({ ...f, api_key: '' }))
    } catch (err) {
      console.error('Save failed:', err)
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      const s = await api.getSettings()
      setForm({
        llm_base_url: s.llm_base_url || '',
        api_key: '',
        model: s.llm_model || '',
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

                {activeTab === 'models' && (
                  <ModelsRegistryTab
                    llmBase={form.llm_base_url}
                    apiKey={form.api_key}
                    model={form.model}
                    setLlmBase={(v) => setForm({ ...form, llm_base_url: v })}
                    setApiKey={(v) => setForm({ ...form, api_key: v })}
                    setModel={(v) => setForm({ ...form, model: v })}
                    keySet={keySet}
                    loadError={loadError}
                    inputStyle={inputStyle}
                    handleFocus={handleFocus}
                    handleBlur={handleBlur}
                    handleSave={handleSave}
                    handleReset={handleReset}
                    saving={saving}
                  />
                )}

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
                    <SettingRow label="TTS Base URL">
                      <input
                        type="text"
                        value={form.tts_base_url}
                        onChange={(e) => setForm({ ...form, tts_base_url: e.target.value })}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
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
                      <PrimaryButton onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 size={14} /> : <Save size={14} />}
                        保存
                      </PrimaryButton>
                      <SecondaryButton onClick={handleReset}>
                        <RotateCcw size={14} />
                        重置
                      </SecondaryButton>
                    </div>
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

/** Q01 provider/model registry — also keeps legacy single-row settings editable. */
function ModelsRegistryTab(props: {
  llmBase: string
  apiKey: string
  model: string
  setLlmBase: (v: string) => void
  setApiKey: (v: string) => void
  setModel: (v: string) => void
  keySet: boolean
  loadError: string
  inputStyle: React.CSSProperties
  handleFocus: (e: React.FocusEvent<HTMLInputElement>) => void
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void
  handleSave: () => void
  handleReset: () => void
  saving: boolean
}) {
  const [providers, setProviders] = useState<Array<Record<string, unknown>>>([])
  const [name, setName] = useState('本地兼容端点')
  const [base, setBase] = useState('http://127.0.0.1:11434/v1')
  const [cred, setCred] = useState('')
  const [upstream, setUpstream] = useState('llama3.2')
  const [msg, setMsg] = useState('')

  const refresh = () => {
    api.appProviders().then((res) => {
      const list = (res as { providers?: unknown[]; data?: unknown[] }).providers
        ?? (res as { data?: unknown[] }).data
        ?? []
      setProviders(list as Array<Record<string, unknown>>)
    }).catch((e) => setMsg(String(e)))
  }
  useEffect(() => { refresh() }, [])

  const addProvider = async () => {
    setMsg('')
    try {
      const saved = await api.appProvidersSave({
        display_name: name,
        adapter: 'openai-compatible',
        base_url: base,
        auth_mode: cred ? 'api_key' : 'none',
        credential_action: cred ? 'replace' : 'keep',
        credential: cred || undefined,
        enabled: 1,
      }) as { id?: string; ok?: boolean }
      const pid = (saved as { id?: string }).id
      if (pid) {
        await api.appModelsSave({
          provider_id: pid,
          upstream_model_id: upstream,
          display_name: upstream,
          enabled: 1,
        })
      }
      setMsg('已保存提供商与模型')
      refresh()
    } catch (e) {
      setMsg(String(e))
    }
  }

  return (
    <>
      <SectionTitle>提供商与模型</SectionTitle>
      <p style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)', marginTop: 0 }}>
        一个提供商可有多个模型；密钥不会回显。旧版单行设置仍可在下方兼容编辑。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {providers.map((p) => (
          <div key={String(p.id)} style={{ border: '0.5px solid var(--dsw-alias-border-l3)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 500 }}>{String(p.display_name)} · {String(p.adapter)}</div>
            <div style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}>{String(p.base_url)}</div>
            <div style={{ fontSize: 12 }}>
              凭证：{p.credential_configured ? '已配置' : '未配置'} · 模型 {(p.models as unknown[] | undefined)?.length ?? 0} 个
            </div>
          </div>
        ))}
        {!providers.length && <div style={{ fontSize: 13, color: 'var(--dsw-alias-label-tertiary)' }}>尚无提供商（将从旧 settings 迁移，或在下方新建）</div>}
      </div>
      <SettingRow label="新建提供商名称">
        <input value={name} onChange={(e) => setName(e.target.value)} style={props.inputStyle} />
      </SettingRow>
      <SettingRow label="Base URL">
        <input value={base} onChange={(e) => setBase(e.target.value)} style={props.inputStyle} />
      </SettingRow>
      <SettingRow label="API Key（可选）">
        <input type="password" value={cred} onChange={(e) => setCred(e.target.value)} style={props.inputStyle} placeholder="无密钥本地端点可留空" />
      </SettingRow>
      <SettingRow label="首个上游模型 id">
        <input value={upstream} onChange={(e) => setUpstream(e.target.value)} style={props.inputStyle} />
      </SettingRow>
      <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
        <PrimaryButton onClick={addProvider}><Save size={14} /> 添加提供商</PrimaryButton>
      </div>
      {msg && <p style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}>{msg}</p>}

      <SectionTitle>兼容：旧版单行设置</SectionTitle>
      <SettingRow label="API Base URL">
        <input type="text" value={props.llmBase} onChange={(e) => props.setLlmBase(e.target.value)} placeholder="https://api.openai.com/v1" style={props.inputStyle} onFocus={props.handleFocus} onBlur={props.handleBlur} />
      </SettingRow>
      <SettingRow label="API Key">
        <input type="password" value={props.apiKey} onChange={(e) => props.setApiKey(e.target.value)} placeholder={props.keySet ? '已配置（留空则保持不变）' : '尚未配置，请填写'} style={props.inputStyle} onFocus={props.handleFocus} onBlur={props.handleBlur} />
      </SettingRow>
      <SettingRow label="模型名称">
        <input type="text" value={props.model} onChange={(e) => props.setModel(e.target.value)} placeholder="gpt-4o" style={props.inputStyle} onFocus={props.handleFocus} onBlur={props.handleBlur} />
      </SettingRow>
      <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
        <PrimaryButton onClick={props.handleSave} disabled={props.saving}>{props.saving ? <Loader2 size={14} /> : <Save size={14} />} 保存旧设置</PrimaryButton>
        <SecondaryButton onClick={props.handleReset}><RotateCcw size={14} /> 重置</SecondaryButton>
      </div>
      {props.loadError && <p style={{ fontSize: 12, color: '#f87171' }}>{props.loadError}</p>}
    </>
  )
}

function ProfileItemsTab() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([])
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  const refresh = () => {
    api.appProfileItems({}).then((res) => {
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

  return (
    <>
      <SectionTitle>用户画像条目</SectionTitle>
      <p style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}>
        仅 status=confirmed 且作用域匹配的条目会进入下一轮上下文。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {items.map((it) => (
          <div key={String(it.id)} style={{ border: '0.5px solid var(--dsw-alias-border-l3)', borderRadius: 8, padding: 10, fontSize: 13 }}>
            <div><strong>{String(it.status)}</strong> · {String(it.scope)} · {String(it.category)}</div>
            <div>{String(it.text)}</div>
          </div>
        ))}
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
