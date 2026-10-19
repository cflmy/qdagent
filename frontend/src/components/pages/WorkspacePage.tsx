import { FolderOpen, Loader2 } from 'lucide-react'

export function DevBadge({ feature = '此功能' }: { feature?: string }) {
  return (
    <span
      title={`${feature}正在开发中，后续版本将提供完整功能`}
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
      开发中
    </span>
  )
}

export function WorkspacePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid var(--dsw-alias-border-l2)',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          工作区
          <DevBadge feature="工作区" />
        </h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <div style={{
          maxWidth: '768px',
          margin: '0 auto',
          borderRadius: '16px',
          border: '1px solid var(--dsw-alias-border-l2)',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <FolderOpen style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 16px',
            color: 'var(--dsw-alias-label-tertiary)',
            opacity: 0.4,
          }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)', margin: '0 0 8px' }}>
            工作区
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 24px' }}>
            文件浏览器、终端和 Git 状态管理
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--dsw-alias-state-warn-tertiary)',
            color: 'var(--dsw-alias-state-warn-label)',
            fontSize: '13px',
            fontWeight: 500,
          }}>
            <Loader2 style={{ width: '14px', height: '14px' }} />
            此功能正在开发中，将在后续版本提供
          </div>
        </div>

        {/* Planned features list */}
        <div style={{ maxWidth: '768px', margin: '24px auto 0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dsw-alias-label-secondary)', marginBottom: '12px' }}>
            计划中的功能
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: '文件浏览器', desc: '浏览和管理项目文件' },
              { name: '集成终端', desc: '在界面内运行命令' },
              { name: 'Git 状态', desc: '查看和管理版本控制' },
              { name: '文件搜索', desc: '全局搜索项目文件' },
            ].map((item) => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--dsw-alias-border-l2)',
                  backgroundColor: 'var(--dsw-alias-bg-layer-2)',
                }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--dsw-alias-state-warn-primary)',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dsw-alias-label-primary)', margin: 0 }}>
                    {item.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)', margin: '2px 0 0' }}>
                    {item.desc}
                  </p>
                </div>
                <DevBadge />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
