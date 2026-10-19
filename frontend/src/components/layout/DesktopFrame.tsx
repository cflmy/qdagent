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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useEffect, useState, useCallback, useRef } from 'react'

const navItems = [
  { path: '/', icon: MessageSquare, label: '对话' },
  { path: '/notes', icon: BookOpen, label: '笔记' },
  { path: '/eng', icon: Wrench, label: '工程' },
  { path: '/workspace', icon: FolderOpen, label: '工作区', dev: true },
]

const SIDEBAR_DEFAULT = 260
const SIDEBAR_COLLAPSED = 56
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
      {/* Sidebar — DSH SidebarRoot structure */}
      <aside
        className="dsh-sidebar-fill"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '6px 12px',
          boxSizing: 'border-box',
          borderRight: '0.5px solid var(--dsw-alias-border-l3)',
          overflow: 'hidden',
          position: 'relative',
          fontSize: '14px',
          color: 'var(--dsw-alias-label-primary)',
          // Scrollbar l2 for elevated surface
          '--dsh-scrollbar-thumb': 'var(--dsw-alias-scrollbar-bg-l2)',
          '--dsh-scrollbar-thumb-hover': 'var(--dsw-alias-scrollbar-hover-l2)',
        } as React.CSSProperties}
      >
        {/* Logo Row — brand + toggle */}
        <div style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
          height: '60px',
          padding: '8px 0 8px 4px',
          marginBottom: '4px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}>
          {sidebarCollapsed ? (
            <button
              onClick={() => setSidebarCollapsed(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                border: 'none',
                borderRadius: 'var(--dsw-radius-md, 8px)',
                padding: 0,
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--dsw-alias-label-primary)',
              }}
              title="展开侧边栏"
            >
              <PanelLeftOpen size={18} />
            </button>
          ) : (
            <>
              {/* Brand */}
              <button
                onClick={() => { createSession(); navigate('/') }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '24px',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  lineHeight: '24px',
                  whiteSpace: 'nowrap',
                }}>
                  求道
                </span>
              </button>
              {/* Toggle */}
              <button
                onClick={() => setSidebarCollapsed(true)}
                style={{
                  flex: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  border: 'none',
                  borderRadius: 'var(--dsw-radius-sm, 6px)',
                  padding: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--dsw-alias-label-secondary)',
                }}
                title="折叠侧边栏"
              >
                <PanelLeftClose size={16} />
              </button>
            </>
          )}
        </div>

        {/* New Session Button — DSH style */}
        {sidebarCollapsed ? (
          <button
            onClick={() => { createSession(); navigate('/') }}
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              border: 'none',
              borderRadius: 'var(--dsw-radius-md, 8px)',
              padding: 0,
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--dsw-alias-label-primary)',
              alignSelf: 'flex-start',
              marginBottom: '12px',
            }}
            title="新建对话"
          >
            <Plus size={18} />
          </button>
        ) : (
          <button
            onClick={() => { createSession(); navigate('/') }}
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '38px',
              padding: '8px 12px',
              margin: '0 2px 12px',
              boxSizing: 'border-box',
              border: '0.5px solid var(--dsw-alias-border-l3)',
              borderRadius: 'var(--dsw-radius-md, 8px)',
              background: 'var(--dsw-alias-button-elevated-fill, var(--dsw-alias-bg-layer-2))',
              color: 'var(--dsw-alias-label-primary)',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: '22px',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-button-floating-hover, var(--dsw-alias-interactive-bg-hover))'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--dsw-alias-button-elevated-fill, var(--dsw-alias-bg-layer-2))'}
          >
            <Plus size={14} />
            <span style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>新建对话</span>
          </button>
        )}

        {/* Panel List — navigation items */}
        <nav style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: sidebarCollapsed ? '0' : '8px',
                  minHeight: '36px',
                  padding: sidebarCollapsed ? '0' : '7px 8px',
                  margin: '0 2px',
                  boxSizing: 'border-box',
                  border: 'none',
                  borderRadius: 'var(--dsw-radius-md, 8px)',
                  background: isActive ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
                  color: 'var(--dsw-alias-label-primary)',
                  fontSize: '14px',
                  fontWeight: isActive ? 500 : 400,
                  lineHeight: '22px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  width: sidebarCollapsed ? '36px' : '100%',
                  height: sidebarCollapsed ? '36px' : undefined,
                  transition: 'background 100ms ease',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.icon size={sidebarCollapsed ? 18 : 16} />
                </span>
                {!sidebarCollapsed && (
                  <>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    {item.dev && (
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--dsw-alias-state-warn-tertiary)',
                        color: 'var(--dsw-alias-state-warn-label)',
                        fontWeight: 500,
                        flexShrink: 0,
                      }}>
                        开发中
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {/* Region Area — session list (only in chat mode, expanded) */}
        {isChat && !sidebarCollapsed && (
          <div style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            marginLeft: '-4px',
            marginRight: '-12px',
            paddingLeft: '4px',
            paddingRight: '12px',
            overflow: 'hidden',
          }}>
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '8px' }}>
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => selectSession(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minHeight: '36px',
                      padding: '7px 8px',
                      margin: '0 2px',
                      boxSizing: 'border-box',
                      border: 'none',
                      borderRadius: 'var(--dsw-radius-md, 8px)',
                      background: s.id === currentId ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
                      color: s.id === currentId ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-primary)',
                      fontSize: '14px',
                      lineHeight: '22px',
                      cursor: 'pointer',
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={(e) => { if (s.id !== currentId) e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)' }}
                    onMouseLeave={(e) => { if (s.id !== currentId) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                      style={{
                        flex: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        padding: 0,
                        border: 'none',
                        borderRadius: '4px',
                        background: 'transparent',
                        color: 'var(--dsw-alias-label-tertiary)',
                        cursor: 'pointer',
                        opacity: 0,
                        transition: 'opacity 100ms, color 100ms',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--dsw-alias-state-error-primary)'; e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--dsw-alias-label-tertiary)'; e.currentTarget.style.opacity = '0' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Spacer for collapsed state */}
        {(!isChat || sidebarCollapsed) && <div style={{ flex: 1 }} />}

        {/* Foot Area — settings at bottom */}
        <div style={{ flex: 'none', display: 'flex', flexDirection: 'column' }}>
          {!sidebarCollapsed && (
            <button
              onClick={() => navigate('/settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '36px',
                padding: '7px 8px',
                margin: '0 2px 4px',
                boxSizing: 'border-box',
                border: 'none',
                borderRadius: 'var(--dsw-radius-md, 8px)',
                background: location.pathname === '/settings' ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
                color: 'var(--dsw-alias-label-primary)',
                fontSize: '14px',
                fontWeight: location.pathname === '/settings' ? 500 : 400,
                lineHeight: '22px',
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
                transition: 'background 100ms ease',
              }}
              onMouseEnter={(e) => { if (location.pathname !== '/settings') e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)' }}
              onMouseLeave={(e) => { if (location.pathname !== '/settings') e.currentTarget.style.background = 'transparent' }}
            >
              <Settings size={16} />
              <span>设置</span>
            </button>
          )}
          {sidebarCollapsed && (
            <button
              onClick={() => navigate('/settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                border: 'none',
                borderRadius: 'var(--dsw-radius-md, 8px)',
                padding: 0,
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--dsw-alias-label-primary)',
                alignSelf: 'center',
                transition: 'background 100ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="设置"
            >
              <Settings size={18} />
            </button>
          )}
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
            backgroundColor: dragging ? 'var(--dsw-alias-scrollbar-bg-l1)' : 'transparent',
            zIndex: 10,
            transition: 'background-color 100ms ease',
          }}
          onMouseEnter={(e) => { if (!dragging) e.currentTarget.style.backgroundColor = 'var(--dsw-alias-scrollbar-bg-l1)' }}
          onMouseLeave={(e) => { if (!dragging) e.currentTarget.style.backgroundColor = 'transparent' }}
        />
      )}

      {/* Main content — DSH ConversationRoot style */}
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100%',
        backgroundColor: 'var(--dsw-alias-bg-base)',
        overflow: 'hidden',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
