import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, type Run } from '@/lib/api'
import { cn } from '@/lib/utils'
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-6">
        {(view === 'detail' || view === 'new') && (
          <button
            onClick={() => navigate('/notes')}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <h1 className="text-lg font-semibold">
          {view === 'new' ? '记一笔' : view === 'detail' ? '笔记详情' : '笔记'}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === 'list' && (
          <div className="mx-auto max-w-3xl p-6">
            {/* Search + New */}
            <div className="mb-6 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索笔记…"
                  className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-10 pr-4 text-sm outline-none focus:border-ring focus:bg-background"
                />
              </div>
              <button
                onClick={() => navigate('/notes/new')}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                记一笔
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-sm text-muted-foreground">
                {search ? '没有匹配的笔记' : '暂无笔记'}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((run) => (
                  <div
                    key={run.id}
                    onClick={() => navigate(`/notes/${run.slug || run.id}`)}
                    className="cursor-pointer rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <h3 className="text-sm font-medium">{run.title || run.slug || '未命名'}</h3>
                      </div>
                      {run.created_at && (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(run.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                    {run.content && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
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
          <div className="mx-auto max-w-3xl p-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : currentRun ? (
              <article>
                <h2 className="text-xl font-semibold">{currentRun.title || currentRun.slug}</h2>
                {currentRun.created_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(currentRun.created_at).toLocaleString('zh-CN')}
                  </p>
                )}
                <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
                  {currentRun.content || '（空内容）'}
                </div>
              </article>
            ) : (
              <p className="py-20 text-center text-sm text-muted-foreground">笔记不存在</p>
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

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（可选）"
          className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm outline-none focus:border-ring focus:bg-background"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的笔记…"
          rows={12}
          className="w-full resize-none rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm leading-relaxed outline-none focus:border-ring focus:bg-background"
        />
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving || !content.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            保存
          </button>
          <button
            onClick={onDone}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
