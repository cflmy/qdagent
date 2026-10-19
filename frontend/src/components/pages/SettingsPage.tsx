import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Brain, Mic, Plug, Globe, Database,
  Save, RotateCcw, Loader2,
} from 'lucide-react'

type Tab = 'llm' | 'voice' | 'mcp' | 'openai' | 'memory'

const tabs: { id: Tab; label: string; icon: typeof Brain }[] = [
  { id: 'llm', label: '大模型', icon: Brain },
  { id: 'voice', label: '语音', icon: Mic },
  { id: 'mcp', label: 'MCP', icon: Plug },
  { id: 'openai', label: 'OpenAI', icon: Globe },
  { id: 'memory', label: '记忆', icon: Database },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('llm')
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

  useEffect(() => {
    api.getProfile().then((p) => {
      setForm({
        llm_base_url: p.llm_base_url || '',
        api_key: p.api_key || '',
        model: p.model || '',
        tts_base_url: p.tts_base_url || '',
        asr_base_url: p.asr_base_url || '',
        dictation_lang: p.dictation_lang || 'zh-CN',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try { await api.updateProfile(form) } catch (err) { console.error('Save failed:', err) }
    finally { setSaving(false) }
  }

  const handleReset = async () => {
    try {
      await api.resetProfile()
      const p = await api.getProfile()
      setForm({
        llm_base_url: p.llm_base_url || '',
        api_key: p.api_key || '',
        model: p.model || '',
        tts_base_url: p.tts_base_url || '',
        asr_base_url: p.asr_base_url || '',
        dictation_lang: p.dictation_lang || 'zh-CN',
      })
    } catch (err) { console.error('Reset failed:', err) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--dsw-alias-border-l2)',
    backgroundColor: 'var(--dsw-specific-input-major)',
    fontSize: '14px',
    color: 'var(--dsw-alias-label-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 150ms, background-color 150ms',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid var(--dsw-alias-border-l2)',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>设置</h1>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Tab sidebar */}
        <div style={{
          width: '192px',
          flexShrink: 0,
          borderRight: '1px solid var(--dsw-alias-border-l2)',
          padding: '12px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--dsw-specific-sidebar-nav-item-active)' : 'transparent',
                    color: isActive ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
                    fontSize: '14px',
                    fontWeight: isActive ? 500 : 400,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 150ms',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--dsw-specific-sidebar-nav-item-hover)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <tab.icon style={{ width: '16px', height: '16px' }} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
              <Loader2 style={{ width: '24px', height: '24px', color: 'var(--dsw-alias-label-tertiary)' }} />
            </div>
          ) : (
            <div style={{ maxWidth: '512px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {activeTab === 'llm' && (
                <>
                  <Field label="API Base URL">
                    <input
                      type="text"
                      value={form.llm_base_url}
                      onChange={(e) => setForm({ ...form, llm_base_url: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-static-deepseek-500)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-alias-border-l2)' }}
                    />
                  </Field>
                  <Field label="API Key">
                    <input
                      type="password"
                      value={form.api_key}
                      onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-static-deepseek-500)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-alias-border-l2)' }}
                    />
                  </Field>
                  <Field label="Model">
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      placeholder="gpt-4o"
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-static-deepseek-500)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-alias-border-l2)' }}
                    />
                  </Field>
                </>
              )}

              {activeTab === 'voice' && (
                <>
                  <Field label="TTS Base URL">
                    <input
                      type="text"
                      value={form.tts_base_url}
                      onChange={(e) => setForm({ ...form, tts_base_url: e.target.value })}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-static-deepseek-500)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-alias-border-l2)' }}
                    />
                  </Field>
                  <Field label="ASR Base URL">
                    <input
                      type="text"
                      value={form.asr_base_url}
                      onChange={(e) => setForm({ ...form, asr_base_url: e.target.value })}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-static-deepseek-500)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--dsw-alias-border-l2)' }}
                    />
                  </Field>
                  <Field label="语音识别语言">
                    <select
                      value={form.dictation_lang}
                      onChange={(e) => setForm({ ...form, dictation_lang: e.target.value })}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      <option value="zh-CN">中文（普通话）</option>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="zh-TW">中文（台湾）</option>
                      <option value="auto">跟随浏览器</option>
                    </select>
                  </Field>
                </>
              )}

              {activeTab === 'mcp' && (
                <div style={{
                  borderRadius: '12px',
                  border: '1px solid var(--dsw-alias-border-l2)',
                  padding: '24px',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: 'var(--dsw-alias-label-tertiary)',
                }}>
                  <Plug style={{ width: '32px', height: '32px', margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>MCP 服务管理</p>
                  <p style={{ marginTop: '4px', fontSize: '12px' }}>通过配置文件管理 MCP 服务接入</p>
                </div>
              )}

              {activeTab === 'openai' && (
                <div style={{
                  borderRadius: '12px',
                  border: '1px solid var(--dsw-alias-border-l2)',
                  padding: '24px',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: 'var(--dsw-alias-label-tertiary)',
                }}>
                  <Globe style={{ width: '32px', height: '32px', margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>OpenAI 兼容网关</p>
                  <p style={{ marginTop: '4px', fontSize: '12px' }}>/v1/chat/completions 端点配置</p>
                </div>
              )}

              {activeTab === 'memory' && (
                <div style={{
                  borderRadius: '12px',
                  border: '1px solid var(--dsw-alias-border-l2)',
                  padding: '24px',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: 'var(--dsw-alias-label-tertiary)',
                }}>
                  <Database style={{ width: '32px', height: '32px', margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>记忆管理</p>
                  <p style={{ marginTop: '4px', fontSize: '12px' }}>知识库与记忆系统的管理入口</p>
                </div>
              )}

              {/* Save / Reset buttons */}
              {(activeTab === 'llm' || activeTab === 'voice') && (
                <div style={{ display: 'flex', gap: '12px', paddingTop: '16px' }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--dsw-alias-button-primary-fill)',
                      color: 'var(--dsw-alias-label-primary-foreground)',
                      fontSize: '14px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    {saving ? <Loader2 style={{ width: '16px', height: '16px' }} /> : <Save style={{ width: '16px', height: '16px' }} />}
                    保存
                  </button>
                  <button
                    onClick={handleReset}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--dsw-alias-border-l2)',
                      backgroundColor: 'transparent',
                      color: 'var(--dsw-alias-label-secondary)',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--dsw-specific-sidebar-nav-item-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <RotateCcw style={{ width: '16px', height: '16px' }} />
                    重置
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' }}>{label}</label>
      {children}
    </div>
  )
}
