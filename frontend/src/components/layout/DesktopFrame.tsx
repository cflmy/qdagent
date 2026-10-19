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
  PanelRightClose,
  PanelRightOpen,
  Plug,
  Maximize,
  Columns2,
} from 'lucide-react'
import { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react'

const navItems = [
  { path: '/', icon: MessageSquare, label: '对话' },
  { path: '/notes', icon: BookOpen, label: '笔记' },
  { path: '/eng', icon: Wrench, label: '工程' },
  { path: '/plugins', icon: Plug, label: '插件' },
  { path: '/workspace', icon: FolderOpen, label: '工作区', dev: true },
]

const SIDEBAR_DEFAULT = 260
const SIDEBAR_COLLAPSED = 56
const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 400
const RIGHTBAR_DEFAULT = 360
const RIGHTBAR_MIN = 280
const RIGHTBAR_MAX = 600

/** Right sidebar tab type */
export type RightTab = 'notes' | 'files' | 'workspace'

/** Right sidebar state shared via context */
interface RightbarState {
  open: boolean
  width: number
  activeTab: RightTab
  setOpen: (v: boolean) => void
  setWidth: (v: number) => void
  setActiveTab: (t: RightTab) => void
  toggle: () => void
}

export const RightbarContext = createContext<RightbarState>({
  open: false, width: RIGHTBAR_DEFAULT, activeTab: 'notes',
  setOpen: () => {}, setWidth: () => {}, setActiveTab: () => {}, toggle: () => {},
})

export function useRightbar() {
  return useContext(RightbarContext)
}

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

  // Right sidebar state
  const [rightbarOpen, setRightbarOpen] = useState(false)
  const [rightbarWidth, setRightbarWidth] = useState(RIGHTBAR_DEFAULT)
  const [rightbarTab, setRightbarTab] = useState<RightTab>('notes')
  const [rightDragging, setRightDragging] = useState(false)
  const rightDragStartX = useRef(0)
  const rightDragStartWidth = useRef(0)

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  const isChat = location.pathname === '/'

  // Left sidebar drag
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

  // Right sidebar drag
  const onRightPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    rightDragStartX.current = e.clientX
    rightDragStartWidth.current = rightbarWidth
    setRightDragging(true)
  }, [rightbarWidth])

  const onRightPointerMove = useCallback((e: React.PointerEvent) => {
    if (!rightDragging) return
    const dx = rightDragStartX.current - e.clientX
    const newWidth = Math.max(RIGHTBAR_MIN, Math.min(RIGHTBAR_MAX, rightDragStartWidth.current + dx))
    setRightbarWidth(newWidth)
  }, [rightDragging])

  const onRightPointerUp = useCallback((e: React.PointerEvent) => {
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    setRightDragging(false)
  }, [])

  const toggleRightbar = useCallback(() => {
    setRightbarOpen(v => !v)
  }, [])

  const rightbarState: RightbarState = {
    open: rightbarOpen,
    width: rightbarWidth,
    activeTab: rightbarTab,
    setOpen: setRightbarOpen,
    setWidth: setRightbarWidth,
    setActiveTab: setRightbarTab,
    toggle: toggleRightbar,
  }

  // Grid columns
  const leftCol = sidebarCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth
  const rightCol = rightbarOpen ? rightbarWidth : 0

  return (
    <RightbarContext.Provider value={rightbarState}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${leftCol}px minmax(0, 1fr) minmax(0px, ${rightCol}px)`,
          height: '100vh',
          width: '100vw',
          overflow: 'hidden',
          transition: (dragging || rightDragging) ? 'none' : 'grid-template-columns 200ms ease',
        }}
      >
        {/* ═══ Left Sidebar — DSH SidebarRoot ═══ */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '6px 12px',
            boxSizing: 'border-box',
            borderRight: '0.5px solid var(--dsw-alias-border-l3)',
            background: 'var(--dsw-specific-sidebar-fill)',
            overflow: 'hidden',
            position: 'relative',
            fontSize: '14px',
            color: 'var(--dsw-alias-label-primary)',
            '--dsh-scrollbar-thumb': 'var(--dsw-alias-scrollbar-bg-l2)',
            '--dsh-scrollbar-thumb-hover': 'var(--dsw-alias-scrollbar-hover-l2)',
          } as React.CSSProperties}
        >
          {/* Logo Row */}
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
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px', border: 'none',
                  borderRadius: 'var(--dsw-radius-md, 8px)', padding: 0,
                  background: 'transparent', cursor: 'pointer',
                  color: 'var(--dsw-alias-label-primary)',
                }}
                title="展开侧边栏"
              >
                <PanelLeftOpen size={18} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => { createSession(); navigate('/') }}
                  style={{
                    flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center',
                    gap: '8px', height: '24px', padding: 0, border: 'none',
                    background: 'transparent', color: 'inherit', cursor: 'pointer', overflow: 'hidden',
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    fontSize: '18px', fontWeight: 600, letterSpacing: '0.04em', lineHeight: '24px',
                    whiteSpace: 'nowrap',
                  }}>
                    求道
                  </span>
                </button>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  style={{
                    flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '28px', height: '28px', border: 'none',
                    borderRadius: 'var(--dsw-radius-sm, 6px)', padding: 0,
                    background: 'transparent', cursor: 'pointer',
                    color: 'var(--dsw-alias-label-secondary)',
                  }}
                  title="折叠侧边栏"
                >
                  <PanelLeftClose size={16} />
                </button>
              </>
            )}
          </div>

          {/* New Session Button */}
          {sidebarCollapsed ? (
            <button
              onClick={() => { createSession(); navigate('/') }}
              style={{
                flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', border: 'none',
                borderRadius: 'var(--dsw-radius-md, 8px)', padding: 0,
                background: 'transparent', cursor: 'pointer',
                color: 'var(--dsw-alias-label-primary)', alignSelf: 'flex-start', marginBottom: '12px',
              }}
              title="新建对话"
            >
              <Plus size={18} />
            </button>
          ) : (
            <button
              onClick={() => { createSession(); navigate('/') }}
              style={{
                flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', height: '38px', padding: '8px 12px', margin: '0 2px 12px',
                boxSizing: 'border-box', border: '0.5px solid var(--dsw-alias-border-l3)',
                borderRadius: 'var(--dsw-radius-md, 8px)',
                background: 'var(--dsw-alias-button-elevated-fill, var(--dsw-alias-bg-layer-2))',
                color: 'var(--dsw-alias-label-primary)', fontSize: '14px', fontWeight: 500,
                lineHeight: '22px', cursor: 'pointer', overflow: 'hidden',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-button-floating-hover, var(--dsw-alias-interactive-bg-hover))'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--dsw-alias-button-elevated-fill, var(--dsw-alias-bg-layer-2))'}
            >
              <Plus size={14} />
              <span style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>新建对话</span>
            </button>
          )}

          {/* Panel List — navigation */}
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
                    display: 'flex', alignItems: 'center',
                    gap: sidebarCollapsed ? '0' : '8px',
                    minHeight: '36px',
                    padding: sidebarCollapsed ? '0' : '7px 8px',
                    margin: '0 2px', boxSizing: 'border-box', border: 'none',
                    borderRadius: 'var(--dsw-radius-md, 8px)',
                    background: isActive ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
                    color: 'var(--dsw-alias-label-primary)',
                    fontSize: '14px', fontWeight: isActive ? 500 : 400,
                    lineHeight: '22px', textAlign: 'left', cursor: 'pointer',
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
                          fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                          backgroundColor: 'var(--dsw-alias-state-warn-tertiary)',
                          color: 'var(--dsw-alias-state-warn-label)', fontWeight: 500, flexShrink: 0,
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

          {/* Region Area — session list */}
          {isChat && !sidebarCollapsed && (
            <div style={{
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              marginLeft: '-4px', marginRight: '-12px',
              paddingLeft: '4px', paddingRight: '12px', overflow: 'hidden',
            }}>
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '8px' }}>
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => selectSession(s.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        minHeight: '36px', padding: '7px 8px', margin: '0 2px',
                        boxSizing: 'border-box', border: 'none',
                        borderRadius: 'var(--dsw-radius-md, 8px)',
                        background: s.id === currentId ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
                        color: 'var(--dsw-alias-label-primary)',
                        fontSize: '14px', lineHeight: '22px', cursor: 'pointer',
                        transition: 'background 100ms ease',
                      }}
                      onMouseEnter={(e) => { if (s.id !== currentId) e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)' }}
                      onMouseLeave={(e) => { if (s.id !== currentId) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                        style={{
                          flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '20px', height: '20px', padding: 0, border: 'none',
                          borderRadius: '4px', background: 'transparent',
                          color: 'var(--dsw-alias-label-tertiary)', cursor: 'pointer',
                          opacity: 0, transition: 'opacity 100ms, color 100ms',
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

          {(!isChat || sidebarCollapsed) && <div style={{ flex: 1 }} />}

          {/* Foot Area — settings */}
          <div style={{ flex: 'none', display: 'flex', flexDirection: 'column' }}>
            {!sidebarCollapsed ? (
              <button
                onClick={() => navigate('/settings')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  minHeight: '36px', padding: '7px 8px', margin: '0 2px 4px',
                  boxSizing: 'border-box', border: 'none',
                  borderRadius: 'var(--dsw-radius-md, 8px)',
                  background: location.pathname === '/settings' ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
                  color: 'var(--dsw-alias-label-primary)',
                  fontSize: '14px', fontWeight: location.pathname === '/settings' ? 500 : 400,
                  lineHeight: '22px', textAlign: 'left', cursor: 'pointer', width: '100%',
                  transition: 'background 100ms ease',
                }}
                onMouseEnter={(e) => { if (location.pathname !== '/settings') e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)' }}
                onMouseLeave={(e) => { if (location.pathname !== '/settings') e.currentTarget.style.background = 'transparent' }}
              >
                <Settings size={16} />
                <span>设置</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/settings')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px', border: 'none',
                  borderRadius: 'var(--dsw-radius-md, 8px)', padding: 0,
                  background: 'transparent', cursor: 'pointer',
                  color: 'var(--dsw-alias-label-primary)', alignSelf: 'center',
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

        {/* Left sidebar drag handle */}
        {!sidebarCollapsed && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
              position: 'absolute',
              left: `${leftCol - 2}px`,
              top: 0, bottom: 0, width: '4px',
              cursor: 'col-resize',
              backgroundColor: dragging ? 'var(--dsw-alias-scrollbar-bg-l1)' : 'transparent',
              zIndex: 10, transition: 'background-color 100ms ease',
            }}
            onMouseEnter={(e) => { if (!dragging) e.currentTarget.style.backgroundColor = 'var(--dsw-alias-scrollbar-bg-l1)' }}
            onMouseLeave={(e) => { if (!dragging) e.currentTarget.style.backgroundColor = 'transparent' }}
          />
        )}

        {/* ═══ Center Column — DSH centerCol ═══ */}
        <main style={{
          display: 'flex', flexDirection: 'column',
          minWidth: 0, height: '100%',
          background: 'var(--dsw-alias-bg-base)',
          overflow: 'hidden',
        }}>
          <Outlet />
        </main>

        {/* ═══ Right Sidebar — DSH rightbarCol ═══ */}
        {rightbarOpen && (
          <>
            <div
              style={{
                display: 'flex', flexDirection: 'column',
                height: '100%', minWidth: 0,
                background: 'var(--dsw-alias-bg-base)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* ══ Tab Strip — DSH .tabStrip: 28px row ═══ */}
              <div style={{
                display: 'flex',
                flex: 'none',
                gap: '4px',
                alignItems: 'center',
                height: '28px',
                padding: '10px 6px 0 10px',
                /* content-box (default): 10px top + 28px = 38px row */
                touchAction: 'none',
              }}>
                {/* Strip Tabs — DSH .stripTabs */}
                <div style={{
                  display: 'flex',
                  flex: '0 1 auto',
                  alignItems: 'center',
                  minWidth: 0,
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollBehavior: 'smooth',
                  scrollbarWidth: 'none',
                  touchAction: 'none',
                }}>
                  {([
                    { id: 'notes' as RightTab, label: '笔记' },
                    { id: 'files' as RightTab, label: '文件' },
                    { id: 'workspace' as RightTab, label: '工作区' },
                  ]).map((tab, idx) => (
                    <div key={tab.id} style={{ display: 'contents' }}>
                      {idx > 0 && (
                        /* Slot between tabs — DSH .slot */
                        <div style={{
                          display: 'flex', flex: 'none',
                          alignItems: 'center', justifyContent: 'center',
                          width: '10px', height: '28px',
                        }}>
                          <div style={{
                            width: '0.5px', height: '14px',
                            background: 'var(--dsw-alias-border-l4)',
                          }} />
                        </div>
                      )}
                      <button
                        onClick={() => setRightbarTab(tab.id)}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          flex: '0 1 auto',
                          alignItems: 'center',
                          minWidth: '80px',
                          maxWidth: '170px',
                          height: '28px',
                          padding: '0 10px',
                          border: 'none',
                          borderRadius: 'var(--dsw-radius-sm, 6px)',
                          background: rightbarTab === tab.id
                            ? 'var(--dsw-alias-markdown-tag, var(--dsw-alias-interactive-bg-hover))'
                            : 'transparent',
                          color: rightbarTab === tab.id
                            ? 'var(--dsw-alias-label-primary)'
                            : 'var(--dsw-alias-label-secondary)',
                          fontSize: 'var(--dsh-content-font-size-secondary, 13px)',
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          touchAction: 'none',
                          userSelect: 'none',
                          transition: 'background 100ms ease',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => {
                          if (rightbarTab !== tab.id)
                            e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'
                        }}
                        onMouseLeave={(e) => {
                          if (rightbarTab !== tab.id)
                            e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {tab.label}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Tab button — DSH .addTab */}
                <button
                  style={{
                    display: 'flex',
                    flex: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    padding: 0,
                    border: 'none',
                    borderRadius: 'var(--dsw-radius-sm, 6px)',
                    background: 'transparent',
                    color: 'var(--dsw-alias-label-secondary)',
                    lineHeight: 1,
                    cursor: 'pointer',
                    transition: 'background 100ms ease, color 100ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'
                    e.currentTarget.style.color = 'var(--dsw-alias-label-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--dsw-alias-label-secondary)'
                  }}
                  title="添加标签"
                >
                  <Plus size={14} />
                </button>

                {/* Strip Fill — DSH .stripFill: flex spacer pushing controls right */}
                <div style={{
                  flex: '1 1 0',
                  minWidth: 0,
                }} />

                {/* Split Pane — DSH .iconButton between stripFill and stripChrome */}
                <button
                  style={{
                    display: 'inline-flex',
                    flex: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    padding: '6px',
                    border: 'none',
                    borderRadius: 'var(--dsw-radius-sm, 6px)',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--dsw-alias-label-secondary)',
                    lineHeight: 1,
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  title="分割面板"
                >
                  <Columns2 size={15} />
                </button>

                {/* Strip Chrome — DSH .stripChrome: embedder controls at end */}
                <div style={{
                  display: 'flex',
                  flex: 'none',
                  gap: '8px',
                  alignItems: 'center',
                  height: '28px',
                  marginLeft: '4px',
                }}>
                  {/* Fullscreen toggle — DSH PanelChrome first button */}
                  <button
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      padding: '6px',
                      border: 'none',
                      borderRadius: 'var(--dsw-radius-sm, 6px)',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--dsw-alias-label-secondary)',
                      lineHeight: 1,
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    title="全屏"
                  >
                    <Maximize size={15} />
                  </button>
                  {/* Collapse toggle — DSH PanelChrome second button */}
                  <button
                    onClick={() => setRightbarOpen(false)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      padding: '6px',
                      border: 'none',
                      borderRadius: 'var(--dsw-radius-sm, 6px)',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--dsw-alias-label-secondary)',
                      lineHeight: 1,
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    title="折叠右侧栏"
                  >
                    <PanelRightClose size={15} />
                  </button>
                </div>
              </div>

              {/* ══ Pane Body — DSH .paneBody ══ */}
              <div style={{
                position: 'relative',
                flex: '1 1 auto',
                minWidth: 0,
                minHeight: 0,
                overflow: 'auto',
                '--dsh-scrollbar-thumb': 'var(--dsw-alias-scrollbar-bg-l2)',
                '--dsh-scrollbar-thumb-hover': 'var(--dsw-alias-scrollbar-hover-l2)',
              } as React.CSSProperties}>
                {rightbarTab === 'notes' && <RightNotesPanel />}
                {rightbarTab === 'files' && <RightFilesPanel />}
                {rightbarTab === 'workspace' && <RightWorkspacePanel />}
              </div>
            </div>

            {/* Right sidebar drag handle */}
            <div
              onPointerDown={onRightPointerDown}
              onPointerMove={onRightPointerMove}
              onPointerUp={onRightPointerUp}
              style={{
                position: 'absolute',
                left: `${leftCol + (window.innerWidth - leftCol - rightbarWidth) - 2}px`,
                top: 0, bottom: 0, width: '4px',
                cursor: 'col-resize',
                backgroundColor: rightDragging ? 'var(--dsw-alias-scrollbar-bg-l1)' : 'transparent',
                zIndex: 10, transition: 'background-color 100ms ease',
              }}
              onMouseEnter={(e) => { if (!rightDragging) e.currentTarget.style.backgroundColor = 'var(--dsw-alias-scrollbar-bg-l1)' }}
              onMouseLeave={(e) => { if (!rightDragging) e.currentTarget.style.backgroundColor = 'transparent' }}
            />
          </>
        )}
      </div>
    </RightbarContext.Provider>
  )
}

/** Right sidebar — Notes panel */
function RightNotesPanel() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{
        fontSize: '12px', fontWeight: 500,
        color: 'var(--dsw-alias-label-tertiary)',
        padding: '4px 0 8px', textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        最近笔记
      </div>
      <button
        onClick={() => navigate('/notes')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', border: 'none',
          borderRadius: 'var(--dsw-radius-md, 8px)',
          background: 'transparent', cursor: 'pointer',
          color: 'var(--dsw-alias-label-primary)',
          fontSize: '13px', lineHeight: '20px',
          textAlign: 'left', width: '100%',
          transition: 'background 100ms ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <BookOpen size={14} style={{ flex: 'none', color: 'var(--dsw-alias-label-secondary)' }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>查看全部笔记</span>
      </button>
    </div>
  )
}

/** Right sidebar — Files panel */
function RightFilesPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{
        fontSize: '12px', fontWeight: 500,
        color: 'var(--dsw-alias-label-tertiary)',
        padding: '4px 0 8px', textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        知识库文件
      </div>
      <div style={{
        padding: '16px', textAlign: 'center',
        color: 'var(--dsw-alias-label-tertiary)',
        fontSize: '13px',
      }}>
        <FolderOpen size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
        <div>文件浏览 [开发中]</div>
      </div>
    </div>
  )
}

/** Right sidebar — Workspace panel */
function RightWorkspacePanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{
        fontSize: '12px', fontWeight: 500,
        color: 'var(--dsw-alias-label-tertiary)',
        padding: '4px 0 8px', textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        工作区
      </div>
      <div style={{
        padding: '16px', textAlign: 'center',
        color: 'var(--dsw-alias-label-tertiary)',
        fontSize: '13px',
      }}>
        <Wrench size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
        <div>工作区管理 [开发中]</div>
      </div>
    </div>
  )
}
