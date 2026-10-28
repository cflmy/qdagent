import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CitationLink } from '@/components/chat/CitationLink'

type Props = {
  text: string
  className?: string
  /** When set, bare `[n]` markers become CitationLink. */
  citationsWorkspaceId?: string
  style?: CSSProperties
}

function citeInText(text: string, workspaceId: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /\[(\d+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const n = Number(m[1])
    parts.push(
      <CitationLink key={`c-${i++}-${n}`} index={n} citationId={`cite-${n}`} workspaceId={workspaceId} />,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function walkCitations(node: ReactNode, workspaceId: string): ReactNode {
  if (typeof node === 'string') return citeInText(node, workspaceId)
  if (Array.isArray(node)) {
    return Children.map(node, (child) => walkCitations(child, workspaceId))
  }
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>
    if (el.props.children == null) return el
    return cloneElement(el, {
      ...el.props,
      children: walkCitations(el.props.children, workspaceId),
    })
  }
  return node
}

function citedTag(Tag: string, workspaceId: string) {
  return function Cited(props: { children?: ReactNode }) {
    const { children, ...rest } = props
    return (
      <Tag {...rest}>{walkCitations(children, workspaceId)}</Tag>
    )
  }
}

/** Render GFM markdown (headings, lists, code, tables) for chat / notes / reader. */
export function MarkdownBody({ text, className, citationsWorkspaceId, style }: Props) {
  const src = typeof text === 'string' ? text : ''
  if (!src.trim()) return null

  const components = citationsWorkspaceId
    ? {
        p: citedTag('p', citationsWorkspaceId),
        li: citedTag('li', citationsWorkspaceId),
        td: citedTag('td', citationsWorkspaceId),
        th: citedTag('th', citationsWorkspaceId),
        h1: citedTag('h1', citationsWorkspaceId),
        h2: citedTag('h2', citationsWorkspaceId),
        h3: citedTag('h3', citationsWorkspaceId),
        h4: citedTag('h4', citationsWorkspaceId),
        blockquote: citedTag('blockquote', citationsWorkspaceId),
      }
    : undefined

  return (
    <div className={`qd-md ${className || ''}`.trim()} style={style}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {src}
      </ReactMarkdown>
    </div>
  )
}
