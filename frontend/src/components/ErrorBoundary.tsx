import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Catches render-time errors so a broken page shows an actionable message
 * instead of unmounting the whole tree and leaving a blank (black) screen.
 */
interface Props {
  children: ReactNode
  /** Remounts the boundary when this key changes (e.g. route pathname). */
  resetKey?: string
}

interface State {
  error: Error | null
  info: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info: info.componentStack || '' })
    // Keep the details in the console for debugging.
    console.error('[qdagent] page render failed:', error, info)
  }

  componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, info: '' })
    }
  }

  render(): ReactNode {
    const { error, info } = this.state
    if (!error) return this.props.children

    return (
      <div style={{ padding: '32px', maxWidth: '860px', margin: '0 auto', fontFamily: 'inherit' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>页面渲染失败</h1>
        <p style={{ fontSize: '14px', color: 'var(--dsw-alias-label-secondary)', margin: '0 0 20px' }}>
          该页面在渲染时抛出了错误，已阻止整页白屏。请把下面的信息反馈给维护者。
        </p>
        <pre
          style={{
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid var(--dsw-alias-border-l2)',
            background: 'var(--dsw-alias-bg-layer-2)',
            color: 'var(--dsw-alias-label-primary)',
            fontSize: '13px',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: '0 0 16px',
          }}
        >
          {error.name}: {error.message}
        </pre>
        <details style={{ fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' }}>
          <summary style={{ cursor: 'pointer' }}>组件栈</summary>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{info || '(无)'}</pre>
        </details>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--dsw-alias-button-primary-fill, #1f6feb)',
              color: 'var(--dsw-alias-label-primary-foreground, #fff)',
              fontSize: '14px',
            }}
          >
            重新加载
          </button>
          <button
            onClick={() => { window.location.hash = '#/' }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--dsw-alias-border-l2)',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--dsw-alias-label-primary)',
              fontSize: '14px',
            }}
          >
            回到对话
          </button>
        </div>
      </div>
    )
  }
}
