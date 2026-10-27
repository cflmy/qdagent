import { useCallback, useEffect, useState } from 'react'
import { FolderOpen, FileText, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useContextPanelStore } from '@/stores/context-panel-store'

type WsRow = {
  id?: string
  name?: string
  project_root_ref?: string
}

type TreeEntry = {
  name: string
  path: string
  is_dir?: boolean
  workspace_id?: string
}

export function DevBadge({ feature = '此功能' }: { feature?: string }) {
  return (
    <span
      title={`${feature}尚未交付完整能力`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '10px',
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: 'var(--dsw-alias-state-warn-tertiary)',
        color: 'var(--dsw-alias-state-warn-label)',
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
    >
      <span style={{
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        backgroundColor: 'var(--dsw-alias-state-warn-primary)',
      }} />
      部分能力
    </span>
  )
}

/** Authorized workspace file tree + read-only DocumentView (Q04). */
export function WorkspacePage() {
  const openTarget = useContextPanelStore((s) => s.openTarget)
  const [workspaces, setWorkspaces] = useState<WsRow[]>([])
  const [wsId, setWsId] = useState('')
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<TreeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await api.appWorkspaces() as {
        ok?: boolean
        data?: WsRow[] | { workspaces?: WsRow[] }
        workspaces?: WsRow[]
      }
      const data = res.data
      const list = Array.isArray(data)
        ? data
        : (data as { workspaces?: WsRow[] })?.workspaces
          ?? res.workspaces
          ?? []
      setWorkspaces(list)
      if (!wsId && list[0]?.id) setWsId(String(list[0].id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [wsId])

  const loadTree = useCallback(async (workspaceId: string, rel: string) => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    try {
      // Prefer designed resources/list (ResourceRefV1); fall back to workspaces/tree.
      const listed = await api.appResourcesList({
        workspace_id: workspaceId,
        path: rel || undefined,
        kind: 'file',
        limit: 200,
      }) as {
        ok?: boolean
        data?: { items?: Array<{ title?: string; source_ref?: string; kind?: string; is_dir?: boolean }> }
        error?: { message?: string }
      }
      if (listed.ok !== false && listed.data?.items) {
        setEntries(listed.data.items.map((it) => ({
          name: it.title || it.source_ref || '',
          path: it.source_ref || '',
          is_dir: it.is_dir || it.kind === 'directory',
          workspace_id: workspaceId,
        })))
        setPath(rel)
        return
      }
      const res = await api.appWorkspacesTree({ workspace_id: workspaceId, path: rel || undefined }) as {
        ok?: boolean
        entries?: TreeEntry[]
        error?: { message?: string; code?: string }
        code?: string
        message?: string
      }
      if (res.ok === false || res.error) {
        setError(listed.error?.message || res.error?.message || res.message || res.code || '无法列出目录')
        setEntries([])
        return
      }
      setEntries(res.entries || [])
      setPath(rel)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadWorkspaces() }, [loadWorkspaces])
  useEffect(() => {
    if (wsId) void loadTree(wsId, '')
  }, [wsId, loadTree])

  const crumbs = path ? path.split('/').filter(Boolean) : []

  const openFile = async (entry: TreeEntry) => {
    if (entry.is_dir) {
      void loadTree(wsId, entry.path)
      return
    }
    const workspaceId = wsId || entry.workspace_id || 'ws-default'
    try {
      const resolved = await api.appResourcesResolve({
        workspace_id: workspaceId,
        path: entry.path,
      }) as {
        ok?: boolean
        data?: { source_ref?: string; title?: string; revision?: string; resource_id?: string }
      }
      const ref = resolved.ok !== false ? resolved.data : undefined
      openTarget({
        kind: 'file',
        workspaceId,
        path: ref?.source_ref || entry.path,
        title: ref?.title || entry.name,
      })
    } catch {
      openTarget({
        kind: 'file',
        workspaceId,
        path: entry.path,
        title: entry.name,
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} role="main" aria-label="工作区">
      <div style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid var(--dsw-alias-border-l2)',
        flexShrink: 0,
        gap: '12px',
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>工作区</h1>
        <select
          aria-label="选择工作区"
          value={wsId}
          onChange={(e) => setWsId(e.target.value)}
          style={{
            fontSize: '13px',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid var(--dsw-alias-border-l2)',
            background: 'var(--dsw-alias-bg-layer-1)',
            color: 'var(--dsw-alias-label-primary)',
            maxWidth: '240px',
          }}
        >
          {workspaces.length === 0 && <option value="">无工作区</option>}
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name || w.id}</option>
          ))}
        </select>
        <button
          type="button"
          aria-label="刷新文件树"
          onClick={() => void loadTree(wsId, path)}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid var(--dsw-alias-border-l2)',
            background: 'transparent',
            color: 'var(--dsw-alias-label-secondary)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        <nav aria-label="路径" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px', fontSize: '13px' }}>
          <button
            type="button"
            onClick={() => void loadTree(wsId, '')}
            style={{ background: 'none', border: 'none', color: 'var(--dsw-alias-state-business-primary)', cursor: 'pointer', padding: 0 }}
          >
            根目录
          </button>
          {crumbs.map((c, i) => {
            const upto = crumbs.slice(0, i + 1).join('/')
            return (
              <span key={upto} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--dsw-alias-label-tertiary)' }}>
                <ChevronRight size={12} />
                <button
                  type="button"
                  onClick={() => void loadTree(wsId, upto)}
                  style={{ background: 'none', border: 'none', color: 'var(--dsw-alias-state-business-primary)', cursor: 'pointer', padding: 0 }}
                >
                  {c}
                </button>
              </span>
            )
          })}
        </nav>

        {error && (
          <div role="alert" style={{
            marginBottom: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'var(--dsw-alias-state-warn-tertiary)',
            color: 'var(--dsw-alias-state-warn-label)',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--dsw-alias-label-tertiary)', fontSize: '13px' }}>
            <Loader2 size={16} className="animate-spin" /> 加载中…
          </div>
        ) : entries.length === 0 ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--dsw-alias-label-tertiary)',
            fontSize: '13px',
            border: '1px dashed var(--dsw-alias-border-l2)',
            borderRadius: '12px',
          }}>
            <FolderOpen size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            此目录为空，或工作区根尚未就绪
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {entries.map((e) => (
              <li key={e.path}>
                <button
                  type="button"
                  onClick={() => openFile(e)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--dsw-alias-label-primary)',
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)' }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent' }}
                >
                  {e.is_dir
                    ? <FolderOpen size={16} style={{ color: 'var(--dsw-alias-label-secondary)', flexShrink: 0 }} />
                    : <FileText size={16} style={{ color: 'var(--dsw-alias-label-secondary)', flexShrink: 0 }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                  {e.is_dir && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)' }}>
          阅读路径只打开 DocumentView，不会执行或写回文档。点击文件在右侧面板阅读。
        </p>
      </div>
    </div>
  )
}
