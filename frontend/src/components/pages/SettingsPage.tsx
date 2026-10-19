import { useEffect, useState } from 'react'
import { api, type Profile } from '@/lib/api'
import { cn } from '@/lib/utils'
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
  const [profile, setProfile] = useState<Profile | null>(null)
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
      setProfile(p)
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
    try {
      await api.updateProfile(form)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      await api.resetProfile()
      const p = await api.getProfile()
      setProfile(p)
      setForm({
        llm_base_url: p.llm_base_url || '',
        api_key: p.api_key || '',
        model: p.model || '',
        tts_base_url: p.tts_base_url || '',
        asr_base_url: p.asr_base_url || '',
        dictation_lang: p.dictation_lang || 'zh-CN',
      })
    } catch (err) {
      console.error('Reset failed:', err)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-6">
        <h1 className="text-lg font-semibold">设置</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tab sidebar */}
        <div className="w-48 shrink-0 border-r border-border p-3">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50',
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mx-auto max-w-lg space-y-6">
              {activeTab === 'llm' && (
                <>
                  <Field label="API Base URL" placeholder="https://api.openai.com/v1">
                    <input
                      type="text"
                      value={form.llm_base_url}
                      onChange={(e) => setForm({ ...form, llm_base_url: e.target.value })}
                      className="settings-input"
                    />
                  </Field>
                  <Field label="API Key">
                    <input
                      type="password"
                      value={form.api_key}
                      onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                      className="settings-input"
                    />
                  </Field>
                  <Field label="Model">
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      className="settings-input"
                      placeholder="gpt-4o"
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
                      className="settings-input"
                    />
                  </Field>
                  <Field label="ASR Base URL">
                    <input
                      type="text"
                      value={form.asr_base_url}
                      onChange={(e) => setForm({ ...form, asr_base_url: e.target.value })}
                      className="settings-input"
                    />
                  </Field>
                  <Field label="语音识别语言">
                    <select
                      value={form.dictation_lang}
                      onChange={(e) => setForm({ ...form, dictation_lang: e.target.value })}
                      className="settings-input"
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
                <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                  <Plug className="mx-auto mb-3 h-8 w-8 opacity-40" />
                  <p>MCP 服务管理</p>
                  <p className="mt-1 text-xs">通过配置文件管理 MCP 服务接入</p>
                </div>
              )}

              {activeTab === 'openai' && (
                <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                  <Globe className="mx-auto mb-3 h-8 w-8 opacity-40" />
                  <p>OpenAI 兼容网关</p>
                  <p className="mt-1 text-xs">/v1/chat/completions 端点配置</p>
                </div>
              )}

              {activeTab === 'memory' && (
                <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                  <Database className="mx-auto mb-3 h-8 w-8 opacity-40" />
                  <p>记忆管理</p>
                  <p className="mt-1 text-xs">知识库与记忆系统的管理入口</p>
                </div>
              )}

              {/* Save / Reset buttons */}
              {(activeTab === 'llm' || activeTab === 'voice') && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    保存
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <RotateCcw className="h-4 w-4" />
                    重置
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline styles for settings inputs */}
      <style>{`
        .settings-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--muted);
          font-size: 0.875rem;
          outline: none;
          transition: border-color 150ms, background 150ms;
        }
        .settings-input:focus {
          border-color: var(--ring);
          background: var(--background);
        }
      `}</style>
    </div>
  )
}

function Field({ label, placeholder, children }: {
  label: string
  placeholder?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
