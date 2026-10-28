import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Shield, BookOpen, Zap, GitBranch, Loader2, RefreshCw,
  CheckCircle, XCircle, ArrowUpCircle,
} from 'lucide-react'
import { MarkdownBody } from '@/components/markdown/MarkdownBody'

type Tab = 'preflight' | 'workbook' | 'capability' | 'candidates'

const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
  { id: 'preflight', label: '预检', icon: Shield },
  { id: 'workbook', label: '工作簿', icon: BookOpen },
  { id: 'capability', label: '能力', icon: Zap },
  { id: 'candidates', label: '候选', icon: GitBranch },
]

export function EngPage() {
  const [activeTab, setActiveTab] = useState<Tab>('preflight')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid var(--dsw-alias-border-l2)',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>工程中心</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--dsw-alias-border-l2)', flexShrink: 0, padding: '0 24px' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderBottom: isActive ? '2px solid var(--dsw-alias-button-primary-fill)' : '2px solid transparent',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottomWidth: '2px',
                borderBottomStyle: 'solid',
                borderBottomColor: isActive ? 'var(--dsw-alias-button-primary-fill)' : 'transparent',
                color: isActive ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
                fontSize: '14px',
                fontWeight: isActive ? 500 : 400,
                cursor: 'pointer',
                transition: 'color 150ms',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--dsw-alias-label-primary)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--dsw-alias-label-secondary)' }}
            >
              <tab.icon style={{ width: '16px', height: '16px' }} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'preflight' && <PreflightPanel />}
        {activeTab === 'workbook' && <WorkbookPanel />}
        {activeTab === 'capability' && <CapabilityPanel />}
        {activeTab === 'candidates' && <CandidatesPanel />}
      </div>
    </div>
  )
}

function PanelWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: '768px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dsw-alias-label-secondary)', marginBottom: '24px' }}>{title}</h2>
      {children}
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <Loader2 style={{ width: '24px', height: '24px', color: 'var(--dsw-alias-label-secondary)' }} />
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof BookOpen; text: string }) {
  return (
    <div style={{ padding: '80px 0', textAlign: 'center', fontSize: '14px', color: 'var(--dsw-alias-label-secondary)' }}>
      <Icon style={{ width: '32px', height: '32px', margin: '0 auto 12px', opacity: 0.4 }} />
      {text}
    </div>
  )
}

function PreflightPanel() {
  const [metrics, setMetrics] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.engMetrics().then(setMetrics).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const refresh = () => {
    setLoading(true)
    api.engMetrics().then(setMetrics).catch(() => {}).finally(() => setLoading(false))
  }

  return (
    <PanelWrapper title="工程预检仪表盘">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <button
          onClick={refresh}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--dsw-alias-border-l2)',
            backgroundColor: 'transparent',
            color: 'var(--dsw-alias-label-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--dsw-alias-bg-layer-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <RefreshCw style={{ width: '14px', height: '14px' }} />
          刷新
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : metrics ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {Object.entries(metrics as Record<string, unknown>).map(([key, val]) => (
            <div key={key} style={{ borderRadius: '12px', border: '1px solid var(--dsw-alias-border-l2)', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', margin: 0 }}>{key}</p>
              <p style={{ marginTop: '4px', fontSize: '24px', fontWeight: 600, margin: 0 }}>{String(val)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '80px 0', textAlign: 'center', fontSize: '14px', color: 'var(--dsw-alias-label-secondary)' }}>
          暂无工程指标数据
        </div>
      )}
    </PanelWrapper>
  )
}

function WorkbookPanel() {
  const [workbooks, setWorkbooks] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.engWorkbooks().then((data) => {
      setWorkbooks(Array.isArray(data) ? data : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <PanelWrapper title="工程工作簿">
      {loading ? (
        <LoadingState />
      ) : workbooks.length === 0 ? (
        <EmptyState icon={BookOpen} text="暂无工作簿" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {workbooks.map((wb, i) => (
            <div key={i} style={{ borderRadius: '12px', border: '1px solid var(--dsw-alias-border-l2)', padding: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>
                {String((wb as Record<string, unknown>).id || `工作簿 #${i + 1}`)}
              </p>
            </div>
          ))}
        </div>
      )}
    </PanelWrapper>
  )
}

function CapabilityPanel() {
  const [capabilities, setCapabilities] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.engCapability().then((data) => {
      setCapabilities(Array.isArray(data) ? data : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <PanelWrapper title="能力矩阵">
      {loading ? (
        <LoadingState />
      ) : capabilities.length === 0 ? (
        <EmptyState icon={Zap} text="暂无能力数据" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {capabilities.map((cap, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px', border: '1px solid var(--dsw-alias-border-l2)', padding: '12px' }}>
              <CheckCircle style={{ width: '16px', height: '16px', color: '#22c55e' }} />
              <p style={{ fontSize: '14px', margin: 0 }}>{String((cap as Record<string, unknown>).name) || JSON.stringify(cap)}</p>
            </div>
          ))}
        </div>
      )}
    </PanelWrapper>
  )
}

function CandidatesPanel() {
  const [candidates, setCandidates] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.engCandidates().then((data) => {
      setCandidates(Array.isArray(data) ? data : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handlePromote = async (id: string) => {
    try {
      await api.engPromote({ id })
      setCandidates((prev) => prev.filter((c) => (c as Record<string, unknown>).id !== id))
    } catch (err) { console.error('Promote failed:', err) }
  }

  const handleReject = async (id: string) => {
    try {
      await api.engReject({ id })
      setCandidates((prev) => prev.filter((c) => (c as Record<string, unknown>).id !== id))
    } catch (err) { console.error('Reject failed:', err) }
  }

  return (
    <PanelWrapper title="知识候选">
      {loading ? (
        <LoadingState />
      ) : candidates.length === 0 ? (
        <EmptyState icon={GitBranch} text="暂无候选知识" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {candidates.map((cand) => {
            const c = cand as Record<string, unknown>
            const id = String(c.id || '')
            return (
              <div key={id} style={{ borderRadius: '12px', border: '1px solid var(--dsw-alias-border-l2)', padding: '16px' }}>
                <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>{String(c.title || c.name || id)}</p>
                {c.content ? (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' }}>
                    <MarkdownBody text={String(c.content)} />
                  </div>
                ) : null}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handlePromote(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      color: '#22c55e',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)')}
                  >
                    <ArrowUpCircle style={{ width: '12px', height: '12px' }} />
                    晋升
                  </button>
                  <button
                    onClick={() => handleReject(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                  >
                    <XCircle style={{ width: '12px', height: '12px' }} />
                    拒绝
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PanelWrapper>
  )
}
