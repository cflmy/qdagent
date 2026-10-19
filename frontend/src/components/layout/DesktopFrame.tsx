import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/stores/session-store'
import {
  MessageSquare,
  BookOpen,
  Settings,
  Wrench,
  Plus,
  Trash2,
  FolderOpen,
} from 'lucide-react'
import { useEffect, useState, useCallback, useRef } from 'react'

const navItems = [
  { path: '/', icon: MessageSquare, label: '对话' },
  { path: '/notes', icon: BookOpen, label: '笔记' },
  { path: '/settings', icon: Settings, label: '设置' },
  { path: '/eng', icon: Wrench, label: '工程' },
  { path: '/workspace', icon: FolderOpen, label: '工作区', dev: true },
]

const SIDEBAR_DEFAULT = 260
const SIDEBAR_COLLAPSED = 48
const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 400

export function DesktopFrame() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    sessions, currentId,
    selectSession, createSession, deleteSession, loadFromStorage,
  } = useSessionStore()

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  const isChat = location.pathname === '/'

  // Drag handle logic
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragStartX.current = e.clientX
    dragStartWidth.current = sidebarWidth
    setDragging(true)
  }, [sidebarWidth])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragStartX.current
    const newWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, dragStartWidth.current + dx))
    setSidebarWidth(newWidth)
    if (newWidth < 100) setSidebarCollapsed(true)
    else setSidebarCollapsed(false)
  }, [dragging])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    setDragging(false)
  }, [])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${sidebarCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth}px 1fr`,
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        transition: dragging ? 'none' : 'grid-template-columns 200ms ease',
      }}
    >
      {/* Sidebar */}
      <aside
        className="dsh-sidebar-fill"
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--dsw-alias-border-l2)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Brand */}
        <div style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          padding: sidebarCollapsed ? '0 12px' : '0 16px',
          flexShrink: 0,
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        }}>
          {!sidebarCollapsed && (
            <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--dsw-alias-label-primary)' }}>
              求道
            </span>
          )}
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
                  title={sidebarCollapsed ? item.label : undefined}
                  className="dsh-sidebar-nav-item-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: sidebarCollapsed ? '0' : '12px',
                    padding: sidebarCollapsed ? '8px' : '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--dsw-specific-sidebar-nav-item-active)' : 'transparent',
                    color: isActive ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
                    fontSize: '14px',
                    fontWeight: isActive ? 500 : 400,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    position: 'relative',
                  }}
                >
                  <item.icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  {!sidebarCollapsed && (
                    <>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.dev && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--dsw-alias-state-warn-tertiary)',
                          color: 'var(--dsw-alias-state-warn-label)',
                          fontWeight: 500,
                        }}>
                          开发中
                        </span>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Sessions list - only in chat mode */}
        {isChat && !sidebarCollapsed && (
          <>
            <div style={{ padding: '12px 12px 8px', borderTop: '1px solid var(--dsw-alias-border-l2)', marginTop: '12px' }}>
              <button
                onClick={() => { createSession(); navigate('/') }}
                className="dsh-sidebar-nav-item-hover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--dsw-alias-border-l2)',
                  backgroundColor: 'transparent',
                  color: 'var(--dsw-alias-label-secondary)',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
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
                    className="dsh-sidebar-nav-item-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: s.id === currentId ? 'var(--dsw-specific-sidebar-nav-item-active)' : 'transparent',
                      color: s.id === currentId ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
                      fontWeight: s.id === currentId ? 500 : 400,
                    }}
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
                        color: 'var(--dsw-alias-label-tertiary)',
                        cursor: 'pointer',
                        opacity: 0.6,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--dsw-alias-state-error-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dsw-alias-label-tertiary)')}
                    >
                      <Trash2 style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                ))}
              </div>
            </nav>
          </>
        )}

        {/* Collapse toggle */}
        <div style={{
          padding: '8px',
          borderTop: '1px solid var(--dsw-alias-border-l2)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="dsh-sidebar-nav-item-hover"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--dsw-alias-label-tertiary)',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }}>
              <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Drag handle */}
      {!sidebarCollapsed && (
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            position: 'absolute',
            left: `${sidebarWidth - 2}px`,
            top: 0,
            bottom: 0,
            width: '4px',
            cursor: 'col-resize',
            backgroundColor: dragging ? 'var(--dsw-static-deepseek-500)' : 'transparent',
            zIndex: 10,
          }}
          onMouseEnter={(e) => { if (!dragging) e.currentTarget.style.backgroundColor = 'var(--dsw-alias-border-l3)' }}
          onMouseLeave={(e) => { if (!dragging) e.currentTarget.style.backgroundColor = 'transparent' }}
        />
      )}

      {/* Main content */}
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        backgroundColor: 'var(--dsw-alias-bg-base)',
        overflow: 'hidden',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
