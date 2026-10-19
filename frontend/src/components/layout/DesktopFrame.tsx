import { Outlet, useLocation, useNavigate } from 'react-router-dom'
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
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-card)',
        overflow: 'hidden',
      }}>
        {/* Brand */}
        <div style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em' }}>求道</span>
        </div>

        {/* Navigation - always visible */}
        <nav style={{ padding: '0 8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path))
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--color-muted)' : 'transparent',
                    color: isActive ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
                    fontSize: '14px',
                    fontWeight: isActive ? 500 : 400,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 150ms',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-muted)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <item.icon style={{ width: '16px', height: '16px' }} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Sessions list - only in chat mode */}
        {isChat && (
          <>
            <div style={{ padding: '12px 12px 8px', borderTop: '1px solid var(--color-border)', marginTop: '12px' }}>
              <button
                onClick={() => { createSession(); navigate('/') }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-muted-foreground)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                新建对话
              </button>
            </div>
            <nav style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => selectSession(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: s.id === currentId ? 'var(--color-muted)' : 'transparent',
                      color: s.id === currentId ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
                      fontWeight: s.id === currentId ? 500 : 400,
                      transition: 'background-color 150ms',
                    }}
                    onMouseEnter={(e) => { if (s.id !== currentId) e.currentTarget.style.backgroundColor = 'var(--color-muted)' }}
                    onMouseLeave={(e) => { if (s.id !== currentId) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <MessageSquare style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                      style={{
                        padding: '2px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--color-muted-foreground)',
                        cursor: 'pointer',
                        opacity: 0.6,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-destructive)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-foreground)')}
                    >
                      <Trash2 style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                ))}
              </div>
            </nav>
          </>
        )}
      </aside>

      {/* Main content */}
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        backgroundColor: 'var(--color-background)',
        overflow: 'hidden',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
