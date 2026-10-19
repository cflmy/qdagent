import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/session-store'
import {
  MessageSquare,
  BookOpen,
  Settings,
  Wrench,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect } from 'react'

const navItems = [
  { path: '/', icon: MessageSquare, label: '对话' },
  { path: '/notes', icon: BookOpen, label: '笔记' },
  { path: '/settings', icon: Settings, label: '设置' },
  { path: '/eng', icon: Wrench, label: '工程' },
]

export function DesktopFrame() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    sessions, currentId,
    selectSession, createSession, deleteSession, loadFromStorage,
  } = useSessionStore()

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  const isChat = location.pathname === '/'

  return (
    <div className="dshDesktopFrame grid h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'dshDesktopSidebarSurface flex flex-col border-r border-border bg-card',
          'transition-[width] duration-[280ms] ease-in-out',
          'w-[260px]',
        )}
      >
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">求道</span>
        </div>

        {/* Context-aware content */}
        {isChat ? (
          /* Session list for chat */
          <>
            <div className="px-3 pb-2">
              <button
                onClick={() => { createSession(); navigate('/') }}
                className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                新建对话
              </button>
            </div>
            <nav className="flex-1 overflow-auto px-2">
              <div className="space-y-0.5">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer',
                      s.id === currentId
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                    onClick={() => selectSession(s.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{s.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                      className="hidden rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </nav>
          </>
        ) : (
          /* Navigation for other pages */
          <nav className="flex-1 overflow-auto px-2">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path))
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </nav>
        )}

        {/* Bottom nav (always visible) */}
        <div className="shrink-0 border-t border-border px-2 py-2">
          {navItems.filter(i => i.path !== '/').map((item) => {
            const isActive = location.pathname === item.path ||
              location.pathname.startsWith(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            )
          })}
        </div>
      </aside>

      {/* Main content */}
      <main className="dshDesktopConversationSurface flex min-w-0 flex-col bg-background">
        <Outlet />
      </main>
    </div>
  )
}
