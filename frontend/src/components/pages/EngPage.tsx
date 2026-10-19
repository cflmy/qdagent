import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Shield, BookOpen, Zap, GitBranch, Loader2, RefreshCw,
  CheckCircle, XCircle, ArrowUpCircle,
} from 'lucide-react'

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
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-6">
        <h1 className="text-lg font-semibold">工程中心</h1>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-border px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors',
              activeTab === tab.id
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'preflight' && <PreflightPanel />}
        {activeTab === 'workbook' && <WorkbookPanel />}
        {activeTab === 'capability' && <CapabilityPanel />}
        {activeTab === 'candidates' && <CandidatesPanel />}
      </div>
    </div>
  )
}

function PreflightPanel() {
  const [metrics, setMetrics] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.engMetrics().catch(() => null),
    ]).then(([m]) => {
      setMetrics(m)
    }).finally(() => setLoading(false))
  }, [])

  const refresh = () => {
    setLoading(true)
    api.engMetrics().then(setMetrics).catch(() => {}).finally(() => setLoading(false))
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">工程预检仪表盘</h2>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          刷新
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Object.entries(metrics as Record<string, unknown>).map(([key, val]) => (
            <div key={key} className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">{key}</p>
              <p className="mt-1 text-2xl font-semibold">{String(val)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-sm text-muted-foreground">
          暂无工程指标数据
        </div>
      )}
    </div>
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
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="mb-6 text-sm font-medium text-muted-foreground">工程工作簿</h2>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : workbooks.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <BookOpen className="mx-auto mb-3 h-8 w-8 opacity-40" />
          暂无工作簿
        </div>
      ) : (
        <div className="space-y-2">
          {workbooks.map((wb, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium">{String((wb as Record<string, unknown>).id || `工作簿 #${i + 1}`)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
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
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="mb-6 text-sm font-medium text-muted-foreground">能力矩阵</h2>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : capabilities.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <Zap className="mx-auto mb-3 h-8 w-8 opacity-40" />
          暂无能力数据
        </div>
      ) : (
        <div className="space-y-2">
          {capabilities.map((cap, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-sm">{String((cap as Record<string, unknown>).name) || JSON.stringify(cap)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
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
    } catch (err) {
      console.error('Promote failed:', err)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await api.engReject({ id })
      setCandidates((prev) => prev.filter((c) => (c as Record<string, unknown>).id !== id))
    } catch (err) {
      console.error('Reject failed:', err)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="mb-6 text-sm font-medium text-muted-foreground">知识候选</h2>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <GitBranch className="mx-auto mb-3 h-8 w-8 opacity-40" />
          暂无候选知识
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((cand) => {
            const c = cand as Record<string, unknown>
            const id = String(c.id || '')
            return (
              <div key={id} className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium">{String(c.title || c.name || id)}</p>
                {c.content ? (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {String(c.content)}
                  </p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handlePromote(id)}
                    className="flex items-center gap-1 rounded bg-green-500/10 px-2.5 py-1 text-xs text-green-600 hover:bg-green-500/20"
                  >
                    <ArrowUpCircle className="h-3 w-3" />
                    晋升
                  </button>
                  <button
                    onClick={() => handleReject(id)}
                    className="flex items-center gap-1 rounded bg-red-500/10 px-2.5 py-1 text-xs text-red-600 hover:bg-red-500/20"
                  >
                    <XCircle className="h-3 w-3" />
                    拒绝
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
