import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plug, Plus, RefreshCw, Trash2, ChevronRight,
  Search, ExternalLink, AlertCircle, Check,
  Package, Shield, Terminal,
} from 'lucide-react'

/** Plugin status */
type PluginStatus = 'active' | 'inactive' | 'error' | 'loading'

interface PluginInfo {
  id: string
  name: string
  description: string
  version: string
  status: PluginStatus
  icon?: typeof Plug
  author?: string
  module?: string
  error?: string
}

/** Mock plugin data — will be replaced with real API */
const MOCK_PLUGINS: PluginInfo[] = [
  {
    id: 'mcp-server',
    name: 'MCP Server',
    description: 'Model Context Protocol 服务接入层，提供工具调用和资源管理',
    version: '1.2.0',
    status: 'active',
    icon: Plug,
    author: '求道官方',
    module: '@qdagent/mcp-server',
  },
  {
    id: 'web-search',
    name: 'Web Search',
    description: '网络搜索插件，支持多引擎搜索并返回结构化结果',
    version: '0.8.3',
    status: 'active',
    icon: Search,
    author: '求道官方',
    module: '@qdagent/web-search',
  },
  {
    id: 'code-runner',
    name: 'Code Runner',
    description: '安全沙箱代码执行环境，支持 JavaScript/Python/Bash',
    version: '0.5.1',
    status: 'inactive',
    icon: Terminal,
    author: '社区',
    module: '@qdagent/code-runner',
  },
  {
    id: 'knowledge-guard',
    name: 'Knowledge Guard',
    description: '知识库安全审计插件，防止敏感信息泄露',
    version: '0.3.0',
    status: 'error',
    icon: Shield,
    author: '社区',
    module: '@qdagent/knowledge-guard',
    error: '配置文件缺失，请检查 config.yaml',
  },
]

const statusConfig: Record<PluginStatus, { label: string; color: string; bg: string }> = {
  active: { label: '已启用', color: 'var(--dsw-alias-state-success-primary)', bg: 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent)' },
  inactive: { label: '未启用', color: 'var(--dsw-alias-label-tertiary)', bg: 'var(--dsw-alias-bg-layer-3)' },
  error: { label: '异常', color: 'var(--dsw-alias-state-error-primary)', bg: 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)' },
  loading: { label: '加载中', color: 'var(--dsw-alias-label-secondary)', bg: 'var(--dsw-alias-bg-layer-3)' },
}

export function PluginPage() {
  const navigate = useNavigate()
  const [plugins] = useState<PluginInfo[]>(MOCK_PLUGINS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null)

  const filtered = plugins.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activePlugins = filtered.filter(p => p.status === 'active')
  const inactivePlugins = filtered.filter(p => p.status !== 'active')

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        flex: 'none', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '56px', padding: '10px 28px 10px 20px',
        borderBottom: '0.5px solid var(--dsw-alias-border-l3)',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedPlugin && (
            <button
              onClick={() => setSelectedPlugin(null)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                border: 'none', padding: 0, background: 'none',
                color: 'var(--dsw-alias-label-tertiary)',
                fontSize: '12.5px', cursor: 'pointer',
              }}
            >
              插件
              <ChevronRight size={12} />
            </button>
          )}
          <h1 style={{
            fontSize: '16px', fontWeight: 500, margin: 0,
            color: 'var(--dsw-alias-label-primary)',
          }}>
            {selectedPlugin ? selectedPlugin.name : '插件管理'}
          </h1>
          {!selectedPlugin && (
            <span style={{
              fontSize: '13px', color: 'var(--dsw-alias-label-secondary)',
              marginLeft: '4px',
            }}>
              {plugins.length} 个插件
            </span>
          )}
        </div>

        {!selectedPlugin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              height: '32px', padding: '0 10px',
              border: '0.5px solid var(--dsw-alias-border-l4)',
              borderRadius: 'var(--dsw-radius-md, 8px)',
              background: 'var(--dsw-alias-bg-layer-3)',
            }}>
              <Search size={14} style={{ color: 'var(--dsw-alias-label-tertiary)', flex: 'none' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索插件…"
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  color: 'var(--dsw-alias-label-primary)',
                  fontSize: '13px', width: '140px',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            {/* Add button */}
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                height: '32px', padding: '0 12px',
                border: 'none',
                borderRadius: 'var(--dsw-radius-md, 8px)',
                background: 'var(--dsw-alias-button-primary-fill, var(--dsw-alias-state-business-primary))',
                color: '#fff', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', transition: 'opacity 100ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Plus size={14} />
              添加
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
        padding: '24px 20px',
        '--dsh-scrollbar-thumb': 'var(--dsw-alias-scrollbar-bg-l2)',
        '--dsh-scrollbar-thumb-hover': 'var(--dsw-alias-scrollbar-hover-l2)',
      } as React.CSSProperties}>
        {selectedPlugin ? (
          <PluginDetail plugin={selectedPlugin} onBack={() => setSelectedPlugin(null)} />
        ) : (
          <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Active plugins */}
            {activePlugins.length > 0 && (
              <PluginGroup title="已启用" count={activePlugins.length} plugins={activePlugins} onSelect={setSelectedPlugin} />
            )}
            {/* Inactive plugins */}
            {inactivePlugins.length > 0 && (
              <PluginGroup title="未启用" count={inactivePlugins.length} plugins={inactivePlugins} onSelect={setSelectedPlugin} />
            )}
            {/* Empty state */}
            {filtered.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '64px 24px', gap: '12px',
                color: 'var(--dsw-alias-label-tertiary)',
              }}>
                <Package size={32} style={{ opacity: 0.4 }} />
                <div style={{ fontSize: '14px' }}>
                  {searchQuery ? '没有找到匹配的插件' : '暂无插件'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Plugin group with title */
function PluginGroup({ title, count, plugins, onSelect }: {
  title: string; count: number; plugins: PluginInfo[];
  onSelect: (p: PluginInfo) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{
          margin: 0, fontSize: '14px', fontWeight: 500,
          lineHeight: '22px', color: 'var(--dsw-alias-label-primary)',
        }}>{title}</h2>
        <span style={{
          fontSize: '12px', lineHeight: '18px',
          color: 'var(--dsw-alias-label-secondary)',
        }}>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {plugins.map(plugin => (
          <PluginCard key={plugin.id} plugin={plugin} onClick={() => onSelect(plugin)} />
        ))}
      </div>
    </div>
  )
}

/** Single plugin card */
function PluginCard({ plugin, onClick }: { plugin: PluginInfo; onClick: () => void }) {
  const status = statusConfig[plugin.status]
  const Icon = plugin.icon || Package

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '8px', margin: '0 -8px',
        borderRadius: 'var(--dsw-radius-xl, 12px)',
        cursor: 'pointer',
        transition: 'background 100ms ease',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {/* Icon */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '48px', height: '48px', flex: 'none',
        border: '0.5px solid var(--dsw-alias-border-l3)',
        borderRadius: 'var(--dsw-radius-lg, 10px)',
        color: 'var(--dsw-alias-label-secondary)',
      }}>
        <Icon size={22} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '14px', fontWeight: 500, lineHeight: '20px',
            color: 'var(--dsw-alias-label-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{plugin.name}</span>
          <span style={{
            fontSize: '10px', lineHeight: '1', padding: '2px 7px',
            borderRadius: '4px', fontWeight: 500,
            color: status.color, background: status.bg,
            flex: 'none',
          }}>{status.label}</span>
        </div>
        <div style={{
          fontSize: '13px', lineHeight: '18px',
          color: 'var(--dsw-alias-label-tertiary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{plugin.description}</div>
      </div>

      {/* Version + arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 'none' }}>
        <span style={{
          fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)',
          fontFamily: 'var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
        }}>v{plugin.version}</span>
        <ChevronRight size={14} style={{ color: 'var(--dsw-alias-label-tertiary)' }} />
      </div>
    </div>
  )
}

/** Plugin detail view */
function PluginDetail({ plugin, onBack }: { plugin: PluginInfo; onBack: () => void }) {
  const status = statusConfig[plugin.status]
  const Icon = plugin.icon || Package

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          border: 'none', padding: 0, background: 'none',
          color: 'var(--dsw-alias-label-tertiary)',
          fontSize: '12.5px', cursor: 'pointer', alignSelf: 'flex-start',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--dsw-alias-label-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--dsw-alias-label-tertiary)'}
      >
        ← 返回插件列表
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '64px', height: '64px', flex: 'none',
          border: '0.5px solid var(--dsw-alias-border-l3)',
          borderRadius: 'var(--dsw-radius-lg, 10px)',
          color: 'var(--dsw-alias-label-secondary)',
        }}>
          <Icon size={28} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{
              margin: 0, fontSize: '20px', fontWeight: 500, lineHeight: '28px',
              color: 'var(--dsw-alias-label-primary)',
            }}>{plugin.name}</h2>
            <span style={{
              fontSize: '10px', lineHeight: '1', padding: '2px 7px',
              borderRadius: '4px', fontWeight: 500,
              color: status.color, background: status.bg,
            }}>{status.label}</span>
          </div>
          <p style={{
            margin: 0, fontSize: '14px', lineHeight: '22px',
            color: 'var(--dsw-alias-label-secondary)',
          }}>{plugin.description}</p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)' }}>
            <span>版本 {plugin.version}</span>
            {plugin.author && <span>作者: {plugin.author}</span>}
            {plugin.module && (
              <span style={{
                fontFamily: 'var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
              }}>{plugin.module}</span>
            )}
          </div>
        </div>
      </div>

      {/* Error notice */}
      {plugin.error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px',
          padding: '10px 12px',
          borderRadius: 'var(--dsw-radius-md, 8px)',
          background: 'var(--dsw-alias-state-warn-tertiary)',
          fontSize: '12px', lineHeight: '18px',
          color: 'var(--dsw-alias-label-secondary)',
        }}>
          <AlertCircle size={14} style={{ flex: 'none', marginTop: '2px', color: 'var(--dsw-alias-state-warn-primary)' }} />
          <span>{plugin.error}</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {plugin.status === 'active' ? (
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            height: '32px', padding: '0 12px',
            border: '0.5px solid var(--dsw-alias-border-l3)',
            borderRadius: 'var(--dsw-radius-md, 8px)',
            background: 'transparent', color: 'var(--dsw-alias-label-secondary)',
            fontSize: '13px', cursor: 'pointer',
            transition: 'background 100ms',
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <RefreshCw size={14} />
            重新加载
          </button>
        ) : (
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            height: '32px', padding: '0 12px',
            border: 'none',
            borderRadius: 'var(--dsw-radius-md, 8px)',
            background: 'var(--dsw-alias-button-primary-fill, var(--dsw-alias-state-business-primary))',
            color: '#fff', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', transition: 'opacity 100ms',
          }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Check size={14} />
            启用
          </button>
        )}
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          height: '32px', padding: '0 12px',
          border: '0.5px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent)',
          borderRadius: 'var(--dsw-radius-md, 8px)',
          background: 'transparent',
          color: 'var(--dsw-alias-state-error-primary)',
          fontSize: '13px', cursor: 'pointer',
          transition: 'background 100ms',
        }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Trash2 size={14} />
          卸载
        </button>
      </div>

      {/* Facts */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '0',
        borderTop: '0.5px solid var(--dsw-alias-border-l2)',
      }}>
        {[
          { label: '模块', value: plugin.module || '-' },
          { label: '版本', value: plugin.version },
          { label: '作者', value: plugin.author || '-' },
          { label: '状态', value: status.label },
        ].map((fact, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '16px', minHeight: '44px', padding: '8px 2px',
            borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
          }}>
            <span style={{
              fontSize: '13px', lineHeight: '20px',
              color: 'var(--dsw-alias-label-secondary)',
            }}>{fact.label}</span>
            <span style={{
              fontSize: '13px', lineHeight: '20px',
              color: 'var(--dsw-alias-label-primary)',
              textAlign: 'end', overflowWrap: 'anywhere',
              fontFamily: fact.label === '模块' ? 'var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)' : 'inherit',
            }}>{fact.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
