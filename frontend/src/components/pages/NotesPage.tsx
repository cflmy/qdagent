import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, type Run } from '@/lib/api'
import {
  Search, Plus, FileText, Clock, Loader2, ArrowLeft,
} from 'lucide-react'

type View = 'list' | 'detail' | 'new'

export function NotesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const slug = location.pathname.match(/^\/notes\/(.+)$/)?.[1]
  const isNew = location.pathname === '/notes/new'

  const [view, setView] = useState<View>(isNew ? 'new' : slug ? 'detail' : 'list')
  const [runs, setRuns] = useState<Run[]>([])
  const [currentRun, setCurrentRun] = useState<Run | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isNew) { setView('new'); return }
    if (slug) {
      setView('detail')
      api.getRun({ slug }).then(setCurrentRun).catch(() => {}).finally(() => setLoading(false))
      return
    }
    setView('list')
    api.listRuns().then(setRuns).catch(() => {}).finally(() => setLoading(false))
  }, [location.pathname])

  const filtered = runs.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (r.title || '').toLowerCase().includes(q) ||
           (r.content || '').toLowerCase().includes(q)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 24px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        {(view === 'detail' || view === 'new') && (
          <button
            onClick={() => navigate('/notes')}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--color-muted-foreground)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
          </button>
        )}
        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
          {view === 'new' ? '记一笔' : view === 'detail' ? '笔记详情' : '笔记'}
        </h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'list' && (
          <div style={{ maxWidth: '768px', margin: '0 auto', padding: '24px' }}>
            {/* Search + New */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: 'var(--color-muted-foreground)',
                }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索笔记…"
                  style={{
                    width: '100%',
                    padding: '8px 16px 8px 40px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-muted)',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    color: 'var(--color-foreground)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-ring)'; e.currentTarget.style.backgroundColor = 'var(--color-background)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-muted)' }}
                />
              </div>
              <button
                onClick={() => navigate('/notes/new')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                记一笔
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                <Loader2 style={{ width: '24px', height: '24px', color: 'var(--color-muted-foreground)' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '80px 0', textAlign: 'center', fontSize: '14px', color: 'var(--color-muted-foreground)' }}>
                {search ? '没有匹配的笔记' : '暂无笔记'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filtered.map((run) => (
                  <div
                    key={run.id}
                    onClick={() => navigate(`/notes/${run.slug || run.id}`)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '12px',
                      border: '1px solid var(--color-border)',
                      padding: '16px',
                      transition: 'background-color 150ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText style={{ width: '16px', height: '16px', color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
                        <h3 style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>{run.title || run.slug || '未命名'}</h3>
                      </div>
                      {run.created_at && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-muted-foreground)', flexShrink: 0 }}>
                          <Clock style={{ width: '12px', height: '12px' }} />
                          {new Date(run.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                    {run.content && (
                      <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--color-muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {run.content.slice(0, 200)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'detail' && (
          <div style={{ maxWidth: '768px', margin: '0 auto', padding: '24px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                <Loader2 style={{ width: '24px', height: '24px', color: 'var(--color-muted-foreground)' }} />
              </div>
            ) : currentRun ? (
              <article>
                <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{currentRun.title || currentRun.slug}</h2>
                {currentRun.created_at && (
                  <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-muted-foreground)' }}>
                    {new Date(currentRun.created_at).toLocaleString('zh-CN')}
                  </p>
                )}
                <div style={{ marginTop: '24px', whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: 1.7 }}>
                  {currentRun.content || '（空内容）'}
                </div>
              </article>
            ) : (
              <p style={{ padding: '80px 0', textAlign: 'center', fontSize: '14px', color: 'var(--color-muted-foreground)' }}>笔记不存在</p>
            )}
          </div>
        )}

        {view === 'new' && (
          <NewNoteForm onDone={() => navigate('/notes')} />
        )}
      </div>
    </div>
  )
}

function NewNoteForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await api.captureRun({ title: title || '未命名', content, role: 'note' })
      onDone()
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-muted)',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    color: 'var(--color-foreground)',
  }

  return (
    <div style={{ maxWidth: '768px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（可选）"
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-ring)'; e.currentTarget.style.backgroundColor = 'var(--color-background)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-muted)' }}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的笔记…"
          rows={12}
          style={{ ...inputStyle, resize: 'none', lineHeight: 1.7, padding: '12px 16px' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-ring)'; e.currentTarget.style.backgroundColor = 'var(--color-background)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-muted)' }}
        />
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSubmit}
            disabled={saving || !content.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
              fontSize: '14px',
              cursor: saving || !content.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !content.trim() ? 0.5 : 1,
            }}
          >
            {saving && <Loader2 style={{ width: '16px', height: '16px' }} />}
            保存
          </button>
          <button
            onClick={onDone}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-muted-foreground)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
