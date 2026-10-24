import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { BookMarked, FileUp, Loader2, RefreshCw } from 'lucide-react'

type KbState = 'corpus' | 'runs' | 'drafts' | 'published'

type KbStatus = {
  ok?: boolean
  kb_root?: string
  corpus?: string[]
  drafts?: string[]
  published?: string[]
  evidence?: string[]
  reuse_metrics?: Record<string, number>
  generation?: { has_current?: boolean; has_manifest?: boolean }
  error?: string
  hint?: string
}

/**
 * Knowledge UI state machine (S3): corpus → drafts → published (+ runs via notes).
 * Import TXT/MD; PDF failures show explicit extract_failed / plugin hint.
 */
export function KnowledgePage() {
  const [tab, setTab] = useState<KbState>('published')
  const [status, setStatus] = useState<KbStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const refresh = () => {
    setLoading(true)
    api.engKbStatus({})
      .then((j) => setStatus(j as KbStatus))
      .catch((e) => setStatus({ ok: false, error: String(e) }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const listFor = (t: KbState): string[] => {
    if (!status) return []
    if (t === 'corpus') return Array.isArray(status.corpus) ? status.corpus : []
    if (t === 'drafts') return Array.isArray(status.drafts) ? status.drafts : []
    if (t === 'published') return Array.isArray(status.published) ? status.published : []
    return []
  }

  const onImport = async (publish: boolean) => {
    if (!path.trim()) { setMsg('需要服务器可读路径（TXT/Markdown）'); return }
    setBusy(true)
    setMsg('')
    try {
      const out = await api.engImport({ path: path.trim(), publish }) as KbStatus & { draft?: string; ok?: boolean }
      if (out?.ok === false) {
        setMsg(out.hint || out.error || '导入失败')
      } else {
        setMsg(publish ? '已发布到 knowledge/' : `草稿已写入 ${out.draft || 'drafts/'}`)
        refresh()
      }
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const onBrowserUpload = async (file: File | null) => {
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!(lower.endsWith('.md') || lower.endsWith('.txt'))) {
      setMsg('首批仅支持 .md / .txt；PDF/DOCX 需框架提取能力')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const content_text = await file.text()
      const up = await api.appUploadsCreate({
        filename: file.name,
        content_text,
        workspace_id: 'ws-default',
      }) as { ok?: boolean; data?: { id?: string; request_id?: string }; id?: string; error?: { message?: string } }
      if (up?.ok === false) {
        setMsg(up.error?.message || '上传失败')
        return
      }
      const uploadId = up.data?.id || up.data?.request_id || up.id
      const started = await api.appImportsStart({ upload_id: uploadId }) as { ok?: boolean; data?: { status?: string; draft_path?: string }; error?: { message?: string } }
      if (started?.ok === false) {
        setMsg(started.error?.message || '导入失败')
        return
      }
      setMsg(`浏览器上传完成 · 状态 ${started.data?.status || 'draft_ready'} · ${started.data?.draft_path || ''}`)
      refresh()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const tabs: { id: KbState; label: string }[] = [
    { id: 'corpus', label: '资料' },
    { id: 'runs', label: 'Runs' },
    { id: 'drafts', label: '草稿' },
    { id: 'published', label: '已发布' },
  ]

  const reuse = status?.reuse_metrics || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 24px', borderBottom: '1px solid var(--dsw-alias-border-l2)',
      }}>
        <BookMarked style={{ width: 18, height: 18 }} />
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>知识库</h1>
        <button
          onClick={refresh}
          style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="刷新状态"
        >
          <RefreshCw style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === 'runs') {
                window.location.hash = '#/notes'
                return
              }
              setTab(t.id)
            }}
            style={{
              padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
              border: tab === t.id ? '1px solid var(--dsw-alias-label-primary)' : '1px solid var(--dsw-alias-border-l2)',
              background: tab === t.id ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{
        margin: '0 16px 12px', padding: 12, borderRadius: 8,
        border: '1px solid var(--dsw-alias-border-l2)',
        fontSize: 13, color: 'var(--dsw-alias-label-secondary)',
      }}>
        <div>kb_root: {status?.kb_root || '…'}</div>
        <div>
          真实复用 hits={reuse.actual_reuse_hits ?? 0} / attempts={reuse.bind_attempts ?? 0}
          · 误晋升拦截={reuse.mispromote_blocks ?? 0}
        </div>
        <div>
          CURRENT={status?.generation?.has_current ? 'yes' : 'no'} ·
          manifest={status?.generation?.has_manifest ? 'yes' : 'no'}
        </div>
      </div>

      <div style={{
        margin: '0 16px 8px', padding: 12, borderRadius: 8,
        border: '1px dashed var(--dsw-alias-border-l2)', display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <FileUp style={{ width: 16, height: 16, flexShrink: 0 }} />
        <label style={{ flex: 1, fontSize: 13, cursor: 'pointer' }}>
          浏览器上传 TXT/Markdown
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            disabled={busy}
            style={{ display: 'block', marginTop: 6 }}
            onChange={(e) => { void onBrowserUpload(e.target.files?.[0] || null); e.target.value = '' }}
          />
        </label>
      </div>
      <div style={{
        margin: '0 16px 16px', padding: 12, borderRadius: 8,
        border: '1px solid var(--dsw-alias-border-l2)', display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <FileUp style={{ width: 16, height: 16, flexShrink: 0 }} />
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="高级：服务器路径 .txt / .md（PDF 需外挂，失败会显式提示）"
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 8,
            border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent',
          }}
        />
        <button disabled={busy} onClick={() => onImport(false)} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>
          提取草稿
        </button>
        <button disabled={busy} onClick={() => onImport(true)} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>
          发布
        </button>
      </div>
      {msg && (
        <div style={{ margin: '0 16px 12px', fontSize: 13, color: 'var(--dsw-alias-label-secondary)' }}>{msg}</div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {listFor(tab).length === 0 && (
              <li style={{ color: 'var(--dsw-alias-label-secondary)', fontSize: 14 }}>（空）</li>
            )}
            {listFor(tab).map((name) => (
              <li
                key={name}
                style={{
                  padding: '10px 12px', marginBottom: 6, borderRadius: 8,
                  border: '1px solid var(--dsw-alias-border-l2)', fontSize: 14,
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
